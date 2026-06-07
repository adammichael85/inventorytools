const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// Fix conversion table field names - name -> address, time -> duration, date -> created_at
c = c.replace(/key={c\.name}/g, 'key={c.id}');
c = c.replace(/>{c\.name}</g, '>{c.address}');
c = c.replace(/>{c\.date}</g, '>{new Date(c.created_at).toLocaleDateString("en-GB", {day:"numeric",month:"short",year:"numeric"})}');
c = c.replace(/>{c\.time}</g, '>{c.duration_seconds ? (c.duration_seconds >= 60 ? Math.floor(c.duration_seconds/60)+"m "+( c.duration_seconds%60)+"s" : c.duration_seconds+"s") : "—"}');
c = c.replace(/>{c\.rooms} rooms</g, '>{c.rooms} rooms');

// Fix hardcoded stats - replace with calculated values from conversions
c = c.replace(
  `['This month','34','reports converted'],['Spent','£119','@ £3.50 per report'],['Avg. time','42s','per conversion'],['Est. saving','£374','vs. external typist']`,
  `['Total reports', conversions.length.toString(), 'all time'],['Total spent', '£'+(conversions.length * 3.5).toFixed(2), '@ £3.50 per report'],['Avg. time', conversions.length > 0 ? (Math.round(conversions.reduce((s,r)=>s+(r.duration_seconds||0),0)/conversions.length) >= 60 ? Math.floor(Math.round(conversions.reduce((s,r)=>s+(r.duration_seconds||0),0)/conversions.length)/60)+'m' : Math.round(conversions.reduce((s,r)=>s+(r.duration_seconds||0),0)/conversions.length)+'s') : '—', 'per conversion'],['Est. saving', '£'+((conversions.length * 3.5) * 4).toFixed(2), 'vs. external typist']`
);

// Fix credits widget - replace hardcoded 17 remaining with real credits
c = c.replace(
  `<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}><span style={{ fontWeight: 600 }}>17 remaining</span><span style={{ color: HINT }}>of 50 purchased</span></div>`,
  `<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}><span style={{ fontWeight: 600 }}>{credits} remaining</span><span style={{ color: HINT }}>credits</span></div>`
);

// Fix progress bar width
c = c.replace(
  `width: '34%', height: '100%', background: TEAL`,
  `width: Math.min(100, (credits / 50) * 100) + '%', height: '100%', background: TEAL`
);

// Fix This month stats in sidebar
c = c.replace(
  `{[['Reports converted','34'],['Total spent','£119.00'],['Avg. per report','£3.50'],['Est. saving vs. typist','£374.00']].map`,
  `{[['Reports converted',conversions.length.toString()],['Total spent','£'+(conversions.length*3.5).toFixed(2)],['Avg. per report','£3.50'],['Est. saving vs. typist','£'+((conversions.length*3.5)*4).toFixed(2)]].map`
);

// Fix date showing June 3 - use real date
c = c.replace(
  `<p style={{ fontSize: 12, color: HINT, margin: 0 }}>Wednesday, 3 June 2026</p>`,
  `<p style={{ fontSize: 12, color: HINT, margin: 0 }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>`
);

// Fix activity section - show real conversions instead of hardcoded
c = c.replace(
  `{[['12 Milliners Court — download ready','Today, 09:14',true],['7 Ashford Road — download ready','Today, 08:52',true],['Sarah M. joined your team','Yesterday, 17:01',false],['50 credits purchased — £175.00','1 Jun, 09:00',false]].map(([text,time,active]) => (`,
  `{conversions.slice(0,4).map((conv, i) => (`
);
c = c.replace(
  `<div style={{ width: 8, height: 8, borderRadius: '50%', background: active ? TEAL : BORDER, flexShrink: 0, marginTop: 4 }} />
                          <div>
                            <p style={{ fontSize: 12, color: TEXT, margin: 0 }}>{text as string}</p>
                            <p style={{ fontSize: 11, color: HINT, margin: 0 }}>{time as string}</p>
                          </div>`,
  `<div style={{ width: 8, height: 8, borderRadius: '50%', background: TEAL, flexShrink: 0, marginTop: 4 }} />
                          <div>
                            <p style={{ fontSize: 12, color: TEXT, margin: 0 }}>{conv.address} — ready</p>
                            <p style={{ fontSize: 11, color: HINT, margin: 0 }}>{new Date(conv.created_at).toLocaleDateString('en-GB', {day:'numeric',month:'short'})}</p>
                          </div>`
);

console.log('done');
fs.writeFileSync('app/dashboard/page.tsx', c);
