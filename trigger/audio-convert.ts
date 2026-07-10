import { task, logger } from "@trigger.dev/sdk/v3"
import { createClient } from "@supabase/supabase-js"
import OpenAI, { toFile } from "openai"
import { dedupeLines, findMissingFixtures, buildSystemPrompt } from "@/lib/audioPrompt"

export const audioConvertTask = task({
  id: "audio-convert",
  maxDuration: 3600,
  run: async (payload: {
    filePaths: string[]
    fileNames: string[]
    roomOrder: string
    propertySize: string
    furnished: string
    address: string
    jobId: string
    userId: string
    convertedBy?: string
  }) => {
    const { filePaths, fileNames, roomOrder, propertySize, furnished, address, jobId, userId, convertedBy } = payload
    const jobStartedAt = Date.now()

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let hasSetStartedAt = false
    async function updateJob(status: string, progress: number, message: string, roomStatuses?: Record<string, string>, roomNames?: string[], rooms?: any[]) {
      const payload: any = {
        id: jobId,
        user_id: userId,
        status,
        progress,
        message,
        address: address || null,
        room_names: roomNames ? JSON.stringify(roomNames) : undefined,
        room_statuses: roomStatuses ? JSON.stringify(roomStatuses) : undefined,
        rooms: rooms ? JSON.stringify(rooms) : undefined,
        updated_at: new Date().toISOString()
      }
      if (!hasSetStartedAt) {
        payload.started_at = new Date().toISOString()
        hasSetStartedAt = true
      }
      await supabase.from("audio_jobs").upsert(payload)
    }

    try {
      await updateJob("running", 0, "Starting audio conversion...")

      const items: string[] = ["Doorframe","Door","Threshold","Smoke alarm","Ceiling","Lighting","Spot lights","Light fitting","Walls","Skirting","Flooring","Carpet","Back wall","Light switch","Fuse switch","DPP","SPP","TV point","Telecom point","Cupboard","Boiler","Shelf","Wardrobe","Hanging rail","Shelves","Curtain pole","Curtains","Window reveal","Window","Window sill","Radiator","Bath","Basin","Sink","Toilet","Shower","Extractor fan","Oven","Hob","Fridge","Fridge freezer","Washing machine","Dishwasher","Microwave","Worktop","Kickplates","Units","Patio door","Garden","Shed","Fence","Gate","Path","Driveway","Lawn","Beds","Garage"]
      const descs: string[] = ["White wooden","White painted","White UPVC","Painted white","Painted pale grey","Fitted carpet","Laminate floorboards","Chrome","Stainless steel","Glass","Metal","Plastic","Ceramic","Porcelain","Tiled","Wooden","Pine","Oak","MDF","Gloss","Matt","Single panel","Double panel","6 panel","Frosted glass","Obscure glass","T&W","Bulb T&W","Fittings as fitted"]
      const conds: string[] = ["T&W","NT","T&NW","Bulb T&W","Fan T&W","Lock T&W","Good clean condition","Light dust","Light debris","Requires cleaning","Requires further wipe","RFC","PM","PM LL","PM ML","FPM","Few scuffs","Few scuffs LL","Few small marks","Light marks","Light scuffs","Slightly dusty","Water marked","Slightly water marked","Scale line","Cap present","Valve present","Cap and valve present","Cap missing","Valve missing","Tested and working","Not tested","Cracking","Chipped","Scratched","Stained","Marked"]

      const transcripts: string[] = []
      let totalSeconds = 0

      const roomList = (roomOrder || '').trim().split('\n').filter((r: string) => r.trim()).map((r: string) => r.trim())

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
      logger.log("Per-room mode:", { isPerRoom, matched: Object.keys(roomFileMap) })

      await updateJob("running", 5, "Transcribing audio...", undefined, roomList)

      const transcriptionResults = await Promise.all(filePaths.map(async (filePath: string, i: number) => {
        const fileName = fileNames[i] || 'audio.mp3'

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

      // Structured room-status map (not index-parsing, since audio processes rooms in
      // parallel and knows every room name upfront) — updated as each room finishes,
      // regardless of completion order.
      const roomStatuses: Record<string, string> = {}
      for (const r of roomList) roomStatuses[r] = 'pending'
      let completedCount = 0

      const roomResults = await Promise.all(roomList.map(async (roomName: string) => {
        const roomTranscript = isPerRoom && roomFileMap[roomName] !== undefined
          ? transcriptMap[roomFileMap[roomName]]
          : stitchedTranscript

        roomStatuses[roomName] = 'active'
        await updateJob("running", 10 + Math.round((completedCount / roomList.length) * 85), `Converting ${roomName}...`, { ...roomStatuses }, roomList)

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
            roomInputTokens += response.usage?.prompt_tokens || 0
            roomOutputTokens += response.usage?.completion_tokens || 0
            const raw = response.choices[0].message.content || ''
            const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim()
            const parsed = JSON.parse(cleaned)

            rows = parsed
              .filter((r: any) => r.type === 'item' && r.item)
              .map((r: any) => ({
                item: r.item || '',
                description: dedupeLines((r.description || '').replace(/\\n/g, '\n')),
                condition: dedupeLines((r.condition || '').replace(/\\n/g, '\n')),
              }))

            const isBathroomTypeRoom = /bath|shower|\bwc\b|toilet|en-?suite/i.test(roomName)
            const missingFixtures = isBathroomTypeRoom ? findMissingFixtures(roomTranscript, rows) : []
            if (rows.length > 0 && missingFixtures.length === 0) break
            if (missingFixtures.length > 0) {
              logger.warn(`Room ${roomName} attempt ${attempt}: missing fixtures [${missingFixtures.join(', ')}] - retrying`)
            } else {
              logger.warn(`Room ${roomName} attempt ${attempt}: 0 rows - retrying`)
            }
          } catch (e) {
            logger.error(`Room ${roomName} attempt ${attempt} failed:`, { error: String(e) })
          }
          if (attempt < 3) await new Promise(r => setTimeout(r, 500))
        }

        if (rows.length === 0) {
          logger.error(`Room ${roomName}: 0 rows after 3 attempts`)
        }

        completedCount++
        roomStatuses[roomName] = 'done'
        await updateJob("running", 10 + Math.round((completedCount / roomList.length) * 85), `Converting ${roomName}...`, { ...roomStatuses }, roomList)

        return { roomName, rows, inputTokens: roomInputTokens, outputTokens: roomOutputTokens }
      }))

      const totalInputTokens = roomResults.reduce((sum: number, r: any) => sum + (r.inputTokens || 0), 0)
      const totalOutputTokens = roomResults.reduce((sum: number, r: any) => sum + (r.outputTokens || 0), 0)
      const actualApiCost = Math.ceil(((totalInputTokens / 1_000_000) * 5.00 + (totalOutputTokens / 1_000_000) * 30.00) * 100) / 100

      await updateJob("complete", 100, `Complete — ${roomList.length} rooms converted`, roomStatuses, roomList, roomResults)
      logger.log("Audio conversion complete", { rooms: roomList.length })

      try {
        const saveRes = await fetch(`https://www.inventorytools.co.uk/api/save-conversion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.INTERNAL_API_SECRET}` },
          body: JSON.stringify({
            user_id: userId,
            address: address,
            rooms: roomResults.length,
            duration_seconds: Math.round((Date.now() - jobStartedAt) / 1000),
            converted_by: convertedBy || '',
            type: 'audio',
            property_size: propertySize,
            furnished: furnished,
            audio_length_seconds: totalSeconds,
            cost: 4.00,
            actual_api_cost: actualApiCost,
            converted_json: { rooms: roomResults, address },
            extracted_text: stitchedTranscript,
          })
        })
        const saveData = await saveRes.json()
        if (saveData.error) {
          logger.error('save-conversion failed', { error: saveData.error })
        } else {
          logger.log('Audio conversion saved to database', { balance: saveData.balance })
        }
      } catch (saveErr: any) {
        logger.error('save-conversion request failed', { error: String(saveErr) })
      }

    } catch (err: any) {
      logger.error("Audio convert error:", { error: err.message })
      await updateJob("error", 0, err.message || "Conversion failed")

      try {
        await fetch(`https://www.inventorytools.co.uk/api/report-error`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'audio', errorMessage: err.message || String(err), address, userEmail: convertedBy || '' })
        })
      } catch (e) {}
    }
  },
})
