/**
 * Campus Clash — Audio Bus Routing & Limiter Configuration
 * @module data/audio_configs/buses.config
 */

export const BUS_CONFIG = {
  // Target master loudness: -14 LUFS, Peak: -1.0 dBFS true peak
  master: {
    defaultVolume: 0.85,
    limiter: {
      threshold: -1.2, // dB
      knee: 1.5,       // dB
      ratio: 20,       // 20:1 brickwall limiting
      attack: 0.002,   // 2ms lookahead response
      release: 0.050   // 50ms smooth recovery
    },
    subsonicFilter: {
      type: 'highpass',
      frequency: 28,   // Cut DC offset and inaudible sub-rumble below 28Hz
      Q: 0.707
    }
  },

  buses: {
    ui: {
      defaultVolume: 0.80,
      maxPolyphony: 4,
      priority: 5
    },
    sfx: {
      defaultVolume: 0.85,
      maxPolyphony: 14,
      priority: 8
    },
    movement: {
      defaultVolume: 0.65,
      maxPolyphony: 6,
      priority: 4
    },
    voice: {
      defaultVolume: 0.95,
      maxPolyphony: 4,
      priority: 10 // Highest priority, unculled
    },
    music: {
      defaultVolume: 0.60,
      maxPolyphony: 4, // 4 synchronized vertical stems
      priority: 6
    },
    crowd: {
      defaultVolume: 0.50,
      maxPolyphony: 3,
      priority: 4
    },
    venue: {
      defaultVolume: 0.55,
      maxPolyphony: 5,
      priority: 5
    }
  },

  // Dynamic Sidechain Ducking Rules
  ducking: {
    // When Announcer speaks, duck Music & Crowd
    announcer: {
      musicDuckDb: -8.0,
      crowdDuckDb: -6.0,
      attackMs: 25,
      releaseMs: 250
    },
    // When winning decisive K.O. blow lands
    matchEndingKO: {
      musicDuckDb: -18.0, // Near silence for dramatic finality
      sfxSubBoostDb: +3.0,
      crowdSwellDb: +4.0,
      attackMs: 5,
      holdMs: 1600,
      releaseMs: 400
    }
  },

  // Caster / Esports Streamer Broadcast Preset
  casterPreset: {
    voiceBoost: 1.25,
    musicCut: 0.35,
    sfxLevel: 0.85,
    crowdLevel: 0.90
  }
};
