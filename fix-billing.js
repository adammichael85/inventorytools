const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Find and replace the billing page section
const oldBilling = `          {page === 'billing' && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px', letterSpacing: -0.3 }}>Billing</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div style={{ background: TEAL, borderRadius: 14, padding: 24, color: '#fff' }}>
                  <p style={{ fontSize: 12, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Current balance</p>
                  <p style={{ fontSize: 42, fontWeight: 700, letterSpacing: -1, lineHeight: 1, marginBottom: 6 }}>17</p>
                  <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 20 }}>credits remaining</p>
                  <button onClick={() => setShowTopup(true)} style={{ padding: '10px 20px', borderRadius: 9, border: 'none', background: '#fff', color: TEAL, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Buy more credits</button>
                </div>
                <div style={{ background: SURFACE, border: \`1px solid \${BORDER}\`, borderRadius: 14, padding: 24 }}>
                  {[['Reports converted', conversions.length.toString()],['Credits used', conversions.length.toString()],['Total spent', \`£\${(conversions.length*3.5).toFixed(2)}\`],['Est. saving', \`£\${(conversions.length*15).toFixed(2)}\`]].map(([l,v],i) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? \`1px solid \${BORDER}\` : 'none', fontSize: 13 }}>
                      <span style={{ color: MUTED }}>{l}</span><span style={{ fontWeight: 600, color: l.includes('saving') ? TEAL : TEXT }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}`;

const newBilling = `          {page === 'billing' && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px', letterSpacing: -0.3 }}>Billing</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div style={{ background: TEAL, borderRadius: 14, padding: 24, color: '#fff' }}>
                  <p style={{ fontSize: 12, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Current balance</p>
                  <p style={{ fontSize: 42, fontWeight: 700, letterSpacing: -1, lineHeight: 1, marginBottom: 6 }}>{credits}</p>
                  <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 20 }}>credits remaining</p>
                  <button onClick={() => setShowTopup(true)} style={{ padding: '10px 20px', borderRadius: 9, border: 'none', background: '#fff', color: TEAL, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Buy more credits</button>
                </div>
                <div style={{ background: SURFACE, border: \`1px solid \${BORDER}\`, borderRadius: 14, padding: 24 }}>
                  {[['Reports converted', conversions.length.toString()],['Total spent', \`£\${(conversions.length*3.5).toFixed(2)}\`],['Avg. conv. time', conversions.length > 0 ? (()=>{ const avg=Math.round(conversions.reduce((s,r)=>s+(r.duration_seconds||0),0)/conversions.length); return avg>=60 ? Math.floor(avg/60)+'m '+(avg%60)+'s' : avg+'s' })() : '—'],['Est. saving vs. typist', \`£\${(conversions.length*15).toFixed(2)}\`]].map(([l,v],i) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? \`1px solid \${BORDER}\` : 'none', fontSize: 13 }}>
                      <span style={{ color: MUTED }}>{l}</span><span style={{ fontWeight: 600, color: l.includes('saving') ? TEAL : TEXT }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}`;

if (c.includes(oldBilling)) {
  c = c.replace(oldBilling, newBilling);
  console.log('Fixed billing page ✅');
} else {
  console.log('Billing pattern not found ❌');
  const idx = c.indexOf("page === 'billing'");
  console.log('Context:', c.slice(idx, idx+200));
}

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
