export async function extractTextFromPDF(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const run = () => {
      const pdfjsLib = (window as any).pdfjsLib
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      file.arrayBuffer().then((buf: ArrayBuffer) => {
        pdfjsLib.getDocument({ data: buf }).promise.then((pdf: any) => {
          const jobs: number[] = []
          for (let i = 1; i <= pdf.numPages; i++) jobs.push(i)
          Promise.all(jobs.map((i: number) =>
            pdf.getPage(i).then((pg: any) =>
              pg.getTextContent().then((tc: any) =>
                tc.items.map((it: any) => it.str).join(' ')
              )
            )
          )).then((pages: string[]) => resolve(pages.join('\n'))).catch(reject)
        }).catch(reject)
      }).catch(reject)
    }
    if ((window as any).pdfjsLib) {
      run()
    } else {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
      s.onload = run
      s.onerror = () => reject(new Error('PDF.js load failed'))
      document.head.appendChild(s)
    }
  })
}


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
export async function convertPDF(base64: string, mediaType: string, originalFile?: File, userId?: string) {
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
  }
  const response = await fetch('/api/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, userId })
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Conversion failed')
  if (data.error) throw new Error(data.error)
  if (!data.rooms) throw new Error('No rooms found: ' + JSON.stringify(data).slice(0, 200))
  return data
}
