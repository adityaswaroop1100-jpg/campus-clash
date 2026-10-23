/**
 * The Vertical Sprawl — Configuration
 * @module stages/configs/verticalSprawl.config
 */

export const VERTICAL_SPRAWL_CONFIG = {
  id: 'verticalSprawl',
  name: 'The Vertical Sprawl',
  subtitle: 'Five-Tier Cyber City Courtyard',
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
    ambientColor: '#0a101f',
    keyLight: {
      angle: 1.15,
      color: '#ffe082',
      intensity: 0.8
    },
    rimLight: {
      color: '#00e5ff',
      width: 3.5,
      intensity: 0.9
    },
    floorReflectivity: 0.52,
    floorRoughness: 0.2,
    shadowAlpha: 0.68
  },
  postProcess: {
    bloomIntensity: 0.45,
    vignetteColor: '#030814',
    vignetteIntensity: 0.3,
    colorGrade: 'cyberpunkCity'
  },
  audioHooks: {
    ambientTrack: 'city_rain_hum',
    hitReverbType: 'alleyway'
  }
};
