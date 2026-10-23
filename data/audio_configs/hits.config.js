/**
 * Campus Clash — Combat Hit Stack & Anti-Repetition Configuration
 * @module data/audio_configs/hits.config
 */

export const HITS_CONFIG = {
  antiRepetition: {
    poolSize: 6,
    pitchJitterPercent: 6.0,  // ±6% random micro-detuning
    volumeJitterDb: 0.9,      // ±0.9 dB random level variation
    preventImmediateRepeat: true
  },

  // 3-Layer Physical Impact Composite
  layers: {
    light: {
      transient: { freq: 4200, duration: 0.035, gain: 0.70, type: 'triangle' },
      body:      { freq: 520,  duration: 0.065, gain: 0.50, type: 'sine' },
      subBoom:   { enabled: false }
    },
    medium: {
      transient: { freq: 3600, duration: 0.045, gain: 0.85, type: 'square' },
      body:      { freq: 320,  duration: 0.090, gain: 0.75, type: 'triangle' },
      subBoom:   { enabled: true, freq: 85, duration: 0.100, gain: 0.35, delayMs: 4 }
    },
    heavy: {
      transient: { freq: 2800, duration: 0.060, gain: 1.00, type: 'sawtooth' },
      body:      { freq: 190,  duration: 0.140, gain: 0.90, type: 'triangle' },
      subBoom:   { enabled: true, freq: 55, duration: 0.220, gain: 0.95, delayMs: 6 }
    },
    block: {
      transient: { freq: 1800, duration: 0.050, gain: 0.75, type: 'sine' },
      body:      { freq: 280,  duration: 0.080, gain: 0.60, type: 'triangle' },
      subBoom:   { enabled: false }
    },
    parry: {
      transient: { freq: 2400, duration: 0.180, gain: 0.95, type: 'sine' },
      body:      { freq: 880,  duration: 0.240, gain: 0.85, type: 'triangle' },
      subBoom:   { enabled: true, freq: 70, duration: 0.140, gain: 0.50, delayMs: 2 }
    },
    counter: {
      transient: { freq: 3200, duration: 0.070, gain: 1.00, type: 'sawtooth' },
      body:      { freq: 240,  duration: 0.120, gain: 0.90, type: 'triangle' },
      subBoom:   { enabled: true, freq: 60, duration: 0.180, gain: 0.80, delayMs: 5 }
    }
  },

  // Combo Tonal Pitch Riser
  comboRiser: {
    baseScalar: 1.0,
    semitoneStepPerHit: 0.05,
    maxCapScalar: 1.75
  }
};
