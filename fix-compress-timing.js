const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Change file input handler to compress immediately on select
c = c.replace(
  `onChange={e => { if (e.target.files?.[0]) { setSelectedFile(e.target.files[0]); setConvertState('selected') } }}`,
  `onChange={async e => { 
    if (e.target.files?.[0]) { 
      const file = e.target.files[0]
      setSelectedFile(file)
      setConvertState('selected')
      // Start compression immediately
      setCompressing(true)
      setOriginalSize(file.size)
      try {
        const { PDFDocument } = await import('pdf-lib')
        const arrayBuffer = await file.arrayBuffer()
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
        const compressed = await pdfDoc.save({ useObjectStreams: true })
        const blob = new Blob([new Uint8Array(compressed as unknown as ArrayBuffer)], { type: 'application/pdf' })
        const compressedFile = new File([blob], file.name, { type: 'application/pdf' })
        setCompressedSize(compressedFile.size)
        setSelectedFile(compressedFile)
      } catch(e) {
        // keep original
      }
      setCompressing(false)
    } 
  }}`
);

// Update startConvert to just use selectedFile directly (already compressed)
c = c.replace(
  `const base64 = await compressAndEncode(selectedFile)`,
  `const base64 = await fileToBase64(selectedFile)`
);

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
