import Link from "next/link";

export default function AudioToWordPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <Link href="/" className="text-sm font-medium text-gray-900">
          inventorytools.co.uk
        </Link>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <Link href="/auth" className="text-gray-900 font-medium">Log in</Link>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-4">
          AI-powered · Built for inventory clerks
        </p>
        <h1 className="text-5xl font-bold leading-tight tracking-tight mb-6">
          Stop dictating.<br />Start downloading.
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Upload a voice recording of a clerk dictating an inventory. Our AI transcribes every word
          and structures it into a professional Word document automatically. What used to take a
          typist 90 minutes costs £5.00.
        </p>
        <Link
          href="/auth"
          className="inline-block bg-gray-900 text-white text-sm font-semibold px-8 py-3 rounded-lg hover:bg-gray-700 transition"
        >
          Log in to convert
        </Link>
      </section>

      <section className="max-w-xl mx-auto px-6 pb-20">
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="ml-3 text-xs text-gray-400">inventorytools.co.uk</span>
          </div>
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎙️</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">12 Milliners Court — Clerks Audio.mp3</p>
                <p className="text-xs text-gray-400">Uploaded · 9 rooms · 47 mins</p>
              </div>
            </div>
          </div>
          <div className="px-5 py-4 space-y-2">
            <p className="text-xs text-gray-400 mb-3">Building Word document... ⏱ 2m 14s</p>
            {[
              { name: "Outside Front", done: true },
              { name: "Entrance Hall", done: true },
              { name: "Kitchen", done: true },
              { name: "Reception Room", done: true },
              { name: "Bathroom", done: false },
            ].map((room) => (
              <div key={room.name} className="flex items-center gap-2 text-sm">
                {room.done ? (
                  <span className="text-green-500 font-bold">✓</span>
                ) : (
                  <span className="w-3 h-3 rounded-full border-2 border-orange-400 border-t-transparent animate-spin inline-block" />
                )}
                <span className={room.done ? "text-gray-700" : "text-gray-400"}>{room.name}</span>
              </div>
            ))}
          </div>
          <div className="bg-green-50 border-t border-green-100 px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-green-700">✓ 12 Milliners Court.docx ready</span>
            <span className="text-xs bg-green-600 text-white px-3 py-1 rounded-full font-medium">Download</span>
          </div>
        </div>
cat > app/audio-to-word/page.tsx << 'ENDOFFILE'
import Link from "next/link";

export default function AudioToWordPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <Link href="/" className="text-sm font-medium text-gray-900">
          inventorytools.co.uk
        </Link>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <Link href="/auth" className="text-gray-900 font-medium">Log in</Link>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-4">
          AI-powered · Built for inventory clerks
        </p>
        <h1 className="text-5xl font-bold leading-tight tracking-tight mb-6">
          Stop dictating.<br />Start downloading.
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Upload a voice recording of a clerk dictating an inventory. Our AI transcribes every word
          and structures it into a professional Word document automatically. What used to take a
          typist 90 minutes costs £5.00.
        </p>
        <Link
          href="/auth"
          className="inline-block bg-gray-900 text-white text-sm font-semibold px-8 py-3 rounded-lg hover:bg-gray-700 transition"
        >
          Log in to convert
        </Link>
      </section>

      <section className="max-w-xl mx-auto px-6 pb-20">
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="ml-3 text-xs text-gray-400">inventorytools.co.uk</span>
          </div>
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎙️</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">12 Milliners Court — Clerks Audio.mp3</p>
                <p className="text-xs text-gray-400">Uploaded · 9 rooms · 47 mins</p>
              </div>
            </div>
          </div>
          <div className="px-5 py-4 space-y-2">
            <p className="text-xs text-gray-400 mb-3">Building Word document... ⏱ 2m 14s</p>
            {[
              { name: "Outside Front", done: true },
              { name: "Entrance Hall", done: true },
              { name: "Kitchen", done: true },
              { name: "Reception Room", done: true },
              { name: "Bathroom", done: false },
            ].map((room) => (
              <div key={room.name} className="flex items-center gap-2 text-sm">
                {room.done ? (
                  <span className="text-green-500 font-bold">✓</span>
                ) : (
                  <span className="w-3 h-3 rounded-full border-2 border-orange-400 border-t-transparent animate-spin inline-block" />
                )}
                <span className={room.done ? "text-gray-700" : "text-gray-400"}>{room.name}</span>
              </div>
            ))}
          </div>
          <div className="bg-green-50 border-t border-green-100 px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-green-700">✓ 12 Milliners Court.docx ready</span>
            <span className="text-xs bg-green-600 text-white px-3 py-1 rounded-full font-medium">Download</span>
          </div>
        </div>
cat > app/audio-to-word/page.tsx << 'ENDOFFILE'
import Link from "next/link";

export default function AudioToWordPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <Link href="/" className="text-sm font-medium text-gray-900">
          inventorytools.co.uk
        </Link>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <Link href="/auth" className="text-gray-900 font-medium">Log in</Link>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-4">
          AI-powered · Built for inventory clerks
        </p>
        <h1 className="text-5xl font-bold leading-tight tracking-tight mb-6">
          Stop dictating.<br />Start downloading.
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Upload a voice recording of a clerk dictating an inventory. Our AI transcribes every word
          and structures it into a professional Word document automatically. What used to take a
          typist 90 minutes costs £5.00.
        </p>
        <Link
          href="/auth"
          className="inline-block bg-gray-900 text-white text-sm font-semibold px-8 py-3 rounded-lg hover:bg-gray-700 transition"
        >
          Log in to convert
        </Link>
      </section>

      <section className="max-w-xl mx-auto px-6 pb-20">
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="ml-3 text-xs text-gray-400">inventorytools.co.uk</span>
          </div>
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎙️</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">12 Milliners Court — Clerks Audio.mp3</p>
                <p className="text-xs text-gray-400">Uploaded · 9 rooms · 47 mins</p>
              </div>
            </div>
          </div>
          <div className="px-5 py-4 space-y-2">
            <p className="text-xs text-gray-400 mb-3">Building Word document... ⏱ 2m 14s</p>
            {[
              { name: "Outside Front", done: true },
              { name: "Entrance Hall", done: true },
              { name: "Kitchen", done: true },
              { name: "Reception Room", done: true },
              { name: "Bathroom", done: false },
            ].map((room) => (
              <div key={room.name} className="flex items-center gap-2 text-sm">
                {room.done ? (
                  <span className="text-green-500 font-bold">✓</span>
                ) : (
                  <span className="w-3 h-3 rounded-full border-2 border-orange-400 border-t-transparent animate-spin inline-block" />
                )}
                <span className={room.done ? "text-gray-700" : "text-gray-400"}>{room.name}</span>
              </div>
            ))}
          </div>
          <div className="bg-green-50 border-t border-green-100 px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-green-700">✓ 12 Milliners Court.docx ready</span>
            <span className="text-xs bg-green-600 text-white px-3 py-1 rounded-full font-medium">Download</span>
          </div>
        </div>
      </section>

      <section id="how" className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">How it works</p>
          <h2 className="text-3xl font-bold mb-12">Three steps. Done.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Upload the audio", body: "Upload your MP3, WAV or M4A recordings — one file per room. Enter the room names in the order you want them to appear." },
              { step: "2", title: "AI transcribes every room", body: "Our AI listens to the clerk's dictation, corrects transcription errors, and structures every item, description, and condition note automatically." },
              { step: "3", title: "Download the Word doc", body: "A perfectly formatted three-column Word document downloads automatically. Item / Description / Condition — ready to submit." },
            ].map((s) => (
              <div key={s.step}>
                <div className="w-8 h-8 rounded-full bg-gray-900 text-white text-sm font-bold flex items-center justify-center mb-4">{s.step}</div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Features</p>
          <h2 className="text-3xl font-bold mb-12">Everything your team needs. Nothing they don&apos;t.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { icon: "⚡", title: "Done in 2–5 minutes depending on recording length", body: "What used to take a typist 45–90 minutes is processed automatically. Your clerks move on to the next job while the doc builds itself." },
              { icon: "💷", title: "£5.00 flat — any property size", body: "A studio flat costs the same as an 8-bedroom house. No surprises, no tiers, no monthly fees. Pay only when you convert." },
              { icon: "🎙️", title: "Clerk dictation understood", body: "Our AI is trained on real inventory clerk speech patterns — continuous dictation, self-corrections, go-back instructions and all." },
              { icon: "✏️", title: "Transcription errors corrected", body: "Common speech-to-text errors are automatically fixed. UPVC, Formica, kickplates, Artex — all corrected to professional inventory wording." },
              { icon: "🔒", title: "Staff logins included", body: "Every team member gets their own secure login. No extra cost per seat — add as many clerks as you need." },
              { icon: "📄", title: "Industry-standard Word format", body: "Three-column layout (Item / Description / Condition) matching InventoryBase templates. Ready to import and submit immediately." },
            ].map((f) => (
              <div key={f.title} className="flex gap-4">
                <span className="text-2xl flex-shrink-0">{f.icon}</span>
                <div>
                  <h3 className="font-semibold mb-1">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Pricing</p>
          <h2 className="text-3xl font-bold mb-12">One flat rate. No surprises.</h2>
          <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-sm mb-12">
            <p className="text-sm text-gray-400 mb-1">Flat rate per conversion</p>
            <p className="text-5xl font-bold mb-1">£5.00</p>
            <p className="text-sm text-gray-400 mb-6">per report · any size property</p>
            <ul className="space-y-2 text-sm text-gray-600 mb-8">
              {["1-bed flat or 10-bed house — same price","Pay as you go — no monthly commitment","Unlimited staff logins included","Credits never expire"].map((item) => (
                <li key={item} className="flex items-center gap-2"><span className="text-green-500">✓</span> {item}</li>
              ))}
            </ul>
            <Link href="/auth" className="block text-center bg-gray-900 text-white text-sm font-semibold px-6 py-3 rounded-lg hover:bg-gray-700 transition">
              Log in to get started
            </Link>
          </div>
          <h3 className="font-semibold text-lg mb-4">How it compares</h3>
          <div className="space-y-3 max-w-lg">
            {[
              { label: "External typist", sub: "Average market rate per report", price: "£12–£25", highlight: false },
              { label: "In-house typing time", sub: "45–90 mins of staff time per report", price: "~£18", highlight: false },
              { label: "InventoryTools", sub: "Any property · ready in 2–5 minutes", price: "£5.00", highlight: true },
            ].map((row) => (
              <div key={row.label} className={`flex items-center justify-between px-5 py-4 rounded-lg border ${row.highlight ? "bg-gray-900 text-white border-gray-900" : "border-gray-200"}`}>
                <div>
                  <p className={`font-semibold text-sm ${row.highlight ? "text-white" : "text-gray-800"}`}>{row.label}</p>
                  <p className="text-xs text-gray-400">{row.sub}</p>
                </div>
                <p className={`font-bold text-lg ${row.highlight ? "text-white" : "text-gray-800"}`}>{row.price}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 bg-orange-50 border border-orange-100 rounded-lg p-5 max-w-lg">
            <p className="text-sm text-orange-800">💡 If you process just <strong>20 reports a month</strong>, you&apos;re saving up to <strong>£430</strong> compared to an external typist.</p>
          </div>
        </div>
      </section>

      <section className="py-20 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-4">Your next report done in 2–5 minutes</h2>
          <p className="text-gray-400 mb-8">£5.00 flat rate. Any property. Any recording length.</p>
          <Link href="/auth" className="inline-block bg-gray-900 text-white text-sm font-semibold px-8 py-3 rounded-lg hover:bg-gray-700 transition">
            Log in to get started
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-8 px-6 flex items-center justify-between text-xs text-gray-400">
        <span>inventorytools.co.uk</span>
        <div className="flex gap-4">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </div>
        <span>© 2026 InventoryTools Ltd</span>
      </footer>
    </div>
  );
}
