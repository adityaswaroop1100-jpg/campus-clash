/**
 * Campus Clash 2D — Character Portrait Mini-Canvas Renderer
 * Renders zoomed waist-up animated character models with idle sway,
 * signature visible weapons, and dynamic energy auras at an optimized 30 FPS.
 * @module ui/characterPortrait
 */

import { Fighter } from '../entities/fighter.js';
import { FIGHTER_STATES } from '../utils/constants.js';

export class CharacterPortraitManager {
  /**
   * @param {Array<Object>} roster - The 6 character roster items from main.js
   */
  constructor(roster) {
    this.roster = roster;
    this.fighters = [];
    this.canvasItems = [];
    this.lastFrameTime = 0;
    this.fpsInterval = 1000 / 30; // 30 FPS throttle
    this.isRunning = false;
    this.animFrameId = null;

    // Selection & Hover State
    this.hoveredIndex = -1;
    this.p1Index = 0;
    this.p2Index = 1;
    this.p1Locked = false;
    this.p2Locked = false;

    // Ambient floating sparks per character
    this.sparks = Array.from({ length: this.roster.length }, () => []);

    this.initFighters();
  }

  /**
   * Initializes local Fighter instances for each character
   */
  initFighters() {
    this.fighters = this.roster.map((item, index) => {
      // Facing right (1)
      const f = new Fighter(item.config, 0, 0, 1, index % 2 === 0 ? 'P1' : 'P2');
      f.stateMachine.changeState(FIGHTER_STATES.IDLE);
      return f;
    });

    // Pre-populate 8 ambient sparks per card
    this.sparks = this.roster.map((item) => {
      return Array.from({ length: 12 }, () => ({
        x: Math.random() * 200,
        y: Math.random() * 230,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -0.4 - Math.random() * 1.2,
        size: 1.5 + Math.random() * 2.5,
        alpha: Math.random() * 0.7 + 0.3,
        color: item.config.colors?.accent || '#ffd700'
      }));
    });

    // Preload portraits for CampusVisuals
    if (window.CampusVisuals && window.CampusVisuals.preloadAll) {
      window.CampusVisuals.preloadAll();
    }
  }

  /**
   * Binds canvas elements from the DOM cards
   * @param {NodeList|Array<HTMLCanvasElement>} canvasList
   */
  bindCanvases(canvasList) {
    this.canvasItems = Array.from(canvasList).map((canvas, index) => {
      return {
        canvas,
        ctx: canvas.getContext('2d'),
        index,
        fighter: this.fighters[index],
        config: this.roster[index].config
      };
    });
  }

  setHovered(index) {
    this.hoveredIndex = index;
  }

  setSelection(p1Index, p2Index, p1Locked = false, p2Locked = false) {
    this.p1Index = p1Index;
    this.p2Index = p2Index;
    this.p1Locked = p1Locked;
    this.p2Locked = p2Locked;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.loop = (time) => {
      if (!this.isRunning) return;
      this.animFrameId = requestAnimationFrame(this.loop);

      const elapsed = time - this.lastFrameTime;
      if (elapsed >= this.fpsInterval) {
        this.lastFrameTime = time - (elapsed % this.fpsInterval);
        this.renderAll(time);
      }
    };
    this.animFrameId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /**
   * Render all 6 character portrait canvases
   * @param {number} time - performance.now()
   */
  renderAll(time) {
    for (const item of this.canvasItems) {
      this.renderCardPortrait(item, time);
    }
  }

  /**
   * Renders an individual character card's canvas
   */
  renderCardPortrait(item, time) {
    const { canvas, ctx, index, fighter, config } = item;
    if (!canvas || !ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const isP1 = this.p1Index === index;
    const isP2 = this.p2Index === index;
    const isHovered = this.hoveredIndex === index;
    const isSelected = isP1 || isP2;

    ctx.clearRect(0, 0, width, height);

    // 1. Dynamic Radial Energy Aura Background
    const primaryColor = config.colors?.primary || '#1565c0';
    const accentColor = config.colors?.accent || '#ffd700';
    const auraPulse = (Math.sin(time * 0.004 + index) + 1) * 0.5;

    const bgGrad = ctx.createRadialGradient(
      width / 2, height * 0.45, 10,
      width / 2, height * 0.45, (isHovered ? 130 : 90) + auraPulse * 25
    );
    const auraAlpha = isHovered ? 0.35 + auraPulse * 0.2 : (isSelected ? 0.22 + auraPulse * 0.12 : 0.08);
    bgGrad.addColorStop(0, primaryColor);
    bgGrad.addColorStop(0.6, `${accentColor}33`);
    bgGrad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.save();
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // 2. Ambient Energy Sparks & Fireflies
    const sparkCount = isHovered || isSelected ? 12 : 6;
    const sparks = this.sparks[index];
    ctx.save();
    for (let i = 0; i < sparkCount; i++) {
      const sp = sparks[i];
      sp.x += sp.vx;
      sp.y += sp.vy;
      if (sp.y < -10) {
        sp.y = height + 10;
        sp.x = Math.random() * width;
      }
      if (sp.x < 0) sp.x = width;
      if (sp.x > width) sp.x = 0;

      ctx.fillStyle = sp.color;
      ctx.globalAlpha = sp.alpha * (isHovered ? 1.0 : 0.65);
      ctx.shadowColor = sp.color;
      ctx.shadowBlur = isHovered ? 8 : 4;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size * (isHovered ? 1.3 : 1), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3. Render Fighter Full-Body / Portrait
    const portraitImg = window.CampusVisuals ? window.CampusVisuals.getPortrait(config.id) : null;
    if (portraitImg && portraitImg.complete && portraitImg.naturalWidth > 0) {
      ctx.save();
      const meta = (window.CampusVisuals && window.CampusVisuals.CHARACTERS[config.id]) || {};
      ctx.shadowColor = meta.accent || config.colors.accent || '#00e5ff';
      ctx.shadowBlur = isHovered ? 20 : 10;

      // Full-bleed cover art
      const scale = Math.max(width / portraitImg.width, height / portraitImg.height);
      const pW = portraitImg.width * scale;
      const pH = portraitImg.height * scale;
      const pX = (width - pW) / 2;
      const pY = (height - pH) * 0.15; // align toward upper 15% for face visibility
      ctx.drawImage(portraitImg, pX, pY, pW, pH);

      // Subtle bottom gradient fade to ground the portrait
      const fadeGrad = ctx.createLinearGradient(0, height * 0.65, 0, height);
      fadeGrad.addColorStop(0, 'rgba(6, 12, 22, 0)');
      fadeGrad.addColorStop(1, 'rgba(6, 12, 22, 0.75)');
      ctx.fillStyle = fadeGrad;
      ctx.fillRect(0, height * 0.65, width, height * 0.35);

      ctx.restore();
    } else {
      ctx.save();
      // Center at horizontal midpoint, positioned so full body (head to shoes) fits cleanly
      const focalX = width / 2;
      const focalY = height * 0.90; // Ground / feet anchor
      const zoom = 1.15; // Full body showcase matching arcade reference artwork

      ctx.translate(focalX, focalY);
      ctx.scale(zoom, zoom);

      // Let fighter draw using procedural canvas primitives
      const state = FIGHTER_STATES.IDLE;
      const isHurt = false;
      const isBlock = false;
      const isAttack = false;

      // Slight breathing sway
      fighter.animCycle = time * 0.003;

      if (config.id === 'topper') {
        fighter.renderRealisticTopper(ctx, state, isHurt, isBlock, isAttack);
    } else if (config.id === 'hosteler') {
      fighter.renderRealisticHosteler(ctx, state, isHurt, isBlock, isAttack);
    } else if (config.id === 'senior') {
      fighter.renderRealisticSenior(ctx, state, isHurt, isBlock, isAttack);
    } else if (config.id === 'placementWarrior') {
      fighter.renderRealisticPlacement(ctx, state, isHurt, isBlock, isAttack);
    } else if (config.id === 'sportsStar') {
      fighter.renderRealisticSportsStar(ctx, state, isHurt, isBlock, isAttack);
    } else if (config.id === 'cypher') {
      fighter.renderRealisticCypher(ctx, state, isHurt, isBlock, isAttack);
    } else if (config.id === 'gavel') {
      fighter.renderRealisticGavel(ctx, state, isHurt, isBlock, isAttack);
    } else if (config.id === 'bolt') {
      fighter.renderRealisticBolt(ctx, state, isHurt, isBlock, isAttack);
    } else if (config.id === 'palette') {
      fighter.renderRealisticPalette(ctx, state, isHurt, isBlock, isAttack);
    } else {
      fighter.renderRealisticBackbencher(ctx, state, isHurt, isBlock, isAttack);
    }

    ctx.restore();
    }

    // 4. Foreground Lens Flares / Sparkles on Hover
    if (isHovered) {
      ctx.save();
      const lensGrad = ctx.createLinearGradient(0, 0, width, height);
      lensGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
      lensGrad.addColorStop(0.5, 'transparent');
      lensGrad.addColorStop(1, 'rgba(0, 229, 255, 0.08)');
      ctx.fillStyle = lensGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }

  /**
   * Signature visible prop for Topper: Golden Pen & SRM Tech Notebook in hand
   */
  renderTopperSignatureProp(ctx, time) {
    ctx.save();
    const bob = Math.sin(time * 0.008) * 2;
    // Blue & Gold Notebook held in lead hand
    ctx.fillStyle = '#1565c0';
    ctx.fillRect(24, -46 + bob, 22, 28);
    // Gold Spine
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(22, -46 + bob, 3, 28);
    // SRM text on book
    ctx.font = 'bold 6px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SRM', 27, -34 + bob);
    ctx.fillText('ENG', 27, -26 + bob);

    // Glowing Golden Pen tip
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 10;
    ctx.fillRect(16, -54 + bob, 4, 18);
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(17, -56 + bob, 2, 3);
    ctx.restore();
  }

  /**
   * Signature visible prop for Hosteler: Stainless Steel Mess Plate
   */
  renderHostelerSignatureProp(ctx, time) {
    ctx.save();
    const bob = Math.sin(time * 0.007) * 2;
    // Round stainless steel plate
    ctx.fillStyle = '#b0bec5';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.ellipse(22, -32 + bob, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Inner plate rim
    ctx.strokeStyle = '#eceff1';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Rice / Curry mound
    ctx.fillStyle = '#ffa726';
    ctx.beginPath();
    ctx.arc(20, -34 + bob, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Signature visible prop for SportsStar: Cricket Bat resting over shoulder
   */
  renderSportsStarSignatureProp(ctx, time) {
    ctx.save();
    const bob = Math.sin(time * 0.009) * 2;
    ctx.translate(22, -44 + bob);
    ctx.rotate(0.35); // Angled over shoulder
    // Willow Bat Blade
    ctx.fillStyle = '#d7ccc8';
    ctx.fillRect(-6, -26, 12, 44);
    // Neon Green Grip
    ctx.fillStyle = '#39ff14';
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = 8;
    ctx.fillRect(-4, 18, 8, 16);
    ctx.restore();
  }

  /**
   * Signature visible prop for Backbencher: Glowing Smartphone & Energy Drink
   */
  renderBackbencherSignatureProp(ctx, time) {
    ctx.save();
    const bob = Math.sin(time * 0.007) * 2;
    // Glowing Smartphone screen in hand
    ctx.fillStyle = '#111111';
    ctx.fillRect(22, -38 + bob, 12, 18);
    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 8;
    ctx.fillRect(24, -36 + bob, 8, 14);
    ctx.restore();
  }
}
