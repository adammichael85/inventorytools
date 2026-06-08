const fs = require('fs');

const newContent = `export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = \`TASK: Convert inventory PDF pages into structured JSON.
Only process pages that contain inventory tables with room item data.
Ignore: cover pages, abbreviation pages, contents pages, summary pages, photo pages.

ROOM HEADINGS: No number prefix. If heading at bottom of page, items continue on next page.

COLUMN MAPPING:
- Sequential numbers column → ignore, use next column as ITEM
- Materials/features column → DESCRIPTION  
- Everything else → CONDITION (separated by " | ")

STRIP from output: photo counts, page numbers, duplicate conditions (Good Good → Good), "No further comment", "Information provided by tenant"

COPY text exactly. Replace any double quotes in text with single quotes.

DESCRIPTION: separate features with " | "
CONDITION: separate values with " | "
FIRST ROW of every room: item="Further views", description="", condition=""

OUTPUT: Raw JSON only. No markdown. No backticks.
Format: {"address":"...","rooms":[{"roomName":"...","rows":[{"item":"...","description":"...","condition":"..."}]}]}\`

async function convertPages(base64: string, mediaType: string, pageInstruction: string) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-5' as const,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: mediaType as 'application/pdf', data: base64 } },
        { type: 'text', text: pageInstruction }
      ]
    }]
  })

  const rawText = message.content.map((c: any) => c.text || '').join('').trim()
  const first = rawText.indexOf('{')
  const last = rawText.lastIndexOf('}')
  if (first === -1 || last === -1) return null
  
  let rawSlice = rawText.slice(first, last + 1).replace(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/g, '')
  
  try {
    return JSON.parse(rawSlice)
  } catch(e) {
    let cleaned = rawSlice.replace(/,[\\s\\n]+}/g, '}').replace(/,[\\s\\n]+]/g, ']')
    try {
      return JSON.parse(cleaned)
    } catch(e2) {
      const lastRoom = cleaned.lastIndexOf('{"roomName"')
      if (lastRoom > 0) {
        try { return JSON.parse(cleaned.slice(0, lastRoom) + ']}]}') } catch(e3) {}
      }
      return null
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { base64, mediaType } = await req.json()

    const firstHalf = await convertPages(base64, mediaType,
      'Extract the property address and ALL inventory rooms from the FIRST HALF of this PDF. Process only pages containing room inventory tables. Return raw JSON only.'
    )

    if (!firstHalf) throw new Error('First pass failed to extract any data')

    const secondHalf = await convertPages(base64, mediaType,
      \`Extract inventory rooms from the SECOND HALF of this PDF. The first half already captured these rooms: \${(firstHalf.rooms || []).map((r: any) => r.roomName).join(', ')}. Extract ONLY rooms NOT in that list. If no new rooms found, return {"rooms":[]}. Return raw JSON only.\`
    )

    const allRooms = [
      ...(firstHalf.rooms || []),
      ...(secondHalf?.rooms || [])
    ]

    return NextResponse.json({
      address: firstHalf.address || '',
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
