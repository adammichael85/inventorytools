'use client'
import React from 'react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { convertPDF, convertPDFVision, convertWordDoc } from './convert-action'
import { PDFDocument } from 'pdf-lib'
import { supabase } from '@/lib/supabase'
import { useBrand } from '@/lib/BrandContext'

const BORDER = '#e8e8e8'
const BG = '#f5f5f5'
const SURFACE = '#ffffff'
const TEXT = '#1a1a2e'
const MUTED = '#888888'
const HINT = '#888888'





function timeAgo(dateStr: string): string {
  const now = new Date()
  const then = new Date(dateStr)
  const secs = Math.floor((now.getTime() - then.getTime()) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return mins + ' min' + (mins !== 1 ? 's' : '') + ' ago'
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  if (hours < 24) return hours + 'h ' + (remMins > 0 ? remMins + 'm ' : '') + 'ago'
  const days = Math.floor(hours / 24)
  if (days < 7) return days + ' day' + (days !== 1 ? 's' : '') + ' ago'
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatDocxName(address: string): string {
  if (!address) return 'inventory'
  // Take first 3 words max, title case each, strip special chars
  const words = address.trim().split(/\s+/).slice(0, 3)
  return words.map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

function StatsPage({ conversions, userStats, toolTab, TEAL, TEAL_LIGHT, TEAL_DARK, BORDER, SURFACE, BG, HINT, MUTED, TEXT, typistRateMode, typistReportRate, typistPageRate }: any) {
  const MARKET_UNFURNISHED: Record<string, number> = {
    room_only: 10.00, studio: 15.00, '1bed': 15.00, '2bed': 20.00, '3bed': 25.00,
    '4bed': 35.00, '5bed': 45.00, '6bed': 50.00, '7bed': 55.00, '8bed': 60.00,
    '9bed': 65.00, '10bed': 70.00, '11bed': 75.00, '12bed': 80.00,
  }
  const MARKET_FURNISHED: Record<string, number> = {
    room_only: 12.50, studio: 17.50, '1bed': 17.50, '2bed': 22.50, '3bed': 27.50,
    '4bed': 37.50, '5bed': 47.50, '6bed': 52.50, '7bed': 57.50, '8bed': 62.50,
    '9bed': 67.50, '10bed': 72.50, '11bed': 77.50, '12bed': 82.50,
  }
  function getMarketRate(c: any): number {
    if (c.type !== 'audio') {
      if (typistRateMode === 'per_page' && c.page_count) {
        return (typistPageRate || 0.50) * c.page_count
      }
      return typistReportRate || 12.00
    }
    const isFurn = c.furnished === 'furnished' || c.furnished === 'part_furnished'
    const table = isFurn ? MARKET_FURNISHED : MARKET_UNFURNISHED
    return c.property_size ? (table[c.property_size] || 12.00) : 12.00
  }
  function getActualCost(c: any): number {
    return c.cost ? Number(c.cost) : (c.type === 'audio' ? 9.60 : 4.00)
  }
  const [period, setPeriod] = React.useState('month')
  const chartRef = React.useRef<any>(null)
  const chartInstanceRef = React.useRef<any>(null)
  const [chartReady, setChartReady] = React.useState(false)

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart); weekStart.setDate(todayStart.getDate() - todayStart.getDay())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const filtered = React.useMemo(() => {
    const byTab = conversions.filter((c: any) => toolTab === 'audio' ? c.type === 'audio' : c.type !== 'audio')
    if (period === 'today') return byTab.filter((c: any) => new Date(c.created_at) >= todayStart)
    if (period === 'week') return byTab.filter((c: any) => new Date(c.created_at) >= weekStart)
    if (period === 'month') return byTab.filter((c: any) => new Date(c.created_at) >= monthStart)
    return byTab
  }, [period, conversions, toolTab])

  function fmtTime(secs: number) {
    if (!secs) return '—'
    if (secs >= 3600) return Math.floor(secs/3600) + 'h ' + Math.floor((secs%3600)/60) + 'm'
    return secs >= 60 ? Math.floor(secs/60) + 'm ' + (secs%60) + 's' : secs + 's'
  }

  const isAllTime = period === 'all'
  const allTabConversions = conversions.filter((c: any) => toolTab === 'audio' ? c.type === 'audio' : c.type !== 'audio')
  const total = isAllTime ? allTabConversions.length : filtered.length
  const rooms = isAllTime ? allTabConversions.reduce((s: number, r: any) => s + (r.rooms || 0), 0) : filtered.reduce((s: number, r: any) => s + (r.rooms || 0), 0)
  const duration = isAllTime ? allTabConversions.reduce((s: number, r: any) => s + (r.duration_seconds || 0), 0) : filtered.reduce((s: number, r: any) => s + (r.duration_seconds || 0), 0)
  const avg = total > 0 ? Math.round(duration / total) : 0
  const cost = (isAllTime ? allTabConversions : filtered).reduce((s: number, c: any) => s + getActualCost(c), 0)
  const saving = (isAllTime ? allTabConversions : filtered).reduce((s: number, c: any) => s + Math.max(0, getMarketRate(c) - getActualCost(c)), 0)
  const savingPct = cost + saving > 0 ? Math.round((saving / (cost + saving)) * 100) : 0

  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - (29 - i))
    const label = d.getDate() + ' ' + d.toLocaleString('default', { month: 'short' })
    const count = conversions.filter((c: any) => {
      if (toolTab === 'audio' ? c.type !== 'audio' : c.type === 'audio') return false
      const cd = new Date(c.created_at)
      return cd.getDate() === d.getDate() && cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear()
    }).length
    return { label, count }
  })

  React.useEffect(() => {
    if (!(window as any).Chart) {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
      s.onload = () => setChartReady(true)
      document.head.appendChild(s)
    } else setChartReady(true)
  }, [])

  React.useEffect(() => {
    if (!chartReady || !chartRef.current) return
    if (chartInstanceRef.current) chartInstanceRef.current.destroy()
    const Chart = (window as any).Chart
    chartInstanceRef.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: last30.map(d => d.label),
        datasets: [{ label: 'Conversions', data: last30.map(d => d.count), backgroundColor: toolTab === 'audio' ? '#2563EB' : TEAL, borderRadius: 3, borderSkipped: false }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { maxTicksLimit: 6, font: { size: 10 }, color: '#94AEA6' } },
          y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { stepSize: 1, font: { size: 10 }, color: '#94AEA6' }, beginAtZero: true }
        }
      }
    })
  }, [chartReady, conversions, toolTab, TEAL])

  const periodLabels: any = { today: 'Today', week: 'This Week', month: 'This Month', all: 'All Time' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: -0.3 }}>Statistics <span style={{ fontSize: 13, fontWeight: 400, color: HINT }}>— reports showing in your dashboard</span></h2>
        <div style={{ display: 'flex', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 3, gap: 2 }}>
          {[['today','Today'],['week','Week'],['month','Month'],['all','All Time']].map(([v,l]) => (
            <button key={v} onClick={() => setPeriod(v)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: period === v ? TEAL : 'transparent', color: period === v ? '#fff' : MUTED, fontFamily: 'inherit', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 12 }}>
        <div style={{ background: TEAL, borderRadius: 14, padding: '20px 24px', color: '#fff' }}>
          <p style={{ fontSize: 11, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Conversions</p>
          <p style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>{total}</p>
          <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 16 }}>{periodLabels[period].toLowerCase()}</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: 32, gap: 2 }}>
            {last30.slice(-7).map((d, i) => (
              <div key={i} style={{ flex: 1, borderRadius: 2, background: 'rgba(255,255,255,' + (0.4 + (d.count > 0 ? 0.5 : 0)) + ')', height: d.count > 0 ? Math.max(30, d.count * 40) + '%' : '15%', minHeight: 4 }} />
            ))}
          </div>
        </div>

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 18px' }}>
          <p style={{ fontSize: 11, color: HINT, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Total spent</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: TEXT, marginBottom: 4 }}>£{cost.toFixed(2)}</p>
          <p style={{ fontSize: 12, color: HINT, marginBottom: 14 }}>{toolTab === 'audio' ? 'varies by property size' : '@ £4.00 per report'}</p>
          <div style={{ height: 3, background: BORDER, borderRadius: 2 }}>
            <div style={{ height: '100%', width: Math.min(100, total * 5) + '%', background: TEAL, borderRadius: 2 }} />
          </div>
          {toolTab !== 'audio' && <p style={{ fontSize: 11, color: HINT, marginTop: 6 }}>{total} of 20 credit target</p>}
        </div>

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 18px' }}>
          <p style={{ fontSize: 11, color: HINT, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Est. saving*</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: TEAL, marginBottom: 4 }}>£{saving.toFixed(2)}</p>
          <p style={{ fontSize: 12, color: HINT, marginBottom: 14 }}>vs. manual typing</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 3, background: BORDER, borderRadius: 2 }}>
              <div style={{ height: '100%', width: savingPct + '%', background: TEAL, borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 11, color: TEAL_DARK, fontWeight: 600 }}>{savingPct}% saved</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
        {[
          ['Rooms processed', rooms.toString()],
          ['Avg conv. time', fmtTime(avg)],
          ['Total conv. time', fmtTime(duration)],
        ].map(([lbl, val]) => (
          <div key={lbl} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: HINT, marginBottom: 8 }}>{lbl}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: TEXT, letterSpacing: -0.5 }}>{val}</p>
          </div>
        ))}
      </div>

      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Conversions — last 30 days</p>
          <span style={{ fontSize: 11, color: HINT }}>{last30.reduce((s,d)=>s+d.count,0)} total</span>
        </div>
        <div style={{ position: 'relative', height: 160 }}>
          <canvas ref={chartRef} role="img" aria-label="Bar chart of daily conversions over last 30 days" />
        </div>
      </div>

      <p style={{ fontSize: 11, color: HINT, marginTop: 6, fontStyle: 'italic' }}>{toolTab === 'audio' ? '*Saving based on 45% discount vs standard typing rates' : '*£12 avg. typist cost − £5 conversion = £7 net saving per report'}</p>

      {userStats && (() => {
        const ltConvs = conversions.filter((c: any) => toolTab === 'audio' ? c.type === 'audio' : c.type !== 'audio')
        const ltTotal = ltConvs.length
        const ltCost = ltConvs.reduce((s: number, c: any) => s + getActualCost(c), 0)
        const ltDuration = ltConvs.reduce((s: number, r: any) => s + (r.duration_seconds || 0), 0)
        const ltRooms = ltConvs.reduce((s: number, r: any) => s + (r.rooms || 0), 0)
        const ltAvg = ltTotal > 0 ? Math.round(ltDuration / ltTotal) : 0
        const ltSaving = conversions.filter((c: any) => toolTab === 'audio' ? c.type === 'audio' : c.type !== 'audio').reduce((s: number, c: any) => s + Math.max(0, getMarketRate(c) - getActualCost(c)), 0)
        const ltSavingPct = ltCost + ltSaving > 0 ? Math.round((ltSaving / (ltCost + ltSaving)) * 100) : 0
        return (
          <div style={{ marginTop: 32 }}>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 2px', letterSpacing: -0.3 }}>Lifetime statistics</p>
              <p style={{ fontSize: 12, color: HINT, margin: 0 }}>Permanent record — includes deleted reports</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 12 }}>
              <div style={{ background: TEAL, borderRadius: 14, padding: '20px 24px', color: '#fff' }}>
                <p style={{ fontSize: 11, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Total conversions</p>
                <p style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>{ltTotal}</p>
                <p style={{ fontSize: 12, opacity: 0.7 }}>all time</p>
              </div>
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 18px' }}>
                <p style={{ fontSize: 11, color: HINT, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Total spent</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: TEXT, marginBottom: 4 }}>£{ltCost.toFixed(2)}</p>
                <p style={{ fontSize: 12, color: HINT }}>{toolTab === 'audio' ? 'varies by property size' : '@ £4.00 per report'}</p>
              </div>
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 18px' }}>
                <p style={{ fontSize: 11, color: HINT, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Est. saving*</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: TEAL, marginBottom: 4 }}>£{ltSaving.toFixed(2)}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
                  <div style={{ flex: 1, height: 3, background: BORDER, borderRadius: 2 }}>
                    <div style={{ height: '100%', width: ltSavingPct + '%', background: TEAL, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 11, color: TEAL_DARK, fontWeight: 600 }}>{ltSavingPct}% saved</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 8 }}>
              {[['Rooms processed', ltRooms.toString()],['Avg conv. time', fmtTime(ltAvg)],['Total conv. time', fmtTime(ltDuration)]].map(([lbl, val]) => (
                <div key={lbl} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: HINT, marginBottom: 8 }}>{lbl}</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: TEXT, letterSpacing: -0.5 }}>{val}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: HINT, marginTop: 6, fontStyle: 'italic' }}>{toolTab === 'audio' ? '*Saving based on 45% discount vs standard typing rates' : '*£12 avg. typist cost − £5 conversion = £7 net saving per report'}</p>
          </div>
        ) })()}

    </div>
  )
}


function LegalPage({ TEAL, TEAL_LIGHT, BORDER, SURFACE, BG, HINT, MUTED, TEXT, brand }: any) {
  const productName = brand.display_name || 'InventoryTools'
  const supportEmail = brand.company_name === 'InventoryTools' ? 'support@inventorytools.co.uk' : ('support@' + (brand.domain || 'inventorytools.co.uk'))
  const sections = [
    {
      title: 'Privacy Policy',
      content: `${productName} collects and processes the following personal data:

• Account information: name, email address, company name, position, address and phone number provided at signup
• Conversion data: property addresses, room counts and conversion times
• Usage data: login times, session duration

Your data is stored securely on Supabase servers located in the EU. We do not sell, share or transfer your personal data to third parties except as required to operate the service (Supabase for database storage, Vercel for hosting, OpenAI for document processing).

You have the right to access, correct or delete your personal data at any time. To exercise these rights, contact us at ${supportEmail}.

Data is retained for the duration of your account. Upon account deletion, all personal data is permanently removed within 30 days.`
    },
    {
      title: 'Terms of Service',
      content: `By using ${productName} you agree to these terms:

• The service converts inventory PDFs and Word documents into formatted Word documents
• Credits are purchased in advance and deducted per conversion
• Credits do not expire and are non-refundable once used
• You are responsible for ensuring you have the right to process any documents you upload
• We do not store the content of your converted documents beyond what is necessary to deliver the service
• We reserve the right to suspend accounts that misuse the service
• The service is provided "as is" without warranty of any kind`
    },
    {
      title: 'GDPR Compliance',
      content: `${productName} is committed to GDPR compliance:

• Legal basis for processing: contract performance and legitimate interests
• Data controller: InventoryTools Ltd (inventorytools.co.uk) on behalf of ${productName}
• Data processor: Supabase Inc (database), Vercel Inc (hosting), OpenAI Inc (document processing)
• Data retention: account data retained until account deletion
• Your rights: access, rectification, erasure, restriction, portability, objection
• To exercise your rights: ${supportEmail}
• Supervisory authority: Information Commissioner's Office (ICO), ico.org.uk`
    },
    {
      title: 'Security',
      content: `We take security seriously:

• All data is encrypted in transit using TLS 1.3
• Database access is protected by Row Level Security — users can only access their own data
• API keys are stored as environment variables and never exposed to the client
• Authentication is handled by Supabase Auth with secure session tokens
• Sessions expire after 20 minutes of inactivity
• We perform regular security reviews of our infrastructure`
    },
    {
      title: 'Data Retention',
      content: `• Account profiles: retained until account deletion
• Conversion history: retained until manually deleted or account deletion
• Word documents: stored in private Supabase Storage, accessible only to the account holder
• Upon account deletion: all data permanently removed within 30 days
• Backups: retained for 7 days then automatically purged`
    },
  ]

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px', letterSpacing: -0.3 }}>Legal & Compliance</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sections.map(({ title, content }) => (
          <LegalSection key={title} title={title} content={content} BORDER={BORDER} SURFACE={SURFACE} HINT={HINT} TEXT={TEXT} TEAL={TEAL} />
        ))}
      </div>
      <p style={{ fontSize: 12, color: HINT, marginTop: 16 }}>Last updated: June 2026 · Questions? Contact support@inventorytools.co.uk</p>
    </div>
  )
}

function LegalSection({ title, content, BORDER, SURFACE, HINT, TEXT, TEAL }: any) {
  const [open, setOpen] = React.useState(false)
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
      <button onClick={() => setOpen(!open)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{title}</span>
        <span style={{ fontSize: 18, color: HINT, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
      </button>
      {open && (
        <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${BORDER}` }}>
          <pre style={{ fontSize: 13, color: TEXT, lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: '16px 0 0' }}>{content}</pre>
        </div>
      )}
    </div>
  )
}

function TeamPage({ supabase, TEAL, TEAL_LIGHT, TEAL_DARK, BORDER, SURFACE, BG, HINT, MUTED, TEXT }: any) {
  const [members, setMembers] = React.useState<any[]>([])
  const [showInvite, setShowInvite] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState('')
  const [inviteSending, setInviteSending] = React.useState(false)
  const [inviteSent, setInviteSent] = React.useState(false)
  const [inviteErr, setInviteErr] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [myRole, setMyRole] = React.useState('user')
  const [myId, setMyId] = React.useState('')
  const [confirmRemove, setConfirmRemove] = React.useState<any>(null)

  function loadTeam() {
    supabase.auth.getSession().then(({ data }: any) => {
      if (data.session) {
        setMyId(data.session.user.id)
        supabase.from('profiles').select('company_name, role').eq('id', data.session.user.id).single().then(({ data: me }: any) => {
          if (me) setMyRole(me.role || 'user')
          if (me?.company_name) {
            supabase.from('profiles').select('id, full_name, company_position, role, created_at, pdf_enabled, audio_enabled').eq('company_name', me.company_name).order('created_at', { ascending: true }).then(({ data: team }: any) => {
              if (team) setMembers(team)
              setLoading(false)
            })
          } else {
            setLoading(false)
          }
        })
      }
    })
  }

  React.useEffect(() => { loadTeam() }, [])

  async function sendInvite() {
    if (!inviteEmail.trim()) return
    setInviteSending(true)
    setInviteErr('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setInviteSending(false); return }
    const res = await fetch('/api/send-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), inviterUserId: session.user.id })
    })
    const data = await res.json()
    setInviteSending(false)
    if (data.error) {
      setInviteErr(data.error)
    } else {
      setInviteSent(true)
      setInviteEmail('')
      setTimeout(() => setInviteSent(false), 4000)
    }
  }

  async function toggleAccess(memberId: string, field: 'pdf_enabled' | 'audio_enabled', current: boolean) {
    await supabase.from('profiles').update({ [field]: !current }).eq('id', memberId)
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, [field]: !current } : m))
  }

  async function removeMember(memberId: string) {
    await supabase.from('profiles').update({ company_name: null }).eq('id', memberId)
    setConfirmRemove(null)
    loadTeam()
  }

  async function toggleRole(memberId: string, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    await supabase.from('profiles').update({ role: newRole }).eq('id', memberId)
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
  }

  const isAdmin = myRole === 'admin'
  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: 'inherit', fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' as const }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Team</h2>
        {isAdmin && <button onClick={() => setShowInvite(!showInvite)} style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Invite member</button>}
      </div>

      {showInvite && isAdmin && (
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px' }}>Invite a team member</p>
          <p style={{ fontSize: 13, color: MUTED, margin: '0 0 16px' }}>Enter their email address. They'll receive an invite link by email — once they sign up, they'll be added to your company automatically as a standard user.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.com" style={inputStyle} onKeyDown={e => { if (e.key === 'Enter') sendInvite() }} />
            <button onClick={sendInvite} disabled={inviteSending || !inviteEmail.trim()} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: inviteSending ? '#94AEA6' : TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: inviteSending ? 'default' : 'pointer', whiteSpace: 'nowrap' as const }}>
              {inviteSending ? 'Sending...' : 'Send invite'}
            </button>
          </div>
          {inviteSent && <p style={{ fontSize: 13, color: TEAL, marginTop: 10, marginBottom: 0 }}>✓ Invite sent!</p>}
          {inviteErr && <p style={{ fontSize: 13, color: '#DC2626', marginTop: 10, marginBottom: 0 }}>{inviteErr}</p>}
        </div>
      )}

      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: MUTED, fontSize: 13 }}>Loading...</div>
        ) : members.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: MUTED, fontSize: 13 }}>No team members found.</div>
        ) : members.map((m, i) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: i < members.length-1 ? `1px solid ${BORDER}` : 'none', flexWrap: 'wrap' as const }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: TEAL_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: TEAL_DARK, flexShrink: 0 }}>
              {(m.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{m.full_name || 'Unknown'}</p>
              <p style={{ fontSize: 12, color: HINT, margin: 0 }}>{m.company_position || ''}</p>
            </div>
            <span style={{ fontSize: 12, background: m.role === 'admin' ? TEAL_LIGHT : BG, color: m.role === 'admin' ? TEAL_DARK : MUTED, padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize' as const, flexShrink: 0 }}>{m.role || 'user'}</span>

            {isAdmin && m.id !== myId && (
              <button onClick={() => toggleRole(m.id, m.role || 'user')} style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 16, border: `1px solid ${BORDER}`, cursor: 'pointer', background: 'transparent', color: MUTED, flexShrink: 0 }}>
                {m.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
              </button>
            )}

            {isAdmin && (
              <>
                <button onClick={() => toggleAccess(m.id, 'pdf_enabled', m.pdf_enabled !== false)} style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 16, border: 'none', cursor: 'pointer', background: m.pdf_enabled !== false ? TEAL_LIGHT : BG, color: m.pdf_enabled !== false ? TEAL_DARK : MUTED, flexShrink: 0 }}>
                  PDF {m.pdf_enabled !== false ? 'ON' : 'OFF'}
                </button>
                <button onClick={() => toggleAccess(m.id, 'audio_enabled', m.audio_enabled !== false)} style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 16, border: 'none', cursor: 'pointer', background: m.audio_enabled !== false ? '#DBEAFE' : BG, color: m.audio_enabled !== false ? '#1D4ED8' : MUTED, flexShrink: 0 }}>
                  Audio {m.audio_enabled !== false ? 'ON' : 'OFF'}
                </button>
                {m.id !== myId && (
                  <button onClick={() => setConfirmRemove(m)} style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 16, border: 'none', cursor: 'pointer', background: '#FEE2E2', color: '#DC2626', flexShrink: 0 }}>
                    Remove
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {confirmRemove && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,40,32,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: SURFACE, borderRadius: 16, border: `1px solid ${BORDER}`, width: '100%', maxWidth: 380, padding: 24 }}>
            <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px' }}>Remove {confirmRemove.full_name || 'this member'}?</p>
            <p style={{ fontSize: 13, color: MUTED, margin: '0 0 20px' }}>They will lose access to the company account and will need a new invite to rejoin.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmRemove(null)} style={{ flex: 1, padding: 11, borderRadius: 10, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => removeMember(confirmRemove.id)} style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: '#DC2626', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SettingsPage({ supabase, userEmail, TEXT, MUTED, TEAL, BORDER, SURFACE, BG, HINT }: any) {
  const [profile, setProfile] = React.useState<any>(null)
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [autoDelete, setAutoDelete] = React.useState<number | null>(null)
  const [savingAutoDelete, setSavingAutoDelete] = React.useState(false)
  const [autoAccuracyReport, setAutoAccuracyReport] = React.useState(false)
  const [savingAutoAccuracy, setSavingAutoAccuracy] = React.useState(false)
  const [typistRateMode, setTypistRateMode] = React.useState('per_report')
  const [typistReportRate, setTypistReportRate] = React.useState('12.00')
  const [typistPageRate, setTypistPageRate] = React.useState('0.50')
  const [savingTypistRates, setSavingTypistRates] = React.useState(false)
  const [savedTypistRates, setSavedTypistRates] = React.useState(false)
  const [audioTypistMode, setAudioTypistMode] = React.useState('per_size')
  const [audioTypistMinuteRate, setAudioTypistMinuteRate] = React.useState('0.50')
  const [audioTypistRatesUnfurnished, setAudioTypistRatesUnfurnished] = React.useState<Record<string,string>>({
    room_only: '10.00', studio: '15.00', '1bed': '15.00', '2bed': '20.00', '3bed': '25.00',
    '4bed': '35.00', '5bed': '45.00', '6bed': '50.00', '7bed': '55.00', '8bed': '60.00',
    '9bed': '65.00', '10bed': '70.00', '11bed': '75.00', '12bed': '80.00',
  })
  const [audioTypistRatesFurnished, setAudioTypistRatesFurnished] = React.useState<Record<string,string>>({
    room_only: '12.50', studio: '17.50', '1bed': '17.50', '2bed': '22.50', '3bed': '27.50',
    '4bed': '37.50', '5bed': '47.50', '6bed': '52.50', '7bed': '57.50', '8bed': '62.50',
    '9bed': '67.50', '10bed': '72.50', '11bed': '77.50', '12bed': '82.50',
  })
  const [savingAudioTypistRates, setSavingAudioTypistRates] = React.useState(false)
  const [savedAudioTypistRates, setSavedAudioTypistRates] = React.useState(false)
  const [lowBalanceThreshold, setLowBalanceThreshold] = React.useState('25.00')
  const [savingLowBalance, setSavingLowBalance] = React.useState(false)
  const [savedLowBalance, setSavedLowBalance] = React.useState(false)

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }: any) => {
      if (data.session) {
        supabase.from('profiles').select('*').eq('id', data.session.user.id).single().then(({ data: p }: any) => {
          if (p) {
            setProfile(p)
            setAutoDelete(p.auto_delete_days || 14)
            setAutoAccuracyReport(p.auto_accuracy_report || false)
            setTypistRateMode(p.typist_rate_mode || 'per_report')
            setTypistReportRate(String(p.typist_report_rate ?? 12.00))
            setTypistPageRate(String(p.typist_page_rate ?? 0.50))
            setAudioTypistMode(p.audio_typist_mode || 'per_size')
            setAudioTypistMinuteRate(String(p.audio_typist_minute_rate ?? 0.50))
            setLowBalanceThreshold(String(p.low_balance_threshold ?? 25.00))
            if (p.audio_typist_rates?.unfurnished) {
              const r = p.audio_typist_rates.unfurnished
              setAudioTypistRatesUnfurnished({
                room_only: String(r.room_only ?? 10.00), studio: String(r.studio ?? 15.00),
                '1bed': String(r['1bed'] ?? 15.00), '2bed': String(r['2bed'] ?? 20.00),
                '3bed': String(r['3bed'] ?? 25.00), '4bed': String(r['4bed'] ?? 35.00),
                '5bed': String(r['5bed'] ?? 45.00), '6bed': String(r['6bed'] ?? 50.00),
                '7bed': String(r['7bed'] ?? 55.00), '8bed': String(r['8bed'] ?? 60.00),
                '9bed': String(r['9bed'] ?? 65.00), '10bed': String(r['10bed'] ?? 70.00),
                '11bed': String(r['11bed'] ?? 75.00), '12bed': String(r['12bed'] ?? 80.00),
              })
            }
            if (p.audio_typist_rates?.furnished) {
              const r = p.audio_typist_rates.furnished
              setAudioTypistRatesFurnished({
                room_only: String(r.room_only ?? 12.50), studio: String(r.studio ?? 17.50),
                '1bed': String(r['1bed'] ?? 17.50), '2bed': String(r['2bed'] ?? 22.50),
                '3bed': String(r['3bed'] ?? 27.50), '4bed': String(r['4bed'] ?? 37.50),
                '5bed': String(r['5bed'] ?? 47.50), '6bed': String(r['6bed'] ?? 52.50),
                '7bed': String(r['7bed'] ?? 57.50), '8bed': String(r['8bed'] ?? 62.50),
                '9bed': String(r['9bed'] ?? 67.50), '10bed': String(r['10bed'] ?? 72.50),
                '11bed': String(r['11bed'] ?? 77.50), '12bed': String(r['12bed'] ?? 82.50),
              })
            }
          }
        })
      }
    })
  }, [])

  async function saveProfile() {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (session && profile) {
      await supabase.from('profiles').update({
        full_name: profile.full_name,
        company_name: profile.company_name,
        company_position: profile.company_position,
        company_address: profile.company_address,
        company_phone: profile.company_phone,
      }).eq('id', session.user.id)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: 'inherit', fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' as const }
  const labelStyle = { display: 'block' as const, fontSize: 12, fontWeight: 500, marginBottom: 6, color: MUTED }

  if (!profile) return <div style={{ padding: 40, color: MUTED, fontSize: 13 }}>Loading...</div>

  return (
    <div style={{ maxWidth: 1100 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px', letterSpacing: -0.3 }}>Settings</h2>

      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Profile</p>
          <span style={{ fontSize: 11, background: profile.role === 'admin' ? '#fff0e6' : '#F7F9F8', color: profile.role === 'admin' ? '#c24a00' : MUTED, padding: '3px 10px', borderRadius: 20, fontWeight: 500, textTransform: 'uppercase' as const }}>{profile.role || 'user'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Full name</label>
            <input value={profile.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input value={userEmail} disabled style={{...inputStyle, background: BG, color: MUTED}} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Company name</label>
            <input value={profile.company_name || ''} onChange={e => setProfile({...profile, company_name: e.target.value})} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Your position</label>
            <input value={profile.company_position || ''} onChange={e => setProfile({...profile, company_position: e.target.value})} style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Company address</label>
          <input value={profile.company_address || ''} onChange={e => setProfile({...profile, company_address: e.target.value})} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Company phone</label>
          <input value={profile.company_phone || ''} onChange={e => setProfile({...profile, company_phone: e.target.value})} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={saveProfile} disabled={saving} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: saving ? '#94AEA6' : TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer' }}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          {saved && <span style={{ fontSize: 13, color: TEAL }}>✓ Saved!</span>}
        </div>
      </div>

      {profile.role === 'admin' && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16, marginBottom: 16 }}>
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>📄 PDF to Word — typist cost settings</p>
          <p style={{ fontSize: 12, color: MUTED, margin: '0 0 16px' }}>Set what your team would normally pay a manual typist for PDF inventory reports. Used to calculate your real savings on the Statistics page.</p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={() => setTypistRateMode('per_report')} style={{ flex: 1, padding: '9px 14px', borderRadius: 8, border: `1px solid ${typistRateMode === 'per_report' ? TEAL : BORDER}`, background: typistRateMode === 'per_report' ? TEAL : 'transparent', color: typistRateMode === 'per_report' ? '#fff' : TEXT, fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Per report (flat rate)</button>
            <button onClick={() => setTypistRateMode('per_page')} style={{ flex: 1, padding: '9px 14px', borderRadius: 8, border: `1px solid ${typistRateMode === 'per_page' ? TEAL : BORDER}`, background: typistRateMode === 'per_page' ? TEAL : 'transparent', color: typistRateMode === 'per_page' ? '#fff' : TEXT, fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Per page</button>
          </div>

          {typistRateMode === 'per_report' ? (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Cost per report (£)</label>
              <input type="number" step="0.01" min="0" value={typistReportRate} onChange={e => setTypistReportRate(e.target.value)} style={inputStyle} placeholder="12.00" />
            </div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Cost per page (£)</label>
              <input type="number" step="0.01" min="0" value={typistPageRate} onChange={e => setTypistPageRate(e.target.value)} style={inputStyle} placeholder="0.50" />
              <p style={{ fontSize: 11, color: HINT, marginTop: 6 }}>Savings = (cost per page × number of pages in the PDF) − our conversion cost.</p>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={async () => {
              setSavingTypistRates(true)
              const { data: { session } } = await supabase.auth.getSession()
              if (session) {
                await supabase.from('profiles').update({
                  typist_rate_mode: typistRateMode,
                  typist_report_rate: parseFloat(typistReportRate) || 12.00,
                  typist_page_rate: parseFloat(typistPageRate) || 0.50,
                }).eq('id', session.user.id)
              }
              setSavingTypistRates(false)
              setSavedTypistRates(true)
              setTimeout(() => setSavedTypistRates(false), 3000)
            }} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: savingTypistRates ? '#94AEA6' : TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: savingTypistRates ? 'default' : 'pointer' }}>
              {savingTypistRates ? 'Saving...' : 'Save typist cost'}
            </button>
            {savedTypistRates && <span style={{ fontSize: 13, color: TEAL }}>✓ Saved!</span>}
          </div>
        </div>

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>🎙️ Audio to Word — typist cost settings</p>
          <p style={{ fontSize: 12, color: MUTED, margin: '0 0 16px' }}>Set what your team would normally pay a manual typist for audio inventory reports. Used to calculate your real savings on the Statistics page.</p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={() => setAudioTypistMode('per_size')} style={{ flex: 1, padding: '9px 14px', borderRadius: 8, border: `1px solid ${audioTypistMode === 'per_size' ? '#2563EB' : BORDER}`, background: audioTypistMode === 'per_size' ? '#2563EB' : 'transparent', color: audioTypistMode === 'per_size' ? '#fff' : TEXT, fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Per property size</button>
            <button onClick={() => setAudioTypistMode('per_minute')} style={{ flex: 1, padding: '9px 14px', borderRadius: 8, border: `1px solid ${audioTypistMode === 'per_minute' ? '#2563EB' : BORDER}`, background: audioTypistMode === 'per_minute' ? '#2563EB' : 'transparent', color: audioTypistMode === 'per_minute' ? '#fff' : TEXT, fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Per minute of audio</button>
          </div>

          {audioTypistMode === 'per_size' ? (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 8, fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase' as const }}>
                <span></span><span>Unfurnished</span><span>Furnished</span>
              </div>
              {[['room_only','Room only'],['studio','Studio'],['1bed','1 bed'],['2bed','2 bed'],['3bed','3 bed'],['4bed','4 bed'],['5bed','5 bed'],['6bed','6 bed'],['7bed','7 bed'],['8bed','8 bed'],['9bed','9 bed'],['10bed','10 bed'],['11bed','11 bed'],['12bed','12 bed']].map(([key,label]) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <label style={{ fontSize: 13, color: TEXT }}>{label}</label>
                  <input type="number" step="0.01" min="0" value={audioTypistRatesUnfurnished[key]} onChange={e => setAudioTypistRatesUnfurnished(prev => ({...prev, [key]: e.target.value}))} style={inputStyle} />
                  <input type="number" step="0.01" min="0" value={audioTypistRatesFurnished[key]} onChange={e => setAudioTypistRatesFurnished(prev => ({...prev, [key]: e.target.value}))} style={inputStyle} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Cost per minute of audio (£)</label>
              <input type="number" step="0.01" min="0" value={audioTypistMinuteRate} onChange={e => setAudioTypistMinuteRate(e.target.value)} style={inputStyle} placeholder="0.50" />
              <p style={{ fontSize: 11, color: HINT, marginTop: 6 }}>Savings = (cost per minute × length of recording in minutes) − our conversion cost.</p>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={async () => {
              setSavingAudioTypistRates(true)
              const { data: { session } } = await supabase.auth.getSession()
              if (session) {
                const unfurnishedNumbers: Record<string, number> = {}
                Object.entries(audioTypistRatesUnfurnished).forEach(([k, v]) => { unfurnishedNumbers[k] = parseFloat(v) || 0 })
                const furnishedNumbers: Record<string, number> = {}
                Object.entries(audioTypistRatesFurnished).forEach(([k, v]) => { furnishedNumbers[k] = parseFloat(v) || 0 })
                await supabase.from('profiles').update({
                  audio_typist_mode: audioTypistMode,
                  audio_typist_minute_rate: parseFloat(audioTypistMinuteRate) || 0.50,
                  audio_typist_rates: { unfurnished: unfurnishedNumbers, furnished: furnishedNumbers },
                }).eq('id', session.user.id)
              }
              setSavingAudioTypistRates(false)
              setSavedAudioTypistRates(true)
              setTimeout(() => setSavedAudioTypistRates(false), 3000)
            }} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: savingAudioTypistRates ? '#94AEA6' : '#2563EB', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: savingAudioTypistRates ? 'default' : 'pointer' }}>
              {savingAudioTypistRates ? 'Saving...' : 'Save typist cost'}
            </button>
            {savedAudioTypistRates && <span style={{ fontSize: 13, color: '#2563EB' }}>✓ Saved!</span>}
          </div>
        </div>
      </div>
      )}

      {profile.role === 'admin' && (
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24, marginBottom: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>🔔 Low balance email alerts</p>
          <p style={{ fontSize: 12, color: MUTED, margin: '0 0 16px' }}>When your company balance drops below this amount, all admins will get an email letting them know it's time to top up. Set to 0 to disable.</p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, maxWidth: 200 }}>
              <label style={labelStyle}>Alert threshold (£)</label>
              <input type="number" step="0.01" min="0" value={lowBalanceThreshold} onChange={e => setLowBalanceThreshold(e.target.value)} style={inputStyle} placeholder="25.00" />
            </div>
            <button onClick={async () => {
              setSavingLowBalance(true)
              const { data: { session } } = await supabase.auth.getSession()
              if (session) {
                const val = parseFloat(lowBalanceThreshold)
                await supabase.from('profiles').update({
                  low_balance_threshold: isNaN(val) || val <= 0 ? null : val,
                  low_balance_alert_sent: false,
                }).eq('id', session.user.id)
              }
              setSavingLowBalance(false)
              setSavedLowBalance(true)
              setTimeout(() => setSavedLowBalance(false), 3000)
            }} style={{ padding: '10px 20px', borderRadius: 9, border: 'none', background: savingLowBalance ? '#94AEA6' : TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: savingLowBalance ? 'default' : 'pointer' }}>
              {savingLowBalance ? 'Saving...' : 'Save'}
            </button>
            {savedLowBalance && <span style={{ fontSize: 13, color: TEAL, alignSelf: 'center' }}>✓ Saved!</span>}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16, marginBottom: 16 }}>
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24 }}>
        <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>Auto-delete reports</p>
        <p style={{ fontSize: 12, color: MUTED, margin: '0 0 12px' }}>Automatically delete uploaded PDFs and conversion reports after the selected period. Default is 14 days for GDPR compliance.</p>
        <p style={{ fontSize: 13, color: MUTED, marginBottom: 8 }}>Automatically delete conversion reports and Word documents after a set period.</p>
        <p style={{ fontSize: 13, color: MUTED, marginBottom: 8 }}>Your lifetime statistics (total conversions, time saved, total spend) are stored permanently and will <strong style={{ color: TEXT }}>never be affected</strong> by auto-deletion.</p>
        <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 600, marginBottom: 16 }}>⚠️ Deleted Word documents and reports cannot be recovered.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {[null, 7, 14, 30, 90].map(days => (
            <button key={String(days)} onClick={() => setAutoDelete(days)} style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${autoDelete === days ? TEAL : BORDER}`, background: autoDelete === days ? TEAL : 'transparent', color: autoDelete === days ? '#fff' : TEXT, fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              {days === null ? 'Never' : `${days} days`}
            </button>
          ))}
        </div>
        <button onClick={async () => {
          setSavingAutoDelete(true)
          const { data: { session } } = await supabase.auth.getSession()
          if (session) await supabase.from('profiles').update({ auto_delete_days: autoDelete }).eq('id', session.user.id)
          setSavingAutoDelete(false)
        }} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {savingAutoDelete ? 'Saving...' : 'Save preference'}
        </button>
      </div>

      {false && (
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>Auto accuracy report</p>
            <p style={{ fontSize: 12, color: MUTED, margin: '0 0 8px' }}>When enabled, an accuracy report will automatically generate each time you download a converted Word document. <strong style={{ color: '#DC2626' }}>This is included free with every conversion.</strong></p>
          </div>
          <div onClick={async () => {
            const newVal = !autoAccuracyReport
            setAutoAccuracyReport(newVal)
            setSavingAutoAccuracy(true)
            const { data: { session } } = await supabase.auth.getSession()
            if (session) await supabase.from('profiles').update({ auto_accuracy_report: newVal }).eq('id', session.user.id)
            setSavingAutoAccuracy(false)
          }} style={{ width: 44, height: 24, borderRadius: 12, background: autoAccuracyReport ? TEAL : BORDER, cursor: 'pointer', position: 'relative', flexShrink: 0, marginLeft: 16, marginTop: 2, transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', top: 2, left: autoAccuracyReport ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
          </div>
        </div>
        {savingAutoAccuracy && <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>Saving...</p>}
      </div>
      )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16, marginBottom: 16 }}>
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24 }}>
        <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>Account</p>
        <p style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>Signed in as <strong style={{ color: TEXT }}>{userEmail}</strong></p>
        <button onClick={() => { if (window.confirm('Are you sure you want to sign out?')) { supabase.auth.signOut().then(() => { window.location.href = '/' }) } }} style={{ padding: '9px 20px', borderRadius: 9, border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT, fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Sign out</button>
      </div>

      {profile?.role === 'admin' && (
        <div style={{ background: SURFACE, border: '1px solid #FECACA', borderRadius: 14, padding: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px', color: '#DC2626' }}>Danger zone</p>
          <p style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>Permanently delete your company account. This will remove all users, conversions, files and data. This cannot be undone.</p>
          <DeleteAccountButton supabase={supabase} profile={profile} userEmail={userEmail} />
        </div>
      )}
      </div>
    </div>
  )
}

function DeleteAccountButton({ supabase, profile, userEmail }: any) {
  const [step, setStep] = React.useState(0)
  const [confirm, setConfirm] = React.useState('')
  const [deleting, setDeleting] = React.useState(false)

  if (step === 0) return (
    <button onClick={() => setStep(1)} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: '#DC2626', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete company account</button>
  )

  if (step === 1) return (
    <div>
      <div style={{ background: '#FEE2E2', borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#DC2626', margin: '0 0 8px' }}>⚠️ This cannot be undone</p>
        <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>All company users, conversion history, Word documents and billing data will be permanently deleted.</p>
      </div>
      <p style={{ fontSize: 13, color: '#DC2626', marginBottom: 10 }}>Type <strong>DELETE</strong> to confirm:</p>
      <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Type DELETE" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #FECACA', fontFamily: 'inherit', fontSize: 13, marginBottom: 12, boxSizing: 'border-box' as const }} />
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => { setStep(0); setConfirm('') }} style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid #E2EAE7', background: 'transparent', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
        <button disabled={confirm !== 'DELETE' || deleting} onClick={async () => {
          setDeleting(true)
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) return
          const res = await fetch('/api/delete-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: session.user.id })
          })
          if (res.ok) {
            await supabase.auth.signOut()
            window.location.href = '/?deleted=true'
          } else {
            setDeleting(false)
            alert('Failed to delete account. Please try again.')
          }
        }} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: confirm === 'DELETE' ? '#DC2626' : '#ccc', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: confirm === 'DELETE' ? 'pointer' : 'default' }}>
          {deleting ? 'Deleting...' : 'Permanently delete'}
        </button>
      </div>
    </div>
  )

  return null
}

export default function Dashboard() {
  const brand = useBrand()
  const TEAL = brand.primary_color
  const TEAL_LIGHT = brand.primary_color_light || brand.primary_color
  const TEAL_DARK = brand.primary_color_dark || brand.primary_color
  const [isMobile, setIsMobile] = React.useState(false)
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const [showMobileNav, setShowMobileNav] = React.useState(false)
  const [toolTab, setToolTab] = React.useState<'pdf' | 'audio'>('pdf')
  const [showAudioConvert, setShowAudioConvert] = React.useState(false)
  const [audioFiles, setAudioFiles] = React.useState<File[]>([])
  const [audioAddress, setAudioAddress] = React.useState('')
  const [audioPropertySize, setAudioPropertySize] = React.useState('')
  const [audioFurnished, setAudioFurnished] = React.useState('')
  const [audioRoomOrder, setAudioRoomOrder] = React.useState('')
  const [audioConvertState, setAudioConvertState] = React.useState<'idle'|'selected'|'processing'|'done'|'error'>('idle')
  const [audioElapsed, setAudioElapsed] = React.useState(0)
  const audioElapsedRef = React.useRef(0)
  const [audioError, setAudioError] = React.useState('')
  const [audioDocxUrl, setAudioDocxUrl] = React.useState<string|null>(null)
  const [audioDocxName, setAudioDocxName] = React.useState('')

  const [page, setPageState] = useState('dashboard')
  function setPage(p: string) { setPageState(p); setTimeout(() => { const main = document.querySelector('main div[style*="overflow"]') as HTMLElement; if (main) main.scrollTop = 0 }, 0) }
  const [showConvert, setShowConvert] = useState(false)
  const [showTopup, setShowTopup] = useState(false)
  const [cleanPdfFile, setCleanPdfFile] = useState<File | null>(null)
  const [cleanPdfState, setCleanPdfState] = useState<'idle'|'processing'|'done'|'error'>('idle')
  const [cleanPdfError, setCleanPdfError] = useState('')
  const [cleanPdfResult, setCleanPdfResult] = useState<{ base64: string, filename: string } | null>(null)
  const [topupAmount, setTopupAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [credits, setCredits] = useState(0)
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('user')
  const [pdfEnabled, setPdfEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [typistRateMode, setTypistRateModeD] = useState('per_report')
  const [typistReportRate, setTypistReportRateD] = useState(12.00)
  const [typistPageRate, setTypistPageRateD] = useState(0.50)
  const [convertState, setConvertState] = useState<'idle'|'selected'|'processing'|'done'|'error'>('idle')
  const [selectedFile, setSelectedFile] = useState<File|null>(null)
  const [selectedCredits, setSelectedCredits] = useState<{credits:number,price:number}|null>(null)
  const [processingRooms, setProcessingRooms] = useState<{name:string,state:string}[]>([])
  const [elapsed, setElapsed] = useState(0)
  const elapsedRef = React.useRef(0)
  const [convertError, setConvertError] = useState('')
  const [conversions, setConversions] = useState<any[]>([])
  const [userStats, setUserStats] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [usageInvoicePeriod, setUsageInvoicePeriod] = useState<'today'|'week'|'month'|'custom'>('month')
  const [usageInvoiceFrom, setUsageInvoiceFrom] = useState('')
  const [usageInvoiceTo, setUsageInvoiceTo] = useState('')
  const [generatingUsageInvoice, setGeneratingUsageInvoice] = useState(false)
  function fmtAddr(addr: string) {
    if (!addr) return addr
    const titled = addr.toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())
    return titled.replace(/\b([A-Za-z]{1,2}\d{1,2}[A-Za-z]?\s*\d[A-Za-z]{2})\b/gi, (m: string) => m.toUpperCase())
  }
  const [showRatingPopup, setShowRatingPopup] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showSessionEnded, setShowSessionEnded] = useState(false)
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  const [savingOnboarding, setSavingOnboarding] = useState(false)
  const [showQuickRate, setShowQuickRate] = useState(false)
  const [quickRateConvId, setQuickRateConvId] = useState('')
  const [quickRateConvAddress, setQuickRateConvAddress] = useState('')
  const [pendingRatings, setPendingRatings] = useState<any[]>([])
  const [tempRatings, setTempRatings] = useState<{[key: string]: number}>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [compressing, setCompressing] = useState(false)
  const [originalSize, setOriginalSize] = useState(0)
  const [compressedSize, setCompressedSize] = useState(0)
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null)
  const [docxUrl, setDocxUrl] = useState<string|null>(null)
  const [docxName, setDocxName] = useState('')

  async function submitRatings() {
    for (const [id, rating] of Object.entries(tempRatings)) {
      await supabase.from('conversions').update({ rating }).eq('id', id)
    }
    setConversions(prev => prev.map(x => tempRatings[x.id] ? { ...x, rating: tempRatings[x.id] } : x))
    setShowRatingPopup(false)
    setPendingRatings([])
    setTempRatings({})
  }

  const [showDeleteAll, setShowDeleteAll] = React.useState(false)
  const [showAccuracyConfirm, setShowAccuracyConfirm] = React.useState<any>(null)
  const [viewingReport, setViewingReport] = React.useState<any>(null)
  const [generatingReport, setGeneratingReport] = React.useState(false)

  function getUsageInvoiceDateRange(): { from: Date, to: Date } {
    const now = new Date()
    if (usageInvoicePeriod === 'today') {
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const to = new Date(from); to.setDate(to.getDate() + 1)
      return { from, to }
    }
    if (usageInvoicePeriod === 'week') {
      const from = new Date(now); from.setDate(now.getDate() - now.getDay())
      from.setHours(0,0,0,0)
      const to = new Date(from); to.setDate(to.getDate() + 7)
      return { from, to }
    }
    if (usageInvoicePeriod === 'month') {
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      return { from, to }
    }
    // custom
    const from = usageInvoiceFrom ? new Date(usageInvoiceFrom) : new Date(now.getFullYear(), now.getMonth(), 1)
    const to = usageInvoiceTo ? new Date(new Date(usageInvoiceTo).getTime() + 24*60*60*1000) : new Date()
    return { from, to }
  }

  function getUsageInvoiceConversions() {
    const { from, to } = getUsageInvoiceDateRange()
    return conversions.filter((c: any) => {
      const matchesTab = toolTab === 'audio' ? c.type === 'audio' : c.type !== 'audio'
      if (!matchesTab) return false
      const created = new Date(c.created_at)
      return created >= from && created < to
    }).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }

  async function downloadUsageInvoicePDF() {
    setGeneratingUsageInvoice(true)
    try {
      const { jsPDF } = await import('jspdf')
      const autoTableModule = await import('jspdf-autotable')
      const autoTable = autoTableModule.default

      const items = getUsageInvoiceConversions()
      const { from, to } = getUsageInvoiceDateRange()
      const total = items.reduce((s: number, c: any) => s + (c.cost ? Number(c.cost) : (c.type === 'audio' ? 4.88 : 4.00)), 0)

      const doc = new jsPDF()
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text(brand.display_name || 'InventoryTools', 14, 20)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text('Usage Invoice', 14, 28)
      doc.setFontSize(9)
      doc.setTextColor(120)
      doc.text(`Period: ${from.toLocaleDateString('en-GB')} - ${new Date(to.getTime() - 1).toLocaleDateString('en-GB')}`, 14, 35)
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 40)

      autoTable(doc, {
        startY: 48,
        head: [['Date', 'Property', 'Type', 'Cost']],
        body: items.map((c: any) => [
          new Date(c.created_at).toLocaleDateString('en-GB'),
          c.address || 'Unknown',
          c.type === 'audio' ? 'Audio' : 'PDF',
          '£' + (c.cost ? Number(c.cost).toFixed(2) : (c.type === 'audio' ? '4.88' : '4.00'))
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [21, 32, 69] },
      })

      const finalY = (doc as any).lastAutoTable.finalY || 60
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(`Total: £${total.toFixed(2)}`, 14, finalY + 12)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(150)
      doc.text(`${items.length} report${items.length === 1 ? '' : 's'} in this period`, 14, finalY + 18)

      doc.save(`usage-invoice-${from.toISOString().slice(0,10)}-to-${new Date(to.getTime()-1).toISOString().slice(0,10)}.pdf`)
    } catch (e) {
      alert('Failed to generate usage invoice PDF')
    } finally {
      setGeneratingUsageInvoice(false)
    }
  }

  async function generateAccuracyReport(conv: any) {
    setGeneratingReport(true)
    setShowAccuracyConfirm(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      const res = await fetch('/api/accuracy-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversion_id: conv.id, user_id: session.user.id })
      })
      const d = await res.json()
      if (d.error) { alert(d.error); return }
      setConversions(prev => prev.map(x => x.id === conv.id ? { ...x, accuracy_report: d.report } : x))
      setViewingReport({ ...conv, accuracy_report: d.report })
    } catch(e) { alert('Failed to generate report') }
    finally { setGeneratingReport(false) }
  }

  async function deleteAllConversions() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    // Delete all files from storage
    for (const conv of conversions) {
      if (conv.file_path) {
        await supabase.storage.from('documents').remove([conv.file_path])
      }
    }
    // Delete all conversion records
    await supabase.from('conversions').delete().eq('user_id', session.user.id)
    setConversions([])
    setShowDeleteAll(false)
  }

  async function deleteConversion(id: string, filePath: string) {
    if (!confirm('Delete this report? This cannot be undone.')) return
    // Delete file from storage
    if (filePath) await supabase.storage.from('documents').remove([filePath])
    // Delete from database
    await supabase.from('conversions').delete().eq('id', id)
    // Reload conversions
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      let delConvQuery = supabase.from('conversions').select('*').order('created_at', { ascending: false }).limit(50)
      if (userRole !== 'admin') delConvQuery = delConvQuery.eq('user_id', session.user.id)
      const { data: convs } = await delConvQuery
      if (convs) {
        setConversions(convs)
        const unrated = convs.filter((x: any) => !x.rating)
        if (unrated.length > 0) {
          setPendingRatings(unrated)
            if (sessionStorage.getItem('freshLogin')) { sessionStorage.removeItem('freshLogin'); setShowRatingPopup(true) }

        }
      }
    }
  }


  // Auto logout after 10 mins inactivity
  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const loginPath = brand.company_name === 'Oakley Jane' ? '/oj-login' : '/auth'
        supabase.auth.signOut().then(() => { window.location.href = `${loginPath}?reason=inactivity` })
      }, 20 * 60 * 1000)
    }
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, reset))
    reset()
    return () => {
      clearTimeout(timer)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [])

  useEffect(() => {
    const sessionToken = typeof window !== 'undefined' ? sessionStorage.getItem('deviceSessionToken') : null
    if (!sessionToken) return // no token means user logged in before this feature existed - skip check gracefully

    let userId = ''
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) userId = data.session.user.id
    })

    const interval = setInterval(async () => {
      if (!userId) {
        const { data } = await supabase.auth.getSession()
        if (data.session) userId = data.session.user.id
        else return
      }
      try {
        const res = await fetch('/api/session-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify_session', userId, sessionToken })
        })
        const result = await res.json()
        if (result.ok && !result.valid) {
          setShowSessionEnded(true)
          clearInterval(interval)
        }
      } catch (e) { /* ignore network blips */ }
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/auth'; return }
      const session = data.session
      setUserEmail(session.user.email || '')
      setAccessToken(session.access_token)
      // Load profile (name, role, settings) and company balance
      supabase.from('profiles').select('company_name, full_name, onboarding_confirmed, role, pdf_enabled, audio_enabled, typist_rate_mode, typist_report_rate, typist_page_rate').eq('id', session.user.id).single().then(({ data: profile }) => {
        if (profile) {
          setUserName(profile.full_name || session.user.email || '')
          setUserRole(profile.role || 'user')
          setPdfEnabled(profile.pdf_enabled !== false)
          setAudioEnabled(profile.audio_enabled !== false)
          setTypistRateModeD(profile.typist_rate_mode || 'per_report')
          setTypistReportRateD(profile.typist_report_rate ?? 12.00)
          setTypistPageRateD(profile.typist_page_rate ?? 0.50)
          if (!profile.onboarding_confirmed) setShowOnboarding(true)
          if (profile.company_name) {
            supabase.from('companies').select('balance').eq('company_name', profile.company_name).single().then(({ data: company }) => {
              if (company) setCredits(company.balance || 0)
            })
          }

          // Load conversions - admins see every conversion for the company, regular users see only their own.
          // Decided here (not in a parallel fetch) so we know profile.role before building the query.
          const isFreshLogin = !!sessionStorage.getItem('freshLogin')
          sessionStorage.removeItem('freshLogin')
          let convQuery = supabase.from('conversions').select('*').order('created_at', { ascending: false }).limit(50)
          if (profile.role !== 'admin') convQuery = convQuery.eq('user_id', session.user.id)
          convQuery.then(({ data: convs }) => {
            if (convs) {
              setConversions(convs)
              const unrated = convs.filter((x: any) => !x.rating)
              if (unrated.length > 0) {
                setPendingRatings(unrated)
                if (isFreshLogin) { setShowRatingPopup(true) }
              }
            }
          })
        }
      })
      supabase.from('user_stats').select('*').eq('user_id', session.user.id).single().then(({ data: stats }) => { if (stats) setUserStats(stats) })
      // Load transaction/invoice history for this company
      supabase.from('profiles').select('company_name').eq('id', session.user.id).single().then(({ data: me }) => {
        if (me?.company_name) {
          supabase.from('transactions').select('*').eq('company_name', me.company_name).order('created_at', { ascending: false }).then(({ data: txns }) => {
            if (txns) setTransactions(txns)
          })
        }
      })
    })
  }, [])

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
    { id: 'convert', label: toolTab === 'audio' ? 'Convert Audio' : 'Convert PDF', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', badge: 'New' },
    { id: 'cleanpdf', label: 'Clean PDF', icon: 'M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8' },
    { id: 'reports', label: 'Reports', icon: 'M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z' },
    ...(userRole === 'admin' ? [{ id: 'stats', label: 'Statistics', icon: 'M18 20V10M12 20V4M6 20v-6' }] : []),
    ...(userRole === 'admin' ? [{ id: 'team', label: 'Team', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' }] : []),
    ...(userRole === 'admin' ? [{ id: 'billing', label: 'Billing', icon: 'M1 4h22v16a2 2 0 01-2 2H3a2 2 0 01-2-2V4zM1 10h22' }] : []),
    { id: 'settings', label: 'Settings', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14' },
    { id: 'legal', label: 'Legal', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  ]

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve((r.result as string).split(',')[1])
      r.onerror = reject
      r.readAsDataURL(file)
    })
  }

  async function compressAndEncode(file: File): Promise<string> {
    try {
      setCompressing(true)
      setOriginalSize(file.size)
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
      setPdfPageCount(pdfDoc.getPageCount())
      const compressed = await pdfDoc.save({ useObjectStreams: true })
      const blob = new Blob([new Uint8Array(compressed as unknown as ArrayBuffer)], { type: 'application/pdf' })
      const compressedFile = new File([blob], file.name, { type: 'application/pdf' })
      setCompressedSize(compressedFile.size)
      setCompressing(false)
      return fileToBase64(compressedFile)
    } catch (e) {
      setCompressing(false)
      return fileToBase64(file)
    }
  }

  async function startConvert(method: 'text' | 'vision' | 'worddoc' = 'text') {
    if (!selectedFile) return
    setConvertState('processing')
    setConvertError('')
    setElapsed(0)
    elapsedRef.current = 0
    setProcessingRooms([{ name: selectedFile?.name.toLowerCase().endsWith('.docx') ? 'Reading Word document...' : 'Reading PDF...', state: 'active' }])
    let currentStage = 'Reading PDF'

    const timer = setInterval(() => { elapsedRef.current += 1; setElapsed(elapsedRef.current) }, 1000)

    try {
      currentStage = 'Reading PDF'
      const base64 = await fileToBase64(selectedFile)
      currentStage = 'Calling AI API'
      const { data: { session: sess } } = await supabase.auth.getSession()
      let data: any
      if (method === 'vision') {
        // Upload PDF to Supabase first so Trigger.dev can fetch it
        const ts2 = Date.now()
        const tempPath2 = sess?.user?.id + '/vision_temp_' + ts2 + '_' + (selectedFile?.name || 'upload.pdf')
        const { data: upData, error: upErr } = await supabase.storage.from('documents').upload(tempPath2, selectedFile!, { contentType: 'application/pdf', upsert: true })
        if (upErr) throw new Error('Upload failed: ' + upErr.message)
        const pdfPath = upData.path

        // Start background job
        setProcessingRooms([{ name: 'Starting background conversion...', state: 'active' }])
        const startRes = await fetch('/api/convert-vision-start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfPath, userId: sess?.user?.id })
        })
        const startData = await startRes.json()
        if (!startRes.ok) throw new Error(startData.error || 'Failed to start vision job')
        const jobId = startData.jobId

        // Poll for progress
        let jobDone = false
        let jobResult: any = null
        let visionRoomList: string[] = []
        while (!jobDone) {
          await new Promise(res => setTimeout(res, 3000))
          const pollRes = await fetch('/api/convert-vision-status?jobId=' + jobId)
          const pollData = await pollRes.json()
          if (pollData.status === 'complete') {
            jobDone = true
            jobResult = pollData
          } else if (pollData.status === 'error') {
            throw new Error(pollData.message || 'Vision job failed')
          } else {
            const msg = pollData.message || ''
            // Get room list from poll data
            if (pollData.room_names && visionRoomList.length === 0) {
              visionRoomList = pollData.room_names
              setProcessingRooms(visionRoomList.map((name: string) => ({ name, state: 'pending' as const })))
            }
            // Parse "Converting room N/Total: Room Name"
            const roomMatch = msg.match(/Converting room (\d+)\/(\d+): (.+)/)
            if (roomMatch && visionRoomList.length > 0) {
              const current = parseInt(roomMatch[1])
              setProcessingRooms(visionRoomList.map((name: string, idx: number) => ({
                name,
                state: idx < current - 1 ? 'done' : idx === current - 1 ? 'active' : 'pending'
              })))
            } else if (!pollData.room_names || visionRoomList.length === 0) {
              setProcessingRooms([{ name: msg || 'Processing...', state: 'active' }])
            }
          }
        }

        // Clean up temp file
        try { await supabase.storage.from('documents').remove([pdfPath]) } catch(e) {}

        data = { address: jobResult.address || '', pages: jobResult.rooms?.length || 0, rooms: jobResult.rooms, _extractedText: '' }
      } else if (method === 'worddoc') {
        data = await convertWordDoc(selectedFile!, sess?.user?.id)
      } else {
        data = await convertPDF(base64, selectedFile?.name.toLowerCase().endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf', selectedFile, sess?.user?.id)
      }

      const rooms = (data.rooms || []).filter((r: any) => (r.rows || []).length > 0)
      setProcessingRooms(rooms.map((r: any) => ({ name: r.roomName, state: 'pending' })))

      // Load docx library
      currentStage = 'Loading Word document library'
      if (!(window as any).docx) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script')
          s.src = 'https://cdn.jsdelivr.net/npm/docx@9.0.0/build/index.umd.js'
          s.onload = () => resolve()
          s.onerror = reject
          document.head.appendChild(s)
        })
      }

      const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, VerticalAlign } = (window as any).docx
      const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' }
      const cellBorders = { top: border, bottom: border, left: border, right: border }
      const COL_ITEM = 2499, COL_DESC = 3972, COL_COND = 3115

      const makeCell = (text: string, colWidth: number) => new TableCell({
        borders: cellBorders,
        width: { size: colWidth, type: WidthType.DXA },
        verticalAlign: VerticalAlign.TOP,
        children: (text || '').split(/\n| \| /).map(function(line){return new Paragraph({children:[new TextRun({text:line.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,'').replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/[\u2013\u2014]/g,'-').replace(/[^\x09\x0A\x0D\x20-\xFF]/g,''),font:'Arial',size:20,color:'000000'})]})})
      })

      const children: any[] = []
      for (let i = 0; i < rooms.length; i++) {
        const room = rooms[i]
        setProcessingRooms(prev => prev.map((r, idx) => idx === i ? { ...r, state: 'active' } : r))
        await new Promise(res => setTimeout(res, 30))

        if (i > 0) children.push(new Paragraph({ children: [new TextRun({ text: '', font: 'Arial', size: 20 })], spacing: { after: 120 } }))
        children.push(new Paragraph({ children: [new TextRun({ text: room.roomName, font: 'Arial', size: 28, bold: true })] }))

        const rows = room.rows
        children.push(new Table({
          width: { size: COL_ITEM + COL_DESC + COL_COND, type: WidthType.DXA },
          rows: [
            new TableRow({ children: [makeCell('ITEM', COL_ITEM), makeCell('DESCRIPTION', COL_DESC), makeCell('CONDITION', COL_COND)] }),
            ...rows.map((row: any) => new TableRow({ children: [makeCell(row.item, COL_ITEM), makeCell(row.description, COL_DESC), makeCell(row.condition, COL_COND)] }))
          ]
        }))

        setProcessingRooms(prev => prev.map((r, idx) => idx === i ? { ...r, state: 'done' } : r))
        await new Promise(res => setTimeout(res, 30))
      }

      currentStage = 'Building Word document'
      const doc = new Document({ sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children }] })
      const b64 = await Packer.toBase64String(doc)
      const byteArray = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      if (docxUrl) URL.revokeObjectURL(docxUrl); const url = URL.createObjectURL(blob); let storagePath = ""; let pdfStoragePath = ""; try { const sess = await supabase.auth.getSession(); if (sess.data.session) { const ts = Date.now(); const addrClean = (data.address||"").replace(/[^a-zA-Z0-9 _-]/g,"").trim(); const fn = sess.data.session.user.id + "/" + ts + "_" + addrClean + ".docx"; const up = await supabase.storage.from("documents").upload(fn, blob, {contentType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}); if (up.data) storagePath = up.data.path; if (selectedFile && selectedFile.name.toLowerCase().endsWith('.pdf')) { const pfn = sess.data.session.user.id + "/" + ts + "_" + addrClean + ".pdf"; const pup = await supabase.storage.from("documents").upload(pfn, selectedFile, {contentType:"application/pdf"}); if (pup.data) pdfStoragePath = pup.data.path } } } catch(e) { console.log("upload failed",e) }
      const name = formatDocxName(data.address || '') + '.docx'
      setDocxUrl(url)
      setDocxName(name)
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    fetch('/api/save-conversion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: session.user.id,
        address: data.address || selectedFile?.name || 'Unknown',
        rooms: rooms.length,
        items: rooms.reduce((sum: number, r: any) => sum + (r.rows?.length || 0), 0),
        pages: data.pages || rooms.length,
        page_count: pdfPageCount,
        duration_seconds: elapsedRef.current,
        file_path: storagePath,
        converted_by: userName || session.user.email,
        extracted_text: data._extractedText || '',
        converted_json: { rooms: data.rooms, address: data.address },
        pdf_path: pdfStoragePath || null,
      })
    })
  }
})
      .then(() => {
        supabase.auth.getSession().then(({ data }) => {
          if (data.session) {
            supabase.from('profiles').select('company_name, auto_accuracy_report').eq('id', data.session.user.id).single().then(({ data: p }) => {
              if (p?.company_name) {
                supabase.from('companies').select('balance').eq('company_name', p.company_name).single().then(({ data: co }) => { if (co) setCredits(co.balance || 0) })
              }
              let pdfRefreshQuery = supabase.from('conversions').select('*').order('created_at', { ascending: false }).limit(50)
              if (userRole !== 'admin') pdfRefreshQuery = pdfRefreshQuery.eq('user_id', data.session.user.id)
              pdfRefreshQuery.then(({ data: convs }) => {
                if (convs) {
                  setConversions(convs)
                  const latest = convs[0]
                  if (latest && !latest.rating) { setQuickRateConvId(latest.id); setQuickRateConvAddress(latest.address || ''); setShowQuickRate(true); localStorage.setItem('lastConverted', Date.now().toString()) }
                  if (false && latest && p?.auto_accuracy_report && !latest.accuracy_report && (latest.extracted_text || latest.converted_json) && latest.type !== 'audio') {
                    generateAccuracyReport(latest)
                  }
                }
              })
            })
          }
        })
      })
      setConvertState('done')
      clearInterval(timer)

    } catch (err: any) {
      clearInterval(timer)
      setConvertError(typeof err === 'string' ? err : err.message || err.toString() || JSON.stringify(err) || 'Unknown error')
      setConvertState('error')
    }
  }

  function closeConvert() {
    setShowConvert(false)
    setConvertState('idle')
    // Refresh conversions list when modal closes
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        let closeConvertQuery = supabase.from('conversions').select('*').order('created_at', { ascending: false }).limit(50)
        if (userRole !== 'admin') closeConvertQuery = closeConvertQuery.eq('user_id', session.user.id)
        closeConvertQuery.then(({ data: convs }) => { if (convs) setConversions(convs) })
        supabase.from('profiles').select('company_name').eq('id', session.user.id).single().then(({ data: p }) => { if (p?.company_name) { supabase.from('companies').select('balance').eq('company_name', p.company_name).single().then(({ data: co }) => { if (co) setCredits(co.balance || 0) }) } })
      }
    })
    setSelectedFile(null)
    setDocxUrl(null)
    setConvertError('')
  }


  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', overflow: 'hidden', background: BG }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* SIDEBAR */}
      <aside style={{ width: isMobile ? 0 : 220, background: SURFACE, borderRight: isMobile ? 'none' : `1px solid ${BORDER}`, display: isMobile ? 'none' : 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0 }}>
        <div style={{ height: 64, padding: '0 18px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: brand.company_name === 'InventoryTools' ? 'flex-start' : 'center' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, textDecoration: 'none', width: '100%' }}>
            {brand.company_name === 'InventoryTools' ? (
              <>
                <svg width="32" height="32" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}><rect width="120" height="120" rx="26" fill={TEAL}/><rect x="8" y="10" width="24" height="20" rx="5" fill="white" opacity="0.18"/><rect x="8" y="36" width="24" height="20" rx="5" fill="white" opacity="0.18"/><rect x="8" y="62" width="24" height="20" rx="5" fill="white" opacity="0.18"/><rect x="8" y="88" width="24" height="20" rx="5" fill="white" opacity="0.12"/><rect x="38" y="10" width="74" height="20" rx="5" fill="white" opacity="0.12"/><rect x="38" y="36" width="56" height="20" rx="5" fill="white" opacity="0.12"/><rect x="38" y="62" width="64" height="20" rx="5" fill="white" opacity="0.12"/><rect x="38" y="88" width="44" height="20" rx="5" fill="white" opacity="0.08"/><path d="M30 62 L50 84 L90 40" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>inventory<span style={{ color: TEAL }}>tools</span></span>
              </>
            ) : (
              <img src={brand.logo_url || ''} alt={brand.display_name} style={{ maxWidth: '100%', height: 'auto', maxHeight: 40 }} />
            )}
          </Link>
        </div>
        <nav style={{ padding: '12px 10px', flex: 1 }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => { if (item.id === 'convert') { if (toolTab === 'audio' ? audioEnabled : pdfEnabled) setShowConvert(true) } else { setPage(item.id) } }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, width: '100%', textAlign: 'left', border: 'none', background: page === item.id ? TEAL_LIGHT : 'transparent', color: page === item.id ? TEAL_DARK : MUTED, fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: 2 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
              {item.label}
              {item.badge && <span style={{ marginLeft: 'auto', background: toolTab === 'audio' ? '#2563EB' : TEAL, color: '#fff', fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20 }}>{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: '14px 10px', borderTop: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: TEAL_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: TEAL_DARK }}>{userName ? userName.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase() : userEmail.slice(0,2).toUpperCase()}</div>
            <div>
              <p style={{ fontSize: 11, color: MUTED, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: isMobile ? '0 16px' : '0 32px', height: isMobile ? 56 : 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 0 }}>
            {isMobile && (
              brand.company_name === 'InventoryTools' ? (
                <svg width="30" height="30" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                  <rect width="120" height="120" rx="26" fill={TEAL}/>
                  <rect x="8" y="10" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
                  <rect x="8" y="36" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
                  <rect x="8" y="62" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
                  <rect x="38" y="10" width="74" height="20" rx="5" fill="white" opacity="0.12"/>
                  <rect x="38" y="36" width="56" height="20" rx="5" fill="white" opacity="0.12"/>
                  <path d="M30 62 L50 84 L90 40" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <img src={brand.logo_url || ''} alt={brand.display_name} style={{ height: 30, width: 'auto', flexShrink: 0 }} />
              )
            )}
            <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3, margin: 0 }}>{page === 'dashboard' ? ((() => { const h = new Date().getHours(); return (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening') + ' ' + (userName ? userName.split(' ')[0].charAt(0).toUpperCase() + userName.split(' ')[0].slice(1) : (userEmail.split('@')[0].charAt(0).toUpperCase() + userEmail.split('@')[0].slice(1))) + (isMobile ? '' : ' 👋') })()) : page.charAt(0).toUpperCase() + page.slice(1)}</h1>
            <p style={{ fontSize: 12, color: HINT, margin: 0 }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {userRole === 'admin' && <div style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: 7, background: TEAL_LIGHT, borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 600, color: TEAL_DARK }}>£{Number(credits).toLocaleString('en-GB', {minimumFractionDigits: 2, maximumFractionDigits: 2})} remaining</div>}
            <button onClick={() => { if (toolTab === 'audio') { if (audioEnabled) setShowAudioConvert(true) } else { if (pdfEnabled) setShowConvert(true) } }} style={{ padding: isMobile ? '6px 12px' : '8px 16px', borderRadius: 8, border: 'none', background: toolTab === 'audio' ? '#2563EB' : TEAL, color: '#fff', fontFamily: 'inherit', fontSize: isMobile ? 12 : 13, fontWeight: 600, cursor: 'pointer', minWidth: isMobile ? 120 : 140, whiteSpace: 'nowrap' }}>+ {toolTab === 'audio' ? 'Convert Audio' : 'Convert PDF'}</button>
          </div>
        </div>

        {/* TOOL TAB BAR */}
        <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: '0 32px', display: 'flex', gap: 0, flexShrink: 0, justifyContent: 'center' }}>
          {[
            ...(pdfEnabled ? [{ id: 'pdf', label: '📄 PDF to Word', color: TEAL }] : []),
            ...(audioEnabled ? [{ id: 'audio', label: '🎙️ Audio to Word', color: '#2563EB' }] : []),
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setToolTab(tab.id as 'pdf' | 'audio'); setPage('dashboard') }}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderBottom: (toolTab === tab.id && page !== 'cleanpdf') ? `2px solid ${tab.color}` : '2px solid transparent',
                background: 'transparent',
                color: (toolTab === tab.id && page !== 'cleanpdf') ? tab.color : MUTED,
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: (toolTab === tab.id && page !== 'cleanpdf') ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={() => setPage('cleanpdf')}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderBottom: page === 'cleanpdf' ? '2px solid #16A34A' : '2px solid transparent',
              background: 'transparent',
              color: page === 'cleanpdf' ? '#16A34A' : MUTED,
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: page === 'cleanpdf' ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s',
              marginBottom: -1,
            }}
          >
            🧹 Clean PDF
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 16 : 28, paddingBottom: isMobile ? 100 : 28 }}>
          {page === 'dashboard' && (
            <div>
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}` }}>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Lifetime statistics <span style={{ fontSize: 12, fontWeight: 400, color: HINT }}>— includes deleted reports</span></p>
                </div>
                <div style={{ padding: '16px 20px' }}>
              {(() => {
                const tabConvs = conversions.filter((c: any) => toolTab === 'audio' ? c.type === 'audio' : c.type !== 'audio')
                const tabTotal = tabConvs.length
                const tabSpend = tabConvs.reduce((s: number, c: any) => s + (c.cost ? Number(c.cost) : (c.type === 'audio' ? 9.60 : 4.00)), 0)
                const tabMarket = tabConvs.reduce((s: number, c: any) => { const mkt: Record<string,number>={'room_only':10,'studio':15,'1bed':15,'2bed':20,'3bed':25,'4bed':35,'5bed':45,'6bed':50,'7bed':55,'8bed':60,'9bed':65,'10bed':70,'11bed':75,'12bed':80}; const market=c.type==='audio'?(c.property_size?mkt[c.property_size]||12:12):12; return s+market }, 0)
                const tabSaving = Math.max(0, tabMarket - tabSpend)
                const tabDur = tabConvs.reduce((s: number, r: any) => s + (r.duration_seconds || 0), 0)
                const tabAvg = tabTotal > 0 ? Math.round(tabDur / tabTotal) : 0
                const tabAudio = tabConvs.reduce((s: number, r: any) => s + (r.audio_length_seconds || 0), 0)
                const fmtT = (s: number) => s >= 60 ? Math.floor(s/60)+'m '+(s%60)+'s' : s+'s'
                return (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : `repeat(${userRole === 'admin' ? (toolTab === 'audio' ? 6 : 5) : (toolTab === 'audio' ? 4 : 3)},minmax(0,1fr))`, gap: 16, marginBottom: 0 }}>
                {(userRole === 'admin' ? [['Total reports', tabTotal.toString(), 'all time'],['Total spent', '£'+tabSpend.toFixed(2), toolTab === 'audio' ? 'varies by property size' : '@ £4.00 per report'],['Avg. time', tabTotal > 0 ? fmtT(tabAvg) : '—', 'per conversion'],['Total time', fmtT(tabDur), 'all conversions'], ...(toolTab === 'audio' ? [['Total audio', fmtT(tabAudio), 'audio recorded']] : []), ['Est. saving', '£'+tabSaving.toFixed(2), 'vs. manual typing']] : [['Total reports', tabTotal.toString(), 'all time'],['Avg. time', tabTotal > 0 ? fmtT(tabAvg) : '—', 'per conversion'],['Total time', fmtT(tabDur), 'all conversions'], ...(toolTab === 'audio' ? [['Total audio', fmtT(tabAudio), 'audio recorded']] : [])]).map(([label,val,sub]) => (
                  <div key={label} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '18px 20px' }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: HINT, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>{label}</p>
                    <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1, color: TEXT, marginBottom: 4 }}>{val}</p>
                    <p style={{ fontSize: 12, color: HINT }}>{sub}</p>
                  </div>
                ))}
              </div>
                )})()}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: 20, marginTop: 16 }}>
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', display: 'block' }}>
                  <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Recent conversions</h2>
                    <button onClick={() => setPage('reports')} style={{ fontSize: 12, color: TEAL, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>View all →</button>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600, display: isMobile ? 'none' : 'table' }}>
                    <thead><tr style={{ background: BG }}>
                      {(toolTab === 'audio' ? ['Property','Property Size','Furn/Unfurn','Audio Length','Conv. Time','Cost','By','Rating','Status',''] : ['Property','Rooms','Conv. Time','Cost','By','Rating','Status','']).filter(h => userRole === 'admin' || h !== 'Cost').map(h => <th key={h} style={{ fontSize: 11, fontWeight: 600, color: HINT, textTransform: 'uppercase', letterSpacing: 0.8, padding: '10px 20px', textAlign: 'left', borderBottom: `1px solid ${BORDER}` }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {conversions.filter(c => toolTab === 'audio' ? c.type === 'audio' : c.type !== 'audio').slice(0, 14).map(c => (
                        <tr key={c.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                          <td style={{ padding: '12px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 500, color: TEXT, margin: 0 }}>{fmtAddr(c.address)}</p>
                                <p style={{ fontSize: 11, color: HINT, margin: 0 }}>{new Date(c.created_at).toLocaleDateString("en-GB", {day:"numeric",month:"short",year:"numeric"})}</p>
                              </div>
                            </div>
                          </td>
                          {toolTab === 'audio' ? (<><td style={{ padding: '12px 20px', fontSize: 13, color: MUTED }}>{c.property_size ? c.property_size.replace('bed',' bed').replace('_',' ') : '—'}</td><td style={{ padding: '12px 20px', fontSize: 13, color: MUTED }}>{c.furnished ? c.furnished.replace('_',' ') : '—'}</td><td style={{ padding: '12px 20px', fontSize: 13, color: MUTED }}>{c.audio_length_seconds ? (c.audio_length_seconds >= 60 ? Math.floor(c.audio_length_seconds/60)+'m '+(c.audio_length_seconds%60)+'s' : c.audio_length_seconds+'s') : '—'}</td></>) : (<td style={{ padding: '12px 20px', fontSize: 13, color: MUTED }}>{c.rooms} rooms</td>)}
                          <td style={{ padding: '12px 20px', fontSize: 13, color: MUTED }}>{c.duration_seconds ? (c.duration_seconds >= 60 ? Math.floor(c.duration_seconds/60)+"m "+( c.duration_seconds%60)+"s" : c.duration_seconds+"s") : "—"}</td>
                          {userRole === 'admin' && <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600 }}>£{(c.cost ? Number(c.cost) : 5).toFixed(2)}</td>}
                          <td style={{ padding: '12px 20px', fontSize: 12, color: MUTED }}>{(c.converted_by || '').split(' ').map((n: string, i: number) => i === 0 ? n : n[0]).join(' ')}</td>
                          <td style={{ padding: '12px 20px' }}>
                            <div style={{ display: 'flex', gap: 1 }}>
                              {[1,2,3,4,5].map(star => (
                                <span key={star} onClick={async () => {
                                  if (c.rating) return
                                  await supabase.from('conversions').update({ rating: star }).eq('id', c.id)
                                  setConversions(prev => prev.map(x => x.id === c.id ? { ...x, rating: star } : x))
                                }} style={{ fontSize: 14, color: star <= (c.rating || 0) ? '#F59E0B' : '#D1D5DB', cursor: c.rating ? 'default' : 'pointer', lineHeight: 1 }}>★</span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: '12px 20px' }}><span style={{ background: '#E6F9F2', color: '#d45500', fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20 }}>Complete</span></td>
                          <td style={{ padding: '12px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {c.file_path ? (
                              <button onClick={async () => {
                                const { data } = await supabase.storage.from('documents').createSignedUrl(c.file_path, 60)
                                if (data?.signedUrl) { const response = await fetch(data.signedUrl); const fileBlob = await response.blob(); const blobUrl = URL.createObjectURL(fileBlob); const a = document.createElement('a'); a.href = blobUrl; a.download = formatDocxName(c.address || '') + '.docx'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl) }
                              }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title="Download">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9,15 12,18 15,15"/></svg>
                              </button>
                            ) : (
                              <span style={{ fontSize: 11, color: HINT, padding: 4 }}>—</span>
                            )}
                            {c.type !== 'audio' && <button title={c.accuracy_report ? 'View accuracy report' : (c.extracted_text || c.converted_json ? 'Generate accuracy report' : 'No source data')} onClick={() => c.accuracy_report ? setViewingReport(c) : c.extracted_text || c.converted_json ? setShowAccuracyConfirm(c) : null} style={{ background: 'none', border: 'none', cursor: c.extracted_text || c.converted_json || c.accuracy_report ? 'pointer' : 'default', padding: 4, opacity: c.extracted_text || c.accuracy_report ? 1 : 0.3 }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.accuracy_report ? TEAL : MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="12" x2="8" y2="17"/><line x1="12" y1="8" x2="12" y2="17"/><line x1="16" y1="15" x2="16" y2="17"/></svg>
                            </button>}
                            <button onClick={() => deleteConversion(c.id, c.file_path)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title="Delete">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2 2 0 01-2 2H8a2 2 0 01-2-2L5,6"/><path d="M10,11v6M14,11v6"/><path d="M9,6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                            </button>
                          </div>
                        </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}` }}><h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Credits</h3></div>
                    <div style={{ padding: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}><span style={{ fontWeight: 600 }}>£{typeof credits === 'number' ? Number(credits).toLocaleString('en-GB', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : credits} remaining.</span></div>
                      {toolTab !== 'audio' && <p style={{ fontSize: 12, color: MUTED, marginBottom: 14 }}>Approx. <strong style={{ color: TEXT }}>{Math.floor(Number(credits) / 5)}</strong> conversions (accuracy report included with each)</p>}
                      <p style={{ fontSize: 12, color: HINT, marginBottom: 14 }}>{toolTab === 'audio' ? 'Pricing varies by property size · Balance never expires.' : '£4.00 per conversion · Accuracy report included · Balance never expires.'}</p>
                      <button onClick={() => setShowTopup(true)} style={{ width: '100%', padding: 10, borderRadius: 9, border: 'none', background: toolTab === 'audio' ? '#2563EB' : TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Top up balance</button>
                    </div>
                  </div>
                  <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}` }}><h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>This month</h3></div>
                    <div style={{ padding: 18 }}>
                      {[['Reports converted',conversions.filter((c:any)=>toolTab==='audio'?c.type==='audio':c.type!=='audio').length.toString()],['Total spent','£'+conversions.filter((c:any)=>toolTab==='audio'?c.type==='audio':c.type!=='audio').reduce((s:number,c:any)=>s+(c.cost?Number(c.cost):4),0).toFixed(2)],['Conversion cost per report', toolTab === 'audio' ? 'Varies by size' : '£4.00'],['Est. saving vs. typist','£'+conversions.filter((c:any)=>toolTab==='audio'?c.type==='audio':c.type!=='audio').reduce((s:number,c:any)=>{const mkt:Record<string,number>={'room_only':10,'studio':15,'1bed':15,'2bed':20,'3bed':25,'4bed':35,'5bed':45,'6bed':50,'7bed':55,'8bed':60,'9bed':65,'10bed':70,'11bed':75,'12bed':80};const market=c.type==='audio'?(c.property_size?mkt[c.property_size]||12:12):12;return s+Math.max(0,market-(c.cost?Number(c.cost):4))},0).toFixed(2)]].map(([l,v],i) => (
                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? `1px solid ${BORDER}` : 'none', fontSize: 13 }}>
                          <span style={{ color: MUTED }}>{l}</span><span style={{ fontWeight: 600, color: l.includes('saving') ? TEAL : TEXT }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}` }}><h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Activity</h3></div>
                    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {conversions.slice(0,10).map((conv, i) => (
                        <div key={conv.id || i} style={{ display: 'flex', gap: 10 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: conv.type === 'audio' ? '#2563EB' : TEAL, flexShrink: 0, marginTop: 4 }} />
                          <div>
                            <p style={{ fontSize: 12, color: TEXT, margin: 0 }}>{fmtAddr(conv.address)} — ready</p>
                            <p style={{ fontSize: 11, color: HINT, margin: 0 }}>{timeAgo(conv.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {page === 'convert' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: '#fff0e6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Convert PDF to Word</h2>
              <p style={{ fontSize: 14, color: '#5A7068', margin: '0 0 24px', textAlign: 'center' }}>Upload any inventory PDF or Word doc and get a perfectly formatted Word document.</p>
              {credits < 5.00 ? (
                <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 10, padding: 14, textAlign: 'center', maxWidth: 300 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', margin: '0 0 6px' }}>No balance remaining</p>
                  <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>Purchase credits to continue.</p>
                </div>
              ) : (
                <button onClick={() => setShowConvert(true)} style={{ padding: '14px 32px', borderRadius: 12, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>+ Convert now — £4.00</button>
              )}
              <p style={{ fontSize: 12, color: '#94AEA6', marginTop: 16 }}>{credits} credit{credits !== 1 ? 's' : ''} remaining</p>
            </div>
          )}

          {page === 'cleanpdf' && (
            <div style={{ maxWidth: 560, margin: '0 auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 28 }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: '#E8EAF0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><polyline points="21,3 21,8 16,8"/></svg>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>Clean &amp; Unlock PDF</h2>
                <p style={{ fontSize: 14, color: MUTED, margin: 0, lineHeight: 1.6 }}>Some PDFs have a security/encryption wrapper applied — even with no password, this can stop our AI from reading the file properly during conversion, causing rooms or rows to be missed. This tool removes that restriction and gives you back a clean copy you can convert normally. If a conversion fails or comes back incomplete, try cleaning the file here first.</p>
              </div>

              {cleanPdfState === 'idle' && (
                <div>
                  <label htmlFor="clean-pdf-upload" style={{ display: 'block', cursor: 'pointer' }}>
                    <div style={{ border: `2px dashed ${BORDER}`, borderRadius: 16, padding: '40px 24px', textAlign: 'center', background: SURFACE }}>
                      <div style={{ width: 52, height: 52, borderRadius: 12, background: '#E8EAF0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      </div>
                      <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Drop your PDF here</p>
                      <p style={{ fontSize: 13, color: HINT }}>or click to browse</p>
                    </div>
                  </label>
                  <input id="clean-pdf-upload" type="file" accept=".pdf,application/pdf" style={{ display: 'none' }} onChange={e => {
                    if (e.target.files?.[0]) setCleanPdfFile(e.target.files[0])
                  }} />

                  {cleanPdfFile && (
                    <div style={{ marginTop: 16, background: BG, borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: 300 }}>{cleanPdfFile.name}</span>
                      <button onClick={() => setCleanPdfFile(null)} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 13 }}>Remove</button>
                    </div>
                  )}

                  <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 16px', marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: MUTED }}>Cost</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>£0.50</span>
                  </div>

                  {cleanPdfError && <p style={{ fontSize: 13, color: '#DC2626', marginTop: 12 }}>{cleanPdfError}</p>}

                  <button
                    disabled={!cleanPdfFile || credits < 0.50}
                    onClick={async () => {
                      if (!cleanPdfFile) return
                      setCleanPdfState('processing')
                      setCleanPdfError('')
                      try {
                        const base64 = await fileToBase64(cleanPdfFile)
                        const { data: { session } } = await supabase.auth.getSession()
                        if (!session) throw new Error('Not signed in')
                        const res = await fetch('/api/clean-pdf', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ user_id: session.user.id, file_base64: base64 })
                        })
                        const d = await res.json()
                        if (d.error) {
                          setCleanPdfError(d.error)
                          setCleanPdfState('idle')
                          return
                        }
                        const cleanName = cleanPdfFile.name.replace(/\.pdf$/i, '') + '_clean.pdf'
                        setCleanPdfResult({ base64: d.cleaned_base64, filename: cleanName })
                        setCredits(d.balance)
                        setCleanPdfState('done')
                      } catch (e: any) {
                        setCleanPdfError(e.message || 'Something went wrong')
                        setCleanPdfState('idle')
                      }
                    }}
                    style={{ width: '100%', marginTop: 20, padding: 14, borderRadius: 12, border: 'none', background: (!cleanPdfFile || credits < 0.50) ? BORDER : TEAL, color: (!cleanPdfFile || credits < 0.50) ? MUTED : '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: (!cleanPdfFile || credits < 0.50) ? 'default' : 'pointer' }}
                  >
                    Clean PDF — £0.50
                  </button>
                  <p style={{ fontSize: 12, color: HINT, textAlign: 'center', marginTop: 12 }}>{credits.toFixed ? credits.toFixed(2) : credits} balance remaining</p>
                </div>
              )}

              {cleanPdfState === 'processing' && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', border: `3px solid ${BORDER}`, borderTopColor: TEAL, margin: '0 auto 20px', animation: 'spin 0.8s linear infinite' }} />
                  <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Cleaning your PDF...</p>
                  <p style={{ fontSize: 13, color: MUTED }}>This usually takes a few seconds.</p>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}

              {cleanPdfState === 'done' && cleanPdfResult && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#E8F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 26 }}>✅</div>
                  <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Your PDF is clean and ready</p>
                  <p style={{ fontSize: 13, color: MUTED, marginBottom: 24 }}>Download it below, then upload it to Convert PDF as normal.</p>
                  <button
                    onClick={() => {
                      const byteArray = Uint8Array.from(atob(cleanPdfResult.base64), c => c.charCodeAt(0))
                      const blob = new Blob([byteArray], { type: 'application/pdf' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = cleanPdfResult.filename
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                      URL.revokeObjectURL(url)
                    }}
                    style={{ padding: '13px 28px', borderRadius: 12, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
                  >
                    ↓ Download {cleanPdfResult.filename}
                  </button>
                  <p style={{ marginTop: 20 }}>
                    <button onClick={() => { setCleanPdfState('idle'); setCleanPdfFile(null); setCleanPdfResult(null) }} style={{ background: 'none', border: 'none', color: MUTED, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>Clean another PDF</button>
                  </p>
                </div>
              )}
            </div>
          )}

          {page === 'reports' && (
            <div>
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: 12 }}>
                  <input placeholder="Search by address..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
                  <button onClick={() => setShowDeleteAll(true)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Delete all</button>
                </div>
                {isMobile && (
                  <div>
                    {conversions.filter(c => !searchQuery || (c.address||'').toLowerCase().includes(searchQuery.toLowerCase())).map(conv => (
                      <div key={conv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: `1px solid ${BORDER}` }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fmtAddr(conv.address)}</p>
                          <p style={{ fontSize: 11, color: HINT, margin: 0 }}>{new Date(conv.created_at).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'})} · {conv.rooms} rooms · {conv.converted_by ? conv.converted_by.split(' ').map((n: string, i: number) => i === 0 ? n : n[0]).join(' ') : ''}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          {conv.file_path ? (
                            <button onClick={async () => {
                              const { data } = await supabase.storage.from('documents').createSignedUrl(conv.file_path, 60)
                              if (data?.signedUrl) { const response = await fetch(data.signedUrl); const fileBlob = await response.blob(); const blobUrl = URL.createObjectURL(fileBlob); const a = document.createElement('a'); a.href = blobUrl; a.download = formatDocxName(conv.address||'')+'.docx'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl) }
                            }} style={{ width: 36, height: 36, borderRadius: 8, background: TEAL_LIGHT, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9,15 12,18 15,15"/></svg>
                            </button>
                          ) : (
                            <div style={{ width: 36, height: 36 }} />
                          )}
                          <button onClick={() => conv.accuracy_report ? setViewingReport(conv) : conv.extracted_text || conv.converted_json ? setShowAccuracyConfirm(conv) : null} style={{ width: 36, height: 36, borderRadius: 8, background: conv.accuracy_report ? TEAL_LIGHT : BG, border: `1px solid ${BORDER}`, cursor: conv.extracted_text || conv.converted_json || conv.accuracy_report ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: conv.extracted_text || conv.accuracy_report ? 1 : 0.3 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={conv.accuracy_report ? TEAL : MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="12" x2="8" y2="17"/><line x1="12" y1="8" x2="12" y2="17"/><line x1="16" y1="15" x2="16" y2="17"/></svg>
                          </button>
                          <button onClick={() => deleteConversion(conv.id, conv.file_path)} style={{ width: 36, height: 36, borderRadius: 8, background: '#FEE2E2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2 2 0 01-2 2H8a2 2 0 01-2-2L5,6"/><path d="M10,11v6M14,11v6"/><path d="M9,6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ position: 'relative' }}><div onScroll={(e) => { const el = e.currentTarget; const fade = el.nextElementSibling as HTMLElement; if (fade) fade.style.opacity = el.scrollLeft + el.clientWidth >= el.scrollWidth - 5 ? '0' : '1' }} style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                  <thead><tr style={{ background: BG }}>{(toolTab === 'audio' ? ['Property','Property Size','Furn/Unfurn','Audio Length','Conv. Time','Cost','By','Rating','Date',''] : ['Property','Rooms','Conv. Time','Cost','By','Rating','Date','']).map(h => <th key={h} style={{ fontSize: 11, fontWeight: 600, color: HINT, textTransform: 'uppercase', padding: '10px 20px', textAlign: 'left', borderBottom: `1px solid ${BORDER}` }}>{h}</th>)}</tr></thead>
                  <tbody>{conversions.filter(c => !searchQuery || (c.address||'').toLowerCase().includes(searchQuery.toLowerCase())).filter(c => toolTab === 'audio' ? c.type === 'audio' : c.type !== 'audio').map(c => (<tr key={c.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '12px 20px', fontSize: 11, fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fmtAddr(c.address)}</td>
                    {toolTab === 'audio' ? (<><td style={{ padding: '12px 20px', fontSize: 12, color: MUTED }}>{c.property_size ? c.property_size.replace('bed',' bed').replace('_',' ') : '—'}</td><td style={{ padding: '12px 20px', fontSize: 12, color: MUTED }}>{c.furnished ? c.furnished.replace('_',' ') : '—'}</td><td style={{ padding: '12px 20px', fontSize: 12, color: MUTED }}>{c.audio_length_seconds ? (c.audio_length_seconds >= 60 ? Math.floor(c.audio_length_seconds/60)+'m '+(c.audio_length_seconds%60)+'s' : c.audio_length_seconds+'s') : '—'}</td></>) : (<td style={{ padding: '12px 20px', fontSize: 12, color: MUTED }}>{c.rooms} rooms</td>)}
                    <td style={{ padding: '12px 20px', fontSize: 13, color: MUTED }}>{c.duration_seconds ? (c.duration_seconds >= 60 ? Math.floor(c.duration_seconds/60)+"m "+( c.duration_seconds%60)+"s" : c.duration_seconds+"s") : "—"}</td>
                    <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600 }}>£4.00</td>
                    <td style={{ padding: '12px 20px', fontSize: 12, color: MUTED }}>{(c.converted_by || '').split(' ').map((n: string, i: number) => i === 0 ? n : n[0]).join(' ')}</td>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', gap: 1 }}>
                        {[1,2,3,4,5].map(star => (
                          <span key={star}
                            onClick={async () => {
                              if (c.rating) return
                              await supabase.from('conversions').update({ rating: star }).eq('id', c.id)
                              setConversions(prev => prev.map(x => x.id === c.id ? { ...x, rating: star } : x))
                            }}
                            style={{ fontSize: 14, color: star <= (c.rating || 0) ? '#F59E0B' : '#D1D5DB', cursor: c.rating ? 'default' : 'pointer', lineHeight: 1 }}>★</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 12, color: MUTED }}>{new Date(c.created_at).toLocaleDateString("en-GB", {day:"numeric",month:"short",year:"numeric"})}</td>
                    <td style={{ padding: '12px 20px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{c.file_path ? (<button onClick={async () => { const { data } = await supabase.storage.from('documents').createSignedUrl(c.file_path, 60); if (data?.signedUrl) { const response = await fetch(data.signedUrl); const fileBlob = await response.blob(); const blobUrl = URL.createObjectURL(fileBlob); const a = document.createElement('a'); a.href = blobUrl; a.download = formatDocxName(c.address||'')+'.docx'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl) } }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title='Download'><svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke={TEAL} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z'/><polyline points='14,2 14,8 20,8'/><line x1='12' y1='18' x2='12' y2='12'/><polyline points='9,15 12,18 15,15'/></svg></button>) : <span style={{ fontSize: 11, color: HINT, padding: 4 }}>—</span>}{c.type !== 'audio' && <button title={c.accuracy_report ? 'View accuracy report' : (c.extracted_text || c.converted_json ? 'Generate accuracy report' : 'No source data')} onClick={() => c.accuracy_report ? setViewingReport(c) : c.extracted_text || c.converted_json ? setShowAccuracyConfirm(c) : null} style={{ background: 'none', border: 'none', cursor: c.extracted_text || c.converted_json || c.accuracy_report ? 'pointer' : 'default', padding: 4, opacity: c.extracted_text || c.accuracy_report ? 1 : 0.3 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.accuracy_report ? TEAL : MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="12" x2="8" y2="17"/><line x1="12" y1="8" x2="12" y2="17"/><line x1="16" y1="15" x2="16" y2="17"/></svg></button>}
                      <button onClick={() => deleteConversion(c.id, c.file_path)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title='Delete'><svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#DC2626' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='3,6 5,6 21,6'/><path d='M19,6l-1,14a2 2 0 01-2 2H8a2 2 0 01-2-2L5,6'/><path d='M10,11v6M14,11v6'/><path d='M9,6V4a1 1 0 011-1h4a1 1 0 011 1v2'/></svg></button></div></td>
                  </tr>))}</tbody>
                </table></div>
                <div id="scroll-fade" style={{ position: 'absolute', top: 0, right: 0, width: 60, height: '100%', background: 'linear-gradient(to right, transparent, white)', pointerEvents: 'none', borderRadius: '0 14px 14px 0' }} />
                </div>
              </div>
            </div>
          )}

          {page === 'billing' && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px', letterSpacing: -0.3 }}>Billing</h2>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div style={{ background: TEAL, borderRadius: 14, padding: 24, color: '#fff' }}>
                  <p style={{ fontSize: 12, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Current balance</p>
                  <p style={{ fontSize: 42, fontWeight: 700, letterSpacing: -1, lineHeight: 1, marginBottom: 6 }}>£{Number(credits).toLocaleString('en-GB', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 20 }}>balance remaining</p>
                  <button onClick={() => setShowTopup(true)} style={{ padding: '10px 20px', borderRadius: 9, border: 'none', background: '#fff', color: TEAL, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Top up balance</button>
                </div>
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24 }}>
                  {[['Reports converted',conversions.filter((c:any)=>toolTab==='audio'?c.type==='audio':c.type!=='audio').length.toString()],['Total spent','£'+conversions.filter((c:any)=>toolTab==='audio'?c.type==='audio':c.type!=='audio').reduce((s:number,c:any)=>s+(c.cost?Number(c.cost):(c.type==='audio'?4.88:4.00)),0).toFixed(2)],['Avg. conv. time',(()=>{const filtered=conversions.filter((c:any)=>toolTab==='audio'?c.type==='audio':c.type!=='audio');return filtered.length>0?(()=>{const avg=Math.round(filtered.reduce((s:number,r:any)=>s+(r.duration_seconds||0),0)/filtered.length);return avg>=60?Math.floor(avg/60)+'m '+(avg%60)+'s':avg+'s'})():'—'})()],['Est. saving vs. typist','£'+conversions.filter((c:any)=>toolTab==='audio'?c.type==='audio':c.type!=='audio').reduce((s:number,c:any)=>{const mkt:Record<string,number>={'room_only':10,'studio':15,'1bed':15,'2bed':20,'3bed':25,'4bed':35,'5bed':45,'6bed':50,'7bed':55,'8bed':60,'9bed':65,'10bed':70,'11bed':75,'12bed':80};const market=c.type==='audio'?(c.property_size?mkt[c.property_size]||12:12):12;return s+Math.max(0,market-(c.cost?Number(c.cost):(c.type==='audio'?4.88:4.00)))},0).toFixed(2)]].map(([l,v],i) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? `1px solid ${BORDER}` : 'none', fontSize: 13 }}>
                      <span style={{ color: MUTED }}>{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {userRole === 'admin' && (
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Invoice history</h3>
                  </div>
                  {transactions.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: MUTED, fontSize: 13 }}>No invoices yet. Top-ups will appear here once payments are processed.</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr style={{ background: BG }}>
                        {['Date','Invoice #','Description','Amount',''].map(h => <th key={h} style={{ fontSize: 11, fontWeight: 600, color: HINT, textTransform: 'uppercase' as const, letterSpacing: 0.8, padding: '10px 20px', textAlign: 'left', borderBottom: `1px solid ${BORDER}` }}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {transactions.map(t => (
                          <tr key={t.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                            <td style={{ padding: '12px 20px', fontSize: 13 }}>{new Date(t.created_at).toLocaleDateString('en-GB')}</td>
                            <td style={{ padding: '12px 20px', fontSize: 13, fontFamily: 'monospace' }}>{t.invoice_number || '—'}</td>
                            <td style={{ padding: '12px 20px', fontSize: 13, color: MUTED }}>{t.description || 'Balance top-up'}</td>
                            <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600 }}>£{Number(t.amount).toFixed(2)}</td>
                            <td style={{ padding: '12px 20px' }}><button style={{ fontSize: 12, color: TEAL, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Download</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {userRole === 'admin' && (
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', marginTop: 20 }}>
                  <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}` }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>Usage invoices</h3>
                    <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>Download a report of completed conversions and their cost for your own accounting records.</p>
                  </div>
                  <div style={{ padding: 20 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' as const }}>
                      {(['today','week','month','custom'] as const).map(p => (
                        <button key={p} onClick={() => setUsageInvoicePeriod(p)} style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${usageInvoicePeriod === p ? TEAL : BORDER}`, background: usageInvoicePeriod === p ? TEAL : 'transparent', color: usageInvoicePeriod === p ? '#fff' : TEXT, fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize' as const }}>
                          {p === 'today' ? 'Today' : p === 'week' ? 'This week' : p === 'month' ? 'This month' : 'Custom range'}
                        </button>
                      ))}
                    </div>

                    {usageInvoicePeriod === 'custom' && (
                      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' as const }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, color: MUTED, marginBottom: 5 }}>From</label>
                          <input type="date" value={usageInvoiceFrom} onChange={e => setUsageInvoiceFrom(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: 'inherit', fontSize: 13 }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, color: MUTED, marginBottom: 5 }}>To</label>
                          <input type="date" value={usageInvoiceTo} onChange={e => setUsageInvoiceTo(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: 'inherit', fontSize: 13 }} />
                        </div>
                      </div>
                    )}

                    {(() => {
                      const items = getUsageInvoiceConversions()
                      const total = items.reduce((s: number, c: any) => s + (c.cost ? Number(c.cost) : (c.type === 'audio' ? 4.88 : 4.00)), 0)
                      return (
                        <>
                          <div style={{ background: BG, borderRadius: 10, padding: '14px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <p style={{ fontSize: 13, color: MUTED, margin: '0 0 2px' }}>{items.length} report{items.length === 1 ? '' : 's'} in this period</p>
                              <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>£{total.toFixed(2)}</p>
                            </div>
                            <button onClick={downloadUsageInvoicePDF} disabled={generatingUsageInvoice || items.length === 0} style={{ padding: '10px 20px', borderRadius: 9, border: 'none', background: items.length === 0 ? BORDER : TEAL, color: items.length === 0 ? MUTED : '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: items.length === 0 ? 'default' : 'pointer' }}>
                              {generatingUsageInvoice ? 'Generating...' : '↓ Download PDF'}
                            </button>
                          </div>
                          {items.length > 0 && (
                            <div style={{ maxHeight: 240, overflowY: 'auto', border: `1px solid ${BORDER}`, borderRadius: 10 }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead><tr style={{ background: BG, position: 'sticky' as const, top: 0 }}>
                                  {['Date','Property','Type','Cost'].map(h => <th key={h} style={{ fontSize: 11, fontWeight: 600, color: HINT, textTransform: 'uppercase' as const, letterSpacing: 0.8, padding: '8px 14px', textAlign: 'left' }}>{h}</th>)}
                                </tr></thead>
                                <tbody>
                                  {items.map((c: any) => (
                                    <tr key={c.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                                      <td style={{ padding: '8px 14px', fontSize: 12 }}>{new Date(c.created_at).toLocaleDateString('en-GB')}</td>
                                      <td style={{ padding: '8px 14px', fontSize: 12, color: MUTED, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{c.address || 'Unknown'}</td>
                                      <td style={{ padding: '8px 14px', fontSize: 12 }}>{c.type === 'audio' ? 'Audio' : 'PDF'}</td>
                                      <td style={{ padding: '8px 14px', fontSize: 12, fontWeight: 600 }}>£{(c.cost ? Number(c.cost) : (c.type === 'audio' ? 4.88 : 4.00)).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

           {page === 'settings' && (
            <SettingsPage supabase={supabase} userEmail={userEmail} TEXT={TEXT} MUTED={MUTED} TEAL={TEAL} BORDER={BORDER} SURFACE={SURFACE} BG={BG} HINT={HINT} />
          )}

          {page === 'stats' && (
            <StatsPage conversions={conversions} userStats={userStats} toolTab={toolTab} TEAL={toolTab === 'audio' ? '#2563EB' : TEAL} TEAL_LIGHT={toolTab === 'audio' ? '#DBEAFE' : TEAL_LIGHT} TEAL_DARK={toolTab === 'audio' ? '#1D4ED8' : TEAL_DARK} BORDER={BORDER} SURFACE={SURFACE} BG={BG} HINT={HINT} MUTED={MUTED} TEXT={TEXT} typistRateMode={typistRateMode} typistReportRate={typistReportRate} typistPageRate={typistPageRate} />
          )}

          {page === 'legal' && (
            <LegalPage TEAL={TEAL} TEAL_LIGHT={TEAL_LIGHT} BORDER={BORDER} SURFACE={SURFACE} BG={BG} HINT={HINT} MUTED={MUTED} TEXT={TEXT} brand={brand} />
          )}

          {page === 'team' && (
            <TeamPage supabase={supabase} TEAL={TEAL} TEAL_LIGHT={TEAL_LIGHT} TEAL_DARK={TEAL_DARK} BORDER={BORDER} SURFACE={SURFACE} BG={BG} HINT={HINT} MUTED={MUTED} TEXT={TEXT} />
          )}
        </div>
      </main>

      
      {isMobile && (
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: SURFACE, borderTop: `1px solid ${BORDER}`, display: 'flex', zIndex: 100, overflowX: 'auto' }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)} style={{ flex: 1, padding: '10px 4px 8px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={page === item.id ? TEAL : HINT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
              <span style={{ fontSize: 9, color: page === item.id ? TEAL : HINT, fontWeight: page === item.id ? 600 : 400 }}>{item.label}</span>
            </button>
          ))}
        </nav>
      )}
      {showSessionEnded && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,40,32,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px' }}>You've been signed out</h3>
            <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, marginBottom: 24 }}>Your account was signed in on another device, so this session has ended. Sign in again to continue here.</p>
            <button onClick={() => { supabase.auth.signOut().then(() => { window.location.href = '/auth' }) }} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Sign in again</button>
          </div>
        </div>
      )}

      {/* RATING POPUP */}
      {showRatingPopup && pendingRatings.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#ffffff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'scroll', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', scrollbarWidth: 'thin', scrollbarColor: '#1D9E75 #E2EAE7' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px', letterSpacing: -0.3, color: '#1A2820' }}>Rate your conversions</h2>
            <p style={{ fontSize: 13, color: '#5A7068', margin: '0 0 20px' }}>Please rate the following before continuing. Your feedback helps us improve.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {pendingRatings.map((conv: any) => (
                <div key={conv.id} style={{ background: '#f7f9f8', borderRadius: 10, padding: '12px 16px' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1A2820', margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.address}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {[1,2,3,4,5].map(star => (
                        <span key={star} onClick={() => setTempRatings(prev => ({ ...prev, [conv.id]: star }))} style={{ fontSize: 28, cursor: 'pointer', color: star <= (tempRatings[conv.id] || 0) ? '#F59E0B' : '#D1D5DB', lineHeight: 1 }}>★</span>
                      ))}
                    </div>
                    {tempRatings[conv.id] && <span style={{ fontSize: 12, color: '#5A7068' }}>{['','Poor','Fair','Good','Very good','Excellent'][tempRatings[conv.id]]}</span>}
                  </div>
                </div>
              ))}
            </div>
            <button
              disabled={pendingRatings.some((x: any) => !tempRatings[x.id])}
              onClick={submitRatings}
              style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: pendingRatings.every((x: any) => tempRatings[x.id]) ? TEAL : '#E2EAE7', color: pendingRatings.every((x: any) => tempRatings[x.id]) ? '#ffffff' : '#94AEA6', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: pendingRatings.every((x: any) => tempRatings[x.id]) ? 'pointer' : 'default', transition: 'all 0.15s' }}>
              Continue to dashboard →
            </button>
          </div>
        </div>
      )}

      {/* QUICK RATE TOAST */}
      {showQuickRate && quickRateConvId && (
        <div style={{ position: 'fixed', bottom: 90, right: 20, background: '#ffffff', borderRadius: 14, padding: '16px 20px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', zIndex: 200, maxWidth: 320, border: '1px solid #E2EAE7' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#1A2820', margin: '0 0 4px' }}>How was this conversion?</p>
          <p style={{ fontSize: 11, color: '#5A7068', margin: '0 0 12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{quickRateConvAddress}</p>
          <div style={{ display: 'flex', gap: 3, marginBottom: 12 }}>
            {[1,2,3,4,5].map(star => (
              <span key={star} onClick={async () => {
                await supabase.from('conversions').update({ rating: star }).eq('id', quickRateConvId)
                setConversions(prev => prev.map(x => x.id === quickRateConvId ? { ...x, rating: star } : x))
                setShowQuickRate(false)
              }} style={{ fontSize: 28, cursor: 'pointer', color: '#D1D5DB', lineHeight: 1 }}
              onMouseEnter={e => { const el = e.currentTarget; const stars = el.parentElement?.children; if (stars) Array.from(stars).forEach((s, i) => { (s as HTMLElement).style.color = i < star ? '#F59E0B' : '#D1D5DB' }) }}
              onMouseLeave={e => { const el = e.currentTarget; const stars = el.parentElement?.children; if (stars) Array.from(stars).forEach(s => { (s as HTMLElement).style.color = '#D1D5DB' }) }}>★</span>
            ))}
          </div>
          <button onClick={() => setShowQuickRate(false)} style={{ fontSize: 12, color: '#94AEA6', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>Rate later</button>
        </div>
      )}

      {/* DELETE ALL POPUP */}
      {showDeleteAll && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#ffffff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: '#1A2820' }}>Delete all reports?</h2>
            <p style={{ fontSize: 13, color: '#5A7068', margin: '0 0 12px' }}>This will permanently delete all {conversions.length} conversion reports and Word documents from your account.</p>
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 600, margin: '0 0 4px' }}>⚠️ This cannot be undone</p>
              <p style={{ fontSize: 12, color: '#DC2626', margin: 0 }}>Your lifetime statistics will not be affected — total reports, time saved and spend data are stored permanently.</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDeleteAll(false)} style={{ flex: 1, padding: 11, borderRadius: 10, border: '1px solid #E2EAE7', background: 'transparent', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={deleteAllConversions} style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: '#DC2626', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Delete all reports</button>
            </div>
          </div>
        </div>
      )}

      {/* ONBOARDING WELCOME POPUP */}
      {showOnboarding && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 36, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                {brand.company_name === 'InventoryTools' ? (
                  <>
                    <svg width="44" height="44" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" rx="26" fill={TEAL}/><rect x="8" y="10" width="24" height="20" rx="5" fill="white" opacity="0.18"/><rect x="8" y="36" width="24" height="20" rx="5" fill="white" opacity="0.18"/><rect x="8" y="62" width="24" height="20" rx="5" fill="white" opacity="0.18"/><rect x="8" y="88" width="24" height="20" rx="5" fill="white" opacity="0.12"/><rect x="38" y="10" width="74" height="20" rx="5" fill="white" opacity="0.12"/><rect x="38" y="36" width="56" height="20" rx="5" fill="white" opacity="0.12"/><rect x="38" y="62" width="64" height="20" rx="5" fill="white" opacity="0.12"/><rect x="38" y="88" width="44" height="20" rx="5" fill="white" opacity="0.08"/><path d="M30 62 L50 84 L90 40" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span style={{ fontSize: 22, fontWeight: 700, color: TEXT }}>inventory<span style={{ color: TEAL }}>tools</span></span>
                  </>
                ) : (
                  <img src={brand.logo_url || ''} alt={brand.display_name} style={{ height: 44, width: 'auto' }} />
                )}
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px', color: TEXT }}>Welcome to {brand.display_name}</h2>
              <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>Before you get started, here's a quick overview</p>
            </div>
            <div style={{ background: BG, borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, margin: '0 0 12px' }}>How it works:</p>
              {[
                ['📄', 'Upload any inventory PDF', 'Our AI converts it into a perfectly formatted Word document in 1–4 minutes'],
                ['⚙️', 'Check your Settings', 'Your uploaded PDFs and reports are automatically deleted after 14 days by default for GDPR compliance. You can change this period in Settings at any time.'],
                ['📊', 'Accuracy reports', 'After conversion, run an accuracy report to check the quality of your conversion — or cross reference it yourself against your original PDF once the Word document is downloaded.'],
                ['💷', 'Balance', 'Each conversion costs £4.00 and includes a free accuracy report. Top up your balance in the Billing section anytime'],
              ].map(([icon, title, desc]) => (
                <div key={title as string} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, margin: '0 0 2px' }}>{title}</p>
                    <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.5 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: '#fff0e6', borderRadius: 10, padding: 14, marginBottom: 20, border: '1px solid #fdd5b0' }}>
              <p style={{ fontSize: 12, color: '#c24a00', margin: 0, lineHeight: 1.6 }}>
                <strong>Data & GDPR:</strong> Your uploaded PDFs and converted Word documents are stored securely and automatically deleted after your chosen period (default 14 days). This keeps your data minimal and GDPR-compliant.
              </p>
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 20 }}>
              <input type="checkbox" checked={onboardingChecked} onChange={e => setOnboardingChecked(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, accentColor: TEAL, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: TEXT, lineHeight: 1.5 }}>I have read and understood how {brand.display_name} stores and manages my data, including the auto-delete policy.</span>
            </label>
            <button disabled={!onboardingChecked || savingOnboarding} onClick={async () => {
              setSavingOnboarding(true)
              const { data: { session } } = await supabase.auth.getSession()
              if (session) {
                await supabase.from('profiles').update({ onboarding_confirmed: true, onboarding_confirmed_at: new Date().toISOString() }).eq('id', session.user.id)
              }
              setShowOnboarding(false)
              setSavingOnboarding(false)
            }} style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: onboardingChecked ? TEAL : BORDER, color: onboardingChecked ? '#fff' : MUTED, fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: onboardingChecked ? 'pointer' : 'default', transition: 'background 0.2s' }}>
              {savingOnboarding ? 'Saving...' : 'Get started →'}
            </button>
          </div>
        </div>
      )}

      {/* ACCURACY REPORT LOADING */}
      {generatingReport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxWidth: 320, width: '100%' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${TEAL_LIGHT}`, borderTopColor: TEAL, animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px' }}>Generating accuracy report...</p>
            <p style={{ fontSize: 13, color: MUTED, margin: '0 0 10px' }}>This may take 30-90 seconds. Please wait.</p>
            <p style={{ fontSize: 11, fontWeight: 700, color: TEAL, letterSpacing: 0.3 }}>PLEASE KEEP THIS TAB OPEN WHILE GENERATING.</p>
            <p style={{ fontSize: 11, fontWeight: 700, color: TEAL, letterSpacing: 0.3 }}>CLOSING THIS TAB WILL CANCEL YOUR REPORT.</p>
          </div>
        </div>
      )}

      {/* ACCURACY REPORT CONFIRM */}
      {showAccuracyConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>Generate accuracy report?</h2>
            <p style={{ fontSize: 13, color: '#888', margin: '0 0 8px' }}>{showAccuracyConfirm.address}</p>
            <p style={{ fontSize: 13, color: '#444', margin: '0 0 20px' }}>This will compare the original PDF against the converted Word document and generate a room-by-room accuracy report. This is included free with every conversion.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowAccuracyConfirm(null)} style={{ flex: 1, padding: 11, borderRadius: 10, border: '1px solid #e8e8e8', background: 'transparent', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => generateAccuracyReport(showAccuracyConfirm)} disabled={generatingReport} style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: generatingReport ? BORDER : TEAL, color: generatingReport ? MUTED : '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: generatingReport ? 'default' : 'pointer' }}>{generatingReport ? 'Generating...' : 'Generate'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ACCURACY REPORT VIEWER */}
      {viewingReport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>Accuracy Report</p>
                <p style={{ fontSize: 12, color: '#888', margin: 0 }}>{viewingReport.address}</p>
              </div>
              <button onClick={() => setViewingReport(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888', flexShrink: 0, marginLeft: 12 }}>×</button>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.8, color: '#1a1a2e', marginTop: 12 }}>
              {viewingReport.accuracy_report.split('\n').map((line: string, i: number) => {
                if (line.startsWith('### ')) return <h3 key={i} style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 4px', color: '#1a1a2e', borderTop: '2px solid #e8e8e8', paddingTop: 12 }}>{line.replace('### ', '')}</h3>
                if (line.startsWith('## ')) return <h2 key={i} style={{ fontSize: 15, fontWeight: 700, margin: '24px 0 8px', color: '#1a1a2e', borderBottom: `2px solid ${TEAL}`, paddingBottom: 6 }}>{line.replace('## ', '')}</h2>
                if (line.startsWith('**Wrong column**') || line.startsWith('**Missing row**') || line.startsWith('**Extra item**') || line.startsWith('**Duplicated row**')) return <p key={i} style={{ fontWeight: 700, margin: '10px 0 6px', color: '#DC2626', fontSize: 13 }}>{line.replace(/\*\*/g, '')}</p>
                if (line.startsWith('**Original File:**') || line.startsWith('**PDF:**')) return <p key={i} style={{ fontWeight: 700, margin: '10px 0 2px', color: '#1a1a2e', borderTop: '1px solid #e8e8e8', paddingTop: 8 }}>Original File:</p>
                if (line.startsWith('**Converted Word.doc:**') || line.startsWith('**Word doc:**')) return <p key={i} style={{ fontWeight: 700, margin: '10px 0 2px', color: '#1a1a2e', borderTop: '1px solid #e8e8e8', paddingTop: 8 }}>Converted Word.doc:</p>
                if (line.startsWith('**Item:**')) return <p key={i} style={{ margin: '2px 0 0', paddingLeft: 12 }}><strong>Item:</strong> {line.replace('**Item:**', '').trim()}</p>
                if (line.startsWith('**Description:**')) return <p key={i} style={{ margin: '2px 0 0', paddingLeft: 12 }}><strong>Description:</strong> {line.replace('**Description:**', '').trim()}</p>
                if (line.startsWith('**Condition:**')) return <p key={i} style={{ margin: '2px 0 0', paddingLeft: 12 }}><strong>Condition:</strong> {line.replace('**Condition:**', '').trim() || '(empty)'}</p>
                if (line.startsWith('*Issue:') || line.startsWith('*Issue ')) return <p key={i} style={{ margin: '8px 0 4px', paddingLeft: 12, fontStyle: 'italic', color: '#666', fontSize: 12 }}>{line.replace(/\*/g, '')}</p>
                if (line.startsWith('**') && line.endsWith('**')) return <p key={i} style={{ fontWeight: 700, margin: '6px 0 2px' }}>{line.replace(/\*\*/g, '')}</p>
                if (line.startsWith('- ')) return <p key={i} style={{ margin: '2px 0', paddingLeft: 12 }}>• {line.replace('- ', '')}</p>
                if (line.match(/^\|[-\s|:]+\|$/)) return null
                if (line.startsWith('| ')) {
                  const cells = line.split('|').filter((c: string) => c.trim())
                  const isHeader = cells.every((c: string) => c.trim())
                  return <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, margin: '1px 0', background: '#e8e8e8' }}>
                    {cells.map((cell: string, ci: number) => <div key={ci} style={{ background: isHeader && i < 3 ? '#f0f0f0' : '#fff', padding: '4px 8px', fontSize: 12, fontWeight: cell.includes('---') ? 400 : isHeader && i < 3 ? 600 : 400 }}>{cell.trim().replace(/^-+$/, '')}</div>)}
                  </div>
                }
                if (line === '---') return <hr key={i} style={{ border: 'none', borderTop: '1px solid #e8e8e8', margin: '16px 0' }} />
                if (line === '') return <div key={i} style={{ height: 6 }} />
                return <p key={i} style={{ margin: '2px 0' }}>{line.replace(/\\n/g, ' ')}</p>
              })}
            </div>
          </div>
        </div>
      )}

      {/* CONVERT MODAL */}
      {showConvert && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,40,32,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: SURFACE, borderRadius: 16, border: `1px solid ${BORDER}`, width: '100%', maxWidth: 480, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Convert PDF to Word</p><p style={{ fontSize: 12, color: HINT, margin: 0 }}>£4.00 · £{typeof credits === 'number' ? Number(credits).toLocaleString('en-GB', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : credits} remaining</p></div>
              <button onClick={closeConvert} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent', cursor: 'pointer', fontSize: 16, color: MUTED }}>×</button>
            </div>

            <div style={{ margin: '16px 24px 0', padding: '10px 14px', background: '#FFF8E1', border: '1px solid #FFD54F', borderRadius: 8 }}>
              <p style={{ fontSize: 11, color: '#7B5E00', margin: 0, lineHeight: 1.5 }}>⚠️ This conversion uses AI and is not guaranteed to be 100% accurate. PDF quality, formatting, or compression may affect the result. Please check the Word document against the original PDF before use.</p>
            </div>

            {convertState === 'idle' && (
              <div style={{ padding: 24 }}>
                <label htmlFor="pdf-upload">
                  <div
                    style={{ border: `2px dashed ${BORDER}`, borderRadius: 12, padding: 36, textAlign: 'center', cursor: 'pointer', background: BG }}
                    onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
                    onDrop={async e => {
                      e.preventDefault(); e.stopPropagation()
                      const file = e.dataTransfer.files?.[0]
                      if (!file) return
                      setSelectedFile(file)
                      setConvertState('selected')
                      setCompressing(true)
                      setOriginalSize(file.size)
                      try {
                        const { PDFDocument } = await import('pdf-lib')
                        const arrayBuffer = await file.arrayBuffer()
                        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
                        if (pdfDoc.isEncrypted) {
                          setCompressing(false)
                          setConvertError('This file is encrypted/locked. Please use a PDF unlocker (e.g. ilovepdf.com) before uploading the file again.')
                          setConvertState('error')
                          return
                        }
                        const compressed = await pdfDoc.save({ useObjectStreams: true })
                        const blob = new Blob([new Uint8Array(compressed as unknown as ArrayBuffer)], { type: 'application/pdf' })
                        const compressedFile = new File([blob], file.name, { type: 'application/pdf' })
                        setCompressedSize(compressedFile.size)
                        setSelectedFile(compressedFile)
                      } catch(e) {}
                      setCompressing(false)
                    }}
                  >
                    <div style={{ width: 52, height: 52, borderRadius: 12, background: TEAL_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Drop your PDF or Word doc here</p>
                    <p style={{ fontSize: 13, color: HINT }}>or click to browse</p>
                    <p style={{ fontSize: 11, color: HINT, marginTop: 8 }}>If file size is over 30mb, please compress with a tool like ilovepdf.com before uploading.</p>
                    <p style={{ fontSize: 11, color: HINT, marginTop: 4 }}>We only support .docx files. If your Word doc won't upload, this is due to the file being an old MS Word format. Open it in MS Word, then save as .docx first.</p>
                  </div>
                </label>
                <input id="pdf-upload" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style={{ display: 'none' }} onChange={async e => { 
    if (e.target.files?.[0]) { 
      const file = e.target.files[0]
      setSelectedFile(file)
      setConvertState('selected')
      // Start compression immediately
      setCompressing(true)
      setOriginalSize(file.size)
      try {
        const { PDFDocument } = await import('pdf-lib')
        const arrayBuffer = await file.arrayBuffer()
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
        if (pdfDoc.isEncrypted) {
          setCompressing(false)
          setConvertError('This file is encrypted/locked. Please use a PDF unlocker (e.g. ilovepdf.com) before uploading the file again.')
          setConvertState('error')
          return
        }
        const compressed = await pdfDoc.save({ useObjectStreams: true })
        const blob = new Blob([new Uint8Array(compressed as unknown as ArrayBuffer)], { type: 'application/pdf' })
        const compressedFile = new File([blob], file.name, { type: 'application/pdf' })
        setCompressedSize(compressedFile.size)
        setSelectedFile(compressedFile)
      } catch(e) {
        // keep original
      }
      setCompressing(false)
    } 
  }} />
              </div>
            )}

            {convertState === 'selected' && selectedFile && (
              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: TEAL_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{selectedFile.name}</p>
                    <p style={{ fontSize: 11, color: HINT, margin: 0 }}>{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                </div>
                {credits < 5.00 ? (
                  <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 10, padding: 14, textAlign: 'center', marginBottom: 10 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', margin: '0 0 6px' }}>No balance remaining</p>
                    <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>Purchase credits to continue converting.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selectedFile?.name.toLowerCase().endsWith('.docx') ? (
                      <>
                        <button onClick={() => startConvert('worddoc')} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: '#16A34A', color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Convert (Word Doc) — £4.00</button>
                        <p style={{ fontSize: 11, color: HINT, margin: 0, textAlign: 'center' }}>Reads Word document table structure directly</p>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startConvert('text')} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Convert (Text) — £4.00</button>
                        <button onClick={() => startConvert('vision')} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: '#2563EB', color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Convert (Vision) — £4.00</button>
                        <p style={{ fontSize: 11, color: HINT, margin: 0, textAlign: 'center' }}>Text: fast extraction · Vision: reads PDF visually (better for complex layouts)</p>
                      </>
                    )}
                  </div>
                )}
                <button onClick={() => setConvertState('idle')} style={{ width: '100%', padding: 11, borderRadius: 10, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>Choose different file</button>
              </div>
            )}

            {convertState === 'processing' && (
              <div style={{ padding: 24 }}>
                <div style={{ background: TEAL_LIGHT, borderRadius: 10, padding: '16px', marginBottom: 18, textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2.5px solid rgba(253,106,2,0.25)`, borderTopColor: TEAL, animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                    <p style={{ fontSize: 14, fontWeight: 600, color: TEAL_DARK, margin: 0 }}>Processing...</p>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#d45500' }}>⏱ {elapsed >= 60 ? Math.floor(elapsed/60) + 'm ' + (elapsed%60) + 's' : elapsed + 's'}</span>
                  </div>
                  <p style={{ fontSize: 11, color: '#d45500', margin: '0 0 12px' }}>{selectedFile?.name}</p>
                  <p style={{ fontSize: 11, fontWeight: 700, color: TEAL, margin: '0 0 4px', letterSpacing: 0.3 }}>THIS IS RUNNING IN THE BACKGROUND — YOU CAN USE OTHER TABS FREELY.</p>
                  <p style={{ fontSize: 11, fontWeight: 700, color: TEAL, margin: 0, letterSpacing: 0.3 }}>DO NOT CLOSE THIS TAB UNTIL THE CONVERSION IS COMPLETE.</p>
                </div>
                <div style={{ height: 4, borderRadius: 20, background: 'rgba(29,158,117,0.2)', overflow: 'hidden', marginBottom: 14 }}>
                  <div style={{ height: '100%', borderRadius: 20, background: TEAL, animation: 'progress 2s ease-in-out infinite' }} />
                </div>
                {processingRooms.map((room, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10, padding: '6px 0', borderBottom: `1px solid ${BORDER}`, opacity: room.state === 'pending' ? 0.35 : 1 }}>
                    {room.state === 'done' && <div style={{ width: 18, height: 18, borderRadius: '50%', background: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2.5"><polyline points="2,5 4,7 8,3"/></svg></div>}
                    {room.state === 'active' && <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid rgba(29,158,117,0.2)`, borderTopColor: TEAL, animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />}
                    {room.state === 'pending' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: BORDER, margin: '0 6px', flexShrink: 0 }} />}
                    <span style={{ fontSize: 13, fontWeight: room.state === 'active' ? 600 : 400, color: room.state === 'active' ? TEAL_DARK : TEXT }}>{room.name}</span>
                  </div>
                ))}
              </div>
            )}

            {convertState === 'done' && docxUrl && (
              <div style={{ padding: 24 }}>
                <div style={{ background: TEAL_LIGHT, border: `1px solid ${TEAL}`, borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: TEAL_DARK, marginBottom: 4 }}>Conversion complete!</p>
                  <p style={{ fontSize: 13, color: MUTED }}>{processingRooms.length} rooms in {elapsed >= 60 ? Math.floor(elapsed/60) + 'm ' + (elapsed%60) + 's' : elapsed + 's'}</p>
                  <div style={{ marginTop: 12, maxHeight: 300, overflowY: "auto" }}>
                    {(() => {
                      const names = processingRooms.map(r => r.name)
                      const dupes = names.filter((n, i) => names.indexOf(n) !== i)
                      const hasDupes = dupes.length > 0
                      return <>
                        {hasDupes && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: '#DC2626', fontWeight: 600 }}>⚠️ Duplicate room names found. Information has been copied exactly as per the PDF but highlighted for your attention in case you wish to manually rename.</div>}
                        {processingRooms.map((room, i) => {
                          const isDupe = dupes.includes(room.name)
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid rgba(29,158,117,0.15)' }}>
                              <div style={{ width: 16, height: 16, borderRadius: '50%', background: isDupe ? '#DC2626' : TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2.5"><polyline points="2,5 4,7 8,3"/></svg>
                              </div>
                              <span style={{ fontSize: 12, color: isDupe ? '#DC2626' : TEAL_DARK, fontWeight: isDupe ? 700 : 400 }}>{room.name}{isDupe ? ' ⚠️' : ''}</span>
                            </div>
                          )
                        })}
                      </>
                    })()}
                  </div>
                </div>
                <a href={docxUrl} download={docxName} onClick={() => setTimeout(() => window.location.reload(), 2000)} style={{ display: 'block', width: '100%', padding: 13, borderRadius: 10, background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, textAlign: 'center', textDecoration: 'none', marginBottom: 10, boxSizing: 'border-box' }}>↓ Download {docxName}</a>
                <button onClick={closeConvert} style={{ width: '100%', padding: 11, borderRadius: 10, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>Close</button>
              </div>
            )}

            {convertState === 'error' && (
              <div style={{ padding: 24 }}>
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', marginBottom: 4 }}>Conversion failed</p>
                  <p style={{ fontSize: 13, color: '#DC2626' }}>{convertError}</p>
                </div>
                <button onClick={() => setConvertState('idle')} style={{ width: '100%', padding: 11, borderRadius: 10, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>Try again</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOPUP MODAL */}
      {showTopup && (() => { const finalAmount = topupAmount || (customAmount ? parseFloat(customAmount) : null); return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,40,32,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: SURFACE, borderRadius: 16, border: `1px solid ${BORDER}`, width: '100%', maxWidth: 440, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
              <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>Top up balance</p>
                  <p style={{ fontSize: 12, color: HINT, margin: 0 }}>Balance never expires · Non-refundable</p>
                </div>
                <button onClick={() => setShowTopup(false)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent', cursor: 'pointer', fontSize: 16, color: MUTED }}>×</button>
              </div>
              <div style={{ padding: '16px 24px', borderBottom: `1px solid ${BORDER}` }}>
                <p style={{ fontSize: 12, color: HINT, margin: '0 0 4px' }}>Pricing varies by property size · Balance never expires</p>
              </div>
              <div style={{ padding: '18px 24px' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 10 }}>Quick select:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {[20,30,40,50,100,150,200].map(amt => (
                    <button key={amt} onClick={() => { setTopupAmount(amt); setCustomAmount('') }} style={{ padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${topupAmount === amt ? TEAL : BORDER}`, background: topupAmount === amt ? TEAL : 'transparent', color: topupAmount === amt ? '#fff' : TEXT, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>£{amt}</button>
                  ))}
                </div>
                <p style={{ fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 8 }}>Or enter custom amount (minimum £20):</p>
                <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
                  <span style={{ padding: '10px 12px', background: BG, color: MUTED, fontSize: 14, fontWeight: 600, borderRight: `1px solid ${BORDER}` }}>£</span>
                  <input type="number" min="20" placeholder="20.00" value={customAmount} onChange={e => { setCustomAmount(e.target.value); setTopupAmount(null) }} style={{ flex: 1, padding: '10px 12px', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 14 }} />
                </div>
                <button disabled={!finalAmount || finalAmount < 20} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: finalAmount && finalAmount >= 20 ? TEAL : BORDER, color: finalAmount && finalAmount >= 20 ? '#fff' : MUTED, fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: finalAmount && finalAmount >= 20 ? 'pointer' : 'default' }}>
                  {finalAmount && finalAmount >= 20 ? `Top up £${finalAmount.toFixed(2)} →` : 'Select or enter an amount'}
                </button>
                <p style={{ fontSize: 11, color: HINT, textAlign: 'center', marginTop: 10 }}>Secured by Stripe · Funds added instantly after payment</p>
              </div>
            </div>
          </div>
        ) })()}

      {/* AUDIO CONVERT MODAL */}
      {showAudioConvert && (() => {
        const AUDIO_BLUE = '#2563EB'
        const AUDIO_BLUE_LIGHT = '#EFF6FF'
        const AUDIO_BLUE_DARK = '#1D4ED8'

        const PROPERTY_SIZES = [
          { value: 'room_only', label: 'Room only', beds: 0 },
          { value: 'studio', label: 'Studio flat', beds: 0 },
          { value: '1bed', label: '1 bedroom', beds: 1 },
          { value: '2bed', label: '2 bedrooms', beds: 2 },
          { value: '3bed', label: '3 bedrooms', beds: 3 },
          { value: '4bed', label: '4 bedrooms', beds: 4 },
          { value: '5bed', label: '5 bedrooms', beds: 5 },
          { value: '6bed', label: '6 bedrooms', beds: 6 },
          { value: '7bed', label: '7 bedrooms', beds: 7 },
          { value: '8bed', label: '8 bedrooms', beds: 8 },
          { value: '9bed', label: '9 bedrooms', beds: 9 },
          { value: '10bed', label: '10 bedrooms', beds: 10 },
          { value: '11bed', label: '11 bedrooms', beds: 11 },
          { value: '12bed', label: '12 bedrooms', beds: 12 },
        ]

        // What you charge the user (48.75% of market rate)
        const AUDIO_PRICES_UNFURNISHED: Record<string, number> = {
          room_only: 4.88, studio: 7.31, '1bed': 7.31, '2bed': 9.75, '3bed': 12.19,
          '4bed': 17.06, '5bed': 21.94, '6bed': 24.38, '7bed': 26.81, '8bed': 29.25,
          '9bed': 31.69, '10bed': 34.13, '11bed': 36.56, '12bed': 39.00,
        }
        const AUDIO_PRICES_FURNISHED: Record<string, number> = {
          room_only: 6.09, studio: 8.53, '1bed': 8.53, '2bed': 10.97, '3bed': 13.41,
          '4bed': 18.28, '5bed': 23.16, '6bed': 25.59, '7bed': 28.03, '8bed': 30.47,
          '9bed': 32.91, '10bed': 35.34, '11bed': 37.78, '12bed': 40.22,
        }
        // Market rates (what a typist would charge) — used for savings calculation
        const AUDIO_MARKET_UNFURNISHED: Record<string, number> = {
          room_only: 10.00, studio: 15.00, '1bed': 15.00, '2bed': 20.00, '3bed': 25.00,
          '4bed': 35.00, '5bed': 45.00, '6bed': 50.00, '7bed': 55.00, '8bed': 60.00,
          '9bed': 65.00, '10bed': 70.00, '11bed': 75.00, '12bed': 80.00,
        }
        const AUDIO_MARKET_FURNISHED: Record<string, number> = {
          room_only: 12.50, studio: 17.50, '1bed': 17.50, '2bed': 22.50, '3bed': 27.50,
          '4bed': 37.50, '5bed': 47.50, '6bed': 52.50, '7bed': 57.50, '8bed': 62.50,
          '9bed': 67.50, '10bed': 72.50, '11bed': 77.50, '12bed': 82.50,
        }
        const isFurnished = audioFurnished === 'furnished' || audioFurnished === 'part_furnished'
        const price = audioPropertySize ? (isFurnished ? AUDIO_PRICES_FURNISHED[audioPropertySize] : AUDIO_PRICES_UNFURNISHED[audioPropertySize]) : null
        const marketPrice = audioPropertySize ? (isFurnished ? AUDIO_MARKET_FURNISHED[audioPropertySize] : AUDIO_MARKET_UNFURNISHED[audioPropertySize]) : null
        const canConvert = audioFiles.length > 0 && audioAddress.trim() && audioPropertySize && audioFurnished

        function closeAudioModal() {
          setShowAudioConvert(false)
          setAudioFiles([])
          setAudioAddress('')
          setAudioPropertySize('')
          setAudioFurnished('')
          setAudioRoomOrder('')
          setAudioConvertState('idle')
          setAudioError('')
          setAudioDocxUrl(null)
        }

        const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: 'inherit', fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' as const }
        const labelStyle = { display: 'block' as const, fontSize: 12, fontWeight: 600 as const, color: MUTED, marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: 0.5 }

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,40,32,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: SURFACE, borderRadius: 16, border: `1px solid ${BORDER}`, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>

              {/* Header */}
              <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: SURFACE, zIndex: 1 }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>🎙️ Convert Audio to Word</p>
                  <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>{price ? `£${price.toFixed(2)} · £${Number(credits).toFixed(2)} remaining` : 'Select property size to see price'}</p>
                </div>
                <button onClick={closeAudioModal} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent', cursor: 'pointer', fontSize: 16, color: MUTED }}>×</button>
              </div>

              <div style={{ margin: '16px 24px 0', padding: '10px 14px', background: '#FFF8E1', border: '1px solid #FFD54F', borderRadius: 8 }}>
                <p style={{ fontSize: 11, color: '#7B5E00', margin: 0, lineHeight: 1.5 }}>⚠️ This conversion uses AI and is not guaranteed to be 100% accurate. Audio quality and clarity may affect the result. Please check the Word document against the original recording before use.</p>
              </div>

              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* Property address */}
                <div>
                  <label style={labelStyle}>Property address</label>
                  <input value={audioAddress} onChange={e => setAudioAddress(e.target.value)} placeholder="e.g. 12 High Street, London, SW1A 1AA" style={inputStyle} />
                </div>

                {/* Property size + Furnished row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Property size</label>
                    <select value={audioPropertySize} onChange={e => setAudioPropertySize(e.target.value)} style={{ ...inputStyle, appearance: 'none' as const }}>
                      <option value="">Select size...</option>
                      {PROPERTY_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Furnished?</label>
                    <select value={audioFurnished} onChange={e => setAudioFurnished(e.target.value)} style={{ ...inputStyle, appearance: 'none' as const }}>
                      <option value="">Select...</option>
                      <option value="furnished">Furnished</option>
                      <option value="unfurnished">Unfurnished</option>
                      <option value="part_furnished">Part furnished</option>
                    </select>
                  </div>
                </div>

                {/* Price display */}
                {price && (
                  <div style={{ background: AUDIO_BLUE_LIGHT, border: `1px solid #BFDBFE`, borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: 12, color: AUDIO_BLUE_DARK, fontWeight: 600, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Conversion price</p>
                      <p style={{ fontSize: 11, color: AUDIO_BLUE, margin: 0 }}>Based on selected property size</p>
                    </div>
                    <p style={{ fontSize: 28, fontWeight: 700, color: AUDIO_BLUE, margin: 0 }}>£{price.toFixed(2)}</p>
                  </div>
                )}

                {/* Room order */}
                <div>
                  <label style={labelStyle}>Room order <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(one room per line — audio file names must match these room names exactly. The order here is the order rooms will appear in the Word document.)</span></label>
                  <textarea
                    value={audioRoomOrder}
                    onChange={e => {
                      const lines = e.target.value.split('\n')
                      const cased = lines.map((line, idx) => {
                        // Only auto-capitalise completed lines (not the one being typed)
                        if (idx < lines.length - 1) {
                          return line.replace(/\b\w/g, (c: string) => c.toUpperCase())
                        }
                        return line
                      })
                      setAudioRoomOrder(cased.join('\n'))
                    }}
                    placeholder={"Hall\nLiving Room\nKitchen\nBedroom 1\nBedroom 2\nBathroom"}
                    rows={6}
                    style={{ ...inputStyle, resize: 'vertical' as const, lineHeight: 1.6 }}
                  />
                </div>

                {/* Audio file upload */}
                <div>
                  <label style={labelStyle}>Audio files <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(upload one or more — any combination of files)</span></label>
                  <label htmlFor="audio-upload">
                    <div
                      style={{ border: `2px dashed ${audioFiles.length > 0 ? AUDIO_BLUE : BORDER}`, borderRadius: 12, padding: 20, textAlign: 'center', cursor: 'pointer', background: audioFiles.length > 0 ? AUDIO_BLUE_LIGHT : BG, transition: 'all 0.15s' }}
                      onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
                      onDrop={e => {
                        e.preventDefault(); e.stopPropagation()
                        const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|webm)$/i.test(f.name))
                        if (dropped.length > 0) setAudioFiles(prev => [...prev, ...dropped])
                      }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: AUDIO_BLUE_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={AUDIO_BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 3px', color: AUDIO_BLUE }}>Drop audio files here or click to browse</p>
                      <p style={{ fontSize: 11, color: HINT }}>Supports .mp3 .wav .m4a .ogg .webm · Multiple files allowed</p>
                    </div>
                  </label>
                  <input id="audio-upload" type="file" accept=".mp3,.wav,.m4a,.ogg,.webm,audio/*" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files) setAudioFiles(prev => [...prev, ...Array.from(e.target.files!)]) }} />

                  {audioFiles.length > 0 && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {audioFiles.map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: AUDIO_BLUE_LIGHT, border: `1px solid #BFDBFE`, borderRadius: 8, padding: '8px 12px' }}>
                          <div style={{ width: 28, height: 28, borderRadius: 6, background: AUDIO_BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
                            <p style={{ fontSize: 11, color: AUDIO_BLUE, margin: 0 }}>{(f.size / 1024 / 1024).toFixed(1)} MB</p>
                          </div>
                          <button onClick={e => { e.preventDefault(); setAudioFiles(prev => prev.filter((_, idx) => idx !== i)) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, fontSize: 16, padding: 2, flexShrink: 0 }}>×</button>
                        </div>
                      ))}
                      <button onClick={e => { e.preventDefault(); setAudioFiles([]) }} style={{ fontSize: 11, color: MUTED, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '2px 0', fontFamily: 'inherit' }}>Clear all files</button>
                    </div>
                  )}
                </div>

                {/* Processing state */}
                {audioConvertState === 'processing' && (
                  <div style={{ background: AUDIO_BLUE_LIGHT, borderRadius: 10, padding: 16, textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid #BFDBFE', borderTopColor: AUDIO_BLUE, animation: 'spin 0.8s linear infinite' }} />
                      <p style={{ fontSize: 14, fontWeight: 600, color: AUDIO_BLUE_DARK, margin: 0 }}>Converting... {audioElapsed >= 60 ? Math.floor(audioElapsed/60) + 'm ' + (audioElapsed%60) + 's' : audioElapsed + 's'}</p>
                    </div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: AUDIO_BLUE, margin: 0 }}>DO NOT CLOSE THIS TAB UNTIL COMPLETE</p>
                  </div>
                )}

                {/* Done state */}
                {audioConvertState === 'done' && audioDocxUrl && (
                  <div>
                    <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: 16, textAlign: 'center', marginBottom: 10 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#166534', margin: '0 0 4px' }}>✅ Conversion complete!</p>
                      <p style={{ fontSize: 13, color: '#166534', margin: 0 }}>{audioElapsed >= 60 ? Math.floor(audioElapsed/60) + 'm ' + (audioElapsed%60) + 's' : audioElapsed + 's'}</p>
                    </div>
                    <a href={audioDocxUrl} download={audioDocxName} style={{ display: 'block', width: '100%', padding: 13, borderRadius: 10, background: AUDIO_BLUE, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, textAlign: 'center', textDecoration: 'none', marginBottom: 10, boxSizing: 'border-box' as const }}>↓ Download {audioDocxName}</a>
                    <button onClick={closeAudioModal} style={{ width: '100%', padding: 11, borderRadius: 10, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>Close</button>
                  </div>
                )}

                {/* Error state */}
                {audioConvertState === 'error' && (
                  <div>
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: 14, marginBottom: 10 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', margin: '0 0 4px' }}>Conversion failed</p>
                      <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{audioError}</p>
                    </div>
                    <button onClick={() => setAudioConvertState('idle')} style={{ width: '100%', padding: 11, borderRadius: 10, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>Try again</button>
                  </div>
                )}

                {/* Convert button */}
                {audioConvertState === 'idle' && canConvert && credits >= (price || 0) ? (
                  <button
                    style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: AUDIO_BLUE, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
                    onClick={async () => {
                    if (audioFiles.length === 0) return
                    setAudioConvertState('processing')
                    setAudioError('')
                    setAudioElapsed(0)
                    audioElapsedRef.current = 0
                    const timer = setInterval(() => { audioElapsedRef.current += 1; setAudioElapsed(audioElapsedRef.current) }, 1000)
                    try {
                      // Upload audio files to Supabase Storage first (bypass Vercel 4.5MB limit)
                      const { data: { session: uploadSession } } = await supabase.auth.getSession()
                      if (!uploadSession) throw new Error('Not authenticated')
                      const ts = Date.now()
                      const filePaths: string[] = []
                      const fileNames: string[] = []
                      for (let fi = 0; fi < audioFiles.length; fi++) {
                        const af = audioFiles[fi]
                        const tempPath = uploadSession.user.id + '/audio_temp_' + ts + '_' + fi + '_' + af.name
                        const { data: upData, error: upErr } = await supabase.storage.from('documents').upload(tempPath, af, { contentType: af.type || 'audio/mpeg', upsert: true })
                        if (upErr) throw new Error('Upload failed: ' + upErr.message)
                        filePaths.push(upData.path)
                        fileNames.push(af.name)
                      }

                      const res = await fetch('/api/convert-audio', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ filePaths, fileNames, roomOrder: audioRoomOrder, propertySize: audioPropertySize, furnished: audioFurnished, address: audioAddress })
                      })
                      const data = await res.json()
                      if (!res.ok || data.error) throw new Error(data.error || 'Conversion failed')

                      const rooms = (data.rooms || []).filter((r: any) => (r.rows || []).length > 0)

                      // Build Word doc
                      if (!(window as any).docx) {
                        await new Promise<void>((resolve, reject) => {
                          const s = document.createElement('script')
                          s.src = 'https://cdn.jsdelivr.net/npm/docx@9.0.0/build/index.umd.js'
                          s.onload = () => resolve(); s.onerror = reject
                          document.head.appendChild(s)
                        })
                      }
                      const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, VerticalAlign } = (window as any).docx
                      const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' }
                      const cellBorders = { top: border, bottom: border, left: border, right: border }
                      const COL_ITEM = 2499, COL_DESC = 3972, COL_COND = 3115
                      const makeCell = (text: string, colWidth: number) => new TableCell({
                        borders: cellBorders,
                        width: { size: colWidth, type: WidthType.DXA },
                        verticalAlign: VerticalAlign.TOP,
                        children: (text || '').split(' / ').map((line: string) => new Paragraph({ children: [new TextRun({ text: line.trim().replace(/[ --]/g,''), font: 'Arial', size: 20, color: '000000' })] }))
                      })
                      const children: any[] = []
                      for (let i = 0; i < rooms.length; i++) {
                        const room = rooms[i]
                        if (i > 0) children.push(new Paragraph({ children: [new TextRun({ text: '', font: 'Arial', size: 20 })], spacing: { after: 120 } }))
                        children.push(new Paragraph({ children: [new TextRun({ text: room.roomName, font: 'Arial', size: 28, bold: true })] }))
                        children.push(new Table({
                          width: { size: COL_ITEM + COL_DESC + COL_COND, type: WidthType.DXA },
                          rows: [
                            new TableRow({ children: [makeCell('ITEM', COL_ITEM), makeCell('DESCRIPTION', COL_DESC), makeCell('CONDITION', COL_COND)] }),
                            ...room.rows.map((row: any) => new TableRow({ children: [makeCell(row.item, COL_ITEM), makeCell(row.description, COL_DESC), makeCell(row.condition, COL_COND)] }))
                          ]
                        }))
                      }
                      const doc = new Document({ sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children }] })
                      const b64 = await Packer.toBase64String(doc)
                      const byteArray = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
                      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
                      const url = URL.createObjectURL(blob)
                      const name = (audioAddress || 'inventory').replace(/[^a-zA-Z0-9 _-]/g, '').trim() + '.docx'
                      setAudioDocxUrl(url)
                      setAudioDocxName(name)

                      // Upload Word doc to Supabase
                      let storagePath = ''
                      const { data: { session } } = await supabase.auth.getSession()
                      if (session) {
                        const ts = Date.now()
                        const addrClean = audioAddress.replace(/[^a-zA-Z0-9 _-]/g, '').trim()
                        const fn = session.user.id + '/' + ts + '_' + addrClean + '.docx'
                        const up = await supabase.storage.from('documents').upload(fn, blob, { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
                        if (up.data) storagePath = up.data.path

                        // Save conversion record
                        await fetch('/api/save-conversion', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            user_id: session.user.id,
                            address: audioAddress,
                            rooms: rooms.length,
                            duration_seconds: audioElapsedRef.current,
                            file_path: storagePath,
                            converted_by: userName || session.user.email,
                            type: 'audio',
                            property_size: audioPropertySize,
                            furnished: audioFurnished,
                            audio_length_seconds: data.audio_length_seconds || 0,
                            cost: price || 4.00,
                            converted_json: { rooms: data.rooms, address: audioAddress },
                            extracted_text: data.transcript || '',
                          })
                        })

                        // Refresh balance + conversions
                        supabase.from('profiles').select('company_name').eq('id', session.user.id).single().then(({ data: p }: any) => { if (p?.company_name) { supabase.from('companies').select('balance').eq('company_name', p.company_name).single().then(({ data: co }: any) => { if (co) setCredits(co.balance || 0) }) } })
                        let audioRefreshQuery = supabase.from('conversions').select('*').order('created_at', { ascending: false }).limit(50)
                        if (userRole !== 'admin') audioRefreshQuery = audioRefreshQuery.eq('user_id', session.user.id)
                        audioRefreshQuery.then(({ data: convs }: any) => { if (convs) setConversions(convs) })
                      }

                      clearInterval(timer)
                      setAudioConvertState('done')
                    } catch (err: any) {
                      clearInterval(timer)
                      setAudioError(err.message || 'Conversion failed')
                      setAudioConvertState('error')
                    }
                  }}
                  >
                    Convert Audio — £{price?.toFixed(2)}
                  </button>
                ) : audioConvertState === 'idle' && canConvert && credits < (price || 0) ? (
                  <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', margin: '0 0 4px' }}>Insufficient balance</p>
                    <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>Top up your balance to continue.</p>
                  </div>
                ) : (
                  <button disabled style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: BORDER, color: MUTED, fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'default' }}>
                    Fill in all fields to continue
                  </button>
                )}

                {audioConvertState === 'idle' && <button onClick={closeAudioModal} style={{ width: '100%', padding: 11, borderRadius: 10, border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>Cancel</button>}
              </div>
            </div>
          </div>
        )
      })()}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes progress { 0% { width: 5%; margin-left: 0 } 50% { width: 60%; margin-left: 20% } 100% { width: 5%; margin-left: 100% } }`}</style>
    </div>
  )
}
