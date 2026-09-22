/**
 * Campus Clash — Character Config: The Topper ("The Academic Assassin")
 * @module entities/characters/topper
 */

export const TOPPER_CONFIG = {
  id: 'topper',
  displayName: 'The Topper',
  tagline: 'The Academic Assassin',
  colors: {
    primary: '#FFFFFF',     // Crisp White Shirt
    secondary: '#1A2A6C',   // SRM Navy Blue Trousers
    accent: '#FFD700',      // Gold Pen & Trim
    glow: '#FFD700',        // Gold outer glow
    hair: '#111111',        // Neat dark hair
    glasses: '#000000'      // Rectangular spectacles
  },
  stats: {
    speed: 5.5,
    health: 200,
    jumpPower: 13.5,
    weight: 0.65
  },
  visualSignature: {
    trailStyle: 'ribbon',
    sparkType: 'slash',
    trailWidth: 4,
    glowColor: '#00E5FF',
    color: '#FFD700',
    fadeSpeed: 0.06
  },
  audioProfile: {
    type: 'sine_sweep',
    baseFreq: 800,
    endFreq: 220,
    duration: 0.08,
    vol: 0.3
  },
  hitStop: 4,
  whiffRecovery: 2,
  moves: {
    light: {
      name: 'Pen Jab',
      type: 'pen',
      trajectory: 'thrust',
      hitStop: 4,
      whiffRecovery: 2,
      trailStyle: 'ribbon',
      sparkType: 'slash',
      color: '#FFD700',
      glowColor: '#00E5FF',
      trailWidth: 4,
      trailLength: 20,
      glowRadius: 15,
      startup: 8,
      active: 5,
      recovery: 10,
      damage: 8,
      hitstun: 14,
      knockback: { x: 5, y: 0 },
      hitbox: { x: 45, y: -72, w: 46, h: 28 },
      particles: 'gold_sparkles',
      blockable: true
    },
    heavy: {
      name: 'Calculator Throw',
      type: 'calculator',
      trajectory: 'thrust',
      hitStop: 6,
      whiffRecovery: 4,
      trailStyle: 'ribbon',
      sparkType: 'slash',
      color: '#FFD700',
      glowColor: '#00E5FF',
      trailWidth: 6,
      trailLength: 25,
      glowRadius: 20,
      startup: 14,
      active: 8,
      recovery: 16,
      damage: 14,
      hitstun: 18,
      knockback: { x: 10, y: -3 },
      hitbox: { x: 50, y: -76, w: 55, h: 40 },
      particles: 'number_explosion',
      blockable: true
    },
    ultimate: {
      name: 'Viva Voce',
      type: 'viva',
      trajectory: 'thrust',
      hitStop: 10,
      whiffRecovery: 6,
      trailStyle: 'ribbon',
      sparkType: 'slash',
      color: '#00E5FF',
      glowColor: '#00E5FF',
      trailWidth: 8,
      trailLength: 30,
      glowRadius: 25,
      startup: 18,
      active: 20,
      recovery: 14,
      hitbox: { x: 25, y: -110, w: 150, h: 105 },
      damage: 25,
      hitstun: 28,
      knockback: { x: 6, y: -2 },
      blockable: false,
      specialEffect: 'freeze',
      freezeDuration: 90,
      particles: 'gold_sparkles'
    }
  },
  dialogue: {
    intro: 'First rank is mine. Class is in session!',
    taunt: 'You should have studied more.',
    ultimate: 'Define your own failure in 50 words.',
    win: 'Another victory for the top ranker.',
    lose: 'I was distracted. Rematch.'
  }
};
