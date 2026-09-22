/**
 * Campus Clash — Character Config: The Hosteler ("The Warden's Nightmare")
 * @module entities/characters/hosteler
 */

export const HOSTELER_CONFIG = {
  id: 'hosteler',
  displayName: 'The Hosteler',
  tagline: "The Warden's Nightmare",
  archetype: 'Tank / Grappler',
  colors: {
    primary: '#8B0000',     // Faded Maroon Hostel T-Shirt
    secondary: '#F5DEB3',   // Beige Sleep Shorts
    accent: '#708090',      // Steel Tiffin & Tray
    glow: '#CC5533',        // Mess Steam Red/Orange Glow
    hair: '#2A1810',        // Messy Bedhead Dark Brown
    skin: '#DDB288'
  },
  stats: {
    health: 250,
    speed: 4.2,
    jumpPower: 11.5,
    weight: 0.82
  },
  visualSignature: {
    trailStyle: 'soft_ribbon',
    sparkType: 'feather',
    trailWidth: 10,
    glowColor: '#FF6B35',
    color: '#8B0000',
    fadeSpeed: 0.03
  },
  audioProfile: {
    type: 'sub_thump',
    baseFreq: 80,
    endFreq: 28,
    duration: 0.32,
    vol: 0.45
  },
  hitStop: 12,
  whiffRecovery: 10,
  moves: {
    light: {
      name: 'Tiffin Slam',
      type: 'tiffin',
      trajectory: 'overhead_slam',
      hitStop: 10,
      whiffRecovery: 8,
      trailStyle: 'soft_ribbon',
      sparkType: 'feather',
      color: '#CC5533',
      glowColor: '#FF6B35',
      trailWidth: 6,
      trailLength: 22,
      glowRadius: 18,
      startup: 10,
      active: 6,
      recovery: 12,
      damage: 10,
      hitstun: 16,
      knockback: { x: 6, y: 3 },
      hitbox: { x: 30, y: -70, w: 50, h: 42 },
      particles: 'food_splatter',
      blockable: true,
      sound: 'metalClang'
    },
    heavy: {
      name: 'Mess Tray Swing',
      type: 'tray',
      trajectory: 'overhead_slam',
      hitStop: 14,
      whiffRecovery: 12,
      trailStyle: 'soft_ribbon',
      sparkType: 'feather',
      color: '#8B4513',
      glowColor: '#CC5533',
      trailWidth: 10,
      trailLength: 30,
      glowRadius: 28,
      startup: 18,
      active: 10,
      recovery: 20,
      damage: 20,
      hitstun: 24,
      knockback: { x: 15, y: -5 },
      hitbox: { x: 25, y: -80, w: 78, h: 60 },
      particles: 'curry_splatter',
      blockable: true,
      sound: 'whack'
    },
    ultimate: {
      name: 'Mess Food Special',
      type: 'mess_special',
      trajectory: 'overhead_slam',
      hitStop: 16,
      whiffRecovery: 10,
      trailStyle: 'soft_ribbon',
      sparkType: 'feather',
      color: '#FF3D00',
      glowColor: '#CC5533',
      trailWidth: 12,
      trailLength: 30,
      glowRadius: 28,
      startup: 16,
      active: 18,
      recovery: 14,
      hitbox: { x: 30, y: -100, w: 130, h: 85 },
      damage: 38,
      hitstun: 28,
      knockback: { x: 16, y: -5 },
      blockable: false,
      specialEffect: 'slow',
      duration: 180,
      particles: 'curry_splatter',
      sound: 'foodSplash'
    }
  },
  dialogue: {
    intro: '14 hostel blocks survived. You are nothing!',
    win: 'Room 402 always wins. Warden can’t stop me.',
    taunt: 'Mess ka khana dekh liya? Ab mera dekh.',
    ultimate: 'Mess ka special — teri maut ka khaana!',
    lose: 'Need to eat mess food to recharge.'
  }
};
