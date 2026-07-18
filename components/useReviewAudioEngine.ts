import { useCallback, useEffect, useRef, useState } from 'react'
import { SoundTouchNode } from '@soundtouchjs/audio-worklet'

// Replaces the <audio>-element-driven transport used previously. Browsers won't reliably
// play sped-up audio once an element has been routed through the Web Audio API for the
// enhancement toggles (boost/compression/clarity/noise gate) - the native playbackRate and
// a Web Audio graph don't mix well together. SoundTouch avoids this entirely: the audio
// always plays at native 1x as far as the browser's decoder is concerned, and speed is
// applied as pure sample processing inside our own graph instead, alongside everything else.
//
// The SoundTouch node and noise gate node are rebuilt fresh every time playback starts
// (play, seek, loop restart) rather than reused for the whole room session - both are
// stateful, buffered processors (WSOLA time-stretching and an envelope-follower gate), and
// reusing one instance across repeated start/stop/speed-change cycles let stale buffered
// audio leak into a later playback start (audible as a stutter-repeat on Stop, or skipping
// when a toggle and a speed change landed close together). A fresh node has no buffered
// history, so this can't happen. The downstream gain/compressor/clarity chain has no such
// buffering concerns and stays persistent for the room's session.

let sharedWorkletModulesRegistered: Promise<void> | null = null

async function ensureWorkletModules(ctx: AudioContext) {
  if (!sharedWorkletModulesRegistered) {
    sharedWorkletModulesRegistered = (async () => {
      await SoundTouchNode.register(ctx, '/soundtouch-processor.js')
      try {
        await ctx.audioWorklet.addModule('/noise-gate-processor.js')
      } catch (e) {
        console.error('Noise gate worklet failed to load, continuing without it', e)
      }
    })()
  }
  return sharedWorkletModulesRegistered
}

export interface ReviewAudioEngine {
  isReady: boolean
  isPlaying: boolean
  currentTime: number
  duration: number
  speed: number
  setSpeed: (rate: number) => void
  play: () => void
  pause: () => void
  stop: () => void
  seekTo: (seconds: number) => void
  boostQuiet: boolean
  setBoostQuiet: (v: boolean | ((prev: boolean) => boolean)) => void
  evenOutVolume: boolean
  setEvenOutVolume: (v: boolean | ((prev: boolean) => boolean)) => void
  clarityBoost: boolean
  setClarityBoost: (v: boolean | ((prev: boolean) => boolean)) => void
  noiseGate: boolean
  setNoiseGate: (v: boolean | ((prev: boolean) => boolean)) => void
}

export function useReviewAudioEngine(audioUrl: string | undefined): ReviewAudioEngine {
  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeedState] = useState(1)
  const [boostQuiet, setBoostQuiet] = useState(false)
  const [evenOutVolume, setEvenOutVolume] = useState(false)
  const [clarityBoost, setClarityBoost] = useState(false)
  const [noiseGate, setNoiseGate] = useState(false)

  const ctxRef = useRef<AudioContext | null>(null)
  const bufferRef = useRef<AudioBuffer | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null)
  const clarityFilterRef = useRef<BiquadFilterNode | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const stNodeRef = useRef<SoundTouchNode | null>(null)
  const noiseGateNodeRef = useRef<AudioWorkletNode | null>(null)
  const manualStopRef = useRef(false)

  // Playback clock: position = pausedAt if paused, else pausedAt + elapsed-real-time * speed
  const startCtxTimeRef = useRef(0)
  const pausedAtRef = useRef(0)
  const speedRef = useRef(1)
  const rafRef = useRef<number | null>(null)

  // Current toggle values, mirrored into refs so startFrom (a useCallback that must stay
  // stable across renders) can read the latest state without needing to be recreated
  const boostQuietRef = useRef(false)
  const evenOutVolumeRef = useRef(false)
  const clarityBoostRef = useRef(false)
  const noiseGateRef = useRef(false)
  useEffect(() => { boostQuietRef.current = boostQuiet }, [boostQuiet])
  useEffect(() => { evenOutVolumeRef.current = evenOutVolume }, [evenOutVolume])
  useEffect(() => { clarityBoostRef.current = clarityBoost }, [clarityBoost])
  useEffect(() => { noiseGateRef.current = noiseGate }, [noiseGate])

  const loadIdRef = useRef(0)

  // Load + decode audio, build the persistent downstream chain, whenever the room's audio URL changes
  useEffect(() => {
    if (!audioUrl) return
    const thisLoadId = ++loadIdRef.current
    setIsReady(false)
    setIsPlaying(false)
    setCurrentTime(0)
    pausedAtRef.current = 0

    ;(async () => {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      const ctx = ctxRef.current ?? new AudioContextClass()
      ctxRef.current = ctx
      await ensureWorkletModules(ctx)
      if (thisLoadId !== loadIdRef.current) return // a newer room load superseded this one

      const response = await fetch(audioUrl)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
      if (thisLoadId !== loadIdRef.current) return

      bufferRef.current = audioBuffer
      setDuration(audioBuffer.duration)

      // Build the persistent downstream chain once: gain -> compressor -> clarityFilter -> destination.
      // The SoundTouch and noise gate nodes are NOT built here - they're rebuilt fresh on every
      // playback start (see startFrom below).
      if (!gainNodeRef.current) {
        const gainNode = ctx.createGain()
        const compressor = ctx.createDynamicsCompressor()
        const clarityFilter = ctx.createBiquadFilter()
        clarityFilter.type = 'peaking'
        clarityFilter.frequency.value = 2500
        clarityFilter.Q.value = 1
        gainNode.gain.value = boostQuiet ? 1.8 : 1
        if (evenOutVolume) {
          compressor.threshold.value = -30
          compressor.ratio.value = 4
          compressor.attack.value = 0.01
          compressor.release.value = 0.25
        } else {
          compressor.threshold.value = 0
          compressor.ratio.value = 1
        }
        clarityFilter.gain.value = clarityBoost ? 6 : 0

        gainNode.connect(compressor)
        compressor.connect(clarityFilter)
        clarityFilter.connect(ctx.destination)

        gainNodeRef.current = gainNode
        compressorNodeRef.current = compressor
        clarityFilterRef.current = clarityFilter
      }

      setIsReady(true)
    })()

    return () => { loadIdRef.current++ } // invalidate in-flight load if the room changes again
  }, [audioUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle effects - adjust the persistent chain live without rebuilding it
  useEffect(() => {
    if (gainNodeRef.current) gainNodeRef.current.gain.value = boostQuiet ? 1.8 : 1
  }, [boostQuiet])

  useEffect(() => {
    const c = compressorNodeRef.current
    if (!c) return
    if (evenOutVolume) {
      c.threshold.value = -30
      c.ratio.value = 4
      c.attack.value = 0.01
      c.release.value = 0.25
    } else {
      c.threshold.value = 0
      c.ratio.value = 1
    }
  }, [evenOutVolume])

  useEffect(() => {
    if (clarityFilterRef.current) clarityFilterRef.current.gain.value = clarityBoost ? 6 : 0
  }, [clarityBoost])

  // Noise gate lives on the per-playback node, not the persistent chain - update whichever
  // instance is currently active, if any
  useEffect(() => {
    const gate = noiseGateNodeRef.current
    if (gate) gate.parameters.get('enabled')!.value = noiseGate ? 1 : 0
  }, [noiseGate])

  const stopSource = useCallback(() => {
    if (sourceRef.current) {
      manualStopRef.current = true
      try { sourceRef.current.stop() } catch (e) { /* already stopped */ }
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    // Tear down the per-playback nodes too, so no buffered state survives into the next start
    if (stNodeRef.current) {
      try { stNodeRef.current.disconnect() } catch (e) { /* already disconnected */ }
      stNodeRef.current = null
    }
    if (noiseGateNodeRef.current) {
      try { noiseGateNodeRef.current.disconnect() } catch (e) { /* already disconnected */ }
      noiseGateNodeRef.current = null
    }
  }, [])

  const computeCurrentPosition = useCallback(() => {
    const ctx = ctxRef.current
    if (!ctx || !sourceRef.current) return pausedAtRef.current
    return pausedAtRef.current + (ctx.currentTime - startCtxTimeRef.current) * speedRef.current
  }, [])

  const startFrom = useCallback((offsetSeconds: number) => {
    const ctx = ctxRef.current
    const buffer = bufferRef.current
    const gainNode = gainNodeRef.current
    if (!ctx || !buffer || !gainNode) return
    stopSource()
    manualStopRef.current = false

    // Fresh SoundTouch + noise gate nodes for this playback start - no leftover buffered state
    const stNode = new SoundTouchNode({ context: ctx })
    let noiseGateNode: AudioWorkletNode | null = null
    try {
      noiseGateNode = new AudioWorkletNode(ctx, 'noise-gate-processor')
      noiseGateNode.parameters.get('enabled')!.value = noiseGateRef.current ? 1 : 0
    } catch (e) {
      console.error('Noise gate node failed to construct, continuing without it', e)
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = speedRef.current
    stNode.playbackRate.value = speedRef.current
    source.connect(stNode)
    if (noiseGateNode) {
      stNode.connect(noiseGateNode)
      noiseGateNode.connect(gainNode)
    } else {
      stNode.connect(gainNode)
    }
    source.onended = () => {
      if (manualStopRef.current) return // stopped ourselves for a seek/pause - not real end of track
      setIsPlaying(false)
    }

    const clampedOffset = Math.max(0, Math.min(offsetSeconds, buffer.duration))
    source.start(0, clampedOffset)
    sourceRef.current = source
    stNodeRef.current = stNode
    noiseGateNodeRef.current = noiseGateNode
    startCtxTimeRef.current = ctx.currentTime
    pausedAtRef.current = clampedOffset
  }, [stopSource])

  const play = useCallback(() => {
    const ctx = ctxRef.current
    if (!ctx || !bufferRef.current) return
    if (ctx.state === 'suspended') ctx.resume()
    startFrom(pausedAtRef.current)
    setIsPlaying(true)
  }, [startFrom])

  const pause = useCallback(() => {
    pausedAtRef.current = computeCurrentPosition()
    stopSource()
    setIsPlaying(false)
  }, [computeCurrentPosition, stopSource])

  const stop = useCallback(() => {
    stopSource()
    setIsPlaying(false)
    // Deliberately does not reset pausedAtRef - Stop holds position, matching prior behavior
  }, [stopSource])

  const seekTo = useCallback((seconds: number) => {
    const wasPlaying = isPlaying
    pausedAtRef.current = Math.max(0, seconds)
    setCurrentTime(pausedAtRef.current)
    if (wasPlaying) {
      startFrom(pausedAtRef.current)
    } else {
      stopSource()
    }
  }, [isPlaying, startFrom, stopSource])

  const setSpeed = useCallback((rate: number) => {
    // Rebase the clock at the current computed position before changing rate, so time
    // already elapsed at the old speed isn't retroactively recalculated at the new one.
    // Restarting playback (rather than just nudging the live playbackRate AudioParam) means
    // the SoundTouch node is rebuilt fresh at the new rate too, avoiding any stale internal
    // buffering from the previous rate.
    speedRef.current = rate
    setSpeedState(rate)
    if (isPlaying) {
      const current = computeCurrentPosition()
      startFrom(current)
    }
  }, [isPlaying, computeCurrentPosition, startFrom])

  // Position polling loop - drives the progress bar and transcript/preview highlighting,
  // replacing the previous 'timeupdate' event from the <audio> element
  useEffect(() => {
    if (!isPlaying) return
    const tick = () => {
      setCurrentTime(computeCurrentPosition())
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current) }
  }, [isPlaying, computeCurrentPosition])

  // Auto-pause the UI state once the buffer naturally runs out
  useEffect(() => {
    if (isPlaying && duration > 0 && currentTime >= duration) {
      pausedAtRef.current = duration
      stopSource()
      setIsPlaying(false)
    }
  }, [currentTime, duration, isPlaying, stopSource])

  useEffect(() => {
    return () => {
      stopSource()
      ctxRef.current?.close()
    }
  }, [stopSource])

  return {
    isReady, isPlaying, currentTime, duration, speed, setSpeed,
    play, pause, stop, seekTo,
    boostQuiet, setBoostQuiet, evenOutVolume, setEvenOutVolume,
    clarityBoost, setClarityBoost, noiseGate, setNoiseGate,
  }
}
