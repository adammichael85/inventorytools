const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

const old = `<a href="#" style={{ fontSize: 12, color: TEAL, textDecoration: 'none' }}>View all →</a>`;
const newBtn = `<button onClick={() => setPage('reports')} style={{ fontSize: 12, color: TEAL, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>View all →</button>`;

if (c.includes(old)) {
  c = c.replace(old, newBtn);
  console.log('Fixed view all button ✅');
} else {
  console.log('Pattern not found ❌');
  const idx = c.indexOf('View all');
  console.log('Context:', JSON.stringify(c.slice(idx - 50, idx + 100)));
}

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
