import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Verifies the Authorization header contains a valid Supabase session
// and that the userId in the request body matches the authenticated user.
// Returns the verified userId, or throws a 401 NextResponse.
export async function requireAuth(req: NextRequest, claimedUserId: string): Promise<string> {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '').trim()

  if (!token) {
    throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.id !== claimedUserId) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return user.id
}
