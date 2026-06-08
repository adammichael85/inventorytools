import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Save conversion
    const { error: convError } = await supabase.from('conversions').insert({
      user_id: body.user_id,
      address: body.address,
      rooms: body.rooms,
      duration_seconds: body.duration_seconds,
      file_path: body.file_path || null,
      converted_by: body.converted_by || null,
    })
    if (convError) throw new Error(convError.message)

    // Deduct 1 credit
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', body.user_id)
      .single()
    if (profileError) throw new Error(profileError.message)

    const newCredits = Math.max(0, (profile.credits || 0) - 1)
    await supabase.from('profiles').update({ credits: newCredits }).eq('id', body.user_id)

    return NextResponse.json({ ok: true, credits: newCredits })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
