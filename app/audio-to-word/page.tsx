'use client'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'

function Reveal({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setShown(true); obs.disconnect() }
    }, { threshold: 0.15 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return <div ref={ref} style={{ opacity: shown ? 1 : 0, transform: shown ? 'translateY(0)' : 'translateY(28px)', transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s` }}>{children}</div>
}

export default function AudioToWord() {
  const [isMobile, setIsMobile] = useState(false)
  const [heroShown, setHeroShown] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    const t = setTimeout(() => setHeroShown(true), 60)
    return () => { window.removeEventListener('resize', check); clearTimeout(t) }
  }, [])

  const BG = '#F3F5F6', SURFACE = '#FFFFFF', BORDER = '#E3E7E9', INK = '#11151A', INK_SOFT = '#1B2228', ACCENT = '#FD6A02', ACCENT_SOFT = '#FFF1E6', MUTED = '#6B7780'

  return (
    <main style={{ fontFamily: "'General Sans', sans-serif", background: BG, color: INK }}>
      <link href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700,800&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        .pricing-card:hover { transform: translateY(-3px); }
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(243,245,246,0.9)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${BORDER}`, padding: '0 5vw', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/logo-full.png" alt="InventoryTools" style={{ height: 30, width: 'auto' }} />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
          <a href="#how" style={{ fontSize: 14, color: MUTED, textDecoration: 'none', display: isMobile ? 'none' : 'block' }}>How it works</a>
          <a href="#features" style={{ fontSize: 14, color: MUTED, textDecoration: 'none', display: isMobile ? 'none' : 'block' }}>Features</a>
          <a href="#pricing" style={{ fontSize: 14, color: MUTED, textDecoration: 'none', display: isMobile ? 'none' : 'block' }}>Pricing</a>
          <Link href="/auth" style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14, fontWeight: 500, color: INK, textDecoration: 'none' }}>Log in</Link>
          <Link href="/auth" style={{ padding: '9px 18px', borderRadius: 8, background: ACCENT, fontSize: 14, fontWeight: 600, color: '#fff', textDecoration: 'none' }}>Sign up</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: isMobile ? '52px 6vw 30px' : '88px 6vw 60px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 36 : 50, alignItems: 'center' }}>
        <div style={{ opacity: heroShown ? 1 : 0, transform: heroShown ? 'translateY(0)' : 'translateY(20px)', transition: 'opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)' }}>
          <h1 style={{ fontSize: isMobile ? 34 : 50, fontWeight: 800, lineHeight: 1.08, marginBottom: 20, letterSpacing: -1.2, color: INK }}>Stop typing reports.<br/>Start talking them through.</h1>
          <p style={{ fontSize: 16.5, color: MUTED, lineHeight: 1.7, marginBottom: 32, maxWidth: 440 }}>No PDF yet? Just record yourself walking the property, room by room, on your phone. Our AI transcribes the recording, corrects the dictation, and structures it into the same professional Word report — no typist involved.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 30 }}>
            <input placeholder="Your business email" disabled style={{ flex: isMobile ? '1 1 100%' : '0 1 240px', padding: '13px 16px', borderRadius: 9, border: `1px solid ${BORDER}`, background: SURFACE, fontSize: 14, fontFamily: 'inherit', color: MUTED }} />
            <Link href="/auth" style={{ padding: '13px 24px', borderRadius: 9, background: ACCENT, color: '#fff', fontSize: 14.5, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>Get started →</Link>
          </div>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: MUTED, letterSpacing: 0.3 }}>from £4.88 · priced by property size · ready in minutes</p>
        </div>

        <div style={{ position: 'relative', height: isMobile ? 340 : 400, opacity: heroShown ? 1 : 0, transform: heroShown ? 'translateY(0)' : 'translateY(20px)', transition: 'opacity 0.8s cubic-bezier(0.16,1,0.3,1) 0.15s, transform 0.8s cubic-bezier(0.16,1,0.3,1) 0.15s' }}>
          <div style={{ position: 'absolute', top: 0, left: isMobile ? '5%' : '8%', width: isMobile ? '88%' : 360, background: SURFACE, borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: '0 20px 50px rgba(17,21,26,0.10)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 700, margin: 0 }}>12 High Street</p>
                <p style={{ fontSize: 11, color: MUTED, margin: '2px 0 0' }}>3 bedrooms · unfurnished</p>
              </div>
              <div style={{ fontSize: 18 }}>🎙️</div>
            </div>
            <div style={{ padding: 18 }}>
              {['Kitchen.mp3 · 5.2MB','Living Room.mp3 · 2.5MB','Bedroom 1.mp3 · 1.0MB','Bathroom.mp3 · 1.7MB'].map((r) => (
                <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0' }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: ACCENT_SOFT, border: `1.5px solid ${ACCENT}`, flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, color: '#3A3F45' }}>{r}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: 'absolute', top: isMobile ? 200 : 230, right: isMobile ? '2%' : '0%', width: isMobile ? '78%' : 280, background: INK, color: '#fff', borderRadius: 14, boxShadow: '0 24px 56px rgba(17,21,26,0.32)', padding: 20 }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Conversion complete</p>
            <p style={{ fontSize: 26, fontWeight: 800, marginBottom: 2 }}>9 rooms</p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: ACCENT, marginBottom: 16 }}>3m 1s · fully transcribed</p>
            <div style={{ width: '100%', padding: 11, borderRadius: 8, background: ACCENT, color: '#11151A', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>↓ Download .docx</div>
          </div>
        </div>
      </section>

      {/* FEATURE TRIO */}
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '20px 6vw 70px' }}>
        <Reveal>
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: isMobile ? 28 : 44, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '0.9fr 1.1fr', gap: 36, alignItems: 'center' }}>
            <div>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: ACCENT, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>Built for the job</p>
              <h2 style={{ fontSize: isMobile ? 24 : 30, fontWeight: 800, letterSpacing: -0.5, marginBottom: 10 }}>Made for inventory clerks, not generic transcription</h2>
              <p style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.7 }}>Our AI understands inventory language — abbreviations, condition terms, room order — not just words on a recording.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: isMobile ? 20 : 16 }}>
              {[['🎙️','Record on any device','Phone, tablet or voice recorder — MP3, WAV, M4A and more.'],['🧠','Dictation correction','Mumbled words, abbreviations and room names, all corrected.'],['📋','Room-by-room structure','Items, descriptions and conditions, sorted into the right columns.']].map(([icon,title,desc]) => (
                <div key={title}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: ACCENT_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, marginBottom: 12 }}>{icon}</div>
                  <h3 style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 5 }}>{title}</h3>
                  <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      {/* WHY IT WORKS — stats row */}
      <div id="features" style={{ maxWidth: 1180, margin: '0 auto', padding: '0 6vw 70px' }}>
        <Reveal>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: ACCENT, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, textAlign: 'center' }}>Why clerks switch</p>
          <h2 style={{ fontSize: isMobile ? 26 : 34, fontWeight: 800, letterSpacing: -0.6, textAlign: 'center', marginBottom: 40 }}>Audio to Word saves you money on every report</h2>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
          <Reveal delay={0.05}>
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 36, height: '100%' }}>
              <p style={{ fontSize: 48, fontWeight: 800, color: ACCENT, letterSpacing: -1.5, lineHeight: 1, marginBottom: 8 }}>60%</p>
              <p style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 6 }}>cheaper, up to</p>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65 }}>Compared to sending the same recording to a manual audio typist.</p>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 28 }}>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 }}>How it compares — 3-bed unfurnished</p>
              {[['External typist','£12–£25','#D9534F'],['In-house typing time','~£18','#D9534F'],['InventoryTools','£12.19',ACCENT]].map(([title,price,color]) => (
                <div key={title} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: title !== 'InventoryTools' ? `1px solid ${BORDER}` : 'none' }}>
                  <span style={{ fontSize: 14, fontWeight: title === 'InventoryTools' ? 700 : 500, color: title === 'InventoryTools' ? ACCENT : INK }}>{title}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 17, fontWeight: 700, color }}>{price}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>

      {/* DARK STEPS */}
      <div id="how" style={{ background: INK, padding: isMobile ? '60px 6vw' : '90px 6vw', color: '#fff' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <Reveal>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: ACCENT, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>How it works</p>
            <h2 style={{ fontSize: isMobile ? 26 : 36, fontWeight: 800, letterSpacing: -0.6, marginBottom: 50, maxWidth: 600 }}>Three steps. No typing, no formatting, no chasing anyone.</h2>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 28 }}>
            {[['1','Upload the recording','Drag and drop any audio file — MP3, WAV, M4A or similar. Record during the inspection, upload when you\u2019re back.'],
              ['2','AI transcribes & structures','Every room, item, description and condition is transcribed, corrected and structured automatically.'],
              ['3','Download the Word doc','A perfectly formatted three-column document, ready to send to your agent or landlord.']
            ].map(([n,title,desc],i) => (
              <Reveal key={n} delay={i * 0.1}>
                <div style={{ background: INK_SOFT, borderRadius: 16, padding: 28, position: 'relative', overflow: 'hidden', height: '100%' }}>
                  <span style={{ position: 'absolute', top: -10, right: 4, fontSize: 90, fontWeight: 800, color: 'rgba(255,255,255,0.05)', lineHeight: 1 }}>{n}</span>
                  <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, position: 'relative' }}>{title}</h3>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, position: 'relative' }}>{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* PRICING */}
      <div id="pricing" style={{ maxWidth: 1180, margin: '0 auto', padding: isMobile ? '60px 6vw' : '90px 6vw' }}>
        <Reveal>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: ACCENT, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12, textAlign: 'center' }}>Pricing</p>
          <h2 style={{ fontSize: isMobile ? 26 : 36, fontWeight: 800, letterSpacing: -0.6, textAlign: 'center', marginBottom: 12 }}>Priced by property size. Always cheaper than a typist.</h2>
          <p style={{ fontSize: 15, color: MUTED, textAlign: 'center', marginBottom: 44 }}>A 3-bed unfurnished costs £12.19 — up to 60% cheaper than a manual typist.</p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="pricing-card" style={{ background: ACCENT, borderRadius: 22, padding: isMobile ? 32 : 48, color: '#fff', textAlign: 'center', boxShadow: '0 24px 56px rgba(253,106,2,0.28)', transition: 'transform 0.25s', maxWidth: 460, margin: '0 auto' }}>
            <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, opacity: 0.75, marginBottom: 14 }}>Starting from</p>
            <p style={{ fontSize: 64, fontWeight: 800, lineHeight: 1, letterSpacing: -2, marginBottom: 6 }}>£4.88</p>
            <p style={{ fontSize: 14, opacity: 0.85, marginBottom: 26 }}>room only · unfurnished</p>
            {['Priced by property size, from £4.88','Pay as you go, no monthly fee','Unlimited staff logins','Credits never expire'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 11, textAlign: 'left' }}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="3,8 6,11 13,5" /></svg>
                <span style={{ fontSize: 13.5 }}>{f}</span>
              </div>
            ))}
            <Link href="/auth" style={{ display: 'block', marginTop: 24, padding: 13, borderRadius: 10, background: '#fff', color: ACCENT, fontSize: 14.5, fontWeight: 700, textDecoration: 'none' }}>Log in to get started</Link>
          </div>
        </Reveal>
      </div>

      {/* CTA */}
      <div style={{ background: INK, padding: isMobile ? '60px 6vw' : '80px 6vw', textAlign: 'center', color: '#fff' }}>
        <Reveal>
          <h2 style={{ fontSize: isMobile ? 26 : 38, fontWeight: 800, letterSpacing: -0.6, marginBottom: 14 }}>Your next report, done in minutes.</h2>
          <p style={{ fontSize: 15.5, color: 'rgba(255,255,255,0.6)', marginBottom: 30 }}>From £4.88. Up to 60% cheaper than a typist.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth" style={{ padding: '13px 28px', borderRadius: 10, background: ACCENT, color: '#fff', fontSize: 14.5, fontWeight: 700, textDecoration: 'none' }}>Get started →</Link>
            <a href="#how" style={{ padding: '13px 28px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 14.5, fontWeight: 600, textDecoration: 'none' }}>See how it works</a>
          </div>
        </Reveal>
      </div>

      {/* FOOTER */}
      <footer style={{ padding: '36px 6vw', background: BG }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: INK }}>inventory<span style={{ color: ACCENT }}>tools</span>.co.uk</span>
          <div style={{ display: 'flex', gap: 24 }}>
            <a href="#" style={{ fontSize: 13, color: MUTED, textDecoration: 'none' }}>Privacy</a>
            <a href="#" style={{ fontSize: 13, color: MUTED, textDecoration: 'none' }}>Terms</a>
            <a href="#" style={{ fontSize: 13, color: MUTED, textDecoration: 'none' }}>Contact</a>
          </div>
          <span style={{ fontSize: 13, color: MUTED }}>© 2026 InventoryTools Ltd</span>
        </div>
      </footer>
    </main>
  )
}
