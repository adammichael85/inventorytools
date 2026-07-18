// Simple downward-expander style noise gate.
// Unlike a hard gate (which mutes completely and can click), this softly reduces
// gain when the signal envelope drops below the threshold, and restores it
// smoothly as the signal rises back above it - good for taming steady background
// hiss/hum between spoken words without chopping quiet speech.
class NoiseGateProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'threshold', defaultValue: -45, minValue: -100, maxValue: 0 },
      { name: 'enabled', defaultValue: 0, minValue: 0, maxValue: 1 },
    ]
  }

  constructor() {
    super()
    this.envelope = 0
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]
    const output = outputs[0]
    if (!input || input.length === 0) return true

    const enabledParam = parameters.enabled
    const thresholdParam = parameters.threshold
    const attack = 0.01   // fast response to rising signal (don't clip word onsets)
    const release = 0.15  // slower release so it doesn't chatter between syllables
    const floor = 0.06    // never fully mute - avoids harsh on/off clicking

    for (let channel = 0; channel < input.length; channel++) {
      const inChannel = input[channel]
      const outChannel = output[channel]
      for (let i = 0; i < inChannel.length; i++) {
        const enabled = enabledParam.length > 1 ? enabledParam[i] : enabledParam[0]
        const sample = inChannel[i]
        if (!enabled) {
          outChannel[i] = sample
          continue
        }
        const thresholdDb = thresholdParam.length > 1 ? thresholdParam[i] : thresholdParam[0]
        const thresholdLinear = Math.pow(10, thresholdDb / 20)

        const absSample = Math.abs(sample)
        const coeff = absSample > this.envelope ? attack : release
        this.envelope += coeff * (absSample - this.envelope)

        let gain = 1
        if (this.envelope < thresholdLinear) {
          const ratio = this.envelope / thresholdLinear
          gain = Math.max(floor, ratio)
        }
        outChannel[i] = sample * gain
      }
    }
    return true
  }
}

registerProcessor('noise-gate-processor', NoiseGateProcessor)
