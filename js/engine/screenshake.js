/**
 * Campus Clash — Screen Shake System with Duration Control & Chromatic Crush
 * @module engine/screenshake
 */

export class ScreenShake {
  constructor() {
    this.intensity = 0;
    this.duration = 0;
    this.maxDuration = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    // Chromatic aberration crush: decays each frame, read by render pipeline
    this.crushIntensity = 0;
    // User-controlled shake scale (0% = disabled for motion sensitivity/esports clarity, 100% = full)
    const savedScale = typeof localStorage !== 'undefined' ? localStorage.getItem('cc_shake_scale') : null;
    this.userScale = savedScale !== null ? parseFloat(savedScale) : 1.0;
  }

  /**
   * Sets the user shake intensity scale (0.0 to 1.0)
   * @param {number} scale
   */
  setUserScale(scale) {
    this.userScale = Math.max(0, Math.min(1, scale));
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('cc_shake_scale', this.userScale.toString()); } catch (e) {}
    }
  }

  /**
   * Triggers a camera shake
   * @param {number} intensity - Shake magnitude in pixels
   * @param {number} [duration=12] - Duration in frames
   */
  shake(intensity = 6, duration = 12) {
    this.intensity = Math.max(this.intensity, intensity);
    this.duration = Math.max(this.duration, duration);
    this.maxDuration = Math.max(this.maxDuration, duration);
  }

  /**
   * Triggers chromatic aberration crush for Special/Ultimate impacts
   * @param {number} intensity - Crush magnitude (0–1), defaults to 0.8
   */
  applyChromaticCrush(intensity = 0.8) {
    this.crushIntensity = Math.max(this.crushIntensity, Math.min(1, intensity));
  }

  update() {
    if (this.duration > 0 && this.intensity > 0.1 && this.userScale > 0) {
      const progress = this.duration / (this.maxDuration || 1);
      const currentIntensity = this.intensity * progress * this.userScale;
      this.offsetX = (Math.random() * 2 - 1) * currentIntensity;
      this.offsetY = (Math.random() * 2 - 1) * currentIntensity;
      this.duration--;
    } else {
      this.intensity = 0;
      this.duration = 0;
      this.maxDuration = 0;
      this.offsetX = 0;
      this.offsetY = 0;
    }

    // Decay chromatic crush over ~4 frames
    if (this.crushIntensity > 0) {
      this.crushIntensity = Math.max(0, this.crushIntensity - 0.25);
    }
  }

  apply(ctx) {
    if (this.duration > 0 && (this.offsetX !== 0 || this.offsetY !== 0)) {
      ctx.translate(this.offsetX, this.offsetY);
    }
  }
}
