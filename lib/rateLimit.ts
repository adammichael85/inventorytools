import { createClient } from '@supabase/supabase-js'

// Lightweight fixed-window rate limiter backed by Supabase.
// Returns { allowed: true } if the request should proceed, or
// { allowed: false, retryAfterSeconds } if the caller is over the limit.
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()

  const { data: existing } = await supabase
    .from('rate_limits')
    .select('count, window_start')
    .eq('key', key)
    .maybeSingle()

  if (!existing) {
    await supabase.from('rate_limits').insert({ key, count: 1, window_start: now.toISOString() })
    return { allowed: true }
  }

  const windowStart = new Date(existing.window_start)
  const elapsedSeconds = (now.getTime() - windowStart.getTime()) / 1000

  if (elapsedSeconds > windowSeconds) {
    // window expired, reset
    await supabase.from('rate_limits').update({ count: 1, window_start: now.toISOString() }).eq('key', key)
    return { allowed: true }
  }

  if (existing.count >= maxRequests) {
    const retryAfterSeconds = Math.ceil(windowSeconds - elapsedSeconds)
    return { allowed: false, retryAfterSeconds }
  }

  await supabase.from('rate_limits').update({ count: existing.count + 1 }).eq('key', key)
  return { allowed: true }
}
