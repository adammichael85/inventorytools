const fs = require('fs');
const content = `
async function extractTextFromPDF(file) {
  return new Promise((resolve, reject) => {
    const loadScript = () => {
      const pdfjsLib = window.pdfjsLib
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      file.arrayBuffer().then(arrayBuffer => {
        pdfjsLib.getDocument({ data: arrayBuffer }).promise.then(pdf => {
          const pages = []
          for (let i = 1; i <= pdf.numPages; i++) pages.push(i)
          Promise.all(pages.map(i => pdf.getPage(i).then(page => 
            page.getTextContent().then(content => 
              content.items.map(item => item.str).join(' ')
            )
          ))).then(pageTexts => resolve(pageTexts.join('\\n'))).catch(reject)
        }).catch(reject)
      }).catch(reject)
    }
    if (window.pdfjsLib) {
      loadScript()
    } else {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
      script.onload = loadScript
      script.onerror = () => reject(new Error('Failed to load PDF.js'))
      document.head.appendChild(script)
    }
  })
}

export async function convertPDF(base64, mediaType, originalFile) {
  let body = { base64, mediaType }
  if (originalFile) {
    try {
      const extractedText = await extractTextFromPDF(originalFile)
      if (extractedText && extractedText.trim().length > 100) {
        body = { extractedText, base64: '', mediaType }
        console.log('Using extracted text:', extractedText.length, 'chars')
      }
    } catch(e) {
      console.log('Text extraction failed, using base64:', e)
    }
  }
  const response = await fetch('/api/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Conversion failed')
  if (data.error) throw new Error(data.error)
  if (!data.rooms) throw new Error('No rooms found: ' + JSON.stringify(data).slice(0, 200))
  return data
}
`;
fs.writeFileSync('app/dashboard/convert-action.ts', content);
console.log('done');
