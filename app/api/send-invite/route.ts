import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const DEFAULT_BRAND = {
  display_name: 'InventoryTools',
  domain: 'inventorytools.co.uk',
  primary_color: '#FD6A02',
  logo_url: 'https://www.inventorytools.co.uk/logo-email-full.png',
  send_domain: 'inventorytools.co.uk',
}

function inviteEmail(brand: typeof DEFAULT_BRAND, companyName: string, inviteUrl: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#ffffff;padding:32px 40px;text-align:center;border-bottom:1px solid #f0f0f0;">
      <img src="${brand.logo_url}" width="200" alt="${brand.display_name}" style="display:block;margin:0 auto;height:auto;">
    </div>
    <div style="padding:40px;">
      <h2 style="color:#1a1a2e;font-size:20px;font-weight:700;margin:0 0 12px;">You've been invited to join ${companyName}</h2>
      <p style="color:#888;font-size:14px;line-height:1.6;margin:0 0 24px;">Click the button below to create your account and start converting inventory PDFs and recordings into Word documents.</p>
      <a href="${inviteUrl}" style="display:inline-block;background:${brand.primary_color};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;margin-bottom:24px;">Accept invite</a>
      <p style="color:#aaa;font-size:12px;margin:0;">This invite link expires in 7 days. If you weren't expecting this, you can ignore this email.</p>
    </div>
    <div style="background:#f5f5f5;padding:20px 40px;text-align:center;">
      <p style="color:#aaa;font-size:11px;margin:0;">© ${new Date().getFullYear()} ${brand.display_name} · <a href="https://${brand.domain}" style="color:${brand.primary_color};text-decoration:none;">${brand.domain}</a></p>
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

    // Resolve brand for this company
    let brand = DEFAULT_BRAND
    const { data: brandRow } = await supabase
      .from('brands')
      .select('display_name, domain, primary_color, logo_url, send_domain')
      .eq('company_name', inviter.company_name)
      .maybeSingle()

    if (brandRow) {
      brand = {
        display_name: brandRow.display_name || DEFAULT_BRAND.display_name,
        domain: brandRow.domain || DEFAULT_BRAND.domain,
        primary_color: brandRow.primary_color || DEFAULT_BRAND.primary_color,
        logo_url: brandRow.logo_url ? `https://www.${brandRow.send_domain || DEFAULT_BRAND.domain}${brandRow.logo_url.startsWith('/') ? '' : '/'}${brandRow.logo_url}` : DEFAULT_BRAND.logo_url,
        send_domain: brandRow.send_domain || DEFAULT_BRAND.send_domain,
      }
    }

    const token = crypto.randomBytes(32).toString('hex')

    const { error: insertErr } = await supabase.from('invites').insert({
      email,
      company_name: inviter.company_name,
      invited_by: inviterUserId,
      token,
    })
    if (insertErr) throw new Error(insertErr.message)

    const inviteUrl = `https://www.${brand.send_domain || DEFAULT_BRAND.domain}/auth?invite=${token}`

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: `${brand.display_name} <hello@${brand.send_domain}>`,
        to: email,
        subject: brand.display_name === 'InventoryTools' ? `You've been invited to join ${inviter.company_name} on InventoryTools` : `You've been invited to join ${brand.display_name}`,
        html: inviteEmail(brand, inviter.company_name, inviteUrl)
      })
    })

    const emailData = await emailRes.json()
    if (!emailRes.ok) throw new Error(emailData.message || 'Failed to send invite email')

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[API Error]', path, err)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
