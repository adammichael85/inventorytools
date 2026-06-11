const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Find the closing of StatsPage return and add lifetime stats before it
const oldEnd = `      <p style={{ fontSize: 11, color: HINT, marginTop: 6, fontStyle: 'italic' }}>*£12 manual typist average used</p>
    </div>
  )
}

function LegalPage(`;

const newEnd = `      <p style={{ fontSize: 11, color: HINT, marginTop: 6, fontStyle: 'italic' }}>*£12 manual typist average used</p>

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
    </div>
  )
}

function LegalPage(`;

if (c.includes(oldEnd)) {
  c = c.replace(oldEnd, newEnd);
  console.log('Lifetime stats section added to Stats page ✅');
} else {
  console.log('Pattern not found ❌');
}

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
