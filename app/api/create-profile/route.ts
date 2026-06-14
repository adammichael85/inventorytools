import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // First signup for this company gets admin role
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('company_name', body.company_name)

    const role = count === 0 ? 'admin' : 'user'

    const { error } = await supabase.from('profiles').insert({
      id: body.id,
      full_name: body.full_name,
      role: role,
      company_name: body.company_name,
      company_position: body.company_position,
      company_address: body.company_address,
      company_phone: body.company_phone,
      balance: 0,
    })
    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true, role })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
