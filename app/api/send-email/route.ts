import { NextRequest, NextResponse } from 'next/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = 'noreply@inventorytools.co.uk'
const APP_URL = 'https://inventorytools.co.uk'

function confirmationEmail(email: string, confirmUrl: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#FD6A02;padding:32px 40px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">inventorytools</h1>
      <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">PDF to Word Converter</p>
    </div>
    <div style="padding:40px;">
      <h2 style="color:#1a1a2e;font-size:20px;font-weight:700;margin:0 0 12px;">Confirm your email</h2>
      <p style="color:#888;font-size:14px;line-height:1.6;margin:0 0 24px;">Thanks for signing up to InventoryTools. Click the button below to confirm your email address and activate your account.</p>
      <a href="${confirmUrl}" style="display:inline-block;background:#FD6A02;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;margin-bottom:24px;">Confirm email address</a>
      <p style="color:#aaa;font-size:12px;margin:0;">If you didn't create an account, you can ignore this email. This link expires in 24 hours.</p>
    </div>
    <div style="background:#f5f5f5;padding:20px 40px;text-align:center;">
      <p style="color:#aaa;font-size:11px;margin:0;">© ${new Date().getFullYear()} InventoryTools · <a href="${APP_URL}" style="color:#FD6A02;text-decoration:none;">inventorytools.co.uk</a></p>
    </div>
  </div>
</body>
</html>`
}

function resetEmail(email: string, resetUrl: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#FD6A02;padding:32px 40px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">inventorytools</h1>
      <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">PDF to Word Converter</p>
    </div>
    <div style="padding:40px;">
      <h2 style="color:#1a1a2e;font-size:20px;font-weight:700;margin:0 0 12px;">Reset your password</h2>
      <p style="color:#888;font-size:14px;line-height:1.6;margin:0 0 24px;">We received a request to reset your password. Click the button below to choose a new one.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#FD6A02;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;margin-bottom:24px;">Reset password</a>
      <p style="color:#aaa;font-size:12px;margin:0;">If you didn't request a password reset, you can ignore this email. This link expires in 1 hour.</p>
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
    const { type, email, url } = await req.json()
    if (!type || !email || !url) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const subject = type === 'confirmation' ? 'Confirm your InventoryTools account' : 'Reset your InventoryTools password'
    const html = type === 'confirmation' ? confirmationEmail(email, url) : resetEmail(email, url)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: FROM_EMAIL, to: email, subject, html })
    })

    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
