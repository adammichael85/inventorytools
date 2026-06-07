const fs = require('fs');
let c = fs.readFileSync('app/api/save-conversion/route.ts', 'utf8');

c = c.replace(
  `    const { error: convError } = await supabase.from('conversions').insert({
      user_id: body.user_id,
      address: body.address,
      rooms: body.rooms,
      duration_seconds: body.duration_seconds,
    })`,
  `    const { error: convError } = await supabase.from('conversions').insert({
      user_id: body.user_id,
      address: body.address,
      rooms: body.rooms,
      duration_seconds: body.duration_seconds,
      file_path: body.file_path || null,
    })`
);

fs.writeFileSync('app/api/save-conversion/route.ts', c);
console.log('done');
