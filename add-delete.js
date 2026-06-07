const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Add deleteConversion function after loadConversions useEffect
const oldUseEffect = `  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {`;

const newUseEffect = `  async function deleteConversion(id: string, filePath: string) {
    if (!confirm('Delete this report? This cannot be undone.')) return
    // Delete file from storage
    if (filePath) await supabase.storage.from('documents').remove([filePath])
    // Delete from database
    await supabase.from('conversions').delete().eq('id', id)
    // Reload conversions
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: convs } = await supabase.from('conversions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(50)
      if (convs) setConversions(convs)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {`;

if (c.includes(oldUseEffect)) {
  c = c.replace(oldUseEffect, newUseEffect);
  console.log('Added deleteConversion function ✅');
} else {
  console.log('useEffect pattern not found ❌');
}

// Add trash icon to dashboard table (after the download icon td)
const oldDashDownload = `                          {c.file_path ? (
                            <button onClick={async () => {
                              const { data } = await supabase.storage.from('documents').createSignedUrl(c.file_path, 60)
                              if (data?.signedUrl) { const response = await fetch(data.signedUrl); const fileBlob = await response.blob(); const blobUrl = URL.createObjectURL(fileBlob); const a = document.createElement('a'); a.href = blobUrl; a.download = (c.address || 'inventory').replace(/[^a-zA-Z0-9 _-]/g,'').trim() + '.docx'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl) }
                            }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title="Download Word doc">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9,15 12,18 15,15"/></svg>
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: HINT }}>—</span>
                          )}
                        </td>`;

const newDashDownload = `                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {c.file_path ? (
                              <button onClick={async () => {
                                const { data } = await supabase.storage.from('documents').createSignedUrl(c.file_path, 60)
                                if (data?.signedUrl) { const response = await fetch(data.signedUrl); const fileBlob = await response.blob(); const blobUrl = URL.createObjectURL(fileBlob); const a = document.createElement('a'); a.href = blobUrl; a.download = (c.address || 'inventory').replace(/[^a-zA-Z0-9 _-]/g,'').trim() + '.docx'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl) }
                              }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title="Download">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9,15 12,18 15,15"/></svg>
                              </button>
                            ) : (
                              <span style={{ fontSize: 11, color: HINT, padding: 4 }}>—</span>
                            )}
                            <button onClick={() => deleteConversion(c.id, c.file_path)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title="Delete">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2 2 0 01-2 2H8a2 2 0 01-2-2L5,6"/><path d="M10,11v6M14,11v6"/><path d="M9,6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                            </button>
                          </div>
                        </td>`;

if (c.includes(oldDashDownload)) {
  c = c.replace(oldDashDownload, newDashDownload);
  console.log('Added delete to dashboard table ✅');
} else {
  console.log('Dashboard download pattern not found ❌');
}

// Add trash icon to reports table
const oldReportsDownload = `{c.file_path ? (<button onClick={async () => { const { data } = await supabase.storage.from('documents').createSignedUrl(c.file_path, 60); if (data?.signedUrl) { const response = await fetch(data.signedUrl); const fileBlob = await response.blob(); const blobUrl = URL.createObjectURL(fileBlob); const a = document.createElement('a'); a.href = blobUrl; a.download = (c.address||'inventory').replace(/[^a-zA-Z0-9 _-]/g,'').trim()+'.docx'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl) } }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title='Download'><svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke={TEAL} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z'/><polyline points='14,2 14,8 20,8'/><line x1='12' y1='18' x2='12' y2='12'/><polyline points='9,15 12,18 15,15'/></svg></button>) : <span style={{ fontSize: 11, color: HINT }}>—</span>}`;

const newReportsDownload = `<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{c.file_path ? (<button onClick={async () => { const { data } = await supabase.storage.from('documents').createSignedUrl(c.file_path, 60); if (data?.signedUrl) { const response = await fetch(data.signedUrl); const fileBlob = await response.blob(); const blobUrl = URL.createObjectURL(fileBlob); const a = document.createElement('a'); a.href = blobUrl; a.download = (c.address||'inventory').replace(/[^a-zA-Z0-9 _-]/g,'').trim()+'.docx'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl) } }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title='Download'><svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke={TEAL} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z'/><polyline points='14,2 14,8 20,8'/><line x1='12' y1='18' x2='12' y2='12'/><polyline points='9,15 12,18 15,15'/></svg></button>) : <span style={{ fontSize: 11, color: HINT, padding: 4 }}>—</span>}<button onClick={() => deleteConversion(c.id, c.file_path)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title='Delete'><svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#DC2626' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><polyline points='3,6 5,6 21,6'/><path d='M19,6l-1,14a2 2 0 01-2 2H8a2 2 0 01-2-2L5,6'/><path d='M10,11v6M14,11v6'/><path d='M9,6V4a1 1 0 011-1h4a1 1 0 011 1v2'/></svg></button></div>`;

if (c.includes(oldReportsDownload)) {
  c = c.replace(oldReportsDownload, newReportsDownload);
  console.log('Added delete to reports table ✅');
} else {
  console.log('Reports download pattern not found ❌');
}

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
