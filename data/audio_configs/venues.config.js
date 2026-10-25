/**
 * Campus Clash — Per-Venue Spatial Acoustics Configuration (The Global Arena Pack)
 * @module data/audio_configs/venues.config
 */

export const VENUES_AUDIO_CONFIG = {
  // 1. The Vertical Sprawl: Concrete & glass urban canyon
  verticalsprawl: {
    reverb: {
      rt60: 1.6,
      damping: 2800,
      wetDryRatio: 0.32
    },
    emitters: [],
    surfaceType: 'concrete'
  },

  // 2. The Neon Octagon: Underground fight cage
  neonoctagon: {
    reverb: {
      rt60: 0.85,
      damping: 5400,
      wetDryRatio: 0.28
    },
    emitters: [],
    surfaceType: 'metal'
  },

  // 3. The Server Core: Quantum computing void
  servercore: {
    reverb: {
      rt60: 2.4,
      damping: 1800,
      wetDryRatio: 0.38
    },
    emitters: [],
    surfaceType: 'cyber'
  },

  // 4. The Modular Arena: Cavernous sports hall
  modulararena: {
    reverb: {
      rt60: 2.8,
      damping: 3200,
      wetDryRatio: 0.35
    },
    emitters: [],
    surfaceType: 'metal'
  },

  // 5. The Archive Vault: Tri-era chamber morphing across rounds
  archivevault: {
    reverb: {
      round1: { rt60: 2.6, damping: 2200, wetDryRatio: 0.40, surface: 'stone' },
      round2: { rt60: 1.4, damping: 4800, wetDryRatio: 0.30, surface: 'metal' },
      round3: { rt60: 0.4, damping: 8000, wetDryRatio: 0.15, surface: 'cyber' }
    },
    emitters: [],
    surfaceType: 'stone'
  }
};
