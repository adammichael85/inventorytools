'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'

export default function Home() {
  const [toolsOpen, setToolsOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [demoTab, setDemoTab] = useState<'pdf' | 'audio' | 'long' | 'locked'>('pdf')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const faqs = [
    { q: 'What can I upload?', a: "PDF inventory reports, Word documents, and dictated inspection audio recordings. If a long recording covers the whole property, split it into rooms first with the Audio Splitter." },
    { q: 'What is PDF to Word conversion?', a: 'Upload an existing inventory report as a PDF or Word file, and InventoryTools rebuilds it into a clean, professionally formatted, editable Word document — rooms, items, descriptions and conditions structured properly.' },
    { q: 'What is Audio to Word conversion?', a: 'Dictate your inspection room by room, upload the audio, and InventoryTools turns your spoken notes into a structured Word inventory report. No typing.' },
    { q: 'What does the Audio Splitter do?', a: "If you recorded a whole property as one long file, the Splitter lets you mark where each room starts on the waveform, name it, and export separate per-room files ready for Audio to Word." },
    { q: 'What does Clean & Unlock PDF do?', a: "Some PDFs have security wrappers or corruption that stop them converting properly. This tool repairs and unlocks a copy so PDF to Word can read it cleanly, without needing a password." },
    { q: 'Can I edit the Word document afterwards?', a: "Completely. You get a normal, fully editable Word file. It's your report — change anything you like before sending." },
    { q: 'Do I need a subscription?', a: "No. You pay per conversion for PDF to Word and Audio to Word. The Audio Splitter and Clean & Unlock PDF are free. No monthly fee, no commitment, and credits don't expire." },
    { q: 'How much does it cost?', a: 'PDF conversion from £4.00 per report. Audio conversion from £4.88 per report. Audio Splitter and Clean & Unlock PDF are free.' },
    { q: 'Do I still need to review the report?', a: "Yes, and you should. InventoryTools is designed to give you a report that's ready to review, not one you have to rebuild. You check it, tweak anything you want, and send it." },
    { q: 'Who is InventoryTools for?', a: 'UK inventory clerks, independent inventory professionals, letting agents, property managers, and agencies handling high report volumes.' },
    { q: 'Can teams use it together?', a: "Yes. Teams share a company balance and convert as many reports as they need — it's built for busy periods." },
    { q: 'Is my data handled securely?', a: 'Your documents and audio files are handled securely during processing, and your reports stay yours.' },
  ]

  const demoContent: Record<string, { input: string, inputSub: string, process: string, output: string }> = {
    pdf: { input: 'Messy 64-page PDF', inputSub: 'Inconsistent formatting', process: 'PDF to Word', output: 'Clean, editable DOCX' },
    audio: { input: 'Room-by-room dictation', inputSub: 'Spoken inspection notes', process: 'Audio to Word', output: 'Structured DOCX' },
    long: { input: '42-minute recording', inputSub: 'Whole property, one file', process: 'Split, then Convert', output: 'Room-by-room DOCX' },
    locked: { input: 'Unreadable PDF', inputSub: 'Locked or corrupted', process: 'Clean, then Convert', output: 'Editable DOCX' },
  }
  const activeDemo = demoContent[demoTab]

  const css = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap');
:root{--ink:#1a1a1a;--body:#4a4a4a;--muted:#8a8a8a;--bg:#f6f5f3;--bg-alt:#f0efec;--orange:#fd6a02;--orange-hover:#e05e00;--orange-tint:#fff1e6;--navy:#1c2942;--navy-tint:#e9ebf1;--border:#ecebe8;--green:#3e8e5a;--green-tint:#e9f3ec;--radius:18px;--shadow:0 8px 30px rgba(26,26,26,.07);--glass-bg:rgba(255,255,255,.7);--glass-bg-strong:rgba(255,255,255,.85);--glass-border:rgba(255,255,255,.75)}
*{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth}
body{font-family:'Inter',sans-serif;color:var(--body);background:var(--bg)!important;font-size:17px;line-height:1.6;-webkit-font-smoothing:antialiased}
.pl-backdrop{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none}
.pl-blob{position:absolute;border-radius:50%;filter:blur(110px);-webkit-transform:translateZ(0);transform:translateZ(0)}
.pl-blob-1{width:640px;height:640px;background:var(--orange);top:-220px;left:-160px;opacity:.2}
.pl-blob-2{width:520px;height:520px;background:#e4d9c9;top:15%;right:-180px;opacity:.55}
.pl-blob-3{width:560px;height:560px;background:var(--navy);bottom:10%;left:20%;opacity:.12}
.pl-blob-4{width:480px;height:480px;background:var(--orange);bottom:-260px;right:10%;opacity:.1}
.pl-main{position:relative;z-index:1}
.container{max-width:1180px;margin:0 auto;padding:0 24px}section{padding:90px 0}
h1,h2,h3{font-family:'Space Grotesk',sans-serif;color:var(--ink);line-height:1.15;letter-spacing:-.02em}
h1{font-size:clamp(2.3rem,5vw,3.6rem);font-weight:700}h2{font-size:clamp(1.6rem,3vw,2.3rem);font-weight:700}h3{font-size:1.2rem;font-weight:600}
.section-head{text-align:center;max-width:680px;margin:0 auto 54px}.section-head p{margin-top:14px;font-size:1.02rem}
.eyebrow{font-family:'IBM Plex Mono',monospace;font-size:.72rem;letter-spacing:.14em;color:var(--orange);font-weight:500;text-transform:uppercase;display:inline-block;margin-bottom:16px}
.eyebrow.pill{background:var(--orange-tint);padding:7px 16px;border-radius:100px}
.glass-card{background:var(--glass-bg);backdrop-filter:blur(24px) saturate(160%);-webkit-backdrop-filter:blur(24px) saturate(160%);border:1px solid var(--glass-border);border-radius:22px;box-shadow:var(--shadow)}
header{position:sticky;top:0;z-index:100;background:var(--glass-bg)!important;backdrop-filter:blur(24px) saturate(160%);-webkit-backdrop-filter:blur(24px) saturate(160%);border-bottom:1px solid var(--glass-border)}
.nav{display:flex;align-items:center;justify-content:space-between;height:68px;position:relative}
.logo{display:flex;align-items:center;gap:10px;text-decoration:none}
.logo-text{font-family:'Space Grotesk';font-weight:700;font-size:1.12rem;color:var(--ink)}.logo-text span{color:var(--orange)}
.nav-links{display:flex;align-items:center;gap:28px;list-style:none}
.nav-links a,.nav-tools-btn{text-decoration:none;color:var(--body);font-size:.93rem;font-weight:500;background:none;border:none;font-family:'Inter';cursor:pointer;display:flex;align-items:center;gap:5px}
.nav-links a:hover,.nav-tools-btn:hover{color:var(--ink)}
.nav-tools-chevron{font-size:.7rem;transition:transform .15s}
.nav-tools-btn.open .nav-tools-chevron{transform:rotate(180deg)}
.tools-dropdown{position:absolute;top:52px;left:0;background:var(--glass-bg-strong);backdrop-filter:blur(24px) saturate(160%);-webkit-backdrop-filter:blur(24px) saturate(160%);border:1px solid var(--glass-border);border-radius:16px;box-shadow:var(--shadow);padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:24px;min-width:380px}
.tools-dropdown-col span{font-family:'IBM Plex Mono',monospace;font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:10px}
.tools-dropdown-col a{display:block;padding:8px 0;text-decoration:none;color:var(--ink);font-weight:600;font-size:.92rem}
.tools-dropdown-col a:hover{color:var(--orange)}
.tools-dropdown-col a small{display:block;font-weight:400;color:var(--muted);font-size:.78rem;margin-top:2px}
.nav-right{display:flex;align-items:center;gap:18px}.nav-right .login{text-decoration:none;color:var(--body);font-weight:500;font-size:.93rem}.nav-right .btn{padding:9px 18px;font-size:.9rem;border-radius:10px;gap:5px}
.hamburger{display:none;background:none;border:none;font-size:1.6rem;cursor:pointer;color:var(--ink)}
.mobile-menu{display:none;position:fixed;top:68px;left:0;right:0;background:var(--glass-bg)!important;backdrop-filter:blur(24px) saturate(160%);-webkit-backdrop-filter:blur(24px) saturate(160%);border-bottom:1px solid var(--glass-border);padding:18px 24px;box-shadow:0 12px 24px rgba(26,26,26,.08);z-index:99;max-height:80vh;overflow-y:auto}
.mobile-menu a{display:block;padding:11px 0;text-decoration:none;color:var(--ink);font-weight:600;border-bottom:1px solid var(--bg-alt)}
.mobile-menu.open{display:block}
.mobile-menu small{display:block;font-weight:400;color:var(--muted);font-size:.78rem;margin-top:2px}
.btn{display:inline-flex;align-items:center;gap:8px;font-family:'Inter',sans-serif;font-weight:600;font-size:1rem;padding:14px 26px;border-radius:12px;cursor:pointer;text-decoration:none;border:1px solid transparent;transition:transform .15s ease,background .15s ease,box-shadow .15s ease}
.btn-primary{background:var(--orange);color:#fff;box-shadow:0 10px 22px -8px rgba(253,106,2,.5)}
.btn-primary:hover{background:var(--orange-hover);transform:translateY(-1px);box-shadow:0 12px 26px -6px rgba(253,106,2,.45)}
.btn-secondary{background:var(--glass-bg-strong);color:var(--ink);border-color:var(--glass-border);backdrop-filter:blur(16px)}
.btn-secondary:hover{border-color:var(--ink)}
.btn-navy{background:var(--navy);color:#fff;box-shadow:0 10px 22px -8px rgba(28,41,66,.5)}
.btn-navy:hover{transform:translateY(-1px)}
.arrow{font-weight:700}
.hero{padding:80px 0 60px;text-align:center}
.hero h1{max-width:780px;margin:0 auto 20px}.hero .sub{max-width:600px;margin:0 auto 28px;font-size:1.05rem}
.hero-ctas{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-bottom:16px}
.hero-note{font-size:.85rem;color:var(--muted);font-weight:500;margin-bottom:50px}
.hero-note b{color:var(--ink)}
.workflow-visual{padding:36px;max-width:1040px;margin:0 auto;text-align:left}
.wf-row{display:grid;grid-template-columns:1fr auto 1.1fr;gap:28px;align-items:center}
.wf-inputs{display:flex;flex-direction:column;gap:12px}
.wf-input-card{border:1px solid var(--border);border-radius:14px;padding:16px 18px;background:rgba(255,255,255,.6);display:flex;align-items:center;gap:12px}
.wf-input-icon{width:38px;height:38px;border-radius:10px;background:var(--orange-tint);display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0}
.wf-input-label{font-weight:600;color:var(--ink);font-size:.95rem}
.wf-input-sub{font-size:.78rem;color:var(--muted);margin-top:2px}
.wf-prep-link{font-size:.78rem;color:var(--orange);font-weight:600;text-decoration:none;margin-left:auto;flex-shrink:0}
.wf-mid{display:flex;flex-direction:column;align-items:center;gap:10px}
.wf-gear{width:58px;height:58px;border-radius:16px;background:var(--orange);color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk';font-weight:800;font-size:1.5rem;animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(253,106,2,.35)}50%{box-shadow:0 0 0 14px rgba(253,106,2,0)}}
.wf-mid small{font-size:.72rem;color:var(--muted);text-align:center;font-weight:600;white-space:nowrap}
.doc-out{border:1px solid var(--glass-border);border-radius:14px;background:rgba(255,255,255,.9);overflow:hidden;box-shadow:0 4px 16px rgba(26,26,26,.06)}
.doc-head{background:var(--bg-alt);padding:11px 16px;font-size:.78rem;font-weight:700;color:var(--ink);display:flex;justify-content:space-between;align-items:center}
.docx-chip{background:#2b5797;color:#fff;font-size:.65rem;padding:3px 8px;border-radius:5px;letter-spacing:.05em}
.doc-body{padding:14px 16px;font-size:.8rem}
.doc-row{display:grid;grid-template-columns:.9fr 1.5fr .9fr;gap:8px;padding:7px 0;border-bottom:1px solid var(--bg-alt)}
.doc-row.hdr{color:var(--muted);font-weight:700;font-size:.66rem;text-transform:uppercase;letter-spacing:.05em}
.doc-row:last-child{border-bottom:none}
.grid-4{display:grid;grid-template-columns:repeat(2,1fr);gap:22px}
.tool-card{padding:32px;display:flex;flex-direction:column;position:relative}
.tool-num{font-family:'IBM Plex Mono',monospace;font-size:.75rem;color:var(--muted);letter-spacing:.08em;margin-bottom:14px}
.tool-badge{position:absolute;top:24px;right:24px;background:var(--navy);color:#fff;font-size:.66rem;font-weight:700;letter-spacing:.08em;padding:5px 11px;border-radius:100px;text-transform:uppercase}
.tool-badge.free{background:var(--green)}
.tool-card h3{font-size:1.35rem;margin-bottom:8px}
.tool-card > p{font-size:.95rem;margin-bottom:18px}
.tool-card ul{list-style:none;margin-bottom:24px;display:flex;flex-direction:column;gap:9px}
.tool-card li{display:flex;gap:9px;font-size:.9rem;align-items:flex-start}
.tool-card li::before{content:"✓";color:var(--green);font-weight:700;flex-shrink:0}
.tool-foot{margin-top:auto;display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
.tool-price{font-family:'Space Grotesk';font-weight:700;font-size:1.15rem;color:var(--ink)}
.tool-price.free{color:var(--green)}
.tool-price small{font-size:.78rem;color:var(--muted);font-family:'Inter';font-weight:500}
.route-grid{display:grid;grid-template-columns:1fr 1fr;gap:26px}
.route-panel{padding:30px}
.route-panel .eyebrow{margin-bottom:14px}
.route-steps{display:flex;flex-direction:column;gap:0}
.route-step{display:flex;align-items:center;gap:14px;padding:12px 0}
.route-step-num{width:32px;height:32px;border-radius:50%;background:var(--navy-tint);color:var(--navy);font-family:'Space Grotesk';font-weight:700;font-size:.9rem;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.route-step-label{font-weight:600;color:var(--ink);font-size:.95rem}
.route-step-sub{font-size:.78rem;color:var(--muted)}
.route-arrow-down{color:var(--muted);font-size:1rem;padding-left:16px;margin:-2px 0}
.demo-tabs{display:flex;justify-content:center;gap:6px;background:var(--glass-bg);backdrop-filter:blur(20px);border:1px solid var(--glass-border);border-radius:100px;padding:5px;width:max-content;margin:0 auto 40px;flex-wrap:wrap}
.demo-tabs button{border:none;background:transparent;font-family:'Inter';font-weight:600;font-size:.88rem;padding:10px 20px;border-radius:100px;cursor:pointer;color:var(--body)}
.demo-tabs button.active{background:var(--ink);color:#fff}
.demo-panel{padding:36px;max-width:920px;margin:0 auto}
.ipo-row{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;gap:18px;align-items:center}
.ipo-card{border:1px solid var(--border);border-radius:14px;padding:18px;background:rgba(255,255,255,.6);text-align:center}
.ipo-card .mini-label{font-size:.68rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:8px;display:block}
.ipo-card strong{font-size:.95rem;color:var(--ink);display:block}
.ipo-arrow{color:var(--orange);font-size:1.3rem;font-weight:700}
.benefit-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:22px}
.benefit-card{padding:26px}
.benefit-icon{width:42px;height:42px;border-radius:12px;background:var(--orange-tint);display:flex;align-items:center;justify-content:center;font-size:1.15rem;margin-bottom:16px}
.benefit-card h3{font-size:1.02rem;margin-bottom:8px}.benefit-card p{font-size:.9rem}
.evidence-panel{padding:44px;text-align:center;max-width:800px;margin:0 auto}
.evidence-panel p{font-size:1.05rem;color:var(--ink);font-family:'Space Grotesk';font-weight:600;line-height:1.5}
.pricing-table-wrap{max-width:720px;margin:0 auto;overflow:hidden}
.pricing-row{display:flex;justify-content:space-between;align-items:center;padding:20px 28px;border-bottom:1px solid var(--border)}
.pricing-row:last-child{border-bottom:none}
.pricing-row .name{font-weight:600;color:var(--ink);font-size:1rem}
.pricing-row .price{font-family:'Space Grotesk';font-weight:700;font-size:1.1rem;color:var(--ink)}
.pricing-row .price.free{color:var(--green)}
.pricing-notes{display:flex;justify-content:center;gap:26px;flex-wrap:wrap;margin-top:34px;font-size:.88rem;font-weight:600;color:var(--ink)}
.pricing-notes span::before{content:"✓ ";color:var(--green)}
.pricing-ctas{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:34px}
.team-grid{display:grid;grid-template-columns:1fr 1fr;gap:26px}
.team-card{padding:32px}
.team-card h3{margin-bottom:16px}
.team-card ul{list-style:none;display:flex;flex-direction:column;gap:11px}
.team-card li{display:flex;gap:10px;font-size:.94rem;align-items:flex-start}
.team-card li::before{content:"✓";color:var(--green);font-weight:700;flex-shrink:0}
.team-cta{text-align:center;margin-top:38px}
.faq-list{max-width:740px;margin:0 auto;display:flex;flex-direction:column;gap:12px}
.faq-item{border-radius:14px;overflow:hidden}
.faq-q{width:100%;background:none;border:none;font-family:'Inter';font-weight:600;font-size:1rem;color:var(--ink);padding:19px 22px;text-align:left;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:14px}
.faq-q .pm{color:var(--orange);font-size:1.3rem;font-weight:700;transition:transform .2s;flex-shrink:0}
.faq-item.open .pm{transform:rotate(45deg)}
.faq-a{overflow:hidden;max-height:0;transition:max-height .3s ease}
.faq-item.open .faq-a{max-height:320px}
.faq-a p{padding:0 22px 20px;font-size:.94rem}
.final{background:#20242c;color:#c9cdd6;text-align:center;padding:100px 0}
.final h2{color:#fff;max-width:700px;margin:0 auto 18px}.final p{max-width:560px;margin:0 auto 30px;font-size:1.05rem}
.final-ctas{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-bottom:20px}
.final .btn-secondary{background:rgba(255,255,255,.08);color:#fff;border-color:rgba(255,255,255,.18);backdrop-filter:none}
.final .btn-secondary:hover{border-color:#fff}
.final-note{font-size:.85rem;color:#8f95a3}
footer{background:#20242c;border-top:1px solid #2c313a;padding:34px 0;color:#9a9fab;font-size:.85rem}
.foot-row{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}
.foot-row a{color:#c8cad0;text-decoration:none;margin-left:20px}.foot-row a:hover{color:#fff}
.foot-price{color:#c8cad0}.foot-price b{color:#fff}
@media(max-width:960px){.grid-4{grid-template-columns:1fr}.wf-row{grid-template-columns:1fr}.wf-mid{flex-direction:row;justify-content:center}.route-grid{grid-template-columns:1fr}.benefit-grid{grid-template-columns:repeat(2,1fr)}.team-grid{grid-template-columns:1fr}.ipo-row{grid-template-columns:1fr;text-align:center}.ipo-arrow{transform:rotate(90deg)}}
@media(max-width:720px){section{padding:52px 0}h2{font-size:1.55rem}.container{padding:0 18px}.nav-links,.nav-right .login{display:none}.nav-right .btn{display:none}.hamburger{display:block}.hero{padding:40px 0 44px}.hero h1{font-size:1.8rem}.hero .sub{font-size:.95rem}.hero-ctas{flex-direction:column;align-items:stretch}.hero-ctas .btn{width:100%;justify-content:center}.workflow-visual{padding:18px;border-radius:18px}.benefit-grid{grid-template-columns:1fr}.pricing-row{padding:16px 20px}.pricing-notes{gap:10px;font-size:.8rem}.team-card{padding:22px}.final-ctas .btn{width:100%;justify-content:center}}
@media(prefers-reduced-motion:reduce){.wf-gear{animation:none}html{scroll-behavior:auto}}
`

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {typeof document !== 'undefined' && createPortal(
        <div className="pl-backdrop">
          <div className="pl-blob pl-blob-1" />
          <div className="pl-blob pl-blob-2" />
          <div className="pl-blob pl-blob-3" />
          <div className="pl-blob pl-blob-4" />
        </div>,
        document.body
      )}
      <div className="pl-main">

      <header>
        <div className="container nav">
          <a className="logo" href="#top" aria-label="InventoryTools home">
            <img src="/logo-full.png" alt="InventoryTools" style={{ height: 31, width: 'auto' }} />
          </a>
          <ul className="nav-links">
            <li style={{ position: 'relative' }}>
              <button className={`nav-tools-btn${toolsOpen ? ' open' : ''}`} onClick={() => setToolsOpen(!toolsOpen)} onBlur={() => setTimeout(() => setToolsOpen(false), 150)}>
                Tools <span className="nav-tools-chevron">▾</span>
              </button>
              {toolsOpen && (
                <div className="tools-dropdown">
                  <div className="tools-dropdown-col">
                    <span>Convert</span>
                    <a href="#tools">PDF to Word<small>Rebuild an existing report</small></a>
                    <a href="#tools">Audio to Word<small>Dictation into a report</small></a>
                  </div>
                  <div className="tools-dropdown-col">
                    <span>Prepare</span>
                    <a href="#tools">Audio Splitter<small>Split one long recording</small></a>
                    <a href="#tools">Clean &amp; Unlock PDF<small>Repair a problem file</small></a>
                  </div>
                </div>
              )}
            </li>
            <li><a href="#how">How it works</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#teams">For teams</a></li>
            <li><a href="#faq">Help</a></li>
          </ul>
          <div className="nav-right">
            <Link className="login" href="/auth">Log in</Link>
            <Link className="btn btn-primary" href="/auth">Start converting <span className="arrow">→</span></Link>
            <button className="hamburger" aria-label="Open menu" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>☰</button>
          </div>
        </div>
        <nav className={`mobile-menu${mobileMenuOpen ? ' open' : ''}`}>
          <a href="#tools" onClick={() => setMobileMenuOpen(false)}>PDF to Word<small>Rebuild an existing report</small></a>
          <a href="#tools" onClick={() => setMobileMenuOpen(false)}>Audio to Word<small>Dictation into a report</small></a>
          <a href="#tools" onClick={() => setMobileMenuOpen(false)}>Audio Splitter<small>Split one long recording — free</small></a>
          <a href="#tools" onClick={() => setMobileMenuOpen(false)}>Clean &amp; Unlock PDF<small>Repair a problem file — free</small></a>
          <a href="#how" onClick={() => setMobileMenuOpen(false)}>How it works</a>
          <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
          <a href="#teams" onClick={() => setMobileMenuOpen(false)}>For teams</a>
          <a href="#faq" onClick={() => setMobileMenuOpen(false)}>Help</a>
          <Link href="/auth" onClick={() => setMobileMenuOpen(false)}>Log in</Link>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="container">
          <span className="eyebrow pill">THE INVENTORY REPORT TOOLKIT</span>
          <h1>Four tools. One finished inventory report.</h1>
          <p className="sub">Convert existing reports, turn dictated inspections into structured Word documents, split long recordings room by room, and repair PDFs that can&apos;t be read properly.</p>
          <div className="hero-ctas">
            <Link className="btn btn-primary" href="/auth">Start a conversion <span className="arrow">→</span></Link>
            <a className="btn btn-secondary" href="#tools">Explore all four tools</a>
          </div>
          <p className="hero-note">No subscription · Pay per conversion · <b>Preparation tools included free</b></p>

          <div className="glass-card workflow-visual">
            <div className="wf-row">
              <div className="wf-inputs">
                <div className="wf-input-card">
                  <div className="wf-input-icon">📄</div>
                  <div>
                    <div className="wf-input-label">PDF / Word report</div>
                    <div className="wf-input-sub">Problem PDF? <a href="#tools" className="wf-prep-link">Clean it first</a></div>
                  </div>
                </div>
                <div className="wf-input-card">
                  <div className="wf-input-icon">🎙️</div>
                  <div>
                    <div className="wf-input-label">Dictated audio</div>
                    <div className="wf-input-sub">Long recording? <a href="#tools" className="wf-prep-link">Split it first</a></div>
                  </div>
                </div>
              </div>
              <div className="wf-mid">
                <div className="wf-gear">IT</div>
                <small>InventoryTools</small>
              </div>
              <div className="doc-out">
                <div className="doc-head"><span>report.docx</span><span className="docx-chip">DOCX</span></div>
                <div className="doc-body">
                  <div className="doc-row hdr"><span>Item</span><span>Description</span><span>Condition</span></div>
                  <div className="doc-row"><span>Walls</span><span>Painted white emulsion</span><span>Good order</span></div>
                  <div className="doc-row"><span>Flooring</span><span>Grey wood-effect laminate</span><span>Light wear</span></div>
                  <div className="doc-row"><span>Window</span><span>White UPVC double-glazed</span><span>Clean</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="tools">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">THE FULL TOOLKIT</span>
            <h2>Everything between the inspection and the finished report.</h2>
            <p>Use one tool on its own, or combine them into a complete workflow.</p>
          </div>
          <div className="grid-4">
            <div className="glass-card tool-card">
              <div className="tool-num">01 — Convert</div>
              <h3>PDF to Word</h3>
              <p>Rebuild an existing inventory report. Upload a PDF or Word file and convert it into a clean, editable document using your chosen inventory layout.</p>
              <ul>
                <li>Handles scanned and awkward reports</li>
                <li>Rebuilds rooms, items, descriptions and conditions</li>
                <li>Produces an editable Word document</li>
              </ul>
              <div className="tool-foot">
                <div className="tool-price">From £4.00<small> per report</small></div>
                <Link className="btn btn-primary" style={{ padding: '9px 18px', fontSize: '.88rem', borderRadius: 10 }} href="/auth">Convert a report</Link>
              </div>
            </div>

            <div className="glass-card tool-card">
              <div className="tool-badge">Exclusive</div>
              <div className="tool-num">02 — Convert</div>
              <h3>Audio to Word</h3>
              <p>Turn inspection dictation into the report. Dictate the property room by room, and InventoryTools converts your spoken notes into a structured inventory document.</p>
              <ul>
                <li>Understands room-by-room dictation</li>
                <li>Separates items, descriptions and conditions</li>
                <li>Handles corrections, repetitions and spoken formatting</li>
              </ul>
              <div className="tool-foot">
                <div className="tool-price">From £4.88<small> per report</small></div>
                <Link className="btn btn-primary" style={{ padding: '9px 18px', fontSize: '.88rem', borderRadius: 10 }} href="/auth">Convert inspection audio</Link>
              </div>
            </div>

            <div className="glass-card tool-card">
              <div className="tool-badge free">Free</div>
              <div className="tool-num">03 — Prepare</div>
              <h3>Audio Splitter</h3>
              <p>Turn one long recording into separate room files. View the waveform, mark each room, name the sections, and export files ready for Audio to Word.</p>
              <ul>
                <li>Visual waveform editor</li>
                <li>Name every room</li>
                <li>Download individual files</li>
              </ul>
              <div className="tool-foot">
                <div className="tool-price free">Free</div>
                <Link className="btn btn-secondary" style={{ padding: '9px 18px', fontSize: '.88rem', borderRadius: 10 }} href="/auth">Split a recording</Link>
              </div>
            </div>

            <div className="glass-card tool-card">
              <div className="tool-badge free">Free</div>
              <div className="tool-num">04 — Prepare</div>
              <h3>Clean &amp; Unlock PDF</h3>
              <p>Repair PDFs that can&apos;t be processed properly. Remove troublesome security wrappers and create a clean copy before conversion.</p>
              <ul>
                <li>Helps prevent missing rooms and rows</li>
                <li>No password required for compatible files</li>
                <li>Download a cleaned PDF immediately</li>
              </ul>
              <div className="tool-foot">
                <div className="tool-price free">Free</div>
                <Link className="btn btn-secondary" style={{ padding: '9px 18px', fontSize: '.88rem', borderRadius: 10 }} href="/auth">Clean a PDF</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">CONNECTED, NOT SEPARATE</span>
            <h2>Start with whatever you have.</h2>
            <p>The four tools are built to work together, not as four unrelated products.</p>
          </div>
          <div className="route-grid">
            <div className="glass-card route-panel">
              <span className="eyebrow">ROUTE A — EXISTING REPORT</span>
              <div className="route-steps">
                <div className="route-step"><div className="route-step-num">1</div><div><div className="route-step-label">Problem PDF</div><div className="route-step-sub">Locked, corrupted, or won&apos;t read cleanly</div></div></div>
                <div className="route-arrow-down">↓</div>
                <div className="route-step"><div className="route-step-num">2</div><div><div className="route-step-label">Clean &amp; Unlock</div><div className="route-step-sub">Repair a clean, readable copy</div></div></div>
                <div className="route-arrow-down">↓</div>
                <div className="route-step"><div className="route-step-num">3</div><div><div className="route-step-label">PDF to Word</div><div className="route-step-sub">Rebuild it into a structured report</div></div></div>
                <div className="route-arrow-down">↓</div>
                <div className="route-step"><div className="route-step-num">4</div><div><div className="route-step-label">Review and send</div><div className="route-step-sub">Check it, tweak it, done</div></div></div>
              </div>
            </div>
            <div className="glass-card route-panel">
              <span className="eyebrow">ROUTE B — DICTATED INSPECTION</span>
              <div className="route-steps">
                <div className="route-step"><div className="route-step-num">1</div><div><div className="route-step-label">Long recording</div><div className="route-step-sub">Whole property, one continuous file</div></div></div>
                <div className="route-arrow-down">↓</div>
                <div className="route-step"><div className="route-step-num">2</div><div><div className="route-step-label">Audio Splitter</div><div className="route-step-sub">Mark and name each room</div></div></div>
                <div className="route-arrow-down">↓</div>
                <div className="route-step"><div className="route-step-num">3</div><div><div className="route-step-label">Audio to Word</div><div className="route-step-sub">Convert each room&apos;s recording</div></div></div>
                <div className="route-arrow-down">↓</div>
                <div className="route-step"><div className="route-step-num">4</div><div><div className="route-step-label">Review and send</div><div className="route-step-sub">Check it, tweak it, done</div></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">SEE IT IN ACTION</span>
            <h2>InventoryTools rebuilds the report — not just the file.</h2>
          </div>
          <div className="demo-tabs">
            <button className={demoTab === 'pdf' ? 'active' : ''} onClick={() => setDemoTab('pdf')}>PDF report</button>
            <button className={demoTab === 'audio' ? 'active' : ''} onClick={() => setDemoTab('audio')}>Audio dictation</button>
            <button className={demoTab === 'long' ? 'active' : ''} onClick={() => setDemoTab('long')}>Long recording</button>
            <button className={demoTab === 'locked' ? 'active' : ''} onClick={() => setDemoTab('locked')}>Locked PDF</button>
          </div>
          <div className="glass-card demo-panel">
            <div className="ipo-row">
              <div className="ipo-card"><span className="mini-label">Input</span><strong>{activeDemo.input}</strong><span style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{activeDemo.inputSub}</span></div>
              <div className="ipo-arrow">→</div>
              <div className="ipo-card"><span className="mini-label">Process</span><strong>{activeDemo.process}</strong></div>
              <div className="ipo-arrow">→</div>
              <div className="ipo-card"><span className="mini-label">Output</span><strong>{activeDemo.output}</strong></div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">WHY IT HELPS</span>
            <h2>Finish the report while the inspection is still fresh.</h2>
          </div>
          <div className="benefit-grid">
            <div className="glass-card benefit-card"><div className="benefit-icon">⏱️</div><h3>Save hours</h3><p>Review the output instead of rebuilding the report manually.</p></div>
            <div className="glass-card benefit-card"><div className="benefit-icon">📈</div><h3>Increase capacity</h3><p>Complete more inspections without creating a typing backlog.</p></div>
            <div className="glass-card benefit-card"><div className="benefit-icon">🔒</div><h3>Keep control</h3><p>Every converted report remains fully editable in Word.</p></div>
            <div className="glass-card benefit-card"><div className="benefit-icon">🛠️</div><h3>Remove file problems</h3><p>Prepare long recordings and difficult PDFs before converting them.</p></div>
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">BUILT BY INVENTORY PROFESSIONALS</span>
            <h2>Built and tested inside a working inventory company.</h2>
          </div>
          <div className="glass-card evidence-panel">
            <p>Built around real UK inventory reports, inspection language, and room-by-room working practices.</p>
          </div>
        </div>
      </section>

      <section id="pricing">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">PRICING</span>
            <h2>Pay for conversions. Use preparation tools free.</h2>
          </div>
          <div className="glass-card pricing-table-wrap">
            <div className="pricing-row"><span className="name">PDF to Word</span><span className="price">From £4.00</span></div>
            <div className="pricing-row"><span className="name">Audio to Word</span><span className="price">From £4.88</span></div>
            <div className="pricing-row"><span className="name">Audio Splitter</span><span className="price free">Free</span></div>
            <div className="pricing-row"><span className="name">Clean &amp; Unlock PDF</span><span className="price free">Free</span></div>
          </div>
          <div className="pricing-notes">
            <span>No subscription</span><span>Shared company balances</span><span>Credits do not expire</span><span>Fully editable Word output</span>
          </div>
          <div className="pricing-ctas">
            <Link className="btn btn-primary" href="/auth">Create an account</Link>
            <a className="btn btn-secondary" href="#tools">View detailed pricing</a>
          </div>
        </div>
      </section>

      <section id="teams">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">SOLO OR AS A TEAM</span>
            <h2>Built for individual clerks and busy inventory teams.</h2>
          </div>
          <div className="team-grid">
            <div className="glass-card team-card">
              <h3>Independent clerks</h3>
              <ul>
                <li>Pay only when needed</li>
                <li>No monthly commitment</li>
                <li>Reduce evening typing</li>
                <li>Use from any modern browser</li>
              </ul>
            </div>
            <div className="glass-card team-card">
              <h3>Companies and teams</h3>
              <ul>
                <li>Shared company balance</li>
                <li>Multiple users</li>
                <li>Consistent report structure</li>
                <li>Support during high-volume periods</li>
              </ul>
            </div>
          </div>
          <div className="team-cta"><Link className="btn btn-navy" href="/auth">Use InventoryTools with your team</Link></div>
        </div>
      </section>

      <section id="faq">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">QUESTIONS</span>
            <h2>Frequently asked questions</h2>
          </div>
          <div className="faq-list">
            {faqs.map((f, i) => (
              <div key={i} className={`faq-item glass-card${openFaq === i ? ' open' : ''}`}>
                <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{f.q}</span>
                  <span className="pm">+</span>
                </button>
                <div className="faq-a"><p>{f.a}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="final">
        <div className="container">
          <span className="eyebrow" style={{ color: '#ff9c52' }}>READY WHEN YOU ARE</span>
          <h2>Your inspection is finished. Your report should be too.</h2>
          <p>Choose the material you already have and let InventoryTools prepare, structure, and convert it into an editable report.</p>
          <div className="final-ctas">
            <Link className="btn btn-primary" href="/auth">Convert a report</Link>
            <Link className="btn btn-secondary" href="/auth">Convert inspection audio</Link>
          </div>
          <p className="final-note">Audio Splitter and Clean &amp; Unlock PDF are available free inside your account.</p>
        </div>
      </section>

      <footer>
        <div className="container foot-row">
          <span>inventorytools</span>
          <span className="foot-price"><b>PDF from £4.00</b> · <b>Audio from £4.88</b> · Splitter &amp; Clean PDF free</span>
          <div>
            <a href="#how">How it works</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link>
          </div>
        </div>
      </footer>

      </div>
    </>
  )
}
