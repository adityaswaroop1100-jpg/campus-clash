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

    // Transform (Tall, heroic 135px height)
    this.x = startX;
    this.y = startY;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.width = 64;
    this.height = 135;
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

    // Generous anatomical hurtbox
    this.hurtbox = new Box(-28, -130, 56, 130);
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
    this.handleInputs(inputHandler, opponent, particleSystem, soundManager);
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

  startAttack(moveConfig) {
    const move = new MoveData(moveConfig);
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

    // 6. Render High-Fidelity Character Models
    if (this.config.id === 'topper') {
      this.renderRealisticTopper(ctx, state, isHurt, isBlock, isAttack);
    } else if (this.config.id === 'hosteler') {
      this.renderRealisticHosteler(ctx, state, isHurt, isBlock, isAttack);
    } else if (this.config.id === 'senior') {
      this.renderRealisticSenior(ctx, state, isHurt, isBlock, isAttack);
    } else if (this.config.id === 'placementWarrior') {
      this.renderRealisticPlacement(ctx, state, isHurt, isBlock, isAttack);
    } else if (this.config.id === 'sportsStar') {
      this.renderRealisticSportsStar(ctx, state, isHurt, isBlock, isAttack);
    } else if (this.config.id === 'cypher') {
      this.renderRealisticCypher(ctx, state, isHurt, isBlock, isAttack);
    } else if (this.config.id === 'gavel') {
      this.renderRealisticGavel(ctx, state, isHurt, isBlock, isAttack);
    } else if (this.config.id === 'bolt') {
      this.renderRealisticBolt(ctx, state, isHurt, isBlock, isAttack);
    } else if (this.config.id === 'palette') {
      this.renderRealisticPalette(ctx, state, isHurt, isBlock, isAttack);
    } else {
      this.renderRealisticBackbencher(ctx, state, isHurt, isBlock, isAttack);
    }

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

  renderRealisticTopper(ctx, state, isHurt, isBlock, isAttack) {
    // Athletic breathing & weight-shift
    const breath = Math.sin(performance.now() * 0.006) * 2;
    const walkSwing = Math.sin(this.animCycle) * 16;
    const isJumping = !this.isGrounded;

    // 1. Dynamic Drop Shadow — scales with jump height
    const jumpHeight = isJumping ? Math.max(0, this.y - (this._groundY || this.y)) : 0;
    const shadowW = isJumping ? Math.max(12, 34 - jumpHeight * 0.1) : 34;
    const shadowH = isJumping ? Math.max(2, 8 - jumpHeight * 0.04) : 8;
    const shadowAlpha = isJumping ? Math.max(0.08, 0.45 - jumpHeight * 0.003) : 0.45;
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, shadowW, shadowH, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Muscular Legs (SRM Navy Trousers with fabric folds & highlights)
    let lFootX = -14, lFootY = 0, rFootX = 16, rFootY = 0;
    if (state === FIGHTER_STATES.WALKING) {
      lFootX = -14 - walkSwing;
      rFootX = 16 + walkSwing;
    } else if (isBlock) {
      lFootX = -22; rFootX = 22; // Deep braced stance
    } else if (isJumping) {
      lFootY = -18; rFootY = -12; // Airborne tuck
    }

    // Rear Leg
    ctx.fillStyle = '#101838';
    ctx.beginPath();
    ctx.moveTo(-6, -58);
    ctx.lineTo(lFootX - 10, lFootY);
    ctx.lineTo(lFootX + 8, lFootY);
    ctx.lineTo(6, -58);
    ctx.closePath();
    ctx.fill();

    // Lead Leg
    ctx.fillStyle = '#1a2a6c';
    ctx.beginPath();
    ctx.moveTo(-2, -58);
    ctx.lineTo(rFootX - 10, rFootY);
    ctx.lineTo(rFootX + 10, rFootY);
    ctx.lineTo(12, -58);
    ctx.closePath();
    ctx.fill();

    // White Sneakers with Navy Soles
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(lFootX - 12, lFootY - 7, 24, 7);
    ctx.fillRect(rFootX - 12, rFootY - 7, 26, 7);
    ctx.fillStyle = '#1a2a6c';
    ctx.fillRect(lFootX - 12, lFootY - 2, 24, 2);
    ctx.fillRect(rFootX - 12, rFootY - 2, 26, 2);

    // 3. Torso: Pure White Hoodie with Navy SRM Logo & Backpack Straps
    const torsoY = isBlock ? -60 : -66 + breath;
    const torsoTilt = isHurt ? -0.22 : (isAttack ? 0.18 : 0);

    ctx.save();
    ctx.translate(0, torsoY);
    ctx.rotate(torsoTilt);

    // Backpack Straps on Shoulders
    ctx.fillStyle = '#1a1f2c';
    ctx.fillRect(-22, -48, 6, 42);
    ctx.fillRect(16, -48, 6, 42);

    // Volumetric White Hoodie
    const hoodieBaseColor = isHurt ? '#ef9a9a' : '#f8fafc';
    const hoodieGrad = ctx.createRadialGradient(-6, -30, 6, 0, -20, 36);
    hoodieGrad.addColorStop(0, '#ffffff');
    hoodieGrad.addColorStop(0.6, hoodieBaseColor);
    hoodieGrad.addColorStop(1, isHurt ? '#c62828' : '#cbd5e1');
    ctx.fillStyle = hoodieGrad;

    ctx.beginPath();
    ctx.moveTo(-24, -48);
    ctx.lineTo(24, -48);
    ctx.lineTo(14, 8);
    ctx.lineTo(-14, 8);
    ctx.closePath();
    ctx.fill();

    // Hoodie Kangaroo Pocket
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(-11, -8);
    ctx.lineTo(11, -8);
    ctx.lineTo(13, 6);
    ctx.lineTo(-13, 6);
    ctx.closePath();
    ctx.fill();

    // SRM Chest Logo
    ctx.font = '900 8.5px "Arial Black", sans-serif';
    ctx.fillStyle = '#1a2a6c';
    ctx.textAlign = 'center';
    ctx.fillText('SRM', 0, -28);

    // Hoodie Drawstrings
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-3, -44); ctx.lineTo(-3, -18);
    ctx.moveTo(3, -44); ctx.lineTo(3, -18);
    ctx.stroke();

    // 4. Arms, Attacks & Laptop Prop
    if (isBlock) {
      // DEFENSE GUARD: Open Laptop Held Up As Shield
      ctx.fillStyle = '#475569';
      ctx.fillRect(-16, -48, 32, 28);
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-16, -48, 32, 28);
      // Glowing Cyan Screen
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(-13, -45, 26, 22);
      ctx.fillStyle = '#061124';
      ctx.font = 'bold 6px monospace';
      ctx.fillText('SHIELD:100%', 0, -32);
    } else if (isAttack && this.currentMove) {
      if (this.currentMove.name === 'Pen Jab') {
        // LIGHT ATTACK: Explosive forward jab with gold pen thrust!
        const ext = Math.sin((this.moveFrame / this.currentMove.getTotalFrames()) * Math.PI) * 38;

        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(-18, -38, 14, 24);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(10, -42, 28 + ext, 11);
        ctx.fillStyle = '#ffd180';
        ctx.fillRect(36 + ext, -43, 14, 13);

        ctx.fillStyle = '#ffd700';
        ctx.fillRect(48 + ext, -40, 24, 6);
        ctx.fillStyle = '#00e5ff';
        ctx.fillRect(72 + ext, -39, 12, 4);

        ctx.strokeStyle = 'rgba(255, 215, 0, 0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(10, -32); ctx.lineTo(60 + ext, -32);
        ctx.moveTo(15, -46); ctx.lineTo(75 + ext, -46);
        ctx.stroke();
      } else {
        // HEAVY ATTACK: Laptop Shockwave Slam
        const ext = Math.sin((this.moveFrame / this.currentMove.getTotalFrames()) * Math.PI) * 44;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(10, -42, 32 + ext, 13);
        ctx.fillStyle = '#ffd180';
        ctx.fillRect(40 + ext, -44, 16, 15);

        // Open Laptop Prop Slamming
        ctx.fillStyle = '#334155';
        ctx.fillRect(52 + ext, -55, 28, 22);
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(54 + ext, -53, 24, 18);
        ctx.fillStyle = '#061124';
        ctx.font = 'bold 7px monospace';
        ctx.fillText('10 CGPA', 66 + ext, -41);
      }
    } else {
      // IDLE: Confident Stance Holding Open Sleek Laptop
      const guardBob = Math.sin(performance.now() * 0.008) * 2;
      // Rear Arm
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-18, -38 + guardBob, 14, 22);
      ctx.fillStyle = '#ffd180';
      ctx.fillRect(-14, -18 + guardBob, 10, 10);

      // Lead Arm holding laptop
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(10, -40 - guardBob, 14, 20);
      ctx.fillStyle = '#ffd180';
      ctx.fillRect(12, -22 - guardBob, 10, 10);

      // Sleek Open Silver Laptop held in front
      ctx.save();
      ctx.translate(6, -28 - guardBob);
      // Laptop Base
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-6, 8, 26, 4);
      // Keyboard area
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-4, 9, 22, 2);
      // Screen (angled open)
      ctx.fillStyle = '#64748b';
      ctx.fillRect(12, -14, 4, 24);
      // Glowing Cyan Display
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.fillRect(10, -12, 3, 20);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // 5. Head, Styled Dark Hair & Gold Glasses
    ctx.fillStyle = '#ffd180';
    ctx.beginPath();
    ctx.arc(0, -62, 15, 0, Math.PI * 2);
    ctx.fill();

    // Dark styled combed hair
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(0, -66, 17, Math.PI, Math.PI * 2);
    ctx.lineTo(16, -58);
    ctx.lineTo(8, -60);
    ctx.lineTo(-16, -58);
    ctx.closePath();
    ctx.fill();

    // Sleek Spectacles with Diagonal Lens Glint
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, -66, 11, 8);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    ctx.moveTo(6, -65); ctx.lineTo(13, -59);
    ctx.stroke();

    // Rage Mode Eye Glow
    if (this.rage && this.rage.isRage) {
      const eyePulse = (Math.sin(performance.now() * 0.02) + 1) * 0.5;
      const eyeGrad = ctx.createRadialGradient(8, -63, 0, 8, -63, 9);
      eyeGrad.addColorStop(0, `rgba(255, 23, 68, ${0.7 + eyePulse * 0.3})`);
      eyeGrad.addColorStop(0.5, `rgba(255, 100, 30, ${0.4 + eyePulse * 0.2})`);
      eyeGrad.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = eyeGrad;
      ctx.beginPath();
      ctx.arc(8, -63, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = '#ff1744';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ff1744';
      ctx.beginPath();
      ctx.arc(8, -63, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }



  renderRealisticBackbencher(ctx, state, isHurt, isBlock, isAttack) {
    const breath = Math.sin(performance.now() * 0.006) * 2;
    const walkSwing = Math.sin(this.animCycle) * 16;
    const isJumping = !this.isGrounded;

    // 1. Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 0, isJumping ? 20 : 36, isJumping ? 4 : 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Powerful Brawler Legs (Dark Denim with Knee Details & Mint Sneakers)
    let lFootX = -16, lFootY = 0, rFootX = 18, rFootY = 0;
    if (state === FIGHTER_STATES.WALKING) {
      lFootX = -16 - walkSwing;
      rFootX = 18 + walkSwing;
    } else if (isBlock) {
      lFootX = -26; rFootX = 26; // Super wide grounded stance
    } else if (isJumping) {
      lFootY = -18; rFootY = -12;
    }

    // Rear Leg
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(-8, -58);
    ctx.lineTo(lFootX - 12, lFootY);
    ctx.lineTo(lFootX + 8, lFootY);
    ctx.lineTo(6, -58);
    ctx.closePath();
    ctx.fill();

    // Lead Leg
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(-4, -58);
    ctx.lineTo(rFootX - 10, rFootY);
    ctx.lineTo(rFootX + 12, rFootY);
    ctx.lineTo(14, -58);
    ctx.closePath();
    ctx.fill();

    // High-Top Red Sneakers with White Soles
    ctx.fillStyle = '#e53935';
    ctx.fillRect(lFootX - 14, lFootY - 8, 26, 8);
    ctx.fillRect(rFootX - 14, rFootY - 8, 28, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(lFootX - 14, lFootY - 3, 26, 3);
    ctx.fillRect(rFootX - 14, rFootY - 3, 28, 3);

    // 3. Heavy Red Tactical Backpack (Strapped behind torso)
    const torsoY = isBlock ? -60 : -66 + breath;
    const torsoTilt = isHurt ? -0.22 : (isAttack ? 0.2 : 0);

    ctx.save();
    ctx.translate(0, torsoY);
    ctx.rotate(torsoTilt);

    // Red Backpack on back
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(-38, -52, 20, 44);
    ctx.fillStyle = '#b71c1c';
    ctx.fillRect(-40, -42, 6, 24); // Side pockets
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-34, -40, 12, 2); // White zip strip

    // Charcoal/Black Hoodie
    ctx.fillStyle = isHurt ? '#ef5350' : '#1e1e24';
    ctx.beginPath();
    ctx.moveTo(-26, -48);
    ctx.lineTo(24, -48);
    ctx.lineTo(13, 8);
    ctx.lineTo(-14, 8);
    ctx.closePath();
    ctx.fill();

    // Hoodie Kangaroo Pocket
    ctx.fillStyle = '#16161b';
    ctx.beginPath();
    ctx.moveTo(-11, -8);
    ctx.lineTo(11, -8);
    ctx.lineTo(13, 6);
    ctx.lineTo(-13, 6);
    ctx.closePath();
    ctx.fill();

    // Bold Red SRM Chest Logo
    ctx.font = '900 8.5px "Arial Black", sans-serif';
    ctx.fillStyle = '#ff1744';
    ctx.textAlign = 'center';
    ctx.fillText('SRM', 0, -28);

    // Red Drawstrings
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-3, -44); ctx.lineTo(-3, -20);
    ctx.moveTo(3, -44); ctx.lineTo(3, -20);
    ctx.stroke();

    // 4. Arms, Gaming Laptop & Moves
    if (isBlock) {
      // DEFENSE GUARD: Open Gaming Laptop Held Up As Shield
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(-16, -48, 32, 28);
      ctx.strokeStyle = '#ff1744';
      ctx.lineWidth = 2;
      ctx.strokeRect(-16, -48, 32, 28);
      // Glowing Neon Red Matrix Screen
      ctx.fillStyle = '#ff1744';
      ctx.fillRect(-13, -45, 26, 22);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 6px monospace';
      ctx.fillText('OVERCLOCK', 0, -32);
    } else if (isAttack && this.currentMove) {
      if (this.currentMove.name === 'Backpack Swing') {
        // HEAVY ATTACK: Massive 360 Backpack Slam with Fiery Arc!
        const prog = this.moveFrame / this.currentMove.getTotalFrames();
        const swingAngle = -1.2 + prog * 3.2;

        ctx.save();
        ctx.rotate(swingAngle);
        ctx.fillStyle = '#ffcc80';
        ctx.fillRect(0, -40, 48, 14);
        ctx.fillStyle = '#d32f2f';
        ctx.fillRect(40, -56, 36, 44);
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(48, -48, 20, 28);
        ctx.restore();

        ctx.strokeStyle = 'rgba(255, 23, 68, 0.8)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, -30, 68, -0.6, 1.4);
        ctx.stroke();
      } else {
        // LIGHT ATTACK: Fast Code Beam Jab / Paper Plane Thrust
        const ext = Math.sin((this.moveFrame / this.currentMove.getTotalFrames()) * Math.PI) * 36;
        ctx.fillStyle = '#ffcc80';
        ctx.fillRect(10, -42, 28 + ext, 13);
        ctx.fillStyle = '#2c2c2c';
        ctx.fillRect(36 + ext, -44, 14, 15);

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(48 + ext, -44);
        ctx.lineTo(76 + ext, -37);
        ctx.lineTo(48 + ext, -30);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 23, 68, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } else {
      // IDLE: Street stance holding gaming laptop with glowing neon red keys
      const guardBob = Math.sin(performance.now() * 0.008) * 2;
      // Rear Arm
      ctx.fillStyle = '#262626';
      ctx.fillRect(-18, -40 + guardBob, 14, 22);
      ctx.fillStyle = '#ffcc80';
      ctx.fillRect(-14, -20 + guardBob, 10, 10);

      // Lead Arm
      ctx.fillStyle = '#262626';
      ctx.fillRect(10, -40 - guardBob, 14, 20);
      ctx.fillStyle = '#ffcc80';
      ctx.fillRect(12, -22 - guardBob, 10, 10);

      // Black Gaming Laptop held in front
      ctx.save();
      ctx.translate(6, -28 - guardBob);
      ctx.fillStyle = '#111111';
      ctx.fillRect(-6, 8, 26, 4);
      // Red LED keyboard
      ctx.fillStyle = '#ff1744';
      ctx.fillRect(-4, 9, 22, 2);
      // Screen open
      ctx.fillStyle = '#222222';
      ctx.fillRect(12, -14, 4, 24);
      // Glowing Matrix Screen
      ctx.fillStyle = '#ff1744';
      ctx.shadowColor = '#ff1744';
      ctx.shadowBlur = 8;
      ctx.fillRect(10, -12, 3, 20);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // 5. Head, Jet-Black Spiky Hair & Red Gaming Headphones
    ctx.fillStyle = '#ffcc80';
    ctx.beginPath();
    ctx.arc(0, -62, 15, 0, Math.PI * 2);
    ctx.fill();

    // Jet-Black spiky textured hair
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(0, -66, 17, Math.PI, Math.PI * 2);
    ctx.lineTo(17, -56);
    ctx.lineTo(8, -62);
    ctx.lineTo(-4, -58);
    ctx.lineTo(-17, -56);
    ctx.closePath();
    ctx.fill();

    // Red Gaming Headphones with Boom Mic
    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, -64, 18, Math.PI * 0.9, Math.PI * 2.1);
    ctx.stroke();

    // Red Ear Pads
    ctx.fillStyle = '#ff1744';
    ctx.shadowColor = '#ff1744';
    ctx.shadowBlur = 6;
    ctx.fillRect(-18, -66, 5, 10);
    ctx.fillRect(13, -66, 5, 10);
    ctx.shadowBlur = 0;

    // Boom Microphone extending towards mouth
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(15, -60);
    ctx.lineTo(12, -54);
    ctx.lineTo(6, -54);
    ctx.stroke();
    ctx.fillStyle = '#ff1744';
    ctx.beginPath();
    ctx.arc(5, -54, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Smirking Face
    ctx.fillStyle = '#111111';
    ctx.fillRect(4, -64, 4, 3); // Eye
    ctx.beginPath();
    ctx.arc(6, -56, 5, 0, Math.PI * 0.7);
    ctx.stroke();

    ctx.restore();
  }

  // =========================================================================
  // 3. THE HOSTELER ("The Warden's Nightmare")
  // =========================================================================
  renderRealisticHosteler(ctx, state, isHurt, isBlock, isAttack) {
    const breath = Math.sin(performance.now() * 0.005) * 2;
    const walkSwing = Math.sin(this.animCycle) * 14;
    const isJumping = !this.isGrounded;

    // Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 0, isJumping ? 22 : 36, isJumping ? 5 : 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Athletic Legs with Black Compression Sleeves & Basketball Sneakers
    let lFootX = -15, lFootY = 0, rFootX = 17, rFootY = 0;
    if (state === FIGHTER_STATES.WALKING) {
      lFootX = -15 - walkSwing;
      rFootX = 17 + walkSwing;
    } else if (isBlock) {
      lFootX = -24; rFootX = 24;
    } else if (isJumping) {
      lFootY = -16; rFootY = -10;
    }

    // Muscular Legs (Tanned Skin)
    ctx.fillStyle = '#c99667';
    ctx.beginPath();
    ctx.moveTo(-7, -42);
    ctx.lineTo(lFootX - 8, lFootY - 6);
    ctx.lineTo(lFootX + 8, lFootY - 6);
    ctx.lineTo(5, -42);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-3, -42);
    ctx.lineTo(rFootX - 8, rFootY - 6);
    ctx.lineTo(rFootX + 8, rFootY - 6);
    ctx.lineTo(9, -42);
    ctx.closePath();
    ctx.fill();

    // Black Compression Knee Sleeves
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(lFootX - 7, lFootY - 24, 14, 12);
    ctx.fillRect(rFootX - 7, rFootY - 24, 14, 12);

    // Red & Black Basketball High-Top Sneakers
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(lFootX - 12, lFootY - 8, 24, 8);
    ctx.fillRect(rFootX - 12, rFootY - 8, 26, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(lFootX - 12, lFootY - 3, 24, 3);
    ctx.fillRect(rFootX - 12, rFootY - 3, 26, 3);
    ctx.fillStyle = '#111111';
    ctx.fillRect(lFootX - 6, lFootY - 8, 10, 4);
    ctx.fillRect(rFootX - 6, rFootY - 8, 10, 4);

    // Red Basketball Shorts with White Side Stripes
    ctx.fillStyle = '#d32f2f';
    ctx.beginPath();
    ctx.moveTo(-20, -56);
    ctx.lineTo(20, -56);
    ctx.lineTo(16, -34);
    ctx.lineTo(-16, -34);
    ctx.closePath();
    ctx.fill();
    // White Side Stripes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-19, -56, 3, 22);
    ctx.fillRect(16, -56, 3, 22);

    // Torso: Red Basketball Jersey (#7 SRM)
    const torsoY = isBlock ? -58 : -64 + breath;
    const torsoTilt = isHurt ? -0.2 : (isAttack ? 0.2 : 0);

    ctx.save();
    ctx.translate(0, torsoY);
    ctx.rotate(torsoTilt);

    const shirtGrad = ctx.createLinearGradient(-26, -46, 26, 8);
    shirtGrad.addColorStop(0, isHurt ? '#ef5350' : '#e53935');
    shirtGrad.addColorStop(1, isHurt ? '#d32f2f' : '#b71c1c');
    ctx.fillStyle = shirtGrad;

    // Muscular Athletic Jersey
    ctx.beginPath();
    ctx.moveTo(-24, -46);
    ctx.lineTo(24, -46);
    ctx.lineTo(16, 8);
    ctx.lineTo(-16, 8);
    ctx.closePath();
    ctx.fill();

    // White Jersey Trim around collar & armholes
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -46, 8, 0, Math.PI);
    ctx.stroke();

    // #7 SRM on Chest
    ctx.font = '900 9px "Arial Black", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('#7 SRM', 0, -22);

    // Arms & Basketball
    if (isBlock) {
      // BLOCK: Two-Handed Basketball Guard
      ctx.fillStyle = '#c99667';
      ctx.fillRect(-16, -44, 12, 28);
      ctx.fillRect(8, -44, 12, 28);
      // Basketball Held Front & Center
      ctx.fillStyle = '#e65100';
      ctx.beginPath();
      ctx.arc(2, -34, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-12, -34); ctx.lineTo(16, -34);
      ctx.moveTo(2, -48); ctx.lineTo(2, -20);
      ctx.stroke();
    } else if (isAttack && this.currentMove) {
      if (this.currentMove.name === 'Tiffin Slam' || true) {
        // Basketball Windup / Slam Dunk
        const ext = Math.sin((this.moveFrame / (this.currentMove.getTotalFrames ? this.currentMove.getTotalFrames() : 20)) * Math.PI);
        ctx.fillStyle = '#c99667';
        ctx.fillRect(8, -50 + ext * 24, 26, 14);

        // Slamming Basketball with fire trail
        ctx.fillStyle = '#e65100';
        ctx.beginPath();
        ctx.arc(36 + ext * 24, -45 + ext * 20, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (ext > 0.5) {
          ctx.strokeStyle = 'rgba(255, 87, 34, 0.8)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(36 + ext * 24, -45 + ext * 20, 20, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    } else {
      // IDLE: Athletic stance holding basketball firmly under arm
      ctx.fillStyle = '#c99667';
      ctx.fillRect(-20, -40, 14, 22);

      // Lead Arm
      ctx.fillStyle = '#c99667';
      ctx.fillRect(12, -42, 14, 24);

      // Textured Orange Basketball held under right arm
      ctx.save();
      ctx.translate(20, -26);
      ctx.fillStyle = '#e65100';
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Black basketball ribbing lines
      ctx.beginPath();
      ctx.moveTo(-13, 0); ctx.lineTo(13, 0);
      ctx.moveTo(0, -13); ctx.lineTo(0, 13);
      ctx.arc(0, 0, 8, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();
      ctx.restore();
    }

    // Head, Short Fade Hair & Confident Athlete Face
    ctx.fillStyle = '#c99667';
    ctx.beginPath();
    ctx.arc(0, -60, 16, 0, Math.PI * 2);
    ctx.fill();

    // Clean fade haircut
    ctx.fillStyle = '#1a100a';
    ctx.beginPath();
    ctx.arc(0, -65, 17, Math.PI * 0.85, Math.PI * 2.15);
    ctx.fill();

    // Determined athletic eyes
    ctx.fillStyle = '#111111';
    ctx.fillRect(3, -62, 5, 3);
    ctx.beginPath();
    ctx.arc(5, -55, 5, 0, Math.PI * 0.7);
    ctx.stroke();

    ctx.restore();
  }

  // =========================================================================
  // 4. THE SENIOR ("The OG")
  // =========================================================================
  renderRealisticSenior(ctx, state, isHurt, isBlock, isAttack) {
    const breath = Math.sin(performance.now() * 0.005) * 1.8;
    const walkSwing = Math.sin(this.animCycle) * 14;
    const isJumping = !this.isGrounded;

    // Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 0, isJumping ? 20 : 34, isJumping ? 4 : 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Denim Jeans & Leather Shoes
    let lFootX = -14, lFootY = 0, rFootX = 16, rFootY = 0;
    if (state === FIGHTER_STATES.WALKING) {
      lFootX = -14 - walkSwing;
      rFootX = 16 + walkSwing;
    } else if (isBlock) {
      lFootX = -18; rFootX = 18;
    } else if (isJumping) {
      lFootY = -18; rFootY = -12;
    }

    // Faded Dark Jeans
    ctx.fillStyle = '#1c2833';
    ctx.beginPath();
    ctx.moveTo(-6, -56);
    ctx.lineTo(lFootX - 9, lFootY);
    ctx.lineTo(lFootX + 9, lFootY);
    ctx.lineTo(6, -56);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#273746';
    ctx.beginPath();
    ctx.moveTo(-2, -56);
    ctx.lineTo(rFootX - 9, rFootY);
    ctx.lineTo(rFootX + 9, rFootY);
    ctx.lineTo(12, -56);
    ctx.closePath();
    ctx.fill();

    // Dark Green Casual Sneakers with White Soles
    ctx.fillStyle = '#1b4d3e';
    ctx.fillRect(lFootX - 12, lFootY - 7, 24, 7);
    ctx.fillRect(rFootX - 12, rFootY - 7, 26, 7);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(lFootX - 12, lFootY - 2, 24, 2);
    ctx.fillRect(rFootX - 12, rFootY - 2, 26, 2);

    // Torso: Dark Forest-Green Overshirt & Crisp White Inner T-Shirt
    const torsoY = isBlock ? -58 : -64 + breath;
    const torsoTilt = isHurt ? -0.18 : (isAttack ? 0.16 : -0.05);

    ctx.save();
    ctx.translate(0, torsoY);
    ctx.rotate(torsoTilt);

    // Inner White Crew-Neck T-Shirt
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-12, -46);
    ctx.lineTo(12, -46);
    ctx.lineTo(10, 8);
    ctx.lineTo(-10, 8);
    ctx.closePath();
    ctx.fill();

    // Dark Forest-Green Open Chore Jacket / Overshirt
    ctx.fillStyle = '#1b4d3e';
    // Left Flap
    ctx.fillRect(-24, -48, 13, 54);
    // Right Flap
    ctx.fillRect(11, -48, 13, 54);
    // Jacket collar
    ctx.fillStyle = '#14382d';
    ctx.fillRect(-24, -48, 8, 8);
    ctx.fillRect(16, -48, 8, 8);

    // Arms & Props (Chai Cup & Notes Folder)
    if (isBlock) {
      // Arms calmly crossed, sipping chai!
      ctx.fillStyle = '#1b4d3e';
      ctx.fillRect(-16, -34, 34, 12);
      ctx.fillStyle = '#d6a374';
      ctx.fillRect(14, -36, 8, 12);
      // Steel Chai Cup
      ctx.fillStyle = '#b0bec5';
      ctx.fillRect(16, -46, 12, 14);
      // Hot chai steam
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(22, -54, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (isAttack && this.currentMove) {
      if (this.currentMove.name === 'Chai Splash') {
        const ext = Math.sin((this.moveFrame / this.currentMove.getTotalFrames()) * Math.PI);
        // Flicks chai cup forward
        ctx.fillStyle = '#d6a374';
        ctx.fillRect(14, -38, 24, 12);
        ctx.fillStyle = '#b0bec5';
        ctx.fillRect(36, -44, 14, 16);
        // Liquid Tea Arc + Steam
        ctx.fillStyle = '#d78536';
        ctx.beginPath();
        ctx.arc(52 + ext * 28, -40 - ext * 8, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(58 + ext * 28, -50 - ext * 8, 8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Folder Slap with fluttering papers
        const ext = Math.sin((this.moveFrame / this.currentMove.getTotalFrames()) * Math.PI);
        ctx.save();
        ctx.translate(14, -32);
        ctx.rotate(-0.8 + ext * 2.2);
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(0, -20, 52, 34);
        // Fluttering white papers
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(20, -26, 22, 14);
        ctx.fillRect(32, -10, 18, 12);
        ctx.restore();
      }
    } else {
      // Idle: Left hand holds steaming chai, folder under right arm
      ctx.fillStyle = '#d6a374';
      ctx.fillRect(-18, -36, 12, 18);
      ctx.fillStyle = '#b0bec5';
      ctx.fillRect(-22, -22, 12, 14);
      // Steam
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.arc(-16, -30, 4, 0, Math.PI * 2);
      ctx.fill();

      // Lead arm with folder
      ctx.fillStyle = '#d6a374';
      ctx.fillRect(14, -38, 12, 22);
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(22, -34, 12, 32);
    }

    // Head, Groomed Beard & Round Wire-Rimmed Glasses
    ctx.fillStyle = '#d6a374';
    ctx.beginPath();
    ctx.arc(0, -60, 15, 0, Math.PI * 2);
    ctx.fill();

    // Dark Wavy Hair & Subtle Stubble
    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.arc(0, -64, 16, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();
    ctx.fillStyle = 'rgba(20, 20, 20, 0.35)';
    ctx.beginPath();
    ctx.arc(2, -54, 9, 0, Math.PI * 0.9);
    ctx.fill();

    // Round Wire-Rimmed Spectacles (Reference Artwork)
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(-5, -61, 5, 0, Math.PI * 2);
    ctx.arc(5, -61, 5, 0, Math.PI * 2);
    ctx.moveTo(0, -61); ctx.lineTo(1, -61); // Bridge
    ctx.stroke();

    // Calm knowing smile
    ctx.strokeStyle = '#141414';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(1, -54, 4, 0.1, Math.PI * 0.8);
    ctx.stroke();

    ctx.restore();
  }

  // =========================================================================
  // 5. THE PLACEMENT WARRIOR ("The Final Boss")
  // =========================================================================
  renderRealisticPlacement(ctx, state, isHurt, isBlock, isAttack) {
    const breath = Math.sin(performance.now() * 0.007) * 1.6;
    const walkSwing = Math.sin(this.animCycle) * 16;
    const isJumping = !this.isGrounded;

    // Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 0, isJumping ? 20 : 32, isJumping ? 4 : 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Charcoal Formal Trousers & Glossy Dress Shoes
    let lFootX = -13, lFootY = 0, rFootX = 15, rFootY = 0;
    if (state === FIGHTER_STATES.WALKING) {
      lFootX = -13 - walkSwing;
      rFootX = 15 + walkSwing;
    } else if (isBlock) {
      lFootX = -20; rFootX = 20;
    } else if (isJumping) {
      lFootY = -18; rFootY = -12;
    }

    ctx.fillStyle = '#262626';
    ctx.beginPath();
    ctx.moveTo(-6, -58);
    ctx.lineTo(lFootX - 8, lFootY);
    ctx.lineTo(lFootX + 8, lFootY);
    ctx.lineTo(6, -58);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#3a3a3a';
    ctx.beginPath();
    ctx.moveTo(-2, -58);
    ctx.lineTo(rFootX - 8, rFootY);
    ctx.lineTo(rFootX + 8, rFootY);
    ctx.lineTo(12, -58);
    ctx.closePath();
    ctx.fill();

    // Polished Black Shoes with shine highlight
    ctx.fillStyle = '#050505';
    ctx.fillRect(lFootX - 11, lFootY - 6, 22, 6);
    ctx.fillRect(rFootX - 11, rFootY - 6, 24, 6);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(lFootX - 5, lFootY - 6, 8, 2);
    ctx.fillRect(rFootX - 5, rFootY - 6, 8, 2);

    // Torso: Sharp Black Suit Blazer, White Shirt, Red Tie & SRM ID Lanyard
    const torsoY = isBlock ? -60 : -66 + breath;
    const torsoTilt = isHurt ? -0.2 : (isAttack ? 0.22 : 0);

    ctx.save();
    ctx.translate(0, torsoY);
    ctx.rotate(torsoTilt);

    // Black Business Suit Blazer Body
    const blazerGrad = ctx.createLinearGradient(-24, -48, 24, 8);
    blazerGrad.addColorStop(0, isHurt ? '#c2185b' : '#222228');
    blazerGrad.addColorStop(1, isHurt ? '#880e4f' : '#141418');
    ctx.fillStyle = blazerGrad;

    ctx.beginPath();
    ctx.moveTo(-24, -48);
    ctx.lineTo(24, -48);
    ctx.lineTo(14, 8);
    ctx.lineTo(-14, 8);
    ctx.closePath();
    ctx.fill();

    // Crisp White Shirt & Lapels
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-8, -48); ctx.lineTo(8, -48); ctx.lineTo(0, -18);
    ctx.closePath();
    ctx.fill();

    // Bold Corporate Red Silk Tie
    ctx.fillStyle = '#c62828';
    ctx.beginPath();
    ctx.moveTo(-3.5, -46); ctx.lineTo(3.5, -46); ctx.lineTo(4.5, -12); ctx.lineTo(0, -6); ctx.lineTo(-4.5, -12);
    ctx.closePath();
    ctx.fill();

    // Royal Blue SRM ID Card Lanyard around neck
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-6, -46); ctx.lineTo(-1, -22); ctx.lineTo(6, -46);
    ctx.stroke();

    // Dangling SRM Student ID Card
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-5, -22, 10, 14);
    ctx.fillStyle = '#1565c0';
    ctx.fillRect(-5, -22, 10, 4); // Blue top banner
    ctx.fillStyle = '#111111';
    ctx.fillRect(-3, -16, 6, 2); // Photo box

    // Luxury Gold Wristwatch
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(18, -12, 6, 4);

    // Arms & Combat Moves
    if (isBlock) {
      // Portfolio Shield
      ctx.fillStyle = '#1f2937';
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.fillRect(10, -50, 16, 50);
      ctx.strokeRect(10, -50, 16, 50);
      ctx.fillStyle = '#c0c0c0';
      ctx.fillRect(17, -50, 2, 50);
    } else if (isAttack && this.currentMove) {
      if (this.currentMove.name === 'Resume Slap') {
        const ext = Math.sin((this.moveFrame / this.currentMove.getTotalFrames()) * Math.PI);
        ctx.fillStyle = '#e0ac69';
        ctx.fillRect(12, -38, 22, 12);
        ctx.fillStyle = '#f8f9fa';
        ctx.strokeStyle = '#0288d1';
        ctx.lineWidth = 1.5;
        ctx.fillRect(32 + ext * 24, -42, 38, 14);
        ctx.strokeRect(32 + ext * 24, -42, 38, 14);
        ctx.fillStyle = '#0d47a1';
        ctx.font = 'bold 7px sans-serif';
        ctx.fillText('9.8 CGPA', 36 + ext * 24, -32);
      } else {
        // Tie Toss Whip
        const ext = Math.sin((this.moveFrame / this.currentMove.getTotalFrames()) * Math.PI);
        ctx.strokeStyle = '#b71c1c';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(12, -36);
        ctx.quadraticCurveTo(45 + ext * 30, -55, 80 + ext * 40, -32);
        ctx.stroke();
        ctx.fillStyle = '#00e5ff';
        ctx.beginPath();
        ctx.arc(80 + ext * 40, -32, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Idle: Professional stance with black leather portfolio tucked under right arm
      ctx.fillStyle = '#e0ac69';
      ctx.fillRect(-18, -38, 12, 20);

      // Lead arm holding black leather folder
      ctx.fillStyle = '#e0ac69';
      ctx.fillRect(14, -40, 12, 22);

      // Sleek Black Leather Portfolio Folder under arm
      ctx.fillStyle = '#111111';
      ctx.fillRect(20, -34, 12, 34);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(20, -22, 12, 2); // Gold corner clip
    }

    // Head & Executive Haircut
    ctx.fillStyle = '#e0ac69';
    ctx.beginPath();
    ctx.arc(0, -62, 15, 0, Math.PI * 2);
    ctx.fill();

    // Clean slicked executive hair
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.arc(0, -66, 16, Math.PI * 0.9, Math.PI * 2.1);
    ctx.lineTo(14, -58);
    ctx.lineTo(-14, -58);
    ctx.closePath();
    ctx.fill();

    // Sharp Focus Eyes
    ctx.fillStyle = '#000000';
    ctx.fillRect(4, -62, 4, 3);

    ctx.restore();
  }

  // =========================================================================
  // 6. THE SPORTS STAR ("The Campus Athlete")
  // =========================================================================
  renderRealisticSportsStar(ctx, state, isHurt, isBlock, isAttack) {
    const breath = Math.sin(performance.now() * 0.009) * 2.2;
    const walkSwing = Math.sin(this.animCycle) * 18;
    const isJumping = !this.isGrounded;

    // Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 0, isJumping ? 18 : 34, isJumping ? 4 : 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Athletic Shorts & High-Performance Sneakers
    let lFootX = -14, lFootY = 0, rFootX = 16, rFootY = 0;
    if (state === FIGHTER_STATES.WALKING) {
      lFootX = -14 - walkSwing;
      rFootX = 16 + walkSwing;
    } else if (isBlock) {
      lFootX = -20; rFootX = 20;
    } else if (isJumping) {
      lFootY = -20; rFootY = -14;
    }

    // Toned Athletic Legs (Skin)
    ctx.fillStyle = '#c68642';
    ctx.beginPath();
    ctx.moveTo(-6, -42);
    ctx.lineTo(lFootX - 7, lFootY - 6);
    ctx.lineTo(lFootX + 7, lFootY - 6);
    ctx.lineTo(5, -42);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-2, -42);
    ctx.lineTo(rFootX - 7, rFootY - 6);
    ctx.lineTo(rFootX + 7, rFootY - 6);
    ctx.lineTo(9, -42);
    ctx.closePath();
    ctx.fill();

    // Athletic Black Shorts with White Stripe
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-18, -58, 36, 20);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-18, -58, 3, 20);
    ctx.fillRect(15, -58, 3, 20);

    // High Performance Running Shoes (White with Royal Blue Stripes)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(lFootX - 11, lFootY - 6, 22, 6);
    ctx.fillRect(rFootX - 11, rFootY - 6, 24, 6);
    ctx.fillStyle = '#1565c0';
    ctx.fillRect(lFootX - 11, lFootY - 2, 22, 3);
    ctx.fillRect(rFootX - 11, rFootY - 2, 24, 3);

    // Torso: Royal Blue SRM Athletic Jersey
    const torsoY = isBlock ? -60 : -66 + breath;
    const torsoTilt = isHurt ? -0.2 : (isAttack ? 0.22 : 0);

    ctx.save();
    ctx.translate(0, torsoY);
    ctx.rotate(torsoTilt);

    // Royal Blue Jersey
    ctx.fillStyle = '#1565c0';
    ctx.beginPath();
    ctx.moveTo(-24, -48);
    ctx.lineTo(24, -48);
    ctx.lineTo(15, 8);
    ctx.lineTo(-15, 8);
    ctx.closePath();
    ctx.fill();

    // SRM Athletic Text
    ctx.font = '900 11px "Arial Black", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('SRM', 0, -22);

    // White Shoulder Trim
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-24, -48, 4, 12);
    ctx.fillRect(20, -48, 4, 12);

    // Arms & Props (Cricket Bat, Boxing Guard, Sports Ball)
    if (isBlock) {
      // Athletic Boxing Guard with Forearms & White Wristbands
      ctx.fillStyle = '#c68642';
      ctx.fillRect(8, -48, 14, 32);
      ctx.fillRect(18, -48, 14, 32);
      // White Wristbands
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(8, -28, 14, 8);
      ctx.fillRect(18, -28, 14, 8);
      // Protective energy shield
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 3;
      ctx.strokeRect(6, -50, 28, 36);
    } else if (isAttack && this.currentMove) {
      if (this.currentMove.name === 'Quick Jab') {
        const ext = Math.sin((this.moveFrame / this.currentMove.getTotalFrames()) * Math.PI);
        ctx.fillStyle = '#c68642';
        ctx.fillRect(12, -40, 26 + ext * 28, 14);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(28 + ext * 28, -40, 8, 14); // Wristband
        ctx.fillStyle = '#ff6b35';
        ctx.fillRect(36 + ext * 28, -42, 14, 18);
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(52 + ext * 28, -33, 14, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Cricket Bat Swing
        const ext = Math.sin((this.moveFrame / this.currentMove.getTotalFrames()) * Math.PI);
        ctx.save();
        ctx.translate(14, -30);
        ctx.rotate(-1.0 + ext * 2.6);
        ctx.fillStyle = '#d7ccc8';
        ctx.fillRect(0, -14, 60, 16);
        ctx.fillStyle = '#39ff14';
        ctx.fillRect(-16, -10, 18, 8);
        ctx.strokeStyle = '#39ff14';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(30, -6, 26, 0, Math.PI);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      // Idle: Athletic stance with white wristbands, resting cricket bat / sports ball
      ctx.fillStyle = '#c68642';
      ctx.fillRect(-18, -38, 12, 22);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-18, -24, 12, 6); // Wristband

      ctx.fillStyle = '#c68642';
      ctx.fillRect(14, -40, 12, 22);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(14, -26, 12, 6); // Wristband

      // Cricket bat blade
      ctx.fillStyle = '#d7ccc8';
      ctx.fillRect(20, -22, 12, 42);
      ctx.fillStyle = '#39ff14';
      ctx.fillRect(19, -32, 14, 12);
    }

    // Head, Spiky Hair & Neon Orange Sweatband
    ctx.fillStyle = '#c68642';
    ctx.beginPath();
    ctx.arc(0, -62, 15, 0, Math.PI * 2);
    ctx.fill();

    // Spiky Hair
    ctx.fillStyle = '#1e1e1e';
    ctx.beginPath();
    ctx.arc(0, -66, 16, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();

    // Neon Orange Sweatband
    ctx.fillStyle = '#ff6b35';
    ctx.fillRect(-14, -66, 28, 5);

    // Energetic Grin & Eye
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(3, -62, 5, 3);
    ctx.fillStyle = '#000000';
    ctx.fillRect(5, -62, 3, 3);

    ctx.restore();
  }

  renderBodySilhouette(ctx) {

    ctx.beginPath();
    ctx.ellipse(0, -68, 26, 64, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ─── CYPHER — The Campus Hacker ──────────────────────────────────────────

  renderRealisticCypher(ctx, state, isHurt, isBlock, isAttack) {
    const breath = Math.sin(performance.now() * 0.005) * 1.5;
    const walkSwing = Math.sin(this.animCycle) * 15;
    const isJumping = !this.isGrounded;
    const hurtTint = isHurt ? 0.7 : 1.0;

    // Shadow
    ctx.fillStyle = `rgba(0,0,0,${isJumping ? 0.2 : 0.4})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, isJumping ? 18 : 30, isJumping ? 3 : 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs — black tactical combat pants with cyan utility straps
    let lFX = -12, rFX = 14;
    if (state === FIGHTER_STATES.WALKING) { lFX -= walkSwing * 0.5; rFX += walkSwing * 0.5; }
    ctx.fillStyle = '#080812';
    ctx.fillRect(-16, -60, 14, 62);
    ctx.fillStyle = '#0e0e1c';
    ctx.fillRect(4, -60, 14, 62);
    // Cyan utility straps
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 6;
    ctx.fillRect(-16, -42, 14, 2);
    ctx.fillRect(4, -42, 14, 2);
    ctx.fillRect(-16, -4, 14, 4);
    ctx.fillRect(4, -4, 14, 4);
    ctx.shadowBlur = 0;

    // Body — cyber-tactical hoodie with neon cyan circuit traces
    const torsoGrad = ctx.createLinearGradient(-22, -115, 22, -115);
    torsoGrad.addColorStop(0, '#121220');
    torsoGrad.addColorStop(0.5, '#080812');
    torsoGrad.addColorStop(1, '#121220');
    ctx.fillStyle = torsoGrad;
    ctx.beginPath();
    ctx.moveTo(-22, -58 + breath);
    ctx.lineTo(-26, -110 + breath);
    ctx.lineTo(26, -110 + breath);
    ctx.lineTo(22, -58 + breath);
    ctx.closePath();
    ctx.fill();

    // Cyan Circuitry Traces on Chest & Sleeves
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(-16, -100 + breath); ctx.lineTo(-8, -80 + breath); ctx.lineTo(-8, -65 + breath);
    ctx.moveTo(16, -100 + breath); ctx.lineTo(8, -80 + breath); ctx.lineTo(8, -65 + breath);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Arms & Cyberdeck Laptop
    if (isBlock) {
      // Hexagonal Holographic Data Shield
      ctx.fillStyle = '#080812';
      ctx.fillRect(-30, -90 + breath, 14, 30);
      ctx.fillRect(16, -90 + breath, 14, 30);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      // Draw cyber hex barrier
      for (let h = 0; h < 6; h++) {
        const hAngle = (h / 6) * Math.PI * 2;
        const hx = Math.cos(hAngle) * 32;
        const hy = -80 + breath + Math.sin(hAngle) * 32;
        if (h === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (isAttack && this.currentMove) {
      const ext = Math.sin((this.moveFrame / (this.currentMove.getTotalFrames ? this.currentMove.getTotalFrames() : 20)) * Math.PI);
      ctx.fillStyle = '#121220';
      ctx.fillRect(14, -95 + breath, 14, 28 + ext * 20);
      // Cyberdeck claw strike
      ctx.fillStyle = '#1e1e30';
      ctx.fillRect(26 + ext * 22, -95 + breath, 22, 14);
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.fillRect(28 + ext * 22, -92 + breath, 18, 8);
      // Binary Data Stream Blast
      ctx.font = '900 10px monospace';
      ctx.fillStyle = '#00f0ff';
      ctx.textAlign = 'center';
      ctx.fillText('>_PWN', 60 + ext * 24, -88 + breath);
      ctx.shadowBlur = 0;
    } else {
      // Idle: Holding cyberdeck laptop glowing with cyan matrix terminal code
      const guardBob = Math.sin(performance.now() * 0.008) * 2;
      ctx.fillStyle = '#080812';
      ctx.fillRect(-22, -95 + breath + guardBob, 12, 28);
      ctx.fillRect(10, -95 + breath - guardBob, 12, 28);

      // Open Cyberdeck / Laptop in hands
      ctx.save();
      ctx.translate(0, -82 + breath);
      ctx.fillStyle = '#0d0d18';
      ctx.fillRect(-14, 0, 28, 6); // Base
      ctx.fillStyle = '#151528';
      ctx.fillRect(8, -18, 4, 22); // Screen
      // Glowing Cyan Matrix Display
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.fillRect(6, -16, 3, 18);
      ctx.font = 'bold 5px monospace';
      ctx.fillText('0101', -2, 4);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Deep Shadow Hood pulled over head
    ctx.fillStyle = '#080814';
    ctx.beginPath();
    ctx.arc(0, -118 + breath, 18, Math.PI * 0.8, Math.PI * 2.2);
    ctx.lineTo(16, -104 + breath);
    ctx.lineTo(-16, -104 + breath);
    ctx.closePath();
    ctx.fill();

    // Dark Face Void inside hood
    ctx.fillStyle = '#030308';
    ctx.beginPath();
    ctx.ellipse(0, -118 + breath, 14, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Cyan Matrix Digital Visor / Skull Face Mask
    const visorY = -120 + breath;
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 14;
    // Glowing cyber visor strip
    ctx.fillRect(-12, visorY, 24, 6);
    // Digital matrix teeth / grid
    ctx.fillRect(-8, visorY + 9, 3, 3);
    ctx.fillRect(-2, visorY + 9, 4, 3);
    ctx.fillRect(5, visorY + 9, 3, 3);
    ctx.shadowBlur = 0;
  }

  // ─── GAVEL — The Moot Court Legend ──────────────────────────────────────

  renderRealisticGavel(ctx, state, isHurt, isBlock, isAttack) {
    const breath = Math.sin(performance.now() * 0.004) * 1.5;
    const walkSwing = Math.sin(this.animCycle) * 14;
    const isJumping = !this.isGrounded;

    // Shadow
    ctx.fillStyle = `rgba(0,0,0,${isJumping ? 0.2 : 0.45})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, isJumping ? 20 : 34, isJumping ? 4 : 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Broad powerful legs
    let lFY = 0, rFY = 0;
    if (state === FIGHTER_STATES.WALKING) { lFY = -walkSwing * 0.3; }
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-20, -65, 16, 66);
    ctx.fillStyle = '#252525';
    ctx.fillRect(4, -65, 16, 66);
    // Polished shoe caps
    ctx.fillStyle = '#111';
    ctx.fillRect(-22, -5, 18, 6);
    ctx.fillRect(2, -5, 18, 6);

    // Court blazer (broad-shouldered)
    const blazerGrad = ctx.createLinearGradient(-28, -120, 28, -120);
    blazerGrad.addColorStop(0, '#1a1a2e');
    blazerGrad.addColorStop(0.4, '#252535');
    blazerGrad.addColorStop(0.6, '#1a1a2e');
    blazerGrad.addColorStop(1, '#0f0f1a');
    ctx.fillStyle = blazerGrad;
    ctx.beginPath();
    ctx.moveTo(-28, -62 + breath);
    ctx.lineTo(-32, -115 + breath);
    ctx.lineTo(32, -115 + breath);
    ctx.lineTo(28, -62 + breath);
    ctx.closePath();
    ctx.fill();

    // Lapels
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.moveTo(-6, -62 + breath);
    ctx.lineTo(-18, -90 + breath);
    ctx.lineTo(-28, -115 + breath);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(6, -62 + breath);
    ctx.lineTo(18, -90 + breath);
    ctx.lineTo(28, -115 + breath);
    ctx.closePath();
    ctx.fill();

    // White shirt + gold SRM crest
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(-6, -108 + breath, 12, 20);

    // Gold SRM Moot Court Crest
    ctx.font = '900 7px sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 6;
    ctx.textAlign = 'center';
    ctx.fillText('SRM', -18, -94 + breath);
    ctx.shadowBlur = 0;

    // Arms / Weapon
    if (isBlock) {
      // Briefcase slammed into ground as barrier
      ctx.fillStyle = '#3d2b1f';
      ctx.fillRect(-34, -80 + breath, 12, 28);
      ctx.fillRect(22, -80 + breath, 12, 28);
      // Briefcase face
      ctx.fillStyle = '#5d3c28';
      ctx.fillRect(-40, -72 + breath, 18, 22);
      ctx.strokeStyle = '#c8a84b';
      ctx.lineWidth = 2;
      ctx.strokeRect(-40, -72 + breath, 18, 22);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(-34, -63 + breath, 6, 4);
    } else if (isAttack && this.currentMove) {
      const ext = Math.sin((this.moveFrame / (this.currentMove.getTotalFrames ? this.currentMove.getTotalFrames() : 22)) * Math.PI);
      // Gavel swing
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(20, -100 + breath, 12, 30);
      ctx.save();
      ctx.translate(24, -90 + breath);
      ctx.rotate(-1.2 + ext * 2.4);
      // Gavel head
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(-6, -24, 12, 28);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(-7, -24, 14, 5);
      ctx.fillRect(-7, 0, 14, 5);
      ctx.fillStyle = '#a0522d';
      ctx.fillRect(-3, 4, 6, 28);
      if (this.currentMove.name === 'Contempt of Court' && ext > 0.5) {
        ctx.globalAlpha = ext;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, 0, 30 * ext, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    } else {
      // Idle: Firm authoritative stance holding solid mahogany Judge's Gavel upright
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(-28, -92 + breath, 12, 25);
      ctx.fillRect(16, -95 + breath, 12, 28);

      // Raised Solid Mahogany Judge's Gavel held upright
      ctx.save();
      ctx.translate(22, -94 + breath);
      // Handle
      ctx.fillStyle = '#5c2c16';
      ctx.fillRect(0, -10, 5, 26);
      // Gavel head horizontal
      ctx.fillStyle = '#3e1a0b';
      ctx.fillRect(-8, -22, 22, 12);
      // Polished Gold Ring Bands on Gavel Head
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 6;
      ctx.fillRect(-8, -22, 4, 12);
      ctx.fillRect(10, -22, 4, 12);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Head
    ctx.fillStyle = isHurt ? '#8b5a3c' : '#c68642';
    ctx.beginPath();
    ctx.ellipse(0, -122 + breath, 15, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dark hair (side-parted)
    ctx.fillStyle = '#2c1810';
    ctx.beginPath();
    ctx.arc(0, -128 + breath, 16, Math.PI * 0.85, Math.PI * 2.15);
    ctx.fill();
    // Part line
    ctx.strokeStyle = '#1a0e09';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -130 + breath);
    ctx.lineTo(0, -118 + breath);
    ctx.stroke();

    // Stern expression
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-8, -120 + breath, 5, 3);
    ctx.fillRect(3, -120 + breath, 5, 3);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-6, -120 + breath, 3, 3);
    ctx.fillRect(5, -120 + breath, 3, 3);
    // Stern brow
    ctx.strokeStyle = '#2c1810';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -124 + breath);
    ctx.lineTo(-3, -122 + breath);
    ctx.moveTo(3, -122 + breath);
    ctx.lineTo(10, -124 + breath);
    ctx.stroke();
  }

  // ─── BOLT — The Track Star ───────────────────────────────────────────────

  renderRealisticBolt(ctx, state, isHurt, isBlock, isAttack) {
    const breath = Math.sin(performance.now() * 0.008) * 2;
    const walkSwing = Math.sin(this.animCycle) * 18;
    const isJumping = !this.isGrounded;
    const t = performance.now();

    // Shadow
    ctx.fillStyle = `rgba(0,0,0,${isJumping ? 0.15 : 0.4})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, isJumping ? 16 : 28, isJumping ? 3 : 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Athletic legs — running tights
    let lFX = -12, rFX = 14, lFY = 0, rFY = 0;
    if (state === FIGHTER_STATES.WALKING) {
      lFX -= walkSwing * 0.6; lFY = -Math.abs(walkSwing) * 0.3;
      rFX += walkSwing * 0.4; rFY = -Math.abs(walkSwing) * 0.15;
    } else if (isJumping) {
      lFY = -25; rFY = -18;
    }
    ctx.fillStyle = '#023e8a';
    ctx.beginPath();
    ctx.moveTo(-6, -65);
    ctx.lineTo(lFX - 9, lFY);
    ctx.lineTo(lFX + 7, lFY);
    ctx.lineTo(6, -65);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1e5f9a';
    ctx.beginPath();
    ctx.moveTo(-6, -65);
    ctx.lineTo(rFX - 7, rFY);
    ctx.lineTo(rFX + 9, rFY);
    ctx.lineTo(6, -65);
    ctx.closePath();
    ctx.fill();
    // Gold racing stripe down leg
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -65);
    ctx.lineTo(lFX - 3, lFY);
    ctx.stroke();

    // Running spikes (Sky Blue & White)
    ctx.fillStyle = '#00b0ff';
    ctx.fillRect(lFX - 9, lFY - 4, 18, 6);
    ctx.fillRect(rFX - 7, rFY - 4, 18, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(lFX - 9, lFY - 1, 18, 2);
    ctx.fillRect(rFX - 7, rFY - 1, 18, 2);

    // Torso — Sky-blue athletic shirt with white side panels
    const singletGrad = ctx.createRadialGradient(-8, -90 + breath, 2, 0, -90 + breath, 24);
    singletGrad.addColorStop(0, '#00b0ff');
    singletGrad.addColorStop(0.6, '#0288d1');
    singletGrad.addColorStop(1, '#01579b');
    ctx.fillStyle = singletGrad;
    ctx.beginPath();
    ctx.moveTo(-22, -62 + breath);
    ctx.lineTo(-24, -112 + breath);
    ctx.lineTo(24, -112 + breath);
    ctx.lineTo(22, -62 + breath);
    ctx.closePath();
    ctx.fill();

    // White Side Panels
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-24, -110 + breath, 4, 46);
    ctx.fillRect(20, -110 + breath, 4, 46);

    // SRM logo on chest
    ctx.font = '900 10px "Arial Black", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('SRM', 0, -88 + breath);

    // Cyan Wristbands
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(-28, -72 + breath, 10, 8);
    ctx.fillRect(18, -72 + breath, 10, 8);

    // Arms, Drone Controller & Hovering Drone
    if (isBlock) {
      // Protective Drone Forcefield
      ctx.fillStyle = '#a0522d';
      ctx.fillRect(-22, -88 + breath, 10, 24);
      ctx.fillRect(12, -88 + breath, 10, 24);
      // Drone Shield Energy
      ctx.strokeStyle = '#00b0ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00b0ff';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, -82 + breath, 36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (isAttack && this.currentMove) {
      const ext = Math.sin((this.moveFrame / (this.currentMove.getTotalFrames ? this.currentMove.getTotalFrames() : 20)) * Math.PI);
      // Drone Dive Strike / Lightning Dash
      ctx.fillStyle = '#a0522d';
      ctx.fillRect(14, -92 + breath, 14, 24 + ext * 24);

      // Fast attacking drone thrust
      ctx.save();
      ctx.translate(34 + ext * 34, -94 + breath);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-10, -6, 20, 12);
      // 4 rotors spinning
      ctx.fillStyle = '#00b0ff';
      ctx.shadowColor = '#00b0ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(-10, -8, 6, 0, Math.PI * 2);
      ctx.arc(10, -8, 6, 0, Math.PI * 2);
      ctx.arc(-10, 8, 6, 0, Math.PI * 2);
      ctx.arc(10, 8, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    } else {
      // Idle: Holding drone remote controller + Hovering mini quadcopter drone
      const droneBob = Math.sin(performance.now() * 0.009) * 4;
      ctx.fillStyle = '#a0522d';
      ctx.fillRect(-16, -88 + breath, 10, 22);
      ctx.fillRect(6, -88 + breath, 10, 22);

      // Drone Remote Controller in hands
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-8, -78 + breath, 16, 12);
      ctx.strokeStyle = '#00b0ff';
      ctx.lineWidth = 1.5;
      // Dual antennae
      ctx.beginPath();
      ctx.moveTo(-4, -78 + breath); ctx.lineTo(-7, -86 + breath);
      ctx.moveTo(4, -78 + breath); ctx.lineTo(7, -86 + breath);
      ctx.stroke();

      // Hovering Mini Quadcopter Drone (beside him at right)
      ctx.save();
      ctx.translate(32, -100 + breath + droneBob);
      // Drone Central Chassis
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-8, -5, 16, 10);
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(-2, -3, 4, 4); // Status light
      // 4 Rotor Arms
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-12, -8); ctx.lineTo(12, 8);
      ctx.moveTo(-12, 8); ctx.lineTo(12, -8);
      ctx.stroke();
      // 4 Spinning Cyan Glowing Rotors
      ctx.fillStyle = 'rgba(0, 229, 255, 0.75)';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(-12, -8, 7, 2, 0, 0, Math.PI * 2);
      ctx.ellipse(12, -8, 7, 2, 0, 0, Math.PI * 2);
      ctx.ellipse(-12, 8, 7, 2, 0, 0, Math.PI * 2);
      ctx.ellipse(12, 8, 7, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Head, Sport Sunglasses & Neck Headphones
    ctx.fillStyle = isHurt ? '#7a3a1f' : '#a0522d';
    ctx.beginPath();
    ctx.ellipse(0, -120 + breath, 13, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Short sporty hair
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(0, -124 + breath, 14, Math.PI * 0.85, Math.PI * 2.15);
    ctx.fill();

    // Cool Sport Sunglasses / Visor
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-11, -122 + breath, 22, 6);
    // Cyan Lens Reflection
    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 6;
    ctx.fillRect(-9, -121 + breath, 8, 3);
    ctx.fillRect(1, -121 + breath, 8, 3);
    ctx.shadowBlur = 0;

    // Blue Sport Headphones around neck
    ctx.strokeStyle = '#0288d1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -112 + breath, 14, 0.2, Math.PI * 0.8);
    ctx.stroke();
    // Ear pads on neck
    ctx.fillStyle = '#00b0ff';
    ctx.fillRect(-15, -114 + breath, 5, 8);
    ctx.fillRect(10, -114 + breath, 5, 8);

    // Speed lines (in motion)
    if (state === FIGHTER_STATES.WALKING || isJumping) {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const lineY = -90 + breath + i * 12;
        ctx.beginPath();
        ctx.moveTo(-28, lineY);
        ctx.lineTo(-38 - i * 4, lineY);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  // ─── PALETTE — The Fine Arts Major ──────────────────────────────────────

  renderRealisticPalette(ctx, state, isHurt, isBlock, isAttack) {
    const breath = Math.sin(performance.now() * 0.005) * 2;
    const walkSwing = Math.sin(this.animCycle) * 14;
    const isJumping = !this.isGrounded;
    const t = performance.now();
    const hueShift = (t * 0.08) % 360;

    // Shadow
    ctx.fillStyle = `rgba(0,0,0,${isJumping ? 0.18 : 0.38})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, isJumping ? 18 : 28, isJumping ? 3 : 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs — dark skirt / fitted tights & chic white-pink sneaker boots
    ctx.fillStyle = '#212121';
    ctx.fillRect(-16, -62, 12, 60);
    ctx.fillRect(4, -62, 12, 60);
    // Dark Pleated Skirt
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(-18, -62);
    ctx.lineTo(18, -62);
    ctx.lineTo(21, -44);
    ctx.lineTo(-21, -44);
    ctx.closePath();
    ctx.fill();

    // White & Pink Sneaker Boots
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-18, -6, 15, 6);
    ctx.fillRect(3, -6, 15, 6);
    ctx.fillStyle = '#ff4081';
    ctx.fillRect(-18, -2, 15, 2);
    ctx.fillRect(3, -2, 15, 2);

    // Canvas Tote Bag Strap hanging on shoulder
    ctx.strokeStyle = '#d7ccc8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-22, -108 + breath); ctx.lineTo(-24, -68 + breath);
    ctx.stroke();
    // Canvas Tote Bag Body
    ctx.fillStyle = '#f5f5f0';
    ctx.fillRect(-28, -68 + breath, 14, 24);
    // Cute Art Emblem on Tote
    ctx.fillStyle = '#ff4081';
    ctx.beginPath();
    ctx.arc(-21, -56 + breath, 3, 0, Math.PI * 2);
    ctx.fill();

    // Torso: Pastel Pink Oversized Cozy Hoodie
    const hoodieGrad = ctx.createLinearGradient(-22, -112, 22, -58);
    hoodieGrad.addColorStop(0, '#f8bbd0');
    hoodieGrad.addColorStop(0.5, '#f48fb1');
    hoodieGrad.addColorStop(1, '#f06292');
    ctx.fillStyle = hoodieGrad;
    ctx.beginPath();
    ctx.moveTo(-24, -58 + breath);
    ctx.lineTo(-26, -110 + breath);
    ctx.lineTo(26, -110 + breath);
    ctx.lineTo(24, -58 + breath);
    ctx.closePath();
    ctx.fill();

    // White Hoodie Drawstrings
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -108 + breath); ctx.lineTo(-4, -86 + breath);
    ctx.moveTo(4, -108 + breath); ctx.lineTo(4, -86 + breath);
    ctx.stroke();

    // Kangaroo Pocket
    ctx.fillStyle = '#f48fb1';
    ctx.beginPath();
    ctx.moveTo(-12, -78 + breath);
    ctx.lineTo(12, -78 + breath);
    ctx.lineTo(14, -64 + breath);
    ctx.lineTo(-14, -64 + breath);
    ctx.closePath();
    ctx.fill();

    // Arms, Digital Tablet & Stylus
    if (isBlock) {
      // Digital Tablet Holographic Barrier
      ctx.fillStyle = '#c68642';
      ctx.fillRect(-20, -96 + breath, 10, 24);
      ctx.fillRect(10, -96 + breath, 10, 24);
      // Digital drawing tablet held up
      ctx.fillStyle = '#1e1e24';
      ctx.fillRect(-16, -102 + breath, 32, 40);
      ctx.strokeStyle = '#ff4081';
      ctx.lineWidth = 2;
      ctx.strokeRect(-16, -102 + breath, 32, 40);
      // Glowing Neon Palette Art Barrier
      ctx.fillStyle = `hsla(${hueShift}, 90%, 65%, 0.25)`;
      ctx.fillRect(-13, -99 + breath, 26, 34);
    } else if (isAttack && this.currentMove) {
      const ext = Math.sin((this.moveFrame / (this.currentMove.getTotalFrames ? this.currentMove.getTotalFrames() : 22)) * Math.PI);
      // Stylus slash drawing glowing rainbow trail
      ctx.fillStyle = '#c68642';
      ctx.fillRect(14, -98 + breath, 12, 26);
      ctx.save();
      ctx.translate(22, -92 + breath);
      ctx.rotate(-0.8 + ext * 2.2);
      // Digital Stylus
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -6, 4, 38);
      ctx.fillStyle = '#ff4081';
      ctx.fillRect(-2, 30, 4, 6);
      // Rainbow light trail
      if (ext > 0.2) {
        ctx.strokeStyle = `hsl(${(hueShift + ext * 180) % 360}, 100%, 65%)`;
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ff4081';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 36, 26, 0, Math.PI);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    } else {
      // Idle: Left hand cradling digital tablet, right hand holding fine stylus
      const guardBob = Math.sin(performance.now() * 0.008) * 2;
      ctx.fillStyle = '#c68642';
      ctx.fillRect(-18, -94 + breath + guardBob, 10, 20);
      ctx.fillRect(10, -94 + breath - guardBob, 10, 20);

      // Sleek Digital Drawing Tablet cradled in left arm
      ctx.save();
      ctx.translate(-8, -82 + breath);
      ctx.fillStyle = '#1e1e24';
      ctx.fillRect(-12, -4, 20, 26); // Tablet body
      ctx.strokeStyle = '#33333e';
      ctx.strokeRect(-12, -4, 20, 26);
      // Glowing Art Screen
      ctx.fillStyle = `hsl(${hueShift}, 85%, 65%)`;
      ctx.shadowColor = '#ff4081';
      ctx.shadowBlur = 6;
      ctx.fillRect(-10, -2, 16, 22);
      ctx.shadowBlur = 0;
      ctx.restore();

      // Stylus Pen held in right hand
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(14, -86 + breath, 3, 18);
      ctx.fillStyle = '#ff4081';
      ctx.fillRect(14, -88 + breath, 3, 3); // Stylus tip
    }

    // Head & Long Flowing Dark Wavy Hair
    ctx.fillStyle = isHurt ? '#9966aa' : '#c68642';
    ctx.beginPath();
    ctx.ellipse(0, -120 + breath, 13, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Long Flowing Dark Wavy Hair (Reference Artwork)
    ctx.fillStyle = '#1a101f';
    ctx.beginPath();
    ctx.arc(0, -126 + breath, 16, Math.PI * 0.8, Math.PI * 2.2);
    // Flowing hair strands cascading down past shoulders
    ctx.lineTo(18, -96 + breath);
    ctx.lineTo(12, -92 + breath);
    ctx.lineTo(10, -116 + breath);
    ctx.lineTo(-10, -116 + breath);
    ctx.lineTo(-12, -92 + breath);
    ctx.lineTo(-18, -96 + breath);
    ctx.closePath();
    ctx.fill();

    // Expressive Eyes with Sparkle
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-7, -121 + breath, 5, 3);
    ctx.fillRect(2, -121 + breath, 5, 3);
    ctx.fillStyle = '#3f1d5e';
    ctx.fillRect(-5, -121 + breath, 3, 3);
    ctx.fillRect(4, -121 + breath, 3, 3);
    // Eye star glint
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-5, -122 + breath, 1, 1);
    ctx.fillRect(4, -122 + breath, 1, 1);

    // Paint dabs on hands/arms
    ctx.fillStyle = `hsl(${hueShift}, 100%, 70%)`;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(-20, -78 + breath, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
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
