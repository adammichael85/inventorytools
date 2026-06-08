const fs = require('fs');

// 1. Update save-conversion route to save converted_by
let route = fs.readFileSync('app/api/save-conversion/route.ts', 'utf8');
route = route.replace(
  `      user_id: body.user_id,
      address: body.address,
      rooms: body.rooms,
      duration_seconds: body.duration_seconds,
      file_path: body.file_path || null,`,
  `      user_id: body.user_id,
      address: body.address,
      rooms: body.rooms,
      duration_seconds: body.duration_seconds,
      file_path: body.file_path || null,
      converted_by: body.converted_by || null,`
);
fs.writeFileSync('app/api/save-conversion/route.ts', route);
console.log('save-conversion route updated ✅');

// 2. Update dashboard to pass converted_by when saving
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Pass converted_by in the save body
c = c.replace(
  `        file_path: storagePath,`,
  `        file_path: storagePath,
        converted_by: userName || session.user.email,`
);

// Add BY column header to dashboard table
c = c.replace(
  `['PROPERTY','ROOMS','CONV. TIME','COST','STATUS',''].map`,
  `['PROPERTY','ROOMS','CONV. TIME','COST','BY','STATUS',''].map`
);

// Add BY column header to reports table
c = c.replace(
  `['Property','Rooms','Conv. Time','Cost','Date',''].map`,
  `['Property','Rooms','Conv. Time','Cost','By','Date',''].map`
);

// Add converted_by cell to dashboard table rows (after cost, before status)
c = c.replace(
  `<td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600 }}>£3.50</td>
                          <td style={{ padding: '12px 20px' }}><span style={{ background: '#E6F9F2', color: '#0A6B48', fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20 }}>Complete</span></td>`,
  `<td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600 }}>£3.50</td>
                          <td style={{ padding: '12px 20px', fontSize: 12, color: MUTED }}>{(c.converted_by || '').split(' ')[0]}</td>
                          <td style={{ padding: '12px 20px' }}><span style={{ background: '#E6F9F2', color: '#0A6B48', fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20 }}>Complete</span></td>`
);

// Add converted_by cell to reports table rows
c = c.replace(
  `<td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600 }}>£3.50</td>
                    <td style={{ padding: '12px 20px', fontSize: 12, color: MUTED }}>{new Date(c.created_at)`,
  `<td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600 }}>£3.50</td>
                    <td style={{ padding: '12px 20px', fontSize: 12, color: MUTED }}>{(c.converted_by || '').split(' ')[0]}</td>
                    <td style={{ padding: '12px 20px', fontSize: 12, color: MUTED }}>{new Date(c.created_at)`
);

const checks = [
  ['converted_by in save', 'converted_by: body.converted_by'],
  ['converted_by in dashboard save', 'converted_by: userName'],
  ['BY column header dashboard', "'BY'"],
  ['BY column header reports', "'By'"],
];
checks.forEach(([name, search]) => {
  console.log(name + ':', c.includes(search) || route.includes(search) ? '✅' : '❌');
});

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
