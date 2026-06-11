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

Ignore everything except the inventory room data — ignore cover pages, abbreviations pages, contents pages, property summaries, meter readings, key pages and photo references.

For each discrepancy found, list it in this format:

Room name
Missing item: [item name]
Wrong column: [what was in PDF] -> [what appeared in Word doc]
Truncated: [what was cut off]
Extra item not in PDF: [item name]

At the end give a summary:
Total items in PDF
Total items in Word doc
Total missing
Total in wrong column
Overall accuracy %

Be thorough — check every single row in every room. Do not summarise or skip any room. Do not include any introduction or preamble — start directly with the first room.

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
