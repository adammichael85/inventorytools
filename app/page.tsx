'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

function CountUp({ value, formatter }: { value: number, formatter?: (n: number) => string }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start: number | null = null
    let raf: number
    const duration = 1200
    function step(timestamp: number) {
      if (start === null) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    if (value > 0) raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{formatter ? formatter(display) : display}</>
}

export default function Home() {
  const [heroTab, setHeroTab] = useState<'pdf' | 'audio'>('pdf')
  const [hiwTab, setHiwTab] = useState<'pdf' | 'audio'>('pdf')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [reports, setReports] = useState(10)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    // Using fixed showcase stats
    setStats({
      pdf: { total_reports: 3800, total_rooms: 41500, avg_conversion_seconds: 102, avg_rating: 4.9, rating_count: 120 },
      audio: { total_reports: 820, total_audio_seconds: 37861, total_convert_seconds: 1377, avg_rating: 4.8, rating_count: 95 },
    })
  }, [])

  const faqs = [
    { q: 'What can I upload?', a: "PDF inventory reports, Word documents, and dictated inspection audio recordings. If you're not sure your file will work, try it on one report — that's what pay-per-use is for." },
    { q: 'What is PDF to Word conversion?', a: 'Upload an existing inventory report as a PDF or Word file, and InventoryTools rebuilds it into a clean, professionally formatted, editable Word document — rooms, items, descriptions and conditions structured properly.' },
    { q: 'What is Audio to Word conversion?', a: 'Dictate your inspection room by room, upload the audio, and InventoryTools turns your spoken notes into a structured Word inventory report. No typing.' },
    { q: 'Is this only for inventory reports?', a: "Yes — and that's the point. InventoryTools is built specifically around UK inventory report structure, which is why the output is usable rather than a generic text dump." },
    { q: 'Can I edit the Word document afterwards?', a: "Completely. You get a normal, fully editable Word file. It's your report — change anything you like before sending." },
    { q: 'Do I need a subscription?', a: "No. You pay per conversion. No monthly fee, no commitment, and your credits don't expire." },
    { q: 'How much does it cost?', a: 'PDF conversion from £4.00 per report. Audio conversion from £4.88 per report.' },
    { q: 'Is this better than a normal PDF converter?', a: "A normal converter changes the file format and usually breaks the layout. InventoryTools rebuilds the report itself — room-by-room structure, items, descriptions and conditions — into a clean Word document." },
    { q: 'Do I still need to review the report?', a: "Yes, and you should. InventoryTools is designed to give you a report that's ready to review, not one you have to rebuild. You check it, tweak anything you want, and send it." },
    { q: 'Who is InventoryTools for?', a: 'UK inventory clerks, independent inventory professionals, letting agents, property managers, and agencies handling high report volumes.' },
    { q: 'Can agencies use it for multiple reports?', a: "Yes. Teams can share a company balance and convert as many reports as they need — it's built for busy periods." },
    { q: 'Is my data handled securely?', a: 'Your documents and audio files are handled securely during processing, and your reports stay yours.' },
  ]

  const css = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap');
:root{--ink:#1a1a1a;--body:#4a4a4a;--muted:#8a8a8a;--bg:#ffffff;--bg-alt:#f6f5f3;--orange:#fd6a02;--orange-hover:#e05e00;--orange-tint:#fff1e6;--border:#ecebe8;--green:#3e8e5a;--red:#d64545;--red-tint:#fbeaea;--radius:18px;--shadow:0 8px 30px rgba(26,26,26,.07)}
*{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth}
body{font-family:'Inter',sans-serif;color:var(--body);background:var(--bg);font-size:17px;line-height:1.6;-webkit-font-smoothing:antialiased}
h1,h2,h3{font-family:'Space Grotesk',sans-serif;color:var(--ink);line-height:1.12;letter-spacing:-.02em}
h1{font-size:clamp(2.4rem,5.5vw,4.2rem);font-weight:700}h2{font-size:clamp(1.8rem,3.6vw,2.7rem);font-weight:700}h3{font-size:1.25rem;font-weight:600}
.container{max-width:1140px;margin:0 auto;padding:0 24px}section{padding:104px 0}
.eyebrow{font-family:'IBM Plex Mono',monospace;font-size:.75rem;letter-spacing:.14em;color:var(--orange);font-weight:500;text-transform:uppercase;display:block;margin-bottom:16px}
.section-head{text-align:center;max-width:680px;margin:0 auto 56px}.section-head p{margin-top:14px;font-size:1.05rem}
.btn{display:inline-flex;align-items:center;gap:8px;font-family:'Inter',sans-serif;font-weight:600;font-size:1rem;padding:14px 26px;border-radius:12px;cursor:pointer;text-decoration:none;border:1px solid transparent;transition:transform .15s ease,background .15s ease,box-shadow .15s ease}
.btn-primary{background:var(--orange);color:#fff}.btn-primary:hover{background:var(--orange-hover);transform:translateY(-1px);box-shadow:0 6px 18px rgba(253,106,2,.3)}
.btn-secondary{background:#fff;color:var(--ink);border-color:#d8d6d2}.btn-secondary:hover{border-color:var(--ink)}
.arrow{font-weight:700}.tick{color:var(--green);font-weight:700}.cross{color:#c2c0bc;font-weight:600}
header{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.92);backdrop-filter:blur(10px);border-bottom:1px solid var(--border)}
.nav{display:flex;align-items:center;justify-content:space-between;height:68px}
.logo{display:flex;align-items:center;gap:10px;text-decoration:none}
.logo-mark{width:34px;height:34px;background:var(--orange);border-radius:9px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:1.1rem;font-family:'Space Grotesk'}
.logo-text{font-family:'Space Grotesk';font-weight:700;font-size:1.12rem;color:var(--ink)}.logo-text span{color:var(--orange)}
.nav-links{display:flex;gap:28px;list-style:none}.nav-links a{text-decoration:none;color:var(--body);font-size:.93rem;font-weight:500}.nav-links a:hover{color:var(--ink)}
.nav-right{display:flex;align-items:center;gap:18px}.nav-right .login{text-decoration:none;color:var(--body);font-weight:500;font-size:.93rem}.nav-right .btn{padding:8px 16px;font-size:.93rem;border-radius:9px}
.hamburger{display:none;background:none;border:none;font-size:1.6rem;cursor:pointer;color:var(--ink)}
.mobile-menu{display:none;position:fixed;top:68px;left:0;right:0;background:#fff;border-bottom:1px solid var(--border);padding:18px 24px;box-shadow:0 12px 24px rgba(26,26,26,.08);z-index:99}
.mobile-menu a{display:block;padding:11px 0;text-decoration:none;color:var(--ink);font-weight:600;border-bottom:1px solid var(--bg-alt)}
.mobile-menu.open{display:block}
.hero{padding:88px 0 96px;text-align:center;background:radial-gradient(1200px 500px at 50% -10%,var(--orange-tint),transparent 65%)}
.hero .eyebrow{display:inline-block;background:var(--orange-tint);padding:7px 16px;border-radius:100px;margin-bottom:26px}
.hero h1{max-width:820px;margin:0 auto 22px}.hero .sub{max-width:640px;margin:0 auto 34px;font-size:1.12rem}
.hero-ctas{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-bottom:26px}
.badges{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:58px}
.badge{font-size:.82rem;font-weight:600;color:var(--ink);background:#fff;border:1px solid var(--border);padding:7px 14px;border-radius:100px;box-shadow:0 2px 8px rgba(26,26,26,.04)}.badge b{color:var(--orange)}
.demo-panel{background:#fff;border:1px solid var(--border);border-radius:24px;box-shadow:var(--shadow);padding:28px;max-width:1000px;margin:0 auto;text-align:left}
.toggle{display:inline-flex;background:var(--bg-alt);border-radius:100px;padding:5px;margin:0 auto 26px;gap:4px}.toggle-wrap{text-align:center}
.toggle button{border:none;background:transparent;font-family:'Inter';font-weight:600;font-size:.92rem;padding:9px 22px;border-radius:100px;cursor:pointer;color:var(--body);transition:all .15s}
.toggle button.active{background:var(--ink);color:#fff}
.flow{display:grid;grid-template-columns:1fr auto 1fr;gap:22px;align-items:center}.flow-col{display:flex;flex-direction:column;gap:12px}
.mini-card{border:1px solid var(--border);border-radius:14px;padding:16px;background:#fdfdfc;transition:opacity .3s,border-color .3s}
.mini-card.dim{opacity:.35}.mini-card.hot{border-color:var(--orange);box-shadow:0 0 0 3px var(--orange-tint)}
.mini-label{font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
.pdf-mess{display:flex;flex-direction:column;gap:5px}.pdf-mess span{height:7px;border-radius:3px;background:#e5e3df}
.pdf-mess span:nth-child(1){width:82%}.pdf-mess span:nth-child(2){width:60%;background:var(--red-tint)}.pdf-mess span:nth-child(3){width:95%}.pdf-mess span:nth-child(4){width:45%;background:var(--red-tint)}.pdf-mess span:nth-child(5){width:70%}
.wave{display:flex;align-items:center;gap:3px;height:38px;width:100%}.wave i{flex:1}
.wave i{width:4px;background:var(--orange);border-radius:2px;display:block;animation:wave 1.1s ease-in-out infinite;height:100%}
@keyframes wave{0%,100%{transform:scaleY(.4)}50%{transform:scaleY(1)}}
.wave i:nth-child(2n){animation-delay:.15s}.wave i:nth-child(3n){animation-delay:.3s}.wave i:nth-child(4n){animation-delay:.45s}
.flow-mid{display:flex;flex-direction:column;align-items:center;gap:10px;min-width:130px}
.gear{width:56px;height:56px;border-radius:16px;background:var(--orange);color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk';font-weight:800;font-size:1.4rem;animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(253,106,2,.35)}50%{box-shadow:0 0 0 14px rgba(253,106,2,0)}}
.flow-mid small{font-size:.75rem;color:var(--muted);text-align:center;font-weight:600}
.doc-out{border:1px solid var(--border);border-radius:14px;background:#fff;overflow:hidden;box-shadow:0 4px 16px rgba(26,26,26,.06)}
.doc-head{background:var(--bg-alt);padding:11px 16px;font-size:.78rem;font-weight:700;color:var(--ink);display:flex;justify-content:space-between;align-items:center}
.docx-chip{background:#2b5797;color:#fff;font-size:.65rem;padding:3px 8px;border-radius:5px;letter-spacing:.05em}
.doc-body{padding:14px 16px;font-size:.78rem}.doc-room{font-weight:700;color:var(--ink);margin-bottom:7px;font-family:'Space Grotesk'}
.doc-row{display:grid;grid-template-columns:1.1fr 1.7fr 1fr;gap:8px;padding:5px 0;border-bottom:1px solid var(--bg-alt)}
.doc-row.hdr{color:var(--muted);font-weight:700;font-size:.68rem;text-transform:uppercase;letter-spacing:.05em}
.alt{background:var(--bg-alt)}.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.card{background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:26px;transition:box-shadow .2s,transform .2s}
.card:hover{box-shadow:var(--shadow);transform:translateY(-2px)}
.icon-chip{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.25rem;margin-bottom:16px;background:var(--orange-tint)}
.icon-chip.red{background:var(--red-tint)}.card h3{margin-bottom:8px;font-size:1.08rem}.card p{font-size:.93rem}
.split{display:grid;grid-template-columns:1.05fr 1fr;gap:56px;align-items:center}
.route{display:flex;gap:16px;margin-top:26px}.route-icon{flex-shrink:0;width:46px;height:46px;border-radius:12px;background:var(--orange-tint);display:flex;align-items:center;justify-content:center;font-size:1.3rem}
.route h3{margin-bottom:6px}.route p{font-size:.95rem}
.pull{margin-top:38px;border-left:4px solid var(--orange);padding:6px 0 6px 22px;font-family:'Space Grotesk';font-size:1.3rem;color:var(--ink);line-height:1.35}.pull b{color:var(--orange)}
.solution-diagram{background:var(--bg-alt);border-radius:24px;padding:32px;display:flex;flex-direction:column;gap:14px;align-items:center}
.solution-diagram .mini-card{width:100%;background:#fff}.solution-diagram .arrow-down{color:var(--orange);font-size:1.5rem;font-weight:700}
.product-grid{display:grid;grid-template-columns:1fr 1fr;gap:26px}
.product{background:#fff;border:1px solid var(--border);border-radius:24px;padding:38px;position:relative;display:flex;flex-direction:column}
.product.standout{border:2px solid var(--orange);box-shadow:0 12px 40px rgba(253,106,2,.12)}
.ribbon{position:absolute;top:-13px;left:38px;background:var(--orange);color:#fff;font-size:.7rem;font-weight:700;letter-spacing:.1em;padding:6px 14px;border-radius:100px;text-transform:uppercase}
.product .eyebrow{margin-bottom:10px}.product h3{font-size:1.6rem;margin-bottom:12px}.product > p{font-size:.98rem;margin-bottom:22px}
.product ul{list-style:none;margin-bottom:26px;display:flex;flex-direction:column;gap:11px}
.product li{display:flex;gap:10px;font-size:.94rem;align-items:flex-start}.product li::before{content:"✓";color:var(--green);font-weight:700;flex-shrink:0}
.product-foot{margin-top:auto;display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
.price{font-family:'Space Grotesk';font-weight:700;font-size:1.3rem;color:var(--ink)}.price small{font-size:.8rem;color:var(--muted);font-family:'Inter';font-weight:500}
.only-line{margin-top:16px;font-size:.85rem;color:var(--orange);font-weight:600}
.ba-grid{display:grid;grid-template-columns:1fr auto 1fr;gap:24px;align-items:stretch}
.ba-panel{background:#fff;border:1px solid var(--border);border-radius:20px;overflow:hidden;display:flex;flex-direction:column}
.ba-head{padding:13px 20px;font-weight:700;font-size:.8rem;letter-spacing:.1em;text-transform:uppercase}
.ba-head.before{background:var(--red-tint);color:var(--red)}.ba-head.after{background:var(--orange-tint);color:var(--orange)}
.ba-body{padding:22px;flex:1;display:flex;flex-direction:column;gap:14px}
.chips{display:flex;gap:8px;flex-wrap:wrap}.chip{font-size:.76rem;font-weight:600;padding:5px 12px;border-radius:100px;background:var(--bg-alt);color:var(--body)}
.chip.bad{background:var(--red-tint);color:var(--red)}.chip.good{background:var(--orange-tint);color:var(--orange)}
.ba-mid{display:flex;align-items:center;justify-content:center;color:var(--orange);font-size:2rem;font-weight:800}.ba-cta{text-align:center;margin-top:44px}
.tabs{display:flex;justify-content:center;gap:6px;background:var(--bg-alt);border-radius:100px;padding:5px;width:max-content;margin:0 auto 46px}
.tabs button{border:none;background:transparent;font-family:'Inter';font-weight:600;font-size:.95rem;padding:11px 26px;border-radius:100px;cursor:pointer;color:var(--body)}
.tabs button.active{background:var(--ink);color:#fff}
.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}.step{text-align:center;padding:0 8px}
.step-num{width:46px;height:46px;border-radius:50%;background:var(--orange);color:#fff;font-family:'Space Grotesk';font-weight:700;font-size:1.15rem;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
.step h3{font-size:1.02rem;margin-bottom:6px}.step p{font-size:.88rem}.hiw-foot{text-align:center;margin-top:44px;font-weight:600;color:var(--ink)}
.grid-3.tight .card{padding:22px}.grid-3.tight h3{font-size:1rem}.grid-3.tight p{font-size:.88rem}.grid-3.tight .icon-chip{width:38px;height:38px;font-size:1.05rem;margin-bottom:12px}
.table-wrap{overflow-x:auto;border-radius:20px;border:1px solid var(--border);box-shadow:var(--shadow);position:relative}.table-scroll-hint{display:none;text-align:right;font-size:.75rem;color:var(--muted);font-weight:600;padding:6px 4px 0;letter-spacing:.03em}
table{width:100%;border-collapse:collapse;background:#fff;min-width:760px}
th,td{padding:15px 18px;text-align:center;font-size:.9rem;border-bottom:1px solid var(--bg-alt)}
th{font-family:'Space Grotesk';font-weight:600;color:var(--ink);font-size:.92rem}
td:first-child,th:first-child{text-align:left;font-weight:600;color:var(--ink)}tr:last-child td{border-bottom:none}
.it-col{background:var(--orange-tint)}th.it-col{background:var(--orange);color:#fff}
.table-line{text-align:center;margin-top:40px;font-family:'Space Grotesk';font-size:1.35rem;color:var(--ink)}.table-line b{color:var(--orange)}
.receipt{background:#fff;border:1px solid var(--border);border-radius:20px;padding:30px;box-shadow:var(--shadow)}
.receipt-row{display:flex;justify-content:space-between;padding:13px 0;border-bottom:1px dashed var(--border);font-size:.95rem}
.receipt-row:last-child{border-bottom:none;font-weight:700;color:var(--ink)}.receipt-row b{color:var(--ink)}
.calc{background:#fff;border:1px solid var(--border);border-radius:20px;padding:30px;box-shadow:var(--shadow)}
.calc label{font-weight:600;color:var(--ink);font-size:.95rem;display:block;margin-bottom:14px}
.calc input[type=range]{width:100%;accent-color:var(--orange);margin-bottom:18px;cursor:pointer}
.calc-out{font-family:'Space Grotesk';font-size:1.5rem;color:var(--ink)}.calc-out b{color:var(--orange)}
.calc small{display:block;margin-top:12px;color:var(--muted);font-size:.78rem}
.pricing-grid{display:grid;grid-template-columns:1fr 1fr;gap:26px;max-width:820px;margin:0 auto}
.price-card{background:#fff;border:1px solid var(--border);border-radius:24px;padding:38px;text-align:center;position:relative;display:flex;flex-direction:column;gap:16px}
.price-card.standout{border:2px solid var(--orange);box-shadow:0 12px 40px rgba(253,106,2,.12)}
.price-card .ribbon{left:50%;transform:translateX(-50%)}
.price-big{font-family:'Space Grotesk';font-weight:700;font-size:2.4rem;color:var(--ink)}.price-big small{font-size:.95rem;color:var(--muted);font-weight:500;font-family:'Inter'}
.price-card p{font-size:.92rem}.price-card .btn{margin-top:auto;justify-content:center}
.reassure{display:flex;justify-content:center;gap:26px;flex-wrap:wrap;margin-top:44px;font-size:.9rem;font-weight:600;color:var(--ink)}.reassure span::before{content:"✓ ";color:var(--green)}
.trust-list{list-style:none;margin-top:26px;display:flex;flex-direction:column;gap:13px}
.trust-list li{display:flex;gap:11px;font-size:.97rem;align-items:flex-start}.trust-list li::before{content:"✓";color:var(--green);font-weight:700;flex-shrink:0}
.trust-side{display:flex;flex-direction:column;gap:16px}.stat-card{background:#fff;border:1px solid var(--border);border-radius:18px;padding:24px;box-shadow:var(--shadow)}
.stat-card .big{font-family:'Space Grotesk';font-size:2rem;font-weight:700;color:var(--orange)}.stat-card p{font-size:.85rem;margin-top:4px}
.faq-list{max-width:740px;margin:0 auto;display:flex;flex-direction:column;gap:12px}
.faq-item{background:#fff;border:1px solid var(--border);border-radius:14px;overflow:hidden}
.faq-q{width:100%;background:none;border:none;font-family:'Inter';font-weight:600;font-size:1rem;color:var(--ink);padding:19px 22px;text-align:left;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:14px}
.faq-q .pm{color:var(--orange);font-size:1.3rem;font-weight:700;transition:transform .2s;flex-shrink:0}
.faq-item.open .pm{transform:rotate(45deg)}
.faq-a{overflow:hidden;transition:max-height .3s ease}.faq-a p{padding:0 22px 20px;font-size:.94rem}
.final{background:var(--ink);color:#d8d6d2;text-align:center;padding:104px 0}
.final h2{color:#fff;max-width:700px;margin:0 auto 18px}.final p{max-width:560px;margin:0 auto 34px;font-size:1.05rem}
.final .btn-secondary{background:transparent;color:#fff;border-color:#5a5a5a}.final .btn-secondary:hover{border-color:#fff}
footer{background:var(--ink);border-top:1px solid #2e2e2e;padding:34px 0;color:#9a9a9a;font-size:.85rem}
.foot-row{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}
.foot-row a{color:#c8c8c8;text-decoration:none;margin-left:20px}.foot-row a:hover{color:#fff}
.foot-price{color:#c8c8c8}.foot-price b{color:#fff}
@media(max-width:960px){.grid-3{grid-template-columns:repeat(2,1fr)}.split{grid-template-columns:1fr;gap:40px}.steps{grid-template-columns:repeat(2,1fr);row-gap:34px}.flow{grid-template-columns:1fr;gap:14px}.flow-mid{flex-direction:row;justify-content:center}.ba-grid{grid-template-columns:1fr}.ba-mid{transform:rotate(90deg);padding:4px 0}}
@media(max-width:720px){section{padding:48px 0}h2{font-size:1.6rem}.container{padding:0 18px}.nav-links,.nav-right .login{display:none}.nav-right .btn{display:none}.hamburger{display:block}.grid-3{grid-template-columns:1fr}.product-grid,.pricing-grid{grid-template-columns:1fr}.product.standout{order:-1}.steps{grid-template-columns:1fr}.hero{padding:40px 0 48px;text-align:center}.hero h1{font-size:1.85rem;letter-spacing:-.03em}.hero .sub{font-size:.95rem;margin-bottom:24px}.hero-ctas{flex-direction:column;align-items:stretch;gap:10px;margin-bottom:18px}.hero-ctas .btn{width:100%;justify-content:center;padding:13px 20px}.badges{gap:6px;margin-bottom:32px}.badge{font-size:.72rem;padding:5px 10px}.toggle-wrap{margin-bottom:16px}.toggle button{padding:8px 16px;font-size:.82rem}.demo-panel{padding:14px;border-radius:16px}.flow{gap:10px}.mini-card{padding:12px}.mini-label{font-size:.65rem}.doc-head{font-size:.7rem;padding:9px 12px}.doc-body{padding:10px 12px;font-size:.7rem}.doc-room{font-size:.8rem;margin-bottom:5px}.doc-row{grid-template-columns:1fr 1.4fr .9fr;gap:3px;padding:4px 0}.docx-chip{font-size:.58rem;padding:2px 6px}.flow-mid{flex-direction:row;justify-content:center;gap:12px;min-width:unset}.gear{width:44px;height:44px;font-size:1.2rem}.flow-mid small{font-size:.68rem}.section-head{margin-bottom:28px}.section-head p{font-size:.95rem}.eyebrow{font-size:.68rem}.split{grid-template-columns:1fr;gap:32px}.route{gap:12px}.route-icon{width:38px;height:38px;font-size:1.1rem}.pull{font-size:1rem;padding:6px 0 6px 16px}.solution-diagram{padding:20px;gap:10px}.product{padding:20px}.product h3{font-size:1.25rem;margin-bottom:10px}.product>p{font-size:.9rem;margin-bottom:16px}.product ul{margin-bottom:18px;gap:8px}.product li{font-size:.88rem}.product-foot{flex-direction:column;align-items:stretch;gap:10px}.product-foot .btn{width:100%;justify-content:center}.price{font-size:1.1rem}.only-line{font-size:.8rem}.ba-grid{grid-template-columns:1fr;gap:12px}.ba-mid{transform:rotate(90deg);padding:2px 0;font-size:1.5rem}.ba-head{padding:10px 14px;font-size:.72rem}.ba-body{padding:14px;gap:10px}.chips{gap:6px}.chip{font-size:.7rem;padding:4px 10px}.ba-cta{margin-top:28px}.tabs{width:100%;border-radius:12px;justify-content:stretch}.tabs button{flex:1;padding:9px 8px;font-size:.82rem}.step-num{width:38px;height:38px;font-size:1rem}.step h3{font-size:.95rem}.step p{font-size:.82rem}.hiw-foot{font-size:.88rem;margin-top:28px}.card{padding:18px}.icon-chip{width:36px;height:36px;font-size:1rem;margin-bottom:10px}.card h3{font-size:.95rem;margin-bottom:6px}.card p{font-size:.85rem}.table-wrap{border-radius:10px;font-size:.78rem}th,td{padding:9px 10px;font-size:.75rem}.table-line{font-size:.95rem;margin-top:24px}.receipt{padding:18px}.receipt-row{font-size:.85rem;padding:10px 0}.calc{padding:18px}.calc label{font-size:.88rem}.calc-out{font-size:1.2rem}.calc small{font-size:.72rem}.price-card{padding:24px}.price-big{font-size:1.7rem}.price-card p{font-size:.85rem}.reassure{gap:10px;font-size:.78rem}.trust-list li{font-size:.9rem}.stat-card{padding:18px}.stat-card .big{font-size:1.5rem}.faq-q{font-size:.9rem;padding:14px 16px}.faq-a p{padding:0 16px 16px;font-size:.88rem}.final{padding:56px 0}.final h2{font-size:1.5rem}.final p{font-size:.95rem}.final .btn{width:100%;justify-content:center;margin-bottom:10px}.hero-ctas .btn-secondary{margin-top:0}footer{padding:24px 0}.foot-row{flex-direction:column;text-align:center;gap:12px}.foot-row a{margin:0 8px}.foot-price{font-size:.78rem}}
@media(max-width:720px){.table-scroll-hint{display:block}.wave i{max-width:none}}@media(prefers-reduced-motion:reduce){.wave i,.gear{animation:none}html{scroll-behavior:auto}}
`

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <header>
        <div className="container nav">
          <a className="logo" href="#top" aria-label="InventoryTools home">
            <img src="/logo-full.png" alt="InventoryTools" style={{ height: 36, width: 'auto' }} />
          </a>
          <ul className="nav-links">
            <li><a href="#pdf-tool">PDF to Word</a></li>
            <li><a href="#audio-tool">Audio to Word</a></li>
            <li><a href="#how">How it works</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>
          <div className="nav-right">
            <Link className="login" href="/auth">Log in</Link>
            <Link className="btn btn-primary" href="/auth">Sign up <span className="arrow">→</span></Link>
            <button className="hamburger" aria-label="Open menu" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>☰</button>
          </div>
        </div>
        <nav className={`mobile-menu${mobileMenuOpen ? ' open' : ''}`}>
          {['#pdf-tool','#audio-tool','#how','#pricing','#faq'].map((href, i) => (
            <a key={href} href={href} onClick={() => setMobileMenuOpen(false)}>{['PDF to Word','Audio to Word','How it works','Pricing','FAQ'][i]}</a>
          ))}
          <Link href="/auth" onClick={() => setMobileMenuOpen(false)}>Log in</Link>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="container">
          <span className="eyebrow">● Built for UK inventory professionals</span>
          <h1>You did the inspection.<br />Don&apos;t type it twice.</h1>
          <p className="sub">Upload an existing PDF report — or your dictated inspection audio — and InventoryTools converts it into a clean, editable Word inventory document.</p>
          <div className="hero-ctas">
            <Link className="btn btn-primary" href="/auth">Convert a report <span className="arrow">→</span></Link>
            <Link className="btn btn-secondary" href="/auth">Try Audio to Word</Link>
          </div>
          <div className="badges">
            <span className="badge">PDF conversion <b>from £4.00</b></span>
            <span className="badge">Audio conversion <b>from £4.88</b></span>
            <span className="badge">Editable Word output</span>
            <span className="badge">Built for UK inventory reports</span>
          </div>
          <div className="toggle-wrap">
            <div className="toggle" role="tablist">
              <button className={heroTab === 'pdf' ? 'active' : ''} onClick={() => setHeroTab('pdf')}>PDF Report</button>
              <button className={heroTab === 'audio' ? 'active' : ''} onClick={() => setHeroTab('audio')}>Audio Dictation</button>
            </div>
          </div>
          <div className="demo-panel">
            <div className="flow">
              <div className="flow-col">
                <div className={`mini-card${heroTab === 'pdf' ? ' hot' : ' dim'}`}>
                  <div className="mini-label">📄 Another agency&apos;s PDF</div>
                  <div className="pdf-mess"><span /><span /><span /><span /><span /></div>
                </div>
                <div className={`mini-card${heroTab === 'audio' ? ' hot' : ' dim'}`}>
                  <div className="mini-label">🎙 Your inspection dictation · 14:32</div>
                  <div className="wave">{Array.from({length:24}).map((_,i)=><i key={i}/>)}</div>
                </div>
              </div>
              <div className="flow-mid">
                <div className="gear">✓</div>
                <small>{heroTab==='pdf'?'Rebuilt, not just converted':'Your voice, structured into a report'}</small>
              </div>
              <div className="flow-col">
                <div className="doc-out">
                  <div className="doc-head"><span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'calc(100% - 56px)',display:'block'}}>27 Granville Avenue — Inventory &amp; Schedule of Condition</span><span className="docx-chip">.DOCX</span></div>
                  <div className="doc-body">
                    <div className="doc-room">Kitchen</div>
                    <div className="doc-row hdr"><span>Item</span><span>Description</span><span>Condition</span></div>
                    <div className="doc-row"><span>Walls</span><span>Painted matt white emulsion</span><span>Good order</span></div>
                    <div className="doc-row"><span>Windowsill</span><span>White gloss painted timber</span><span>Light scuffs</span></div>
                    <div className="doc-row"><span>Flooring</span><span>Grey wood-effect laminate</span><span>Good order</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="alt">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">The second shift</span>
            <h2>Inventory work shouldn&apos;t mean a second shift at the desk.</h2>
            <p>You do the skilled work at the property. Then the unpaid work starts.</p>
          </div>
          <div className="grid-3">
            {[['⌨️','Typing up after every inspection','Hours at the keyboard rebuilding what you already recorded on site.'],['📄','Fixing messy PDFs','Copy, paste, un-mangle tables, repeat. For every page.'],['🔧',"Rebuilding another agency's report","Their ugly format, your template, your evening."],['⏳','Waiting on typists','Days of turnaround and an invoice at the end of it.'],['🌙','Evenings lost to admin','Skilled inspector by day, data-entry clerk by night.'],['📚','Backlogs in busy season',"Turning work away because the typing can't keep up."]].map(([icon,title,desc])=>(
              <div className="card" key={String(title)}><div className="icon-chip red">{icon}</div><h3>{title}</h3><p>{desc}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="container split">
          <div>
            <span className="eyebrow">Two ways in. One clean report out.</span>
            <h2>InventoryTools does the heavy report work for you.</h2>
            <div className="route"><div className="route-icon">📄</div><div><h3>Already have a report?</h3><p>Upload the PDF or Word file — even a messy one from another agency — and get back a clean, editable Word inventory document.</p></div></div>
            <div className="route"><div className="route-icon">🎙</div><div><h3>Just finished an inspection?</h3><p>Upload your dictated audio and InventoryTools turns your spoken notes into a structured, room-by-room Word report.</p></div></div>
            <div className="pull">PDF converters change the format. <b>InventoryTools rebuilds the report.</b></div>
          </div>
          <div className="solution-diagram" aria-hidden="true">
            <div className="mini-card"><div className="mini-label">📄 Messy PDF or Word report</div><div className="pdf-mess"><span/><span/><span/></div></div>
            <div className="mini-card"><div className="mini-label">🎙 Dictated inspection audio</div><div className="wave">{Array.from({length:14}).map((_,i)=><i key={i}/>)}</div></div>
            <div className="arrow-down">↓</div>
            <div className="mini-card" style={{borderColor:'var(--orange)'}}><div className="mini-label" style={{color:'var(--orange)'}}>✓ Clean, editable Word inventory report</div><div className="pdf-mess"><span style={{background:'#f5d9c2'}}/><span style={{background:'#f5d9c2',width:'88%'}}/><span style={{background:'#f5d9c2',width:'64%'}}/></div></div>
          </div>
        </div>
      </section>

      <section className="alt" id="pdf-tool">
        <div className="container">
          <div className="section-head"><span className="eyebrow">The tools</span><h2>Two tools. One job: your report, done.</h2></div>
          <div className="product-grid">
            <div className="product">
              <span className="eyebrow">Tool 1</span>
              <h3>PDF to Word Conversion</h3>
              <p><b>For existing reports.</b> Old inventories, other agencies&apos; documents, scanned PDFs, files that need cleaning and reformatting into your template.</p>
              <ul><li>Upload your PDF or Word report</li><li>InventoryTools restructures the content room by room</li><li>Download a clean, editable Word document</li></ul>
              <div className="product-foot"><span className="price">From £4.00 <small>/ report</small></span><Link className="btn btn-primary" href="/auth">Convert a PDF report <span className="arrow">→</span></Link></div>
            </div>
            <div className="product standout" id="audio-tool">
              <span className="ribbon">Standout · Only on InventoryTools</span>
              <span className="eyebrow">Tool 2</span>
              <h3>Audio to Word Conversion</h3>
              <p><b>For clerks who dictate.</b> Talk through the property room by room. InventoryTools turns your inspection audio into a structured inventory report — no typing at all.</p>
              <ul><li>Upload your dictated inspection audio</li><li>Your speech becomes report content — items, descriptions, conditions</li><li>Download a structured Word inventory document</li></ul>
              <div className="product-foot"><span className="price">From £4.88 <small>/ report</small></span><Link className="btn btn-primary" href="/auth">Convert audio to Word <span className="arrow">→</span></Link></div>
              <div className="only-line">Generic converters can&apos;t do this.</div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="section-head"><span className="eyebrow">The centrepiece</span><h2>From messy source to clean Word report.</h2></div>
          <div className="ba-grid">
            <div className="ba-panel">
              <div className="ba-head before">Before</div>
              <div className="ba-body">
                <div className="mini-card"><div className="mini-label">🎙 Or: 14 minutes of raw dictation</div><div className="wave">{Array.from({length:18}).map((_,i)=><i key={i}/>)}</div></div>
                <div className="chips"><span className="chip bad">Broken tables</span><span className="chip bad">Inconsistent layout</span><span className="chip bad">2–3 hours of retyping</span></div>
              </div>
            </div>
            <div className="ba-mid" aria-hidden="true">→</div>
            <div className="ba-panel">
              <div className="ba-head after">After</div>
              <div className="ba-body">
                <div className="doc-out">
                  <div className="doc-head"><span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'calc(100% - 56px)',display:'block'}}>Inventory &amp; Schedule of Condition</span><span className="docx-chip">.DOCX</span></div>
                  <div className="doc-body">
                    <div className="doc-room">Bedroom 1</div>
                    <div className="doc-row hdr"><span>Item</span><span>Description</span><span>Condition</span></div>
                    <div className="doc-row"><span>Ceiling</span><span>Smooth plaster, white emulsion</span><span>Good order</span></div>
                    <div className="doc-row"><span>Curtains</span><span>Grey lined eyelet pair</span><span>Clean, good order</span></div>
                    <div className="doc-row"><span>Carpet</span><span>Beige fitted carpet</span><span>Light wear to traffic areas</span></div>
                  </div>
                </div>
                <div className="chips"><span className="chip good">Room-by-room structure</span><span className="chip good">Editable Word document</span><span className="chip good">Professional layout</span></div>
              </div>
            </div>
          </div>
          <div className="ba-cta"><Link className="btn btn-primary" href="/auth">Try it on your next report <span className="arrow">→</span></Link></div>
        </div>
      </section>

      <section className="alt" id="how">
        <div className="container">
          <div className="section-head"><span className="eyebrow">How it works</span><h2>Upload. Convert. Review. Send.</h2></div>
          <div className="tabs" role="tablist">
            <button className={hiwTab==='pdf'?'active':''} onClick={()=>setHiwTab('pdf')}>PDF to Word</button>
            <button className={hiwTab==='audio'?'active':''} onClick={()=>setHiwTab('audio')}>Audio to Word</button>
          </div>
          {hiwTab==='pdf'?(
            <div className="steps">
              <div className="step"><div className="step-num">1</div><h3>Upload</h3><p>Your PDF or Word report</p></div>
              <div className="step"><div className="step-num">2</div><h3>Analyse</h3><p>InventoryTools analyses the report structure</p></div>
              <div className="step"><div className="step-num">3</div><h3>Download</h3><p>Your clean, editable Word report</p></div>
              <div className="step"><div className="step-num">4</div><h3>Review &amp; send</h3><p>You stay in control</p></div>
            </div>
          ):(
            <div className="steps">
              <div className="step"><div className="step-num">1</div><h3>Upload</h3><p>Your dictated inspection audio</p></div>
              <div className="step"><div className="step-num">2</div><h3>Process</h3><p>InventoryTools processes the dictation</p></div>
              <div className="step"><div className="step-num">3</div><h3>Structure</h3><p>Your notes become a Word inventory report</p></div>
              <div className="step"><div className="step-num">4</div><h3>Review &amp; send</h3><p>Edit if needed, then send</p></div>
            </div>
          )}
          <p className="hiw-foot">No setup. No training. If you can attach a file, you can use InventoryTools.</p>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="section-head"><span className="eyebrow">Why clerks switch</span><h2>Less paperwork. More of the actual job.</h2></div>
          <div className="grid-3 tight">
            {[['⏱','Save hours per report','Designed to turn report admin from hours into minutes.'],['🌆','Get evenings back','Stop finishing inspections at your desk at 10pm.'],['✍️','Less typing and formatting','Review a report instead of rebuilding it.'],['📈','Take on more work','Report writing stops being your capacity ceiling.'],['⚡','Faster turnaround','Same-day reports become realistic, even in busy periods.'],['🧾','Less reliance on typists','No waiting days, no per-report invoices from a third party.'],['📝','Editable Word output','Your document, fully editable. Never a locked export.'],['🏠','Built for inventory structure','Rooms, items, descriptions, conditions — preserved.'],['💷','Pay only when you use it','No subscription. No monthly commitment.']].map(([icon,title,desc])=>(
              <div className="card" key={String(title)}><div className="icon-chip">{icon}</div><h3>{title}</h3><p>{desc}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="alt">
        <div className="container">
          <div className="section-head"><span className="eyebrow">The difference</span><h2>Not another PDF converter.</h2></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th></th><th>Manual typing</th><th>Generic PDF converter</th><th>Typing service</th><th className="it-col">InventoryTools</th></tr></thead>
              <tbody>
                <tr><td>Converts PDF reports</td><td className="cross">—</td><td><span className="tick">✓</span> <small>format only</small></td><td className="tick">✓</td><td className="it-col tick">✓</td></tr>
                <tr><td>Converts dictated audio</td><td className="cross">—</td><td className="cross">✗</td><td><span className="tick">✓</span> <small>slow</small></td><td className="it-col tick">✓</td></tr>
                <tr><td>Built for inventory reports</td><td><span className="tick">✓</span> <small>you are</small></td><td className="cross">✗</td><td className="cross">✗</td><td className="it-col tick">✓</td></tr>
                <tr><td>Editable Word output</td><td className="tick">✓</td><td className="cross">✗ <small>often broken</small></td><td className="tick">✓</td><td className="it-col tick">✓</td></tr>
                <tr><td>Turnaround</td><td>Hours</td><td><small>Instant but unusable</small></td><td>Days</td><td className="it-col"><b>Minutes</b></td></tr>
                <tr><td>Preserves room / item / condition structure</td><td className="tick">✓</td><td className="cross">✗</td><td className="tick">✓</td><td className="it-col tick">✓</td></tr>
                <tr><td>No waiting on other people</td><td className="cross">✗</td><td className="tick">✓</td><td className="cross">✗</td><td className="it-col tick">✓</td></tr>
                <tr><td>Pay per use</td><td className="cross">—</td><td><small>Varies</small></td><td><small>Per report, £££</small></td><td className="it-col"><b>From £4.00</b></td></tr>
              </tbody>
            </table>
          </div>
          <p className="table-scroll-hint">← scroll to compare →</p>
          <p className="table-line">PDF converters change the format. <b>InventoryTools rebuilds the report.</b></p>
          <div className="section-head" style={{marginTop:96}}><span className="eyebrow">And for audio</span><h2>Not another transcription app.</h2></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th></th><th>Typing it yourself</th><th>Transcription app</th><th>Typing service</th><th className="it-col">InventoryTools</th></tr></thead>
              <tbody>
                <tr><td>Turns speech into text</td><td className="cross">—</td><td className="tick">✓</td><td className="tick">✓</td><td className="it-col tick">✓</td></tr>
                <tr><td>Understands inventory reports</td><td><span className="tick">✓</span> <small>you do</small></td><td className="cross">✗</td><td className="cross">✗</td><td className="it-col tick">✓</td></tr>
                <tr><td>Structures rooms, items &amp; conditions</td><td className="tick">✓</td><td className="cross">✗ <small>wall of text</small></td><td className="tick">✓</td><td className="it-col tick">✓</td></tr>
                <tr><td>Cleans up &quot;ums&quot;, repeats &amp; corrections</td><td className="tick">✓</td><td className="cross">✗</td><td className="tick">✓</td><td className="it-col tick">✓</td></tr>
                <tr><td>Outputs a formatted Word report</td><td><span className="tick">✓</span> <small>after hours</small></td><td className="cross">✗</td><td className="tick">✓</td><td className="it-col tick">✓</td></tr>
                <tr><td>Handles room-by-room dictation</td><td className="tick">✓</td><td className="cross">✗</td><td className="tick">✓</td><td className="it-col tick">✓</td></tr>
                <tr><td>Turnaround</td><td>Hours</td><td><small>Fast but still a transcript</small></td><td>Days</td><td className="it-col"><b>Minutes</b></td></tr>
                <tr><td>Pay per use</td><td className="cross">—</td><td><small>Monthly subscription</small></td><td><small>Per report, £££</small></td><td className="it-col"><b>From £4.88</b></td></tr>
              </tbody>
            </table>
          </div>
          <p className="table-scroll-hint">← scroll to compare →</p>
          <p className="table-line">Transcription apps give you words. <b>InventoryTools gives you the report.</b></p>
        </div>
      </section>

      <section>
        <div className="container split">
          <div>
            <span className="eyebrow">The maths</span>
            <h2>What&apos;s two hours of your time worth?</h2>
            <p style={{margin:'16px 0 26px'}}>InventoryTools is designed to save hours of manual typing and formatting on every report. At a few pounds per conversion, it costs less than the first ten minutes of typing.</p>
            <div className="receipt">
              <div className="receipt-row"><span>Manual typing</span><b>1–3 hours per report</b></div>
              <div className="receipt-row"><span>PDF conversion</span><b>from £4.00</b></div>
              <div className="receipt-row"><span>Audio conversion</span><b>from £4.88</b></div>
              <div className="receipt-row"><span>Result</span><span>Review the report instead of rebuilding it</span></div>
            </div>
          </div>
          <div className="calc">
            <label htmlFor="rep-slider">How many reports do you complete per week? <span style={{color:'var(--orange)',fontWeight:700}}>{reports}</span></label>
            <input type="range" id="rep-slider" min={1} max={40} value={reports} onChange={e=>setReports(Number(e.target.value))} />
            <div className="calc-out">Estimated admin hours saved:<br/><b>~{reports}–{reports*3} hours/week</b></div>
            <div className="calc-out" style={{fontSize:'1rem',marginTop:10}}>That&apos;s your evenings back.</div>
            <small>Estimate based on typical 1–3 hours of typing and formatting per report. Actual time varies by report.</small>
          </div>
        </div>
      </section>

      <section className="alt" id="pricing">
        <div className="container">
          <div className="section-head"><span className="eyebrow">Pricing</span><h2>Simple pricing. No subscription.</h2></div>
          <div className="pricing-grid">
            <div className="price-card">
              <h3>PDF Conversion</h3>
              <div className="price-big">From £4.00 <small>/ report</small></div>
              <p>Best for existing reports, PDFs, old inventories, and documents that need reformatting.</p>
              <Link className="btn btn-primary" href="/auth">Convert a PDF report <span className="arrow">→</span></Link>
            </div>
            <div className="price-card standout">
              <span className="ribbon">Standout</span>
              <h3>Audio Conversion</h3>
              <div className="price-big">From £4.88 <small>/ report</small></div>
              <p>Best for dictated inspection notes and audio recordings.</p>
              <Link className="btn btn-primary" href="/auth">Convert audio to Word <span className="arrow">→</span></Link>
            </div>
          </div>
          <div className="reassure"><span>No subscription</span><span>Pay per conversion</span><span>No monthly commitment</span><span>Credits never expire</span></div>
        </div>
      </section>

      <section>
        <div className="container split">
          <div>
            <span className="eyebrow">Who&apos;s behind it</span>
            <h2>Built by inventory people, for inventory people.</h2>
            <p style={{marginTop:16}}>InventoryTools was created inside a working UK property inventory company — around real inspections, real reports, and real deadlines.</p>
            <ul className="trust-list">
              <li>Built for UK inventory professionals</li>
              <li>Designed around real inventory workflows</li>
              <li>Built for room-by-room report structure</li>
              <li>Produces editable Word documents — you stay in control</li>
              <li>Review and edit every report before it goes anywhere</li>
              <li>Your files are handled securely during processing</li>
            </ul>
          </div>
          <div className="trust-side">
            {stats && (
              <>
                <div className="stat-card">
                  <div className="big"><CountUp value={4620} />+ reports</div>
                  <p>converted — PDF and Audio to Word</p>
                </div>
                <div className="stat-card">
                  <div className="big"><CountUp value={41500} />+ rooms</div>
                  <p>extracted and structured from PDF reports</p>
                </div>
                <div className="stat-card">
                  <div className="big" style={{fontSize:'1.4rem'}}>★ 4.9/5</div>
                  <p>average rating from converted reports</p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="alt" id="faq">
        <div className="container">
          <div className="section-head"><span className="eyebrow">FAQ</span><h2>Questions clerks actually ask.</h2></div>
          <div className="faq-list">
            {faqs.map((faq,i)=>(
              <div className={`faq-item${openFaq===i?' open':''}`} key={i}>
                <button className="faq-q" onClick={()=>setOpenFaq(openFaq===i?null:i)}>{faq.q}<span className="pm">+</span></button>
                <div className="faq-a" style={{maxHeight:openFaq===i?500:0}}><p>{faq.a}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="final">
        <div className="container">
          <h2>Stop losing hours to report typing and formatting.</h2>
          <p>Convert your next PDF report or dictated inspection audio into a clean, editable Word inventory document.</p>
          <div className="hero-ctas">
            <Link className="btn btn-primary" href="/auth">Convert a report <span className="arrow">→</span></Link>
            <Link className="btn btn-secondary" href="/auth">Try Audio to Word</Link>
          </div>
        </div>
      </section>

      <footer>
        <div className="container foot-row">
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <img src="/logo-full.png" alt="InventoryTools" style={{height:28,width:'auto',filter:'brightness(0) invert(1)'}} />
          </div>
          <div className="foot-price"><b>PDF from £4.00</b> · <b>Audio from £4.88</b> · Credits never expire</div>
          <div>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </div>
        </div>
      </footer>
    </>
  )
}
