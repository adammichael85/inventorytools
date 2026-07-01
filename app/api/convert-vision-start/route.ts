export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'
import { tasks } from "@trigger.dev/sdk/v3"
import { visionConvertTask } from "@/trigger/vision-convert"
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { pdfPath, userId, convertedBy } = await req.json()
    if (!pdfPath) return NextResponse.json({ error: "No pdfPath" }, { status: 400 })
    if (!userId) return NextResponse.json({ error: "No userId" }, { status: 400 })

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
      convertedBy: convertedBy || ''
    })

    return NextResponse.json({ jobId })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
