export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'
import { tasks } from "@trigger.dev/sdk/v3"
import { visionConvertTask } from "@/trigger/vision-convert"
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { pdfPath, userId, convertedBy, promptStyle } = await req.json()
    if (!pdfPath) return NextResponse.json({ error: "No pdfPath" }, { status: 400 })
    if (!userId) return NextResponse.json({ error: "No userId" }, { status: 400 })

    // Verify caller is authenticated and owns this userId
    const authHeader = req.headers.get('authorization')
    const authToken = authHeader?.replace('Bearer ', '').trim()
    if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const authVerifyClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user: authUser } } = await authVerifyClient.auth.getUser(authToken)
    if (!authUser || authUser.id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const jobId = `vision_${userId}_${Date.now()}`

    // Create initial job record
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await supabase.from("vision_jobs").insert({
      id: jobId,
      user_id: userId,
      status: "queued",
      progress: 0,
      message: "Queued...",
      updated_at: new Date().toISOString()
    })

    // Trigger the background task
    await tasks.trigger<typeof visionConvertTask>("vision-convert", {
      pdfPath,
      jobId,
      userId,
      convertedBy: convertedBy || '',
      promptStyle: promptStyle || 'standard'
    })

    return NextResponse.json({ jobId })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
