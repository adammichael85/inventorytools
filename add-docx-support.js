const fs = require('fs');
let c = fs.readFileSync('app/dashboard/convert-action.ts', 'utf8');

// Add docx text extraction function
const docxExtract = `
export async function extractTextFromDOCX(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const run = () => {
      const mammoth = (window as any).mammoth
      file.arrayBuffer().then((buf: ArrayBuffer) => {
        mammoth.extractRawText({ arrayBuffer: buf }).then((result: any) => {
          resolve(result.value || '')
        }).catch(reject)
      }).catch(reject)
    }
    if ((window as any).mammoth) {
      run()
    } else {
      const s = document.createElement('script')
      s.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js'
      s.onload = run
      s.onerror = () => reject(new Error('mammoth.js load failed'))
      document.head.appendChild(s)
    }
  })
}
`;

// Add docx extraction before convertPDF
c = c.replace('export async function convertPDF', docxExtract + 'export async function convertPDF');

// Update convertPDF to handle docx files too
c = c.replace(
  `export async function convertPDF(base64: string, mediaType: string, originalFile?: File) {
  let body: any = { base64, mediaType }

  if (originalFile) {
    try {
      const extractedText = await extractTextFromPDF(originalFile)
      if (extractedText && extractedText.trim().length > 100) {
        body = { extractedText }
        console.log('Using PDF.js text extraction:', extractedText.length, 'chars')
      }
    } catch(e) {
      console.log('PDF.js failed, using base64 fallback:', e)
    }
  }`,
  `export async function convertPDF(base64: string, mediaType: string, originalFile?: File) {
  let body: any = { base64, mediaType }

  if (originalFile) {
    try {
      let extractedText = ''
      if (originalFile.name.toLowerCase().endsWith('.docx')) {
        extractedText = await extractTextFromDOCX(originalFile)
        console.log('Using mammoth.js DOCX extraction:', extractedText.length, 'chars')
      } else {
        extractedText = await extractTextFromPDF(originalFile)
        console.log('Using PDF.js text extraction:', extractedText.length, 'chars')
      }
      if (extractedText && extractedText.trim().length > 100) {
        body = { extractedText }
      }
    } catch(e) {
      console.log('Text extraction failed, using base64 fallback:', e)
    }
  }`
);

console.log('convert-action updated ✅');
fs.writeFileSync('app/dashboard/convert-action.ts', c);

// Update the file input to accept both pdf and docx
let d = fs.readFileSync('app/dashboard/page.tsx', 'utf8');
d = d.replace(
  'accept=".pdf"',
  'accept=".pdf,.docx"'
);
d = d.replace(
  'accept="application/pdf"',
  'accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"'
);
d = d.replace(
  "if (file.type !== 'application/pdf')",
  "if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.docx'))"
);
// Update the mediaType sent
d = d.replace(
  "const data = await convertPDF(base64, 'application/pdf', selectedFile)",
  "const data = await convertPDF(base64, selectedFile?.name.toLowerCase().endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf', selectedFile)"
);

// Update UI text to mention both formats
d = d.replace(
  "'Drop your PDF here'",
  "'Drop your PDF or Word doc here'"
);
d = d.replace(
  "'or click to browse'",
  "'or click to browse'"
);
d = d.replace(
  "For files over 3MB, compress first at ilovepdf.com",
  "Accepts PDF and Word (.docx) files · For large PDFs, compress first at ilovepdf.com"
);

console.log('dashboard updated ✅');
fs.writeFileSync('app/dashboard/page.tsx', d);
console.log('done');
