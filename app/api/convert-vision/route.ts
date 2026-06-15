export const maxDuration = 300
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SYSTEM = `Convert inventory text to JSON. Extract room data only.

IGNORE entirely: abbreviations pages, contents pages, property summary pages, parking, appliance lists, smoke detector pages, legionella pages, meter reading pages, key pages.

PROCESS every room from start to end - never stop early. Never drop any item.

COPY EXACTLY: Copy the ITEM column content exactly as it appears in the PDF. Do NOT invent, interpret or rename items. If the item column contains a number (1, 2, 3), copy the number. If it contains a name (Door, Ceiling), copy the name. Never replace numbers with guessed item names.

DASH ITEMS: In some PDFs, the Item column contains only a dash (-). This means the row has no specific item name. When you see - in the Item column, always keep it as - in the Item column. Never replace the dash with the Description text.

APPLIANCE INTERNALS: When an appliance row includes the appliance name followed by a specific appliance part, keep both the appliance name and the part name together in the Item column. Do not move appliance parts such as Fridge door interior, Freezer door interior, Oven interior, Dishwasher interior, Washing machine drawer, Microwave interior, or similar into the Description column.

CONDITION TRIGGERS: Defect/status words like Dropped, chipped, marked, scratched, stained, loose, cracked, broken, grubby, PM, RC, ODU should normally start/continue the Condition column.

EXTERNAL SECTIONS: The PDF may contain sections that are not standard rooms but must still be treated as room-level headers. These include: External Surfaces, External Features, and Boundaries. Do not skip these sections.

EMPTY COLUMNS: If a column is blank in the PDF, leave it blank in the output. Never move content from one column to fill an empty column.

PAGE BREAKS: Items belonging to a room may continue on the next page BEFORE the next room heading appears. These items belong to the CURRENT room, not the next room.

NUMBERED ITEMS: Each number (1, 2, 3...) represents exactly ONE row. Never split a single numbered item across multiple rows.

BRACKETED CONDITIONS: Some PDFs include condition notes in brackets within the description column. When you see text in brackets that describes a condition, defect, or state - extract it from the description and place it in the CONDITION column instead.

COMPLETENESS: Every single numbered item must appear in the output. Never truncate or summarise.

REF NUMBER RULE: Some PDFs have a Ref column (containing numbers like 2.1, 3.4) alongside a Name column (containing item names like "Front Door", "Flooring", "Walls").
- The Ref column is ALWAYS ignored. Never put ref numbers in the Item column.
- The Name column contains the item name. Always put the Name column value in the Item column.
- If no Name column exists and only a ref number is present, then put the ref number in the Item column.

COLUMN DETECTION - first identify how many columns this PDF has, then apply the correct mapping:

Format A - 4 columns (Number | Description | Condition/Comments | extras):
- Column 1 is sequential numbers → put number into ITEM
- Column 2 is descriptive text → put into DESCRIPTION
- Column 3 is condition/comments → put into CONDITION

Format B - 4 columns (Number | Item name | Description | Condition):
- Column 1 is sequential numbers → IGNORE
- Column 2 is short item names → put into ITEM
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
- Column 1 is number → put number ONLY into ITEM
- Column 2 is descriptive text → DESCRIPTION
- Column 3 is condition → CONDITION

RULES:
- No number prefix on room names
- Strip photo counts and duplicate conditions (Good Good becomes Good)
- First row of every room: item="Further views", description="", condition=""
- Copy each column content EXACTLY - never correct spelling, never mix content between columns
- Separate multiple values with " | "
- Never truncate or summarise - copy ALL rows

OUTPUT raw JSON only: {"address":"","pages":1,"rooms":[{"roomName":"","rows":[{"item":"","description":"","condition":""}]}]}`

export async function POST(req: NextRequest) {
  try {
    const { pdfPath } = await req.json()
    if (!pdfPath) return NextResponse.json({ error: "No pdfPath provided" }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: signed, error: signErr } = await supabase.storage.from("documents").createSignedUrl(pdfPath, 120)
    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ error: "Could not get signed URL: " + (signErr?.message || "unknown") }, { status: 500 })
    }

    const pdfRes = await fetch(signed.signedUrl)
    if (!pdfRes.ok) return NextResponse.json({ error: "Could not fetch PDF: " + pdfRes.status }, { status: 500 })

    const pdfBuffer = await pdfRes.arrayBuffer()
    const base64 = Buffer.from(pdfBuffer).toString("base64")
    console.log("Vision convert: PDF fetched, base64 length:", base64.length)

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.OPENAI_API_KEY },
      body: JSON.stringify({
        model: "gpt-4.1",
        max_output_tokens: 32000,
        temperature: 0,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: SYSTEM + "\n\nExtract ALL rooms from this PDF. Return raw JSON only." },
              { type: "input_file", filename: "inventory.pdf", file_data: "data:application/pdf;base64," + base64 }
            ]
          }
        ]
      })
    })

    const d = await r.json()
    console.log("Vision convert: OpenAI response status:", r.status)

    let responseText = ""
    if (d.output_text) {
      responseText = d.output_text
    } else if (d.output && Array.isArray(d.output)) {
      for (const item of d.output) {
        if (item.content && Array.isArray(item.content)) {
          for (const c of item.content) {
            if (c.type === "output_text" && c.text) responseText += c.text
          }
        }
      }
    }

    console.log("Vision convert: Response text length:", responseText.length)

    if (!responseText) {
      return NextResponse.json({ error: "Empty response from vision API", raw: JSON.stringify(d).slice(0, 1000) }, { status: 500 })
    }

    const first = responseText.indexOf("{")
    const last = responseText.lastIndexOf("}")
    if (first === -1) throw new Error("No JSON in vision response")

    let s = responseText.slice(first, last + 1).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    let data: any
    try { data = JSON.parse(s) } catch (e) { data = JSON.parse(s.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]")) }

    if (!data.rooms || data.rooms.length === 0) throw new Error("No rooms found in vision response")

    return NextResponse.json({
      address: data.address || "",
      pages: data.rooms.length,
      rooms: data.rooms,
      _extractedText: ""
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
