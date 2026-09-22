/**
 * Campus Clash — Character Config: Gavel ("The Moot Court Legend")
 * @module entities/characters/gavel
 */

export const GAVEL_CONFIG = {
  id: 'gavel',
  displayName: 'Gavel',
  tagline: 'The Moot Court Legend',
  colors: {
    primary: '#1a1a2e',      // Black court blazer
    secondary: '#f5f5f5',    // White barrister tabs
    accent: '#c8a84b',       // Polished gold gavel
    glow: '#ffd700',         // Gold aura
    hair: '#2c1810',         // Dark brown
    tabs: '#ffffff'          // White court collar tabs
  },
  stats: {
    speed: 4.2,
    health: 220,
    jumpPower: 12.5,
    weight: 0.80
  },
  visualSignature: {
    trailStyle: 'gold_dust',
    sparkType: 'triangle',
    trailWidth: 10,
    glowColor: '#FFD700',
    color: '#FFD700',
    fadeSpeed: 0.035
  },
  audioProfile: {
    type: 'gavel_slam',
    baseFreq: 110,
    endFreq: 40,
    duration: 0.28,
    vol: 0.5
  },
  hitStop: 10,
  whiffRecovery: 12,
  moves: {
    light: {
      name: 'Gavel Swipe',
      type: 'gavel',
      trajectory: 'gavel_drop',
      hitStop: 8,
      whiffRecovery: 10,
      trailStyle: 'gold_dust',
      sparkType: 'triangle',
      color: '#FFD700',
      glowColor: '#FFAA00',
      trailWidth: 7,
      trailLength: 22,
      glowRadius: 18,
      startup: 9,
      active: 6,
      recovery: 11,
      damage: 11,
      hitstun: 15,
      knockback: { x: 6, y: 0 },
      hitbox: { x: 44, y: -72, w: 52, h: 30 },
      particles: 'gold_sparkles',
      blockable: true
    },
    heavy: {
      name: 'Contempt of Court',
      type: 'gavel_slam',
      trajectory: 'gavel_drop',
      hitStop: 12,
      whiffRecovery: 14,
      trailStyle: 'gold_dust',
      sparkType: 'triangle',
      color: '#FFD700',
      glowColor: '#FF8C00',
      trailWidth: 11,
      trailLength: 30,
      glowRadius: 28,
      startup: 18,
      active: 10,
      recovery: 22,
      damage: 22,
      hitstun: 26,
      knockback: { x: 14, y: -5 },
      hitbox: { x: 28, y: -85, w: 65, h: 50 },
      particles: 'shockwave_ring',
      blockable: true
    },
    ultimate: {
      name: 'Court Adjourned',
      type: 'court_judgment',
      trajectory: 'gavel_drop',
      hitStop: 16,
      whiffRecovery: 16,
      trailStyle: 'gold_dust',
      sparkType: 'triangle',
      color: '#FFD700',
      glowColor: '#FFD700',
      trailWidth: 13,
      trailLength: 40,
      glowRadius: 35,
      startup: 22,
      active: 28,
      recovery: 20,
      hitbox: { x: -20, y: -160, w: 200, h: 160 },
      damage: 32,
      hitstun: 36,
      knockback: { x: 8, y: -6 },
      blockable: false,
      specialEffect: 'freeze',
      freezeDuration: 80,
      particles: 'shockwave_ring'
    }
  },
  dialogue: {
    intro: 'Order in the court. The defendant is YOU.',
    taunt: 'Objection! You call that a combo?',
    ultimate: 'This court finds you... GUILTY!',
    win: 'Case closed. No appeals.',
    lose: 'Mistrial declared. We\'ll appeal.'
  }
};
