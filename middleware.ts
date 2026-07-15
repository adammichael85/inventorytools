import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || ''
  const isOakleyJaneDomain = hostname.includes('oakleyjanetools.co.uk')

  const hasInviteToken = req.nextUrl.searchParams.has('invite')

  if (isOakleyJaneDomain && (req.nextUrl.pathname === '/' || req.nextUrl.pathname === '/auth') && !hasInviteToken) {
    const url = req.nextUrl.clone()
    url.pathname = '/oj-login'
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/auth'],
}
