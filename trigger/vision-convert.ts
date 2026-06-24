import { task, logger } from "@trigger.dev/sdk/v3";
import { PDFDocument } from "pdf-lib";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import type { WebSocket as WSType } from "ws";

const PASS1_SYSTEM = `You are reading a UK property inventory PDF.

Your job is to identify every room/area section in this PDF and return their page ranges. Also extract the property address from the cover page or header.

INCLUDE: All room and area headings such as Kitchen, Living Room, Bedroom 1, Bathroom, Entrance Hall, Property Exterior, Boot Room, Stairwell, Landing, WC, Garage, Garden, External Surfaces, Boundaries, Courtyard, Carport, etc.

EXCLUDE: Cover page, contents page, notes, disclaimers, checklists, keys and utilities, meter readings, declaration, terms and conditions, abbreviations pages.

IMPORTANT: Be generous with page ranges. If unsure where a room ends, extend the endPage by 2-3 extra pages. It is better to include too many pages than too few. Small transitional areas like Porch, Stairs, Hallways must be included even if they only span 1-2 pages.

CONTINUATION PAGES: If a page is labelled "(Cont.)" after a room name (e.g. "Kitchen (Cont.)"), this is a CONTINUATION of that same room, not a new room. Extend the original room's endPage to include these continuation pages rather than creating a separate room entry. Never treat "Room Name (Cont.)" as a separate room — always merge it into the main room with the same name.

SRP INVENTORIES LANDSCAPE REPORTS - ROOM DETECTION:
If this PDF is an SRP Inventories landscape-style report (look for a Contents/Areas page listing room names, and table columns Ref | Name | Description | Condition | Additional Comments), use the Contents page as the master list of rooms. You must identify every room listed there. Do not finish until every room in that list has been located and assigned a page range.
A room may span: table pages, then photo pages, then the next room heading. Photo-only pages do NOT end a room — keep scanning forward page by page. The next room only starts when a new numbered room heading appears (e.g. "3. Dining Room", "4. Kitchen"). A heading with "(Cont.)" is always a continuation of the same numbered room, never a new one.
Common failure to avoid: do not stop after only finding the first few rooms (e.g. Exterior Front, Entrance And Hallway, Dining Room, Kitchen) just because photo pages follow them. The report continues after photo pages and later rooms must still be detected and included with correct page ranges, all the way to the final room in the Contents list.

Return ONLY raw JSON, no markdown, no explanation:
{"address":"6 Broughton Close, Marston, Oxford, OX3 0RQ","rooms":[{"room":"Kitchen","startPage":5,"endPage":12},{"room":"Living Room","startPage":13,"endPage":18}]}`;

const PASS2_SYSTEM = `You are converting a section of a UK property inventory PDF into structured JSON.

This PDF extract contains ONE room or area. Extract every inventory row from the table.

IGNORE completely:
- Rows where the item is "Further views" or similar photo-reference rows
- Rows where the item or description is just a photo reference like "Ref # 3.1" or "Ref #5" or similar
- Any text that is just a photo caption or timestamp like "17 Aug 2023 10:28"
- Cover pages, disclaimers, declaration pages

COLUMN DETECTION: Identify the column format visually:
- Some PDFs have: Ref | Name | Description | Condition (4 columns)
- Some PDFs have: Item | Description | Condition (3 columns)
- Some PDFs have: Number | Description | Condition (3 columns)

REF NUMBER RULE:
- If BOTH a ref number AND an item name are present: put the ITEM NAME in the item field. IGNORE the ref number.
- The Name/Item column contains values like "Front Door", "Flooring", "Walls", "Ceiling" — these go in item.
- Never put ref numbers like "2.1", "3.4" in the item field when an item name is also present.

CORD KEEP RULE: "Cord keep attached." is always a condition note. Put it in condition, never in description.

CONDITION TRIGGERS: Short phrases like "In use.", "Rust spots.", "Sound emitted: Yes.", "Cord keep attached.", "Replacement date: none visible." are condition notes — put them in condition, not description.

ABBREVIATION TRIGGERS: The following abbreviations are ALWAYS condition codes, never descriptions. Put them in condition: IUIW (In use in working), T&W (Tried and working), NT (Not tested), PM (Previously mentioned), RC (Reasonable condition), ODU (Of decorative use), Cap and valve present, Good, Fair, Poor, New.

FORMAT F - 5 columns (Item | Description | Condition | Cleanliness | Photos):
- Column 1 is item name → ITEM
- Column 2 is descriptive text → DESCRIPTION
- Column 3 is condition → first line of CONDITION
- Column 4 is cleanliness → second line of CONDITION as "Cleanliness, [value]"
- Column 5 is photos → IGNORE entirely
- The Cleanliness column may show coloured dots (green/amber/red) next to words — read the word, ignore the dot
- Merge condition and cleanliness: condition field = "[Col3 value]\nCleanliness, [Col4 value]"
- Example: Condition=Good, Cleanliness=Good → condition: "Good\nCleanliness, Good"
- Example: Condition=Good, Cleanliness=Fair → condition: "Good\nCleanliness, Fair"
- Example: Condition=Fair, Cleanliness=Poor → condition: "Fair\nCleanliness, Poor"
- If Cleanliness is blank → output Condition value only
- If Condition is blank but Cleanliness has a value → output "Cleanliness, [value]"

COLUMN MERGING RULE — when both Condition and Cleanliness columns exist:
- ALWAYS output both values merged into the condition field
- Line 1: the Condition value
- Line 2: "Cleanliness," followed by the Cleanliness value

MID-TEXT DASH RULE: When a single cell contains text with a dash in the middle, like "Ceiling - white emulsion" or "Door - chrome handle", this is NOT a column separator. Keep the entire phrase together exactly as written in ONE field (item or description, whichever column it was in). Do not split the text at the dash into two different columns. Only treat a dash as a standalone item value (the DASH ITEMS rule) when the Item column contains ONLY a dash character and nothing else.

SRP INVENTORIES LANDSCAPE FORMAT (Ref | Name | Description | Condition | Additional Comments, 5 columns):
This format uses landscape orientation with columns: Ref, Name, Description, Condition, Additional Comments. Ref numbers are formatted like 1.1, 1.2, 2.1, 2.2.
Column mapping:
- Name → ITEM
- Description → DESCRIPTION
- Condition → CONDITION (first line(s))
- Additional Comments → if it contains text, add it underneath the Condition text on a new line. If blank, add nothing extra.
- Ref → do not include in output. Use only to keep row order and check nothing is missed.
A valid inventory row starts with a Ref number such as 1.1, 1.2, 1.3, 2.1, 2.2, 2.3. Use the Ref number as the row anchor. Keep all text in the same row until the next Ref number begins. Do not merge two Ref rows together. Do not split one Ref row into multiple rows. Preserve the original row order and wording as closely as possible, including semicolons, hyphens, brackets, apostrophes and capitalisation. Do not rewrite, summarise, tidy, improve or modernise the wording.
The SRP PDF has a lot of photo pages. Photo pages are not room data, only supporting images. Ignore the images except for adding "Further Views" as the first row of the room if that room has photo pages.
Preserve terms exactly: UPVC, ADT, Chubb, Ref, Yale, thermostat, trickle vents, securely mounted, tested and working, not tested, newly decorated, used condition, good order, intact.

COPY EXACTLY: Copy text exactly as it appears. Do not correct spelling, reword, or summarise.

Return ONLY raw JSON:
{"rows":[{"item":"Front Door","description":"White UPVC double glazed...","condition":"Minor weathering."}]}`;

async function callVisionAPI(base64: string, systemPrompt: string, userPrompt: string, maxTokens: number) {
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + process.env.OPENAI_API_KEY
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      max_output_tokens: maxTokens,
      temperature: 0,
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: systemPrompt + "\n\n" + userPrompt },
          { type: "input_file", filename: "inventory.pdf", file_data: "data:application/pdf;base64," + base64 }
        ]
      }]
    })
  });

  const d = await r.json();
  let text = "";
  if (d.output_text) {
    text = d.output_text;
  } else if (d.output && Array.isArray(d.output)) {
    for (const item of d.output) {
      if (item.content && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (c.type === "output_text" && c.text) text += c.text;
        }
      }
    }
  }
  return text;
}

export const visionConvertTask = task({
  id: "vision-convert",
  maxDuration: 3600,
  run: async (payload: { pdfPath: string; jobId: string; userId: string }) => {
    const { pdfPath, jobId, userId } = payload;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { global: { fetch: fetch }, realtime: { transport: ws as any } }
    );

    async function updateJob(status: string, progress: number, message: string, rooms?: any[], address?: string, roomNames?: string[]) {
      await supabase.from("vision_jobs").upsert({
        id: jobId,
        user_id: userId,
        status,
        progress,
        message,
        rooms: rooms ? JSON.stringify(rooms) : null,
        address: address || null,
        room_names: roomNames ? JSON.stringify(roomNames) : undefined,
        updated_at: new Date().toISOString()
      });
    }

    try {
      await updateJob("running", 0, "Fetching PDF...");

      // Fetch PDF from Supabase
      const { data: signed, error: signErr } = await supabase.storage
        .from("documents")
        .createSignedUrl(pdfPath, 3600);

      if (signErr || !signed?.signedUrl) throw new Error("Could not get signed URL");

      const pdfRes = await fetch(signed.signedUrl);
      if (!pdfRes.ok) throw new Error("Could not fetch PDF: " + pdfRes.status);

      const pdfBuffer = await pdfRes.arrayBuffer();
      const fullBase64 = Buffer.from(pdfBuffer).toString("base64");
      logger.log("PDF fetched", { size: pdfBuffer.byteLength });

      await updateJob("running", 5, "Identifying rooms...");

      // Pass 1: Get room list
      const pass1Text = await callVisionAPI(
        fullBase64,
        PASS1_SYSTEM,
        "Identify all rooms and their page ranges. Return raw JSON only.",
        4000
      );

      const p1first = pass1Text.indexOf("{");
      const p1last = pass1Text.lastIndexOf("}");
      if (p1first === -1) throw new Error("Pass 1: No JSON found");

      const p1data = JSON.parse(pass1Text.slice(p1first, p1last + 1));
      const roomList: { room: string; startPage: number; endPage: number }[] = p1data.rooms || [];

      if (roomList.length === 0) throw new Error("No rooms found in PDF");
      const address = p1data.address || "";
      logger.log("Pass 1 complete", { rooms: roomList.length });

      await updateJob("running", 10, `Found ${roomList.length} rooms. Starting conversion...`, undefined, undefined, roomList.map(r => r.room));

      // Load PDF for page extraction
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const totalPages = pdfDoc.getPageCount();

      const allRooms: any[] = [];

      // Pass 2: Process each room
      for (let i = 0; i < roomList.length; i++) {
        const roomInfo = roomList[i];
        const startPage = Math.max(1, roomInfo.startPage);
        const endPage = Math.min(roomInfo.endPage, totalPages);
        const progress = Math.round(10 + ((i / roomList.length) * 85));

        await updateJob("running", progress, `Converting room ${i + 1}/${roomList.length}: ${roomInfo.room}`);
        logger.log(`Processing room ${i + 1}/${roomList.length}: ${roomInfo.room}`);

        try {
          // Extract pages for this room
          const roomPdf = await PDFDocument.create();
          const pageIndices = [];
          for (let p = startPage - 1; p < endPage; p++) pageIndices.push(p);
          const copiedPages = await roomPdf.copyPages(pdfDoc, pageIndices);
          copiedPages.forEach(page => roomPdf.addPage(page));

          const roomPdfBytes = await roomPdf.save();
          const roomBase64 = Buffer.from(roomPdfBytes).toString("base64");

          const pass2Text = await callVisionAPI(
            roomBase64,
            PASS2_SYSTEM,
            `This section is: ${roomInfo.room}\n\nExtract ALL inventory rows. Return raw JSON only.`,
            16000
          );

          if (!pass2Text) {
            logger.log(`Room ${roomInfo.room}: empty response, skipping`);
            continue;
          }

          const p2first = pass2Text.indexOf("{");
          const p2last = pass2Text.lastIndexOf("}");
          if (p2first === -1) continue;

          let roomData: any;
          try {
            roomData = JSON.parse(pass2Text.slice(p2first, p2last + 1));
          } catch (e) {
            logger.log(`Room ${roomInfo.room}: JSON parse failed`);
            continue;
          }

          let rows = roomData.rows || [];

          // Filter out Further views and photo reference rows
          rows = rows.filter((row: any) => {
            const item = (row.item || "").toLowerCase().trim();
            const desc = (row.description || "").toLowerCase().trim();
            if (item === "further views" || item === "further view") return false;
            if (item === "photographs at point of inventory") return false;
            if (/^ref\s*#/.test(item)) return false;
            if (/^ref\s*#/.test(desc)) return false;
            if (/^\d+\s+\w{3}\s+\d{4}\s+\d{2}:\d{2}/.test(item)) return false;
            return true;
          });

          if (rows.length > 0) {
            // Add Further views as first row (standard format)
            rows = [{ item: "Further views", description: "", condition: "" }, ...rows];
            allRooms.push({ roomName: roomInfo.room, rows });
          }

        } catch (roomErr: any) {
          logger.log(`Room ${roomInfo.room}: error - ${roomErr.message}`);
          continue;
        }
      }

      if (allRooms.length === 0) throw new Error("No rooms extracted");

      await updateJob("complete", 100, `Complete — ${allRooms.length} rooms converted`, allRooms, address);
      logger.log("Vision conversion complete", { rooms: allRooms.length });

      return { success: true, rooms: allRooms.length };

    } catch (err: any) {
      await updateJob("error", 0, err.message);
      throw err;
    }
  }
});
