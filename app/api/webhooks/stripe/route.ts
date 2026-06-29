import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as any
    const metadata = paymentIntent.metadata || {}
    const companyName = metadata.company_name
    const topupAmountPence = Number(metadata.topup_amount)

    if (!companyName || !topupAmountPence) {
      console.error('Webhook missing metadata:', metadata)
      return NextResponse.json({ received: true })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('balance')
      .eq('company_name', companyName)
      .single()

    if (companyError) {
      console.error('Webhook: failed to fetch company balance:', companyError.message)
      return NextResponse.json({ received: true })
    }

    const topupAmountPounds = topupAmountPence / 100
    const newBalance = (Number(company?.balance) || 0) + topupAmountPounds

    const { error: updateError } = await supabase
      .from('companies')
      .update({ balance: newBalance })
      .eq('company_name', companyName)

    if (updateError) {
      console.error('Webhook: failed to update balance:', updateError.message)
    } else {
      console.log(`Top-up confirmed: ${companyName} +£${topupAmountPounds.toFixed(2)} → new balance £${newBalance.toFixed(2)}`)
    }
  }

  return NextResponse.json({ received: true })
}
