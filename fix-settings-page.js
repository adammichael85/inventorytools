const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Replace the entire settings page section
const oldSettings = `          {page === 'settings' && (
            <div style={{ maxWidth: 600 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px' }}>Settings</h2>
              <div style={{ background: SURFACE, border: \`1px solid \${BORDER}\`, borderRadius: 14, padding: 24, marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Account</p>
                <p style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>Signed in as <strong style={{ color: TEXT }}>{userEmail}</strong></p>
                <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')} style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid #E2EAE7', background: 'transparent', color: TEXT, fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Sign out</button>
              </div>
            </div>
          )}`;

const newSettings = `          {page === 'settings' && (
            <SettingsPage supabase={supabase} userEmail={userEmail} TEXT={TEXT} MUTED={MUTED} TEAL={TEAL} BORDER={BORDER} SURFACE={SURFACE} BG={BG} HINT={HINT} />
          )}`;

if (c.includes(oldSettings)) {
  c = c.replace(oldSettings, newSettings);
  console.log('Replaced settings page ✅');
} else {
  console.log('Settings pattern not found ❌');
  const idx = c.indexOf("page === 'settings'");
  console.log('Context:', c.slice(idx, idx + 200));
}

// Add SettingsPage component before the export default
const settingsComponent = `
function SettingsPage({ supabase, userEmail, TEXT, MUTED, TEAL, BORDER, SURFACE, BG, HINT }: any) {
  const [profile, setProfile] = React.useState<any>(null)
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }: any) => {
      if (data.session) {
        supabase.from('profiles').select('*').eq('id', data.session.user.id).single().then(({ data: p }: any) => {
          if (p) setProfile(p)
        })
      }
    })
  }, [])

  async function saveProfile() {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (session && profile) {
      await supabase.from('profiles').update({
        full_name: profile.full_name,
        company_name: profile.company_name,
        company_position: profile.company_position,
        company_address: profile.company_address,
        company_phone: profile.company_phone,
      }).eq('id', session.user.id)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: \`1px solid \${BORDER}\`, fontFamily: 'inherit', fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' as const }
  const labelStyle = { display: 'block' as const, fontSize: 12, fontWeight: 500, marginBottom: 6, color: MUTED }

  if (!profile) return <div style={{ padding: 40, color: MUTED, fontSize: 13 }}>Loading...</div>

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px', letterSpacing: -0.3 }}>Settings</h2>

      <div style={{ background: SURFACE, border: \`1px solid \${BORDER}\`, borderRadius: 14, padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Profile</p>
          <span style={{ fontSize: 11, background: profile.role === 'admin' ? '#E1F5EE' : '#F7F9F8', color: profile.role === 'admin' ? '#085041' : MUTED, padding: '3px 10px', borderRadius: 20, fontWeight: 500, textTransform: 'uppercase' as const }}>{profile.role || 'user'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Full name</label>
            <input value={profile.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input value={userEmail} disabled style={{...inputStyle, background: BG, color: MUTED}} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Company name</label>
            <input value={profile.company_name || ''} onChange={e => setProfile({...profile, company_name: e.target.value})} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Your position</label>
            <input value={profile.company_position || ''} onChange={e => setProfile({...profile, company_position: e.target.value})} style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Company address</label>
          <input value={profile.company_address || ''} onChange={e => setProfile({...profile, company_address: e.target.value})} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Company phone</label>
          <input value={profile.company_phone || ''} onChange={e => setProfile({...profile, company_phone: e.target.value})} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={saveProfile} disabled={saving} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: saving ? '#94AEA6' : TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer' }}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          {saved && <span style={{ fontSize: 13, color: TEAL }}>✓ Saved!</span>}
        </div>
      </div>

      <div style={{ background: SURFACE, border: \`1px solid \${BORDER}\`, borderRadius: 14, padding: 24 }}>
        <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>Account</p>
        <p style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>Signed in as <strong style={{ color: TEXT }}>{userEmail}</strong></p>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')} style={{ padding: '9px 20px', borderRadius: 9, border: \`1px solid \${BORDER}\`, background: 'transparent', color: TEXT, fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Sign out</button>
      </div>
    </div>
  )
}

`;

// Add before export default
c = c.replace('export default function Dashboard()', settingsComponent + 'export default function Dashboard()');

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
