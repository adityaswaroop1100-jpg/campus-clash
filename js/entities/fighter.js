/**
 * Campus Clash — Base Fighter Entity with Realistic Articulated Models & Animations
 * @module entities/fighter
 */

import { FIGHTER_STATES, INPUT_ACTIONS, STAMINA_CONFIG, ATTACK_COOLDOWNS } from '../utils/constants.js';
import { StateMachine } from '../engine/stateMachine.js';
import { Box, MoveData } from '../engine/hitbox.js';
import { WeaponTrail, WeaponGlow } from '../engine/weaponVisuals.js';
import { StaminaSystem, CooldownSystem, ParrySystem, RageSystem } from '../engine/combatMechanics.js';

export class Fighter {
  /**
   * @param {Object} config - Character configuration (e.g. TOPPER_CONFIG)
   * @param {number} startX
   * @param {number} startY
   * @param {number} facing - 1 (right) or -1 (left)
   * @param {'P1'|'P2'} playerId
   */
  constructor(config, startX, startY, facing = 1, playerId = 'P1') {
    this.config = config;
    this.playerId = playerId;

    // Transform (Proportional 175px arcade fighting game height)
    this.x = startX;
    this.y = startY;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.width = 64;
    this.height = 175;
    this.isGrounded = true;

    // Attributes
    this.health = config.stats.health || 200;
    this.maxHealth = this.health;
    this.displayedHealth = this.maxHealth;
    this.hitstopTimer = 0;
    this.ultimateMeter = 0;
    this.maxUltimate = 100;
    this.speed = config.stats.speed || 5.2;
    this.jumpPower = config.stats.jumpPower || 13.8;
    this.weight = config.stats.weight || 0.65;

    // Combat State
    this.stateMachine = new StateMachine(this);
    this.currentMove = null;
    this.moveFrame = 0;
    this.hitstunTimer = 0;
    this.freezeTimer = 0;
    this.invulnerableFrames = 0;
    this.perfectBuffTimer = 0;
    this.whiffPenaltyFrames = 0;

    // Anti-Spam Strategic Combat Systems
    this.stamina = new StaminaSystem();
    this.cooldowns = new CooldownSystem();
    this.parry = new ParrySystem();
    this.rage = new RageSystem();

    // Generous anatomical hurtbox (anchored at ground feet y=0)
    this.hurtbox = new Box(-30, -165, 60, 165);
    this.activeHitboxes = [];

    // Animation, Shading & Stance
    this.animCycle = 0;
    this.statusText = '';
    this.statusTextTimer = 0;
    this.isBlocking = false;
    this.blockShieldAlpha = 0;
    this.afterimages = [];

    // Weapon Trail & Glow Systems
    this.weaponTrail = new WeaponTrail();
    this.weaponGlow = new WeaponGlow();

    // Visual state helpers
    this._wasGrounded = true;   // For landing dust ring detection
    this._particleSystem = null; // Set by game after spawn (optional, checked before use)

    // Direct high-res idle sprite fallback
    const cid = this.config.id === 'placementWarrior' ? 'placement' : (this.config.id === 'sportsStar' ? 'sports' : this.config.id);
    this.fallbackImg = new Image();
    this.fallbackImg.src = `assets/characters/${cid}/idle.png`;
  }

  get isBlocking() {
    if (!this.stateMachine) return false;
    return this.stateMachine.getState() === FIGHTER_STATES.BLOCKING &&
           (!this.stamina || !this.stamina.staminaBreak) &&
           this.hitstunTimer <= 0;
  }

  set isBlocking(val) {
    this._isBlocking = !!val;
  }

  get charId() {
    let id = this.config ? this.config.id : 'topper';
    if (id === 'placementWarrior') id = 'placement';
    if (id === 'sportsStar') id = 'sports';
    return id;
  }

  get state() {
    if (!this.stateMachine) return this._customState || 'idle';
    const s = this.stateMachine.getState();
    if (s === FIGHTER_STATES.ATTACKING && this.currentMove) {
      if (this.currentMove.category === 'ultimate' ||
          this.currentMoveCategory === 'ultimate' ||
          this.currentMove === this.config.moves?.ultimate ||
          this.currentMove.name === this.config.moves?.ultimate?.name ||
          this.currentMove.type === 'ultimate' ||
          this.currentMove.type === 'viva' ||
          this.currentMove.type === 'exam_mode') return 'ultimate';
      if (this.currentMove.category === 'heavy' ||
          this.currentMoveCategory === 'heavy' ||
          this.currentMove === this.config.moves?.heavy ||
          this.currentMove.name === this.config.moves?.heavy?.name ||
          this.currentMove.type === 'heavy' ||
          this.currentMove.type === 'textbook' ||
          this.currentMove.name === 'Textbook Slam') return 'heavy';
      if (this.currentMove.category === 'special' ||
          this.currentMoveCategory === 'special' ||
          this.currentMove === this.config.moves?.special ||
          this.currentMove.name === this.config.moves?.special?.name ||
          this.currentMove.type === 'special') return 'special';
      return 'light';
    }
    if (s === FIGHTER_STATES.BLOCKING) return 'block';
    if (s === FIGHTER_STATES.DODGING) return 'dodge';
    if (s === FIGHTER_STATES.HITSTUN || s === FIGHTER_STATES.KNOCKDOWN) return 'hit';
    if (s === FIGHTER_STATES.JUMPING || !this.isGrounded) return 'jump';
    if (s === FIGHTER_STATES.WALKING) return Math.abs(this.vx) > 3.8 ? 'run' : 'walk';
    return 'idle';
  }

  set state(val) {
    this._customState = val;
    if (this.stateMachine && typeof this.stateMachine.changeState === 'function') {
      const stateMap = {
        'idle': FIGHTER_STATES.IDLE,
        'walk': FIGHTER_STATES.WALKING,
        'run': FIGHTER_STATES.WALKING,
        'jump': FIGHTER_STATES.JUMPING,
        'block': FIGHTER_STATES.BLOCKING,
        'dodge': FIGHTER_STATES.DODGING,
        'hit': FIGHTER_STATES.HITSTUN,
        'attacking': FIGHTER_STATES.ATTACKING
      };
      const target = stateMap[val] || val;
      if (Object.values(FIGHTER_STATES).includes(target)) {
        this.stateMachine.changeState(target);
      }
    }
  }

  update(dt, inputHandler, opponent, stage, particleSystem, soundManager) {
    // Hitstop freeze
    if (this.hitstopTimer > 0) {
      this.hitstopTimer--;
      return;
    }

    if (this.freezeTimer > 0) {
      this.freezeTimer--;
      return;
    }

    // Update Strategic Combat Systems
    if (this.stamina && typeof this.stamina.update === 'function') this.stamina.update();
    if (this.cooldowns && typeof this.cooldowns.update === 'function') this.cooldowns.update();
    if (this.parry && typeof this.parry.update === 'function') this.parry.update();
    if (this.rage && typeof this.rage.update === 'function') {
      this.rage.update(this.health, this.maxHealth, opponent ? opponent.health : this.maxHealth);
    }

    // Smooth health bar ghost decay (10-frame interpolation)
    this.displayedHealth += (this.health - this.displayedHealth) * 0.1;

    if (this.statusTextTimer > 0) this.statusTextTimer--;
    if (this.invulnerableFrames > 0) this.invulnerableFrames--;
    if (this.perfectBuffTimer > 0) this.perfectBuffTimer--;

    // Update Dodge Phantom Afterimages
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].alpha -= 0.08;
      if (this.afterimages[i].alpha <= 0) {
        this.afterimages.splice(i, 1);
      }
    }

    // Always update weapon trails and weapon glow for persistent fading follow-through
    this.weaponTrail.update();
    this.weaponGlow.update();

    // Gravity
    if (!this.isGrounded) {
      this.vy += this.weight;
    }
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.82; // Ground friction

    // Auto-face opponent if actionable
    if (this.stateMachine.isActionable() && opponent) {
      this.facing = opponent.x > this.x ? 1 : -1;
    }

    const currentState = this.stateMachine.getState();

    // Dynamic hurtbox scaling: crouch/block ducks down profile, standing/jumping extends high
    const isDucking = currentState === FIGHTER_STATES.CROUCHING || currentState === FIGHTER_STATES.BLOCKING;
    if (isDucking) {
      this.hurtbox.y = -115;
      this.hurtbox.h = 115;
    } else {
      this.hurtbox.y = -165;
      this.hurtbox.h = 165;
    }

    // Smooth Block Shield Fade
    if (this.isBlocking) {
      this.blockShieldAlpha = Math.min(1, this.blockShieldAlpha + 0.2);
    } else {
      this.blockShieldAlpha = Math.max(0, this.blockShieldAlpha - 0.15);
    }

    // 1. HITSTUN
    if (currentState === FIGHTER_STATES.HITSTUN) {
      this.hitstunTimer--;
      if (this.hitstunTimer <= 0) {
        this.stateMachine.changeState(FIGHTER_STATES.IDLE);
      }
      return;
    }

    // 2. DODGE
    if (currentState === FIGHTER_STATES.DODGING) {
      this.moveFrame++;
      // Spawn phantom trail
      if (this.moveFrame % 2 === 0) {
        this.afterimages.push({
          x: this.x,
          y: this.y,
          facing: this.facing,
          alpha: 0.7,
          isTopper: this.config.id === 'topper'
        });
      }
      if (this.moveFrame > 14) {
        this.stateMachine.changeState(FIGHTER_STATES.IDLE);
      }
      return;
    }

    // 3. ATTACKING
    if (currentState === FIGHTER_STATES.ATTACKING && this.currentMove) {
      this.updateAttack(opponent, particleSystem, soundManager);
      return;
    }

    // 4. ACTIONABLE INPUTS
    if (inputHandler) {
      this.handleInputs(inputHandler, opponent, particleSystem, soundManager);
    }
  }

  handleInputs(input, opponent, particleSystem, soundManager) {
    const isLight = input.isActionJustPressed(INPUT_ACTIONS.LIGHT, this.playerId);
    const isHeavy = input.isActionJustPressed(INPUT_ACTIONS.HEAVY, this.playerId);
    const isBlockHeld = input.isActionActive(INPUT_ACTIONS.BLOCK, this.playerId);
    const isBlockJustPressed = input.isActionJustPressed(INPUT_ACTIONS.BLOCK, this.playerId);
    const isDodge = input.isActionJustPressed(INPUT_ACTIONS.DODGE, this.playerId);
    const isUltimate = input.isActionJustPressed(INPUT_ACTIONS.ULTIMATE, this.playerId);

    // Movement speed scaled by stamina break
    const effectiveSpeed = this.speed * this.stamina.getSpeedPenaltyMultiplier();

    // Ultimate Attack (Meter-based, 0 Stamina cost)
    if (isUltimate && this.ultimateMeter >= this.maxUltimate) {
      this.ultimateMeter = 0;
      soundManager.playUltimate();
      this.startAttack(this.config.moves.ultimate);
      this.showStatus('🔥 ULTIMATE MOVE! 🔥', '#ffd700');
      return;
    }

    // Dodge (Stamina cost 15 + Cooldown 15)
    if (isDodge && this.isGrounded) {
      if (this.cooldowns.canUse('dodge') && this.stamina.canPerform(STAMINA_CONFIG.DODGE_COST)) {
        this.stamina.consume(STAMINA_CONFIG.DODGE_COST);
        this.cooldowns.trigger('dodge', ATTACK_COOLDOWNS.DODGE);
        this.executeDodge(opponent, particleSystem, soundManager);
        return;
      } else if (!this.stamina.canPerform(STAMINA_CONFIG.DODGE_COST)) {
        this.showStatus('⚠️ LOW STAMINA!', '#ff5252');
      }
    }

    // Block / Parry System
    if (isBlockJustPressed && this.isGrounded) {
      this.parry.attemptParry();
      if (typeof window !== 'undefined' && window.CampusVisuals) window.CampusVisuals.onBlock(this);
    }

    if (isBlockHeld && this.isGrounded && this.parry.parryCooldown <= 0) {
      this.isBlocking = true;
      this.stateMachine.changeState(FIGHTER_STATES.BLOCKING);
      return;
    } else {
      this.isBlocking = false;
      if (this.stateMachine.getState() === FIGHTER_STATES.BLOCKING) {
        this.stateMachine.changeState(FIGHTER_STATES.IDLE);
      }
    }

    // Light Attack (Cost 8 Stamina, Cooldown 6 frames)
    if (isLight) {
      if (this.stamina.staminaBreak) {
        this.showStatus('⚠️ STAMINA EXHAUSTED!', '#ff1744');
      } else if (this.cooldowns.canUse('light') && this.stamina.canPerform(STAMINA_CONFIG.LIGHT_COST)) {
        this.stamina.consume(STAMINA_CONFIG.LIGHT_COST);
        this.cooldowns.trigger('light', ATTACK_COOLDOWNS.LIGHT + (this.config.moves.light.recovery || 8));
        this.startAttack(this.config.moves.light);
        return;
      } else if (!this.stamina.canPerform(STAMINA_CONFIG.LIGHT_COST)) {
        this.showStatus('⚠️ LOW STAMINA!', '#ff5252');
      }
    }

    // Heavy Attack (Cost 20 Stamina, Cooldown 12 frames)
    if (isHeavy) {
      if (this.stamina.staminaBreak) {
        this.showStatus('⚠️ STAMINA EXHAUSTED!', '#ff1744');
      } else if (this.cooldowns.canUse('heavy') && this.stamina.canPerform(STAMINA_CONFIG.HEAVY_COST)) {
        this.stamina.consume(STAMINA_CONFIG.HEAVY_COST);
        this.cooldowns.trigger('heavy', ATTACK_COOLDOWNS.HEAVY + (this.config.moves.heavy.recovery || 16));
        this.startAttack(this.config.moves.heavy);
        return;
      } else if (!this.stamina.canPerform(STAMINA_CONFIG.HEAVY_COST)) {
        this.showStatus('⚠️ LOW STAMINA!', '#ff5252');
      }
    }

    // Movement
    let moving = false;
    if (input.isActionActive(INPUT_ACTIONS.LEFT, this.playerId)) {
      this.vx = -effectiveSpeed;
      moving = true;
    } else if (input.isActionActive(INPUT_ACTIONS.RIGHT, this.playerId)) {
      this.vx = effectiveSpeed;
      moving = true;
    }

    // Jump
    if (input.isActionJustPressed(INPUT_ACTIONS.UP, this.playerId) && this.isGrounded) {
      this.vy = -this.jumpPower;
      this.isGrounded = false;
      this.stateMachine.changeState(FIGHTER_STATES.JUMPING);
      particleSystem.spawnDust(this.x, this.y, this.facing);
      return;
    }

    if (this.isGrounded) {
      if (moving) {
        this.animCycle += 0.22;
        this.stateMachine.changeState(FIGHTER_STATES.WALKING);
      } else {
        this.animCycle = 0;
        this.stateMachine.changeState(FIGHTER_STATES.IDLE);
      }
    }
  }

  executeDodge(opponent, particleSystem, soundManager) {
    this.stateMachine.changeState(FIGHTER_STATES.DODGING);
    this.invulnerableFrames = 10;
    this.moveFrame = 0;
    this.vx = this.facing * 8.5;
    soundManager.playDodge();
    particleSystem.spawnDust(this.x, this.y, this.facing);

    if (opponent.currentMove && opponent.stateMachine.getState() === FIGHTER_STATES.ATTACKING) {
      const oppMove = opponent.currentMove;
      if (opponent.moveFrame >= oppMove.startup - 5 && opponent.moveFrame <= oppMove.startup + 3) {
        this.triggerPerfectDodge(particleSystem, soundManager);
      }
    }
  }

  triggerPerfectDodge(particleSystem, soundManager) {
    soundManager.playPerfect();
    particleSystem.spawnGoldPerfect(this.x, this.y - 65);
    this.showStatus('✨ PERFECT DODGE! ✨', '#ffd700');
    this.perfectBuffTimer = 75; // 1.25s +25% damage boost
    this.ultimateMeter = Math.min(this.maxUltimate, this.ultimateMeter + 15);
  }

  startAttack(moveConfig, category = null) {
    this.isBlocking = false;
    if (!category) {
      if (moveConfig?.category === 'ultimate' || moveConfig === this.config.moves?.ultimate || moveConfig?.name === this.config.moves?.ultimate?.name) {
        category = 'ultimate';
      } else if (moveConfig?.category === 'heavy' || moveConfig === this.config.moves?.heavy || moveConfig?.name === this.config.moves?.heavy?.name) {
        category = 'heavy';
      } else if (moveConfig?.category === 'special' || moveConfig === this.config.moves?.special || moveConfig?.name === this.config.moves?.special?.name) {
        category = 'special';
      } else {
        category = 'light';
      }
    }
    const move = new MoveData(moveConfig);
    move.category = category;
    this.currentMoveCategory = category;
    this.stateMachine.changeState(FIGHTER_STATES.ATTACKING, { move });
    this.hasHitThisMove = false;
    this.whiffPenaltyFrames = 0;
    const sig = this.config.visualSignature || {};
    this.weaponTrail.configure(
      moveConfig.color || sig.color || this.config.colors.accent || '#ffd700',
      moveConfig.glowColor || sig.glowColor || moveConfig.color || '#ffd700',
      moveConfig.trailWidth || sig.trailWidth || 5,
      moveConfig.trailLength || 25,
      moveConfig.glowRadius || 18,
      moveConfig.particles || sig.particles || 'gold_sparkles',
      moveConfig.trailStyle || sig.trailStyle || 'ribbon'
    );
    this.weaponGlow.startWindUp(
      moveConfig.glowColor || sig.glowColor || moveConfig.color || this.config.colors.accent || '#ffd700',
      moveConfig.glowRadius || 20
    );
    this.weaponTrail.clear();

    if (typeof window !== 'undefined' && window.CampusVisuals) {
      if (category === 'ultimate' || moveConfig.type === 'ultimate' || moveConfig.type === 'viva' || moveConfig.type === 'exam_mode') {
        window.CampusVisuals.onUltimate(this);
      } else if (category === 'heavy' || moveConfig.type === 'heavy' || moveConfig.name === 'Textbook Slam' || (moveConfig.damage && moveConfig.damage >= 14)) {
        window.CampusVisuals.onHeavyAttack(this);
      } else if (category === 'special' || moveConfig.type === 'special') {
        window.CampusVisuals.onSpecial(this);
      } else {
        window.CampusVisuals.onLightAttack(this);
      }
    }
  }

  getWeaponTipPosition() {
    const move = this.currentMove;
    const frame = this.moveFrame;
    const total = move ? move.getTotalFrames() : 30;
    const progress = Math.min(1, Math.max(0, frame / total));

    let localX = 45;
    let localY = -70;
    let angle = 0;

    const traj = (move && move.trajectory) || (this.config.moves && this.config.moves.light && this.config.moves.light.trajectory) || 'thrust';

    switch (traj) {
      case 'thrust': {
        // Topper / Academic Assassin: Linear sharp poke with fast forward snap
        const ext = Math.sin(progress * Math.PI) * 52;
        localX = 35 + ext;
        localY = -72;
        angle = 0;
        break;
      }
      case 'wild_swing': {
        // Backbencher / Chaos Agent: 180° sweeping pendulum arc
        const swingAngle = -Math.PI * 0.85 + progress * Math.PI * 1.35;
        angle = swingAngle;
        localX = Math.cos(swingAngle) * 78;
        localY = -65 + Math.sin(swingAngle) * 78;
        break;
      }
      case 'overhead_slam': {
        // Hosteler / Tank: 270° heavy vertical overhead slam
        const slamAngle = -Math.PI * 0.95 + Math.pow(progress, 1.4) * Math.PI * 1.45;
        angle = slamAngle;
        localX = 30 + Math.cos(slamAngle) * 82;
        localY = -50 + Math.sin(slamAngle) * 82;
        break;
      }
      case 'whip_crack': {
        // Senior / Control: Figure-8 / S-curve sinusoidal snap
        const phase = progress * Math.PI * 2.5;
        localX = 32 + Math.sin(progress * Math.PI) * 68;
        localY = -70 + Math.sin(phase) * 24;
        angle = Math.cos(phase) * 0.6;
        break;
      }
      case 'diagonal_slash': {
        // Placement Warrior / Rushdown: 45° crisp diagonal strike down-forward
        const dAngle = -Math.PI * 0.4 + progress * Math.PI * 0.8;
        localX = 25 + Math.cos(dAngle) * 65;
        localY = -85 + Math.sin(dAngle) * 65;
        angle = dAngle + Math.PI / 4;
        break;
      }
      case 'bat_swing': {
        // Sports Star / Brawler: 90° horizontal bat swing with full follow-through
        const batAngle = -Math.PI * 0.5 + progress * Math.PI * 1.4;
        localX = 15 + Math.cos(batAngle) * 82;
        localY = -68 + Math.sin(batAngle) * 36;
        angle = batAngle;
        break;
      }
      case 'typing_stabs': {
        // Cypher / Hacker: Rapid alternating piston thrusts
        const piston = Math.sin(progress * Math.PI * 6);
        localX = 40 + Math.abs(piston) * 48;
        localY = -72 + Math.sin(progress * Math.PI * 4) * 12;
        angle = piston > 0 ? 0.1 : -0.1;
        break;
      }
      case 'gavel_drop': {
        // Justice / Gavel: Vertical overhead drop with sudden acceleration
        const ease = Math.pow(progress, 2.2);
        localX = 35 + Math.sin(progress * Math.PI) * 28;
        localY = -110 + ease * 88;
        angle = Math.PI * 0.5 * ease;
        break;
      }
      case 'straight_punch': {
        // Sprint / Bolt: Forward lunging straight punch rush
        const lunge = Math.sin(progress * Math.PI) * 58;
        localX = 40 + lunge;
        localY = -74 + Math.sin(progress * Math.PI * 8) * 4;
        angle = 0;
        break;
      }
      case 'sweeping_brush': {
        // Milan / Palette: 120° flowing U-shape sweeping curve
        const uCurve = Math.sin(progress * Math.PI);
        localX = 20 + progress * 68;
        localY = -88 + uCurve * 52;
        angle = -0.6 + progress * 1.2;
        break;
      }
      default: {
        const ext = Math.sin(progress * Math.PI) * 44;
        localX = 38 + ext;
        localY = -72;
        angle = 0;
        break;
      }
    }

    const worldX = this.x + (this.facing === 1 ? localX : -localX);
    const worldY = this.y + localY;

    return { x: worldX, y: worldY, angle, localX, localY };
  }

  updateAttack(opponent, particleSystem, soundManager) {
    this.moveFrame++;
    const move = this.currentMove;
    const isStartup = this.moveFrame < move.startup;
    const isActive = move.isActiveFrame(this.moveFrame);
    const tip = this.getWeaponTipPosition();

    if (isStartup) {
      this.weaponGlow.update(tip.x, tip.y);
    } else if (isActive) {
      this.weaponGlow.release();
      this.weaponTrail.addPoint(tip.x, tip.y, tip.angle);
    }

    if (isActive) {
      // Calculate active move damage factoring in perfect buff, stamina exhaustion penalty, and rage boost
      let baseDmg = move.damage;
      if (this.perfectBuffTimer > 0) baseDmg *= 1.25;
      if (this.parry.hasActiveBuff) baseDmg *= 1.15;
      baseDmg *= this.stamina.getDamagePenaltyMultiplier();
      baseDmg *= this.rage.getDamageMultiplier();

      const boxProps = {
        damage: Math.max(1, Math.round(baseDmg)),
        hitstun: move.hitstun,
        knockback: move.knockback,
        blockable: move.blockable && this.perfectBuffTimer <= 0,
        specialEffect: move.specialEffect,
        freezeDuration: move.freezeDuration
      };
      this.activeHitboxes = [new Box(move.hitbox.x, move.hitbox.y, move.hitbox.w, move.hitbox.h, boxProps)];
    } else {
      this.activeHitboxes = [];
    }

    // Whiff punish & recovery frames
    const baseTotalFrames = move.getTotalFrames();
    const isWhiff = !this.hasHitThisMove;
    const extraWhiff = isWhiff
      ? (move.whiffRecovery !== undefined ? move.whiffRecovery : (this.config.whiffRecovery !== undefined ? this.config.whiffRecovery : 4))
      : 0;
    const totalDuration = baseTotalFrames + extraWhiff;

    if (this.moveFrame >= totalDuration) {
      this.activeHitboxes = [];
      this.stateMachine.changeState(FIGHTER_STATES.IDLE);
    }
  }

  takeDamage(amount, hitstun, knockback, isBlock = false) {
    // Block chip damage + stamina consumption
    if (isBlock && this.stamina && typeof this.stamina.consume === 'function') {
      this.stamina.consume(STAMINA_CONFIG.BLOCK_HIT_COST);
    }

    const defenseMult = (this.rage && typeof this.rage.getDefenseMultiplier === 'function')
      ? this.rage.getDefenseMultiplier()
      : 1.0;
    const finalDamage = isBlock
      ? Math.max(1, Math.round(amount * 0.05 * defenseMult))
      : Math.max(1, Math.round(amount * defenseMult));

    this.health = Math.max(0, this.health - finalDamage);

    // Meter gain scaled by rage
    const meterMult = (this.rage && typeof this.rage.getMeterGainMultiplier === 'function')
      ? this.rage.getMeterGainMultiplier()
      : 1.0;
    const meterGain = (isBlock ? 3 : 8) * meterMult;
    this.ultimateMeter = Math.min(this.maxUltimate, this.ultimateMeter + meterGain);

    if (!isBlock) {
      this.hitstunTimer = hitstun;
      this.stateMachine.changeState(FIGHTER_STATES.HITSTUN);
      this.vx = knockback.x;
      this.vy = knockback.y;
    }
  }

  applyStun(duration, reason = 'Stunned!') {
    this.hitstunTimer = duration;
    this.stateMachine.changeState(FIGHTER_STATES.HITSTUN);
    this.showStatus(reason, '#ff9800');
  }

  applyFreeze(duration) {
    this.freezeTimer = duration;
    this.showStatus('❄️ VIVA VOCE FROZEN! ❄️', '#00e5ff');
  }

  showStatus(text, color = '#ffffff') {
    this.statusText = text;
    this.statusTextColor = color;
    this.statusTextTimer = 45;
  }

  render(ctx, debugHitboxes = false) {
    // 1. Render World-Space Weapon Ribbon Trails & Particles
    this.weaponTrail.draw(ctx);

    // 2. Render World-Space Weapon Wind-Up Glow Buildup
    const tip = this.getWeaponTipPosition();
    this.weaponGlow.draw(ctx, tip.x, tip.y);

    // Dodge Phantom Afterimages with R/G/B chromatic split
    for (const ghost of this.afterimages) {
      ctx.save();
      ctx.translate(ghost.x, ghost.y);
      ctx.scale(ghost.facing || 1, 1);
      // Red channel offset
      ctx.globalAlpha = ghost.alpha * 0.25;
      ctx.fillStyle = '#ff4040';
      ctx.translate(-2, 0);
      this.renderBodySilhouette(ctx);
      // Blue channel offset
      ctx.globalAlpha = ghost.alpha * 0.25;
      ctx.fillStyle = '#4040ff';
      ctx.translate(4, 0);
      this.renderBodySilhouette(ctx);
      // Base ghost
      ctx.globalAlpha = ghost.alpha * 0.35;
      ctx.fillStyle = ghost.isTopper ? '#2979ff' : '#ff6b35';
      ctx.translate(-2, 0);
      this.renderBodySilhouette(ctx);
      ctx.restore();
    }

    // --- Landing Dust Ring: detect ground impact frame ---
    if (!this._wasGrounded && this.isGrounded && Math.abs(this.vy) > 5 && this._particleSystem) {
      this._particleSystem.spawnLandingRing(this.x, this.y);
    }
    this._wasGrounded = this.isGrounded;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.facing, 1);

    // --- Squash & Stretch scale application ---
    const { sx, sy } = this._computeSquashStretch();
    ctx.scale(sx, sy);

    const state = this.stateMachine.getState();
    const isHurt = state === FIGHTER_STATES.HITSTUN;
    const isBlock = state === FIGHTER_STATES.BLOCKING;
    const isAttack = state === FIGHTER_STATES.ATTACKING;

    // 4. Comeback Rage Mode Flaming Crimson Aura
    if (this.rage.isRage) {
      this.renderRageAura(ctx);
    }

    // 5. Ultimate Ready Flaming Energy Aura
    if (this.ultimateMeter >= this.maxUltimate && !this.rage.isRage) {
      this.renderUltimateAura(ctx);
    }

    // 6. Fallback model rendering if sprite not yet drawn
    this.renderFallbackModel(ctx, state, isHurt, isBlock, isAttack);

    // 7. Luminous Weapon Arc Overlay during active frames
    if (isAttack && this.currentMove) {
      this.renderWeaponTrails(ctx);
    }

    // 8. Hex-Shield Defensive Energy Barrier (Character-Specific Colors)
    if (this.blockShieldAlpha > 0.05) {
      this.renderHexDefenseBarrier(ctx);
    }

    ctx.restore();

    // 9. Floating Status Text — styled banner pill
    if (this.statusTextTimer > 0) {
      ctx.save();
      const progress = this.statusTextTimer / 80;
      const floatY = this.y - 158 - (1 - progress) * 20;
      const alpha = Math.min(1, progress * 3);
      const textColor = this.statusTextColor || '#ffd700';

      ctx.globalAlpha = alpha;
      // Measure text
      ctx.font = '900 13px monospace';
      const tw = ctx.measureText(this.statusText).width;
      const pw = tw + 24;
      const ph = 22;
      const px = this.x - pw / 2;
      const py = floatY - ph / 2;

      // Pill background
      ctx.fillStyle = 'rgba(4, 10, 22, 0.88)';
      ctx.shadowColor = textColor;
      ctx.shadowBlur = 10;
      const r = 6;
      ctx.beginPath();
      ctx.moveTo(px + r, py);
      ctx.arcTo(px + pw, py, px + pw, py + ph, r);
      ctx.arcTo(px + pw, py + ph, px, py + ph, r);
      ctx.arcTo(px, py + ph, px, py, r);
      ctx.arcTo(px, py, px + pw, py, r);
      ctx.closePath();
      ctx.fill();

      // Pill border
      ctx.strokeStyle = textColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Text
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = textColor;
      ctx.shadowBlur = 6;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.statusText, this.x, floatY);
      ctx.restore();
    }

    // 10. Debug Hitbox Overlay
    if (debugHitboxes) {
      this.renderDebugBoxes(ctx);
    }
  }

  /**
   * Computes squash & stretch scale factors based on vertical velocity.
   * Rising: tall & narrow. Peak/Landing: squash wide & short.
   * @returns {{ sx: number, sy: number }}
   */
  _computeSquashStretch() {
    if (this.isGrounded) {
      // On ground: no squash/stretch (neutral)
      return { sx: 1, sy: 1 };
    }
    // Airborne: stretch upward when rising fast, neutral at peak
    const vy = this.vy;
    if (vy < -3) {
      // Rising — stretch Y, compress X
      const t = Math.min(1, Math.abs(vy) / 14);
      return { sx: 1 - t * 0.10, sy: 1 + t * 0.12 };
    } else if (vy > 4) {
      // Falling fast — compress Y slightly, widen X slightly for impact anticipation
      const t = Math.min(1, vy / 14);
      return { sx: 1 + t * 0.06, sy: 1 - t * 0.06 };
    }
    return { sx: 1, sy: 1 };
  }

  /**
   * Draw a volumetric cylindrical limb using radial gradient for 3D shading.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x - Center X of limb
   * @param {number} y - Center Y of limb
   * @param {number} w - Width
   * @param {number} h - Height
   * @param {string} baseColor - Base fill color
   * @param {string} lightColor - Highlight color (top-left light source)
   */
  _drawVolumetricLimb(ctx, x, y, w, h, baseColor, lightColor = '#ffffff') {
    ctx.save();
    const grad = ctx.createRadialGradient(x - w * 0.3, y - h * 0.3, 1, x, y, Math.max(w, h) * 0.85);
    grad.addColorStop(0, lightColor);
    grad.addColorStop(0.45, baseColor);
    grad.addColorStop(1, this._darkenColor(baseColor, 0.55));
    ctx.fillStyle = grad;
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.restore();
  }

  /**
   * Darkens a hex color by a factor (0–1, 0=black, 1=original).
   * @param {string} hex
   * @param {number} factor
   */
  _darkenColor(hex, factor) {
    try {
      const c = parseInt(hex.replace('#',''), 16);
      const r = Math.round(((c >> 16) & 0xff) * factor);
      const g = Math.round(((c >>  8) & 0xff) * factor);
      const b = Math.round(( c        & 0xff) * factor);
      return `rgb(${r},${g},${b})`;
    } catch { return hex; }
  }



  renderRageAura(ctx) {
    ctx.save();
    const t = performance.now() * 0.001;
    const pulse = (Math.sin(t * 3.5) + 1) / 2;
    const pulse2 = (Math.sin(t * 5.2 + 1.3) + 1) / 2;

    // Outer crimson haze layer (additive blend)
    ctx.globalCompositeOperation = 'screen';
    const outerGrad = ctx.createRadialGradient(0, -68, 10, 0, -68, 75 + pulse * 15);
    outerGrad.addColorStop(0, `rgba(255, 50, 20, ${0.25 + pulse * 0.2})`);
    outerGrad.addColorStop(0.5, `rgba(200, 10, 10, ${0.15 + pulse2 * 0.12})`);
    outerGrad.addColorStop(1, 'rgba(100, 0, 0, 0)');
    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.ellipse(0, -68, 72 + pulse * 12, 92 + pulse * 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // Mid flame ring
    ctx.shadowColor = '#ff3d00';
    ctx.shadowBlur = 22 + pulse * 14;
    ctx.strokeStyle = `rgba(255, 80, 20, ${0.5 + pulse * 0.35})`;
    ctx.lineWidth = 3 + pulse * 2;
    ctx.beginPath();
    ctx.ellipse(0, -68, 48 + pulse * 8, 68 + pulse * 10, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Inner bright core
    ctx.shadowBlur = 18;
    ctx.fillStyle = `rgba(255, 200, 100, ${0.18 + pulse * 0.15})`;
    ctx.beginPath();
    ctx.ellipse(0, -68, 28 + pulse * 5, 40 + pulse * 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 6 Orbiting ember sparks
    ctx.shadowColor = '#ffea00';
    ctx.shadowBlur = 10;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + t * 2.8;
      const orbitR = 44 + pulse2 * 8 + (i % 2) * 10;
      const ex = Math.cos(angle) * orbitR;
      const ey = -68 + Math.sin(angle) * (orbitR * 0.6);
      const sparks = 1.5 + pulse * 1.5;
      ctx.fillStyle = i % 2 === 0 ? '#ff9100' : '#ffea00';
      ctx.beginPath();
      ctx.arc(ex, ey, sparks, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rage text above head
    ctx.shadowColor = '#ff1744';
    ctx.shadowBlur = 14 + pulse * 8;
    ctx.fillStyle = `rgba(255, 100, 50, ${0.7 + pulse * 0.3})`;
    ctx.font = `900 ${Math.round(9 + pulse * 2)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('RAGE', 0, -148 - pulse * 4);
    ctx.restore();
  }

  renderUltimateAura(ctx) {
    ctx.save();
    const t = performance.now() * 0.001;
    const pulse = (Math.sin(t * 4) + 1) / 2;
    const cid = this.config.id;

    // Per-character aura color
    const auraColors = {
      topper: { inner: '#00e5ff', outer: '#0d47a1', glow: '#29b6f6' },
      backbencher: { inner: '#ff6b35', outer: '#bf360c', glow: '#ff8a50' },
      hosteler: { inner: '#ff7043', outer: '#8d1c0a', glow: '#ff8a65' },
      senior: { inner: '#ffd54f', outer: '#e65100', glow: '#ffca28' },
      placementWarrior: { inner: '#00e676', outer: '#00600f', glow: '#69f0ae' },
      sportsStar: { inner: '#39ff14', outer: '#1b5e20', glow: '#b2ff59' },
      cypher: { inner: '#d500f9', outer: '#4a0072', glow: '#e040fb' },
      gavel: { inner: '#2979ff', outer: '#0d47a1', glow: '#82b1ff' },
      bolt: { inner: '#ffea00', outer: '#e65100', glow: '#ffff8d' },
      palette: { inner: '#ff4081', outer: '#880e4f', glow: '#ff80ab' }
    };
    const colors = auraColors[cid] || auraColors.topper;

    // Outer bloom layer (screen blend)
    ctx.globalCompositeOperation = 'screen';
    const outerGrad = ctx.createRadialGradient(0, -68, 5, 0, -68, 70 + pulse * 12);
    outerGrad.addColorStop(0, colors.inner + '44');
    outerGrad.addColorStop(0.6, colors.outer + '22');
    outerGrad.addColorStop(1, colors.outer + '00');
    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.ellipse(0, -68, 68 + pulse * 10, 88 + pulse * 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // Rotating double hex rings
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 18 + pulse * 10;
    ctx.strokeStyle = colors.inner + 'bb';
    ctx.lineWidth = 1.5;
    for (let ring = 0; ring < 2; ring++) {
      const ringR = 40 + ring * 18 + pulse * (ring === 0 ? 5 : -5);
      const spinAngle = t * (ring === 0 ? 1.2 : -0.8);
      ctx.beginPath();
      for (let j = 0; j < 6; j++) {
        const a = (j / 6) * Math.PI * 2 + spinAngle;
        const px = Math.cos(a) * ringR;
        const py = -68 + Math.sin(a) * ringR * 0.55;
        if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // 4 orbiting energy dots
    ctx.shadowBlur = 12;
    ctx.fillStyle = colors.glow;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + t * 2.2;
      const r = 50 + pulse * 6;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r, -68 + Math.sin(a) * r * 0.52, 3 + pulse * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 'ULTIMATE' text above
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 16 + pulse * 8;
    ctx.fillStyle = colors.inner;
    ctx.font = `900 ${Math.round(8 + pulse)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('ULTIMATE', 0, -148 - pulse * 3);
    ctx.restore();
  }

  renderWeaponTrails(ctx) {
    if (!this.currentMove) return;
    const frame = this.moveFrame;
    const move = this.currentMove;
    const isStartup = frame < move.startup;
    const isActive = move.isActiveFrame(frame);
    const isRecovery = !isStartup && !isActive;

    ctx.save();
    // 1. Wind-up Anticipation Glow at local tip
    if (isStartup) {
      const glowProgress = frame / move.startup;
      const glowColor = this.config.colors.glow || move.glowColor || '#ffd700';
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 15 + glowProgress * 15;
      ctx.fillStyle = glowColor;
      ctx.globalAlpha = Math.min(1, 0.4 + glowProgress * 0.6);
      ctx.beginPath();
      ctx.arc(38, -65, 12 + glowProgress * 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Active Luminous Weapon Arc Trail + Per-Character Aura
    if (isActive) {
      const cid = this.config.id;
      let trailColor = move.color || '#ffd700';
      let arcRadius = 58;
      let startAngle = -Math.PI * 0.55;
      let endAngle = Math.PI * 0.3;

      if (cid === 'topper') {
        trailColor = '#ffd700';
      } else if (cid === 'backbencher') {
        trailColor = '#ff6b35';
        arcRadius = 65;
      } else if (cid === 'hosteler') {
        trailColor = '#ff3d00';
        arcRadius = 70;
      } else if (cid === 'senior') {
        trailColor = '#c9a84c';
      } else if (cid === 'placementWarrior') {
        trailColor = '#00e5ff';
        arcRadius = 60;
      } else if (cid === 'sportsStar') {
        trailColor = '#39ff14';
        arcRadius = 72;
      }

      ctx.shadowColor = trailColor;
      ctx.shadowBlur = 20;
      ctx.strokeStyle = trailColor;
      ctx.lineWidth = move.trailWidth || 6;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.arc(20, -68, arcRadius, startAngle, endAngle);
      ctx.stroke();

      // Inner bright core
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(20, -68, arcRadius + 4, startAngle + 0.08, endAngle - 0.08);
      ctx.stroke();

      // Per-character weapon aura (topper book orbits, sportsStar wind-lines, senior crackling)
      const worldTip = this.getWeaponTipPosition();
      // Draw in local space: undo the outer translate/scale to get local coords
      // We're already inside ctx.save() with the fighter's local transform applied
      this.weaponGlow.drawWeaponAura(ctx, 42, -68, cid);
    }

    // 3. Recovery Whiff Swish Lines — visual "disappointment" when attack misses
    if (isRecovery && !this.hasHitThisMove) {
      ctx.globalAlpha = 0.40;
      ctx.strokeStyle = '#4dd0e1';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#4dd0e1';
      ctx.shadowBlur = 6;
      const arcR = 58;
      const sA = -Math.PI * 0.45;
      const eA = Math.PI * 0.22;
      for (let i = 0; i < 3; i++) {
        const offset = (i - 1) * 8;
        ctx.beginPath();
        ctx.arc(20 + offset, -68, arcR + offset * 0.3, sA, eA);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  renderHexDefenseBarrier(ctx) {
    ctx.save();
    const t = performance.now() * 0.001;
    const alpha = Math.min(1, this.blockShieldAlpha);
    const accentColor = this.config.colors.accent || '#00e5ff';
    const pulse = (Math.sin(t * 6) + 1) / 2;

    // Outer aura ring
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 20 + pulse * 12;
    ctx.strokeStyle = accentColor;
    ctx.globalAlpha = alpha * (0.7 + pulse * 0.3);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, -65, 48, 72, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Hex crystal grid (9 hex cells)
    ctx.globalAlpha = alpha * 0.4;
    ctx.strokeStyle = accentColor + 'aa';
    ctx.fillStyle = accentColor + '18';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 6;
    const hexR = 18;
    const positions = [
      [0, -65], [-24, -82], [24, -82],
      [-24, -48], [24, -48],
      [0, -100], [0, -30],
      [-24, -115], [24, -115]
    ];
    for (const [hx, hy] of positions) {
      ctx.beginPath();
      for (let j = 0; j < 6; j++) {
        const a = (j / 6) * Math.PI * 2 + t * 0.5;
        const px = hx + Math.cos(a) * hexR;
        const py = hy + Math.sin(a) * hexR;
        if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Impact ripple if just hit
    ctx.globalAlpha = alpha;
    ctx.restore();
  }

  renderFallbackModel(ctx, state, isHurt, isBlock, isAttack) {
    const charId = this.config.id === 'placementWarrior' ? 'placement' : (this.config.id === 'sportsStar' ? 'sports' : this.config.id);
    const cvStore = window.CampusVisuals && window.CampusVisuals.store ? window.CampusVisuals.store[charId] : null;
    const idleImg = (cvStore && cvStore.states && cvStore.states.idle && cvStore.states.idle.img) || this.fallbackImg;
    if (idleImg && (idleImg.naturalWidth > 0 || (idleImg.complete && idleImg.width > 0))) {
      const targetH = this.height || 180;
      const frames = (cvStore && cvStore.states && cvStore.states.idle && cvStore.states.idle.frames) || 1;
      const imgW = idleImg.naturalWidth || idleImg.width || 1024;
      const imgH = idleImg.naturalHeight || idleImg.height || 1024;
      const frameW = imgW / frames;
      const scale = targetH / imgH;
      const targetW = frameW * scale;
      ctx.drawImage(idleImg, 0, 0, frameW, imgH, -targetW / 2, -targetH, targetW, targetH);
      return;
    }

    // Secondary emergency fallback (only if sprite image has not arrived yet)
    const primary = this.config.colors?.primary || '#3b82f6';
    const accent = this.config.colors?.accent || '#ffd700';
    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = isAttack ? 20 : (isBlock ? 15 : 8);
    ctx.fillStyle = primary;
    this.renderBodySilhouette(ctx);
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(0, -118, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  renderBodySilhouette(ctx) {
    ctx.beginPath();
    ctx.ellipse(0, -68, 26, 64, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  renderDebugBoxes(ctx) {
    const h = this.hurtbox.getWorldBounds(this.x, this.y, this.facing);
    ctx.strokeStyle = '#00e676';
    ctx.lineWidth = 2;
    ctx.strokeRect(h.x, h.y, h.w, h.h);

    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 2;
    for (const b of this.activeHitboxes) {
      const box = b.getWorldBounds(this.x, this.y, this.facing);
      ctx.strokeRect(box.x, box.y, box.w, box.h);
    }
  }
}
