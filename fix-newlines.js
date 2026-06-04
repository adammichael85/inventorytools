const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Remove the broken splitLines and replace with correct version
const broken = `      const splitLines = (s: string): string[] => {
        if (!s) return ['']
        return s
          .replace(/Disagreed by tenant/g, '
Disagreed by tenant')
          .replace(/Information provided by tenant/g, '
Information provided by tenant')
          .replace(/No further comment provided/g, '
No further comment provided')
          .replace(/ | /g, '
')
          .split('
')
          .map((l) => l.trim())
          .filter(Boolean)
      }`;

const fixed = `      const splitLines = (s) => {
        if (!s) return ['']
        return s
          .replace(/Disagreed by tenant/g, '\\nDisagreed by tenant')
          .replace(/Information provided by tenant/g, '\\nInformation provided by tenant')
          .replace(/No further comment provided/g, '\\nNo further comment provided')
          .replace(/ \\| /g, '\\n')
          .split('\\n')
          .map((l) => l.trim())
          .filter(Boolean)
      }`;

if (c.includes(broken)) {
  c = c.replace(broken, fixed);
  console.log('Fixed splitLines');
} else {
  console.log('Pattern not found - trying alternative...');
  // Find and replace just the splitLines function
  const start = c.indexOf('const splitLines');
  const end = c.indexOf('      }', start) + 7;
  if (start > -1) {
    c = c.slice(0, start) + fixed + c.slice(end);
    console.log('Fixed via index replacement');
  }
}

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
