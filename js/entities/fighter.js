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

    // Formal Shoes
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(lFootX - 12, lFootY - 6, 24, 6);
    ctx.fillRect(rFootX - 12, rFootY - 6, 26, 6);

    // 3. V-Taper Muscular Torso (White Fitted Formal Shirt) — Volumetric radial gradient
    const torsoY = isBlock ? -60 : -66 + breath;
    const torsoTilt = isHurt ? -0.22 : (isAttack ? 0.18 : 0);

    ctx.save();
    ctx.translate(0, torsoY);
    ctx.rotate(torsoTilt);

    // Volumetric shirt — radial gradient for cylindrical 3D shading
    const shirtBaseColor = isHurt ? '#ef9a9a' : '#ffffff';
    const shirtHighlight = isHurt ? '#ffcdd2' : '#ffffff';
    const shirtGrad = ctx.createRadialGradient(-8, -40, 4, 0, -22, 38);
    shirtGrad.addColorStop(0, shirtHighlight);
    shirtGrad.addColorStop(0.5, shirtBaseColor);
    shirtGrad.addColorStop(1, isHurt ? '#b71c1c' : '#b0bec5');
    ctx.fillStyle = shirtGrad;

    // Muscular chest & waist taper
    ctx.beginPath();
    ctx.moveTo(-24, -48); // Left shoulder
    ctx.lineTo(24, -48);  // Right shoulder
    ctx.lineTo(13, 8);    // Right waist
    ctx.lineTo(-13, 8);   // Left waist
    ctx.closePath();
    ctx.fill();

    // Dark Belt & Gold Buckle
    ctx.fillStyle = '#111111';
    ctx.fillRect(-13, 4, 26, 5);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(-3, 3, 6, 7);

    // Tie (SRM Blue with Gold Tie-Bar)
    ctx.fillStyle = '#0d47a1';
    ctx.beginPath();
    ctx.moveTo(-4, -44);
    ctx.lineTo(4, -44);
    ctx.lineTo(5, -12);
    ctx.lineTo(0, -6);
    ctx.lineTo(-5, -12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(-4, -28, 8, 3); // Gold Tie Clip

    // 4. Arms & Hands (The Critical Animations!)
    if (isBlock) {
      // DEFENSE GUARD: Both arms crossed over chest and face!
      ctx.fillStyle = '#ffffff';
      // Crossed Left Forearm
      ctx.save();
      ctx.translate(-14, -36);
      ctx.rotate(0.55);
      ctx.fillRect(0, -6, 32, 11);
      ctx.fillStyle = '#ffd180';
      ctx.fillRect(28, -7, 10, 13); // Clenched Fist
      ctx.restore();

      // Crossed Right Forearm
      ctx.fillStyle = '#ffffff';
      ctx.save();
      ctx.translate(14, -36);
      ctx.rotate(-0.55);
      ctx.fillRect(-32, -6, 32, 11);
      ctx.fillStyle = '#ffd180';
      ctx.fillRect(-36, -7, 10, 13); // Clenched Fist
      ctx.restore();
    } else if (isAttack && this.currentMove) {
      if (this.currentMove.name === 'Pen Jab') {
        // LIGHT ATTACK: Explosive forward jab with gold pen thrust!
        const ext = Math.sin((this.moveFrame / this.currentMove.getTotalFrames()) * Math.PI) * 38;

        // Rear Arm (guarded at chin)
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(-18, -38, 14, 24);

        // Lead Arm (Fully extended forward thrust!)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(10, -42, 28 + ext, 11);
        // Muscular Forearm
        ctx.fillStyle = '#ffd180';
        ctx.fillRect(36 + ext, -43, 14, 13);

        // Gold Pen Weapon with Laser Thrust Trail
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(48 + ext, -40, 24, 6);
        ctx.fillStyle = '#00e5ff';
        ctx.fillRect(72 + ext, -39, 12, 4);

        // Speed Lines
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(10, -32); ctx.lineTo(60 + ext, -32);
        ctx.moveTo(15, -46); ctx.lineTo(75 + ext, -46);
        ctx.stroke();
      } else {
        // HEAVY ATTACK: Calculator Throw / Heavy Roundhouse Windup
        const ext = Math.sin((this.moveFrame / this.currentMove.getTotalFrames()) * Math.PI) * 44;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(10, -42, 32 + ext, 13);
        ctx.fillStyle = '#ffd180';
        ctx.fillRect(40 + ext, -44, 16, 15);

        // Flying Heavy Calculator Prop
        ctx.fillStyle = '#263238';
        ctx.fillRect(52 + ext, -55, 24, 28);
        ctx.fillStyle = '#00e5ff';
        ctx.fillRect(56 + ext, -51, 16, 8); // Glowing digital screen
        ctx.fillStyle = '#ffd700';
        ctx.fillText('999', 58 + ext, -45);
      }
    } else {
      // IDLE GUARD: Martial arts boxing stance with bobbing fists
      const guardBob = Math.sin(performance.now() * 0.008) * 3;
      // Rear Arm
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(-18, -38 + guardBob, 14, 22);
      ctx.fillStyle = '#ffd180';
      ctx.fillRect(-16, -20 + guardBob, 12, 12);

      // Lead Arm
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(12, -40 - guardBob, 18, 22);
      ctx.fillStyle = '#ffd180';
      ctx.fillRect(24, -24 - guardBob, 13, 13);
    }

    // 5. Head, Styled Hair & Gold Glasses
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

    // Rage Mode Eye Glow — pulsing red iris over the glasses region
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

    // High-Top Sneakers (Neon Orange + Mint Green)
    ctx.fillStyle = '#ff6b35';
    ctx.fillRect(lFootX - 14, lFootY - 7, 26, 7);
    ctx.fillRect(rFootX - 14, rFootY - 7, 28, 7);
    ctx.fillStyle = '#00d4aa';
    ctx.fillRect(lFootX - 4, lFootY - 4, 10, 4);
    ctx.fillRect(rFootX - 4, rFootY - 4, 10, 4);

    // 3. Heavy Tactical Backpack (Strapped behind torso)
    const torsoY = isBlock ? -60 : -66 + breath;
    const torsoTilt = isHurt ? -0.22 : (isAttack ? 0.2 : 0);

    ctx.save();
    ctx.translate(0, torsoY);
    ctx.rotate(torsoTilt);

    ctx.fillStyle = '#ff6b35';
    ctx.fillRect(-38, -52, 20, 44);
    ctx.fillStyle = '#d84315';
    ctx.fillRect(-40, -42, 6, 24); // Side pockets

    // Muscular Sleeveless Dark Hoodie (Showing defined biceps)
    ctx.fillStyle = isHurt ? '#ffab91' : '#262626';
    ctx.beginPath();
    ctx.moveTo(-26, -48);
    ctx.lineTo(24, -48);
    ctx.lineTo(12, 8);
    ctx.lineTo(-14, 8);
    ctx.closePath();
    ctx.fill();

    // Neon Orange Drawstrings
    ctx.strokeStyle = '#ff6b35';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-4, -44); ctx.lineTo(-4, -18);
    ctx.moveTo(4, -44); ctx.lineTo(4, -18);
    ctx.stroke();

    // 4. Muscular Brawler Arms & Dynamic Moves
    if (isBlock) {
      // DEFENSE GUARD: Crossed forearms with muscle definition
      ctx.fillStyle = '#ffcc80';
      ctx.save();
      ctx.translate(-14, -36);
      ctx.rotate(0.6);
      ctx.fillRect(0, -6, 32, 13);
      ctx.fillStyle = '#2c2c2c';
      ctx.fillRect(26, -8, 12, 15); // Tactical glove
      ctx.restore();

      ctx.fillStyle = '#ffcc80';
      ctx.save();
      ctx.translate(14, -36);
      ctx.rotate(-0.6);
      ctx.fillRect(-32, -6, 32, 13);
      ctx.fillStyle = '#2c2c2c';
      ctx.fillRect(-36, -8, 12, 15);
      ctx.restore();
    } else if (isAttack && this.currentMove) {
      if (this.currentMove.name === 'Backpack Swing') {
        // HEAVY ATTACK: Massive 360 Backpack Slam with Fiery Arc!
        const prog = this.moveFrame / this.currentMove.getTotalFrames();
        const swingAngle = -1.2 + prog * 3.2;

        ctx.save();
        ctx.rotate(swingAngle);
        // Swinging Arm
        ctx.fillStyle = '#ffcc80';
        ctx.fillRect(0, -40, 48, 14);
        // Weighted Backpack Slam Head
        ctx.fillStyle = '#ff6b35';
        ctx.fillRect(40, -56, 36, 44);
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(48, -48, 20, 28);
        ctx.restore();

        // Fiery Motion Arc
        ctx.strokeStyle = 'rgba(255, 107, 53, 0.8)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, -30, 68, -0.6, 1.4);
        ctx.stroke();
      } else {
        // LIGHT ATTACK: Street Brawler Paper Plane Sniping Thrust
        const ext = Math.sin((this.moveFrame / this.currentMove.getTotalFrames()) * Math.PI) * 36;
        ctx.fillStyle = '#ffcc80';
        ctx.fillRect(10, -42, 28 + ext, 13);
        ctx.fillStyle = '#2c2c2c';
        ctx.fillRect(36 + ext, -44, 14, 15);

        // Razor Folded Paper Plane
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(48 + ext, -44);
        ctx.lineTo(76 + ext, -37);
        ctx.lineTo(48 + ext, -30);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 212, 170, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } else {
      // IDLE BRAWLER STANCE: Swaying clenched fists
      const guardBob = Math.sin(performance.now() * 0.008) * 3;
      // Rear Arm (Showing Muscular Bicep)
      ctx.fillStyle = '#ffcc80';
      ctx.fillRect(-20, -40 + guardBob, 16, 22);
      ctx.fillStyle = '#2c2c2c';
      ctx.fillRect(-18, -20 + guardBob, 14, 13);

      // Lead Arm
      ctx.fillStyle = '#ffcc80';
      ctx.fillRect(14, -42 - guardBob, 18, 24);
      ctx.fillStyle = '#2c2c2c';
      ctx.fillRect(26, -22 - guardBob, 14, 14);
    }

    // 5. Head & Styled Spiky Hair
    ctx.fillStyle = '#ffcc80';
    ctx.beginPath();
    ctx.arc(0, -62, 15, 0, Math.PI * 2);
    ctx.fill();

    // Spiky textured hair
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.arc(0, -66, 17, Math.PI, Math.PI * 2);
    ctx.lineTo(17, -56);
    ctx.lineTo(8, -62);
    ctx.lineTo(-4, -58);
    ctx.lineTo(-17, -56);
    ctx.closePath();
    ctx.fill();

    // Confident Smirk & Eyes
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

    // Legs & Flip-Flops
    let lFootX = -15, lFootY = 0, rFootX = 17, rFootY = 0;
    if (state === FIGHTER_STATES.WALKING) {
      lFootX = -15 - walkSwing;
      rFootX = 17 + walkSwing;
    } else if (isBlock) {
      lFootX = -24; rFootX = 24;
    } else if (isJumping) {
      lFootY = -16; rFootY = -10;
    }

    // Bare Legs (Tanned Skin)
    ctx.fillStyle = '#c99667';
    ctx.beginPath();
    ctx.moveTo(-7, -42);
    ctx.lineTo(lFootX - 8, lFootY - 4);
    ctx.lineTo(lFootX + 8, lFootY - 4);
    ctx.lineTo(5, -42);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-3, -42);
    ctx.lineTo(rFootX - 8, rFootY - 4);
    ctx.lineTo(rFootX + 8, rFootY - 4);
    ctx.lineTo(9, -42);
    ctx.closePath();
    ctx.fill();

    // Flip-Flops (Blue/Black Soles with strap)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(lFootX - 12, lFootY - 4, 24, 4);
    ctx.fillRect(rFootX - 12, rFootY - 4, 24, 4);
    ctx.strokeStyle = '#0288d1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lFootX - 4, lFootY - 4); ctx.lineTo(lFootX + 2, lFootY - 8); ctx.lineTo(lFootX + 6, lFootY - 4);
    ctx.moveTo(rFootX - 4, rFootY - 4); ctx.lineTo(rFootX + 2, rFootY - 8); ctx.lineTo(rFootX + 6, rFootY - 4);
    ctx.stroke();

    // Beige Sleep Shorts (Baggy with food stains)
    ctx.fillStyle = '#f5deb3';
    ctx.beginPath();
    ctx.moveTo(-20, -56);
    ctx.lineTo(20, -56);
    ctx.lineTo(16, -34);
    ctx.lineTo(-16, -34);
    ctx.closePath();
    ctx.fill();
    // Subtle food stain
    ctx.fillStyle = 'rgba(180, 80, 20, 0.4)';
    ctx.beginPath();
    ctx.arc(6, -42, 4, 0, Math.PI * 2);
    ctx.fill();

    // Torso: Maroon Hostel T-Shirt
    const torsoY = isBlock ? -58 : -64 + breath;
    const torsoTilt = isHurt ? -0.2 : (isAttack ? 0.2 : 0);

    ctx.save();
    ctx.translate(0, torsoY);
    ctx.rotate(torsoTilt);

    const shirtGrad = ctx.createLinearGradient(-26, -46, 26, 8);
    shirtGrad.addColorStop(0, isHurt ? '#ef5350' : '#8b0000');
    shirtGrad.addColorStop(1, isHurt ? '#e53935' : '#5c0000');
    ctx.fillStyle = shirtGrad;

    // Muscular / Heavy Build
    ctx.beginPath();
    ctx.moveTo(-26, -46);
    ctx.lineTo(26, -46);
    ctx.lineTo(18, 8);
    ctx.lineTo(-18, 8);
    ctx.closePath();
    ctx.fill();

    // Hostel Merch Text
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#ffcc80';
    ctx.textAlign = 'center';
    ctx.fillText('SRM HOSTEL', 0, -22);

    // Mess Card Lanyard hanging from neck
    ctx.strokeStyle = '#90a4ae';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, -46); ctx.lineTo(0, -10); ctx.lineTo(4, -46);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-6, -10, 12, 16);
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(-5, -9, 10, 5);

    // Arms, Tiffin & Tray Attacks
    if (isBlock) {
      // BLOCK: Holds up steel mess tray covering vitals
      ctx.fillStyle = '#90a4ae';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.fillRect(10, -50, 16, 56);
      ctx.strokeRect(10, -50, 16, 56);
      // Tray compartments
      ctx.fillStyle = '#37474f';
      ctx.fillRect(13, -46, 10, 12);
      ctx.fillRect(13, -30, 10, 12);
    } else if (isAttack && this.currentMove) {
      if (this.currentMove.name === 'Tiffin Slam') {
        const ext = Math.sin((this.moveFrame / this.currentMove.getTotalFrames()) * Math.PI);
        // Raised arms holding steel tiffin slamming down
        ctx.fillStyle = '#c99667';
        ctx.fillRect(8, -50 + ext * 24, 26, 14);
        // Steel Tiffin Box
        ctx.fillStyle = '#78909c';
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1.5;
        ctx.fillRect(28, -56 + ext * 34, 28, 22);
        ctx.strokeRect(28, -56 + ext * 34, 28, 22);
        // Orange shockwave spark
        if (ext > 0.6) {
          ctx.fillStyle = '#ff9800';
          ctx.beginPath();
          ctx.arc(56, -45 + ext * 34, 18, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Mess Tray Baseball Swing
        const ext = Math.sin((this.moveFrame / this.currentMove.getTotalFrames()) * Math.PI);
        ctx.save();
        ctx.translate(14, -30);
        ctx.rotate(-1.2 + ext * 2.8);
        // Mess Tray
        ctx.fillStyle = '#b0bec5';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.fillRect(0, -18, 56, 26);
        ctx.strokeRect(0, -18, 56, 26);
        // Curry/Rice splatters trailing
        ctx.fillStyle = '#ff6f00';
        ctx.beginPath();
        ctx.arc(42, -5, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else {
      // Idle: Holding steel tiffin in left hand, tray under right arm
      ctx.fillStyle = '#c99667';
      ctx.fillRect(-22, -38, 16, 22);
      // Tiffin Box
      ctx.fillStyle = '#78909c';
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1;
      ctx.fillRect(-26, -18, 20, 18);
      ctx.strokeRect(-26, -18, 20, 18);

      // Lead Arm with Tray tucked
      ctx.fillStyle = '#c99667';
      ctx.fillRect(16, -40, 14, 24);
      ctx.fillStyle = '#90a4ae';
      ctx.fillRect(24, -34, 8, 38);
    }

    // Head, Bedhead Messy Hair & Sleepy Eyes
    ctx.fillStyle = '#c99667';
    ctx.beginPath();
    ctx.arc(0, -60, 16, 0, Math.PI * 2);
    ctx.fill();

    // Bedhead dark hair
    ctx.fillStyle = '#2a1810';
    ctx.beginPath();
    ctx.arc(0, -66, 18, Math.PI * 0.9, Math.PI * 2.1);
    ctx.lineTo(16, -58);
    ctx.lineTo(8, -64);
    ctx.lineTo(0, -70);
    ctx.lineTo(-8, -64);
    ctx.lineTo(-16, -58);
    ctx.closePath();
    ctx.fill();

    // Sleepy eyes with subtle dark circles
    ctx.fillStyle = 'rgba(60, 30, 20, 0.35)';
    ctx.beginPath();
    ctx.arc(6, -56, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111111';
    ctx.fillRect(4, -58, 5, 2); // Half-closed eye

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

    // Worn Brown Leather Shoes
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(lFootX - 12, lFootY - 6, 24, 6);
    ctx.fillRect(rFootX - 12, rFootY - 6, 26, 6);

    // Torso: Dark Green Varsity Jacket & Off-White Shirt
    const torsoY = isBlock ? -58 : -64 + breath;
    const torsoTilt = isHurt ? -0.18 : (isAttack ? 0.16 : -0.05);

    ctx.save();
    ctx.translate(0, torsoY);
    ctx.rotate(torsoTilt);

    // Inner Off-White Shirt (unbuttoned top collar)
    ctx.fillStyle = '#f5f0e1';
    ctx.beginPath();
    ctx.moveTo(-10, -46);
    ctx.lineTo(10, -46);
    ctx.lineTo(0, -20);
    ctx.closePath();
    ctx.fill();

    // Gold Chain
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -38, 7, 0, Math.PI);
    ctx.stroke();

    // Dark Green College Jacket
    ctx.fillStyle = '#1b4d3e';
    // Left Flap
    ctx.fillRect(-24, -48, 14, 52);
    // Right Flap
    ctx.fillRect(10, -48, 14, 52);
    // Gold Trim & Patches
    ctx.fillStyle = '#c9a84c';
    ctx.fillRect(-24, -48, 2, 52);
    ctx.fillRect(22, -48, 2, 52);
    ctx.fillRect(-22, -40, 8, 8); // Gold Senior Crest

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

    // Head, Groomed Beard & Sunglasses on forehead
    ctx.fillStyle = '#d6a374';
    ctx.beginPath();
    ctx.arc(0, -60, 15, 0, Math.PI * 2);
    ctx.fill();

    // Dark Hair & Beard Stubble
    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.arc(0, -64, 16, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();
    // Stubble jawline
    ctx.fillStyle = 'rgba(20, 20, 20, 0.4)';
    ctx.beginPath();
    ctx.arc(2, -54, 10, 0, Math.PI * 0.9);
    ctx.fill();

    // Sunglasses pushed onto forehead
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(-10, -70, 10, 5);
    ctx.fillRect(2, -70, 10, 5);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(-1, -69, 3, 3); // Gold bridge

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

    // Torso: Navy Blue Formal Blazer & Crimson Tie
    const torsoY = isBlock ? -60 : -66 + breath;
    const torsoTilt = isHurt ? -0.2 : (isAttack ? 0.22 : 0);

    ctx.save();
    ctx.translate(0, torsoY);
    ctx.rotate(torsoTilt);

    // Blazer Body
    const blazerGrad = ctx.createLinearGradient(-24, -48, 24, 8);
    blazerGrad.addColorStop(0, isHurt ? '#c2185b' : '#1b2a4a');
    blazerGrad.addColorStop(1, isHurt ? '#880e4f' : '#0d1829');
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

    // Crimson Silk Tie
    ctx.fillStyle = '#8b0000';
    ctx.beginPath();
    ctx.moveTo(-3, -46); ctx.lineTo(3, -46); ctx.lineTo(4, -12); ctx.lineTo(0, -6); ctx.lineTo(-4, -12);
    ctx.closePath();
    ctx.fill();

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
      // Silver Zip line
      ctx.fillStyle = '#c0c0c0';
      ctx.fillRect(17, -50, 2, 50);
    } else if (isAttack && this.currentMove) {
      if (this.currentMove.name === 'Resume Slap') {
        const ext = Math.sin((this.moveFrame / this.currentMove.getTotalFrames()) * Math.PI);
        // Fast rolled resume thrust
        ctx.fillStyle = '#e0ac69';
        ctx.fillRect(12, -38, 22, 12);
        // White resume cylinder with text flash
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
        // Whip crack star
        ctx.fillStyle = '#00e5ff';
        ctx.beginPath();
        ctx.arc(80 + ext * 40, -32, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Idle: Leather portfolio in right hand, adjusting tie
      ctx.fillStyle = '#e0ac69';
      ctx.fillRect(-18, -38, 12, 20);
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(-24, -20, 16, 24);

      ctx.fillStyle = '#e0ac69';
      ctx.fillRect(14, -40, 12, 22);
    }

    // Head & Slicked-back Hair
    ctx.fillStyle = '#e0ac69';
    ctx.beginPath();
    ctx.arc(0, -62, 15, 0, Math.PI * 2);
    ctx.fill();

    // Slicked-back hair
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

    // Athletic Black Shorts with Neon Cyan Stripe
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-18, -58, 36, 20);
    ctx.fillStyle = '#00d4ff';
    ctx.fillRect(-18, -58, 3, 20);
    ctx.fillRect(15, -58, 3, 20);

    // High Performance Sneakers (Neon Orange Soles)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(lFootX - 11, lFootY - 6, 22, 6);
    ctx.fillRect(rFootX - 11, rFootY - 6, 24, 6);
    ctx.fillStyle = '#ff6b35';
    ctx.fillRect(lFootX - 11, lFootY - 2, 22, 3);
    ctx.fillRect(rFootX - 11, rFootY - 2, 24, 3);

    // Torso: Neon Cyan SRM Jersey
    const torsoY = isBlock ? -60 : -66 + breath;
    const torsoTilt = isHurt ? -0.2 : (isAttack ? 0.22 : 0);

    ctx.save();
    ctx.translate(0, torsoY);
    ctx.rotate(torsoTilt);

    // Neon Blue Jersey
    ctx.fillStyle = '#00d4ff';
    ctx.beginPath();
    ctx.moveTo(-24, -48);
    ctx.lineTo(24, -48);
    ctx.lineTo(15, 8);
    ctx.lineTo(-15, 8);
    ctx.closePath();
    ctx.fill();

    // SRM Athletic Text
    ctx.font = '900 12px "Arial Black", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('SRM', 0, -20);

    // Orange Shoulder Accent
    ctx.fillStyle = '#ff6b35';
    ctx.fillRect(-24, -48, 6, 12);
    ctx.fillRect(18, -48, 6, 12);

    // Arms & Props (Cricket Bat, Boxing Guard)
    if (isBlock) {
      // Athletic Boxing Guard with Forearms
      ctx.fillStyle = '#c68642';
      ctx.fillRect(8, -48, 14, 32);
      ctx.fillRect(18, -48, 14, 32);
      // Neon blue protective energy shield
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 3;
      ctx.strokeRect(6, -50, 28, 36);
    } else if (isAttack && this.currentMove) {
      if (this.currentMove.name === 'Quick Jab') {
        const ext = Math.sin((this.moveFrame / this.currentMove.getTotalFrames()) * Math.PI);
        // Fast boxing punch
        ctx.fillStyle = '#c68642';
        ctx.fillRect(12, -40, 26 + ext * 28, 14);
        ctx.fillStyle = '#ff6b35';
        ctx.fillRect(36 + ext * 28, -42, 14, 18); // Clenched boxing glove
        // Cyan air shockwave
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
        // Cricket Bat Blade (Willow Wood)
        ctx.fillStyle = '#d7ccc8';
        ctx.fillRect(0, -14, 60, 16);
        // Neon Green Grip
        ctx.fillStyle = '#39ff14';
        ctx.fillRect(-16, -10, 18, 8);
        // Green spark trail
        ctx.strokeStyle = '#39ff14';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(30, -6, 26, 0, Math.PI);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      // Idle: Cricket bat resting in hand, bouncing stance
      ctx.fillStyle = '#c68642';
      ctx.fillRect(-18, -38, 12, 22);

      ctx.fillStyle = '#c68642';
      ctx.fillRect(14, -40, 12, 22);
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

    // Legs — black cargo pants
    let lFX = -12, rFX = 14;
    if (state === FIGHTER_STATES.WALKING) { lFX -= walkSwing * 0.5; rFX += walkSwing * 0.5; }
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(-16, -60, 14, 62);
    ctx.fillStyle = '#111130';
    ctx.fillRect(4, -60, 14, 62);
    // Green ankle trim
    ctx.fillStyle = '#00ff41';
    ctx.fillRect(-16, -4, 14, 4);
    ctx.fillRect(4, -4, 14, 4);

    // Body — oversized black hoodie
    const torsoGrad = ctx.createLinearGradient(-22, -115, 22, -115);
    torsoGrad.addColorStop(0, '#1a1a2e');
    torsoGrad.addColorStop(0.5, '#0d0d1a');
    torsoGrad.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = torsoGrad;
    ctx.beginPath();
    ctx.moveTo(-22, -58 + breath);
    ctx.lineTo(-26, -110 + breath);
    ctx.lineTo(26, -110 + breath);
    ctx.lineTo(22, -58 + breath);
    ctx.closePath();
    ctx.fill();

    // Hood
    ctx.fillStyle = '#111120';
    ctx.beginPath();
    ctx.ellipse(0, -118 + breath, 18, 14, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // Green kangaroo pocket
    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-10, -80 + breath, 20, 16);

    // Arms
    if (isBlock) {
      // Crossed arms block
      ctx.fillStyle = '#0d0d1a';
      ctx.fillRect(-30, -90 + breath, 14, 30);
      ctx.fillRect(16, -90 + breath, 14, 30);
      // Green matrix shield ripple
      ctx.strokeStyle = '#00ff41';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00ff41';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, -80 + breath, 34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (isAttack && this.currentMove) {
      const ext = Math.sin((this.moveFrame / (this.currentMove.getTotalFrames ? this.currentMove.getTotalFrames() : 20)) * Math.PI);
      // Keyboard claw thrust
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(14, -95 + breath, 14, 28 + ext * 20);
      // Keyboard claw
      ctx.fillStyle = '#222244';
      ctx.fillRect(26 + ext * 22, -95 + breath, 22, 14);
      // RGB LED keys
      const ledColors = ['#00ff41', '#00e5ff', '#ff69b4'];
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = ledColors[k];
        ctx.fillRect(28 + k * 7 + ext * 22, -92 + breath, 5, 5);
      }
      // Binary flash VFX
      ctx.globalAlpha = ext * 0.8;
      ctx.font = '900 10px monospace';
      ctx.fillStyle = '#00ff41';
      ctx.textAlign = 'center';
      ctx.fillText('01', 52 + ext * 22, -88 + breath);
      ctx.globalAlpha = 1;
    } else {
      // Idle: arms at sides
      ctx.fillStyle = '#0d0d1a';
      ctx.fillRect(-30, -95 + breath, 12, 28);
      ctx.fillRect(18, -95 + breath, 12, 28);
      // Keyboard dangling at right side
      ctx.fillStyle = '#222244';
      ctx.fillRect(18, -78 + breath, 18, 12);
      ctx.fillStyle = '#00ff41';
      ctx.fillRect(20, -76 + breath, 4, 4);
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(26, -76 + breath, 4, 4);
    }

    // Head (hood shadow — dark face)
    ctx.fillStyle = isHurt ? '#553333' : '#1a1225';
    ctx.beginPath();
    ctx.ellipse(0, -118 + breath, 15, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cyber visor (glowing neon shades)
    const visorGrad = ctx.createLinearGradient(-14, -120, 14, -116);
    visorGrad.addColorStop(0, '#00e5ff');
    visorGrad.addColorStop(0.5, '#00ff41');
    visorGrad.addColorStop(1, '#00e5ff');
    ctx.fillStyle = visorGrad;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 12;
    ctx.fillRect(-14, -122 + breath, 28, 6);
    ctx.shadowBlur = 0;

    // Neon outline on hoodie
    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;
    ctx.strokeRect(-22, -110 + breath, 44, 52);
    ctx.globalAlpha = 1;
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

    // White shirt + barrister tabs
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(-6, -108 + breath, 12, 20);
    // Tabs
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-5, -95 + breath, 4, 12);
    ctx.fillRect(1, -95 + breath, 4, 12);

    // Gold lapel pin
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(-20, -95 + breath, 3, 0, Math.PI * 2);
    ctx.fill();
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
      // Gold lock
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
      // Gold ring bands
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(-7, -24, 14, 5);
      ctx.fillRect(-7, 0, 14, 5);
      // Handle
      ctx.fillStyle = '#a0522d';
      ctx.fillRect(-3, 4, 6, 28);
      // Shockwave on heavy
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
      // Idle: gavel resting on shoulder
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(-28, -92 + breath, 12, 25);
      ctx.fillRect(18, -100 + breath, 12, 35);
      // Resting gavel on right shoulder
      ctx.save();
      ctx.translate(22, -108 + breath);
      ctx.rotate(0.4);
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(-4, -20, 10, 24);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(-5, -20, 12, 4);
      ctx.fillRect(-5, 0, 12, 4);
      ctx.fillStyle = '#a0522d';
      ctx.fillRect(0, 4, 5, 22);
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

    // Running spikes
    ctx.fillStyle = '#ff3400';
    ctx.fillRect(lFX - 9, lFY - 2, 16, 6);
    ctx.fillRect(rFX - 7, rFY - 2, 16, 6);

    // Torso — sleeveless athletic singlet
    const singletGrad = ctx.createRadialGradient(-8, -90 + breath, 2, 0, -90 + breath, 24);
    singletGrad.addColorStop(0, '#00b4d8');
    singletGrad.addColorStop(0.6, '#0077b6');
    singletGrad.addColorStop(1, '#005f8a');
    ctx.fillStyle = singletGrad;
    ctx.beginPath();
    ctx.moveTo(-22, -62 + breath);
    ctx.lineTo(-24, -112 + breath);
    ctx.lineTo(24, -112 + breath);
    ctx.lineTo(22, -62 + breath);
    ctx.closePath();
    ctx.fill();

    // SRM logo on chest
    ctx.font = '900 10px "Arial Black", sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.fillText('SRM', 0, -90 + breath);

    // Wristbands
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(-28, -72 + breath, 10, 8);
    ctx.fillRect(18, -72 + breath, 10, 8);

    // Arms and Dumbbells
    if (isBlock) {
      // X-Guard crossed dumbbells
      ctx.fillStyle = '#a0522d';
      ctx.fillRect(-28, -88 + breath, 12, 28);
      ctx.fillRect(16, -88 + breath, 12, 28);
      // X cross
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(-22, -90 + breath); ctx.lineTo(22, -70 + breath);
      ctx.moveTo(22, -90 + breath); ctx.lineTo(-22, -70 + breath);
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Dumbbell blocks
      ctx.fillStyle = '#555';
      ctx.fillRect(-30, -96 + breath, 14, 10);
      ctx.fillRect(16, -96 + breath, 14, 10);
    } else if (isAttack && this.currentMove) {
      const ext = Math.sin((this.moveFrame / (this.currentMove.getTotalFrames ? this.currentMove.getTotalFrames() : 20)) * Math.PI);
      const moveName = this.currentMove.name || '';
      if (moveName === 'Piston Jab' || moveName === 'Code Slice') {
        // Double rapid jabs
        ctx.fillStyle = '#a0522d';
        ctx.fillRect(16, -92 + breath, 12, 24 + ext * 22);
        // Dumbbell
        ctx.fillStyle = '#333';
        ctx.fillRect(26 + ext * 22, -92 + breath, 16, 10);
        ctx.fillRect(26 + ext * 22, -86 + breath, 16, 10);
        // Cyan spark
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(42 + ext * 22, -87 + breath, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        // Lariat spin — 360° dumbbell swing
        ctx.save();
        ctx.translate(12, -84 + breath);
        ctx.rotate(ext * Math.PI * 2);
        // Arm
        ctx.fillStyle = '#a0522d';
        ctx.fillRect(0, -8, 24, 10);
        // Dumbbell weight plates
        ctx.fillStyle = '#444';
        ctx.fillRect(22, -12, 16, 18);
        ctx.fillRect(22, -16, 16, 6);
        // Gold wind tunnel
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(0, 0, 32, 0, Math.PI * 1.4);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    } else {
      // Idle: arms down with dumbbells
      ctx.fillStyle = '#a0522d';
      ctx.fillRect(-28, -92 + breath, 12, 26);
      ctx.fillRect(16, -92 + breath, 12, 26);
      // Dumbbells
      ctx.fillStyle = '#333';
      ctx.fillRect(-34, -76 + breath, 16, 10);
      ctx.fillRect(18, -76 + breath, 16, 10);
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(-32, -72 + breath, 12, 3);
      ctx.fillRect(20, -72 + breath, 12, 3);
    }

    // Head — athletic cut
    ctx.fillStyle = isHurt ? '#7a3a1f' : '#a0522d';
    ctx.beginPath();
    ctx.ellipse(0, -120 + breath, 13, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Short hair
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(0, -124 + breath, 14, Math.PI * 0.85, Math.PI * 2.15);
    ctx.fill();

    // Sweatband
    ctx.fillStyle = '#00b4d8';
    ctx.fillRect(-12, -126 + breath, 24, 5);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(-3, -127 + breath, 6, 2);

    // Eyes (determined look)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-7, -120 + breath, 5, 3);
    ctx.fillRect(2, -120 + breath, 5, 3);
    ctx.fillStyle = '#111';
    ctx.fillRect(-5, -120 + breath, 3, 3);
    ctx.fillRect(4, -120 + breath, 3, 3);

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

    // Legs — paint-speckled wide pants
    ctx.fillStyle = '#d4c5a9';
    ctx.fillRect(-18, -62, 14, 63);
    ctx.fillStyle = '#c8b8a2';
    ctx.fillRect(4, -62, 14, 63);
    // Paint speckles on pants
    const speckColors = ['#ff69b4', '#9b59b6', '#00e5ff', '#ffd700'];
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = speckColors[i % 4];
      ctx.beginPath();
      ctx.arc(-14 + (i % 3) * 4, -40 + Math.floor(i / 3) * 14, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Apron (paint-stained)
    ctx.fillStyle = '#5c3d99';
    ctx.beginPath();
    ctx.moveTo(-14, -62 + breath);
    ctx.lineTo(-16, -108 + breath);
    ctx.lineTo(16, -108 + breath);
    ctx.lineTo(14, -62 + breath);
    ctx.closePath();
    ctx.fill();

    // Paint stains on apron (chromatic)
    for (let i = 0; i < 6; i++) {
      const splashHue = (hueShift + i * 60) % 360;
      ctx.fillStyle = `hsla(${splashHue}, 100%, 65%, 0.6)`;
      ctx.beginPath();
      ctx.arc(-8 + (i % 3) * 8, -90 + Math.floor(i / 3) * 18 + breath, 5 + i * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Scarf — flowing coral/orange
    ctx.save();
    ctx.strokeStyle = '#ff7f50';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.85;
    ctx.shadowColor = '#ff7f50';
    ctx.shadowBlur = 6;
    // Flowing S-curve
    ctx.beginPath();
    ctx.moveTo(-10, -108 + breath);
    ctx.bezierCurveTo(-20, -115 + breath, 10, -118 + breath, 5, -110 + breath);
    ctx.bezierCurveTo(0, -102 + breath, -28, -100 + breath, -22, -92 + breath);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();

    // Arms
    if (isBlock) {
      // Opaque canvas shield
      ctx.fillStyle = '#f5f5dc';
      ctx.shadowColor = '#da70d6';
      ctx.shadowBlur = 16;
      ctx.fillRect(-36, -108 + breath, 28, 44);
      ctx.strokeStyle = '#da70d6';
      ctx.lineWidth = 3;
      ctx.strokeRect(-36, -108 + breath, 28, 44);
      ctx.shadowBlur = 0;
      // Paint smear on shield
      ctx.fillStyle = `hsl(${hueShift}, 90%, 60%)`;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(-22, -88 + breath, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (isAttack && this.currentMove) {
      const ext = Math.sin((this.moveFrame / (this.currentMove.getTotalFrames ? this.currentMove.getTotalFrames() : 22)) * Math.PI);
      const moveName = this.currentMove.name || '';
      // Arm
      ctx.fillStyle = '#c68642';
      ctx.fillRect(16, -100 + breath, 12, 28);
      ctx.save();
      ctx.translate(20, -95 + breath);
      ctx.rotate(-0.8 + ext * 2.0);
      if (moveName === 'Brush Stroke' || true) {
        // Paintbrush shaft
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(-3, -8, 6, 52);
        // Ferrule (metal band)
        ctx.fillStyle = '#aaaaaa';
        ctx.fillRect(-4, -10, 8, 6);
        // Wet bristles (dripping paint)
        const bristleHue = (hueShift + ext * 120) % 360;
        ctx.fillStyle = `hsl(${bristleHue}, 100%, 60%)`;
        ctx.beginPath();
        ctx.moveTo(-6, 42);
        ctx.lineTo(-8, 56);
        ctx.lineTo(8, 56);
        ctx.lineTo(6, 42);
        ctx.closePath();
        ctx.fill();
        // Rainbow streak trail
        if (ext > 0.3) {
          ctx.globalAlpha = ext * 0.7;
          for (let s = 0; s < 4; s++) {
            const sh = (bristleHue + s * 30) % 360;
            ctx.strokeStyle = `hsl(${sh}, 100%, 65%)`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-4 + s * 2, 50);
            ctx.lineTo(-10 + s * 4, 65 + ext * 15);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
      }
      ctx.restore();
    } else {
      // Idle: arms natural, brush held casually
      ctx.fillStyle = '#c68642';
      ctx.fillRect(-26, -95 + breath, 11, 25);
      ctx.fillRect(15, -100 + breath, 11, 30);
      // Brush in right hand
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(20, -98 + breath, 5, 40);
      // Brush tip
      ctx.fillStyle = `hsl(${hueShift}, 100%, 65%)`;
      ctx.fillRect(18, -62 + breath, 9, 10);
    }

    // Head
    ctx.fillStyle = isHurt ? '#9966aa' : '#c68642';
    ctx.beginPath();
    ctx.ellipse(0, -120 + breath, 13, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair bun (deep indigo)
    ctx.fillStyle = '#4b0082';
    ctx.beginPath();
    ctx.arc(0, -130 + breath, 10, Math.PI, Math.PI * 2);
    ctx.fill();
    // Bun knot
    ctx.beginPath();
    ctx.arc(0, -132 + breath, 5, 0, Math.PI * 2);
    ctx.fill();

    // Artistic beret
    ctx.fillStyle = '#6a0dad';
    ctx.beginPath();
    ctx.ellipse(3, -133 + breath, 14, 7, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Beret pompon
    ctx.fillStyle = '#ff69b4';
    ctx.beginPath();
    ctx.arc(10, -138 + breath, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (artistic gaze)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-7, -121 + breath, 5, 3);
    ctx.fillRect(2, -121 + breath, 5, 3);
    ctx.fillStyle = '#4b0082';
    ctx.fillRect(-5, -121 + breath, 3, 3);
    ctx.fillRect(4, -121 + breath, 3, 3);
    // Art-star highlight in eye
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
