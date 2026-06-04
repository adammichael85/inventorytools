const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Find the done state section and replace it
const oldDone = `{convertState === 'done' && docxUrl && (
              <div style={{ padding: 24 }}>
                <div style={{ background: TEAL_LIGHT, border: \`1px solid \${TEAL}\`, borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: TEAL_DARK, marginBottom: 4 }}>Conversion complete!</p>
                  <p style={{ fontSize: 13, color: MUTED }}>{processingRooms.length} rooms · {elapsed}s</p>
                </div>
                <a href={docxUrl} download={docxName} style={{ display: 'block', width: '100%', padding: 13, borderRadius: 10, background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, textAlign: 'center', textDecoration: 'none', marginBottom: 10, boxSizing: 'border-box' }}>↓ Download {docxName}</a>
                <button onClick={closeConvert} style={{ width: '100%', padding: 11, borderRadius: 10, border: \`1px solid \${BORDER}\`, background: 'transparent', color: MUTED, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>Close</button>
              </div>
            )}`;

const newDone = `{convertState === 'done' && docxUrl && (
              <div style={{ padding: 24 }}>
                <div style={{ background: TEAL_LIGHT, borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: TEAL_DARK, margin: 0 }}>✅ Conversion complete!</p>
                    <span style={{ fontSize: 12, color: TEAL_DARK }}>{elapsed}s</span>
                  </div>
                  {processingRooms.map((room, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: '1px solid rgba(29,158,117,0.15)' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2.5"><polyline points="2,5 4,7 8,3"/></svg>
                      </div>
                      <span style={{ fontSize: 13, color: TEAL_DARK }}>{room.name}</span>
                    </div>
                  ))}
                </div>
                <a href={docxUrl} download={docxName} style={{ display: 'block', width: '100%', padding: 13, borderRadius: 10, background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, textAlign: 'center', textDecoration: 'none', marginBottom: 10, boxSizing: 'border-box' }}>↓ Download {docxName}</a>
                <button onClick={closeConvert} style={{ width: '100%', padding: 11, borderRadius: 10, border: \`1px solid \${BORDER}\`, background: 'transparent', color: MUTED, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>Close</button>
              </div>
            )}`;

if (c.includes(oldDone)) {
  c = c.replace(oldDone, newDone);
  console.log('Replaced done state');
} else {
  console.log('Pattern not found - searching for partial match...');
  const idx = c.indexOf("convertState === 'done' && docxUrl");
  console.log('Found at index:', idx);
}

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
