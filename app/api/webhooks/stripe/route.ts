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

    // Capture card brand/last4 for the receipt. Best-effort only — never let this
    // block the balance update, which is the critical path.
    let cardBrand: string | null = null
    let cardLast4: string | null = null
    try {
      if (paymentIntent.latest_charge) {
        const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string)
        const card = charge.payment_method_details?.card
        if (card) {
          cardBrand = card.brand ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1) : null
          cardLast4 = card.last4 || null
        }
      }
    } catch (cardErr: any) {
      console.error('Webhook: could not retrieve card details (non-critical):', cardErr.message)
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

    const invoiceNumber = 'TU-' + paymentIntent.id.slice(-8).toUpperCase()
    const { error: txnError } = await supabase.from('transactions').insert({
      user_id: metadata.user_id || null,
      company_name: companyName,
      amount: topupAmountPounds,
      description: 'Balance top-up',
      stripe_payment_id: paymentIntent.id,
      invoice_number: invoiceNumber,
      card_brand: cardBrand,
      card_last4: cardLast4,
    })
    if (txnError) {
      console.error('Webhook: failed to insert transaction record:', txnError.message)
    }
  }

  return NextResponse.json({ received: true })
}
