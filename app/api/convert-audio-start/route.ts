export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'
import { tasks } from "@trigger.dev/sdk/v3"
import { audioConvertTask } from "@/trigger/audio-convert"
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { filePaths, fileNames, roomOrder, propertySize, furnished, address, userId, convertedBy } = await req.json()
    if (!filePaths || filePaths.length === 0) return NextResponse.json({ error: "No audio files provided" }, { status: 400 })
    if (!userId) return NextResponse.json({ error: "No userId" }, { status: 400 })

    const authHeader = req.headers.get('authorization')
    const authToken = authHeader?.replace('Bearer ', '').trim()
    if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const authVerifyClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user: authUser } } = await authVerifyClient.auth.getUser(authToken)
    if (!authUser || authUser.id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const jobId = `audio-${userId}-${Date.now()}`

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await supabase.from("audio_jobs").insert({
      id: jobId,
      user_id: userId,
      status: "queued",
      progress: 0,
      message: "Queued...",
      address: address || null,
      property_size: propertySize || null,
      furnished: furnished || null,
      updated_at: new Date().toISOString()
    })

    await tasks.trigger<typeof audioConvertTask>("audio-convert", {
      filePaths,
      fileNames,
      roomOrder: roomOrder || '',
      propertySize: propertySize || '',
      furnished: furnished || '',
      address: address || '',
      jobId,
      userId,
      convertedBy: convertedBy || ''
    })

    return NextResponse.json({ jobId })

  } catch (err: any) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
