const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

c = c.replace(
  `<p style={{ fontSize: 12, color: '#7B5E00', margin: '0 0 2px' }}>For files over 3MB, compress first at <a href="https://www.ilovepdf.com/compress_pdf" target="_blank" style={{ color: '#7B5E00', fontWeight: 600 }}>ilovepdf.com</a></p>
                    <p style={{ fontSize: 12, color: '#7B5E00', margin: 0 }}>Use <strong>EXTREME</strong> compression to reduce the file size dramatically to save conversion time.</p>`,
  `<p style={{ fontSize: 12, color: '#7B5E00', margin: '0 0 8px' }}>For files over 3MB, compress first at <a href="https://www.ilovepdf.com/compress_pdf" target="_blank" style={{ color: '#7B5E00', fontWeight: 600 }}>ilovepdf.com</a></p>
                    <p style={{ fontSize: 12, color: '#7B5E00', margin: 0 }}>Use <strong>EXTREME</strong> compression to reduce the file size dramatically and save conversion time.</p>`
);

if (c.includes('margin: \'0 0 8px\'')) {
  console.log('Fixed spacing');
} else {
  console.log('ERROR: pattern not found');
}

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
