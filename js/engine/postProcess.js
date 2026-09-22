/**
 * Campus Clash 2D — Post-Processing Visual Pipeline
 * Bloom, Dynamic Vignette, CRT Scanlines, God Ray Shafts
 * 100% HTML5 Canvas — no external dependencies
 * @module engine/postProcess
 */

export class PostProcessing {
  constructor() {
    // Vignette state
    this.vignetteIntensity = 0.0;       // 0=none, 1=full black corners
    this.vignetteTargetIntensity = 0.0;
    this.vignetteColor = '#000000';
    this.vignetteTimer = 0;

    // Scanline state
    this.scanlineAlpha = 0.025;
    this.scanlineSpacing = 4;

    // God rays state
    this.godRays = [];  // [{x, y, angle, length, alpha, color, timer}]

    // Bloom composite state
    this.bloomPass = false;

    // Screen heat shimmer (for fire stages)
    this.heatShimmer = false;
    this.heatTime = 0;
  }

  /**
   * Set vignette — call when rage is active, low HP, KO etc.
   * @param {number} intensity 0–1
   * @param {string} color hex color
   * @param {number} frames duration
   */
  setVignette(intensity, color = '#000000', frames = 30) {
    this.vignetteTargetIntensity = Math.min(1, Math.max(0, intensity));
    this.vignetteColor = color;
    this.vignetteTimer = frames;
  }

  /**
   * Trigger god rays from a source point (used on ultimate activation)
   * @param {number} x
   * @param {number} y
   * @param {string} color
   * @param {number} count number of rays
   */
  triggerGodRays(x, y, color = '#ffd700', count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      this.godRays.push({
        x, y, angle,
        length: 200 + Math.random() * 160,
        width: 12 + Math.random() * 18,
        alpha: 0.6 + Math.random() * 0.3,
        color,
        timer: 0,
        maxTimer: 40 + Math.floor(Math.random() * 20)
      });
    }
  }

  update(dt) {
    // Smooth vignette transitions
    this.vignetteIntensity += (this.vignetteTargetIntensity - this.vignetteIntensity) * 0.08;
    if (this.vignetteTimer > 0) {
      this.vignetteTimer--;
      if (this.vignetteTimer <= 0) {
        this.vignetteTargetIntensity = 0;
      }
    }

    // Update god rays
    for (let i = this.godRays.length - 1; i >= 0; i--) {
      this.godRays[i].timer++;
      if (this.godRays[i].timer >= this.godRays[i].maxTimer) {
        this.godRays.splice(i, 1);
      }
    }

    // Heat shimmer time
    if (this.heatShimmer) this.heatTime += 0.05;
  }

  /**
   * Render god rays BEHIND fighters (called before fighter render)
   */
  renderGodRays(ctx) {
    if (this.godRays.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const ray of this.godRays) {
      const progress = ray.timer / ray.maxTimer;
      const alpha = ray.alpha * (1 - Math.pow(progress, 1.5));
      if (alpha <= 0.01) continue;

      const endX = ray.x + Math.cos(ray.angle) * ray.length * (0.4 + progress * 0.6);
      const endY = ray.y + Math.sin(ray.angle) * ray.length * (0.4 + progress * 0.6);

      const grad = ctx.createLinearGradient(ray.x, ray.y, endX, endY);
      grad.addColorStop(0, `${ray.color}`);
      grad.addColorStop(0.3, `${ray.color}88`);
      grad.addColorStop(1, `${ray.color}00`);

      ctx.save();
      ctx.translate(ray.x, ray.y);
      ctx.rotate(ray.angle);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = grad;
      // Draw tapered ray
      const halfW = (ray.width / 2) * (1 - progress * 0.5);
      ctx.beginPath();
      ctx.moveTo(0, -halfW);
      ctx.lineTo(ray.length * (0.4 + progress * 0.6), 0);
      ctx.lineTo(0, halfW);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  /**
   * Render vignette overlay (called AFTER all game rendering, BEFORE HUD)
   */
  renderVignette(ctx, canvasWidth, canvasHeight) {
    if (this.vignetteIntensity < 0.01) return;
    ctx.save();
    const grad = ctx.createRadialGradient(
      canvasWidth / 2, canvasHeight / 2, canvasHeight * 0.25,
      canvasWidth / 2, canvasHeight / 2, canvasWidth * 0.85
    );
    grad.addColorStop(0, `${this.vignetteColor}00`);
    grad.addColorStop(0.5, `${this.vignetteColor}22`);
    grad.addColorStop(1, `${this.vignetteColor}${Math.round(this.vignetteIntensity * 200).toString(16).padStart(2,'0')}`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.restore();
  }

  /**
   * Render subtle CRT scanlines over entire canvas
   */
  renderScanlines(ctx, canvasWidth, canvasHeight) {
    if (this.scanlineAlpha < 0.005) return;
    ctx.save();
    ctx.globalAlpha = this.scanlineAlpha;
    ctx.fillStyle = '#000000';
    for (let y = 0; y < canvasHeight; y += this.scanlineSpacing) {
      ctx.fillRect(0, y, canvasWidth, 1);
    }
    ctx.restore();
  }

  /**
   * Render a subtle chromatic aberration rim around the canvas edges (constant low intensity)
   */
  renderEdgeAberration(ctx, canvas, intensity = 0.04) {
    if (intensity < 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = intensity;
    // Red channel: slight offset left top
    ctx.drawImage(canvas, -1.5, -1);
    ctx.globalAlpha = intensity * 0.6;
    // Blue channel: slight offset right bottom  
    ctx.drawImage(canvas, 1.5, 1);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  /**
   * Full post-process pass — call at END of each frame
   * @param {ctx} ctx - game canvas 2d context
   * @param {canvas} canvas - game canvas element
   * @param {number} w canvas width
   * @param {number} h canvas height
   * @param {Object} state - {rageActive, lowHP, ultimateActive}
   */
  renderAll(ctx, canvas, w, h, state = {}) {
    this.renderScanlines(ctx, w, h);
    this.renderVignette(ctx, w, h);
    if (state.heavyHit) {
      this.renderEdgeAberration(ctx, canvas, 0.08);
    }
  }
}
