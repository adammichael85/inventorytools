export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `TASK: Convert an Existing Inventory PDF into structured JSON data.
You are NOT creating an inventory. You are NOT interpreting inventory data. You are NOT correcting inventory data. You are simply copying existing inventory table data from a PDF.

GOAL
Read the inventory PDF.
Ignore:
- Cover pages
- Introduction pages
- Disclaimer pages
- Terms and conditions
- Meter reading pages
- Key pages
- Abbreviation pages
- Contents pages
- Summary pages
- All photographs
- All photo-only pages
Only process pages that contain inventory tables with actual room item data.

ROOM HEADINGS
When a room heading appears in the PDF, create a new room entry.
The room heading should have no number prefix.
Example: "Entrance/Hallway", "Kitchen", "Bathroom" NOT "1 Entrance/Hallway"
IMPORTANT: If a room heading appears at the bottom of a page with no items on that page, the items for that room will continue on the next page — group them all under the same room heading. Never create an empty room.

COLUMN MAPPING LOGIC
Inventory PDFs can have 2-6 columns with different labels. Use this logic to map them:

Step 1 - Identify the ITEM column:
- If column 1 contains sequential numbers (1, 2, 3...) AND column 2 contains item names (Door, Ceiling, Walls, Floor, Radiator etc) then ignore column 1 and use column 2 as ITEM
- If column 1 contains item names directly then use column 1 as ITEM

Step 2 - Identify the DESCRIPTION column:
- The column containing materials, features and details (e.g. "White painted", "UPVC double glazed", "Carpet fitted") goes into DESCRIPTION

Step 3 - Everything else goes into CONDITION:
- Any remaining columns regardless of their label (Condition, Cleanliness, Comments, Tenant Comments, Inspector Notes, Photos, Rating, State) all go into CONDITION
- Each value on its own line separated by " | "

BREVITY
Keep descriptions concise. Copy only essential item text. Abbreviations are fine - do not expand them.
STRIP the following completely from all output - do not include them:
- Photo counts (e.g. "1 photo", "2 photos", "No photos")
- Page numbers
- Duplicate condition values (e.g. "Good Good" becomes "Good", "Fair Fair" becomes "Fair")
- "No further comment provided by the inspector" - omit entirely
- "Information provided by tenant" - omit entirely
- Any reference to photos being available or unavailable

COPY RULE
Copy text EXACTLY. Do not correct spelling, improve grammar, reword, summarise, remove, add, merge or split rows.
IMPORTANT: If any text contains double quote characters (") replace them with single quotes (') to avoid breaking the JSON output.

DESCRIPTION FORMATTING
Place each sentence or feature on its own line inside the description field, separated by the pipe character " | ".

CONDITION FORMATTING
Place each value on its own line inside the condition field, separated by the pipe character " | ".

FIRST ROW
The first row of every room table must have item="Further views", description="", condition=""

ADDRESS
Extract only the first line of the property address.

PAGES
Count how many pages the resulting Word document will have. Each room typically fills one page. Include this as the "pages" field in the JSON.

OUTPUT FORMAT
Return ONLY a raw JSON object. No markdown. No code fences. No backticks.
First character must be { and last character must be }
Format: {"address":"12 Milliners Court","pages":7,"rooms":[{"roomName":"Hallway","rows":[{"item":"Door","description":"White painted | Free of marks","condition":"Good"}]}]}`

async function convertChunk(base64: string, mediaType: string, instruction: string) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-5' as const,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: mediaType as 'application/pdf', data: base64 } },
        { type: 'text', text: instruction }
      ]
    }]
  })

  const rawText = message.content.map((c: any) => c.text || '').join('').trim()
  const first = rawText.indexOf('{')
  const last = rawText.lastIndexOf('}')
  if (first === -1 || last === -1) throw new Error('No JSON found in response')
  
  let rawSlice = rawText.slice(first, last + 1).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  
  try {
    return JSON.parse(rawSlice)
  } catch(e) {
    let cleaned = rawSlice.replace(/,[\s\n]+}/g, '}').replace(/,[\s\n]+]/g, ']')
    try {
      return JSON.parse(cleaned)
    } catch(e2) {
      const lastRoom = cleaned.lastIndexOf('{"roomName"')
      if (lastRoom > 0) {
        try {
          return JSON.parse(cleaned.slice(0, lastRoom) + ']}]}')
        } catch(e3) {}
      }
      throw new Error('JSON parse failed: ' + (e2 as Error).message)
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { base64, mediaType } = await req.json()

    // First pass - get address and first half of rooms
    const firstPass = await convertChunk(base64, mediaType, 
      'Extract the property address and ALL rooms with their complete item data. Return raw JSON only.'
    )
    
    const rooms = firstPass.rooms || []
    
    // If we got a good number of rooms, check if we need a second pass
    // by trying to get any rooms that might have been cut off
    let allRooms = rooms
    
    if (rooms.length > 0) {
      const lastRoom = rooms[rooms.length - 1]?.roomName || ''
      try {
        const secondPass = await convertChunk(base64, mediaType,
          `The previous extraction may have been cut off. Extract ONLY rooms that come AFTER "${lastRoom}" in the PDF. If there are no more rooms after "${lastRoom}", return {"address":"","pages":0,"rooms":[]}. Return raw JSON only.`
        )
        if (secondPass.rooms && secondPass.rooms.length > 0) {
          allRooms = [...rooms, ...secondPass.rooms]
        }
      } catch(e) {
        // Second pass failed, use first pass results
      }
    }

    const data = {
      address: firstPass.address || '',
      pages: allRooms.length,
      rooms: allRooms
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
