const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Find the end of StatsPage - after the footnote, before function LegalPage
const insertPoint = `      <p style={{ fontSize: 11, color: HINT, marginTop: 6, fontStyle: 'italic' }}>*£12 manual typist average used</p>

      {userStats && (`;

// Remove the simple lifetime block we added before
const oldSimple = `
      {userStats && (
        <div style={{ marginTop: 24 }}>
          <div style={{ background: SURFACE, border: \`1px solid \${BORDER}\`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: \`1px solid \${BORDER}\` }}>
              <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Lifetime statistics <span style={{ fontSize: 12, fontWeight: 400, color: HINT }}>— includes deleted reports</span></p>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                {[
                  ['Total reports', userStats.total_conversions.toString(), 'all time'],
                  ['Total spent', '£' + Number(userStats.total_spend).toFixed(2), '@ £3.50 per report'],
                  ['Avg conv. time', userStats.total_conversions > 0 ? fmtTime(Math.round(userStats.total_duration_seconds / userStats.total_conversions)) : '—', 'per conversion'],
                  ['Total conv. time', fmtTime(userStats.total_duration_seconds), 'all conversions'],
                  ['Est. saving', '£' + (userStats.total_conversions * 12).toFixed(2), 'vs. manual typing'],
                ].map(([label, val, sub]) => (
                  <div key={label} style={{ background: BG, borderRadius: 10, padding: '14px 16px' }}>
                    <p style={{ fontSize: 11, fontWeight: 500, color: HINT, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</p>
                    <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: TEXT, marginBottom: 2 }}>{val}</p>
                    <p style={{ fontSize: 11, color: HINT }}>{sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
`;

if (c.includes(oldSimple)) {
  c = c.replace(oldSimple, '\n');
  console.log('Removed old simple section ✅');
}

// Now add the full lifetime section
const footnote = `      <p style={{ fontSize: 11, color: HINT, marginTop: 6, fontStyle: 'italic' }}>*£12 manual typist average used</p>
    </div>
  )
}`;

const withLifetime = `      <p style={{ fontSize: 11, color: HINT, marginTop: 6, fontStyle: 'italic' }}>*£12 manual typist average used</p>

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: -0.3 }}>Lifetime statistics</p>
                <p style={{ fontSize: 12, color: HINT, margin: 0 }}>Permanent record — includes deleted reports</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div style={{ background: TEAL, borderRadius: 14, padding: '20px 24px', color: '#fff' }}>
                <p style={{ fontSize: 11, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Total conversions</p>
                <p style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>{ltTotal}</p>
                <p style={{ fontSize: 12, opacity: 0.7 }}>all time</p>
              </div>
              <div style={{ background: SURFACE, border: \`1px solid \${BORDER}\`, borderRadius: 14, padding: '20px 18px' }}>
                <p style={{ fontSize: 11, color: HINT, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Total spent</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: TEXT, marginBottom: 4 }}>£{ltCost.toFixed(2)}</p>
                <p style={{ fontSize: 12, color: HINT }}>@ £3.50 per report</p>
              </div>
              <div style={{ background: SURFACE, border: \`1px solid \${BORDER}\`, borderRadius: 14, padding: '20px 18px' }}>
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
              {[
                ['Rooms processed', ltRooms.toString()],
                ['Avg conv. time', fmtTime(ltAvg)],
                ['Total conv. time', fmtTime(ltDuration)],
                ['Credits used', ltTotal.toString()],
              ].map(([lbl, val]) => (
                <div key={lbl} style={{ background: SURFACE, border: \`1px solid \${BORDER}\`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
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
}`;

if (c.includes(footnote)) {
  c = c.replace(footnote, withLifetime);
  console.log('Lifetime stats section added ✅');
} else {
  console.log('Pattern not found ❌');
  const idx = c.indexOf('manual typist average used');
  console.log('Context:', c.slice(idx-20, idx+100));
}

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
