import { supabase } from '@/lib/supabase'

export async function convertPDF(base64: string, mediaType: string) {
  // Get session token
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not logged in')

  // Get Anthropic key from our secure endpoint
  const tokenRes = await fetch('/api/token', {
    headers: { Authorization: `Bearer ${session.access_token}` }
  })
  if (!tokenRes.ok) throw new Error('Failed to get token')
  const { key } = await tokenRes.json()

  // Call Anthropic directly from browser - no file size limits!
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
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
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error ${response.status}`)
  }

  const data = await response.json()
  const rawText = data.content.map((c: any) => c.text || '').join('').trim()
  const first = rawText.indexOf('{')
  const last = rawText.lastIndexOf('}')
  if (first === -1 || last === -1) throw new Error('No JSON found in response')

  try {
    return JSON.parse(rawText.slice(first, last + 1))
  } catch (e: any) {
    throw new Error('Failed to parse response: ' + e.message)
  }
}
