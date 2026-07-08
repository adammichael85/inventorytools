'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const SUPER_ADMIN_EMAIL = 'adammichael85@me.com'

export default function SuperAdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [conversions, setConversions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
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
  const filtered = companyFilter ? conversions.filter(c => c.company_name === companyFilter) : conversions

  const totalReports = filtered.length
  const totalCharged = filtered.reduce((s, c) => s + (c.cost ? Number(c.cost) : 0), 0)
  const totalRealCost = filtered.reduce((s, c) => s + (c.actual_api_cost ? Number(c.actual_api_cost) : 0), 0)
  const totalMargin = totalCharged - totalRealCost

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", padding: 32, maxWidth: 1400, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Super Admin — Cross-Company Report Costs</h1>
      <p style={{ fontSize: 13, color: '#8a8a8a', marginBottom: 24 }}>Full detail across every company on the platform. Visible only to this account.</p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' as const }}>
        {[
          ['Total reports', totalReports.toString()],
          ['Total charged', '£' + totalCharged.toFixed(2)],
          ['Total real cost', '£' + totalRealCost.toFixed(3)],
          ['Total margin', '£' + totalMargin.toFixed(2)],
        ].map(([label, value]) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #ecebe8', borderRadius: 14, padding: '16px 20px', minWidth: 160, boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }}>
            <p style={{ fontSize: 11, color: '#8a8a8a', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 6 }}>{label}</p>
            <p style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ecebe8', fontFamily: 'inherit', fontSize: 13 }}>
          <option value="">All companies</option>
          {companies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

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
            {filtered.map(c => {
              const charged = c.cost ? Number(c.cost) : 0
              const realCost = c.actual_api_cost != null ? Number(c.actual_api_cost) : null
              const margin = realCost != null ? charged - realCost : null
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid #ecebe8' }}>
                  <td style={{ padding: '10px 14px' }}>{c.company_name}</td>
                  <td style={{ padding: '10px 14px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{c.address || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>{c.type === 'audio' ? 'Audio' : 'PDF'}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>£{charged.toFixed(2)}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{realCost != null ? '£' + realCost.toFixed(3) : '—'}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: margin != null ? (margin < 0 ? '#DC2626' : '#16A34A') : '#8a8a8a' }}>{margin != null ? '£' + margin.toFixed(3) : '—'}</td>
                  <td style={{ padding: '10px 14px' }}>{c.converted_by || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>{new Date(c.created_at).toLocaleDateString('en-GB')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
