import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let companyName = body.company_name
    let role = 'admin'

    // If signing up via an invite token, override company name and force role to user
    if (body.invite_token) {
      const { data: invite, error: inviteErr } = await supabase
        .from('invites')
        .select('email, company_name, used, expires_at')
        .eq('token', body.invite_token)
        .single()

      if (inviteErr || !invite) throw new Error('Invalid invite link')
      if (invite.used) throw new Error('This invite has already been used')
      if (new Date(invite.expires_at) < new Date()) throw new Error('This invite has expired')

      companyName = invite.company_name
      role = 'user'

      // Mark invite as used
      await supabase.from('invites').update({ used: true }).eq('token', body.invite_token)
    } else {
      // Normal signup (no invite) - first signup for this company gets admin role
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('company_name', companyName)

      role = count === 0 ? 'admin' : 'user'
    }

    const { error } = await supabase.from('profiles').insert({
      id: body.id,
      full_name: body.full_name,
      role: role,
      company_name: companyName,
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
