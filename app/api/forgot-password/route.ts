import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    console.log('Forgot password called for:', email)
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: 'https://inventorytools.co.uk/auth/reset' }
    })

    if (error || !data?.properties?.action_link) {
      console.log('Generate link error:', error?.message)
      return NextResponse.json({ ok: true })
    }

    const resetUrl = data.properties.action_link
    console.log('Reset URL generated:', resetUrl.slice(0, 50))

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#FD6A02;padding:32px 40px;text-align:center;">
      <p style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.5px;">inventorytools</p>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:13px;">PDF to Word Converter</p>
    </div>
    <div style="padding:40px;">
      <h2 style="color:#1a1a2e;font-size:20px;font-weight:700;margin:0 0 12px;">Reset your password</h2>
      <p style="color:#888;font-size:14px;line-height:1.6;margin:0 0 24px;">We received a request to reset your password. Click the button below to choose a new one.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#FD6A02;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;margin-bottom:24px;">Reset password</a>
      <p style="color:#aaa;font-size:12px;margin:0;">If you did not request a password reset, you can ignore this email. This link expires in 1 hour.</p>
    </div>
    <div style="background:#f5f5f5;padding:20px 40px;text-align:center;">
      <p style="color:#aaa;font-size:11px;margin:0;">2025 InventoryTools - inventorytools.co.uk</p>
    </div>
  </div>
</body>
</html>`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'hello@inventorytools.co.uk',
        to: email,
        subject: 'Reset your InventoryTools password',
        html
      })
    })
    const resendData = await resendRes.json()
    console.log('Resend response:', JSON.stringify(resendData))

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.log('Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}