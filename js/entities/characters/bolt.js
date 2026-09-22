/**
 * Campus Clash — Character Config: Bolt ("The Track Star")
 * @module entities/characters/bolt
 */

export const BOLT_CONFIG = {
  id: 'bolt',
  displayName: 'Bolt',
  tagline: 'The Track Star',
  colors: {
    primary: '#00b4d8',      // SRM athletic singlet cyan
    secondary: '#023e8a',    // Deep blue running tights
    accent: '#ffd700',       // Gold championship trim
    glow: '#00e5ff',         // Cyan speed glow
    hair: '#111111',         // Short athletic cut
    skin: '#a0522d'          // Athletic complexion
  },
  stats: {
    speed: 6.2,
    health: 175,
    jumpPower: 15.0,
    weight: 0.55
  },
  visualSignature: {
    trailStyle: 'ghost',
    sparkType: 'wind_burst',
    trailWidth: 6,
    glowColor: '#00E5FF',
    color: '#FFD700',
    fadeSpeed: 0.08
  },
  audioProfile: {
    type: 'sonic_whoosh',
    baseFreq: 200,
    endFreq: 2200,
    duration: 0.12,
    vol: 0.32
  },
  hitStop: 3,
  whiffRecovery: 0,
  moves: {
    light: {
      name: 'Piston Jab',
      type: 'dumbbell_punch',
      trajectory: 'straight_punch',
      hitStop: 3,
      whiffRecovery: 0,
      trailStyle: 'ghost',
      sparkType: 'wind_burst',
      color: '#00E5FF',
      glowColor: '#00B4D8',
      trailWidth: 5,
      trailLength: 24,
      glowRadius: 17,
      startup: 6,
      active: 4,
      recovery: 8,
      damage: 6,
      hitstun: 11,
      knockback: { x: 4, y: 0 },
      hitbox: { x: 44, y: -74, w: 44, h: 25 },
      particles: 'air_burst',
      blockable: true
    },
    heavy: {
      name: 'Lariat Spin',
      type: 'dumbbell_spin',
      trajectory: 'straight_punch',
      hitStop: 5,
      whiffRecovery: 0,
      trailStyle: 'ghost',
      sparkType: 'wind_burst',
      color: '#FFD700',
      glowColor: '#FFD700',
      trailWidth: 8,
      trailLength: 32,
      glowRadius: 24,
      startup: 14,
      active: 12,
      recovery: 16,
      damage: 18,
      hitstun: 22,
      knockback: { x: 12, y: -3 },
      hitbox: { x: 20, y: -85, w: 70, h: 55 },
      particles: 'air_burst',
      blockable: true
    },
    ultimate: {
      name: '100-Meter Meteor',
      type: 'lightning_dash',
      trajectory: 'straight_punch',
      hitStop: 8,
      whiffRecovery: 0,
      trailStyle: 'ghost',
      sparkType: 'wind_burst',
      color: '#FFD700',
      glowColor: '#00E5FF',
      trailWidth: 10,
      trailLength: 38,
      glowRadius: 30,
      startup: 16,
      active: 20,
      recovery: 14,
      hitbox: { x: -10, y: -140, w: 180, h: 140 },
      damage: 26,
      hitstun: 30,
      knockback: { x: 7, y: -8 },
      blockable: false,
      specialEffect: 'freeze',
      freezeDuration: 50,
      particles: 'air_burst'
    }
  },
  dialogue: {
    intro: 'I run faster than your reaction time.',
    taunt: 'Too slow. Way too slow.',
    ultimate: 'BREAK THE TAPE!',
    win: 'New PB. You were the obstacle.',
    lose: 'False start. Running it back.'
  }
};
