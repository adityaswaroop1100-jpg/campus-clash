/**
 * Campus Clash — Character Config: The Sports Star ("The Campus Athlete")
 * @module entities/characters/sportsStar
 */

export const SPORTS_STAR_CONFIG = {
  id: 'sportsStar',
  displayName: 'Sports Star',
  tagline: 'The Campus Athlete',
  archetype: 'Agile / Brawler',
  colors: {
    primary: '#00D4FF',     // Neon Cyan SRM Athletic Jersey
    secondary: '#1A1A1A',   // Pitch Black Athletic Shorts
    accent: '#FF6B35',      // Neon Orange Headband & Sneakers
    glow: '#39FF14',        // Neon Green Cricket Bat Glow
    hair: '#1E1E1E',        // Energetic Spiky Hair
    skin: '#C68642'
  },
  stats: {
    health: 190,
    speed: 7.0,
    jumpPower: 15.0,
    weight: 0.58
  },
  visualSignature: {
    trailStyle: 'wind',
    sparkType: 'ring',
    trailWidth: 8,
    glowColor: '#39FF14',
    color: '#00D4FF',
    fadeSpeed: 0.045
  },
  audioProfile: {
    type: 'bat_crack',
    baseFreq: 220,
    endFreq: 60,
    duration: 0.22,
    vol: 0.4
  },
  hitStop: 8,
  whiffRecovery: 6,
  moves: {
    light: {
      name: 'Quick Jab',
      type: 'fist',
      trajectory: 'bat_swing',
      hitStop: 6,
      whiffRecovery: 4,
      trailStyle: 'wind',
      sparkType: 'ring',
      color: '#00D4FF',
      glowColor: '#00D4FF',
      trailWidth: 5,
      trailLength: 16,
      glowRadius: 14,
      startup: 4,
      active: 3,
      recovery: 6,
      damage: 5,
      hitstun: 8,
      knockback: { x: 3, y: 0 },
      hitbox: { x: 35, y: -74, w: 38, h: 26 },
      particles: 'air_burst',
      blockable: true,
      sound: 'lightHit'
    },
    heavy: {
      name: 'Cricket Bat Swing',
      type: 'bat',
      trajectory: 'bat_swing',
      hitStop: 10,
      whiffRecovery: 8,
      trailStyle: 'wind',
      sparkType: 'ring',
      color: '#39FF14',
      glowColor: '#00FFAA',
      trailWidth: 9,
      trailLength: 30,
      glowRadius: 28,
      startup: 16,
      active: 8,
      recovery: 18,
      damage: 18,
      hitstun: 22,
      knockback: { x: 12, y: -4 },
      hitbox: { x: 35, y: -82, w: 74, h: 52 },
      particles: 'cricket_explosion',
      blockable: true,
      sound: 'cricketShot'
    },
    ultimate: {
      name: 'Sports Fever',
      type: 'sports_fever',
      trajectory: 'bat_swing',
      hitStop: 14,
      whiffRecovery: 8,
      trailStyle: 'wind',
      sparkType: 'ring',
      color: '#39FF14',
      glowColor: '#00D4FF',
      trailWidth: 10,
      trailLength: 30,
      glowRadius: 28,
      startup: 16,
      active: 22,
      recovery: 14,
      hitbox: { x: 20, y: -110, w: 140, h: 95 },
      damage: 48,
      hitstun: 32,
      knockback: { x: 14, y: 8 },
      blockable: false,
      specialEffect: 'multiHit_juggle',
      hits: 8,
      particles: 'cricket_explosion',
      sound: 'ultimate'
    }
  },
  dialogue: {
    intro: 'SRM sports ground is my kingdom!',
    win: 'Match point! That is how SRM takes the trophy.',
    taunt: 'You can’t beat the campus athlete!',
    ultimate: 'Game over! I win!',
    lose: 'Good game. Next time on the cricket pitch!'
  }
};
