const fs = require('fs');
const content = `export const maxDuration = 300
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = \`Convert inventory text to JSON. Extract room inventory data only.

IGNORE sections: abbreviations, contents, meter readings, key lists, photo references, property summaries.

RULES:
- Room names: no number prefix
- Number column = ignore, use next column as ITEM
- Strip: photo counts, duplicate conditions (Good Good = Good), "No further comment", "Information provided by tenant"
- Replace double quotes in text with single quotes
- First row of every room: {"item":"Further views","description":"","condition":""}
- Descriptions: separate features with " | "
- Extra columns go into condition field separated by " | "

OUTPUT: Raw JSON only. No markdown. No backticks.
{"address":"...","pages":7,"rooms":[{"roomName":"...","rows":[{"item":"...","description":"...","condition":"..."}]}]}\`

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { base64, mediaType, extractedText } = body

    let message
    if (extractedText && extractedText.trim().length > 100) {
      message = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: extractedText + '\\n\\nExtract ALL rooms and items. Return raw JSON only.' }]
      })
    } else {
      message = await client.messages.create({
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
    }

    const rawText = message.content.map((c: any) => c.text || '').join('').trim()
    const data = repairJSON(rawText)
    if (!data.rooms || data.rooms.length === 0) throw new Error('No rooms found')

    return NextResponse.json({ address: data.address || '', pages: data.pages || data.rooms.length, rooms: data.rooms })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
`;
fs.writeFileSync('app/api/convert/route.ts', content);
console.log('done');
