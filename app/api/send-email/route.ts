import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const RESEND_API_KEY = process.env.RESEND_API_KEY

const DEFAULT_BRAND = {
  display_name: 'InventoryTools',
  domain: 'inventorytools.co.uk',
  primary_color: '#FD6A02',
  logo_url: 'https://www.inventorytools.co.uk/logo-email-full.png',
}

async function getBrandForEmail(email: string) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { users } } = await supabase.auth.admin.listUsers()
    const user = users.find((u: any) => u.email === email)
    if (!user) return DEFAULT_BRAND

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_name')
      .eq('id', user.id)
      .single()

    if (!profile?.company_name) return DEFAULT_BRAND

    const { data: brandRow } = await supabase
      .from('brands')
      .select('display_name, domain, primary_color, logo_url')
      .eq('company_name', profile.company_name)
      .maybeSingle()

    if (!brandRow) return DEFAULT_BRAND

    return {
      display_name: brandRow.display_name || DEFAULT_BRAND.display_name,
      domain: brandRow.domain || DEFAULT_BRAND.domain,
      primary_color: brandRow.primary_color || DEFAULT_BRAND.primary_color,
      logo_url: brandRow.logo_url ? `https://${DEFAULT_BRAND.domain}${brandRow.logo_url.startsWith('/') ? '' : '/'}${brandRow.logo_url}` : DEFAULT_BRAND.logo_url,
    }
  } catch (e) {
    return DEFAULT_BRAND
  }
}

function emailTemplate(brand: typeof DEFAULT_BRAND, heading: string, bodyText: string, buttonText: string, buttonUrl: string, footerNote: string) {
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
      <h2 style="color:#1a1a2e;font-size:20px;font-weight:700;margin:0 0 12px;">${heading}</h2>
      <p style="color:#888;font-size:14px;line-height:1.6;margin:0 0 24px;">${bodyText}</p>
      <a href="${buttonUrl}" style="display:inline-block;background:${brand.primary_color};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;margin-bottom:24px;">${buttonText}</a>
      <p style="color:#aaa;font-size:12px;margin:0;">${footerNote}</p>
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
    const { type, email, url } = await req.json()
    if (!type || !email || !url) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const brand = await getBrandForEmail(email)

    const subject = type === 'confirmation'
      ? `Confirm your ${brand.display_name} account`
      : `Reset your ${brand.display_name} password`

    const html = type === 'confirmation'
      ? emailTemplate(
          brand,
          'Confirm your email',
          `Thanks for signing up to ${brand.display_name}. Click the button below to confirm your email address and activate your account.`,
          'Confirm email address',
          url,
          "If you didn't create an account, you can ignore this email. This link expires in 24 hours."
        )
      : emailTemplate(
          brand,
          'Reset your password',
          'We received a request to reset your password. Click the button below to choose a new one.',
          'Reset password',
          url,
          "If you didn't request a password reset, you can ignore this email. This link expires in 1 hour."
        )

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: 'noreply@inventorytools.co.uk', to: email, subject, html })
    })

    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
