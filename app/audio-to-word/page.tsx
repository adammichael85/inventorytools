'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function AudioToWord() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return (
    <main style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F7F9F8', color: '#1A2820' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(247,249,248,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E2EAE7', padding: '0 5vw', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <svg width="34" height="34" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" rx="26" fill="#FD6A02"/><rect x="8" y="10" width="24" height="20" rx="5" fill="white" opacity="0.18"/><rect x="8" y="36" width="24" height="20" rx="5" fill="white" opacity="0.18"/><rect x="8" y="62" width="24" height="20" rx="5" fill="white" opacity="0.18"/><rect x="8" y="88" width="24" height="20" rx="5" fill="white" opacity="0.12"/><rect x="38" y="10" width="74" height="20" rx="5" fill="white" opacity="0.12"/><rect x="38" y="36" width="56" height="20" rx="5" fill="white" opacity="0.12"/><rect x="38" y="62" width="64" height="20" rx="5" fill="white" opacity="0.12"/><rect x="38" y="88" width="44" height="20" rx="5" fill="white" opacity="0.08"/><path d="M30 62 L50 84 L90 40" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1A2820' }}>inventory<span style={{ color: '#FD6A02' }}>tools</span>.co.uk</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 28 }}>
          <a href="#how" style={{ fontSize: 14, color: '#5A7068', textDecoration: 'none', display: isMobile ? 'none' : 'block' }}>How it works</a>
          <a href="#features" style={{ fontSize: 14, color: '#5A7068', textDecoration: 'none', display: isMobile ? 'none' : 'block' }}>Features</a>
          <a href="#pricing" style={{ fontSize: 14, color: '#5A7068', textDecoration: 'none', display: isMobile ? 'none' : 'block' }}>Pricing</a>
          <Link href="/auth" style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #E2EAE7', fontSize: 14, fontWeight: 500, color: '#1A2820', textDecoration: 'none' }}>Log in</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '40px 5vw' : '80px 5vw 60px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 32 : 60, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#fff0e6', color: '#c24a00', fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 20, marginBottom: 22 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FD6A02', display: 'inline-block' }} /> AI-powered · Built for inventory clerks
          </div>
          <h1 style={{ fontSize: isMobile ? 32 : 48, fontWeight: 700, lineHeight: 1.15, marginBottom: 20, letterSpacing: -1 }}>Stop dictating. Start <span style={{ color: '#FD6A02' }}>converting.</span></h1>
          <p style={{ fontSize: 17, color: '#5A7068', lineHeight: 1.7, marginBottom: 36, maxWidth: 460 }}>Upload a voice recording of an inventory inspection and get a perfectly formatted Word document in minutes. What used to take hours of typing now starts from £5.50 — up to 45% cheaper than a manual typist.</p>
          <Link href="/auth" style={{ display: 'inline-block', padding: '13px 28px', borderRadius: 10, background: '#FD6A02', color: '#fff', fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>Log in to convert</Link>
        </div>
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2EAE7', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', maxWidth: 420 }}>
          {/* Modal header */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2EAE7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>🎙️ Convert Audio to Word</p>
              <p style={{ fontSize: 12, color: '#94AEA6', margin: 0 }}>£13.75 · £65.25 remaining</p>
            </div>
            <div style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #E2EAE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#94AEA6' }}>×</div>
          </div>
          <div style={{ padding: '12px 16px' }}>
            {/* Property size + furnished */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div style={{ padding: '9px 12px', border: '1px solid #E2EAE7', borderRadius: 8, fontSize: 13, color: '#1A2820', background: '#fff' }}>3 bedrooms</div>
              <div style={{ padding: '9px 12px', border: '1px solid #E2EAE7', borderRadius: 8, fontSize: 13, color: '#1A2820', background: '#fff' }}>Unfurnished</div>
            </div>
            {/* Price box */}
            <div style={{ background: '#DBEAFE', border: '1px solid #2563EB', borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 2px' }}>Conversion price</p>
                <p style={{ fontSize: 11, color: '#2563EB', margin: 0 }}>Based on selected property size</p>
              </div>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#2563EB', margin: 0 }}>£13.75</p>
            </div>
            {/* Room order */}
            <div style={{ border: '1px solid #E2EAE7', borderRadius: 8, padding: '8px 10px', marginBottom: 10, fontSize: 12, color: '#1A2820', background: '#F7F9F8', lineHeight: 1.8 }}>
              {['Outside Front','Entrance Hall','Living Room','Kitchen','Stairs','Landing','Bedroom 1','Bedroom 2','Bathroom'].map(r => <div key={r}>{r}</div>)}
            </div>
            {/* File list */}
            {[['Bathroom.mp3','1.7 MB'],['Bedroom 1.mp3','1.0 MB'],['Bedroom 2.mp3','0.7 MB'],['Entrance hall.mp3','1.2 MB'],['Kitchen.mp3','5.2 MB'],['Living room.mp3','2.5 MB']].map(([name, size]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', border: '1px solid #DBEAFE', borderRadius: 8, marginBottom: 6, background: '#fff' }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, margin: 0 }}>{name}</p>
                  <p style={{ fontSize: 11, color: '#94AEA6', margin: 0 }}>{size}</p>
                </div>
              </div>
            ))}
            {/* Complete state */}
            <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 8, padding: '10px 14px', textAlign: 'center', marginTop: 10, marginBottom: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#166534', margin: 0 }}>✅ Conversion complete! 3m 1s</p>
            </div>
            <button style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: '#2563EB', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}>↓ Download 12 High Street.docx</button>
            <button style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #E2EAE7', background: 'transparent', color: '#94AEA6', fontFamily: 'inherit', fontSize: 12, cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <div id="how" style={{ background: '#fff', borderTop: '1px solid #E2EAE7', borderBottom: '1px solid #E2EAE7' }}>
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 5vw' }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: '#FD6A02', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>How it works</p>
          <h2 style={{ fontSize: isMobile ? 26 : 36, fontWeight: 700, marginBottom: 14, letterSpacing: -0.5 }}>Three steps. Done.</h2>
          <p style={{ fontSize: 16, color: '#5A7068', maxWidth: 520, lineHeight: 1.7 }}>No typing needed. No formatting. No copy-pasting. Upload a recording, get a Word doc.</p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 24, marginTop: 40 }}>
            {[['1','Upload the recording','Drag and drop any audio file — MP3, WAV, M4A or similar. Record on your phone during the inspection and upload when you\'re back.'],
              ['2','AI transcribes & structures','Every room, item, description and condition is transcribed, corrected and structured into a professional format automatically.'],
              ['3','Download the Word doc','A perfectly formatted three-column Word document downloads automatically. Ready to send to your agent or landlord.']
            ].map(([n,title,desc]) => (
              <div key={n} style={{ background: '#F7F9F8', border: '1px solid #E2EAE7', borderRadius: 14, padding: 28 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fff0e6', color: '#c24a00', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>{n}</div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 14, color: '#5A7068', lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* FEATURES */}
      <div id="features" style={{ background: '#F7F9F8', borderBottom: '1px solid #E2EAE7' }}>
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 5vw' }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: '#FD6A02', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Features</p>
          <h2 style={{ fontSize: isMobile ? 26 : 36, fontWeight: 700, marginBottom: 14, letterSpacing: -0.5 }}>Everything your team needs. Nothing they don&apos;t.</h2>
          <p style={{ fontSize: 16, color: '#5A7068', maxWidth: 520, lineHeight: 1.7, marginBottom: 40 }}>No typing. No formatting. No chasing typists. Just upload, wait a few minutes, and download.</p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
            {[['🎙️','Record on any device','Use your phone, tablet or voice recorder during the inspection. Upload the file when you\'re ready — MP3, WAV, M4A and more.'],
              ['💷','From £5.50 · save up to 45% vs a typist','A room-only property starts at £5.50. A 3-bed unfurnished is £13.75. Always cheaper than a manual typist. Pay only when you convert.'],
              ['🧠','AI dictation correction','Our AI understands inventory language — it corrects mumbled words, fills in abbreviations, and structures everything room by room.'],
              ['📋','Room-by-room structure','Every room is identified from your narration and formatted with items, descriptions and conditions in the correct columns.'],
              ['🔒','Staff logins included','Every team member gets their own secure login. No extra cost per seat — add as many staff as you need.'],
              ['📄','Industry-standard Word format','Three-column layout (Item / Description / Condition) matching InventoryBase templates. Ready to import and submit immediately.']
            ].map(([icon,title,desc]) => (
              <div key={title} style={{ background: '#fff', border: '1px solid #E2EAE7', borderRadius: 14, padding: 24 }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: '#fff0e6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, fontSize: 18 }}>{icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{title}</h3>
                <p style={{ fontSize: 13, color: '#5A7068', lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* PRICING */}
      <div id="pricing" style={{ background: '#fff', borderBottom: '1px solid #E2EAE7' }}>
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 5vw' }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: '#FD6A02', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Pricing</p>
          <h2 style={{ fontSize: isMobile ? 26 : 36, fontWeight: 700, marginBottom: 14, letterSpacing: -0.5 }}>Priced by property size. Always cheaper than a typist.</h2>
          <p style={{ fontSize: 16, color: '#5A7068', maxWidth: 520, lineHeight: 1.7, marginBottom: 40 }}>A 3-bed unfurnished costs £13.75. Up to 45% cheaper than sending to a manual typist.</p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24, alignItems: 'start' }}>
            <div style={{ background: '#FD6A02', borderRadius: 20, padding: 40, color: '#fff', textAlign: 'center' }}>
              <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, opacity: 0.75, marginBottom: 16 }}>Starting from</p>
              <p style={{ fontSize: 72, fontWeight: 700, lineHeight: 1, letterSpacing: -2, marginBottom: 4 }}>£5.50</p>
              <p style={{ fontSize: 15, opacity: 0.8, marginBottom: 28 }}>room only · unfurnished</p>
              {['Priced by property size — from £5.50','Pay as you go — no monthly commitment','Unlimited staff logins included','Credits never expire'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, textAlign: 'left' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.5"><polyline points="3,8 6,11 13,5" /></svg>
                  <span style={{ fontSize: 14 }}>{f}</span>
                </div>
              ))}
              <Link href="/auth" style={{ display: 'block', marginTop: 28, padding: 14, borderRadius: 10, background: '#fff', color: '#FD6A02', fontSize: 15, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>Log in to get started</Link>
            </div>
            <div>
              <div style={{ background: '#F7F9F8', border: '1px solid #E2EAE7', borderRadius: 20, padding: 28, marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#94AEA6', marginBottom: 18 }}>How it compares</p>
                {[['External typist','Average market rate per report','£12–£25','#E24B4A'],
                  ['In-house typing time','45–90 mins of staff time per report','~£18','#E24B4A'],
                  ['InventoryTools','3-bed unfurnished · ready in minutes*','£13.75','#FD6A02']
                ].map(([title,sub,price,color]) => (
                  <div key={title} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: title !== 'InventoryTools' ? '1px solid #E2EAE7' : 'none' }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: title === 'InventoryTools' ? 600 : 500, color: title === 'InventoryTools' ? '#FD6A02' : '#1A2820' }}>{title}</p>
                      <p style={{ fontSize: 12, color: '#94AEA6', marginTop: 2 }}>{sub}</p>
                    </div>
                    <p style={{ fontSize: 20, fontWeight: 700, color }}>{price}</p>
                  </div>
                ))}
              </div>
              <div style={{ background: '#fff0e6', borderRadius: 14, padding: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#c24a00', marginBottom: 6 }}>💡 Do the numbers</p>
                <p style={{ fontSize: 13, color: '#c24a00', lineHeight: 1.6 }}>If you process just <strong>20 reports a month</strong>, you&apos;re saving up to <strong>£430</strong> compared to an external typist.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* CTA */}
      <div style={{ background: '#FD6A02', padding: '60px 5vw', textAlign: 'center' }}>
        <h2 style={{ fontSize: isMobile ? 26 : 36, fontWeight: 700, color: '#fff', marginBottom: 14, letterSpacing: -0.5 }}>Your next report done in minutes*</h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', marginBottom: 8 }}>From £5.50. Up to 45% cheaper than a typist.</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 30 }}>*Depending on length of recording</p>
        <Link href="/auth" style={{ display: 'inline-block', padding: '13px 32px', borderRadius: 10, background: '#fff', color: '#FD6A02', fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>Log in to get started</Link>
      </div>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid #E2EAE7', padding: '32px 5vw', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: isMobile ? 16 : 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>inventory<span style={{ color: '#FD6A02' }}>tools</span>.co.uk</span>
          <div style={{ display: 'flex', gap: 24 }}>
            <a href="#" style={{ fontSize: 13, color: '#94AEA6', textDecoration: 'none' }}>Privacy</a>
            <a href="#" style={{ fontSize: 13, color: '#94AEA6', textDecoration: 'none' }}>Terms</a>
            <a href="#" style={{ fontSize: 13, color: '#94AEA6', textDecoration: 'none' }}>Contact</a>
          </div>
          <span style={{ fontSize: 13, color: '#94AEA6' }}>© 2026 InventoryTools Ltd</span>
        </div>
      </footer>
    </main>
  )
}
