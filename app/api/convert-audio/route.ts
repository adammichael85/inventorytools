import { NextRequest, NextResponse } from 'next/server'
import OpenAI, { toFile } from 'openai'
import { createClient } from '@supabase/supabase-js'

function buildSystemPrompt(roomName: string, items: string[], descs: string[], conds: string[]): string {
  return `You are an expert UK property inventory formatter.
You are processing ONE room from a UK property inventory inspection.
ROOM NAME: ${roomName}

----------------------------------------
CORE TASK
----------------------------------------
Your job is to read the room transcription word by word in the exact order spoken
and transfer every spoken detail into a three-column inventory table:

Item | Description | Condition

- ITEM = the physical object, fixture, fitting, surface, appliance or area
- DESCRIPTION = material, colour, style, quantity, make, model, included parts
- CONDITION = defects, wear, cleanliness, test results, missing parts, location notes

Do not summarise. Do not skip words. Do not merge separate items into one row.
Do not add anything not spoken. Do not remove anything that was spoken.

----------------------------------------
CLERK SPEECH DECODER
----------------------------------------
Inventory clerks dictate in one continuous flowing sentence. There is no punctuation.
Items blend into each other without pause. Use these 9 signals to parse the speech.

SIGNAL 1 - NEW ITEM STARTING
When you hear: "then you've got", "you've got", "next you have", "there's a"
-> A new item row is starting

Example 1: "white wooden door frame then you've got metal threshold then you've got white painted ceiling"
-> Door frame | White wooden |
-> Threshold | Metal |
-> Ceiling | White painted |

Example 2: "grey fitted carpet then you've got white single radiator then you've got white DPP"
-> Flooring | Grey fitted carpet |
-> Radiator | White single |
-> DPP | White |

Example 3: "then you've got stainless steel sink drain overflow filter plug drainer then you've got under sink unit"
-> Sink | Stainless steel / Drain / Overflow / Filter plug / Drainer |
-> Under sink unit | |

SIGNAL 2 - DESCRIPTION ENDING, CONDITION STARTING
When material and colour words stop and damage, cleaning or testing words begin
-> Switch from Description column to Condition column

Example 1: "white wooden skirting few scuffs to the lower level"
-> Skirting | White wooden | Few scuffs LL

Example 2: "white UPVC window fittings fitted frames are slightly dusty requires a further wipe"
-> Window | White UPVC / Fittings fitted | Frames slightly dusty / Requires a further wipe

Example 3: "grey fitted carpet flattened and faded to the walkways furniture pressure marks present some minor debris on entrance"
-> Flooring | Grey fitted carpet | Flattened and faded to walkways / FPM present / Some minor debris on entrance

Example 4: "white wooden shelf with metal edging chips at the front edge and a few chips at the base of the shelf"
-> Shelf | White wooden / Metal edging | Chips at front edge / A few chips at base of shelf

SIGNAL 3 - SELF CORRECTION
When you hear: "sorry", "no wait", "actually", "no sorry"
-> Discard what came before it, use only what comes after it

Example 1: "metal rack sorry stainless steel utensil rack with six stainless steel hooks"
-> Discard "metal rack" -> Utensil rack | Stainless steel / 6 x stainless steel hooks |

Example 2: "six egg sorry egg tray plastic egg tray"
-> Discard "six egg" -> Egg tray | Plastic |

Example 3: "two tight no one screw one raw plug hole"
-> Discard "two tight" -> | | 1 x screw / 1 x raw plug hole

Example 4: "valve is loose cap is missing actually the valve is detached and taped"
-> Discard "valve is loose" -> Radiator | | Cap missing / Valve detached and taped

SIGNAL 4 - GO-BACK CORRECTION
When you hear: "oh I forgot to add", "sorry I missed", "can you go back and add", "I missed that", "go back and say"
-> Find the most recently described item that matches what they mention
-> Add the missed detail to that existing row
-> Do NOT create a new row
-> Ignore "okay lets continue" and carry on

Example 1: "go back to the back wall sorry and say brown splash marks above radiator I missed that"
-> Find most recent Back wall row -> Add "Brown splash marks above radiator" to Condition

Example 2: "oh I forgot to add a picture hook to the back wall"
-> Find most recent Back wall row -> Add "Picture hook" to Condition

SIGNAL 5 - SPELLED OUT LETTERS = BRAND NAME OR MODEL NUMBER
When you hear letters being spelled out one by one
-> Use the spelled out version as the correct spelling

Example 1: "oven make is Arrow thats A-R-R-O-W" -> Make: Arrow
Example 2: "the brand is Zanussi thats Z-A-N-U-S-S-I" -> Make: Zanussi

SIGNAL 6 - NUMBERS SPOKEN OUT LOUD
-> Convert to digits for quantities

Example 1: "one two three four five six stainless steel hooks" -> 6 x stainless steel hooks
Example 2: "three times glass shelves with white edging" -> 3 x glass shelves with white edging

SIGNAL 7 - MATCHING = COPY DESCRIPTION FROM PREVIOUS ITEM
When you hear "matching" referring to a previously described item
-> Look back, find that items description, copy it exactly
-> Never write "matching previous item" - always copy the actual description

SIGNAL 8 - FILLER WORDS TO IGNORE COMPLETELY
Remove entirely - do not place in any column:
Words: "okay", "right", "um", "uh", "err", "so", "then"
Phrases: "then you've got", "you've got", "we've got", "next you have"

SIGNAL 9 - APPLIANCE AND FIXTURE GROUPING
When the clerk describes parts or components of one appliance or fixture
-> All parts stay in the Description column of that ONE item row
-> Only create a new row when the clerk moves to a completely different item

Example: "Beko freestanding fridge freezer interior fridge door seal three times plastic door shelves light debris"
-> Fridge freezer | Beko freestanding / Interior door seal / 3 x plastic door shelves | Light debris

----------------------------------------
FORMATTING RULES
----------------------------------------

RULE 1 - PARENT ROW RULE
Named areas and location rows ALWAYS get their own row with empty description and condition.
NEVER merge them into another row's condition or description.

These are ALWAYS their own standalone rows:
- Back wall, Facing wall, LHS wall, RHS wall
- Entrance to [any room], Entrance door, Entrance to stairs, Entrance to landing
- LHS perimeter, RHS perimeter, Facing perimeter
- Continuation of [any wall]
- Cupboard, Wardrobe, Porch, Garage, Shed

CORRECT:
{"type":"item","item":"Back wall","description":"","condition":""}
{"type":"item","item":"Entrance to kitchen","description":"","condition":""}
{"type":"item","item":"LHS wall","description":"White painted","condition":"Few small marks ML"}
{"type":"item","item":"Entrance to stairs","description":"","condition":""}

INCORRECT — never do this:
{"type":"item","item":"LHS wall","description":"White painted","condition":"Few small marks ML / Entrance to stairs / Entrance to kitchen"}

RULE 2 - THRESHOLD STANDALONE ROW
Threshold is always its own row. Never merge into door row.

RULE 3 - DOOR AND FRAME SEPARATION
Door frame and door are always separate rows.

RULE 4 - MULTIPLE CONDITION LINES
Each condition phrase on its own line using \n between conditions.

RULE 5 - CONDITION PLACEMENT
Condition goes against the item being described at that moment, not the next item.

RULE 6 - MATCHING ITEMS
Copy the actual description. Never write "matching previous item".

RULE 7 - GO-BACK CORRECTIONS
Find the most recent matching row and add to it. Do not create a new row.

RULE 8 - WORK SURFACE WARNING
All kitchen work surfaces must include this warning in the CONDITION column (not description):
PLEASE DO NOT CUT DIRECTLY ON THESE SURFACES

RULE 9 - APPLIANCE NT DEFAULT
These appliances always get NT in Condition unless clerk explicitly says tested and working:
Oven, hob, extractor fan, microwave, dishwasher, fridge, fridge freezer, washing machine, tumble dryer, freezer.

RULE 10 - CAP AND VALVE
Each on its own line. Never merge.

RULE 11 - DO NOT OVER-SPLIT
Fittings and components belonging to one item stay in that items Description.

RULE 12 - DO NOT DROP CLEANING CONDITIONS
All cleaning conditions must be kept exactly as spoken.

RULE 15 - NEVER MIX ROOM CONTENT
You are processing ONE specific room. Extract ONLY content that belongs to that room.
The transcription contains multiple rooms. You must find where the clerk starts talking about THIS room and stop when they move to the next room.

CRITICAL: Two rooms may sound similar (e.g. Shower Room and Bathroom both have toilets, basins and showers). Do NOT copy content from one into the other.
- Shower Room: look for the clerk saying "shower room" - extract only what follows until the next room name
- Bathroom: look for the clerk saying "bathroom" - extract only what follows until the next room name
- If a bath is mentioned, it belongs to Bathroom, not Shower Room, unless the clerk explicitly says otherwise
- If a black laminate medicine cabinet is mentioned, it belongs to Bathroom
- If a silver metal medicine cabinet is mentioned, it belongs to Shower Room
- Never place a bath or bath panel row inside a Shower Room section

Also fix these additional Whisper misreads:
- "slash grey" in walls description -> /grey (use the / symbol, not the word slash)
- "pomet" / "pelmit" / "perlmutt" -> pelmet
- "white edgy" -> white edging
- "solid crisper" -> salad crisper
- "if fittings are fitted" -> fittings as fitted
- "grey UPVC with seal" / "with seal" (when describing window frame sill) -> with sill

RULE 13 - DO NOT CHANGE WORDS NOT IN CORRECTION DICTIONARY
Only correct confirmed Whisper errors. Never change clear inventory words.
Never substitute a similar word for a spoken word. If the clerk says "fascia" use "fascia". If they say "windowsill" use "windowsill". If they say "Velux" use "Velux". If they say "Vaillant" use "Vaillant". If they say "unable to access" keep it exactly as "Unable to access" in the Condition column.
"Unable to access" is always its own Condition line. Never replace it with an entrance row.

RULE 14 - DESCRIPTION VS CONDITION COLUMN
Matching and material descriptions always go in Description, never Condition.

----------------------------------------
ABBREVIATIONS - use in Condition column only
----------------------------------------
BOM = Burnt on marks | CWA = Consistent with age | DPP = Double power point
FP = Freshly painted | FPM = Furniture pressure marks | FW&T = Fair wear and tear
IU = In use | IUIW = In use and in wear | LHS = Left hand side | LL = Lower level
ML = Mid level | NT = Not tested | ODU = Old defects under/painted over
PM = Paint marked | RC = Requires cleaning | RFC = Requires further cleaning
RHS = Right hand side | SPP = Single power point | SS = Stainless steel
T&W = Tested and working | T&NW = Tested and not working | UL = Upper level

IMPORTANT: Do not replace "requires further wipe" with RFC.

----------------------------------------
TRANSCRIPTION CORRECTIONS - Whisper errors only
----------------------------------------
"kick place" -> kickplates | "you pvc" -> UPVC | "wide wooden" -> white wooden
"grey would affect" -> grey wood effect | "bolt tested" -> bulb tested
"runner tile splashback" -> run of tiled splashback | "kit plates" -> kickplates
"hound base" -> handbasin | "toilet system" -> toilet cistern
"toilet bulb" -> toilet bowl | "pool cord" -> pull cord | "rise a bar" -> riser bar
"blacked out pipe" / "blacked out pipes" -> black gutter pipe / black gutter pipes
"window seals" -> windowsills (only when describing window sills, not actual seals)
"face for property" / "face for a property" -> fascia of property
"V-Lux window fairing" -> Velux window frame
"V-Lux window" -> Velux window
"valent boiler" -> Vaillant boiler
"cooker fuser" -> cooker fuse switch
"stingy nettles" -> stinging nettles
"doesn't block the door" / "doesn't lock the door" -> does not lock
"door opening Hungarian" -> delete entirely, do not include in output
"bolt tested and working" / "bolted and working" -> bulb tested and working
"tail rail" -> towel rail
"tile flashback" -> tiled splashback
"toilet ceiling lid" -> toilet seat and lid
"window seal" -> windowsill (when describing a sill)
"white grounder" -> requires further wipe around
"bulk tested" -> bulb tested
"sealant wiping is smooth" -> ceiling white painted smooth
"sealant painted white" -> ceiling white painted
"brown weaving" -> brown wheelie bin
"metal letterbox around" -> metal letterbox surround
"circular white PVC" -> circular white UPVC
"light roof builders dust" -> light builders dust
"grey metal free-folding" -> grey metal 3 x folding
"baking tray of inset" -> baking tray with inset
"metal door sort of black capture" -> door stop / metal / black cap to skirting
"black capped skirting" -> black cap to skirting
"matching wall tiles" -> always preserve exactly as "Matching wall tiles" in Description
"matching landing" -> always preserve exactly as "Matching landing" in Description
"matching entrance hall" -> always preserve exactly as "Matching entrance hall" in Description
"matching reception room" -> always preserve exactly as "Matching reception room" in Description
"window seal" (when describing a sill) -> windowsill
"grey UPVC seal" -> grey UPVC / With sill
"patio slab resting against" -> preserve exactly: A large patio slab resting against it to keep it closed

----------------------------------------
VOCABULARY REFERENCE LIBRARY
----------------------------------------
Use this to identify correct inventory terms and spellings.

KNOWN INVENTORY ITEMS: ${JSON.stringify(items)}

KNOWN INVENTORY DESCRIPTIONS: ${JSON.stringify(descs)}

KNOWN INVENTORY CONDITIONS: ${JSON.stringify(conds)}

----------------------------------------
OUTPUT FORMAT: Return ONLY a valid JSON array. No markdown, no explanation, no backticks.
Every entry must have type "item" with item, description, and condition fields.
Use \n within strings to separate multiple lines in a cell.

[
  {"type":"item","item":"Door frame","description":"White wooden","condition":""},
  {"type":"item","item":"Door","description":"White wooden panelled\nMetal handle","condition":"PM LL\nLight scuffs"}
]`
}

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

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i]
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

      transcripts.push(transcription.text)
      totalSeconds += Math.round((transcription as any).duration || 0)

      try { await supabase.storage.from('documents').remove([filePath]) } catch(e) {}
    }

    const stitchedTranscript = transcripts.join(' ')
    const roomList = (roomOrder || '').trim().split('\n').filter((r: string) => r.trim()).map((r: string) => r.trim())

    const roomResults = await Promise.all(roomList.map(async (roomName: string) => {
      const systemPrompt = buildSystemPrompt(roomName, items, descs, conds)
      const userMessage = `Property: ${address}
Property size: ${propertySize}
Room: ${roomName}

TRANSCRIPTION:
${stitchedTranscript}`

      let parsed: any[] = []
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
          const raw = response.choices[0].message.content || ''
          console.log(`Room ${roomName} raw (first 300):`, raw.slice(0, 300))
          const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim()
          parsed = JSON.parse(cleaned)
          console.log(`Room ${roomName}: ${parsed.length} entries parsed`)
          break
        } catch (e) {
          console.error(`Room ${roomName} attempt ${attempt} failed:`, e)
          if (attempt === 3) parsed = []
        }
      }

      const rows = parsed
        .filter((r: any) => r.type === 'item' && r.item)
        .map((r: any) => ({
          item: r.item || '',
          description: (r.description || '').replace(/\\n/g, '\n'),
          condition: (r.condition || '').replace(/\\n/g, '\n'),
        }))

      return { roomName, rows }
    }))
    const result = roomResults

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
