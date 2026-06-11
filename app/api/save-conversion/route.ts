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
      extracted_text: body.extracted_text ? body.extracted_text.slice(0, 100000) : null,
      converted_json: body.converted_json || null,
    })
    if (convError) throw new Error(convError.message)

    // Deduct 1 credit
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', body.user_id)
      .single()
    if (profileError) throw new Error(profileError.message)

    const newCredits = Math.max(0, (Number(profile.balance) || 0) - 3.50)
    await supabase.from('profiles').update({ balance: newCredits }).eq('id', body.user_id)

    // Update persistent stats
    try {
      const { data: existing } = await supabase.from('user_stats').select('*').eq('user_id', body.user_id).single()
      if (existing) {
        await supabase.from('user_stats').update({
          total_conversions: (existing.total_conversions || 0) + 1,
          total_rooms: (existing.total_rooms || 0) + (body.rooms || 0),
          total_duration_seconds: (existing.total_duration_seconds || 0) + (body.duration_seconds || 0),
          total_spend: (existing.total_spend || 0) + 3.5,
          updated_at: new Date().toISOString()
        }).eq('user_id', body.user_id)
      } else {
        await supabase.from('user_stats').insert({
          user_id: body.user_id,
          total_conversions: 1,
          total_rooms: body.rooms || 0,
          total_duration_seconds: body.duration_seconds || 0,
          total_spend: 3.5
        })
      }
    } catch(e) { console.log('Stats update failed:', e) }

    return NextResponse.json({ ok: true, balance: newCredits })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
