const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

const oldSanitise = `text:line.trim().replace(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/g,'')`;
const newSanitise = `text:line.trim().replace(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/g,'').replace(/[\\u2018\\u2019]/g,"'").replace(/[\\u201C\\u201D]/g,'"').replace(/[\\u2013\\u2014]/g,'-').replace(/[^\\x09\\x0A\\x0D\\x20-\\xFF]/g,'')`;

if (c.includes(oldSanitise)) {
  c = c.replace(oldSanitise, newSanitise);
  console.log('Fixed sanitiser ✅');
} else {
  console.log('Pattern not found ❌');
  const idx = c.indexOf('line.trim()');
  console.log('Context:', JSON.stringify(c.slice(idx, idx + 150)));
}

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
