const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Fix avg time to show mins and seconds
c = c.replace(
  `Math.round(conversions.reduce((s,r)=>s+(r.duration_seconds||0),0)/conversions.length) >= 60 ? Math.floor(Math.round(conversions.reduce((s,r)=>s+(r.duration_seconds||0),0)/conversions.length)/60)+'m' : Math.round(conversions.reduce((s,r)=>s+(r.duration_seconds||0),0)/conversions.length)+'s'`,
  `(()=>{ const avg=Math.round(conversions.reduce((s,r)=>s+(r.duration_seconds||0),0)/conversions.length); return avg>=60 ? Math.floor(avg/60)+'m '+(avg%60)+'s' : avg+'s' })()`
);

// Add total conversion time as 4th stat - replace est saving position and add new one
c = c.replace(
  `['Total reports', conversions.length.toString(), 'all time'],['Total spent', '£'+(conversions.length * 3.5).toFixed(2), '@ £3.50 per report'],['Avg. time', conversions.length > 0 ? (()=>{ const avg=Math.round(conversions.reduce((s,r)=>s+(r.duration_seconds||0),0)/conversions.length); return avg>=60 ? Math.floor(avg/60)+'m '+(avg%60)+'s' : avg+'s' })() : '—', 'per conversion'],['Est. saving', '£'+(conversions.length * 15).toFixed(2), 'vs. external typist']`,
  `['Total reports', conversions.length.toString(), 'all time'],['Total spent', '£'+(conversions.length * 3.5).toFixed(2), '@ £3.50 per report'],['Avg. time', conversions.length > 0 ? (()=>{ const avg=Math.round(conversions.reduce((s,r)=>s+(r.duration_seconds||0),0)/conversions.length); return avg>=60 ? Math.floor(avg/60)+'m '+(avg%60)+'s' : avg+'s' })() : '—', 'per conversion'],['Total time', (()=>{ const tot=conversions.reduce((s,r)=>s+(r.duration_seconds||0),0); return tot>=60 ? Math.floor(tot/60)+'m '+(tot%60)+'s' : tot+'s' })(), 'all conversions'],['Est. saving', '£'+(conversions.length * 15).toFixed(2), 'vs. external typist']`
);

// Fix grid to show 5 columns instead of 4
c = c.replace(
  "gridTemplateColumns: 'repeat(4,minmax(0,1fr))'",
  "gridTemplateColumns: 'repeat(5,minmax(0,1fr))'"
);

console.log('done');
fs.writeFileSync('app/dashboard/page.tsx', c);
