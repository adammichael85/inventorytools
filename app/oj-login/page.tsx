'use client'
import React from 'react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const NAVY = '#152045'
const NAVY_DARK = '#0F1733'
const BORDER = '#E2E4EA'
const BG = '#F5F6F8'
const TEXT = '#1A1A1A'
const MUTED = '#5A6072'
const HINT = '#8A8FA0'

export default function OakleyJaneLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showSessionWarning, setShowSessionWarning] = useState(false)
  const [existingSessionDevice, setExistingSessionDevice] = useState('')
  const [pendingLoginUserId, setPendingLoginUserId] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('reason=inactivity')) {
      setMessage('You have been logged out due to inactivity. Please sign in again.')
    }
  }, [])

  function getDeviceLabel() {
    if (typeof navigator === 'undefined') return 'Unknown device'
    const ua = navigator.userAgent
    let browser = 'Unknown browser'
    if (ua.includes('Edg/')) browser = 'Edge'
    else if (ua.includes('Chrome/') && !ua.includes('Chromium')) browser = 'Chrome'
    else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari'
    else if (ua.includes('Firefox/')) browser = 'Firefox'
    let os = 'Unknown OS'
    if (ua.includes('Windows')) os = 'Windows'
    else if (ua.includes('Mac OS')) os = 'Mac'
    else if (ua.includes('iPhone')) os = 'iPhone'
    else if (ua.includes('iPad')) os = 'iPad'
    else if (ua.includes('Android')) os = 'Android'
    else if (ua.includes('Linux')) os = 'Linux'
    return `${browser} on ${os}`
  }

  async function completeLogin(userId: string) {
    const sessionToken = crypto.randomUUID()
    const deviceLabel = getDeviceLabel()
    sessionStorage.setItem('deviceSessionToken', sessionToken)
    await fetch('/api/session-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start_session', userId, sessionToken, deviceLabel })
    })

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name')
        .eq('id', userId)
        .single()

      if (profile?.company_name) {
        const { data: brandRow } = await supabase
          .from('brands')
          .select('*')
          .eq('company_name', profile.company_name)
          .maybeSingle()

        if (brandRow) {
          sessionStorage.setItem('cachedBrand', JSON.stringify(brandRow))
          sessionStorage.setItem('cachedBrandTime', Date.now().toString())
        }
      }
    } catch (e) { /* BrandContext resolves normally on dashboard load if this fails */ }

    window.scrollTo(0, 0)
    sessionStorage.setItem('freshLogin', '1')
    window.location.href = '/dashboard'
  }

  async function handleSignIn() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }

    const userId = data.user?.id
    if (!userId) { setLoading(false); return }

    const checkRes = await fetch('/api/session-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check_existing', userId })
    })
    const checkData = await checkRes.json()

    if (checkData.hasActiveSession) {
      setPendingLoginUserId(userId)
      setExistingSessionDevice(checkData.device || 'another device')
      setShowSessionWarning(true)
      setLoading(false)
      return
    }

    await completeLogin(userId)
  }

  async function handleForgotPassword() {
    if (!email) { setMessage('Enter your email address first'); return }
    await fetch('/api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    setMessage('If an account exists, a password reset email has been sent.\n\nPlease check your junk/spam folder if you do not see it in your inbox.')
  }

  const input = { width: '100%', padding: '11px 14px', borderRadius: 9, border: `1px solid ${BORDER}`, fontFamily: 'inherit', fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box' as const }

  return (
    <main style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ width: '100%', maxWidth: 400, padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/brands/oakley-jane-logo.png" alt="Oakley Jane" style={{ height: 56, width: 'auto', margin: '0 auto' }} />
        </div>

        <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}`, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4, marginBottom: 6, color: TEXT }}>Welcome back</h2>
          <p style={{ fontSize: 14, color: MUTED, marginBottom: 24 }}>Sign in to your Oakley Jane account.</p>

          {error && <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 16 }}>{error}</div>}
          {message && <div style={{ background: '#E8EAF0', border: '1px solid #C5C9D6', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: NAVY, marginBottom: 16, whiteSpace: 'pre-line' as const }}>{message}</div>}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 7, color: TEXT }}>Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@oakleyjane.co.uk" style={input} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 7, color: TEXT }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={input} onKeyDown={e => { if (e.key === 'Enter') handleSignIn() }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 22 }}>
            <button onClick={handleForgotPassword} style={{ fontSize: 13, color: NAVY, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: 0 }}>Forgot password?</button>
          </div>
          <button onClick={handleSignIn} disabled={loading} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: loading ? HINT : NAVY, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: loading ? 'default' : 'pointer' }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: HINT, marginTop: 24 }}>Need access? Contact your account administrator for an invite.</p>
      </div>

      {showSessionWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(21,32,69,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px', color: TEXT }}>Active session detected</h3>
            <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, marginBottom: 24 }}>You're already signed in on <strong style={{ color: TEXT }}>{existingSessionDevice}</strong>. Each account can only be active on one device at a time. Do you want to log that device out and continue here?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowSessionWarning(false); setPendingLoginUserId(''); setLoading(false) }} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={async () => { setShowSessionWarning(false); setLoading(true); await completeLogin(pendingLoginUserId) }} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: NAVY, color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Log out other device</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
