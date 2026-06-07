const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// 1. After the doc is built and blob created, upload to Supabase Storage
// Find where the blob URL is created and add upload after it
const oldBlobSection = `      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      if (docxUrl) URL.revokeObjectURL(docxUrl)
      const url = URL.createObjectURL(blob)
      const name = (data.address || 'inventory').replace(/[^a-zA-Z0-9 _-]/g, '').trim() + '.docx'
      setDocxUrl(url)
      setDocxName(name)`;

const newBlobSection = `      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      if (docxUrl) URL.revokeObjectURL(docxUrl)
      const url = URL.createObjectURL(blob)
      const name = (data.address || 'inventory').replace(/[^a-zA-Z0-9 _-]/g, '').trim() + '.docx'
      setDocxUrl(url)
      setDocxName(name)
      // Upload to Supabase Storage
      let storagePath = ''
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const fileName = session.user.id + '/' + Date.now() + '_' + name
          const { data: uploadData, error: uploadError } = await supabase.storage.from('documents').upload(fileName, blob, { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
          if (!uploadError && uploadData) storagePath = uploadData.path
        }
      } catch(e) { console.log('Upload failed:', e) }`;

if (c.includes(oldBlobSection)) {
  c = c.replace(oldBlobSection, newBlobSection);
  console.log('Added storage upload ✅');
} else {
  console.log('Blob section not found ❌');
  const idx = c.indexOf('URL.createObjectURL(blob)');
  if (idx > -1) console.log('Context:', c.slice(idx-100, idx+200));
}

// 2. Pass storagePath to saveConversion
const oldSaveBody = `body: JSON.stringify({
        user_id: session.user.id,
        address: data.address || selectedFile?.name || 'Unknown',
        rooms: rooms.length,
        duration_seconds: elapsedRef.current,
      })`;

const newSaveBody = `body: JSON.stringify({
        user_id: session.user.id,
        address: data.address || selectedFile?.name || 'Unknown',
        rooms: rooms.length,
        duration_seconds: elapsedRef.current,
        file_path: storagePath,
      })`;

if (c.includes(oldSaveBody)) {
  c = c.replace(oldSaveBody, newSaveBody);
  console.log('Added file_path to save ✅');
} else {
  console.log('Save body not found ❌');
}

// 3. Replace "Archived" with download icon that fetches from storage
const oldArchived = `<td style={{ padding: '12px 20px', fontSize: 11, color: HINT }}>Archived</td>`;
const newArchived = `<td style={{ padding: '12px 20px' }}>
                          {c.file_path ? (
                            <button onClick={async () => {
                              const { data } = await supabase.storage.from('documents').createSignedUrl(c.file_path, 60)
                              if (data?.signedUrl) { const a = document.createElement('a'); a.href = data.signedUrl; a.download = c.address + '.docx'; a.click() }
                            }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title="Download Word doc">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9,15 12,18 15,15"/></svg>
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: HINT }}>—</span>
                          )}
                        </td>`;

if (c.includes(oldArchived)) {
  c = c.replace(oldArchived, newArchived);
  console.log('Added download button ✅');
} else {
  console.log('Archived td not found ❌');
}

// 4. Remove document icon from address cell
const oldDocIcon = `<div style={{ width: 30, height: 30, borderRadius: 7, background: TEAL_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                              </div>`;

if (c.includes(oldDocIcon)) {
  c = c.replace(oldDocIcon, '');
  console.log('Removed doc icon ✅');
} else {
  console.log('Doc icon not found ❌');
}

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
