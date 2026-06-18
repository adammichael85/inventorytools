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

const PASS2_SYSTEM = `You are converting a section of a UK property inventory PDF into structured JSON.

This PDF extract contains ONE room or area. Extract every inventory row from the table.

IGNORE completely:
- Rows where the item is "Further views" or similar photo-reference rows
- Rows where the item or description is just a photo reference like "Ref # 3.1" or "Ref #5" or similar
- Any text that is just a photo caption or timestamp like "17 Aug 2023 10:28"
- Cover pages, disclaimers, declaration pages, abbreviations pages, contents pages, property summary pages

COPY EXACTLY: Copy the ITEM column content exactly as it appears in the PDF. Do NOT invent, interpret or rename items. If the item column contains a number (1, 2, 3), copy the number. If it contains a name (Door, Ceiling), copy the name. Never replace numbers with guessed item names.

DASH ITEMS: In some PDFs, the Item column contains only a dash (-). This means the row has no specific item name. When you see - in the Item column, always keep it as - in the Item column. Never replace the dash with the Description text.

APPLIANCE INTERNALS: When an appliance row includes the appliance name followed by a specific appliance part, keep both the appliance name and the part name together in the Item column. Do not move appliance parts such as Fridge door interior, Freezer door interior, Oven interior, Dishwasher interior, Washing machine drawer, Microwave interior, or similar into the Description column. The Description column should only contain the contents, fittings, shelves, drawers, racks, compartments, trays, or accessories inside that appliance section.

CONDITION TRIGGERS: Defect/status words like Dropped, chipped, marked, scratched, stained, loose, cracked, broken, grubby, PM, RC, ODU should normally start/continue the Condition column.

EXTERNAL SECTIONS: The PDF may contain sections that are not standard rooms but must still be treated as room-level headers. These include: External Surfaces, External Features, and Boundaries. Treat these identically to rooms like Living Room or Kitchen.

EMPTY COLUMNS: If a column is blank in the PDF, leave it blank in the output. Never move content from one column to fill an empty column.

BRACKETED CONDITIONS: Some PDFs include condition notes in brackets within the description column e.g. "White brick wall (some bricks missing at top)". When you see text in brackets that describes a condition, defect, or state - extract it from the description and place it in the CONDITION column instead. Remove the brackets. Any text AFTER the closing bracket must NEVER be dropped — append it to the CONDITION field.

REF NUMBER RULE: If BOTH a ref number AND an item name are present, put the ITEM NAME in item. Never put ref numbers like "2.1", "3.4" in item when an item name is also present.

CORD KEEP RULE: "Cord keep attached." always goes in condition, never description.

COLUMN DETECTION — first identify how many columns this PDF has, then apply the correct mapping:

Format A - 4 columns (Number | Description | Condition/Comments | extras):
- Column 1 is sequential numbers (1, 2, 3...) → put number into ITEM
- Column 2 is descriptive text → DESCRIPTION
- Column 3 is condition/comments → CONDITION
- Any extra columns → append to CONDITION separated by " | "

Format B - 4 columns (Number | Item name | Description | Condition):
- Column 1 is sequential numbers → IGNORE
- Column 2 is short item names (Door, Ceiling, Walls, Floor etc) → ITEM
- Column 3 is descriptive text → DESCRIPTION
- Column 4 is condition → CONDITION

Format C - 3 columns (Item | Description | Condition):
- Column 1 is item names → ITEM
- Column 2 is descriptive text → DESCRIPTION
- Column 3 is condition → CONDITION

Format D - 2 columns (Item/Description combined | Condition):
- Column 1 is combined item and description → ITEM, leave DESCRIPTION blank
- Column 2 is condition → CONDITION

Format E - 3 columns (Number | Description | Condition):
- Column 1 is number → ITEM (copy exactly, do not reset or renumber)
- Column 2 is descriptive text → DESCRIPTION
- Column 3 is condition → CONDITION

Format F - 5 columns (Item | Description | Condition | Cleanliness | Photos):
- Column 1 is item name → ITEM
- Column 2 is descriptive text → DESCRIPTION
- Column 3 is condition → first line of CONDITION
- Column 4 is cleanliness → second line of CONDITION as "Cleanliness, [value]"
- Column 5 is photos → IGNORE entirely
- The Cleanliness column may show coloured dots (green/amber/red) next to words — read the word, ignore the dot
- Merge: condition field = "[Col3 value]\nCleanliness, [Col4 value]"

COLUMN MERGING RULE — when both Condition and Cleanliness columns exist:
- Line 1: the Condition value
- Line 2: "Cleanliness," followed by the Cleanliness value
- Examples: Good / Good → "Good\nCleanliness, Good" | Fair / Poor → "Fair\nCleanliness, Poor"
- If Cleanliness is blank → output Condition value only
- If Condition is blank but Cleanliness has a value → output "Cleanliness, [value]"
- If both blank → leave empty

Return ONLY raw JSON:
{"rows":[{"item":"Front Door","description":"White UPVC double glazed...","condition":"Minor weathering."}]}`

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
    console.log("Vision two-pass: PDF fetched, size:", pdfBuffer.byteLength)

    // ── PASS 1: Get room list and page ranges ──
    console.log("Pass 1: extracting room list...")
    const pass1 = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.OPENAI_API_KEY },
      body: JSON.stringify({
        model: "gpt-4.1",
        max_output_tokens: 4000,
        temperature: 0,
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: PASS1_SYSTEM },
            { type: "input_file", filename: "inventory.pdf", file_data: "data:application/pdf;base64," + fullBase64 }
          ]
        }]
      })
    })

    const pass1Data = await pass1.json()
    let pass1Text = ""
    if (pass1Data.output_text) {
      pass1Text = pass1Data.output_text
    } else if (pass1Data.output && Array.isArray(pass1Data.output)) {
      for (const item of pass1Data.output) {
        if (item.content && Array.isArray(item.content)) {
          for (const c of item.content) {
            if (c.type === "output_text" && c.text) pass1Text += c.text
          }
        }
      }
    }

    console.log("Pass 1 response:", pass1Text.slice(0, 500))

    const p1first = pass1Text.indexOf("{")
    const p1last = pass1Text.lastIndexOf("}")
    if (p1first === -1) throw new Error("Pass 1: No JSON found")

    let roomList: { room: string, startPage: number, endPage: number }[]
    try {
      const p1data = JSON.parse(pass1Text.slice(p1first, p1last + 1))
      roomList = p1data.rooms || []
    } catch (e) {
      throw new Error("Pass 1: JSON parse failed: " + pass1Text.slice(0, 200))
    }

    if (roomList.length === 0) throw new Error("Pass 1: No rooms found")
    console.log("Pass 1 found", roomList.length, "rooms:", roomList.map(r => r.room).join(", "))

    // Load the PDF for page extraction
    const pdfDoc = await PDFDocument.load(pdfBuffer)
    const totalPages = pdfDoc.getPageCount()
    console.log("PDF total pages:", totalPages)

    // ── PASS 2: Process each room individually ──
    const allRooms: { roomName: string, rows: { item: string, description: string, condition: string }[] }[] = []

    // Extract address from first room's context (use property name from pdfPath)
    let address = ""
    const pathParts = pdfPath.split("/")
    const filename = pathParts[pathParts.length - 1] || ""
    address = filename.replace(/[_-]/g, " ").replace(/\.(pdf|docx)$/i, "").trim()

    for (let i = 0; i < roomList.length; i++) {
      const roomInfo = roomList[i]
      const startPage = Math.max(1, roomInfo.startPage)
      const endPage = Math.min(roomInfo.endPage, totalPages)

      console.log(`Pass 2 [${i + 1}/${roomList.length}]: ${roomInfo.room} pages ${startPage}-${endPage}`)

      try {
        // Extract pages for this room
        const roomPdf = await PDFDocument.create()
        const pageIndices = []
        for (let p = startPage - 1; p < endPage; p++) {
          pageIndices.push(p)
        }
        const copiedPages = await roomPdf.copyPages(pdfDoc, pageIndices)
        copiedPages.forEach(page => roomPdf.addPage(page))

        const roomPdfBytes = await roomPdf.save()
        const roomBase64 = Buffer.from(roomPdfBytes).toString("base64")

        // Call GPT-4.1 vision for this room
        const pass2 = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.OPENAI_API_KEY },
          body: JSON.stringify({
            model: "gpt-4.1",
            max_output_tokens: 8000,
            temperature: 0,
            input: [{
              role: "user",
              content: [
                { type: "input_text", text: PASS2_SYSTEM + `\n\nThis section is: ${roomInfo.room}\n\nExtract ALL inventory rows. Return raw JSON only.` },
                { type: "input_file", filename: "room.pdf", file_data: "data:application/pdf;base64," + roomBase64 }
              ]
            }]
          })
        })

        const pass2Data = await pass2.json()
        let pass2Text = ""
        if (pass2Data.output_text) {
          pass2Text = pass2Data.output_text
        } else if (pass2Data.output && Array.isArray(pass2Data.output)) {
          for (const item of pass2Data.output) {
            if (item.content && Array.isArray(item.content)) {
              for (const c of item.content) {
                if (c.type === "output_text" && c.text) pass2Text += c.text
              }
            }
          }
        }

        if (!pass2Text) {
          console.log(`Room ${roomInfo.room}: empty response, skipping`)
          continue
        }

        const p2first = pass2Text.indexOf("{")
        const p2last = pass2Text.lastIndexOf("}")
        if (p2first === -1) {
          console.log(`Room ${roomInfo.room}: no JSON, skipping`)
          continue
        }

        let roomData: any
        try {
          roomData = JSON.parse(pass2Text.slice(p2first, p2last + 1))
        } catch (e) {
          console.log(`Room ${roomInfo.room}: JSON parse failed, skipping`)
          continue
        }

        let rows = roomData.rows || []

        // Filter out Further views and photo reference rows
        rows = rows.filter((row: any) => {
          const item = (row.item || "").toLowerCase().trim()
          const desc = (row.description || "").toLowerCase().trim()
          if (item === "further views" || item === "further view") return false
          if (item === "photographs at point of inventory") return false
          if (/^ref\s*#/.test(item)) return false
          if (/^ref\s*#/.test(desc)) return false
          if (/^\d+\s+\w{3}\s+\d{4}\s+\d{2}:\d{2}/.test(item)) return false
          return true
        })

        if (rows.length > 0) {
          allRooms.push({ roomName: roomInfo.room, rows })
          console.log(`Room ${roomInfo.room}: ${rows.length} rows extracted`)
        } else {
          console.log(`Room ${roomInfo.room}: 0 rows after filtering, skipping`)
        }

      } catch (roomErr: any) {
        console.log(`Room ${roomInfo.room}: error - ${roomErr.message}, skipping`)
        continue
      }
    }

    if (allRooms.length === 0) throw new Error("No rooms extracted in pass 2")

    console.log("Two-pass complete:", allRooms.length, "rooms total")

    return NextResponse.json({
      address,
      pages: allRooms.length,
      rooms: allRooms,
      _extractedText: ""
    })

  } catch (err: any) {
    console.error("Vision two-pass error:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
