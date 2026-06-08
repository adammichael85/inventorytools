const fs = require('fs');

// The logo SVG as a reusable inline component
const logoSVG = `<svg width="SIZE" height="SIZE" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="120" height="120" rx="26" fill="#1D9E75"/>
  <rect x="8" y="10" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
  <rect x="8" y="36" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
  <rect x="8" y="62" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
  <rect x="8" y="88" width="24" height="20" rx="5" fill="white" opacity="0.12"/>
  <rect x="38" y="10" width="74" height="20" rx="5" fill="white" opacity="0.12"/>
  <rect x="38" y="36" width="56" height="20" rx="5" fill="white" opacity="0.12"/>
  <rect x="38" y="62" width="64" height="20" rx="5" fill="white" opacity="0.12"/>
  <rect x="38" y="88" width="44" height="20" rx="5" fill="white" opacity="0.08"/>
  <path d="M30 62 L50 84 L90 40" stroke="white" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// 1. Update dashboard sidebar logo
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

const oldSidebarLogo = `<div style={{ width: 34, height: 34, background: TEAL, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h6M7 16h8"/></svg>
          </div>`;

const newSidebarLogo = `<svg width="34" height="34" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="120" height="120" rx="26" fill="#1D9E75"/>
            <rect x="8" y="10" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
            <rect x="8" y="36" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
            <rect x="8" y="62" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
            <rect x="8" y="88" width="24" height="20" rx="5" fill="white" opacity="0.12"/>
            <rect x="38" y="10" width="74" height="20" rx="5" fill="white" opacity="0.12"/>
            <rect x="38" y="36" width="56" height="20" rx="5" fill="white" opacity="0.12"/>
            <rect x="38" y="62" width="64" height="20" rx="5" fill="white" opacity="0.12"/>
            <rect x="38" y="88" width="44" height="20" rx="5" fill="white" opacity="0.08"/>
            <path d="M30 62 L50 84 L90 40" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>`;

if (c.includes(oldSidebarLogo)) {
  c = c.replace(oldSidebarLogo, newSidebarLogo);
  console.log('Sidebar logo updated ✅');
} else {
  console.log('Sidebar logo pattern not found ❌');
}

// Also update mobile top bar logo
const oldMobileLogo = `<div style={{ width: 30, height: 30, background: '#1D9E75', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h6M7 16h8"/></svg>
              </div>`;

const newMobileLogo = `<svg width="30" height="30" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                <rect width="120" height="120" rx="26" fill="#1D9E75"/>
                <rect x="8" y="10" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
                <rect x="8" y="36" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
                <rect x="8" y="62" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
                <rect x="38" y="10" width="74" height="20" rx="5" fill="white" opacity="0.12"/>
                <rect x="38" y="36" width="56" height="20" rx="5" fill="white" opacity="0.12"/>
                <path d="M30 62 L50 84 L90 40" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>`;

if (c.includes(oldMobileLogo)) {
  c = c.replace(oldMobileLogo, newMobileLogo);
  console.log('Mobile top bar logo updated ✅');
} else {
  console.log('Mobile logo pattern not found ❌');
}

fs.writeFileSync('app/dashboard/page.tsx', c);

// 2. Update auth page logo
let auth = fs.readFileSync('app/auth/page.tsx', 'utf8');

const oldAuthLogo = `<div style={{ width: 34, height: 34, background: T, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h6M7 16h8"/></svg>
        </div>`;

const newAuthLogo = `<svg width="34" height="34" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="120" height="120" rx="26" fill="#1D9E75"/>
          <rect x="8" y="10" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
          <rect x="8" y="36" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
          <rect x="8" y="62" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
          <rect x="8" y="88" width="24" height="20" rx="5" fill="white" opacity="0.12"/>
          <rect x="38" y="10" width="74" height="20" rx="5" fill="white" opacity="0.12"/>
          <rect x="38" y="36" width="56" height="20" rx="5" fill="white" opacity="0.12"/>
          <rect x="38" y="62" width="64" height="20" rx="5" fill="white" opacity="0.12"/>
          <rect x="38" y="88" width="44" height="20" rx="5" fill="white" opacity="0.08"/>
          <path d="M30 62 L50 84 L90 40" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>`;

if (auth.includes(oldAuthLogo)) {
  auth = auth.replace(oldAuthLogo, newAuthLogo);
  console.log('Auth page logo updated ✅');
} else {
  console.log('Auth logo pattern not found ❌');
}

fs.writeFileSync('app/auth/page.tsx', auth);

// 3. Update home page logo
let home = fs.readFileSync('app/page.tsx', 'utf8');

const oldHomeLogo = `<div style={{ width: 34, height: 34, background: '#1D9E75', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h6M7 16h8"/></svg>
        </div>`;

const newHomeLogo = `<svg width="34" height="34" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="120" height="120" rx="26" fill="#1D9E75"/>
          <rect x="8" y="10" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
          <rect x="8" y="36" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
          <rect x="8" y="62" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
          <rect x="8" y="88" width="24" height="20" rx="5" fill="white" opacity="0.12"/>
          <rect x="38" y="10" width="74" height="20" rx="5" fill="white" opacity="0.12"/>
          <rect x="38" y="36" width="56" height="20" rx="5" fill="white" opacity="0.12"/>
          <rect x="38" y="62" width="64" height="20" rx="5" fill="white" opacity="0.12"/>
          <rect x="38" y="88" width="44" height="20" rx="5" fill="white" opacity="0.08"/>
          <path d="M30 62 L50 84 L90 40" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>`;

if (home.includes(oldHomeLogo)) {
  home = home.replace(oldHomeLogo, newHomeLogo);
  console.log('Home page logo updated ✅');
} else {
  console.log('Home logo pattern not found ❌');
}

fs.writeFileSync('app/page.tsx', home);

// 4. Create favicon SVG
const faviconSVG = `<svg width="32" height="32" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="120" height="120" rx="26" fill="#1D9E75"/>
  <rect x="8" y="10" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
  <rect x="8" y="36" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
  <rect x="8" y="62" width="24" height="20" rx="5" fill="white" opacity="0.18"/>
  <rect x="8" y="88" width="24" height="20" rx="5" fill="white" opacity="0.12"/>
  <rect x="38" y="10" width="74" height="20" rx="5" fill="white" opacity="0.12"/>
  <rect x="38" y="36" width="56" height="20" rx="5" fill="white" opacity="0.12"/>
  <rect x="38" y="62" width="64" height="20" rx="5" fill="white" opacity="0.12"/>
  <rect x="38" y="88" width="44" height="20" rx="5" fill="white" opacity="0.08"/>
  <path d="M30 62 L50 84 L90 40" stroke="white" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

fs.writeFileSync('public/favicon.svg', faviconSVG);
console.log('Favicon SVG created ✅');

// 5. Update layout to use SVG favicon
let layout = fs.readFileSync('app/layout.tsx', 'utf8');
if (layout.includes('favicon.ico')) {
  layout = layout.replace(
    "rel: 'icon', url: '/favicon.ico'",
    "rel: 'icon', url: '/favicon.svg', type: 'image/svg+xml'"
  );
  fs.writeFileSync('app/layout.tsx', layout);
  console.log('Layout favicon updated ✅');
} else {
  console.log('Layout favicon — check manually');
}

console.log('done');
