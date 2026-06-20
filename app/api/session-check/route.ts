import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Check if an existing session is active for this user
export async function POST(req: NextRequest) {
  try {
    const { action, userId, sessionToken, deviceLabel } = await req.json()

    if (action === 'check_existing') {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('current_session_token, current_session_device, current_session_started_at')
        .eq('id', userId)
        .single()
      if (error) throw new Error(error.message)

      return NextResponse.json({
        ok: true,
        hasActiveSession: !!profile.current_session_token,
        device: profile.current_session_device,
        startedAt: profile.current_session_started_at,
      })
    }

    if (action === 'start_session') {
      await supabase.from('profiles').update({
        current_session_token: sessionToken,
        current_session_device: deviceLabel,
        current_session_started_at: new Date().toISOString(),
      }).eq('id', userId)
      return NextResponse.json({ ok: true })
    }

    if (action === 'verify_session') {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('current_session_token')
        .eq('id', userId)
        .single()
      if (error) throw new Error(error.message)

      const isValid = profile.current_session_token === sessionToken
      return NextResponse.json({ ok: true, valid: isValid })
    }

    if (action === 'end_session') {
      await supabase.from('profiles').update({
        current_session_token: null,
        current_session_device: null,
        current_session_started_at: null,
      }).eq('id', userId)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
