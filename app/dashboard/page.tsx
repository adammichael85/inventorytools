'use client'
import { useState } from 'react'
import Link from 'next/link'

const TEAL = '#1D9E75'
const TEAL_LIGHT = '#E1F5EE'
const TEAL_DARK = '#085041'
const BORDER = '#E2EAE7'
const BG = '#F7F9F8'
const SURFACE = '#FFFFFF'
const TEXT = '#1A2820'
const MUTED = '#5A7068'
const HINT = '#94AEA6'

export default function Dashboard() {
  const [page, setPage] = useState('dashboard')
  const [showConvert, setShowConvert] = useState(false)
  const [showTopup, setShowTopup] = useState(false)
  const [convertState, setConvertState] = useState<'idle'|'selected'|'processing'>('idle')
  const [selectedFile, setSelectedFile] = useState('')
  const [selectedCredits, setSelectedCredits] = useState<{credits:number,price:number}|null>(null)
  const [processingRooms, setProcessingRooms] = useState<{name:string,state:string}[]>([])
  const [elapsed, setElapsed] = useState(0)

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
    { id: 'convert', label: 'Convert PDF', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', badge: 'New' },
    { id: 'reports', label: 'Reports', icon: 'M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z' },
    { id: 'team', label: 'Team', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
    { id: 'billing', label: 'Billing', icon: 'M1 4h22a0 0 0 010 0v16a2 2 0 01-2 2H3a2 2 0 01-2-2V4zM1 10h22' },
    { id: 'settings', label: 'Settings', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14' },
  ]

  function startConvert(filename: string) {
    const rooms = ['Entrance / Hallway','Living Room','Kitchen','Bedroom 1','Bedroom 2','Bathroom']
    setProcessingRooms(rooms.map(r => ({ name: r, state: 'pending' })))
    setConvertState('processing')
    setElapsed(0)
    const timer = setInterval(() => setElapsed(e => e + 1), 1000)
    let i = 0
    function tick() {
      if (i > 0) setProcessingRooms(prev => prev.map((r,idx) => idx === i-1 ? {...r, state:'done'} : r))
      if (i < rooms.length) {
        setProcessingRooms(prev => prev.map((r,idx) => idx === i ? {...r, state:'active'} : r))
        i++
        setTimeout(tick, 1200)
      } else {
        clearInterval(timer)
        setTimeout(() => { setShowConvert(false); setConvertState('idle'); setSelectedFile('') }, 600)
      }
    }
    setTimeout(tick, 400)
  }

  const conversions = [
    { name: '12 Milliners Court', rooms: 9, time: '38s', date: 'Today, 09:14' },
    { name: '7 Ashford Road', rooms: 6, time: '31s', date: 'Today, 08:52' },
    { name: 'Flat 3, Crown House', rooms: 4, time: '24s', date: 'Yesterday, 16:30' },
    { name: '22 The Elms', rooms: 11, time: '52s', date: 'Yesterday, 11:05' },
    { name: '9 Oak Lane', rooms: 7, time: '35s', date: '2 Jun, 14:18' },
  ]

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', height: '100vh', overflow: 'hidden', background: BG }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* SIDEBAR */}
      <aside style={{ width: 220, background: SURFACE, borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0 }}>
        <div style={{ padding: '20px 18px 16px', borderBottom: `1px solid ${BORDER}` }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, background: TEAL, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h6M7 16h8"/></svg>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>inventory<span style={{ color: TEAL }}>tools</span></span>
          </Link>
        </div>
        <nav style={{ padding: '12px 10px', flex: 1 }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => item.id === 'convert' ? setShowConvert(true) : setPage(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, width: '100%', textAlign: 'left', border: 'none', background: page === item.id ? TEAL_LIGHT : 'transparent', color: page === item.id ? TEAL_DARK : MUTED, fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: 2 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
              {item.label}
              {item.badge && <span style={{ marginLeft: 'auto', background: TEAL, color: '#fff', fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20 }}>{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: '14px 10px', borderTop: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: TEAL_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: TEAL_DARK }}>JS</div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>Jane Smith</p>
              <p style={{ fontSize: 11, color: HINT }}>ABC Inventories Ltd</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* TOPBAR */}
        <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3, margin: 0 }}>
              {page === 'dashboard' ? 'Good morning, Jane 👋' : page.charAt(0).toUpperCase() + page.slice(1)}
            </h1>
            <p style={{ fontSize: 12, color: HINT, margin: 0 }}>Wednesday, 3 June 2026</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: TEAL_LIGHT, borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 600, color: TEAL_DARK }}>17 credits remaining</div>
            <button onClick={() => setShowConvert(true)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Convert PDF</button>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>

          {/* DASHBOARD PAGE */}
          {page === 'dashboard' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
                {[['This month','34','reports converted'],['Spent','£119','@ £3.50 per report'],['Avg. time','42s','per conversion'],['Est. saving','£374','vs. external typist']].map(([label,val,sub]) => (
                  <div key={label} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '18px 20px' }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: HINT, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>{label}</p>
                    <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1, color: TEXT, marginBottom: 4 }}>{val}</p>
                    <p style={{ fontSize: 12, color: HINT }}>{sub}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
                <div>
                  <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Recent conversions</h2>
                      <a href="#" style={{ fontSize: 12, color: TEAL, textDecoration: 'none' }}>View all →</a>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr style={{ background: BG }}>
                        {['Property','Rooms','Time','Cost','Date',''].map(h => <th key={h} style={{ fontSize: 11, fontWeight: 600, color: HINT, textTransform: 'uppercase', letterSpacing: 0.8, padding: '10px 20px', textAlign: 'left', borderBottom: `1px solid ${BORDER}` }}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {conversions.map(c => (
                          <tr key={c.name} style={{ borderBottom: `1px solid ${BORDER}` }}>
                            <td style={{ padding: '12px 20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                <div style={{ width: 30, height: 30, borderRadius: 7, background: TEAL_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                                </div>
                                <div>
                                  <p style={{ fontSize: 13, fontWeight: 500, color: TEXT, margin: 0 }}>{c.name}</p>
                                  <p style={{ fontSize: 11, color: HINT, margin: 0 }}>{c.date}</p>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '12px 20px', fontSize: 13, color: MUTED }}>{c.rooms} rooms</td>
                            <td style={{ padding: '12px 20px', fontSize: 13, color: MUTED }}>{c.time}</td>
                            <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600, color: TEXT }}>£3.50</td>
                            <td style={{ padding: '12px 20px' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#E6F9F2', color: '#0A6B48', fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20 }}>● Complete</span></td>
                            <td style={{ padding: '12px 20px' }}><button style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${BORDER}`, background: SURFACE, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>↓ .docx</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* CREDITS */}
                  <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}` }}><h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Credits</h3></div>
                    <div style={{ padding: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}><span style={{ fontWeight: 600 }}>17 remaining</span><span style={{ color: HINT }}>of 50 purchased</span></div>
                      <div style={{ height: 8, borderRadius: 20, background: BORDER, overflow: 'hidden', marginBottom: 14 }}><div style={{ width: '34%', height: '100%', background: TEAL, borderRadius: 20 }} /></div>
                      <p style={{ fontSize: 12, color: HINT, marginBottom: 14 }}>Each conversion costs <strong style={{ color: TEXT }}>1 credit (£3.50)</strong>. Credits never expire.</p>
                      <button onClick={() => setShowTopup(true)} style={{ width: '100%', padding: 10, borderRadius: 9, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Buy more credits</button>
                    </div>
                  </div>
                  {/* THIS MONTH */}
                  <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}` }}><h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>This month</h3></div>
                    <div style={{ padding: 18 }}>
                      {[['Reports converted','34'],['Total spent','£119.00'],['Avg. per report','£3.50'],['Est. saving vs. typist','£374.00']].map(([label,val],i) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? `1px solid ${BORDER}` : 'none', fontSize: 13 }}>
                          <span style={{ color: MUTED }}>{label}</span>
                          <span style={{ fontWeight: 600, color: label.includes('saving') ? TEAL : TEXT }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* ACTIVITY */}
                  <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}` }}><h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Activity</h3></div>
                    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[['12 Milliners Court — download ready','Today, 09:14',true],['7 Ashford Road — download ready','Today, 08:52',true],['Sarah M. joined your team','Yesterday, 17:01',false],['50 credits purchased — £175.00','1 Jun, 09:00',false]].map(([text,time,active]) => (
                        <div key={text as string} style={{ display: 'flex', gap: 10 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: active ? TEAL : BORDER, flexShrink: 0, marginTop: 4 }} />
                          <div>
                            <p style={{ fontSize: 12, color: TEXT, margin: 0 }}>{text as string}</p>
                            <p style={{ fontSize: 11, color: HINT, margin: 0 }}>{time as string}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* REPORTS PAGE */}
          {page === 'reports' && (
            <div>
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: 12 }}>
                  <input placeholder="Search by address..." style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
                  <select style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: 'inherit', fontSize: 13, color: MUTED }}><option>All time</option><option>This month</option><option>Last month</option></select>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: BG }}>
                    {['Property','Rooms','Time','Cost','Date','Status',''].map(h => <th key={h} style={{ fontSize: 11, fontWeight: 600, color: HINT, textTransform: 'uppercase', letterSpacing: 0.8, padding: '10px 20px', textAlign: 'left', borderBottom: `1px solid ${BORDER}` }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {[...conversions, { name: '5 Maple Drive', rooms: 5, time: '29s', date: '2 Jun' }, { name: 'Flat 1, Park View', rooms: 3, time: '19s', date: '1 Jun' }, { name: '31 Station Road', rooms: 8, time: '41s', date: '1 Jun' }].map(c => (
                      <tr key={c.name} style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 500 }}>{c.name}</td>
                        <td style={{ padding: '12px 20px', fontSize: 13, color: MUTED }}>{c.rooms} rooms</td>
                        <td style={{ padding: '12px 20px', fontSize: 13, color: MUTED }}>{c.time}</td>
                        <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600 }}>£3.50</td>
                        <td style={{ padding: '12px 20px', fontSize: 12, color: MUTED }}>{c.date}</td>
                        <td style={{ padding: '12px 20px' }}><span style={{ background: '#E6F9F2', color: '#0A6B48', fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20 }}>● Complete</span></td>
                        <td style={{ padding: '12px 20px' }}><button style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${BORDER}`, background: SURFACE, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>↓ .docx</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TEAM PAGE */}
          {page === 'team' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div><h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: -0.3 }}>Team</h2><p style={{ fontSize: 13, color: HINT, margin: 0 }}>Manage who has access</p></div>
                <button style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Invite member</button>
              </div>
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
                {[{name:'Jane Smith',email:'jane@abcinventories.co.uk',role:'Admin',avatar:'JS'},{name:'Sarah Mitchell',email:'sarah@abcinventories.co.uk',role:'Member',avatar:'SM'},{name:'Tom Davies',email:'tom@abcinventories.co.uk',role:'Member',avatar:'TD'},{name:'Priya Patel',email:'priya@abcinventories.co.uk',role:'Member',avatar:'PP'}].map((m,i,arr) => (
                  <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: i < arr.length-1 ? `1px solid ${BORDER}` : 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: TEAL_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: TEAL_DARK, flexShrink: 0 }}>{m.avatar}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{m.name}</p>
                      <p style={{ fontSize: 12, color: HINT, margin: 0 }}>{m.email}</p>
                    </div>
                    <span style={{ fontSize: 12, background: m.role === 'Admin' ? TEAL_LIGHT : BG, color: m.role === 'Admin' ? TEAL_DARK : MUTED, padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>{m.role}</span>
                    {m.role !== 'Admin' && <button style={{ fontSize: 12, color: HINT, border: `1px solid ${BORDER}`, background: 'none', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>}
                  </div>
                ))}
              </div>
              <div style={{ background: TEAL_LIGHT, borderRadius: 12, padding: '16px 20px', fontSize: 13, color: TEAL_DARK }}>ℹ️ Team members share your credit balance. Each conversion uses 1 credit regardless of who runs it.</div>
            </div>
          )}

          {/* BILLING PAGE */}
          {page === 'billing' && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px', letterSpacing: -0.3 }}>Billing</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div style={{ background: TEAL, borderRadius: 14, padding: 24, color: '#fff' }}>
                  <p style={{ fontSize: 12, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Current balance</p>
                  <p style={{ fontSize: 42, fontWeight: 700, letterSpacing: -1, lineHeight: 1, marginBottom: 6 }}>17</p>
                  <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 20 }}>credits remaining · £59.50 value</p>
                  <button onClick={() => setShowTopup(true)} style={{ padding: '10px 20px', borderRadius: 9, border: 'none', background: '#fff', color: TEAL, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Buy more credits</button>
                </div>
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>This month</p>
                  {[['Reports converted','34'],['Credits used','34'],['Total spent','£119.00'],['Est. saving vs. typist','£374.00']].map(([l,v],i) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? `1px solid ${BORDER}` : 'none', fontSize: 13 }}>
                      <span style={{ color: MUTED }}>{l}</span><span style={{ fontWeight: 600, color: l.includes('saving') ? TEAL : TEXT }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}` }}><p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Payment history</p></div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: BG }}>{['Date','Description','Credits','Amount',''].map(h => <th key={h} style={{ fontSize: 11, fontWeight: 600, color: HINT, textTransform: 'uppercase', padding: '10px 20px', textAlign: 'left', borderBottom: `1px solid ${BORDER}` }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {[['3 Jun 2026','50 credits purchased','+ 50','£175.00'],['1 Jun 2026','50 credits purchased','+ 50','£175.00'],['14 May 2026','20 credits purchased','+ 20','£70.00'],['2 May 2026','10 credits purchased','+ 10','£35.00']].map(([date,desc,cred,amt]) => (
                      <tr key={date} style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <td style={{ padding: '12px 20px', fontSize: 12, color: MUTED }}>{date}</td>
                        <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 500 }}>{desc}</td>
                        <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600, color: TEAL }}>{cred}</td>
                        <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600 }}>{amt}</td>
                        <td style={{ padding: '12px 20px' }}><button style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${BORDER}`, background: SURFACE, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>PDF</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SETTINGS PAGE */}
          {page === 'settings' && (
            <div style={{ maxWidth: 600 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px', letterSpacing: -0.3 }}>Settings</h2>
              {[{title:'Profile',fields:[{label:'First name',val:'Jane'},{label:'Last name',val:'Smith'},{label:'Email address',val:'jane@abcinventories.co.uk'},{label:'Company name',val:'ABC Inventories Ltd'}]},{title:'Password',fields:[{label:'Current password',val:'',type:'password'},{label:'New password',val:'',type:'password'}]}].map(section => (
                <div key={section.title} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}` }}><p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{section.title}</p></div>
                  <div style={{ padding: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: section.fields.length > 2 ? '1fr' : '1fr 1fr', gap: 14 }}>
                      {section.fields.map(f => (
                        <div key={f.label}>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>{f.label}</label>
                          <input type={f.type || 'text'} defaultValue={f.val} placeholder={f.type === 'password' ? '••••••••' : ''} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                      ))}
                    </div>
                    <button style={{ marginTop: 16, padding: '9px 20px', borderRadius: 9, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save changes</button>
                  </div>
                </div>
              ))}
              <div style={{ background: SURFACE, border: '1px solid #FEE2E2', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #FEE2E2' }}><p style={{ fontSize: 13, fontWeight: 600, color: '#DC2626', margin: 0 }}>Danger zone</p></div>
                <div style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div><p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>Delete account</p><p style={{ fontSize: 12, color: HINT, margin: 0 }}>Permanently delete your account and all data</p></div>
                  <button style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid #DC2626', background: 'transparent', color: '#DC2626', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>Delete account</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* CONVERT MODAL */}
      {showConvert && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,40,32,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: SURFACE, borderRadius: 16, border: `1px solid ${BORDER}`, width: '100%', maxWidth: 480, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Convert PDF to Word</p><p style={{ fontSize: 12, color: HINT, margin: 0 }}>1 credit (£3.50) · 17 remaining</p></div>
              <button onClick={() => { setShowConvert(false); setConvertState('idle') }} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent', cursor: 'pointer', fontSize: 16, color: MUTED }}>×</button>
            </div>
            {convertState === 'idle' && (
              <div style={{ padding: 24 }}>
                <div onClick={() => { setSelectedFile('Sample Inventory.pdf'); setConvertState('selected') }} style={{ border: `2px dashed ${BORDER}`, borderRadius: 12, padding: 36, textAlign: 'center', cursor: 'pointer', background: BG }}>
                  <div style={{ width: 52, height: 52, borderRadius: 12, background: TEAL_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Drop your PDF here</p>
                  <p style={{ fontSize: 13, color: HINT }}>or click to browse</p>
                </div>
              </div>
            )}
            {convertState === 'selected' && (
              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: TEAL_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{selectedFile}</p>
                    <p style={{ fontSize: 11, color: HINT, margin: 0 }}>Ready to convert</p>
                  </div>
                </div>
                <button onClick={() => startConvert(selectedFile)} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>Convert now — 1 credit (£3.50)</button>
                <button onClick={() => setConvertState('idle')} style={{ width: '100%', padding: 11, borderRadius: 10, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>Choose different file</button>
              </div>
            )}
            {convertState === 'processing' && (
              <div style={{ padding: 24 }}>
                <div style={{ background: TEAL_LIGHT, borderRadius: 10, padding: '14px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2.5px solid rgba(29,158,117,0.25)`, borderTopColor: TEAL, animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: TEAL_DARK, margin: 0 }}>Building Word document...</p>
                    <p style={{ fontSize: 11, color: '#0F6E56', margin: 0 }}>{selectedFile}</p>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0F6E56' }}>⏱ {elapsed}s</span>
                </div>
                {processingRooms.map((room, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: `1px solid ${BORDER}`, opacity: room.state === 'pending' ? 0.35 : 1 }}>
                    {room.state === 'done' && <div style={{ width: 18, height: 18, borderRadius: '50%', background: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2.5"><polyline points="2,5 4,7 8,3"/></svg></div>}
                    {room.state === 'active' && <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid rgba(29,158,117,0.2)`, borderTopColor: TEAL, animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />}
                    {room.state === 'pending' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: BORDER, margin: '0 6px', flexShrink: 0 }} />}
                    <span style={{ fontSize: 13, fontWeight: room.state === 'active' ? 600 : 400, color: room.state === 'active' ? TEAL_DARK : TEXT }}>{room.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOPUP MODAL */}
      {showTopup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,40,32,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: SURFACE, borderRadius: 16, border: `1px solid ${BORDER}`, width: '100%', maxWidth: 420, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Top up credits</p><p style={{ fontSize: 12, color: HINT, margin: 0 }}>Credits never expire · £3.50 per conversion</p></div>
              <button onClick={() => setShowTopup(false)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent', cursor: 'pointer', fontSize: 16, color: MUTED }}>×</button>
            </div>
            <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[[10,35],[20,70],[30,105],[40,140],[50,175]].map(([credits,price]) => (
                <div key={credits} onClick={() => setSelectedCredits({credits,price})} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 10, border: `1.5px solid ${selectedCredits?.credits === credits ? TEAL : BORDER}`, background: selectedCredits?.credits === credits ? TEAL_LIGHT : 'transparent', cursor: 'pointer', position: 'relative', transition: 'all 0.15s' }}>
                  {credits === 50 && <div style={{ position: 'absolute', top: -10, right: 12, background: TEAL, color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 10px', borderRadius: 20 }}>Most popular</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: selectedCredits?.credits === credits ? TEAL : TEAL_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: selectedCredits?.credits === credits ? '#fff' : TEAL_DARK }}>{credits}</div>
                    <div><p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{credits} reports</p><p style={{ fontSize: 12, color: HINT, margin: 0 }}>£3.50 each</p></div>
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>£{price}</p>
                </div>
              ))}
            </div>
            <div style={{ padding: '0 24px 20px' }}>
              <button style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                {selectedCredits ? `Pay £${selectedCredits.price} — add ${selectedCredits.credits} credits` : 'Select a package above'}
              </button>
              <p style={{ fontSize: 11, color: HINT, textAlign: 'center', marginTop: 10 }}>Secured by Stripe · Credits added instantly after payment</p>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
