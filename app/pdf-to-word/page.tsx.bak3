'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function PDFToWord() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return (
    <main style={{ fontFamily: "'General Sans', sans-serif", background: '#F4EEE3', color: '#1C1A15' }}>
      <link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,700,800&f[]=general-sans@400,500,600&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        :root {
          --ink: #14181A;
          --ink-soft: #20262A;
          --paper: #F4EEE3;
          --paper-line: #DED2B8;
          --accent: #FD6A02;
          --accent-deep: #C24A00;
        }
        @keyframes riseIn { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cardIn { from { opacity: 0; transform: translateY(30px) rotate(0deg); } to { opacity: 1; transform: translateY(0) rotate(-2.5deg); } }
        @keyframes stampIn { 0% { opacity: 0; transform: scale(1.6) rotate(-18deg); } 70% { opacity: 1; transform: scale(0.92) rotate(-10deg); } 100% { opacity: 1; transform: scale(1) rotate(-10deg); } }
        .r1 { animation: riseIn 0.7s cubic-bezier(0.16,1,0.3,1) both; animation-delay: 0.05s; }
        .r2 { animation: riseIn 0.7s cubic-bezier(0.16,1,0.3,1) both; animation-delay: 0.18s; }
        .r3 { animation: riseIn 0.7s cubic-bezier(0.16,1,0.3,1) both; animation-delay: 0.30s; }
        .r4 { animation: riseIn 0.7s cubic-bezier(0.16,1,0.3,1) both; animation-delay: 0.42s; }
        .r5 { animation: riseIn 0.7s cubic-bezier(0.16,1,0.3,1) both; animation-delay: 0.54s; }
        .card-in { animation: cardIn 0.8s cubic-bezier(0.16,1,0.3,1) both; animation-delay: 0.3s; }
        .stamp-in { animation: stampIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both; animation-delay: 1.05s; }
        .grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.5; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E"); mix-blend-mode: overlay; }
        .dotgrid { position: absolute; inset: 0; pointer-events: none; background-image: radial-gradient(circle, rgba(244,238,227,0.08) 1px, transparent 1px); background-size: 22px 22px; }
        .feature-card:hover { transform: translateY(-3px); box-shadow: 0 14px 30px rgba(20,24,26,0.10); }
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(244,238,227,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--paper-line)', padding: '0 5vw', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <svg width="34" height="34" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" rx="26" fill="#FD6A02"/><rect x="8" y="10" width="24" height="20" rx="5" fill="white" opacity="0.18"/><rect x="8" y="36" width="24" height="20" rx="5" fill="white" opacity="0.18"/><rect x="8" y="62" width="24" height="20" rx="5" fill="white" opacity="0.18"/><rect x="8" y="88" width="24" height="20" rx="5" fill="white" opacity="0.12"/><rect x="38" y="10" width="74" height="20" rx="5" fill="white" opacity="0.12"/><rect x="38" y="36" width="56" height="20" rx="5" fill="white" opacity="0.12"/><rect x="38" y="62" width="64" height="20" rx="5" fill="white" opacity="0.12"/><rect x="38" y="88" width="44" height="20" rx="5" fill="white" opacity="0.08"/><path d="M30 62 L50 84 L90 40" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: '#1C1A15' }}>inventory<span style={{ color: '#FD6A02' }}>tools</span>.co.uk</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <a href="#how" style={{ fontSize: 14, color: '#6B6354', textDecoration: 'none', display: isMobile ? 'none' : 'block' }}>How it works</a>
          <a href="#features" style={{ fontSize: 14, color: '#6B6354', textDecoration: 'none', display: isMobile ? 'none' : 'block' }}>Features</a>
          <a href="#pricing" style={{ fontSize: 14, color: '#6B6354', textDecoration: 'none', display: isMobile ? 'none' : 'block' }}>Pricing</a>
          <Link href="/auth" style={{ padding: '8px 18px', borderRadius: 6, border: '1px solid var(--paper-line)', fontSize: 14, fontWeight: 500, color: '#1C1A15', textDecoration: 'none' }}>Log in</Link>
        </div>
      </nav>

      {/* HERO — ink section */}
      <section style={{ position: 'relative', background: 'var(--ink)', overflow: 'hidden' }}>
        <div className="dotgrid" />
        <div className="grain" />
        <div style={{ position: 'relative', maxWidth: 1160, margin: '0 auto', padding: isMobile ? '56px 6vw 64px' : '96px 6vw 100px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.05fr 0.95fr', gap: isMobile ? 40 : 50, alignItems: 'center' }}>
          <div>
            <div className="r1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent)', fontSize: 12, fontWeight: 500, letterSpacing: 1, marginBottom: 26, textTransform: 'uppercase' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} /> AI-Powered · Built for inventory clerks
            </div>
            <h1 className="r2" style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: isMobile ? 40 : 60, fontWeight: 600, lineHeight: 1.04, letterSpacing: -1, color: '#F4EEE3', marginBottom: 24 }}>
              Stop typing.<br/>Start <span style={{ color: 'var(--accent)', fontWeight: 800 }}>converting.</span>
            </h1>
            <p className="r3" style={{ fontSize: 17, color: 'rgba(244,238,227,0.72)', lineHeight: 1.7, marginBottom: 32, maxWidth: 460 }}>Got an inventory report sitting in a PDF — yours, another agency&apos;s, any layout? Upload it and our AI reads every room exactly as a person would: every item, every description, every condition note, every tenant comment. Minutes later, a fully formatted Word document lands in your downloads, ready to send.</p>
            <div className="r4" style={{ display: 'flex', flexWrap: 'wrap', gap: 30, marginBottom: 36, fontFamily: "'JetBrains Mono', monospace" }}>
              {[['MINUTES','not hours'],['£4.00','flat, any size'],['ANY FORMAT','verbatim, every time']].map(([big,small]) => (
                <div key={big}>
                  <p style={{ fontSize: 19, fontWeight: 600, color: 'var(--accent)', letterSpacing: 0.5, lineHeight: 1 }}>{big}</p>
                  <p style={{ fontSize: 11, color: 'rgba(244,238,227,0.5)', marginTop: 5 }}>{small}</p>
                </div>
              ))}
            </div>
            <Link href="/auth" className="r5" style={{ display: 'inline-block', padding: '14px 30px', borderRadius: 7, background: 'var(--accent)', color: '#14181A', fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 14px 32px rgba(253,106,2,0.25)' }}>Log in to convert →</Link>
          </div>

          <div style={{ position: 'relative', justifySelf: isMobile ? 'center' : 'end', width: '100%', maxWidth: 400 }}>
            <div className="card-in" style={{ background: '#F4EEE3', borderRadius: 10, overflow: 'hidden', boxShadow: '0 28px 60px rgba(0,0,0,0.45)', position: 'relative' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--paper-line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#1C1A15' }}>Convert PDF to Word</p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#6B6354', margin: '2px 0 0' }}>£4.00 · £284.00 remaining</p>
                </div>
                <div style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--paper-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#6B6354' }}>×</div>
              </div>
              <div style={{ margin: 16, background: '#fff', border: '1px solid var(--paper-line)', borderRadius: 8, padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 30, marginBottom: 8 }}>✅</div>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-deep)', margin: '0 0 4px' }}>Conversion complete!</p>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#6B6354', margin: '0 0 16px' }}>13 rooms · 1m 8s</p>
                {[['Outside Front'],['Entrance Hallway'],['Reception Room'],['Kitchen'],['Stairs'],['Landing'],['Bedroom One'],['Bathroom'],['Bedroom Two']].map(([name]) => (
                  <div key={name as string} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #EFE8D8', textAlign: 'left' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2.5"><polyline points="2,5 4,7 8,3" /></svg></div>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, color: '#3A3528', textTransform: 'uppercase', letterSpacing: 0.3 }}>{name as string}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '0 16px 12px' }}>
                <button style={{ width: '100%', padding: 13, borderRadius: 7, border: 'none', background: 'var(--ink)', color: '#F4EEE3', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>↓ Download inventory.docx</button>
              </div>
              <div style={{ padding: '0 16px 16px' }}>
                <button style={{ width: '100%', padding: 11, borderRadius: 7, border: '1px solid var(--paper-line)', background: 'transparent', color: '#6B6354', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>Close</button>
              </div>
            </div>
            <div className="stamp-in" style={{ position: 'absolute', top: -26, right: isMobile ? -8 : -30, width: 92, height: 92, borderRadius: '50%', border: '2.5px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(20,24,26,0.0)', transform: 'rotate(-10deg)' }}>
              <div style={{ textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent)', lineHeight: 1.15 }}>
                <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: 0.5 }}>VERBATIM</div>
                <div style={{ fontSize: 16, margin: '2px 0' }}>✓</div>
                <div style={{ fontSize: 7, fontWeight: 600, letterSpacing: 0.5 }}>AI-READ</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — paper section */}
      <div id="how" style={{ position: 'relative', background: 'var(--paper)', borderBottom: '1px solid var(--paper-line)' }}>
        <div className="grain" style={{ opacity: 0.35 }} />
        <section style={{ position: 'relative', maxWidth: 1100, margin: '0 auto', padding: '76px 6vw' }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, color: 'var(--accent-deep)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>How it works</p>
          <h2 style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: isMobile ? 30 : 42, fontWeight: 600, marginBottom: 16, letterSpacing: -0.5, color: '#1C1A15' }}>Three steps. Done.</h2>
          <p style={{ fontSize: 16, color: '#6B6354', maxWidth: 520, lineHeight: 1.7 }}>No training needed. No formatting. No copy-pasting. Upload a PDF, get a Word doc.</p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 24, marginTop: 44 }}>
            {[['01','Upload the PDF','Drag and drop any inventory inspection PDF. Our AI handles all formats — yours or another agency\u2019s.'],
              ['02','AI reads every room','Every item, description, condition note, and tenant dispute extracted exactly as written.'],
              ['03','Download the Word doc','A perfectly formatted three-column Word document downloads automatically — ready to send.']
            ].map(([n,title,desc]) => (
              <div key={n} style={{ background: '#fff', border: '1px solid var(--paper-line)', borderRadius: 10, padding: 28 }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: 'var(--accent-deep)', marginBottom: 18, letterSpacing: 1 }}>{n}</div>
                <h3 style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: 19, fontWeight: 600, marginBottom: 8, color: '#1C1A15' }}>{title}</h3>
                <p style={{ fontSize: 14, color: '#6B6354', lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* FEATURES — paper section */}
      <div id="features" style={{ background: '#fff', borderBottom: '1px solid var(--paper-line)' }}>
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '76px 6vw' }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, color: 'var(--accent-deep)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>Features</p>
          <h2 style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: isMobile ? 30 : 42, fontWeight: 600, marginBottom: 16, letterSpacing: -0.5, color: '#1C1A15' }}>Everything your team needs. Nothing they don&apos;t.</h2>
          <p style={{ fontSize: 16, color: '#6B6354', maxWidth: 520, lineHeight: 1.7, marginBottom: 44 }}>No training. No formatting. No chasing typists. Just upload, wait a few minutes, and download.</p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 18 }}>
            {[['⚡','Done in minutes, not hours','What used to take a typist 45–90 minutes is processed while you move on to the next job. The doc builds itself.'],
              ['£','£4.00 flat — any property size','A studio flat costs the same as an 8-bedroom house. No surprises, no tiers, no monthly fees. Pay only when you convert.'],
              ['§','Verbatim extraction','Every word copied exactly as it appears in the PDF. Zero edits, zero assumptions — your report, word for word.'],
              ['¶','Tenant disputes captured','Any "disagreed by tenant" or additional notes are captured and appended to the relevant item — nothing dropped.'],
              ['◆','Staff logins included','Every team member gets their own secure login. No extra cost per seat — add as many staff as you need.'],
              ['▣','Industry-standard Word format','Three-column layout (Item / Description / Condition) matching InventoryBase templates. Ready to import and submit immediately.']
            ].map(([icon,title,desc]) => (
              <div key={title} className="feature-card" style={{ background: 'var(--paper)', border: '1px solid var(--paper-line)', borderRadius: 10, padding: 26, transition: 'transform 0.25s, box-shadow 0.25s' }}>
                <div style={{ width: 36, height: 36, borderRadius: 7, border: '1.5px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: 'var(--accent-deep)' }}>{icon}</div>
                <h3 style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: 17, fontWeight: 600, marginBottom: 7, color: '#1C1A15' }}>{title}</h3>
                <p style={{ fontSize: 13.5, color: '#6B6354', lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* PRICING */}
      <div id="pricing" style={{ position: 'relative', background: 'var(--ink)', borderBottom: '1px solid var(--paper-line)', overflow: 'hidden' }}>
        <div className="dotgrid" />
        <div className="grain" />
        <section style={{ position: 'relative', maxWidth: 1100, margin: '0 auto', padding: '76px 6vw' }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>Pricing</p>
          <h2 style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: isMobile ? 30 : 42, fontWeight: 600, marginBottom: 16, letterSpacing: -0.5, color: '#F4EEE3' }}>One flat rate. No surprises.</h2>
          <p style={{ fontSize: 16, color: 'rgba(244,238,227,0.65)', maxWidth: 520, lineHeight: 1.7, marginBottom: 44 }}>Studio flat or 8-bedroom house — it&apos;s the same price.</p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24, alignItems: 'start' }}>
            <div style={{ background: 'var(--accent)', borderRadius: 14, padding: 40, color: '#14181A', textAlign: 'center', boxShadow: '0 20px 50px rgba(253,106,2,0.25)' }}>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, opacity: 0.7, marginBottom: 16 }}>Flat rate per conversion</p>
              <p style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: 76, fontWeight: 700, lineHeight: 1, letterSpacing: -2, marginBottom: 4 }}>£4.00</p>
              <p style={{ fontSize: 15, opacity: 0.8, marginBottom: 28 }}>per report · any size property</p>
              {['1-bed flat or 10-bed house — same price','Pay as you go — no monthly commitment','Unlimited staff logins included','Credits never expire'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, textAlign: 'left' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#14181A" strokeWidth="2.5"><polyline points="3,8 6,11 13,5" /></svg>
                  <span style={{ fontSize: 14 }}>{f}</span>
                </div>
              ))}
              <Link href="/auth" style={{ display: 'block', marginTop: 28, padding: 14, borderRadius: 7, background: '#14181A', color: '#F4EEE3', fontSize: 15, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>Log in to get started</Link>
            </div>
            <div>
              <div style={{ background: 'var(--ink-soft)', border: '1px solid rgba(244,238,227,0.12)', borderRadius: 14, padding: 28, marginBottom: 16 }}>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(244,238,227,0.5)', marginBottom: 18 }}>How it compares</p>
                {[['External typist','Average market rate per report','£12–£25','#E8786A'],
                  ['In-house typing time','45–90 mins of staff time per report','~£18','#E8786A'],
                  ['InventoryTools','Any property · ready in minutes*','£4.00','var(--accent)']
                ].map(([title,sub,price,color]) => (
                  <div key={title} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: isMobile ? 16 : 0, padding: '14px 0', borderBottom: title !== 'InventoryTools' ? '1px solid rgba(244,238,227,0.1)' : 'none' }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: title === 'InventoryTools' ? 600 : 500, color: title === 'InventoryTools' ? 'var(--accent)' : '#F4EEE3' }}>{title}</p>
                      <p style={{ fontSize: 12, color: 'rgba(244,238,227,0.45)', marginTop: 2 }}>{sub}</p>
                    </div>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 19, fontWeight: 700, color }}>{price}</p>
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(253,106,2,0.12)', border: '1px solid rgba(253,106,2,0.3)', borderRadius: 12, padding: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>💡 Do the numbers</p>
                <p style={{ fontSize: 13, color: 'rgba(244,238,227,0.75)', lineHeight: 1.6 }}>If you process just <strong style={{ color: '#F4EEE3' }}>20 reports a month</strong>, you&apos;re saving up to <strong style={{ color: '#F4EEE3' }}>£430</strong> compared to an external typist.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* CTA */}
      <div style={{ background: 'var(--accent)', padding: '70px 6vw', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: isMobile ? 30 : 42, fontWeight: 600, color: '#14181A', marginBottom: 14, letterSpacing: -0.5 }}>Your next report done in minutes*</h2>
        <p style={{ fontSize: 16, color: 'rgba(20,24,26,0.7)', marginBottom: 8 }}>£4.00 flat rate. Any property. Any size.</p>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(20,24,26,0.5)', marginBottom: 30 }}>*Depending on size of property</p>
        <Link href="/auth" style={{ display: 'inline-block', padding: '14px 34px', borderRadius: 7, background: '#14181A', color: '#F4EEE3', fontSize: 15, fontWeight: 600, textDecoration: 'none', boxShadow: '0 12px 28px rgba(0,0,0,0.25)' }}>Log in to get started</Link>
      </div>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--paper-line)', padding: '32px 6vw', background: 'var(--paper)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: '#1C1A15' }}>inventory<span style={{ color: 'var(--accent-deep)' }}>tools</span>.co.uk</span>
          <div style={{ display: 'flex', gap: 24 }}>
            <a href="#" style={{ fontSize: 13, color: '#6B6354', textDecoration: 'none' }}>Privacy</a>
            <a href="#" style={{ fontSize: 13, color: '#6B6354', textDecoration: 'none' }}>Terms</a>
            <a href="#" style={{ fontSize: 13, color: '#6B6354', textDecoration: 'none' }}>Contact</a>
          </div>
          <span style={{ fontSize: 13, color: '#6B6354' }}>© 2026 InventoryTools Ltd</span>
        </div>
      </footer>
    </main>
  )
}
