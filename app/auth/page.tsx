'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Auth() {
  const [tab, setTab] = useState<'signin' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function handleSignIn() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  async function handleSignUp() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { first_name: firstName, last_name: lastName, company } }
    })
    if (error) { setError(error.message); setLoading(false) }
    else { setMessage('Check your email to confirm your account!'); setLoading(false) }
  }

  return (
    <main style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <nav style={{ background: 'rgba(247,249,248,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E2EAE7', padding: '0 5vw', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, background: '#1D9E75', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h6M7 16h8"/></svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1A2820' }}>inventory<span style={{ color: '#1D9E75' }}>tools</span>.co.uk</span>
        </Link>
        <div style={{ fontSize: 13, color: '#5A7068' }}>
          {tab === 'signup' ? <>Already have an account? <button onClick={() => setTab('signin')} style={{ color: '#1D9E75', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Sign in</button></> : <>No account? <button onClick={() => setTab('signup')} style={{ color: '#1D9E75', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Sign up free</button></>}
        </div>
      </nav>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ background: '#1D9E75', padding: 60, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 20, marginBottom: 32 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} /> AI-powered · Built for inventory clerks
            </div>
            <h2 style={{ fontSize: 36, fontWeight: 700, color: '#fff', lineHeight: 1.2, letterSpacing: -0.5, marginBottom: 16 }}>Your reports. Done in seconds.</h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginBottom: 40 }}>Upload any inventory PDF and get a perfectly formatted Word document in under 60 seconds.*</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[['⏱', 'Under 60 seconds*', 'vs. 45–90 mins with a typist'], ['💷', '£3.50 flat rate', 'Any size property. No monthly fees.'], ['✓', '100% verbatim', 'Every word copied exactly as-is']].map(([icon, title, sub]) => (
                <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{title}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', position: 'relative', zIndex: 1 }}>*Depending on size of property</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 5vw', background: '#F7F9F8' }}>
          <div style={{ width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', background: '#fff', border: '1px solid #E2EAE7', borderRadius: 12, padding: 4, marginBottom: 32 }}>
              {(['signin', 'signup'] as const).map(t => (
                <button key={t} onClick={() => { setTab(t); setError(''); setMessage('') }} style={{ flex: 1, padding: 9, borderRadius: 9, border: 'none', background: tab === t ? '#1D9E75' : 'transparent', color: tab === t ? '#fff' : '#5A7068', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}>
                  {t === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>

            {error && <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 16 }}>{error}</div>}
            {message && <div style={{ background: '#E1F5EE', border: '1px solid #A7F3D0', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#085041', marginBottom: 16 }}>{message}</div>}

            {tab === 'signin' && (
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4, marginBottom: 6 }}>Welcome back</h2>
                <p style={{ fontSize: 14, color: '#5A7068', marginBottom: 28 }}>Sign in to your InventoryTools account.</p>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 7 }}>Email address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" style={{ width: '100%', padding: '11px 14px', borderRadius: 9, border: '1px solid #E2EAE7', fontFamily: 'inherit', fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 7 }}>Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '11px 14px', borderRadius: 9, border: '1px solid #E2EAE7', fontFamily: 'inherit', fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 22 }}>
                  <a href="#" style={{ fontSize: 13, color: '#1D9E75', textDecoration: 'none', fontWeight: 500 }}>Forgot password?</a>
                </div>
                <button onClick={handleSignIn} disabled={loading} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: loading ? '#94AEA6' : '#1D9E75', color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: loading ? 'default' : 'pointer', marginBottom: 16 }}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
                <p style={{ textAlign: 'center', fontSize: 13, color: '#5A7068' }}>No account? <button onClick={() => setTab('signup')} style={{ color: '#1D9E75', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Create one free →</button></p>
              </div>
            )}

            {tab === 'signup' && (
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4, marginBottom: 6 }}>Start for free</h2>
                <p style={{ fontSize: 14, color: '#5A7068', marginBottom: 28 }}>First 5 reports free. No credit card required.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 7 }}>First name</label>
                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" style={{ width: '100%', padding: '11px 14px', borderRadius: 9, border: '1px solid #E2EAE7', fontFamily: 'inherit', fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 7 }}>Last name</label>
                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" style={{ width: '100%', padding: '11px 14px', borderRadius: 9, border: '1px solid #E2EAE7', fontFamily: 'inherit', fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
                  </div>
                </div>
                {[['Work email', 'email', email, (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value), 'you@company.com'],
                  ['Company name', 'text', company, (e: React.ChangeEvent<HTMLInputElement>) => setCompany(e.target.value), 'ABC Inventories Ltd'],
                  ['Password', 'password', password, (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value), '••••••••']
                ].map(([label, type, value, onChange, placeholder]) => (
                  <div key={label as string} style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 7 }}>{label as string}</label>
                    <input type={type as string} value={value as string} onChange={onChange as React.ChangeEventHandler<HTMLInputElement>} placeholder={placeholder as string} style={{ width: '100%', padding: '11px 14px', borderRadius: 9, border: '1px solid #E2EAE7', fontFamily: 'inherit', fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
                  </div>
                ))}
                <button onClick={handleSignUp} disabled={loading} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: loading ? '#94AEA6' : '#1D9E75', color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: loading ? 'default' : 'pointer', marginBottom: 12 }}>
                  {loading ? 'Creating account...' : 'Create account'}
                </button>
                <p style={{ fontSize: 12, color: '#94AEA6', lineHeight: 1.6, textAlign: 'center' }}>By creating an account you agree to our <a href="#" style={{ color: '#5A7068' }}>Terms</a> and <a href="#" style={{ color: '#5A7068' }}>Privacy Policy</a>.</p>
                <p style={{ textAlign: 'center', fontSize: 13, color: '#5A7068', marginTop: 16 }}>Already have an account? <button onClick={() => setTab('signin')} style={{ color: '#1D9E75', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Sign in →</button></p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
