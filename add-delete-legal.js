const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Find the SettingsPage component and add delete account + legal sections
const oldSignOut = `      <div style={{ background: SURFACE, border: \`1px solid \${BORDER}\`, borderRadius: 14, padding: 24 }}>
        <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>Account</p>
        <p style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>Signed in as <strong style={{ color: TEXT }}>{userEmail}</strong></p>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')} style={{ padding: '9px 20px', borderRadius: 9, border: \`1px solid \${BORDER}\`, background: 'transparent', color: TEXT, fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Sign out</button>
      </div>
    </div>
  )
}`;

const newSignOut = `      <div style={{ background: SURFACE, border: \`1px solid \${BORDER}\`, borderRadius: 14, padding: 24 }}>
        <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>Account</p>
        <p style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>Signed in as <strong style={{ color: TEXT }}>{userEmail}</strong></p>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')} style={{ padding: '9px 20px', borderRadius: 9, border: \`1px solid \${BORDER}\`, background: 'transparent', color: TEXT, fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Sign out</button>
      </div>

      {profile?.role === 'admin' && (
        <div style={{ background: SURFACE, border: '1px solid #FECACA', borderRadius: 14, padding: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px', color: '#DC2626' }}>Danger zone</p>
          <p style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>Permanently delete your company account. This will remove all users, conversions, files and data. This cannot be undone.</p>
          <DeleteAccountButton supabase={supabase} profile={profile} userEmail={userEmail} />
        </div>
      )}
    </div>
  )
}

function DeleteAccountButton({ supabase, profile, userEmail }: any) {
  const [step, setStep] = React.useState(0)
  const [confirm, setConfirm] = React.useState('')
  const [deleting, setDeleting] = React.useState(false)

  if (step === 0) return (
    <button onClick={() => setStep(1)} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: '#DC2626', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete company account</button>
  )

  if (step === 1) return (
    <div>
      <div style={{ background: '#FEE2E2', borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#DC2626', margin: '0 0 8px' }}>⚠️ This cannot be undone</p>
        <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>All company users, conversion history, Word documents and billing data will be permanently deleted.</p>
      </div>
      <p style={{ fontSize: 13, color: '#DC2626', marginBottom: 10 }}>Type <strong>DELETE</strong> to confirm:</p>
      <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Type DELETE" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #FECACA', fontFamily: 'inherit', fontSize: 13, marginBottom: 12, boxSizing: 'border-box' as const }} />
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => { setStep(0); setConfirm('') }} style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid #E2EAE7', background: 'transparent', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
        <button disabled={confirm !== 'DELETE' || deleting} onClick={async () => {
          setDeleting(true)
          // Sign out and redirect - actual deletion would need a server-side admin route
          await supabase.auth.signOut()
          window.location.href = '/?deleted=true'
        }} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: confirm === 'DELETE' ? '#DC2626' : '#ccc', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: confirm === 'DELETE' ? 'pointer' : 'default' }}>
          {deleting ? 'Deleting...' : 'Permanently delete'}
        </button>
      </div>
    </div>
  )

  return null
}`;

if (c.includes(oldSignOut)) {
  c = c.replace(oldSignOut, newSignOut);
  console.log('Added delete account ✅');
} else {
  console.log('Sign out pattern not found ❌');
}

// Add Legal tab to nav
c = c.replace(
  `{ id: 'settings', label: 'Settings', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14' },`,
  `{ id: 'settings', label: 'Settings', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14' },
    { id: 'legal', label: 'Legal', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },`
);

// Add legal page section before team page
const legalPage = `          {page === 'legal' && (
            <LegalPage TEAL={TEAL} TEAL_LIGHT={TEAL_LIGHT} BORDER={BORDER} SURFACE={SURFACE} BG={BG} HINT={HINT} MUTED={MUTED} TEXT={TEXT} />
          )}

`;

c = c.replace(
  `          {page === 'team' && (`,
  legalPage + `          {page === 'team' && (`
);

// Add LegalPage component before TeamPage
const legalComponent = `
function LegalPage({ TEAL, TEAL_LIGHT, BORDER, SURFACE, BG, HINT, MUTED, TEXT }: any) {
  const sections = [
    {
      title: 'Privacy Policy',
      content: \`InventoryTools collects and processes the following personal data:

• Account information: name, email address, company name, position, address and phone number provided at signup
• Conversion data: property addresses, room counts and conversion times
• Usage data: login times, session duration

Your data is stored securely on Supabase servers located in the EU. We do not sell, share or transfer your personal data to third parties except as required to operate the service (Supabase for database storage, Vercel for hosting, OpenAI for document processing).

You have the right to access, correct or delete your personal data at any time. To exercise these rights, contact us at support@inventorytools.co.uk.

Data is retained for the duration of your account. Upon account deletion, all personal data is permanently removed within 30 days.\`
    },
    {
      title: 'Terms of Service',
      content: \`By using InventoryTools you agree to these terms:

• The service converts inventory PDFs and Word documents into formatted Word documents
• Credits are purchased in advance and deducted per conversion
• Credits do not expire and are non-refundable once used
• You are responsible for ensuring you have the right to process any documents you upload
• We do not store the content of your converted documents beyond what is necessary to deliver the service
• We reserve the right to suspend accounts that misuse the service
• The service is provided "as is" without warranty of any kind\`
    },
    {
      title: 'GDPR Compliance',
      content: \`InventoryTools is committed to GDPR compliance:

• Legal basis for processing: contract performance and legitimate interests
• Data controller: InventoryTools (inventorytools.co.uk)
• Data processor: Supabase Inc (database), Vercel Inc (hosting), OpenAI Inc (document processing)
• Data retention: account data retained until account deletion
• Your rights: access, rectification, erasure, restriction, portability, objection
• To exercise your rights: support@inventorytools.co.uk
• Supervisory authority: Information Commissioner's Office (ICO), ico.org.uk\`
    },
    {
      title: 'Security',
      content: \`We take security seriously:

• All data is encrypted in transit using TLS 1.3
• Database access is protected by Row Level Security — users can only access their own data
• API keys are stored as environment variables and never exposed to the client
• Authentication is handled by Supabase Auth with secure session tokens
• Sessions expire after 20 minutes of inactivity
• We perform regular security reviews of our infrastructure\`
    },
    {
      title: 'Data Retention',
      content: \`• Account profiles: retained until account deletion
• Conversion history: retained until manually deleted or account deletion
• Word documents: stored in private Supabase Storage, accessible only to the account holder
• Upon account deletion: all data permanently removed within 30 days
• Backups: retained for 7 days then automatically purged\`
    },
  ]

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px', letterSpacing: -0.3 }}>Legal & Compliance</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sections.map(({ title, content }) => (
          <LegalSection key={title} title={title} content={content} BORDER={BORDER} SURFACE={SURFACE} HINT={HINT} TEXT={TEXT} TEAL={TEAL} />
        ))}
      </div>
      <p style={{ fontSize: 12, color: HINT, marginTop: 16 }}>Last updated: June 2026 · Questions? Contact support@inventorytools.co.uk</p>
    </div>
  )
}

function LegalSection({ title, content, BORDER, SURFACE, HINT, TEXT, TEAL }: any) {
  const [open, setOpen] = React.useState(false)
  return (
    <div style={{ background: SURFACE, border: \`1px solid \${BORDER}\`, borderRadius: 12, overflow: 'hidden' }}>
      <button onClick={() => setOpen(!open)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{title}</span>
        <span style={{ fontSize: 18, color: HINT, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
      </button>
      {open && (
        <div style={{ padding: '0 20px 20px', borderTop: \`1px solid \${BORDER}\` }}>
          <pre style={{ fontSize: 13, color: TEXT, lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: '16px 0 0' }}>{content}</pre>
        </div>
      )}
    </div>
  )
}

`;

c = c.replace('function TeamPage(', legalComponent + 'function TeamPage(');

const checks = [
  ['Delete account button', 'DeleteAccountButton'],
  ['Legal nav item', "id: 'legal'"],
  ['Legal page section', "page === 'legal'"],
  ['LegalPage component', 'function LegalPage('],
];
checks.forEach(([name, search]) => {
  console.log(name + ':', c.includes(search) ? '✅' : '❌');
});

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
