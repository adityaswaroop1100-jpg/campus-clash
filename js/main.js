/**
 * Campus Clash — Main Gameplay Orchestrator
 * @module main
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT, FIGHTER_STATES, INPUT_ACTIONS, ROUND_STATES, COMBO_LEVELS, GAME_MODES } from './utils/constants.js';
import { GameLoop } from './engine/gameLoop.js';
import { InputHandler } from './engine/input.js?v=2.4.3';
import { ParticleSystem } from './engine/particleSystem.js';
import { SoundManager } from './engine/soundManager.js';
import { ScreenShake } from './engine/screenshake.js';
import { CollisionSystem } from './engine/collision.js';
import { BotController } from './ai/botController.js';
import { ComboScaling, CounterHitSystem } from './engine/combatMechanics.js';

import { TOPPER_CONFIG } from './entities/characters/topper.js';
import { BACKBENCHER_CONFIG } from './entities/characters/backbencher.js';
import { HOSTELER_CONFIG } from './entities/characters/hosteler.js';
import { SENIOR_CONFIG } from './entities/characters/senior.js';
import { PLACEMENT_WARRIOR_CONFIG } from './entities/characters/placementWarrior.js';
import { SPORTS_STAR_CONFIG } from './entities/characters/sportsStar.js';
import { CYPHER_CONFIG } from './entities/characters/cypher.js';
import { GAVEL_CONFIG } from './entities/characters/gavel.js';
import { BOLT_CONFIG } from './entities/characters/bolt.js';
import { PALETTE_CONFIG } from './entities/characters/palette.js';
import { Fighter } from './entities/fighter.js?v=2.5.0';
import { VerticalSprawlStage } from './stages/venues/verticalSprawlStage.js';
import { NeonOctagonStage } from './stages/venues/neonOctagonStage.js';
import { ServerCoreStage } from './stages/venues/serverCoreStage.js';
import { ModularArenaStage } from './stages/venues/modularArenaStage.js';
import { ArchiveVaultStage } from './stages/venues/archiveVaultStage.js';
import { NexusModifierSystem } from './engine/nexusModifiers.js';
import { PostProcessing } from './engine/postProcess.js';
import { LandingScene } from './engine/landingScene.js';
import { CharacterPortraitManager } from './ui/characterPortrait.js';
import { StageSelectManager } from './ui/stageSelectManager.js';
import { LeaderboardManager } from './multiplayer/leaderboard.js';
import { supabaseService } from './database/supabaseClient.js';
import { EntryPortalManager } from './ui/entryPortalManager.js';
import './engine/campus-clash-visuals.js';
import './ui/campus-clash-select.js';

export const GAME_SCREENS = {
  LANDING: 'landing',
  MODE_SELECT: 'modeSelect',
  CHAR_SELECT: 'charSelect',
  STAGE_SELECT: 'stageSelect',
  MATCH: 'match'
};

export class TrainingDummyController {
  constructor() {
    this.state = 'stand'; // 'stand', 'block', 'attack', 'dodge'
    this.timer = 0;
  }

  reset() {
    this.timer = 0;
  }

  update() {
    this.timer++;
  }

  isActionActive(action, playerId) {
    if (this.state === 'block' && action === INPUT_ACTIONS.BLOCK) return true;
    return false;
  }

  isActionJustPressed(action, playerId) {
    if (this.state === 'block' && action === INPUT_ACTIONS.BLOCK && this.timer % 60 === 1) return true;
    if (this.state === 'attack') {
      if (this.timer % 70 === 0 && action === INPUT_ACTIONS.LIGHT) return true;
      if (this.timer % 140 === 70 && action === INPUT_ACTIONS.HEAVY) return true;
    }
    if (this.state === 'dodge') {
      if (this.timer % 80 === 0 && action === INPUT_ACTIONS.DODGE) return true;
    }
    return false;
  }
}


/**
 * Universal cross-browser rounded rectangle path (100% compatible with all Safari & Chrome versions)
 */
function drawRoundRect(ctx, x, y, w, h, radius = 8) {
  let r = radius;
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Global Canvas polyfills
if (typeof CanvasRenderingContext2D !== 'undefined') {
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r = 8) {
      drawRoundRect(this, x, y, w, h, r);
      return this;
    };
  }
  if (!CanvasRenderingContext2D.prototype.ellipse) {
    CanvasRenderingContext2D.prototype.ellipse = function(x, y, rx, ry, rot, sa, ea, cc) {
      this.save();
      this.translate(x, y);
      this.rotate(rot);
      this.scale(rx, ry);
      this.arc(0, 0, 1, sa, ea, cc);
      this.restore();
      return this;
    };
  }
}

class CampusClashGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    if (!this.canvas) throw new Error('Canvas element not found.');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    // Subsystems
    this.input = new InputHandler();
    this.botController = new BotController();
    this.particles = new ParticleSystem(200);
    this.sound = new SoundManager();
    this.screenShake = new ScreenShake();
    this.nexusModifiers = new NexusModifierSystem();
    this.postProcess = new PostProcessing();
    
    // Performance pre-allocated scratch caches (Zero-allocation game loop)
    this.camera = { x: 0, y: 0, scale: 1 };
    this.activeFighters = [];
    this.cachedSkyRimGrad = null;

    // The Global Arena Pack (5 Venues with Real 3D Depth & Character Sync)
    this.arenas = [
      {
        id: 'verticalsprawl',
        name: 'The Vertical Sprawl',
        shortName: 'VERTICAL SPRAWL',
        subtitle: 'Five-Tier Cyber City Courtyard',
        stageClass: VerticalSprawlStage,
        emoji: '🏙️',
        landmark: 'Multi-Level Walkways, Skybridge & Neon Alley',
        hazard: 'Acid Rain Sheen & High-Voltage Neon Glow'
      },
      {
        id: 'neonoctagon',
        name: 'The Neon Octagon',
        shortName: 'NEON OCTAGON',
        subtitle: 'Underground Cybernetic Fight Cage',
        stageClass: NeonOctagonStage,
        emoji: '⚡',
        landmark: 'Raised Octagonal Dais, Crowd Balconies & Holograms',
        hazard: 'Overhead Spotlights & Crowd Audio Reactive Spikes'
      },
      {
        id: 'servercore',
        name: 'The Server Core',
        shortName: 'SERVER CORE',
        subtitle: 'Floating Cyberspace Quantum Abyss',
        stageClass: ServerCoreStage,
        emoji: '🌐',
        landmark: 'Concentric Circuit Traces, Energy Beam & Data Streams',
        hazard: 'Bottomless Cyber Void & Breathing Reactor Pulse'
      },
      {
        id: 'modulararena',
        name: 'The Modular Arena',
        shortName: 'MODULAR ARENA',
        subtitle: 'Reconfigurable High-Tech Combat Stadium',
        stageClass: ModularArenaStage,
        emoji: '🏟️',
        landmark: 'Hydraulic Hex Panels, Jumbotron Rig & Camera Crane',
        hazard: 'Pneumatic Floor Reconfiguration & Warning Beams'
      },
      {
        id: 'archivevault',
        name: 'The Archive Vault',
        shortName: 'ARCHIVE VAULT',
        subtitle: 'Tri-Era Temporal Architectural Nexus',
        stageClass: ArchiveVaultStage,
        emoji: '⏳',
        landmark: 'Medieval Fortress / Foundry / Cyberspace Matrix',
        hazard: 'Molten Cascades, Torchlight & Holographic Grid Shift'
      }
    ];
    this.currentArenaIndex = 1; // Neon Octagon default!
    this.stage = new this.arenas[this.currentArenaIndex].stageClass();
    this.stageSelectManager = new StageSelectManager(this);

    // Performance & Accessibility Settings
    this.qualityTier = typeof localStorage !== 'undefined' ? (localStorage.getItem('cc_quality_tier') || 'high') : 'high';
    const savedFlash = typeof localStorage !== 'undefined' ? localStorage.getItem('cc_flash_scale') : null;
    this.hitFlashScale = savedFlash !== null ? parseFloat(savedFlash) : 1.0;
    if (this.stage) {
      this.stage.qualityTier = this.qualityTier;
    }
    if (this.particles) {
      this.particles.setQualityTier(this.qualityTier);
    }

    // Screen State
    this.landingScene = new LandingScene(this);
    this.leaderboardManager = new LeaderboardManager(this);
    this.entryPortalManager = new EntryPortalManager(this);
    this.currentScreen = GAME_SCREENS.LANDING;
    this.selectedMode = GAME_MODES.PVP;
    this.modeIndex = 0; // 0 = PvP, 1 = PvC

    // Character Selection State — All 10 SRM Archetypes
    this.roster = [
      { config: TOPPER_CONFIG, emoji: '🎓', archetype: 'Academic Assassin', difficulty: 'Normal', speed: 5, power: 3, defense: 4 },
      { config: BACKBENCHER_CONFIG, emoji: '🔥', archetype: 'Chaos Agent', difficulty: 'Easy', speed: 4, power: 5, defense: 3 },
      { config: HOSTELER_CONFIG, emoji: '🍲', archetype: 'Tank / Grappler', difficulty: 'Easy', speed: 3, power: 5, defense: 5 },
      { config: SENIOR_CONFIG, emoji: '☕', archetype: 'Control / Zoner', difficulty: 'Medium', speed: 4, power: 4, defense: 4 },
      { config: PLACEMENT_WARRIOR_CONFIG, emoji: '💼', archetype: 'Rushdown / Combo', difficulty: 'Hard', speed: 5, power: 4, defense: 3 },
      { config: SPORTS_STAR_CONFIG, emoji: '⚡', archetype: 'Agile / Brawler', difficulty: 'Medium', speed: 5, power: 4, defense: 4 },
      { config: CYPHER_CONFIG, emoji: '💻', archetype: 'Trap / Zoner', difficulty: 'Hard', speed: 6, power: 3, defense: 3 },
      { config: GAVEL_CONFIG, emoji: '⚖️', archetype: 'Heavy Counter', difficulty: 'Medium', speed: 3, power: 6, defense: 5 },
      { config: BOLT_CONFIG, emoji: '🏃', archetype: 'Rushdown Mix-up', difficulty: 'Hard', speed: 6, power: 4, defense: 3 },
      { config: PALETTE_CONFIG, emoji: '🎨', archetype: 'Tricky Projectile', difficulty: 'Hard', speed: 5, power: 4, defense: 4 }
    ];
    this.previewRoster = [];

    this.p1CharIndex = 0;
    this.p2CharIndex = 1;
    this.p1Locked = false;
    this.p2Locked = false;
    this.isCountingDown = false;
    this.charSelectStep = 0; // In 1v1: 0 = P1 picking, 1 = P2 picking, 2 = Ready

    // Fighters (always initialized to prevent null references)
    this.p1 = new Fighter(TOPPER_CONFIG, 260, this.stage.groundY, 1, 'P1');
    this.p2 = new Fighter(BACKBENCHER_CONFIG, 700, this.stage.groundY, -1, 'P2');

    // Best-of-3 Round & Match State
    this.maxRounds = 3;
    this.currentRound = 1;
    this.p1RoundWins = 0;
    this.p2RoundWins = 0;
    this.roundPhase = ROUND_STATES.START;
    this.phaseTimer = 90;
    this.matchTimer = 99;
    this.matchTimerFrames = 0;
    this.isMatchOver = false;
    this.winner = null;
    this.roundWinner = null;
    this.screenFlashFrames = 0;
    this.slowMotionTimer = 0;
    this.debugHitboxes = false;

    // Match Statistics (P1 vs P2)
    this.matchStats = {
      P1: { totalDamage: 0, maxCombo: 0, hits: 0 },
      P2: { totalDamage: 0, maxCombo: 0, hits: 0 }
    };

    // Training Dojo Dummy Controller
    this.trainingDummyController = new TrainingDummyController();

    // Combo Tracking with Anti-Spam Damage Scaling
    this.combos = {
      P1: { hits: 0, timer: 0, damage: 0, scaling: new ComboScaling() },
      P2: { hits: 0, timer: 0, damage: 0, scaling: new ComboScaling() }
    };

    // Game loop
    this.loop = new GameLoop(this.update.bind(this), this.render.bind(this));
    this.setupListeners();
    this.initPauseMenu();
    this.initTouchControls();
    this.loop.start();
    this.initCharacterSelect();
    if (this.stageSelectManager) this.stageSelectManager.initDOM();

    if (window.CampusVisuals && window.CampusVisuals.preloadAll) {
      window.CampusVisuals.preloadAll();
    }

    // Render first frame immediately so canvas is never left blank
    try {
      this.render(1);
    } catch (e) {
      console.error('[CampusClash] Initial render error:', e);
    }
    console.log('Campus Clash initialized successfully.');
  }

  setupListeners() {
    // Keyboard listeners
    window.addEventListener('keydown', (e) => {
      const portal = document.getElementById('entry-portal');
      if (portal && !portal.classList.contains('hidden')) {
        return;
      }

      const activeEl = document.activeElement;
      const activeTag = (activeEl && activeEl.tagName) ? activeEl.tagName.toLowerCase() : '';
      const targetTag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (
        targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select' || (e.target && e.target.isContentEditable) ||
        activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select' || (activeEl && activeEl.isContentEditable)
      ) {
        return;
      }

      this.sound.init(); // Initialize Web Audio on first user interaction

      if (e.code === 'KeyF' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        this.toggleFullscreen();
        return;
      }

      if (this.currentScreen === GAME_SCREENS.LANDING) {
        if (this.landingScene) this.landingScene.handleKeyDown(e);
      } else if (this.currentScreen === GAME_SCREENS.MODE_SELECT) {
        this.handleModeSelectKeyDown(e);
      } else if (this.currentScreen === GAME_SCREENS.CHAR_SELECT) {
        this.handleCharSelectKeyDown(e);
      } else if (this.currentScreen === GAME_SCREENS.STAGE_SELECT) {
        this.handleStageSelectKeyDown(e);
      } else if (this.currentScreen === GAME_SCREENS.MATCH) {
        this.handleMatchKeyDown(e);
      }
    });

    // Rig HUD Fullscreen button
    const rigFsBtn = document.getElementById('rig-btn-fullscreen');
    if (rigFsBtn) {
      rigFsBtn.addEventListener('click', () => this.toggleFullscreen());
    }

    document.addEventListener('fullscreenchange', () => {
      const isFs = !!document.fullscreenElement;
      const fsBtn = document.getElementById('rig-btn-fullscreen');
      const portalFsBtn = document.getElementById('portal-btn-fullscreen');
      if (fsBtn) {
        fsBtn.innerHTML = `<span>${isFs ? '🗗 EXIT FULLSCREEN (F)' : '⛶ FULLSCREEN (F)'}</span>`;
      }
      if (portalFsBtn) {
        portalFsBtn.textContent = isFs ? '🗗 EXIT FULLSCREEN' : '⛶ FULLSCREEN';
      }
    });

    // Mouse / Touch Pointer interaction on Canvas
    this.canvas.addEventListener('pointerdown', (e) => {
      this.sound.init();
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      if (this.currentScreen === GAME_SCREENS.MODE_SELECT) {
        this.handleModeSelectClick(x, y);
      } else if (this.currentScreen === GAME_SCREENS.CHAR_SELECT) {
        this.handleCharSelectClick(x, y);
      } else if (this.currentScreen === GAME_SCREENS.STAGE_SELECT) {
        this.handleStageSelectClick(x, y);
      } else if (this.currentScreen === GAME_SCREENS.MATCH) {
        this.handleMatchClick(x, y);
      }
    });
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }

  // =========================================================================
  // PAUSE & SETTINGS SYSTEM
  // =========================================================================
  initPauseMenu() {
    this.isPaused = false;
    this.pauseMenuEl = document.getElementById('in-game-pause-menu');
    this.hudPauseBtn = document.getElementById('hud-btn-pause');

    // Floating HUD button
    this.hudPauseBtn?.addEventListener('click', () => this.togglePause());

    // Modal buttons
    document.getElementById('pause-btn-close')?.addEventListener('click', () => this.togglePause(false));
    document.getElementById('pause-btn-resume')?.addEventListener('click', () => this.togglePause(false));

    document.getElementById('pause-btn-restart')?.addEventListener('click', () => {
      this.togglePause(false);
      this.sound.playHeavyHit();
      this.startRound(1);
    });

    document.getElementById('pause-btn-char-select')?.addEventListener('click', () => {
      this.togglePause(false);
      this.sound.playLightHit();
      this.openCharSelect();
    });

    document.getElementById('pause-btn-main-menu')?.addEventListener('click', () => {
      this.togglePause(false);
      this.sound.playBlock();
      this.currentScreen = GAME_SCREENS.LANDING;
      if (this.landingScene) this.landingScene.show();
      this.sound.startTitleMusic();
      document.getElementById('hud-btn-pause')?.classList.add('hidden');
      document.getElementById('virtual-touch-controls')?.classList.add('hidden');
    });

    document.getElementById('pause-btn-fullscreen')?.addEventListener('click', () => {
      this.toggleFullscreen();
    });

    // Volume sliders
    const masterSlider = document.getElementById('pause-slider-master');
    const musicSlider = document.getElementById('pause-slider-music');
    const sfxSlider = document.getElementById('pause-slider-sfx');
    const muteBtn = document.getElementById('pause-btn-mute');

    if (masterSlider) {
      masterSlider.value = Math.round((this.sound.masterVolume || 0.8) * 100);
      masterSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        this.sound.setMasterVolume(val / 100);
        const label = document.getElementById('pause-val-master');
        if (label) label.textContent = `${val}%`;
      });
    }

    if (musicSlider) {
      musicSlider.value = Math.round((this.sound.musicVolume || 0.55) * 100);
      musicSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        this.sound.setMusicVolume(val / 100);
        const label = document.getElementById('pause-val-music');
        if (label) label.textContent = `${val}%`;
      });
    }

    if (sfxSlider) {
      sfxSlider.value = Math.round((this.sound.sfxVolume || 0.8) * 100);
      sfxSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        this.sound.setSFXVolume(val / 100);
        const label = document.getElementById('pause-val-sfx');
        if (label) label.textContent = `${val}%`;
      });
    }

    if (muteBtn) {
      muteBtn.textContent = this.sound.isMuted ? 'MUTE (ON)' : 'MUTE (OFF)';
      if (this.sound.isMuted) muteBtn.classList.add('active');
      muteBtn.addEventListener('click', () => {
        const isMuted = this.sound.toggleMute();
        muteBtn.textContent = isMuted ? 'MUTE (ON)' : 'MUTE (OFF)';
        muteBtn.classList.toggle('active', isMuted);
      });
    }

    // Screen Shake Slider
    const shakeSlider = document.getElementById('pause-slider-shake');
    if (shakeSlider) {
      const curShake = Math.round((this.screenShake.userScale ?? 1.0) * 100);
      shakeSlider.value = curShake;
      const label = document.getElementById('pause-val-shake');
      if (label) label.textContent = `${curShake}%`;
      shakeSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        this.screenShake.setUserScale(val / 100);
        if (label) label.textContent = `${val}%`;
      });
    }

    // Hit Flash Slider
    const flashSlider = document.getElementById('pause-slider-flash');
    if (flashSlider) {
      const curFlash = Math.round((this.hitFlashScale ?? 1.0) * 100);
      flashSlider.value = curFlash;
      const label = document.getElementById('pause-val-flash');
      if (label) label.textContent = `${curFlash}%`;
      flashSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        this.setHitFlashScale(val / 100);
        if (label) label.textContent = `${val}%`;
      });
    }

    // Graphics Quality Preset Toggle (HIGH / MEDIUM / LOW)
    const qualityBtn = document.getElementById('pause-btn-quality');
    if (qualityBtn) {
      const labels = { high: 'HIGH (60/120)', medium: 'MEDIUM (BALANCED)', low: 'LOW (MAX FPS)' };
      qualityBtn.textContent = labels[this.qualityTier] || 'HIGH (60/120)';
      qualityBtn.classList.toggle('active', this.qualityTier !== 'low');
      qualityBtn.addEventListener('click', () => {
        const cycle = { high: 'medium', medium: 'low', low: 'high' };
        this.setQualityTier(cycle[this.qualityTier] || 'high');
      });
    }

    // Stream-Safe Audio Mode Toggle
    const streamSafeBtn = document.getElementById('pause-btn-streamsafe');
    if (streamSafeBtn) {
      const isSafe = this.sound.isStreamSafe;
      streamSafeBtn.textContent = isSafe ? 'ON' : 'OFF';
      streamSafeBtn.classList.toggle('active', isSafe);
      streamSafeBtn.addEventListener('click', () => {
        const newState = this.sound.toggleStreamSafe();
        streamSafeBtn.textContent = newState ? 'ON' : 'OFF';
        streamSafeBtn.classList.toggle('active', newState);
      });
    }

    // Toggle touch controls button in pause menu
    const toggleTouchBtn = document.getElementById('pause-btn-toggle-touch');
    toggleTouchBtn?.addEventListener('click', () => {
      const tc = document.getElementById('virtual-touch-controls');
      if (tc) {
        tc.classList.toggle('hidden');
        toggleTouchBtn.textContent = tc.classList.contains('hidden') ? 'OFF' : 'ON';
        toggleTouchBtn.classList.toggle('active', !tc.classList.contains('hidden'));
      }
    });
  }

  setQualityTier(tier) {
    this.qualityTier = tier;
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('cc_quality_tier', tier); } catch (e) {}
    }
    if (this.stage) {
      this.stage.qualityTier = tier;
    }
    if (this.particles) {
      this.particles.setQualityTier(tier);
    }
    const btn = document.getElementById('pause-btn-quality');
    if (btn) {
      const labels = { high: 'HIGH (60/120)', medium: 'MEDIUM (BALANCED)', low: 'LOW (MAX FPS)' };
      btn.textContent = labels[tier] || tier.toUpperCase();
      btn.classList.toggle('active', tier !== 'low');
    }
  }

  setHitFlashScale(val) {
    this.hitFlashScale = Math.max(0, Math.min(1, val));
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('cc_flash_scale', this.hitFlashScale.toString()); } catch (e) {}
    }
  }

  togglePause(forceState = null) {
    if (this.currentScreen !== GAME_SCREENS.MATCH) return;
    this.isPaused = forceState !== null ? forceState : !this.isPaused;

    if (this.pauseMenuEl) {
      this.pauseMenuEl.classList.toggle('hidden', !this.isPaused);
    }
    if (this.isPaused) {
      this.sound.playBlock();
    } else {
      this.sound.playLightHit();
    }
  }

  // =========================================================================
  // VIRTUAL TOUCH CONTROLS (MOBILE & KIOSK)
  // =========================================================================
  initTouchControls() {
    const touchEl = document.getElementById('virtual-touch-controls');
    if (!touchEl) return;

    const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (!hasTouch) {
      touchEl.classList.add('hidden');
    }

    const actionButtons = touchEl.querySelectorAll('[data-action]');
    actionButtons.forEach(btn => {
      const action = btn.getAttribute('data-action');
      const startAction = (e) => {
        e.preventDefault();
        btn.classList.add('pressed');
        if (this.input) {
          this.input.touchActionsActive.P1.add(action);
          this.input.touchActionsJustPressed.P1.add(action);
        }
      };
      const stopAction = (e) => {
        e.preventDefault();
        btn.classList.remove('pressed');
        if (this.input) {
          this.input.touchActionsActive.P1.delete(action);
        }
      };

      btn.addEventListener('pointerdown', startAction);
      btn.addEventListener('pointerup', stopAction);
      btn.addEventListener('pointercancel', stopAction);
      btn.addEventListener('pointerleave', stopAction);
    });
  }

  // =========================================================================
  // MODE SELECT HANDLING
  // =========================================================================
  handleModeSelectKeyDown(e) {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      this.modeIndex = (this.modeIndex - 1 + 3) % 3;
      this.sound.playLightHit();
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      this.modeIndex = (this.modeIndex + 1) % 3;
      this.sound.playLightHit();
    } else if (e.code === 'Digit1') {
      this.modeIndex = 0;
      this.confirmMode();
    } else if (e.code === 'Digit2') {
      this.modeIndex = 1;
      this.confirmMode();
    } else if (e.code === 'Digit3') {
      this.modeIndex = 2;
      this.confirmMode();
    } else if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyJ') {
      this.confirmMode();
    }
  }

  handleModeSelectClick(x, y) {
    // Card 1: 1 vs 1 (y: 225 to 335)
    if (x >= 180 && x <= 780 && y >= 225 && y <= 335) {
      this.modeIndex = 0;
      this.confirmMode();
    }
    // Card 2: Player vs CPU (y: 350 to 460)
    else if (x >= 180 && x <= 780 && y >= 350 && y <= 460) {
      this.modeIndex = 1;
      this.confirmMode();
    }
    // Card 3: Training Dojo (y: 475 to 585)
    else if (x >= 180 && x <= 780 && y >= 475 && y <= 585) {
      this.modeIndex = 2;
      this.confirmMode();
    }
  }

  confirmMode() {
    const modes = [GAME_MODES.PVP, GAME_MODES.PVC, GAME_MODES.TRAINING];
    this.selectedMode = modes[this.modeIndex] || GAME_MODES.PVP;
    this.sound.playHeavyHit();
    this.currentScreen = GAME_SCREENS.CHAR_SELECT;
    this.charSelectStep = 0; // P1 picks first
  }

  // =========================================================================
  // ARCADE CHARACTER SELECT CONTROLLER & UI SYSTEM
  // =========================================================================
  initCharacterSelect() {
    this.portraitManager = new CharacterPortraitManager(this.roster);

    // Grab DOM elements
    this.charSelectScreen = document.getElementById('characterSelectScreen');
    this.charCards = Array.from(document.querySelectorAll('.char-card'));
    this.charBackBtn = document.getElementById('char-select-back-btn');
    this.p1ProfileName = document.getElementById('p1-profile-name');
    this.p1ProfileTagline = document.getElementById('p1-profile-tagline');
    this.p1ProfileEmoji = document.getElementById('p1-profile-emoji');
    this.p1ProfileStatus = document.getElementById('p1-profile-status');
    this.p2ProfileName = document.getElementById('p2-profile-name');
    this.p2ProfileTagline = document.getElementById('p2-profile-tagline');
    this.p2ProfileEmoji = document.getElementById('p2-profile-emoji');
    this.p2ProfileStatus = document.getElementById('p2-profile-status');
    this.p2ProfileSlot = document.getElementById('p2-profile-slot');
    this.countdownOverlay = document.getElementById('char-countdown-overlay');
    this.countdownDisplay = document.getElementById('countdown-display');
    this.charModeText = document.getElementById('char-mode-text');
    this.charVenuePill = document.getElementById('char-venue-pill');
    this.charVenueText = document.getElementById('char-venue-text');

    // Venue Quick-Select Button
    this.charVenuePill?.addEventListener('click', () => {
      this.sound.playCharNavTick();
      this.closeCharSelect();
      this.openStageSelect();
      this.currentScreen = GAME_SCREENS.STAGE_SELECT;
    });

    // View Toggle Button (10-Card Deck vs Arcade Grid)
    this.charViewToggleBtn = document.getElementById('char-view-toggle-btn');
    this.charViewToggleText = document.getElementById('char-view-toggle-text');
    this.campusSelectRoot = document.getElementById('campus-select-root');
    this.charGrid = document.getElementById('char-grid');

    if (this.charViewToggleBtn && this.campusSelectRoot && this.charGrid) {
      this.charViewToggleBtn.addEventListener('click', () => {
        this.sound?.playCharNavTick();
        const isDeckView = !this.campusSelectRoot.classList.contains('hidden');
        if (isDeckView) {
          this.campusSelectRoot.classList.add('hidden');
          this.charGrid.classList.remove('hidden');
          if (this.charViewToggleText) this.charViewToggleText.textContent = 'VIEW: 10-CARD DECK';
        } else {
          this.charGrid.classList.add('hidden');
          this.campusSelectRoot.classList.remove('hidden');
          if (this.charViewToggleText) this.charViewToggleText.textContent = 'VIEW: ARCADE GRID';
        }
      });
    }

    // Initialize CampusSelect 10-Card View
    if (window.CampusSelect && this.campusSelectRoot) {
      this.campusSelectInstance = window.CampusSelect.build(this.campusSelectRoot, {
        base: 'assets/characters',
        selected: this.roster[this.p1CharIndex]?.config?.id || 'topper',
        onPreview: (id) => {
          if (this.isCountingDown) return;
          const targetId = (id === 'sports' ? 'sportsStar' : (id === 'placement' ? 'placementWarrior' : id));
          const idx = this.roster.findIndex(r => r.config.id === targetId || r.config.id === id);
          if (idx !== -1) {
            if (this.charSelectStep === 0) {
              this.p1CharIndex = idx;
            } else if (this.charSelectStep === 1) {
              this.p2CharIndex = idx;
            }
            this.sound?.playCardWhoosh();
            this.updateCharSelectUI();
          }
        },
        onSelect: (id) => {
          if (this.isCountingDown) return;
          const targetId = (id === 'sports' ? 'sportsStar' : (id === 'placement' ? 'placementWarrior' : id));
          const idx = this.roster.findIndex(r => r.config.id === targetId || r.config.id === id);
          if (idx !== -1) {
            if (this.charSelectStep === 0) {
              this.p1CharIndex = idx;
              this.sound?.playCharNavTick();
              this.updateCharSelectUI();
              this.lockInCharacter(1, idx);
            } else if (this.charSelectStep === 1) {
              this.p2CharIndex = idx;
              this.sound?.playCharNavTick();
              this.updateCharSelectUI();
              this.lockInCharacter(2, idx);
            }
          }
        }
      });
    }

    // Bind Mini-Canvases to Portrait Manager
    const canvases = document.querySelectorAll('.char-portrait-canvas');
    if (canvases.length > 0) {
      this.portraitManager.bindCanvases(canvases);
    }

    // Back Button Click Handler
    this.charBackBtn?.addEventListener('click', () => {
      this.sound.playCancel();
      this.closeCharSelect();
      this.currentScreen = GAME_SCREENS.LANDING;
      if (this.landingScene) this.landingScene.show();
    });

    // Card Hover & Click Events
    this.charCards.forEach((card, index) => {
      card.addEventListener('mouseenter', () => {
        if (this.isCountingDown) return;
        this.portraitManager.setHovered(index);
        this.sound.playCardWhoosh();
      });

      card.addEventListener('mouseleave', () => {
        if (this.isCountingDown) return;
        this.portraitManager.setHovered(-1);
      });

      card.addEventListener('click', () => {
        if (this.isCountingDown) return;
        if (this.charSelectStep === 0) {
          this.p1CharIndex = index;
          this.sound.playCharNavTick();
          this.updateCharSelectUI();
          this.lockInCharacter(1, index);
        } else if (this.charSelectStep === 1) {
          this.p2CharIndex = index;
          this.sound.playCharNavTick();
          this.updateCharSelectUI();
          this.lockInCharacter(2, index);
        }
      });
    });

    this.updateCharSelectUI();
  }

  openCharSelect() {
    this.currentScreen = GAME_SCREENS.CHAR_SELECT;
    document.getElementById('hud-btn-pause')?.classList.add('hidden');
    document.getElementById('virtual-touch-controls')?.classList.add('hidden');
    if (this.isPaused) this.togglePause(false);

    if (this.charSelectScreen) {
      this.charSelectScreen.classList.remove('hidden');
    }
    if (this.landingScene) {
      this.landingScene.hide();
    }
    this.charSelectStep = 0;
    this.p1Locked = false;
    this.p2Locked = false;
    this.isCountingDown = false;
    if (this.countdownOverlay) {
      this.countdownOverlay.classList.add('hidden');
    }
    this.updateCharSelectUI();
    this.portraitManager?.start();
  }

  closeCharSelect() {
    if (this.charSelectScreen) {
      this.charSelectScreen.classList.add('hidden');
    }
    if (this.countdownOverlay) {
      this.countdownOverlay.classList.add('hidden');
    }
    this.portraitManager?.stop();
    this.isCountingDown = false;
  }

  openStageSelect() {
    this.currentScreen = GAME_SCREENS.STAGE_SELECT;
    if (this.stageSelectManager) {
      this.stageSelectManager.open();
    }
  }

  closeStageSelect() {
    if (this.stageSelectManager) {
      this.stageSelectManager.close();
    }
  }

  updateCharSelectUI() {
    // Mode indicator text
    if (this.charModeText) {
      if (this.selectedMode === GAME_MODES.TRAINING) {
        this.charModeText.textContent = '🥋 TRAINING DOJO';
      } else if (this.selectedMode === GAME_MODES.PVC) {
        this.charModeText.textContent = '⚡ PLAYER VS SRM BOT [EXPERT]';
      } else {
        this.charModeText.textContent = '⚔️ 2-PLAYER LOCAL BRAWL';
      }
    }

    // Venue quick-preview pill text
    if (this.charVenueText && this.arenas[this.currentArenaIndex]) {
      this.charVenueText.textContent = `VENUE: ${this.arenas[this.currentArenaIndex].shortName}`;
    }

    // Update Card Selection Highlights & Locked States
    this.charCards.forEach((card, i) => {
      card.classList.toggle('selected-p1', this.p1CharIndex === i);
      card.classList.toggle('selected-p2', this.p2CharIndex === i);
      const isCardLocked = (this.p1Locked && this.p1CharIndex === i) || (this.p2Locked && this.p2CharIndex === i);
      card.classList.toggle('locked', isCardLocked);
    });

    // Update Portrait Manager state
    this.portraitManager?.setSelection(this.p1CharIndex, this.p2CharIndex, this.p1Locked, this.p2Locked);

    // Sync CampusSelect if active
    const activeCharId = this.roster[this.charSelectStep === 1 ? this.p2CharIndex : this.p1CharIndex]?.config?.id;
    const selectId = (activeCharId === 'sportsStar' ? 'sports' : (activeCharId === 'placementWarrior' ? 'placement' : activeCharId));
    if (selectId && this.campusSelectInstance && this.campusSelectInstance.current !== selectId) {
      this.campusSelectInstance.select(selectId);
    }

    // Update Player 1 Profile Card
    const p1Item = this.roster[this.p1CharIndex];
    if (this.p1ProfileName) this.p1ProfileName.textContent = p1Item.config.displayName.toUpperCase();
    if (this.p1ProfileTagline) this.p1ProfileTagline.textContent = `"${p1Item.config.tagline}"`;
    if (this.p1ProfileEmoji) this.p1ProfileEmoji.textContent = p1Item.emoji;
    if (this.p1ProfileStatus) {
      if (this.p1Locked) {
        this.p1ProfileStatus.innerHTML = '<span class="status-stamp ready">LOCKED IN</span>';
      } else {
        this.p1ProfileStatus.innerHTML = '<span class="status-stamp selecting">P1 SELECTING...</span>';
      }
    }

    // Update Player 2 Profile Card
    const p2Item = this.roster[this.p2CharIndex];
    if (this.p2ProfileSlot) {
      if (this.selectedMode === GAME_MODES.PVC) this.p2ProfileSlot.innerHTML = '🤖 SRM BOT <span style="color:#00f0ff;font-weight:900;">[EXPERT]</span>';
      else if (this.selectedMode === GAME_MODES.TRAINING) this.p2ProfileSlot.textContent = 'DOJO DUMMY';
      else this.p2ProfileSlot.textContent = 'PLAYER 2';
    }
    if (this.p2ProfileName) this.p2ProfileName.textContent = p2Item.config.displayName.toUpperCase();
    if (this.p2ProfileTagline) this.p2ProfileTagline.textContent = `"${p2Item.config.tagline}"`;
    if (this.p2ProfileEmoji) this.p2ProfileEmoji.textContent = p2Item.emoji;
    if (this.p2ProfileStatus) {
      if (this.p2Locked) {
        this.p2ProfileStatus.innerHTML = '<span class="status-stamp ready">LOCKED IN</span>';
      } else if (this.charSelectStep === 1) {
        const slotLabel = this.selectedMode === GAME_MODES.PVC ? 'CPU' : 'P2';
        this.p2ProfileStatus.innerHTML = `<span class="status-stamp selecting">${slotLabel} SELECTING...</span>`;
      } else {
        this.p2ProfileStatus.innerHTML = '<span class="status-stamp pending">P2 WAITING...</span>';
      }
    }
  }

  lockInCharacter(playerIndex, charIndex) {
    if (this.isCountingDown) return;
    this.sound.playLockIn();

    // Trigger visual card flash
    const card = this.charCards[charIndex];
    if (card) {
      card.classList.add('lockin-flash');
      setTimeout(() => card.classList.remove('lockin-flash'), 350);
    }

    if (playerIndex === 1) {
      this.p1Locked = true;
      this.p1CharIndex = charIndex;
      this.charSelectStep = 1;
      this.updateCharSelectUI();

      // If playing in VS Computer (PVC) mode, CPU automatically picks rival
      if (this.selectedMode === GAME_MODES.PVC) {
        setTimeout(() => {
          if (!this.p1Locked || this.p2Locked) return;
          let cpuPick = (charIndex + 1) % this.roster.length;
          if (charIndex === 0) cpuPick = 1; // Topper vs Backbencher
          else if (charIndex === 1) cpuPick = 0; // Backbencher vs Topper
          else if (charIndex === 2) cpuPick = 3; // Hosteler vs Senior
          else if (charIndex === 3) cpuPick = 4; // Senior vs Placement Warrior
          else if (charIndex === 4) cpuPick = 5; // Placement Warrior vs Sports Star
          else if (charIndex === 6) cpuPick = 2; // Cypher vs Hosteler

          this.p2CharIndex = cpuPick;
          this.updateCharSelectUI();
          this.lockInCharacter(2, cpuPick);
        }, 450);
      }
    } else if (playerIndex === 2) {
      this.p2Locked = true;
      this.p2CharIndex = charIndex;
      this.charSelectStep = 2;
      this.updateCharSelectUI();

      // Both players locked in -> Transition to SRM KTR Battle Venue Select!
      setTimeout(() => {
        this.closeCharSelect();
        this.openStageSelect();
      }, 350);
    }
  }

  startMatchCountdown() {
    this.isCountingDown = true;
    if (this.countdownOverlay) {
      this.countdownOverlay.classList.remove('hidden');
    }

    let count = 3;
    if (this.countdownDisplay) this.countdownDisplay.textContent = '3';
    this.sound.playCountdownBeep(3);

    const countdownInterval = setInterval(() => {
      count--;
      if (count === 2) {
        if (this.countdownDisplay) this.countdownDisplay.textContent = '2';
        this.sound.playCountdownBeep(2);
      } else if (count === 1) {
        if (this.countdownDisplay) this.countdownDisplay.textContent = '1';
        this.sound.playCountdownBeep(1);
      } else if (count === 0) {
        if (this.countdownDisplay) {
          this.countdownDisplay.textContent = 'FIGHT!';
          this.countdownDisplay.style.color = '#ff1744';
        }
        this.sound.playFightGong();
        this.screenShake.shake(16, 40);
        if (this.charSelectScreen) {
          this.charSelectScreen.classList.add('lockin-flash');
        }
      } else {
        clearInterval(countdownInterval);
        setTimeout(() => {
          this.closeCharSelect();
          if (this.charSelectScreen) {
            this.charSelectScreen.classList.remove('lockin-flash');
          }
          this.startMatch();
        }, 350);
      }
    }, 950);
  }

  handleCharSelectKeyDown(e) {
    if (this.isCountingDown) return;

    // Return to Landing Screen
    if (e.code === 'Escape') {
      if (this.charSelectStep === 1) {
        // Unlock P1 and go back to step 0
        this.sound.playCancel();
        this.charSelectStep = 0;
        this.p1Locked = false;
        this.p2Locked = false;
        this.updateCharSelectUI();
        return;
      }
      this.sound.playCancel();
      this.closeCharSelect();
      this.currentScreen = GAME_SCREENS.LANDING;
      if (this.landingScene) this.landingScene.show();
      return;
    }

    // Backspace: unlock previous selection
    if (e.code === 'Backspace') {
      if (this.charSelectStep === 1) {
        this.sound.playCancel();
        this.charSelectStep = 0;
        this.p1Locked = false;
        this.p2Locked = false;
        this.updateCharSelectUI();
        return;
      }
    }

    const cols = 5;
    const rows = 2;
    const navigate = (currIndex, dir) => {
      let row = Math.floor(currIndex / cols);
      let col = currIndex % cols;
      if (dir === 'left') col = (col - 1 + cols) % cols;
      if (dir === 'right') col = (col + 1) % cols;
      if (dir === 'up') row = (row - 1 + rows) % rows;
      if (dir === 'down') row = (row + 1) % rows;
      const target = row * cols + col;
      return target < this.roster.length ? target : currIndex;
    };

    // Step 0: P1 Selecting
    if (this.charSelectStep === 0) {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        this.p1CharIndex = navigate(this.p1CharIndex, 'left');
        this.sound.playCharNavTick();
        this.updateCharSelectUI();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.p1CharIndex = navigate(this.p1CharIndex, 'right');
        this.sound.playCharNavTick();
        this.updateCharSelectUI();
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.p1CharIndex = navigate(this.p1CharIndex, 'up');
        this.sound.playCharNavTick();
        this.updateCharSelectUI();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.p1CharIndex = navigate(this.p1CharIndex, 'down');
        this.sound.playCharNavTick();
        this.updateCharSelectUI();
      } else if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyJ' || e.code === 'Digit1') {
        this.lockInCharacter(1, this.p1CharIndex);
      }
    }
    // Step 1: P2 / CPU Selecting
    else if (this.charSelectStep === 1) {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'KeyJ' || e.code === 'Numpad4') {
        this.p2CharIndex = navigate(this.p2CharIndex, 'left');
        this.sound.playCharNavTick();
        this.updateCharSelectUI();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'KeyL' || e.code === 'Numpad6') {
        this.p2CharIndex = navigate(this.p2CharIndex, 'right');
        this.sound.playCharNavTick();
        this.updateCharSelectUI();
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'KeyI' || e.code === 'Numpad8') {
        this.p2CharIndex = navigate(this.p2CharIndex, 'up');
        this.sound.playCharNavTick();
        this.updateCharSelectUI();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'KeyK' || e.code === 'Numpad2') {
        this.p2CharIndex = navigate(this.p2CharIndex, 'down');
        this.sound.playCharNavTick();
        this.updateCharSelectUI();
      } else if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyP' || e.code === 'Digit0' || e.code === 'Numpad0') {
        this.lockInCharacter(2, this.p2CharIndex);
      }
    }
  }

  handleCharSelectClick(x, y) {
    // Canvas clicks are handled directly by DOM card listeners
  }

  // =========================================================================
  // VENUE / STAGE SELECT HANDLING
  // =========================================================================
  handleStageSelectKeyDown(e) {
    if (e.code === 'Escape' || e.code === 'Backspace') {
      this.sound.playCancel();
      this.closeStageSelect();
      this.openCharSelect();
      this.currentScreen = GAME_SCREENS.CHAR_SELECT;
      return;
    }

    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      if (this.stageSelectManager) this.stageSelectManager.navigate('left');
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      if (this.stageSelectManager) this.stageSelectManager.navigate('right');
    } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      if (this.stageSelectManager) this.stageSelectManager.navigate('up');
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      if (this.stageSelectManager) this.stageSelectManager.navigate('down');
    } else if (e.code === 'KeyR') {
      if (this.stageSelectManager) this.stageSelectManager.pickRandom();
    } else if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyJ' || e.code === 'Digit1') {
      if (this.stageSelectManager) this.stageSelectManager.confirmAndStart();
    }
  }

  handleStageSelectClick(x, y) {
    // Stage select DOM handles mouse events directly
  }

  // =========================================================================
  // MATCH HANDLING & START
  // =========================================================================
  async startMatch() {
    this.sound.playUltimate();
    const p1Cfg = this.roster[this.p1CharIndex].config;
    const p2Cfg = this.roster[this.p2CharIndex].config;

    if (window.CampusVisuals) {
      await Promise.all([
        window.CampusVisuals.loadCharacter(p1Cfg.id),
        window.CampusVisuals.loadCharacter(p2Cfg.id)
      ]);
    }

    // Instantiate selected SRM Arena
    this.stage = new this.arenas[this.currentArenaIndex].stageClass();
    this.stage.qualityTier = this.qualityTier;

    this.p1 = new Fighter(p1Cfg, 260, this.stage.groundY, 1, 'P1');
    this.p2 = new Fighter(p2Cfg, 700, this.stage.groundY, -1, 'P2');
    // Wire particle system reference for landing ring + other visual effects
    this.p1._particleSystem = this.particles;
    this.p2._particleSystem = this.particles;
    this.p1._groundY = this.stage.groundY;
    this.p2._groundY = this.stage.groundY;

    this.p1RoundWins = 0;
    this.p2RoundWins = 0;
    this.isMatchOver = false;
    this.winner = null;
    this.roundWinner = null;
    this.screenFlashFrames = 0;
    this.matchStats = {
      P1: { totalDamage: 0, maxCombo: 0, hits: 0 },
      P2: { totalDamage: 0, maxCombo: 0, hits: 0 }
    };

    this.startRound(1);
    this.currentScreen = GAME_SCREENS.MATCH;

    // Show in-match HUD controls
    document.getElementById('hud-btn-pause')?.classList.remove('hidden');
    const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (hasTouch) {
      document.getElementById('virtual-touch-controls')?.classList.remove('hidden');
    }
  }

  startRound(roundNum) {
    this.currentRound = roundNum;
    this.roundPhase = ROUND_STATES.START;
    this.phaseTimer = 90; // 1.5s countdown
    this.matchTimer = 99;
    this.matchTimerFrames = 0;
    this.roundWinner = null;

    // Start procedural combat music and voice announcer
    this.sound.startCombatMusic();
    this.sound.announceRound(roundNum);
    if (this.sound && typeof this.sound.setVenue === 'function' && this.stage) {
      this.sound.setVenue(this.stage.id, roundNum);
    }

    // Notify stage of round transition (e.g. Archive Vault era switch or Modular Arena reconfiguration)
    if (this.stage && typeof this.stage.onRoundTransition === 'function') {
      this.stage.onRoundTransition(roundNum);
    }

    const spawnP1X = this.stage?.config?.spawnPoints?.P1?.x || 260;
    const spawnP2X = this.stage?.config?.spawnPoints?.P2?.x || 700;

    if (this.p1) {
      this.p1.health = this.p1.maxHealth;
      this.p1.displayedHealth = this.p1.maxHealth;
      this.p1.x = spawnP1X;
      this.p1.y = this.stage.groundY;
      this.p1.facing = 1;
      this.p1.vx = 0;
      this.p1.vy = 0;
      if (this.p1.stateMachine?.changeState) {
        this.p1.stateMachine.changeState(FIGHTER_STATES.IDLE);
      }
      this.p1.activeHitboxes = [];
      this.p1.hitstopTimer = 0;
      this.p1.freezeTimer = 0;
      this.p1.invulnerableFrames = 0;
    }
    if (this.p2) {
      this.p2.health = this.p2.maxHealth;
      this.p2.displayedHealth = this.p2.maxHealth;
      this.p2.x = spawnP2X;
      this.p2.y = this.stage.groundY;
      this.p2.facing = -1;
      this.p2.vx = 0;
      this.p2.vy = 0;
      if (this.p2.stateMachine?.changeState) {
        this.p2.stateMachine.changeState(FIGHTER_STATES.IDLE);
      }
      this.p2.activeHitboxes = [];
      this.p2.hitstopTimer = 0;
      this.p2.freezeTimer = 0;
      this.p2.invulnerableFrames = 0;
    }

    this.botController.reset();
    if (this.trainingDummyController) this.trainingDummyController.reset();
    this.combos.P1 = { hits: 0, timer: 0, damage: 0, scaling: new ComboScaling() };
    this.combos.P2 = { hits: 0, timer: 0, damage: 0, scaling: new ComboScaling() };
    if (this.selectedMode === GAME_MODES.TRAINING) {
      this.matchTimer = 999;
    }
    if (this.nexusModifiers) {
      this.nexusModifiers.reset();
    }
    this.particles.clear();
  }

  handleMatchKeyDown(e) {
    if (e.code === 'KeyH') {
      this.debugHitboxes = !this.debugHitboxes;
    }
    // Training Dojo Dummy Controls
    if (this.selectedMode === GAME_MODES.TRAINING) {
      if (e.code === 'Digit1') {
        this.trainingDummyController.state = 'stand';
        this.sound.playLightHit();
        this.p2.showStatus('🤖 DUMMY: STAND', '#00e5ff');
      } else if (e.code === 'Digit2') {
        this.trainingDummyController.state = 'block';
        this.sound.playLightHit();
        this.p2.showStatus('🤖 DUMMY: BLOCK', '#ffd700');
      } else if (e.code === 'Digit3') {
        this.trainingDummyController.state = 'attack';
        this.sound.playLightHit();
        this.p2.showStatus('🤖 DUMMY: ATTACK', '#ff1744');
      } else if (e.code === 'Digit4') {
        this.trainingDummyController.state = 'dodge';
        this.sound.playLightHit();
        this.p2.showStatus('🤖 DUMMY: DODGE', '#00e676');
      } else if (e.code === 'KeyR') {
        this.sound.playHeavyHit();
        this.startRound(1);
        return;
      }
    }
    if ((e.code === 'KeyR' || e.code === 'Enter' || e.code === 'Space') && (this.isMatchOver || this.roundPhase === ROUND_STATES.MATCH_OVER)) {
      this.sound.playLightHit();
      this.startMatch();
      return;
    }
    if ((e.code === 'KeyM' || e.code === 'KeyC') && (this.isMatchOver || this.roundPhase === ROUND_STATES.MATCH_OVER)) {
      this.sound.playLightHit();
      this.currentScreen = GAME_SCREENS.CHAR_SELECT;
      this.charSelectStep = 0;
      return;
    }
    if (e.code === 'Escape') {
      if (this.leaderboardManager && this.leaderboardManager.isOpen) {
        this.leaderboardManager.close();
        return;
      }
      this.togglePause();
      return;
    }
  }

  handleMatchClick(x, y) {
    if (this.isMatchOver || this.roundPhase === ROUND_STATES.MATCH_OVER) {
      // Rematch button (x: 100 to 330, y: 545 to 605)
      if (x >= 100 && x <= 330 && y >= 545 && y <= 605) {
        this.sound.playLightHit();
        this.startMatch();
      }
      // Character Select button (x: 365 to 595, y: 545 to 605)
      else if (x >= 365 && x <= 595 && y >= 545 && y <= 605) {
        this.sound.playLightHit();
        this.currentScreen = GAME_SCREENS.CHAR_SELECT;
        this.charSelectStep = 0;
      }
      // Main Menu button (x: 630 to 860, y: 545 to 605)
      else if (x >= 630 && x <= 860 && y >= 545 && y <= 605) {
        this.sound.playBlock();
        this.currentScreen = GAME_SCREENS.LANDING;
        if (this.landingScene) this.landingScene.show();
      }
    }
  }

  submitMatchToDatabase() {
    if (!this.winner) return;
    try {
      const isP1Winner = this.winner === this.p1;
      const winnerId = isP1Winner ? 'P1' : 'P2';
      const loser = isP1Winner ? this.p2 : this.p1;
      const stats = this.matchStats[winnerId] || { totalDamage: 300, maxCombo: 5 };
      const score = Math.round(stats.totalDamage * 8 + stats.maxCombo * 120 + (isP1Winner ? this.p1RoundWins : this.p2RoundWins) * 500);
      const playerName = isP1Winner ? (this.p1.config.displayName || 'P1 Champion') : (this.selectedMode === GAME_MODES.PVC ? 'SRM Campus AI' : 'P2 Challenger');

      // 1. Submit high score to Leaderboard
      supabaseService.submitScore({
        playerName: playerName,
        fighterId: this.winner.config.id,
        fighterName: this.winner.config.displayName,
        score: score,
        damageDealt: stats.totalDamage,
        maxCombo: stats.maxCombo,
        roundsWon: isP1Winner ? this.p1RoundWins : this.p2RoundWins,
        arenaId: this.stage ? this.stage.id : 'techpark'
      });

      // 2. Log full telemetry to Matches table
      supabaseService.logMatch({
        mode: this.selectedMode,
        winner: playerName,
        loser: loser ? loser.config.displayName : 'Opponent',
        p1Fighter: this.p1 ? this.p1.config.id : 'topper',
        p2Fighter: this.p2 ? this.p2.config.id : 'backbencher',
        p1Damage: this.matchStats.P1.totalDamage,
        p2Damage: this.matchStats.P2.totalDamage,
        maxCombo: Math.max(this.matchStats.P1.maxCombo, this.matchStats.P2.maxCombo),
        arenaId: this.stage ? this.stage.id : 'techpark',
        duration: Math.max(10, 99 - this.matchTimer)
      });
    } catch (err) {
      console.warn('[Database submitMatchToDatabase Error]', err);
    }
  }

  // =========================================================================
  // MAIN UPDATE LOOP
  // =========================================================================
  update(dt) {
    this.input.pollGamepads();

    // Check Gamepad Start / Pause button (Button 9)
    if (this.currentScreen === GAME_SCREENS.MATCH) {
      if (this.input.currGamepadButtons[0]?.[9] && !this.input.prevGamepadButtons[0]?.[9]) {
        this.togglePause();
      }
    }

    if (this.isPaused) {
      this.input.endFrame();
      return;
    }

    if (this.currentScreen === GAME_SCREENS.LANDING) {
      this.screenShake.update();
      if (this.landingScene) this.landingScene.update(dt);
      this.input.endFrame();
      return;
    }

    if (this.currentScreen === GAME_SCREENS.MODE_SELECT) {
      this.particles.update();
      this.input.endFrame();
      return;
    }

    if (this.currentScreen === GAME_SCREENS.CHAR_SELECT) {
      if (this.charSelectScreen && this.charSelectScreen.classList.contains('hidden')) {
        this.openCharSelect();
      }
      this.particles.update();
      this.input.endFrame();
      return;
    } else {
      if (this.charSelectScreen && !this.charSelectScreen.classList.contains('hidden')) {
        this.closeCharSelect();
      }
    }

    if (this.currentScreen === GAME_SCREENS.STAGE_SELECT) {
      if (this.stageSelectManager && this.stageSelectManager.screenEl && this.stageSelectManager.screenEl.classList.contains('hidden')) {
        this.openStageSelect();
      }
      this.particles.update();
      this.input.endFrame();
      return;
    } else {
      if (this.stageSelectManager && this.stageSelectManager.screenEl && !this.stageSelectManager.screenEl.classList.contains('hidden')) {
        this.closeStageSelect();
      }
    }

    // Screen Flash Decay
    if (this.screenFlashFrames > 0) {
      this.screenFlashFrames--;
    }

    // Post-Processing Update & Dynamic Combat Vignette
    if (this.postProcess) {
      this.postProcess.update(dt);
      if (this.p1 && this.p2) {
        if ((this.p1.rage && this.p1.rage.isRage) || (this.p2.rage && this.p2.rage.isRage)) {
          this.postProcess.setVignette(0.5, '#660000', 8);
        } else if (this.p1.health / this.p1.maxHealth < 0.25 || this.p2.health / this.p2.maxHealth < 0.25) {
          this.postProcess.setVignette(0.38, '#440000', 8);
        }
      }
    }

    // MATCH SCREEN UPDATE BY ROUND PHASE
    if (this.roundPhase === ROUND_STATES.START) {
      this.phaseTimer--;
      // Keep stage animations updating
      this.stage.update(dt, [this.p1, this.p2], this.particles, this.sound);
      if (this.phaseTimer <= 0) {
        this.roundPhase = ROUND_STATES.FIGHT;
        this.sound.announceFight();
      }
    } else if (this.roundPhase === ROUND_STATES.FIGHT) {
      // Dynamic combat music tension
      if (this.p1 && this.p2) {
        const isDanger = (this.p1.health / this.p1.maxHealth < 0.28) || (this.p2.health / this.p2.maxHealth < 0.28);
        this.sound.setMusicDanger(isDanger);
        const maxCombo = Math.max(this.combos?.P1?.hits || 0, this.combos?.P2?.hits || 0);
        if (typeof this.sound.updateMusicIntensity === 'function') {
          this.sound.updateMusicIntensity(this.p1.health, this.p2.health, maxCombo);
        }
      }
      // Round Timer (60 frames = 1 second)
      this.matchTimerFrames++;
      if (this.matchTimerFrames >= 60) {
        this.matchTimerFrames = 0;
        this.matchTimer--;
        if (this.matchTimer <= 0) {
          this.matchTimer = 0;
          this.checkTimeOut();
        }
      }

      // Update Stage Hazards
      this.stage.update(dt, [this.p1, this.p2], this.particles, this.sound);

      // Update Nexus Modifiers (Tech Pod Drops & Buffs)
      if (this.nexusModifiers) {
        this.nexusModifiers.update(this.p1, this.p2, this.stage, this.particles, this.sound);
      }

      // Slippery Zone
      if (this.stage.slipperyZone) {
        const sz = this.stage.slipperyZone;
        [this.p1, this.p2].forEach(f => {
          if (f.x >= sz.x && f.x <= sz.x + sz.w && f.isGrounded) {
            f.vx *= 1.35;
          }
        });
      }

      // Slow-motion 50% speed throttling during impact slow-mo
      if (this.slowMotionTimer > 0) {
        this.slowMotionTimer--;
        // Update at 50% frequency during slow-mo for visceral impact readability
        if (this.slowMotionTimer % 2 !== 0) {
          this.particles.update();
          this.screenShake.update();
          this.input.endFrame();
          return;
        }
      }

      // Update P1 (always human input)
      this.p1.update(dt, this.input, this.p2, this.stage, this.particles, this.sound);

      // Update P2: Training Mode, AI bot, or human input
      if (this.selectedMode === GAME_MODES.TRAINING) {
        this.trainingDummyController.update();
        this.p2.update(dt, this.trainingDummyController, this.p1, this.stage, this.particles, this.sound);

        // Continuous Practice auto-refill
        if (this.p1.health < 25) {
          this.p1.health = this.p1.maxHealth;
          this.p1.displayedHealth = this.p1.maxHealth;
        }
        if (this.p2.health < 25) {
          this.p2.health = this.p2.maxHealth;
          this.p2.displayedHealth = this.p2.maxHealth;
        }
      } else if (this.selectedMode === GAME_MODES.PVC) {
        this.botController.update(this.p2, this.p1, this.stage);
        this.p2.update(dt, this.botController, this.p1, this.stage, this.particles, this.sound);
      } else {
        this.p2.update(dt, this.input, this.p1, this.stage, this.particles, this.sound);
      }

      // Stage Bounds Clamping & Push
      CollisionSystem.clampFighter(this.p1, this.stage.minX, this.stage.maxX, this.stage.groundY);
      CollisionSystem.clampFighter(this.p2, this.stage.minX, this.stage.maxX, this.stage.groundY);
      CollisionSystem.resolveBodyPush(this.p1, this.p2);

      // Combat Collision Detection
      this.resolveCombat(this.p1, this.p2, 'P1');
      this.resolveCombat(this.p2, this.p1, 'P2');

      // Update Combos
      this.updateCombos();

      // Check Round KO (Skip KO sequence in Training mode)
      if (this.selectedMode !== GAME_MODES.TRAINING && (this.p1.health <= 0 || this.p2.health <= 0)) {
        const rWinner = this.p1.health > this.p2.health ? this.p1 : this.p2;
        this.handleRoundKO(rWinner);
      }
    } else if (this.roundPhase === ROUND_STATES.KO) {
      // 2s slow-mo freeze
      this.phaseTimer--;
      // Let airborne fighters gently settle
      if (!this.p1.isGrounded) {
        this.p1.vy += 0.3;
        this.p1.y = Math.min(this.stage.groundY, this.p1.y + this.p1.vy * 0.3);
      }
      if (!this.p2.isGrounded) {
        this.p2.vy += 0.3;
        this.p2.y = Math.min(this.stage.groundY, this.p2.y + this.p2.vy * 0.3);
      }

      if (this.phaseTimer <= 0) {
        if (this.p1RoundWins >= 2 || this.p2RoundWins >= 2) {
          this.roundPhase = ROUND_STATES.MATCH_OVER;
          this.isMatchOver = true;
          this.winner = this.p1RoundWins >= 2 ? this.p1 : this.p2;
          this.submitMatchToDatabase();
          const isP1 = this.winner === this.p1;
          const winnerName = this.winner ? (this.winner.config.name || (isP1 ? 'Player 1' : 'Player 2')) : '';
          this.sound.announceWinner(winnerName, isP1);
        } else {
          this.roundPhase = ROUND_STATES.ROUND_OVER;
          this.phaseTimer = 120; // 2 seconds round winner banner
        }
      }
    } else if (this.roundPhase === ROUND_STATES.ROUND_OVER) {
      this.phaseTimer--;
      if (this.phaseTimer <= 0) {
        this.startRound(this.currentRound + 1);
      }
    }

    this.particles.update();
    this.screenShake.update();
    this.input.endFrame();

    // Decay health bar reverb timers
    if (this.p1 && this.p1.healthBarReverbTimer > 0) this.p1.healthBarReverbTimer--;
    if (this.p2 && this.p2.healthBarReverbTimer > 0) this.p2.healthBarReverbTimer--;

  }

  handleRoundKO(winner) {
    this.roundWinner = winner;
    if (winner === this.p1) {
      this.p1RoundWins++;
    } else if (winner === this.p2) {
      this.p2RoundWins++;
    }
    this.roundPhase = ROUND_STATES.KO;
    this.phaseTimer = 110;
    this.screenShake.shake(18, 25);
    this.screenFlashFrames = 4;
    this.sound.playHeavyHit();
    this.sound.announceKO();
    this.sound.stopMusic();
  }

  resolveCombat(attacker, defender, attackerId) {
    if (attacker.activeHitboxes.length === 0 || attacker.hasHitThisMove) return;
    if (defender.invulnerableFrames > 0) return;

    const defHurtbox = defender.hurtbox.getWorldBounds(defender.x, defender.y, defender.facing);

    for (const hb of attacker.activeHitboxes) {
      const atkBox = hb.getWorldBounds(attacker.x, attacker.y, attacker.facing);

      if (CollisionSystem.checkAABB(atkBox, defHurtbox)) {
        attacker.hasHitThisMove = true;
        const props = hb.props;
        const impactX = (atkBox.x + atkBox.w / 2 + defHurtbox.x + defHurtbox.w / 2) / 2;
        const impactY = (atkBox.y + atkBox.h / 2 + defHurtbox.y + defHurtbox.h / 2) / 2;

        // --- 1. PARRY SYSTEM CHECK (3-4 frame precision deflection) ---
        if (defender.parry && defender.parry.checkParryWindow()) {
          defender.parry.onSuccessfulParry();
          attacker.hitstopTimer = 10;
          defender.hitstopTimer = 5;
          this.slowMotionTimer = 16;
          this.sound.playMetalClang();

          this.particles.spawnHitSparks(impactX, impactY, '#00e5ff', 35);
          this.particles.spawnHitSparks(impactX, impactY, '#ffd700', 25);
          this.particles.spawnDamageText(impactX, impactY - 24, 'PARRY!', '#00e5ff', '#00263b');
          defender.showStatus('✨ PERFECT PARRY! (+20% METER)', '#00e5ff');
          this.screenShake.shake(6, 14);
          break;
        }

        // --- 2. BLOCK SYSTEM CHECK ---
        const isFacingAttacker = (defender.facing === 1 && attacker.x > defender.x) ||
                                 (defender.facing === -1 && attacker.x < defender.x);
        const blocked = defender.isBlocking && isFacingAttacker && props.blockable;

        // Dynamic Hitstop freeze based on character & move archetype
        const hitStopFrames = (attacker.currentMove && attacker.currentMove.hitStop !== undefined)
          ? attacker.currentMove.hitStop
          : (attacker.config.hitStop !== undefined ? attacker.config.hitStop : 5);
        attacker.hitstopTimer = hitStopFrames;
        defender.hitstopTimer = hitStopFrames;

        // --- 3. COUNTER-HIT SYSTEM CHECK (+20% damage & +5 hitstun on whiff/startup punish) ---
        const isCounter = !blocked && CounterHitSystem.isCounterHit(attacker, defender);
        const counterMultiplier = isCounter ? 1.20 : 1.0;
        const extraHitstun = isCounter ? 5 : 0;

        // --- 4. COMBO TIER MULTIPLIER & COMBO DAMAGE SCALING ---
        const comboHits = this.combos[attackerId].hits + 1;
        let tierMultiplier = 1.0;
        for (const tier of COMBO_LEVELS) {
          if (comboHits >= tier.minHits) {
            tierMultiplier = tier.multiplier;
            break;
          }
        }

        const scalingMultiplier = (this.combos[attackerId] && this.combos[attackerId].scaling && typeof this.combos[attackerId].scaling.getDamageMultiplier === 'function')
          ? this.combos[attackerId].scaling.getDamageMultiplier()
          : 1.0;
        const finalDamage = Math.max(1, Math.round(props.damage * tierMultiplier * counterMultiplier * scalingMultiplier));

        // Knockback vector
        const kbX = (attacker.x < defender.x ? 1 : -1) * Math.abs(props.knockback.x);
        const kbY = props.knockback.y;

        defender.takeDamage(finalDamage, props.hitstun + extraHitstun, { x: kbX, y: kbY }, blocked);

        // Special Effects
        if (props.specialEffect === 'freeze' && !blocked) {
          defender.applyFreeze(props.freezeDuration || 90);
          const ultLine = attacker.config?.dialogue?.ultimate || 'Viva Voce Freeze!';
          attacker.showStatus(`"${ultLine}"`, '#ffd700');
        }

        // Floating Damage Number
        const damageBorder = blocked ? '#37474f' : (isCounter ? '#b71c1c' : '#ff1744');
        const damageFill = blocked ? '#90a4ae' : (isCounter ? '#ffd700' : '#ffffff');
        this.particles.spawnDamageText(impactX, impactY - 18, finalDamage, damageFill, damageBorder);

        // Stats tracking
        this.matchStats[attackerId].totalDamage += finalDamage;
        this.matchStats[attackerId].hits++;

        if (blocked) {
          this.sound.playBlock(impactX);
          this.particles.spawnBlockSparks(impactX, impactY);
          this.screenShake.shake(3, 8);
          if (this.stage && typeof this.stage.onFighterHit === 'function') {
            this.stage.onFighterHit(impactX, impactY, false);
          }
          if (window.CampusVisuals) {
            window.CampusVisuals.onBlock(defender);
          }
        } else {
          // Trigger slow motion
          this.slowMotionTimer = 15;

          // Reactive venue hit flash
          if (this.stage && typeof this.stage.onFighterHit === 'function') {
            this.stage.onFighterHit(impactX, impactY, props.damage >= 18);
          }

          // Impact shockwave ring
          const ringColor = attacker.config.colors.glow || attacker.config.colors.accent || '#ffd700';
          const maxRadius = props.damage >= 15 ? 115 : 95;
          this.particles.spawnImpactRing(impactX, impactY, ringColor, maxRadius, 15);

          // Counter-hit banner popup & glass shatter effect
          if (isCounter) {
            attacker.showStatus('💥 COUNTER-HIT! +20%', '#ff1744');
            this.screenFlashFrames = 4;
            this.screenShake.shake(9, 16);
            // Glass shatter replaces normal sparks on counter-hit
            this.particles.spawnGlassShatter(impactX, impactY);
          }

          const isHeavyHit = props.damage >= 14 || (attacker.currentMove && attacker.currentMove.type === 'ultimate');

          // 3-Layer physical hit stack with stereo spatialization & combo riser
          if (this.sound && this.sound.audioManager) {
            const hitType = isCounter ? 'counter' : (isHeavyHit ? 'heavy' : 'light');
            this.sound.audioManager.playHit(hitType, comboHits, impactX);
          }

          // Character-specific signature procedural audio & visual sparks
          this.sound.playCharacterHitSound(attacker.config.id, attacker.currentMove, isHeavyHit, false);
          this.particles.spawnCharacterSparks(attacker.config.id, impactX, impactY, ringColor, isHeavyHit);

          if (window.CampusVisuals) {
            const meta = window.CampusVisuals.CHARACTERS[attacker.charId] || window.CampusVisuals.CHARACTERS.topper;
            window.CampusVisuals.onHit(impactX, impactY, isHeavyHit, meta);
          }

          // Screen shake & hit flash based on attack type
          if (props.damage >= 25) {
            this.screenShake.shake(12, 25);
            this.screenFlashFrames = 4;
          } else if (props.damage >= 14) {
            this.screenShake.shake(8, 16);
            this.screenFlashFrames = 4;
          } else {
            this.screenShake.shake(5, 12);
            this.screenFlashFrames = 3;
          }

          // Chromatic aberration crush on heavy damage or ultimate
          if (props.damage >= 14 || (props.specialEffect === 'freeze')) {
            this.screenShake.applyChromaticCrush(props.damage >= 25 ? 0.9 : 0.6);
            if (this.postProcess) {
              this.postProcess.triggerGodRays(impactX, impactY, ringColor, props.damage >= 25 ? 10 : 6);
              this.postProcess.setVignette(props.damage >= 25 ? 0.55 : 0.35, '#000000', 18);
            }
          }

          // Health bar reverb on heavy hit
          if (props.damage >= 14) {
            defender.healthBarReverbTimer = 8;
          }


          // Register combo & update combo scaling safely
          this.combos[attackerId].hits++;
          this.combos[attackerId].timer = 60; // 60-frame timeout
          this.combos[attackerId].damage += finalDamage;
          if (this.combos[attackerId] && this.combos[attackerId].scaling) {
            if (typeof this.combos[attackerId].scaling.registerHit === 'function') {
              this.combos[attackerId].scaling.registerHit();
            } else if (typeof this.combos[attackerId].scaling.onHit === 'function') {
              this.combos[attackerId].scaling.onHit();
            }
          }
          if (this.combos[attackerId].hits > this.matchStats[attackerId].maxCombo) {
            this.matchStats[attackerId].maxCombo = this.combos[attackerId].hits;
          }

          // Defender combo breaks
          const defenderId = attackerId === 'P1' ? 'P2' : 'P1';
          this.combos[defenderId].hits = 0;
          this.combos[defenderId].timer = 0;
          if (this.combos[defenderId] && this.combos[defenderId].scaling && typeof this.combos[defenderId].scaling.reset === 'function') {
            this.combos[defenderId].scaling.reset();
          }
        }
        break;
      }
    }
  }

  updateCombos() {
    for (const pid of ['P1', 'P2']) {
      if (this.combos[pid].timer > 0) {
        this.combos[pid].timer--;
        if (this.combos[pid].timer <= 0) {
          this.combos[pid].hits = 0;
          this.combos[pid].damage = 0;
          if (this.combos[pid] && this.combos[pid].scaling && typeof this.combos[pid].scaling.reset === 'function') {
            this.combos[pid].scaling.reset();
          }
        }
      }
    }
  }

  checkTimeOut() {
    let rWinner = null;
    if (this.p1.health > this.p2.health) rWinner = this.p1;
    else if (this.p2.health > this.p1.health) rWinner = this.p2;
    this.handleRoundKO(rWinner);
  }

  // =========================================================================
  // MAIN RENDER LOOP
  // =========================================================================
  render(alpha) {
    const { ctx } = this;
    try {
      if (this.currentScreen === GAME_SCREENS.LANDING) {
        if (this.landingScene) {
          this.landingScene.renderBackground(ctx);
        }
        return;
      }

      if (this.currentScreen === GAME_SCREENS.MODE_SELECT) {
        this.renderModeSelect(ctx);
        return;
      }

      if (this.currentScreen === GAME_SCREENS.CHAR_SELECT) {
        this.renderCharSelect(ctx);
        return;
      }

      if (this.currentScreen === GAME_SCREENS.STAGE_SELECT) {
        this.renderStageSelect(ctx);
        return;
      }

      // MATCH RENDER
      ctx.save();
      const rawDt = 1 / 60;
      let visualDt = rawDt;
      if (window.CampusVisuals) {
        visualDt = window.CampusVisuals.beginFrame(ctx, rawDt);
      } else {
        this.screenShake.apply(ctx);
      }

      // Dynamic camera parallax tracking midpoint between fighters (zero per-frame allocations)
      if (this.p1 && this.p2) {
        this.camera.x = ((this.p1.x + this.p2.x) * 0.5 - CANVAS_WIDTH * 0.5) * 0.35;
        this.activeFighters[0] = this.p1;
        this.activeFighters[1] = this.p2;
      }

      // 1. Render Venue 3D Background with Parallax
      this.stage.render(ctx, this.camera);

      // 1.05 Sky Rim-Light (Zero GC allocation cached gradient)
      if (!this.cachedSkyRimGrad) {
        this.cachedSkyRimGrad = ctx.createLinearGradient(0, 0, 0, 240);
        this.cachedSkyRimGrad.addColorStop(0, 'rgba(41, 211, 255, 0.14)');
        this.cachedSkyRimGrad.addColorStop(0.4, 'rgba(255, 154, 46, 0.05)');
        this.cachedSkyRimGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      ctx.save();
      ctx.fillStyle = this.cachedSkyRimGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, 240);
      ctx.restore();

      // 1.1 Ultimate Spotlight Dim
      if (window.CampusVisuals) {
        window.CampusVisuals.drawDim(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      // 1.5. Render Nexus Modifiers (Holographic Tech Pods)
      if (this.nexusModifiers) {
        this.nexusModifiers.render(ctx);
      }

      // 1a. Rage Atmosphere Tint — red desaturation when either fighter is in rage
      if ((this.p1.rage && this.p1.rage.isRage) || (this.p2.rage && this.p2.rage.isRage)) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = 'rgba(180, 50, 50, 0.18)';
        ctx.fillRect(0, -400, CANVAS_WIDTH, CANVAS_HEIGHT + 400); // cover full shake range
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
      }

      // 1b. Advantage Spotlight — subtle gold radial glow follows the leading fighter
      this.renderAdvantageSpotlight(ctx);

      // 1c. Volumetric God Rays (e.g. on Ultimate or heavy impacts)
      if (this.postProcess) {
        this.postProcess.renderGodRays(ctx);
      }

      // 1d. Floor Reflections & Contact Shadows Synced to Characters
      if (this.stage && typeof this.stage.renderFighterSync === 'function') {
        this.stage.renderFighterSync(ctx, this.activeFighters, this.camera);
      }

      // 2. Render Fighters (Sprite with procedural fallback)
      let p1SpriteDrawn = false;
      let p2SpriteDrawn = false;
      if (window.CampusVisuals) {
        p1SpriteDrawn = window.CampusVisuals.drawFighter(ctx, this.p1, visualDt);
        p2SpriteDrawn = window.CampusVisuals.drawFighter(ctx, this.p2, visualDt);
      }
      if (!p1SpriteDrawn) {
        this.p1.render(ctx, this.debugHitboxes);
      }
      if (!p2SpriteDrawn) {
        this.p2.render(ctx, this.debugHitboxes);
      }

      // 2.5. Render Nexus Buff Auras & Tech Shields
      if (this.nexusModifiers) {
        this.nexusModifiers.renderFighterBuffs(ctx, this.p1, this.p2);
      }

      // 3. Render Particles & Visual FX
      if (window.CampusVisuals) {
        window.CampusVisuals.updateFX(visualDt);
        window.CampusVisuals.drawFX(ctx);
      }
      this.particles.render(ctx);

      // 3.5. Foreground Framing Elements with Occlusion Guard
      if (this.stage && typeof this.stage.renderForeground === 'function') {
        this.stage.renderForeground(ctx, this.camera, this.activeFighters);
      }
      ctx.restore();

      if (window.CampusVisuals) {
        window.CampusVisuals.endFrame(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      // Tactical Esports Screen Flash (Preserves fighter silhouette readability on heavy hits)
      if (this.screenFlashFrames > 0 && this.hitFlashScale > 0.01) {
        ctx.save();
        const flashIntensity = Math.min(0.25, this.screenFlashFrames * 0.06) * this.hitFlashScale;
        ctx.fillStyle = `rgba(255, 255, 255, ${flashIntensity})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.restore();
      }

      // Chromatic Aberration post-process (3-frame double-draw on heavy/ultimate impact)
      if (this.qualityTier !== 'low' && this.screenShake.crushIntensity > 0.05) {
        const ci = this.screenShake.crushIntensity;
        const shift = Math.round(ci * 5);
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = ci * 0.22;
        // Red channel: shifted left
        ctx.drawImage(this.canvas, -shift, 0);
        // Blue channel: shifted right
        ctx.drawImage(this.canvas, shift, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
      }

      // KO Vignette — dark radial gradient closing in on defeated fighter
      if (this.roundPhase === ROUND_STATES.KO && this.roundWinner) {
        this.renderKOVignette(ctx);
      }

      // Post-Processing Overlays (Atmospheric Vignette, CRT Scanlines, Edge Bloom)
      if (this.postProcess) {
        this.postProcess.renderAll(ctx, this.canvas, CANVAS_WIDTH, CANVAS_HEIGHT, {
          heavyHit: this.screenShake && this.screenShake.crushIntensity > 0.05
        });
      }

      // 4. In-Game HUD
      this.renderHUD(ctx);

      // 5. Round Phase Announcer Banners
      this.renderPhaseAnnouncements(ctx);

      // 6. Match Over Modal
      if (this.roundPhase === ROUND_STATES.MATCH_OVER || this.isMatchOver) {
        this.renderGameOver(ctx);
      }
    } catch (err) {
      console.error('[CampusClash Render Error]', err);
      ctx.save();
      ctx.fillStyle = '#b71c1c';
      ctx.fillRect(20, 20, CANVAS_WIDTH - 40, 100);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('RENDER ERROR: ' + err.message, 40, 60);
      ctx.font = '12px monospace';
      ctx.fillText(err.stack ? err.stack.split('\n')[1] : '', 40, 90);
      ctx.restore();
    }
  }

  // =========================================================================
  // SCREEN: MODE SELECT RENDER
  // =========================================================================
  renderModeSelect(ctx) {
    // Cyberpunk SRM Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, '#040b17');
    bgGrad.addColorStop(0.5, '#0b162c');
    bgGrad.addColorStop(1, '#02050b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Decorative grid lines
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
    ctx.restore();

    // Main Title Banner
    ctx.save();
    ctx.textAlign = 'center';

    // SRM Logo / Badge Top
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#00e5ff';
    ctx.fillText('SRM INSTITUTE OF SCIENCE & TECHNOLOGY — TECH PARK ARCADE', CANVAS_WIDTH / 2, 75);

    // Neon Game Title
    ctx.font = '900 68px "Arial Black", Impact, sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ff6b35';
    ctx.shadowBlur = 30;
    ctx.fillText('CAMPUS CLASH', CANVAS_WIDTH / 2, 155);

    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#b0bec5';
    ctx.shadowBlur = 0;
    ctx.fillText('SELECT COMBAT MODE', CANVAS_WIDTH / 2, 215);
    ctx.restore();

    // Render Mode Option Cards
    const modes = [
      {
        id: GAME_MODES.PVP,
        title: '🥊  1 VS 1 BRAWL (LOCAL TWO-PLAYER)',
        desc: 'Battle a friend on the same keyboard — Full P1 vs P2 Combat'
      },
      {
        id: GAME_MODES.PVC,
        title: '🤖  VS COMPUTER (EXPERT SRM AI)',
        desc: 'Test your reflexes against tournament-tier frame data and whiff punishes'
      },
      {
        id: GAME_MODES.TRAINING,
        title: '🥋  TRAINING DOJO (PRACTICE LAB)',
        desc: 'Practice combos, parry timing, dummy behaviors & frame data'
      }
    ];

    modes.forEach((mode, i) => {
      const isSelected = this.modeIndex === i;
      const cardX = 180;
      const cardY = 232 + i * 118;
      const cardW = 600;
      const cardH = 96;

      ctx.save();
      // Card Background
      if (isSelected) {
        ctx.fillStyle = 'rgba(0, 229, 255, 0.16)';
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 18;
      } else {
        ctx.fillStyle = 'rgba(12, 24, 48, 0.85)';
        ctx.strokeStyle = '#263238';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 0;
      }

      drawRoundRect(ctx, cardX, cardY, cardW, cardH, 12);
      ctx.fill();
      ctx.stroke();

      // Selector chevron
      if (isSelected) {
        ctx.fillStyle = '#ffd700';
        ctx.font = '900 24px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('▶', cardX - 35, cardY + 54);
      }

      // Title
      ctx.textAlign = 'left';
      ctx.font = 'bold 20px "Arial Black", sans-serif';
      ctx.fillStyle = isSelected ? '#ffffff' : '#cfd8dc';
      ctx.fillText(mode.title, cardX + 26, cardY + 40);

      // Description
      ctx.font = '13px sans-serif';
      ctx.fillStyle = isSelected ? '#ffd700' : '#78909c';
      ctx.fillText(mode.desc, cardX + 26, cardY + 70);

      ctx.restore();
    });

    // Bottom Navigation Help Strip
    ctx.save();
    ctx.fillStyle = 'rgba(6, 17, 36, 0.85)';
    ctx.fillRect(0, CANVAS_HEIGHT - 38, CANVAS_WIDTH, 38);
    ctx.font = '13px monospace';
    ctx.fillStyle = '#00e5ff';
    ctx.textAlign = 'center';
    ctx.fillText('NAVIGATE: W/S or ↑/↓ or 1/2/3  |  SELECT: SPACE / ENTER / CLICK  |  CAMPUS CLASH V3.0', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 14);
    ctx.restore();
  }

  // =========================================================================
  // SCREEN: CHARACTER SELECT RENDER (Canvas Tech Blueprint Backdrop)
  // =========================================================================
  renderCharSelect(ctx) {
    // Dark Indigo-Navy Cyberpunk Radial Gradient
    const bgGrad = ctx.createRadialGradient(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 40,
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.75
    );
    bgGrad.addColorStop(0, '#152038');
    bgGrad.addColorStop(0.5, '#0c1424');
    bgGrad.addColorStop(1, '#050912');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Subtle SRM Tech Blueprint grid lines
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridStep = 40;
    for (let x = 0; x < CANVAS_WIDTH; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // =========================================================================
  // SCREEN: VENUE / STAGE SELECT RENDER (Base Canvas Underneath DOM Overlay)
  // =========================================================================
  renderStageSelect(ctx) {
    ctx.save();
    const bgGrad = ctx.createRadialGradient(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 40,
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.75
    );
    bgGrad.addColorStop(0, '#101a30');
    bgGrad.addColorStop(0.5, '#080f1e');
    bgGrad.addColorStop(1, '#040812');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Subtle SRM Tech Blueprint grid lines
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridStep = 40;
    for (let x = 0; x < CANVAS_WIDTH; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // =========================================================================
  // =========================================================================
  // =========================================================================
  // MATCH HUD & OVERLAY RENDERING (COLLEGIATE TECH COMBAT AESTHETIC)
  // =========================================================================
  renderHUD(ctx) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const barW = 320;
    const barH = 22;
    const topY = 26;

    // Dynamically query active arena lighting for cohesive arena visual sync
    const arenaCfg = this.stage?.config?.lighting;
    const arenaRimColor = arenaCfg?.rimLight?.color || '#00e5ff';
    const arenaKeyColor = arenaCfg?.keyLight?.color || '#ffd700';
    const currArena = this.arenas[this.currentArenaIndex] || this.arenas[0];

    // --- Top Collegiate Bridge Canopy ---
    ctx.save();
    // Structural rail
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 20);
    ctx.lineTo(CANVAS_WIDTH - 30, 20);
    ctx.stroke();

    // Arena-synced circuit energy trace
    const canopyGrad = ctx.createLinearGradient(120, 20, CANVAS_WIDTH - 120, 20);
    canopyGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    canopyGrad.addColorStop(0.3, arenaRimColor);
    canopyGrad.addColorStop(0.5, arenaKeyColor);
    canopyGrad.addColorStop(0.7, arenaRimColor);
    canopyGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.strokeStyle = canopyGrad;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(140, 20);
    ctx.lineTo(CANVAS_WIDTH - 140, 20);
    ctx.stroke();
    ctx.restore();

    const p1Label = 'P1 // CADET';
    const p2Label = this.selectedMode === GAME_MODES.PVC
      ? 'CPU // EXPERT'
      : (this.selectedMode === GAME_MODES.TRAINING ? 'DUMMY // TARGET' : 'P2 // CHALLENGER');

    const p1X = 64;
    const p2X = CANVAS_WIDTH - 64 - barW;

    // --- P1 HUD (Left) ---
    this.renderHealthBar(ctx, p1X, topY, barW, barH, this.p1, p1Label, false, arenaRimColor, arenaKeyColor);
    this.renderStaminaBar(ctx, p1X, topY + barH + 4, barW, 6, this.p1, false);
    this.renderUltimateMeter(ctx, p1X, topY + barH + 13, barW * 0.78, 10, this.p1, false);

    // --- P2 HUD (Right) ---
    this.renderHealthBar(ctx, p2X, topY, barW, barH, this.p2, p2Label, true, arenaRimColor, arenaKeyColor);
    this.renderStaminaBar(ctx, p2X, topY + barH + 4, barW, 6, this.p2, true);
    this.renderUltimateMeter(ctx, CANVAS_WIDTH - 64 - barW * 0.78, topY + barH + 13, barW * 0.78, 10, this.p2, true);

    // --- Round Win Laurels (Best-of-3) --- (Hide in Training mode)
    if (this.selectedMode !== GAME_MODES.TRAINING) {
      const drawRoundStar = (starX, starY, isWon) => {
        ctx.save();
        ctx.translate(starX, starY);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const rOuter = 7;
          const rInner = 3.2;
          const rot = -Math.PI / 2;
          const a1 = rot + (i * 2 * Math.PI) / 5;
          const a2 = rot + ((i + 0.5) * 2 * Math.PI) / 5;
          if (i === 0) ctx.moveTo(Math.cos(a1) * rOuter, Math.sin(a1) * rOuter);
          else ctx.lineTo(Math.cos(a1) * rOuter, Math.sin(a1) * rOuter);
          ctx.lineTo(Math.cos(a2) * rInner, Math.sin(a2) * rInner);
        }
        ctx.closePath();
        if (isWon) {
          ctx.fillStyle = '#ffd700';
          ctx.shadowColor = '#ff9800';
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.strokeStyle = '#fff275';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.fillStyle = '#060d1c';
          ctx.fill();
          ctx.strokeStyle = '#1e3050';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.restore();
      };

      // P1 Round Stars (near center chronometer)
      drawRoundStar(398, topY + 11, this.p1RoundWins >= 1);
      drawRoundStar(418, topY + 11, this.p1RoundWins >= 2);
      ctx.save();
      ctx.font = '700 8px "Rajdhani", sans-serif';
      ctx.fillStyle = '#8ba3c7';
      ctx.textAlign = 'center';
      ctx.fillText('WINS', 408, topY - 2);

      // P2 Round Stars
      drawRoundStar(542, topY + 11, this.p2RoundWins >= 1);
      drawRoundStar(562, topY + 11, this.p2RoundWins >= 2);
      ctx.fillText('WINS', 552, topY - 2);
      ctx.restore();
    }

    // --- Center Chronometer & Arena Badge ---
    const timerW = this.selectedMode === GAME_MODES.TRAINING ? 164 : 80;
    const timerH = 50;
    const timerX = CANVAS_WIDTH / 2;
    const timerY = topY - 8 + timerH / 2;

    ctx.save();
    ctx.translate(timerX, timerY);

    // Beveled octagonal tech chassis
    const hw = timerW / 2;
    const hh = timerH / 2;
    const cut = 10;
    ctx.beginPath();
    ctx.moveTo(-hw + cut, -hh);
    ctx.lineTo(hw - cut, -hh);
    ctx.lineTo(hw, -hh + cut);
    ctx.lineTo(hw, hh - cut);
    ctx.lineTo(hw - cut, hh);
    ctx.lineTo(-hw + cut, hh);
    ctx.lineTo(-hw, hh - cut);
    ctx.lineTo(-hw, -hh + cut);
    ctx.closePath();

    ctx.fillStyle = '#050a18';
    ctx.fill();

    const isTimerDanger = this.selectedMode !== GAME_MODES.TRAINING && this.matchTimer <= 10;
    ctx.strokeStyle = isTimerDanger ? '#ff1744' : arenaKeyColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = isTimerDanger ? '#ff1744' : arenaKeyColor;
    ctx.shadowBlur = isTimerDanger ? (14 + Math.sin(performance.now() * 0.015) * 6) : 8;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.translate(-timerX, -timerY);

    if (this.selectedMode === GAME_MODES.TRAINING) {
      ctx.font = '700 11px "Orbitron", sans-serif';
      ctx.fillStyle = '#00f0ff';
      ctx.textAlign = 'center';
      ctx.fillText('🥋 TRAINING LAB', CANVAS_WIDTH / 2, topY + 8);

      ctx.font = '700 11px "Rajdhani", sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.fillText(`DUMMY: ${this.trainingDummyController.state.toUpperCase()}`, CANVAS_WIDTH / 2, topY + 28);
    } else {
      ctx.font = '700 8px "Rajdhani", sans-serif';
      ctx.fillStyle = isTimerDanger ? '#ff5252' : '#a0b8db';
      ctx.textAlign = 'center';
      ctx.fillText(`ROUND ${this.currentRound}/3`, CANVAS_WIDTH / 2, topY + 3);

      ctx.font = '900 26px "Orbitron", sans-serif';
      ctx.fillStyle = isTimerDanger ? '#ff1744' : '#ffffff';
      if (isTimerDanger) {
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 12;
      }
      ctx.textBaseline = 'middle';
      ctx.fillText(this.matchTimer.toString().padStart(2, '0'), CANVAS_WIDTH / 2, topY + 22);
    }
    ctx.restore();

    // Arena Name Badge under Timer
    ctx.save();
    ctx.font = '700 9px "Rajdhani", sans-serif';
    const bannerText = `${currArena.emoji} ${currArena.shortName || currArena.name.toUpperCase()}`;
    const textW = ctx.measureText(bannerText).width;
    const plateW = Math.max(160, textW + 28);
    const plateH = 17;
    const plateX = CANVAS_WIDTH / 2 - plateW / 2;
    const plateY = topY + 44;

    ctx.fillStyle = 'rgba(5, 10, 24, 0.94)';
    ctx.strokeStyle = arenaRimColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(plateX, plateY, plateW, plateH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = arenaRimColor;
    ctx.shadowBlur = 4;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(bannerText, CANVAS_WIDTH / 2, plateY + plateH / 2);
    ctx.restore();

    // --- Combo Counters ---
    if (this.combos.P1.hits > 1) {
      this.renderComboDisplay(ctx, 64, topY + 86, this.combos.P1);
    }
    if (this.combos.P2.hits > 1) {
      this.renderComboDisplay(ctx, CANVAS_WIDTH - 240, topY + 86, this.combos.P2);
    }

    // --- Divider Line ---
    ctx.save();
    ctx.fillStyle = 'rgba(255, 214, 2, 0.25)';
    ctx.fillRect(0, CANVAS_HEIGHT - 29, CANVAS_WIDTH, 1);
    ctx.restore();

    // --- Controls Guide Strip ---
    ctx.save();
    ctx.fillStyle = 'rgba(5, 9, 20, 0.95)';
    ctx.fillRect(0, CANVAS_HEIGHT - 28, CANVAS_WIDTH, 28);
    ctx.font = '700 11px "Rajdhani", sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'center';

    if (this.selectedMode === GAME_MODES.TRAINING) {
      ctx.fillText('TRAINING LAB: [1] Stand  [2] Block  [3] Attack  [4] Dodge  |  [R] Reset Match  |  [ESC] Exit', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 10);
    } else if (this.selectedMode === GAME_MODES.PVP) {
      ctx.fillText('P1: WASD+J(Atk)/K(Hvy)/L(Shield)/Space(Dodge)  |  P2: ARROWS+1/2/3/0 or I/O/P/Shift  |  H: Debug  |  ESC: Menu', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 10);
    } else {
      ctx.fillText('P1: WASD=Move | J=Light Atk | K=Heavy Atk | L=Hex Shield (Parry) | Space=Dodge | J+K=Ultimate | ESC: Menu', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 10);
    }
    ctx.restore();

    ctx.restore(); // restore top HUD save
  }

  renderStaminaBar(ctx, x, y, w, h, fighter, isRightAligned) {
    if (!fighter.stamina) return;

    ctx.save();
    const st = fighter.stamina;
    const pct = Math.min(1, Math.max(0, st.current / st.max));
    const fillW = Math.round(w * pct);

    // Background housing
    ctx.fillStyle = '#060c18';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#152540';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Color logic
    let barColor = '#00e5ff';
    if (st.isBroken) {
      barColor = '#ff1744';
      ctx.shadowColor = '#ff1744';
      ctx.shadowBlur = 8 + Math.sin(performance.now() * 0.02) * 5;
    } else if (pct < 0.20) {
      barColor = '#ff5252';
      ctx.shadowColor = '#ff5252';
      ctx.shadowBlur = 5;
    } else if (pct < 0.50) {
      barColor = '#ffd600';
    }

    ctx.fillStyle = barColor;
    if (isRightAligned) {
      ctx.fillRect(x + w - fillW, y, fillW, h);
    } else {
      ctx.fillRect(x, y, fillW, h);
    }

    // Status warning text if low/broken
    if (st.isBroken) {
      ctx.font = '900 8px "Orbitron", sans-serif';
      ctx.fillStyle = '#ff1744';
      ctx.textAlign = isRightAligned ? 'right' : 'left';
      ctx.fillText('⚠️ STAMINA BREAK!', isRightAligned ? x + w : x, y + h + 8);
    } else if (pct < 0.20) {
      ctx.font = '700 8px "Rajdhani", sans-serif';
      ctx.fillStyle = '#ff9100';
      ctx.textAlign = isRightAligned ? 'right' : 'left';
      ctx.fillText('⚠️ LOW STAMINA', isRightAligned ? x + w : x, y + h + 8);
    }
    ctx.restore();
  }

  renderHealthBar(ctx, x, y, w, h, fighter, roleLabel, isRightAligned, arenaRimColor, arenaKeyColor) {
    const charEmojiMap = {
      topper: '🎓',
      backbencher: '🔥',
      hosteler: '🍲',
      senior: '☕',
      placementWarrior: '💼',
      sportsStar: '⚡',
      cypher: '💻',
      gavel: '⚖️',
      bolt: '🏃',
      palette: '🎨'
    };

    const isLowHP = (fighter.health / fighter.maxHealth) < 0.25;
    const accentColor = fighter.config.colors.accent || (fighter.config.id === 'topper' ? '#ffd602' : '#29d3ff');

    ctx.save();

    // --- 1. Character Portrait (Hexagonal Cyber-Collegiate Badge) ---
    const portraitX = isRightAligned ? x + w + 30 : x - 30;
    const portraitY = y + h / 2 + 5;
    const portraitR = 23;

    ctx.save();
    ctx.translate(portraitX, portraitY);

    // Outer rotating tech ring
    ctx.beginPath();
    ctx.arc(0, 0, portraitR + 4, 0, Math.PI * 2);
    ctx.strokeStyle = isLowHP ? '#ff1744' : (arenaRimColor || accentColor);
    ctx.lineWidth = 1.2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Hexagonal clipping frame
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const hx = Math.cos(angle) * portraitR;
      const hy = Math.sin(angle) * portraitR;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();

    ctx.fillStyle = '#050a1c';
    ctx.fill();

    ctx.save();
    ctx.clip();
    const pImg = window.CampusVisuals ? window.CampusVisuals.getPortrait(fighter.config.id) : null;
    if (pImg && pImg.complete && pImg.naturalWidth > 0) {
      ctx.drawImage(pImg, -portraitR, -portraitR, portraitR * 2, portraitR * 2);
    } else {
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(charEmojiMap[fighter.config.id] || '🥊', 0, 1);
    }
    ctx.restore();

    // Hex outer border
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = isLowHP ? '#ff1744' : accentColor;
    ctx.shadowColor = isLowHP ? '#ff1744' : accentColor;
    ctx.shadowBlur = isLowHP ? (16 + Math.sin(performance.now() * 0.015) * 8) : 8;
    ctx.stroke();

    ctx.restore(); // restore portrait translate

    // --- 2. Fighter Name & Academic Department Tag ---
    ctx.save();
    ctx.textAlign = isRightAligned ? 'right' : 'left';

    // Role & Name line
    const nameY = y - 7;
    ctx.font = '900 13px "Orbitron", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 4;
    const nameStr = `${fighter.config.displayName.toUpperCase()}`;
    const tagX = isRightAligned ? x + w : x;
    ctx.fillText(nameStr, tagX, nameY);

    // Academic Dept / Tagline
    ctx.font = '700 10px "Rajdhani", sans-serif';
    ctx.fillStyle = accentColor;
    ctx.shadowBlur = 0;
    const deptStr = `[ ${roleLabel} • ${fighter.config.tagline || 'COLLEGIATE WARRIOR'} ]`;
    const nameW = ctx.measureText(nameStr).width;

    if (isRightAligned) {
      ctx.fillText(deptStr, x + w - nameW - 12, nameY);
    } else {
      ctx.fillText(deptStr, x + nameW + 12, nameY);
    }

    // --- 3. Numerical HP Display ---
    ctx.font = '700 11px "Orbitron", sans-serif';
    ctx.fillStyle = isLowHP ? '#ff5252' : '#ffffff';
    ctx.textAlign = isRightAligned ? 'left' : 'right';
    const curHp = Math.ceil(Math.max(0, fighter.health));
    const hpPct = Math.round(Math.max(0, fighter.health / fighter.maxHealth) * 100);
    ctx.fillText(`${curHp} / ${fighter.maxHealth} HP [${hpPct}%]`, isRightAligned ? x : x + w, nameY);
    ctx.restore();

    // --- 4. Chamfered Carbon-Alloy Housing ---
    const chamfer = 10;
    const barPath = new Path2D();
    if (isRightAligned) {
      // Chamfer on top-left
      barPath.moveTo(x + chamfer, y);
      barPath.lineTo(x + w, y);
      barPath.lineTo(x + w, y + h);
      barPath.lineTo(x, y + h);
      barPath.lineTo(x, y + chamfer);
      barPath.closePath();
    } else {
      // Chamfer on bottom-right
      barPath.moveTo(x, y);
      barPath.lineTo(x + w, y);
      barPath.lineTo(x + w - chamfer, y + h);
      barPath.lineTo(x, y + h);
      barPath.closePath();
    }

    // Deep carbon background
    ctx.fillStyle = '#060d1a';
    ctx.fill(barPath);

    // Clip to bar path for internal contents
    ctx.save();
    ctx.clip(barPath);

    // Subtle diagonal tech hash pattern on empty background
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let hx = x - 20; hx < x + w + 20; hx += 8) {
      ctx.beginPath();
      ctx.moveTo(hx, y);
      ctx.lineTo(hx + 10, y + h);
      ctx.stroke();
    }

    // --- 5. White / Cream Damage Ghost Lag Bar ---
    const lagPct = Math.min(1, Math.max(0, (fighter.displayedHealth !== undefined ? fighter.displayedHealth : fighter.health) / fighter.maxHealth));
    const lagFillW = Math.round(w * lagPct);
    ctx.fillStyle = 'rgba(255, 235, 175, 0.82)';
    if (isRightAligned) {
      ctx.fillRect(x + w - lagFillW, y, lagFillW, h);
    } else {
      ctx.fillRect(x, y, lagFillW, h);
    }

    // --- 6. Active Health Fill with Dynamic Energy Gradient ---
    const pct = Math.min(1, Math.max(0, fighter.health / fighter.maxHealth));
    const fillW = Math.round(w * pct);
    const fillGrad = ctx.createLinearGradient(x, y, x + w, y);

    if (pct > 0.5) {
      // High HP: Collegiate Emerald-Cyan
      fillGrad.addColorStop(0, '#00f0ff');
      fillGrad.addColorStop(0.4, '#10b981');
      fillGrad.addColorStop(1, '#059669');
    } else if (pct > 0.25) {
      // Medium HP: Tactical Amber Overdrive
      fillGrad.addColorStop(0, '#ffd23f');
      fillGrad.addColorStop(0.5, '#f59e0b');
      fillGrad.addColorStop(1, '#d97706');
    } else {
      // Low HP: Core Meltdown Red
      fillGrad.addColorStop(0, '#ff4b3a');
      fillGrad.addColorStop(0.5, '#dc2626');
      fillGrad.addColorStop(1, '#991b1b');
    }

    ctx.fillStyle = fillGrad;
    if (isRightAligned) {
      ctx.fillRect(x + w - fillW, y, fillW, h);
    } else {
      ctx.fillRect(x, y, fillW, h);
    }

    // --- 7. Tactical 10% Graduation Notches ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    for (let i = 1; i <= 9; i++) {
      const segX = x + (w * (i * 0.10));
      ctx.fillRect(segX, y, i === 5 ? 2 : 1, h);
    }

    // --- 8. Specular Glass Highlight Strip ---
    const highlightGrad = ctx.createLinearGradient(x, y, x, y + h * 0.45);
    highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = highlightGrad;
    ctx.fillRect(x, y, w, h * 0.45);

    ctx.restore(); // restore clip

    // --- 9. Metallic Housing Stroke with Corner Brackets ---
    ctx.strokeStyle = '#1e3a6a';
    ctx.lineWidth = 1.5;
    ctx.stroke(barPath);

    // Tactical arena-accented brackets
    ctx.save();
    ctx.strokeStyle = arenaRimColor || '#00e5ff';
    ctx.lineWidth = 2;
    if (isRightAligned) {
      // Top-right and bottom-left brackets
      ctx.beginPath();
      ctx.moveTo(x + w - 12, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + 8);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + 12, y + h);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x, y + h - 8);
      ctx.stroke();
    } else {
      // Top-left and bottom-right brackets
      ctx.beginPath();
      ctx.moveTo(x + 12, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + 8);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + w - 12, y + h);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w, y + h - 8);
      ctx.stroke();
    }
    ctx.restore();

    ctx.restore(); // restore initial save
  }

  renderUltimateMeter(ctx, x, y, w, h, fighter, isRightAligned) {
    ctx.save();

    const pct = Math.min(1, fighter.ultimateMeter / fighter.maxUltimate);
    const filledSegments = Math.floor(pct * 10);
    const isFull = filledSegments === 10;
    const accentColor = fighter.config.colors.accent || '#00e5ff';

    // Label
    ctx.font = '700 8px "Orbitron", sans-serif';
    ctx.fillStyle = isFull ? '#ffd700' : '#8fa4c4';
    ctx.textAlign = isRightAligned ? 'right' : 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('OVERDRIVE', isRightAligned ? x + w : x, y + h / 2);

    const segStartX = isRightAligned ? x : x + 62;
    const segTotalW = w - 62;
    const segCount = 10;
    const gap = 3;
    const segW = (segTotalW - (segCount - 1) * gap) / segCount;

    for (let i = 0; i < segCount; i++) {
      const idx = isRightAligned ? (segCount - 1 - i) : i;
      const segX = segStartX + i * (segW + gap);
      const isFilled = idx < filledSegments;

      // Angled parallelogram segment
      ctx.beginPath();
      const slant = 3;
      ctx.moveTo(segX + slant, y);
      ctx.lineTo(segX + segW + slant, y);
      ctx.lineTo(segX + segW, y + h);
      ctx.lineTo(segX, y + h);
      ctx.closePath();

      if (isFilled) {
        ctx.fillStyle = isFull ? '#ffd700' : accentColor;
        if (isFull) {
          ctx.shadowColor = '#fe6b00';
          ctx.shadowBlur = 8 + Math.sin(performance.now() * 0.015) * 4;
        } else {
          ctx.shadowColor = accentColor;
          ctx.shadowBlur = 4;
        }
        ctx.fill();
      } else {
        ctx.fillStyle = '#060c18';
        ctx.fill();
        ctx.strokeStyle = '#182b48';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    if (isFull) {
      ctx.font = '900 9px "Orbitron", sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ff6b00';
      ctx.shadowBlur = 10;
      ctx.textAlign = isRightAligned ? 'right' : 'left';
      ctx.fillText('⚡ OVERDRIVE READY [J+K] ⚡', isRightAligned ? x + w : x, y + h + 11);
    }
    ctx.restore();
  }

  renderComboDisplay(ctx, x, y, combo) {
    if (combo.hits < 2) return;
    
    let tier = COMBO_LEVELS[COMBO_LEVELS.length - 1];
    for (const t of COMBO_LEVELS) {
      if (combo.hits >= t.minHits) {
        tier = t;
        break;
      }
    }

    const shakeOffset = combo.hits >= 5 ? Math.sin(performance.now() * 0.04) * 3 : 0;
    
    ctx.save();
    ctx.translate(shakeOffset, shakeOffset);

    // Label above
    ctx.font = '900 15px "Orbitron", sans-serif';
    ctx.fillStyle = tier.color;
    ctx.shadowColor = tier.color;
    ctx.shadowBlur = 8;
    ctx.textAlign = 'left';
    const label = combo.hits >= 10 ? 'GODLIKE!' : (combo.hits >= 7 ? 'SMOKIN!' : 'COMBO!');
    ctx.fillText(label, x, y - 10);

    // Hit count
    ctx.font = '900 38px "Orbitron", sans-serif';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(`×${combo.hits}`, x, y + 28);
    ctx.fillStyle = tier.color;
    ctx.fillText(`×${combo.hits}`, x, y + 28);
    
    // Damage amount
    ctx.font = '700 13px "Rajdhani", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.fillText(`${combo.damage} DMG`, x, y + 46);

    ctx.restore();
  }

  /**
   * Renders a subtle gold radial spotlight following the fighter with higher HP%
   * Zero GC allocation via pre-baked off-screen canvas blit.
   */
  renderAdvantageSpotlight(ctx) {
    if (!this.p1 || !this.p2) return;
    const p1Pct = this.p1.health / this.p1.maxHealth;
    const p2Pct = this.p2.health / this.p2.maxHealth;
    const diff = Math.abs(p1Pct - p2Pct);
    if (diff < 0.20) return; // Only show when advantage ≥ 20% HP
    const leader = p1Pct > p2Pct ? this.p1 : this.p2;

    if (!this._advSpotCanvas && typeof document !== 'undefined') {
      this._advSpotCanvas = document.createElement('canvas');
      this._advSpotCanvas.width = 400;
      this._advSpotCanvas.height = 400;
      const sCtx = this._advSpotCanvas.getContext('2d');
      const grad = sCtx.createRadialGradient(200, 200, 20, 200, 200, 200);
      grad.addColorStop(0, 'rgba(255, 215, 0, 1.0)');
      grad.addColorStop(0.5, 'rgba(255, 215, 0, 0.4)');
      grad.addColorStop(1, 'rgba(255, 215, 0, 0)');
      sCtx.fillStyle = grad;
      sCtx.beginPath();
      sCtx.arc(200, 200, 200, 0, Math.PI * 2);
      sCtx.fill();
    }

    if (this._advSpotCanvas) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.12, diff * 0.25);
      ctx.drawImage(this._advSpotCanvas, leader.x - 200, leader.y - 70 - 200);
      ctx.restore();
    }
  }

  /**
   * Renders closing KO vignette — darkening ring centered on the losing fighter
   */
  renderKOVignette(ctx) {
    if (!this.roundWinner) return;
    const loser = this.roundWinner === this.p1 ? this.p2 : this.p1;
    const loserX = loser.x;
    const totalFrames = 110;
    const elapsed = totalFrames - this.phaseTimer;
    const progress = Math.min(1, elapsed / totalFrames);
    const outerR = CANVAS_WIDTH;
    const innerR = Math.max(60, outerR * (1 - progress * 0.85));
    const alpha = Math.min(0.88, progress * 1.1);

    ctx.save();
    const grad = ctx.createRadialGradient(loserX, CANVAS_HEIGHT / 2, innerR, loserX, CANVAS_HEIGHT / 2, outerR);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.5, `rgba(0, 0, 0, ${alpha * 0.4})`);
    grad.addColorStop(1, `rgba(0, 0, 0, ${alpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.restore();
  }

  renderPhaseAnnouncements(ctx) {
    if (this.roundPhase === ROUND_STATES.START) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (this.phaseTimer > 40) {
        ctx.font = '900 58px "Orbitron", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 25;
        ctx.fillText(`ROUND ${this.currentRound}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

        ctx.font = '700 16px "Rajdhani", sans-serif';
        ctx.fillStyle = '#ffd700';
        ctx.shadowBlur = 0;
        ctx.fillText('FIRST TO 2 ROUND WINS', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 25);
      } else {
        const pulse = Math.sin(this.phaseTimer * 0.25) * 8;
        ctx.font = '900 76px "Orbitron", sans-serif';
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ff6b35';
        ctx.shadowBlur = 35;
        ctx.fillText('FIGHT!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30 + pulse);
      }
      ctx.restore();
    } else if (this.roundPhase === ROUND_STATES.KO) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 84px "Orbitron", sans-serif';
      ctx.fillStyle = '#ff1744';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 40;
      ctx.fillText('K.O.!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
      ctx.restore();
    } else if (this.roundPhase === ROUND_STATES.ROUND_OVER) {
      ctx.save();
      const p1Won = this.roundWinner === this.p1;
      const isPVC = this.selectedMode === GAME_MODES.PVC;
      const winnerName = p1Won
        ? (isPVC ? 'YOU' : 'PLAYER 1')
        : (isPVC ? 'COMPUTER' : 'PLAYER 2');
      const fighterName = this.roundWinner ? this.roundWinner.config.displayName.toUpperCase() : 'FIGHTER';
      const winnerColor = p1Won
        ? (isPVC ? '#00e676' : '#00e5ff')
        : (isPVC ? '#ff1744' : '#ff6b35');

      // Centered glass banner panel
      const bannerX = 140;
      const bannerY = CANVAS_HEIGHT / 2 - 95;
      const bannerW = 680;
      const bannerH = 190;

      ctx.fillStyle = 'rgba(6, 12, 26, 0.96)';
      ctx.strokeStyle = winnerColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = winnerColor;
      ctx.shadowBlur = 24;
      drawRoundRect(ctx, bannerX, bannerY, bannerW, bannerH, 16);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Headline
      ctx.font = '900 32px "Orbitron", sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = winnerColor;
      ctx.shadowBlur = 20;
      const headline = isPVC
        ? (p1Won ? '🏆 YOU WIN THE ROUND! 🏆' : '💀 COMPUTER WINS THE ROUND! 🤖')
        : `👑 ${winnerName} WINS THE ROUND! 🥇`;
      ctx.fillText(headline, CANVAS_WIDTH / 2, bannerY + 45);

      // Fighter Sub-badge
      ctx.font = '700 18px "Rajdhani", sans-serif';
      ctx.fillStyle = winnerColor;
      ctx.shadowBlur = 0;
      ctx.fillText(`${winnerName} (${fighterName}) TAKES ROUND ${this.currentRound}`, CANVAS_WIDTH / 2, bannerY + 88);

      // Round Pips
      ctx.font = '700 18px "Orbitron", monospace';
      ctx.fillStyle = '#ffffff';
      const p1Stars = '★'.repeat(this.p1RoundWins) + '☆'.repeat(Math.max(0, 2 - this.p1RoundWins));
      const p2Stars = '★'.repeat(this.p2RoundWins) + '☆'.repeat(Math.max(0, 2 - this.p2RoundWins));
      const p2Tag = isPVC ? 'CPU' : 'P2';
      ctx.fillText(`SCORE:  P1 [ ${p1Stars} ]   vs   [ ${p2Stars} ] ${p2Tag}`, CANVAS_WIDTH / 2, bannerY + 128);

      // Next Round Notice
      ctx.font = 'italic 13px "Rajdhani", sans-serif';
      ctx.fillStyle = '#90a4ae';
      ctx.fillText(`Next round starting in ${(this.phaseTimer / 60).toFixed(1)}s...`, CANVAS_WIDTH / 2, bannerY + 162);
      ctx.restore();
    }
  }

  renderGameOver(ctx) {
    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;
    const isPVC = this.selectedMode === GAME_MODES.PVC;
    const p1Won = this.winner === this.p1;
    const p2Won = this.winner === this.p2;
    const p2Label = isPVC ? 'COMPUTER' : 'PLAYER 2';

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Deep cinematic collegiate matrix backdrop
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, 540);
    bgGrad.addColorStop(0, 'rgba(8, 18, 38, 0.97)');
    bgGrad.addColorStop(1, 'rgba(2, 5, 14, 0.99)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle tactical scanlines
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 8) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // 2. Academic Combat Assessment Evaluation Logic
    let combatGrade = 'A';
    let combatCGPA = '8.9 / 10.0';
    let gradeColor = '#00e676';
    let deanRemark = 'Solid neutral game and thesis defense executed with academic distinction.';

    if (isPVC) {
      if (p1Won) {
        if (this.p1.health > this.p1.maxHealth * 0.6 || this.matchStats.P1.maxCombo >= 5) {
          combatGrade = 'S+';
          combatCGPA = '9.95 / 10.0';
          gradeColor = '#ffd700';
          deanRemark = 'Dean's Combat Laurels. Flawless syllabus mastery, algorithmic precision, and devastating combo thesis.';
        } else {
          combatGrade = 'A+';
          combatCGPA = '9.40 / 10.0';
          gradeColor = '#00e5ff';
          deanRemark = 'First-Class Distinction. Commendable pressure regulation and placement-ready neutral control.';
        }
      } else {
        combatGrade = 'SUPPL.';
        combatCGPA = '4.80 / 10.0';
        gradeColor = '#ff1744';
        deanRemark = 'Supplementary Exam Required. Defensive thesis collapsed under AI opponent pressure. Remedial lab advised.';
      }
    } else {
      combatGrade = p1Won ? 'S+' : 'A+';
      combatCGPA = '9.80 / 10.0';
      gradeColor = '#ffd700';
      deanRemark = 'Exemplary 1v1 collegiate brawl. Both combatants awarded Advanced Sparring Honors.';
    }

    // 3. Header Ribbon & Dean's Assessment Header
    ctx.textAlign = 'center';
    let bannerTitle = 'MATCH DRAW — HONORS EVEN!';
    let bannerSub = 'A grueling clash with no clear victor. Rematch recommended by the Board.';
    let bannerColor = '#ffd700';

    if (isPVC) {
      if (p1Won) {
        bannerTitle = '🎓 SUMMA CUM LAUDE — VICTORY! 🏆';
        bannerSub = `Official Combat Assessment: ${this.p1.config.displayName.toUpperCase()} dominates the arena with First-Class Honors!`;
        bannerColor = '#00e676';
      } else {
        bannerTitle = '⚠️ ACADEMIC PROBATION — DEFEAT BY AI! 🤖';
        bannerSub = `The AI prevailed with ${this.p2.config.displayName.toUpperCase()}. Study opponent telemetry and retest!`;
        bannerColor = '#ff1744';
      }
    } else {
      if (p1Won) {
        bannerTitle = '👑 PLAYER 1 CONQUERS THE SRM ARENA! 🥇';
        bannerSub = `${this.p1.config.displayName.toUpperCase()} TAKES THE SRM BRAWL TROPHY & DEAN'S HONORS!`;
        bannerColor = '#00e5ff';
      } else if (p2Won) {
        bannerTitle = '👑 PLAYER 2 CONQUERS THE SRM ARENA! 🥇';
        bannerSub = `${this.p2.config.displayName.toUpperCase()} TAKES THE SRM BRAWL TROPHY & DEAN'S HONORS!`;
        bannerColor = '#ff6b35';
      }
    }

    // Academic Board Category Stamp
    ctx.font = '700 11px "Rajdhani", sans-serif';
    ctx.fillStyle = bannerColor;
    ctx.shadowColor = bannerColor;
    ctx.shadowBlur = 8;
    ctx.fillText('🏛️ SRM INSTITUTE OF COMBAT SCIENCES // SEMESTER CLASH EVALUATION TRANSCRIPT', w / 2, 28);

    // Big Headline in Orbitron
    ctx.font = '900 28px "Orbitron", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = bannerColor;
    ctx.shadowBlur = 20;
    ctx.fillText(bannerTitle, w / 2, 60);

    // Subtitle in Rajdhani
    ctx.font = '700 14px "Rajdhani", sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.shadowBlur = 0;
    ctx.fillText(bannerSub, w / 2, 84);

    // 4. Dual Fighter Showcase Dossier Cards (P1 vs P2/CPU)
    const cardY = 98;
    const cardH = 210;

    // --- LEFT CARD: PLAYER 1 ---
    const p1CardX = 50;
    const p1CardW = 410;
    ctx.fillStyle = p1Won ? 'rgba(0, 230, 118, 0.10)' : 'rgba(10, 20, 36, 0.90)';
    ctx.strokeStyle = p1Won ? '#00e676' : '#22344d';
    ctx.lineWidth = p1Won ? 2.5 : 1.2;
    ctx.shadowColor = p1Won ? '#00e676' : 'transparent';
    ctx.shadowBlur = p1Won ? 16 : 0;
    drawRoundRect(ctx, p1CardX, cardY, p1CardW, cardH, 12);
    ctx.fill();
    ctx.stroke();

    // P1 Winner / Loser Academic Badge
    ctx.shadowBlur = 0;
    ctx.fillStyle = p1Won ? '#00e676' : '#334155';
    drawRoundRect(ctx, p1CardX + 16, cardY + 12, 140, 24, 4);
    ctx.fill();
    ctx.font = '900 11px "Orbitron", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(p1Won ? '👑 FIRST RANK (WINNER)' : '🥈 RUNNER-UP', p1CardX + 86, cardY + 28);

    // P1 Hex Portrait
    const p1PortraitX = p1CardX + 40;
    const p1PortraitY = cardY + 70;
    const p1PR = 22;
    ctx.save();
    ctx.translate(p1PortraitX, p1PortraitY);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const hx = Math.cos(angle) * p1PR;
      const hy = Math.sin(angle) * p1PR;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fillStyle = '#050a18';
    ctx.fill();
    ctx.clip();
    const p1Img = window.CampusVisuals ? window.CampusVisuals.getPortrait(this.p1.config.id) : null;
    if (p1Img && p1Img.complete && p1Img.naturalWidth > 0) {
      ctx.drawImage(p1Img, -p1PR, -p1PR, p1PR * 2, p1PR * 2);
    } else {
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎓', 0, 1);
    }
    ctx.restore();

    // P1 Fighter Name & Academic Department
    ctx.textAlign = 'left';
    ctx.font = '900 18px "Orbitron", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`PLAYER 1: ${this.p1.config.displayName}`, p1CardX + 74, cardY + 62);
    ctx.font = '700 12px "Rajdhani", sans-serif';
    ctx.fillStyle = this.p1.config.colors.accent || '#ffd700';
    ctx.fillText(`[ ${this.p1.config.tagline || 'COLLEGIATE WARRIOR'} ]`, p1CardX + 74, cardY + 80);

    // P1 Dialogue Speech Bubble with pointer tail pointing to portrait
    const p1BubbleX = p1CardX + 16;
    const p1BubbleY = cardY + 104;
    const p1BubbleW = p1CardW - 32;
    const p1BubbleH = 54;
    ctx.fillStyle = 'rgba(4, 9, 20, 0.75)';
    ctx.strokeStyle = p1Won ? 'rgba(0, 230, 118, 0.4)' : 'rgba(70, 95, 130, 0.4)';
    ctx.lineWidth = 1;
    drawRoundRect(ctx, p1BubbleX, p1BubbleY, p1BubbleW, p1BubbleH, 8);
    ctx.fill();
    ctx.stroke();

    // Bubble pointer triangle pointing at portrait
    ctx.beginPath();
    ctx.moveTo(p1CardX + 36, p1BubbleY);
    ctx.lineTo(p1CardX + 42, p1BubbleY - 6);
    ctx.lineTo(p1CardX + 48, p1BubbleY);
    ctx.fillStyle = 'rgba(4, 9, 20, 0.75)';
    ctx.fill();

    ctx.font = 'italic 13px "Rajdhani", sans-serif';
    ctx.fillStyle = '#e2e8f0';
    const p1Quote = p1Won
      ? (this.p1.config?.dialogue?.win || 'Victory is backed by systematic discipline.')
      : (this.p1.config?.dialogue?.lose || this.p1.config?.dialogue?.taunt || 'Good fight. Will revise syllabus and return.');
    ctx.fillText(`"${p1Quote}"`, p1BubbleX + 12, p1BubbleY + 31);

    // P1 Rounds Score with Gold Laurels
    ctx.font = '700 13px "Orbitron", sans-serif';
    ctx.fillStyle = '#ffd700';
    const p1StarsDisplay = '★'.repeat(this.p1RoundWins) + '☆'.repeat(Math.max(0, 2 - this.p1RoundWins));
    ctx.fillText(`ROUNDS WON: [ ${p1StarsDisplay} ]  (${this.p1RoundWins}/2)`, p1CardX + 16, cardY + 188);

    // --- RIGHT CARD: PLAYER 2 / COMPUTER ---
    const p2CardX = 500;
    const p2CardW = 410;
    ctx.fillStyle = p2Won ? 'rgba(255, 107, 53, 0.12)' : 'rgba(10, 20, 36, 0.90)';
    ctx.strokeStyle = p2Won ? '#ff6b35' : '#22344d';
    ctx.lineWidth = p2Won ? 2.5 : 1.2;
    ctx.shadowColor = p2Won ? '#ff6b35' : 'transparent';
    ctx.shadowBlur = p2Won ? 16 : 0;
    drawRoundRect(ctx, p2CardX, cardY, p2CardW, cardH, 12);
    ctx.fill();
    ctx.stroke();

    // P2 Winner / Loser Academic Badge
    ctx.shadowBlur = 0;
    ctx.fillStyle = p2Won ? (isPVC ? '#ff1744' : '#ff6b35') : '#334155';
    drawRoundRect(ctx, p2CardX + 16, cardY + 12, 140, 24, 4);
    ctx.fill();
    ctx.font = '900 11px "Orbitron", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(p2Won ? '👑 FIRST RANK (WINNER)' : '🥈 RUNNER-UP', p2CardX + 86, cardY + 28);

    // P2 Hex Portrait
    const p2PortraitX = p2CardX + 40;
    const p2PortraitY = cardY + 70;
    const p2PR = 22;
    ctx.save();
    ctx.translate(p2PortraitX, p2PortraitY);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const hx = Math.cos(angle) * p2PR;
      const hy = Math.sin(angle) * p2PR;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fillStyle = '#050a18';
    ctx.fill();
    ctx.clip();
    const p2Img = window.CampusVisuals ? window.CampusVisuals.getPortrait(this.p2.config.id) : null;
    if (p2Img && p2Img.complete && p2Img.naturalWidth > 0) {
      ctx.drawImage(p2Img, -p2PR, -p2PR, p2PR * 2, p2PR * 2);
    } else {
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🥊', 0, 1);
    }
    ctx.restore();

    // P2 Fighter Name & Department
    ctx.textAlign = 'left';
    ctx.font = '900 18px "Orbitron", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${p2Label}: ${this.p2.config.displayName}`, p2CardX + 74, cardY + 62);
    ctx.font = '700 12px "Rajdhani", sans-serif';
    ctx.fillStyle = this.p2.config?.colors?.accent || '#ffd700';
    ctx.fillText(`[ ${this.p2.config?.tagline || 'COLLEGIATE WARRIOR'} ]`, p2CardX + 74, cardY + 80);

    // P2 Dialogue Speech Bubble with pointer tail pointing to portrait
    const p2BubbleX = p2CardX + 16;
    const p2BubbleY = cardY + 104;
    const p2BubbleW = p2CardW - 32;
    const p2BubbleH = 54;
    ctx.fillStyle = 'rgba(4, 9, 20, 0.75)';
    ctx.strokeStyle = p2Won ? 'rgba(255, 107, 53, 0.4)' : 'rgba(70, 95, 130, 0.4)';
    ctx.lineWidth = 1;
    drawRoundRect(ctx, p2BubbleX, p2BubbleY, p2BubbleW, p2BubbleH, 8);
    ctx.fill();
    ctx.stroke();

    // Bubble pointer triangle
    ctx.beginPath();
    ctx.moveTo(p2CardX + 36, p2BubbleY);
    ctx.lineTo(p2CardX + 42, p2BubbleY - 6);
    ctx.lineTo(p2CardX + 48, p2BubbleY);
    ctx.fillStyle = 'rgba(4, 9, 20, 0.75)';
    ctx.fill();

    ctx.font = 'italic 13px "Rajdhani", sans-serif';
    ctx.fillStyle = '#e2e8f0';
    const p2Quote = p2Won
      ? (this.p2.config?.dialogue?.win || 'All calculations led to this victory!')
      : (this.p2.config?.dialogue?.lose || this.p2.config?.dialogue?.taunt || 'A formidable syllabus. Rematch soon.');
    ctx.fillText(`"${p2Quote}"`, p2BubbleX + 12, p2BubbleY + 31);

    // P2 Rounds Score
    ctx.font = '700 13px "Orbitron", sans-serif';
    ctx.fillStyle = '#ffd700';
    const p2StarsDisplay = '★'.repeat(this.p2RoundWins) + '☆'.repeat(Math.max(0, 2 - this.p2RoundWins));
    ctx.fillText(`ROUNDS WON: [ ${p2StarsDisplay} ]  (${this.p2RoundWins}/2)`, p2CardX + 16, cardY + 188);

    // --- Center Chronometer VS Pill ---
    const vsX = 435;
    const vsY = 178;
    ctx.fillStyle = '#060d1a';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    drawRoundRect(ctx, vsX, vsY, 90, 50, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.font = '900 20px "Orbitron", sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`${this.p1RoundWins} - ${this.p2RoundWins}`, vsX + 45, vsY + 31);

    // 5. Official Academic Combat Performance Breakdown Card
    const statsCardX = 50;
    const statsCardY = 320;
    const statsCardW = 860;
    const statsCardH = 212;

    ctx.fillStyle = 'rgba(8, 16, 32, 0.94)';
    ctx.strokeStyle = '#1e3050';
    ctx.lineWidth = 1.5;
    drawRoundRect(ctx, statsCardX, statsCardY, statsCardW, statsCardH, 12);
    ctx.fill();
    ctx.stroke();

    // Table Header with Academic Grade Pill
    ctx.font = '900 12px "Orbitron", sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'left';
    ctx.fillText('📊 ACADEMIC COMBAT PERFORMANCE TELEMETRY', statsCardX + 24, statsCardY + 26);

    // Dean's Grade Badge in Header
    ctx.save();
    ctx.textAlign = 'right';
    ctx.font = '900 11px "Orbitron", sans-serif';
    ctx.fillStyle = gradeColor;
    ctx.shadowColor = gradeColor;
    ctx.shadowBlur = 6;
    ctx.fillText(`[ COMBAT GRADE: ${combatGrade} | CGPA: ${combatCGPA} ]`, statsCardX + statsCardW - 24, statsCardY + 26);
    ctx.restore();

    // Fighter column titles
    ctx.textAlign = 'center';
    ctx.font = '700 11px "Rajdhani", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`PLAYER 1: ${this.p1.config.displayName.toUpperCase()}`, statsCardX + 470, statsCardY + 44);
    ctx.fillText(`${p2Label}: ${this.p2.config.displayName.toUpperCase()}`, statsCardX + 720, statsCardY + 44);

    // Divider Line
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(statsCardX + 20, statsCardY + 52);
    ctx.lineTo(statsCardX + statsCardW - 20, statsCardY + 52);
    ctx.stroke();

    const statsRows = [
      {
        label: 'Rounds Won',
        p1: `${this.p1RoundWins} / 2`,
        p2: `${this.p2RoundWins} / 2`,
        p1Val: this.p1RoundWins,
        p2Val: this.p2RoundWins,
        p1Best: this.p1RoundWins > this.p2RoundWins,
        p2Best: this.p2RoundWins > this.p1RoundWins
      },
      {
        label: 'Damage Output',
        p1: `${this.matchStats.P1.totalDamage} HP`,
        p2: `${this.matchStats.P2.totalDamage} HP`,
        p1Val: this.matchStats.P1.totalDamage,
        p2Val: this.matchStats.P2.totalDamage,
        p1Best: this.matchStats.P1.totalDamage > this.matchStats.P2.totalDamage,
        p2Best: this.matchStats.P2.totalDamage > this.matchStats.P1.totalDamage
      },
      {
        label: 'Max Combo Streak',
        p1: `${this.matchStats.P1.maxCombo} HITS`,
        p2: `${this.matchStats.P2.maxCombo} HITS`,
        p1Val: this.matchStats.P1.maxCombo,
        p2Val: this.matchStats.P2.maxCombo,
        p1Best: this.matchStats.P1.maxCombo > this.matchStats.P2.maxCombo,
        p2Best: this.matchStats.P2.maxCombo > this.matchStats.P1.maxCombo
      },
      {
        label: 'Attacks Landed',
        p1: `${this.matchStats.P1.hits} HITS`,
        p2: `${this.matchStats.P2.hits} HITS`,
        p1Val: this.matchStats.P1.hits,
        p2Val: this.matchStats.P2.hits,
        p1Best: this.matchStats.P1.hits > this.matchStats.P2.hits,
        p2Best: this.matchStats.P2.hits > this.matchStats.P1.hits
      }
    ];

    statsRows.forEach((r, idx) => {
      const rowY = statsCardY + 76 + idx * 28;
      ctx.font = '700 13px "Rajdhani", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'left';
      ctx.fillText(r.label, statsCardX + 24, rowY);

      // P1 Value
      ctx.font = '700 13px "Orbitron", sans-serif';
      ctx.fillStyle = r.p1Best ? '#00e676' : '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(r.p1 + (r.p1Best ? ' 👑' : ''), statsCardX + 470, rowY);

      // P2 Value
      ctx.fillStyle = r.p2Best ? '#00e676' : '#ffffff';
      ctx.fillText(r.p2 + (r.p2Best ? ' 👑' : ''), statsCardX + 720, rowY);
    });

    // Dean's Tactical Debrief Chip along bottom of stats card
    const debriefY = statsCardY + statsCardH - 26;
    ctx.fillStyle = 'rgba(0, 229, 255, 0.08)';
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
    ctx.lineWidth = 1;
    drawRoundRect(ctx, statsCardX + 16, debriefY - 14, statsCardW - 32, 28, 6);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 12px "Rajdhani", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.fillText(`DEAN'S ASSESSMENT: "${deanRemark}"`, statsCardX + 26, debriefY + 4);

    // 6. Action Buttons (Rematch, Change Fighters, Main Menu)
    const btnY = 546;
    const btnH = 46;

    // Button 1: Rematch (x: 100 to 330)
    const b1X = 100, b1W = 230;
    ctx.fillStyle = 'rgba(0, 230, 118, 0.18)';
    ctx.strokeStyle = '#00e676';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00e676';
    ctx.shadowBlur = 10;
    drawRoundRect(ctx, b1X, btnY, b1W, btnH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = '900 13px "Orbitron", sans-serif';
    ctx.fillStyle = '#00e676';
    ctx.textAlign = 'center';
    ctx.fillText('🔁 REMATCH (R / ENTER)', b1X + b1W / 2, btnY + 28);

    // Button 2: Change Fighters (x: 365 to 595)
    const b2X = 365, b2W = 230;
    ctx.fillStyle = 'rgba(255, 215, 0, 0.18)';
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 10;
    drawRoundRect(ctx, b2X, btnY, b2W, btnH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = '900 13px "Orbitron", sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.fillText('👥 FIGHTERS (M)', b2X + b2W / 2, btnY + 28);

    // Button 3: Main Menu (x: 630 to 860)
    const b3X = 630, b3W = 230;
    ctx.fillStyle = 'rgba(0, 229, 255, 0.18)';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    drawRoundRect(ctx, b3X, btnY, b3W, btnH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = '900 13px "Orbitron", sans-serif';
    ctx.fillStyle = '#00e5ff';
    ctx.textAlign = 'center';
    ctx.fillText('🏠 MAIN MENU (ESC)', b3X + b3W / 2, btnY + 28);

    ctx.restore();
  }

}}

// Bulletproof bootstrap function that handles all document ready states
function bootCampusClash() {
  if (window.campusClash) return;
  try {
    window.campusClash = new CampusClashGame();
  } catch (err) {
    console.error('[CampusClash] Critical initialization failure:', err);
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootCampusClash);
} else {
  // Already parsed / interactive / complete
  bootCampusClash();
}
