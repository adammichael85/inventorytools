'use client'
import React from 'react'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import HCaptcha from '@hcaptcha/react-hcaptcha'

const HCAPTCHA_SITEKEY = 'a316dd3a-5010-4d00-89ea-4506c7eed068'

const NAVY = '#152045'
const NAVY_DARK = '#0F1733'
const BORDER = '#E2E4EA'
const BG = '#F5F6F8'
const TEXT = '#1A1A1A'
const MUTED = '#5A6072'
const HINT = '#8A8FA0'

const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap');
.ojl{min-height:100vh;font-family:'Plus Jakarta Sans',sans-serif;position:relative;overflow:hidden;background:#F8F6F2;transition:background .3s ease}
.ojl.dark{background:#0F1120}
.ojl-backdrop{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none}
.ojl-blob{position:absolute;border-radius:50%;filter:blur(110px);-webkit-transform:translateZ(0);transform:translateZ(0)}
.ojl-blob.b1{width:720px;height:720px;background:${NAVY};top:-260px;left:-200px;opacity:.16}
.ojl-blob.b2{width:600px;height:600px;background:${NAVY};top:10%;right:-200px;opacity:.09}
.ojl-blob.b3{width:580px;height:580px;background:#9aa3b5;bottom:-260px;left:18%;opacity:.14}
.ojl.dark .ojl-blob.b1{opacity:.22}
.ojl.dark .ojl-blob.b2{opacity:.14}
.ojl.dark .ojl-blob.b3{background:#2a2f45;opacity:.3}
.ojl-toggle-wrap{position:fixed;top:22px;right:24px;z-index:20}
.ojl-toggle{display:flex;gap:3px;background:rgba(255,255,255,.7);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.8);border-radius:100px;padding:4px;cursor:pointer}
.ojl.dark .ojl-toggle{background:rgba(34,38,60,.85);border-color:rgba(255,255,255,.09)}
.ojl-toggle-pill{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:${MUTED};transition:background .15s,color .15s}
.ojl-toggle-pill.on{background:${NAVY};color:#fff}
.ojl-main{position:relative;z-index:1;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.ojl-card{background:rgba(255,255,255,.85);backdrop-filter:blur(24px) saturate(160%);-webkit-backdrop-filter:blur(24px) saturate(160%);border-radius:20px;border:1px solid rgba(255,255,255,.85);padding:32px;box-shadow:0 20px 60px rgba(21,32,69,.12)}
.ojl.dark .ojl-card{background:rgba(28,31,50,.9);border-color:rgba(255,255,255,.1)}
.ojl.dark .ojl-card h2{color:#f0f1f7}
.ojl.dark .ojl-card p{color:#b7bccb}
.ojl-input{width:100%;padding:11px 14px;border-radius:9px;border:1px solid ${BORDER};font-family:inherit;font-size:14px;outline:none;background:#fff;box-sizing:border-box;color:${TEXT}}
.ojl.dark .ojl-input{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.12);color:#f0f1f7}
.ojl.dark .ojl-input::placeholder{color:#7d8296}
.ojl-label{display:block;font-size:13px;font-weight:500;margin-bottom:7px;color:${TEXT}}
.ojl.dark .ojl-label{color:#e2e4ee}
.ojl-modal-card{background:#fff;border-radius:16px;width:100%;max-width:420px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,0.2)}
.ojl.dark .ojl-modal-card{background:#1c1f32;border:1px solid rgba(255,255,255,.1)}
.ojl.dark .ojl-modal-card h3{color:#f0f1f7}
.ojl.dark .ojl-modal-card p{color:#b7bccb}
`

export default function OjLoginClient() {
  const [darkMode, setDarkMode] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showSessionWarning, setShowSessionWarning] = useState(false)
  const [existingSessionDevice, setExistingSessionDevice] = useState('')
  const [pendingLoginUserId, setPendingLoginUserId] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const captchaRef = useRef<HCaptcha>(null)
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotCaptchaToken, setForgotCaptchaToken] = useState<string | null>(null)
  const forgotCaptchaRef = useRef<HCaptcha>(null)
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken: captchaToken || undefined } })
    captchaRef.current?.resetCaptcha()
    setCaptchaToken(null)
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
    if (!forgotEmail) return
    if (!forgotCaptchaToken) return
    setForgotLoading(true)
    await fetch('/api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail, captchaToken: forgotCaptchaToken })
    })
    forgotCaptchaRef.current?.resetCaptcha()
    setForgotCaptchaToken(null)
    setForgotSent(true)
    setForgotLoading(false)
  }

  return (
    <div className={`ojl${darkMode ? ' dark' : ''}`}>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="ojl-backdrop">
        <div className="ojl-blob b1" />
        <div className="ojl-blob b2" />
        <div className="ojl-blob b3" />
      </div>

      <div className="ojl-toggle-wrap">
        <div className="ojl-toggle" onClick={() => setDarkMode(d => !d)}>
          <div className={`ojl-toggle-pill${!darkMode ? ' on' : ''}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/></svg>
          </div>
          <div className={`ojl-toggle-pill${darkMode ? ' on' : ''}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
          </div>
        </div>
      </div>

      <main className="ojl-main">
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <img src="/brands/oakley-jane-logo.png" alt="Oakley Jane" style={{ height: 56, width: 'auto', margin: '0 auto', filter: darkMode ? 'brightness(0) invert(1)' : 'none' }} />
          </div>

          <div className="ojl-card">
            <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4, marginBottom: 6, color: darkMode ? '#f0f1f7' : TEXT }}>Welcome back</h2>
            <p style={{ fontSize: 14, color: darkMode ? '#b7bccb' : MUTED, marginBottom: 24 }}>Sign in to your Oakley Jane account.</p>

            {error && <div style={{ background: darkMode ? 'rgba(220,38,38,.12)' : '#FEE2E2', border: `1px solid ${darkMode ? 'rgba(220,38,38,.35)' : '#FECACA'}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: darkMode ? '#FCA5A5' : '#DC2626', marginBottom: 16 }}>{error}</div>}
            {message && <div style={{ background: darkMode ? 'rgba(255,255,255,.06)' : '#E8EAF0', border: `1px solid ${darkMode ? 'rgba(255,255,255,.12)' : '#C5C9D6'}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: darkMode ? '#e2e4ee' : NAVY, marginBottom: 16, whiteSpace: 'pre-line' as const }}>{message}</div>}

            <div style={{ marginBottom: 16 }}>
              <label className="ojl-label">Email address</label>
              <input className="ojl-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@oakleyjane.co.uk" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="ojl-label">Password</label>
              <input className="ojl-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => { if (e.key === 'Enter') handleSignIn() }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 22 }}>
              <button onClick={() => { setShowForgotModal(true); setForgotEmail(email); setForgotSent(false) }} style={{ fontSize: 13, color: darkMode ? '#8FA0E8' : NAVY, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: 0 }}>Forgot password?</button>
            </div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}><HCaptcha ref={captchaRef} sitekey={HCAPTCHA_SITEKEY} onVerify={setCaptchaToken} onExpire={()=>setCaptchaToken(null)} /></div>
            <button onClick={handleSignIn} disabled={loading || !captchaToken} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: (loading || !captchaToken) ? HINT : NAVY, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: (loading || !captchaToken) ? 'default' : 'pointer' }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: darkMode ? '#8b90a3' : HINT, marginTop: 24 }}>Need access? Contact your account administrator for an invite.</p>
        </div>

        {showForgotModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(21,32,69,0.5)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div className="ojl-modal-card">
              {forgotSent ? (
                <>
                  <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px', color: darkMode ? '#f0f1f7' : TEXT }}>Check your email</h3>
                  <p style={{ fontSize: 14, color: darkMode ? '#b7bccb' : MUTED, lineHeight: 1.6, marginBottom: 24 }}>We've sent a password reset link to <strong style={{ color: darkMode ? '#f0f1f7' : TEXT }}>{forgotEmail}</strong>. Check your inbox and spam folder.</p>
                  <button onClick={() => setShowForgotModal(false)} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: NAVY, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Done</button>
                </>
              ) : (
                <>
                  <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px', color: darkMode ? '#f0f1f7' : TEXT }}>Reset your password</h3>
                  <p style={{ fontSize: 14, color: darkMode ? '#b7bccb' : MUTED, lineHeight: 1.6, marginBottom: 20 }}>Enter your email address and we'll send you a reset link.</p>
                  <div style={{ marginBottom: 16 }}>
                    <label className="ojl-label">Email address</label>
                    <input className="ojl-input" type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="you@example.com" autoFocus />
                  </div>
                  <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}><HCaptcha ref={forgotCaptchaRef} sitekey={HCAPTCHA_SITEKEY} onVerify={setForgotCaptchaToken} onExpire={() => setForgotCaptchaToken(null)} /></div>
                  <button onClick={handleForgotPassword} disabled={forgotLoading || !forgotEmail || !forgotCaptchaToken} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: (forgotLoading || !forgotEmail || !forgotCaptchaToken) ? HINT : NAVY, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: (forgotLoading || !forgotEmail || !forgotCaptchaToken) ? 'default' : 'pointer', marginBottom: 10 }}>{forgotLoading ? 'Sending…' : 'Send reset link'}</button>
                  <button onClick={() => setShowForgotModal(false)} style={{ width: '100%', padding: 13, borderRadius: 10, border: `1px solid ${darkMode ? 'rgba(255,255,255,.15)' : BORDER}`, background: 'transparent', color: darkMode ? '#f0f1f7' : TEXT, fontFamily: 'inherit', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
                </>
              )}
            </div>
          </div>
        )}

        {showSessionWarning && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(21,32,69,0.5)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div className="ojl-modal-card">
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px', color: darkMode ? '#f0f1f7' : TEXT }}>Active session detected</h3>
              <p style={{ fontSize: 14, color: darkMode ? '#b7bccb' : MUTED, lineHeight: 1.6, marginBottom: 24 }}>You're already signed in on <strong style={{ color: darkMode ? '#f0f1f7' : TEXT }}>{existingSessionDevice}</strong>. Each account can only be active on one device at a time. Do you want to log that device out and continue here?</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setShowSessionWarning(false); setPendingLoginUserId(''); setLoading(false) }} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${darkMode ? 'rgba(255,255,255,.15)' : BORDER}`, background: 'transparent', color: darkMode ? '#b7bccb' : MUTED, fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
                <button onClick={async () => { setShowSessionWarning(false); setLoading(true); await completeLogin(pendingLoginUserId) }} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: NAVY, color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Log out other device</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
