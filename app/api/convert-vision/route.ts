export const maxDuration = 300
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PDFDocument } from 'pdf-lib'

const PASS1_SYSTEM = `You are reading a UK property inventory PDF.

Your ONLY job is to identify every room/area section in this PDF and return their page ranges.

INCLUDE: All room and area headings such as Kitchen, Living Room, Bedroom 1, Bathroom, Entrance Hall, Property Exterior, Boot Room, Stairwell, Landing, WC, Garage, Garden, External Surfaces, Boundaries, Courtyard, Carport, etc.

EXCLUDE: Cover page, contents page, notes, disclaimers, checklists, keys and utilities, meter readings, declaration, terms and conditions, abbreviations pages.

Return ONLY raw JSON, no markdown, no explanation:
{"rooms":[{"room":"Kitchen","startPage":5,"endPage":12},{"room":"Living Room","startPage":13,"endPage":18}]}`

const PASS2_SYSTEM = `Convert inventory text to JSON. Extract room data only.

IGNORE entirely: abbreviations pages, contents pages, property summary pages, parking, appliance lists, smoke detector pages, legionella pages, meter reading pages, key pages.

PROCESS every room from start to end - never stop early. Never drop any item.

COPY EXACTLY: Copy the ITEM column content exactly as it appears in the PDF. Do NOT invent, interpret or rename items. If the item column contains a number (1, 2, 3), copy the number. If it contains a name (Door, Ceiling), copy the name. Never replace numbers with guessed item names.

DASH ITEMS: In some PDFs, the Item column contains only a dash (-). This means the row has no specific item name. When you see - in the Item column, always keep it as - in the Item column. Never replace the dash with the Description text.

APPLIANCE INTERNALS: When an appliance row includes the appliance name followed by a specific appliance part, keep both the appliance name and the part name together in the Item column. Do not move appliance parts such as Fridge door interior, Freezer door interior, Oven interior, Dishwasher interior, Washing machine drawer, Microwave interior, or similar into the Description column. The Description column should only contain the contents, fittings, shelves, drawers, racks, compartments, trays, or accessories inside that appliance section. Example: Correct: Item: Russell Hobbs fridge/freezer Fridge door interior Description: 1 x Bottle compartment, 2 x Dairy shelves, 1 x Salad crisper, 3 x Shelves, 3 x Drawers Condition: Marked Top 2 drawers cracked. Wrong: Item: Russell Hobbs fridge/freezer Description: Fridge door interior 1 x Bottle compartment, 2 x Dairy shelves Condition: Marked.

CONDITION TRIGGERS: Defect/status words like Dropped, chipped, marked, scratched, stained, loose, cracked, broken, grubby, PM, RC, ODU should normally start/continue the Condition column.

EXTERNAL SECTIONS: The PDF may contain sections that are not standard rooms but must still be treated as room-level headers and converted into their own table sections. These include: External Surfaces, External Features, and Boundaries. Do not skip these sections. Each must appear as a bold room heading followed by a three-column table (ITEM | DESCRIPTION | CONDITION), with data extracted from whatever columns are present in the source (e.g. Surface Type, Location, Details, Qty, Colour, Condition, Comments). If no condition is stated, leave the Condition cell blank. Treat these sections identically to rooms like Living Room or Kitchen.

SEPARATE LINE FORMAT: Some PDFs have numbers and text on separate lines due to text extraction (e.g. '1' on one line then 'Outside Front.' on the next line, then '2' then 'White brick wall...'). When you see this pattern, treat each number+text pair as one item. If a standalone word or phrase after a number looks like a room/area name (Outside Front, Hall, Kitchen etc), treat it as a ROOM HEADING and start a new room.

EMPTY COLUMNS: If a column is blank in the PDF, leave it blank in the output. Never move content from one column to fill an empty column. A blank Description must stay blank even if Condition has text.

PAGE BREAKS: Items belonging to a room may continue on the next page BEFORE the next room heading appears. These items belong to the CURRENT room, not the next room. Only start a new room when you see a new room heading.

NUMBERED ITEMS: Each number (1, 2, 3...) represents exactly ONE row. Never split a single numbered item across multiple rows even if it contains multiple sentences or describes multiple things. Keep all text for that number in one row.

BRACKETED CONDITIONS: Some PDFs include condition notes in brackets within the description column, e.g. "White brick wall (some bricks missing at top)". When you see text in brackets that describes a condition, defect, or state - extract it from the description and place it in the CONDITION column instead. Remove the brackets. The description should contain only the physical description without the bracketed condition note. IMPORTANT: Any text that appears AFTER the closing bracket must NEVER be dropped. Append it to the CONDITION field after the bracketed text. Example: 'Wood door (stiff to close). 1 bolt key.' → Description: 'Wood door.' Condition: 'stiff to close. 1 bolt key.' Example: 'Mattress (worn). Fire resistant.' → Description: 'Mattress.' Condition: 'worn. Fire resistant.'


COLUMN MERGING RULE — 4-Column Source Documents with Cleanliness:
Some source PDFs contain four columns: Item, Description, Condition, and Cleanliness. The output Word document always uses three columns only: Item, Description, Condition.
When the source PDF has both a Condition value and a Cleanliness value, merge them into the single output Condition cell as follows:
- Line 1: the Condition value (e.g. Excellent, Good, Fair, Poor — or any other text)
- Line 2: "Cleanliness," followed by the Cleanliness value
Examples:
- Condition: Good / Cleanliness: Good → output: Good\nCleanliness, Good
- Condition: Fair / Cleanliness: Poor → output: Fair\nCleanliness, Poor
- Condition: Excellent / Cleanliness: Good → output: Excellent\nCleanliness, Good
- Condition: Poor / Cleanliness: Fair → output: Poor\nCleanliness, Fair
Edge cases:
- If Cleanliness is blank or N/A — output Condition value only, no second line
- If Condition is blank but Cleanliness has a value — output: Cleanliness, [value]
- If both are blank — leave the cell empty
The Condition value can be any word or phrase — do not restrict or normalise it, output exactly as it appears in the source.

COMPLETENESS: Every single numbered item must appear in the output. If you are near the end of the document, do not stop - continue until the very last item in the very last room.

ROOM HEADINGS IN NUMBERED FORMAT: If a numbered item contains only a location or area name (e.g. '1 Outside Front' or '8 Hall' or '15 Sitting Room'), treat it as a room heading not an inventory row.

COLUMN DETECTION - first identify how many columns this PDF has, then apply the correct mapping:

Format A - 4 columns (Number | Description | Condition/Comments | extras):
- Column 1 is sequential numbers (1, 2, 3...) → put number into ITEM
- Column 2 is descriptive text → put into DESCRIPTION
- Column 3 is condition/comments → put into CONDITION
- Any extra columns → append to CONDITION separated by " | "

Format B - 4 columns (Number | Item name | Description | Condition):
- Column 1 is sequential numbers → IGNORE, do not include
- Column 2 is short item names (Door, Ceiling, Walls, Floor etc) → put into ITEM
- Column 3 is descriptive text → put into DESCRIPTION
- Column 4 is condition → put into CONDITION

Format C - 3 columns (Item | Description | Condition):
- Column 1 is item names → ITEM
- Column 2 is descriptive text → DESCRIPTION
- Column 3 is condition → CONDITION

Format D - 2 columns (Item/Description combined | Condition):
- Column 1 is combined item and description → put into ITEM, leave DESCRIPTION blank
- Column 2 is condition → CONDITION

Format E - 3 columns (Number | Description | Condition):
- Column 1 is number → put number ONLY into ITEM, numbers must match exactly as they appear in the original PDF - do not reset or renumber

Format F - 5 columns (Item | Description | Condition | Cleanliness | Photos):
- Column 1 is item name → ITEM
- Column 2 is descriptive text → DESCRIPTION
- Column 3 is condition → first line of CONDITION
- Column 4 is cleanliness → second line of CONDITION as "Cleanliness, [value]"
- Column 5 is photos → IGNORE entirely
- Apply COLUMN MERGING RULE above for combining Condition and Cleanliness
- Column 2 is descriptive text → DESCRIPTION
- Column 3 is condition → CONDITION

RULES:
- No number prefix on room names
- Strip photo counts and duplicate conditions (Good Good becomes Good)
- First row of every room: item="Further views", description="", condition=""
- Copy each column content EXACTLY - never correct spelling, never mix content between columns
- Separate multiple values with " | "
- Never truncate or summarise - copy ALL rows

OUTPUT raw JSON only: {"address":"","pages":1,"rooms":[{"roomName":"","rows":[{"item":"","description":"","condition":""}]}]}\`

REF NUMBER RULE: If BOTH a ref number AND an item name are present, put the ITEM NAME in item. Never put ref numbers like "2.1", "3.4" in item when an item name is also present.

CORD KEEP RULE: "Cord keep attached." always goes in condition, never description.

Return ONLY raw JSON with all rooms:
{"rooms":[{"roomName":"Kitchen","rows":[{"item":"Door","description":"White painted wood","condition":"Good"}]}]}`

export async function POST(req: NextRequest) {
  try {
    const { pdfPath } = await req.json()
    if (!pdfPath) return NextResponse.json({ error: "No pdfPath provided" }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch PDF from Supabase
    const { data: signed, error: signErr } = await supabase.storage.from("documents").createSignedUrl(pdfPath, 300)
    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ error: "Could not get signed URL: " + (signErr?.message || "unknown") }, { status: 500 })
    }

    const pdfRes = await fetch(signed.signedUrl)
    if (!pdfRes.ok) return NextResponse.json({ error: "Could not fetch PDF: " + pdfRes.status }, { status: 500 })

    const pdfBuffer = await pdfRes.arrayBuffer()
    const fullBase64 = Buffer.from(pdfBuffer).toString("base64")
    console.log("Vision single-pass: PDF fetched, size:", pdfBuffer.byteLength)

    // Single pass: send full PDF and extract all rooms at once
    const SINGLE_SYSTEM = PASS2_SYSTEM.replace(
      'Return ONLY raw JSON:\n{"rows":[{"item":"Front Door","description":"White UPVC double glazed...","condition":"Minor weathering."}]}',
      'Return ONLY raw JSON with all rooms:\n{"rooms":[{"roomName":"Kitchen","rows":[{"item":"Door","description":"White painted wood","condition":"Good"}]}]}'
    )

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.OPENAI_API_KEY },
      body: JSON.stringify({
        model: "gpt-4.1",
        max_output_tokens: 32000,
        temperature: 0,
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: SINGLE_SYSTEM + "\n\nExtract ALL rooms and ALL rows from this inventory PDF. Return raw JSON only." },
            { type: "input_file", filename: "inventory.pdf", file_data: "data:application/pdf;base64," + fullBase64 }
          ]
        }]
      })
    })

    const responseData = await response.json()
    let responseText = ""
    if (responseData.output_text) {
      responseText = responseData.output_text
    } else if (responseData.output && Array.isArray(responseData.output)) {
      for (const item of responseData.output) {
        if (item.content && Array.isArray(item.content)) {
          for (const c of item.content) {
            if (c.type === "output_text" && c.text) responseText += c.text
          }
        }
      }
    }

    console.log("Single pass response (first 500):", responseText.slice(0, 500))

    const first = responseText.indexOf("{")
    const last = responseText.lastIndexOf("}")
    if (first === -1) throw new Error("No JSON found in response")

    let parsed: any
    try {
      parsed = JSON.parse(responseText.slice(first, last + 1))
    } catch (e) {
      throw new Error("JSON parse failed: " + responseText.slice(0, 200))
    }

    let allRooms = parsed.rooms || []

    // Filter out Further views and photo reference rows from each room
    allRooms = allRooms.map((room: any) => ({
      ...room,
      rows: (room.rows || []).filter((row: any) => {
        const item = (row.item || "").toLowerCase().trim()
        const desc = (row.description || "").toLowerCase().trim()
        if (item === "further views" || item === "further view") return false
        if (item === "photographs at point of inventory") return false
        if (/^ref\s*#/.test(item)) return false
        if (/^ref\s*#/.test(desc)) return false
        if (/^\d+\s+\w{3}\s+\d{4}\s+\d{2}:\d{2}/.test(item)) return false
        return true
      })
    })).filter((room: any) => room.rows.length > 0)

    if (allRooms.length === 0) throw new Error("No rooms extracted")

    console.log("Single-pass complete:", allRooms.length, "rooms total")

    // Extract address from pdfPath
    const pathParts = pdfPath.split("/")
    const filename = pathParts[pathParts.length - 1] || ""
    const address = filename.replace(/[_-]/g, " ").replace(/\.(pdf|docx)$/i, "").trim()

    return NextResponse.json({
      address,
      pages: allRooms.length,
      rooms: allRooms,
      _extractedText: ""
    })

  } catch (err: any) {
    console.error("Vision single-pass error:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}