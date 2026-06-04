const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Find makeCell and replace it with a version that splits on | and common separators
const oldMakeCell = `      const makeCell = (text: string, colWidth: number) => new TableCell({
        borders: cellBorders,
        width: { size: colWidth, type: WidthType.DXA },
        verticalAlign: VerticalAlign.TOP,
        children: [new Paragraph({ children: [new TextRun({ text: text || '', font: 'Arial', size: 20 })] })]
      })`;

if (!c.includes(oldMakeCell)) {
  console.log('Pattern not found, showing makeCell context:');
  const idx = c.indexOf('const makeCell');
  console.log(JSON.stringify(c.slice(idx, idx + 300)));
  process.exit(1);
}

const newMakeCell = `      const toLines = (text) => {
        if (!text) return ['']
        return text.split(' | ').join('\n')
          .split('\n')
          .map(l => String(l).replace(/[^\x09\x0A\x0D\x20-\xFF]/g, '').trim())
          .filter(Boolean)
      }
      const makeCell = (text: string, colWidth: number) => new TableCell({
        borders: cellBorders,
        width: { size: colWidth, type: WidthType.DXA },
        verticalAlign: VerticalAlign.TOP,
        children: toLines(text).map(line => new Paragraph({ children: [new TextRun({ text: line, font: 'Arial', size: 20, color: '000000' })] }))
      })`;

c = c.replace(oldMakeCell, newMakeCell);
console.log('Fixed makeCell');

// Also fix room name
c = c.replace(
  `new TextRun({ text: room.roomName, font: 'Arial', size: 28, bold: true })`,
  `new TextRun({ text: room.roomName || '', font: 'Arial', size: 28, bold: true, color: '000000' })`
);

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
