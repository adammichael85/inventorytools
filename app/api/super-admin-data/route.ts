import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPER_ADMIN_EMAIL = 'adammichael85@me.com'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const authToken = authHeader?.replace('Bearer ', '').trim()
    if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const authVerifyClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user: authUser } } = await authVerifyClient.auth.getUser(authToken)
    if (!authUser || authUser.email !== SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: conversions, error: convError } = await supabase
      .from('conversions')
      .select('*')
      .order('created_at', { ascending: false })
    if (convError) throw new Error(convError.message)

    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('id, company_name, full_name')
    if (profError) throw new Error(profError.message)

    const profileMap: Record<string, { company_name: string | null; full_name: string | null }> = {}
    for (const p of profiles || []) {
      profileMap[p.id] = { company_name: p.company_name, full_name: p.full_name }
    }

    const enriched = (conversions || []).map((c: any) => ({
      ...c,
      company_name: c.user_id ? (profileMap[c.user_id]?.company_name || 'Unknown / deleted user') : 'Unknown / deleted user',
    }))

    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
    if (txError) throw new Error(txError.message)

    // Pull real login activity from Supabase Auth (last_sign_in_at, created_at) and merge
    // with profile info - gives genuine "last seen" data without any new tracking infrastructure.
    const { data: authUsersData, error: authUsersError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (authUsersError) throw new Error(authUsersError.message)

    const conversionCountByUser: Record<string, number> = {}
    for (const c of conversions || []) {
      if (c.user_id) conversionCountByUser[c.user_id] = (conversionCountByUser[c.user_id] || 0) + 1
    }

    const users = (authUsersData?.users || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      full_name: profileMap[u.id]?.full_name || null,
      company_name: profileMap[u.id]?.company_name || null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      conversion_count: conversionCountByUser[u.id] || 0,
    }))

    return NextResponse.json({ conversions: enriched, transactions: transactions || [], users })
  } catch (err: any) {
    console.error('[super-admin-data]', err)
    return NextResponse.json({ error: err.message || 'Failed to load data' }, { status: 500 })
  }
}
