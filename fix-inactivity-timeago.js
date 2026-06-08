const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// 1. Change 10 mins to 20 mins
c = c.replace('}, 10 * 60 * 1000)', '}, 20 * 60 * 1000)');

// 2. Add inactivity redirect
c = c.replace(
  "supabase.auth.signOut().then(() => { window.location.href = '/auth' })",
  "supabase.auth.signOut().then(() => { window.location.href = '/auth?reason=inactivity' })"
);

// 3. Add timeAgo helper function before the StatsPage component
const timeAgoFn = `
function timeAgo(dateStr: string): string {
  const now = new Date()
  const then = new Date(dateStr)
  const secs = Math.floor((now.getTime() - then.getTime()) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return mins + ' min' + (mins !== 1 ? 's' : '') + ' ago'
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  if (hours < 24) return hours + 'h ' + (remMins > 0 ? remMins + 'm ' : '') + 'ago'
  const days = Math.floor(hours / 24)
  if (days < 7) return days + ' day' + (days !== 1 ? 's' : '') + ' ago'
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

`;

c = c.replace('function StatsPage(', timeAgoFn + 'function StatsPage(');

// 4. Update activity feed to show time ago
c = c.replace(
  "<p style={{ fontSize: 11, color: HINT, margin: 0 }}>{new Date(conv.created_at).toLocaleDateString('en-GB', {day:'numeric',month:'short'})}</p>",
  "<p style={{ fontSize: 11, color: HINT, margin: 0 }}>{timeAgo(conv.created_at)}</p>"
);

const checks = [
  ['20 mins', '20 * 60 * 1000'],
  ['inactivity redirect', 'reason=inactivity'],
  ['timeAgo function', 'function timeAgo'],
  ['timeAgo in activity', 'timeAgo(conv.created_at)'],
];
checks.forEach(([name, search]) => {
  console.log(name + ':', c.includes(search) ? '✅' : '❌');
});

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
