const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Add pdf-lib import after existing imports
c = c.replace(
  `import { convertPDF } from './convert-action'`,
  `import { convertPDF } from './convert-action'
import { PDFDocument } from 'pdf-lib'`
);

// Replace fileToBase64 with a compress-then-encode function
const oldFn = `  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve((r.result as string).split(',')[1])
      r.onerror = reject
      r.readAsDataURL(file)
    })
  }`;

const newFn = `  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve((r.result as string).split(',')[1])
      r.onerror = reject
      r.readAsDataURL(file)
    })
  }

  async function compressAndEncode(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
      // Re-save without unnecessary metadata to reduce size
      const compressed = await pdfDoc.save({ useObjectStreams: true })
      const blob = new Blob([compressed], { type: 'application/pdf' })
      const compressedFile = new File([blob], file.name, { type: 'application/pdf' })
      console.log('Original:', (file.size/1024/1024).toFixed(1)+'MB', 'Compressed:', (compressedFile.size/1024/1024).toFixed(1)+'MB')
      return fileToBase64(compressedFile)
    } catch (e) {
      // If compression fails, just use original
      console.log('Compression failed, using original')
      return fileToBase64(file)
    }
  }`;

if (c.includes(oldFn)) {
  c = c.replace(oldFn, newFn);
  console.log('Added compress function');
} else {
  console.log('fileToBase64 pattern not found');
}

// Replace the fileToBase64 call with compressAndEncode
c = c.replace(
  'const base64 = await fileToBase64(selectedFile)',
  'const base64 = await compressAndEncode(selectedFile)'
);

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
