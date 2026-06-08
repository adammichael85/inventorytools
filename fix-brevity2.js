const fs = require('fs');
let c = fs.readFileSync('app/api/convert/route.ts', 'utf8');

c = c.replace(
  `BREVITY
Keep descriptions concise. Copy only essential text. Do not pad or repeat information already in other columns.`,
  `BREVITY
Keep descriptions concise. Copy only essential item text. Abbreviations are fine - do not expand them.
STRIP the following completely from all output - do not include them:
- Photo counts (e.g. "1 photo", "2 photos", "No photos")
- Page numbers
- Duplicate condition values (e.g. "Good Good" becomes "Good", "Fair Fair" becomes "Fair")
- "No further comment provided by the inspector" - omit entirely
- "Information provided by tenant" - omit entirely
- Any reference to photos being available or unavailable`
);

if (c.includes('Abbreviations are fine')) {
  console.log('Updated brevity rules ✅');
} else {
  console.log('Pattern not found ❌');
}

fs.writeFileSync('app/api/convert/route.ts', c);
console.log('done');
