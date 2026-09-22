/**
 * Campus Clash — Tournament-Caliber Expert AI Bot Controller
 * Emulates high-level fighting game mastery: frame advantage, whiff punishes,
 * true multi-hit combos, anti-air counters, footsies spacing, and character archetypes.
 * @module ai/botController
 */

import { INPUT_ACTIONS, FIGHTER_STATES } from '../utils/constants.js';

export class BotController {
  constructor() {
    this.activeActions = new Set();
    this.justPressedActions = new Set();

    // AI Configuration
    this.difficulty = 'expert'; // 'easy', 'normal', 'hard', 'expert'
    
    // Core Timers & State Machine
    this.decisionTimer = 0;
    this.actionHoldTimer = 0;
    this.currentAction = null;
    
    // Combo & Execution Queue
    this.comboQueue = []; // [{action, holdFrames, delayBefore}]
    this.queueDelay = 0;

    // Tactical State Tracking
    this.lastOpponentState = null;
    this.opponentWhiffTimer = 0;
    this.footsiesTimer = 0;
    this.footsiesDir = 1; // 1 = toward, -1 = back
    this.wasOpponentAirborne = false;
  }

  reset() {
    this.activeActions.clear();
    this.justPressedActions.clear();
    this.decisionTimer = 0;
    this.actionHoldTimer = 0;
    this.currentAction = null;
    this.comboQueue = [];
    this.queueDelay = 0;
    this.opponentWhiffTimer = 0;
    this.footsiesTimer = 0;
  }

  /**
   * Called once per frame during 60 FPS update
   * @param {import('../entities/fighter.js').Fighter} bot - The AI controlled fighter (P2)
   * @param {import('../entities/fighter.js').Fighter} opponent - Human player (P1)
   * @param {import('../stages/stageBase.js').StageBase} stage - Current arena
   */
  update(bot, opponent, stage) {
    // Clear single-frame presses from previous frame
    this.justPressedActions.clear();

    // 1. Process Active Action Hold Expiration
    if (this.actionHoldTimer > 0) {
      this.actionHoldTimer--;
      if (this.actionHoldTimer <= 0) {
        this.activeActions.clear();
        this.currentAction = null;
      }
    }

    // 2. Process Buffered Combo Queue (Frame-Perfect Multi-Hit Chains)
    if (this.comboQueue.length > 0) {
      if (this.queueDelay > 0) {
        this.queueDelay--;
      } else {
        const nextMove = this.comboQueue.shift();
        if (nextMove) {
          this.pressAction(nextMove.action, nextMove.holdFrames || 3);
          this.queueDelay = nextMove.delayBefore || 0;
        }
      }
      return;
    }

    // 3. Expert Fast-Tick AI Decisions (1 to 3 frames response latency on Expert)
    this.decisionTimer--;
    if (this.decisionTimer <= 0) {
      this.makeExpertDecision(bot, opponent, stage);
      // Expert: ultra-sharp 1–3 frame evaluation window
      this.decisionTimer = this.difficulty === 'expert' ? (1 + Math.floor(Math.random() * 3)) : 6;
    }

    if (opponent) {
      this.lastOpponentState = opponent.stateMachine.getState();
      this.wasOpponentAirborne = !opponent.isGrounded;
    }
  }

  pressAction(action, holdFrames = 3) {
    this.justPressedActions.add(action);
    this.activeActions.add(action);
    this.actionHoldTimer = holdFrames;
    this.currentAction = action;
  }

  holdAction(action, holdFrames = 10) {
    this.activeActions.add(action);
    this.actionHoldTimer = holdFrames;
    this.currentAction = action;
  }

  queueCombo(moves) {
    this.comboQueue = [...moves];
    this.queueDelay = 0;
  }

  /**
   * Main Expert Combat Reasoning Pipeline
   */
  makeExpertDecision(bot, opponent, stage) {
    if (!bot || !opponent) return;

    // Do not act if in hitstun, knocked down, or frozen
    if (!bot.stateMachine.isActionable()) {
      this.activeActions.clear();
      this.comboQueue = [];
      return;
    }

    const dist = Math.abs(bot.x - opponent.x);
    const isToLeft = bot.x < opponent.x;
    const moveToward = isToLeft ? INPUT_ACTIONS.RIGHT : INPUT_ACTIONS.LEFT;
    const moveAway = isToLeft ? INPUT_ACTIONS.LEFT : INPUT_ACTIONS.RIGHT;

    const oppState = opponent.stateMachine.getState();
    const oppAttacking = oppState === FIGHTER_STATES.ATTACKING;
    const oppHitstun = oppState === FIGHTER_STATES.HITSTUN;
    const oppBlocking = opponent.isBlocking;
    const oppAirborne = !opponent.isGrounded;

    const isRageActive = bot.health < bot.maxHealth * 0.35;
    const stageWidth = stage ? (stage.width || 960) : 960;
    const oppCornered = opponent.x < 110 || opponent.x > stageWidth - 110;

    // =========================================================================
    // 1. HIT CONFIRM CANCELS (Pro combo extension into Ultimate)
    // =========================================================================
    if (oppHitstun && dist < 170) {
      // If ultimate is fully charged, execute guaranteed combo finish
      if (bot.ultimateMeter >= bot.maxUltimate) {
        this.pressAction(INPUT_ACTIONS.ULTIMATE, 2);
        return;
      }
      // If already landed a hit, cancel into Heavy strike for 2-hit juggle
      if (Math.random() < 0.88) {
        this.pressAction(INPUT_ACTIONS.HEAVY, 3);
        return;
      }
    }

    // =========================================================================
    // 2. ANTI-AIR REACTION (Knocks airborne jump-ins out of the sky)
    // =========================================================================
    if (oppAirborne && dist < 180 && opponent.y < (bot.y - 30)) {
      // Opponent is descending towards bot -> Frame-perfect Anti-Air Heavy
      if (Math.random() < 0.90) {
        this.pressAction(INPUT_ACTIONS.HEAVY, 3);
        return;
      }
    }

    // =========================================================================
    // 3. WHIFF PUNISH ENGINE (Punishes opponent when they miss attacks)
    // =========================================================================
    if (this.lastOpponentState === FIGHTER_STATES.ATTACKING && oppState !== FIGHTER_STATES.ATTACKING && dist < 210) {
      // Opponent just whiffed an attack and is in recovery frames!
      if (Math.random() < 0.92) {
        // Instant Whiff Punish: Dash in + Heavy Attack
        this.queueCombo([
          { action: moveToward, holdFrames: 4, delayBefore: 0 },
          { action: INPUT_ACTIONS.HEAVY, holdFrames: 3, delayBefore: 1 }
        ]);
        return;
      }
    }

    // =========================================================================
    // 4. EXPERT DEFENSE (Frame-accurate block & evasive counter-rolls)
    // =========================================================================
    if (oppAttacking && dist < 180) {
      const defenseRoll = Math.random();
      
      // Against heavy attacks or close combat: Perfect Dodge Roll behind player
      if (dist < 130 && defenseRoll < 0.42) {
        // Dodge through the attack (triggers near-miss slowmo!)
        this.pressAction(INPUT_ACTIONS.DODGE, 2);
        return;
      }

      // Proactive Hex-Shield Block
      if (defenseRoll < 0.94) {
        this.holdAction(INPUT_ACTIONS.BLOCK, 14);
        return;
      }
    }

    // =========================================================================
    // 5. STAGE HAZARD EVASION
    // =========================================================================
    if (stage && stage.activeHazards && stage.activeHazards.length > 0) {
      for (const hazard of stage.activeHazards) {
        const hDist = Math.abs(bot.x - hazard.x);
        if (hDist < 85) {
          this.pressAction(INPUT_ACTIONS.DODGE, 2);
          return;
        }
      }
    }

    // =========================================================================
    // 6. CLOSE-RANGE OFFENSE (Melee Range: dist < 115px)
    // =========================================================================
    if (dist <= 115) {
      // If opponent is blocking, mix up with Heavy guard-crush or Dodge cross-up
      if (oppBlocking) {
        if (Math.random() < 0.65) {
          // Heavy attack to shatter block / drain stamina
          this.pressAction(INPUT_ACTIONS.HEAVY, 3);
        } else {
          // Dodge roll through to get behind their block shield!
          this.pressAction(INPUT_ACTIONS.DODGE, 2);
        }
        return;
      }

      // Pro Mix-Up: Light into Heavy chain or instant Ultimate
      if (bot.ultimateMeter >= bot.maxUltimate && Math.random() < 0.85) {
        this.pressAction(INPUT_ACTIONS.ULTIMATE, 2);
        return;
      }

      const closeRoll = Math.random();
      if (closeRoll < 0.55) {
        // Fast Light Jab starter
        this.pressAction(INPUT_ACTIONS.LIGHT, 2);
      } else if (closeRoll < 0.85) {
        // Heavy Launcher
        this.pressAction(INPUT_ACTIONS.HEAVY, 3);
      } else {
        // Jump cross-up
        this.pressAction(INPUT_ACTIONS.UP, 2);
        this.holdAction(moveToward, 8);
      }
      return;
    }

    // =========================================================================
    // 7. MID-RANGE FOOTSIES & SPACING (dist: 115px to 240px)
    // =========================================================================
    if (dist <= 240) {
      // If cornered, press the advantage aggressively
      if (oppCornered) {
        this.holdAction(moveToward, 8);
        if (Math.random() < 0.70) {
          this.pressAction(INPUT_ACTIONS.LIGHT, 2);
        }
        return;
      }

      // Footsies micro-spacing dance (baiting whiffs)
      this.footsiesTimer++;
      if (this.footsiesTimer > 12) {
        this.footsiesTimer = 0;
        this.footsiesDir *= -1; // alternate step forward and step back
      }

      const midRoll = Math.random();
      if (midRoll < 0.40) {
        // Step in for poke attack
        this.holdAction(moveToward, 8);
        this.pressAction(INPUT_ACTIONS.LIGHT, 2);
      } else if (midRoll < 0.68) {
        // Heavy lunging strike
        this.pressAction(INPUT_ACTIONS.HEAVY, 3);
      } else if (midRoll < 0.85) {
        // Jump-in aerial strike
        this.pressAction(INPUT_ACTIONS.UP, 2);
        this.holdAction(moveToward, 12);
      } else {
        // Micro-retreat to bait human whiff
        this.holdAction(moveAway, 6);
      }
      return;
    }

    // =========================================================================
    // 8. LONG RANGE (dist > 240px) — Gap Closing & Projectile Harassment
    // =========================================================================
    const longRoll = Math.random();
    if (longRoll < 0.65) {
      // Aggressively close distance
      this.holdAction(moveToward, 14);
    } else if (longRoll < 0.85) {
      // Jump forward leap
      this.pressAction(INPUT_ACTIONS.UP, 2);
      this.holdAction(moveToward, 14);
    } else {
      // Long-range projectile probe (paper plane, calculator beam, etc.)
      this.pressAction(INPUT_ACTIONS.LIGHT, 2);
    }
  }

  isActionActive(action, player = 'P2') {
    return this.activeActions.has(action);
  }

  isActionJustPressed(action, player = 'P2') {
    return this.justPressedActions.has(action);
  }
}
