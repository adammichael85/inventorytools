import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { base64, mediaType } = await req.json()

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      system: `You are an inventory data extractor. Extract ALL rooms from a property inventory PDF.

RULES — follow exactly:
- Extract EVERY room section (e.g. Hallway, Kitchen, Living Room, Bedroom 1, Bathroom, En-suite, etc.)
- For each room, consolidate ALL sub-sections into a flat list of rows.
- Each row must have: item, description, condition.
- CRITICAL — capture ALL text associated with each item, including:
  - The main inspector description
  - Any "Disagreed by tenant" sections
  - Any "Information provided by tenant" text
  - Append all extra text into the description field, separated by " | "
- Copy all values VERBATIM from the PDF. Zero edits, zero additions.
- The ITEM column must be copied exactly as it appears.
- If condition is not stated use "". If a field is blank use "".
- Return ONLY a raw JSON object. No markdown. No code fences.
- First character must be { and last character must be }
- Format: {"address":"12 Milliners Court","rooms":[{"roomName":"Hallway","rows":[{"item":"...","description":"...","condition":"..."}]}]}
- For "address": extract only the first line of the property address.`,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: 'Extract every room and all their items. Return raw JSON only.' }
        ]
      }]
    })

    const rawText = message.content.map((c: any) => c.text || '').join('').trim()
    const first = rawText.indexOf('{')
    const last = rawText.lastIndexOf('}')
    if (first === -1 || last === -1) throw new Error('No JSON found in response')
    const data = JSON.parse(rawText.slice(first, last + 1))

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
