// One-off correction script: recalculates the `cost` field for existing
// audio conversions using the correct size-based price, since they were
// previously saved with a hardcoded £4.00 regardless of property size.
//
// Usage:
//   node --env-file=.env.local fix-audio-costs.mjs            <- DRY RUN
//   node --env-file=.env.local fix-audio-costs.mjs --apply    <- actually updates rows

import { createClient } from '@supabase/supabase-js'
import WebSocket from 'ws'
globalThis.WebSocket = WebSocket

const AUDIO_PRICES = {
  room_only: 3.25, studio: 6.00, '1bed': 7.92, '2bed': 9.54, '3bed': 13.70,
  '4bed': 17.45, '5bed': 21.64, '6bed': 25.84, '7bed': 30.04, '8bed': 34.24,
  '9bed': 38.45, '10bed': 42.64, '11bed': 46.84, '12bed': 51.04,
}

const APPLY = process.argv.includes('--apply')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.')
  console.error('Run with: node --env-file=.env.local fix-audio-costs.mjs')
  process.exit(1)
}

const supabase = createClient(url, key)

async function main() {
  const { data: rows, error } = await supabase
    .from('conversions')
    .select('id, address, user_id, property_size, cost, created_at')
    .eq('type', 'audio')
    .not('property_size', 'is', null)

  if (error) {
    console.error('Failed to fetch conversions:', error.message)
    process.exit(1)
  }

  console.log(`Found ${rows.length} audio conversions with a property_size set.\n`)

  let changed = 0
  let skipped = 0

  for (const row of rows) {
    const correctCost = AUDIO_PRICES[row.property_size]
    if (correctCost == null) {
      console.log(`SKIP  ${row.id}  (unrecognised property_size: "${row.property_size}")`)
      skipped++
      continue
    }

    const currentCost = row.cost != null ? Number(row.cost) : null
    if (currentCost !== null && Math.abs(currentCost - correctCost) < 0.005) {
      continue
    }

    console.log(
      `${APPLY ? 'FIX  ' : 'WOULD FIX'}  ${row.id}  ` +
      `${(row.address || '').slice(0, 40).padEnd(40)}  ` +
      `size=${row.property_size.padEnd(10)}  £${(currentCost ?? 0).toFixed(2)} -> £${correctCost.toFixed(2)}`
    )
    changed++

    if (APPLY) {
      const { error: updateError } = await supabase
        .from('conversions')
        .update({ cost: correctCost })
        .eq('id', row.id)
      if (updateError) {
        console.error(`  ! Failed to update ${row.id}:`, updateError.message)
      }
    }
  }

  console.log(`\n${changed} row(s) ${APPLY ? 'updated' : 'would be updated'}. ${skipped} skipped (unrecognised size).`)
  if (!APPLY && changed > 0) {
    console.log('\nThis was a DRY RUN - no changes were made. Re-run with --apply to actually update these rows.')
  }
}

main()
