import { NextRequest, NextResponse } from 'next/server'
import OpenAI, { toFile } from 'openai'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 300

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

Example: "white boiler unit make Worcester three control dials displays pressure gauge"
-> Boiler | White / Worcester / 3 x control dials / Displays / Pressure gauge |

EXCEPTION: Fridges, fridge freezers, dishwashers and ovens are NOT grouped this way when the clerk names distinct internal compartments (interior door, interior fridge, freezer drawers, top rack, grill compartment, etc.) - see RULE 20.

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

The reverse (interior-facing) side of a door is NEVER labelled by repeating "Door frame"/"Door" again, and NEVER labelled "Reverse of door frame"/"Reverse of door". Always use:
- Interior frame (for the reverse of the door frame)
- Interior door (for the reverse of the door)

Example:
Door frame | White wooden |
Door | 4 panel white wooden / Metal handle |
Interior frame | White wooden |
Interior door | 4 panel white wooden / Metal handle |

RULE 4 - MULTIPLE CONDITION LINES
Each condition phrase on its own line using \n between conditions.

RULE 5 - CONDITION PLACEMENT
Condition goes against the item being described at that moment, not the next item.

CRITICAL WALL CONDITION RULE:
Marks, scuffs, rubs, patchy paint, scratches and similar wall conditions always stay with the WALL row they are spoken against — never move them to the item near them.

CORRECT:
{"type":"item","item":"Back wall","description":"","condition":"A few small rub marks to wall reveal / Slightly patchy around DPP"}
{"type":"item","item":"DPP","description":"White","condition":""}

INCORRECT:
{"type":"item","item":"Back wall","description":"","condition":"A few small rub marks to wall reveal"}
{"type":"item","item":"DPP","description":"White","condition":"Slightly patchy around DPP"}

The clerk is describing the wall condition. "Around the DPP" tells you WHERE on the wall — it does not mean the DPP has a condition.

RULE 6 - MATCHING ITEMS
Copy the actual description. Never write "matching previous item".

RULE 7 - GO-BACK CORRECTIONS
Find the most recent matching row and add to it. Do not create a new row.

RULE 8 - WORK SURFACE WARNING
The warning PLEASE DO NOT CUT DIRECTLY ON THESE SURFACES applies ONLY in Kitchen and Utility Room.
NEVER include it in Bathroom, En-Suite, Shower Room or any other room.

Within Kitchen or Utility Room, include this warning ONLY ONCE per room - on the Condition of the very FIRST Surface row encountered in that room. Every subsequent Surface row in the same room must NOT repeat the warning - use only that row's own spoken condition details (or leave empty if none were spoken).

CORRECT (first Surface in Kitchen gets the warning, later Surfaces in the same Kitchen do not):
{"type":"item","item":"Surface","description":"Light wood effect Formica","condition":"PLEASE DO NOT CUT DIRECTLY ON THESE SURFACES"}
... later in the same Kitchen ...
{"type":"item","item":"Surface","description":"Run of the surface","condition":"Chip above pull-out drawers"}

INCORRECT - never repeat the warning on every surface row in the same room:
{"type":"item","item":"Surface","description":"Run of the surface","condition":"PLEASE DO NOT CUT DIRECTLY ON THESE SURFACES"}
{"type":"item","item":"Surface","description":"Run of the surface","condition":"PLEASE DO NOT CUT DIRECTLY ON THESE SURFACES"}

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

CRITICAL: Two or more rooms may sound similar (e.g. Shower Room, Bathroom and En-suite can all have toilets, basins and showers). Do NOT copy content from one into another.
- Shower Room: look for the clerk saying "shower room" - extract only what follows until the next room name
- Bathroom: look for the clerk saying "bathroom" - extract only what follows until the next room name
- En-suite: look for the clerk saying "en-suite" or "ensuite" - extract only what follows until the next room name
- If a bath, bath panel, bath drain, bath overflow or mixer tap is mentioned, it belongs to Bathroom, not Shower Room and not En-suite, unless the clerk explicitly says otherwise
- If a shower cubicle, separate shower tray, or shower-only fittings are mentioned without any bath, this usually belongs to Shower Room or En-suite, not Bathroom
- If a black laminate medicine cabinet is mentioned, it belongs to Bathroom
- If a white laminate medicine cabinet is mentioned, it belongs to En-suite
- If a silver metal medicine cabinet is mentioned, it belongs to Shower Room
- Never place a bath or bath panel row inside a Shower Room or En-suite section
- Never place shower-cubicle-only rows (e.g. Mira Azora shower, shower tray, shower cubicle) inside the Bathroom section if the clerk said En-suite or Shower Room for those rows

GENERAL ROOM-BOUNDARY VALIDATION (applies to every room, not just bathrooms):
Before including any row, check that its content category actually matches the room you are processing.
- Front Entrance / Entrance doors should contain door, frame, threshold, doormat and lock/handle content - NOT ceiling, light fitting, heat alarm or sloped ceiling content. That content belongs to Kitchen or another room.
- Kitchen should start with ceiling, light fitting, heat alarm or sloped ceiling content (if mentioned) followed by units, worktops and appliances - NOT door, doorframe, threshold or doormat content. That content belongs to Front Entrance or another entrance room.
- If you find yourself about to write a row whose content category clearly belongs to a different, adjacent room (for example door/doormat content while processing Kitchen, or ceiling/heat-alarm content while processing Front Entrance), STOP including it. That content was spoken about a different room and must be excluded entirely, even if it appears adjacent to this room's content in the transcription.
- When in doubt about which room a passage belongs to, prefer leaving it out over including it in the wrong room.

Also fix these additional Whisper misreads:
- "metal spike hole" / "spike hole" -> metal spyhole
- "threshold lock" (when describing a door handle/lock mechanism, not an actual threshold) -> twist lock
- "frightened clean" / "frightened clean and new" -> delete "frightened" entirely, keep only "clean" or "clean and new"
- "UPVC Venetian blind" -> plastic Venetian blind (Venetian blinds are plastic, not UPVC)
- "slash grey" in walls description -> /grey (use the / symbol, not the word slash)
- "pomet" / "pelmit" / "perlmutt" -> pelmet
- "white edgy" -> white edging
- "solid crisper" -> salad crisper
- "if fittings are fitted" -> fittings as fitted
- "grey UPVC with seal" / "with seal" (when describing window frame sill) -> with sill

RULE 16 - INVENTORY TERM CORRECTIONS
Never use the word "laminar" in any output. If the transcription produces "laminar" correct it to "laminate".
Never use the phrase "floor rim" as an inventory item. If the phrase appears in relation to shower flooring, tiled floor, drain, bath base or floor area, correct it to "Flooring".
Always prefer standard inventory terms: laminate, flooring, windowsill, pelmet, doorstop, letterbox surround, letterbox flap, patio slab, fittings as fitted.

RULE 17 - SECONDARY CONDITION PRESERVATION
Do not drop secondary condition notes. When an item has a main defect followed by an additional explanation, both must be retained in the Condition column.

Examples of secondary conditions that must NEVER be dropped:
- "Lock is misaligned and does not lock. A large patio slab is resting against it to keep it closed." -> BOTH lines must appear
- "No lock present. A piece of wood is resting against the meter box to keep the door closed." -> BOTH lines must appear
- "Cleat present but not attached to wall." -> must appear even if it follows other condition text
- "Cap present, valve present." -> must appear as separate condition lines

These follow-on details explain security, safety, access or condition and must never be shortened or omitted.

RULE 18 - PROP / SUPPORT / SECURITY WORDING
Any phrase involving an item being propped, held, supported, resting against, unable to access, does not lock, misaligned, jammed, stuck, loose, missing, or not attached must be preserved EXACTLY in the Condition column.
These phrases are legally and practically important in property inventory reports and must never be paraphrased, shortened or omitted.

CORRECT:
{"type":"item","item":"Door","description":"Grey wooden panelled / Lock","condition":"Lock is misaligned / Does not lock / A large patio slab resting against it to keep it closed"}

INCORRECT:
{"type":"item","item":"Door","description":"Grey wooden panelled / Lock","condition":"Lock is misaligned / Does not lock"}

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

RULE 19 - UNIT HOUSING WORDING
When the clerk describes an appliance as "[Brand] unit housing [components]" (this applies to washer dryer, washing machine, dishwasher, tumble dryer):
-> ITEM = "Unit housing [Brand] [appliance name]"
-> DESCRIPTION = only the housed components, written naturally (e.g. "Soap tray, door, controls & seal")
-> CONDITION = each defect on its own line using \n, never repeated twice for the same issue

Example: "Zanussi unit housing soap tray door and controls seal NT large shaded mark to the inside door soap tray soiled throughout requires cleaning door and controls dusty seal scale lint debris requires further cleaning"
-> Unit housing Zanussi washer dryer | Soap tray, door, controls & seal | NT\nLarge shaded mark to the inside door\nSoap tray soiled throughout\nDoor and controls dusty\nSeal scale\nLint debris\nRequires further cleaning

Never write "requires cleaning" as its own separate condition line if it is immediately followed by "requires further cleaning" describing the same defect - keep only the more specific final phrase, do not duplicate.

RULE 20 - MULTI-COMPARTMENT APPLIANCES (Fridge / Fridge Freezer / Dishwasher / Oven)
Do NOT bulk a fridge, fridge freezer, dishwasher or oven's internal compartments into one row's Description. When the clerk names a distinct compartment (interior door, interior fridge, freezer interior door, freezer drawers, top rack, bottom rack, grill compartment, etc.), give each named compartment its OWN row.

CORRECT:
{"type":"item","item":"Fridge freezer","description":"White freestanding","condition":""}
{"type":"item","item":"Fridge door interior","description":"2 x interior door compartments\nBottle compartment","condition":""}
{"type":"item","item":"Fridge interior","description":"White freezer flap door\n2 x glass shelves with white plastic edging trim\nPlastic salad crisper","condition":"NT\nOdour to the fridge\nGlass shelves require further wipe"}

INCORRECT - never merge all compartments into the main appliance row:
{"type":"item","item":"Fridge freezer","description":"Zanussi Unit housing Interior door has 4 x clear plastic door shelves Interior fridge 5 x glass shelves with white edging 2 x clear plastic crispers Freezer interior door 3 x clear plastic freezer drawers","condition":"NT Odour to the fridge..."}

RULE 21 - NEVER OUTPUT CONTRADICTORY CONDITION STATES
Do not add "Tested" or "T&W" wording to a row whose condition already says NT (Not tested). These are direct contradictions - an item cannot be both not tested and tested in the same row.
If the clerk only said NT, the condition is NT and nothing else. Only add tested/working wording if the clerk explicitly says the item was tested and is working.

CORRECT: {"type":"item","item":"Door entry phone","description":"White plastic Comelit","condition":"Dusty\nNT"}
INCORRECT - never add unsupported tested wording: {"type":"item","item":"Door entry phone","description":"White plastic Comelit","condition":"Dusty\nNT\nTested"}

RULE 22B - STRIP CASUAL CONVERSATIONAL PHRASING
Inventory reports use stripped, terse condition language, never casual spoken phrasing. If the clerk says "it's dusty", "it's marked" or similar "it's [condition]" phrasing, strip "it's" and output only the condition word(s): "Dusty", "Marked", etc. The same applies to "it is", "that's", "there's" when they precede a condition word.

RULE 22 - PRESERVE EXACT INVENTORY PHRASES
Some inventory phrases sound like other words but must always be preserved exactly as these specific terms. Never substitute a similar-sounding word for these:
- "rucking" (carpet/flooring condition, e.g. "slightly rucking on entrance") - never write "racking"
- "filler-like" (e.g. "filler-like repair mark") - never write "filler light"
- "wash-like" (e.g. "wash-like mark") - never write "wash light"
- "with grouting" (tiled surfaces) - never shorten or alter to "grouty" or similar
- "obscured glass" - never write "obscure glass"
- "rusting" (e.g. "rusting LL") - never write "rust in"

When a clerk says a matching reference inside a room (e.g. "carpet matching bedroom" while describing a wardrobe inside that same bedroom), preserve the matching reference exactly as spoken. Do not substitute a different room name (e.g. never change "matching bedroom" to "matching entrance hall" or any other room).

Do not drop colour or material qualifiers that precede an item description. If the clerk says "white plastic Venetian blind", the output must include both "white" and "plastic" - never drop to just "Venetian blind / Plastic" without the colour.

----------------------------------------
TRANSCRIPTION CORRECTIONS - Whisper errors only
----------------------------------------
"kick place" -> kickplates | "you pvc" -> UPVC | "wide wooden" -> white wooden
"draft" -> always correct to "draught" (e.g. "draft excluder" -> draught excluder, "draft shaded" -> draught shaded)
"basin shelf" (under-sink unit context) -> base and shelf
"Ideal Logic" -> Ideal Logik (boiler brand spelling)
"racking" (when describing carpet/flooring condition near an entrance or doorway) -> rucking
"filler light" -> filler-like | "wash light mark" -> wash-like mark
"grouty" -> with grouting | "obscure glass" -> obscured glass | "rust in" (location band condition, e.g. "rust in LL") -> rusting
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
"shared felt" -> felt roofing (Whisper mishears "shed felt roofing" — "shed" is a parent row, "felt roofing" is the first item inside it)
"overgrown forage" -> overgrown throughout
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
GENERAL CORRECTION EXAMPLES
----------------------------------------
These show the TYPE of error to fix, not just one specific property.

EXAMPLE 1 - Bulb testing wording:
Whisper output: "5 x spotlights both tested and working"
WRONG: Spotlights | 5 x | Both T&W
CORRECT: Spotlights | 5 x | Bulbs T&W
Rule: When clerk says bulbs/spotlights are tested, condition is always "Bulbs T&W" not "Both T&W"

EXAMPLE 2 - Stray words inserted by Whisper:
Whisper output: "all 3 blinds have in pull cords with plastic cleats"
WRONG: All 3 blinds have in pull cords with plastic cleats
CORRECT: All 3 blinds have pull cords with plastic cleats
Rule: Remove stray words that Whisper inserts mid-phrase that break the grammar

EXAMPLE 3 - Duplicate condition words:
Whisper output: "light builders dust light builders dust to all shelves"
WRONG: Light builders dust / Light builders dust
CORRECT: Light builders dust to all shelves
Rule: When the same phrase appears twice consecutively it is a Whisper duplication — merge into one and keep any extra detail that follows

EXAMPLE 4 - Matching description doubled:
Whisper output: "flooring matching bedroom matching landing"
WRONG: Flooring | Matching bedroom matching landing
CORRECT: Flooring | Matching landing
Rule: When "matching X matching Y" appears keep only the final matching reference

EXAMPLE 5 - Never drop spoken condition details:
Whisper output: "lock is misaligned and does not lock a large patio slab resting against it to keep it closed"
WRONG: Condition | Lock is misaligned / Does not lock
CORRECT: Condition | Lock is misaligned / Does not lock / A large patio slab resting against it to keep it closed
Rule: Every spoken condition phrase must appear in the output. Never drop details even if they seem unusual or long

EXAMPLE 6 - Do not invent detail not spoken:
Whisper output: "metal letterbox"
WRONG: Metal letterbox surround with metal letterbox flap
CORRECT: Metal letterbox
Rule: Only write what was spoken. Never add surround, flap or any other detail the clerk did not say

EXAMPLE 7 - UPVC always has the U:
Whisper output: "white PVC window frames"
WRONG: White PVC window frames
CORRECT: White UPVC window frames
Rule: Whisper always drops the U from UPVC — always restore it

EXAMPLE 8 - Fittings wording:
Whisper output: "white UPVC windows if fittings are fitted"
WRONG: White UPVC windows if fittings are fitted
CORRECT: White UPVC windows / Fittings as fitted
Rule: "if fittings are fitted" and "fittings are fitted" are always Whisper misreads of "fittings as fitted"

EXAMPLE 9 - Outbuilding parent row before contents:
Whisper output: "shed felt roofing wooden panels to the side grey wooden panelled door"
WRONG:
{"type":"item","item":"Roofing","description":"Shared felt","condition":""}
CORRECT:
{"type":"item","item":"Shed","description":"","condition":""}
{"type":"item","item":"Roofing","description":"Felt","condition":""}
{"type":"item","item":"Panels","description":"Wooden / To side","condition":""}
{"type":"item","item":"Door","description":"Grey wooden panelled","condition":""}
Rule: Outbuilding names (Shed, Garage, Porch, Store cupboard, Garden office) are always their own parent row. The outbuilding name is never merged into the first item inside it. This also prevents Whisper stitching "shed" onto the next word.

EXAMPLE 10 - Never drop follow-on security and condition notes:
Whisper output: "lock is misaligned and does not lock a large patio slab resting against it to keep it closed"
WRONG: Condition | Lock is misaligned / Does not lock
CORRECT: Condition | Lock is misaligned / Does not lock / A large patio slab resting against it to keep it closed
Rule: Never drop follow-on condition or security notes after words like: does not lock, misaligned, resting against, kept closed, unable to access, propped, held, stuck, jammed, not attached. These details are legally important in property inventory reports.

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
          const parsed = JSON.parse(cleaned)
          console.log(`Room ${roomName} attempt ${attempt}: ${parsed.length} entries parsed`)

          rows = parsed
            .filter((r: any) => r.type === 'item' && r.item)
            .map((r: any) => ({
              item: r.item || '',
              description: (r.description || '').replace(/\\n/g, '\n'),
              condition: (r.condition || '').replace(/\\n/g, '\n'),
            }))

          // A room genuinely has no content very rarely - an empty result is much more likely a
          // non-deterministic failure to find the room in the transcript. Retry rather than silently
          // dropping the room (this was the root cause of a whole Bathroom vanishing on one run with
          // no prompt change at all - same input, different output).
          if (rows.length > 0) break
          console.warn(`Room ${roomName} attempt ${attempt}: parsed successfully but got 0 rows - retrying`)
        } catch (e) {
          console.error(`Room ${roomName} attempt ${attempt} failed:`, e)
        }
        if (attempt < 3) await new Promise(r => setTimeout(r, 500))
      }

      if (rows.length === 0) {
        console.error(`Room ${roomName}: 0 rows after 3 attempts - this room may be missing from the final document`)
      }

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
