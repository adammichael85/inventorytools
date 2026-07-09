import { NextRequest, NextResponse } from 'next/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY

export async function POST(req: NextRequest) {
  try {
    const { type, errorMessage, address, userEmail } = await req.json()

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'InventoryTools Alerts <noreply@inventorytools.co.uk>',
        to: 'admin@inventorytools.co.uk',
        subject: `Conversion failed: ${type || 'unknown'} — ${address || 'no address'}`,
        html: `
          <p><strong>Type:</strong> ${type || 'unknown'}</p>
          <p><strong>Property/address:</strong> ${address || '—'}</p>
          <p><strong>User:</strong> ${userEmail || '—'}</p>
          <p><strong>Real error:</strong></p>
          <pre style="background:#f6f5f3;padding:12px;border-radius:8px;white-space:pre-wrap;">${(errorMessage || 'No message').replace(/</g, '&lt;')}</pre>
        `
      })
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[report-error] failed to send alert email:', err.message)
    // Never let a failure to report an error become a second error shown to the user
    return NextResponse.json({ ok: true })
  }
}
