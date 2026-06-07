const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Replace all saving calculations from *15 to *12
c = c.replace(/conversions\.length \* 15/g, 'conversions.length * 12');
c = c.replace(/conversions\.length\*15/g, 'conversions.length*12');

// Add disclaimer after est saving stat box
c = c.replace(
  "'vs. external typist']",
  "'vs. external typist*']"
);

// Add footnote below the stats grid
c = c.replace(
  "}, marginBottom: 28 }}>",
  "}, marginBottom: 8 }}>"
);

c = c.replace(
  "{[['Total reports', conversions.length.toString(), 'all time']",
  "{[['Total reports', conversions.length.toString(), 'all time']"
);

// Find the closing of the stats grid div and add footnote after it
c = c.replace(
  "].map(([label,val,sub]) => (\n              <div key={label}",
  "].map(([label,val,sub]) => (\n              <div key={label}"
);

// Add footnote paragraph after stats grid
const oldStatsGrid = `gap: 16, marginBottom: 28 }}>`;
const newStatsGrid = `gap: 16, marginBottom: 4 }}>`;
c = c.replace(oldStatsGrid, newStatsGrid);

// Find where the stats grid ends and add footnote
c = c.replace(
  `'vs. external typist*']].map(([label,val,sub]) => (`,
  `'vs. external typist*']].map(([label,val,sub]) => (`
);

// Add the footnote after the stats grid closing div
const statsGridEnd = `          </div>\n\n                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>`;
const statsGridEndNew = `          </div>\n              <p style={{ fontSize: 11, color: HINT, margin: '6px 0 22px', fontStyle: 'italic' }}>*£12 manual typist average used</p>\n\n                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>`;

if (c.includes(statsGridEnd)) {
  c = c.replace(statsGridEnd, statsGridEndNew);
  console.log('Added footnote ✅');
} else {
  console.log('Stats grid end not found ❌');
}

// Also update billing page saving
c = c.replace(
  "'Est. saving vs. typist','£'+(conversions.length*15).toFixed(2)",
  "'Est. saving vs. typist*','£'+(conversions.length*12).toFixed(2)"
);

console.log('Updated saving to £12');
fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
