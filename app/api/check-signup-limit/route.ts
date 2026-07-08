import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    // IP is read server-side from request headers, not trusted from the client body
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

    const ipLimit = await checkRateLimit(`signup:ip:${ip}`, 5, 3600)
    if (!ipLimit.allowed) return NextResponse.json({ allowed: false })

    const emailLimit = await checkRateLimit(`signup:email:${email.toLowerCase()}`, 3, 3600)
    if (!emailLimit.allowed) return NextResponse.json({ allowed: false })

    return NextResponse.json({ allowed: true })
  } catch (err: any) {
    // Fail open: a bug in this check should never block a legitimate signup
    return NextResponse.json({ allowed: true })
  }
}
