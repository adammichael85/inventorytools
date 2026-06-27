import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: rows, error } = await supabase
      .from('conversions')
      .select('type, rooms, duration_seconds, audio_length_seconds, rating')

    if (error || !rows) {
      return NextResponse.json({ error: 'Could not load stats' }, { status: 500 })
    }

    const pdfRows = rows.filter((r: any) => r.type !== 'audio')
    const audioRows = rows.filter((r: any) => r.type === 'audio')

    const pdfRatings = pdfRows.filter((r: any) => r.rating).map((r: any) => r.rating)
    const audioRatings = audioRows.filter((r: any) => r.rating).map((r: any) => r.rating)

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0
    const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0)

    const pdfDurations = pdfRows.map((r: any) => r.duration_seconds || 0).filter((v: number) => v > 0)
    const pdfTotalRooms = sum(pdfRows.map((r: any) => r.rooms || 0))
    const pdfAvgSeconds = avg(pdfDurations)

    const audioTotalAudioSeconds = sum(audioRows.map((r: any) => r.audio_length_seconds || 0))
    const audioTotalConvertSeconds = sum(audioRows.map((r: any) => r.duration_seconds || 0))

    return NextResponse.json({
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
