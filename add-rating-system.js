// STEP 1: Run this SQL in Supabase SQL editor first:
// ALTER TABLE conversions ADD COLUMN IF NOT EXISTS rating integer;

// STEP 2: Run this file to patch the dashboard

const fs = require('fs');
let c = fs.readFileSync('app/dashboard/page.tsx', 'utf8');

// 1. Add rating state and popup state
c = c.replace(
  "  const [conversions, setConversions] = useState<any[]>([])",
  `  const [conversions, setConversions] = useState<any[]>([])
  const [showRatingPopup, setShowRatingPopup] = useState(false)
  const [pendingRatings, setPendingRatings] = useState<any[]>([])
  const [ratings, setRatings] = useState<{[key: string]: number}>({})`
);

// 2. Check for unrated conversions after loading
c = c.replace(
  "      setConversions(data || [])",
  `      setConversions(data || [])
      const unrated = (data || []).filter((c: any) => !c.rating)
      if (unrated.length > 0) {
        setPendingRatings(unrated)
        setShowRatingPopup(true)
      }`
);

// 3. Add submitRatings function after deleteConversion
c = c.replace(
  "  async function deleteConversion(",
  `  async function submitRatings() {
    const updates = Object.entries(ratings)
    for (const [id, rating] of updates) {
      await supabase.from('conversions').update({ rating }).eq('id', id)
    }
    setConversions(prev => prev.map(c => ratings[c.id] ? { ...c, rating: ratings[c.id] } : c))
    setShowRatingPopup(false)
    setPendingRatings([])
    setRatings({})
  }

  async function deleteConversion(`
);

// 4. Add star rating component before Dashboard function
const starComponent = `
function StarRating({ value, onChange, size = 20 }: { value: number, onChange?: (v: number) => void, size?: number }) {
  const [hover, setHover] = React.useState(0)
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(star => (
        <span
          key={star}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => onChange && setHover(star)}
          onMouseLeave={() => onChange && setHover(0)}
          style={{ cursor: onChange ? 'pointer' : 'default', fontSize: size, color: star <= (hover || value) ? '#F59E0B' : '#D1D5DB', lineHeight: 1 }}
        >★</span>
      ))}
    </div>
  )
}

`;

c = c.replace('function Dashboard(', starComponent + 'function Dashboard(');

// 5. Add rating popup before convert modal
const ratingPopup = `
      {showRatingPopup && pendingRatings.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: SURFACE, borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px', letterSpacing: -0.3 }}>Rate your conversions</h2>
            <p style={{ fontSize: 13, color: MUTED, margin: '0 0 20px' }}>Please rate the following before continuing. Your feedback helps us improve.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              {pendingRatings.map((conv: any) => (
                <div key={conv.id} style={{ background: BG, borderRadius: 10, padding: '12px 16px' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.address}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <StarRating value={ratings[conv.id] || 0} onChange={(v) => setRatings(prev => ({ ...prev, [conv.id]: v }))} size={24} />
                    {ratings[conv.id] && <span style={{ fontSize: 12, color: MUTED }}>{['','Poor','Fair','Good','Very good','Excellent'][ratings[conv.id]]}</span>}
                  </div>
                </div>
              ))}
            </div>
            <button
              disabled={pendingRatings.some((c: any) => !ratings[c.id])}
              onClick={submitRatings}
              style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: pendingRatings.every((c: any) => ratings[c.id]) ? TEAL : BORDER, color: pendingRatings.every((c: any) => ratings[c.id]) ? '#fff' : MUTED, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: pendingRatings.every((c: any) => ratings[c.id]) ? 'pointer' : 'default' }}>
              Continue to dashboard →
            </button>
          </div>
        </div>
      )}

`;

c = c.replace('{/* CONVERT MODAL */}', ratingPopup + '{/* CONVERT MODAL */}');

// 6. Add star rating to reports table - after the By column cell
c = c.replace(
  `<td style={{ padding: '12px 20px', fontSize: 12, color: MUTED }}>{(c.converted_by || '').split(' ').map((n: string, i: number) => i === 0 ? n : n[0]).join(' ')}</td>
                    <td style={{ padding: '12px 20px', fontSize: 12, color: MUTED }}>{new Date(c.created_at)`,
  `<td style={{ padding: '12px 20px', fontSize: 12, color: MUTED }}>{(c.converted_by || '').split(' ').map((n: string, i: number) => i === 0 ? n : n[0]).join(' ')}</td>
                    <td style={{ padding: '12px 20px' }}><StarRating value={c.rating || 0} size={14} /></td>
                    <td style={{ padding: '12px 20px', fontSize: 12, color: MUTED }}>{new Date(c.created_at)`
);

// 7. Add Rating column header to reports table
c = c.replace(
  "['Property','Rooms','Conv. Time','Cost','By','Date',''].map",
  "['Property','Rooms','Conv. Time','Cost','By','Rating','Date',''].map"
);

// 8. Add rating to dashboard table too
c = c.replace(
  "['Property','Rooms','Conv. Time','Cost','By','Status',''].map",
  "['Property','Rooms','Conv. Time','Cost','By','Rating','Status',''].map"
);

c = c.replace(
  `<td style={{ padding: '12px 20px', fontSize: 12, color: MUTED }}>{(c.converted_by || '').split(' ').map((n: string, i: number) => i === 0 ? n : n[0]).join(' ')}</td>
                          <td style={{ padding: '12px 20px' }}><span style={{ background: '#E6F9F2'`,
  `<td style={{ padding: '12px 20px', fontSize: 12, color: MUTED }}>{(c.converted_by || '').split(' ').map((n: string, i: number) => i === 0 ? n : n[0]).join(' ')}</td>
                          <td style={{ padding: '12px 20px' }}><StarRating value={c.rating || 0} size={14} /></td>
                          <td style={{ padding: '12px 20px' }}><span style={{ background: '#E6F9F2'`
);

const checks = [
  ['showRatingPopup state', 'showRatingPopup'],
  ['StarRating component', 'function StarRating'],
  ['Rating popup', 'Rate your conversions'],
  ['submitRatings function', 'submitRatings'],
  ['Rating in reports header', "'Rating'"],
];
checks.forEach(([name, search]) => {
  console.log(name + ':', c.includes(search) ? '✅' : '❌');
});

fs.writeFileSync('app/dashboard/page.tsx', c);
console.log('done');
