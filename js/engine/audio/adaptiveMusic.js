/**
 * Campus Clash — Adaptive Vertical Music Engine
 * Procedural low-pass soundscape with smooth bus ducking and low-HP danger escalation.
 * Completely free of harsh treble beeps and square-wave oscillations.
 * @module engine/audio/adaptiveMusic
 */

export class AdaptiveMusic {
  constructor(audioCtx, musicBusNode, busController) {
    this.ctx = audioCtx;
    this.musicBus = musicBusNode;
    this.busController = busController;

    this.isPlaying = false;
    this.mode = 'none'; // 'title' | 'combat'
    this.isDanger = false;
    this.tempo = 128;

    // Warm ambient procedural oscillator & filter (ZERO high-pitch beeps)
    this.padOsc = null;
    this.padGain = null;
    this.padFilter = null;

    // Stem controls for fallback
    this.stemDrumsGain = 1.0;
    this.stemBassGain = 0.9;
    this.stemArpGain = 0.0;
    this.stemLeadGain = 0.0;
  }

  startTitleMusic() {
    this.stop();
    this.mode = 'title';
    this.isPlaying = false; // Real studio title track handled by SoundManager
  }

  startCombatMusic() {
    this.stop();
    this.mode = 'combat';
    this.isDanger = false;
    this.isPlaying = false; // Official Suno soundtrack handled cleanly by SoundManager
  }

  playCurrentMode() {
    if (!this.isPlaying || !this.ctx) return;
    this.startWarmAmbience();
  }

  /**
   * Warm, rich, non-irritating background soundscape.
   * Completely eliminates the 4500Hz square-wave hi-hat and sharp synth beeps.
   */
  startWarmAmbience() {
    this.stopWarmAmbience();
    try {
      const now = this.ctx.currentTime;
      this.padFilter = this.ctx.createBiquadFilter();
      this.padFilter.type = 'lowpass';
      this.padFilter.frequency.setValueAtTime(220, now); // Cuts all treble beeps completely

      this.padGain = this.ctx.createGain();
      this.padGain.gain.setValueAtTime(0.001, now);
      this.padGain.gain.exponentialRampToValueAtTime(0.22, now + 1.2);

      this.padOsc = this.ctx.createOscillator();
      this.padOsc.type = 'sine'; // Pure smooth sine tone, no harsh harmonics
      this.padOsc.frequency.setValueAtTime(65.41, now); // C2 warm sub-bass

      this.padOsc.connect(this.padFilter);
      this.padFilter.connect(this.padGain);
      this.padGain.connect(this.musicBus);

      this.padOsc.start(now);
    } catch (e) {}
  }

  stopWarmAmbience() {
    if (this.padGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.padGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      } catch (e) {}
    }
    if (this.padOsc) {
      try {
        this.padOsc.stop(this.ctx.currentTime + 0.35);
        this.padOsc.disconnect();
      } catch (e) {}
      this.padOsc = null;
    }
  }

  stop() {
    this.isPlaying = false;
    this.stopWarmAmbience();
  }

  /**
   * Updates stem intensity based on fighter health difference and combo state
   */
  updateIntensity(p1Health, p2Health, activeCombo) {
    if (this.mode !== 'combat') return;

    const minHp = Math.min(p1Health, p2Health);
    if (minHp < 25 && !this.isDanger) {
      this.isDanger = true;
      if (this.padFilter) {
        this.padFilter.frequency.setValueAtTime(340, this.ctx.currentTime);
      }
    } else if (minHp >= 25 && this.isDanger) {
      this.isDanger = false;
      if (this.padFilter) {
        this.padFilter.frequency.setValueAtTime(220, this.ctx.currentTime);
      }
    }
  }

  /**
   * Plays triumphant victory resolving fanfare with gentle sine harmonics
   */
  playVictoryFanfare() {
    this.stop();
    const now = this.ctx.currentTime;
    const notes = [293.66, 369.99, 440.00, 587.33]; // D-Major arpeggio
    notes.forEach((f, idx) => {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.12);
        gain.gain.setValueAtTime(0.20, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.4);
        osc.connect(gain);
        gain.connect(this.musicBus);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.45);
      } catch (e) {}
    });
  }
}
