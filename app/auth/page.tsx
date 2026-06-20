'use client'
import React from 'react'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Auth() {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [company, setCompany] = useState('')
  const [companyType, setCompanyType] = useState('')
  const [position, setPosition] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [inactiveMsg, setInactiveMsg] = useState(false)
  const [inviteToken, setInviteToken] = useState('')
  const [inviteCompanyName, setInviteCompanyName] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [checkingInvite, setCheckingInvite] = useState(false)
  const [showSessionWarning, setShowSessionWarning] = useState(false)
  const [existingSessionDevice, setExistingSessionDevice] = useState('')
  const [pendingLoginUserId, setPendingLoginUserId] = useState('')

  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('reason=inactivity')) {
      setInactiveMsg(true)
    }
    const params = new URLSearchParams(window.location.search)
    const invite = params.get('invite')
    if (invite) {
      setInviteToken(invite)
      setTab('signup')
      setCheckingInvite(true)
      fetch('/api/validate-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: invite })
      }).then(r => r.json()).then(data => {
        setCheckingInvite(false)
        if (data.error) {
          setInviteError(data.error)
        } else {
          setEmail(data.email)
          setInviteCompanyName(data.company_name)
          setCompany(data.company_name)
          setAddress(data.company_address || '')
          setPhone(data.company_phone || '')
        }
      })
    }
  }, [])
  const router = useRouter()

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

    // Resolve and cache the brand BEFORE redirecting, so the dashboard never shows default colours
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
    } catch (e) { /* if this fails, BrandContext will resolve it normally on dashboard load */ }

    window.scrollTo(0,0)
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

    // Check for an existing active session on another device
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

  async function handleSignUp() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: firstName + ' ' + lastName } }
    })
    if (error) { setError(error.message); setLoading(false); return }
    if (data.user) {
      const profileRes = await fetch('/api/create-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: data.user.id,
          full_name: firstName + ' ' + lastName,
          company_name: company,
          company_type: companyType,
          company_position: position,
          company_address: address,
          company_phone: phone,
          invite_token: inviteToken || undefined,
        })
      })
      const profileData = await profileRes.json()
      console.log('Profile save result:', profileData)
    }
    setMessage('Check your email to confirm your account!\n\nPlease check your junk/spam folder if you do not see it in your inbox.')
    setLoading(false)
  }

  const T = '#FD6A02'
  const TL = '#fff0e6'
  const TD = '#c24a00'
  const B = '#E2EAE7'
  const BG = '#F7F9F8'
  const TX = '#1A2820'
  const M = '#5A7068'
  const H = '#94AEA6'

  const input = { width: '100%', padding: '11px 14px', borderRadius: 9, border: `1px solid ${B}`, fontFamily: 'inherit', fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box' as const }

  return (
    <main style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`@media(max-width:768px){:root{--auth-cols:1fr}.auth-left{display:none!important}}`}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <nav style={{ background: 'rgba(247,249,248,0.92)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${B}`, padding: '0 5vw', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, background: T, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="34" height="34" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="120" height="120" rx="26" fill="#FD6A02"/>
            <rect x="8" y="10" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
            <rect x="8" y="36" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
            <rect x="8" y="62" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
            <rect x="8" y="88" width="24" height="20" rx="5" fill="white" opacity="0.12"/>
            <rect x="38" y="10" width="74" height="20" rx="5" fill="white" opacity="0.12"/>
            <rect x="38" y="36" width="56" height="20" rx="5" fill="white" opacity="0.12"/>
            <rect x="38" y="62" width="64" height="20" rx="5" fill="white" opacity="0.12"/>
            <rect x="38" y="88" width="44" height="20" rx="5" fill="white" opacity="0.08"/>
            <path d="M30 62 L50 84 L90 40" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: TX }}>inventory<span style={{ color: T }}>tools</span>.co.uk</span>
        </Link>
        <div style={{ fontSize: 13, color: M }}>
          {tab === 'signup' ? <>Already have an account? <button onClick={() => setTab('signin')} style={{ color: T, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Sign in</button></> : <>No account? <button onClick={() => setTab('signup')} style={{ color: T, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Sign up</button></>}
        </div>
      </nav>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'var(--auth-cols, 1fr 1fr)' }}>
        <div style={{ background: T, padding: 60, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, color: '#fff', lineHeight: 1.2, letterSpacing: -0.5, marginBottom: 16 }}>Two tools. One login. Reports done in minutes.</h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginBottom: 40 }}>PDF to Word: upload any inventory PDF and get a perfectly formatted Word document in 1–4 minutes. Audio to Word: upload a voice recording and get a structured Word doc automatically. Both tools. One login.</p>
            {[['⏱', '1–4 minutes', 'vs. 45–90 mins with a typist'], ['💷', 'PDF from £4.00 · Audio from £4.88', 'Priced by property size. No monthly fees.'], ['✓', 'Up to 51.25% cheaper than a typist', 'Audio to Word saves you money on every report']].map(([icon, title, sub]) => (
              <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{title}</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 5vw', background: BG, overflowY: 'auto' }}>
          <div style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', background: '#fff', border: `1px solid ${B}`, borderRadius: 12, padding: 4, marginBottom: 28 }}>
              {(['signin', 'signup'] as const).map(t => (
                <button key={t} onClick={() => { setTab(t); setError(''); setMessage('') }} style={{ flex: 1, padding: 9, borderRadius: 9, border: 'none', background: tab === t ? T : 'transparent', color: tab === t ? '#fff' : M, fontFamily: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}>
                  {t === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>

            {inactiveMsg && <div style={{ background: '#FFF8E1', border: '1px solid #FFD54F', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#7B5E00', marginBottom: 16 }}>⏱ You have been logged out due to inactivity. Please sign in again.</div>}
            {error && <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 16 }}>{error}</div>}
            {message && <div style={{ background: TL, border: '1px solid #A7F3D0', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: TD, marginBottom: 16 }}>{message}</div>}

            {tab === 'signin' && (
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4, marginBottom: 6 }}>Welcome back</h2>
                <p style={{ fontSize: 14, color: M, marginBottom: 24 }}>Sign in to your InventoryTools account.</p>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 7 }}>Email address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" style={input} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 7 }}>Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={input} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 22 }}>
                  <button onClick={async () => {
                    if (!email) { setMessage('Enter your email address first'); return }
                    if (!email) { setMessage('Enter your email address first'); return }
                    const res = await fetch('/api/forgot-password', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email })
                    })
                    setMessage('If an account exists, a password reset email has been sent.\n\nPlease check your junk/spam folder if you do not see it in your inbox.')

                  }} style={{ fontSize: 13, color: T, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: 0 }}>Forgot password?</button>
                </div>
                <button onClick={handleSignIn} disabled={loading} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: loading ? H : T, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: loading ? 'default' : 'pointer', marginBottom: 16 }}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
                <p style={{ textAlign: 'center', fontSize: 13, color: M }}>No account? <button onClick={() => setTab('signup')} style={{ color: T, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Create one →</button></p>
              </div>
            )}

            {tab === 'signup' && (
              <div>
                {checkingInvite ? (
                  <p style={{ fontSize: 14, color: M }}>Checking invite link...</p>
                ) : inviteError ? (
                  <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                    <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{inviteError}</p>
                  </div>
                ) : inviteToken ? (
                  <>
                    <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4, marginBottom: 6 }}>Join {inviteCompanyName}</h2>
                    <p style={{ fontSize: 14, color: M, marginBottom: 24 }}>You've been invited to join {inviteCompanyName} on InventoryTools. Set a password to finish creating your account.</p>
                  </>
                ) : (
                  <>
                    <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4, marginBottom: 6 }}>Create your account</h2>
                    <p style={{ fontSize: 14, color: M, marginBottom: 24 }}>Set up your InventoryTools account.</p>
                  </>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 7 }}>First name</label>
                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" style={input} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 7 }}>Last name</label>
                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" style={input} />
                  </div>
                </div>
                {[
                  ['Work email', 'email', email, (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value), 'jane@company.com', !!inviteToken],
                  ['Password', 'password', password, (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value), '••••••••', false],
                  ['Company name', 'text', company, (e: React.ChangeEvent<HTMLInputElement>) => setCompany(e.target.value), 'ABC Inventories Ltd', !!inviteToken],
                ].map(([label, type, value, onChange, placeholder, disabled]) => (
                  <div key={label as string} style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 7 }}>{label as string}</label>
                    <input type={type as string} value={value as string} disabled={disabled as boolean} onChange={onChange as React.ChangeEventHandler<HTMLInputElement>} placeholder={placeholder as string} style={disabled ? {...input, background: BG, color: M} : input} />
                  </div>
                ))}
                {!inviteToken && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 7 }}>Company type</label>
                    <select value={companyType} onChange={e => setCompanyType(e.target.value)} style={{ ...input, appearance: 'none' as const }}>
                      <option value="">Select company type...</option>
                      <option value="inventory_company">Inventory Company</option>
                      <option value="typing_company">Typing Company</option>
                      <option value="estate_agent">Estate Agent</option>
                    </select>
                  </div>
                )}
                {[
                  ['Your position', 'text', position, (e: React.ChangeEvent<HTMLInputElement>) => setPosition(e.target.value), 'Inventory Clerk', false],
                  ['Company address', 'text', address, (e: React.ChangeEvent<HTMLInputElement>) => setAddress(e.target.value), '123 High Street, London', !!inviteToken],
                  ['Company phone', 'tel', phone, (e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value), '01234 567890', !!inviteToken],
                ].map(([label, type, value, onChange, placeholder, disabled]) => (
                  <div key={label as string} style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 7 }}>{label as string}</label>
                    <input type={type as string} value={value as string} disabled={disabled as boolean} onChange={onChange as React.ChangeEventHandler<HTMLInputElement>} placeholder={placeholder as string} style={disabled ? {...input, background: BG, color: M} : input} />
                  </div>
                ))}
                <button onClick={handleSignUp} disabled={loading || !!inviteError || checkingInvite} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: loading ? H : T, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: loading ? 'default' : 'pointer', marginBottom: 12, marginTop: 4 }}>
                  {loading ? 'Creating account...' : inviteToken ? 'Join team' : 'Create account'}
                </button>
                <p style={{ fontSize: 12, color: H, lineHeight: 1.6, textAlign: 'center' }}>By creating an account you agree to our <a href="#" style={{ color: M }}>Terms</a> and <a href="#" style={{ color: M }}>Privacy Policy</a>.</p>
                <p style={{ textAlign: 'center', fontSize: 13, color: M, marginTop: 12 }}>Already have an account? <button onClick={() => setTab('signin')} style={{ color: T, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Sign in →</button></p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showSessionWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,40,32,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px' }}>Active session detected</h3>
            <p style={{ fontSize: 14, color: M, lineHeight: 1.6, marginBottom: 24 }}>You're already signed in on <strong style={{ color: TX }}>{existingSessionDevice}</strong>. Each account can only be active on one device at a time. Do you want to log that device out and continue here?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowSessionWarning(false); setPendingLoginUserId(''); setLoading(false) }} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${B}`, background: 'transparent', color: M, fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={async () => { setShowSessionWarning(false); setLoading(true); await completeLogin(pendingLoginUserId) }} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: T, color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Log out other device</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
