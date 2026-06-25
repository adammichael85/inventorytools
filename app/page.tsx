'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function Home() {
  const [hovered, setHovered] = useState<'pdf' | 'audio' | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const leftFlex = hovered === 'pdf' ? 1.3 : hovered === 'audio' ? 0.7 : 1
  const rightFlex = hovered === 'audio' ? 1.3 : hovered === 'pdf' ? 0.7 : 1

  return (
    <main style={{ fontFamily: "'General Sans', sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: isMobile ? 'auto' : 'hidden', background: '#14181A' }}>
      <link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,700,800&f[]=general-sans@400,500,600&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        :root { --ink: #14181A; --paper: #F4EEE3; --paper-line: #DED2B8; --accent: #FD6A02; --accent-deep: #C24A00; }
        @keyframes riseIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        .r1 { animation: riseIn 0.7s cubic-bezier(0.16,1,0.3,1) both; animation-delay: 0.05s; }
        .r2 { animation: riseIn 0.7s cubic-bezier(0.16,1,0.3,1) both; animation-delay: 0.18s; }
        .grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.5; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E"); mix-blend-mode: overlay; }
        .stamp-tag { font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; padding: 4px 9px; border-radius: 20px; border: 1.5px solid currentColor; display: inline-flex; align-items: center; gap: 5px; text-transform: uppercase; }
      `}</style>
      <nav style={{ height: 64, background: 'rgba(20,24,26,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(244,238,227,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 5vw', flexShrink: 0, position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: '#FD6A02', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: '#F4EEE3' }}>inventory<span style={{ color: '#FD6A02' }}>tools</span>.co.uk</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/auth" style={{ padding: '8px 20px', borderRadius: 7, border: '1px solid rgba(244,238,227,0.2)', fontSize: 14, fontWeight: 500, color: '#F4EEE3', textDecoration: 'none' }}>Log in</Link>
        </div>
      </nav>

      <div className="r1" style={{ position: 'relative', textAlign: 'center', padding: isMobile ? '36px 24px 10px' : '46px 24px 14px', flexShrink: 0, overflow: 'hidden' }}>
        <div className="grain" />
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, color: '#FD6A02', marginBottom: 12 }}>Built for UK inventory clerks</p>
        <h1 style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: isMobile ? 28 : 38, fontWeight: 800, color: '#F4EEE3', margin: '0 0 8px', letterSpacing: -0.5, lineHeight: 1.15 }}>Stop typing reports. Start converting them.</h1>
        <p style={{ fontSize: isMobile ? 14 : 15, color: 'rgba(244,238,227,0.6)', maxWidth: 560, margin: '0 auto' }}>Pick your starting point — a PDF or a voice recording — and walk away with a finished Word report in minutes.</p>
      </div>

      <div className="r2" style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: isMobile ? 'visible' : 'hidden' }}>
        <Link href="/pdf-to-word" onMouseEnter={() => setHovered('pdf')} onMouseLeave={() => setHovered(null)} style={{ flex: isMobile ? 1 : leftFlex, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 28 : 40, background: '#F4EEE3', textDecoration: 'none', transition: 'flex 0.4s cubic-bezier(0.4,0,0.2,1)', overflow: 'hidden' }}>
          <span className="stamp-tag" style={{ color: '#C24A00', marginBottom: 20 }}>✓ Verbatim · AI-Read</span>
          <div style={{ width: 80, height: 80, background: '#fff', border: '1.5px solid #DED2B8', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#C24A00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
          </div>
          <div style={{ textAlign: 'center', maxWidth: 360 }}>
            <h2 style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: isMobile ? 24 : 32, fontWeight: 700, color: '#1C1A15', marginBottom: 12, letterSpacing: -0.5 }}>PDF to Word</h2>
            <p style={{ fontSize: 15, color: '#6B6354', lineHeight: 1.7, marginBottom: 24 }}>Already have a PDF inventory report — your own format or another company's? Upload it and our AI rebuilds every room, item, description and condition note into a clean, ready-to-send Word document.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
              {['Any PDF format', 'Ready in minutes', 'Verbatim extraction', 'Tenant disputes included'].map(t => (
                <span key={t} style={{ fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 20, background: '#fff0e6', color: '#C24A00' }}>{t}</span>
              ))}
            </div>
            <p style={{ fontSize: 13, color: '#6B6354', marginBottom: 24 }}><strong style={{ color: '#1C1A15' }}>£4.00</strong> flat rate · any size property</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 9, background: '#FD6A02', color: '#14181A', fontSize: 15, fontWeight: 700, boxShadow: '0 10px 24px rgba(253,106,2,0.3)' }}>Convert a PDF →</div>
          </div>
        </Link>
        <div style={{ width: isMobile ? '100%' : 1, height: isMobile ? 1 : 'auto', background: 'rgba(244,238,227,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
          <div style={{ background: '#14181A', border: '1px solid rgba(244,238,227,0.2)', borderRadius: 20, padding: '8px 14px', fontSize: 12, fontWeight: 600, color: 'rgba(244,238,227,0.5)' }}>or</div>
        </div>
        <Link href="/audio-to-word" onMouseEnter={() => setHovered('audio')} onMouseLeave={() => setHovered(null)} style={{ flex: isMobile ? 1 : rightFlex, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 28 : 40, background: '#FD6A02', position: 'relative', transition: 'flex 0.4s cubic-bezier(0.4,0,0.2,1)', overflow: 'hidden', textDecoration: 'none' }}>
          <div className="grain" />
          <span className="stamp-tag" style={{ color: 'rgba(20,24,26,0.65)', marginBottom: 20, position: 'relative' }}>✓ Transcribed · AI-Heard</span>
          <div style={{ position: 'relative', width: 80, height: 80, background: 'rgba(20,24,26,0.12)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#14181A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
          </div>
          <div style={{ position: 'relative', textAlign: 'center', maxWidth: 360 }}>
            <h2 style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: isMobile ? 24 : 32, fontWeight: 700, color: '#14181A', marginBottom: 12, letterSpacing: -0.5 }}>Audio to Word</h2>
            <p style={{ fontSize: 15, color: 'rgba(20,24,26,0.75)', lineHeight: 1.7, marginBottom: 24 }}>No PDF yet? Just talk through the property as you walk it, room by room, on your phone. Our AI transcribes the recording and structures it into the same professional Word report — no typist anywhere near it.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
              {['MP3, WAV, M4A', 'AI transcription', 'Room-by-room structure', 'Dictation error correction'].map(t => (
                <span key={t} style={{ fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 20, background: 'rgba(20,24,26,0.12)', color: '#14181A' }}>{t}</span>
              ))}
            </div>
            <p style={{ fontSize: 13, color: 'rgba(20,24,26,0.6)', marginBottom: 24 }}><strong style={{ color: '#14181A' }}>from £4.88</strong> · varies by property size</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 9, background: '#14181A', color: '#F4EEE3', fontSize: 15, fontWeight: 700, boxShadow: '0 10px 24px rgba(0,0,0,0.25)' }}>Convert a recording →</div>
          </div>
        </Link>
      </div>
      <div style={{ height: 40, background: 'rgba(20,24,26,0.95)', borderTop: '1px solid rgba(244,238,227,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'rgba(244,238,227,0.5)', flexShrink: 0 }}>
        <strong style={{ color: '#F4EEE3', marginRight: 4 }}>PDF from £4.00</strong> · <strong style={{ color: '#F4EEE3', marginRight: 4 }}>Audio from £4.88</strong> · Credits never expire
      </div>
    </main>
  )
}
