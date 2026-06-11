import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { conversion_id, user_id } = await req.json()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get conversion with extracted text
    const { data: conv, error } = await supabase
      .from('conversions')
      .select('*')
      .eq('id', conversion_id)
      .eq('user_id', user_id)
      .single()
    if (error || !conv) return NextResponse.json({ error: 'Conversion not found' }, { status: 404 })
    if (!conv.extracted_text) return NextResponse.json({ error: 'No source text available for this conversion. Only new conversions support accuracy reports.' }, { status: 400 })

    // Check balance
    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user_id).single()
    if (!profile || Number(profile.balance) < 1.50) return NextResponse.json({ error: 'Insufficient balance. Accuracy reports cost £1.50.' }, { status: 400 })

    if (!conv.converted_json) return NextResponse.json({ error: 'No conversion data available for this report. Please reconvert the document.' }, { status: 400 })

    const convertedText = JSON.stringify(conv.converted_json, null, 2)

    // Generate accuracy report with GPT-4.1
    const prompt = `You are comparing an original property inventory PDF against a converted Word document output.

ORIGINAL PDF TEXT (source):
${conv.extracted_text.slice(0, 40000)}

CONVERTED OUTPUT - rooms and rows in JSON format (output):
${convertedText.slice(0, 60000)}

Compare them carefully room by room, item by item. For each room, check that every item from the PDF appears in the Word document with the correct content in the correct column (Item, Description, Condition).

Ignore everything except the inventory room data — ignore cover pages, abbreviations pages, contents pages, property summaries, meter readings, key pages and photo references. Also ignore: numbered room heading rows (e.g. '10 Hall.' or '23 Sitting room.' — these are section headers not inventory items), blank rows, photo-only rows, and 'Further views' rows. Do not count these as missing items.

For each room use exactly this format:

## [Room Name]

**Missing items:** [list each missing inventory item, or write "None"]
**Wrong column:** [list each column error, or write "None"]
**Truncated content:** [list anything cut off, or write "None"]
**Extra items not in PDF:** [list extras, or write "None"]

At the start of the report, before the room breakdown, add these two checks:

## Rooms Check
**Rooms in PDF:** [list all room names]
**Rooms in Word document:** [list all room names]
**Missing rooms:** [any rooms in PDF not in Word document, or write "None"]
**Duplicate room names:** [any room names that appear more than once in the Word document, or write "None"]

At the end give a summary:

## Summary
| Check | Result |
|-------|--------|
| Total items in PDF | [number] |
| Total items in Word document | [number] |
| Total missing | [number] |
| Total in wrong column | [number] |
| Overall accuracy % | [percentage] |

Be thorough — check every single row in every room. Do not summarise or skip any room. Do not include any introduction or preamble — start directly with the Rooms Check section.`

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY },
      body: JSON.stringify({ model: 'gpt-4.1-2025-04-14', max_tokens: 20000, temperature: 0, messages: [{ role: 'user', content: prompt }] })
    })
    const d = await r.json()
    const report = d.choices?.[0]?.message?.content?.trim() || 'Report generation failed'

    // Save report and deduct £1.50
    await supabase.from('conversions').update({ accuracy_report: report }).eq('id', conversion_id)
    const newBalance = Math.max(0, Number(profile.balance) - 1.50)
    await supabase.from('profiles').update({ balance: newBalance }).eq('id', user_id)

    return NextResponse.json({ ok: true, report, balance: newBalance })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
