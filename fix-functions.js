const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Find and replace everything from splitLines to makeCell
const start = c.indexOf('      const splitLines');
const end = c.indexOf('      const makeCell', start);

if (start > -1 && end > -1) {
  const newBlock = `      const splitLines = (s) => {
        if (!s) return ['']
        const result = s
          .split(' | ')
          .join('\n')
        return result
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
      }
      const sanitise = (s) => {
        if (!s) return ''
        return String(s).replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '').trim()
      }
      `;
  c = c.slice(0, start) + newBlock + c.slice(end);
  console.log('Fixed splitLines and sanitise');
} else {
  console.log('start:', start, 'end:', end);
}

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
