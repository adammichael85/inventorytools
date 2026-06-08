const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// 1. Add Stats nav item
c = c.replace(
  `{ id: 'reports', label: 'Reports', icon: 'M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z' },`,
  `{ id: 'reports', label: 'Reports', icon: 'M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z' },
    { id: 'stats', label: 'Statistics', icon: 'M18 20V10M12 20V4M6 20v-6' },`
);

// 2. Add stats page section before team page
const statsPage = `          {page === 'stats' && (
            <StatsPage conversions={conversions} TEAL={TEAL} TEAL_LIGHT={TEAL_LIGHT} TEAL_DARK={TEAL_DARK} BORDER={BORDER} SURFACE={SURFACE} BG={BG} HINT={HINT} MUTED={MUTED} TEXT={TEXT} />
          )}

`;

c = c.replace(
  `          {page === 'team' && (`,
  statsPage + `          {page === 'team' && (`
);

// 3. Add StatsPage component before TeamPage
const statsComponent = `
function StatsPage({ conversions, TEAL, TEAL_LIGHT, TEAL_DARK, BORDER, SURFACE, BG, HINT, MUTED, TEXT }: any) {
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
}

`;

c = c.replace('function TeamPage(', statsComponent + 'function TeamPage(');

// Verify
const checks = [
  ['Stats nav item', "id: 'stats'"],
  ['Stats page section', "page === 'stats'"],
  ['StatsPage component', 'function StatsPage('],
];
checks.forEach(([name, search]) => {
  console.log(name + ':', c.includes(search) ? '✅' : '❌');
});

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
