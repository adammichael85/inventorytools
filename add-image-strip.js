const fs = require('fs');
let c = fs.readFileSync('app/dashboard/convert-action.ts', 'utf8');

const newContent = `import { supabase } from '@/lib/supabase'

async function stripImagesFromPDF(file: File): Promise<File> {
  try {
    const { PDFDocument } = await import('pdf-lib')
    const arrayBuffer = await file.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
    
    // Remove all images from each page by clearing XObject resources
    const pages = pdfDoc.getPages()
    for (const page of pages) {
      const { node } = page
      const resources = node.Resources()
      if (resources) {
        // Remove XObject resources (which contain images)
        try {
          const xObject = resources.lookup('XObject' as any)
          if (xObject) {
            resources.delete('XObject' as any)
          }
        } catch(e) {
          // ignore
        }
      }
    }
    
    const stripped = await pdfDoc.save({ useObjectStreams: true })
    const blob = new Blob([new Uint8Array(stripped as unknown as ArrayBuffer)], { type: 'application/pdf' })
    const strippedFile = new File([blob], file.name, { type: 'application/pdf' })
    console.log('Original:', (file.size/1024/1024).toFixed(1)+'MB', 'Stripped:', (strippedFile.size/1024/1024).toFixed(1)+'MB')
    return strippedFile
  } catch(e) {
    console.log('Image stripping failed, using original:', e)
    return file
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve((r.result as string).split(',')[1])
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

export async function convertPDF(base64: string, mediaType: string, originalFile?: File) {
  // If we have the original file, strip images first
  let finalBase64 = base64
  if (originalFile && originalFile.size > 3 * 1024 * 1024) {
    console.log('Large PDF detected, stripping images...')
    const stripped = await stripImagesFromPDF(originalFile)
    finalBase64 = await fileToBase64(stripped)
    console.log('Stripped base64 length:', finalBase64.length)
  }

  const response = await fetch('/api/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64: finalBase64, mediaType })
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Conversion failed')
  if (data.error) throw new Error(data.error)
  if (!data.rooms) throw new Error('No rooms found: ' + JSON.stringify(data).slice(0, 200))
  return data
}
`;

fs.writeFileSync('app/dashboard/convert-action.ts', newContent);
console.log('done');
