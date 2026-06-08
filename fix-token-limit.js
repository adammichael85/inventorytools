const fs = require('fs');
let c = fs.readFileSync('app/api/convert/route.ts', 'utf8');

// Fix max_tokens to actual max
c = c.replace('max_tokens: 16000,', 'max_tokens: 8192,');

// Add brevity rule before COPY RULE
c = c.replace(
  'COPY RULE\nCopy text EXACTLY.',
  'BREVITY\nKeep descriptions concise. Copy only essential text. Do not pad or repeat information already in other columns.\n\nCOPY RULE\nCopy text EXACTLY.'
);

// Also add instruction to handle JSON special characters
c = c.replace(
  'COPY RULE\nCopy text EXACTLY. Do not correct spelling, improve grammar, reword, summarise, remove, add, merge or split rows.',
  'COPY RULE\nCopy text EXACTLY. Do not correct spelling, improve grammar, reword, summarise, remove, add, merge or split rows.\nIMPORTANT: If any text contains double quote characters (") replace them with single quotes (\') to avoid breaking the JSON output.'
);

const checks = [
  ['max_tokens fixed', 'max_tokens: 8192'],
  ['brevity rule', 'BREVITY'],
  ['quote fix', 'breaking the JSON'],
];
checks.forEach(([name, search]) => {
  console.log(name + ':', c.includes(search) ? '✅' : '❌');
});

fs.writeFileSync('app/api/convert/route.ts', c);
console.log('done');
