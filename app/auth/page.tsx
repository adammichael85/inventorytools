'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import HCaptcha from '@hcaptcha/react-hcaptcha'

const HCAPTCHA_SITEKEY = 'a316dd3a-5010-4d00-89ea-4506c7eed068'

const css = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
.aw *{box-sizing:border-box;margin:0;padding:0}
.aw{min-height:100vh;font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;position:relative;overflow:hidden;background:#F8F6F2;transition:background .3s ease}
.aw.dark{background:#14110C}
.aw-backdrop{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none}
.aw-blob{position:absolute;border-radius:50%;filter:blur(110px)}
.aw-blob.b1{width:780px;height:780px;background:var(--p,#fd6a02);top:-280px;left:-220px;opacity:.35}
.aw-blob.b2{width:640px;height:640px;background:var(--p,#fd6a02);top:8%;right:-220px;opacity:.18}
.aw-blob.b3{width:620px;height:620px;background:#9aa3b5;bottom:-280px;left:18%;opacity:.16}
.aw.dark .aw-blob.b3{opacity:.28}
.aw-blob.b4{width:460px;height:460px;background:#e4e6ea;bottom:-80px;right:10%;opacity:.4}
.aw.dark .aw-blob.b4{background:#221d16;opacity:.4}
.aw-toggle-wrap{position:fixed;top:22px;right:26px;z-index:20}
.aw-toggle{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.82);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.7);border-radius:20px;padding:4px;cursor:pointer;box-shadow:0 12px 32px rgba(30,20,10,.08)}
.aw.dark .aw-toggle{background:rgba(34,29,22,.85);border-color:rgba(255,255,255,.09)}
.aw-toggle-pill{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;color:#8a8577;transition:all .2s ease}
.aw-toggle-pill.on{background:var(--p,#fd6a02);color:#fff}
.aw-two{display:grid;grid-template-columns:1fr 1fr;min-height:100vh;position:relative;z-index:1}
.aw-hero{display:flex;flex-direction:column;justify-content:space-between;padding:56px 48px;position:relative}
.aw-hero-logo{display:flex;align-items:center;gap:10px;margin-bottom:52px;text-decoration:none}
.aw-hero h1{font-family:'Space Grotesk';font-size:clamp(1.8rem,2.8vw,2.5rem);font-weight:700;color:#1a1a1a;line-height:1.15;letter-spacing:-.02em;margin-bottom:16px}
.aw.dark .aw-hero h1{color:#f3f0ea}
.aw-hero p{font-size:.97rem;color:#4a4a4a;line-height:1.65;margin-bottom:36px;max-width:380px}
.aw.dark .aw-hero p{color:#c2bbaf}
.aw-stats{display:flex;flex-direction:column;gap:12px}
.aw-stat{background:rgba(255,255,255,.55);backdrop-filter:blur(20px) saturate(140%);-webkit-backdrop-filter:blur(20px) saturate(140%);border:1px solid rgba(255,255,255,.7);border-radius:16px;padding:16px 20px;box-shadow:0 12px 32px rgba(30,20,10,.07);transition:transform .15s ease}
.aw.dark .aw-stat{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.09)}
.aw-stat:hover{transform:translateY(-2px)}
.aw-stat .n{font-family:'Space Grotesk';font-size:1.4rem;font-weight:700;color:#1a1a1a}
.aw.dark .aw-stat .n{color:#f3f0ea}
.aw-stat .l{font-size:.8rem;color:#4a4a4a;margin-top:3px}
.aw.dark .aw-stat .l{color:#c2bbaf}
.aw-right{display:flex;align-items:center;justify-content:center;padding:48px 40px;position:relative;z-index:1}
.aw-card{background:rgba(255,255,255,.85);backdrop-filter:blur(30px) saturate(160%);-webkit-backdrop-filter:blur(30px) saturate(160%);border:1px solid rgba(255,255,255,.75);border-radius:22px;padding:38px;width:100%;max-width:420px;box-shadow:0 30px 70px rgba(30,20,10,.18)}
.aw.dark .aw-card{background:rgba(34,29,22,.9);border-color:rgba(255,255,255,.09)}
.aw-logo-center{text-align:center;margin-bottom:24px}.aw-logo-center img{height:36px;width:auto}
.aw-tabs{display:flex;background:rgba(140,130,110,.1);border-radius:12px;padding:4px;gap:4px;margin-bottom:26px}
.aw-tab{flex:1;border:none;background:transparent;font-family:'Inter';font-weight:600;font-size:.9rem;padding:9px;border-radius:9px;cursor:pointer;color:#8a8577;transition:all .2s}
.aw-tab.on{background:rgba(255,255,255,.85);backdrop-filter:blur(20px);color:#1a1a1a;box-shadow:0 4px 14px rgba(30,20,10,.1)}
.aw.dark .aw-tab.on{background:rgba(50,44,34,.9);color:#f3f0ea}
.aw *{font-family:'Inter',sans-serif}.aw h1,.aw h2,.aw h3{font-family:'Space Grotesk',sans-serif}.aw-overlay *{font-family:'Inter',sans-serif}.aw-overlay h1,.aw-overlay h2,.aw-overlay h3{font-family:'Space Grotesk',sans-serif}
.aw-field{margin-bottom:14px}
.aw-field label{display:block;font-size:.83rem;font-weight:600;color:#1a1a1a;margin-bottom:5px}
.aw.dark .aw-field label{color:#f3f0ea}
.aw-field input,.aw-field select{width:100%;border:1.5px solid rgba(140,130,110,.25);border-radius:10px;padding:10px 13px;font-family:'Inter';font-size:.93rem;color:#1a1a1a;background:rgba(255,255,255,.6);outline:none;transition:border-color .15s}
.aw.dark .aw-field input,.aw.dark .aw-field select{background:rgba(255,255,255,.05);color:#f3f0ea;border-color:rgba(255,255,255,.1)}
.aw-field input:focus,.aw-field select:focus{border-color:var(--p,#fd6a02)}
.aw-field select{appearance:none;cursor:pointer}
.aw-captcha-wrap{overflow:hidden;border-radius:12px;display:flex;justify-content:center;margin-bottom:14px}
.aw-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.aw-btn{width:100%;border:none;border-radius:12px;padding:13px;font-family:'Inter';font-weight:700;font-size:.97rem;cursor:pointer;margin-top:8px;transition:all .15s}
.aw-btn-p{background:var(--p,#fd6a02);color:#fff;box-shadow:0 14px 30px -10px var(--p,#fd6a02)}
.aw-btn-p:hover:not(:disabled){filter:brightness(.92);transform:translateY(-1px)}
.aw-btn-p:disabled{opacity:.55;cursor:not-allowed;transform:none}
.aw-err{background:#fbeaea;border:1px solid #fca5a5;border-radius:10px;padding:11px 14px;font-size:.85rem;color:#b91c1c;margin-bottom:14px}
.aw-ok{background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:11px 14px;font-size:.85rem;color:#15803d;margin-bottom:14px}
.aw-info{background:#fff1e6;border:1px solid #fed7aa;border-radius:10px;padding:11px 14px;font-size:.85rem;color:#9a3412;margin-bottom:14px}
.aw-link{text-align:center;font-size:.83rem;color:#8a8577;margin-top:16px}
.aw-link a,.aw-link button{color:var(--p,#fd6a02);font-weight:600;background:none;border:none;cursor:pointer;font-size:.83rem;font-family:'Inter'}
.aw-centered{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;position:relative;z-index:1}
.aw-overlay{position:fixed;inset:0;background:rgba(26,26,26,.4);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px}
.aw-warn{background:rgba(255,255,255,.9);backdrop-filter:blur(30px) saturate(160%);-webkit-backdrop-filter:blur(30px) saturate(160%);border:1px solid rgba(255,255,255,.75);border-radius:22px;padding:36px;max-width:440px;width:100%;box-shadow:0 30px 70px rgba(30,20,10,.22)}
.aw.dark .aw-warn{background:rgba(34,29,22,.92);border-color:rgba(255,255,255,.09)}
.aw-warn h3{font-family:'Space Grotesk';font-size:1.25rem;font-weight:700;color:#1a1a1a;margin-bottom:10px}
.aw.dark .aw-warn h3{color:#f3f0ea}
.aw-warn p{font-size:.9rem;color:#4a4a4a;line-height:1.6;margin-bottom:22px}
.aw.dark .aw-warn p{color:#c2bbaf}
.aw-warn-btns{display:flex;flex-direction:column;gap:8px}
.aw-warn-btn{width:100%;border:none;border-radius:12px;padding:13px;font-family:'Inter';font-weight:700;font-size:.93rem;cursor:pointer;transition:all .15s}
.aw-warn-btn:hover{filter:brightness(.95);transform:translateY(-1px)}
.aw-warn-btn-secondary{background:rgba(140,130,110,.12)!important;color:#1a1a1a!important}
.aw.dark .aw-warn-btn-secondary{background:rgba(255,255,255,.08)!important;color:#f3f0ea!important}
.aw-foot{font-size:.78rem;color:#8a8577;position:relative;z-index:1;margin-top:32px}
@media(max-width:820px){.aw-two{grid-template-columns:1fr}.aw-hero{display:none}.aw-right{padding:32px 20px;min-height:100vh}}
`

export default function Auth() {
  const [tab, setTab] = useState<'signin'|'signup'>('signin')
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
  const [revealed, setRevealed] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [cooldownLeft, setCooldownLeft] = useState(0)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [forgotCaptchaToken, setForgotCaptchaToken] = useState<string | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const captchaRef = useRef<HCaptcha>(null)
  const forgotCaptchaRef = useRef<HCaptcha>(null)

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownUntil === 0) return
    const interval = setInterval(() => {
      const left = Math.ceil((cooldownUntil - Date.now()) / 1000)
      if (left <= 0) { setCooldownLeft(0); setCooldownUntil(0); setLoginAttempts(0) }
      else setCooldownLeft(left)
    }, 500)
    return () => clearInterval(interval)
  }, [cooldownUntil])

  type Brand = { display_name: string; logo_url: string | null; primary_color: string; primary_color_light: string | null; primary_color_dark: string | null }
  const DEFAULT_BRAND: Brand = { display_name: 'InventoryTools', logo_url: null, primary_color: '#FD6A02', primary_color_light: '#fff0e6', primary_color_dark: '#c24a00' }
  const [brand, setBrand] = useState<Brand>(DEFAULT_BRAND)
  const [brandReady, setBrandReady] = useState(true)
  const router = useRouter()
  const isDefault = brand.display_name === DEFAULT_BRAND.display_name
  const P = brand.primary_color

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 800)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    setStats({ pdf: { total_reports: 3800, total_rooms: 41500, avg_rating: 4.9, rating_count: 120 }, audio: { total_reports: 820, avg_rating: 4.8, rating_count: 95 } })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.search.includes('reason=inactivity')) setInactiveMsg(true)
    const params = new URLSearchParams(window.location.search)
    const invite = params.get('invite')
    if (!invite) return
    setInviteToken(invite); setTab('signup'); setCheckingInvite(true); setBrandReady(false)
    fetch('/api/validate-invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: invite }) })
      .then(r => r.json()).then(data => {
        setCheckingInvite(false)
        if (data.error) {
          setInviteError(data.error)
          if (data.company_name) {
            supabase.from('brands').select('display_name,logo_url,primary_color,primary_color_light,primary_color_dark').eq('company_name', data.company_name).maybeSingle()
              .then(({ data: b }) => {
                if (b) setBrand({ display_name: b.display_name||DEFAULT_BRAND.display_name, logo_url: b.logo_url||null, primary_color: b.primary_color||DEFAULT_BRAND.primary_color, primary_color_light: b.primary_color_light||null, primary_color_dark: b.primary_color_dark||null })
                setBrandReady(true)
              })
          } else setBrandReady(true)
        } else {
          setEmail(data.email||''); setInviteCompanyName(data.company_name||''); setCompany(data.company_name||''); setAddress(data.company_address||''); setPhone(data.company_phone||'')
          supabase.from('brands').select('display_name,logo_url,primary_color,primary_color_light,primary_color_dark').eq('company_name', data.company_name).maybeSingle()
            .then(({ data: b }) => {
              if (b) setBrand({ display_name: b.display_name||DEFAULT_BRAND.display_name, logo_url: b.logo_url||null, primary_color: b.primary_color||DEFAULT_BRAND.primary_color, primary_color_light: b.primary_color_light||null, primary_color_dark: b.primary_color_dark||null })
              setBrandReady(true)
            })
        }
      })
  }, [])

  function getDevice() {
    if (typeof navigator === 'undefined') return 'Unknown device'
    const ua = navigator.userAgent
    const b = ua.includes('Edg/')? 'Edge' : ua.includes('Chrome/')&&!ua.includes('Chromium')? 'Chrome' : ua.includes('Safari/')&&!ua.includes('Chrome')? 'Safari' : ua.includes('Firefox/')? 'Firefox' : 'Browser'
    const o = ua.includes('iPhone')? 'iPhone' : ua.includes('iPad')? 'iPad' : ua.includes('Android')? 'Android' : ua.includes('Mac OS')? 'Mac' : ua.includes('Windows')? 'Windows' : 'Device'
    return `${b} on ${o}`
  }

  async function completeLogin(userId: string) {
    const sessionToken = crypto.randomUUID()
    sessionStorage.setItem('deviceSessionToken', sessionToken)
    await fetch('/api/session-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start_session', userId, sessionToken, deviceLabel: getDevice() }) })
    try {
      const { data: profile } = await supabase.from('profiles').select('company_name').eq('id', userId).single()
      if (profile?.company_name) {
        const { data: brandRow } = await supabase.from('brands').select('*').eq('company_name', profile.company_name).maybeSingle()
        if (brandRow) { sessionStorage.setItem('cachedBrand', JSON.stringify(brandRow)); sessionStorage.setItem('cachedBrandTime', Date.now().toString()) }
      }
    } catch {}
    sessionStorage.setItem('freshLogin', '1')
    window.location.href = '/dashboard'
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setForgotLoading(true)
    const redirectUrl = `${window.location.origin}/auth/reset`
    await supabase.auth.resetPasswordForEmail(forgotEmail, { captchaToken: forgotCaptchaToken || undefined, redirectTo: redirectUrl })
    forgotCaptchaRef.current?.resetCaptcha()
    setForgotCaptchaToken(null)
    setForgotSent(true)
    setForgotLoading(false)
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault(); setError(''); setMessage('')
    // Check cooldown
    if (cooldownUntil > Date.now()) {
      setError(`Too many failed attempts. Please wait ${cooldownLeft} seconds before trying again.`)
      return
    }
    setLoading(true)
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken: captchaToken || undefined } })
    captchaRef.current?.resetCaptcha()
    setCaptchaToken(null)
    if (err) {
      // Normalize error messages — never reveal whether the email exists
      const newAttempts = loginAttempts + 1
      setLoginAttempts(newAttempts)
      if (newAttempts >= 5) {
        const until = Date.now() + 30000
        setCooldownUntil(until)
        setCooldownLeft(30)
        setError('Too many failed attempts. Please wait 30 seconds before trying again.')
      } else {
        setError('Incorrect email or password.')
      }
      setLoading(false); return
    }
    // Reset attempts on success
    setLoginAttempts(0); setCooldownUntil(0)
    const userId = data.user?.id
    if (!userId) { setLoading(false); return }
    const check = await fetch('/api/session-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check_existing', userId }) })
    const checkData = await check.json()
    if (checkData.hasActiveSession) { setPendingLoginUserId(userId); setExistingSessionDevice(checkData.device||'another device'); setShowSessionWarning(true); setLoading(false); return }
    await completeLogin(userId)
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault(); setError(''); setMessage(''); setLoading(true)
    try {
      const limitCheck = await fetch('/api/check-signup-limit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const limitData = await limitCheck.json()
      if (!limitData.allowed) {
        setError('Too many signup attempts. Please try again later.')
        setLoading(false)
        return
      }
    } catch (e) { /* fail open if the check itself errors */ }
    const { data, error: err } = await supabase.auth.signUp({ email, password, options: { data: { full_name: firstName+' '+lastName, company_name: company }, captchaToken: captchaToken || undefined } })
    captchaRef.current?.resetCaptcha()
    setCaptchaToken(null)
    if (err) { setError(err.message); setLoading(false); return }
    if (data.user) {
      await fetch('/api/create-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: data.user.id, full_name: firstName+' '+lastName, company_name: company, company_type: companyType, company_position: position, company_address: address, company_phone: phone, invite_token: inviteToken||undefined }) })
    }
    setMessage('Check your email to confirm your account! Please check your spam folder too.')
    setLoading(false)
  }

  const cardStyle = { '--p': P } as React.CSSProperties

  const Form = (
    <div className="aw-card" style={cardStyle}>
      {brand.logo_url && <div className="aw-logo-center"><img src={brand.logo_url} alt={brand.display_name} /></div>}
      {!isDefault && tab === 'signin' && (<><h2 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'1.35rem',color:'#1a1a1a',textAlign:'center',marginBottom:6}}>Welcome back</h2><p style={{fontSize:'.88rem',color:'#8a8a8a',textAlign:'center',marginBottom:22}}>Sign in to your {brand.display_name} account</p></>)}
      {!isDefault && tab === 'signup' && (<><h2 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'1.35rem',color:'#1a1a1a',textAlign:'center',marginBottom:6}}>Create your account</h2><p style={{fontSize:'.88rem',color:'#8a8a8a',textAlign:'center',marginBottom:22}}>Join your team on {brand.display_name}</p></>)}
      {inactiveMsg && <div className="aw-info">⏱ Signed out due to inactivity. Please sign in again.</div>}
      {inviteError && <div className="aw-err">{inviteError}</div>}
      {!inviteToken && (
        <div className="aw-tabs">
          <button className={`aw-tab${tab==='signin'?' on':''}`} onClick={()=>{setTab('signin');setError('');setMessage('')}} type="button">Sign in</button>
          <button className={`aw-tab${tab==='signup'?' on':''}`} onClick={()=>{setTab('signup');setError('');setMessage('')}} type="button">Create account</button>
        </div>
      )}
      {error && <div className="aw-err">{error}</div>}
      {message && <div className="aw-ok">{message}</div>}
      {checkingInvite ? (
        <p style={{textAlign:'center',color:'#8a8a8a',padding:'20px 0',fontSize:'.9rem'}}>Validating invite link…</p>
      ) : tab === 'signin' ? (
        <form onSubmit={handleSignIn}>
          <div className="aw-field"><label>Email address</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required /></div>
          <div className="aw-field"><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required /></div>
          <div style={{textAlign:'right',marginBottom:6}}><button type="button" onClick={()=>{setShowForgot(true);setForgotEmail(email);setForgotSent(false)}} style={{fontSize:'.8rem',color:P,fontWeight:600,background:'none',border:'none',cursor:'pointer',padding:0}}>Forgot password?</button></div>
          <div className="aw-captcha-wrap"><HCaptcha ref={captchaRef} sitekey={HCAPTCHA_SITEKEY} onVerify={setCaptchaToken} onExpire={()=>setCaptchaToken(null)} /></div>
          <button className="aw-btn aw-btn-p" type="submit" disabled={loading||cooldownUntil>Date.now()||!captchaToken}>{loading?'Signing in…':cooldownUntil>Date.now()?`Wait ${cooldownLeft}s…`:'Sign in'}</button>
          {isDefault && <p className="aw-link">No account? <button type="button" onClick={()=>{setTab('signup');setError('');setMessage('')}}>Sign up</button></p>}
          {!isDefault && <p className="aw-link" style={{marginTop:14}}>Need access? Contact your account administrator for an invite.</p>}
        </form>
      ) : (
        <form onSubmit={handleSignUp}>
          {inviteToken && !inviteError && <p style={{fontSize:'.88rem',color:'#4a4a4a',marginBottom:18,lineHeight:1.5}}>You&apos;ve been invited to join <strong>{inviteCompanyName}</strong>. Set your name and password to finish setting up your account.</p>}
          <div className="aw-row">
            <div className="aw-field"><label>First name *</label><input type="text" value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="Adam" required /></div>
            <div className="aw-field"><label>Last name *</label><input type="text" value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="Smith" required /></div>
          </div>
          <div className="aw-field"><label>Email address *</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required disabled={!!inviteToken} style={inviteToken?{background:'#f6f5f3',color:'#8a8a8a'}:{}} /></div>
          <div className="aw-field"><label>Password *</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Choose a strong password" required /></div>
          {!inviteToken && (<><div className="aw-field"><label>Company name *</label><input type="text" value={company} onChange={e=>setCompany(e.target.value)} placeholder="ABC Inventories Ltd" required /></div>
          <div className="aw-field"><label>Company type</label><select value={companyType} onChange={e=>setCompanyType(e.target.value)}><option value="">Select type…</option><option value="inventory_company">Inventory company</option><option value="letting_agent">Letting agent</option><option value="property_manager">Property manager</option><option value="other">Other</option></select></div></>)}
          <div className="aw-field"><label>Your position *</label><input type="text" value={position} onChange={e=>setPosition(e.target.value)} placeholder="e.g. Inventory Clerk" required /></div>
          <div className="aw-field"><label>Company address</label><input type="text" value={address} onChange={e=>setAddress(e.target.value)} placeholder="Optional" /></div>
          <div className="aw-field"><label>Phone number</label><input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Optional" /></div>
          <div className="aw-captcha-wrap"><HCaptcha ref={captchaRef} sitekey={HCAPTCHA_SITEKEY} onVerify={setCaptchaToken} onExpire={()=>setCaptchaToken(null)} /></div>
          <button className="aw-btn aw-btn-p" type="submit" disabled={loading||!!inviteError||checkingInvite||!captchaToken}>{loading?'Creating account…':inviteToken?'Join team':'Create account'}</button>
          {!inviteToken && <p className="aw-link">Already have an account? <button type="button" onClick={()=>{setTab('signin');setError('');setMessage('')}}>Sign in</button></p>}
        </form>
      )}
    </div>
  )

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className={`aw${darkMode?' dark':''}`} style={{ filter:revealed?'none':'grayscale(.9) blur(6px)', transition:'filter 0.4s ease', '--p':P } as React.CSSProperties}>
        <div className="aw-backdrop">
          <div className="aw-blob b1" />
          <div className="aw-blob b2" />
          <div className="aw-blob b3" />
          <div className="aw-blob b4" />
        </div>
        <div className="aw-toggle-wrap">
          <div className="aw-toggle" onClick={()=>setDarkMode(d=>!d)}>
            <div className={`aw-toggle-pill${!darkMode?' on':''}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/></svg>
            </div>
            <div className={`aw-toggle-pill${darkMode?' on':''}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            </div>
          </div>
        </div>
        {isDefault ? (
          <div className="aw-two">
            <div className="aw-hero">
              <div>
                <a className="aw-hero-logo" href="/"><img src="/logo-full.png" alt="InventoryTools" style={{height:31,width:'auto'}} /></a>
                <h1>You did the inspection.<br/>Don&apos;t type it twice.</h1>
                <p>Convert PDF reports and dictated inspection audio into clean, editable Word inventory documents — in minutes.</p>
                {stats && (
                  <div className="aw-stats">
                    <div className="aw-stat"><div className="n">4,620+ reports</div><div className="l">converted — PDF and Audio to Word</div></div>
                    <div className="aw-stat"><div className="n">41,500+ rooms</div><div className="l">extracted and structured</div></div>
                    <div className="aw-stat"><div className="n">★ 4.9/5</div><div className="l">average rating from converted reports</div></div>
                  </div>
                )}
              </div>
              <div className="aw-foot" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>PDF conversion from £4.00</span>
                <span>Audio conversion from £4.88</span>
                <span>Credits never expire</span>
              </div>
            </div>
            <div className="aw-right">{Form}</div>
          </div>
        ) : (
          <div className="aw-centered">{Form}</div>
        )}
        {showForgot && (
          <div className="aw-overlay">
            <div className="aw-warn" style={{'--p':P} as React.CSSProperties}>
              {forgotSent ? (
                <>
                  <h3>Check your email</h3>
                  <p>We've sent a password reset link to <strong>{forgotEmail}</strong>. Check your inbox and spam folder.</p>
                  <div className="aw-warn-btns" style={{marginTop:20}}>
                    <button className="aw-warn-btn" style={{background:P,color:'#fff'}} onClick={()=>setShowForgot(false)}>Done</button>
                  </div>
                </>
              ) : (
                <>
                  <h3>Reset your password</h3>
                  <p>Enter your email address and we'll send you a reset link.</p>
                  <form onSubmit={handleForgot} style={{marginTop:16}}>
                    <div className="aw-field"><label>Email address</label><input type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} placeholder="you@example.com" required autoFocus /></div>
                    <div className="aw-captcha-wrap" style={{margin:"14px 0"}}><HCaptcha ref={forgotCaptchaRef} sitekey={HCAPTCHA_SITEKEY} onVerify={setForgotCaptchaToken} onExpire={()=>setForgotCaptchaToken(null)} /></div>
                    <div className="aw-warn-btns" style={{marginTop:16}}>
                      <button type="submit" className="aw-warn-btn" style={{background:P,color:'#fff'}} disabled={forgotLoading||!forgotCaptchaToken}>{forgotLoading?'Sending…':'Send reset link'}</button>
                      <button type="button" className="aw-warn-btn aw-warn-btn-secondary" onClick={()=>setShowForgot(false)}>Cancel</button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
        {showSessionWarning && (
          <div className="aw-overlay">
            <div className="aw-warn" style={{ '--p':P } as React.CSSProperties}>
              <h3>Already signed in elsewhere</h3>
              <p>Your account is active on <strong>{existingSessionDevice}</strong>. Continuing here will sign out that session.</p>
              <div className="aw-warn-btns">
                <button className="aw-warn-btn" style={{background:P,color:'#fff'}} onClick={async()=>{setShowSessionWarning(false);setLoading(true);await completeLogin(pendingLoginUserId)}}>Continue — sign in here</button>
                <button className="aw-warn-btn aw-warn-btn-secondary" onClick={()=>{setShowSessionWarning(false);setPendingLoginUserId('');setLoading(false)}}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        {!brandReady && <div style={{position:'fixed',inset:0,background:'rgba(246,245,243,.97)',backdropFilter:'blur(12px)',zIndex:99999}} />}
      </div>
    </>
  )
}
