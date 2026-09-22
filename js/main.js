/**
 * Campus Clash — Main Gameplay Orchestrator
 * @module main
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT, INPUT_ACTIONS, ROUND_STATES, COMBO_LEVELS, GAME_MODES } from './utils/constants.js';
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
import { Fighter } from './entities/fighter.js';
import { TechParkStage } from './stages/techPark.js';
import { UniversityBuildingStage } from './stages/universityBuilding.js';
import { TPGanesanAuditoriumStage } from './stages/tpGanesanAuditorium.js';
import { ArchGateStage } from './stages/archGate.js';
import { VendharSquareStage } from './stages/vendarSquare.js';
import { ArchitectureBlockStage } from './stages/architectureBlock.js';
import { CloudCitadelStage } from './stages/cloudCitadel.js';
import { CyberFortressStage } from './stages/cyberFortress.js';
import { IoTSensorMatrixStage } from './stages/iotSensorMatrix.js';
import { EdgeGatewayStage } from './stages/edgeGateway.js';
import { NexusModifierSystem } from './engine/nexusModifiers.js';
import { PostProcessing } from './engine/postProcess.js';
import { LandingScene } from './engine/landingScene.js';
import { CharacterPortraitManager } from './ui/characterPortrait.js';
import { StageSelectManager } from './ui/stageSelectManager.js';
import { LeaderboardManager } from './multiplayer/leaderboard.js';
import { supabaseService } from './database/supabaseClient.js';
import { EntryPortalManager } from './ui/entryPortalManager.js';

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
    
    // Playable SRM Campus & WebNexus Tech Arenas
    this.arenas = [
      {
        id: 'techpark',
        name: 'Tech Park Steps & Plaza',
        shortName: 'TECH PARK PLAZA',
        subtitle: '15-Floor IT Powerhouse & Skywalk',
        stageClass: TechParkStage,
        emoji: '🏛️',
        landmark: '15-Tier Stairs, Solar Glass & Skywalk',
        hazard: 'ID Check Whistle & Sea Breeze Papers'
      },
      {
        id: 'universitybuilding',
        name: 'University Building (UB) Quadrangle',
        shortName: 'UB CLOCK TOWER',
        subtitle: 'The Administrative Heart',
        stageClass: UniversityBuildingStage,
        emoji: '🔔',
        landmark: 'Neoclassical Colonnade & Clock Tower',
        hazard: 'Clock Bell Toll & Ambassador Car'
      },
      {
        id: 'tpganesan',
        name: 'Dr. T.P. Ganesan Auditorium',
        shortName: 'TP GANESAN AUDITORIUM',
        subtitle: 'Asia\'s Premier 4000-Seat Hall',
        stageClass: TPGanesanAuditoriumStage,
        emoji: '🎭',
        landmark: 'Acoustic Wood Ribs & Milan LED Banner',
        hazard: 'Moving Spotlights & Bass Subwoofer'
      },
      {
        id: 'archgate',
        name: 'SRM Grand Arch Gate',
        shortName: 'GRAND ARCH GATE',
        subtitle: 'GST Road (NH45) Entrance',
        stageClass: ArchGateStage,
        emoji: '⛩️',
        landmark: 'Pink Twin Arch & Suburban EMU Train',
        hazard: 'SRM Bus Horn & Highway Traffic'
      },
      {
        id: 'vendharsquare',
        name: 'Vendhar Square',
        shortName: 'VENDHAR SQUARE',
        subtitle: 'The Grand Founder Monument & Plaza',
        stageClass: VendharSquareStage,
        emoji: '👑',
        landmark: 'Golden Paarivendhar Statue & Dome Fountains',
        hazard: 'Geodesic Fountain Sprays & Sunset Flare'
      },
      {
        id: 'architectureblock',
        name: 'School of Architecture',
        shortName: 'ARCHITECTURE BLOCK',
        subtitle: 'SRM School of Architecture & Design',
        stageClass: ArchitectureBlockStage,
        emoji: '📐',
        landmark: 'Teal Solar Glass Curtain, White Louvers & Portico',
        hazard: 'Drafting Blueprints & Jury Laser Scan'
      },
      {
        id: 'cloudcitadel',
        name: 'The Cloud Citadel',
        shortName: 'CLOUD CITADEL',
        subtitle: 'WebNexus Cloud Computing & Serverless Cluster',
        stageClass: CloudCitadelStage,
        emoji: '☁️',
        landmark: 'Server Blade Skyscrapers & K8S Pods',
        hazard: 'Fiber Streams & Container Drop'
      },
      {
        id: 'cyberfortress',
        name: 'Cyber Fortress Zero-Day',
        shortName: 'CYBER FORTRESS',
        subtitle: 'WebNexus Cyber Security & Cryptographic Firewall',
        stageClass: CyberFortressStage,
        emoji: '🛡️',
        landmark: 'Zero-Day Terminal & Laser Grid',
        hazard: 'Binary Rain & Security Laser Perimeter'
      },
      {
        id: 'iotsensormatrix',
        name: 'IoT Sensor Matrix',
        shortName: 'IOT SENSOR MATRIX',
        subtitle: 'WebNexus Internet of Things & Mesh Network',
        stageClass: IoTSensorMatrixStage,
        emoji: '📡',
        landmark: 'PCB Copper Traces & ESP32 Microchips',
        hazard: '2.4GHz WiFi Waves & Telemetry Feed'
      },
      {
        id: 'edgegateway',
        name: 'Edge Gateway Station',
        shortName: 'EDGE GATEWAY',
        subtitle: 'WebNexus Edge Computing & Ultra-Low Latency Hub',
        stageClass: EdgeGatewayStage,
        emoji: '⚡',
        landmark: 'Optical Bus Lines & Edge Node Towers',
        hazard: 'High-Speed Optical Pulses (0.2ms)'
      }
    ];
    this.currentArenaIndex = 0; // Tech Park Steps is primary default!
    this.stage = new this.arenas[this.currentArenaIndex].stageClass();
    this.stageSelectManager = new StageSelectManager(this);


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
    this.loop.start();
    this.initCharacterSelect();
    if (this.stageSelectManager) this.stageSelectManager.initDOM();

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
        this.charModeText.textContent = 'PLAYER VS SRM BOT';
      } else {
        this.charModeText.textContent = '1 VS 1 LOCAL BRAWL';
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
      if (this.selectedMode === GAME_MODES.PVC) this.p2ProfileSlot.textContent = 'SRM AI BOT';
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
  startMatch() {
    this.sound.playUltimate();
    const p1Cfg = this.roster[this.p1CharIndex].config;
    const p2Cfg = this.roster[this.p2CharIndex].config;

    // Instantiate selected SRM Arena
    this.stage = new this.arenas[this.currentArenaIndex].stageClass();

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
  }

  startRound(roundNum) {
    this.currentRound = roundNum;
    this.roundPhase = ROUND_STATES.START;
    this.phaseTimer = 90; // 1.5s countdown
    this.matchTimer = 99;
    this.matchTimerFrames = 0;
    this.roundWinner = null;

    if (this.p1) {
      this.p1.health = this.p1.maxHealth;
      this.p1.displayedHealth = this.p1.maxHealth;
      this.p1.x = 260;
      this.p1.y = this.stage.groundY;
      this.p1.facing = 1;
      this.p1.vx = 0;
      this.p1.vy = 0;
      this.p1.state = 'idle';
      this.p1.activeHitboxes = [];
      this.p1.hitstopTimer = 0;
      this.p1.freezeTimer = 0;
      this.p1.invulnerableFrames = 0;
    }
    if (this.p2) {
      this.p2.health = this.p2.maxHealth;
      this.p2.displayedHealth = this.p2.maxHealth;
      this.p2.x = 700;
      this.p2.y = this.stage.groundY;
      this.p2.facing = -1;
      this.p2.vx = 0;
      this.p2.vy = 0;
      this.p2.state = 'idle';
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
    if (e.code === 'KeyL') {
      if (this.leaderboardManager) {
        this.leaderboardManager.open();
        this.sound.playLightHit();
        return;
      }
    }
    if (e.code === 'Escape') {
      this.sound.playBlock();
      this.currentScreen = GAME_SCREENS.LANDING;
      if (this.landingScene) this.landingScene.show();
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
      }
    } else if (this.roundPhase === ROUND_STATES.FIGHT) {
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
          this.sound.playBlock();
          this.particles.spawnBlockSparks(impactX, impactY);
          this.screenShake.shake(3, 8);
        } else {
          // Trigger slow motion
          this.slowMotionTimer = 15;

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

          // Character-specific signature procedural audio & visual sparks
          this.sound.playCharacterHitSound(attacker.config.id, attacker.currentMove, isHeavyHit, false);
          this.particles.spawnCharacterSparks(attacker.config.id, impactX, impactY, ringColor, isHeavyHit);

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
      this.screenShake.apply(ctx);

      // 1. Render SRM Stage
      this.stage.render(ctx);

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

      // 2. Render Fighters
      this.p1.render(ctx, this.debugHitboxes);
      this.p2.render(ctx, this.debugHitboxes);

      // 2.5. Render Nexus Buff Auras & Tech Shields
      if (this.nexusModifiers) {
        this.nexusModifiers.renderFighterBuffs(ctx, this.p1, this.p2);
      }

      // 3. Render Particles
      this.particles.render(ctx);
      ctx.restore();

      // Screen Flash on heavy hits
      if (this.screenFlashFrames > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${this.screenFlashFrames * 0.18})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.restore();
      }

      // Chromatic Aberration post-process (3-frame double-draw on heavy/ultimate impact)
      if (this.screenShake.crushIntensity > 0.05) {
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
        title: '🤖  PLAYER VS COMPUTER (SRM AI BOT)',
        desc: 'Test your reflexes against the adaptive SRM Campus AI'
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
  // MATCH HUD & OVERLAY RENDERING
  // =========================================================================
  renderHUD(ctx) {
    const barW = 310;
    const barH = 20;
    const topY = 26;

    const p1Name = `P1: ${this.p1.config.displayName.toUpperCase()}`;
    const p2Label = this.selectedMode === GAME_MODES.PVC ? 'CPU: ' : (this.selectedMode === GAME_MODES.TRAINING ? 'DUMMY: ' : 'P2: ');
    const p2Name = `${p2Label}${this.p2.config.displayName.toUpperCase()}`;

    // --- P1 HUD (Left) ---
    this.renderHealthBar(ctx, 44, topY, barW, barH, this.p1, p1Name, false);
    this.renderStaminaBar(ctx, 44, topY + barH + 4, barW, 7, this.p1, false);
    this.renderUltimateMeter(ctx, 44, topY + barH + 15, barW * 0.75, 9, this.p1);

    // --- P2 HUD (Right) ---
    this.renderHealthBar(ctx, CANVAS_WIDTH - 44 - barW, topY, barW, barH, this.p2, p2Name, true);
    this.renderStaminaBar(ctx, CANVAS_WIDTH - 44 - barW, topY + barH + 4, barW, 7, this.p2, true);
    this.renderUltimateMeter(ctx, CANVAS_WIDTH - 44 - barW * 0.75, topY + barH + 15, barW * 0.75, 9, this.p2);

    // --- Round Win Dots (Best-of-3) --- (Hide in Training mode)
    if (this.selectedMode !== GAME_MODES.TRAINING) {
      const drawRoundDot = (dotX, dotY, isWon) => {
        ctx.save();
        ctx.translate(dotX, dotY);
        ctx.beginPath();
        // 8-pointed star
        for (let i = 0; i < 16; i++) {
          const radius = i % 2 === 0 ? 8 : 4;
          const angle = (Math.PI / 8) * i;
          if (i === 0) ctx.moveTo(radius * Math.cos(angle), radius * Math.sin(angle));
          else ctx.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
        }
        ctx.closePath();
        ctx.fillStyle = isWon ? '#ffd602' : '#0c1424';
        if (isWon) {
          ctx.shadowColor = '#fe6b00';
          ctx.shadowBlur = 8;
        }
        ctx.fill();
        ctx.strokeStyle = '#ffd602';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      };

      // P1 Round Dots
      drawRoundDot(382, topY + barH / 2, this.p1RoundWins >= 1);
      drawRoundDot(406, topY + barH / 2, this.p1RoundWins >= 2);
      ctx.save();
      ctx.font = 'bold 8px monospace';
      ctx.fillStyle = '#90a4ae';
      ctx.textAlign = 'center';
      ctx.fillText('WINS', 394, topY - 3);

      // P2 Round Dots
      drawRoundDot(554, topY + barH / 2, this.p2RoundWins >= 1);
      drawRoundDot(578, topY + barH / 2, this.p2RoundWins >= 2);
      ctx.fillText('WINS', 566, topY - 3);
      ctx.restore();
    }

    // --- Center Timer Box / Training Badge ---
    const timerW = this.selectedMode === GAME_MODES.TRAINING ? 160 : 76;
    const timerH = 50;
    const timerX = CANVAS_WIDTH / 2;
    const timerY = topY - 8 + timerH / 2;

    ctx.save();
    // Hex/Diamond shape
    ctx.translate(timerX, timerY);
    ctx.beginPath();
    ctx.moveTo(0, -timerH/2);
    ctx.lineTo(timerW/2, -timerH/2 + 10);
    ctx.lineTo(timerW/2, timerH/2 - 10);
    ctx.lineTo(0, timerH/2);
    ctx.lineTo(-timerW/2, timerH/2 - 10);
    ctx.lineTo(-timerW/2, -timerH/2 + 10);
    ctx.closePath();

    ctx.fillStyle = '#060d1c';
    ctx.fill();
    ctx.strokeStyle = (this.selectedMode !== GAME_MODES.TRAINING && this.matchTimer <= 10) ? '#ff1744' : '#ffd602';
    ctx.lineWidth = 2;
    ctx.shadowColor = (this.selectedMode !== GAME_MODES.TRAINING && this.matchTimer <= 10) ? '#ff1744' : '#fe6b00';
    ctx.shadowBlur = 8;
    ctx.stroke();
    
    // Reset shadow and transform for text
    ctx.shadowBlur = 0;
    ctx.translate(-timerX, -timerY);

    if (this.selectedMode === GAME_MODES.TRAINING) {
      ctx.font = '900 11px monospace';
      ctx.fillStyle = '#00f0ff';
      ctx.textAlign = 'center';
      ctx.fillText('🥋 TRAINING LAB', CANVAS_WIDTH / 2, topY + 8);

      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#ffd602';
      ctx.fillText(`DUMMY: ${this.trainingDummyController.state.toUpperCase()}`, CANVAS_WIDTH / 2, topY + 28);
    } else {
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#ffd602';
      ctx.textAlign = 'center';
      ctx.fillText(`ROUND ${this.currentRound}/3`, CANVAS_WIDTH / 2, topY + 3);

      ctx.font = '900 26px monospace';
      ctx.fillStyle = this.matchTimer <= 10 ? '#ff1744' : '#ffffff';
      if (this.matchTimer <= 10) {
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 12;
      }
      ctx.textBaseline = 'middle';
      ctx.fillText(this.matchTimer.toString().padStart(2, '0'), CANVAS_WIDTH / 2, topY + 23);
    }
    ctx.restore();

    // Arena Name Badge under Timer
    const currArena = this.arenas[this.currentArenaIndex];
    ctx.save();
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#ffd602';
    ctx.shadowColor = 'rgba(255, 214, 2, 0.5)';
    ctx.shadowBlur = 4;
    ctx.textAlign = 'center';
    ctx.fillText(`${currArena.emoji} ${currArena.name.toUpperCase()}`, CANVAS_WIDTH / 2, topY + 54);
    ctx.restore();

    // --- Combo Counters ---
    if (this.combos.P1.hits > 1) {
      this.renderComboDisplay(ctx, 48, topY + 86, this.combos.P1);
    }
    if (this.combos.P2.hits > 1) {
      this.renderComboDisplay(ctx, CANVAS_WIDTH - 220, topY + 86, this.combos.P2);
    }

    // --- Divider Line ---
    ctx.save();
    ctx.fillStyle = 'rgba(255, 214, 2, 0.25)';
    ctx.fillRect(0, CANVAS_HEIGHT - 29, CANVAS_WIDTH, 1);
    ctx.restore();

    // --- Controls Guide Strip ---
    ctx.save();
    ctx.fillStyle = 'rgba(6, 10, 20, 0.92)';
    ctx.fillRect(0, CANVAS_HEIGHT - 28, CANVAS_WIDTH, 28);
    ctx.font = '11px monospace';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';

    if (this.selectedMode === GAME_MODES.TRAINING) {
      ctx.fillText('TRAINING CONTROLS: [1] Stand  [2] Block  [3] Attack  [4] Dodge  |  [R] Reset Match  |  [ESC] Exit', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 10);
    } else if (this.selectedMode === GAME_MODES.PVP) {
      ctx.fillText('P1: WASD+J(Atk)/K(Hvy)/L(Block)/Space(Dodge)  |  P2: ARROWS+1/2/3/0 or I/O/P/Shift  |  H: Debug  |  ESC: Menu', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 10);
    } else {
      ctx.fillText('P1: WASD=Move | J=Light | K=Heavy | L=Hex Shield (Parry) | Space=Dodge | J+K=Ultimate | ESC: Menu', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 10);
    }
    ctx.restore();
  }

  renderStaminaBar(ctx, x, y, w, h, fighter, isRightAligned) {
    if (!fighter.stamina) return;

    ctx.save();
    // Background Frame
    ctx.fillStyle = '#0a101d';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    const st = fighter.stamina;
    const pct = Math.min(1, Math.max(0, st.current / st.max));
    const fillW = Math.round((w - 2) * pct);

    // Color logic: >50 green, 20-50 yellow, <20 red pulse
    let barColor = '#00e676';
    if (st.isBroken) {
      barColor = '#ff1744';
      ctx.shadowColor = '#ff1744';
      ctx.shadowBlur = 6 + Math.sin(Date.now() * 0.02) * 4;
    } else if (pct < 0.20) {
      barColor = '#ff5252';
      ctx.shadowColor = '#ff5252';
      ctx.shadowBlur = 5;
    } else if (pct < 0.50) {
      barColor = '#ffd600';
    }

    ctx.fillStyle = barColor;
    if (isRightAligned) {
      ctx.fillRect(x + w - 1 - fillW, y + 1, fillW, h - 2);
    } else {
      ctx.fillRect(x + 1, y + 1, fillW, h - 2);
    }

    // Status warning text if low/broken
    if (st.isBroken) {
      ctx.font = '900 8px monospace';
      ctx.fillStyle = '#ff1744';
      ctx.textAlign = isRightAligned ? 'right' : 'left';
      ctx.fillText('⚠️ STAMINA BREAK!', isRightAligned ? x + w : x, y + h + 8);
    } else if (pct < 0.20) {
      ctx.font = 'bold 8px monospace';
      ctx.fillStyle = '#ff9100';
      ctx.textAlign = isRightAligned ? 'right' : 'left';
      ctx.fillText('⚠️ LOW STAMINA', isRightAligned ? x + w : x, y + h + 8);
    }
    ctx.restore();
  }

  renderHealthBar(ctx, x, y, w, h, fighter, label, isRightAligned) {
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

    ctx.save();
    
    // Character Portrait (Hex-framed badge)
    const portraitX = isRightAligned ? x + w + 24 : x - 24;
    const accentColor = fighter.config.colors.accent || (fighter.config.id === 'topper' ? '#ffd602' : '#fe6b00');
    
    // Outer hex ring
    ctx.save();
    ctx.translate(portraitX, y + h / 2);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const hx = Math.cos(angle) * 20;
      const hy = Math.sin(angle) * 20;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    
    ctx.fillStyle = '#060c18';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = accentColor;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 12;
    
    if (isLowHP) {
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 16 + Math.sin(Date.now() * 0.01) * 8;
      ctx.strokeStyle = '#ff0000';
    }
    ctx.stroke();
    ctx.restore();

    // Emoji
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(charEmojiMap[fighter.config.id] || '🥊', portraitX, y + h / 2 + 1);

    // Name label
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = accentColor;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 4;
    ctx.textAlign = isRightAligned ? 'right' : 'left';
    ctx.fillText(label, isRightAligned ? x + w : x, y - 6);
    ctx.shadowBlur = 0;

    // Numerical HP display
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = isRightAligned ? 'left' : 'right';
    const curHp = Math.ceil(Math.max(0, fighter.health));
    ctx.fillText(`${curHp} / ${fighter.maxHealth} HP`, isRightAligned ? x : x + w, y - 6);

    // 1. Dark background bar with border
    ctx.fillStyle = '#040812';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#162238';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // 2. Ghost/lag bar in solar amber that decays smoothly
    const lagPct = Math.min(1, Math.max(0, (fighter.displayedHealth !== undefined ? fighter.displayedHealth : fighter.health) / fighter.maxHealth));
    let lagFillW = Math.round((w - 4) * lagPct);
    
    ctx.fillStyle = '#fe6b00';
    if (isRightAligned) {
      ctx.fillRect(x + w - 2 - lagFillW, y + 2, lagFillW, h - 4);
    } else {
      ctx.fillRect(x + 2, y + 2, lagFillW, h - 4);
    }

    // 3. Actual health fill as gradient
    const pct = Math.min(1, Math.max(0, fighter.health / fighter.maxHealth));
    const fillW = Math.round((w - 4) * pct);
    const fillGrad = ctx.createLinearGradient(x, y, x + w, y);
    if (pct > 0.5) {
      fillGrad.addColorStop(0, '#00e676');
      fillGrad.addColorStop(1, '#76ff03');
    } else if (pct > 0.25) {
      fillGrad.addColorStop(0, '#fe6b00');
      fillGrad.addColorStop(1, '#ffd602');
    } else {
      fillGrad.addColorStop(0, '#d50000');
      fillGrad.addColorStop(1, '#ff1744');
    }

    // 6. Subtle inner glow on bar fill
    ctx.shadowColor = pct > 0.5 ? '#76ff03' : (pct > 0.25 ? '#ffd602' : '#ff1744');
    ctx.shadowBlur = 8;
    ctx.fillStyle = fillGrad;
    
    if (isRightAligned) {
      ctx.fillRect(x + w - 2 - fillW, y + 2, fillW, h - 4);
    } else {
      ctx.fillRect(x + 2, y + 2, fillW, h - 4);
    }
    ctx.shadowBlur = 0;

    // 4. Segment dividers (25, 50, 75)
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    for (let i = 1; i <= 3; i++) {
      const segX = x + (w * (i * 0.25));
      ctx.fillRect(segX, y + 2, 1, h - 4);
    }

    // 5. Specular highlight strip
    const highlightGrad = ctx.createLinearGradient(x, y, x, y + h / 3);
    highlightGrad.addColorStop(0, 'rgba(255,255,255,0.4)');
    highlightGrad.addColorStop(1, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = highlightGrad;
    if (isRightAligned) {
      ctx.fillRect(x + w - 2 - fillW, y + 2, fillW, h / 3);
    } else {
      ctx.fillRect(x + 2, y + 2, fillW, h / 3);
    }
    
    ctx.restore();
  }

  renderUltimateMeter(ctx, x, y, w, h, fighter) {
    ctx.save();
    
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = '#90a4ae';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('METER', x, y + h / 2);
    
    const dotStartX = x + 30;
    const dotSpacing = (w - 30) / 10;
    const pct = Math.min(1, fighter.ultimateMeter / fighter.maxUltimate);
    const filledDots = Math.floor(pct * 10);
    const accentColor = fighter.config.colors.accent || '#00e5ff';

    const isFull = filledDots === 10;

    for (let i = 0; i < 10; i++) {
      const dotX = dotStartX + (i + 0.5) * dotSpacing;
      const dotY = y + h / 2;
      
      ctx.beginPath();
      ctx.arc(dotX, dotY, h/2 - 1, 0, Math.PI * 2);
      
      if (i < filledDots) {
        ctx.fillStyle = accentColor;
        ctx.shadowColor = isFull ? '#fe6b00' : accentColor;
        ctx.shadowBlur = isFull ? 10 + Math.sin(Date.now() * 0.01) * 6 : 6;
        if (isFull) ctx.fillStyle = '#ffd602';
        ctx.fill();
      } else {
        ctx.fillStyle = '#060c18';
        ctx.fill();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    if (isFull) {
      ctx.font = '900 10px monospace';
      ctx.fillStyle = '#ffd602';
      ctx.shadowColor = '#fe6b00';
      ctx.shadowBlur = 8;
      ctx.textAlign = 'center';
      ctx.fillText('⚡ ULTIMATE READY ⚡', dotStartX + (w - 30) / 2, y + h + 10);
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
    ctx.font = 'bold 16px "Arial Black", sans-serif';
    ctx.fillStyle = tier.color;
    ctx.shadowColor = tier.color;
    ctx.shadowBlur = 8;
    ctx.textAlign = 'left';
    const label = combo.hits >= 10 ? 'GODLIKE!' : (combo.hits >= 7 ? 'SMOKIN!' : 'COMBO!');
    ctx.fillText(label, x, y - 10);

    // Hit count
    ctx.font = '900 42px "Arial Black", sans-serif';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(`×${combo.hits}`, x, y + 30);
    ctx.fillStyle = tier.color;
    ctx.fillText(`×${combo.hits}`, x, y + 30);
    
    // Damage amount
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.fillText(`${combo.damage} DMG`, x, y + 50);

    ctx.restore();
  }

  /**
   * Renders a subtle gold radial spotlight following the fighter with higher HP%
   */
  renderAdvantageSpotlight(ctx) {
    if (!this.p1 || !this.p2) return;
    const p1Pct = this.p1.health / this.p1.maxHealth;
    const p2Pct = this.p2.health / this.p2.maxHealth;
    const diff = Math.abs(p1Pct - p2Pct);
    if (diff < 0.20) return; // Only show when advantage ≥ 20% HP
    const leader = p1Pct > p2Pct ? this.p1 : this.p2;
    ctx.save();
    const grad = ctx.createRadialGradient(leader.x, leader.y - 70, 20, leader.x, leader.y - 70, 200);
    grad.addColorStop(0, `rgba(255, 215, 0, ${Math.min(0.12, diff * 0.25)})`);
    grad.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(leader.x, leader.y - 70, 200, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
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
        ctx.font = '900 64px "Arial Black", Impact, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 25;
        ctx.fillText(`ROUND ${this.currentRound}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

        ctx.font = 'bold 18px monospace';
        ctx.fillStyle = '#ffd700';
        ctx.shadowBlur = 0;
        ctx.fillText('FIRST TO 2 ROUND WINS', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 25);
      } else {
        const pulse = Math.sin(this.phaseTimer * 0.25) * 8;
        ctx.font = '900 80px "Arial Black", Impact, sans-serif';
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
      ctx.font = '900 92px "Arial Black", Impact, sans-serif';
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

      ctx.fillStyle = 'rgba(8, 16, 32, 0.94)';
      ctx.strokeStyle = winnerColor;
      ctx.lineWidth = 3;
      ctx.shadowColor = winnerColor;
      ctx.shadowBlur = 24;
      drawRoundRect(ctx, bannerX, bannerY, bannerW, bannerH, 16);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Headline
      ctx.font = '900 38px "Arial Black", Impact, sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = winnerColor;
      ctx.shadowBlur = 20;
      const headline = isPVC
        ? (p1Won ? '🏆 YOU WIN THE ROUND! 🏆' : '💀 COMPUTER WINS THE ROUND! 🤖')
        : `👑 ${winnerName} WINS THE ROUND! 🥇`;
      ctx.fillText(headline, CANVAS_WIDTH / 2, bannerY + 45);

      // Fighter Sub-badge
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = winnerColor;
      ctx.shadowBlur = 0;
      ctx.fillText(`${winnerName} (${fighterName}) TAKES ROUND ${this.currentRound}`, CANVAS_WIDTH / 2, bannerY + 88);

      // Round Pips
      ctx.font = '900 20px monospace';
      ctx.fillStyle = '#ffffff';
      const p1Stars = '★'.repeat(this.p1RoundWins) + '☆'.repeat(Math.max(0, 2 - this.p1RoundWins));
      const p2Stars = '★'.repeat(this.p2RoundWins) + '☆'.repeat(Math.max(0, 2 - this.p2RoundWins));
      const p2Label = isPVC ? 'CPU' : 'P2';
      ctx.fillText(`SCORE:  P1 [ ${p1Stars} ]   vs   [ ${p2Stars} ] ${p2Label}`, CANVAS_WIDTH / 2, bannerY + 128);

      // Next Round Notice
      ctx.font = 'italic 13px monospace';
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
    // 1. Deep cinematic backdrop with gradient
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, 540);
    bgGrad.addColorStop(0, 'rgba(10, 24, 48, 0.96)');
    bgGrad.addColorStop(1, 'rgba(3, 7, 18, 0.98)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Main Victory Banner Header
    ctx.textAlign = 'center';
    let bannerTitle = 'MATCH DRAW — HONORS EVEN!';
    let bannerSub = 'A grueling clash with no clear victor.';
    let bannerColor = '#ffd700';

    if (isPVC) {
      if (p1Won) {
        bannerTitle = '🎉 VICTORY! YOU DEFEATED THE COMPUTER! 🏆';
        bannerSub = `Outstanding combat! You dominated with ${this.p1.config.displayName.toUpperCase()}!`;
        bannerColor = '#00e676';
      } else {
        bannerTitle = '💀 DEFEAT! THE COMPUTER CLAIMS THE VICTORY 🤖';
        bannerSub = `The AI bot prevailed with ${this.p2.config.displayName.toUpperCase()}. Practice and hit Rematch!`;
        bannerColor = '#ff1744';
      }
    } else {
      if (p1Won) {
        bannerTitle = '👑 PLAYER 1 WINS THE CLASH! 🥇';
        bannerSub = `${this.p1.config.displayName.toUpperCase()} TAKES THE SRM TROPHY!`;
        bannerColor = '#00e5ff';
      } else if (p2Won) {
        bannerTitle = '👑 PLAYER 2 WINS THE CLASH! 🥇';
        bannerSub = `${this.p2.config.displayName.toUpperCase()} TAKES THE SRM TROPHY!`;
        bannerColor = '#ff6b35';
      }
    }

    // Top Category Ribbon
    ctx.font = '900 13px monospace';
    ctx.fillStyle = bannerColor;
    ctx.shadowColor = bannerColor;
    ctx.shadowBlur = 10;
    ctx.fillText(isPVC ? 'SRM CAMPUS CLASH — SOLO BATTLE RESULTS' : 'SRM CAMPUS CLASH — 1v1 BRAWL RESULTS', w / 2, 34);

    // Big Headline
    ctx.font = '900 34px "Arial Black", Impact, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = bannerColor;
    ctx.shadowBlur = 25;
    ctx.fillText(bannerTitle, w / 2, 70);

    // Subtitle
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.shadowBlur = 0;
    ctx.fillText(bannerSub, w / 2, 98);

    // 3. Dual Fighter Showcase Cards (P1 vs P2/CPU)
    const cardY = 114;
    const cardH = 205;

    // LEFT CARD: PLAYER 1
    const p1CardX = 50;
    const p1CardW = 410;
    ctx.fillStyle = p1Won ? 'rgba(0, 230, 118, 0.12)' : 'rgba(16, 24, 40, 0.85)';
    ctx.strokeStyle = p1Won ? '#00e676' : '#263238';
    ctx.lineWidth = p1Won ? 3 : 1.5;
    ctx.shadowColor = p1Won ? '#00e676' : 'transparent';
    ctx.shadowBlur = p1Won ? 18 : 0;
    drawRoundRect(ctx, p1CardX, cardY, p1CardW, cardH, 14);
    ctx.fill();
    ctx.stroke();

    // P1 Winner / Loser Badge
    ctx.shadowBlur = 0;
    ctx.fillStyle = p1Won ? '#00e676' : '#37474f';
    drawRoundRect(ctx, p1CardX + 16, cardY + 14, 130, 26, 6);
    ctx.fill();
    ctx.font = '900 13px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(p1Won ? '👑 WINNER' : '🥈 RUNNER-UP', p1CardX + 81, cardY + 31);

    // P1 Fighter Name & Title
    ctx.textAlign = 'left';
    ctx.font = '900 22px "Arial Black", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`PLAYER 1: ${this.p1.config.displayName}`, p1CardX + 16, cardY + 68);
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = this.p1.config.colors.accent || '#ffd700';
    ctx.fillText(`"${this.p1.config.tagline || 'Fighter'}"`, p1CardX + 16, cardY + 88);

    // P1 Dialogue Quote Bubble
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    drawRoundRect(ctx, p1CardX + 16, cardY + 98, p1CardW - 32, 48, 8);
    ctx.fill();
    ctx.font = 'italic 13px sans-serif';
    ctx.fillStyle = '#e0e0e0';
    const p1Quote = p1Won
      ? (this.p1.config?.dialogue?.win || 'Victory is ours!')
      : (this.p1.config?.dialogue?.lose || this.p1.config?.dialogue?.taunt || 'Good fight. Rematch soon!');
    ctx.fillText(`"${p1Quote}"`, p1CardX + 26, cardY + 127);

    // P1 Rounds Score
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#ffd700';
    const p1StarsDisplay = '★'.repeat(this.p1RoundWins) + '☆'.repeat(Math.max(0, 2 - this.p1RoundWins));
    ctx.fillText(`ROUNDS WON: [ ${p1StarsDisplay} ]  (${this.p1RoundWins}/2)`, p1CardX + 16, cardY + 180);

    // RIGHT CARD: PLAYER 2 / COMPUTER
    const p2CardX = 500;
    const p2CardW = 410;
    ctx.fillStyle = p2Won ? 'rgba(255, 107, 53, 0.15)' : 'rgba(16, 24, 40, 0.85)';
    ctx.strokeStyle = p2Won ? '#ff6b35' : '#263238';
    ctx.lineWidth = p2Won ? 3 : 1.5;
    ctx.shadowColor = p2Won ? '#ff6b35' : 'transparent';
    ctx.shadowBlur = p2Won ? 18 : 0;
    drawRoundRect(ctx, p2CardX, cardY, p2CardW, cardH, 14);
    ctx.fill();
    ctx.stroke();

    // P2 Winner / Loser Badge
    ctx.shadowBlur = 0;
    ctx.fillStyle = p2Won ? (isPVC ? '#ff1744' : '#ff6b35') : '#37474f';
    drawRoundRect(ctx, p2CardX + 16, cardY + 14, 130, 26, 6);
    ctx.fill();
    ctx.font = '900 13px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(p2Won ? '👑 WINNER' : '🥈 RUNNER-UP', p2CardX + 81, cardY + 31);

    // P2 Fighter Name & Title
    ctx.textAlign = 'left';
    ctx.font = '900 22px "Arial Black", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${p2Label}: ${this.p2.config.displayName}`, p2CardX + 16, cardY + 68);
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = this.p2.config?.colors?.accent || '#ffd700';
    ctx.fillText(`"${this.p2.config?.tagline || 'Fighter'}"`, p2CardX + 16, cardY + 88);

    // P2 Dialogue Quote Bubble
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    drawRoundRect(ctx, p2CardX + 16, cardY + 98, p2CardW - 32, 48, 8);
    ctx.fill();
    ctx.font = 'italic 13px sans-serif';
    ctx.fillStyle = '#e0e0e0';
    const p2Quote = p2Won
      ? (this.p2.config?.dialogue?.win || 'Victory is ours!')
      : (this.p2.config?.dialogue?.lose || this.p2.config?.dialogue?.taunt || 'Good fight. Rematch soon!');
    ctx.fillText(`"${p2Quote}"`, p2CardX + 26, cardY + 127);

    // P2 Rounds Score
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#ffd700';
    const p2StarsDisplay = '★'.repeat(this.p2RoundWins) + '☆'.repeat(Math.max(0, 2 - this.p2RoundWins));
    ctx.fillText(`ROUNDS WON: [ ${p2StarsDisplay} ]  (${this.p2RoundWins}/2)`, p2CardX + 16, cardY + 180);

    // Center VS Score Pill
    const vsX = 435;
    const vsY = 192;
    ctx.fillStyle = '#0a192f';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    drawRoundRect(ctx, vsX, vsY, 90, 50, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.font = '900 20px monospace';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`${this.p1RoundWins} - ${this.p2RoundWins}`, vsX + 45, vsY + 31);

    // 4. Detailed Statistics Comparison Table Card
    const statsCardX = 50;
    const statsCardY = 330;
    const statsCardW = 860;
    const statsCardH = 200;

    ctx.fillStyle = 'rgba(12, 20, 36, 0.92)';
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 1.5;
    drawRoundRect(ctx, statsCardX, statsCardY, statsCardW, statsCardH, 12);
    ctx.fill();
    ctx.stroke();

    // Table Header
    ctx.font = '900 13px monospace';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'left';
    ctx.fillText('MATCH PERFORMANCE BREAKDOWN', statsCardX + 25, statsCardY + 30);
    ctx.textAlign = 'center';
    ctx.fillText(`PLAYER 1 (${this.p1.config.displayName.toUpperCase()})`, statsCardX + 470, statsCardY + 30);
    ctx.fillText(`${p2Label} (${this.p2.config.displayName.toUpperCase()})`, statsCardX + 720, statsCardY + 30);

    // Horizontal Rule
    ctx.strokeStyle = '#37474f';
    ctx.beginPath();
    ctx.moveTo(statsCardX + 20, statsCardY + 42);
    ctx.lineTo(statsCardX + statsCardW - 20, statsCardY + 42);
    ctx.stroke();

    const statsRows = [
      {
        label: 'Rounds Won',
        p1: `${this.p1RoundWins} / 2`,
        p2: `${this.p2RoundWins} / 2`,
        p1Best: this.p1RoundWins > this.p2RoundWins,
        p2Best: this.p2RoundWins > this.p1RoundWins
      },
      {
        label: 'Total Damage Dealt',
        p1: `${this.matchStats.P1.totalDamage} HP`,
        p2: `${this.matchStats.P2.totalDamage} HP`,
        p1Best: this.matchStats.P1.totalDamage > this.matchStats.P2.totalDamage,
        p2Best: this.matchStats.P2.totalDamage > this.matchStats.P1.totalDamage
      },
      {
        label: 'Max Combo Streak',
        p1: `${this.matchStats.P1.maxCombo} HITS`,
        p2: `${this.matchStats.P2.maxCombo} HITS`,
        p1Best: this.matchStats.P1.maxCombo > this.matchStats.P2.maxCombo,
        p2Best: this.matchStats.P2.maxCombo > this.matchStats.P1.maxCombo
      },
      {
        label: 'Total Attacks Landed',
        p1: `${this.matchStats.P1.hits} HITS`,
        p2: `${this.matchStats.P2.hits} HITS`,
        p1Best: this.matchStats.P1.hits > this.matchStats.P2.hits,
        p2Best: this.matchStats.P2.hits > this.matchStats.P1.hits
      }
    ];

    statsRows.forEach((r, idx) => {
      const rowY = statsCardY + 74 + idx * 36;
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#90a4ae';
      ctx.textAlign = 'left';
      ctx.fillText(r.label, statsCardX + 25, rowY);

      // P1 Value
      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = r.p1Best ? '#00e676' : '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(r.p1 + (r.p1Best ? ' 👑' : ''), statsCardX + 470, rowY);

      // P2 Value
      ctx.fillStyle = r.p2Best ? '#00e676' : '#ffffff';
      ctx.fillText(r.p2 + (r.p2Best ? ' 👑' : ''), statsCardX + 720, rowY);
    });

    // 5. Action Buttons (Rematch, Change Fighters, Main Menu)
    const btnY = 548;
    const btnH = 48;

    // Button 1: Rematch
    const b1X = 100, b1W = 230;
    ctx.fillStyle = 'rgba(0, 230, 118, 0.22)';
    ctx.strokeStyle = '#00e676';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00e676';
    ctx.shadowBlur = 12;
    drawRoundRect(ctx, b1X, btnY, b1W, btnH, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = '900 15px monospace';
    ctx.fillStyle = '#00e676';
    ctx.textAlign = 'center';
    ctx.fillText('🔁 REMATCH (R / ENTER)', b1X + b1W / 2, btnY + 29);

    // Button 2: Change Fighters
    const b2X = 365, b2W = 230;
    ctx.fillStyle = 'rgba(255, 215, 0, 0.22)';
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 12;
    drawRoundRect(ctx, b2X, btnY, b2W, btnH, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = '900 15px monospace';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.fillText('👥 FIGHTERS (M)', b2X + b2W / 2, btnY + 29);

    // Button 3: Main Menu
    const b3X = 630, b3W = 230;
    ctx.fillStyle = 'rgba(0, 229, 255, 0.18)';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    drawRoundRect(ctx, b3X, btnY, b3W, btnH, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = '900 15px monospace';
    ctx.fillStyle = '#00e5ff';
    ctx.textAlign = 'center';
    ctx.fillText('🏠 MAIN MENU (ESC)', b3X + b3W / 2, btnY + 29);

    ctx.restore();
  }
}

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
