/**
 * Campus Clash — Character Config: The Backbencher ("The Chaos Agent")
 * @module entities/characters/backbencher
 */

export const BACKBENCHER_CONFIG = {
  id: 'backbencher',
  displayName: 'The Backbencher',
  tagline: 'The Chaos Agent',
  colors: {
    primary: '#2C2C2C',     // Dark Charcoal Grey Hoodie
    secondary: '#FF6B35',   // Neon Orange Trim & Backpack
    accent: '#00D4AA',      // Mint Green Sneaker Accents
    glow: '#FF6B35',        // Neon Orange outer glow
    hair: '#3e2723',        // Messy unruly hair
    prop: '#ff6f00'         // Heavy backpack
  },
  stats: {
    speed: 5.0,
    health: 200,
    jumpPower: 12.8,
    weight: 0.68
  },
  visualSignature: {
    trailStyle: 'splatter',
    sparkType: 'blob',
    trailWidth: 8,
    glowColor: '#FF4400',
    color: '#FF6B35',
    fadeSpeed: 0.04
  },
  audioProfile: {
    type: 'saw_noise',
    baseFreq: 140,
    endFreq: 60,
    duration: 0.18,
    vol: 0.35
  },
  hitStop: 6,
  whiffRecovery: 8,
  moves: {
    light: {
      name: 'Paper Plane',
      type: 'paper_plane',
      trajectory: 'wild_swing',
      hitStop: 5,
      whiffRecovery: 6,
      trailStyle: 'splatter',
      sparkType: 'blob',
      color: '#FF6B35',
      glowColor: '#FF6B35',
      trailWidth: 4,
      trailLength: 18,
      glowRadius: 14,
      startup: 6,
      active: 4,
      recovery: 8,
      damage: 6,
      hitstun: 10,
      knockback: { x: 4, y: 0 },
      hitbox: { x: 45, y: -72, w: 45, h: 28 },
      particles: 'paper_flutter',
      blockable: true
    },
    heavy: {
      name: 'Backpack Swing',
      type: 'backpack',
      trajectory: 'wild_swing',
      hitStop: 8,
      whiffRecovery: 10,
      trailStyle: 'splatter',
      sparkType: 'blob',
      color: '#FF6B35',
      glowColor: '#FF0000',
      trailWidth: 9,
      trailLength: 28,
      glowRadius: 25,
      startup: 16,
      active: 8,
      recovery: 18,
      damage: 16,
      hitstun: 20,
      knockback: { x: 12, y: -4 },
      hitbox: { x: 30, y: -85, w: 75, h: 70 },
      particles: 'item_explosion',
      blockable: true
    },
    ultimate: {
      name: 'Paper Storm',
      type: 'paper_storm',
      trajectory: 'wild_swing',
      hitStop: 12,
      whiffRecovery: 8,
      trailStyle: 'splatter',
      sparkType: 'blob',
      color: '#FF6B35',
      glowColor: '#FF0000',
      trailWidth: 10,
      trailLength: 30,
      glowRadius: 28,
      startup: 18,
      active: 24,
      recovery: 14,
      hitbox: { x: -75, y: -110, w: 210, h: 105 },
      damage: 30,
      hitstun: 22,
      knockback: { x: 5, y: -2 },
      blockable: false,
      specialEffect: 'multiHit',
      hits: 8,
      particles: 'paper_flutter'
    }
  },
  dialogue: {
    intro: 'Proxy lag gayi, ab match jeetna hai!',
    taunt: "Bro, chill. It's not that deep.",
    ultimate: "I wasn't even trying, bro.",
    win: "See? I didn't even study for this.",
    lose: 'Bro, my phone died. Rematch.'
  }
};
