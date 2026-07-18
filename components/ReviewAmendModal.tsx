'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useReviewAudioEngine } from './useReviewAudioEngine'

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
const LOOP_SECONDS = 4

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
const SCROLL_BUFFER_LINES = 6

function scrollWordIntoView(wordEl: HTMLElement | null) {
  if (!wordEl) return
  const container = wordEl.closest('.rm-scrollbar') as HTMLElement | null
  if (!container) return
  const computedFontSize = parseFloat(getComputedStyle(wordEl).fontSize) || 15
  const lineHeight = computedFontSize * 1.9
  const buffer = SCROLL_BUFFER_LINES * lineHeight
  const containerRect = container.getBoundingClientRect()
  const wordRect = wordEl.getBoundingClientRect()
  const wordTopRel = wordRect.top - containerRect.top
  const wordBottomRel = wordRect.bottom - containerRect.top

  if (wordTopRel < 0) {
    // Scrolled past above - bring the word back into view near the top.
    container.scrollTo({ top: container.scrollTop + wordTopRel - lineHeight, behavior: 'smooth' })
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

// Builds a flat token stream from the preview rows (item + description + condition per
// row, in order) so the playing transcript can be fuzzy-matched against it. There's no
// true per-item timing from the extraction step yet - this is a heuristic stand-in until
// GPT-5.5's extraction is extended to tag which words produced each item.
function buildRowTokens(rows: { item: string; description: string; condition: string }[]): { tokens: string[]; owner: number[] } {
  const tokens: string[] = []
  const owner: number[] = []
  rows.forEach((row, ri) => {
    const text = `${row.item} ${row.description} ${row.condition}`
    text.split(/\s+/).filter(Boolean).forEach((w) => {
      tokens.push(normalizeWord(w))
      owner.push(ri)
    })
  })
  return { tokens, owner }
}

function alignWordsToRowTokens(t1: WhisperWord[], rowTokens: string[]): number[] {
  const n = t1.length
  const m = rowTokens.length
  if (n === 0 || m === 0) return new Array(n).fill(-1)

  const norm1 = t1.map((w) => normalizeWord(w.word))

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (norm1[i - 1] && norm1[i - 1] === rowTokens[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  const matchRowToken = new Array(n).fill(-1)
  let i = n, j = m
  while (i > 0 && j > 0) {
    if (norm1[i - 1] && norm1[i - 1] === rowTokens[j - 1]) {
      matchRowToken[i - 1] = j - 1
      i--; j--
    } else if (dp[i - 1][j] >= dp[i][j - 1]) i--
    else j--
  }
  return matchRowToken
}

function AddRowDivider({ onAdd, accentColor }: { onAdd: () => void; accentColor: string }) {
  const [hover, setHover] = useState(false)
  return (
    <tr>
      <td colSpan={4} style={{ padding: 0, height: 14 }}>
        <div
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onClick={onAdd}
          style={{
            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: 4,
            cursor: 'pointer',
          }}
        >
          <span style={{
            fontSize: 13, fontWeight: 700, lineHeight: 1, color: accentColor,
            opacity: hover ? 1 : 0.25, transition: 'opacity 0.1s ease',
          }}>+</span>
        </div>
      </td>
    </tr>
  )
}

function TextSizeControl({ size, onChange, min, max }: { size: number; onChange: (n: number) => void; min: number; max: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#8a8a8a', marginRight: 2 }}>Text size</span>
      <button onClick={() => onChange(Math.max(min, size - 1))} style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid #ecebe8', background: '#fff', color: '#1a1a1a', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }} aria-label="Decrease text size">−</button>
      <button onClick={() => onChange(Math.min(max, size + 1))} style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid #ecebe8', background: '#fff', color: '#1a1a1a', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }} aria-label="Increase text size">+</button>
    </div>
  )
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
  const [isLooping, setIsLooping] = useState(false)
  const loopStartRef = useRef<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [transcriptFontSize, setTranscriptFontSize] = useState(15)
  const [previewFontSize, setPreviewFontSize] = useState(13.5)

  const rightPanelRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const activeRowRef = useRef<HTMLTableRowElement | null>(null)
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

  const engine = useReviewAudioEngine(audioUrls[roomName])
  const { isPlaying, currentTime, duration, speed, setSpeed, boostQuiet, setBoostQuiet, evenOutVolume, setEvenOutVolume, clarityBoost, setClarityBoost, noiseGate, setNoiseGate } = engine

  const t2Timestamps = useMemo(() => alignGpt4oWords(t1Words, t2Words), [t1Words, t2Words])

  const t1ActiveIndex = useMemo(() => {
    let idx = -1
    for (let i = 0; i < t1Words.length; i++) {
      if (t1Words[i].start <= currentTime) idx = i
      else break
    }
    return idx
  }, [t1Words, currentTime])

  const rowTokenMatch = useMemo(() => {
    const { tokens, owner } = buildRowTokens(room?.rows || [])
    const matches = alignWordsToRowTokens(t1Words, tokens)
    return { matches, owner }
  }, [room, t1Words])

  const activeRowIndex = useMemo(() => {
    const { matches, owner } = rowTokenMatch
    for (let i = t1ActiveIndex; i >= 0; i--) {
      if (matches[i] !== -1) return owner[matches[i]]
    }
    return -1
  }, [rowTokenMatch, t1ActiveIndex])

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

  useEffect(() => {
    scrollWordIntoView(activeRowRef.current)
  }, [activeRowIndex, roomIndex])

  // Reset loop tracking when room changes - audio load/reset itself is handled inside the engine hook
  useEffect(() => {
    setIsLooping(false)
    loopStartRef.current = null
  }, [roomIndex])

  const togglePlay = () => {
    if (engine.isPlaying) engine.pause()
    else engine.play()
  }

  const stopPlayback = () => {
    engine.stop()
    setIsLooping(false)
    loopStartRef.current = null
  }

  const seek = (deltaSeconds: number) => {
    const target = Math.max(0, Math.min(engine.duration || 0, engine.currentTime + deltaSeconds))
    engine.seekTo(target)
  }

  const toggleLoop = () => {
    setIsLooping((looping) => {
      if (looping) {
        loopStartRef.current = null
        return false
      }
      loopStartRef.current = engine.currentTime
      return true
    })
  }

  const seekTo = (seconds: number) => {
    engine.seekTo(Math.max(0, seconds))
    if (!engine.isPlaying) engine.play()
  }

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
  })

  // Loop enforcement - engine.currentTime is driven by its own requestAnimationFrame loop
  useEffect(() => {
    if (isLooping && loopStartRef.current != null && currentTime >= loopStartRef.current + LOOP_SECONDS) {
      engine.seekTo(loopStartRef.current)
    }
  }, [currentTime, isLooping])

  const updateItem = (ri: number, ii: number, field: keyof RoomRow, value: string) => {
    setEditedRooms((prev) => {
      const next = prev.map((r) => ({ roomName: r.roomName, rows: r.rows.map((row) => ({ ...row })) }))
      next[ri].rows[ii][field] = value
      return next
    })
  }

  const insertRowAt = (ri: number, atIndex: number) => {
    setEditedRooms((prev) => {
      const next = prev.map((r) => ({ roomName: r.roomName, rows: r.rows.map((row) => ({ ...row })) }))
      next[ri].rows.splice(atIndex, 0, { item: '', description: '', condition: '' })
      return next
    })
  }

  const deleteRow = (ri: number, ii: number) => {
    setEditedRooms((prev) => {
      const next = prev.map((r) => ({ roomName: r.roomName, rows: r.rows.map((row) => ({ ...row })) }))
      next[ri].rows.splice(ii, 1)
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 18px 0', background: '#fff' }}>
              <TextSizeControl size={transcriptFontSize} onChange={setTranscriptFontSize} min={11} max={24} />
            </div>
            <div style={{ flex: 1, borderBottom: '1px solid #ecebe8', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={transcriptLabelStyle}>Transcript 1</div>
              <div className="rm-scrollbar" style={{ ...transcriptBodyStyle, fontSize: transcriptFontSize }}>
                <div style={roomNameStyle}>{roomName}</div>
                {t1Words.map((w, i) => (
                  <span key={i} ref={(el) => { t1WordRefs.current[i] = el }} className={`rm-word${i === t1ActiveIndex ? ' active' : ''}`} onClick={() => seekTo(w.start)}>{w.word}{' '}</span>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={transcriptLabelStyle}>Transcript 2</div>
              <div className="rm-scrollbar" style={{ ...transcriptBodyStyle, fontSize: transcriptFontSize }}>
                <div style={roomNameStyle}>{roomName}</div>
                {t2Words.map((w, i) => (
                  <span key={i} ref={(el) => { t2WordRefs.current[i] = el }} className={`rm-word${i === t2ActiveIndex ? ' active' : ''}`} onClick={() => seekTo(t2Timestamps[i])}>{w}{' '}</span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ width: '58%', display: 'flex', flexDirection: 'column', background: '#f6f5f3' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 24px 0' }}>
              <TextSizeControl size={previewFontSize} onChange={setPreviewFontSize} min={11} max={18} />
            </div>
            <div className="rm-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '10px 24px 18px' }}>
            {editedRooms.map((r, ri) => (
              <div key={r.roomName} ref={(el) => { rightPanelRefs.current[r.roomName] = el }} style={{
                background: '#fff', borderRadius: 14,
                border: ri === roomIndex ? `1.5px solid ${accentColor}` : '1px solid #ecebe8',
                boxShadow: '0 8px 30px rgba(26,26,26,.05)', marginBottom: 16, overflow: 'hidden',
              }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, color: '#1a1a1a', padding: '12px 16px', borderBottom: '1px solid #ecebe8' }}>{r.roomName}</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: previewFontSize }}>
                  <thead>
                    <tr style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#8a8a8a' }}>
                      <th style={{ textAlign: 'left', padding: '6px 16px', width: '24%' }}>Item</th>
                      <th style={{ textAlign: 'left', padding: '6px 16px', width: '36%' }}>Description</th>
                      <th style={{ textAlign: 'left', padding: '6px 16px', width: '36%' }}>Condition</th>
                      <th style={{ width: 36 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    <AddRowDivider onAdd={() => insertRowAt(ri, 0)} accentColor={accentColor} />
                    {r.rows.map((row, ii) => {
                      const isActive = ri === roomIndex && ii === activeRowIndex
                      return (
                        <React.Fragment key={ii}>
                          <tr ref={isActive ? activeRowRef : undefined} style={{ borderTop: '1px solid #ecebe8', background: isActive ? `${accentColor}14` : 'transparent', transition: 'background 0.2s ease' }}>
                            <td style={{ padding: '4px 12px', borderLeft: isActive ? `3px solid ${accentColor}` : '3px solid transparent' }}>
                              <AutoGrowCell className="rm-input" value={row.item} onChange={(v) => updateItem(ri, ii, 'item', v)} />
                            </td>
                            <td style={{ padding: '4px 12px' }}>
                              <AutoGrowCell className="rm-input" value={row.description} onChange={(v) => updateItem(ri, ii, 'description', v)} />
                            </td>
                            <td style={{ padding: '4px 12px' }}>
                              <AutoGrowCell className="rm-input" value={row.condition} onChange={(v) => updateItem(ri, ii, 'condition', v)} />
                            </td>
                            <td style={{ padding: '4px 4px', textAlign: 'center' }}>
                              <button onClick={() => deleteRow(ri, ii)} title="Delete row" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}
                                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2 2 0 01-2 2H8a2 2 0 01-2-2L5,6"/><path d="M10,11v6M14,11v6"/><path d="M9,6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                              </button>
                            </td>
                          </tr>
                          <AddRowDivider onAdd={() => insertRowAt(ri, ii + 1)} accentColor={accentColor} />
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ))}
            </div>
          </div>
        </div>

        {/* Bottom audio bar */}
        <div style={{ borderTop: '1px solid #ecebe8', background: '#fff', padding: '12px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => seek(-5)} style={transportBtnStyle} aria-label="Back 5 seconds">⏪</button>
              <button onClick={togglePlay} style={{ ...transportBtnStyle, width: 44, height: 44, borderRadius: '50%', background: accentColor, color: '#fff', border: 'none' }} aria-label={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? '⏸' : '▶'}</button>
              <button onClick={stopPlayback} style={transportBtnStyle} aria-label="Stop">⏹</button>
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
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#8a8a8a', textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                {isLooping && <span style={{ color: accentColor, fontWeight: 700 }}>● Looping 4s</span>}
              </div>
            </div>
            <div className="rm-scrollbar" style={{ display: 'flex', gap: 4, overflowX: 'auto', maxWidth: '44%', paddingBottom: 2 }}>
              {SPEEDS.map((s) => (
                <button key={s} onClick={() => setSpeed(s)} style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, padding: '6px 7px', borderRadius: 8,
                  border: '1px solid #ecebe8', background: speed === s ? '#1a1a1a' : '#f6f5f3',
                  color: speed === s ? '#fff' : '#4a4a4a', cursor: 'pointer', flexShrink: 0,
                }}>{s}x</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 10 }}>
            {[
              { label: 'Reduce background noise', active: noiseGate, onClick: () => setNoiseGate((v) => !v) },
              { label: 'Boost quiet audio', active: boostQuiet, onClick: () => setBoostQuiet((v) => !v) },
              { label: 'Even out volume', active: evenOutVolume, onClick: () => setEvenOutVolume((v) => !v) },
              { label: 'Clarity boost', active: clarityBoost, onClick: () => setClarityBoost((v) => !v) },
            ].map((t) => (
              <button key={t.label} onClick={t.onClick} style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, padding: '6px 12px', borderRadius: 20,
                border: t.active ? `1px solid ${accentColor}` : '1px solid #ecebe8',
                background: t.active ? accentColor : '#f6f5f3', color: t.active ? '#fff' : '#4a4a4a',
                cursor: 'pointer', fontWeight: 600,
              }}>{t.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 10, paddingTop: 10, borderTop: '1px solid #ecebe8', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#1a1a1a' }}>
            <span><kbd style={kbdStyle}>↓</kbd> <strong>Play / Pause</strong></span>
            <span><kbd style={kbdStyle}>←</kbd> <strong>Back 5s</strong></span>
            <span><kbd style={kbdStyle}>→</kbd> <strong>Forward 5s</strong></span>
            <span><kbd style={kbdStyle}>L</kbd> <strong style={{ color: isLooping ? accentColor : '#1a1a1a' }}>Loop 4s</strong> {isLooping ? '· press L to stop' : ''}</span>
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
