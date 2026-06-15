import { task, logger } from "@trigger.dev/sdk/v3";
import { PDFDocument } from "pdf-lib";
import { createClient } from "@supabase/supabase-js";

const PASS1_SYSTEM = `You are reading a UK property inventory PDF.

Your ONLY job is to identify every room/area section in this PDF and return their page ranges.

INCLUDE: All room and area headings such as Kitchen, Living Room, Bedroom 1, Bathroom, Entrance Hall, Property Exterior, Boot Room, Stairwell, Landing, WC, Garage, Garden, External Surfaces, Boundaries, Courtyard, Carport, etc.

EXCLUDE: Cover page, contents page, notes, disclaimers, checklists, keys and utilities, meter readings, declaration, terms and conditions, abbreviations pages.

Return ONLY raw JSON, no markdown, no explanation:
{"rooms":[{"room":"Kitchen","startPage":5,"endPage":12},{"room":"Living Room","startPage":13,"endPage":18}]}`;

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
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    async function updateJob(status: string, progress: number, message: string, rooms?: any[]) {
      await supabase.from("vision_jobs").upsert({
        id: jobId,
        user_id: userId,
        status,
        progress,
        message,
        rooms: rooms ? JSON.stringify(rooms) : null,
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
      logger.log("Pass 1 complete", { rooms: roomList.length });

      await updateJob("running", 10, `Found ${roomList.length} rooms. Starting conversion...`);

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
            8000
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
            allRooms.push({ roomName: roomInfo.room, rows });
          }

        } catch (roomErr: any) {
          logger.log(`Room ${roomInfo.room}: error - ${roomErr.message}`);
          continue;
        }
      }

      if (allRooms.length === 0) throw new Error("No rooms extracted");

      await updateJob("complete", 100, `Complete — ${allRooms.length} rooms converted`, allRooms);
      logger.log("Vision conversion complete", { rooms: allRooms.length });

      return { success: true, rooms: allRooms.length };

    } catch (err: any) {
      await updateJob("error", 0, err.message);
      throw err;
    }
  }
});
