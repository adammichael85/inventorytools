import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: invite, error } = await supabase
      .from('invites')
      .select('email, company_name, used, expires_at')
      .eq('token', token)
      .single()

    if (error || !invite) return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 })
    if (invite.used) return NextResponse.json({ error: 'This invite has already been used' }, { status: 410 })
    if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })

    return NextResponse.json({ ok: true, email: invite.email, company_name: invite.company_name })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
