/**
 * Campus Clash 2D — Character Portrait Dynamic Visual FX Manager
 * Manages dynamic floating spark particles, bottom grounding shadow,
 * and hover lens flare effects on top of character cards.
 * High-resolution character portraits are rendered instantly by the DOM <img class="char-portrait-img">.
 * @module ui/characterPortrait
 */

export class CharacterPortraitManager {
  /**
   * @param {Array<Object>} roster - The character roster items from main.js
   */
  constructor(roster) {
    this.roster = roster;
    this.canvasItems = [];
    this.lastFrameTime = 0;
    this.fpsInterval = 1000 / 30; // 30 FPS throttle for FX
    this.isRunning = false;
    this.animFrameId = null;

    // Selection & Hover State
    this.hoveredIndex = -1;
    this.p1Index = 0;
    this.p2Index = 1;
    this.p1Locked = false;
    this.p2Locked = false;

    // Ambient floating sparks per character card
    this.sparks = this.roster.map((item) => {
      const accent = item.config?.colors?.accent || '#ffd700';
      return Array.from({ length: 12 }, () => ({
        x: Math.random() * 200,
        y: Math.random() * 230,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -0.4 - Math.random() * 1.2,
        size: 1.5 + Math.random() * 2.5,
        alpha: Math.random() * 0.7 + 0.3,
        color: accent
      }));
    });
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
        config: this.roster[index] ? this.roster[index].config : {}
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
   * Render all character portrait FX canvases
   * @param {number} time - performance.now()
   */
  renderAll(time) {
    for (const item of this.canvasItems) {
      this.renderCardPortrait(item, time);
    }
  }

  /**
   * Renders dynamic FX for an individual character card's canvas overlay
   */
  renderCardPortrait(item, time) {
    const { canvas, ctx, index, config } = item;
    if (!canvas || !ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const isP1 = this.p1Index === index;
    const isP2 = this.p2Index === index;
    const isHovered = this.hoveredIndex === index;
    const isSelected = isP1 || isP2;

    ctx.clearRect(0, 0, width, height);

    // 1. Ambient Energy Sparks & Fireflies
    const sparkCount = isHovered || isSelected ? 12 : 6;
    const sparks = this.sparks[index] || [];
    ctx.save();
    for (let i = 0; i < sparkCount && i < sparks.length; i++) {
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

    // 2. Subtle Bottom Gradient Fade to ground portrait & keep nameplate crisp
    ctx.save();
    const fadeGrad = ctx.createLinearGradient(0, height * 0.65, 0, height);
    fadeGrad.addColorStop(0, 'rgba(6, 12, 22, 0)');
    fadeGrad.addColorStop(1, 'rgba(6, 12, 22, 0.72)');
    ctx.fillStyle = fadeGrad;
    ctx.fillRect(0, height * 0.65, width, height * 0.35);
    ctx.restore();

    // 3. Foreground Lens Flare / Shimmer on Hover
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
}
