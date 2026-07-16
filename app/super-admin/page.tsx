'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const SUPER_ADMIN_EMAIL = 'adammichael85@me.com'

export default function SuperAdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [conversions, setConversions] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [tab, setTab] = useState<'conversions' | 'topups' | 'users'>('conversions')
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session || session.user.email !== SUPER_ADMIN_EMAIL) {
        setAuthorized(false)
        router.push('/auth')
        return
      }
      setAuthorized(true)
      const res = await fetch('/api/super-admin-data', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      setConversions(data.conversions || [])
      setTransactions(data.transactions || [])
      setUsers(data.users || [])
      setLoading(false)
    })
  }, [router])

  if (authorized === null || loading) {
    return <div style={{ padding: 40, fontFamily: 'monospace' }}>Loading…</div>
  }
  if (!authorized) {
    return <div style={{ padding: 40, fontFamily: 'monospace' }}>Redirecting…</div>
  }
  if (error) {
    return <div style={{ padding: 40, fontFamily: 'monospace', color: '#DC2626' }}>Error: {error}</div>
  }

  const companies = Array.from(new Set(conversions.map(c => c.company_name))).sort()
  const filteredConversions = companyFilter ? conversions.filter(c => c.company_name === companyFilter) : conversions
  const filteredTransactions = companyFilter ? transactions.filter(t => t.company_name === companyFilter) : transactions

  const totalReports = filteredConversions.length
  const totalCharged = filteredConversions.reduce((s, c) => s + (c.cost ? Number(c.cost) : 0), 0)
  const totalRealCost = filteredConversions.reduce((s, c) => s + (c.actual_api_cost ? Number(c.actual_api_cost) : 0), 0)
  const totalMargin = totalCharged - totalRealCost

  // Real P&L: actual money collected via top-ups vs actual OpenAI spend — the true cash-in vs cash-out
  const totalToppedUp = filteredTransactions.reduce((s, t) => s + (t.amount ? Number(t.amount) : 0), 0)
  const realProfit = totalToppedUp - totalRealCost

  // User activity stats
  const now = Date.now()
  const DAY = 24 * 60 * 60 * 1000
  const activeLast7Days = users.filter(u => u.last_sign_in_at && (now - new Date(u.last_sign_in_at).getTime()) < 7 * DAY).length
  const activeLast30Days = users.filter(u => u.last_sign_in_at && (now - new Date(u.last_sign_in_at).getTime()) < 30 * DAY).length
  const newThisWeek = users.filter(u => (now - new Date(u.created_at).getTime()) < 7 * DAY).length
  const mostActiveUsers = [...users].sort((a, b) => b.conversion_count - a.conversion_count).slice(0, 5)
  const sortedUsers = [...users].sort((a, b) => {
    const aTime = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0
    const bTime = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0
    return bTime - aTime
  })

  function timeAgo(dateStr: string | null) {
    if (!dateStr) return 'Never'
    const diffMs = now - new Date(dateStr).getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 60) return mins <= 1 ? 'Just now' : `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString('en-GB')
  }

  // Conversions per day, last 14 days
  const last14Days: { date: string, count: number, realCost: number, charged: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const day = new Date(now - i * DAY)
    const dayStr = day.toLocaleDateString('en-GB')
    const dayConversions = conversions.filter(c => new Date(c.created_at).toLocaleDateString('en-GB') === dayStr)
    last14Days.push({
      date: dayStr,
      count: dayConversions.length,
      realCost: dayConversions.reduce((s, c) => s + (c.actual_api_cost ? Number(c.actual_api_cost) : 0), 0),
      charged: dayConversions.reduce((s, c) => s + (c.cost ? Number(c.cost) : 0), 0),
    })
  }

  const cardStyle = { background: '#fff', border: '1px solid #ecebe8', borderRadius: 14, padding: '16px 20px', minWidth: 170, boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }
  const labelStyle = { fontSize: 11, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 6 }

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", padding: 32, maxWidth: 1400, margin: '0 auto' }}>
      <button onClick={() => router.push('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: '#8a8a8a', fontWeight: 600, marginBottom: 16, padding: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to Dashboard
      </button>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Super Admin — Platform Overview</h1>
      <p style={{ fontSize: 13, color: '#8a8a8a', marginBottom: 24 }}>Full detail across every company on the platform. Visible only to this account.</p>

      {/* Real P&L: money in (top-ups) vs money out (actual OpenAI cost) */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' as const }}>
        <div style={{ ...cardStyle, background: '#f6f5f3' }}>
          <p style={labelStyle}>Total topped up (real money in)</p>
          <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>£{totalToppedUp.toFixed(2)}</p>
        </div>
        <div style={{ ...cardStyle, background: '#f6f5f3' }}>
          <p style={labelStyle}>Total OpenAI cost (real money out)</p>
          <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>£{totalRealCost.toFixed(2)}</p>
        </div>
        <div style={{ ...cardStyle, background: realProfit < 0 ? '#FEE2E2' : '#F0FDF4' }}>
          <p style={labelStyle}>Real profit (top-ups − OpenAI cost)</p>
          <p style={{ fontSize: 20, fontWeight: 700, margin: 0, color: realProfit < 0 ? '#DC2626' : '#16A34A' }}>£{realProfit.toFixed(2)}</p>
        </div>
      </div>

      {/* Per-report accounting figures */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' as const }}>
        {[
          ['Total reports', totalReports.toString()],
          ['Total charged (per-report)', '£' + totalCharged.toFixed(2)],
          ['Total real cost (per-report)', '£' + totalRealCost.toFixed(2)],
          ['Per-report margin', '£' + totalMargin.toFixed(2)],
        ].map(([label, value]) => (
          <div key={label} style={cardStyle}>
            <p style={labelStyle}>{label}</p>
            <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' as const }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['conversions', 'topups', 'users'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${tab === t ? '#1a1a1a' : '#ecebe8'}`, background: tab === t ? '#1a1a1a' : 'transparent', color: tab === t ? '#fff' : '#1a1a1a', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {t === 'conversions' ? 'Conversions' : t === 'topups' ? 'Top-ups' : 'Users'}
            </button>
          ))}
        </div>
        <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ecebe8', fontFamily: 'inherit', fontSize: 13 }}>
          <option value="">All companies</option>
          {companies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {tab === 'users' && (
        <div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' as const }}>
            {[
              ['Total users', users.length.toString()],
              ['Active last 7 days', activeLast7Days.toString()],
              ['Active last 30 days', activeLast30Days.toString()],
              ['New signups this week', newThisWeek.toString()],
            ].map(([label, value]) => (
              <div key={label} style={cardStyle}>
                <p style={labelStyle}>{label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Most active users</p>
          <div style={{ background: '#fff', border: '1px solid #ecebe8', borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f6f5f3' }}>
                  {['Name', 'Company', 'Conversions', 'Last Seen'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: 0.5, borderBottom: '1px solid #ecebe8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mostActiveUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #ecebe8' }}>
                    <td style={{ padding: '10px 14px' }}>{u.full_name || u.email}</td>
                    <td style={{ padding: '10px 14px' }}>{u.company_name || '—'}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{u.conversion_count}</td>
                    <td style={{ padding: '10px 14px' }}>{timeAgo(u.last_sign_in_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Last 14 days - conversions & cost</p>
          <div style={{ background: '#fff', border: '1px solid #ecebe8', borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f6f5f3' }}>
                  {['Date', 'Conversions', 'Charged', 'Real Cost', 'Margin'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: 0.5, borderBottom: '1px solid #ecebe8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {last14Days.map(d => (
                  <tr key={d.date} style={{ borderBottom: '1px solid #ecebe8' }}>
                    <td style={{ padding: '10px 14px' }}>{d.date}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{d.count}</td>
                    <td style={{ padding: '10px 14px' }}>£{d.charged.toFixed(2)}</td>
                    <td style={{ padding: '10px 14px' }}>£{d.realCost.toFixed(2)}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: (d.charged - d.realCost) < 0 ? '#DC2626' : '#16A34A' }}>£{(d.charged - d.realCost).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>All users</p>
          <div style={{ background: '#fff', border: '1px solid #ecebe8', borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f6f5f3' }}>
                  {['Name', 'Email', 'Company', 'Conversions', 'Last Seen', 'Joined'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: 0.5, borderBottom: '1px solid #ecebe8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #ecebe8' }}>
                    <td style={{ padding: '10px 14px' }}>{u.full_name || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>{u.email}</td>
                    <td style={{ padding: '10px 14px' }}>{u.company_name || '—'}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{u.conversion_count}</td>
                    <td style={{ padding: '10px 14px' }}>{timeAgo(u.last_sign_in_at)}</td>
                    <td style={{ padding: '10px 14px' }}>{new Date(u.created_at).toLocaleDateString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' as const }}>
            {[
              ['Total users', users.length.toString()],
              ['Active last 7 days', activeLast7Days.toString()],
              ['Active last 30 days', activeLast30Days.toString()],
              ['New signups this week', newThisWeek.toString()],
            ].map(([label, value]) => (
              <div key={label} style={cardStyle}>
                <p style={labelStyle}>{label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Most active users</p>
          <div style={{ background: '#fff', border: '1px solid #ecebe8', borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f6f5f3' }}>
                  {['Name', 'Company', 'Conversions', 'Last Seen'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: 0.5, borderBottom: '1px solid #ecebe8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mostActiveUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #ecebe8' }}>
                    <td style={{ padding: '10px 14px' }}>{u.full_name || u.email}</td>
                    <td style={{ padding: '10px 14px' }}>{u.company_name || '—'}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{u.conversion_count}</td>
                    <td style={{ padding: '10px 14px' }}>{timeAgo(u.last_sign_in_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Last 14 days - conversions & cost</p>
          <div style={{ background: '#fff', border: '1px solid #ecebe8', borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f6f5f3' }}>
                  {['Date', 'Conversions', 'Charged', 'Real Cost', 'Margin'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: 0.5, borderBottom: '1px solid #ecebe8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {last14Days.map(d => (
                  <tr key={d.date} style={{ borderBottom: '1px solid #ecebe8' }}>
                    <td style={{ padding: '10px 14px' }}>{d.date}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{d.count}</td>
                    <td style={{ padding: '10px 14px' }}>£{d.charged.toFixed(2)}</td>
                    <td style={{ padding: '10px 14px' }}>£{d.realCost.toFixed(2)}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: (d.charged - d.realCost) < 0 ? '#DC2626' : '#16A34A' }}>£{(d.charged - d.realCost).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>All users</p>
          <div style={{ background: '#fff', border: '1px solid #ecebe8', borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f6f5f3' }}>
                  {['Name', 'Email', 'Company', 'Conversions', 'Last Seen', 'Joined'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: 0.5, borderBottom: '1px solid #ecebe8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #ecebe8' }}>
                    <td style={{ padding: '10px 14px' }}>{u.full_name || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>{u.email}</td>
                    <td style={{ padding: '10px 14px' }}>{u.company_name || '—'}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{u.conversion_count}</td>
                    <td style={{ padding: '10px 14px' }}>{timeAgo(u.last_sign_in_at)}</td>
                    <td style={{ padding: '10px 14px' }}>{new Date(u.created_at).toLocaleDateString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'conversions' ? (
        <div style={{ background: '#fff', border: '1px solid #ecebe8', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f6f5f3' }}>
                {['Company', 'Address', 'Type', 'Charged', 'Real Cost', 'Margin', 'By', 'Date'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: 0.5, borderBottom: '1px solid #ecebe8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredConversions.map(c => {
                const charged = c.cost ? Number(c.cost) : 0
                const realCost = c.actual_api_cost != null ? Number(c.actual_api_cost) : null
                const margin = realCost != null ? charged - realCost : null
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #ecebe8' }}>
                    <td style={{ padding: '10px 14px' }}>{c.company_name}</td>
                    <td style={{ padding: '10px 14px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{c.address || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>{c.type === 'audio' ? 'Audio' : 'PDF'}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>£{charged.toFixed(2)}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{realCost != null ? '£' + realCost.toFixed(2) : '—'}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: margin != null ? (margin < 0 ? '#DC2626' : '#16A34A') : '#8a8a8a' }}>{margin != null ? '£' + margin.toFixed(2) : '—'}</td>
                    <td style={{ padding: '10px 14px' }}>{c.converted_by || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>{new Date(c.created_at).toLocaleDateString('en-GB')} {new Date(c.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #ecebe8', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f6f5f3' }}>
                {['Company', 'Invoice #', 'Description', 'Amount', 'Card', 'Date'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: 0.5, borderBottom: '1px solid #ecebe8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #ecebe8' }}>
                  <td style={{ padding: '10px 14px' }}>{t.company_name || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>{t.invoice_number || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>{t.description || 'Balance top-up'}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>£{Number(t.amount).toFixed(2)}</td>
                  <td style={{ padding: '10px 14px' }}>{t.card_brand ? `${t.card_brand} •••• ${t.card_last4}` : '—'}</td>
                  <td style={{ padding: '10px 14px' }}>{new Date(t.created_at).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
