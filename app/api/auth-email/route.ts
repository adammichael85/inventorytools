import { NextRequest, NextResponse } from 'next/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const HOOK_SECRET = process.env.SUPABASE_AUTH_HOOK_SECRET
const APP_URL = 'https://inventorytools.co.uk'

function logoHeader() {
  return `<div style="background:#FD6A02;padding:32px 40px;text-align:center;">
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
      <tr>
        <td style="vertical-align:middle;padding-right:10px;">
          <svg width="36" height="36" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" rx="26" fill="rgba(255,255,255,0.25)"/><rect x="8" y="10" width="24" height="20" rx="5" fill="white" opacity="0.6"/><rect x="8" y="36" width="24" height="20" rx="5" fill="white" opacity="0.6"/><rect x="8" y="62" width="24" height="20" rx="5" fill="white" opacity="0.6"/><rect x="8" y="88" width="24" height="20" rx="5" fill="white" opacity="0.4"/><rect x="38" y="10" width="74" height="20" rx="5" fill="white" opacity="0.4"/><rect x="38" y="36" width="56" height="20" rx="5" fill="white" opacity="0.4"/><rect x="38" y="62" width="64" height="20" rx="5" fill="white" opacity="0.4"/><rect x="38" y="88" width="44" height="20" rx="5" fill="white" opacity="0.3"/><path d="M30 62 L50 84 L90 40" stroke="white" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </td>
        <td style="vertical-align:middle;">
          <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">inventory<span style="color:rgba(255,255,255,0.7);">tools</span></span>
        </td>
      </tr>
    </table>
    <p style="color:rgba(255,255,255,0.8);margin:10px 0 0;font-size:13px;">PDF to Word Converter</p>
  </div>`
}

function footer() {
  return `<div style="background:#f5f5f5;padding:20px 40px;text-align:center;">
    <p style="color:#aaa;font-size:11px;margin:0;">© 2026 InventoryTools · <a href="${APP_URL}" style="color:#FD6A02;text-decoration:none;">inventorytools.co.uk</a></p>
  </div>`
}

function confirmEmail(confirmUrl: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    ${logoHeader()}
    <div style="padding:40px;">
      <h2 style="color:#1a1a2e;font-size:20px;font-weight:700;margin:0 0 12px;">Confirm your email</h2>
      <p style="color:#888;font-size:14px;line-height:1.6;margin:0 0 24px;">Thanks for signing up to InventoryTools. Click the button below to confirm your email address and activate your account.</p>
      <a href="${confirmUrl}" style="display:inline-block;background:#FD6A02;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;margin-bottom:24px;">Confirm email address</a>
      <p style="color:#aaa;font-size:12px;margin:0 0 8px;">If you didn't create an account, you can ignore this email. This link expires in 24 hours.</p>
      <p style="color:#aaa;font-size:12px;margin:0;">Please check your junk/spam folder if you don't see this email in your inbox.</p>
    </div>
    ${footer()}
  </div>
</body>
</html>`
}

function resetEmail(resetUrl: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    ${logoHeader()}
    <div style="padding:40px;">
      <h2 style="color:#1a1a2e;font-size:20px;font-weight:700;margin:0 0 12px;">Reset your password</h2>
      <p style="color:#888;font-size:14px;line-height:1.6;margin:0 0 24px;">We received a request to reset your password. Click the button below to choose a new one.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#FD6A02;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;margin-bottom:24px;">Reset password</a>
      <p style="color:#aaa;font-size:12px;margin:0 0 8px;">If you didn't request a password reset, you can ignore this email. This link expires in 1 hour.</p>
      <p style="color:#aaa;font-size:12px;margin:0;">Please check your junk/spam folder if you don't see this email in your inbox.</p>
    </div>
    ${footer()}
  </div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('Auth hook received:', JSON.stringify(body).slice(0, 200))

    const { user, email_data } = body
    const email = user?.email
    const emailType = email_data?.email_action_type
    const confirmUrl = email_data?.token_hash 
      ? `https://auth.inventorytools.co.uk/auth/v1/verify?token=${email_data.token_hash}&type=${emailType}&redirect_to=${APP_URL}/auth/reset`
      : email_data?.confirmation_url

    if (!email || !confirmUrl) {
      console.log('Missing email or URL:', { email, confirmUrl })
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    let subject = 'Confirm your InventoryTools account'
    let html = confirmEmail(confirmUrl)

    if (emailType === 'recovery') {
      subject = 'Reset your InventoryTools password'
      html = resetEmail(confirmUrl)
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: 'hello@inventorytools.co.uk', to: email, subject, html })
    })

    const data = await res.json()
    console.log('Resend response:', JSON.stringify(data))

    return NextResponse.json({})
  } catch (err: any) {
    console.log('Auth hook error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
