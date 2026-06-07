const fs = require('fs');
let c = fs.readFileSync('app/auth/page.tsx', 'utf8');

// Replace the direct supabase profile insert with a fetch to our API route
const oldInsert = `    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: firstName + ' ' + lastName,
        role: 'user',
        company_name: company,
        company_position: position,
        company_address: address,
        company_phone: phone,
        credits: 0,
      })
    }`;

const newInsert = `    if (data.user) {
      await fetch('/api/create-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: data.user.id,
          full_name: firstName + ' ' + lastName,
          company_name: company,
          company_position: position,
          company_address: address,
          company_phone: phone,
        })
      })
    }`;

if (c.includes(oldInsert)) {
  c = c.replace(oldInsert, newInsert);
  console.log('Fixed profile save');
} else {
  console.log('Pattern not found');
  const idx = c.indexOf('supabase.from(\'profiles\')');
  console.log('Context:', c.slice(idx - 20, idx + 200));
}

fs.writeFileSync('app/auth/page.tsx', c);
console.log('done');
