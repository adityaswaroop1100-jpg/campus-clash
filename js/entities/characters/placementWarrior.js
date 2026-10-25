/**
 * Campus Clash — Character Config: The Placement Warrior ("The Final Boss")
 * @module entities/characters/placementWarrior
 */

export const PLACEMENT_WARRIOR_CONFIG = {
  id: 'placementWarrior',
  displayName: 'Placement Warrior',
  tagline: 'The Final Boss',
  archetype: 'Rushdown / Combo',
  colors: {
    primary: '#1B2A4A',     // Sharp Navy Blue Suit Blazer
    secondary: '#3A3A3A',   // Charcoal Formal Trousers
    accent: '#8B0000',      // Crimson Silk Tie
    glow: '#4A90D9',        // Cyber Blue outer glow
    hair: '#0A0A0A',        // Slicked-back neat dark hair
    skin: '#E0AC69'
  },
  stats: {
    health: 200,
    speed: 6.2,
    jumpPower: 14.0,
    weight: 0.62
  },
  visualSignature: {
    trailStyle: 'grid',
    sparkType: 'square',
    trailWidth: 5,
    glowColor: '#00C853',
    color: '#4A90D9',
    fadeSpeed: 0.07
  },
  audioProfile: {
    type: 'metallic_ping',
    baseFreq: 520,
    endFreq: 1040,
    duration: 0.1,
    vol: 0.3
  },
  hitStop: 3,
  whiffRecovery: 1,
  moves: {
    light: {
     category: 'light',
      name: 'Resume Slap',
      type: 'resume',
      trajectory: 'diagonal_slash',
      hitStop: 3,
      whiffRecovery: 1,
      trailStyle: 'grid',
      sparkType: 'square',
      color: '#4A90D9',
      glowColor: '#00C853',
      trailWidth: 4,
      trailLength: 18,
      glowRadius: 14,
      startup: 8,
      active: 4,
      recovery: 10,
      damage: 7,
      hitstun: 12,
      knockback: { x: 4, y: 0 },
      hitbox: { x: 20, y: -95, w: 75, h: 42 },
      particles: 'blue_sparkles',
      blockable: true,
      sound: 'lightHit'
    },
    heavy: {
     category: 'heavy',
      name: 'Tie Toss',
      type: 'tie',
      trajectory: 'diagonal_slash',
      hitStop: 5,
      whiffRecovery: 2,
      trailStyle: 'grid',
      sparkType: 'square',
      color: '#8B0000',
      glowColor: '#4A90D9',
      trailWidth: 6,
      trailLength: 24,
      glowRadius: 20,
      startup: 14,
      active: 6,
      recovery: 16,
      damage: 16,
      hitstun: 18,
      knockback: { x: 10, y: -3 },
      hitbox: { x: 22, y: -115, w: 95, h: 75 },
      particles: 'blue_sparkles',
      blockable: true,
      range: 80,
      sound: 'heavyHit'
    },
    special: {
      category: 'special',
      name: 'Offer Volley',
      type: 'offer_volley',
      trajectory: 'straight',
      hitStop: 6,
      whiffRecovery: 8,
      trailStyle: 'splatter',
      sparkType: 'blob',
      color: '#4F6BFF',
      glowColor: '#00E5FF',
      trailWidth: 6,
      trailLength: 22,
      glowRadius: 18,
      startup: 9,
      active: 5,
      recovery: 11,
      damage: 12,
      hitstun: 16,
      knockback: { x: 8, y: -2 },
      hitbox: { x: 20, y: -90, w: 110, h: 45 },
      particles: 'code_glyph',
      blockable: true
    },
    ultimate: {
     category: 'ultimate',
      name: 'Resume Slam',
      type: 'resume_slam',
      trajectory: 'diagonal_slash',
      hitStop: 8,
      whiffRecovery: 3,
      trailStyle: 'grid',
      sparkType: 'square',
      color: '#4A90D9',
      glowColor: '#00E5FF',
      trailWidth: 8,
      trailLength: 28,
      glowRadius: 24,
      startup: 15,
      active: 20,
      recovery: 14,
      hitbox: { x: 15, y: -130, w: 180, h: 120 },
      damage: 45,
      hitstun: 32,
      knockback: { x: 15, y: 6 },
      blockable: false,
      specialEffect: 'juggle',
      hits: 3,
      particles: 'blue_sparkles',
      sound: 'ultimate'
    }
  },
  dialogue: {
    intro: 'Resume verified, 500 LeetCode solved. Let us begin.',
    win: 'Day 1 Marquee Offer secured. Next candidate please.',
    taunt: 'I got placed. What did you do today?',
    ultimate: "You're not even placement-ready.",
    lose: 'Recalculating algorithmic complexity...'
  }
};
