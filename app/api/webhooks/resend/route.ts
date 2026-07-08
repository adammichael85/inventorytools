import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Webhook } from 'svix'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const headers = {
    'svix-id': req.headers.get('svix-id') || '',
    'svix-timestamp': req.headers.get('svix-timestamp') || '',
    'svix-signature': req.headers.get('svix-signature') || '',
  }

  let event: any
  try {
    const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET!)
    event = wh.verify(body, headers)
  } catch (err: any) {
    console.error('Resend webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'email.opened') {
    const emailId = event.data?.email_id
    if (emailId) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      await supabase
        .from('email_events')
        .update({ opened_at: new Date().toISOString() })
        .eq('resend_email_id', emailId)
        .is('opened_at', null) // only set on first open, don't overwrite
    }
  }

  return NextResponse.json({ received: true })
}
