export const dynamic = "force-dynamic"
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `Convert inventory PDF to JSON. Extract room inventory data only.

IGNORE: cover pages, abbreviations, contents, meter pages, key pages, photo pages.

RULES:
- Room names: no number prefix
- Room heading at page bottom = items continue on next page
- Number column = ignore, use next column as ITEM
- Strip: photo counts, "No further comment", "Information provided by tenant", duplicate conditions (Good Good = Good)
- Replace double quotes in text with single quotes
- First row of every room: {"item":"Further views","description":"","condition":""}
- Descriptions: separate features with " | "
- Extra columns (Comments, Tenant Comments) go into condition field separated by " | "

OUTPUT: Raw JSON only. No markdown. No backticks. No explanation.
{"address":"...","pages":7,"rooms":[{"roomName":"...","rows":[{"item":"...","description":"...","condition":"..."}]}]}`

function repairJSON(text: string): any {
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first === -1 || last === -1) throw new Error('No JSON in response')
  let s = text.slice(first, last + 1).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  try { return JSON.parse(s) } catch(e1) {}
  s = s.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']')
  try { return JSON.parse(s) } catch(e2) {
    throw new Error('JSON parse failed: ' + (e2 as Error).message)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { base64, mediaType } = await req.json()

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 16000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mediaType};base64,${base64}`,
                detail: 'high'
              }
            },
            {
              type: 'text',
              text: 'Extract ALL rooms and items from this inventory PDF. Return raw JSON only.'
            }
          ]
        }
      ]
    })

    const rawText = response.choices[0]?.message?.content?.trim() || ''
    const data = repairJSON(rawText)

    if (!data.rooms || data.rooms.length === 0) {
      throw new Error('No rooms found in response')
    }

    return NextResponse.json({
      address: data.address || '',
      pages: data.pages || data.rooms.length,
      rooms: data.rooms
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
