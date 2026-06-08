const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

const oldStats = c.slice(c.indexOf('function StatsPage('), c.indexOf('function TeamPage('));

const newStats = `function StatsPage({ conversions, TEAL, TEAL_LIGHT, TEAL_DARK, BORDER, SURFACE, BG, HINT, MUTED, TEXT }: any) {
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

  const total = filtered.length
  const rooms = filtered.reduce((s: number, r: any) => s + (r.rooms || 0), 0)
  const duration = filtered.reduce((s: number, r: any) => s + (r.duration_seconds || 0), 0)
  const avg = total > 0 ? Math.round(duration / total) : 0
  const cost = total * 3.5
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
        datasets: [{ label: 'Conversions', data: last30.map(d => d.count), backgroundColor: '#1D9E75', borderRadius: 3, borderSkipped: false }]
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
        <div style={{ display: 'flex', background: SURFACE, border: \`1px solid \${BORDER}\`, borderRadius: 10, padding: 3, gap: 2 }}>
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

        <div style={{ background: SURFACE, border: \`1px solid \${BORDER}\`, borderRadius: 14, padding: '20px 18px' }}>
          <p style={{ fontSize: 11, color: HINT, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Total spent</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: TEXT, marginBottom: 4 }}>£{cost.toFixed(2)}</p>
          <p style={{ fontSize: 12, color: HINT, marginBottom: 14 }}>@ £3.50 per report</p>
          <div style={{ height: 3, background: BORDER, borderRadius: 2 }}>
            <div style={{ height: '100%', width: Math.min(100, total * 5) + '%', background: TEAL, borderRadius: 2 }} />
          </div>
          <p style={{ fontSize: 11, color: HINT, marginTop: 6 }}>{total} of 20 credit target</p>
        </div>

        <div style={{ background: SURFACE, border: \`1px solid \${BORDER}\`, borderRadius: 14, padding: '20px 18px' }}>
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
          <div key={lbl} style={{ background: SURFACE, border: \`1px solid \${BORDER}\`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: HINT, marginBottom: 8 }}>{lbl}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: TEXT, letterSpacing: -0.5 }}>{val}</p>
          </div>
        ))}
      </div>

      <div style={{ background: SURFACE, border: \`1px solid \${BORDER}\`, borderRadius: 12, padding: 20, marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Conversions — last 30 days</p>
          <span style={{ fontSize: 11, color: HINT }}>{conversions.length} total</span>
        </div>
        <div style={{ position: 'relative', height: 160 }}>
          <canvas ref={chartRef} role="img" aria-label="Bar chart of daily conversions over last 30 days" />
        </div>
      </div>

      <p style={{ fontSize: 11, color: HINT, marginTop: 6, fontStyle: 'italic' }}>*£12 manual typist average used</p>
    </div>
  )
}

`;

c = c.slice(0, c.indexOf('function StatsPage(')) + newStats + c.slice(c.indexOf('function TeamPage('));

if (c.includes('function StatsPage(') && c.includes('function TeamPage(')) {
  console.log('StatsPage replaced ✅');
} else {
  console.log('ERROR ❌');
}

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
