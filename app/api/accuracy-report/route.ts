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
    if (!conv.extracted_text && !conv.pdf_path) return NextResponse.json({ error: 'No source data available for this conversion.' }, { status: 400 })

    // Accuracy report is included free with conversion - no balance check needed

    if (!conv.converted_json) return NextResponse.json({ error: 'No conversion data available for this report. Please reconvert the document.' }, { status: 400 })

    const convertedText = JSON.stringify(conv.converted_json, null, 2)

    // Fetch original PDF from Supabase for vision-based comparison
    let pdfBase64 = ''
    if (conv.pdf_path) {
      const { data: signed } = await supabase.storage.from('documents').createSignedUrl(conv.pdf_path, 120)
      if (signed?.signedUrl) {
        const pdfRes = await fetch(signed.signedUrl)
        if (pdfRes.ok) {
          const pdfBuffer = await pdfRes.arrayBuffer()
          pdfBase64 = Buffer.from(pdfBuffer).toString('base64')
        }
      }
    }

    // Generate accuracy report with GPT-4.1
    const prompt = `You are an expert inventory report QA checker.

You will receive:
1. The ORIGINAL FILE - either a PDF or Word document (attached) read visually
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
15. When writing issue comments, always state clearly: what text is wrong, which column it should be in, and which column it ended up in. Example: "'Paint chip to the door.' should be in the Condition column but is missing from the converted Word doc." Never reference column names from the original file format (e.g. 'Comments') — always refer to the three output columns: Item, Description, Condition.
15. When writing issue comments, always state clearly: what text is wrong, which column it should be in, and which column it ended up in. Example: "'Paint chip to the door.' should be in the Condition column but is missing from the converted Word doc." Never reference column names from the original file format (e.g. 'Comments') — always refer to the three output columns: Item, Description, Condition.
15. If the PDF table uses many fields, collapse them into the three-column Word format by treating all descriptive/detail/colour/type/finish values as Description, and condition/comment/status values as Condition, unless the PDF clearly places them differently.
16. Accuracy = ((Total checked rows - Issues found) / Total checked rows) x 100

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

IMPORTANT: Only list rows that have ACTUAL errors. Do NOT list rows that are correctly placed just to show you checked them. Do NOT add comments like 'No issue here, correct placement' — simply skip correct rows entirely.

If there are issues, list every individual issue under the correct room/area heading:

### ROOM / AREA NAME
**Wrong column** / **Missing row** / **Extra item not in PDF** / **Duplicated row**
**Original File:**
**Item:** ...
**Description:** ...
**Condition:** ...
**Converted Word.doc:**
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

    let report = ''
    if (pdfBase64) {
      // Use vision API to read original PDF
      const r = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY },
        body: JSON.stringify({
          model: 'gpt-4.1',
          max_output_tokens: 20000,
          temperature: 0,
          input: [{
            role: 'user',
            content: [
              { type: 'input_text', text: prompt },
              { type: 'input_file', filename: 'original.pdf', file_data: 'data:application/pdf;base64,' + pdfBase64 }
            ]
          }]
        })
      })
      const d = await r.json()
      if (d.output_text) report = d.output_text
      else if (d.output && Array.isArray(d.output)) {
        for (const item of d.output) {
          if (item.content && Array.isArray(item.content)) {
            for (const c of item.content) {
              if (c.type === 'output_text' && c.text) report += c.text
            }
          }
        }
      }
    } else {
      // Fallback to text-based comparison
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY },
        body: JSON.stringify({ model: 'gpt-4.1-2025-04-14', max_tokens: 20000, temperature: 0, messages: [{ role: 'user', content: prompt + '\n\nSOURCE TEXT:\n' + (conv.extracted_text || '').slice(0, 40000) }] })
      })
      const d = await r.json()
      report = d.choices?.[0]?.message?.content?.trim() || 'Report generation failed'
    }
    if (!report) report = 'Report generation failed'

    // Save report (included free with conversion)
    await supabase.from('conversions').update({ accuracy_report: report }).eq('id', conversion_id)
    return NextResponse.json({ ok: true, report })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
