/**
 * Campus Clash — Reactive Crowd & Ambience System
 * Dynamic spectator murmurs, combo excitement swells, and explosive K.O. roars.
 * @module engine/audio/crowdSystem
 */

export class CrowdSystem {
  constructor(audioCtx, crowdBusNode) {
    this.ctx = audioCtx;
    this.crowdBus = crowdBusNode;
    this.ambientOsc = null;
    this.ambientGain = null;
    this.isRunning = false;
  }

  startAmbientMurmur() {
    // Disabled continuous synth murmurs
    this.isRunning = false;
  }

  stop() {
    this.isRunning = false;
    if (this.ambientOsc) {
      try {
        this.ambientOsc.stop();
        this.ambientOsc.disconnect();
      } catch (e) {}
      this.ambientOsc = null;
    }
  }

  /**
   * Swells crowd volume on big combos or near-death exchanges
   * @param {number} comboHits 
   */
  swellOnCombo(comboHits = 5) {
    if (!this.ambientGain) return;
    const now = this.ctx.currentTime;
    const boost = Math.min(0.28, 0.08 + comboHits * 0.02);
    this.ambientGain.gain.setTargetAtTime(boost, now, 0.05);
    this.ambientGain.gain.setTargetAtTime(0.08, now + 1.2, 0.4);
  }

  /**
   * Explosive collective roar on decisive K.O. blow
   */
  triggerKORoar() {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 1.4);

    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    osc.connect(gain);
    gain.connect(this.crowdBus);

    osc.start(now);
    osc.stop(now + 1.55);
  }
}
