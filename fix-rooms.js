const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

const oldText = `>Conversion complete!</p>
                  <p style={{ fontSize: 13, color: MUTED }}>{processingRooms.length} rooms extracted in {elapsed}s</p>
                </div>`;

const newText = `>Conversion complete!</p>
                  <p style={{ fontSize: 13, color: MUTED }}>{processingRooms.length} rooms in {elapsed}s</p>
                  <div style={{ marginTop: 12 }}>
                    {processingRooms.map((room, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid rgba(29,158,117,0.15)' }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2.5"><polyline points="2,5 4,7 8,3"/></svg>
                        </div>
                        <span style={{ fontSize: 12, color: TEAL_DARK }}>{room.name}</span>
                      </div>
                    ))}
                  </div>
                </div>`;

if (c.includes(oldText)) {
  c = c.replace(oldText, newText);
  console.log('Fixed!');
} else {
  console.log('Pattern not found');
}

fs.writeFileSync('app/dashboard/page.tsx', c);
