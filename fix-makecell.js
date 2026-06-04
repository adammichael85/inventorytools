const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

const oldMakeCell = `      const makeCell = (text: string, colWidth: number) => new TableCell({
        borders: cellBorders,
        width: { size: colWidth, type: WidthType.DXA },
        verticalAlign: VerticalAlign.TOP,
        children: [new Paragraph({ children: [new TextRun({ text: text || '', font: 'Arial', size: 20 })] })]
      })`;

const newMakeCell = `      const splitLines = (s: string): string[] => {
        if (!s) return ['']
        return s
          .replace(/Disagreed by tenant/g, '\nDisagreed by tenant')
          .replace(/Information provided by tenant/g, '\nInformation provided by tenant')
          .replace(/No further comment provided/g, '\nNo further comment provided')
          .replace(/ \| /g, '\n')
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
      }
      const sanitise = (s: string): string => {
        if (!s) return ''
        return String(s)
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
          .replace(/\uFFFD/g, '')
          .trim()
      }
      const makeCell = (text: string, colWidth: number) => new TableCell({
        borders: cellBorders,
        width: { size: colWidth, type: WidthType.DXA },
        verticalAlign: VerticalAlign.TOP,
        children: splitLines(sanitise(text)).map((line) => new Paragraph({ children: [new TextRun({ text: line, font: 'Arial', size: 20, color: '000000' })] }))
      })`;

if (c.includes(oldMakeCell)) {
  c = c.replace(oldMakeCell, newMakeCell);
  console.log('Fixed makeCell with splitLines and sanitise');
} else {
  console.log('ERROR: pattern not found');
  // Show what we have
  const idx = c.indexOf('makeCell');
  console.log('makeCell context:', c.slice(idx, idx + 200));
}

// Also fix room name TextRun to add color
c = c.replace(
  `new TextRun({ text: room.roomName, font: 'Arial', size: 28, bold: true })`,
  `new TextRun({ text: room.roomName || '', font: 'Arial', size: 28, bold: true, color: '000000' })`
);

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
