const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// 1. Add mobile detection hook at the top of the Dashboard component
const mobileHook = `  const [isMobile, setIsMobile] = React.useState(false)
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const [showMobileNav, setShowMobileNav] = React.useState(false)

`;

c = c.replace(
  "  const [page, setPage] = useState('dashboard')",
  mobileHook + "  const [page, setPage] = useState('dashboard')"
);

// 2. Make the main layout responsive - sidebar vs bottom nav
// Find the main layout wrapper and make it responsive
c = c.replace(
  '<div style={{ display: \'flex\', height: \'100vh\', fontFamily: "\'Plus Jakarta Sans\', sans-serif", background: BG, color: TEXT }}>',
  '<div style={{ display: \'flex\', flexDirection: isMobile ? \'column\' : \'row\', height: \'100vh\', fontFamily: "\'Plus Jakarta Sans\', sans-serif", background: BG, color: TEXT }}>'
);

// 3. Make sidebar responsive - hide on mobile, show bottom nav instead
c = c.replace(
  '<nav style={{ width: 220, background: SURFACE, borderRight: `1px solid ${BORDER}`, display: \'flex\', flexDirection: \'column\', flexShrink: 0, overflow: \'hidden\' }}>',
  '<nav style={{ width: isMobile ? \'100%\' : 220, height: isMobile ? \'auto\' : \'100vh\', background: SURFACE, borderRight: isMobile ? \'none\' : `1px solid ${BORDER}`, borderBottom: isMobile ? `1px solid ${BORDER}` : \'none\', display: isMobile ? \'none\' : \'flex\', flexDirection: \'column\', flexShrink: 0, overflow: \'hidden\', order: isMobile ? 2 : 0 }}>'
);

// 4. Make main content area scroll properly on mobile
c = c.replace(
  '<main style={{ flex: 1, display: \'flex\', flexDirection: \'column\', overflow: \'hidden\' }}>',
  '<main style={{ flex: 1, display: \'flex\', flexDirection: \'column\', overflow: \'hidden\', minWidth: 0 }}>'
);

// 5. Make stats grid responsive
c = c.replace(
  "gridTemplateColumns: 'repeat(5,minmax(0,1fr))'",
  "gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(5,minmax(0,1fr))'"
);

// 6. Make billing grid responsive
c = c.replace(
  "gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20",
  "gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, marginBottom: 20"
);

// 7. Add mobile bottom nav after the main closing tag
const mobileNav = `
      {isMobile && (
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: SURFACE, borderTop: \`1px solid \${BORDER}\`, display: 'flex', zIndex: 100 }}>
          {navItems.slice(0, 5).map(item => (
            <button key={item.id} onClick={() => setPage(item.id)} style={{ flex: 1, padding: '10px 4px 8px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={page === item.id ? TEAL : HINT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
              <span style={{ fontSize: 9, color: page === item.id ? TEAL : HINT, fontWeight: page === item.id ? 600 : 400 }}>{item.label}</span>
            </button>
          ))}
        </nav>
      )}`;

// Add mobile nav before the convert modal
c = c.replace(
  '{/* CONVERT MODAL */}',
  mobileNav + '\n      {/* CONVERT MODAL */}'
);

// 8. Add padding bottom on mobile so content isn't hidden behind bottom nav
c = c.replace(
  '<div style={{ flex: 1, overflowY: \'auto\', padding: 32 }}>',
  '<div style={{ flex: 1, overflowY: \'auto\', padding: isMobile ? 16 : 32, paddingBottom: isMobile ? 80 : 32 }}>'
);

// 9. Make tables scrollable on mobile
c = c.replace(
  '<table style={{ width: \'100%\', borderCollapse: \'collapse\' }}>',
  '<table style={{ width: \'100%\', borderCollapse: \'collapse\', minWidth: isMobile ? 600 : \'auto\' }}>'
);

// 10. Make auth page responsive
let auth = fs.readFileSync('app/auth/page.tsx', 'utf8');
auth = auth.replace(
  "display: 'grid', gridTemplateColumns: '1fr 1fr'",
  "display: 'grid', gridTemplateColumns: 'var(--auth-cols, 1fr 1fr)'"
);
// Add responsive style
auth = auth.replace(
  '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans',
  '<style>{`@media(max-width:768px){:root{--auth-cols:1fr}.auth-left{display:none!important}}`}</style>\n      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans'
);
fs.writeFileSync('app/auth/page.tsx', auth);

// Check key changes
const checks = [
  ['isMobile hook', 'const [isMobile, setIsMobile]'],
  ['Responsive flex direction', "isMobile ? 'column' : 'row'"],
  ['Mobile bottom nav', 'position: \'fixed\', bottom: 0'],
  ['Stats grid responsive', "isMobile ? 'repeat(2,1fr)'"],
  ['Padding bottom mobile', 'isMobile ? 80 : 32'],
];
checks.forEach(([name, search]) => {
  console.log(name + ':', c.includes(search) ? '✅' : '❌');
});

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
