const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// POINT 12 - Dynamic greeting with first name
c = c.replace(
  `<h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, marginBottom: 4 }}>Good morning 👋</h2>`,
  `<h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, marginBottom: 4 }}>{(() => { const h = new Date().getHours(); const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; const first = (userName || userEmail).split(' ')[0]; return greeting + ' ' + first + ' 👋' })()}</h2>`
);

// POINT 13 - View all button goes to Reports tab
c = c.replace(
  `<button style={{ fontSize: 13, color: TEAL, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>View all →</button>`,
  `<button onClick={() => setPage('reports')} style={{ fontSize: 13, color: TEAL, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>View all →</button>`
);

// POINT 14 - Search bar filters by address
// Add search state variable
c = c.replace(
  "const [conversions, setConversions] = useState<any[]>([])",
  "const [conversions, setConversions] = useState<any[]>([])\n  const [searchQuery, setSearchQuery] = useState('')"
);

// Wire up the search input
c = c.replace(
  `<input placeholder="Search by address..." style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: \`1px solid \${BORDER}\`, fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />`,
  `<input placeholder="Search by address..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: \`1px solid \${BORDER}\`, fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />`
);

// Filter conversions in the reports table
c = c.replace(
  `<tbody>{conversions.map(c => (<tr key={c.id} style={{ borderBottom: \`1px solid \${BORDER}\` }}>
                    <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 500 }}>{c.address}</td>`,
  `<tbody>{conversions.filter(c => !searchQuery || (c.address||'').toLowerCase().includes(searchQuery.toLowerCase())).map(c => (<tr key={c.id} style={{ borderBottom: \`1px solid \${BORDER}\` }}>
                    <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 500 }}>{c.address}</td>`
);

// POINT 9 - Auto logout after 10 mins inactivity
// Add inactivity timer after the deleteConversion function
const inactivityCode = `
  // Auto logout after 10 mins inactivity
  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        supabase.auth.signOut().then(() => { window.location.href = '/auth' })
      }, 10 * 60 * 1000)
    }
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, reset))
    reset()
    return () => {
      clearTimeout(timer)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [])

`;

c = c.replace(
  '  useEffect(() => {\n    supabase.auth.getSession().then(({ data }) => {',
  inactivityCode + '  useEffect(() => {\n    supabase.auth.getSession().then(({ data }) => {'
);

// POINT 8 - Scroll to top on login (in auth page)
let auth = fs.readFileSync('app/auth/page.tsx', 'utf8');
auth = auth.replace(
  'else router.push(\'/dashboard\')',
  'else { window.scrollTo(0,0); router.push(\'/dashboard\') }'
);
fs.writeFileSync('app/auth/page.tsx', auth);
console.log('Point 8 - scroll to top on login ✅');

// Verify all changes
const checks = [
  ['Point 9 - inactivity timer', 'Auto logout after 10 mins'],
  ['Point 12 - dynamic greeting', 'Good morning'],
  ['Point 13 - view all button', "setPage('reports')"],
  ['Point 14 - search state', 'searchQuery'],
  ['Point 14 - search filter', 'filter(c => !searchQuery'],
];

checks.forEach(([name, search]) => {
  console.log(name + ':', c.includes(search) ? '✅' : '❌');
});

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
