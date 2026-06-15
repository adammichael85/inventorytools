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
