import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = 'noreply@inventorytools.co.uk'
const APP_URL = 'https://www.inventorytools.co.uk'

function inviteEmail(companyName: string, inviteUrl: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#FD6A02;padding:32px 40px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">inventorytools</h1>
      <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">PDF & Audio to Word Converter</p>
    </div>
    <div style="padding:40px;">
      <h2 style="color:#1a1a2e;font-size:20px;font-weight:700;margin:0 0 12px;">You've been invited to join ${companyName}</h2>
      <p style="color:#888;font-size:14px;line-height:1.6;margin:0 0 24px;">Click the button below to create your account and start converting inventory PDFs and recordings into Word documents.</p>
      <a href="${inviteUrl}" style="display:inline-block;background:#FD6A02;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;margin-bottom:24px;">Accept invite</a>
      <p style="color:#aaa;font-size:12px;margin:0;">This invite link expires in 7 days. If you weren't expecting this, you can ignore this email.</p>
    </div>
    <div style="background:#f5f5f5;padding:20px 40px;text-align:center;">
      <p style="color:#aaa;font-size:11px;margin:0;">© ${new Date().getFullYear()} InventoryTools · <a href="${APP_URL}" style="color:#FD6A02;text-decoration:none;">inventorytools.co.uk</a></p>
    </div>
  </div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const { email, inviterUserId } = await req.json()
    if (!email || !inviterUserId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get the inviter's company name and confirm they are admin
    const { data: inviter, error: inviterErr } = await supabase
      .from('profiles')
      .select('company_name, role')
      .eq('id', inviterUserId)
      .single()

    if (inviterErr || !inviter) return NextResponse.json({ error: 'Inviter not found' }, { status: 400 })
    if (inviter.role !== 'admin') return NextResponse.json({ error: 'Only admins can invite team members' }, { status: 403 })
    if (!inviter.company_name) return NextResponse.json({ error: 'No company name set on your profile' }, { status: 400 })

    // Check if email already has an account
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', email) // placeholder check below uses auth admin list instead
      .maybeSingle()

    const token = crypto.randomBytes(32).toString('hex')

    const { error: insertErr } = await supabase.from('invites').insert({
      email,
      company_name: inviter.company_name,
      invited_by: inviterUserId,
      token,
    })
    if (insertErr) throw new Error(insertErr.message)

    const inviteUrl = `${APP_URL}/auth?invite=${token}`

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: `You've been invited to join ${inviter.company_name} on InventoryTools`,
        html: inviteEmail(inviter.company_name, inviteUrl)
      })
    })

    const emailData = await emailRes.json()
    if (!emailRes.ok) throw new Error(emailData.message || 'Failed to send invite email')

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
