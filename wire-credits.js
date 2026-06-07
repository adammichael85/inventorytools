const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Add credits and userName state
c = c.replace(
  "const [userEmail, setUserEmail] = useState('')\n  const [accessToken, setAccessToken] = useState('')",
  "const [userEmail, setUserEmail] = useState('')\n  const [accessToken, setAccessToken] = useState('')\n  const [credits, setCredits] = useState(0)\n  const [userName, setUserName] = useState('')"
);

// Load credits and name from profile after session
c = c.replace(
  "setUserEmail(data.session.user.email || '')\n        setAccessToken(data.session.access_token)",
  "setUserEmail(data.session.user.email || '')\n        setAccessToken(data.session.access_token)\n        supabase.from('profiles').select('credits, full_name').eq('id', data.session.user.id).single().then(({ data: profile }) => {\n          if (profile) {\n            setCredits(profile.credits || 0)\n            setUserName(profile.full_name || data.session.user.email || '')\n          }\n        })"
);

// Replace hardcoded 17 credits with real credits
c = c.replace(/17 credits remaining/g, '{credits} credits remaining');
c = c.replace(/£3\.50\) · 17 remaining/g, "£3.50) · {credits} remaining");
c = c.replace(/1 credit \(£3\.50\) · 17 remaining/g, "1 credit (£3.50) · {credits} remaining");

// Replace hardcoded Jane Smith with real name
c = c.replace(
  ">{userEmail.slice(0,2).toUpperCase() || 'U'}</div>\n            <div style={{ overflow: 'hidden' }}>\n              <p style={{ fontSize: 12, fontWeight: 600, color: TEXT, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</p>",
  ">{(userName || userEmail).slice(0,2).toUpperCase() || 'U'}</div>\n            <div style={{ overflow: 'hidden' }}>\n              <p style={{ fontSize: 12, fontWeight: 600, color: TEXT, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName || userEmail}</p>"
);

// Also reload credits after a conversion saves
c = c.replace(
  "loadConversions(data.session.access_token)",
  "loadConversions(data.session.access_token)\n        supabase.from('profiles').select('credits').eq('id', data.session.user.id).single().then(({ data: p }) => { if (p) setCredits(p.credits || 0) })"
);

// Verify
const checks = [
  ['credits state', "const [credits, setCredits]"],
  ['credits display', '{credits} credits remaining'],
  ['userName state', "const [userName, setUserName]"],
];
checks.forEach(([name, search]) => {
  console.log(name + ':', c.includes(search) ? '✅' : '❌');
});

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
