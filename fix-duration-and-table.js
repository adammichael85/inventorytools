const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// 1. Add elapsedRef after elapsed state
c = c.replace(
  "const [elapsed, setElapsed] = useState(0)",
  "const [elapsed, setElapsed] = useState(0)\n  const elapsedRef = React.useRef(0)"
);

// 2. Reset ref when elapsed resets
c = c.replace(
  "setElapsed(0)\n    setProcessingRooms",
  "setElapsed(0)\n    elapsedRef.current = 0\n    setProcessingRooms"
);

// 3. Update timer to use ref
c = c.replace(
  "const timer = setInterval(() => setElapsed(e => e + 1), 1000)",
  "const timer = setInterval(() => { elapsedRef.current += 1; setElapsed(elapsedRef.current) }, 1000)"
);

// 4. Use ref value when saving
c = c.replace(
  "duration_seconds: elapsed,",
  "duration_seconds: elapsedRef.current,"
);

// 5. Fix estimated saving calculation (£15 avg typist saving per report)
c = c.replace(
  "'£'+((conversions.length * 3.5) * 4).toFixed(2), 'vs. external typist'",
  "'£'+(conversions.length * 15).toFixed(2), 'vs. external typist'"
);
c = c.replace(
  "'Est. saving vs. typist','£'+((conversions.length*3.5)*4).toFixed(2)",
  "'Est. saving vs. typist','£'+(conversions.length*15).toFixed(2)"
);

// 6. Remove .docx button from reports table (can't re-download old files)
c = c.replace(
  `<td style={{ padding: '12px 20px' }}><button style={{ padding: '5px 12px', borderRadius: 7, border: \`1px solid \${BORDER}\`, background: SURFACE, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>↓ .docx</button></td>`,
  `<td style={{ padding: '12px 20px', fontSize: 11, color: HINT }}>Archived</td>`
);

const checks = [
  ['elapsedRef declared', 'elapsedRef = React.useRef(0)'],
  ['timer uses ref', 'elapsedRef.current += 1'],
  ['save uses ref', 'elapsedRef.current,'],
  ['saving calculation fixed', 'conversions.length * 15'],
];

checks.forEach(([name, search]) => {
  console.log(name + ':', c.includes(search) ? '✅' : '❌');
});

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
