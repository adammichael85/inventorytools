export const maxDuration = 300
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'

const SYSTEM = `Convert inventory text to JSON. Extract room data only.

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
- Column 1 contains a combined item and description together. This rule applies to EVERY row in this format, including long, unusual, or free-form phrases - not just simple common room nouns like Door or Ceiling. Garden, exterior, and unusual items must be split exactly the same way as indoor items - never leave these combined just because the phrasing is longer or less standard.
- Split this text: identify the core physical object/noun being described, however far into the sentence it appears (Door, Carpet, Mixer tap, Path, Gate, Border, Bin, Fence, Bush, Bench, Planter, Shed, etc.) → ITEM. Every descriptive qualifier around it (material, colour, style, brand, fittings, quantity, location detail like "LHS"/"RHS", attached features) → DESCRIPTION.
- Do not put the entire combined text into ITEM and leave DESCRIPTION blank - always split it properly, no matter how long or unusual the phrase is.
- Example: "White wooden door" → ITEM: "Door", DESCRIPTION: "White wooden"
- Example: "Grey fitted carpet" → ITEM: "Flooring", DESCRIPTION: "Grey fitted carpet"
- Example: "Chrome mixer tap with two twist controls" → ITEM: "Mixer tap", DESCRIPTION: "Chrome, two twist controls"
- Example: "Paved path leading up to front of property" → ITEM: "Path", DESCRIPTION: "Paved, leading up to front of property"
- Example: "Wooden panelled side gate with ring pull handle" → ITEM: "Gate", DESCRIPTION: "Wooden panelled, side, with ring pull handle"
- Example: "2 x circular borders with trees" → ITEM: "Borders", DESCRIPTION: "2 x circular, with trees"
- Example: "Wooden fencing LHS with border to the base with shrubs" → ITEM: "Fencing", DESCRIPTION: "Wooden, LHS, with border to the base with shrubs"
- Before finishing each room, re-check every row - if ITEM still contains a full sentence-like phrase with DESCRIPTION left blank, go back and split it properly.
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

Format G - 3 columns labelled Room | Description | Comment (NOT Item | Description | Condition):
- This format uses different column headers: "Room", "Description", "Comment" instead of "Item", "Description", "Condition"
- The "Room" column contains a generic, repeated value like "Original Report" — this is NOT an item name. IGNORE this column entirely, do not put its value anywhere.
- The "Description" column in this format contains BOTH a reference number AND an item name together, e.g. "20. Windows" or "21. Walls"
  - Split this: the reference number (e.g. "20.") → goes in ITEM
  - The item name after the number (e.g. "Windows") → goes in DESCRIPTION
- The "Comment" column → goes directly into CONDITION, unchanged
- Example: Room="Original Report", Description="20. Windows", Comment="Repair marks under window facing" → ITEM: "20.", DESCRIPTION: "Windows", CONDITION: "Repair marks under window facing"
- Detect this format by the column headers themselves: if you see "Room", "Description", "Comment" as the three headers, apply this rule instead of any other format above.

Format H - SRP Inventories landscape format, 5 columns (Ref | Name | Description | Condition | Additional Comments):
- Detect this format by: landscape page orientation, column headers "Ref", "Name", "Description", "Condition", "Additional Comments", and Ref numbers formatted like 1.1, 1.2, 2.1, 2.2.
- Column "Ref" → IGNORE, do not include in output. Use only internally to confirm row order and that no rows are skipped or merged.
- Column "Name" → ITEM
- Column "Description" → DESCRIPTION
- Column "Condition" → first line(s) of CONDITION
- Column "Additional Comments" → if it contains text, append it underneath the Condition text on a separate line in the CONDITION field. If blank, add nothing extra.
- A valid inventory row starts with a Ref number such as 1.1, 1.2, 1.3, 2.1, 2.2, 2.3. Use the Ref number as the row anchor. Keep all text in the same row until the next Ref number begins. Do not merge two Ref rows together, and do not split one Ref row into multiple output rows.
- Preserve every condition statement on its own line where the source shows multiple semicolon-separated statements.
- Preserve terms exactly: UPVC, ADT, Chubb, Ref, Yale, thermostat, trickle vents, securely mounted, tested and working, not tested, newly decorated, used condition, good order, intact. Do not modernise wording or change capitalisation unless clearly an OCR error.

Format I - 5 columns (Number | Item | Description | Condition | Notes):
- Completely ignore the Number column. Do not include the number anywhere in the converted Word document.
- Transfer Item into the Item column.
- Transfer Description into the Description column.
- Transfer Condition into the Condition column.
- Transfer all Notes content into the Condition column, directly after the existing Condition text.
- Place each separate Notes entry on a new line.
- Never create a separate Notes column.
- Never place Notes in the Description column.
- Never omit Notes, as they may contain important defects, damage, marks, cleanliness comments, testing results or other observations.
- If the Condition column is blank, place the Notes content into Condition without adding or inventing any wording.
- If Notes is blank, retain the original Condition only.
- Apply this rule to all pages, including continuation pages where the headings are repeated.
- Example: Number=5, Item="Front Door", Description="Grey painted frame / Grey painted panelled door / Chrome spy hole", Condition="Good", Notes="Small paint chips to panels" → ITEM: "Front Door", DESCRIPTION: "Grey painted frame\nGrey painted panelled door\nChrome spy hole", CONDITION: "Good\nSmall paint chips to panels"
- The Notes information belongs to the same inventory row and must always be merged into that row's Condition cell.

Format J - Ref/Number | Description | Check-In Notes, with bold unnumbered Item headers:
Some reports use this structure: a room name above the table, a Ref/Number column, a Description column, a Check-In Notes column, and bold, unnumbered text inside the table that acts as an Item heading. The bold item headings must not be ignored.

ROOM NAME IDENTIFICATION: The room name is the main heading above the table (e.g. Entrance Hall, Lounge, Bedroom 1, Kitchen, WC, Bathroom, Bedroom 2). Create a new room only when a genuine room heading appears above the table. Do not treat bold text inside the table as a room name.

BOLD ITEM HEADER IDENTIFICATION: Bold text inside the Description column with no Ref number is an Item heading. Examples: Door, Floor, Walls, Ceiling, Fixtures & Fittings, Cupboard 1, Cupboard 2 (High), Cupboard 3 (Small), Bay Window. Each bold item heading must be added to the Word document as its own separate row. Do not merge the numbered rows beneath it into the same row.

COLUMN MAPPING: Ignore the Ref or number column completely.
- Bold unnumbered Item heading -> its own row in the Item column
- Numbered Description entry -> its own separate row
- Check-In Note for that numbered entry -> Condition column on the same row

ITEM HEADER ROW FORMAT: For every bold item heading, create a new Word row. Put the complete bold heading in the Item column. Leave Description blank. Leave Condition blank. Do not assign a number. Do not combine it with the following numbered row.
Example: Item: "Door", Description: "", Condition: ""

NUMBERED ROW FORMAT: Every numbered source row must also become its own separate Word row. Ignore the number. Place the source Description text in the Description column. Place the corresponding Check-In Notes text in the Condition column. Leave Item blank unless the source row itself clearly contains an item name that belongs in Item. Do not merge it into the preceding Item heading row. Do not combine several numbered entries into one row.

EXAMPLE - ENTRANCE HALL:
Source:
Door
1 - Brown wooden door
2 - 4x panes of obscured glass
3 - Brass number '23'
4 - Brass door knocker
5 - Brass Yale lock - Not operational
6 - 2x metal plates
7 - Brass letterbox - Tarnished
8 - Red wooden threshold - Aged
9 - Reverse of door to match - Paint marks, paint splashed, Yale lock not operational, heavily marked

Required Word output rows, in order:
Item: "Door", Description: "", Condition: ""
Item: "", Description: "Brown wooden door", Condition: ""
Item: "", Description: "4x panes of obscured glass", Condition: ""
Item: "", Description: "Brass number '23'", Condition: ""
Item: "", Description: "Brass door knocker", Condition: ""
Item: "", Description: "Brass Yale lock", Condition: "Not operational"
Item: "", Description: "2x metal plates", Condition: ""
Item: "", Description: "Brass letterbox", Condition: "Tarnished"
Item: "", Description: "Red wooden threshold", Condition: "Aged"
Item: "", Description: "Reverse of door to match", Condition: "Paint marks, paint splashed, Yale lock not operational, heavily marked"

EXAMPLE - FLOOR:
Source: Floor / 14 - Blue striped carpet - Frayed by kitchen, aged, 1x burn mark by bathroom door
Required output:
Item: "Floor", Description: "", Condition: ""
Item: "", Description: "Blue striped carpet", Condition: "Frayed by kitchen, aged, 1x burn mark by bathroom door"

EXAMPLE - CUPBOARD 1:
Source: Cupboard 1 / 24 - Cream painted frame / 25 - Cream painted door - Marked / 26 - Cream painted handle / 27 - Chrome bolt lock / 28 - Reverse of door to match / 29 - Wooden plinth with 3x hooks and 3x broken hooks / 30 - Interior painted white - Heavily marked, lots of painted over defects / 31 - 2x white slatted shelves - Aged / 32 - 1x wooden shelf / 33 - Carpet to match
Required output rows, in order:
Item: "Cupboard 1", Description: "", Condition: ""
Item: "", Description: "Cream painted frame", Condition: ""
Item: "", Description: "Cream painted door", Condition: "Marked"
Item: "", Description: "Cream painted handle", Condition: ""
Item: "", Description: "Chrome bolt lock", Condition: ""
Item: "", Description: "Reverse of door to match", Condition: ""
Item: "", Description: "Wooden plinth with 3x hooks and 3x broken hooks", Condition: ""
Item: "", Description: "Interior painted white", Condition: "Heavily marked, lots of painted over defects"
Item: "", Description: "2x white slatted shelves", Condition: "Aged"
Item: "", Description: "1x wooden shelf", Condition: ""
Item: "", Description: "Carpet to match", Condition: ""

CONTINUATION PAGE RULE: Item sections may continue onto the next page without the bold item heading being repeated. When a continuation page begins with numbered rows, continue adding each numbered entry as its own separate row. Do not repeat the previous item heading unless it is actually repeated in the source. Do not create a blank item heading. Do not create a new room. Do not merge the continuation rows together.

CRITICAL RULE: Never ignore bold, unnumbered item headings. Never group all numbered entries beneath an item heading into one Word row. The required structure is: (1) bold item heading as its own Item row, (2) each following numbered description as its own separate row, (3) each corresponding Check-In Note in the Condition cell on that same row, (4) repeat until the next bold item heading or genuine room heading appears.

SRP ROOM DETECTION RULES (critical - this format is prone to missed rooms):
- The room headings look like: "Exterior Front", "Exterior Front (Cont.)", "Entrance And Hallway", "Entrance And Hallway (Cont.)". The "(Cont.)" heading does NOT mean a new room - it means the same room continues. Never skip a room because its heading includes "(Cont.)". Never treat "Room Name (Cont.)" as a separate room. Always merge every "Room Name (Cont.)" section into the main room with the same name.
- If there is a Contents/Areas page listing all rooms, use it as the master list of rooms you must extract. Do not finish the conversion until every room on that list has been checked and either included or clearly flagged as not found.
- A room may have: table pages, then photo pages, then the next room heading. Photo pages do not end a room. Do not stop extraction because a photo block appears - keep scanning forward page by page. The next room only starts when a new numbered room heading appears, for example "3. Dining Room", "4. Kitchen", "5. Utility Room".
- COMMON FAILURE TO AVOID: do not only extract the first few rooms (e.g. Exterior Front, Entrance And Hallway, Dining Room, Kitchen) and stop there. The report continues after photo pages, and later rooms must still be extracted all the way through to the final room in the document.

RULES:
- No number prefix on room names
- Strip photo counts and duplicate conditions (Good Good becomes Good)
- First row of every room: item="Further views", description="", condition=""
- Copy each column content EXACTLY - never correct spelling, never mix content between columns
- Separate multiple values with " | "
- Never truncate or summarise - copy ALL rows

LINE BREAKS WITHIN DESCRIPTION AND CONDITION: When a Description or Condition contains multiple distinct sentences or phrases (this is common when the source PDF has flowing prose rather than short tabular fragments), put each distinct sentence on its own line by separating them with \n. Copy the wording of each sentence EXACTLY as it appears - this is a presentation change only, never reword, shorten, merge or drop any sentence.
Example: "Slightly overpainted to edges. Minor scratches to lock surround. Minor rubs and scuffs to mid and lower. Old defects under." -> "Slightly overpainted to edges.\nMinor scratches to lock surround.\nMinor rubs and scuffs to mid and lower.\nOld defects under."
This applies independently in both the Description column and the Condition column.

UNNUMBERED BOLD SUBSECTION ROWS — MUST BE RETAINED
Some inventory reports contain bold subsection or parent-item rows inside a room table that do not have a reference or index number.
Examples may include:
* Door
* Floor
* Walls
* Ceiling
* Fixtures & Fittings
* Window
* Cupboard 1
* Cupboard 2 (High)
* Cupboard 3 (Small)
* Wardrobe
* Fireplace
* Kitchen Units
* Appliances
These are valid inventory rows and must never be ignored, removed or treated as decorative formatting.
When a bold or visually distinct entry appears inside a room table and its reference/index-number cell is blank, treat it as a subsection or parent item.
Create a separate row in the Word document as follows:
* Item: exact bold subsection text
* Description: blank
* Condition: blank
Preserve the exact wording, numbering, brackets and capitalisation from the source.
Examples:
Door -> Item: Door
Floor -> Item: Floor
Fixtures & Fittings -> Item: Fixtures & Fittings
Cupboard 1 -> Item: Cupboard 1
Cupboard 2 (High) -> Item: Cupboard 2 (High)
The numbered items beneath the subsection must then follow in their original order.
Do not:
* ignore the row because the reference number is blank;
* merge it with the first numbered item beneath it;
* place the first numbered item's wording into the subsection row;
* invent a reference number;
* treat it as a room heading;
* move it outside the room table;
* convert table headers such as "Ref", "Description" or "Check-In Notes" into inventory rows.
A room heading identifies the whole room and normally appears above the table. An unnumbered bold subsection appears inside the table and groups the related items below it.
Example source:
Door
1 Brown wooden door
2 4x panes of obscured glass
3 Brass number '23'
Floor
14 Blue striped carpet
Required output rows in order: Door (blank/blank) -> Brown wooden door -> 4x panes of obscured glass -> Brass number '23' -> Floor (blank/blank) -> Blue striped carpet
Before completing each room, check every bold or visually distinct row inside the source table and confirm that all subsection or parent-item rows have been included in the Word document.
A blank reference number does not mean the row is blank or optional. Missing an unnumbered bold subsection row is a conversion failure.

OUTPUT raw JSON only: {"address":"","pages":1,"rooms":[{"roomName":"","rows":[{"item":"","description":"","condition":""}]}]}\``

export async function POST(req: NextRequest) {
  try {
    const { extractedText, base64, mediaType } = await req.json()
    // Validate file type via magic bytes if base64 is provided
    if (base64) {
      const headerBytes = Buffer.from(base64.slice(0, 8), 'base64')
      const isPDF = headerBytes[0] === 0x25 && headerBytes[1] === 0x50 && headerBytes[2] === 0x44 && headerBytes[3] === 0x46
      const isDocx = headerBytes[0] === 0x50 && headerBytes[1] === 0x4B
      if (!isPDF && !isDocx) return NextResponse.json({ error: 'Invalid file type. Only PDF and Word documents are accepted.' }, { status: 400 })
    }
    let responseText = ""
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let usedClaude = false
    console.log('EXTRACTED TEXT LENGTH:', extractedText?.length || 0)
    if (extractedText && extractedText.length > 100) {
      const CHUNK_SIZE = 90000
      if (extractedText.length <= CHUNK_SIZE) {
        const r = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.OPENAI_API_KEY },
          body: JSON.stringify({ model: "gpt-4.1-2025-04-14", max_tokens: 32000, temperature: 0, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: extractedText + "\n\nExtract ALL rooms. Return raw JSON only." }] })
        })
        const d = await r.json()
        responseText = d.choices?.[0]?.message?.content?.trim() || ""
        totalInputTokens += d.usage?.prompt_tokens || 0
        totalOutputTokens += d.usage?.completion_tokens || 0
        console.log("GPT response length:", responseText.length)
      } else {
        console.log('Large document - processing in chunks')
        const chunks: string[] = []
        let pos = 0
        while (pos < extractedText.length) {
          const end = Math.min(pos + CHUNK_SIZE, extractedText.length)
          if (end === extractedText.length) {
            chunks.push(extractedText.slice(pos))
            break
          }
          let splitAt = end
          const searchSection = extractedText.slice(Math.max(0, end - 5000), end)
          const lines = searchSection.split('\n')
          for (let li = lines.length - 1; li >= 0; li--) {
            const line = lines[li].trim()
            if (line.length > 0 && line.length < 60 && !/^\d+$/.test(line) && !/^\d+\./.test(line)) {
              const beforeLines = lines.slice(0, li).join('\n')
              splitAt = Math.max(0, end - 5000) + beforeLines.length
              break
            }
          }
          chunks.push(extractedText.slice(pos, splitAt))
          pos = splitAt
        }
        console.log('Total chunks:', chunks.length)
        const allRooms: any[] = []
        let docAddress = ''
        for (let i = 0; i < chunks.length; i++) {
          console.log('Processing chunk', i + 1, 'of', chunks.length)
          const r = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.OPENAI_API_KEY },
            body: JSON.stringify({ model: "gpt-4.1-2025-04-14", max_tokens: 32000, temperature: 0, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: chunks[i] + "\n\nExtract ALL rooms from this section. Return raw JSON only." }] })
          })
          const d = await r.json()
          totalInputTokens += d.usage?.prompt_tokens || 0
          totalOutputTokens += d.usage?.completion_tokens || 0
          const chunkText = d.choices?.[0]?.message?.content?.trim() || ""
          console.log('Chunk', i + 1, 'response length:', chunkText.length)
          if (chunkText) {
            const f = chunkText.indexOf("{")
            const l = chunkText.lastIndexOf("}")
            if (f !== -1) {
              try {
                const chunkData = JSON.parse(chunkText.slice(f, l + 1))
                if (chunkData.rooms) {
                  for (const room of chunkData.rooms) {
                    const last = allRooms[allRooms.length - 1]
                    if (last && last.roomName === room.roomName) {
                      last.rows.push(...room.rows)
                    } else {
                      allRooms.push(room)
                    }
                  }
                }
                if (!docAddress && chunkData.address) docAddress = chunkData.address
              } catch(e) { console.log('Chunk parse error:', e) }
            }
          }
        }
        responseText = JSON.stringify({ address: docAddress, rooms: allRooms })
      }
    } else {
      usedClaude = true
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 8192, system: SYSTEM, messages: [{ role: "user", content: [{ type: "document", source: { type: "base64", media_type: mediaType, data: base64 } }, { type: "text", text: "Extract ALL rooms. Return raw JSON only." }] }] })
      })
      const d = await r.json()
      responseText = (d.content || []).map((c: any) => c.text || "").join("").trim()
      totalInputTokens += d.usage?.input_tokens || 0
      totalOutputTokens += d.usage?.output_tokens || 0
    }
    const first = responseText.indexOf("{")
    const last = responseText.lastIndexOf("}")
    if (first === -1) throw new Error("No JSON")
    let s = responseText.slice(first, last+1).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,"")
    let data: any
    try { data = JSON.parse(s) } catch(e) { data = JSON.parse(s.replace(/,\s*}/g,"}").replace(/,\s*]/g,"]")) }
    if (!data.rooms || data.rooms.length === 0) throw new Error("No rooms found")
    // GPT-4.1: $2/$8 per 1M tokens. Claude Sonnet 4.5: $3/$15 per 1M tokens.
    const actualApiCost = usedClaude
      ? Math.ceil(((totalInputTokens / 1_000_000) * 3.00 + (totalOutputTokens / 1_000_000) * 15.00) * 100) / 100
      : Math.ceil(((totalInputTokens / 1_000_000) * 2.00 + (totalOutputTokens / 1_000_000) * 8.00) * 100) / 100
    return NextResponse.json({ address: data.address || "", pages: data.rooms.length, rooms: data.rooms, _extractedText: extractedText ? extractedText.slice(0, 100000) : "", actualApiCost })
  } catch(err: any) { console.error('[API Error]', err)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 }) }
}
