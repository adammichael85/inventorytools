const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Add compressing state
c = c.replace(
  `const [convertError, setConvertError] = useState('')`,
  `const [convertError, setConvertError] = useState('')
  const [compressing, setCompressing] = useState(false)
  const [originalSize, setOriginalSize] = useState(0)
  const [compressedSize, setCompressedSize] = useState(0)`
);

// Update compressAndEncode to set state
c = c.replace(
  `  async function compressAndEncode(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
      // Re-save without unnecessary metadata to reduce size
      const compressed = await pdfDoc.save({ useObjectStreams: true })
      const blob = new Blob([new Uint8Array(compressed as unknown as ArrayBuffer)], { type: 'application/pdf' })
      const compressedFile = new File([blob], file.name, { type: 'application/pdf' })
      console.log('Original:', (file.size/1024/1024).toFixed(1)+'MB', 'Compressed:', (compressedFile.size/1024/1024).toFixed(1)+'MB')
      return fileToBase64(compressedFile)
    } catch (e) {
      // If compression fails, just use original
      console.log('Compression failed, using original')
      return fileToBase64(file)
    }
  }`,
  `  async function compressAndEncode(file: File): Promise<string> {
    try {
      setCompressing(true)
      setOriginalSize(file.size)
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
      const compressed = await pdfDoc.save({ useObjectStreams: true })
      const blob = new Blob([new Uint8Array(compressed as unknown as ArrayBuffer)], { type: 'application/pdf' })
      const compressedFile = new File([blob], file.name, { type: 'application/pdf' })
      setCompressedSize(compressedFile.size)
      setCompressing(false)
      return fileToBase64(compressedFile)
    } catch (e) {
      setCompressing(false)
      return fileToBase64(file)
    }
  }`
);

// Update the selected state UI to show compression
c = c.replace(
  `{convertState === 'selected' && selectedFile && (
              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: BG, border: \`1px solid \${BORDER}\`, borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: TEAL_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{selectedFile.name}</p>
                    <p style={{ fontSize: 11, color: HINT, margin: 0 }}>{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                </div>
                <button onClick={startConvert} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>Convert now — £3.50</button>
                <button onClick={() => setConvertState('idle')} style={{ width: '100%', padding: 11, borderRadius: 10, border: \`1px solid \${BORDER}\`, background: 'transparent', color: MUTED, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>Choose different file</button>
              </div>
            )}`,
  `{convertState === 'selected' && selectedFile && (
              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: BG, border: \`1px solid \${BORDER}\`, borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: TEAL_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{selectedFile.name}</p>
                    <p style={{ fontSize: 11, color: HINT, margin: 0 }}>{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                </div>
                {compressing && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: MUTED, marginBottom: 6 }}>
                      <span>Compressing PDF...</span>
                      <span>{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 20, background: BORDER, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 20, background: TEAL, animation: 'progress 1.5s ease-in-out infinite' }} />
                    </div>
                  </div>
                )}
                {!compressing && compressedSize > 0 && compressedSize < selectedFile.size && (
                  <div style={{ marginBottom: 16, padding: '8px 12px', background: TEAL_LIGHT, borderRadius: 8, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: TEAL_DARK, fontWeight: 500 }}>✓ Compressed</span>
                    <span style={{ color: TEAL_DARK }}>{(selectedFile.size/1024/1024).toFixed(1)}MB → {(compressedSize/1024/1024).toFixed(1)}MB</span>
                  </div>
                )}
                <button onClick={startConvert} disabled={compressing} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: compressing ? HINT : TEAL, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: compressing ? 'default' : 'pointer', marginBottom: 10 }}>
                  {compressing ? 'Compressing...' : 'Convert now — £3.50'}
                </button>
                <button onClick={() => setConvertState('idle')} disabled={compressing} style={{ width: '100%', padding: 11, borderRadius: 10, border: \`1px solid \${BORDER}\`, background: 'transparent', color: MUTED, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>Choose different file</button>
              </div>
            )}`
);

// Add progress animation to keyframes
c = c.replace(
  '`@keyframes spin { to { transform: rotate(360deg) } }`',
  '`@keyframes spin { to { transform: rotate(360deg) } } @keyframes progress { 0% { width: 5%; margin-left: 0 } 50% { width: 60%; margin-left: 20% } 100% { width: 5%; margin-left: 100% } }`'
);

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
