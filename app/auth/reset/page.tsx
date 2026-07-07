'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Brand = {
  display_name: string
  logo_url: string | null
  primary_color: string
}

const DEFAULT_BRAND: Brand = {
  display_name: 'InventoryTools',
  logo_url: '/logo-email-full.png',
  primary_color: '#FD6A02',
}

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [brand, setBrand] = useState<Brand>(DEFAULT_BRAND)
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 1000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    async function resolveBrandForUser(userId: string) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_name')
          .eq('id', userId)
          .single()

        if (profile?.company_name) {
          const { data: brandRow } = await supabase
            .from('brands')
            .select('display_name, logo_url, primary_color')
            .eq('company_name', profile.company_name)
            .maybeSingle()

          if (brandRow) {
            setBrand({
              display_name: brandRow.display_name || DEFAULT_BRAND.display_name,
              logo_url: brandRow.logo_url || DEFAULT_BRAND.logo_url,
              primary_color: brandRow.primary_color || DEFAULT_BRAND.primary_color,
            })
          }
        }
      } catch (e) { /* fall back to default brand */ }
    }

    // Handle PKCE code exchange for password reset links
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (!error && data.session?.user?.id) resolveBrandForUser(data.session.user.id)
      })
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) resolveBrandForUser(session.user.id)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session?.user?.id) {
        resolveBrandForUser(session.user.id)
      }
    })

    return () => { listener.subscription.unsubscribe() }
  }, [])

  async function handleReset() {
    if (password !== confirm) { setMessage('Passwords do not match'); return }
    if (password.length < 6) { setMessage('Password must be at least 6 characters'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setMessage(error.message); setLoading(false) } else { window.location.href = '/auth' }
  }

  const T = brand.primary_color
  const input = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e8e8e8', fontFamily: 'inherit', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div style={{
      minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', Arial, sans-serif",
      filter: revealed ? 'none' : 'grayscale(0.9) blur(8px)',
      transition: 'filter 0.4s ease',
    }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, width: '100%', maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          {revealed && brand.logo_url ? (
            <img src={brand.logo_url} alt={brand.display_name} style={{ height: 41, width: 381, maxWidth: '90%', margin: '0 auto 12px', display: 'block', objectFit: 'contain' }} />
          ) : revealed ? (
            <div style={{ width: 48, height: 48, background: T, borderRadius: 12, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 120 120" fill="none"><rect width="120" height="120" rx="26" fill="rgba(255,255,255,0.2)"/><path d="M30 62 L50 84 L90 40" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          ) : (
            <div style={{ height: 48, margin: '0 auto 12px' }} />
          )}
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#1a1a2e' }}>Set new password</h1>
        </div>
        {done ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#888', marginBottom: 20 }}>Your password has been updated successfully!</p>
            <a href="/auth" style={{ display: 'inline-block', background: T, color: '#fff', padding: '12px 28px', borderRadius: 10, textDecoration: 'none', fontWeight: 600 }}>Sign in</a>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6 }}>New password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={input} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6 }}>Confirm password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" style={input} />
            </div>
            {message && <p style={{ fontSize: 13, color: message.includes('sent') ? '#16a34a' : '#DC2626', marginBottom: 12 }}>{message}</p>}
            <button onClick={handleReset} disabled={loading} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: T, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
