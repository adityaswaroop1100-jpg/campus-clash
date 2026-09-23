/**
 * Campus Clash — Character Config: The Topper ("The Academic Assassin")
 * @module entities/characters/topper
 */

export const TOPPER_CONFIG = {
  id: 'topper',
  displayName: 'The Topper',
  tagline: 'Academic Assassin',
  colors: {
    primary: '#FFFFFF',     // Clean White SRM Hoodie
    secondary: '#1A2A6C',   // SRM Royal Navy Blue Trousers
    accent: '#00F0FF',      // Luminous Cyan Holographic Panels
    glow: '#00E5FF',        // Cyan HUD Matrix Glow
    visor: '#FFD700',       // Cyber Gold Academic Visor
    hair: '#0F172A',        // Sharp Geometric Black Hair
    skin: '#FFE0BD'         // Stylized Peach Skin Tone
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
    trailWidth: 5,
    glowColor: '#00E5FF',
    color: '#00F0FF',
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
      name: 'Document Thrust',
      type: 'document',
      trajectory: 'thrust',
      hitStop: 4,
      whiffRecovery: 2,
      trailStyle: 'ribbon',
      sparkType: 'slash',
      color: '#00F0FF',
      glowColor: '#00E5FF',
      trailWidth: 4,
      trailLength: 22,
      glowRadius: 16,
      startup: 7,
      active: 5,
      recovery: 9,
      damage: 8,
      hitstun: 14,
      knockback: { x: 5, y: 0 },
      hitbox: { x: 45, y: -72, w: 48, h: 28 },
      particles: 'cyan_sparkles',
      blockable: true
    },
    heavy: {
      name: 'Textbook Slam',
      type: 'textbook',
      trajectory: 'thrust',
      hitStop: 6,
      whiffRecovery: 4,
      trailStyle: 'ribbon',
      sparkType: 'slash',
      color: '#00F0FF',
      glowColor: '#FFD700',
      trailWidth: 7,
      trailLength: 26,
      glowRadius: 22,
      startup: 13,
      active: 8,
      recovery: 15,
      damage: 15,
      hitstun: 19,
      knockback: { x: 10, y: -3 },
      hitbox: { x: 50, y: -80, w: 60, h: 48 },
      particles: 'formula_burst',
      blockable: true
    },
    ultimate: {
      name: 'Exam Mode',
      type: 'exam_mode',
      trajectory: 'thrust',
      hitStop: 12,
      whiffRecovery: 6,
      trailStyle: 'ribbon',
      sparkType: 'slash',
      color: '#00F0FF',
      glowColor: '#FFD700',
      trailWidth: 10,
      trailLength: 35,
      glowRadius: 30,
      startup: 16,
      active: 22,
      recovery: 16,
      hitbox: { x: 25, y: -115, w: 160, h: 110 },
      damage: 28,
      hitstun: 30,
      knockback: { x: 8, y: -3 },
      blockable: false,
      specialEffect: 'freeze',
      freezeDuration: 90,
      particles: 'academic_matrix'
    }
  },
  dialogue: {
    intro: 'First rank is mine. Class is in session!',
    taunt: 'You should have studied more.',
    ultimate: 'EXAM MODE: Maximum Distinction!',
    win: 'Another victory for the top ranker.',
    lose: 'I was distracted. Rematch.'
  }
};
