import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Pull aggregated totals from user_stats (pre-computed, fast)
    const { data: statsRows, error: statsError } = await supabase
      .from('user_stats')
      .select('total_conversions, total_rooms, total_duration_seconds')

    // Pull only type + rating + audio fields from conversions for the split
    const { data: convRows, error: convError } = await supabase
      .from('conversions')
      .select('type, rating, rooms, duration_seconds, audio_length_seconds')

    if (statsError || convError || !statsRows || !convRows) {
      return NextResponse.json({ error: 'Could not load stats' }, { status: 500 })
    }

    const pdfRows = convRows.filter((r: any) => r.type !== 'audio')
    const audioRows = convRows.filter((r: any) => r.type === 'audio')

    const pdfRatings = pdfRows.filter((r: any) => r.rating).map((r: any) => r.rating)
    const audioRatings = audioRows.filter((r: any) => r.rating).map((r: any) => r.rating)

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0
    const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0)

    // Global totals from user_stats
    const totalReports = sum(statsRows.map((r: any) => r.total_conversions || 0))
    const totalRooms = sum(statsRows.map((r: any) => r.total_rooms || 0))

    const pdfDurations = pdfRows.map((r: any) => r.duration_seconds || 0).filter((v: number) => v > 0)
    const pdfTotalRooms = sum(pdfRows.map((r: any) => r.rooms || 0))
    const pdfAvgSeconds = avg(pdfDurations)

    const audioTotalAudioSeconds = sum(audioRows.map((r: any) => r.audio_length_seconds || 0))
    const audioTotalConvertSeconds = sum(audioRows.map((r: any) => r.duration_seconds || 0))

    return NextResponse.json({
      totals: {
        total_reports: totalReports,
        total_rooms: totalRooms,
      },
      pdf: {
        total_reports: pdfRows.length,
        total_rooms: pdfTotalRooms,
        avg_conversion_seconds: Math.round(pdfAvgSeconds),
        avg_rating: Math.round(avg(pdfRatings) * 10) / 10,
        rating_count: pdfRatings.length,
      },
      audio: {
        total_reports: audioRows.length,
        total_audio_seconds: audioTotalAudioSeconds,
        total_convert_seconds: audioTotalConvertSeconds,
        avg_rating: Math.round(avg(audioRatings) * 10) / 10,
        rating_count: audioRatings.length,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
