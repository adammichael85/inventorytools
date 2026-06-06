const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// 1. Fix timer format - mins and seconds
c = c.replace(
  `<span style={{ fontSize: 13, fontWeight: 600, color: '#0F6E56' }}>⏱ {elapsed}s</span>`,
  `<span style={{ fontSize: 13, fontWeight: 600, color: '#0F6E56' }}>⏱ {elapsed >= 60 ? Math.floor(elapsed/60) + 'm ' + (elapsed%60) + 's' : elapsed + 's'}</span>`
);

// 2. Add progress bar under the processing header
c = c.replace(
  `                {processingRooms.map((room, i) => (`,
  `                <div style={{ height: 4, borderRadius: 20, background: 'rgba(29,158,117,0.2)', overflow: 'hidden', marginBottom: 14 }}>
                  <div style={{ height: '100%', borderRadius: 20, background: '#1D9E75', animation: 'progress 2s ease-in-out infinite' }} />
                </div>
                {processingRooms.map((room, i) => (`
);

// 3. Add progress animation to keyframes
c = c.replace(
  '`@keyframes spin { to { transform: rotate(360deg) } }`',
  '`@keyframes spin { to { transform: rotate(360deg) } } @keyframes progress { 0% { width: 5%; margin-left: 0% } 50% { width: 60%; margin-left: 20% } 100% { width: 5%; margin-left: 100% } }`'
);

// 4. Auto reload after download click
c = c.replace(
  `<a href={docxUrl} download={docxName} style={{ display: 'block', width: '100%', padding: 13, borderRadius: 10, background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, textAlign: 'center', textDecoration: 'none', marginBottom: 10, boxSizing: 'border-box' }}>↓ Download {docxName}</a>`,
  `<a href={docxUrl} download={docxName} onClick={() => setTimeout(() => window.location.reload(), 2000)} style={{ display: 'block', width: '100%', padding: 13, borderRadius: 10, background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, textAlign: 'center', textDecoration: 'none', marginBottom: 10, boxSizing: 'border-box' }}>↓ Download {docxName}</a>`
);

// Check all changes applied
const checks = [
  ['Timer format', 'elapsed >= 60'],
  ['Progress bar', 'animation: \'progress 2s'],
  ['Progress keyframes', '@keyframes progress'],
  ['Auto reload', 'window.location.reload'],
];

checks.forEach(([name, search]) => {
  console.log(name + ':', c.includes(search) ? '✅' : '❌ NOT FOUND');
});

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
