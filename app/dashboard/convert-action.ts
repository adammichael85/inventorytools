export async function convertPDF(base64: string, mediaType: string) {
  const response = await fetch('/api/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64, mediaType })
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Conversion failed')
  if (data.error) throw new Error(data.error)
  if (!data.rooms) throw new Error('No rooms found: ' + JSON.stringify(data).slice(0, 200))
  return data
}

export async function saveConversion(params: {
  address: string
  rooms: number
  items: number
  duration_seconds: number
}) {
  try {
    await fetch('/api/save-conversion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
  } catch (e) {
    // Silent fail — don't break the conversion if saving fails
  }
}
