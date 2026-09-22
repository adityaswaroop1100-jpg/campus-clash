/**
 * Campus Clash — Character Config: The Senior ("The OG")
 * @module entities/characters/senior
 */

export const SENIOR_CONFIG = {
  id: 'senior',
  displayName: 'The Senior',
  tagline: 'The OG',
  archetype: 'Control / Zoner',
  colors: {
    primary: '#1B4D3E',     // Dark Green College Jacket
    secondary: '#C9A84C',   // Gold Trim & Patches
    accent: '#F5F0E1',      // Off-White Formal Shirt
    glow: '#C9A84C',        // Senior Gold outer glow
    hair: '#141414',        // Neat Hair & Groomed Stubble
    skin: '#D6A374'
  },
  stats: {
    health: 220,
    speed: 5.0,
    jumpPower: 12.8,
    weight: 0.68
  },
  visualSignature: {
    trailStyle: 'lightning',
    sparkType: 'hexagon',
    trailWidth: 6,
    glowColor: '#FFD700',
    color: '#C9A84C',
    fadeSpeed: 0.05
  },
  audioProfile: {
    type: 'whip_snap',
    baseFreq: 1800,
    endFreq: 350,
    duration: 0.07,
    vol: 0.35
  },
  hitStop: 5,
  whiffRecovery: 4,
  moves: {
    light: {
      name: 'Chai Splash',
      type: 'chai',
      trajectory: 'whip_crack',
      hitStop: 4,
      whiffRecovery: 3,
      trailStyle: 'lightning',
      sparkType: 'hexagon',
      color: '#C9A84C',
      glowColor: '#FFD700',
      trailWidth: 5,
      trailLength: 18,
      glowRadius: 16,
      startup: 6,
      active: 4,
      recovery: 8,
      damage: 5,
      hitstun: 8,
      knockback: { x: 3, y: 0 },
      hitbox: { x: 35, y: -75, w: 38, h: 28 },
      particles: 'steam_burst',
      blockable: true,
      sound: 'chaiSplash'
    },
    heavy: {
      name: 'Folder Slap',
      type: 'folder',
      trajectory: 'whip_crack',
      hitStop: 6,
      whiffRecovery: 5,
      trailStyle: 'lightning',
      sparkType: 'hexagon',
      color: '#C9A84C',
      glowColor: '#FFD700',
      trailWidth: 7,
      trailLength: 24,
      glowRadius: 20,
      startup: 14,
      active: 6,
      recovery: 16,
      damage: 15,
      hitstun: 18,
      knockback: { x: 10, y: -2 },
      hitbox: { x: 30, y: -80, w: 60, h: 50 },
      particles: 'paper_explosion',
      blockable: true,
      sound: 'heavyHit'
    },
    ultimate: {
      name: 'Intimidation',
      type: 'intimidation',
      trajectory: 'whip_crack',
      hitStop: 10,
      whiffRecovery: 6,
      trailStyle: 'lightning',
      sparkType: 'hexagon',
      color: '#C9A84C',
      glowColor: '#FFD700',
      trailWidth: 9,
      trailLength: 28,
      glowRadius: 24,
      startup: 16,
      active: 16,
      recovery: 14,
      hitbox: { x: 20, y: -100, w: 140, h: 85 },
      damage: 32,
      hitstun: 35,
      knockback: { x: 6, y: -1 },
      blockable: false,
      specialEffect: 'freeze',
      duration: 120,
      particles: 'paper_explosion',
      sound: 'ultimate'
    }
  },
  dialogue: {
    intro: 'Listen to your senior if you want to pass.',
    win: 'Beta, I was here before you even knew what JEE was.',
    taunt: 'Are you seriously challenging a 4th year?',
    ultimate: 'You know I can make your life hell, right?',
    lose: 'Whatever, I have campus placements to attend.'
  }
};
