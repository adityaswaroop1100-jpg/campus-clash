/**
 * The Neon Octagon — Configuration
 * @module stages/configs/neonOctagon.config
 */

export const NEON_OCTAGON_CONFIG = {
  id: 'neonOctagon',
  name: 'The Neon Octagon',
  subtitle: 'Underground Cybernetic Fight Cage',
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
    ambientColor: '#07101e',
    keyLight: {
      angle: 1.25,
      color: '#ffe082',
      intensity: 0.85
    },
    rimLight: {
      color: '#00e5ff',
      width: 3.5,
      intensity: 0.9
    },
    floorReflectivity: 0.48,
    floorRoughness: 0.22,
    shadowAlpha: 0.7
  },
  postProcess: {
    bloomIntensity: 0.45,
    vignetteColor: '#020610',
    vignetteIntensity: 0.32,
    colorGrade: 'neonCyan'
  },
  audioHooks: {
    ambientTrack: 'cage_crowd_hum',
    hitReverbType: 'industrial'
  }
};
