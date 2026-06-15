export const maxDuration = 300
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SYSTEM = `You are an expert at converting UK property inventory PDFs into structured JSON.

Read the PDF visually. It contains a property inventory with rooms/areas, each containing items in a table with columns: Item, Description, Condition.

Extract every room/area and every row. Return JSON in this exact format:
{"address":"property address","rooms":[{"roomName":"KITCHEN","rows":[{"item":"...","description":"...","condition":"..."}]}]}

Rules:
- Read the actual table columns visually. Put each cell's content in the correct field (item, description, condition).
- If the Item column is a dash (-), keep it as "-".
- Include ALL inventory areas: internal rooms, External Surfaces, External Features, Boundaries, gardens, garages, etc.
- Ignore: cover page, contents, abbreviations, general information, utility meters, keys, smoke alarms, cleaning invoices, photos, signatures, page footers/numbers.
- Ignore "Further view" / "Further views" rows.
- Copy text exactly. Do not improve, reinterpret, or tidy.
- Return ONLY raw JSON, no markdown, no explanation.`

export async function POST(req: NextRequest) {
  try {
    const { pdfPath } = await req.json()
    if (!pdfPath) return NextResponse.json({ error: "No pdfPath provided" }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch PDF from Supabase Storage server-side
    const { data: signed, error: signErr } = await supabase.storage.from("documents").createSignedUrl(pdfPath, 120)
    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ error: "Could not get signed URL: " + (signErr?.message || "unknown") }, { status: 500 })
    }

    const pdfRes = await fetch(signed.signedUrl)
    if (!pdfRes.ok) return NextResponse.json({ error: "Could not fetch PDF: " + pdfRes.status }, { status: 500 })

    const pdfBuffer = await pdfRes.arrayBuffer()
    const base64 = Buffer.from(pdfBuffer).toString("base64")
    console.log("PDF fetched, base64 length:", base64.length)

    // Call OpenAI Responses API with gpt-4o and the PDF as input_file
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.OPENAI_API_KEY },
      body: JSON.stringify({
        model: "gpt-4.1",
        max_output_tokens: 32000,
        temperature: 0,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: SYSTEM + "\n\nExtract ALL rooms from this PDF. Return raw JSON only." },
              { type: "input_file", filename: "inventory.pdf", file_data: "data:application/pdf;base64," + base64 }
            ]
          }
        ]
      })
    })

    const d = await r.json()
    console.log("OpenAI response status:", r.status)

    // Responses API returns output_text or output array
    let responseText = ""
    if (d.output_text) {
      responseText = d.output_text
    } else if (d.output && Array.isArray(d.output)) {
      for (const item of d.output) {
        if (item.content && Array.isArray(item.content)) {
          for (const c of item.content) {
            if (c.type === "output_text" && c.text) responseText += c.text
          }
        }
      }
    }

    console.log("Response text length:", responseText.length)

    if (!responseText) {
      return NextResponse.json({ error: "Empty response", raw: JSON.stringify(d).slice(0, 1000) }, { status: 500 })
    }

    // Parse JSON
    const first = responseText.indexOf("{")
    const last = responseText.lastIndexOf("}")
    if (first === -1) return NextResponse.json({ error: "No JSON in response", responseText: responseText.slice(0, 1000) }, { status: 500 })

    let data: any
    try {
      data = JSON.parse(responseText.slice(first, last + 1))
    } catch (e) {
      return NextResponse.json({ error: "JSON parse failed", responseText: responseText.slice(0, 2000) }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      address: data.address || "",
      roomCount: data.rooms?.length || 0,
      roomNames: (data.rooms || []).map((r: any) => r.roomName),
      totalRows: (data.rooms || []).reduce((sum: number, r: any) => sum + (r.rows?.length || 0), 0),
      rooms: data.rooms
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
