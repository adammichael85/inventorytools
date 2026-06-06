const fs = require('fs');
const path = require('path');

const files = [
  'app/page.tsx',
  'app/pdf-to-word/page.tsx', 
  'app/auth/page.tsx',
  'app/dashboard/page.tsx',
  'app/api/convert/route.ts'
];

const replacements = [
  ['under 60 seconds', '1–4 minutes depending on file size'],
  ['in under 60 seconds', 'in 1–4 minutes depending on file size'],
  ['Under 60 seconds*', '1–4 mins depending on file size'],
  ['under 60 seconds.*', '1–4 minutes depending on file size'],
  ['60 seconds*', '1–4 minutes*'],
  ['60 seconds', '1–4 minutes'],
  ['under 60s', '1–4 mins'],
  ['in 60 seconds', 'in 1–4 minutes'],
  ['vs. 45–90 mins with a typist', 'vs. 45–90 mins with a typist'],
];

let totalChanges = 0;

files.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log('Skipping (not found):', file);
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

console.log('Total changes:', totalChanges);
console.log('done');
