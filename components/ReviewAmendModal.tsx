'use client'

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'

type WhisperWord = { word: string; start: number; end: number }
type RoomRow = { item: string; description: string; condition: string }
type RoomData = { roomName: string; rows: RoomRow[] }

interface ReviewAmendModalProps {
  conversionId: string
  userId: string
  getAuthToken: () => Promise<string>
  onClose: () => void
  accentColor?: string
}

const SPEEDS = [0.5, 1, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4]
const LOOP_SECONDS = 5

function normalizeWord(w: string) {
  return (w || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Keeps the active word comfortably away from the bottom edge of its transcript panel -
// roughly 6 lines of reading room below it, rather than snapping it right to the edge.
const TRANSCRIPT_LINE_HEIGHT = 15 * 1.9 // matches transcriptBodyStyle fontSize/lineHeight below
const SCROLL_BUFFER_LINES = 6

function scrollWordIntoView(wordEl: HTMLElement | null) {
  if (!wordEl) return
  const container = wordEl.closest('.rm-scrollbar') as HTMLElement | null
  if (!container) return
  const buffer = SCROLL_BUFFER_LINES * TRANSCRIPT_LINE_HEIGHT
  const containerRect = container.getBoundingClientRect()
  const wordRect = wordEl.getBoundingClientRect()
  const wordTopRel = wordRect.top - containerRect.top
  const wordBottomRel = wordRect.bottom - containerRect.top

  if (wordTopRel < 0) {
    // Scrolled past above - bring the word back into view near the top.
    container.scrollTo({ top: container.scrollTop + wordTopRel - TRANSCRIPT_LINE_HEIGHT, behavior: 'smooth' })
  } else if (wordBottomRel > container.clientHeight - buffer) {
    // Not enough reading room below - scroll down just enough to restore the buffer.
    const overflow = wordBottomRel - (container.clientHeight - buffer)
    container.scrollTo({ top: container.scrollTop + overflow, behavior: 'smooth' })
  }
}

// Aligns GPT-4o's plain word list against Whisper's timestamped word list using an
// LCS-based anchor match, then linearly interpolates timestamps for the words in
// between anchors. GPT-4o has no native timestamps, so this borrows Whisper's clock.
function alignGpt4oWords(t1: WhisperWord[], t2: string[]): number[] {
  const n = t1.length
  const m = t2.length
  if (n === 0 || m === 0) return new Array(m).fill(0)

  const norm1 = t1.map((w) => normalizeWord(w.word))
  const norm2 = t2.map(normalizeWord)

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (norm1[i - 1] && norm1[i - 1] === norm2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  const matchT1 = new Array(m).fill(-1)
  let i = n, j = m
  while (i > 0 && j > 0) {
    if (norm1[i - 1] && norm1[i - 1] === norm2[j - 1]) {
      matchT1[j - 1] = i - 1
      i--; j--
    } else if (dp[i - 1][j] >= dp[i][j - 1]) i--
    else j--
  }

  const ts = new Array(m).fill(0)
  let lastAnchorJ = -1
  let lastAnchorTime = t1[0]?.start ?? 0

  for (let k = 0; k < m; k++) {
    if (matchT1[k] !== -1) {
      const anchorTime = t1[matchT1[k]].start
      if (lastAnchorJ === -1) {
        for (let p = 0; p < k; p++) ts[p] = anchorTime
      } else {
        const span = k - lastAnchorJ
        for (let p = lastAnchorJ + 1; p < k; p++) {
          const frac = (p - lastAnchorJ) / span
          ts[p] = lastAnchorTime + frac * (anchorTime - lastAnchorTime)
        }
      }
      ts[k] = anchorTime
      lastAnchorJ = k
      lastAnchorTime = anchorTime
    }
  }
  if (lastAnchorJ !== -1) {
    for (let p = lastAnchorJ + 1; p < m; p++) ts[p] = lastAnchorTime
  } else {
    const totalEnd = t1[t1.length - 1]?.end ?? 10
    for (let p = 0; p < m; p++) ts[p] = (p / (m || 1)) * totalEnd
  }
  return ts
}

function AutoGrowCell({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const ref = useRef<HTMLTextAreaElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [value])
  return (
    <textarea
      ref={ref}
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={1}
      style={{
        width: '100%', border: 'none', background: 'transparent', color: '#4a4a4a',
        padding: '6px 4px', borderRadius: 6, resize: 'none', overflow: 'hidden',
        fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 1.4,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word', display: 'block',
      }}
    />
  )
}

export default function ReviewAmendModal({ conversionId, userId, getAuthToken, onClose, accentColor = '#E8622C' }: ReviewAmendModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [address, setAddress] = useState('')
  const [rooms, setRooms] = useState<RoomData[]>([])
  const [editedRooms, setEditedRooms] = useState<RoomData[]>([])
  const [whisperWords, setWhisperWords] = useState<Record<string, WhisperWord[]>>({})
  const [gpt4oWords, setGpt4oWords] = useState<Record<string, string[]>>({})
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({})

  const [roomIndex, setRoomIndex] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [isLooping, setIsLooping] = useState(false)
  const loopStartRef = useRef<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const rightPanelRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const t1WordRefs = useRef<Record<number, HTMLSpanElement | null>>({})
  const t2WordRefs = useRef<Record<number, HTMLSpanElement | null>>({})

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const token = await getAuthToken()
        const res = await fetch('/api/review-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ conversion_id: conversionId, user_id: userId }),
        })
        const data = await res.json()
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to load review data')
        if (cancelled) return
        setAddress(data.address || '')
        setRooms(data.rooms || [])
        setEditedRooms((data.rooms || []).map((r: RoomData) => ({ roomName: r.roomName, rows: r.rows.map((row) => ({ ...row })) })))
        setWhisperWords(data.whisperWords || {})
        setGpt4oWords(data.gpt4oWords || {})
        setAudioUrls(data.audioUrls || {})
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load review data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [conversionId, userId, getAuthToken])

  const room = editedRooms[roomIndex]
  const roomName = room?.roomName || ''
  const t1Words = whisperWords[roomName] || []
  const t2Words = gpt4oWords[roomName] || []

  const t2Timestamps = useMemo(() => alignGpt4oWords(t1Words, t2Words), [t1Words, t2Words])

  const t1ActiveIndex = useMemo(() => {
    let idx = -1
    for (let i = 0; i < t1Words.length; i++) {
      if (t1Words[i].start <= currentTime) idx = i
      else break
    }
    return idx
  }, [t1Words, currentTime])

  const t2ActiveIndex = useMemo(() => {
    let idx = -1
    for (let i = 0; i < t2Timestamps.length; i++) {
      if (t2Timestamps[i] <= currentTime) idx = i
      else break
    }
    return idx
  }, [t2Timestamps, currentTime])

  useEffect(() => {
    scrollWordIntoView(t1WordRefs.current[t1ActiveIndex])
  }, [t1ActiveIndex])

  useEffect(() => {
    scrollWordIntoView(t2WordRefs.current[t2ActiveIndex])
  }, [t2ActiveIndex])

  // Reset audio when room changes
  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setIsLooping(false)
    loopStartRef.current = null
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [roomIndex])

  const togglePlay = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    if (el.paused) {
      el.play()
      setIsPlaying(true)
    } else {
      el.pause()
      setIsPlaying(false)
    }
  }, [])

  const seek = useCallback((deltaSeconds: number) => {
    const el = audioRef.current
    if (!el) return
    el.currentTime = Math.max(0, Math.min(el.duration || 0, el.currentTime + deltaSeconds))
  }, [])

  const toggleLoop = useCallback(() => {
    const el = audioRef.current
    setIsLooping((looping) => {
      if (looping) {
        loopStartRef.current = null
        return false
      }
      loopStartRef.current = el?.currentTime ?? 0
      return true
    })
  }, [])

  const seekTo = useCallback((seconds: number) => {
    const el = audioRef.current
    if (!el) return
    el.currentTime = Math.max(0, seconds)
    if (el.paused) { el.play(); setIsPlaying(true) }
  }, [])

  const selectRoom = (idx: number) => {
    setRoomIndex(idx)
    const el = rightPanelRefs.current[editedRooms[idx]?.roomName]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      if (e.code === 'ArrowDown') { e.preventDefault(); togglePlay() }
      else if (e.code === 'ArrowLeft') { e.preventDefault(); seek(-5) }
      else if (e.code === 'ArrowRight') { e.preventDefault(); seek(5) }
      else if (e.code === 'KeyL') { e.preventDefault(); toggleLoop() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePlay, seek, toggleLoop])

  // Loop enforcement
  const handleTimeUpdate = () => {
    const el = audioRef.current
    if (!el) return
    setCurrentTime(el.currentTime)
    if (isLooping && loopStartRef.current != null) {
      if (el.currentTime >= loopStartRef.current + LOOP_SECONDS) {
        el.currentTime = loopStartRef.current
      }
    }
  }

  const updateItem = (ri: number, ii: number, field: keyof RoomRow, value: string) => {
    setEditedRooms((prev) => {
      const next = prev.map((r) => ({ roomName: r.roomName, rows: r.rows.map((row) => ({ ...row })) }))
      next[ri].rows[ii][field] = value
      return next
    })
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      if (!(window as any).docx) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script')
          s.src = 'https://cdn.jsdelivr.net/npm/docx@9.0.0/build/index.umd.js'
          s.onload = () => resolve(); s.onerror = reject
          document.head.appendChild(s)
        })
      }
      const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, VerticalAlign } = (window as any).docx
      const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' }
      const cellBorders = { top: border, bottom: border, left: border, right: border }
      const COL_ITEM = 2499, COL_DESC = 3972, COL_COND = 3115
      const makeCell = (text: string, colWidth: number) => new TableCell({
        borders: cellBorders,
        width: { size: colWidth, type: WidthType.DXA },
        verticalAlign: VerticalAlign.TOP,
        children: (text || '').split(/\n| \| /).map((line: string) => new Paragraph({ children: [new TextRun({ text: line.trim(), font: 'Arial', size: 20, color: '000000' })] })),
      })
      const children: any[] = []
      const filteredRooms = editedRooms.filter((r) => (r.rows || []).length > 0)
      for (let i = 0; i < filteredRooms.length; i++) {
        const r = filteredRooms[i]
        if (i > 0) children.push(new Paragraph({ children: [new TextRun({ text: '', font: 'Arial', size: 20 })], spacing: { after: 120 } }))
        children.push(new Paragraph({ children: [new TextRun({ text: r.roomName, font: 'Arial', size: 28, bold: true })] }))
        children.push(new Table({
          width: { size: COL_ITEM + COL_DESC + COL_COND, type: WidthType.DXA },
          rows: [
            new TableRow({ children: [makeCell('ITEM', COL_ITEM), makeCell('DESCRIPTION', COL_DESC), makeCell('CONDITION', COL_COND)] }),
            ...r.rows.map((row) => new TableRow({ children: [makeCell(row.item, COL_ITEM), makeCell(row.description, COL_DESC), makeCell(row.condition, COL_COND)] })),
          ],
        }))
      }
      const doc = new Document({ sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children }] })
      const b64 = await Packer.toBase64String(doc)
      const byteArray = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      const url = URL.createObjectURL(blob)
      const name = (address || 'inventory').replace(/[^a-zA-Z0-9 _-]/g, '').trim() + ' (amended).docx'
      const a = document.createElement('a')
      a.href = url; a.download = name
      document.body.appendChild(a); a.click(); a.remove()
      setToast('Amended Word document downloaded.')
      setTimeout(() => setToast(null), 3200)
    } catch (e: any) {
      setToast('Failed to create document: ' + (e.message || 'unknown error'))
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div style={overlayStyle}>
        <div style={{ ...modalStyle, alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#4a4a4a' }}>Loading review data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={overlayStyle}>
        <div style={{ ...modalStyle, alignItems: 'center', justifyContent: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#1a1a1a', fontWeight: 600 }}>Couldn't load review data</div>
          <div style={{ color: '#8a8a8a', fontSize: 14 }}>{error}</div>
          <button onClick={onClose} style={{ marginTop: 8, padding: '8px 16px', borderRadius: 10, border: '1px solid #ecebe8', background: '#f6f5f3', cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    )
  }

  return (
    <div style={overlayStyle}>
      <style>{`
        .rm-word { transition: background 0.15s ease, color 0.15s ease; padding: 1px 2px; border-radius: 3px; cursor: pointer; }
        .rm-word.active { background: ${accentColor}; color: #fff; }
        .rm-scrollbar::-webkit-scrollbar { width: 8px; }
        .rm-scrollbar::-webkit-scrollbar-thumb { background: #ecebe8; border-radius: 8px; }
        .rm-input:focus { outline: 2px solid ${accentColor}; outline-offset: 1px; }
      `}</style>
      <div style={modalStyle}>
        <audio
          ref={audioRef}
          src={audioUrls[roomName]}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
          onEnded={() => setIsPlaying(false)}
          style={{ display: 'none' }}
        />

        {/* Header */}
        <div style={headerStyle}>
          <div>
            <div style={eyebrowStyle}>Review &amp; amend</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 20, color: '#1a1a1a' }}>{address || 'Audio conversion'}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={handleCreate} disabled={creating} style={{ display: 'flex', alignItems: 'center', gap: 8, background: accentColor, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, cursor: creating ? 'default' : 'pointer', opacity: creating ? 0.7 : 1 }}>
              {creating ? 'Creating...' : 'Create Word Document'}
            </button>
            <button onClick={onClose} style={{ width: 36, height: 36, background: '#f6f5f3', border: '1px solid #ecebe8', borderRadius: 10, cursor: 'pointer', color: '#4a4a4a' }} aria-label="Close">✕</button>
          </div>
        </div>

        {/* Room tabs */}
        <div style={{ display: 'flex', gap: 6, padding: '12px 24px 0', background: '#fff', borderBottom: '1px solid #ecebe8', overflowX: 'auto' }}>
          {editedRooms.map((r, idx) => (
            <button key={r.roomName} onClick={() => selectRoom(idx)} style={{
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13, padding: '8px 16px',
              borderRadius: '10px 10px 0 0', border: '1px solid #ecebe8',
              borderBottom: idx === roomIndex ? '1px solid #f6f5f3' : '1px solid #ecebe8',
              background: idx === roomIndex ? '#f6f5f3' : '#fff',
              color: idx === roomIndex ? '#1a1a1a' : '#8a8a8a', marginBottom: -1, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>{r.roomName}</button>
          ))}
        </div>

        {/* Main split */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ width: '42%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #ecebe8' }}>
            <div style={{ flex: 1, borderBottom: '1px solid #ecebe8', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={transcriptLabelStyle}>Transcript 1</div>
              <div className="rm-scrollbar" style={transcriptBodyStyle}>
                <div style={roomNameStyle}>{roomName}</div>
                {t1Words.map((w, i) => (
                  <span key={i} ref={(el) => { t1WordRefs.current[i] = el }} className={`rm-word${i === t1ActiveIndex ? ' active' : ''}`} onClick={() => seekTo(w.start)}>{w.word}{' '}</span>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={transcriptLabelStyle}>Transcript 2</div>
              <div className="rm-scrollbar" style={transcriptBodyStyle}>
                <div style={roomNameStyle}>{roomName}</div>
                {t2Words.map((w, i) => (
                  <span key={i} ref={(el) => { t2WordRefs.current[i] = el }} className={`rm-word${i === t2ActiveIndex ? ' active' : ''}`} onClick={() => seekTo(t2Timestamps[i])}>{w}{' '}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="rm-scrollbar" style={{ width: '58%', overflowY: 'auto', padding: '18px 24px', background: '#f6f5f3' }}>
            {editedRooms.map((r, ri) => (
              <div key={r.roomName} ref={(el) => { rightPanelRefs.current[r.roomName] = el }} style={{
                background: '#fff', borderRadius: 14,
                border: ri === roomIndex ? `1.5px solid ${accentColor}` : '1px solid #ecebe8',
                boxShadow: '0 8px 30px rgba(26,26,26,.05)', marginBottom: 16, overflow: 'hidden',
              }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, color: '#1a1a1a', padding: '12px 16px', borderBottom: '1px solid #ecebe8' }}>{r.roomName}</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                  <thead>
                    <tr style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#8a8a8a' }}>
                      <th style={{ textAlign: 'left', padding: '6px 16px', width: '25%' }}>Item</th>
                      <th style={{ textAlign: 'left', padding: '6px 16px', width: '37.5%' }}>Description</th>
                      <th style={{ textAlign: 'left', padding: '6px 16px', width: '37.5%' }}>Condition</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.rows.map((row, ii) => (
                      <tr key={ii} style={{ borderTop: '1px solid #ecebe8' }}>
                        <td style={{ padding: '4px 12px' }}>
                          <AutoGrowCell className="rm-input" value={row.item} onChange={(v) => updateItem(ri, ii, 'item', v)} />
                        </td>
                        <td style={{ padding: '4px 12px' }}>
                          <AutoGrowCell className="rm-input" value={row.description} onChange={(v) => updateItem(ri, ii, 'description', v)} />
                        </td>
                        <td style={{ padding: '4px 12px' }}>
                          <AutoGrowCell className="rm-input" value={row.condition} onChange={(v) => updateItem(ri, ii, 'condition', v)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom audio bar */}
        <div style={{ borderTop: '1px solid #ecebe8', background: '#fff', padding: '12px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => seek(-5)} style={transportBtnStyle} aria-label="Back 5 seconds">⏪</button>
              <button onClick={togglePlay} style={{ ...transportBtnStyle, width: 44, height: 44, borderRadius: '50%', background: accentColor, color: '#fff', border: 'none' }} aria-label={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? '⏸' : '▶'}</button>
              <button onClick={() => seek(5)} style={transportBtnStyle} aria-label="Forward 5 seconds">⏩</button>
              <button onClick={toggleLoop} style={{
                height: 36, padding: '0 14px', borderRadius: 10,
                border: isLooping ? `1px solid ${accentColor}` : '1px solid #ecebe8',
                background: isLooping ? accentColor : '#f6f5f3', color: isLooping ? '#fff' : '#1a1a1a',
                cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13,
              }}>Loop</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ flex: 1, height: 4, background: '#ecebe8', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${duration ? (currentTime / duration) * 100 : 0}%`, background: accentColor, borderRadius: 4 }} />
                </div>
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#8a8a8a' }}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>
            <div className="rm-scrollbar" style={{ display: 'flex', gap: 4, overflowX: 'auto', maxWidth: '44%', paddingBottom: 2 }}>
              {SPEEDS.map((s) => (
                <button key={s} onClick={() => { setSpeed(s); if (audioRef.current) audioRef.current.playbackRate = s }} style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, padding: '6px 7px', borderRadius: 8,
                  border: '1px solid #ecebe8', background: speed === s ? '#1a1a1a' : '#f6f5f3',
                  color: speed === s ? '#fff' : '#4a4a4a', cursor: 'pointer', flexShrink: 0,
                }}>{s}x</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 18, marginTop: 10, paddingTop: 10, borderTop: '1px solid #ecebe8', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#8a8a8a' }}>
            <span><kbd style={kbdStyle}>↓</kbd> <strong>play / pause</strong></span>
            <span><kbd style={kbdStyle}>←</kbd> <strong>back 5s</strong></span>
            <span><kbd style={kbdStyle}>→</kbd> <strong>forward 5s</strong></span>
            <span><kbd style={kbdStyle}>L</kbd> <strong>loop 5s</strong> {isLooping ? '· press L to stop' : ''}</span>
          </div>
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', color: '#fff', padding: '12px 20px', borderRadius: 10, fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 500, boxShadow: '0 8px 30px rgba(0,0,0,.25)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(26,22,18,0.55)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24,
}
const modalStyle: React.CSSProperties = {
  width: '92vw', maxWidth: 1400, height: '86vh', background: '#f6f5f3', borderRadius: 18,
  boxShadow: '0 20px 60px rgba(0,0,0,.35)', display: 'flex', flexDirection: 'column',
  overflow: 'hidden', border: '1px solid #ecebe8',
}
const headerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px',
  borderBottom: '1px solid #ecebe8', background: '#fff',
}
const eyebrowStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.06em', color: '#8a8a8a', textTransform: 'uppercase',
}
const transcriptLabelStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8a8a8a', padding: '10px 18px 6px', background: '#fff',
}
const transcriptBodyStyle: React.CSSProperties = {
  flex: 1, overflowY: 'auto', padding: '8px 18px 18px', lineHeight: 1.9, fontSize: 15, color: '#4a4a4a',
}
const roomNameStyle: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: '#1a1a1a', marginBottom: 8,
}
const transportBtnStyle: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 10, border: '1px solid #ecebe8', background: '#f6f5f3',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1a1a',
}
const kbdStyle: React.CSSProperties = {
  display: 'inline-block', minWidth: 20, padding: '2px 6px', borderRadius: 5, border: '1px solid #ecebe8',
  background: '#fff', color: '#1a1a1a', fontWeight: 600, textAlign: 'center', marginRight: 4,
}
