/**
 * Campus Clash — Anti-Spam Strategic Combat Mechanics System
 * @module engine/combatMechanics
 */

import { STAMINA_CONFIG, ATTACK_COOLDOWNS, COMBO_DAMAGE_SCALING } from '../utils/constants.js';

export class StaminaSystem {
  constructor() {
    this.maxStamina = STAMINA_CONFIG.MAX;
    this.currentStamina = STAMINA_CONFIG.MAX;
    this.displayedStamina = STAMINA_CONFIG.MAX;
    this.regenerationRate = STAMINA_CONFIG.REGEN_PER_FRAME;
    this.staminaBreak = false;
    this.breakTimer = 0;
  }

  update() {
    if (this.staminaBreak) {
      this.breakTimer--;
      if (this.breakTimer <= 0) {
        this.staminaBreak = false;
        this.currentStamina = STAMINA_CONFIG.LOW_THRESHOLD;
      }
    } else {
      if (this.currentStamina < this.maxStamina) {
        this.currentStamina = Math.min(
          this.maxStamina,
          this.currentStamina + this.regenerationRate
        );
      }
    }

    // Smooth ghost bar interpolation
    this.displayedStamina += (this.currentStamina - this.displayedStamina) * 0.15;
  }

  canPerform(cost) {
    if (this.staminaBreak) return false;
    return this.currentStamina >= cost;
  }

  consume(cost) {
    this.currentStamina = Math.max(0, this.currentStamina - cost);
    if (this.currentStamina <= 0) {
      this.currentStamina = 0;
      this.staminaBreak = true;
      this.breakTimer = STAMINA_CONFIG.BREAK_DURATION;
    }
  }

  getDamagePenaltyMultiplier() {
    if (this.currentStamina < STAMINA_CONFIG.LOW_THRESHOLD) {
      return 0.7; // -30% damage when exhausted
    }
    return 1.0;
  }

  getSpeedPenaltyMultiplier() {
    if (this.staminaBreak) {
      return 0.5; // -50% movement speed during stamina break
    }
    return 1.0;
  }

  reset() {
    this.currentStamina = this.maxStamina;
    this.displayedStamina = this.maxStamina;
    this.staminaBreak = false;
    this.breakTimer = 0;
  }
}

export class CooldownSystem {
  constructor() {
    this.cooldowns = {
      light: 0,
      heavy: 0,
      special: 0,
      dodge: 0,
      parry: 0
    };
  }

  update() {
    for (const key in this.cooldowns) {
      if (this.cooldowns[key] > 0) {
        this.cooldowns[key]--;
      }
    }
  }

  canUse(action) {
    return (this.cooldowns[action] || 0) <= 0;
  }

  trigger(action, durationFrames) {
    this.cooldowns[action] = durationFrames;
  }

  reset() {
    for (const key in this.cooldowns) {
      this.cooldowns[key] = 0;
    }
  }
}

export class ComboScaling {
  constructor() {
    this.comboCount = 0;
    this.comboTimer = 0;
    this.scalingTable = COMBO_DAMAGE_SCALING;
  }

  onHit() {
    this.comboCount++;
    this.comboTimer = 60; // 60-frame combo window (1.0s)
  }

  registerHit() {
    this.onHit();
  }

  update() {
    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
      }
    }
  }

  getDamageMultiplier() {
    if (this.comboCount <= 1) return 1.0;
    if (this.comboCount >= 7) return this.scalingTable[7] || 0.45;
    return this.scalingTable[this.comboCount] || 0.50;
  }

  reset() {
    this.comboCount = 0;
    this.comboTimer = 0;
  }
}

export class CounterHitSystem {
  /**
   * Checks if the defender is in an unsafe state (startup, active, or whiff/recovery)
   * @param {Object} attacker
   * @param {Object} defender
   * @returns {boolean}
   */
  static isCounterHit(attacker, defender) {
    if (!defender) return false;
    const defState = defender.stateMachine ? defender.stateMachine.getState() : defender.state;

    // 1. Defender is in attacking state
    if (defState === 'attacking' && defender.currentMove) {
      return true;
    }
    // 2. Defender is in dodging state (whiffed dodge)
    if (defState === 'dodging' && defender.invulnerableFrames <= 0) {
      return true;
    }
    return false;
  }

  static getBonusDamageMultiplier() {
    return 1.20; // +20% damage on counter-hit
  }

  static getBonusHitstun() {
    return 5; // +5 extra frames of hitstun
  }
}

export class ParrySystem {
  constructor() {
    this.isParrying = false;
    this.parryWindow = 4; // 4-frame tight execution window
    this.parryTimer = 0;
    this.parryCooldown = 0;
    this.hasActiveBuff = false;
    this.buffTimer = 0;
  }

  attemptParry() {
    if (this.parryCooldown > 0) return false;
    this.isParrying = true;
    this.parryTimer = this.parryWindow;
    return true;
  }

  update() {
    if (this.parryTimer > 0) {
      this.parryTimer--;
      if (this.parryTimer <= 0) {
        this.isParrying = false;
      }
    }

    if (this.parryCooldown > 0) {
      this.parryCooldown--;
    }

    if (this.buffTimer > 0) {
      this.buffTimer--;
      if (this.buffTimer <= 0) {
        this.hasActiveBuff = false;
      }
    }
  }

  checkParryWindow() {
    return this.isParrying && this.parryTimer > 0;
  }

  onSuccessfulParry() {
    this.isParrying = false;
    this.parryTimer = 0;
    this.parryCooldown = 20;
    this.hasActiveBuff = true;
    this.buffTimer = 90; // 1.5s damage buff
    return {
      meterBonus: 20,
      damageMultiplier: 1.15
    };
  }

  onWhiffParry() {
    this.isParrying = false;
    this.parryCooldown = 18; // 18-frame penalty where blocking is disabled
  }

  reset() {
    this.isParrying = false;
    this.parryTimer = 0;
    this.parryCooldown = 0;
    this.hasActiveBuff = false;
    this.buffTimer = 0;
  }
}

export class RageSystem {
  constructor() {
    this.isRage = false;
    this.rageThreshold = 0.30; // Activates below 30% health
    this.pulseAnim = 0;
  }

  update(currentHealth, maxHealth, opponentHealth) {
    this.pulseAnim += 0.08;
    const healthPercent = currentHealth / (maxHealth || 1);
    const oppPercent = opponentHealth / (maxHealth || 1);

    // Condition 1: Health below 30%
    // Condition 2: Opponent has double your health while you're below 50%
    if (healthPercent <= this.rageThreshold || (healthPercent <= 0.45 && oppPercent >= healthPercent * 2.0)) {
      this.isRage = true;
    } else {
      this.isRage = false;
    }
  }

  getDamageMultiplier() {
    return this.isRage ? 1.20 : 1.0; // +20% damage
  }

  getDefenseMultiplier() {
    return this.isRage ? 0.80 : 1.0; // -20% damage taken
  }

  getMeterGainMultiplier() {
    return this.isRage ? 1.50 : 1.0; // +50% meter gain
  }

  reset() {
    this.isRage = false;
    this.pulseAnim = 0;
  }
}
