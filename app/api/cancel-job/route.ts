import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runs } from '@trigger.dev/sdk/v3'

export async function POST(req: NextRequest) {
  try {
    const { jobId, type } = await req.json()
    if (!jobId || !type || (type !== 'audio' && type !== 'vision')) {
      return NextResponse.json({ error: 'jobId and a valid type (audio|vision) are required' }, { status: 400 })
    }

    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '').trim()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const anonClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user } } = await anonClient.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const table = type === 'audio' ? 'audio_jobs' : 'vision_jobs'

    const { data: job, error: fetchError } = await supabase
      .from(table)
      .select('user_id, trigger_run_id, status')
      .eq('id', jobId)
      .maybeSingle()

    if (fetchError || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    if (job.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (job.status === 'complete' || job.status === 'cancelled') {
      return NextResponse.json({ ok: true, alreadyFinished: true })
    }

    // Actually stop the background task, not just hide it in the UI
    if (job.trigger_run_id) {
      try {
        await runs.cancel(job.trigger_run_id)
      } catch (e: any) {
        // Job may have already finished or failed on Trigger.dev's side between our
        // status check and this call - not fatal, we still mark it cancelled below.
        console.error('runs.cancel failed (job may have already finished):', e.message)
      }
    }

    await supabase.from(table).update({ status: 'cancelled', message: 'Cancelled by user' }).eq('id', jobId)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[API Error]', err)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
