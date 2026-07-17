import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { conversion_id, user_id } = await req.json()

    const authHeader = req.headers.get('authorization')
    const authToken = authHeader?.replace('Bearer ', '').trim()
    if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const authVerifyClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user: authUser } } = await authVerifyClient.auth.getUser(authToken)
    if (!authUser || authUser.id !== user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: conv, error } = await supabase
      .from('conversions')
      .select('id, converted_json, whisper_words, audio_paths, address, gpt4o_transcript')
      .eq('id', conversion_id)
      .eq('user_id', user_id)
      .single()
    if (error || !conv) return NextResponse.json({ error: 'Conversion not found' }, { status: 404 })
    if (!conv.audio_paths) return NextResponse.json({ error: 'No stored audio available for this conversion.' }, { status: 400 })

    const audioPaths: Record<string, string> = conv.audio_paths || {}
    const signedUrls: Record<string, string> = {}

    await Promise.all(Object.entries(audioPaths).map(async ([roomName, path]) => {
      const { data: signed } = await supabase.storage.from('documents').createSignedUrl(path, 3600)
      if (signed?.signedUrl) signedUrls[roomName] = signed.signedUrl
    }))

    const rooms = conv.converted_json?.rooms || []
    const roomNames: string[] = rooms.map((r: any) => r.roomName)

    // gpt4o_transcript is stored as one block with "=== RoomName ===" markers (for display),
    // not per-room JSON like whisper_words - split it back out per room here.
    const gpt4oText: string = conv.gpt4o_transcript || ''
    const gpt4oWordsByRoom: Record<string, string[]> = {}
    for (const roomName of roomNames) {
      const marker = `=== ${roomName} ===\n`
      const startIdx = gpt4oText.indexOf(marker)
      if (startIdx === -1) { gpt4oWordsByRoom[roomName] = []; continue }
      const contentStart = startIdx + marker.length
      const nextMarkerIdx = gpt4oText.indexOf('\n\n=== ', contentStart)
      const roomText = nextMarkerIdx === -1 ? gpt4oText.slice(contentStart).trim() : gpt4oText.slice(contentStart, nextMarkerIdx).trim()
      gpt4oWordsByRoom[roomName] = roomText.split(/\s+/).filter(Boolean)
    }

    return NextResponse.json({
      ok: true,
      address: conv.address,
      rooms,
      whisperWords: conv.whisper_words || {},
      gpt4oWords: gpt4oWordsByRoom,
      audioUrls: signedUrls,
    })
  } catch (err: any) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
