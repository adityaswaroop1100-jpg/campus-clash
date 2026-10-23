/**
 * The Server Core — Configuration
 * @module stages/configs/serverCore.config
 */

export const SERVER_CORE_CONFIG = {
  id: 'serverCore',
  name: 'The Server Core',
  subtitle: 'Floating Cyberspace Quantum Abyss',
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
    ambientColor: '#120422',
    keyLight: {
      angle: 1.57, // Direct overhead cylindrical beam
      color: '#00f0ff',
      intensity: 0.9
    },
    rimLight: {
      color: '#d500f9', // Radiant purple/magenta rim
      width: 4.0,
      intensity: 0.95
    },
    floorReflectivity: 0.55,
    floorRoughness: 0.15,
    shadowAlpha: 0.65
  },
  postProcess: {
    bloomIntensity: 0.5,
    vignetteColor: '#10021c',
    vignetteIntensity: 0.28,
    colorGrade: 'cyberpunkViolet'
  },
  audioHooks: {
    ambientTrack: 'server_quantum_hum',
    hitReverbType: 'digitalVoid'
  }
};
