/**
 * Campus Clash — Per-Venue Spatial Acoustics Configuration (The Global Arena Pack)
 * @module data/audio_configs/venues.config
 */

export const VENUES_AUDIO_CONFIG = {
  // 1. The Vertical Sprawl: Concrete & glass urban canyon, distant traffic, rain sheen
  verticalsprawl: {
    reverb: {
      rt60: 1.6,          // 1.6s decay time
      damping: 2800,      // High frequency damping from air distance
      wetDryRatio: 0.32
    },
    emitters: [
      { id: 'traffic_hum',  x: -0.6, y: -0.8, z: -300, freq: 85,  type: 'sawtooth', gain: 0.12 },
      { id: 'neon_buzz',    x:  0.4, y:  0.6, z:  -50, freq: 120, type: 'sawtooth', gain: 0.08 },
      { id: 'rain_sheen',   x:  0.0, y: -0.2, z:    0, freq: 3200,type: 'noise',    gain: 0.14 }
    ],
    surfaceType: 'concrete'
  },

  // 2. The Neon Octagon: Underground fight cage, metallic chain rattle, tight crowd roar
  neonoctagon: {
    reverb: {
      rt60: 0.85,         // Tight, enclosed, intimate colosseum
      damping: 5400,      // Highly reflective steel mesh and treadplate
      wetDryRatio: 0.28
    },
    emitters: [
      { id: 'crowd_balcony', x:  0.0, y:  0.5, z: -150, freq: 240, type: 'noise',    gain: 0.22 },
      { id: 'cage_tension',  x: -0.8, y:  0.0, z:   80, freq: 440, type: 'triangle', gain: 0.06 },
      { id: 'cage_tension_r',x:  0.8, y:  0.0, z:   80, freq: 440, type: 'triangle', gain: 0.06 }
    ],
    surfaceType: 'metal'
  },

  // 3. The Server Core: Cryogenic quantum computing void, breathing reactor core
  servercore: {
    reverb: {
      rt60: 2.4,          // Deep subterranean cavernous reflections
      damping: 1800,
      wetDryRatio: 0.38
    },
    emitters: [
      { id: 'reactor_breath',x:  0.0, y:  0.0, z: -200, freq: 52,  type: 'sine',     gain: 0.28, breathing: true },
      { id: 'cooling_fans',  x: -0.7, y:  0.3, z:  -80, freq: 880, type: 'sawtooth', gain: 0.09 },
      { id: 'cooling_fans_r',x:  0.7, y:  0.3, z:  -80, freq: 880, type: 'sawtooth', gain: 0.09 }
    ],
    surfaceType: 'cyber'
  },

  // 4. The Modular Arena: Cavernous sports hall, hydraulic panel actuator warnings
  modulararena: {
    reverb: {
      rt60: 2.8,          // Large stadium acoustic reflections
      damping: 3200,
      wetDryRatio: 0.35
    },
    emitters: [
      { id: 'stadium_pa',    x:  0.0, y:  0.9, z: -100, freq: 440, type: 'sine',     gain: 0.15 },
      { id: 'camera_crane',  x:  0.6, y:  0.7, z:   50, freq: 110, type: 'triangle', gain: 0.07 }
    ],
    // High-priority audio warning cue before hex floor reconfigures
    hazardWarning: {
      freq: 680,
      duration: 1.2,
      pulses: 3,
      klaxon: true
    },
    surfaceType: 'metal'
  },

  // 5. The Archive Vault: Tri-era nexus morphing across rounds
  archivevault: {
    reverb: {
      // Round 1: Gothic stone cathedral
      round1: { rt60: 2.6, damping: 2200, wetDryRatio: 0.40, surface: 'stone' },
      // Round 2: Industrial copper foundry
      round2: { rt60: 1.4, damping: 4800, wetDryRatio: 0.30, surface: 'metal' },
      // Round 3: Digital wireframe matrix
      round3: { rt60: 0.4, damping: 8000, wetDryRatio: 0.15, surface: 'cyber' }
    },
    emitters: [
      { id: 'torch_fire',    x: -0.6, y:  0.2, z: -50, freq: 180, type: 'noise', gain: 0.14 },
      { id: 'molten_foundry',x:  0.0, y: -0.3, z: -40, freq: 95,  type: 'sawtooth', gain: 0.18 },
      { id: 'matrix_grid',   x:  0.6, y:  0.4, z: -60, freq: 1400,type: 'sine', gain: 0.10 }
    ],
    surfaceType: 'stone'
  }
};
