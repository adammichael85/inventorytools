export const maxDuration = 300
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'

const SYSTEM = `Convert inventory text to JSON. Extract room data only.

IGNORE entirely: abbreviations pages, contents pages, property summary pages, parking, appliance lists, smoke detector pages, legionella pages, meter reading pages, key pages.

PROCESS every room from start to end - never stop early. Never drop any item.

COPY EXACTLY: Copy the ITEM column content exactly as it appears in the PDF. Do NOT invent, interpret or rename items. If the item column contains a number (1, 2, 3), copy the number. If it contains a name (Door, Ceiling), copy the name. Never replace numbers with guessed item names.

EMPTY COLUMNS: If a column is blank in the PDF, leave it blank in the output. Never move content from one column to fill an empty column. A blank Description must stay blank even if Condition has text.

PAGE BREAKS: Items belonging to a room may continue on the next page BEFORE the next room heading appears. These items belong to the CURRENT room, not the next room. Only start a new room when you see a new room heading.

NUMBERED ITEMS: Each number (1, 2, 3...) represents exactly ONE row. Never split a single numbered item across multiple rows even if it contains multiple sentences or describes multiple things. Keep all text for that number in one row.

BRACKETED CONDITIONS: Some PDFs include condition notes in brackets within the description column, e.g. "White brick wall (some bricks missing at top)". When you see text in brackets that describes a condition, defect, or state - extract it from the description and place it in the CONDITION column instead. Remove the brackets. The description should contain only the physical description without the bracketed condition note. IMPORTANT: Any text that appears AFTER the closing bracket must NEVER be dropped. Append it to the CONDITION field after the bracketed text. Example: 'Wood door (stiff to close). 1 bolt key.' → Description: 'Wood door.' Condition: 'stiff to close. 1 bolt key.' Example: 'Mattress (worn). Fire resistant.' → Description: 'Mattress.' Condition: 'worn. Fire resistant.'

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

Format E - any other format:
- Use best judgement to map to ITEM, DESCRIPTION, CONDITION
- Never leave data out

RULES:
- No number prefix on room names
- Strip photo counts and duplicate conditions (Good Good becomes Good)
- First row of every room: item="Further views", description="", condition=""
- Copy each column content EXACTLY - never correct spelling, never mix content between columns
- Separate multiple values with " | "
- Never truncate or summarise - copy ALL rows

OUTPUT raw JSON only: {"address":"","pages":1,"rooms":[{"roomName":"","rows":[{"item":"","description":"","condition":""}]}]}\``

export async function POST(req: NextRequest) {
  try {
    const { extractedText, base64, mediaType } = await req.json()
    let responseText = ""
    if (extractedText && extractedText.length > 100) {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.OPENAI_API_KEY },
        body: JSON.stringify({ model: "gpt-4.1-2025-04-14", max_tokens: 16000, temperature: 0, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: extractedText + "\n\nExtract ALL rooms. Return raw JSON only." }] })
      })
      const d = await r.json()
      responseText = d.choices?.[0]?.message?.content?.trim() || ""; console.log("GPT response length:", responseText.length); console.log("GPT first 500:", responseText.slice(0, 500)); console.log("GPT last 200:", responseText.slice(-200))
    } else {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 8192, system: SYSTEM, messages: [{ role: "user", content: [{ type: "document", source: { type: "base64", media_type: mediaType, data: base64 } }, { type: "text", text: "Extract ALL rooms. Return raw JSON only." }] }] })
      })
      const d = await r.json()
      responseText = (d.content || []).map((c: any) => c.text || "").join("").trim()
    }
    const first = responseText.indexOf("{")
    const last = responseText.lastIndexOf("}")
    if (first === -1) throw new Error("No JSON")
    let s = responseText.slice(first, last+1).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,"")
    let data: any
    try { data = JSON.parse(s) } catch(e) { data = JSON.parse(s.replace(/,\s*}/g,"}").replace(/,\s*]/g,"]")) }
    if (!data.rooms || data.rooms.length === 0) throw new Error("No rooms found")
    return NextResponse.json({ address: data.address || "", pages: data.rooms.length, rooms: data.rooms })
  } catch(err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}
