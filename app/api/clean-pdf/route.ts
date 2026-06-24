import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PDFDocument } from 'pdf-lib'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, file_base64 } = body
    if (!user_id || !file_base64) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Look up company and check balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_name')
      .eq('id', user_id)
      .single()
    if (profileError || !profile?.company_name) throw new Error('Could not find company for this user')

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('balance')
      .eq('company_name', profile.company_name)
      .single()
    if (companyError || !company) throw new Error('Could not find company balance')

    const CLEAN_COST = 0.50
    if (Number(company.balance) < CLEAN_COST) {
      return NextResponse.json({ error: 'Insufficient balance. This tool costs £0.50 per file.' }, { status: 402 })
    }

    // Clean/unlock the PDF
    const pdfBuffer = Buffer.from(file_base64, 'base64')
    const sourceDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true })
    const cleanDoc = await PDFDocument.create()
    const copiedPages = await cleanDoc.copyPages(sourceDoc, sourceDoc.getPageIndices())
    copiedPages.forEach(page => cleanDoc.addPage(page))
    const cleanedBytes = await cleanDoc.save()
    const cleanedBase64 = Buffer.from(cleanedBytes).toString('base64')

    // Deduct cost from company balance
    const newBalance = Math.max(0, Number(company.balance) - CLEAN_COST)
    await supabase.from('companies').update({ balance: newBalance }).eq('company_name', profile.company_name)

    // Log as a conversion-like record for tracking (optional, lightweight)
    await supabase.from('pdf_clean_jobs').insert({
      user_id,
      company_name: profile.company_name,
      cost: CLEAN_COST,
    }).then(() => {}, () => {}) // ignore errors if table doesn't exist yet, non-critical

    return NextResponse.json({ ok: true, cleaned_base64: cleanedBase64, balance: newBalance })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
