const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Find the reports page table and wrap it with mobile/desktop conditional
const oldReportsTable = `          {page === 'reports' && (
            <div>
              <div style={{ background: SURFACE, border: \`1px solid \${BORDER}\`, borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: \`1px solid \${BORDER}\`, display: 'flex', gap: 12 }}>
                  <input placeholder="Search by address..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: \`1px solid \${BORDER}\`, fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
                </div>`;

const newReportsTable = `          {page === 'reports' && (
            <div>
              <div style={{ background: SURFACE, border: \`1px solid \${BORDER}\`, borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: \`1px solid \${BORDER}\`, display: 'flex', gap: 12 }}>
                  <input placeholder="Search by address..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: \`1px solid \${BORDER}\`, fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
                </div>
                {isMobile && (
                  <div>
                    {conversions.filter(c => !searchQuery || (c.address||'').toLowerCase().includes(searchQuery.toLowerCase())).map(conv => (
                      <div key={conv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: \`1px solid \${BORDER}\` }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.address}</p>
                          <p style={{ fontSize: 11, color: HINT, margin: 0 }}>{new Date(conv.created_at).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'})} · {conv.rooms} rooms · {conv.converted_by ? conv.converted_by.split(' ').map((n: string, i: number) => i === 0 ? n : n[0]).join(' ') : ''}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          {conv.file_path ? (
                            <button onClick={async () => {
                              const { data } = await supabase.storage.from('documents').createSignedUrl(conv.file_path, 60)
                              if (data?.signedUrl) { const response = await fetch(data.signedUrl); const fileBlob = await response.blob(); const blobUrl = URL.createObjectURL(fileBlob); const a = document.createElement('a'); a.href = blobUrl; a.download = (conv.address||'inventory').replace(/[^a-zA-Z0-9 _-]/g,'').trim()+'.docx'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl) }
                            }} style={{ width: 36, height: 36, borderRadius: 8, background: TEAL_LIGHT, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9,15 12,18 15,15"/></svg>
                            </button>
                          ) : (
                            <div style={{ width: 36, height: 36 }} />
                          )}
                          <button onClick={() => deleteConversion(conv.id, conv.file_path)} style={{ width: 36, height: 36, borderRadius: 8, background: '#FEE2E2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2 2 0 01-2 2H8a2 2 0 01-2-2L5,6"/><path d="M10,11v6M14,11v6"/><path d="M9,6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}`;

if (c.includes(oldReportsTable)) {
  c = c.replace(oldReportsTable, newReportsTable);
  console.log('Added mobile reports list ✅');
} else {
  console.log('Pattern not found ❌');
}

// Hide the desktop table on mobile
c = c.replace(
  '<table style={{ width: \'100%\', borderCollapse: \'collapse\', minWidth: isMobile ? 600 : \'auto\' }}>',
  '<table style={{ width: \'100%\', borderCollapse: \'collapse\', minWidth: isMobile ? 600 : \'auto\', display: isMobile ? \'none\' : \'table\' }}>'
);

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
