/**
 * Campus Clash — StageBase
 * Base class for all 3D-depth venues in The Global Arena Pack.
 * @module stages/stageBase
 */

import { CharacterSyncLayer } from './characterSync.js';

export class StageBase {
  constructor(config = {}) {
    this.id = config.id || 'stage_base';
    this.name = config.name || 'Arena';
    this.subtitle = config.subtitle || 'Competitive Combat Ground';
    this.groundY = config.dimensions?.groundY || 535;
    this.width = config.dimensions?.width || 1200;
    this.height = config.dimensions?.height || 640;
    this.minX = config.bounds?.minX || 40;
    this.maxX = config.bounds?.maxX || 920;

    this.config = config;
    this.time = 0;
    this.currentRound = 1;

    // Quality tier (high, medium, low)
    this.qualityTier = 'high';

    // Reactive lighting and hit flash bus
    this.hitFlashes = []; // [{x, y, radius, color, maxRadius, alpha, timer}]

    // Background particles (dust, embers, rain, steam)
    this.ambientParticles = [];
  }

  /**
   * Updates stage animations synced strictly to game time (dt)
   */
  update(dt, fighters = [], particles = null, sound = null) {
    this.time += dt || (1 / 60);

    // Decay reactive hit flashes
    for (let i = this.hitFlashes.length - 1; i >= 0; i--) {
      const flash = this.hitFlashes[i];
      flash.timer++;
      flash.alpha = Math.max(0, 1 - flash.timer / flash.maxTimer);
      flash.radius += (flash.maxRadius - flash.radius) * 0.22;
      if (flash.alpha <= 0.01) {
        this.hitFlashes.splice(i, 1);
      }
    }

    // Update ambient particles
    this.updateAmbientParticles(dt);
  }

  updateAmbientParticles(dt) {
    // Override in subclass
  }

  /**
   * Triggers reactive venue flash at impact coordinate
   */
  onFighterHit(x, y, isHeavy = false) {
    const flashColor = this.config.lighting?.rimLight?.color || '#00e5ff';
    this.hitFlashes.push({
      x,
      y,
      radius: isHeavy ? 35 : 18,
      maxRadius: isHeavy ? 180 : 90,
      color: flashColor,
      alpha: isHeavy ? 0.85 : 0.55,
      timer: 0,
      maxTimer: isHeavy ? 16 : 9
    });
  }

  /**
   * Notifies venue of round transitions (e.g. for era shift or modular floor reconfiguration)
   */
  onRoundTransition(newRound) {
    this.currentRound = newRound;
  }

  /**
   * Main render method called by game loop — delegates to renderBackground
   */
  render(ctx, camera = { x: 0, y: 0, scale: 1 }) {
    this.renderBackground(ctx, camera);
  }

  /**
   * Renders the deep 3D background with camera parallax
   */
  renderBackground(ctx, camera) {
    // Override in subclass
  }

  /**
   * Renders planar floor reflections and shadows synced with character positions
   */
  renderFighterSync(ctx, fighters, camera) {
    const lighting = this.config.lighting;

    // 1. Planar reflections beneath feet
    CharacterSyncLayer.renderFloorReflections(ctx, fighters, this.groundY, lighting, this.qualityTier);

    // 2. Directional contact shadows
    CharacterSyncLayer.renderContactShadows(ctx, fighters, this.groundY, lighting);

    // 3. Reactive hit light pulses across the floor
    this.renderHitFlashes(ctx);
  }

  renderHitFlashes(ctx) {
    if (this.hitFlashes.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const flash of this.hitFlashes) {
      const grad = ctx.createRadialGradient(flash.x, flash.y, 5, flash.x, flash.y, flash.radius);
      grad.addColorStop(0, `${flash.color}`);
      grad.addColorStop(0.4, `${flash.color}88`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.globalAlpha = flash.alpha;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(flash.x, flash.y, flash.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Renders foreground framing elements with occlusion guard
   */
  renderForeground(ctx, camera, fighters = []) {
    // Override in subclass
  }
}
