/**
 * The Archive Vault — Configuration
 * @module stages/configs/archiveVault.config
 */

export const ARCHIVE_VAULT_CONFIG = {
  id: 'archiveVault',
  name: 'The Archive Vault',
  subtitle: 'Tri-Era Temporal Architectural Nexus',
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
  // Default Round 1 (Medieval) lighting — dynamically morphs per round
  lighting: {
    ambientColor: '#160c07',
    keyLight: {
      angle: 1.2,
      color: '#ff9d42',
      intensity: 0.85
    },
    rimLight: {
      color: '#ffd08a', // Torchlight golden rim
      width: 3.5,
      intensity: 0.9
    },
    floorReflectivity: 0.42,
    floorRoughness: 0.25,
    shadowAlpha: 0.7
  },
  postProcess: {
    bloomIntensity: 0.45,
    vignetteColor: '#0a0502',
    vignetteIntensity: 0.32,
    colorGrade: 'eraMedieval'
  },
  audioHooks: {
    ambientTrack: 'vault_era_wind',
    hitReverbType: 'cathedral'
  }
};
