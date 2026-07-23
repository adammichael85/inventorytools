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
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (authUser.id !== user_id) {
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('role, company_name')
        .eq('id', authUser.id)
        .single()
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('company_name')
        .eq('id', user_id)
        .single()
      const isSameCompanyAdmin = requesterProfile?.role === 'admin' && targetProfile?.company_name && requesterProfile.company_name === targetProfile.company_name
      if (!isSameCompanyAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: conv, error } = await supabase
      .from('conversions')
      .select('id, converted_json, whisper_words, audio_paths, address, gpt4o_transcript, whisper_transcript')
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
    const gpt4oHasMarkers = /=== .+? ===/.test(gpt4oText)
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

    // Fallback: audio wasn't matched one-to-one with room names during conversion, so there's
    // no genuine per-room split available at all (not for gpt4o text, not for whisper words either -
    // the upstream job only populates per-room whisper word timing when matching succeeds).
    // Rather than showing every room blank, show the full combined transcript in every room tab
    // so the reviewer can still read what was actually transcribed.
    const whisperWordsRaw: Record<string, any[]> = conv.whisper_words || {}
    const whisperHasAnyRoomData = roomNames.some(r => Array.isArray(whisperWordsRaw[r]) && whisperWordsRaw[r].length > 0)
    const isFallbackMode = !gpt4oHasMarkers && !whisperHasAnyRoomData && roomNames.length > 0

    if (isFallbackMode) {
      const fallbackWhisperText: string = conv.whisper_transcript || ''
      const fallbackGpt4oWords = gpt4oText.split(/\s+/).filter(Boolean)
      const fallbackWhisperWords = fallbackWhisperText.split(/\s+/).filter(Boolean)
      for (const roomName of roomNames) {
        gpt4oWordsByRoom[roomName] = fallbackGpt4oWords
        whisperWordsRaw[roomName] = fallbackWhisperWords.map((w: string) => ({ word: w, start: 0, end: 0 }))
      }
    }

    return NextResponse.json({
      ok: true,
      address: conv.address,
      rooms,
      whisperWords: whisperWordsRaw,
      gpt4oWords: gpt4oWordsByRoom,
      audioUrls: signedUrls,
      fallbackMode: isFallbackMode,
    })
  } catch (err: any) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
