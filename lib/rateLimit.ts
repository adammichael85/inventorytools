import { createClient } from '@supabase/supabase-js'

// Atomic rate limiter backed by a single Postgres function (check_rate_limit),
// which performs the entire check-and-increment as one database statement —
// eliminating the read-then-write race condition the previous version had.
// Same signature as before, so no call sites need to change.
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_key: key,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  })

  if (error || !data || data.length === 0) {
    console.error('checkRateLimit RPC failed, failing open:', error?.message)
    return { allowed: true } // never let a rate-limiter bug block legitimate traffic
  }

  const result = data[0]
  return {
    allowed: result.allowed,
    retryAfterSeconds: result.allowed ? undefined : result.retry_after_seconds,
  }
}
