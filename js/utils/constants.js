/**
 * Campus Clash — Game Constants
 * @module utils/constants
 */

export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 640;
export const TARGET_FPS = 60;
export const FIXED_TIMESTEP = 1000 / TARGET_FPS; // ~16.67ms

export const FIGHTER_STATES = {
  IDLE: 'idle',
  WALKING: 'walking',
  JUMPING: 'jumping',
  ATTACKING: 'attacking',
  BLOCKING: 'blocking',
  DODGING: 'dodging',
  HITSTUN: 'hitstun',
  KNOCKDOWN: 'knockdown',
  ULTIMATE_FREEZE: 'ultimateFreeze'
};

export const INPUT_ACTIONS = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
  LIGHT: 'light',
  HEAVY: 'heavy',
  BLOCK: 'block',
  DODGE: 'dodge',
  ULTIMATE: 'ultimate'
};

export const GAME_SCREENS = {
  LANDING: 'landing',
  MODE_SELECT: 'modeSelect',
  CHAR_SELECT: 'charSelect',
  STAGE_SELECT: 'stageSelect',
  MATCH: 'match'
};

export const GAME_MODES = {
  PVP: 'pvp',        // 1 vs 1 Local Brawl
  PVC: 'pvc',        // Player vs Computer
  TRAINING: 'training' // Practice Dojo Mode
};

export const STAMINA_CONFIG = {
  MAX: 100,
  REGEN_PER_FRAME: 2,
  LIGHT_COST: 8,
  HEAVY_COST: 20,
  DODGE_COST: 15,
  BLOCK_HIT_COST: 5,
  LOW_THRESHOLD: 20,
  BREAK_DURATION: 30 // 30 frames exhaustion
};

export const ATTACK_COOLDOWNS = {
  LIGHT: 6,
  HEAVY: 12,
  SPECIAL: 20,
  DODGE: 15
};

export const COMBO_DAMAGE_SCALING = {
  1: 1.0,
  2: 0.85,
  3: 0.75,
  4: 0.65,
  5: 0.55,
  6: 0.50,
  7: 0.45
};

export const DEFAULT_CONTROLS = {
  P1: {
    KeyW: INPUT_ACTIONS.UP,
    KeyS: INPUT_ACTIONS.DOWN,
    KeyA: INPUT_ACTIONS.LEFT,
    KeyD: INPUT_ACTIONS.RIGHT,
    KeyJ: INPUT_ACTIONS.LIGHT,
    KeyK: INPUT_ACTIONS.HEAVY,
    KeyL: INPUT_ACTIONS.BLOCK,
    Space: INPUT_ACTIONS.DODGE
  },
  P2: {
    ArrowUp: INPUT_ACTIONS.UP,
    ArrowDown: INPUT_ACTIONS.DOWN,
    ArrowLeft: INPUT_ACTIONS.LEFT,
    ArrowRight: INPUT_ACTIONS.RIGHT,
    // Multi-key support: Number row, Numpad, and Ergonomic Right-hand keys (I, O, P, Shift/Enter)
    Digit1: INPUT_ACTIONS.LIGHT,
    Numpad1: INPUT_ACTIONS.LIGHT,
    KeyI: INPUT_ACTIONS.LIGHT,
    Digit2: INPUT_ACTIONS.HEAVY,
    Numpad2: INPUT_ACTIONS.HEAVY,
    KeyO: INPUT_ACTIONS.HEAVY,
    Digit3: INPUT_ACTIONS.BLOCK,
    Numpad3: INPUT_ACTIONS.BLOCK,
    KeyP: INPUT_ACTIONS.BLOCK,
    Digit0: INPUT_ACTIONS.DODGE,
    Numpad0: INPUT_ACTIONS.DODGE,
    ShiftRight: INPUT_ACTIONS.DODGE,
    Enter: INPUT_ACTIONS.DODGE
  }
};

export const ROUND_STATES = {
  START: 'start',          // 1.5s "ROUND X - FIGHT!" announcement
  FIGHT: 'fight',          // Active brawl
  KO: 'ko',                // 2s slow-mo KO freeze
  ROUND_OVER: 'roundOver', // 2.5s winner announcement
  MATCH_OVER: 'matchOver'  // Final victory screen & stats
};

export const COMBO_LEVELS = [
  { minHits: 21, multiplier: 3.0, label: 'INSANE!', shake: 8, color: '#ff1744' },
  { minHits: 16, multiplier: 2.5, label: 'UNSTOPPABLE!', shake: 6, color: '#ff6d00' },
  { minHits: 11, multiplier: 2.0, label: 'DOMINATING!', shake: 5, color: '#ffd600' },
  { minHits: 7,  multiplier: 1.5, label: 'MEGA COMBO!', shake: 4, color: '#00e5ff' },
  { minHits: 4,  multiplier: 1.2, label: 'COMBO!', shake: 3, color: '#00e676' },
  { minHits: 1,  multiplier: 1.0, label: 'HIT', shake: 2, color: '#ffffff' }
];

