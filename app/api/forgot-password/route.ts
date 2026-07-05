import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const RESEND_API_KEY = process.env.RESEND_API_KEY

const DEFAULT_BRAND = {
  display_name: 'InventoryTools',
  domain: 'inventorytools.co.uk',
  primary_color: '#FD6A02',
  logo_url: '/logo-email-full.png',
  email_from_name: 'InventoryTools',
  send_domain: 'inventorytools.co.uk',
}

function resetEmail(brand: typeof DEFAULT_BRAND, resetUrl: string) {
  const logoUrl = `https://www.${brand.send_domain}${brand.logo_url}`
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#ffffff;padding:32px 40px;text-align:center;border-bottom:1px solid #f0f0f0;">
      <img src="${logoUrl}" width="200" alt="${brand.display_name}" style="display:block;margin:0 auto;height:auto;">
    </div>
    <div style="padding:40px;">
      <h2 style="color:#1a1a2e;font-size:20px;font-weight:700;margin:0 0 12px;">Reset your password</h2>
      <p style="color:#888;font-size:14px;line-height:1.6;margin:0 0 24px;">We received a request to reset your password. Click the button below to choose a new one.</p>
      <a href="${resetUrl}" style="display:inline-block;background:${brand.primary_color};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;margin-bottom:24px;">Reset password</a>
      <p style="color:#aaa;font-size:12px;margin:0;">If you did not request a password reset, you can ignore this email. This link expires in 1 hour.</p>
    </div>
    <div style="background:#f5f5f5;padding:20px 40px;text-align:center;">
      <p style="color:#aaa;font-size:11px;margin:0;">© ${new Date().getFullYear()} ${brand.display_name} · ${brand.domain}</p>
    </div>
  </div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    console.log('Forgot password called for:', email)
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Look up the user and their company/brand BEFORE generating the link, so we know the correct redirect domain
    let redirectDomain = 'inventorytools.co.uk'
    let redirectPath = '/auth/reset'
    try {
      const { data: { users } } = await supabase.auth.admin.listUsers()
      const matchedUser = users.find((u: any) => u.email === email)
      if (matchedUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_name')
          .eq('id', matchedUser.id)
          .maybeSingle()

        if (profile?.company_name) {
          const { data: brandRow } = await supabase
            .from('brands')
            .select('send_domain, company_name')
            .eq('company_name', profile.company_name)
            .maybeSingle()

          if (brandRow?.send_domain) {
            redirectDomain = brandRow.send_domain
            // Always use /auth/reset for every brand - it already resolves the correct branding
            // via the logged-in recovery session, not the hostname. /oj-login is a sign-in page
            // with no "set new password" form, so it must never be used as a reset destination.
            redirectPath = '/auth/reset'
          }
        }
      }
    } catch (e) { /* fall back to InventoryTools default if lookup fails */ }

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `https://www.${redirectDomain}${redirectPath}` }
    })

    if (error || !data?.properties?.action_link) {
      console.log('Generate link error:', error?.message)
      return NextResponse.json({ ok: true })
    }

    const resetUrl = data.properties.action_link

    // Resolve brand based on the user's company
    let brand = DEFAULT_BRAND
    const userId = data.user?.id
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name')
        .eq('id', userId)
        .maybeSingle()

      if (profile?.company_name) {
        const { data: brandRow } = await supabase
          .from('brands')
          .select('display_name, domain, primary_color, logo_url, email_from_name, send_domain')
          .eq('company_name', profile.company_name)
          .maybeSingle()

        if (brandRow) {
          brand = {
            display_name: brandRow.display_name || DEFAULT_BRAND.display_name,
            domain: brandRow.domain || DEFAULT_BRAND.domain,
            primary_color: brandRow.primary_color || DEFAULT_BRAND.primary_color,
            logo_url: brandRow.logo_url || DEFAULT_BRAND.logo_url,
            email_from_name: brandRow.email_from_name || DEFAULT_BRAND.email_from_name,
            send_domain: brandRow.send_domain || DEFAULT_BRAND.send_domain,
          }
        }
      }
    }

    const html = resetEmail(brand, resetUrl)

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: `${brand.email_from_name} <noreply@${brand.send_domain}>`,
        to: email,
        subject: `Reset your ${brand.display_name} password`,
        html
      })
    })
    const resendData = await resendRes.json()
    console.log('Resend response:', JSON.stringify(resendData))

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.log('Error:', err.message)
    console.error('[API Error]', path, err)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
