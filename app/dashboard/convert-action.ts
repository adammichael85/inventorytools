export async function convertPDF(base64: string, mediaType: string) {
  const response = await fetch('/api/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64, mediaType })
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || 'Conversion failed')
  }
  return response.json()
}
