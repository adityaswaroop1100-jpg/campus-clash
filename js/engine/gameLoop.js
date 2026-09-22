/**
 * Campus Clash — Fixed Timestep (60 FPS) Game Loop
 * @module engine/gameLoop
 */

import { FIXED_TIMESTEP } from '../utils/constants.js';

export class GameLoop {
  /**
   * Creates an instance of GameLoop
   * @param {Function} updateFn - Fixed update callback called every 16.67ms
   * @param {Function} renderFn - Render callback called with interpolation alpha
   */
  constructor(updateFn, renderFn) {
    this.updateFn = updateFn;
    this.renderFn = renderFn;

    this.isRunning = false;
    this.animFrameId = null;
    this.lastTime = 0;
    this.accumulator = 0;

    this.boundStep = this.step.bind(this);
  }

  /**
   * Starts the game loop
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.animFrameId = requestAnimationFrame(this.boundStep);
  }

  /**
   * Stops the game loop and cancels pending frames
   */
  stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /**
   * Core frame step with delta time accumulation
   * @param {DOMHighResTimeStamp} currentTime
   */
  step(currentTime) {
    if (!this.isRunning) return;

    const frameTime = Math.min(currentTime - this.lastTime, 250); // Cap spiral of death
    this.lastTime = currentTime;
    this.accumulator += frameTime;

    // Fixed updates for deterministic physics/state simulation
    while (this.accumulator >= FIXED_TIMESTEP) {
      this.updateFn(FIXED_TIMESTEP);
      this.accumulator -= FIXED_TIMESTEP;
    }

    // Interpolation alpha between 0 and 1 for smooth rendering
    const alpha = this.accumulator / FIXED_TIMESTEP;
    this.renderFn(alpha);

    this.animFrameId = requestAnimationFrame(this.boundStep);
  }
}
