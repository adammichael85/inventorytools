'use client'
import React from 'react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { convertPDF } from './convert-action'
import { PDFDocument } from 'pdf-lib'
import { supabase } from '@/lib/supabase'

const TEAL = '#FD6A02'
const TEAL_LIGHT = '#fff0e6'
const TEAL_DARK = '#c24a00'
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

function StatsPage({ conversions, userStats, TEAL, TEAL_LIGHT, TEAL_DARK, BORDER, SURFACE, BG, HINT, MUTED, TEXT }: any) {
  const [period, setPeriod] = React.useState('month')
  const chartRef = React.useRef<any>(null)
  const chartInstanceRef = React.useRef<any>(null)
  const [chartReady, setChartReady] = React.useState(false)

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart); weekStart.setDate(todayStart.getDate() - todayStart.getDay())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const filtered = React.useMemo(() => {
    if (period === 'today') return conversions.filter((c: any) => new Date(c.created_at) >= todayStart)
    if (period === 'week') return conversions.filter((c: any) => new Date(c.created_at) >= weekStart)
    if (period === 'month') return conversions.filter((c: any) => new Date(c.created_at) >= monthStart)
    return conversions
  }, [period, conversions])

  function fmtTime(secs: number) {
    if (!secs) return '—'
    if (secs >= 3600) return Math.floor(secs/3600) + 'h ' + Math.floor((secs%3600)/60) + 'm'
    return secs >= 60 ? Math.floor(secs/60) + 'm ' + (secs%60) + 's' : secs + 's'
  }

  const isAllTime = period === 'all'
  const total = isAllTime && userStats ? userStats.total_conversions : filtered.length
  const rooms = isAllTime && userStats ? userStats.total_rooms : filtered.reduce((s: number, r: any) => s + (r.rooms || 0), 0)
  const duration = isAllTime && userStats ? userStats.total_duration_seconds : filtered.reduce((s: number, r: any) => s + (r.duration_seconds || 0), 0)
  const avg = total > 0 ? Math.round(duration / total) : 0
  const cost = isAllTime && userStats ? Number(userStats.total_spend) : filtered.length * 3.5
  const saving = total * 12
  const savingPct = cost + saving > 0 ? Math.round((saving / (cost + saving)) * 100) : 0

  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - (29 - i))
    const label = d.getDate() + ' ' + d.toLocaleString('default', { month: 'short' })
    const count = conversions.filter((c: any) => {
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
        datasets: [{ label: 'Conversions', data: last30.map(d => d.count), backgroundColor: '#FD6A02', borderRadius: 3, borderSkipped: false }]
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
  }, [chartReady, conversions])

  const periodLabels: any = { today: 'Today', week: 'This Week', month: 'This Month', all: 'All Time' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: -0.3 }}>Statistics</h2>
        <div style={{ display: 'flex', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 3, gap: 2 }}>
          {[['today','Today'],['week','Week'],['month','Month'],['all','All Time']].map(([v,l]) => (
            <button key={v} onClick={() => setPeriod(v)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: period === v ? TEAL : 'transparent', color: period === v ? '#fff' : MUTED, fontFamily: 'inherit', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
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
          <p style={{ fontSize: 12, color: HINT, marginBottom: 14 }}>@ £3.50 per report</p>
          <div style={{ height: 3, background: BORDER, borderRadius: 2 }}>
            <div style={{ height: '100%', width: Math.min(100, total * 5) + '%', background: TEAL, borderRadius: 2 }} />
          </div>
          <p style={{ fontSize: 11, color: HINT, marginTop: 6 }}>{total} of 20 credit target</p>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
        {[
          ['Rooms processed', rooms.toString()],
          ['Avg conv. time', fmtTime(avg)],
          ['Total conv. time', fmtTime(duration)],
          ['Credits used', total.toString()],
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
          <span style={{ fontSize: 11, color: HINT }}>{conversions.length} total</span>
        </div>
        <div style={{ position: 'relative', height: 160 }}>
          <canvas ref={chartRef} role="img" aria-label="Bar chart of daily conversions over last 30 days" />
        </div>
      </div>

      <p style={{ fontSize: 11, color: HINT, marginTop: 6, fontStyle: 'italic' }}>*£12 manual typist average used</p>

      {userStats && (() => {
        const ltTotal = userStats.total_conversions
        const ltCost = Number(userStats.total_spend)
        const ltDuration = userStats.total_duration_seconds
        const ltRooms = userStats.total_rooms
        const ltAvg = ltTotal > 0 ? Math.round(ltDuration / ltTotal) : 0
        const ltSaving = ltTotal * 12
        const ltSavingPct = ltCost + ltSaving > 0 ? Math.round((ltSaving / (ltCost + ltSaving)) * 100) : 0
        return (
          <div style={{ marginTop: 32 }}>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 2px', letterSpacing: -0.3 }}>Lifetime statistics</p>
              <p style={{ fontSize: 12, color: HINT, margin: 0 }}>Permanent record — includes deleted reports</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div style={{ background: TEAL, borderRadius: 14, padding: '20px 24px', color: '#fff' }}>
                <p style={{ fontSize: 11, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Total conversions</p>
                <p style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>{ltTotal}</p>
                <p style={{ fontSize: 12, opacity: 0.7 }}>all time</p>
              </div>
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 18px' }}>
                <p style={{ fontSize: 11, color: HINT, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Total spent</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: TEXT, marginBottom: 4 }}>£{ltCost.toFixed(2)}</p>
                <p style={{ fontSize: 12, color: HINT }}>@ £3.50 per report</p>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 8 }}>
              {[['Rooms processed', ltRooms.toString()],['Avg conv. time', fmtTime(ltAvg)],['Total conv. time', fmtTime(ltDuration)],['Credits used', ltTotal.toString()]].map(([lbl, val]) => (
                <div key={lbl} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: HINT, marginBottom: 8 }}>{lbl}</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: TEXT, letterSpacing: -0.5 }}>{val}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: HINT, marginTop: 6, fontStyle: 'italic' }}>*£12 manual typist average used</p>
          </div>
        )
      })()}

    </div>
  )
}


function LegalPage({ TEAL, TEAL_LIGHT, BORDER, SURFACE, BG, HINT, MUTED, TEXT }: any) {
  const sections = [
    {
      title: 'Privacy Policy',
      content: `InventoryTools collects and processes the following personal data:

• Account information: name, email address, company name, position, address and phone number provided at signup
• Conversion data: property addresses, room counts and conversion times
• Usage data: login times, session duration

Your data is stored securely on Supabase servers located in the EU. We do not sell, share or transfer your personal data to third parties except as required to operate the service (Supabase for database storage, Vercel for hosting, OpenAI for document processing).

You have the right to access, correct or delete your personal data at any time. To exercise these rights, contact us at support@inventorytools.co.uk.

Data is retained for the duration of your account. Upon account deletion, all personal data is permanently removed within 30 days.`
    },
    {
      title: 'Terms of Service',
      content: `By using InventoryTools you agree to these terms:

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
      content: `InventoryTools is committed to GDPR compliance:

• Legal basis for processing: contract performance and legitimate interests
• Data controller: InventoryTools (inventorytools.co.uk)
• Data processor: Supabase Inc (database), Vercel Inc (hosting), OpenAI Inc (document processing)
• Data retention: account data retained until account deletion
• Your rights: access, rectification, erasure, restriction, portability, objection
• To exercise your rights: support@inventorytools.co.uk
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
  const [inviteSent, setInviteSent] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }: any) => {
      if (data.session) {
        // Get current user's company
        supabase.from('profiles').select('company_name').eq('id', data.session.user.id).single().then(({ data: me }: any) => {
          if (me?.company_name) {
            // Get all team members with same company
            supabase.from('profiles').select('id, full_name, company_position, role, created_at').eq('company_name', me.company_name).order('created_at', { ascending: true }).then(({ data: team }: any) => {
              if (team) setMembers(team)
              setLoading(false)
            })
          } else {
            setLoading(false)
          }
        })
      }
    })
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Team</h2>
        <button onClick={() => setShowInvite(!showInvite)} style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Invite member</button>
      </div>

      {showInvite && (
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px' }}>Invite a team member</p>
          <p style={{ fontSize: 13, color: MUTED, margin: '0 0 16px' }}>Share this signup link with your team member. They will be added to your company account automatically.</p>
          <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, fontFamily: 'monospace', color: MUTED, marginBottom: 12, wordBreak: 'break-all' as const }}>
            {typeof window !== 'undefined' ? window.location.origin + '/auth' : ''}/auth
          </div>
          <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/auth'); setInviteSent(true); setTimeout(() => setInviteSent(false), 3000) }} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            {inviteSent ? '✓ Copied!' : 'Copy link'}
          </button>
        </div>
      )}

      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: MUTED, fontSize: 13 }}>Loading...</div>
        ) : members.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: MUTED, fontSize: 13 }}>No team members found.</div>
        ) : members.map((m, i) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: i < members.length-1 ? `1px solid ${BORDER}` : 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: TEAL_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: TEAL_DARK }}>
              {(m.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{m.full_name || 'Unknown'}</p>
              <p style={{ fontSize: 12, color: HINT, margin: 0 }}>{m.company_position || ''}</p>
            </div>
            <span style={{ fontSize: 12, background: m.role === 'admin' ? TEAL_LIGHT : BG, color: m.role === 'admin' ? TEAL_DARK : MUTED, padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize' as const }}>{m.role || 'user'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SettingsPage({ supabase, userEmail, TEXT, MUTED, TEAL, BORDER, SURFACE, BG, HINT }: any) {
  const [profile, setProfile] = React.useState<any>(null)
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [autoDelete, setAutoDelete] = React.useState<number | null>(null)
  const [savingAutoDelete, setSavingAutoDelete] = React.useState(false)

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }: any) => {
      if (data.session) {
        supabase.from('profiles').select('*').eq('id', data.session.user.id).single().then(({ data: p }: any) => {
          if (p) { setProfile(p); setAutoDelete(p.auto_delete_days || null) }
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
    <div style={{ maxWidth: 600 }}>
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

      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24, marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>Auto-delete reports</p>
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

      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24, marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>Account</p>
        <p style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>Signed in as <strong style={{ color: TEXT }}>{userEmail}</strong></p>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')} style={{ padding: '9px 20px', borderRadius: 9, border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT, fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Sign out</button>
      </div>

      {profile?.role === 'admin' && (
        <div style={{ background: SURFACE, border: '1px solid #FECACA', marginTop: 16, borderRadius: 14, padding: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px', color: '#DC2626' }}>Danger zone</p>
          <p style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>Permanently delete your company account. This will remove all users, conversions, files and data. This cannot be undone.</p>
          <DeleteAccountButton supabase={supabase} profile={profile} userEmail={userEmail} />
        </div>
      )}
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
          // Sign out and redirect - actual deletion would need a server-side admin route
          await supabase.auth.signOut()
          window.location.href = '/?deleted=true'
        }} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: confirm === 'DELETE' ? '#DC2626' : '#ccc', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: confirm === 'DELETE' ? 'pointer' : 'default' }}>
          {deleting ? 'Deleting...' : 'Permanently delete'}
        </button>
      </div>
    </div>
  )

  return null
}

export default function Dashboard() {
  const [isMobile, setIsMobile] = React.useState(false)
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const [showMobileNav, setShowMobileNav] = React.useState(false)

  const [page, setPageState] = useState('dashboard')
  function setPage(p: string) { setPageState(p); setTimeout(() => { const main = document.querySelector('main div[style*="overflow"]') as HTMLElement; if (main) main.scrollTop = 0 }, 0) }
  const [showConvert, setShowConvert] = useState(false)
  const [showTopup, setShowTopup] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [credits, setCredits] = useState(0)
  const [userName, setUserName] = useState('')
  const [convertState, setConvertState] = useState<'idle'|'selected'|'processing'|'done'|'error'>('idle')
  const [selectedFile, setSelectedFile] = useState<File|null>(null)
  const [selectedCredits, setSelectedCredits] = useState<{credits:number,price:number}|null>(null)
  const [processingRooms, setProcessingRooms] = useState<{name:string,state:string}[]>([])
  const [elapsed, setElapsed] = useState(0)
  const elapsedRef = React.useRef(0)
  const [convertError, setConvertError] = useState('')
  const [conversions, setConversions] = useState<any[]>([])
  const [userStats, setUserStats] = useState<any>(null)
  const [showRatingPopup, setShowRatingPopup] = useState(false)
  const [showQuickRate, setShowQuickRate] = useState(false)
  const [quickRateConvId, setQuickRateConvId] = useState('')
  const [quickRateConvAddress, setQuickRateConvAddress] = useState('')
  const [pendingRatings, setPendingRatings] = useState<any[]>([])
  const [tempRatings, setTempRatings] = useState<{[key: string]: number}>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [compressing, setCompressing] = useState(false)
  const [originalSize, setOriginalSize] = useState(0)
  const [compressedSize, setCompressedSize] = useState(0)
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

  async function deleteConversion(id: string, filePath: string) {
    if (!confirm('Delete this report? This cannot be undone.')) return
    // Delete file from storage
    if (filePath) await supabase.storage.from('documents').remove([filePath])
    // Delete from database
    await supabase.from('conversions').delete().eq('id', id)
    // Reload conversions
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: convs } = await supabase.from('conversions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(50)
      if (convs) {
        setConversions(convs)
        const unrated = convs.filter((x: any) => !x.rating)
        if (unrated.length > 0) {
          setPendingRatings(unrated)

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
        supabase.auth.signOut().then(() => { window.location.href = '/auth?reason=inactivity' })
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
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/auth'; return }
      const session = data.session
      setUserEmail(session.user.email || '')
      setAccessToken(session.access_token)
      // Load profile (credits + name)
      supabase.from('profiles').select('credits, full_name').eq('id', session.user.id).single().then(({ data: profile }) => {
        if (profile) {
          setCredits(profile.credits || 0)
          setUserName(profile.full_name || session.user.email || '')
        }
      })
      supabase.from('user_stats').select('*').eq('user_id', session.user.id).single().then(({ data: stats }) => { if (stats) setUserStats(stats) })
      // Load conversions
      supabase.from('conversions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(50).then(({ data: convs }) => {
        if (convs) {
          setConversions(convs)
          const unrated = convs.filter((x: any) => !x.rating)
          if (unrated.length > 0) {
            setPendingRatings(unrated)

          }
        }
      })
    })
  }, [])

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
    { id: 'convert', label: 'Convert PDF', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', badge: 'New' },
    { id: 'reports', label: 'Reports', icon: 'M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z' },
    { id: 'stats', label: 'Statistics', icon: 'M18 20V10M12 20V4M6 20v-6' },
    { id: 'team', label: 'Team', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
    { id: 'billing', label: 'Billing', icon: 'M1 4h22v16a2 2 0 01-2 2H3a2 2 0 01-2-2V4zM1 10h22' },
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

  async function startConvert() {
    if (!selectedFile) return
    setConvertState('processing')
    setConvertError('')
    setElapsed(0)
    elapsedRef.current = 0
    setProcessingRooms([{ name: 'Reading PDF...', state: 'active' }])
    let currentStage = 'Reading PDF'

    const timer = setInterval(() => { elapsedRef.current += 1; setElapsed(elapsedRef.current) }, 1000)

    try {
      currentStage = 'Reading PDF'
      const base64 = await fileToBase64(selectedFile)
      currentStage = 'Calling AI API'
      const { data: { session: sess } } = await supabase.auth.getSession(); const data = await convertPDF(base64, selectedFile?.name.toLowerCase().endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf', selectedFile, sess?.user?.id)

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
        children: (text || '').split(' | ').map(function(line){return new Paragraph({children:[new TextRun({text:line.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,'').replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/[\u2013\u2014]/g,'-').replace(/[^\x09\x0A\x0D\x20-\xFF]/g,''),font:'Arial',size:20,color:'000000'})]})})
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
      if (docxUrl) URL.revokeObjectURL(docxUrl); const url = URL.createObjectURL(blob); let storagePath = ""; try { const sess = await supabase.auth.getSession(); if (sess.data.session) { const fn = sess.data.session.user.id + "/" + Date.now() + "_" + (data.address||"").replace(/[^a-zA-Z0-9 _-]/g,"").trim() + ".docx"; const up = await supabase.storage.from("documents").upload(fn, blob, {contentType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}); if (up.data) storagePath = up.data.path } } catch(e) { console.log("upload failed",e) }
      const name = (data.address || 'inventory').replace(/[^a-zA-Z0-9 _-]/g, '').trim() + '.docx'
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
        duration_seconds: elapsedRef.current,
        file_path: storagePath,
        converted_by: userName || session.user.email,
      })
    })
  }
})
      .then(() => {
        supabase.auth.getSession().then(({ data }) => {
          if (data.session) {
            supabase.from('profiles').select('credits').eq('id', data.session.user.id).single().then(({ data: p }) => { if (p) setCredits(p.credits || 0) })
            supabase.from('conversions').select('*').eq('user_id', data.session.user.id).order('created_at', { ascending: false }).limit(50).then(({ data: convs }) => { if (convs) { setConversions(convs); const latest = convs[0]; if (latest && !latest.rating) { setQuickRateConvId(latest.id); setQuickRateConvAddress(latest.address || ''); setShowQuickRate(true); localStorage.setItem('lastConverted', Date.now().toString()); sessionStorage.setItem('justConverted', '1') } } })
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
    setSelectedFile(null)
    setDocxUrl(null)
    setConvertError('')
  }


  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', overflow: 'hidden', background: BG }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* SIDEBAR */}
      <aside style={{ width: isMobile ? 0 : 220, background: SURFACE, borderRight: isMobile ? 'none' : `1px solid ${BORDER}`, display: isMobile ? 'none' : 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0 }}>
        <div style={{ height: 64, padding: '0 18px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
            <svg width="32" height="32" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}><rect width="120" height="120" rx="26" fill="#FD6A02"/><rect x="8" y="10" width="24" height="20" rx="5" fill="white" opacity="0.18"/><rect x="8" y="36" width="24" height="20" rx="5" fill="white" opacity="0.18"/><rect x="8" y="62" width="24" height="20" rx="5" fill="white" opacity="0.18"/><rect x="8" y="88" width="24" height="20" rx="5" fill="white" opacity="0.12"/><rect x="38" y="10" width="74" height="20" rx="5" fill="white" opacity="0.12"/><rect x="38" y="36" width="56" height="20" rx="5" fill="white" opacity="0.12"/><rect x="38" y="62" width="64" height="20" rx="5" fill="white" opacity="0.12"/><rect x="38" y="88" width="44" height="20" rx="5" fill="white" opacity="0.08"/><path d="M30 62 L50 84 L90 40" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: TEAL_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: TEAL_DARK }}>{userEmail.slice(0,2).toUpperCase() || 'U'}</div>
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
              <svg width="30" height="30" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                <rect width="120" height="120" rx="26" fill="#FD6A02"/>
                <rect x="8" y="10" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
                <rect x="8" y="36" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
                <rect x="8" y="62" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
                <rect x="38" y="10" width="74" height="20" rx="5" fill="white" opacity="0.12"/>
                <rect x="38" y="36" width="56" height="20" rx="5" fill="white" opacity="0.12"/>
                <path d="M30 62 L50 84 L90 40" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3, margin: 0 }}>{page === 'dashboard' ? ((() => { const h = new Date().getHours(); return (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening') + ' ' + (userName || userEmail).split(' ')[0] + (isMobile ? '' : ' 👋') })()) : page.charAt(0).toUpperCase() + page.slice(1)}</h1>
            <p style={{ fontSize: 12, color: HINT, margin: 0 }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: 7, background: TEAL_LIGHT, borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 600, color: TEAL_DARK }}>{credits} credits remaining</div>
            <button onClick={() => setShowConvert(true)} style={{ padding: isMobile ? '6px 12px' : '8px 16px', borderRadius: 8, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: isMobile ? 12 : 13, fontWeight: 600, cursor: 'pointer' }}>+ Convert PDF</button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 16 : 28, paddingBottom: isMobile ? 100 : 28 }}>
          {page === 'dashboard' && (
            <div>
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}` }}>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Lifetime statistics <span style={{ fontSize: 12, fontWeight: 400, color: HINT }}>— includes deleted reports</span></p>
                </div>
                <div style={{ padding: '16px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(5,minmax(0,1fr))', gap: 16, marginBottom: 0 }}>
                {[['Total reports', (userStats ? userStats.total_conversions : conversions.length).toString(), 'all time'],['Total spent', '£'+((userStats ? Number(userStats.total_spend) : conversions.length * 3.5)).toFixed(2), '@ £3.50 per report'],['Avg. time', (userStats && userStats.total_conversions > 0) ? (()=>{ const avg=Math.round(userStats.total_duration_seconds/userStats.total_conversions); return avg>=60 ? Math.floor(avg/60)+'m '+(avg%60)+'s' : avg+'s' })() : '—', 'per conversion'],['Total time', (()=>{ const tot=userStats ? userStats.total_duration_seconds : conversions.reduce((s,r)=>s+(r.duration_seconds||0),0); return tot>=60 ? Math.floor(tot/60)+'m '+(tot%60)+'s' : tot+'s' })(), 'all conversions'],['Est. saving', '£'+((userStats ? userStats.total_conversions : conversions.length) * 12).toFixed(2), 'vs. external typist*']].map(([label,val,sub]) => (
                  <div key={label} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '18px 20px' }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: HINT, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>{label}</p>
                    <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1, color: TEXT, marginBottom: 4 }}>{val}</p>
                    <p style={{ fontSize: 12, color: HINT }}>{sub}</p>
                  </div>
                ))}
              </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginTop: 16 }}>
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', display: isMobile ? 'none' : 'block' }}>
                  <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, display: isMobile ? 'none' : 'block' }}>Recent conversions</h2>
                    <button onClick={() => setPage('reports')} style={{ fontSize: 12, color: TEAL, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>View all →</button>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600, display: isMobile ? 'none' : 'table' }}>
                    <thead><tr style={{ background: BG }}>
                      {['Property','Rooms','Conv. Time','Cost','By','Rating','Status',''].map(h => <th key={h} style={{ fontSize: 11, fontWeight: 600, color: HINT, textTransform: 'uppercase', letterSpacing: 0.8, padding: '10px 20px', textAlign: 'left', borderBottom: `1px solid ${BORDER}` }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {conversions.slice(0, 14).map(c => (
                        <tr key={c.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                          <td style={{ padding: '12px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 500, color: TEXT, margin: 0 }}>{c.address}</p>
                                <p style={{ fontSize: 11, color: HINT, margin: 0 }}>{new Date(c.created_at).toLocaleDateString("en-GB", {day:"numeric",month:"short",year:"numeric"})}</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 20px', fontSize: 13, color: MUTED }}>{c.rooms} rooms</td>
                          <td style={{ padding: '12px 20px', fontSize: 13, color: MUTED }}>{c.duration_seconds ? (c.duration_seconds >= 60 ? Math.floor(c.duration_seconds/60)+"m "+( c.duration_seconds%60)+"s" : c.duration_seconds+"s") : "—"}</td>
                          <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600 }}>£3.50</td>
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
                                if (data?.signedUrl) { const response = await fetch(data.signedUrl); const fileBlob = await response.blob(); const blobUrl = URL.createObjectURL(fileBlob); const a = document.createElement('a'); a.href = blobUrl; a.download = (c.address || 'inventory').replace(/[^a-zA-Z0-9 _-]/g,'').trim() + '.docx'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl) }
                              }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title="Download">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9,15 12,18 15,15"/></svg>
                              </button>
                            ) : (
                              <span style={{ fontSize: 11, color: HINT, padding: 4 }}>—</span>
                            )}
                            <button onClick={() => deleteConversion(c.id, c.file_path)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title="Delete">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2 2 0 01-2 2H8a2 2 0 01-2-2L5,6"/><path d="M10,11v6M14,11v6"/><path d="M9,6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}><span style={{ fontWeight: 600 }}>{credits} remaining</span><span style={{ color: HINT }}>credits</span></div>
                      <div style={{ height: 8, borderRadius: 20, background: BORDER, overflow: 'hidden', marginBottom: 14 }}><div style={{ width: Math.min(100, (credits / 50) * 100) + '%', height: '100%', background: TEAL, borderRadius: 20 }} /></div>
                      <p style={{ fontSize: 12, color: HINT, marginBottom: 14 }}>Each conversion costs <strong style={{ color: TEXT }}>1 credit (£3.50)</strong>. Credits never expire.</p>
                      <button onClick={() => setShowTopup(true)} style={{ width: '100%', padding: 10, borderRadius: 9, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Buy more credits</button>
                    </div>
                  </div>
                  <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}` }}><h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>This month</h3></div>
                    <div style={{ padding: 18 }}>
                      {[['Reports converted',conversions.length.toString()],['Total spent','£'+(conversions.length*3.5).toFixed(2)],['Avg. per report','£3.50'],['Est. saving vs. typist','£'+(conversions.length*12).toFixed(2)]].map(([l,v],i) => (
                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? `1px solid ${BORDER}` : 'none', fontSize: 13 }}>
                          <span style={{ color: MUTED }}>{l}</span><span style={{ fontWeight: 600, color: l.includes('saving') ? TEAL : TEXT }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}` }}><h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Activity</h3></div>
                    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {conversions.slice(0,4).map((conv, i) => (
                        <div key={conv.id || i} style={{ display: 'flex', gap: 10 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: TEAL, flexShrink: 0, marginTop: 4 }} />
                          <div>
                            <p style={{ fontSize: 12, color: TEXT, margin: 0 }}>{conv.address} — ready</p>
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
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FD6A02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Convert PDF to Word</h2>
              <p style={{ fontSize: 14, color: '#5A7068', margin: '0 0 24px', textAlign: 'center' }}>Upload any inventory PDF or Word doc and get a perfectly formatted Word document.</p>
              {credits <= 0 ? (
                <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 10, padding: 14, textAlign: 'center', maxWidth: 300 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', margin: '0 0 6px' }}>No credits remaining</p>
                  <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>Purchase credits to continue.</p>
                </div>
              ) : (
                <button onClick={() => setShowConvert(true)} style={{ padding: '14px 32px', borderRadius: 12, border: 'none', background: '#FD6A02', color: '#fff', fontFamily: 'inherit', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>+ Convert now — 1 credit (£3.50)</button>
              )}
              <p style={{ fontSize: 12, color: '#94AEA6', marginTop: 16 }}>{credits} credit{credits !== 1 ? 's' : ''} remaining</p>
            </div>
          )}

          {page === 'reports' && (
            <div>
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: 12 }}>
                  <input placeholder="Search by address..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
                </div>
                {isMobile && (
                  <div>
                    {conversions.filter(c => !searchQuery || (c.address||'').toLowerCase().includes(searchQuery.toLowerCase())).map(conv => (
                      <div key={conv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: `1px solid ${BORDER}` }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.address}</p>
                          <p style={{ fontSize: 11, color: HINT, margin: 0 }}>{new Date(conv.created_at).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'})} · {conv.rooms} rooms · {conv.converted_by ? conv.converted_by.split(' ').map((n: string, i: number) => i === 0 ? n : n[0]).join(' ') : ''}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          {conv.file_path ? (
                            <button onClick={async () => {
                              const { data } = await supabase.storage.from('documents').createSignedUrl(conv.file_path, 60)
                              if (data?.signedUrl) { const response = await fetch(data.signedUrl); const fileBlob = await response.blob(); const blobUrl = URL.createObjectURL(fileBlob); const a = document.createElement('a'); a.href = blobUrl; a.download = (conv.address||'inventory').replace(/[^a-zA-Z0-9 _-]/g,'').trim()+'.docx'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl) }
                            }} style={{ width: 36, height: 36, borderRadius: 8, background: TEAL_LIGHT, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9,15 12,18 15,15"/></svg>
                            </button>
                          ) : (
                            <div style={{ width: 36, height: 36 }} />
                          )}
                          <button onClick={() => deleteConversion(conv.id, conv.file_path)} style={{ width: 36, height: 36, borderRadius: 8, background: '#FEE2E2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2 2 0 01-2 2H8a2 2 0 01-2-2L5,6"/><path d="M10,11v6M14,11v6"/><path d="M9,6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: BG }}>{['Property','Rooms','Conv. Time','Cost','By','Rating','Date',''].map(h => <th key={h} style={{ fontSize: 11, fontWeight: 600, color: HINT, textTransform: 'uppercase', padding: '10px 20px', textAlign: 'left', borderBottom: `1px solid ${BORDER}` }}>{h}</th>)}</tr></thead>
                  <tbody>{conversions.filter(c => !searchQuery || (c.address||'').toLowerCase().includes(searchQuery.toLowerCase())).map(c => (<tr key={c.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 500 }}>{c.address}</td>
                    <td style={{ padding: '12px 20px', fontSize: 13, color: MUTED }}>{c.rooms} rooms</td>
                    <td style={{ padding: '12px 20px', fontSize: 13, color: MUTED }}>{c.duration_seconds ? (c.duration_seconds >= 60 ? Math.floor(c.duration_seconds/60)+"m "+( c.duration_seconds%60)+"s" : c.duration_seconds+"s") : "—"}</td>
                    <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600 }}>£3.50</td>
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
                    <td style={{ padding: '12px 20px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{c.file_path ? (<button onClick={async () => { const { data } = await supabase.storage.from('documents').createSignedUrl(c.file_path, 60); if (data?.signedUrl) { const response = await fetch(data.signedUrl); const fileBlob = await response.blob(); const blobUrl = URL.createObjectURL(fileBlob); const a = document.createElement('a'); a.href = blobUrl; a.download = (c.address||'inventory').replace(/[^a-zA-Z0-9 _-]/g,'').trim()+'.docx'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl) } }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title='Download'><svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke={TEAL} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z'/><polyline points='14,2 14,8 20,8'/><line x1='12' y1='18' x2='12' y2='12'/><polyline points='9,15 12,18 15,15'/></svg></button>) : <span style={{ fontSize: 11, color: HINT, padding: 4 }}>—</span>}<button onClick={() => deleteConversion(c.id, c.file_path)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title='Delete'><svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#DC2626' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='3,6 5,6 21,6'/><path d='M19,6l-1,14a2 2 0 01-2 2H8a2 2 0 01-2-2L5,6'/><path d='M10,11v6M14,11v6'/><path d='M9,6V4a1 1 0 011-1h4a1 1 0 011 1v2'/></svg></button></div></td>
                  </tr>))}</tbody>
                </table>
              </div>
            </div>
          )}

          {page === 'billing' && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px', letterSpacing: -0.3 }}>Billing</h2>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div style={{ background: TEAL, borderRadius: 14, padding: 24, color: '#fff' }}>
                  <p style={{ fontSize: 12, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Current balance</p>
                  <p style={{ fontSize: 42, fontWeight: 700, letterSpacing: -1, lineHeight: 1, marginBottom: 6 }}>{credits}</p>
                  <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 20 }}>credits remaining</p>
                  <button onClick={() => setShowTopup(true)} style={{ padding: '10px 20px', borderRadius: 9, border: 'none', background: '#fff', color: TEAL, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Buy more credits</button>
                </div>
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24 }}>
                  {[['Reports converted',conversions.length.toString()],['Total spent','£'+(conversions.length*3.5).toFixed(2)],['Avg. conv. time',conversions.length>0?(()=>{const avg=Math.round(conversions.reduce((s,r)=>s+(r.duration_seconds||0),0)/conversions.length);return avg>=60?Math.floor(avg/60)+'m '+(avg%60)+'s':avg+'s'})():'—'],['Est. saving vs. typist','£'+(conversions.length*12).toFixed(2)]].map(([l,v],i) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? `1px solid ${BORDER}` : 'none', fontSize: 13 }}>
                      <span style={{ color: MUTED }}>{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

           {page === 'settings' && (
            <SettingsPage supabase={supabase} userEmail={userEmail} TEXT={TEXT} MUTED={MUTED} TEAL={TEAL} BORDER={BORDER} SURFACE={SURFACE} BG={BG} HINT={HINT} />
          )}

          {page === 'stats' && (
            <StatsPage conversions={conversions} userStats={userStats} TEAL={TEAL} TEAL_LIGHT={TEAL_LIGHT} TEAL_DARK={TEAL_DARK} BORDER={BORDER} SURFACE={SURFACE} BG={BG} HINT={HINT} MUTED={MUTED} TEXT={TEXT} />
          )}

          {page === 'legal' && (
            <LegalPage TEAL={TEAL} TEAL_LIGHT={TEAL_LIGHT} BORDER={BORDER} SURFACE={SURFACE} BG={BG} HINT={HINT} MUTED={MUTED} TEXT={TEXT} />
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
      {/* RATING POPUP */}
      {showRatingPopup && pendingRatings.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
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
              style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: pendingRatings.every((x: any) => tempRatings[x.id]) ? '#FD6A02' : '#E2EAE7', color: pendingRatings.every((x: any) => tempRatings[x.id]) ? '#ffffff' : '#94AEA6', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: pendingRatings.every((x: any) => tempRatings[x.id]) ? 'pointer' : 'default', transition: 'all 0.15s' }}>
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

      {/* CONVERT MODAL */}
      {showConvert && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,40,32,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: SURFACE, borderRadius: 16, border: `1px solid ${BORDER}`, width: '100%', maxWidth: 480, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Convert PDF to Word</p><p style={{ fontSize: 12, color: HINT, margin: 0 }}>1 credit (£3.50) · {credits} remaining</p></div>
              <button onClick={closeConvert} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent', cursor: 'pointer', fontSize: 16, color: MUTED }}>×</button>
            </div>

            {convertState === 'idle' && (
              <div style={{ padding: 24 }}>
                <label htmlFor="pdf-upload">
                  <div style={{ border: `2px dashed ${BORDER}`, borderRadius: 12, padding: 36, textAlign: 'center', cursor: 'pointer', background: BG }}>
                    <div style={{ width: 52, height: 52, borderRadius: 12, background: TEAL_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Drop your PDF here</p>
                    <p style={{ fontSize: 13, color: HINT }}>or click to browse</p>
<p style={{ fontSize: 11, color: HINT, marginTop: 8 }}>Accepts PDF and Word (.docx) files · For large PDFs, compress first at ilovepdf.com</p>
<p style={{ fontSize: 11, color: HINT, marginTop: 8 }}>Use the EXTREME compression to reduce the file size dramatically to save conversion time.</p>
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
                {credits <= 0 ? (
                  <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 10, padding: 14, textAlign: 'center', marginBottom: 10 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', margin: '0 0 6px' }}>No credits remaining</p>
                    <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>Purchase credits to continue converting.</p>
                  </div>
                ) : (
                  <button onClick={startConvert} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>Convert now — 1 credit (£3.50)</button>
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
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#FD6A02', margin: '0 0 4px', letterSpacing: 0.3 }}>PLEASE KEEP THIS TAB OPEN WHILE PROCESSING. YOU CAN USE OTHER TABS.</p>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#FD6A02', margin: 0, letterSpacing: 0.3 }}>CLOSING THIS TAB WILL CANCEL YOUR CONVERSION.</p>
                </div>
                <div style={{ height: 4, borderRadius: 20, background: 'rgba(29,158,117,0.2)', overflow: 'hidden', marginBottom: 14 }}>
                  <div style={{ height: '100%', borderRadius: 20, background: '#FD6A02', animation: 'progress 2s ease-in-out infinite' }} />
                </div>
                {processingRooms.map((room, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: room.state === 'active' ? 'center' : 'flex-start', gap: 10, padding: '6px 0', borderBottom: `1px solid ${BORDER}`, opacity: room.state === 'pending' ? 0.35 : 1 }}>
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
                  <p style={{ fontSize: 13, color: MUTED }}>{processingRooms.length} rooms in {elapsed}s</p>
                  <div style={{ marginTop: 12 }}>
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
      {showTopup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,40,32,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: SURFACE, borderRadius: 16, border: `1px solid ${BORDER}`, width: '100%', maxWidth: 420, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Top up credits</p><p style={{ fontSize: 12, color: HINT, margin: 0 }}>£3.50 per conversion · Credits never expire</p></div>
              <button onClick={() => setShowTopup(false)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent', cursor: 'pointer', fontSize: 16, color: MUTED }}>×</button>
            </div>
            <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[[10,35],[20,70],[30,105],[40,140],[50,175]].map(([credits,price]) => (
                <div key={credits} onClick={() => setSelectedCredits({credits,price})} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 10, border: `1.5px solid ${selectedCredits?.credits === credits ? TEAL : BORDER}`, background: selectedCredits?.credits === credits ? TEAL_LIGHT : 'transparent', cursor: 'pointer', position: 'relative' }}>
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

      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes progress { 0% { width: 5%; margin-left: 0 } 50% { width: 60%; margin-left: 20% } 100% { width: 5%; margin-left: 100% } }`}</style>
    </div>
  )
}
