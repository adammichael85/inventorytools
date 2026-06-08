const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

const oldStats = `function StatsPage({ conversions, TEAL, TEAL_LIGHT, TEAL_DARK, BORDER, SURFACE, BG, HINT, MUTED, TEXT }: any) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart); weekStart.setDate(todayStart.getDate() - todayStart.getDay())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const periods = [
    { label: 'Today', convs: conversions.filter((c: any) => new Date(c.created_at) >= todayStart) },
    { label: 'This Week', convs: conversions.filter((c: any) => new Date(c.created_at) >= weekStart) },
    { label: 'This Month', convs: conversions.filter((c: any) => new Date(c.created_at) >= monthStart) },
    { label: 'All Time', convs: conversions },
  ]

  function fmtTime(secs: number) {
    if (!secs) return '—'
    return secs >= 60 ? Math.floor(secs/60) + 'm ' + (secs%60) + 's' : secs + 's'
  }

  function stats(convs: any[]) {
    const total = convs.length
    const rooms = convs.reduce((s: number, c: any) => s + (c.rooms || 0), 0)
    const duration = convs.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0)
    const avg = total > 0 ? Math.round(duration / total) : 0
    const cost = total * 3.5
    const saving = total * 12
    return { total, rooms, duration, avg, cost, saving }
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px', letterSpacing: -0.3 }}>Statistics</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {periods.map(({ label, convs }) => {
          const s = stats(convs)
          return (
            <div key={label} style={{ background: SURFACE, border: \`1px solid \${BORDER}\`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '12px 20px', borderBottom: \`1px solid \${BORDER}\`, background: BG, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: TEXT }}>{label}</p>
                <span style={{ fontSize: 12, color: HINT }}>{s.total} conversion{s.total !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0 }}>
                {[
                  ['Properties', s.total.toString()],
                  ['Rooms', s.rooms.toString()],
                  ['Total Time', fmtTime(s.duration)],
                  ['Avg Time', fmtTime(s.avg)],
                  ['Cost', '£' + s.cost.toFixed(2)],
                  ['Est. Saving*', '£' + s.saving.toFixed(2)],
                ].map(([lbl, val], i) => (
                  <div key={lbl} style={{ padding: '16px 20px', borderRight: i < 5 ? \`1px solid \${BORDER}\` : 'none' }}>
                    <p style={{ fontSize: 11, color: HINT, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 6px' }}>{lbl}</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: lbl.includes('Saving') ? TEAL : TEXT, margin: 0, letterSpacing: -0.5 }}>{val}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <p style={{ fontSize: 11, color: HINT, marginTop: 12, fontStyle: 'italic' }}>*£12 manual typist average used</p>
    </div>
  )
}`;

const newStats = `function StatsPage({ conversions, TEAL, TEAL_LIGHT, TEAL_DARK, BORDER, SURFACE, BG, HINT, MUTED, TEXT }: any) {
  const [period, setPeriod] = React.useState('month')
  const [chartReady, setChartReady] = React.useState(false)
  const chartRef = React.useRef<any>(null)
  const chartInstanceRef = React.useRef<any>(null)

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
    return secs >= 60 ? Math.floor(secs/60) + 'm ' + (secs%60) + 's' : secs + 's'
  }

  const total = filtered.length
  const rooms = filtered.reduce((s: number, c: any) => s + (c.rooms || 0), 0)
  const duration = filtered.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0)
  const avg = total > 0 ? Math.round(duration / total) : 0
  const cost = total * 3.5
  const saving = total * 12

  // Build daily chart data for last 30 days
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - (29 - i))
    const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    const count = conversions.filter((c: any) => {
      const cd = new Date(c.created_at)
      return cd.getDate() === d.getDate() && cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear()
    }).length
    return { label, count }
  })

  React.useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
    script.onload = () => setChartReady(true)
    if (!(window as any).Chart) document.head.appendChild(script)
    else setChartReady(true)
  }, [])

  React.useEffect(() => {
    if (!chartReady || !chartRef.current) return
    if (chartInstanceRef.current) chartInstanceRef.current.destroy()
    const Chart = (window as any).Chart
    chartInstanceRef.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: last30.map(d => d.label),
        datasets: [{
          label: 'Conversions',
          data: last30.map(d => d.count),
          backgroundColor: '#1D9E75',
          borderRadius: 4,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { maxTicksLimit: 8, font: { size: 11 }, color: '#94AEA6' } },
          y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { stepSize: 1, font: { size: 11 }, color: '#94AEA6' }, beginAtZero: true }
        }
      }
    })
  }, [chartReady, conversions])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: -0.3 }}>Statistics</h2>
        <div style={{ display: 'flex', background: SURFACE, border: \`1px solid \${BORDER}\`, borderRadius: 10, padding: 3, gap: 2 }}>
          {[['today','Today'],['week','This Week'],['month','This Month'],['all','All Time']].map(([v,l]) => (
            <button key={v} onClick={() => setPeriod(v)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: period === v ? TEAL : 'transparent', color: period === v ? '#fff' : MUTED, fontFamily: 'inherit', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          ['Conversions', total.toString(), '📄'],
          ['Rooms processed', rooms.toString(), '🏠'],
          ['Avg conv. time', fmtTime(avg), '⏱'],
          ['Total conv. time', fmtTime(duration), '🕐'],
          ['Total cost', '£' + cost.toFixed(2), '💷'],
          ['Est. saving*', '£' + saving.toFixed(2), '💰'],
        ].map(([lbl, val, icon]) => (
          <div key={lbl} style={{ background: SURFACE, border: \`1px solid \${BORDER}\`, borderRadius: 12, padding: '16px 18px' }}>
            <p style={{ fontSize: 12, color: HINT, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}><span>{icon}</span>{lbl}</p>
            <p style={{ fontSize: 22, fontWeight: 700, margin: 0, color: lbl.includes('saving') ? TEAL : TEXT, letterSpacing: -0.5 }}>{val}</p>
          </div>
        ))}
      </div>

      <div style={{ background: SURFACE, border: \`1px solid \${BORDER}\`, borderRadius: 12, padding: 20, marginBottom: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 16px', color: TEXT }}>Conversions — last 30 days</p>
        <div style={{ position: 'relative', height: 180 }}>
          <canvas ref={chartRef} />
        </div>
      </div>

      <p style={{ fontSize: 11, color: HINT, margin: '6px 0 0', fontStyle: 'italic' }}>*£12 manual typist average used</p>
    </div>
  )
}`;

if (c.includes(oldStats)) {
  c = c.replace(oldStats, newStats);
  console.log('Replaced StatsPage ✅');
} else {
  console.log('StatsPage pattern not found ❌');
}

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
