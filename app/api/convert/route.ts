export const maxDuration = 300
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'

const SYSTEM = `Convert inventory text to JSON. Extract room data only.
IGNORE these sections entirely: abbreviations & meanings pages, list of contents pages, property summary pages, parking information, appliance lists, smoke detector pages, legionella pages, meter reading pages, key pages.
PROCESS every room section from start to end of document - do not stop early.
RULES: no number prefix on room names, strip photo counts and duplicate conditions (Good Good becomes Good), first row per room is Further views with empty desc and condition, separate descriptions with pipe, extra columns go to condition.
OUTPUT raw JSON only: {"address":"","pages":1,"rooms":[{"roomName":"","rows":[{"item":"","description":"","condition":""}]}]}`

export async function POST(req: NextRequest) {
  try {
    const { extractedText, base64, mediaType } = await req.json()
    let responseText = ""
    if (extractedText && extractedText.length > 100) {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.OPENAI_API_KEY },
        body: JSON.stringify({ model: "gpt-4o", max_tokens: 16000, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: extractedText + "\n\nExtract ALL rooms. Return raw JSON only." }] })
      })
      const d = await r.json()
      responseText = d.choices?.[0]?.message?.content?.trim() || ""
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
