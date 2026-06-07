const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// 1. Replace the simple useEffect with one that loads credits, name and conversions
const oldEffect = `  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setUserEmail(data.session.user.email || '')
      else window.location.href = '/auth'
    })
  }, [])`;

const newEffect = `  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/auth'; return }
      const session = data.session
      setUserEmail(session.user.email || '')
      setAccessToken(session.access_token)
      // Load profile (credits + name)
      supabase.from('profiles').select('credits, full_name').eq('id', session.user.id).single().then(({ data: profile }) => {
        if (profile) {
          setCredits(profile.credits || 0)
          setUserName(profile.full_name || session.user.email || '')
        }
      })
      // Load conversions
      supabase.from('conversions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(50).then(({ data: convs }) => {
        if (convs) setConversions(convs)
      })
    })
  }, [])`;

if (c.includes(oldEffect)) {
  c = c.replace(oldEffect, newEffect);
  console.log('Fixed useEffect ✅');
} else {
  console.log('useEffect pattern not found ❌');
}

// 2. Block conversion if no credits - find the convert button
const oldBtn = `<button onClick={startConvert} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>Convert now — 1 credit (£3.50)</button>`;

const newBtn = `{credits <= 0 ? (
                  <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 10, padding: 14, textAlign: 'center', marginBottom: 10 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', margin: '0 0 6px' }}>No credits remaining</p>
                    <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>Purchase credits to continue converting.</p>
                  </div>
                ) : (
                  <button onClick={startConvert} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>Convert now — 1 credit (£3.50)</button>
                )}`;

if (c.includes(oldBtn)) {
  c = c.replace(oldBtn, newBtn);
  console.log('Added credit check ✅');
} else {
  console.log('Convert button not found ❌');
  console.log('Looking for button...');
  const idx = c.indexOf('Convert now');
  if (idx > -1) console.log('Found at:', c.slice(idx-50, idx+100));
}

// 3. After save-conversion, reload credits and conversions
const oldSaveEnd = `    })
  })\n      setConvertState('done')`;

// Find the fetch save-conversion and add reload after
const saveIdx = c.indexOf("fetch('/api/save-conversion'");
if (saveIdx > -1) {
  // Find the closing of that fetch
  const thenIdx = c.indexOf('.then(() => {', saveIdx);
  const afterFetch = c.indexOf('\n      setConvertState', saveIdx);
  
  if (afterFetch > -1 && (thenIdx === -1 || thenIdx > afterFetch)) {
    // No .then yet, add one before setConvertState
    c = c.slice(0, afterFetch) + `
      .then(() => {
        supabase.auth.getSession().then(({ data }) => {
          if (data.session) {
            supabase.from('profiles').select('credits').eq('id', data.session.user.id).single().then(({ data: p }) => { if (p) setCredits(p.credits || 0) })
            supabase.from('conversions').select('*').eq('user_id', data.session.user.id).order('created_at', { ascending: false }).limit(50).then(({ data: convs }) => { if (convs) setConversions(convs) })
          }
        })
      })` + c.slice(afterFetch);
    console.log('Added reload after save ✅');
  } else {
    console.log('Could not add reload after save ❌');
  }
}

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
