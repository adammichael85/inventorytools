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

export default function Home() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const [stats, setStats] = useState<any>(null)
  useEffect(() => {
    fetch('/api/landing-stats').then(r => r.json()).then(d => { if (!d.error) setStats(d) }).catch(() => {})
  }, [])

  function fmtDuration(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.round((totalSeconds % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    const s = Math.round(totalSeconds % 60)
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  function Stars({ rating }: { rating: number }) {
    const rounded = Math.round(rating)
    return (
      <span style={{ display: 'inline-flex', gap: 1 }}>
        {[1,2,3,4,5].map(i => (
          <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill={i <= rounded ? '#FD6A02' : '#E3E7E9'}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01z" />
          </svg>
        ))}
      </span>
    )
  }

  const BG = '#F3F5F6', SURFACE = '#FFFFFF', BORDER = '#E3E7E9', INK = '#11151A', ACCENT = '#FD6A02', ACCENT_SOFT = '#FFF1E6', MUTED = '#6B7780'

  return (
    <main style={{ fontFamily: "'General Sans', sans-serif", background: BG, color: INK, minHeight: '100vh' }}>
      <link href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700,800&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes riseIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .rise-1 { animation: riseIn 0.7s cubic-bezier(0.16,1,0.3,1) both; }
        .rise-2 { animation: riseIn 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
        .rise-3 { animation: riseIn 0.7s cubic-bezier(0.16,1,0.3,1) 0.18s both; }
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${BORDER}`, padding: '0 5vw', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo-full.png" alt="InventoryTools" style={{ height: 30, width: 'auto' }} />
        </div>
        <Link href="/auth" style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14, fontWeight: 500, color: INK, textDecoration: 'none' }}>Log in</Link>
      </nav>

      {/* HERO */}
      <section style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', padding: isMobile ? '56px 6vw 36px' : '90px 6vw 50px' }}>
        <div className="rise-1">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: ACCENT_SOFT, color: '#C24A00', fontSize: 12, fontWeight: 500, padding: '6px 14px', borderRadius: 20, marginBottom: 24 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, display: 'inline-block' }} /> Built for UK inventory clerks
          </div>
          <h1 style={{ fontSize: isMobile ? 32 : 48, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1.2, marginBottom: 18 }}>Stop typing reports.<br/>Start converting them.</h1>
          <p style={{ fontSize: 16.5, color: MUTED, maxWidth: 480, margin: '0 auto' }}>Pick your starting point — a PDF or a voice recording — and walk away with a finished Word report in minutes.</p>
        </div>
      </section>

      {/* LIVE STATS */}
      {stats && (stats.pdf.total_reports > 0 || stats.audio.total_reports > 0) && (
        <section className="rise-2" style={{ maxWidth: 1000, margin: '0 auto', padding: isMobile ? '0 6vw 50px' : '0 6vw 70px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: isMobile ? 10 : 28, marginBottom: 28 }}>
            {stats.pdf.rating_count > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: MUTED }}>
                <Stars rating={stats.pdf.avg_rating} /> <strong style={{ color: INK }}>{stats.pdf.avg_rating}/5</strong> from {stats.pdf.total_reports} PDF conversions
              </div>
            )}
            {stats.audio.rating_count > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: MUTED }}>
                <Stars rating={stats.audio.avg_rating} /> <strong style={{ color: INK }}>{stats.audio.avg_rating}/5</strong> from {stats.audio.total_reports} Audio conversions
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24 }}>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: ACCENT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>PDF to Word</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {[[stats.pdf.total_reports, 'reports converted'],[stats.pdf.total_rooms, 'rooms converted'],[fmtDuration(stats.pdf.avg_conversion_seconds), 'avg conversion time']].map(([big, small]: any) => (
                  <div key={small}>
                    <p style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, letterSpacing: -0.5, marginBottom: 2 }}>{big}</p>
                    <p style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.3 }}>{small}</p>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24 }}>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: ACCENT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Audio to Word</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {[[stats.audio.total_reports, 'reports converted'],[fmtDuration(stats.audio.total_audio_seconds), 'audio uploaded'],[fmtDuration(stats.audio.total_convert_seconds), 'converted in']].map(([big, small]: any) => (
                  <div key={small}>
                    <p style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, letterSpacing: -0.5, marginBottom: 2 }}>{big}</p>
                    <p style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.3 }}>{small}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TOOL CARDS */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: isMobile ? '0 6vw 70px' : '0 6vw 100px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 22 }}>
        <div className="rise-2">
          <Link href="/pdf-to-word" style={{ display: 'block', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: isMobile ? 28 : 36, textDecoration: 'none', color: INK, height: '100%', transition: 'transform 0.2s, box-shadow 0.2s' }}>
            <div style={{ width: 46, height: 46, borderRadius: 11, background: ACCENT_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C24A00" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
            </div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: ACCENT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Tool 1</p>
            <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, marginBottom: 10 }}>PDF to Word</h2>
            <p style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.65, marginBottom: 22 }}>Already have a PDF inventory report — yours or another agency's? Upload it and get every room, item and condition note rebuilt into a clean Word document.</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13.5 }}><strong>£4.00</strong> flat rate</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, background: ACCENT, color: '#fff', fontSize: 13.5, fontWeight: 700 }}>Convert →</span>
            </div>
          </Link>
        </div>
        <div className="rise-3">
          <Link href="/audio-to-word" style={{ display: 'block', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: isMobile ? 28 : 36, textDecoration: 'none', color: INK, height: '100%', transition: 'transform 0.2s, box-shadow 0.2s' }}>
            <div style={{ width: 46, height: 46, borderRadius: 11, background: ACCENT_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C24A00" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
            </div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: ACCENT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Tool 2</p>
            <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, marginBottom: 10 }}>Audio to Word</h2>
            <p style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.65, marginBottom: 22 }}>No PDF yet? Talk through the property room by room and our AI transcribes, corrects and structures it into the same professional Word report.</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13.5 }}><strong>from £4.88</strong></span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, background: ACCENT, color: '#fff', fontSize: 13.5, fontWeight: 700 }}>Convert →</span>
            </div>
          </Link>
        </div>
      </section>

      {/* FOOTER BAR */}
      <div style={{ borderTop: `1px solid ${BORDER}`, padding: '20px 6vw', textAlign: 'center', fontSize: 13, color: MUTED }}>
        <strong style={{ color: INK }}>PDF from £4.00</strong> · <strong style={{ color: INK }}>Audio from £4.88</strong> · Credits never expire
      </div>
    </main>
  )
}
