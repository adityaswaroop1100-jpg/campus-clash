/**
 * Campus Clash — AI Bot Controller
 * @module ai/botController
 */

import { INPUT_ACTIONS } from '../utils/constants.js';

export class BotController {
  constructor() {
    this.activeActions = new Set();
    this.justPressedActions = new Set();

    // AI Decision timers & behavior state
    this.decisionTimer = 0;
    this.actionHoldTimer = 0;
    this.currentAction = null;
    this.difficulty = 'normal'; // 'easy', 'normal', 'hard'

    // Reaction delay buffer
    this.reactionFrames = 0;
    this.lastOpponentState = null;
  }

  reset() {
    this.activeActions.clear();
    this.justPressedActions.clear();
    this.decisionTimer = 0;
    this.actionHoldTimer = 0;
    this.currentAction = null;
    this.reactionFrames = 0;
  }

  /**
   * Called once per frame during update()
   * @param {import('../entities/fighter.js').Fighter} bot - The AI controlled fighter
   * @param {import('../entities/fighter.js').Fighter} opponent - Human player
   * @param {import('../stages/stageBase.js').StageBase} stage - Current stage
   */
  update(bot, opponent, stage) {
    // Clear single frame presses from previous frame
    this.justPressedActions.clear();

    if (this.actionHoldTimer > 0) {
      this.actionHoldTimer--;
      if (this.actionHoldTimer <= 0) {
        this.activeActions.clear();
        this.currentAction = null;
      }
    }

    this.decisionTimer--;
    if (this.decisionTimer <= 0) {
      this.makeDecision(bot, opponent, stage);
      // Decide every 6 to 14 frames for natural reaction time
      this.decisionTimer = 6 + Math.floor(Math.random() * 8);
    }
  }

  pressAction(action, holdFrames = 4) {
    this.justPressedActions.add(action);
    this.activeActions.add(action);
    this.actionHoldTimer = holdFrames;
    this.currentAction = action;
  }

  holdAction(action, holdFrames = 12) {
    this.activeActions.add(action);
    this.actionHoldTimer = holdFrames;
    this.currentAction = action;
  }

  makeDecision(bot, opponent, stage) {
    if (!bot || !opponent) return;

    // Don't act during hitstun, knockdown, or freeze
    if (!bot.stateMachine.isActionable()) {
      this.activeActions.clear();
      return;
    }

    const dist = Math.abs(bot.x - opponent.x);
    const isToLeft = bot.x < opponent.x;
    const moveToward = isToLeft ? INPUT_ACTIONS.RIGHT : INPUT_ACTIONS.LEFT;
    const moveAway = isToLeft ? INPUT_ACTIONS.LEFT : INPUT_ACTIONS.RIGHT;

    const oppState = opponent.stateMachine.getState();
    const oppAttacking = oppState === 'attacking';

    // 1. ULTIMATE MOVE: If meter full and in range
    if (bot.ultimateMeter >= bot.maxUltimate && dist < 240) {
      this.pressAction(INPUT_ACTIONS.ULTIMATE, 2);
      return;
    }

    // 2. DEFENSIVE REACTIONS: When opponent attacks
    if (oppAttacking && dist < 170) {
      const roll = Math.random();
      if (roll < 0.45) {
        // Hex-Shield Block
        this.holdAction(INPUT_ACTIONS.BLOCK, 18);
        return;
      } else if (roll < 0.70) {
        // Evasive Dodge (near-miss window)
        this.pressAction(INPUT_ACTIONS.DODGE, 2);
        return;
      } else if (roll < 0.90) {
        // Jump counter
        this.pressAction(INPUT_ACTIONS.UP, 2);
        return;
      }
    }

    // 3. HAZARD AVOIDANCE: If near falling food hazard
    if (stage && stage.activeHazards && stage.activeHazards.length > 0) {
      for (const hazard of stage.activeHazards) {
        const hDist = Math.abs(bot.x - hazard.x);
        if (hDist < 80) {
          // Dodge away from hazard
          this.pressAction(INPUT_ACTIONS.DODGE, 2);
          return;
        }
      }
    }

    // 4. MELEE ENGAGEMENT (Close Range: < 110px)
    if (dist <= 110) {
      const roll = Math.random();
      if (roll < 0.50) {
        // Light Attack (Jab / Paper Plane)
        this.pressAction(INPUT_ACTIONS.LIGHT, 2);
      } else if (roll < 0.78) {
        // Heavy Attack (Calculator / Backpack)
        this.pressAction(INPUT_ACTIONS.HEAVY, 2);
      } else if (roll < 0.90) {
        // Jump attack or back off
        this.pressAction(INPUT_ACTIONS.UP, 2);
      } else {
        // Quick Block
        this.holdAction(INPUT_ACTIONS.BLOCK, 10);
      }
      return;
    }

    // 5. MID RANGE (110px to 230px)
    if (dist <= 230) {
      const roll = Math.random();
      if (roll < 0.35) {
        // Approach
        this.holdAction(moveToward, 10);
      } else if (roll < 0.65) {
        // Heavy strike (has range)
        this.pressAction(INPUT_ACTIONS.HEAVY, 2);
      } else if (roll < 0.85) {
        // Jump in
        this.pressAction(INPUT_ACTIONS.UP, 2);
        this.holdAction(moveToward, 12);
      } else {
        // Retreat / bait
        this.holdAction(moveAway, 8);
      }
      return;
    }

    // 6. LONG RANGE (> 230px) — Close the gap
    const longRoll = Math.random();
    if (longRoll < 0.75) {
      this.holdAction(moveToward, 14);
    } else if (longRoll < 0.90) {
      // Jump forward
      this.pressAction(INPUT_ACTIONS.UP, 2);
      this.holdAction(moveToward, 14);
    } else {
      // Light ranged probe
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
