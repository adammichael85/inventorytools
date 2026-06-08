const fs = require('fs');
let c = fs.readFileSync('app/api/convert/route.ts', 'utf8');

c = c.replace(
  'ROOM HEADINGS\nWhen a room heading appears in the PDF, create a new room entry.\nThe room heading should have no number prefix.\nExample: "Entrance/Hallway", "Kitchen", "Bathroom" NOT "1 Entrance/Hallway"',
  'ROOM HEADINGS\nWhen a room heading appears in the PDF, create a new room entry.\nThe room heading should have no number prefix.\nExample: "Entrance/Hallway", "Kitchen", "Bathroom" NOT "1 Entrance/Hallway"\nIMPORTANT: If a room heading appears at the bottom of a page with no items on that page, the items for that room will continue on the next page — group them all under the same room heading. Never create an empty room.'
);

if (c.includes('Never create an empty room')) {
  console.log('Fixed ✅');
} else {
  console.log('Pattern not found ❌');
}

fs.writeFileSync('app/api/convert/route.ts', c);
console.log('done');
