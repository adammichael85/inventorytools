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
  let body: any = { base64: base64.length < 5000000 ? base64 : "", mediaType }
  if (originalFile) {
    try {
      const extractedText = await extractTextFromPDF(originalFile)
      if (extractedText && extractedText.trim().length > 100) {
        body = { extractedText, base64: "", mediaType }
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
  return { ...data, _extractedText: body.extractedText || '' }
}

export async function convertPDFVision(file: File, userId?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  const ts = Date.now()
  const tempPath = `${userId || 'anon'}/vision_temp_${ts}_${file.name}`

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('documents')
    .upload(tempPath, file, { contentType: 'application/pdf', upsert: true })

  if (uploadError) throw new Error('Failed to upload PDF for vision: ' + uploadError.message)

  const pdfPath = uploadData.path

  try {
    const response = await fetch('/api/convert-vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfPath, userId })
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Vision conversion failed')
    if (data.error) throw new Error(data.error)
    if (!data.rooms) throw new Error('No rooms found: ' + JSON.stringify(data).slice(0, 200))

    return data
  } finally {
    try {
      await supabase.storage.from('documents').remove([pdfPath])
    } catch (e) {
      console.log('Temp file cleanup failed (non-fatal):', e)
    }
  }
}

export async function extractStructuredFromDOCX(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const run = async () => {
      try {
        const JSZip = (window as any).JSZip
        const arrayBuffer = await file.arrayBuffer()
        const zip = await JSZip.loadAsync(arrayBuffer)
        const xml = await zip.file('word/document.xml')?.async('string')
        if (!xml) { reject(new Error('No document.xml found')); return }

        const parser = new DOMParser()
        const doc = parser.parseFromString(xml, 'application/xml')

        const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
        const body = doc.getElementsByTagNameNS(ns, 'body')[0]
        if (!body) { reject(new Error('No body found')); return }

        const lines: string[] = []
        const children = body.childNodes

        for (let i = 0; i < children.length; i++) {
          const node = children[i] as Element
          const localName = node.localName

          if (localName === 'p') {
            // Paragraph - extract text
            const texts = node.getElementsByTagNameNS(ns, 't')
            let text = ''
            for (let j = 0; j < texts.length; j++) {
              text += texts[j].textContent || ''
            }
            text = text.trim()
            if (text) lines.push('[PARAGRAPH]: ' + text)

          } else if (localName === 'tbl') {
            // Table - extract rows and cells
            const rows = node.getElementsByTagNameNS(ns, 'tr')
            for (let r = 0; r < rows.length; r++) {
              const cells = rows[r].getElementsByTagNameNS(ns, 'tc')
              const cellTexts: string[] = []
              for (let c = 0; c < cells.length; c++) {
                const paras = cells[c].getElementsByTagNameNS(ns, 'p')
                let cellText = ''
                for (let p = 0; p < paras.length; p++) {
                  const ts = paras[p].getElementsByTagNameNS(ns, 't')
                  let paraText = ''
                  for (let t = 0; t < ts.length; t++) {
                    paraText += ts[t].textContent || ''
                  }
                  if (paraText.trim()) cellText += (cellText ? ' | ' : '') + paraText.trim()
                }
                cellTexts.push(cellText)
              }
              const rowText = cellTexts.join('\t')
              if (rowText.trim()) lines.push('[TABLE ROW]: ' + rowText)
            }
          }
        }

        resolve(lines.join('\n'))
      } catch (e) {
        reject(e)
      }
    }

    if ((window as any).JSZip) {
      run()
    } else {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
      s.onload = run
      s.onerror = () => reject(new Error('JSZip load failed'))
      document.head.appendChild(s)
    }
  })
}

export async function convertWordDoc(file: File, userId?: string) {
  const structuredText = await extractStructuredFromDOCX(file)
  if (!structuredText || structuredText.length < 50) throw new Error('Could not extract content from Word document')

  const response = await fetch('/api/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ extractedText: structuredText, base64: '', mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', userId })
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Conversion failed')
  if (data.error) throw new Error(data.error)
  if (!data.rooms) throw new Error('No rooms found')
  return { ...data, _extractedText: structuredText }
}
