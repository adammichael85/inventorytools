const fs = require('fs');

const files = [
  'app/page.tsx',
  'app/pdf-to-word/page.tsx',
  'app/auth/page.tsx',
  'app/dashboard/page.tsx',
];

const replacements = [
  ['· First 5 free', ''],
  ['· First 5 reports free', ''],
  ['First 5 reports free. No credit card required.', 'Create your account to get started.'],
  ['First 5 reports free — no card needed', ''],
  ['First 5 reports completely free', ''],
  [' · First 5 reports free — no card needed', ''],
  ['First 5 free', ''],
  ['no card needed', ''],
  ['No credit card required.', ''],
  [' — no card needed', ''],
  ['· No card needed', ''],
];

let totalChanges = 0;

files.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log('Skipping:', file);
    return;
  }
  let c = fs.readFileSync(file, 'utf8');
  let changes = 0;
  replacements.forEach(([from, to]) => {
    if (c.includes(from)) {
      c = c.split(from).join(to);
      changes++;
    }
  });
  fs.writeFileSync(file, c);
  console.log(file + ':', changes + ' changes');
  totalChanges += changes;
});

console.log('Total:', totalChanges, 'changes');
console.log('done');
