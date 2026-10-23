/**
 * Campus Clash — 3-Layer Combat Hit Sound Engine
 * Synthesizes frame-synchronized physical contact (Transient + Body + Sub-Boom)
 * with round-robin anti-repetition and dynamic combo pitch risers.
 * @module engine/audio/hitSoundStack
 */

import { HITS_CONFIG } from '../../../data/audio_configs/hits.config.js';

export class HitSoundStack {
  constructor(audioCtx, sfxBusNode, voiceLimiter) {
    this.ctx = audioCtx;
    this.outputNode = sfxBusNode;
    this.limiter = voiceLimiter;

    // Last played indices to enforce never-repeat-identical-consecutive
    this.lastVariation = {
      light: -1,
      medium: -1,
      heavy: -1,
      block: -1,
      parry: -1,
      counter: -1
    };

    // Pre-allocated noise buffers for crisp transients
    this.noiseBuffer = this.createNoiseBuffer(0.2);
  }

  createNoiseBuffer(durationSeconds = 0.2) {
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * durationSeconds;
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * Selects next round-robin index guaranteed different from previous
   */
  getNextVariation(type) {
    const poolSize = HITS_CONFIG.antiRepetition.poolSize || 6;
    let next = Math.floor(Math.random() * poolSize);
    if (next === this.lastVariation[type]) {
      next = (next + 1) % poolSize;
    }
    this.lastVariation[type] = next;
    return next;
  }

  /**
   * Computes random micro-pitch and volume jitter factors
   */
  getJitterFactors() {
    const pRange = HITS_CONFIG.antiRepetition.pitchJitterPercent * 0.01;
    const pitchFactor = 1.0 + (Math.random() * 2 - 1) * pRange;

    const vRangeDb = HITS_CONFIG.antiRepetition.volumeJitterDb;
    const dbJitter = (Math.random() * 2 - 1) * vRangeDb;
    const volumeFactor = Math.pow(10, dbJitter / 20);

    return { pitchFactor, volumeFactor };
  }

  /**
   * Triggers a full 3-layer combat hit stack
   * @param {string} hitType 'light' | 'medium' | 'heavy' | 'block' | 'parry' | 'counter'
   * @param {number} comboHits count of current combo (for pitch riser)
   * @param {number} xPos horizontal world coordinate for stereo panning
   */
  playHit(hitType = 'light', comboHits = 0, xPos = 480) {
    const cfg = HITS_CONFIG.layers[hitType] || HITS_CONFIG.layers.light;
    const now = this.ctx.currentTime;
    const { pitchFactor, volumeFactor } = this.getJitterFactors();

    // Calculate combo pitch riser scalar (capped)
    let comboMultiplier = 1.0;
    if (comboHits > 1) {
      const riserCfg = HITS_CONFIG.comboRiser;
      comboMultiplier = Math.min(
        riserCfg.maxCapScalar,
        riserCfg.baseScalar + (comboHits - 1) * riserCfg.semitoneStepPerHit
      );
    }
    const finalPitch = pitchFactor * comboMultiplier;

    // Stereo Panner Node for 2.5D positionality
    let panNode = null;
    if (this.ctx.createStereoPanner) {
      panNode = this.ctx.createStereoPanner();
      // Map xPos (0..960) to (-0.75 .. +0.75) stereo spread
      const panVal = Math.max(-0.85, Math.min(0.85, (xPos - 480) / 480 * 0.75));
      panNode.pan.setValueAtTime(panVal, now);
      panNode.connect(this.outputNode);
    }
    const destination = panNode || this.outputNode;

    // --- LAYER 1: Transient Crack (High Frequency) ---
    if (cfg.transient) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = cfg.transient.type || 'triangle';
      const startFreq = cfg.transient.freq * finalPitch;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 0.25, now + cfg.transient.duration);

      const targetGain = cfg.transient.gain * volumeFactor;
      gain.gain.setValueAtTime(targetGain, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + cfg.transient.duration);

      osc.connect(gain);
      gain.connect(destination);

      osc.start(now);
      osc.stop(now + cfg.transient.duration);
    }

    // --- LAYER 2: Body Core Mass (Mid Frequency Thud) ---
    if (cfg.body) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = cfg.body.type || 'sine';
      const bodyFreq = cfg.body.freq * finalPitch;
      osc.frequency.setValueAtTime(bodyFreq, now);
      osc.frequency.exponentialRampToValueAtTime(bodyFreq * 0.4, now + cfg.body.duration);

      const targetGain = cfg.body.gain * volumeFactor;
      gain.gain.setValueAtTime(targetGain, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + cfg.body.duration);

      osc.connect(gain);
      gain.connect(destination);

      osc.start(now);
      osc.stop(now + cfg.body.duration);
    }

    // --- LAYER 3: Sub-Bass Boom (Low-end Physical Resonance) ---
    if (cfg.subBoom && cfg.subBoom.enabled) {
      const delaySec = (cfg.subBoom.delayMs || 4) * 0.001;
      const subStartTime = now + delaySec;

      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();

      subOsc.type = 'sine';
      const subFreq = cfg.subBoom.freq * pitchFactor; // sub stays clean without excessive combo rise
      subOsc.frequency.setValueAtTime(subFreq, subStartTime);
      subOsc.frequency.exponentialRampToValueAtTime(subFreq * 0.5, subStartTime + cfg.subBoom.duration);

      const targetGain = cfg.subBoom.gain * volumeFactor;
      subGain.gain.setValueAtTime(targetGain, subStartTime);
      subGain.gain.exponentialRampToValueAtTime(0.001, subStartTime + cfg.subBoom.duration);

      subOsc.connect(subGain);
      subGain.connect(destination);

      subOsc.start(subStartTime);
      subOsc.stop(subStartTime + cfg.subBoom.duration);
    }
  }
}
