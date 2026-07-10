import { NextRequest, NextResponse } from 'next/server'
import OpenAI, { toFile } from 'openai'
import { createClient } from '@supabase/supabase-js'
import { dedupeLines, findMissingFixtures, buildSystemPrompt } from '@/lib/audioPrompt'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await req.json()
    const { filePaths, fileNames, roomOrder, propertySize, address } = body

    if (!filePaths || filePaths.length === 0) {
      return NextResponse.json({ error: 'No audio files provided' }, { status: 400 })
    }

    // Load Excel library from environment or fetch from a known location
    // For now use hardcoded common inventory terms as fallback
    const items: string[] = ["Doorframe","Door","Threshold","Smoke alarm","Ceiling","Lighting","Spot lights","Light fitting","Walls","Skirting","Flooring","Carpet","Back wall","Light switch","Fuse switch","DPP","SPP","TV point","Telecom point","Cupboard","Boiler","Shelf","Wardrobe","Hanging rail","Shelves","Curtain pole","Curtains","Window reveal","Window","Window sill","Radiator","Bath","Basin","Sink","Toilet","Shower","Extractor fan","Oven","Hob","Fridge","Fridge freezer","Washing machine","Dishwasher","Microwave","Worktop","Kickplates","Units","Patio door","Garden","Shed","Fence","Gate","Path","Driveway","Lawn","Beds","Garage"]
    const descs: string[] = ["White wooden","White painted","White UPVC","Painted white","Painted pale grey","Fitted carpet","Laminate floorboards","Chrome","Stainless steel","Glass","Metal","Plastic","Ceramic","Porcelain","Tiled","Wooden","Pine","Oak","MDF","Gloss","Matt","Single panel","Double panel","6 panel","Frosted glass","Obscure glass","T&W","Bulb T&W","Fittings as fitted"]
    const conds: string[] = ["T&W","NT","T&NW","Bulb T&W","Fan T&W","Lock T&W","Good clean condition","Light dust","Light debris","Requires cleaning","Requires further wipe","RFC","PM","PM LL","PM ML","FPM","Few scuffs","Few scuffs LL","Few small marks","Light marks","Light scuffs","Slightly dusty","Water marked","Slightly water marked","Scale line","Cap present","Valve present","Cap and valve present","Cap missing","Valve missing","Tested and working","Not tested","Cracking","Chipped","Scratched","Stained","Marked"]

    const transcripts: string[] = []
    let totalSeconds = 0

    const roomList = (roomOrder || '').trim().split('\n').filter((r: string) => r.trim()).map((r: string) => r.trim())

    // Per-room file matching: check if any filename matches a room name
    function normalise(s: string) {
      return s.toLowerCase().replace(/\.(mp3|wav|m4a|ogg|webm)$/i, '').replace(/[^a-z0-9]/g, '')
    }
    const roomFileMap: Record<string, number> = {}
    for (let i = 0; i < fileNames.length; i++) {
      const baseName = normalise(fileNames[i])
      for (const roomName of roomList) {
        if (baseName === normalise(roomName)) {
          roomFileMap[roomName] = i
          break
        }
      }
    }
    const isPerRoom = Object.keys(roomFileMap).length === roomList.length
    console.log('Per-room mode:', isPerRoom, 'matched:', Object.keys(roomFileMap))

    // Transcribe all files
    // Transcribe all files IN PARALLEL (was sequential - 8 files one-at-a-time was a major contributor to timeouts)
    const transcriptionResults = await Promise.all(filePaths.map(async (filePath: string, i: number) => {
      const fileName = fileNames[i] || 'audio.mp3'

      // Retry signed URL up to 3 times in case of propagation delay
      let urlData: any = null
      for (let urlAttempt = 1; urlAttempt <= 3; urlAttempt++) {
        const { data } = await supabase.storage.from('documents').createSignedUrl(filePath, 120)
        if (data?.signedUrl) { urlData = data; break }
        if (urlAttempt < 3) await new Promise(r => setTimeout(r, 1000 * urlAttempt))
      }
      if (!urlData?.signedUrl) throw new Error('Could not get signed URL for ' + filePath)

      const audioRes = await fetch(urlData.signedUrl)
      if (!audioRes.ok) throw new Error('Failed to fetch audio file from storage')
      const audioBuffer = await audioRes.arrayBuffer()

      const ext = fileName.split('.').pop()?.toLowerCase() || 'mp3'
      const mimeMap: Record<string, string> = { mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', ogg: 'audio/ogg', webm: 'audio/webm' }
      const mime = mimeMap[ext] || 'audio/mpeg'

      const audioFile = await toFile(Buffer.from(audioBuffer), fileName, { type: mime })

      const transcription = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        file: audioFile,
        language: 'en',
        response_format: 'verbose_json',
      })

      try { await supabase.storage.from('documents').remove([filePath]) } catch(e) {}

      return { i, text: transcription.text, duration: Math.round((transcription as any).duration || 0) }
    }))

    const transcriptMap: Record<number, string> = {}
    for (const r of transcriptionResults) {
      transcriptMap[r.i] = r.text
      transcripts[r.i] = r.text
      totalSeconds += r.duration
    }

    const stitchedTranscript = transcripts.join(' ')

    const roomResults = await Promise.all(roomList.map(async (roomName: string) => {
      // Use per-room transcript if matched, otherwise use full stitched transcript
      const roomTranscript = isPerRoom && roomFileMap[roomName] !== undefined
        ? transcriptMap[roomFileMap[roomName]]
        : stitchedTranscript

      console.log(`Room ${roomName}: using ${isPerRoom ? 'per-room' : 'stitched'} transcript (${roomTranscript.length} chars)`)

      const systemPrompt = buildSystemPrompt(roomName, items, descs, conds)
      const userMessage = `Property: ${address}
Property size: ${propertySize}
Room: ${roomName}

TRANSCRIPTION:
${roomTranscript}`

      let rows: any[] = []
      let roomInputTokens = 0
      let roomOutputTokens = 0
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await openai.chat.completions.create({
            model: 'gpt-5.5-2026-04-23',
            max_completion_tokens: 16000,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage }
            ]
          })
          // Accumulate usage from every attempt — retries still cost money even if the result is discarded
          roomInputTokens += response.usage?.prompt_tokens || 0
          roomOutputTokens += response.usage?.completion_tokens || 0
          const raw = response.choices[0].message.content || ''
          console.log(`Room ${roomName} raw (first 300):`, raw.slice(0, 300))
          const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim()
          const parsed = JSON.parse(cleaned)
          console.log(`Room ${roomName} attempt ${attempt}: ${parsed.length} entries parsed`)

          rows = parsed
            .filter((r: any) => r.type === 'item' && r.item)
            .map((r: any) => ({
              item: r.item || '',
              description: dedupeLines((r.description || '').replace(/\\n/g, '\n')),
              condition: dedupeLines((r.condition || '').replace(/\\n/g, '\n')),
            }))

          // A room genuinely has no content very rarely - an empty result is much more likely a
          // non-deterministic failure to find the room in the transcript. Retry rather than silently
          // dropping the room (this was the root cause of a whole Bathroom vanishing on one run with
          // no prompt change at all - same input, different output).
          // Only check for missing fixtures on rooms that are actually bathroom-type by name -
          // checking this on every room caused false positives (e.g. "toilet" appearing incidentally
          // in a Kitchen transcript via a Whisper mishearing, which can never legitimately appear in
          // Kitchen output, so the check could never pass and burned all 3 retries - each retry on a
          // large room can take 70-100+ seconds, which was blowing through the function's 300s timeout).
          const isBathroomTypeRoom = /bath|shower|\bwc\b|toilet|en-?suite/i.test(roomName)
          const missingFixtures = isBathroomTypeRoom ? findMissingFixtures(roomTranscript, rows) : []
          if (rows.length > 0 && missingFixtures.length === 0) break
          if (missingFixtures.length > 0) {
            console.warn(`Room ${roomName} attempt ${attempt}: transcript mentions [${missingFixtures.join(', ')}] but output is missing them - retrying`)
          } else {
            console.warn(`Room ${roomName} attempt ${attempt}: parsed successfully but got 0 rows - retrying`)
          }
        } catch (e) {
          console.error(`Room ${roomName} attempt ${attempt} failed:`, e)
        }
        if (attempt < 3) await new Promise(r => setTimeout(r, 500))
      }

      if (rows.length === 0) {
        console.error(`Room ${roomName}: 0 rows after 3 attempts - this room may be missing from the final document`)
      }

      return { roomName, rows, inputTokens: roomInputTokens, outputTokens: roomOutputTokens }
    }))
    const result = roomResults

    // GPT-5.5 pricing (verified July 2026): $5.00 / 1M input tokens, $30.00 / 1M output tokens
    const totalInputTokens = result.reduce((sum: number, r: any) => sum + (r.inputTokens || 0), 0)
    const totalOutputTokens = result.reduce((sum: number, r: any) => sum + (r.outputTokens || 0), 0)
    const actualApiCost = Math.ceil(((totalInputTokens / 1_000_000) * 5.00 + (totalOutputTokens / 1_000_000) * 30.00) * 100) / 100

    return NextResponse.json({
      rooms: result,
      address,
      transcript: stitchedTranscript,
      audio_length_seconds: totalSeconds,
      actual_api_cost: actualApiCost,
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
    })

  } catch (err: any) {
    console.error('Audio convert error:', err)
    return NextResponse.json({ error: err.message || 'Conversion failed' }, { status: 500 })
  }
}
