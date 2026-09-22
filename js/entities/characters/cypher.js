/**
 * Campus Clash — Character Config: Cypher ("The Campus Hacker")
 * @module entities/characters/cypher
 */

export const CYPHER_CONFIG = {
  id: 'cypher',
  displayName: 'Cypher',
  tagline: 'The Campus Hacker',
  colors: {
    primary: '#0a0a0a',      // Black hoodie
    secondary: '#00ff41',    // Matrix green
    accent: '#00e5ff',       // Cyber cyan
    glow: '#00ff41',         // Matrix green glow
    hair: '#1a1a1a',         // Hidden under hood
    visor: '#00e5ff'         // Cyber shades
  },
  stats: {
    speed: 5.8,
    health: 185,
    jumpPower: 14.0,
    weight: 0.60
  },
  visualSignature: {
    trailStyle: 'pixel',
    sparkType: 'binary',
    trailWidth: 6,
    glowColor: '#00FF41',
    color: '#00E5FF',
    fadeSpeed: 0.055
  },
  audioProfile: {
    type: 'cyber_clack',
    baseFreq: 600,
    endFreq: 1200,
    duration: 0.06,
    vol: 0.3
  },
  hitStop: 2,
  whiffRecovery: 3,
  moves: {
    light: {
      name: 'Code Slice',
      type: 'keyboard_claw',
      trajectory: 'typing_stabs',
      hitStop: 2,
      whiffRecovery: 2,
      trailStyle: 'pixel',
      sparkType: 'binary',
      color: '#00FF41',
      glowColor: '#00FF41',
      trailWidth: 5,
      trailLength: 22,
      glowRadius: 16,
      startup: 7,
      active: 5,
      recovery: 9,
      damage: 7,
      hitstun: 13,
      knockback: { x: 4, y: 0 },
      hitbox: { x: 42, y: -75, w: 48, h: 26 },
      particles: 'binary_splash',
      blockable: true
    },
    heavy: {
      name: 'Enter Key Slam',
      type: 'keyboard_slam',
      trajectory: 'typing_stabs',
      hitStop: 10,
      whiffRecovery: 5,
      trailStyle: 'pixel',
      sparkType: 'binary',
      color: '#00E5FF',
      glowColor: '#00FF41',
      trailWidth: 8,
      trailLength: 28,
      glowRadius: 22,
      startup: 16,
      active: 9,
      recovery: 18,
      damage: 16,
      hitstun: 20,
      knockback: { x: 9, y: -4 },
      hitbox: { x: 30, y: -80, w: 60, h: 45 },
      particles: 'binary_splash',
      blockable: true
    },
    ultimate: {
      name: 'System Override',
      type: 'firewall_pillar',
      trajectory: 'typing_stabs',
      hitStop: 12,
      whiffRecovery: 4,
      trailStyle: 'pixel',
      sparkType: 'binary',
      color: '#00FF41',
      glowColor: '#00E5FF',
      trailWidth: 10,
      trailLength: 35,
      glowRadius: 28,
      startup: 20,
      active: 24,
      recovery: 16,
      hitbox: { x: 20, y: -130, w: 170, h: 130 },
      damage: 28,
      hitstun: 32,
      knockback: { x: 5, y: -3 },
      blockable: false,
      specialEffect: 'freeze',
      freezeDuration: 60,
      particles: 'binary_splash'
    }
  },
  dialogue: {
    intro: 'Your firewall is garbage. System breach initiated.',
    taunt: 'You fight like a 404 error.',
    ultimate: 'SUDO DESTROY. Root access: GRANTED.',
    win: 'Battle.log: WIN. Zero exceptions.',
    lose: 'Patch deployed. Next build wins.'
  }
};
