import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const APP_URL = 'https://inventorytools.co.uk'

const DEFAULT_BRAND = {
  display_name: 'InventoryTools',
  domain: 'inventorytools.co.uk',
  primary_color: '#FD6A02',
  logo_url: '/logo.png',
  email_from_name: 'InventoryTools',
  send_domain: 'inventorytools.co.uk',
}

function logoHeader(brand: typeof DEFAULT_BRAND) {
  const logoUrl = `https://inventorytools.co.uk${brand.logo_url}`
  return `<div style="background:#ffffff;padding:32px 40px;text-align:center;border-bottom:1px solid #f0f0f0;">
    <img src="${logoUrl}" width="180" alt="${brand.display_name}" style="display:block;margin:0 auto;height:auto;">
  </div>`
}

function footer(brand: typeof DEFAULT_BRAND) {
  return `<div style="background:#f5f5f5;padding:20px 40px;text-align:center;">
    <p style="color:#aaa;font-size:11px;margin:0;">© ${new Date().getFullYear()} ${brand.display_name} · <a href="https://${brand.domain}" style="color:${brand.primary_color};text-decoration:none;">${brand.domain}</a></p>
  </div>`
}

function confirmEmail(brand: typeof DEFAULT_BRAND, confirmUrl: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    ${logoHeader(brand)}
    <div style="padding:40px;">
      <h2 style="color:#1a1a2e;font-size:20px;font-weight:700;margin:0 0 12px;">Confirm your email</h2>
      <p style="color:#888;font-size:14px;line-height:1.6;margin:0 0 24px;">Thanks for signing up to ${brand.display_name}. Click the button below to confirm your email address and activate your account.</p>
      <a href="${confirmUrl}" style="display:inline-block;background:${brand.primary_color};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;margin-bottom:24px;">Confirm email address</a>
      <p style="color:#aaa;font-size:12px;margin:0 0 8px;">If you didn't create an account, you can ignore this email. This link expires in 24 hours.</p>
      <p style="color:#aaa;font-size:12px;margin:0;">Please check your junk/spam folder if you don't see this email in your inbox.</p>
    </div>
    ${footer(brand)}
  </div>
</body>
</html>`
}

function resetEmail(brand: typeof DEFAULT_BRAND, resetUrl: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    ${logoHeader(brand)}
    <div style="padding:40px;">
      <h2 style="color:#1a1a2e;font-size:20px;font-weight:700;margin:0 0 12px;">Reset your password</h2>
      <p style="color:#888;font-size:14px;line-height:1.6;margin:0 0 24px;">We received a request to reset your password. Click the button below to choose a new one.</p>
      <a href="${resetUrl}" style="display:inline-block;background:${brand.primary_color};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;margin-bottom:24px;">Reset password</a>
      <p style="color:#aaa;font-size:12px;margin:0 0 8px;">If you didn't request a password reset, you can ignore this email. This link expires in 1 hour.</p>
      <p style="color:#aaa;font-size:12px;margin:0;">Please check your junk/spam folder if you don't see this email in your inbox.</p>
    </div>
    ${footer(brand)}
  </div>
</body>
</html>`
}

async function resolveBrand(supabase: any, companyName: string | undefined | null) {
  if (!companyName) return DEFAULT_BRAND
  const { data: brandRow } = await supabase
    .from('brands')
    .select('display_name, domain, primary_color, logo_url, email_from_name, send_domain')
    .eq('company_name', companyName)
    .maybeSingle()

  if (!brandRow) return DEFAULT_BRAND
  return {
    display_name: brandRow.display_name || DEFAULT_BRAND.display_name,
    domain: brandRow.domain || DEFAULT_BRAND.domain,
    primary_color: brandRow.primary_color || DEFAULT_BRAND.primary_color,
    logo_url: brandRow.logo_url || DEFAULT_BRAND.logo_url,
    email_from_name: brandRow.email_from_name || DEFAULT_BRAND.email_from_name,
    send_domain: brandRow.send_domain || DEFAULT_BRAND.send_domain,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('Auth hook received:', JSON.stringify(body).slice(0, 200))

    const { user, email_data } = body
    const email = user?.email
    const emailType = email_data?.email_action_type
    const redirectTo = emailType === 'recovery' ? `${APP_URL}/auth/reset` : APP_URL
    const confirmUrl = email_data?.token_hash
      ? `https://auth.inventorytools.co.uk/auth/v1/verify?token=${email_data.token_hash}&type=${emailType}&redirect_to=${redirectTo}`
      : email_data?.confirmation_url

    if (!email || !confirmUrl) {
      console.log('Missing email or URL:', { email, confirmUrl })
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // For brand-new signups, company_name comes straight from signup metadata
    // (no profiles row exists yet at this point). For password resets on
    // existing accounts, look it up from their profile instead.
    let companyName: string | undefined = user?.user_metadata?.company_name

    if (!companyName && emailType === 'recovery' && user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name')
        .eq('id', user.id)
        .maybeSingle()
      companyName = profile?.company_name
    }

    const brand = await resolveBrand(supabase, companyName)

    let subject = `Confirm your ${brand.display_name} account`
    let html = confirmEmail(brand, confirmUrl)

    if (emailType === 'recovery') {
      subject = `Reset your ${brand.display_name} password`
      html = resetEmail(brand, confirmUrl)
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: `${brand.email_from_name} <noreply@${brand.send_domain}>`, to: email, subject, html })
    })

    const data = await res.json()
    console.log('Resend response:', JSON.stringify(data))

    return NextResponse.json({})
  } catch (err: any) {
    console.log('Auth hook error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
