'use client'
import Link from 'next/link'

export default function PDFToWord() {
  return (
    <main style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F7F9F8', color: '#1A2820' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(247,249,248,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E2EAE7', padding: '0 5vw', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, background: '#1D9E75', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 8h10M7 12h6M7 16h8" /></svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1A2820' }}>inventory<span style={{ color: '#1D9E75' }}>tools</span>.co.uk</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <a href="#how" style={{ fontSize: 14, color: '#5A7068', textDecoration: 'none' }}>How it works</a>
          <a href="#features" style={{ fontSize: 14, color: '#5A7068', textDecoration: 'none' }}>Features</a>
          <a href="#pricing" style={{ fontSize: 14, color: '#5A7068', textDecoration: 'none' }}>Pricing</a>
          <Link href="/auth" style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #E2EAE7', fontSize: 14, fontWeight: 500, color: '#1A2820', textDecoration: 'none' }}>Log in</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 5vw 60px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#E1F5EE', color: '#085041', fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 20, marginBottom: 22 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1D9E75', display: 'inline-block' }} /> AI-powered · Built for inventory clerks
          </div>
          <h1 style={{ fontSize: 48, fontWeight: 700, lineHeight: 1.15, marginBottom: 20, letterSpacing: -1 }}>Stop typing. Start <span style={{ color: '#1D9E75' }}>converting.</span></h1>
          <p style={{ fontSize: 17, color: '#5A7068', lineHeight: 1.7, marginBottom: 36, maxWidth: 460 }}>Upload any inventory PDF and get a perfectly formatted Word document in under 60 seconds. What used to take a typist 90 minutes now costs £3.50.</p>
          <Link href="/auth" style={{ display: 'inline-block', padding: '13px 28px', borderRadius: 10, background: '#1D9E75', color: '#fff', fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>Log in to convert</Link>
        </div>
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2EAE7', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ background: '#F2F5F4', borderBottom: '1px solid #E2EAE7', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF6058' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840' }} />
            <span style={{ flex: 1, textAlign: 'center', fontSize: 12, color: '#94AEA6' }}>inventorytools.co.uk</span>
          </div>
          <div style={{ padding: 22 }}>
            <div style={{ border: '2px dashed #E2EAE7', borderRadius: 10, padding: 22, textAlign: 'center', marginBottom: 16, background: '#F7F9F8' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
              <p style={{ fontSize: 13, color: '#5A7068', margin: 0 }}>12 Milliners Court — Inventory.pdf</p>
              <span style={{ fontSize: 11, color: '#94AEA6' }}>Uploaded · 2.4 MB</span>
            </div>
            <div style={{ background: '#F2F5F4', borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 500 }}>Building Word document...</span>
                <span style={{ fontSize: 11, color: '#94AEA6' }}>⏱ 18s</span>
              </div>
              {[['Entrance / Hallway', true], ['Living Room', true], ['Kitchen', true], ['Bedroom 1', 'active'], ['Bedroom 2', false], ['Bathroom', false]].map(([name, done]) => (
                <div key={name as string} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #E2EAE7', opacity: done === false ? 0.35 : 1 }}>
                  {done === true && <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2.5"><polyline points="2,5 4,7 8,3" /></svg></div>}
                  {done === 'active' && <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #1D9E75', borderTopColor: 'transparent', flexShrink: 0 }} />}
                  {done === false && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#E2EAE7', margin: '0 5px', flexShrink: 0 }} />}
                  <span style={{ fontSize: 12, fontWeight: done === 'active' ? 600 : 400 }}>{name as string}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#E1F5EE', borderRadius: 8, padding: '10px 14px' }}>
              <span style={{ color: '#1D9E75' }}>✓</span>
              <span style={{ fontSize: 12, color: '#085041', fontWeight: 500, flex: 1 }}>12 Milliners Court.docx ready</span>
              <button style={{ fontSize: 11, background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Download</button>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <div id="how" style={{ background: '#fff', borderTop: '1px solid #E2EAE7', borderBottom: '1px solid #E2EAE7' }}>
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 5vw' }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>How it works</p>
          <h2 style={{ fontSize: 36, fontWeight: 700, marginBottom: 14, letterSpacing: -0.5 }}>Three steps. Done.</h2>
          <p style={{ fontSize: 16, color: '#5A7068', maxWidth: 520, lineHeight: 1.7 }}>No training needed. No formatting. No copy-pasting. Upload a PDF, get a Word doc.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, marginTop: 40 }}>
            {[['1','Upload the PDF','Drag and drop any inventory inspection PDF. Our AI handles all formats.'],
              ['2','AI reads every room','Every item, description, condition note, and tenant dispute extracted verbatim.'],
              ['3','Download the Word doc','A perfectly formatted three-column Word document downloads automatically.']
            ].map(([n,title,desc]) => (
              <div key={n} style={{ background: '#F7F9F8', border: '1px solid #E2EAE7', borderRadius: 14, padding: 28 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#E1F5EE', color: '#085041', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>{n}</div>
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
          <p style={{ fontSize: 12, fontWeight: 500, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Features</p>
          <h2 style={{ fontSize: 36, fontWeight: 700, marginBottom: 14, letterSpacing: -0.5 }}>Everything your team needs. Nothing they don&apos;t.</h2>
          <p style={{ fontSize: 16, color: '#5A7068', maxWidth: 520, lineHeight: 1.7, marginBottom: 40 }}>No training. No formatting. No chasing typists. Just upload, wait 60 seconds, and download.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[['⚡','Done in under 60 seconds','What used to take a typist 45–90 minutes is processed instantly. Your clerks move on to the next job while the doc builds itself.'],
              ['💷','£3.50 flat — any property size','A studio flat costs the same as an 8-bedroom house. No surprises, no tiers, no monthly fees. Pay only when you convert.'],
              ['📋','Verbatim extraction','Every word copied exactly as it appears in the PDF. Zero edits, zero assumptions — your report, word for word.'],
              ['📝','Tenant disputes captured','Any "disagreed by tenant" or additional notes are captured and appended to the relevant item — nothing dropped.'],
              ['🔒','Staff logins included','Every team member gets their own secure login. No extra cost per seat — add as many staff as you need.'],
              ['📄','Industry-standard Word format','Three-column layout (Item / Description / Condition) matching InventoryBase templates. Ready to import and submit immediately.']
            ].map(([icon,title,desc]) => (
              <div key={title} style={{ background: '#fff', border: '1px solid #E2EAE7', borderRadius: 14, padding: 24 }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, fontSize: 18 }}>{icon}</div>
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
          <p style={{ fontSize: 12, fontWeight: 500, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Pricing</p>
          <h2 style={{ fontSize: 36, fontWeight: 700, marginBottom: 14, letterSpacing: -0.5 }}>One flat rate. No surprises.</h2>
          <p style={{ fontSize: 16, color: '#5A7068', maxWidth: 520, lineHeight: 1.7, marginBottom: 40 }}>Studio flat or 8-bedroom house — it&apos;s the same price.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
            <div style={{ background: '#1D9E75', borderRadius: 20, padding: 40, color: '#fff', textAlign: 'center' }}>
              <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, opacity: 0.75, marginBottom: 16 }}>Flat rate per conversion</p>
              <p style={{ fontSize: 72, fontWeight: 700, lineHeight: 1, letterSpacing: -2, marginBottom: 4 }}>£3.50</p>
              <p style={{ fontSize: 15, opacity: 0.8, marginBottom: 28 }}>per report · any size property</p>
              {['1-bed flat or 10-bed house — same price','Pay as you go — no monthly commitment','Unlimited staff logins included','Credits never expire'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, textAlign: 'left' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.5"><polyline points="3,8 6,11 13,5" /></svg>
                  <span style={{ fontSize: 14 }}>{f}</span>
                </div>
              ))}
              <Link href="/auth" style={{ display: 'block', marginTop: 28, padding: 14, borderRadius: 10, background: '#fff', color: '#1D9E75', fontSize: 15, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>Log in to get started</Link>
            </div>
            <div>
              <div style={{ background: '#F7F9F8', border: '1px solid #E2EAE7', borderRadius: 20, padding: 28, marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#94AEA6', marginBottom: 18 }}>How it compares</p>
                {[['External typist','Average market rate per report','£12–£25','#E24B4A'],
                  ['In-house typing time','45–90 mins of staff time per report','~£18','#E24B4A'],
                  ['InventoryTools','Any property · ready in under 60 seconds*','£3.50','#1D9E75']
                ].map(([title,sub,price,color]) => (
                  <div key={title} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: title !== 'InventoryTools' ? '1px solid #E2EAE7' : 'none' }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: title === 'InventoryTools' ? 600 : 500, color: title === 'InventoryTools' ? '#1D9E75' : '#1A2820' }}>{title}</p>
                      <p style={{ fontSize: 12, color: '#94AEA6', marginTop: 2 }}>{sub}</p>
                    </div>
                    <p style={{ fontSize: 20, fontWeight: 700, color }}>{price}</p>
                  </div>
                ))}
              </div>
              <div style={{ background: '#E1F5EE', borderRadius: 14, padding: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#085041', marginBottom: 6 }}>💡 Do the numbers</p>
                <p style={{ fontSize: 13, color: '#085041', lineHeight: 1.6 }}>If you process just <strong>20 reports a month</strong>, you&apos;re saving up to <strong>£430</strong> compared to an external typist.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* CTA */}
      <div style={{ background: '#1D9E75', padding: '60px 5vw', textAlign: 'center' }}>
        <h2 style={{ fontSize: 36, fontWeight: 700, color: '#fff', marginBottom: 14, letterSpacing: -0.5 }}>Your next report done in 60 seconds*</h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', marginBottom: 8 }}>£3.50 flat rate. Any property. Any size.</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 30 }}>*Depending on size of property</p>
        <Link href="/auth" style={{ display: 'inline-block', padding: '13px 32px', borderRadius: 10, background: '#fff', color: '#1D9E75', fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>Log in to get started</Link>
      </div>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid #E2EAE7', padding: '32px 5vw', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>inventory<span style={{ color: '#1D9E75' }}>tools</span>.co.uk</span>
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
