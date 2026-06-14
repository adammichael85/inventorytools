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
    const prompt = `You are an expert inventory report QA checker.

You will receive:
1. EXTRACTED TEXT from the original PDF inventory report
2. CONVERTED OUTPUT - the converted Word document data in JSON format

Your job is to compare the original PDF against the converted Word document. The aim is to check whether the Word document has placed the PDF room/area data into the correct columns: Item, Description, Condition.

Only check the actual inventory room/area sections.

Ignore the following PDF sections unless they form part of the inventory area schedule: Cover page, Important information, Notes, Abbreviations, Contents, General information, Utility meters, Keys, Smoke alarms, Carbon monoxide alarms, Cleaning invoices, Appliance serial number lists, Photos, Tenant signatures, Page footers, Page numbers.

However, do include all inventory areas/sections, including: Internal rooms, External Surfaces, External Features, Boundaries, Gardens, Patios, Balconies, Garages, Sheds, Outbuildings, Parking areas, Communal areas, and any other section that contains item/description/condition style inventory data.

Do not treat "Further view" or "Further views" rows as errors. Ignore those rows completely when calculating row counts and accuracy.

Your checking rules:
1. First identify every inventory room/area section in the PDF.
2. Identify every matching room/area section in the Word document.
3. Confirm the number of rooms/areas in the PDF matches the Word document.
4. For each room/area, compare every row line by line.
5. Check that the Item text in the PDF is in the Item column in the Word document.
6. Check that the Description text in the PDF is in the Description column in the Word document.
7. Check that the Condition text in the PDF is in the Condition column in the Word document.
8. Check for missing rows, extra rows, duplicated rows.
9. Check for text moved into the wrong column.
10. Check for condition text wrongly merged into description.
11. Check for description text wrongly moved into condition.
12. Check for item text wrongly moved into description or condition.
13. Check for external sections missing from the Word document.
14. Do not mark spelling differences, line wrapping differences, punctuation spacing, or visual layout differences as errors unless they change the column placement or missing/extra content.
15. If the PDF table uses many fields, collapse them into the three-column Word format by treating all descriptive/detail/colour/type/finish values as Description, and condition/comment/status values as Condition, unless the PDF clearly places them differently.
16. Accuracy = ((Total checked rows - Issues found) / Total checked rows) x 100

EXTRACTED TEXT (source):
${conv.extracted_text.slice(0, 40000)}

CONVERTED OUTPUT in JSON format:
${convertedText.slice(0, 60000)}

Use this exact report layout:

I checked rooms only: room headings, item rows, descriptions, and conditions.

Overall result: the conversion is [brief result], but it is not 100% column-perfect.

| Check | Result |
|---|---:|
| Rooms/areas in PDF | X |
| Rooms/areas in Word doc | X |
| Room/area count match | Yes/No |
| Total room/area rows in PDF | X |
| Total room/area rows in Word doc | X |
| Row count match | Yes/No |
| Row/column placement issues found | X |
| Overall accuracy | Approx. X% |

The main issue is not missing rooms/areas or missing rows. It is [brief explanation of the main issue].

## Specific column errors found

If there are no issues, write: No column-placement issues found.

If there are issues, list every individual issue under the correct room/area heading:

### ROOM / AREA NAME
**Wrong column** / **Missing row** / **Extra item not in PDF** / **Duplicated row**
**PDF:**
**Item:** ...
**Description:** ...
**Condition:** ...
**Word doc:**
**Item:** ...
**Description:** ...
**Condition:** ...

## Room-by-room result

| Room / Area | Result |
|---|---|
| Room/Area Name | Row count matches. No issues found. |
| Room/Area Name | Row count matches. X column issues found. |
| Room/Area Name | Row count does not match. X missing/extra rows found. |

So the extraction/formatting has captured the room/area data [very well / extremely well / with issues]. There are X remaining issues across X checked room/area rows, giving an estimated accuracy of X%.

Do not include any introduction or preamble — start directly with "I checked rooms only".`

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
