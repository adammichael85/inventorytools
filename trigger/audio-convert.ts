import { task, logger } from "@trigger.dev/sdk/v3"
import { createClient } from "@supabase/supabase-js"
import OpenAI, { toFile } from "openai"
import { dedupeLines, findMissingFixtures, buildSystemPrompt, RECONCILIATION_SYSTEM } from "@/lib/audioPrompt"
import ws from "ws"

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
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { global: { fetch: fetch }, realtime: { transport: ws as any } }
    )

    let hasSetStartedAt = false
    async function updateJob(status: string, progress: number, message: string, roomStatuses?: Record<string, string>, roomNames?: string[], rooms?: any[], conversionId?: string) {
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
        conversion_id: conversionId || undefined,
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

      const items: string[] = ["Wall","Ceiling","Door","Door frame","Doorframe","Doorframe interior","Interior door frame","Interior frame","Interior door","Door interior","Reverse of door","Reverse of door frame","Reverse of doorframe","Back wall","Facing wall","LHS wall","RHS wall","Continuation of wall","Continuation of the wall","Run of wall","Turn of wall","Entrance","Entry","Open archway","Open walkthrough","Porch","Hallway","Recess","Cupboard","Cupboard interior","Double opening cupboard","Unit","Single unit","Double unit","Base unit","Wall unit","Narrow unit","Lift up unit","Under sink unit","White unit door","Drawer","Pull out drawer","Shelf","Shelves","Wooden shelf","Wooden slatted shelf","White wooden shelves","Floating shelf","Large white laminate shelf","White laminate divide","Wardrobe","Fitted wardrobe","Wardrobe interior","Mirrored sliding doors","Opaque Perspex sliding doors","Sliding doors","Pelmet","Metal pelmet","Hanging rail","Chrome hanging rail","Grey hanging rail","White hanging rail","Chrome support","Gun cabinet","Divan bed base","Mattress","Duvet","Duvet cover","Footstool","Ironing board","TV stand","Electric heater","Dimplex heater","Grey Dimplex heater","Creda wall heater","White wall mounted heater","Radiator","White radiator","Double radiator","Panelled radiator","Heated towel rail","Thermostat","Thermostat control","Time Guard thermostat control","Honeywell heating control","Drayton heating control","White Dimplex heating control","Vaillant boiler","Worcester boiler","Gledhill tank","Large white Gledhill tank","Grey cylinder","Magna clean black cylinder fitting","Fuse box","Main fuse box","Fuse board","White fuse box","Grey plastic main fuse box","Grey electrical box","Schneider electric box","Alarm box","Alarm blank fuse point","Bell casing","Doorbell","Door bell chime","Doorbell fitting","Door entry phone","Belissimo door entry phone","Videx door entry telephone system","Secure fitting","Access panel","White access panel","White plastic access panel","Loft hatch","Pipework","Pipe work","Various pipework","Lagged pipes","Pipes behind","Router","Cable","Cabling","Cable trunking","Cable clipped","Key box","White metal key box","Smoke alarm","Smoke alarm fitting","Carbon monoxide alarm","Heat alarm","Sensor","PIR sensor","Light fitting","Ceiling light","Rose light fitting","Wall light fitting","Spotlight","Downlight","Extractor fan","Light switch","Single light switch","Double light switch","Triple light switch","Fuse switch","Isolator switch","Single power point","Double power point","Outside DPP","Telephone point","Telecom point","Openreach point","Virgin point","Virgin media point","TV point","TV aerial point","Triple TV point","Double TV point","Vent","Chrome vent","Square vent","White circular vent","Brown vent","Plastic box fitting","White plastic fitting","Meter box","Gas meter box","Electric meter box","Smart meter","Nest fitting","Black smart meter","Window","Window frame","Window sill","Windowsill","Window reveal","Sill","Narrow sill","Tiled sill","Door mat","Coir mat","Built in coir doormat","Rubber framed doormat","Woven mat","Threshold","Wooden threshold","Large wooden threshold","Metal threshold","Silver threshold","Brass threshold","Chrome threshold","Aluminium gripper strip","Chrome gripper strip","Silver metal gripper strip","Metal gripper strip","Grey wood effect gripper strip","Curtain pole","Black curtain pole","Wooden curtain pole","Metal curtain pole","Curtain","Net curtain","Blind","Roller blind","Roman blind","Day/night blind","Venetian blind","Mirror","Large mirror","Framed mirror","Coving","Skirting","Dado rail","Picture rail","Tongue and groove panelling","White tongue and groove panelling","Plinth","White plinth","Plinth with hooks","Peg hooks","Black metal double hooks","Coat hooks","Doorstop","Chrome doorstop","Metal doorstop","Spring doorstop","Flooring","Floor","Carpet","Fitted carpet","Grey carpet","Dark grey carpet","Grey fleck carpet","Brown fitted carpet","Laminate flooring","Wood laminate","Mid wood laminate","Dark wood effect laminate","Mid wood effect laminate","Grey wood effect laminate","Vinyl","Grey wood effect vinyl","Tile effect vinyl","Ceramic tiles","Mottled ceramic tiles","Dark grey ceramic tiles","Light grey mottled ceramic tiles","Kitchen units","Kitchen unit","Kickplate","Kickplates","Kickboard","Kickboards","Worktop","Work surface","Work surfaces","Formica work surface","Splashback","Run of splashback","Tiled splashback","Sink","Sink drainer","Drainer grooves","Wash handbasin","White square ceramic wash handbasin","Basin","Pedestal basin","White porcelain pedestal basin","Mixer tap","Chrome mixer tap","Hot and cold mixer tap","Bath","Bath panel","Tiled bath panel","Shower","Shower screen","Glass shower screen","Shower tray","Shower hose","Chrome shower hose","Shower head","Chrome shower head","Chrome/white shower head","Chrome riser bar","Chrome cradle","Chrome bracket","Chrome double shower control","Chrome shower control","Soap dish","Plastic soap dish","Toilet","White toilet","Cistern","Toilet seat","Toilet roll holder","Chrome toilet roll holder","Chrome double flush","Chrome dispenser","Chrome beaker holder","Chrome pop up plug","Push up push down plug","Washing machine","Dishwasher","Fridge freezer","Fridge","Freezer","Oven","Candy oven","Hob","Candy hob","Extractor hood","Microwave","Baumatic microwave","Cutlery divider","Wire rack","Tray","Garage door","Up and over door","Shed","Storage shed","Gate","Pedestrian gate","Garden gate","Fence","Fence panel","Fencing","Wooden fencing","Wooden panelled fencing","Wooden slatted fencing","Retaining wall","Brick retaining wall","Capping stone","Patio","Patio slabs","Concrete path","Stone driveway","Stone border","Soil border","Lawn","Garden lawn","Area of lawn","Large area laid to lawn","Gravel","Pea shingle","Gravel bag","Log edging","Wood rolled log edging","Brick edging","Drain","Metal drain","Outside tap","Guttering","Black guttering","White guttering","Downpipe","Fascia","Fascia board","Soffit","Roof","Tiled roof","Porch roof","Wheelie bin","Recycling bin","Recycling bag","Recycling box","Green recycling bag","Green recycling box","Post box key","Balcony door","Patio door","Football","Pots of paint","Spare wooden floorboards"]
      const descs: string[] = ["Painted white","White painted","Painted white smooth","White smooth","White painted smooth","White painted stipple Artex","White stipple Artex","Painted white Artex","White painted Artex","Painted cream","Painted off white","Painted grey","Painted light brown","Painted stone","Painted dark green","Painted white with white painted dado rail","White painted dado rail","Grey painted","Painted red/brown","White","Cream","Grey","Sage green","Dark wooden","White wooden","Brown wooden","Pine single panelled","Wooden smooth door","Wooden door","White panelled","White painted panelled","Cream panelled","Panelled","Panelled, painted white","6 panel white wooden door","Single panel white wooden door","Light wood effect veneer","Dark wood inlay","Wood grain effect","Wood effect","White UPVC","White UPVC window frame","White UPVC window","White UPVC frames","White UPVC threshold","White UPVC fascia boards","White UPVC fascia board and soffit","White UPVC tongue and groove panelled ceiling","White wooden tongue and groove panelling","Tongue and groove panelling","White wooden narrow top edging","White wooden top edge","White wooden panels","White painted woodwork","Wooden, painted white","Leaded glass transom","Glass transom","Reverse of transom","Pane of glazing","Glass pane UL","2 panes of glazing","4 panes of glazing","15 panes of glazing","Reverse of glazing","Reverse of panes of glazing","Decorative glazing","Leaded glass","Obscured glass","Square leaded light glazing","Chrome handle","Brass handle","Metal handle","Chrome knob handle","Brass knob","Chrome lever handle","Chrome handle and lock","Chrome handle with lock","Chrome handle with lock insert","Chrome handle with twist lock","Brushed metal/chrome handle","Silver D shaped handles","Silver peg handles","Wooden effect plastic square knob handles","Chrome 2","Chrome 9","Chrome 10","Chrome 32","Metal 79","Metal number","Metal spy hole","Chrome spyhole","Brass spyhole","Reverse of spyhole","Spyhole","Yale lock","Yale lock insert","Chrome Yale lock","Chrome Yale lock case","Chrome Yale lock surround and finger pull","Metal Yale lock with handle","Brass Yale lock","Chubb lock","Chrome Chubb lock","Chrome Chubb lock with flap","Brass Chubb lock","Metal lock","Chrome lock","Chrome lockable fittings","Lockable","Fittings lockable","Fittings as fitted","Additional security locks","Security fitting","Security lock key present","Key in situ","No keys","Chrome twist lock","Metal twist lock","Metal sliding bolt","Chrome sliding bolt","2 sliding bolts","Chrome chain fitting","Chrome chain lock","Security chain","Chrome chain lock receiver","Metal chain fitting","Chain to frame","Door closer UL","Chrome letterbox","Chrome letterbox with flap","Chrome framed letterbox with silver flap","Chrome & black letterbox","Black framed letterbox","Brass letterbox","Brass letterbox flap","Brass knocker","Metal door knocker","White draught excluder with black bristles","Chrome draught excluder","Grey foam stuck to LL edge","Grey foam to LL","White plastic hook","White plastic hook to LL","White plastic hook to RHS door","Chrome weather board","Black overhang","Wooden ends","Flex","Bulb","Flex and bulb","Flex and bulbs","Pull cord","Pull cord, toggle","Cord and toggle","Cream material shade","Cream card shade","Grey clear droplet shade","White card shade","Cream rubbed card shade","Opaque glass shade","Opaque / white circular light fitting","White circular flush light fitting","Square white plastic light fitting","Silver circular light fittings with silver wavy arms","Silver triangular light fitting","Chrome circular light fitting","Chrome and black square light fitting","2 spotlights with chrome surrounds","3 spotlights","3 spotlights and shades","4 spotlights","6 spotlights","Light fitting with bulb","Bulb T&W","Brass light fitting with brass chain","Glass panelled shade","2 white light fittings","Rose light fitting","White light fitting","White plastic","Cream plastic","Chrome fitting","Metal fitting","Black fitting","Brushed metal fitting","Brushed metal DPP","Brushed metal and plastic double light switch","Brushed metal and plastic triple light switch","White plastic SPP","White SPP","White DPP","2 DPP","2 white DPPs","White double light switch","White single light switch","White isolator switch","White fuse switch","White access panel","White plastic access panel","PP with flex and plug","Flex and plug","Cable coming through","Cable clipped around","Cable clipped to skirting","Cable clipped around doorframe","Painted over cable clipped","Grey Yale casing","Smart meter","Electric meter","Main fuse box","2 main fuse boxes","2 main fuse boxes with flaps","Corkboard","Byron wireless doorbell","Thermostat valve","Thermostat valve and cap","Thermostat valve RHS cap missing","Radiator grille, thermostat, cap","Radiator cap","Radiator cap, thermostat valve","Grille to top","Cap and valve present","Cap present","Both caps present","Flap over the controls","Flex going to fuse switch","Flex going into a fuse","White pipes","Silver pipework","Various pipes","Various pipe work","Pipework coming through","Pipes behind","Lagged pipes","Wooden slatted shelf","White header tank","Large white Gledhill tank","Grey cylinder","Chrome drainage","SS drainage","Chrome overflow","Chrome lever mixer tap","Chrome hot & cold taps","Hot and cold mixer tap set to the work surface","Chrome circular control","Chrome pop up plug","Chrome push up push down plug","Chrome push button","Chrome double flush","Chrome riser bar","Chrome shower hose","Chrome/white shower head","Chrome cradle","Chrome bracket","Plastic soap dish","Glass shower screen","Rubber strip LL","Silver edging","Silver strip around","White sealant","White grouting","Grey grouting","Light grouting","Chrome toilet roll holder","Chrome dispenser","Chrome beaker holder","Glass present","White seat and lid","White porcelain pedestal basin","4 built in drainer grooves","2 white wire racks","Grey plastic cutlery divider","3 control knobs","4 control knobs","4 black burners","2 trivets","Black glass door","SS bar handle","Chrome wire rack","Grey tray","Instruction manual within","Model no","Serial no","Make unknown","Grey brick effect tile","White ceramic tiles with grey grouting","Cream mottled tiles with grey grouting","Grey mottled ceramic tiles","Natural coloured mottled ceramic tiles","Dark grey tiles with white grouting","Dark grey ceramic tiles with white grouting","Light grey mottled ceramic tiles","White vinyl with grey pattern","Grey wood effect vinyl","Wood laminate","Mid wood laminate","Dark wooden laminate","Dark wood effect laminate","Mid wood effect laminate","Grey wood effect laminate","Light wood laminate","Continuation of laminate","Continuation of flooring","Continuation of carpet","Continuation of grey carpet","Continuation of dark wooden laminate","Matching beading","Matching beaded edging","Matching edging","White beading around edges","Grey fleck carpet","Grey carpet","Dark grey carpet","Brown fitted carpet","Brown waffle carpet","Beige carpet","Wooden Formica","Formica","Dark wood effect","Black speckled gloss","Work surface","Worktop","Please do not cut directly on these surfaces","Matching the units","Matching units","Brush metal bar handle","Brushed metal bar handles","Dark wooden with brushed chrome handles","Grey panelled","White wooden panelled","White ceramic knob handles","Black wrought iron handle","Black wrought iron door handle","Black wrought iron door knob","Black wrought iron fittings","Metal pull bar","Shelf","1 shelf","2 shelves","2 white wooden shelves","Base","1 base","1 base, 1 shelf","1 base, 2 shelves","Wardrobe interior","White base","White hanging rail","Grey hanging rails","2 grey hanging rails","Chrome hanging rail","Wooden shelf","White waffle blanket","2 mirrored doors with silver edging","2 mirrored sliding doors with silver edging","2 opaque Perspex sliding doors","Metal trims","Metal pelmet","White metal pelmet","Doors good on their runners","2 keys","4 keys","Empty","White curtain pole","Black curtain pole","Wooden curtain pole","Metal curtain pole","2 metal fittings","Ball finial","Decorative finials","White rings","White ball finials","Metal beaded pull cord","Metal beaded pullcord","3 pull cords and finials","3 x pull cords with toggles","4 white pullcords going into 1 silver toggle","Plastic cleat","Cleat","White beaded pull cord, cleat present","White metal bar LL","Brown wooden Venetian blind","Red circular patterned Roman blind","2-tone grey floral patterned Roman blind","2-tone grey floral roller blind","Blue chrome eyelet top \u00be-length unlined curtain","Dark red \u00be-length lined tab top curtains","White net curtain","White handle","White handle, Yale lock insert","Brass handles","Chrome hook handles","Chrome swivel locks","Trickle vent","2 trickle vents","Blind fitting to UL","No blind","Manuals stored","Rubber seal","Bottle compartment","Built in coir doormat","Black rubber framed black and grey carpeted doormat","Brown house patterned coir mat","No lid","No key","No access","Unable to fully inspect","Contents not inspected","Not inspected beneath furniture","Bed not fully inspected as made up at check-in","Various items not fully listed","Pots of paint stored","Spare wooden floorboards","Paint marked","Rubbish on the floor","Wooden post","Wooden fence posts","Wooden panelled fencing","Wooden slatted fencing","Metal ring pull handle","Metal ring pull handle latch","Corresponding latch fitting on post","Capping stones","Concrete path leading to front door","Stone border","Brick edging","Wood rolled log edging","Log chips","Patio slabs","Flagstone steps","Gravel","Pea shingle","Drain","Metal drain","Plants","Small shrubs","Hedge","Mature shrubs","Tiled roof","White guttering","Black guttering","Black gutter and downpipe","Black plastic guttering and downpipes","White fascia boards","White soffits","White painted render","White painted brickwork","Black plastic outside light fitting with glass panels","Black outside light fitting with 4 glass panels and bulbs"]
      const conds: string[] = ["T&W","T&NW","NT","PM","Lightly PM","Slightly PM","PM LL","PMs to edges","Few PMs to edges","Fitting PM","Fitting lightly PM","RC","RFC","ODU","FPM","FPMs","CWA","CWA&U","FW&T","IU","IUIW","Well IUIW","FP","All FP","Freshly painted","Tested and working","Tested and not working","Bulb T&W","Taps T&W","Lock T&W","Blind T&W","Doorbell T&W","All T&W","No smoke alarm","No bulb","No flap","No flap to spyhole","No cap","Cap missing","Handle cap missing","Dusty","Slightly dusty","Lightly dusty","Heavily dusty","Dusty and debris","Debris","Light debris","Dirty","Soiled","Clean","Requires cleaning","Requires further cleaning","Requires a wipe","Require a wipe","Both require a wipe","All requires a wipe","Requires cutting","All requires cutting","Requires trimming","Grass is long","Overgrown","Long grass","Muddy patches","Patchy","Generally patchy","Patchy throughout","Patchy in places","Patchily painted","Paint slightly patchy","Slightly patchy to edges","Thinly painted","Thinly and patchily painted","Painted over defects","Painted over chips","Painted over screw","Painted over nail","Painted over cable clipped","Painted over wooden boarded section","Painted over pipework","Heavy defects filled and painted over","Paint touch up marks","Lighter paint touch up marks","Lighter white over PM","Scuffs","Few scuffs","Light scuffs","Light scuffs LL","Light scuffs ML","Scuffs LL","Scuffs ML","Scuffs UL","Light scuff marks","Light scuff marks LL","Light scuffs mid to LL","Light scuffs and rubs","Few light scuffs and rubs LL","Scuff marks","Scuffed in places","Scuffed to ML","Scuffed and marked","Shaded, scuffed and marked","Rubs","Rubbed","Lightly rubbed","Generally rubbed","Angles generally rubbed","Angle slightly rubbed","Slight rubbed marks","Light rubs","Light rubs and marks","Light rubs and scuffs","Rubs and marks","Rubs and marks in places","Various rubs and marks","Grubby marks","Few grubby marks","Grubby to wall angle","Grubby around handle","Grubby around extractor fan","Grubby shading marks","Heavy grubby marks","Heavily grubby around light switch","Black marks","Black scuffs","Numerous black scuffs","Splash marks","Few splash marks","Paint splash marks","A few paint splash marks","Scattered paint speckle marks","A few minor paint speckles","Spot marks","Few scattered spot marks","Stains","Water stains","Water stains to edges","Water stains to LHS","Surface water stained and swollen","Water swollen","Shelf is water swollen","Large tank is heavily water stained to top surface","Bleach staining","Blue staining","Discoloured","Slightly discoloured","Generally discoloured","Yellowed","Generally yellowed","Slightly yellowing","Sealant discoloured marks around","White staining","Marked","Light marks","Few marks","A few marks","Various marks","Heavily scuffed and marked","Shaded marks","Slightly shaded marks","Shaded line to centre","Shaded","Shaded to LL","Shaded to mid to LL","Shading","Shading marks","Green shading to LL","Flattened to walkways","Flattened and shaded to walkways","Slightly flattened and shaded to walkways","Slightly lightened on entry","Heavily lightened","Lightened","Lightly darkened to edges","Usage marks","Light usage marks","Light usage marks mid to LL","Scratched","A few scratches","Few scratches","Surface scratch marks","A few minor surface scratches","Few minor surface marks","Scratches around Yale lock","Scratches to fascia","Scratches ML","Handle scratched and PM","Handle is scratched","Handle is generally scratched","Handle is heavily scratched","Dented","Damaged","Loose","Slightly loose","Handle is loose","Part of fascia slightly loose","One is loose","Coming off nails","Missing","LHS cap missing","Pelmet missing","No keys","No access","Unable to fully inspect","Contents not inspected","Not inspected beneath furniture","Bed not fully inspected as made up at check-in","Slightly gapping from wall","Lightly gapping to wall above","Boards slightly gapping","Gapping off facing wall edge","Slightly rickety","Door streaky","1 x door streaky","Streaky","Chipped","A few small chips","Few scattered chips","Few minor chips","Few small chips to front edge","Few small chips to edges","Chipped UL","Chipped LL","Chipped RHS","Chipped LHS","Chipped to edges","Chipped around handle","Chipped and marked","Chipped to front edge","Chip to front edge","Chip above handle","A few nibble chips","Long chips","Laminate chipping to LL","Laminate chipping to edge","Laminate chipping to edges","Laminate starting to peel to edge","Melamine peeling and coming away","Scraped","Heavily scraped","Scraped to doorframe","Heavy scrape to ML LHS","Chipping LL edge","Chipping to edges","Damaged UL edge","Removal hole","Removal holes","Numerous removal holes","2 removal holes","3 removal holes to UL","3 large removal holes","Heavy holes to UL RHS","Removal area around handle","Pin hole","Pin holes","Filled hole","Filled holes","Filled hole UL","Filled hole around handle","A filled hole to UL","A filled hole above handle","Screw holes","Nail holes","Picture hook","Brass picture hook","Hook","Hook UL","Tape marks","Sellotape marks","Sticky removal mark","Sticky removal marks","Sticky tape removal marks","Sticky removal marks to frame","Defects and sticky removal marks","Sticky marks to glass","Sticky","White scratches","Numerous white paint chips","Scattered paint chips and scratches throughout","Paint chipping","Paint chipped","Paint marked","Cable clipped","Cable clipped around","Cobwebs","Cobwebbed","Greasy","Scaled","Limescale","Plug slightly scaled","White scale and shading","Tarnished","Slightly tarnished","Handle heavily tarnished","Rusting","Rusting screw","Fittings slightly rusting","Rust spotting","Weathered","Slightly weathered","Generally weathered","Heavily weathered","Weathered and greening","Greening","Slightly greening","Moss","Mossy","Moss to edges","Weedy","Weeds","Heavy weeds","Numerous heavy weeds","Weeds growing through","Weeds growing between joins","Weeds growing in between joins","Ivy growth","Ivy overgrowth","Creeping ivy","Leaf litter","Heavily leaf strewn","Dead weeds","Dead plants","Bare patch","Patchy lawn","Grass lightened in places","Uneven","Frost damage","Frost damage in places","Cracked","Cracking","Some cracking","Heavy cracking","Cracked slab","A cracked tile","2 slabs are cracked","Crazed","Run marks","Run type marks","Long drip marks","Hard marks","Brown discolouration","Black spotting","Faint spotting","Faint spotting to UL","Faint spotting to LL","Slight spotting","Spotting","Spotting around","Sealant is spotting","Seal slightly spotting","Seal lightly spotting","Grouting discoloured in places","Grouting missing in places","Slight darkening to grouting in places","Slightly water marked","Tap slightly water marked","Slightly smeared","Light smearing","Slight smearing","Smearing","Doors good on runners","In good order","Otherwise, in good order","White beading around is in good order","Old","Full","Full of rubbish","Half full","Empty","No lid","No key","Rubbish","Items not fully listed","No plant within","Requires top cut in places","To be cut before check in"]

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

        const whisperAudioFile = await toFile(Buffer.from(audioBuffer), fileName, { type: mime })
        const gpt4oAudioFile = await toFile(Buffer.from(audioBuffer), fileName, { type: mime })

        const [whisperTranscription, gpt4oTranscription] = await Promise.all([
          openai.audio.transcriptions.create({
            model: 'whisper-1',
            file: whisperAudioFile,
            language: 'en',
            response_format: 'verbose_json',
            timestamp_granularities: ['word'],
          }),
          // gpt-4o-transcribe used only as a comparison transcript for reconciliation -
          // if it fails (e.g. file exceeds its 25-min limit), fall back to whisper-only
          // for this file rather than failing the whole conversion.
          openai.audio.transcriptions.create({
            model: 'gpt-4o-transcribe',
            file: gpt4oAudioFile,
            language: 'en',
          }).catch((err: any) => {
            logger.error(`gpt-4o-transcribe failed for ${fileName}, falling back to whisper-only`, { error: err.message })
            return null
          })
        ])

        // NOTE: previously deleted the per-room audio file here right after transcription.
        // Now kept in Storage so the Review & Amend modal can play it back. Cleanup should
        // happen later (e.g. once reviewed, or on a rolling retention job) - not here.
        // try { await supabase.storage.from('documents').remove([filePath]) } catch(e) {}

        return {
          i,
          whisperText: whisperTranscription.text,
          whisperWords: (whisperTranscription as any).words || [],
          gpt4oText: gpt4oTranscription?.text || null,
          duration: Math.round((whisperTranscription as any).duration || 0)
        }
      }))

      const transcriptMap: Record<number, string> = {}
      const whisperTextMap: Record<number, string> = {}
      const whisperWordsMap: Record<number, any[]> = {}
      const gpt4oTextMap: Record<number, string> = {}
      const reconciliationAudits: any[] = []
      let reconciliationInputTokens = 0
      let reconciliationOutputTokens = 0
      let transcriptionCost = 0 // both whisper-1 and gpt-4o-transcribe are $0.006/min

      let completedReconciliations = 0
      await updateJob("running", 8, `Reconciling audio 0/${transcriptionResults.length}...`, undefined, roomList)

      await Promise.all(transcriptionResults.map(async (r: any) => {
        totalSeconds += r.duration
        transcriptionCost += (r.duration / 60) * 0.006 // whisper-1, always runs
        if (r.gpt4oText) transcriptionCost += (r.duration / 60) * 0.006 // gpt-4o-transcribe, only when it succeeded
        whisperTextMap[r.i] = r.whisperText
        whisperWordsMap[r.i] = r.whisperWords || []
        gpt4oTextMap[r.i] = r.gpt4oText || r.whisperText // fall back to whisper if gpt-4o failed for this file

        if (r.gpt4oText) {
          // Both transcripts available - run prose-merge reconciliation (the version tested
          // and confirmed working well across real property audio). Runs concurrently across
          // all files, not one at a time.
          try {
            const reconcileResponse = await openai.chat.completions.create({
              model: 'gpt-4.1',
              max_completion_tokens: 8000,
              messages: [
                { role: 'system', content: RECONCILIATION_SYSTEM },
                { role: 'user', content: `TRANSCRIPT A (Whisper-1):\n${r.whisperText}\n\nTRANSCRIPT B (GPT-4o Transcribe):\n${r.gpt4oText}` }
              ]
            })
            reconciliationInputTokens += reconcileResponse.usage?.prompt_tokens || 0
            reconciliationOutputTokens += reconcileResponse.usage?.completion_tokens || 0
            const raw = reconcileResponse.choices[0].message.content || ''
            const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim()
            const parsed = JSON.parse(cleaned)

            transcriptMap[r.i] = parsed.canonical_transcript || r.whisperText
            transcripts[r.i] = transcriptMap[r.i]
            reconciliationAudits.push({
              fileIndex: r.i,
              disagreements: parsed.disagreements || [],
              review_required: parsed.review_required || []
            })
          } catch (e: any) {
            logger.error('Reconciliation failed, falling back to whisper-only transcript', { error: e.message })
            transcriptMap[r.i] = r.whisperText
            transcripts[r.i] = r.whisperText
          }
        } else {
          // gpt-4o-transcribe unavailable for this file - use whisper directly, no reconciliation
          transcriptMap[r.i] = r.whisperText
          transcripts[r.i] = r.whisperText
        }

        completedReconciliations++
        await updateJob("running", 8 + Math.round((completedReconciliations / transcriptionResults.length) * 27), `Reconciling audio ${completedReconciliations}/${transcriptionResults.length}...`, undefined, roomList)
      }))

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

        return { roomName, rows, inputTokens: roomInputTokens, outputTokens: roomOutputTokens, transcript: roomTranscript }
      }))

      const totalInputTokens = roomResults.reduce((sum: number, r: any) => sum + (r.inputTokens || 0), 0)
      const totalOutputTokens = roomResults.reduce((sum: number, r: any) => sum + (r.outputTokens || 0), 0)
      const extractionCost = (totalInputTokens / 1_000_000) * 5.00 + (totalOutputTokens / 1_000_000) * 30.00
      const reconciliationCost = (reconciliationInputTokens / 1_000_000) * 2.00 + (reconciliationOutputTokens / 1_000_000) * 8.00
      const actualApiCost = Math.ceil((extractionCost + reconciliationCost + transcriptionCost) * 100) / 100

      // Save the transcript organised by room when files were genuinely matched one-to-one
      // with room names — otherwise every room would show the same full stitched transcript,
      // which would be misleading rather than useful.
      const perRoomTranscript = isPerRoom
        ? roomResults.map((r: any) => `=== ${r.roomName} ===\n${r.transcript}`).join('\n\n')
        : `(Files were not matched one-to-one with room names, so the full combined transcript is shown below rather than a per-room breakdown)\n\n${stitchedTranscript}`

      // Same per-room formatting, but for the raw (pre-reconciliation) transcript from each
      // individual model — so the original Whisper-only and GPT-4o-only versions are preserved
      // alongside the merged canonical version, not discarded once reconciliation runs.
      const stitchedWhisperTranscript = transcriptionResults.map((r: any) => r.whisperText).join(' ')
      const stitchedGpt4oTranscript = transcriptionResults.map((r: any) => r.gpt4oText || r.whisperText).join(' ')

      const perRoomWhisperTranscript = isPerRoom
        ? roomList.map((roomName: string) => `=== ${roomName} ===\n${whisperTextMap[roomFileMap[roomName]]}`).join('\n\n')
        : `(Files were not matched one-to-one with room names, so the full combined transcript is shown below rather than a per-room breakdown)\n\n${stitchedWhisperTranscript}`

      const perRoomGpt4oTranscript = isPerRoom
        ? roomList.map((roomName: string) => `=== ${roomName} ===\n${gpt4oTextMap[roomFileMap[roomName]]}`).join('\n\n')
        : `(Files were not matched one-to-one with room names, so the full combined transcript is shown below rather than a per-room breakdown)\n\n${stitchedGpt4oTranscript}`

      // Per-room Whisper word-level timestamps (only meaningful in per-room mode, since
      // timestamps are relative to each individual room's own audio file). Used to drive
      // the review/amend modal's audio-sync highlighting - not saved as text, saved as JSON.
      const perRoomWhisperWords: Record<string, any[]> = {}
      const perRoomAudioPath: Record<string, string> = {}
      if (isPerRoom) {
        for (const roomName of roomList) {
          const fileIndex = roomFileMap[roomName]
          perRoomWhisperWords[roomName] = whisperWordsMap[fileIndex] || []
          perRoomAudioPath[roomName] = filePaths[fileIndex]
        }
      }

      // Save to the database BEFORE marking the job complete, so the conversion_id is
      // guaranteed to be present the moment the client sees "complete" - no race between
      // the two, no chance of the client catching a "complete" status with no id.
      let savedConversionId: string | undefined = undefined
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
            converted_json: { rooms: roomResults, address, reconciliation_audit: reconciliationAudits },
            whisper_transcript: perRoomWhisperTranscript,
            gpt4o_transcript: perRoomGpt4oTranscript,
            extracted_text: perRoomTranscript,
            whisper_words: perRoomWhisperWords,
            audio_paths: perRoomAudioPath,
          })
        })
        const saveData = await saveRes.json()
        if (saveData.error) {
          logger.error('save-conversion failed', { error: saveData.error })
        } else {
          logger.log('Audio conversion saved to database', { balance: saveData.balance })
          savedConversionId = saveData.conversion_id || undefined
        }
      } catch (saveErr: any) {
        logger.error('save-conversion request failed', { error: String(saveErr) })
      }

      await updateJob("complete", 100, `Complete — ${roomList.length} rooms converted`, roomStatuses, roomList, roomResults, savedConversionId)
      logger.log("Audio conversion complete", { rooms: roomList.length })

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
