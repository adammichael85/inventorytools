import { NextRequest, NextResponse } from 'next/server'
import OpenAI, { toFile } from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

const SYSTEM_PROMPT = `You are an expert UK property inventory formatter.
You will receive a transcription of an inventory inspection dictated by a clerk, along with a room order list.

Your job is to structure the transcription into rooms and rows with three columns: item, description, condition.

ROOM ORDER: You will be given a list of room names in the order they should appear. Use this to identify where one room ends and another begins in the transcript. The clerk may call out the room name, or you must infer the boundary from context.

OUTPUT FORMAT: Return only a JSON array. No markdown, no explanation, no backticks. Example:
[
  {
    "roomName": "Kitchen",
    "rows": [
      { "item": "Flooring", "description": "Grey fitted carpet", "condition": "Good clean condition" },
      { "item": "Ceiling", "description": "White painted", "condition": "" }
    ]
  }
]

SIGNAL DECODER how clerks speak:
1. "then you've got", "you've got", "next you have", "there's a" = new item row starting
2. Material/colour words = Description column. Damage/cleaning/testing words = Condition column
3. "sorry", "no wait", "actually" = discard what came before, use only what follows
4. "oh I forgot to add", "go back and say", "I missed that" = add detail to most recent matching row, do NOT create new row
5. Spelled out letters A-R-R-O-W = brand name or model, use as written
6. Quantities: "two", "three", "a pair of" = use as number prefix on item
7. Self-corrections: always use the corrected version only
8. Items listed in series belong to same row unless clerk signals new item

FORMATTING RULES:
- COPY EXACTLY do not improve, reinterpret or add information not spoken
- Item: short noun only e.g. Flooring, Door frame, Radiator
- Description: material, colour, finish, make, model e.g. White UPVC / Double glazed
- Condition: damage, cleanliness, wear, defects e.g. Few scuffs lower level / Requires clean
- Use / to separate multiple points within a cell
- Never leave item blank
- Strip filler words: um, uh, you know, like
- Correct obvious dictation errors e.g. pool cords = pull cords, helmet = pelmet
- If a room has no content, still include it with an empty rows array`

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await req.json()
    const { filePaths, fileNames, roomOrder, propertySize, address } = body

    if (!filePaths || filePaths.length === 0) {
      return NextResponse.json({ error: 'No audio files provided' }, { status: 400 })
    }

    const transcripts: string[] = []
    let totalSeconds = 0

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i]
      const fileName = fileNames[i] || 'audio.mp3'

      const { data: urlData } = await supabase.storage.from('documents').createSignedUrl(filePath, 120)
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

      transcripts.push(transcription.text)
      totalSeconds += Math.round((transcription as any).duration || 0)

      try { await supabase.storage.from('documents').remove([filePath]) } catch(e) {}
    }

    const stitchedTranscript = transcripts.join(' ')
    const roomList = (roomOrder || '').trim().split('\n').filter((r: string) => r.trim()).map((r: string) => r.trim())

    const userMessage = `Property: ${address}
Property size: ${propertySize}

ROOM ORDER (rooms must appear in this exact order):
${roomList.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}

TRANSCRIPTION:
${stitchedTranscript}`

    let parsed: any[] = []
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4.1-2025-04-14',
          temperature: 0.1,
          max_tokens: 32000,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage }
          ]
        })
        const raw = response.choices[0].message.content || ''
        const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim()
        parsed = JSON.parse(cleaned)
        break
      } catch (e) {
        if (attempt === 3) throw new Error('Failed to parse GPT response after 3 attempts')
      }
    }

    const result = roomList.map((roomName: string) => {
      const found = parsed.find((r: any) =>
        r.roomName?.toLowerCase().trim() === roomName.toLowerCase().trim()
      )
      return found || { roomName, rows: [] }
    })

    return NextResponse.json({
      rooms: result,
      address,
      transcript: stitchedTranscript,
      audio_length_seconds: totalSeconds,
    })

  } catch (err: any) {
    console.error('Audio convert error:', err)
    return NextResponse.json({ error: err.message || 'Conversion failed' }, { status: 500 })
  }
}
