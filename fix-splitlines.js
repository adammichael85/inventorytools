const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Add splitLines function before sanitise
const oldSanitise = `      const sanitise = (s: string): string => {`;
const newSanitise = `      const splitLines = (s: string): string[] => {
        if (!s) return ['']
        return s
          .replace(/Disagreed by tenant/g, '\nDisagreed by tenant')
          .replace(/Information provided by tenant/g, '\nInformation provided by tenant')
          .replace(/No further comment provided/g, '\nNo further comment provided')
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
      }
      const sanitise = (s: string): string => {`;

if (c.includes(oldSanitise)) {
  c = c.replace(oldSanitise, newSanitise);
  console.log('Added splitLines function');
} else {
  console.log('ERROR: sanitise pattern not found');
  process.exit(1);
}

// Update makeCell to use splitLines
const oldCell = `children: sanitise(text).split('\\\\n').filter(Boolean).map((line: string) => new Paragraph({ children: [new TextRun({ text: line.trim(), font: 'Arial', size: 20, color: '000000' })] }))`;
const newCell = `children: splitLines(sanitise(text)).map((line: string) => new Paragraph({ children: [new TextRun({ text: line, font: 'Arial', size: 20, color: '000000' })] }))`;

if (c.includes(oldCell)) {
  c = c.replace(oldCell, newCell);
  console.log('Updated makeCell');
} else {
  // Try alternative pattern
  const altOld = `children: [new Paragraph({ children: [new TextRun({ text: sanitise(text), font: 'Arial', size: 20, color: '000000' })] })]`;
  const altNew = `children: splitLines(sanitise(text)).map((line: string) => new Paragraph({ children: [new TextRun({ text: line, font: 'Arial', size: 20, color: '000000' })] }))`;
  if (c.includes(altOld)) {
    c = c.replace(altOld, altNew);
    console.log('Updated makeCell (alt pattern)');
  } else {
    console.log('ERROR: makeCell pattern not found');
  }
}

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
