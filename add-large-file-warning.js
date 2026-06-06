const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Add large file warning after the file is selected in the selected state
const oldFileInfo = `                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: BG, border: \`1px solid \${BORDER}\`, borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: TEAL_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{selectedFile.name}</p>
                    <p style={{ fontSize: 11, color: HINT, margin: 0 }}>{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                </div>`;

const newFileInfo = `                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: BG, border: \`1px solid \${BORDER}\`, borderRadius: 10, padding: '14px 16px', marginBottom: selectedFile.size > 3 * 1024 * 1024 ? 12 : 20 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: TEAL_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{selectedFile.name}</p>
                    <p style={{ fontSize: 11, color: HINT, margin: 0 }}>{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                </div>
                {selectedFile.size > 3 * 1024 * 1024 && (
                  <div style={{ background: '#FFF8E1', border: '1px solid #FFD54F', borderRadius: 9, padding: '10px 14px', marginBottom: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#7B5E00', margin: '0 0 4px' }}>⚠️ Large file detected ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)</p>
                    <p style={{ fontSize: 12, color: '#7B5E00', margin: '0 0 2px' }}>For files over 3MB, compress first at <a href="https://www.ilovepdf.com/compress_pdf" target="_blank" style={{ color: '#7B5E00', fontWeight: 600 }}>ilovepdf.com</a></p>
                    <p style={{ fontSize: 12, color: '#7B5E00', margin: 0 }}>Use <strong>EXTREME</strong> compression to reduce the file size dramatically to save conversion time.</p>
                  </div>
                )}`;

if (c.includes(oldFileInfo)) {
  c = c.replace(oldFileInfo, newFileInfo);
  console.log('Added large file warning');
} else {
  console.log('ERROR: pattern not found');
}

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
