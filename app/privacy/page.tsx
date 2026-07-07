export default function PrivacyPolicy() {
  return (
    <>
      <div style={{ borderBottom: '1px solid #ecebe8', padding: '18px 24px' }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: '#1a1a1a', fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', fontWeight: 600 }}>
          ← Back to InventoryTools
        </a>
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 760, margin: '0 auto', padding: '64px 24px 96px', color: '#1a1a1a', lineHeight: 1.7 }}>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem', fontWeight: 700, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: '#8a8a8a', marginBottom: 48 }}>Last updated: July 2026</p>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.2rem', fontWeight: 700, marginBottom: 12 }}>1. Who we are</h2>
        <p>InventoryTools is trading as InventoryTools (sole trader), United Kingdom.</p>
        <p style={{ marginTop: 12 }}>ICO Registration: <strong>Application pending — number will be published here once confirmed.</strong></p>
        <p style={{ marginTop: 12 }}>For all privacy-related enquiries, please contact us at: <a href="mailto:admin@inventorytools.co.uk" style={{ color: '#fd6a02' }}>admin@inventorytools.co.uk</a></p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.2rem', fontWeight: 700, marginBottom: 12 }}>2. What data we collect</h2>
        <ul style={{ paddingLeft: 24, marginTop: 12 }}>
          <li style={{ marginBottom: 8 }}><strong>Account data:</strong> name, email address, company name, job title, phone number, and company address.</li>
          <li style={{ marginBottom: 8 }}><strong>Inventory report content:</strong> PDF files, Word documents, and audio recordings you upload for conversion. These may contain property addresses and descriptions of property contents.</li>
          <li style={{ marginBottom: 8 }}><strong>Usage data:</strong> conversion history, credits used, timestamps, and conversion results.</li>
          <li style={{ marginBottom: 8 }}><strong>Payment data:</strong> processed via Stripe. We do not store your card details.</li>
          <li style={{ marginBottom: 8 }}><strong>Technical data:</strong> IP address, browser type, device information, and session data.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.2rem', fontWeight: 700, marginBottom: 12 }}>3. How we use your data</h2>
        <ul style={{ paddingLeft: 24 }}>
          <li style={{ marginBottom: 8 }}>To provide the PDF to Word and Audio to Word conversion services.</li>
          <li style={{ marginBottom: 8 }}>To manage your account and company balance.</li>
          <li style={{ marginBottom: 8 }}>To process payments and issue invoices.</li>
          <li style={{ marginBottom: 8 }}>To send transactional emails (account confirmation, password reset, team invites).</li>
          <li style={{ marginBottom: 8 }}>To maintain platform security and prevent abuse.</li>
          <li style={{ marginBottom: 8 }}>To comply with our legal obligations.</li>
        </ul>
        <p style={{ marginTop: 12 }}>We do not use your inventory report content for any purpose other than performing the conversion you requested. We do not sell your data to third parties.</p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.2rem', fontWeight: 700, marginBottom: 12 }}>4. Legal basis for processing</h2>
        <ul style={{ paddingLeft: 24 }}>
          <li style={{ marginBottom: 8 }}><strong>Contract:</strong> processing your uploads and running conversions is necessary to deliver the service.</li>
          <li style={{ marginBottom: 8 }}><strong>Legitimate interests:</strong> security logging, fraud prevention, and platform abuse monitoring.</li>
          <li style={{ marginBottom: 8 }}><strong>Legal obligation:</strong> retaining transaction records for tax and accounting purposes.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.2rem', fontWeight: 700, marginBottom: 12 }}>5. Third-party processors</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: '0.9rem' }}>
          <thead><tr style={{ background: '#f6f5f3' }}>
            <th style={{ padding: '10px 14px', textAlign: 'left', border: '1px solid #ecebe8' }}>Provider</th>
            <th style={{ padding: '10px 14px', textAlign: 'left', border: '1px solid #ecebe8' }}>Purpose</th>
            <th style={{ padding: '10px 14px', textAlign: 'left', border: '1px solid #ecebe8' }}>Location</th>
          </tr></thead>
          <tbody>
            {[['Supabase','Database, authentication, file storage','Ireland (EU)'],['Vercel','Hosting and serverless compute','USA'],['OpenAI','AI processing of PDF text and audio transcription','USA'],['Anthropic','AI processing of PDF content (vision conversion)','USA'],['Stripe','Payment processing','USA'],['Trigger.dev','Background job processing for vision conversions','USA'],['Resend','Transactional email delivery','USA']].map(([p,pu,l]) => (
              <tr key={p}><td style={{ padding: '10px 14px', border: '1px solid #ecebe8', fontWeight: 600 }}>{p}</td><td style={{ padding: '10px 14px', border: '1px solid #ecebe8' }}>{pu}</td><td style={{ padding: '10px 14px', border: '1px solid #ecebe8' }}>{l}</td></tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: 16, fontSize: '0.9rem', color: '#4a4a4a' }}>Data transferred to processors in the USA is covered by Standard Contractual Clauses or equivalent mechanisms under UK GDPR.</p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.2rem', fontWeight: 700, marginBottom: 12 }}>6. Data retention</h2>
        <ul style={{ paddingLeft: 24 }}>
          <li style={{ marginBottom: 8 }}><strong>Conversion records and uploaded files:</strong> retained for the lifetime of your account.</li>
          <li style={{ marginBottom: 8 }}><strong>Transaction records:</strong> retained for 7 years to meet UK tax obligations.</li>
          <li style={{ marginBottom: 8 }}><strong>Account deletion:</strong> your profile, conversions, and uploaded files are permanently deleted. Transaction records are retained for legal compliance.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.2rem', fontWeight: 700, marginBottom: 12 }}>7. Your rights</h2>
        <p>Under UK GDPR you have the right to access, rectify, erase, restrict, object to, and port your personal data. You can delete your account at any time via Account Settings. To exercise any other right, contact <a href="mailto:admin@inventorytools.co.uk" style={{ color: '#fd6a02' }}>admin@inventorytools.co.uk</a>. You may also complain to the ICO at <a href="https://ico.org.uk" style={{ color: '#fd6a02' }}>ico.org.uk</a>.</p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.2rem', fontWeight: 700, marginBottom: 12 }}>8. Security</h2>
        <p>We implement appropriate technical and organisational measures including encrypted connections, access controls, database row-level security, and authentication token verification on all sensitive operations.</p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.2rem', fontWeight: 700, marginBottom: 12 }}>9. Cookies</h2>
        <p>We use session cookies for authentication only. We do not use tracking, advertising, or analytics cookies.</p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.2rem', fontWeight: 700, marginBottom: 12 }}>10. Contact & changes</h2>
        <p>For any privacy questions: <a href="mailto:admin@inventorytools.co.uk" style={{ color: '#fd6a02' }}>admin@inventorytools.co.uk</a></p>
        <p style={{ marginTop: 8 }}>We may update this policy from time to time and will notify registered users of material changes by email.</p>
      </section>

      <div style={{ borderTop: '1px solid #ecebe8', paddingTop: 24, marginTop: 48, fontSize: '0.9rem', color: '#8a8a8a' }}>
        <p>InventoryTools · <a href="mailto:admin@inventorytools.co.uk" style={{ color: '#fd6a02' }}>admin@inventorytools.co.uk</a> · <a href="/" style={{ color: '#fd6a02' }}>inventorytools.co.uk</a></p>
      </div>
      </div>
    </>
  )
}
