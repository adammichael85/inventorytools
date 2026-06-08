const fs = require('fs');

const newContent = `export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = \`Convert inventory PDF to JSON. Extract room inventory data only.

IGNORE: cover pages, abbreviations, contents, meter pages, key pages, photo pages.

RULES:
- Room names: no number prefix
- Room heading at page bottom = items continue on next page
- Number column = ignore, use next column as ITEM
- Strip: photo counts, "No further comment", "Information provided by tenant", duplicate conditions
- Replace double quotes in text with single quotes
- First row of every room: {"item":"Further views","description":"","condition":""}
- Descriptions: separate with " | "
- Extra columns (Comments, Tenant Comments) go into condition field

OUTPUT: Raw JSON only. No markdown. No backticks.
{"address":"...","rooms":[{"roomName":"...","rows":[{"item":"...","description":"...","condition":"..."}]}]}\`

function repairJSON(text: string): any {
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first === -1 || last === -1) throw new Error('No JSON in response')
  let s = text.slice(first, last + 1).replace(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/g, '')
  try { return JSON.parse(s) } catch(e1) {}
  s = s.replace(/,\\s*}/g, '}').replace(/,\\s*]/g, ']')
  try { return JSON.parse(s) } catch(e2) {
    throw new Error('JSON parse failed: ' + (e2 as Error).message)
  }
}

async function extractRooms(base64: string, mediaType: string, instruction: string) {
  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-5',
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
  const message = await stream.finalMessage()
  const rawText = message.content.map((c: any) => c.text || '').join('').trim()
  return repairJSON(rawText)
}

export async function POST(req: NextRequest) {
  try {
    const { base64, mediaType } = await req.json()

    // First pass: get address and first half of rooms
    const pass1 = await extractRooms(base64, mediaType,
      'Extract the property address and the FIRST HALF of the inventory rooms only (roughly the first 50% of the document). Stop after you have extracted half the rooms. Return raw JSON only.'
    )

    const firstRooms = pass1.rooms || []
    const lastRoomName = firstRooms.length > 0 ? firstRooms[firstRooms.length - 1].roomName : ''

    // Second pass: get remaining rooms
    const pass2 = await extractRooms(base64, mediaType,
      \`Extract inventory rooms from the SECOND HALF of this PDF only. Start from the room AFTER "\${lastRoomName}". Do not repeat any rooms from the first half. Return raw JSON only.\`
    )

    const secondRooms = pass2.rooms || []
    const allRooms = [...firstRooms, ...secondRooms]

    if (allRooms.length === 0) throw new Error('No rooms found')

    return NextResponse.json({
      address: pass1.address || '',
      pages: allRooms.length,
      rooms: allRooms
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
`;

fs.writeFileSync('app/api/convert/route.ts', newContent);
console.log('done');
