const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

const oldTeam = `          {page === 'team' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Team</h2>
                <button style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Invite member</button>
              </div>
              <div style={{ background: SURFACE, border: \`1px solid \${BORDER}\`, borderRadius: 14, overflow: 'hidden' }}>
                {[{name:'Jane Smith',email:'jane@abcinventories.co.uk',role:'Admin',avatar:'JS'},{name:'Sarah Mitchell',email:'sarah@abcinventories.co.uk',role:'Member',avatar:'SM'},{name:'Tom Davies',email:'tom@abcinventories.co.uk',role:'Member',avatar:'TD'}].map((m,i,arr) => (
                  <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: i < arr.length-1 ? \`1px solid \${BORDER}\` : 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: TEAL_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: TEAL_DARK }}>{m.avatar}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{m.name}</p>
                      <p style={{ fontSize: 12, color: HINT, margin: 0 }}>{m.email}</p>
                    </div>
                    <span style={{ fontSize: 12, background: m.role === 'Admin' ? TEAL_LIGHT : BG, color: m.role === 'Admin' ? TEAL_DARK : MUTED, padding: '3px 10px', borderRadius: 20 }}>{m.role}</span>
                  </div>
                ))}
              </div>
            </div>
          )}`;

const newTeam = `          {page === 'team' && (
            <TeamPage supabase={supabase} TEAL={TEAL} TEAL_LIGHT={TEAL_LIGHT} TEAL_DARK={TEAL_DARK} BORDER={BORDER} SURFACE={SURFACE} BG={BG} HINT={HINT} MUTED={MUTED} TEXT={TEXT} />
          )}`;

if (c.includes(oldTeam)) {
  c = c.replace(oldTeam, newTeam);
  console.log('Replaced team page ✅');
} else {
  console.log('Team pattern not found ❌');
}

// Add TeamPage component before SettingsPage
const teamComponent = `
function TeamPage({ supabase, TEAL, TEAL_LIGHT, TEAL_DARK, BORDER, SURFACE, BG, HINT, MUTED, TEXT }: any) {
  const [members, setMembers] = React.useState<any[]>([])
  const [showInvite, setShowInvite] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState('')
  const [inviteSent, setInviteSent] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }: any) => {
      if (data.session) {
        // Get current user's company
        supabase.from('profiles').select('company_name').eq('id', data.session.user.id).single().then(({ data: me }: any) => {
          if (me?.company_name) {
            // Get all team members with same company
            supabase.from('profiles').select('id, full_name, company_position, role, created_at').eq('company_name', me.company_name).order('created_at', { ascending: true }).then(({ data: team }: any) => {
              if (team) setMembers(team)
              setLoading(false)
            })
          } else {
            setLoading(false)
          }
        })
      }
    })
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Team</h2>
        <button onClick={() => setShowInvite(!showInvite)} style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Invite member</button>
      </div>

      {showInvite && (
        <div style={{ background: SURFACE, border: \`1px solid \${BORDER}\`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px' }}>Invite a team member</p>
          <p style={{ fontSize: 13, color: MUTED, margin: '0 0 16px' }}>Share this signup link with your team member. They will be added to your company account automatically.</p>
          <div style={{ background: BG, border: \`1px solid \${BORDER}\`, borderRadius: 8, padding: '10px 14px', fontSize: 13, fontFamily: 'monospace', color: MUTED, marginBottom: 12, wordBreak: 'break-all' as const }}>
            {typeof window !== 'undefined' ? window.location.origin + '/auth' : ''}/auth
          </div>
          <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/auth'); setInviteSent(true); setTimeout(() => setInviteSent(false), 3000) }} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            {inviteSent ? '✓ Copied!' : 'Copy link'}
          </button>
        </div>
      )}

      <div style={{ background: SURFACE, border: \`1px solid \${BORDER}\`, borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: MUTED, fontSize: 13 }}>Loading...</div>
        ) : members.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: MUTED, fontSize: 13 }}>No team members found.</div>
        ) : members.map((m, i) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: i < members.length-1 ? \`1px solid \${BORDER}\` : 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: TEAL_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: TEAL_DARK }}>
              {(m.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{m.full_name || 'Unknown'}</p>
              <p style={{ fontSize: 12, color: HINT, margin: 0 }}>{m.company_position || ''}</p>
            </div>
            <span style={{ fontSize: 12, background: m.role === 'admin' ? TEAL_LIGHT : BG, color: m.role === 'admin' ? TEAL_DARK : MUTED, padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize' as const }}>{m.role || 'user'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

`;

c = c.replace('function SettingsPage(', teamComponent + 'function SettingsPage(');

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
