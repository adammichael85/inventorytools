const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Change 10 mins to 20 mins
c = c.replace(
  '}, 10 * 60 * 1000)',
  '}, 20 * 60 * 1000)'
);

// Replace silent signout with popup then signout
c = c.replace(
  `timer = setTimeout(() => {
        supabase.auth.signOut().then(() => { window.location.href = '/auth' })
      }, 20 * 60 * 1000)`,
  `timer = setTimeout(() => {
        supabase.auth.signOut().then(() => { window.location.href = '/auth?reason=inactivity' })
      }, 20 * 60 * 1000)`
);

// Add inactivity message on auth page
let auth = fs.readFileSync('app/auth/page.tsx', 'utf8');
auth = auth.replace(
  "const [message, setMessage] = useState('')",
  `const [message, setMessage] = useState('')
  const [inactiveMsg, setInactiveMsg] = useState(false)
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('reason=inactivity')) {
      setInactiveMsg(true)
    }
  }, [])`
);

// Add the import for React if not there
if (!auth.includes("import React")) {
  auth = auth.replace("'use client'", "'use client'\nimport React from 'react'");
}

// Add the banner after the error/message area
auth = auth.replace(
  '{error && <div style={{ background: \'#FEE2E2\'',
  `{inactiveMsg && <div style={{ background: '#FFF8E1', border: '1px solid #FFD54F', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#7B5E00', marginBottom: 16 }}>⏱ You have been logged out due to inactivity. Please sign in again.</div>}
            {error && <div style={{ background: '#FEE2E2'`
);

const checks = [
  ['20 mins', '20 * 60 * 1000'],
  ['inactivity redirect', 'reason=inactivity'],
  ['inactiveMsg state', 'inactiveMsg'],
];
checks.forEach(([name, search]) => {
  console.log(name + ':', c.includes(search) || auth.includes(search) ? '✅' : '❌');
});

fs.writeFileSync('app/dashboard/page.tsx', c);
fs.writeFileSync('app/auth/page.tsx', auth);
console.log('done');
