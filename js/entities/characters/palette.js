/**
 * Campus Clash — Character Config: Palette ("The Fine Arts Major")
 * @module entities/characters/palette
 */

export const PALETTE_CONFIG = {
  id: 'palette',
  displayName: 'Palette',
  tagline: 'The Fine Arts Major',
  colors: {
    primary: '#6a0dad',      // Deep violet beret + apron
    secondary: '#ff69b4',    // Hot pink paint stains
    accent: '#ff1493',       // Magenta brush tip
    glow: '#da70d6',         // Orchid glow
    hair: '#4b0082',         // Deep indigo bun
    scarf: '#ff7f50'         // Coral flowing scarf
  },
  stats: {
    speed: 5.2,
    health: 190,
    jumpPower: 13.8,
    weight: 0.62
  },
  visualSignature: {
    trailStyle: 'rainbow',
    sparkType: 'paint_drop',
    trailWidth: 7,
    glowColor: '#FF69B4',
    color: '#DA70D6',
    fadeSpeed: 0.045
  },
  audioProfile: {
    type: 'paint_squelch',
    baseFreq: 500,
    endFreq: 100,
    duration: 0.15,
    vol: 0.35
  },
  hitStop: 5,
  whiffRecovery: 5,
  moves: {
    light: {
      name: 'Brush Stroke',
      type: 'paintbrush',
      trajectory: 'sweeping_brush',
      hitStop: 4,
      whiffRecovery: 4,
      trailStyle: 'rainbow',
      sparkType: 'paint_drop',
      color: '#FF69B4',
      glowColor: '#DA70D6',
      trailWidth: 6,
      trailLength: 26,
      glowRadius: 18,
      startup: 8,
      active: 6,
      recovery: 10,
      damage: 8,
      hitstun: 13,
      knockback: { x: 5, y: 0 },
      hitbox: { x: 40, y: -78, w: 54, h: 32 },
      particles: 'paint_splatter',
      blockable: true
    },
    heavy: {
      name: 'Canvas Slash',
      type: 'ruler_slash',
      trajectory: 'sweeping_brush',
      hitStop: 7,
      whiffRecovery: 6,
      trailStyle: 'rainbow',
      sparkType: 'paint_drop',
      color: '#FF1493',
      glowColor: '#FF69B4',
      trailWidth: 9,
      trailLength: 30,
      glowRadius: 22,
      startup: 15,
      active: 9,
      recovery: 17,
      damage: 16,
      hitstun: 20,
      knockback: { x: 10, y: -3 },
      hitbox: { x: 30, y: -85, w: 65, h: 48 },
      particles: 'paint_splatter',
      blockable: true
    },
    ultimate: {
      name: 'Living Art Gallery',
      type: 'rainbow_vortex',
      trajectory: 'sweeping_brush',
      hitStop: 10,
      whiffRecovery: 7,
      trailStyle: 'rainbow',
      sparkType: 'paint_drop',
      color: '#DA70D6',
      glowColor: '#FF69B4',
      trailWidth: 12,
      trailLength: 38,
      glowRadius: 32,
      startup: 19,
      active: 26,
      recovery: 18,
      hitbox: { x: 15, y: -150, w: 185, h: 150 },
      damage: 30,
      hitstun: 34,
      knockback: { x: 6, y: -4 },
      blockable: false,
      specialEffect: 'freeze',
      freezeDuration: 70,
      particles: 'paint_splatter'
    }
  },
  dialogue: {
    intro: 'My canvas is the battlefield. You\'re the subject.',
    taunt: 'Hold still — you\'re ruining the composition.',
    ultimate: 'MASTERPIECE INCOMING!',
    win: 'Signed, sealed, and hung in the gallery.',
    lose: 'Every great artist gets rejected first.'
  }
};
