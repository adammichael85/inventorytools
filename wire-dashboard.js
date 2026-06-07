const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// 1. Load conversions using supabase directly (not needing accessToken)
const oldLoadConversions = `  async function loadConversions(token: string) {
    const { data } = await supabase.from('conversions').select('*').order('created_at', { ascending: false }).limit(20)
    if (data) setConversions(data)
  }`;

const newLoadConversions = `  async function loadConversions() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase.from('conversions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(50)
    if (data) setConversions(data)
  }`;

if (c.includes(oldLoadConversions)) {
  c = c.replace(oldLoadConversions, newLoadConversions);
  console.log('Fixed loadConversions ✅');
} else {
  console.log('loadConversions pattern not found ❌');
}

// 2. Fix useEffect to call loadConversions without token and load credits/name
const oldEffect = `  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setUserEmail(data.session.user.email || '')
        setAccessToken(data.session.access_token)
        loadConversions(data.session.access_token)
        supabase.from('profiles').select('credits').eq('id', data.session.user.id).single().then(({ data: p }) => { if (p) setCredits(p.credits || 0) })
        supabase.from('profiles').select('credits, full_name').eq('id', data.session.user.id).single().then(({ data: profile }) => {
          if (profile) {
            setCredits(profile.credits || 0)
            setUserName(profile.full_name || data.session.user.email || '')
          }
        })
      }
    })
  }, [])`;

const newEffect = `  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setUserEmail(data.session.user.email || '')
        setAccessToken(data.session.access_token)
        loadConversions()
        supabase.from('profiles').select('credits, full_name').eq('id', data.session.user.id).single().then(({ data: profile }) => {
          if (profile) {
            setCredits(profile.credits || 0)
            setUserName(profile.full_name || data.session.user.email || '')
          }
        })
      }
    })
  }, [])`;

if (c.includes(oldEffect)) {
  c = c.replace(oldEffect, newEffect);
  console.log('Fixed useEffect ✅');
} else {
  console.log('useEffect pattern not found - trying alternative ❌');
  // Try finding and fixing the loadConversions call with token
  c = c.replace('loadConversions(data.session.access_token)', 'loadConversions()');
  console.log('Fixed loadConversions call');
}

// 3. Block conversion if no credits
const oldConvertBtn = `<button onClick={startConvert} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>Convert now — £3.50</button>`;

const newConvertBtn = `{credits <= 0 ? (
                  <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 10, padding: 14, textAlign: 'center', marginBottom: 10 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', margin: '0 0 6px' }}>No credits remaining</p>
                    <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>Purchase more credits to continue converting.</p>
                  </div>
                ) : (
                  <button onClick={startConvert} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>Convert now — £3.50</button>
                )}`;

if (c.includes(oldConvertBtn)) {
  c = c.replace(oldConvertBtn, newConvertBtn);
  console.log('Added credit check ✅');
} else {
  console.log('Convert button pattern not found ❌');
}

// 4. Reload credits after conversion saves
c = c.replace(
  "supabase.auth.getSession().then(({ data: { session } }) => {\n  if (session) {\n    fetch('/api/save-conversion'",
  "supabase.auth.getSession().then(({ data: { session } }) => {\n  if (session) {\n    fetch('/api/save-conversion'"
);

// Reload credits after save
const oldSave = `      })\n    }\n  })\n      setConvertState('done')`;
const newSave = `      }).then(() => {\n        // Reload credits\n        supabase.from('profiles').select('credits').eq('id', session.user.id).single().then(({ data: p }) => { if (p) setCredits(p.credits || 0) })\n        loadConversions()\n      })\n    }\n  })\n      setConvertState('done')`;

if (c.includes(oldSave)) {
  c = c.replace(oldSave, newSave);
  console.log('Added reload after save ✅');
} else {
  console.log('Save pattern not found ❌');
}

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
