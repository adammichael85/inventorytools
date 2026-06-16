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
      .from("vision_jobs")
      .select("*")
      .eq("id", jobId)
      .single()

    if (error || !data) return NextResponse.json({ error: "Job not found" }, { status: 404 })

    return NextResponse.json({
      status: data.status,
      progress: data.progress,
      message: data.message,
      rooms: data.rooms ? JSON.parse(data.rooms) : null,
      address: data.address || "",
      room_names: data.room_names ? JSON.parse(data.room_names) : null
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
