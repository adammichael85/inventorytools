const fs = require('fs');

const newContent = `export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = \`Convert inventory PDF to JSON. Extract all rooms with their items.

IGNORE: cover pages, abbreviations pages, contents pages, meter pages, key pages, photo pages.
PROCESS: only pages with inventory tables.

RULES:
- Room names: no number prefix
- If room heading at page bottom, items continue on next page
- Column 1 with numbers = ignore, use column 2 as item name
- Strip: photo counts, "No further comment", "Information provided by tenant", duplicate conditions (Good Good = Good)
- Replace double quotes in text with single quotes
- First row of every room: {"item":"Further views","description":"","condition":""}
- Descriptions: separate with " | "
- Conditions: separate with " | "
- Extra columns (Comments, Tenant Comments etc) go into condition field

OUTPUT: Raw JSON only. No markdown. No backticks. No explanation.
{"address":"...","rooms":[{"roomName":"...","rows":[{"item":"...","description":"...","condition":"..."}]}]}\`

function repairJSON(text: string): any {
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first === -1 || last === -1) throw new Error('No JSON in response')
  
  let s = text.slice(first, last + 1)
  s = s.replace(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/g, '')
  
  try { return JSON.parse(s) } catch(e1) {}
  
  s = s.replace(/,\\s*}/g, '}').replace(/,\\s*]/g, ']')
  try { return JSON.parse(s) } catch(e2) {}
  
  // Find last complete room and truncate there
  const rooms: any[] = []
  let pos = 0
  const roomRegex = /"roomName"\\s*:\\s*"([^"]+)"/g
  let match
  while ((match = roomRegex.exec(s)) !== null) {
    rooms.push(match.index)
  }
  
  // Try truncating after each room boundary
  for (let i = rooms.length - 1; i >= 0; i--) {
    const tryStr = s.slice(0, rooms[i] - 1) + ']}]}'
    try { return JSON.parse(tryStr) } catch(e) {}
  }
  
  throw new Error('JSON parse failed after all repair attempts')
}

export async function POST(req: NextRequest) {
  try {
    const { base64, mediaType } = await req.json()

    // Use streaming to get full response without truncation
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-5',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: mediaType as 'application/pdf', data: base64 } },
          { type: 'text', text: 'Extract ALL rooms and items. Return raw JSON only.' }
        ]
      }]
    })

    const message = await stream.finalMessage()
    const rawText = message.content.map((c: any) => c.text || '').join('').trim()
    
    const data = repairJSON(rawText)
    
    if (!data.rooms || data.rooms.length === 0) {
      throw new Error('No rooms found in response')
    }

    return NextResponse.json({
      address: data.address || '',
      pages: data.rooms.length,
      rooms: data.rooms
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
`;

fs.writeFileSync('app/api/convert/route.ts', newContent);
console.log('done');
