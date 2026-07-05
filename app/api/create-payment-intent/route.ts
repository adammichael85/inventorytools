import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, amount } = body

  // Verify the caller is authenticated and owns the user_id they claim
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '').trim()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const anonClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user: authUser } } = await anonClient.auth.getUser(token)
    if (!authUser || authUser.id !== user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (!user_id || !amount || Number(amount) < 20) {
      return NextResponse.json({ error: 'Invalid user_id or amount (minimum £20)' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Resolve the user's company
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('company_name')
      .eq('id', user_id)
      .single()
    if (profileError || !userProfile?.company_name) {
      throw new Error('User has no company assigned')
    }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('stripe_customer_id')
      .eq('company_name', userProfile.company_name)
      .single()
    if (companyError) throw new Error(companyError.message)

    let customerId = company?.stripe_customer_id

    // Create a Stripe customer if this company doesn't have one yet
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: userProfile.company_name,
        metadata: { company_name: userProfile.company_name },
      })
      customerId = customer.id

      await supabase
        .from('companies')
        .update({ stripe_customer_id: customerId })
        .eq('company_name', userProfile.company_name)
    }

    const amountInPence = Math.round(Number(amount) * 100)

    // Customer Session: lets the Payment Element show saved cards and offer an optional "save card" checkbox
    const customerSession = await stripe.customerSessions.create({
      customer: customerId,
      components: {
        payment_element: {
          enabled: true,
          features: {
            payment_method_redisplay: 'enabled',
            payment_method_save: 'enabled',
            payment_method_save_usage: 'on_session',
            payment_method_remove: 'enabled',
          },
        },
      },
    })

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPence,
      currency: 'gbp',
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      metadata: {
        user_id,
        company_name: userProfile.company_name,
        topup_amount: String(amountInPence),
        source: 'dashboard_topup_modal',
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      customerSessionClientSecret: customerSession.client_secret,
    })
  } catch (err: any) {
    console.error('create-payment-intent error:', err)
    return NextResponse.json({ error: err.message || 'Failed to create payment intent' }, { status: 500 })
  }
}
