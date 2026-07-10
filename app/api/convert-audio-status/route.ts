export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const jobId = req.nextUrl.searchParams.get("jobId")
    if (!jobId) return NextResponse.json({ error: "No jobId" }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from("audio_jobs")
      .select("*")
      .eq("id", jobId)
      .single()

    if (error || !data) return NextResponse.json({ error: "Job not found" }, { status: 404 })

    return NextResponse.json({
      status: data.status,
      progress: data.progress,
      message: data.message,
      address: data.address || "",
      room_names: data.room_names ? JSON.parse(data.room_names) : null,
      room_statuses: data.room_statuses ? JSON.parse(data.room_statuses) : null,
      rooms: data.rooms ? JSON.parse(data.rooms) : null,
      started_at: data.started_at
    })

  } catch (err: any) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
