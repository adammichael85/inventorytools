import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import os from 'os'

const execFileAsync = promisify(execFile)

export async function POST(req: NextRequest) {
  const tmpIn = path.join(os.tmpdir(), `qpdf-in-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`)
  const tmpOut = path.join(os.tmpdir(), `qpdf-out-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`)

  try {
    const body = await req.json()
    const { user_id, storage_path } = body
    if (!user_id || !storage_path) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Verify the caller is authenticated and owns the user_id they claim
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const anonClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user: authUser } } = await anonClient.auth.getUser(token)
    if (!authUser || authUser.id !== user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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

    // Download the PDF from Supabase Storage (avoids 4.5MB Vercel body limit)
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(storage_path)
    if (downloadError || !fileData) throw new Error('Could not read uploaded file: ' + downloadError?.message)
    const pdfBuffer = Buffer.from(await fileData.arrayBuffer())
    // Validate magic bytes - must be a real PDF (%PDF)
    if (pdfBuffer[0] !== 0x25 || pdfBuffer[1] !== 0x50 || pdfBuffer[2] !== 0x44 || pdfBuffer[3] !== 0x46) {
      return NextResponse.json({ error: 'Invalid file. Only PDF files are accepted.' }, { status: 400 })
    }
    fs.writeFileSync(tmpIn, pdfBuffer)

    // Clean up the temp storage file (fire and forget - non-critical)
    supabase.storage.from('documents').remove([storage_path]).catch(() => {})

    // Run qpdf --decrypt using the bundled Linux binary
    // The binary + shared libs are committed to bin/qpdf-linux/ and work on Vercel (AWS Lambda x86_64)
    const qpdfBin = path.join(process.cwd(), 'bin', 'qpdf-linux', 'bin', 'qpdf')
    const libDir = path.join(process.cwd(), 'bin', 'qpdf-linux', 'lib')

    // Ensure binary is executable (some deployment platforms strip execute permissions)
    try { fs.chmodSync(qpdfBin, 0o755) } catch {}

    console.log('qpdf binary path:', qpdfBin, '| exists:', fs.existsSync(qpdfBin))
    console.log('lib dir:', libDir, '| exists:', fs.existsSync(libDir))

    try {
      // --password='' tries the empty string as owner password, which works for owner-password-only PDFs
      // (the most common type from inventory report software that restricts printing/copying but not viewing)
      await execFileAsync(qpdfBin, ['--decrypt', '--password=', tmpIn, tmpOut], {
        env: { ...process.env, LD_LIBRARY_PATH: libDir },
        timeout: 30000,
      })
    } catch (qpdfErr: any) {
      console.error('qpdf exit code:', qpdfErr.code)
      console.error('qpdf stdout:', qpdfErr.stdout)
      console.error('qpdf stderr:', qpdfErr.stderr)
      // qpdf exits with code 3 for warnings (still produces valid output) - treat as success
      // Exit code 2 = error, exit code 1 = usage error
      if (qpdfErr.code === 2 || qpdfErr.code === 1) {
        throw new Error(`qpdf error (code ${qpdfErr.code}): ${qpdfErr.stderr || qpdfErr.stdout || 'unknown error'}`)
      }
      // code 3 = warning only, output file is still written - continue
    }

    if (!fs.existsSync(tmpOut)) {
      throw new Error('qpdf did not produce an output file. The PDF may require a password to decrypt.')
    }

    const cleanedBytes = fs.readFileSync(tmpOut)
    const cleanedBase64 = cleanedBytes.toString('base64')

    // Deduct cost from company balance
    const newBalance = Math.max(0, Number(company.balance) - CLEAN_COST)
    await supabase.from('companies').update({ balance: newBalance }).eq('company_name', profile.company_name)

    // Log for tracking
    await supabase.from('pdf_clean_jobs').insert({
      user_id,
      company_name: profile.company_name,
      cost: CLEAN_COST,
    }).then(() => {}, () => {})

    return NextResponse.json({ ok: true, cleaned_base64: cleanedBase64, balance: newBalance })
  } catch (err: any) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  } finally {
    // Always clean up temp files
    try { fs.unlinkSync(tmpIn) } catch {}
    try { fs.unlinkSync(tmpOut) } catch {}
  }
}
