/**
 * Campus Clash — Adaptive Vertical Stem Music Sequencer
 * Dynamic 4-stem cyber breakbeat with low-HP danger escalation and KO ducking.
 * @module engine/audio/adaptiveMusic
 */

export class AdaptiveMusic {
  constructor(audioCtx, musicBusNode, busController) {
    this.ctx = audioCtx;
    this.musicBus = musicBusNode;
    this.busController = busController;

    this.isPlaying = false;
    this.tempo = 132;
    this.step = 0;
    this.timer = null;
    this.mode = 'none'; // 'title' | 'combat'

    // Intensity Stems (0.0 to 1.0)
    this.stemDrumsGain = 1.0;
    this.stemBassGain = 0.9;
    this.stemArpGain = 0.0;
    this.stemLeadGain = 0.0;
    this.isDanger = false;

    // Scale notes: Cyber D-Minor Pentatonic (D, F, G, A, C)
    this.baseFrequencies = [146.83, 174.61, 196.00, 220.00, 261.63, 293.66];
  }

  startTitleMusic() {
    this.stop();
    this.mode = 'title';
    this.tempo = 115;
    this.isPlaying = true;
    this.step = 0;
    this.runSequencer();
  }

  startCombatMusic() {
    this.stop();
    this.mode = 'combat';
    this.tempo = 132;
    this.isDanger = false;
    this.isPlaying = true;
    this.step = 0;
    this.stemArpGain = 0.0;
    this.stemLeadGain = 0.0;
    this.runSequencer();
  }

  stop() {
    this.isPlaying = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Updates stem intensity based on fighter health difference and combo state
   */
  updateIntensity(p1Health, p2Health, activeCombo) {
    if (this.mode !== 'combat') return;

    const minHp = Math.min(p1Health, p2Health);
    if (minHp < 25 && !this.isDanger) {
      // Danger Mode Acceleration
      this.isDanger = true;
      this.tempo = 148;
      this.stemArpGain = 1.0;
      this.stemLeadGain = 1.0;
    } else if (activeCombo >= 4 || minHp < 50) {
      // Intense Phase
      this.stemArpGain = 0.85;
      this.stemLeadGain = 0.0;
    } else if (!this.isDanger) {
      // Neutral Phase
      this.stemArpGain = 0.0;
      this.stemLeadGain = 0.0;
    }
  }

  runSequencer() {
    if (!this.isPlaying) return;

    const stepDurationMs = (60 / this.tempo) * 250; // 16th notes
    const now = this.ctx.currentTime;

    if (this.mode === 'combat') {
      this.playCombatStep(this.step, now);
    } else if (this.mode === 'title') {
      this.playTitleStep(this.step, now);
    }

    this.step = (this.step + 1) % 16;
    this.timer = setTimeout(() => this.runSequencer(), stepDurationMs);
  }

  playCombatStep(step, time) {
    // Stem 1: Kick & Snare Drums
    if (step === 0 || step === 8 || step === 10) {
      this.playKick(time, 0.45 * this.stemDrumsGain);
    }
    if (step === 4 || step === 12) {
      this.playSnare(time, 0.35 * this.stemDrumsGain);
    }
    if (step % 2 === 0) {
      this.playHiHat(time, 0.15 * this.stemDrumsGain);
    }

    // Stem 2: Bassline
    if (step % 4 === 0 || step === 6 || step === 14) {
      const freq = this.baseFrequencies[step % this.baseFrequencies.length] * 0.5;
      this.playSynthNote(freq, 'sawtooth', 0.16, 0.28 * this.stemBassGain, time);
    }

    // Stem 3: Arpeggio Layer (fades in on intense / danger)
    if (this.stemArpGain > 0.05 && step % 2 === 1) {
      const noteIdx = (step * 2) % this.baseFrequencies.length;
      const freq = this.baseFrequencies[noteIdx] * 2.0;
      this.playSynthNote(freq, 'triangle', 0.08, 0.20 * this.stemArpGain, time);
    }

    // Stem 4: Lead Overdrive (fades in on danger)
    if (this.stemLeadGain > 0.05 && (step === 2 || step === 10)) {
      const freq = this.baseFrequencies[3] * 1.5;
      this.playSynthNote(freq, 'square', 0.24, 0.16 * this.stemLeadGain, time);
    }
  }

  playTitleStep(step, time) {
    if (step === 0 || step === 8) {
      this.playKick(time, 0.35);
    }
    if (step === 4 || step === 12) {
      this.playSnare(time, 0.22);
    }
    if (step % 4 === 0) {
      const freq = this.baseFrequencies[step % 4];
      this.playSynthNote(freq, 'sine', 0.25, 0.25, time);
    }
  }

  playKick(time, gainVal) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);
    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
    osc.connect(gain);
    gain.connect(this.musicBus);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  playSnare(time, gainVal) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.08);
    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.10);
    osc.connect(gain);
    gain.connect(this.musicBus);
    osc.start(time);
    osc.stop(time + 0.11);
  }

  playHiHat(time, gainVal) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(4500, time);
    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    osc.connect(gain);
    gain.connect(this.musicBus);
    osc.start(time);
    osc.stop(time + 0.045);
  }

  playSynthNote(freq, type, duration, gainVal, time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain);
    gain.connect(this.musicBus);
    osc.start(time);
    osc.stop(time + duration + 0.01);
  }

  /**
   * Plays triumphant victory resolving fanfare
   */
  playVictoryFanfare() {
    this.stop();
    const now = this.ctx.currentTime;
    const notes = [293.66, 369.99, 440.00, 587.33]; // D-Major arpeggio
    notes.forEach((f, idx) => {
      this.playSynthNote(f, 'triangle', 0.45, 0.35, now + idx * 0.12);
    });
  }
}
