import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

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
  accessToken: string
}) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${params.accessToken}` } }
  })
  await supabase.from('conversions').insert({
    address: params.address,
    rooms: params.rooms,
    items: params.items,
    duration_seconds: params.duration_seconds,
  })
}
