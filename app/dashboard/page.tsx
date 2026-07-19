'use client'
import React from 'react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { convertPDF, convertPDFVision, convertWordDoc } from './convert-action'
import { PDFDocument } from 'pdf-lib'
import { supabase } from '@/lib/supabase'
import { useBrand } from '@/lib/BrandContext'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import dynamic from 'next/dynamic'
const ReviewAmendModal = dynamic(() => import('@/components/ReviewAmendModal'), { ssr: false })

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const BORDER = '#ecebe8'
const BG = '#f6f5f3'
const SURFACE = '#ffffff'
const TEXT = '#1a1a1a'
const MUTED = '#4a4a4a'
const HINT = '#8a8a8a'
// Landing design tokens
const BODY = '#4a4a4a'
const RADIUS = 18
const SHADOW = '0 8px 30px rgba(26,26,26,.07)'
const GREEN = '#3e8e5a'
const RED = '#d64545'
const RED_TINT = '#fbeaea'
const ORANGE_TINT = '#fff1e6'





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

function StatsPage({ conversions, userStats, toolTab, TEAL, TEAL_LIGHT, TEAL_DARK, BORDER, SURFACE, BG, HINT, MUTED, TEXT, typistRateMode, typistReportRate, typistPageRate, isMobile, audioTypistRates }: any) {
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
    const configuredTable = audioTypistRates ? (isFurn ? audioTypistRates.furnished : audioTypistRates.unfurnished) : null
    const fallbackTable = isFurn ? MARKET_FURNISHED : MARKET_UNFURNISHED
    const table = (configuredTable && Object.keys(configuredTable).length > 0) ? configuredTable : fallbackTable
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: -0.3 }}>Statistics <span style={{ fontSize: 13, fontWeight: 400, color: HINT }}>— reports showing in your dashboard</span></h2>
        <div className="it-card" style={{ display: 'flex', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 4, gap: 3 }}>
          {[['today','Today'],['week','Week'],['month','Month'],['all','All Time']].map(([v,l]) => (
            <button key={v} onClick={() => setPeriod(v)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: period === v ? TEAL : 'transparent', color: period === v ? '#fff' : MUTED, fontFamily: 'inherit', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 18, marginBottom: 18 }}>
        <div style={{ background: TEAL, borderRadius: 20, padding: '24px 26px', color: '#fff', boxShadow: `0 14px 32px -10px ${TEAL}` }}>
          <p style={{ fontSize: 11, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Conversions</p>
          <p style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>{total}</p>
          <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 16 }}>{periodLabels[period].toLowerCase()}</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: 32, gap: 3 }}>
            {(() => {
              const last7 = last30.slice(-7)
              const maxCount = Math.max(1, ...last7.map(d => d.count))
              return last7.map((d, i) => (
                <div key={i} style={{ flex: 1, borderRadius: 2, background: 'rgba(255,255,255,' + (0.4 + (d.count > 0 ? 0.5 : 0)) + ')', height: (d.count > 0 ? Math.max(20, (d.count / maxCount) * 100) : 12) + '%', minHeight: 4 }} />
              ))
            })()}
          </div>
        </div>

        <div className="it-card" style={{ border: `1px solid ${BORDER}`, borderRadius: 16, padding: '22px 20px' }}>
          <p style={{ fontSize: 11, color: HINT, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Total spent</p>
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: TEXT, marginBottom: 4 }}>£{cost.toFixed(2)}</p>
          <p style={{ fontSize: 12, color: HINT, marginBottom: 14 }}>{toolTab === 'audio' ? 'varies by property size' : '@ £4.00 per report'}</p>
          <div style={{ height: 3, background: BORDER, borderRadius: 2 }}>
            <div style={{ height: '100%', width: Math.min(100, total * 5) + '%', background: TEAL, borderRadius: 2 }} />
          </div>
          {toolTab !== 'audio' && <p style={{ fontSize: 11, color: HINT, marginTop: 6 }}>{total} of 20 credit target</p>}
        </div>

        <div className="it-card" style={{ border: `1px solid ${BORDER}`, borderRadius: 16, padding: '22px 20px' }}>
          <p style={{ fontSize: 11, color: HINT, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Est. saving*</p>
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: TEAL, marginBottom: 4 }}>£{saving.toFixed(2)}</p>
          <p style={{ fontSize: 12, color: HINT, marginBottom: 14 }}>vs. manual typing</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 3, background: BORDER, borderRadius: 2 }}>
              <div style={{ height: '100%', width: savingPct + '%', background: TEAL, borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 11, color: TEAL_DARK, fontWeight: 600 }}>{savingPct}% saved</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 18, marginBottom: 18 }}>
        {[
          ['Rooms processed', rooms.toString()],
          ['Avg conv. time', fmtTime(avg)],
          ['Total conv. time', fmtTime(duration)],
        ].map(([lbl, val]) => (
          <div key={lbl} className="it-card" style={{ border: `1px solid ${BORDER}`, borderRadius: 14, padding: '18px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: HINT, marginBottom: 8 }}>{lbl}</p>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: TEXT, letterSpacing: -0.5 }}>{val}</p>
          </div>
        ))}
      </div>

      <div className="it-card" style={{ border: `1px solid ${BORDER}`, borderRadius: 20, padding: 24, marginBottom: 8 }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 18, marginBottom: 18 }}>
              <div style={{ background: TEAL, borderRadius: 20, padding: '24px 26px', color: '#fff', boxShadow: `0 14px 32px -10px ${TEAL}` }}>
                <p style={{ fontSize: 11, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Total conversions</p>
                <p style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>{ltTotal}</p>
                <p style={{ fontSize: 12, opacity: 0.7 }}>all time</p>
              </div>
              <div className="it-card" style={{ border: `1px solid ${BORDER}`, borderRadius: 16, padding: '22px 20px' }}>
                <p style={{ fontSize: 11, color: HINT, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Total spent</p>
                <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: TEXT, marginBottom: 4 }}>£{ltCost.toFixed(2)}</p>
                <p style={{ fontSize: 12, color: HINT }}>{toolTab === 'audio' ? 'varies by property size' : '@ £4.00 per report'}</p>
              </div>
              <div className="it-card" style={{ border: `1px solid ${BORDER}`, borderRadius: 16, padding: '22px 20px' }}>
                <p style={{ fontSize: 11, color: HINT, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Est. saving*</p>
                <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: TEAL, marginBottom: 4 }}>£{ltSaving.toFixed(2)}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
                  <div style={{ flex: 1, height: 3, background: BORDER, borderRadius: 2 }}>
                    <div style={{ height: '100%', width: ltSavingPct + '%', background: TEAL, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 11, color: TEAL_DARK, fontWeight: 600 }}>{ltSavingPct}% saved</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 18, marginBottom: 8 }}>
              {[['Rooms processed', ltRooms.toString()],['Avg conv. time', fmtTime(ltAvg)],['Total conv. time', fmtTime(ltDuration)]].map(([lbl, val]) => (
                <div key={lbl} className="it-card" style={{ border: `1px solid ${BORDER}`, borderRadius: 14, padding: '18px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: HINT, marginBottom: 8 }}>{lbl}</p>
                  <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: TEXT, letterSpacing: -0.5 }}>{val}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: HINT, marginTop: 6, fontStyle: 'italic' }}>{toolTab === 'audio' ? '*Saving based on 45% discount vs standard typing rates' : '*£12 avg. typist cost − £5 conversion = £7 net saving per report'}</p>
          </div>
        ) })()}

    </div>
  )
}


function HelpPage({ TEAL, TEAL_LIGHT, BORDER, SURFACE, BG, HINT, MUTED, TEXT }: any) {
  const sections = [
    {
      title: 'Getting Started',
      content: `Uploading your first file
Click "Convert Audio" or "Convert PDF or Word" from the top of your dashboard. Select your file, fill in the property address and details, and hit Convert. Your file uploads securely and processing begins immediately.

Property size, credits, and pricing
Pricing is based on property size (studio/1-bed through to larger properties) for PDF conversions, and a base rate plus per-minute rate for audio. Your remaining credit balance is always visible in the top corner of your dashboard.

What happens after you hit Convert
Conversion runs in the background - you can safely close the tab, navigate elsewhere in the dashboard, or come back later. A progress bar at the bottom of your screen shows live status. You'll see the finished report appear automatically once it's done.`
    },
    {
      title: 'PDF to Word',
      content: `What works best
Clear, well-scanned PDFs with a consistent Item/Description/Condition table layout convert most accurately. Complex multi-column layouts and older/lower-quality scans may take longer to process but are still supported.

Why some PDFs take longer
Longer or more complex documents (more rooms, denser tables, unusual formatting) take more processing time than a short, simple PDF. This is normal.

If the output looks wrong
Check the accuracy report generated alongside your conversion - it flags anything worth double-checking. If something looks genuinely incorrect, use the feedback button so we can review it.`
    },
    {
      title: 'Audio to Word',
      content: `Recording tips for best accuracy
- Speak clearly at a steady pace
- Minimize background noise where possible
- Dictate one room at a time in a continuous recording, or upload separate files per room (see below)

File naming for per-room matching
If you upload one audio file per room, name each file after the room it covers (e.g., "Bedroom 1.mp3", "Kitchen.mp3"). This lets the system match each recording to its correct room automatically, which improves both speed and accuracy. If you upload one long recording covering the whole property instead, that's fully supported too - just name it however you like.

Understanding abbreviations
Your reports use standard UK property inventory abbreviations, e.g.:
- T&W - Tested and Working
- NT - Not Tested
- ODU - Old Defects Under
- DPP / SPP - Double / Single Power Point
- PM - Paint Marked
- LL / ML / UL - Lower / Mid / Upper Level
- LHS / RHS - Left / Right Hand Side`
    },
    {
      title: 'Billing & Credits',
      content: `How pricing works
PDF conversions are priced by property size. Audio conversions have a base cost plus a per-minute rate based on recording length. Exact pricing is shown before you confirm any conversion.

Topping up your balance
Click your credit balance in the dashboard to top up via card payment (including Apple Pay).

Viewing your conversion history
All past conversions, with dates and download links, are available in your Reports section.`
    },
    {
      title: 'Team & Account',
      content: `Inviting staff members
From your account settings, send an invite by email. They'll receive a link to set up their own login under your company account.

Managing your company profile
Update your company name, address, and branding from Settings - this appears on your generated reports.`
    },
    {
      title: 'Troubleshooting',
      content: `My conversion seems stuck
Background conversions can take several minutes for longer files - check the progress bar for live status. If it genuinely seems frozen with no progress for an extended period, use the Cancel button and try again.

How to cancel a conversion
Click the x on the progress bar, or the Cancel button inside the conversion modal, at any time while it's processing.

The output has an error in it
Use the feedback option on your report, or contact support directly with the property address and a description of the issue.`
    },
    {
      title: 'Contact Support',
      content: `Can't find what you need? Email us directly at admin@inventorytools.co.uk.`
    },
  ]

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px', letterSpacing: -0.3 }}>Help & FAQ</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sections.map(({ title, content }) => (
          <LegalSection key={title} title={title} content={content} BORDER={BORDER} SURFACE={SURFACE} HINT={HINT} TEXT={TEXT} TEAL={TEAL} />
        ))}
      </div>
    </div>
  )
}

function LegalPage({ TEAL, TEAL_LIGHT, BORDER, SURFACE, BG, HINT, MUTED, TEXT, brand }: any) {
  const productName = brand.display_name || 'InventoryTools'
  const supportEmail = brand.company_name === 'InventoryTools' ? 'admin@inventorytools.co.uk' : ('support@' + (brand.domain || 'inventorytools.co.uk'))
  const sections = [
    {
      title: 'Privacy Policy',
      content: `${productName} collects and processes personal data to provide document and audio conversion services, manage user accounts, process payments, improve security, and operate the ${productName} platform.

The personal data we may collect includes:

- Account information: name, email address, company name, position, business address and phone number provided at signup
- Billing and credit information: payment status, credit purchases, conversion credit balance and transaction references
- Conversion data: property addresses, room counts, conversion times, uploaded file names, output document names and conversion history
- Uploaded content: inventory PDFs, Word documents, audio recordings of property walkthroughs, and the converted Word documents uploaded or generated through the service
- Usage data: login times, session duration, account activity, IP address, browser/device information and security logs
- Support data: information you provide when contacting us for help or reporting an issue

${productName} processes this data for the following purposes:

- To create and manage user accounts
- To provide PDF, Word and audio-to-Word document conversion services
- To store and deliver converted documents to the account holder
- To manage credits, usage history and billing records
- To provide customer support
- To maintain security, prevent misuse and protect user accounts
- To improve reliability, performance and accuracy of the service
- To comply with legal, tax, accounting and regulatory obligations

Our lawful bases for processing personal data are:

- Contract performance — to provide the ${productName} service you have requested
- Legitimate interests — to secure the platform, prevent misuse, improve the service and manage business operations
- Legal obligation — where we must keep records or comply with applicable law
- Consent — where we rely on optional cookies, analytics or marketing communications

${productName} acts as the data controller for account information, billing information, usage data and support data.

Where customers upload inventory documents or audio recordings containing personal data about tenants, occupiers, landlords, property contacts or other individuals, the customer is responsible for ensuring they have the lawful right to upload and process that data. In that situation, the customer will usually be the data controller and ${productName} will process the uploaded data only to provide the conversion service.

We use trusted third-party service providers to operate ${productName}, including:

- Supabase — database, authentication and private document/audio storage
- Vercel — website and application hosting
- Trigger.dev — background processing of uploaded documents and audio during conversion
- OpenAI — document and audio processing and AI conversion services
- Resend — transactional email (account confirmation, password reset, invoices, team invites)
- Stripe — payment processing

Payment card details are processed by Stripe. ${productName} does not store full payment card numbers.

These providers may process personal data only as necessary to provide their services to ${productName}. We do not sell personal data.

Uploaded files and converted documents are stored in private Supabase Storage and are accessible only to the relevant account holder through authenticated access controls. Documents are not made public.

Data may be processed outside the United Kingdom where our service providers or their sub-processors operate internationally. Where this happens, we rely on appropriate safeguards such as data processing agreements, standard contractual clauses or equivalent protections required under data protection law.

Data sent to OpenAI through the API is used to provide the conversion service. ${productName} does not intentionally use uploaded customer documents or audio to train public AI models.

Data is retained as follows:

- Account profiles: retained until account deletion
- Billing and transaction records: retained for as long as required for legal, accounting and tax purposes
- Conversion history: retained until manually deleted by the user or account deletion
- Uploaded files (PDF, Word, audio) and converted Word documents: retained in private storage until manually deleted by the user or account deletion
- Support messages: retained as long as needed to resolve the issue and maintain business records
- Security logs: retained only as long as reasonably necessary for security and abuse prevention
- Backups: retained for a limited period and then automatically purged

Upon account deletion, personal data and stored files are permanently removed within 30 days, except where we are required to retain limited records for legal, tax, accounting, fraud prevention or dispute purposes.

You have the following data protection rights:

- Right of access
- Right to rectification
- Right to erasure
- Right to restriction of processing
- Right to data portability
- Right to object
- Right to withdraw consent where processing is based on consent
- Right to complain to the Information Commissioner's Office

To exercise your rights or ask a privacy question, contact ${supportEmail}.

You also have the right to complain to the Information Commissioner's Office, the UK data protection regulator: ico.org.uk

Our ICO registration is currently in application and pending with the Information Commissioner's Office (ICO).

${productName} may use essential cookies or similar technologies for login sessions, authentication, account security and service operation. If optional analytics or marketing cookies are introduced, we will update this policy and request consent where required.

This Privacy Policy may be updated from time to time. The latest version will always be available on ${brand.domain || 'inventorytools.co.uk'}.`
    },
    {
      title: 'Terms of Service',
      content: `By creating an account or using ${productName}, you agree to these Terms of Service.

${productName} provides an online conversion service for property inventory documents and audio. The service converts inventory PDFs, Word documents and audio recordings of property walkthroughs into formatted Word documents.

You are responsible for ensuring that you have the right to upload, process and convert any documents or audio recordings submitted to ${productName}. This includes ensuring that any personal data contained in uploaded files — including voices captured in audio recordings — has been collected and shared lawfully.

You must not upload files that contain unlawful material, unnecessary sensitive personal data, criminal offence data, passwords, payment card details, national insurance numbers, identity documents or other information that is not required for the purpose of creating an inventory report.

Credits are purchased in advance and deducted per conversion. Credits do not expire unless stated otherwise. Credits are non-refundable once used to process a conversion.

Unused credits may be refunded at our discretion, subject to any payment processing fees, account status and evidence of misuse. We reserve the right to refuse refunds where credits have been used, abused or obtained fraudulently.

${productName} aims to produce accurate formatted Word documents, but AI conversion is not guaranteed to be perfect. You are responsible for reviewing each converted document before relying on it, sending it to a client, sending it to a tenant, uploading it to another system or using it for business purposes.

${productName} does not provide legal, tenancy, deposit, compliance or professional property advice. The service is a document formatting and conversion tool only.

We do not store the content of converted documents beyond what is necessary to provide the service, maintain user access to conversion history, support account functionality and meet security or legal obligations.

You must not misuse ${productName}. Prohibited use includes:

- Attempting to access another user's account or documents
- Uploading malicious files or harmful code
- Attempting to bypass credit limits, security controls or payment systems
- Using the service for unlawful, abusive or fraudulent purposes
- Reselling, copying or reverse-engineering the service without permission
- Uploading documents or audio you do not have the right to process

We may suspend or terminate accounts that misuse the service, breach these terms, create security risks, fail payment checks or use the platform in a way that may harm ${productName} or other users.

The service is provided on an "as is" and "as available" basis. We do not guarantee uninterrupted availability, error-free operation, perfect conversion accuracy or compatibility with every PDF, Word document or audio recording.

${productName} is not liable for indirect losses, loss of profit, loss of business, loss of data, reputational damage, missed deadlines or losses caused by a user failing to review converted documents.

Nothing in these terms limits liability where it would be unlawful to do so.

We may update these terms from time to time. Continued use of ${productName} after changes are published means you accept the updated terms.

For support, account questions or legal notices, contact ${supportEmail}.`
    },
    {
      title: 'GDPR Compliance',
      content: `${productName} is designed to support UK GDPR compliance by applying appropriate data protection, access control, retention and security measures.

Data protection contact: ${supportEmail}

${productName} does not currently have a Data Protection Officer because one is not required for the nature and scale of the service. A data protection contact is provided for privacy questions and data rights requests.

${productName} acts as a data controller for:

- User account information
- Billing and credit information
- Login and usage data
- Support communications
- Security and abuse prevention records

${productName} may act as a data processor where customers upload inventory documents or audio recordings containing personal data about tenants, occupiers, landlords, property contacts or other individuals. In those cases, the customer is responsible for the lawful basis for uploading and processing that data.

Legal bases for processing:

- Contract performance — to provide the ${productName} service
- Legitimate interests — to secure, maintain and improve the platform
- Legal obligation — to keep required business, tax and compliance records
- Consent — for optional cookies, analytics or marketing where applicable

Data controller: InventoryTools (inventorytools.co.uk)

Sub-processors used to provide the service may include:

- Supabase — database, authentication and private file storage
- Vercel — hosting and deployment
- Trigger.dev — background processing of documents and audio during conversion
- OpenAI — AI document and audio processing
- Resend — transactional email
- Stripe — payment processing

${productName} aims to keep customer data secure by applying:

- Authentication controls
- Private user-specific file access
- Row Level Security in the database
- Encrypted data transmission using HTTPS/TLS
- Environment-based API key storage
- Session expiry controls
- Access restrictions to user documents
- Regular security reviews

Users can request access, correction, deletion or restriction of their personal data by contacting ${supportEmail}.

Where a request relates to personal data inside an uploaded inventory document or audio recording, ${productName} may need to refer the request to the relevant customer or account holder if that customer is the data controller.

Personal data is retained only for as long as necessary to provide the service, comply with legal obligations, resolve disputes, maintain security and support account functionality.

Upon account deletion, account data and stored files are permanently removed within 30 days, except where limited records must be retained for legal, tax, accounting, fraud prevention or dispute purposes.

Our ICO registration is currently in application and pending with the Information Commissioner's Office (ICO).

Users may complain to the Information Commissioner's Office if they are unhappy with how their personal data is handled: ico.org.uk`
    },
    {
      title: 'Security',
      content: `We take security seriously and apply technical and organisational measures to protect user accounts, uploaded files and converted documents.

Security measures include:

- Data encrypted in transit using HTTPS/TLS
- Database access protected by Row Level Security so users can only access their own data
- Uploaded files and converted documents stored in private Supabase Storage
- API keys stored as environment variables and never exposed to the client
- Authentication handled by Supabase Auth with secure session tokens
- Session expiry controls to reduce unauthorised access risk
- Access controls limiting documents to the relevant authenticated account holder
- Regular reviews of infrastructure, permissions and security configuration

No online service can guarantee complete security. Users are responsible for keeping their login details secure, using strong passwords and ensuring that only authorised people access their ${productName} account.

If you believe your account or data may have been compromised, contact ${supportEmail}.`
    },
    {
      title: 'Data Retention',
      content: `${productName} keeps personal data only for as long as necessary to provide the service, maintain account functionality, comply with legal obligations, resolve disputes, prevent misuse and support security.

Retention periods include:

- Account profiles: retained until account deletion
- Billing and transaction records: retained for as long as required for legal, accounting and tax purposes
- Conversion history: retained until manually deleted by the user or account deletion
- Uploaded files (PDF, Word, audio): stored in private Supabase Storage until manually deleted by the user or account deletion
- Converted Word documents: stored in private Supabase Storage until manually deleted by the user or account deletion
- Support messages: retained as long as necessary to handle the issue and maintain business records
- Security logs: retained only as long as reasonably necessary for security, fraud prevention and abuse monitoring
- Backups: retained for a limited period and then automatically purged

Upon account deletion, account data, conversion history and stored files are permanently removed within 30 days, except where limited information must be retained for legal, tax, accounting, fraud prevention, security or dispute purposes.

Users can request deletion of their account or personal data by contacting ${supportEmail}.`
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
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: SHADOW, overflow: 'hidden' }}>
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

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPosition, setEditPosition] = useState('')

  function startEditMember(m: any) {
    setEditingMemberId(m.id)
    setEditName(m.full_name || '')
    setEditPosition(m.company_position || '')
  }

  async function saveEditMember(memberId: string) {
    await supabase.from('profiles').update({ full_name: editName, company_position: editPosition }).eq('id', memberId)
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, full_name: editName, company_position: editPosition } : m))
    setEditingMemberId(null)
  }

  async function removeMember(memberId: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ user_id: memberId })
    })
    const d = await res.json()
    if (d.error) { alert(d.error); return }
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
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: SHADOW, padding: 20, marginBottom: 16 }}>
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

      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: SHADOW, overflow: 'hidden' }}>
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
              {editingMemberId === m.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Full name" style={{ fontSize: 13, fontWeight: 600, padding: '5px 8px', borderRadius: 6, border: `1px solid ${BORDER}`, fontFamily: 'inherit' }} />
                  <input value={editPosition} onChange={e => setEditPosition(e.target.value)} placeholder="Position" style={{ fontSize: 12, padding: '5px 8px', borderRadius: 6, border: `1px solid ${BORDER}`, fontFamily: 'inherit' }} />
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{m.full_name || 'Unknown'}</p>
                  <p style={{ fontSize: 12, color: HINT, margin: 0 }}>{m.company_position || ''}</p>
                </>
              )}
            </div>
            <span style={{ fontSize: 12, background: m.role === 'admin' ? TEAL_LIGHT : BG, color: m.role === 'admin' ? TEAL_DARK : MUTED, padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize' as const, flexShrink: 0 }}>{m.role || 'user'}</span>

            {isAdmin && (
              editingMemberId === m.id ? (
                <>
                  <button onClick={() => saveEditMember(m.id)} style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 16, border: 'none', cursor: 'pointer', background: TEAL, color: '#fff', flexShrink: 0 }}>Save</button>
                  <button onClick={() => setEditingMemberId(null)} style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 16, border: `1px solid ${BORDER}`, cursor: 'pointer', background: 'transparent', color: MUTED, flexShrink: 0 }}>Cancel</button>
                </>
              ) : (
                <button onClick={() => startEditMember(m)} style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 16, border: `1px solid ${BORDER}`, cursor: 'pointer', background: 'transparent', color: MUTED, flexShrink: 0 }}>Edit</button>
              )
            )}

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
            <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px' }}>Permanently delete {confirmRemove.full_name || 'this member'}?</p>
            <p style={{ fontSize: 13, color: MUTED, margin: '0 0 20px' }}>This permanently deletes their account and cannot be undone. Their conversion history and reports will be preserved for your company's records.</p>
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

function SettingsPage({ supabase, userEmail, TEXT, MUTED, TEAL, BORDER, SURFACE, BG, HINT, isMobile, onTypistRatesSaved, onAudioTypistRatesSaved }: any) {
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

      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: SHADOW, padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Profile</p>
          <span style={{ fontSize: 11, background: profile.role === 'admin' ? '#fff0e6' : '#F7F9F8', color: profile.role === 'admin' ? '#c24a00' : MUTED, padding: '3px 10px', borderRadius: 20, fontWeight: 500, textTransform: 'uppercase' as const }}>{profile.role || 'user'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Full name</label>
            <input value={profile.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input value={userEmail} disabled style={{...inputStyle, background: BG, color: MUTED}} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16, marginBottom: 16 }}>
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: SHADOW, padding: 24 }}>
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
                onTypistRatesSaved?.(parseFloat(typistReportRate) || 12.00, parseFloat(typistPageRate) || 0.50, typistRateMode)
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

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: SHADOW, padding: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>🎙️ Audio to Word — typist cost settings</p>
          <p style={{ fontSize: 12, color: MUTED, margin: '0 0 16px' }}>Set what your team would normally pay a manual typist for audio inventory reports. Used to calculate your real savings on the Statistics page.</p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={() => setAudioTypistMode('per_size')} style={{ flex: 1, padding: '9px 14px', borderRadius: 8, border: `1px solid ${audioTypistMode === 'per_size' ? '#2563EB' : BORDER}`, background: audioTypistMode === 'per_size' ? '#2563EB' : 'transparent', color: audioTypistMode === 'per_size' ? '#fff' : TEXT, fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Per property size</button>
            <button onClick={() => setAudioTypistMode('per_minute')} style={{ flex: 1, padding: '9px 14px', borderRadius: 8, border: `1px solid ${audioTypistMode === 'per_minute' ? '#2563EB' : BORDER}`, background: audioTypistMode === 'per_minute' ? '#2563EB' : 'transparent', color: audioTypistMode === 'per_minute' ? '#fff' : TEXT, fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Per minute of audio</button>
          </div>

          {audioTypistMode === 'per_size' ? (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr', gap: 8, marginBottom: 8, fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase' as const }}>
                <span></span><span>Unfurnished</span><span>Furnished</span>
              </div>
              {[['room_only','Room only'],['studio','Studio'],['1bed','1 bed'],['2bed','2 bed'],['3bed','3 bed'],['4bed','4 bed'],['5bed','5 bed'],['6bed','6 bed'],['7bed','7 bed'],['8bed','8 bed'],['9bed','9 bed'],['10bed','10 bed'],['11bed','11 bed'],['12bed','12 bed']].map(([key,label]) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr', gap: 8, marginBottom: 8, alignItems: 'center' }}>
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
                onAudioTypistRatesSaved?.({ unfurnished: unfurnishedNumbers, furnished: furnishedNumbers })
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
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: SHADOW, padding: 24, marginBottom: 16 }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16, marginBottom: 16 }}>
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: SHADOW, padding: 24 }}>
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
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: SHADOW, padding: 24, marginBottom: 16 }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16, marginBottom: 16 }}>
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: SHADOW, padding: 24 }}>
        <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>Account</p>
        <p style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>Signed in as <strong style={{ color: TEXT }}>{userEmail}</strong></p>
        <button onClick={() => { if (window.confirm('Are you sure you want to sign out?')) { supabase.auth.signOut().then(() => { window.location.href = '/' }) } }} style={{ padding: '9px 20px', borderRadius: 9, border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT, fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Sign out</button>
      </div>

      {profile?.role === 'admin' && (
        <div style={{ background: SURFACE, border: '1px solid #FECACA', borderRadius: 18, boxShadow: SHADOW, padding: 24 }}>
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
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
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

function TopupCheckoutForm({ amount, primaryColor, borderColor, mutedColor, onSuccess, onCancel }: { amount: number, primaryColor: string, borderColor: string, mutedColor: string, onSuccess: () => void, onCancel: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setErrorMsg('')
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })
    if (error) {
      setErrorMsg(error.message || 'Payment failed. Please try again.')
      setLoading(false)
      return
    }
    if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess()
    } else {
      setErrorMsg('Payment did not complete. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {errorMsg && (
        <p style={{ fontSize: 12, color: '#DC2626', marginTop: 10 }}>{errorMsg}</p>
      )}
      <button
        type="submit"
        disabled={!stripe || loading}
        style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: loading ? mutedColor : primaryColor, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: loading ? 'default' : 'pointer', marginTop: 16 }}
      >
        {loading ? 'Processing…' : `Pay £${amount.toFixed(2)} securely`}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        style={{ width: '100%', padding: 11, borderRadius: 10, border: `1px solid ${borderColor}`, background: 'transparent', color: mutedColor, fontFamily: 'inherit', fontSize: 13, cursor: loading ? 'default' : 'pointer', marginTop: 8 }}
      >
        Cancel
      </button>
    </form>
  )
}

// Builds a downloadable Word document (.docx) client-side from structured room
// data, using the same table format the live conversion flow always produced.
// Shared by the audio background-job poll effect (built the moment a job
// completes) and reusable for any future "regenerate" style download.
async function buildAudioDocxBlob(rooms: any[], address: string): Promise<{ url: string, name: string }> {
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
    children: (text || '').split(/\n| \| /).map((line: string) => new Paragraph({ children: [new TextRun({ text: line.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,'').replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/[\u2013\u2014]/g,'-').replace(/[^\x09\x0A\x0D\x20-\xFF]/g,''), font: 'Arial', size: 20, color: '000000' })] }))
  })
  const children: any[] = []
  const filteredRooms = (rooms || []).filter((r: any) => (r.rows || []).length > 0)
  for (let i = 0; i < filteredRooms.length; i++) {
    const room = filteredRooms[i]
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
  const name = (address || 'inventory').replace(/[^a-zA-Z0-9 _-]/g, '').trim() + '.docx'
  return { url, name }
}

// Mirrors buildAudioDocxBlob's clean pattern for PDF/vision jobs - no processingRooms
// coupling, so multiple of these can safely be called independently for simultaneous jobs.
async function buildVisionDocxBlob(rooms: any[], address: string): Promise<{ url: string, name: string }> {
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
    children: (text || '').split(/\n| \| /).map((line: string) => new Paragraph({ children: [new TextRun({ text: line.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,'').replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/[\u2013\u2014]/g,'-').replace(/[^\x09\x0A\x0D\x20-\xFF]/g,''), font: 'Arial', size: 20, color: '000000' })] }))
  })
  const children: any[] = []
  const filteredRooms = (rooms || []).filter((r: any) => (r.rows || []).length > 0)
  for (let i = 0; i < filteredRooms.length; i++) {
    const room = filteredRooms[i]
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
  const name = formatDocxName(address || '') + '.docx'
  return { url, name }
}

// Self-contained job detail popup - takes just a jobId and polls independently for its
// own live status. Multiple of these can be open simultaneously, each fully independent,
// since none of them touch the old single-conversion processingRooms/audioProcessingRooms state.
function JobDetailModal({ jobId, onClose, cancelJob }: { jobId: string, onClose: () => void, cancelJob: (jobId: string, type: 'audio' | 'vision') => void }) {
  const brand = useBrand()
  const TEAL = brand.primary_color
  const [status, setStatus] = React.useState<any>(null)
  const [docxUrl, setDocxUrl] = React.useState<string | null>(null)
  const [docxName, setDocxName] = React.useState<string>('')
  const [building, setBuilding] = React.useState(false)
  const [showReview, setShowReview] = React.useState(false)
  const [reviewUserId, setReviewUserId] = React.useState<string>('')
  const isAudioJob = jobId.startsWith('audio-')
  const builtRef = React.useRef(false)

  React.useEffect(() => {
    let active = true
    async function poll() {
      try {
        const res = await fetch((isAudioJob ? '/api/convert-audio-status?jobId=' : '/api/convert-vision-status?jobId=') + jobId)
        const data = await res.json()
        if (active) setStatus(data)

        if (data.status === 'complete' && data.rooms && !builtRef.current) {
          builtRef.current = true
          setBuilding(true)
          const { url, name } = isAudioJob
            ? await buildAudioDocxBlob(data.rooms, data.address || jobId)
            : await buildVisionDocxBlob(data.rooms, data.address || jobId)
          if (active) { setDocxUrl(url); setDocxName(name); setBuilding(false) }
        }
      } catch (e) { console.error('Job detail poll failed:', e) }
    }
    poll()
    const interval = setInterval(poll, 3000)
    return () => { active = false; clearInterval(interval) }
  }, [jobId, isAudioJob])

  if (!status) return null

  const roomNames: string[] = isAudioJob
    ? Object.keys(status.room_statuses || {})
    : (status.room_names || [])
  const currentIndex = Math.floor(((status.progress || 0) / 100) * roomNames.length)
  const roomStates = roomNames.map((name, i) => {
    if (isAudioJob && status.room_statuses) return { name, state: status.room_statuses[name] || 'pending' }
    return { name, state: i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'pending' }
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 'min(90vw, 480px)', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{status.address || (isAudioJob ? 'Audio conversion' : 'PDF conversion')}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: '#8a8a8a' }}>×</button>
        </div>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>{building ? 'Building Word document...' : status.message}</p>
        {status.status !== 'complete' && (
          <button onClick={() => cancelJob(jobId, isAudioJob ? 'audio' : 'vision')} style={{ width: '100%', padding: 9, borderRadius: 8, border: '1px solid #DC2626', background: 'transparent', color: '#DC2626', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 14 }}>Cancel conversion</button>
        )}
        {roomStates.map((room, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', opacity: room.state === 'pending' ? 0.4 : 1 }}>
            {room.state === 'done' && <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#1D9E75', flexShrink: 0 }} />}
            {room.state === 'active' && <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #BFDBFE', borderTopColor: '#2563EB', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />}
            {room.state === 'pending' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ccc', margin: '0 5px', flexShrink: 0 }} />}
            <span style={{ fontSize: 13 }}>{room.name}</span>
          </div>
        ))}
        {docxUrl && (
          <a href={docxUrl} download={docxName} style={{ display: 'block', width: '100%', padding: 12, borderRadius: 10, background: '#1D9E75', color: '#fff', textAlign: 'center', textDecoration: 'none', fontWeight: 600, fontSize: 14, marginTop: 14 }}>↓ Download {docxName}</a>
        )}
        {isAudioJob && status.conversion_id && (
          <button onClick={async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session) { setReviewUserId(session.user.id); setShowReview(true) }
          }} style={{ display: 'block', width: '100%', padding: 12, borderRadius: 10, background: 'transparent', border: `1.5px solid ${TEAL}`, color: TEAL, textAlign: 'center', fontFamily: 'inherit', fontWeight: 600, fontSize: 14, marginTop: 10, cursor: 'pointer' }}>Review &amp; Amend</button>
        )}
      </div>
      {showReview && (
        <ReviewAmendModal
          conversionId={status.conversion_id}
          userId={reviewUserId}
          getAuthToken={async () => {
            const { data: { session } } = await supabase.auth.getSession()
            return session?.access_token || ''
          }}
          onClose={() => setShowReview(false)}
          accentColor={TEAL}
        />
      )}
    </div>
  )
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
  const [toolTab, setToolTab] = React.useState<'pdf' | 'audio'>(() => {
    if (typeof window === 'undefined') return 'pdf'
    const saved = sessionStorage.getItem('lastToolTab')
    return (saved === 'audio' || saved === 'pdf') ? saved : 'pdf'
  })
  React.useEffect(() => { sessionStorage.setItem('lastToolTab', toolTab) }, [toolTab])
  const [showAudioConvert, setShowAudioConvert] = React.useState(false)
  const [audioFiles, setAudioFiles] = React.useState<File[]>([])
  const [audioAddress, setAudioAddress] = React.useState('')
  const [audioPropertySize, setAudioPropertySize] = React.useState('')
  const [audioFurnished, setAudioFurnished] = React.useState('')
  const [audioRoomOrder, setAudioRoomOrder] = React.useState('')
  const [audioConvertState, setAudioConvertState] = React.useState<'idle'|'selected'|'processing'|'done'|'error'>('idle')
  const [leadersStyle, setLeadersStyle] = React.useState(false)
  const [audioElapsed, setAudioElapsed] = React.useState(0)
  const audioElapsedRef = React.useRef(0)
  const [audioError, setAudioError] = React.useState('')
  const [audioDocxUrl, setAudioDocxUrl] = React.useState<string|null>(null)
  const [audioConversionId, setAudioConversionId] = React.useState<string|null>(null)
  const [audioProcessingRooms, setAudioProcessingRooms] = React.useState<{name:string,state:string}[]>([])
  const activeAudioJobRef = React.useRef<{ jobId: string, filename: string } | null>(null)
  const [audioRestoredJobStartedAt, setAudioRestoredJobStartedAt] = React.useState<number | null>(null)
  const audioRestoredJobIdRef = React.useRef<string | null>(null)
  const [audioRestoredJobComplete, setAudioRestoredJobComplete] = React.useState(false)

  // Keeps audio's elapsed-time counter ticking forward using a real wall-clock
  // anchor (started_at), so a restored job's timer shows true elapsed time
  // instead of resetting to 0 after a page refresh.
  React.useEffect(() => {
    if (audioConvertState !== 'processing' || audioRestoredJobStartedAt === null || audioRestoredJobComplete) return
    const interval = setInterval(() => {
      const secs = Math.floor((Date.now() - audioRestoredJobStartedAt) / 1000)
      audioElapsedRef.current = secs
      setAudioElapsed(secs)
    }, 1000)
    return () => clearInterval(interval)
  }, [audioConvertState, audioRestoredJobComplete, audioRestoredJobStartedAt])
  const [audioDocxName, setAudioDocxName] = React.useState('')

  const [page, setPageState] = useState(() => {
    if (typeof window === 'undefined') return 'dashboard'
    return sessionStorage.getItem('lastPage') || 'dashboard'
  })
  React.useEffect(() => { sessionStorage.setItem('lastPage', page) }, [page])
  function setPage(p: string) { setPageState(p); setTimeout(() => { const main = document.querySelector('main div[style*="overflow"]') as HTMLElement; if (main) main.scrollTop = 0 }, 0) }
  const [darkMode, setDarkMode] = useState(false)
  const [showConvert, setShowConvert] = useState(false)
  const [showTopup, setShowTopup] = useState(false)
  const [cleanPdfFile, setCleanPdfFile] = useState<File | null>(null)
  const [cleanPdfState, setCleanPdfState] = useState<'idle'|'processing'|'done'|'error'>('idle')
  const [cleanPdfError, setCleanPdfError] = useState('')
  const [cleanPdfResult, setCleanPdfResult] = useState<{ base64: string, filename: string } | null>(null)
  const [topupAmount, setTopupAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [topupStep, setTopupStep] = useState<'select' | 'pay'>('select')
  const [topupClientSecret, setTopupClientSecret] = useState('')
  const [topupCustomerSession, setTopupCustomerSession] = useState('')
  const [topupLoading, setTopupLoading] = useState(false)
  const [topupError, setTopupError] = useState('')
  const [topupSuccess, setTopupSuccess] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [credits, setCredits] = useState(0)
  const [userName, setUserName] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [userRole, setUserRole] = useState('user')
  const [pdfEnabled, setPdfEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [typistRateMode, setTypistRateModeD] = useState('per_report')
  const [typistReportRate, setTypistReportRateD] = useState(12.00)
  const [typistPageRate, setTypistPageRateD] = useState(0.50)
  const [audioTypistRates, setAudioTypistRates] = useState<{unfurnished: Record<string, number>, furnished: Record<string, number>} | null>(null)
  const [convertState, setConvertState] = useState<'idle'|'selected'|'processing'|'done'|'error'>('idle')
  const [selectedFile, setSelectedFile] = useState<File|null>(null)
  const [selectedCredits, setSelectedCredits] = useState<{credits:number,price:number}|null>(null)
  const [processingRooms, setProcessingRooms] = useState<{name:string,state:string}[]>([])
  const [elapsed, setElapsed] = useState(0)
  const elapsedRef = React.useRef(0)
  const restoredJobStartedAtRef = React.useRef<number | null>(null)
  const restoredJobIdRef = React.useRef<string | null>(null)
  const [restoredJobComplete, setRestoredJobComplete] = useState(false)

  // Keeps the elapsed-time counter ticking forward using a real wall-clock anchor
  // (started_at), so a restored job's timer shows true elapsed time instead of
  // resetting to 0 after a page refresh.
  React.useEffect(() => {
    if (convertState !== 'processing' || restoredJobStartedAtRef.current === null || restoredJobComplete) return
    const interval = setInterval(() => {
      const secs = Math.floor((Date.now() - restoredJobStartedAtRef.current!) / 1000)
      elapsedRef.current = secs
      setElapsed(secs)
    }, 1000)
    return () => clearInterval(interval)
  }, [convertState, restoredJobComplete])
  const activeVisionJobRef = React.useRef<{ jobId: string, filename: string } | null>(null)
  const wordJobIdRef = React.useRef<string | null>(null)
  const [backgroundJobs, setBackgroundJobs] = React.useState<{ jobId: string, filename: string, message: string, progress: number, status: string }[]>([])
  const [openJobModals, setOpenJobModals] = React.useState<string[]>([])
  const [syncConversionInProgress, setSyncConversionInProgress] = React.useState(false)
  const [showWordWarning, setShowWordWarning] = React.useState(false)

  // Word-to-Word and text-based PDF conversions run synchronously in the browser (no
  // background job), so a refresh genuinely kills them - warn before that happens.
  React.useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (syncConversionInProgress) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [syncConversionInProgress])
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => { setMounted(true) }, [])

  async function cancelJob(jobId: string | null | undefined, type: 'audio' | 'vision') {
    if (!jobId) return
    if (!confirm('Cancel this conversion? This cannot be undone.')) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await fetch('/api/cancel-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ jobId, type })
      })
      setBackgroundJobs(prev => prev.map(j => j.jobId === jobId ? { ...j, status: 'cancelled', message: 'Cancelled' } : j))
      if (type === 'audio') { setAudioConvertState('idle'); activeAudioJobRef.current = null }
      else { setConvertState('idle'); activeVisionJobRef.current = null }
    } catch (e) {
      console.error('Cancel failed:', e)
    }
  }

  // Poll background vision jobs every 3 seconds and remove them when complete
  React.useEffect(() => {
    if (backgroundJobs.length === 0) return
    const interval = setInterval(async () => {
      const updated = await Promise.all(backgroundJobs.map(async job => {
        // word-sync jobs are client-side only - don't poll them, they self-remove when done
        if (job.status !== 'running' && job.status !== 'queued') return job
        const isAudioJob = job.jobId.startsWith('audio-')
        try {
          const res = await fetch((isAudioJob ? '/api/convert-audio-status?jobId=' : '/api/convert-vision-status?jobId=') + job.jobId)
          const data = await res.json()

          if (isAudioJob) {
            // Keep audio's room checklist in sync every tick, whether this is the
            // live conversion or one restored after a refresh.
            if ((job.jobId === activeAudioJobRef.current?.jobId || job.jobId === audioRestoredJobIdRef.current) && data.room_statuses && !audioRestoredJobComplete) {
              setAudioProcessingRooms(Object.entries(data.room_statuses).map(([name, state]) => ({ name, state: state as string })))
            }
            // Live completion: build the Word doc from server data and show the done view
            if (data.status === 'complete' && job.jobId === activeAudioJobRef.current?.jobId) {
              const { url, name } = await buildAudioDocxBlob(data.rooms, job.filename)
              setAudioDocxUrl(url)
              setAudioDocxName(name)
              setAudioConversionId(data.conversion_id || null)
              setAudioConvertState('done')
              activeAudioJobRef.current = null
            }
            // Restored completion: audio_jobs stores the completed room data directly
            // (unlike PDF's more fragile setup), so a restored job can get a fully
            // working download too, not just a "check Recent Conversions" message.
            if (data.status === 'complete' && job.jobId === audioRestoredJobIdRef.current && audioConvertState === 'processing' && !audioRestoredJobComplete) {
              setAudioRestoredJobComplete(true)
              const { url, name } = await buildAudioDocxBlob(data.rooms, job.filename)
              setAudioDocxUrl(url)
              setAudioDocxName(name)
              setAudioConversionId(data.conversion_id || null)
              setAudioConvertState('done')
            }
          } else {
            // Keep the PDF/vision modal's room checklist in sync with live progress every
            // tick, not just at the moment of the initial page-load restore — otherwise
            // it falls behind (or freezes) while the bar keeps updating correctly.
            if (job.jobId === restoredJobIdRef.current && data.room_names && !restoredJobComplete) {
              const names: string[] = data.room_names
              const match = (data.message || '').match(/room (\d+)\/(\d+)/)
              const currentIndex = match ? parseInt(match[1], 10) : 0
              setProcessingRooms(names.map((name: string, idx: number) => ({
                name,
                state: idx < currentIndex - 1 ? 'done' : idx === currentIndex - 1 ? 'active' : 'pending'
              })))
            }
          }

          return { ...job, message: data.message || job.message, progress: data.progress || job.progress, status: data.status || job.status }
        } catch { return job }
      }))
      // Show completed jobs briefly then remove them
      const hasCompleted = updated.some(j => j.status === 'complete')
      setBackgroundJobs(updated.filter(j => j.status === 'running' || j.status === 'queued' || j.status === 'complete' || j.status === 'word-sync'))
      // If the specific job the modal is showing (restored after a refresh) just
      // completed, freeze the timer and swap the message — but leave the modal
      // open, since the user may still want to see it before closing manually.
      if (restoredJobIdRef.current && convertState === 'processing' && !restoredJobComplete) {
        const restoredJobNowComplete = updated.find(j => j.jobId === restoredJobIdRef.current && j.status === 'complete')
        if (restoredJobNowComplete) {
          setRestoredJobComplete(true)
        }
      }
      if (hasCompleted) {
        // Refresh conversions list
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            let q = supabase.from('conversions').select('*').order('created_at', { ascending: false }).limit(50)
            if (userRole !== 'admin') q = q.eq('user_id', session.user.id)
            q.then(({ data: convs }) => { if (convs) setConversions(convs) })
          }
        })
        // Remove completed jobs after 5 seconds
        setTimeout(() => {
          setBackgroundJobs(prev => prev.filter(j => j.status === 'running'))
        }, 5000)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [backgroundJobs])
  const [convertError, setConvertError] = useState('')
  const [conversions, setConversions] = useState<any[]>([])
  const [userStats, setUserStats] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [usageInvoicePeriod, setUsageInvoicePeriod] = useState<'today'|'week'|'month'|'all'|'custom'>('month')
  const [usageInvoiceFrom, setUsageInvoiceFrom] = useState('')
  const [usageInvoiceTo, setUsageInvoiceTo] = useState('')
  const [topupHistoryPeriod, setTopupHistoryPeriod] = useState<'today'|'week'|'month'|'all'|'custom'>('all')
  const [topupHistoryFrom, setTopupHistoryFrom] = useState('')
  const [topupHistoryTo, setTopupHistoryTo] = useState('')
  const [generatingUsageInvoice, setGeneratingUsageInvoice] = useState(false)
  function fmtAddr(addr: string) {
    if (!addr) return addr
    const titled = addr.toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())
    return titled.replace(/\b([A-Za-z]{1,2}\d{1,2}[A-Za-z]?\s*\d[A-Za-z]{2})\b/gi, (m: string) => m.toUpperCase())
  }

  function shortAddr(addr: string) {
    if (!addr) return addr
    const parts = addr.split(',').map(s => s.trim()).filter(Boolean)
    if (parts.length <= 2) return addr
    return parts[0] + ', ' + parts[parts.length - 1]
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
  const [showReviewModal, setShowReviewModal] = React.useState<any>(null)
  const [generatingReport, setGeneratingReport] = React.useState(false)

  function getUsageInvoiceDateRange(): { from: Date, to: Date } {
    const now = new Date()
    if (usageInvoicePeriod === 'all') {
      return { from: new Date(2020, 0, 1), to: new Date(now.getTime() + 24*60*60*1000) }
    }
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

  function getTopupHistoryDateRange(): { from: Date, to: Date } | null {
    const now = new Date()
    if (topupHistoryPeriod === 'all') return null
    if (topupHistoryPeriod === 'today') {
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const to = new Date(from); to.setDate(to.getDate() + 1)
      return { from, to }
    }
    if (topupHistoryPeriod === 'week') {
      const from = new Date(now); from.setDate(now.getDate() - now.getDay())
      from.setHours(0,0,0,0)
      const to = new Date(from); to.setDate(to.getDate() + 7)
      return { from, to }
    }
    if (topupHistoryPeriod === 'month') {
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      return { from, to }
    }
    // custom
    const from = topupHistoryFrom ? new Date(topupHistoryFrom) : new Date(now.getFullYear(), now.getMonth(), 1)
    const to = topupHistoryTo ? new Date(new Date(topupHistoryTo).getTime() + 24*60*60*1000) : new Date()
    return { from, to }
  }

  function getUsageInvoiceConversions() {
    const { from, to } = getUsageInvoiceDateRange()
    return conversions.filter((c: any) => {
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

      const hexToRgb = (hex: string): [number, number, number] => {
        const h = (hex || '#fd6a02').replace('#', '')
        const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
        const n = parseInt(full, 16)
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
      }
      const loadImageData = (url: string): Promise<{ dataUrl: string; w: number; h: number }> =>
        new Promise((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.naturalWidth
            canvas.height = img.naturalHeight
            const ctx = canvas.getContext('2d')
            if (!ctx) return reject(new Error('no ctx'))
            ctx.drawImage(img, 0, 0)
            resolve({ dataUrl: canvas.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight })
          }
          img.onerror = reject
          img.src = url
        })

      const accent = hexToRgb(brand.primary_color || '#fd6a02')
      const logoUrl = brand.company_name === 'InventoryTools' ? '/logo-email-full.png' : (brand.logo_url || '/logo-email-full.png')

      const doc = new jsPDF()

      let headerBottom = 22
      try {
        const logo = await loadImageData(logoUrl)
        const dispW = 46
        const dispH = dispW * (logo.h / logo.w)
        doc.addImage(logo.dataUrl, 'PNG', 14, 14, dispW, dispH)
        headerBottom = 14 + dispH + 8
      } catch (e) {
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(26, 26, 26)
        doc.text(brand.display_name || 'InventoryTools', 14, 22)
        headerBottom = 30
      }

      doc.setFontSize(15)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(26, 26, 26)
      doc.text('Usage Invoice', 14, headerBottom)
      doc.setDrawColor(accent[0], accent[1], accent[2])
      doc.setLineWidth(1.2)
      doc.line(14, headerBottom + 3, 44, headerBottom + 3)

      const panelY = headerBottom + 10
      doc.setFillColor(246, 245, 243)
      doc.roundedRect(14, panelY, 182, 20, 3, 3, 'F')
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(138, 138, 138)
      doc.text('Period', 20, panelY + 8)
      doc.text('Generated', 105, panelY + 8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(26, 26, 26)
      doc.text(`${from.toLocaleDateString('en-GB')} - ${new Date(to.getTime() - 1).toLocaleDateString('en-GB')}`, 20, panelY + 15)
      doc.text(new Date().toLocaleDateString('en-GB'), 105, panelY + 15)

      autoTable(doc, {
        startY: panelY + 28,
        head: [['Date', 'Property', 'Type', 'Cost']],
        body: items.map((c: any) => [
          new Date(c.created_at).toLocaleDateString('en-GB'),
          c.address || 'Unknown',
          c.type === 'audio' ? 'Audio' : 'PDF',
          '£' + (c.cost ? Number(c.cost).toFixed(2) : (c.type === 'audio' ? '4.88' : '4.00'))
        ]),
        styles: { fontSize: 9, cellPadding: 3, textColor: [40, 40, 40] },
        headStyles: { fillColor: accent, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [246, 245, 243] },
      })

      const finalY = (doc as any).lastAutoTable.finalY || 60
      doc.setDrawColor(236, 235, 232)
      doc.setLineWidth(0.4)
      doc.line(14, finalY + 6, 196, finalY + 6)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(accent[0], accent[1], accent[2])
      doc.text(`Total: £${total.toFixed(2)}`, 14, finalY + 18)
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(138, 138, 138)
      doc.text(`${items.length} report${items.length === 1 ? '' : 's'} in this period`, 14, finalY + 24)

      doc.save(`usage-invoice-${from.toISOString().slice(0,10)}-to-${new Date(to.getTime()-1).toISOString().slice(0,10)}.pdf`)
    } catch (e) {
      alert('Failed to generate usage invoice PDF')
    } finally {
      setGeneratingUsageInvoice(false)
    }
  }

  async function downloadTransactionInvoicePDF(t: any) {
    try {
      const { jsPDF } = await import('jspdf')

      const hexToRgb = (hex: string): [number, number, number] => {
        const h = (hex || '#fd6a02').replace('#', '')
        const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
        const n = parseInt(full, 16)
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
      }
      const loadImageData = (url: string): Promise<{ dataUrl: string; w: number; h: number }> =>
        new Promise((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.naturalWidth
            canvas.height = img.naturalHeight
            const ctx = canvas.getContext('2d')
            if (!ctx) return reject(new Error('no ctx'))
            ctx.drawImage(img, 0, 0)
            resolve({ dataUrl: canvas.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight })
          }
          img.onerror = reject
          img.src = url
        })

      const accent = hexToRgb(brand.primary_color || '#fd6a02')
      const logoUrl = brand.company_name === 'InventoryTools' ? '/logo-email-full.png' : (brand.logo_url || '/logo-email-full.png')
      const showPaymentMethod = brand.company_name === 'InventoryTools' && t.card_brand && t.card_last4

      const doc = new jsPDF()

      let headerBottom = 22
      try {
        const logo = await loadImageData(logoUrl)
        const dispW = 46
        const dispH = dispW * (logo.h / logo.w)
        doc.addImage(logo.dataUrl, 'PNG', 14, 14, dispW, dispH)
        headerBottom = 14 + dispH + 8
      } catch (e) {
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(26, 26, 26)
        doc.text(brand.display_name || 'InventoryTools', 14, 22)
        headerBottom = 30
      }

      doc.setFontSize(15)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(26, 26, 26)
      doc.text('Invoice', 14, headerBottom)
      doc.setDrawColor(accent[0], accent[1], accent[2])
      doc.setLineWidth(1.2)
      doc.line(14, headerBottom + 3, 44, headerBottom + 3)

      const panelY = headerBottom + 10
      const panelH = showPaymentMethod ? 32 : 24
      doc.setFillColor(246, 245, 243)
      doc.roundedRect(14, panelY, 182, panelH, 3, 3, 'F')
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(138, 138, 138)
      doc.text('Invoice #', 20, panelY + 8)
      doc.text('Date', 105, panelY + 8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(26, 26, 26)
      doc.text(t.invoice_number || '—', 20, panelY + 14)
      doc.text(new Date(t.created_at).toLocaleDateString('en-GB'), 105, panelY + 14)

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(138, 138, 138)
      doc.text('Description', 20, panelY + 22)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(26, 26, 26)
      doc.text(t.description || 'Balance top-up', 20, panelY + 28)

      if (showPaymentMethod) {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(138, 138, 138)
        doc.text('Payment method', 105, panelY + 22)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(26, 26, 26)
        doc.text(`${t.card_brand} \u2022\u2022\u2022\u2022 ${t.card_last4}`, 105, panelY + 28)
      }

      const afterPanelY = panelY + panelH + 14
      doc.setDrawColor(236, 235, 232)
      doc.setLineWidth(0.4)
      doc.line(14, afterPanelY, 196, afterPanelY)

      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(accent[0], accent[1], accent[2])
      doc.text(`£${Number(t.amount).toFixed(2)}`, 14, afterPanelY + 16)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(138, 138, 138)
      doc.text('Amount paid', 14, afterPanelY + 22)

      doc.save(`invoice-${t.invoice_number || t.id}.pdf`)
    } catch (e) {
      alert('Failed to generate invoice PDF')
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
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
        const unrated = convs.filter((x: any) => !x.rating && x.user_id === session.user.id)
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
      supabase.from('profiles').select('company_name, full_name, onboarding_confirmed, role, pdf_enabled, audio_enabled, typist_rate_mode, typist_report_rate, typist_page_rate, audio_typist_rates').eq('id', session.user.id).single().then(({ data: profile }) => {
        if (profile) {
          setUserName(profile.full_name || session.user.email || '')
          setUserRole(profile.role || 'user')
          setPdfEnabled(profile.pdf_enabled !== false)
          setAudioEnabled(profile.audio_enabled !== false)
          setTypistRateModeD(profile.typist_rate_mode || 'per_report')
          setTypistReportRateD(profile.typist_report_rate ?? 12.00)
          setTypistPageRateD(profile.typist_page_rate ?? 0.50)
          setAudioTypistRates(profile.audio_typist_rates || null)
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
              const unrated = convs.filter((x: any) => !x.rating && x.user_id === session.user.id)
              if (unrated.length > 0) {
                setPendingRatings(unrated)
                if (isFreshLogin) { setShowRatingPopup(true) }
              }
            }
          })

          // On load, check for any vision jobs still running for this user and restore them
          // to the background jobs bar so they survive page refreshes
          supabase.from('vision_jobs')
            .select('id, message, progress, status, address, room_names, started_at')
            .eq('user_id', session.user.id)
            .in('status', ['queued', 'running'])
            .then(({ data: activeJobs }) => {
              if (activeJobs && activeJobs.length > 0) {
                const firstJob = activeJobs[0]
                restoredJobIdRef.current = firstJob.id
                if (firstJob?.started_at) {
                  const startedAtMs = new Date(firstJob.started_at).getTime()
                  restoredJobStartedAtRef.current = startedAtMs
                  const initialElapsed = Math.floor((Date.now() - startedAtMs) / 1000)
                  elapsedRef.current = initialElapsed
                  setElapsed(initialElapsed)
                }
                setBackgroundJobs(prev => {
                  const existingIds = new Set(prev.map(p => p.jobId))
                  const newOnes = activeJobs
                    .filter((j: any) => !existingIds.has(j.id))
                    .map((j: any) => ({
                      jobId: j.id,
                      filename: j.address || 'PDF conversion',
                      message: j.message || 'Processing...',
                      progress: j.progress || 0,
                      status: 'running'
                    }))
                  return [...prev, ...newOnes]
                })
                // Reconstruct the modal's room-by-room checklist so it matches the bar's
                // real progress after a refresh, instead of showing stale/empty data.
                if (firstJob?.room_names) {
                  try {
                    const names: string[] = JSON.parse(firstJob.room_names)
                    const match = (firstJob.message || '').match(/room (\d+)\/(\d+)/)
                    const currentIndex = match ? parseInt(match[1], 10) : 0 // 1-indexed room currently being processed
                    setProcessingRooms(names.map((name, idx) => ({
                      name,
                      state: idx < currentIndex - 1 ? 'done' : idx === currentIndex - 1 ? 'active' : 'pending'
                    })))
                  } catch (e) {
                    console.error('Failed to restore room checklist:', e)
                  }
                }
              }
            })

          supabase.from('audio_jobs')
            .select('id, message, progress, status, address, room_statuses, started_at, property_size, furnished')
            .eq('user_id', session.user.id)
            .in('status', ['queued', 'running'])
            .then(({ data: activeAudioJobs }) => {
              if (activeAudioJobs && activeAudioJobs.length > 0) {
                const firstAudioJob = activeAudioJobs[0]
                audioRestoredJobIdRef.current = firstAudioJob.id
                setAudioAddress(firstAudioJob.address || '')
                setAudioPropertySize(firstAudioJob.property_size || '')
                setAudioFurnished(firstAudioJob.furnished || '')
                if (firstAudioJob?.started_at) {
                  const startedAtMs = new Date(firstAudioJob.started_at).getTime()
                  setAudioRestoredJobStartedAt(startedAtMs)
                  const initialElapsed = Math.floor((Date.now() - startedAtMs) / 1000)
                  audioElapsedRef.current = initialElapsed
                  setAudioElapsed(initialElapsed)
                }
                setBackgroundJobs(prev => [...prev, ...activeAudioJobs.map((j: any) => ({
                  jobId: j.id,
                  filename: j.address || 'Audio conversion',
                  message: j.message || 'Processing...',
                  progress: j.progress || 0,
                  status: 'running'
                }))])
                // Audio's checklist restores directly from the structured status map —
                // no message-parsing needed, unlike PDF's index-based approach.
                if (firstAudioJob?.room_statuses) {
                  try {
                    const statuses = JSON.parse(firstAudioJob.room_statuses)
                    setAudioProcessingRooms(Object.entries(statuses).map(([name, state]) => ({ name, state: state as string })))
                  } catch (e) {
                    console.error('Failed to restore audio room checklist:', e)
                  }
                }
              }
            })
        }
      })
      supabase.from('user_stats').select('*').eq('user_id', session.user.id).single().then(({ data: stats }) => { if (stats) setUserStats(stats) })
      // Load transaction/invoice history for this company, plus company address/phone for invoice headers
      supabase.from('profiles').select('company_name, company_address, company_phone').eq('id', session.user.id).single().then(({ data: me }) => {
        if (me?.company_name) {
          setCompanyAddress(me.company_address || '')
          setCompanyPhone(me.company_phone || '')
          supabase.from('transactions').select('*').eq('company_name', me.company_name).order('created_at', { ascending: false }).then(({ data: txns }) => {
            if (txns) setTransactions(txns)
          })
        }
      })
    })
  }, [])

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
    { id: 'convert', label: toolTab === 'audio' ? 'Convert Audio' : 'Convert PDF or Word', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', badge: 'New' },
    { id: 'cleanpdf', label: 'Clean PDF', icon: 'M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8' },
    { id: 'reports', label: 'Reports', icon: 'M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z' },
    ...(userRole === 'admin' ? [{ id: 'stats', label: 'Statistics', icon: 'M18 20V10M12 20V4M6 20v-6' }] : []),
    ...(userRole === 'admin' ? [{ id: 'team', label: 'Team', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' }] : []),
    ...(userRole === 'admin' ? [{ id: 'billing', label: 'Billing', icon: 'M1 4h22v16a2 2 0 01-2 2H3a2 2 0 01-2-2V4zM1 10h22' }] : []),
    { id: 'settings', label: 'Settings', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14' },
    { id: 'legal', label: 'Legal', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { id: 'help', label: 'Help & FAQ', icon: 'M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'contact', label: 'Contact Us', icon: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6' },
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
    // Prevent converting the exact same filename while it's already running in the background
    const filename = selectedFile.name
    const alreadyRunning = backgroundJobs.some(j => (j.status === 'running' || j.status === 'word-sync') && j.filename === filename)
    if (alreadyRunning) {
      setConvertError('This file is already being converted in the background. Please wait for it to complete.')
      setConvertState('error')
      return
    }
    setConvertState('processing')
    setConvertError('')
    if (method !== 'vision') setSyncConversionInProgress(true)
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
        const safeFileName2 = (selectedFile?.name || 'upload.pdf').replace(/[^a-zA-Z0-9._-]/g, '_')
        const tempPath2 = sess?.user?.id + '/vision_temp_' + ts2 + '_' + safeFileName2
        const { data: upData, error: upErr } = await supabase.storage.from('documents').upload(tempPath2, selectedFile!, { contentType: 'application/pdf', upsert: true })
        if (upErr) throw new Error('Upload failed: ' + upErr.message)
        const pdfPath = upData.path

        // Start background job
        setProcessingRooms([{ name: 'Starting background conversion...', state: 'active' }])
        const startRes = await fetch('/api/convert-vision-start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sess?.access_token}` },
          body: JSON.stringify({ pdfPath, userId: sess?.user?.id, convertedBy: userName || userEmail || sess?.user?.email || '', promptStyle: leadersStyle ? 'leaders' : 'standard' })
        })
        const startData = await startRes.json()
        if (!startRes.ok) throw new Error(startData.error || 'Failed to start vision job')
        const jobId = startData.jobId
        activeVisionJobRef.current = { jobId, filename: selectedFile?.name || 'PDF' }

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
            activeVisionJobRef.current = null
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
supabase.auth.getSession().then(async ({ data: { session } }) => {
  // Vision conversions are saved server-side by the Trigger job on completion,
  // so skip the client-side save to avoid double-saving and double-charging
  if (session && method !== 'vision') {
    await fetch('/api/save-conversion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
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
        actual_api_cost: data.actualApiCost != null ? Number(data.actualApiCost) : null,
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
                console.log('[pdfRefresh] convs:', convs?.length, '| wordJobIdRef:', wordJobIdRef.current)
                if (convs) {
                  setConversions(convs)
                  const latest = convs[0]
                  if (latest && !latest.rating) { setQuickRateConvId(latest.id); setQuickRateConvAddress(latest.address || ''); setShowQuickRate(true); localStorage.setItem('lastConverted', Date.now().toString()) }
                  if (false && latest && p?.auto_accuracy_report && !latest.accuracy_report && (latest.extracted_text || latest.converted_json) && latest.type !== 'audio') {
                    generateAccuracyReport(latest)
                  }
                  // Remove all word-sync background job cards now that conversions list is updated
                  setBackgroundJobs(prev => prev.filter(j => j.status !== 'word-sync'))
                  wordJobIdRef.current = null
                }
              })
            })
          }
        })
      })
      console.log('[startConvert] completed, wordJobIdRef:', wordJobIdRef.current)
      setConvertState('done')
      clearInterval(timer)

    } catch (err: any) {
      clearInterval(timer)
      const realErrorMessage = typeof err === 'string' ? err : (err.message || err.toString() || JSON.stringify(err) || 'Unknown error')
      console.error('[startConvert] real error (hidden from user):', realErrorMessage)
      fetch('/api/report-error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'pdf', errorMessage: realErrorMessage, address: selectedFile?.name || '', userEmail }) }).catch(() => {})
      // Clean up word-sync background job on error too
      if (wordJobIdRef.current) {
        setBackgroundJobs(prev => prev.filter(j => j.jobId !== wordJobIdRef.current))
        wordJobIdRef.current = null
      }
      setConvertError('Unable to process at this time. If the problem persists, please contact admin.')
      setConvertState('error')
    } finally {
      setSyncConversionInProgress(false)
    }
  }

  function closeConvert() {
    console.log('[closeConvert] convertState:', convertState, '| activeVisionJobRef:', activeVisionJobRef.current)
    // If a word-to-word conversion is running, add a background job card
    if (convertState === 'processing' && wordJobIdRef.current === null && selectedFile && !activeVisionJobRef.current) {
      const wordJobId = 'word_' + Date.now()
      wordJobIdRef.current = wordJobId
      setBackgroundJobs(prev => [...prev, {
        jobId: wordJobId,
        filename: selectedFile.name.replace(/\.docx$/i, ''),
        message: 'Converting Word document...',
        progress: 0,
        status: 'word-sync'
      }])
    }
    // If a vision job is running, push it to the background jobs list so the user can track it
    if (convertState === 'processing' && activeVisionJobRef.current) {
      const job = activeVisionJobRef.current
      setBackgroundJobs(prev => {
        if (prev.find(j => j.jobId === job.jobId)) return prev
        return [...prev, { jobId: job.jobId, filename: job.filename, message: 'Processing...', progress: 0, status: 'running' }]
      })
      activeVisionJobRef.current = null
    }
    setShowConvert(false)
    setConvertState('idle')
    setProcessingRooms([])
    setRestoredJobComplete(false)
    restoredJobStartedAtRef.current = null
    restoredJobIdRef.current = null
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
    <div className={darkMode ? 'it-dark' : ''} style={{ fontFamily: "'IBM Plex Mono', monospace", display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', overflow: 'hidden', background: darkMode ? '#14110C' : BG, transition: 'background .3s ease' }}>
      <div className="it-backdrop">
        <div className="it-blob it-blob-1" />
        <div className="it-blob it-blob-2" />
        <div className="it-blob it-blob-3" />
      </div>
      <style>{`
        .it-card{border-radius:18px;box-shadow:0 8px 30px rgba(26,26,26,.07);transition:box-shadow .2s ease,transform .2s ease;background:rgba(255,255,255,.7)!important;backdrop-filter:blur(24px) saturate(160%)!important;-webkit-backdrop-filter:blur(24px) saturate(160%)!important;border-color:rgba(255,255,255,.75)!important}
        .it-card:hover{box-shadow:0 14px 36px rgba(26,26,26,.11);transform:translateY(-3px)}
        .it-label{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.1em;color:#8a8a8a;font-weight:500;text-transform:uppercase;margin:0}
        .it-num{font-family:'Space Grotesk',sans-serif;letter-spacing:-.02em}
        h1,h2,h3{font-family:'Space Grotesk',sans-serif;color:#1a1a1a}
        .it-eyebrow{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;color:${TEAL};font-weight:500;text-transform:uppercase;margin:0}
        .it-backdrop{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none}
        .it-blob{position:absolute;border-radius:50%;filter:blur(110px)}
        .it-blob-1{width:640px;height:640px;background:${TEAL};top:-220px;left:-160px;opacity:.14}
        .it-blob-2{width:520px;height:520px;background:#e4d9c9;top:10%;right:-180px;opacity:.5}
        .it-blob-3{width:560px;height:560px;background:#c9cfda;bottom:-260px;left:20%;opacity:.28}
        .it-glass-sidebar{background:rgba(255,255,255,.65)!important;backdrop-filter:blur(28px) saturate(160%);-webkit-backdrop-filter:blur(28px) saturate(160%)}
        .it-glass-topbar{background:rgba(255,255,255,.7)!important;backdrop-filter:blur(24px) saturate(160%);-webkit-backdrop-filter:blur(24px) saturate(160%)}
        .it-dark .it-blob-1{opacity:.22}
        .it-dark .it-blob-2{background:#2e2a22!important;opacity:.55}
        .it-dark .it-blob-3{background:#1c2028!important;opacity:.35}
        .it-dark .it-glass-sidebar{background:rgba(20,17,12,.55)!important}
        .it-dark .it-glass-sidebar *{color:#f3f0ea!important}
        .it-dark .it-glass-topbar{background:rgba(20,17,12,.6)!important}
        .it-dark .it-glass-topbar h1,.it-dark .it-glass-topbar p{color:#f3f0ea!important}
        .it-toggle{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.6);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.7);border-radius:20px;padding:4px;cursor:pointer}
        .it-dark .it-toggle{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.1)}
        .it-toggle-pill{display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;color:#8a8577;transition:all .2s ease}
        .it-toggle-pill.on{background:${TEAL};color:#fff}
        .it-glass-tabbar{background:rgba(255,255,255,.35)!important;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
        .it-stack{position:relative;height:120px}
        .it-sheet{position:absolute;width:84px;height:108px;background:#fff;border:1px solid #ecebe8;border-radius:10px;box-shadow:0 8px 30px rgba(26,26,26,.1);left:50%;top:0;animation:itFan1 4s ease-in-out infinite}
        .it-sheet:nth-child(2){animation-name:itFan2}
        .it-sheet-accent{animation-name:itFan3!important;background:${TEAL}!important;border:none!important}
        .it-sheet-line{height:6px;border-radius:3px;background:#ecebe8;margin:14px 14px 8px}
        .it-sheet-accent .it-sheet-line{background:rgba(255,255,255,.5)}
        .it-tick{position:absolute;bottom:12px;right:12px;opacity:0;animation:itTickIn 4s ease-in-out infinite}
        @keyframes itFan1{0%{transform:translateX(-50%) rotate(-8deg)}15%,50%{transform:translateX(-68%) rotate(-14deg) translateY(-4px)}65%,100%{transform:translateX(-50%) rotate(0deg)}}
        @keyframes itFan2{0%,15%,50%{transform:translateX(-50%) rotate(0deg) translateY(-2px)}65%,100%{transform:translateX(-50%) rotate(0deg) translateY(0)}}
        @keyframes itFan3{0%{transform:translateX(-50%) rotate(8deg)}15%,50%{transform:translateX(-32%) rotate(14deg) translateY(-6px)}65%,100%{transform:translateX(-50%) rotate(0deg)}}
        @keyframes itTickIn{0%,55%{opacity:0;transform:scale(.5)}70%,100%{opacity:1;transform:scale(1)}}
      `}</style>

      {/* SIDEBAR */}
      <aside className="it-glass-sidebar" style={{ width: isMobile ? 0 : 290, background: SURFACE, borderRight: isMobile ? 'none' : `1px solid ${BORDER}`, display: isMobile ? 'none' : 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0, position: 'relative', zIndex: 1 }}>
        <div style={{ height: 64, padding: '0 18px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: brand.company_name === 'InventoryTools' ? 'flex-start' : 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, width: '100%', cursor: 'default' }}>
            <img src={brand.logo_url || '/logo-full.png'} alt={brand.display_name} style={{ maxWidth: '100%', height: 'auto', maxHeight: brand.company_name === 'InventoryTools' ? 26 : 44 }} />
          </div>
        </div>
        <nav style={{ padding: '12px 10px', flex: 1 }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => { if (item.id === 'contact') { window.location.href = 'mailto:admin@inventorytools.co.uk' } else if (item.id === 'convert') { if (toolTab === 'audio' ? audioEnabled : pdfEnabled) setShowConvert(true) } else { setPage(item.id) } }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, width: '100%', textAlign: 'left', border: 'none', background: page === item.id ? TEAL_LIGHT : 'transparent', color: page === item.id ? TEAL_DARK : MUTED, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 2 }}>
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
        <div className="it-glass-topbar" style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: isMobile ? '0 16px' : '0 32px', height: isMobile ? 56 : 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'relative', zIndex: 1 }}>
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
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: -0.4, margin: 0 }}>{(page === 'dashboard' || page === 'cleanpdf') ? ((() => { const h = new Date().getHours(); return (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening') + ' ' + (userName ? userName.split(' ')[0].charAt(0).toUpperCase() + userName.split(' ')[0].slice(1) : (userEmail.split('@')[0].charAt(0).toUpperCase() + userEmail.split('@')[0].slice(1))) + (isMobile ? '' : ' 👋') })()) : page.charAt(0).toUpperCase() + page.slice(1)}</h1>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: MUTED, margin: 0, letterSpacing: '0.03em' }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {userRole === 'admin' && <div style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: 7, background: TEAL_LIGHT, borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: TEAL_DARK }}>£{Number(credits).toLocaleString('en-GB', {minimumFractionDigits: 2, maximumFractionDigits: 2})} remaining</div>}
            {!isMobile && (
              <div className="it-toggle" onClick={() => setDarkMode(d => !d)}>
                <div className={`it-toggle-pill${!darkMode ? ' on' : ''}`}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/></svg>
                </div>
                <div className={`it-toggle-pill${darkMode ? ' on' : ''}`}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
                </div>
              </div>
            )}
            {page !== 'cleanpdf' && (
              <button onClick={() => { if (toolTab === 'audio') { if (audioEnabled) setShowAudioConvert(true) } else { if (pdfEnabled) setShowConvert(true) } }} style={{ padding: isMobile ? '6px 12px' : '9px 18px', borderRadius: 10, border: 'none', background: toolTab === 'audio' ? '#2563EB' : TEAL, color: '#fff', fontFamily: "'Space Grotesk', sans-serif", fontSize: isMobile ? 12 : 13, fontWeight: 700, cursor: 'pointer', minWidth: isMobile ? 120 : 140, whiteSpace: 'nowrap', boxShadow: `0 10px 22px -8px ${toolTab === 'audio' ? '#2563EB' : TEAL}` }}>+ {toolTab === 'audio' ? 'Convert Audio' : 'Convert PDF or Word'}</button>
            )}
          </div>
        </div>

        {/* TOOL TAB BAR */}
        <div className="it-glass-tabbar" style={{ padding: '14px 32px', display: 'flex', justifyContent: 'center', flexShrink: 0, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: 4, background: darkMode ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.4)', padding: 5, borderRadius: 14 }}>
          {[
            ...(pdfEnabled ? [{ id: 'pdf', label: 'PDF to Word', color: TEAL }] : []),
            ...(audioEnabled ? [{ id: 'audio', label: 'Audio to Word', color: '#2563EB' }] : []),
            { id: 'cleanpdf', label: 'Clean PDF', color: '#16A34A' },
          ].map(tab => {
            const isActive = tab.id === 'cleanpdf' ? page === 'cleanpdf' : (toolTab === tab.id && page !== 'cleanpdf')
            return (
              <button
                key={tab.id}
                onClick={() => { if (tab.id === 'cleanpdf') { setPage('cleanpdf') } else { setToolTab(tab.id as 'pdf' | 'audio'); if (page === 'cleanpdf') setPage('dashboard') } }}
                style={{
                  padding: '9px 20px',
                  border: 'none',
                  borderRadius: 10,
                  background: isActive ? (darkMode ? 'rgba(255,255,255,.15)' : '#fff') : 'transparent',
                  color: isActive ? tab.color : MUTED,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12.5,
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 4px 14px rgba(30,20,10,.12)' : 'none',
                }}
              >
                {tab.label}
              </button>
            )
          })}
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 16 : 28, paddingBottom: isMobile ? 100 : 28, position: 'relative', zIndex: 1 }}>
          {page === 'dashboard' && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: 20 }}>
              <div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}` }}>
                  <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, margin: 0 }}>Lifetime statistics <span style={{ fontSize: 12, fontWeight: 400, color: HINT, fontFamily: "'Inter', sans-serif" }}>— includes deleted reports</span></p>
                </div>
                <div style={{ padding: '16px 20px' }}>
              {(() => {
                const tabConvs = conversions.filter((c: any) => toolTab === 'audio' ? c.type === 'audio' : c.type !== 'audio')
                const tabTotal = tabConvs.length
                const tabSpend = tabConvs.reduce((s: number, c: any) => s + (c.cost ? Number(c.cost) : (c.type === 'audio' ? 9.60 : 4.00)), 0)
                const getTabMarketRate = (c: any): number => {
                  if (c.type !== 'audio') {
                    if (typistRateMode === 'per_page' && c.page_count) return (typistPageRate || 0.50) * c.page_count
                    return typistReportRate || 12.00
                  }
                  const isFurn = c.furnished === 'furnished' || c.furnished === 'part_furnished'
                  const fallback: Record<string,number> = {'room_only':10,'studio':15,'1bed':15,'2bed':20,'3bed':25,'4bed':35,'5bed':45,'6bed':50,'7bed':55,'8bed':60,'9bed':65,'10bed':70,'11bed':75,'12bed':80}
                  const configured = audioTypistRates ? (isFurn ? audioTypistRates.furnished : audioTypistRates.unfurnished) : null
                  const table = (configured && Object.keys(configured).length > 0) ? configured : fallback
                  return c.property_size ? (table[c.property_size] || 12.00) : 12.00
                }
                const tabMarket = tabConvs.reduce((s: number, c: any) => s + getTabMarketRate(c), 0)
                const tabSaving = Math.max(0, tabMarket - tabSpend)
                const tabDur = tabConvs.reduce((s: number, r: any) => s + (r.duration_seconds || 0), 0)
                const tabAvg = tabTotal > 0 ? Math.round(tabDur / tabTotal) : 0
                const tabAudio = tabConvs.reduce((s: number, r: any) => s + (r.audio_length_seconds || 0), 0)
                const fmtT = (s: number) => s >= 60 ? Math.floor(s/60)+'m '+(s%60)+'s' : s+'s'
                return (<>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : `repeat(${userRole === 'admin' ? (toolTab === 'audio' ? 6 : 5) : (toolTab === 'audio' ? 4 : 3)},minmax(0,1fr))`, gap: 16, marginBottom: 0 }}>
                {(userRole === 'admin' ? [['Total reports', tabTotal.toString(), 'all time'],['Total spent', '£'+tabSpend.toFixed(2), toolTab === 'audio' ? 'varies by property size' : '@ £4.00 per report'],['Avg. time', tabTotal > 0 ? fmtT(tabAvg) : '—', 'per conversion'],['Total time', fmtT(tabDur), 'all conversions'], ...(toolTab === 'audio' ? [['Total audio', fmtT(tabAudio), 'audio recorded']] : []), ['Est. saving', '£'+tabSaving.toFixed(2), 'vs. manual typing']] : [['Total reports', tabTotal.toString(), 'all time'],['Avg. time', tabTotal > 0 ? fmtT(tabAvg) : '—', 'per conversion'],['Total time', fmtT(tabDur), 'all conversions'], ...(toolTab === 'audio' ? [['Total audio', fmtT(tabAudio), 'audio recorded']] : [])]).map(([label,val,sub]) => (
                  <div key={label} className="it-card" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: RADIUS, padding: '20px 22px' }}>
                    <p className="it-label" style={{ marginBottom: 10 }}>{label}</p>
                    <p className="it-num" style={{ fontSize: 30, fontWeight: 700, color: TEXT, marginBottom: 4 }}>{val}</p>
                    <p style={{ fontSize: 12, color: HINT }}>{sub}</p>
                  </div>
                ))}
              </div>
              <div className="it-card" style={{ borderRadius: RADIUS, padding: '24px 28px', marginTop: 16, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: 24, alignItems: 'center' }}>
                <div>
                  <p className="it-eyebrow" style={{ marginBottom: 6 }}>The whole point</p>
                  <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 19, fontWeight: 700, margin: '0 0 8px' }}>Scattered notes in. One clean report out.</h2>
                  <p style={{ fontSize: 13, color: MUTED, margin: 0, maxWidth: 420, lineHeight: 1.5 }}>
                    {tabTotal > 0
                      ? `${tabTotal} ${toolTab === 'audio' ? 'dictated recording' : 'report'}${tabTotal === 1 ? '' : 's'} became finished Word document${tabTotal === 1 ? '' : 's'}${userRole === 'admin' && tabSaving > 0 ? `, saving an estimated £${tabSaving.toFixed(2)} versus typing ${tabTotal === 1 ? 'it' : 'them'} by hand` : ''}.`
                      : `Convert your first ${toolTab === 'audio' ? 'dictated recording' : 'PDF or Word report'} to see this add up.`}
                  </p>
                </div>
                {!isMobile && (
                  <div className="it-stack">
                    <div className="it-sheet"><div className="it-sheet-line" style={{ width: '60%' }} /><div className="it-sheet-line" style={{ width: '80%' }} /><div className="it-sheet-line" style={{ width: '45%' }} /></div>
                    <div className="it-sheet"><div className="it-sheet-line" style={{ width: '60%' }} /><div className="it-sheet-line" style={{ width: '80%' }} /><div className="it-sheet-line" style={{ width: '45%' }} /></div>
                    <div className="it-sheet it-sheet-accent">
                      <div className="it-sheet-line" style={{ width: '60%' }} /><div className="it-sheet-line" style={{ width: '80%' }} /><div className="it-sheet-line" style={{ width: '45%' }} />
                      <svg className="it-tick" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  </div>
                )}
              </div>
                </>)})()}
                </div>
              </div>
                <div className="it-card" style={{ background: SURFACE, border: `1px solid ${BORDER}`, overflow: 'hidden', display: 'block' }}>
                  <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className="it-eyebrow">Recent conversions</h2>
                    <button onClick={() => setPage('reports')} style={{ fontSize: 12, color: TEAL, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>View all →</button>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600, display: isMobile ? 'none' : 'table' }}>
                    <thead><tr style={{ background: BG }}>
                      {(toolTab === 'audio' ? ['Property','Property Size','Furn/Unfurn','Audio Length','Conv. Time','Cost','By','Rating','Status',''] : ['Property','Rooms','Conv. Time','Cost','By','Rating','Status','']).filter(h => userRole === 'admin' || h !== 'Cost').map(h => <th key={h} className="it-label" style={{ padding: '10px 20px', textAlign: 'left', borderBottom: `1px solid ${BORDER}` }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {conversions.filter(c => toolTab === 'audio' ? c.type === 'audio' : c.type !== 'audio').slice(0, 14).map(c => (
                        <tr key={c.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                          <td style={{ padding: '12px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 500, color: TEXT, margin: 0 }}>{shortAddr(fmtAddr(c.address))}</p>
                                <p style={{ fontSize: 11, color: HINT, margin: 0 }}>{new Date(c.created_at).toLocaleDateString("en-GB", {day:"numeric",month:"short",year:"numeric"}) + ' · ' + new Date(c.created_at).toLocaleTimeString("en-GB", {hour:"2-digit",minute:"2-digit"})}</p>
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
                          <td style={{ padding: '12px 20px' }}><span style={{ background: TEAL_LIGHT, color: TEAL_DARK, fontSize: 11, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.05em', padding: '3px 9px', borderRadius: 20 }}>Complete</span></td>
                          <td style={{ padding: '12px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {c.type === 'audio' && c.audio_paths && (
                              <button onClick={() => setShowReviewModal(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title="Review & Amend">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                            )}
                            {c.file_path ? (
                              <button onClick={async () => {
                                const { data } = await supabase.storage.from('documents').createSignedUrl(c.file_path, 60)
                                if (data?.signedUrl) { const response = await fetch(data.signedUrl); const fileBlob = await response.blob(); const blobUrl = URL.createObjectURL(fileBlob); const a = document.createElement('a'); a.href = blobUrl; a.download = formatDocxName(c.address || '') + '.docx'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl) }
                              }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title="Download">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9,15 12,18 15,15"/></svg>
                              </button>
                            ) : (
                              <button title="Regenerate Word doc" onClick={async () => {
  if (!c.converted_json) return;
  try {
    if (!(window as any).docx) {
      await new Promise<void>((resolve, reject) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/docx@9.0.0/build/index.umd.js'; s.onload = () => resolve(); s.onerror = reject; document.head.appendChild(s) })
    }
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, VerticalAlign } = (window as any).docx
    const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' }
    const cellBorders = { top: border, bottom: border, left: border, right: border }
    const COL_ITEM = 2499, COL_DESC = 3972, COL_COND = 3115
    const makeCell = (text: string, colWidth: number) => new TableCell({ borders: cellBorders, width: { size: colWidth, type: WidthType.DXA }, verticalAlign: VerticalAlign.TOP, children: (text || '').split(/\n| \| /).map(function(line: string){return new Paragraph({children:[new TextRun({text:line.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,'').replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/[\u2013\u2014]/g,'-').replace(/[^\x09\x0A\x0D\x20-\xFF]/g,''),font:'Arial',size:20,color:'000000'})]})}) })
    const rooms = (c.converted_json as any).rooms || []
    const children: any[] = []
    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i]
      if (i > 0) children.push(new Paragraph({ children: [new TextRun({ text: '', font: 'Arial', size: 20 })], spacing: { after: 120 } }))
      children.push(new Paragraph({ children: [new TextRun({ text: room.roomName, font: 'Arial', size: 28, bold: true })] }))
      children.push(new Table({ width: { size: COL_ITEM + COL_DESC + COL_COND, type: WidthType.DXA }, rows: [new TableRow({ children: [makeCell('ITEM', COL_ITEM), makeCell('DESCRIPTION', COL_DESC), makeCell('CONDITION', COL_COND)] }), ...room.rows.map((row: any) => new TableRow({ children: [makeCell(row.item, COL_ITEM), makeCell(row.description, COL_DESC), makeCell(row.condition, COL_COND)] }))] }))
    }
    const doc = new Document({ sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children }] })
    const b64 = await Packer.toBase64String(doc)
    const byteArray = Uint8Array.from(atob(b64), (ch: string) => ch.charCodeAt(0))
    const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const ts = Date.now()
      const addrClean = (c.address || '').replace(/[^a-zA-Z0-9 _-]/g, '').trim()
      const fn = session.user.id + '/' + ts + '_' + addrClean + '.docx'
      const { data: up } = await supabase.storage.from('documents').upload(fn, blob, { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      if (up?.path) {
        await supabase.from('conversions').update({ file_path: up.path }).eq('id', c.id)
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = blobUrl; a.download = formatDocxName(c.address || '') + '.docx'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl)
        setConversions((prev: any[]) => prev.map((x: any) => x.id === c.id ? { ...x, file_path: up.path } : x))
      }
    }
  } catch(e) { console.error('Regen failed', e) }
}} style={{ background: 'none', border: 'none', cursor: c.converted_json ? 'pointer' : 'default', padding: 4, opacity: c.converted_json ? 1 : 0.3 }}>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9,15 12,18 15,15"/></svg></button>
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
              </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="it-card" style={{ background: SURFACE, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}` }}><h3 className="it-eyebrow">Credits</h3></div>
                    <div style={{ padding: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}><span className="it-num" style={{ fontWeight: 600, fontSize: 18 }}>£{typeof credits === 'number' ? Number(credits).toLocaleString('en-GB', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : credits}</span><span style={{ fontSize: 12, color: MUTED, marginLeft: 4 }}>remaining</span></div>
                      {toolTab !== 'audio' && <p style={{ fontSize: 12, color: MUTED, marginBottom: 14 }}>Approx. <strong style={{ color: TEXT }}>{Math.floor(Number(credits) / 5)}</strong> conversions (accuracy report included with each)</p>}
                      <p style={{ fontSize: 12, color: HINT, marginBottom: 14 }}>{toolTab === 'audio' ? 'Pricing varies by property size · Balance never expires.' : '£4.00 per conversion · Accuracy report included · Balance never expires.'}</p>
                      <button onClick={() => setShowTopup(true)} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: toolTab === 'audio' ? '#2563EB' : TEAL, color: '#fff', fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: `0 10px 22px -8px ${toolTab === 'audio' ? '#2563EB' : TEAL}` }}>Top up balance</button>
                    </div>
                  </div>
                  <div className="it-card" style={{ background: SURFACE, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}` }}><h3 className="it-eyebrow">This month</h3></div>
                    <div style={{ padding: 18 }}>
                      {[['Reports converted',conversions.filter((c:any)=>toolTab==='audio'?c.type==='audio':c.type!=='audio').length.toString()],['Total spent','£'+conversions.filter((c:any)=>toolTab==='audio'?c.type==='audio':c.type!=='audio').reduce((s:number,c:any)=>s+(c.cost?Number(c.cost):4),0).toFixed(2)],['Conversion cost per report', toolTab === 'audio' ? 'Varies by size' : '£4.00'],['Est. saving vs. typist','£'+conversions.filter((c:any)=>toolTab==='audio'?c.type==='audio':c.type!=='audio').reduce((s:number,c:any)=>{const isFurn=c.furnished==='furnished'||c.furnished==='part_furnished';const fallback:Record<string,number>={'room_only':10,'studio':15,'1bed':15,'2bed':20,'3bed':25,'4bed':35,'5bed':45,'6bed':50,'7bed':55,'8bed':60,'9bed':65,'10bed':70,'11bed':75,'12bed':80};const configured=audioTypistRates?(isFurn?audioTypistRates.furnished:audioTypistRates.unfurnished):null;const table=(configured&&Object.keys(configured).length>0)?configured:fallback;const market=c.type==='audio'?(c.property_size?(table[c.property_size]||12):12):(typistRateMode==='per_page'&&c.page_count?(typistPageRate||0.50)*c.page_count:(typistReportRate||12.00));return s+Math.max(0,market-(c.cost?Number(c.cost):4))},0).toFixed(2)]].map(([l,v],i) => (
                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? `1px solid ${BORDER}` : 'none', fontSize: 13 }}>
                          <span className="it-label" style={{ color: MUTED }}>{l}</span><span className="it-num" style={{ fontWeight: 600, fontSize: 13, color: l.includes('saving') ? TEAL : TEXT }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="it-card" style={{ background: SURFACE, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}` }}><h3 className="it-eyebrow">Activity</h3></div>
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
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><polyline points="21,3 21,8 16,8"/></svg>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>Clean &amp; Unlock PDF</h2>
                <p style={{ fontSize: 14, color: MUTED, margin: '0 0 12px', lineHeight: 1.6 }}>Some PDFs have a security/encryption wrapper applied — even with no password, this can stop our AI from reading the file properly during conversion, causing rooms or rows to be missed.</p>
                <p style={{ fontSize: 14, color: MUTED, margin: '0 0 12px', lineHeight: 1.6 }}>This tool removes that restriction and gives you back a clean copy you can convert normally.</p>
                <p style={{ fontSize: 14, color: MUTED, margin: 0, lineHeight: 1.6 }}>If a conversion fails or comes back incomplete, try cleaning the file here first.</p>
              </div>

              {cleanPdfState === 'idle' && (
                <div>
                  <label htmlFor="clean-pdf-upload" style={{ display: 'block', cursor: 'pointer' }}>
                    <div style={{ border: `2px dashed ${BORDER}`, borderRadius: 16, padding: '40px 24px', textAlign: 'center', background: SURFACE }}>
                      <div style={{ width: 52, height: 52, borderRadius: 12, background: '#E8EAF0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
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
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#16A34A" }}>Free</span>
                  </div>

                  {cleanPdfError && <p style={{ fontSize: 13, color: '#DC2626', marginTop: 12 }}>{cleanPdfError}</p>}

                  <button
                    disabled={!cleanPdfFile}
                    onClick={async () => {
                      if (!cleanPdfFile) return
                      setCleanPdfState('processing')
                      setCleanPdfError('')
                      try {
                        const { data: { session } } = await supabase.auth.getSession()
                        if (!session) throw new Error('Not signed in')

                        // Upload to Supabase Storage first to avoid Vercel 4.5MB body limit
                        // Path must start with user_id to match existing RLS policy (foldername[1] = auth.uid())
                        const storagePath = `${session.user.id}/clean-pdf-tmp/${Date.now()}-${cleanPdfFile.name}`
                        const { error: uploadError } = await supabase.storage
                          .from('documents')
                          .upload(storagePath, cleanPdfFile, { contentType: 'application/pdf', upsert: true })
                        if (uploadError) throw new Error('Upload failed: ' + uploadError.message)

                        const res = await fetch('/api/clean-pdf', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                          body: JSON.stringify({ user_id: session.user.id, storage_path: storagePath })
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
                    style={{ width: '100%', marginTop: 20, padding: 14, borderRadius: 12, border: 'none', background: !cleanPdfFile ? BORDER : TEAL, color: !cleanPdfFile ? MUTED : '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: !cleanPdfFile ? 'default' : 'pointer' }}
                  >
                    Clean PDF — Free
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
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: SHADOW, overflow: 'hidden' }}>
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
                          <p style={{ fontSize: 11, color: HINT, margin: 0 }}>{new Date(conv.created_at).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'})} · {new Date(conv.created_at).toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'})} · {conv.rooms} rooms · {conv.converted_by ? conv.converted_by.split(' ').map((n: string, i: number) => i === 0 ? n : n[0]).join(' ') : ''}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          {conv.type === 'audio' && conv.audio_paths && (
                            <button onClick={() => setShowReviewModal(conv)} style={{ width: 36, height: 36, borderRadius: 8, background: BG, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                          )}
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
                    <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600 }}>£{c.cost ? Number(c.cost).toFixed(2) : '4.00'}</td>
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
                    <td style={{ padding: '12px 20px', fontSize: 12, color: MUTED }}>{new Date(c.created_at).toLocaleDateString("en-GB", {day:"numeric",month:"short",year:"numeric"}) + ' ' + new Date(c.created_at).toLocaleTimeString("en-GB", {hour:"2-digit",minute:"2-digit"})}</td>
                    <td style={{ padding: '12px 20px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{c.type === 'audio' && c.audio_paths && (<button onClick={() => setShowReviewModal(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title='Review & Amend'><svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke={TEAL} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7'/><path d='M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z'/></svg></button>)}{c.file_path ? (<button onClick={async () => { const { data } = await supabase.storage.from('documents').createSignedUrl(c.file_path, 60); if (data?.signedUrl) { const response = await fetch(data.signedUrl); const fileBlob = await response.blob(); const blobUrl = URL.createObjectURL(fileBlob); const a = document.createElement('a'); a.href = blobUrl; a.download = formatDocxName(c.address||'')+'.docx'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl) } }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title='Download'><svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke={TEAL} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z'/><polyline points='14,2 14,8 20,8'/><line x1='12' y1='18' x2='12' y2='12'/><polyline points='9,15 12,18 15,15'/></svg></button>) : <span style={{ fontSize: 11, color: HINT, padding: 4 }}>—</span>}{c.type !== 'audio' && <button title={c.accuracy_report ? 'View accuracy report' : (c.extracted_text || c.converted_json ? 'Generate accuracy report' : 'No source data')} onClick={() => c.accuracy_report ? setViewingReport(c) : c.extracted_text || c.converted_json ? setShowAccuracyConfirm(c) : null} style={{ background: 'none', border: 'none', cursor: c.extracted_text || c.converted_json || c.accuracy_report ? 'pointer' : 'default', padding: 4, opacity: c.extracted_text || c.accuracy_report ? 1 : 0.3 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.accuracy_report ? TEAL : MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="12" x2="8" y2="17"/><line x1="12" y1="8" x2="12" y2="17"/><line x1="16" y1="15" x2="16" y2="17"/></svg></button>}
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
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div style={{ background: TEAL, borderRadius: 18, boxShadow: SHADOW, padding: 24, color: '#fff' }}>
                  <p style={{ fontSize: 12, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Current balance</p>
                  <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 42, fontWeight: 700, letterSpacing: -1, lineHeight: 1, marginBottom: 6 }}>£{Number(credits).toLocaleString('en-GB', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 20 }}>balance remaining</p>
                  <button onClick={() => setShowTopup(true)} style={{ padding: '10px 20px', borderRadius: 9, border: 'none', background: '#fff', color: TEAL, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Top up balance</button>
                </div>
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: SHADOW, padding: 24 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 }}>PDF to Word</p>
                  {(() => {
                    const filtered = conversions.filter((c:any) => c.type !== 'audio')
                    const stats: [string, string][] = [
                      ['Reports converted', filtered.length.toString()],
                      ['Total spent', '£'+filtered.reduce((s:number,c:any)=>s+(c.cost?Number(c.cost):4.00),0).toFixed(2)],
                      ['Avg. conv. time', filtered.length>0?(()=>{const avg=Math.round(filtered.reduce((s:number,r:any)=>s+(r.duration_seconds||0),0)/filtered.length);return avg>=60?Math.floor(avg/60)+'m '+(avg%60)+'s':avg+'s'})():'—'],
                      ['Est. saving vs. typist', '£'+filtered.reduce((s:number,c:any)=>{const isFurn=c.furnished==='furnished'||c.furnished==='part_furnished';const fallback:Record<string,number>={'room_only':10,'studio':15,'1bed':15,'2bed':20,'3bed':25,'4bed':35,'5bed':45,'6bed':50,'7bed':55,'8bed':60,'9bed':65,'10bed':70,'11bed':75,'12bed':80};const configured=audioTypistRates?(isFurn?audioTypistRates.furnished:audioTypistRates.unfurnished):null;const table=(configured&&Object.keys(configured).length>0)?configured:fallback;const market=c.type==='audio'?(c.property_size?(table[c.property_size]||12):12):(typistRateMode==='per_page'&&c.page_count?(typistPageRate||0.50)*c.page_count:(typistReportRate||12.00));return s+Math.max(0,market-(c.cost?Number(c.cost):4.00))},0).toFixed(2)],
                    ]
                    return stats.map(([l,v],i) => (
                      <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? `1px solid ${BORDER}` : 'none', fontSize: 13 }}>
                        <span style={{ color: MUTED }}>{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
                      </div>
                    ))
                  })()}
                </div>
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: SHADOW, padding: 24 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 }}>Audio to Word</p>
                  {(() => {
                    const filtered = conversions.filter((c:any) => c.type === 'audio')
                    const stats: [string, string][] = [
                      ['Reports converted', filtered.length.toString()],
                      ['Total spent', '£'+filtered.reduce((s:number,c:any)=>s+(c.cost?Number(c.cost):4.88),0).toFixed(2)],
                      ['Avg. conv. time', filtered.length>0?(()=>{const avg=Math.round(filtered.reduce((s:number,r:any)=>s+(r.duration_seconds||0),0)/filtered.length);return avg>=60?Math.floor(avg/60)+'m '+(avg%60)+'s':avg+'s'})():'—'],
                      ['Est. saving vs. typist', '£'+filtered.reduce((s:number,c:any)=>{const isFurn=c.furnished==='furnished'||c.furnished==='part_furnished';const fallback:Record<string,number>={'room_only':10,'studio':15,'1bed':15,'2bed':20,'3bed':25,'4bed':35,'5bed':45,'6bed':50,'7bed':55,'8bed':60,'9bed':65,'10bed':70,'11bed':75,'12bed':80};const configured=audioTypistRates?(isFurn?audioTypistRates.furnished:audioTypistRates.unfurnished):null;const table=(configured&&Object.keys(configured).length>0)?configured:fallback;const market=c.type==='audio'?(c.property_size?(table[c.property_size]||12):12):(typistRateMode==='per_page'&&c.page_count?(typistPageRate||0.50)*c.page_count:(typistReportRate||12.00));return s+Math.max(0,market-(c.cost?Number(c.cost):4.88))},0).toFixed(2)],
                    ]
                    return stats.map(([l,v],i) => (
                      <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? `1px solid ${BORDER}` : 'none', fontSize: 13 }}>
                        <span style={{ color: MUTED }}>{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
                      </div>
                    ))
                  })()}
                </div>
              </div>

              {userRole === 'admin' && (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, alignItems: 'start' }}>
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: SHADOW, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}` }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>Top Up History</h3>
                    <p style={{ fontSize: 12, color: MUTED, margin: '0 0 12px' }}>A record of all balance top-up payments made to your account.</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                      {(['all','today','week','month','custom'] as const).map(pd => (
                        <button key={pd} onClick={() => setTopupHistoryPeriod(pd)} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${topupHistoryPeriod === pd ? TEAL : BORDER}`, background: topupHistoryPeriod === pd ? TEAL : 'transparent', color: topupHistoryPeriod === pd ? '#fff' : TEXT, fontFamily: 'inherit', fontSize: 12, fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize' as const }}>
                          {pd === 'all' ? 'All time' : pd === 'today' ? 'Today' : pd === 'week' ? 'This week' : pd === 'month' ? 'This month' : 'Custom range'}
                        </button>
                      ))}
                    </div>
                    {topupHistoryPeriod === 'custom' && (
                      <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' as const }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, color: MUTED, marginBottom: 5 }}>From</label>
                          <input type="date" value={topupHistoryFrom} onChange={e => setTopupHistoryFrom(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: 'inherit', fontSize: 13 }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, color: MUTED, marginBottom: 5 }}>To</label>
                          <input type="date" value={topupHistoryTo} onChange={e => setTopupHistoryTo(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: 'inherit', fontSize: 13 }} />
                        </div>
                      </div>
                    )}
                  </div>
                  {(() => {
                    const range = getTopupHistoryDateRange()
                    const filteredTxns = range ? transactions.filter(t => { const d = new Date(t.created_at); return d >= range.from && d < range.to }) : transactions
                    if (filteredTxns.length === 0) {
                      return <div style={{ padding: 40, textAlign: 'center', color: MUTED, fontSize: 13 }}>No top-ups in this period.</div>
                    }
                    return (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr style={{ background: BG }}>
                        {['Date','Invoice #','Description','Amount',''].map(h => <th key={h} style={{ fontSize: 11, fontWeight: 600, color: HINT, textTransform: 'uppercase' as const, letterSpacing: 0.8, padding: '10px 20px', textAlign: 'left', borderBottom: `1px solid ${BORDER}` }}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {filteredTxns.map(t => (
                          <tr key={t.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                            <td style={{ padding: '12px 20px', fontSize: 13 }}>{new Date(t.created_at).toLocaleDateString('en-GB')}</td>
                            <td style={{ padding: '12px 20px', fontSize: 13, fontFamily: 'monospace' }}>{t.invoice_number || '—'}</td>
                            <td style={{ padding: '12px 20px', fontSize: 13, color: MUTED }}>{t.description || 'Balance top-up'}</td>
                            <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600 }}>£{Number(t.amount).toFixed(2)}</td>
                            <td style={{ padding: '12px 20px' }}><button onClick={() => downloadTransactionInvoicePDF(t)} style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>↓ Download</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    )
                  })()}
                </div>

                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: SHADOW, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}` }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>Usage invoices</h3>
                    <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>Download a report of completed conversions and their cost for your own accounting records.</p>
                  </div>
                  <div style={{ padding: 20 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' as const }}>
                      {(['all','today','week','month','custom'] as const).map(p => (
                        <button key={p} onClick={() => setUsageInvoicePeriod(p)} style={{ padding: '7px 16px', borderRadius: 8, border: `1px solid ${usageInvoicePeriod === p ? TEAL : BORDER}`, background: usageInvoicePeriod === p ? TEAL : 'transparent', color: usageInvoicePeriod === p ? '#fff' : TEXT, fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize' as const }}>
                          {p === 'all' ? 'All time' : p === 'today' ? 'Today' : p === 'week' ? 'This week' : p === 'month' ? 'This month' : 'Custom range'}
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
                </div>
              )}
            </div>
          )}

           {page === 'settings' && (
            <SettingsPage supabase={supabase} userEmail={userEmail} TEXT={TEXT} MUTED={MUTED} TEAL={TEAL} BORDER={BORDER} SURFACE={SURFACE} BG={BG} HINT={HINT} isMobile={isMobile}
              onTypistRatesSaved={(report: number, page: number, mode: string) => { setTypistReportRateD(report); setTypistPageRateD(page); setTypistRateModeD(mode) }}
              onAudioTypistRatesSaved={(rates: any) => setAudioTypistRates(rates)} />
          )}

          {page === 'stats' && (
            <StatsPage conversions={conversions} userStats={userStats} toolTab={toolTab} TEAL={toolTab === 'audio' ? '#2563EB' : TEAL} TEAL_LIGHT={toolTab === 'audio' ? '#DBEAFE' : TEAL_LIGHT} TEAL_DARK={toolTab === 'audio' ? '#1D4ED8' : TEAL_DARK} BORDER={BORDER} SURFACE={SURFACE} BG={BG} HINT={HINT} MUTED={MUTED} TEXT={TEXT} typistRateMode={typistRateMode} typistReportRate={typistReportRate} typistPageRate={typistPageRate} isMobile={isMobile} audioTypistRates={audioTypistRates} />
          )}

          {page === 'legal' && (
            <LegalPage TEAL={TEAL} TEAL_LIGHT={TEAL_LIGHT} BORDER={BORDER} SURFACE={SURFACE} BG={BG} HINT={HINT} MUTED={MUTED} TEXT={TEXT} brand={brand} />
          )}

          {page === 'help' && (
            <HelpPage TEAL={TEAL} TEAL_LIGHT={TEAL_LIGHT} BORDER={BORDER} SURFACE={SURFACE} BG={BG} HINT={HINT} MUTED={MUTED} TEXT={TEXT} />
          )}

          {page === 'team' && (
            <TeamPage supabase={supabase} TEAL={TEAL} TEAL_LIGHT={TEAL_LIGHT} TEAL_DARK={TEAL_DARK} BORDER={BORDER} SURFACE={SURFACE} BG={BG} HINT={HINT} MUTED={MUTED} TEXT={TEXT} />
          )}
        </div>
      </main>

      
      {isMobile && (
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: SURFACE, borderTop: `1px solid ${BORDER}`, display: 'flex', zIndex: 100, overflowX: 'auto' }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => { if (item.id === 'contact') { window.location.href = 'mailto:admin@inventorytools.co.uk' } else { setPage(item.id) } }} style={{ flex: 1, padding: '10px 4px 8px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={page === item.id ? TEAL : HINT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, color: page === item.id ? TEAL : HINT, fontWeight: page === item.id ? 600 : 400 }}>{item.label}</span>
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
                <img src={brand.logo_url || '/logo-full.png'} alt={brand.display_name} style={{ height: 40, width: 'auto', maxWidth: '100%' }} />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px', color: TEXT }}>Welcome to {brand.display_name}</h2>
              <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>Before you get started, here's a quick overview</p>
            </div>
            <div style={{ background: BG, borderRadius: 18, boxShadow: SHADOW, padding: 20, marginBottom: 20 }}>
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
      {showReviewModal && (
        <ReviewAmendModal
          conversionId={showReviewModal.id}
          userId={showReviewModal.user_id}
          getAuthToken={async () => {
            const { data: { session } } = await supabase.auth.getSession()
            return session?.access_token || ''
          }}
          onClose={() => setShowReviewModal(null)}
          accentColor={TEAL}
        />
      )}

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
                  return <div key={i} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 1, margin: '1px 0', background: '#e8e8e8' }}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(60,60,65,0.22)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'rgba(255,255,255,.96)', backdropFilter: 'blur(30px) saturate(160%)', WebkitBackdropFilter: 'blur(30px) saturate(160%)', borderRadius: 22, border: '1px solid rgba(255,255,255,.85)', width: '100%', maxWidth: 480, overflow: 'hidden', boxShadow: '0 30px 70px rgba(30,20,10,.2)' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{selectedFile?.name.toLowerCase().endsWith('.docx') ? '📝 Convert Word to Word' : '📄 Convert PDF to Word'}</p><p style={{ fontSize: 12, color: HINT, margin: 0 }}>£4.00 · £{typeof credits === 'number' ? Number(credits).toLocaleString('en-GB', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : credits} remaining</p></div>
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
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0, wordBreak: 'break-all', overflowWrap: 'anywhere' }}>{selectedFile.name}</p>
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
                        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 14px', marginBottom: 2 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#15803D', margin: '0 0 10px' }}>📝 Word to Word conversion</p>
                          <svg width="100%" height="54" viewBox="0 0 320 54" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: 10, display: 'block' }}>
                            {/* Input Word doc - mixed layout */}
                            <rect x="0" y="2" width="130" height="50" rx="4" fill="#fff" stroke="#BBF7D0" strokeWidth="1.5"/>
                            {[0,1,2,3].map((i: number) => (
                              <g key={i}>
                                <rect x="6" y={7+i*11} width={i===0?30:i===1?55:i===2?40:50} height="7" rx="1.5" fill={i===0?"#374151":"#D1FAE5"}/>
                                <rect x={i===0?40:i===1?65:i===2?50:60} y={7+i*11} width={i===0?60:i===1?40:i===2?60:45} height="7" rx="1.5" fill="#D1FAE5" opacity="0.7"/>
                                {i>0 && <rect x="110" y={7+i*11} width="16" height="7" rx="1.5" fill="#D1FAE5" opacity="0.5"/>}
                              </g>
                            ))}
                            {/* Arrow */}
                            <text x="148" y="31" fontSize="18" fill="#15803D" textAnchor="middle">→</text>
                            {/* Output 3-column table */}
                            <rect x="166" y="2" width="154" height="50" rx="4" fill="#fff" stroke="#BBF7D0" strokeWidth="1.5"/>
                            {[0,1,2,3].map((i: number) => (
                              <g key={i}>
                                <rect x="170" y={7+i*11} width="38" height="7" rx="1.5" fill={i===0?"#15803D":"#D1FAE5"} opacity={i===0?0.9:1}/>
                                <rect x="212" y={7+i*11} width="58" height="7" rx="1.5" fill={i===0?"#15803D":"#D1FAE5"} opacity={i===0?0.9:0.7}/>
                                <rect x="274" y={7+i*11} width="42" height="7" rx="1.5" fill={i===0?"#15803D":"#D1FAE5"} opacity={i===0?0.9:0.5}/>
                              </g>
                            ))}
                          </svg>
                          <p style={{ fontSize: 12, color: '#166534', margin: 0, lineHeight: 1.6 }}>Reads your Word.doc report structure directly.<br/><br/>Ideal for converting another company's inventory into the standard Item, Description, Condition format. Fast, accurate, and works best with low MB sized Word.doc files.<br/><br/>The smaller the file the better. Images take up a lot of file space. Consider compressing your Word doc if the file is large.</p>
                        </div>
                        <button onClick={() => setShowWordWarning(true)} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: '#16A34A', color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Convert Now — £4.00</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startConvert('text')} style={{ display: 'none' }}>Convert (Text) — £4.00</button>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          {[
                            {
                              value: false,
                              label: 'Standard',
                              desc: 'Classic 3-column inventory (Item / Description / Condition)',
                              svg: (
                                <svg width="100%" height="52" viewBox="0 0 160 52" xmlns="http://www.w3.org/2000/svg">
                                  <rect x="2" y="2" width="156" height="48" rx="3" fill="none" stroke="#E3E7E9" strokeWidth="1"/>
                                  {[0,1,2,3].map((i: number) => (
                                    <g key={i}>
                                      <rect x="4" y={4+i*11} width="38" height="8" rx="1" fill={i===0?"#11151A":"#E3E7E9"} opacity={i===0?0.8:1}/>
                                      <rect x="46" y={4+i*11} width="62" height="8" rx="1" fill={i===0?"#11151A":"#E3E7E9"} opacity={i===0?0.8:1}/>
                                      <rect x="112" y={4+i*11} width="44" height="8" rx="1" fill={i===0?"#11151A":"#E3E7E9"} opacity={i===0?0.8:1}/>
                                    </g>
                                  ))}
                                </svg>
                              )
                            },
                            {
                              value: true,
                              label: 'Complex layout',
                              desc: 'Multi-column with mixed items, conditions and sub-rows',
                              svg: (
                                <svg width="100%" height="52" viewBox="0 0 160 52" xmlns="http://www.w3.org/2000/svg">
                                  <rect x="2" y="2" width="156" height="48" rx="3" fill="none" stroke="#E3E7E9" strokeWidth="1"/>
                                  {[0,1,2,3].map((i: number) => (
                                    <g key={i}>
                                      <rect x="4" y={4+i*11} width="22" height="8" rx="1" fill={i===0?"#11151A":"#E3E7E9"} opacity={i===0?0.8:1}/>
                                      <rect x="30" y={4+i*11} width="30" height="8" rx="1" fill={i===0?"#11151A":"#E3E7E9"} opacity={i===0?0.8:1}/>
                                      <rect x="64" y={4+i*11} width="30" height="8" rx="1" fill={i===0?"#11151A":"#E3E7E9"} opacity={i===0?0.8:1}/>
                                      <rect x="98" y={4+i*11} width="24" height="8" rx="1" fill={i===0?"#11151A":"#E3E7E9"} opacity={i===0?0.8:1}/>
                                      <rect x="126" y={4+i*11} width="30" height="8" rx="1" fill={i===0?"#11151A":"#E3E7E9"} opacity={i===0?0.8:1}/>
                                    </g>
                                  ))}
                                </svg>
                              )
                            }
                          ].map(({ value, label, desc, svg }: any) => (
                            <div
                              key={String(value)}
                              onClick={() => setLeadersStyle(value)}
                              style={{ border: `2px solid ${leadersStyle === value ? TEAL : BORDER}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer', background: leadersStyle === value ? TEAL_LIGHT : '#fff', transition: 'all 0.15s' }}
                            >
                              <div style={{ marginBottom: 6 }}>{svg}</div>
                              <p style={{ fontSize: 12, fontWeight: 700, color: leadersStyle === value ? TEAL_DARK : TEXT, margin: '0 0 3px' }}>{label}</p>
                              <p style={{ fontSize: 11, color: MUTED, margin: 0, lineHeight: 1.4 }}>{desc}</p>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => startConvert('vision')} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Convert Now — £4.00</button>
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
                    {restoredJobComplete
                      ? <div style={{ width: 18, height: 18, borderRadius: '50%', background: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2.5"><polyline points="2,5 4,7 8,3"/></svg></div>
                      : <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2.5px solid rgba(253,106,2,0.25)`, borderTopColor: TEAL, animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                    }
                    <p style={{ fontSize: 14, fontWeight: 600, color: TEAL_DARK, margin: 0 }}>{restoredJobComplete ? 'Complete!' : 'Processing...'}</p>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#d45500' }}>⏱ {elapsed >= 60 ? Math.floor(elapsed/60) + 'm ' + (elapsed%60) + 's' : elapsed + 's'}</span>
                  </div>
                  <p style={{ fontSize: 11, color: '#d45500', margin: '0 0 12px', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>{selectedFile?.name}</p>
                  {restoredJobComplete ? (
                    <p style={{ fontSize: 11, fontWeight: 700, color: TEAL, margin: 0, letterSpacing: 0.3 }}>CONVERSION COMPLETE — CHECK RECENT CONVERSIONS OR CLOSE THIS WHEN READY.</p>
                  ) : (
                    <>
                      <p style={{ fontSize: 11, fontWeight: 700, color: TEAL, margin: '0 0 4px', letterSpacing: 0.3 }}>THIS IS RUNNING IN THE BACKGROUND — YOU CAN CLOSE THIS AND CONTINUE USING THE DASHBOARD.</p>
                      <p style={{ fontSize: 11, fontWeight: 700, color: TEAL, margin: 0, letterSpacing: 0.3 }}>YOUR CONVERSION WILL APPEAR AUTOMATICALLY WHEN COMPLETE.</p>
                    </>
                  )}
                </div>
                <div style={{ height: 4, borderRadius: 20, background: 'rgba(29,158,117,0.2)', overflow: 'hidden', marginBottom: 14 }}>
                  <div style={{ height: '100%', borderRadius: 20, background: TEAL, width: restoredJobComplete ? '100%' : undefined, animation: restoredJobComplete ? 'none' : 'progress 2s ease-in-out infinite' }} />
                </div>
                {!restoredJobComplete && <button onClick={() => cancelJob(activeVisionJobRef.current?.jobId || restoredJobIdRef.current, 'vision')} style={{ width: '100%', padding: 9, borderRadius: 8, border: '1px solid #DC2626', background: 'transparent', color: '#DC2626', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 14 }}>Cancel conversion</button>}
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
                <div style={{ background: TEAL_LIGHT, border: `1px solid ${TEAL}`, borderRadius: 18, boxShadow: SHADOW, padding: 20, textAlign: 'center', marginBottom: 16 }}>
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

      {/* BACKGROUND JOBS PROGRESS BAR — hidden for a job while its own modal is open,
          so the bar only appears once the user minimizes via X, matching the original UX */}
      {backgroundJobs.filter(job => {
        const isAudioJob = job.jobId.startsWith('audio-')
        if (isAudioJob && showAudioConvert) return false
        if (!isAudioJob && showConvert) return false
        return true
      }).length > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8, width: 'min(90vw, 680px)' }}>
          {backgroundJobs.filter(job => {
            const isAudioJob = job.jobId.startsWith('audio-')
            if (isAudioJob && showAudioConvert) return false
            if (!isAudioJob && showConvert) return false
            return true
          }).map(job => (
            <div key={job.jobId} onClick={() => {
              setOpenJobModals(prev => prev.includes(job.jobId) ? prev : [...prev, job.jobId])
            }} style={{ background: '#fff', border: `1px solid ${job.status === 'error' ? '#DC2626' : job.status === 'complete' ? TEAL : BORDER}`, borderRadius: 12, padding: '12px 16px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {job.status === 'complete'
                    ? <div style={{ width: 14, height: 14, borderRadius: '50%', background: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2.5"><polyline points="2,5 4,7 8,3"/></svg></div>
                    : <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid rgba(29,158,117,0.2)`, borderTopColor: TEAL, animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                  }
                  <span style={{ fontSize: 13, fontWeight: 600, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 500, display: 'inline-block' }}>{job.filename}</span>
                </div>
                {job.progress > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: TEAL }}>{job.progress}%</span>}
                {job.status !== 'complete' && job.status !== 'cancelled' && job.status !== 'error' && (
                  <button onClick={(e) => { e.stopPropagation(); cancelJob(job.jobId, job.jobId.startsWith('audio-') ? 'audio' : 'vision') }} style={{ width: 20, height: 20, borderRadius: 6, border: 'none', background: 'transparent', color: MUTED, fontSize: 14, cursor: 'pointer', flexShrink: 0, marginLeft: 8 }}>×</button>
                )}
              </div>
              <p style={{ fontSize: 11, color: MUTED, margin: '0 0 4px', paddingLeft: 22 }}>{job.status === 'complete' ? '✓ Complete — refresh to see your report' : job.message}</p>
              {job.status !== 'complete' && <p style={{ fontSize: 10, color: TEAL, margin: '0 0 6px', paddingLeft: 22, fontWeight: 500 }}>Tap to view progress</p>}
              <div style={{ height: 3, borderRadius: 20, background: 'rgba(29,158,117,0.15)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 20, background: TEAL, width: job.status === 'complete' ? '100%' : job.progress > 0 ? `${job.progress}%` : '100%', animation: job.progress === 0 && job.status !== 'complete' ? 'progress 2s ease-in-out infinite' : 'none', transition: 'width 0.5s ease' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {showWordWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 'min(90vw, 460px)', boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#B45309', margin: '0 0 12px' }}>⚠ WARNING</p>
            <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: '0 0 20px' }}>
              Word-to-Word conversions run a different system and have different background processes. You will not be able to refresh the web page until the process is completed, unlike the PDF conversion. Please leave the browser untouched until conversion is completed.
            </p>
            <button onClick={() => { setShowWordWarning(false); startConvert('worddoc') }} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: '#16A34A', color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>I confirm</button>
          </div>
        </div>
      )}

      {openJobModals.map(jobId => (
        <JobDetailModal
          key={jobId}
          jobId={jobId}
          cancelJob={cancelJob}
          onClose={() => setOpenJobModals(prev => prev.filter(id => id !== jobId))}
        />
      ))}

      {/* TOPUP MODAL */}
      {showTopup && (() => { const finalAmount = topupAmount || (customAmount ? parseFloat(customAmount) : null); const closeTopup = () => { setShowTopup(false); setTopupStep('select'); setTopupClientSecret(''); setTopupCustomerSession(''); setTopupError(''); setTopupSuccess(false) }; return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,40,32,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: SURFACE, borderRadius: 16, border: `1px solid ${BORDER}`, width: '100%', maxWidth: 440, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
              <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>Top up balance</p>
                  <p style={{ fontSize: 12, color: HINT, margin: 0 }}>Balance never expires · Non-refundable</p>
                </div>
                <button onClick={closeTopup} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent', cursor: 'pointer', fontSize: 16, color: MUTED }}>×</button>
              </div>
              {topupStep === 'select' ? (
                <>
                  <div style={{ padding: '16px 24px', borderBottom: `1px solid ${BORDER}` }}>
                    <p style={{ fontSize: 12, color: HINT, margin: '0 0 4px' }}>Pricing varies by property size · Balance never expires</p>
                  </div>
                  <div style={{ padding: '18px 24px' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 10 }}>Quick select:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                      {[5,10,20,30,40,50,100,150,200].map(amt => (
                        <button key={amt} onClick={() => { setTopupAmount(amt); setCustomAmount('') }} style={{ padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${topupAmount === amt ? TEAL : BORDER}`, background: topupAmount === amt ? TEAL : 'transparent', color: topupAmount === amt ? '#fff' : TEXT, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>£{amt}</button>
                      ))}
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 8 }}>Or enter custom amount (minimum £5):</p>
                    <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
                      <span style={{ padding: '10px 12px', background: BG, color: MUTED, fontSize: 14, fontWeight: 600, borderRight: `1px solid ${BORDER}` }}>£</span>
                      <input type="number" min="5" placeholder="5.00" value={customAmount} onChange={e => { setCustomAmount(e.target.value); setTopupAmount(null) }} style={{ flex: 1, padding: '10px 12px', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 14 }} />
                    </div>
                    {topupError && <p style={{ fontSize: 12, color: '#DC2626', marginBottom: 12 }}>{topupError}</p>}
                    <button
                      disabled={!finalAmount || finalAmount < 5 || topupLoading}
                      onClick={async () => {
                        setTopupError('')
                        setTopupLoading(true)
                        try {
                          const sess = await supabase.auth.getSession()
                          const uid = sess.data.session?.user.id
                          const accessToken = sess.data.session?.access_token
                          if (!uid || !accessToken) throw new Error('Not logged in')
                          const res = await fetch('/api/create-payment-intent', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                            body: JSON.stringify({ user_id: uid, amount: finalAmount }),
                          })
                          const data = await res.json()
                          if (!res.ok) throw new Error(data.error || 'Failed to start payment')
                          setTopupClientSecret(data.clientSecret)
                          setTopupCustomerSession(data.customerSessionClientSecret)
                          setTopupStep('pay')
                        } catch (e: any) {
                          setTopupError(e.message || 'Something went wrong')
                        } finally {
                          setTopupLoading(false)
                        }
                      }}
                      style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: finalAmount && finalAmount >= 5 ? TEAL : BORDER, color: finalAmount && finalAmount >= 5 ? '#fff' : MUTED, fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: finalAmount && finalAmount >= 5 ? 'pointer' : 'default' }}>
                      {topupLoading ? 'Loading…' : finalAmount && finalAmount >= 5 ? `Top up £${finalAmount.toFixed(2)} →` : 'Select or enter an amount'}
                    </button>
                    <p style={{ fontSize: 11, color: HINT, textAlign: 'center', marginTop: 10 }}>Secured by Stripe · Funds added after successful payment</p>
                  </div>
                </>
              ) : (
                <div style={{ padding: '18px 24px' }}>
                  {topupSuccess ? (
                    <p style={{ fontSize: 13, color: TEAL, textAlign: 'center', marginTop: 12, fontWeight: 600 }}>Payment received — updating your balance…</p>
                  ) : topupClientSecret ? (
                    <Elements stripe={stripePromise} options={{ clientSecret: topupClientSecret, customerSessionClientSecret: topupCustomerSession }}>
                      <TopupCheckoutForm
                        amount={finalAmount || 0}
                        primaryColor={TEAL}
                        borderColor={BORDER}
                        mutedColor={MUTED}
                        onCancel={() => { setTopupStep('select'); setTopupClientSecret(''); setTopupCustomerSession('') }}
                        onSuccess={() => {
                          setTopupSuccess(true)
                          setTimeout(() => { window.location.reload() }, 1500)
                        }}
                      />
                    </Elements>
                  ) : null}
                </div>
              )}
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
        const AUDIO_PRICES: Record<string, number> = {
          room_only: 3.25, studio: 6.00, '1bed': 7.92, '2bed': 9.54, '3bed': 13.70,
          '4bed': 17.45, '5bed': 21.64, '6bed': 25.84, '7bed': 30.04, '8bed': 34.24,
          '9bed': 38.45, '10bed': 42.64, '11bed': 46.84, '12bed': 51.04,
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
        const price = audioPropertySize ? (AUDIO_PRICES[audioPropertySize] ?? null) : null
        const marketPrice = audioPropertySize ? (isFurnished ? AUDIO_MARKET_FURNISHED[audioPropertySize] : AUDIO_MARKET_UNFURNISHED[audioPropertySize]) : null
        const canConvert = audioFiles.length > 0 && audioAddress.trim() && audioPropertySize && audioFurnished

        function closeAudioModal() {
          setShowAudioConvert(false)
          if (audioConvertState === 'processing') return // keep tracking the running job; just hide the modal
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
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(60,60,65,0.22)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: 'rgba(255,255,255,.96)', backdropFilter: 'blur(30px) saturate(160%)', WebkitBackdropFilter: 'blur(30px) saturate(160%)', borderRadius: 22, border: '1px solid rgba(255,255,255,.85)', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 30px 70px rgba(30,20,10,.2)' }}>

              {/* Header */}
              <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'rgba(255,255,255,.97)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', zIndex: 1 }}>
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
                  <input value={audioAddress} onChange={e => setAudioAddress(e.target.value)} placeholder="e.g. 12 High Street, London, SW1A 1AA" style={inputStyle} disabled={audioConvertState === 'processing'} />
                </div>

                {/* Property size + Furnished row */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Property size</label>
                    <select value={audioPropertySize} onChange={e => setAudioPropertySize(e.target.value)} style={{ ...inputStyle, appearance: 'none' as const }} disabled={audioConvertState === 'processing'}>
                      <option value="">Select size...</option>
                      {PROPERTY_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Furnished?</label>
                    <select value={audioFurnished} onChange={e => setAudioFurnished(e.target.value)} style={{ ...inputStyle, appearance: 'none' as const }} disabled={audioConvertState === 'processing'}>
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

                {audioConvertState !== 'processing' && audioConvertState !== 'done' && (<>
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
                      style={{ border: `2px dashed ${audioFiles.length > 0 ? AUDIO_BLUE : BORDER}`, borderRadius: 18, boxShadow: SHADOW, padding: 20, textAlign: 'center', cursor: 'pointer', background: audioFiles.length > 0 ? AUDIO_BLUE_LIGHT : BG, transition: 'all 0.15s' }}
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
                </>)}

                {/* Processing state */}
                {audioConvertState === 'processing' && (
                  <div>
                    <div style={{ background: AUDIO_BLUE_LIGHT, borderRadius: 10, padding: 16, textAlign: 'center', marginBottom: audioProcessingRooms.length > 0 ? 14 : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid #BFDBFE', borderTopColor: AUDIO_BLUE, animation: 'spin 0.8s linear infinite' }} />
                        <p style={{ fontSize: 14, fontWeight: 600, color: AUDIO_BLUE_DARK, margin: 0 }}>Converting... {audioElapsed >= 60 ? Math.floor(audioElapsed/60) + 'm ' + (audioElapsed%60) + 's' : audioElapsed + 's'}</p>
                      </div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: AUDIO_BLUE, margin: 0 }}>DO NOT CLOSE THIS TAB UNTIL COMPLETE</p>
                    </div>
                    <button onClick={() => cancelJob(activeAudioJobRef.current?.jobId || audioRestoredJobIdRef.current, 'audio')} style={{ width: '100%', padding: 9, borderRadius: 8, border: '1px solid #DC2626', background: 'transparent', color: '#DC2626', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 14 }}>Cancel conversion</button>
                    {audioProcessingRooms.map((room, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10, padding: '6px 0', borderBottom: `1px solid ${BORDER}`, opacity: room.state === 'pending' ? 0.35 : 1 }}>
                        {room.state === 'done' && <div style={{ width: 18, height: 18, borderRadius: '50%', background: AUDIO_BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2.5"><polyline points="2,5 4,7 8,3"/></svg></div>}
                        {room.state === 'active' && <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid #BFDBFE`, borderTopColor: AUDIO_BLUE, animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />}
                        {room.state === 'pending' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: BORDER, margin: '0 6px', flexShrink: 0 }} />}
                        <span style={{ fontSize: 13, fontWeight: room.state === 'active' ? 600 : 400, color: room.state === 'active' ? AUDIO_BLUE_DARK : TEXT }}>{room.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Done state */}
                {audioConvertState === 'done' && audioDocxUrl && (
                  <div>
                    <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: 16, textAlign: 'center', marginBottom: 10 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#166534', margin: '0 0 4px' }}>✅ Conversion complete!</p>
                      <p style={{ fontSize: 13, color: '#166534', margin: 0 }}>{audioElapsed >= 60 ? Math.floor(audioElapsed/60) + 'm ' + (audioElapsed%60) + 's' : audioElapsed + 's'}</p>
                    </div>
                    {audioConversionId ? (
                      <button onClick={async () => {
                        const { data: { session } } = await supabase.auth.getSession()
                        if (session) setShowReviewModal({ id: audioConversionId, user_id: session.user.id })
                      }} style={{ display: 'block', width: '100%', padding: 13, borderRadius: 10, background: AUDIO_BLUE, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, textAlign: 'center', cursor: 'pointer', marginBottom: 10, boxSizing: 'border-box' as const, border: 'none' }}>Preview / Amend</button>
                    ) : (
                      <a href={audioDocxUrl} download={audioDocxName} style={{ display: 'block', width: '100%', padding: 13, borderRadius: 10, background: AUDIO_BLUE, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, textAlign: 'center', textDecoration: 'none', marginBottom: 10, boxSizing: 'border-box' as const }}>↓ Download {audioDocxName}</a>
                    )}
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
                    setAudioRestoredJobComplete(false)
                    const initialRoomList = (audioRoomOrder || '').trim().split('\n').filter((r: string) => r.trim()).map((r: string) => r.trim())
                    setAudioProcessingRooms(initialRoomList.map((name: string) => ({ name, state: 'pending' })))
                    const localTimer = setInterval(() => {
                      audioElapsedRef.current += 1
                      setAudioElapsed(audioElapsedRef.current)
                    }, 1000)
                    try {
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

                      const startRes = await fetch('/api/convert-audio-start', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${uploadSession.access_token}` },
                        body: JSON.stringify({ filePaths, fileNames, roomOrder: audioRoomOrder, propertySize: audioPropertySize, furnished: audioFurnished, address: audioAddress, userId: uploadSession.user.id, convertedBy: userName || uploadSession.user.email })
                      })
                      const startData = await startRes.json()
                      if (!startRes.ok || startData.error) throw new Error(startData.error || 'Failed to start conversion')

                      clearInterval(localTimer)
                      const jobId = startData.jobId
                      activeAudioJobRef.current = { jobId, filename: audioAddress || 'Audio conversion' }
                      // Reuse the same started-at anchor the restore path uses, so the one
                      // ticking effect correctly covers both a live conversion and a restored one.
                      setAudioRestoredJobStartedAt(Date.now())
                      setBackgroundJobs(prev => [...prev, { jobId, filename: audioAddress || 'Audio conversion', message: 'Starting...', progress: 0, status: 'running' }])
                    } catch (err: any) {
                      clearInterval(localTimer)
                      const realErrorMessage = err.message || err.toString() || 'Unknown error'
                      console.error('[audio convert] real error (hidden from user):', realErrorMessage)
                      fetch('/api/report-error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'audio', errorMessage: realErrorMessage, address: audioAddress, userEmail }) }).catch(() => {})
                      setAudioError('Unable to process at this time. If the problem persists, please contact admin.')
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
                ) : audioConvertState === 'idle' ? (
                  <button disabled style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: BORDER, color: MUTED, fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'default' }}>
                    Fill in all fields to continue
                  </button>
                ) : null}

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
