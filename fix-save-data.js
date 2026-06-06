const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Fix pages to use rooms.length and duration to capture elapsed properly
c = c.replace(
  `        pages: data._pages || 0,
        duration_seconds: elapsed,`,
  `        pages: rooms.length,
        duration_seconds: elapsed,`
);

// Add a local variable capture before the save to get elapsed at the right moment
c = c.replace(
  `      supabase.auth.getSession().then(({ data: { session } }) => {`,
  `      const elapsedAtSave = elapsed;
      supabase.auth.getSession().then(({ data: { session } }) => {`
);

c = c.replace(
  `        duration_seconds: elapsed,`,
  `        duration_seconds: elapsedAtSave,`
);

if (c.includes('elapsedAtSave')) {
  console.log('Fixed duration and pages');
} else {
  console.log('ERROR: pattern not found');
}

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
