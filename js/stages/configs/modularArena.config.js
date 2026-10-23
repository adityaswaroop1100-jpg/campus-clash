/**
 * The Modular Arena — Configuration
 * @module stages/configs/modularArena.config
 */

export const MODULAR_ARENA_CONFIG = {
  id: 'modularArena',
  name: 'The Modular Arena',
  subtitle: 'Reconfigurable High-Tech Combat Stadium',
  dimensions: {
    width: 1200,
    height: 640,
    groundY: 535
  },
  cameraLimits: {
    minX: 180,
    maxX: 1020,
    minY: 0,
    maxY: 640,
    zoomMin: 0.95,
    zoomMax: 1.15
  },
  spawnPoints: {
    P1: { x: 300, y: 535 },
    P2: { x: 660, y: 535 }
  },
  lighting: {
    ambientColor: '#121824',
    keyLight: {
      angle: 1.57, // Bright overhead stadium floodlights
      color: '#ffffff',
      intensity: 0.9
    },
    rimLight: {
      color: '#00e5ff',
      width: 3.5,
      intensity: 0.85
    },
    floorReflectivity: 0.45,
    floorRoughness: 0.18,
    shadowAlpha: 0.65
  },
  postProcess: {
    bloomIntensity: 0.4,
    vignetteColor: '#040812',
    vignetteIntensity: 0.25,
    colorGrade: 'esportsClean'
  },
  audioHooks: {
    ambientTrack: 'stadium_roar_loop',
    hitReverbType: 'stadium'
  }
};
