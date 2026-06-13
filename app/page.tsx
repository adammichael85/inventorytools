'use client'
import Link from 'next/link'
import { useState } from 'react'

export default function Home() {
  const [hovered, setHovered] = useState<'pdf' | 'audio' | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  useState(() => { 
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  })
  const leftFlex = hovered === 'pdf' ? 1.3 : hovered === 'audio' ? 0.7 : 1
  const rightFlex = hovered === 'audio' ? 1.3 : hovered === 'pdf' ? 0.7 : 1

  return (
    <main style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: isMobile ? 'auto' : 'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <nav style={{ height: 64, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E2EAE7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 5vw', flexShrink: 0, position: 'relative', zIndex: 10 }}>
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
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1A2820' }}>inventory<span style={{ color: '#FD6A02' }}>tools</span>.co.uk</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/auth" style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #E2EAE7', fontSize: 14, fontWeight: 500, color: '#1A2820', textDecoration: 'none' }}>Log in</Link>
        </div>
      </nav>
      <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: isMobile ? 'visible' : 'hidden' }}>
        <Link href="/pdf-to-word"  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 28 : 40, background: '#F7F9F8', textDecoration: 'none', transition: 'flex 0.4s cubic-bezier(0.4,0,0.2,1)', overflow: 'hidden' }}>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: '#94AEA6', marginBottom: 20 }}>Tool 1</p>
          <div style={{ width: 80, height: 80, background: '#fff', border: '1px solid #E2EAE7', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, transition: 'transform 0.3s', transform: 'scale(1)' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#FD6A02" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
          </div>
          <div style={{ textAlign: 'center', maxWidth: 340 }}>
            <h2 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 700, color: '#1A2820', marginBottom: 12, letterSpacing: -0.5 }}>PDF to Word</h2>
            <p style={{ fontSize: 15, color: '#5A7068', lineHeight: 1.7, marginBottom: 24 }}>Upload any inventory PDF and get a perfectly formatted Word document in 1–4 minutes depending on file size. Every room, every item, verbatim.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
              {['Any PDF format', '1–4 mins depending on file size', 'Verbatim extraction', 'Tenant disputes included'].map(t => (
                <span key={t} style={{ fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 20, background: '#fff0e6', color: '#c24a00' }}>{t}</span>
              ))}
            </div>
            <p style={{ fontSize: 13, color: '#5A7068', marginBottom: 24 }}><strong style={{ color: '#1A2820' }}>£3.50</strong> flat rate · any size property</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 10, background: '#FD6A02', color: '#fff', fontSize: 15, fontWeight: 600, transition: 'transform 0.2s', transform: 'translateY(0)' }}> →</div>
          </div>
        </Link>
        <div style={{ width: isMobile ? '100%' : 1, height: isMobile ? 1 : 'auto', background: '#E2EAE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
          <div style={{ background: '#fff', border: '1px solid #E2EAE7', borderRadius: 20, padding: '8px 14px', fontSize: 12, fontWeight: 600, color: '#94AEA6' }}>or</div>
        </div>
        <div  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 28 : 40, background: '#FD6A02', transition: 'flex 0.4s cubic-bezier(0.4,0,0.2,1)', overflow: 'hidden' }}>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.6)', marginBottom: 20 }}>Tool 2</p>
          <div style={{ width: 80, height: 80, background: 'rgba(255,255,255,0.2)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, transition: 'transform 0.3s', transform: 'scale(1)' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
          </div>
          <div style={{ textAlign: 'center', maxWidth: 340 }}>
            <h2 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 700, color: '#fff', marginBottom: 12, letterSpacing: -0.5 }}>Audio to Word</h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, marginBottom: 24 }}>Upload a voice recording of a clerk dictating an inventory. Our AI transcribes and structures it into a professional Word document automatically.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
              {['MP3, WAV, M4A', 'AI transcription', 'Room-by-room structure', 'Dictation error correction'].map(t => (
                <span key={t} style={{ fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.2)', color: '#fff' }}>{t}</span>
              ))}
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 24 }}><strong style={{ color: '#fff' }}>£3.50</strong> flat rate · any length recording</p>
            <div style={{ display: 'inline-flex', padding: '13px 28px', borderRadius: 10, background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: 15, fontWeight: 600 }}>Coming soon</div>
          </div>
        </div>
      </div>
      <div style={{ height: 40, background: 'rgba(247,249,248,0.95)', borderTop: '1px solid #E2EAE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#94AEA6', flexShrink: 0 }}>
        <strong style={{ color: '#1A2820', marginRight: 4 }}>£3.50</strong> per conversion · Any tool · Credits never expire 
      </div>
    </main>
  )
}
