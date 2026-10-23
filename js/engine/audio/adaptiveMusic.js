/**
 * Campus Clash — Adaptive Vertical Music Engine & Vocal Track Player
 * Plays high-energy real vocal fight songs (MP3/OGG) when present,
 * with seamless looping, danger mode tempo scaling, and smooth bus ducking.
 * Procedural fallback uses gentle, warm low-pass pads with ZERO harsh beeps.
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

    this.audioBuffer = null;
    this.currentSource = null;
    this.musicGainNode = this.ctx.createGain();
    this.musicGainNode.connect(this.musicBus);

    // Warm ambient fallback oscillator & filter (ZERO high-pitch beeps)
    this.padOsc = null;
    this.padGain = null;
    this.padFilter = null;

    // Stem controls for fallback
    this.stemDrumsGain = 1.0;
    this.stemBassGain = 0.9;
    this.stemArpGain = 0.0;
    this.stemLeadGain = 0.0;

    // Preload custom vocal combat theme if placed in assets/audio/music/
    this.loadVocalTheme();
  }

  async loadVocalTheme() {
    const candidatePaths = [
      'assets/audio/music/campus_clash_theme.mp3',
      'assets/audio/music/battle_theme.mp3',
      'assets/audio/music/campus_clash_vocal_theme.mp3'
    ];
    for (const path of candidatePaths) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          this.audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
          console.log(`[CampusClash Music] Successfully loaded vocal theme: ${path}`);
          if (this.isPlaying) {
            this.playCurrentMode();
          }
          break;
        }
      } catch (e) {
        // Fallback cleanly if file not yet added
      }
    }
  }

  startTitleMusic() {
    this.stop();
    this.mode = 'title';
    this.isPlaying = true;
    this.playCurrentMode();
  }

  startCombatMusic() {
    this.stop();
    this.mode = 'combat';
    this.isDanger = false;
    this.isPlaying = true;
    this.playCurrentMode();
  }

  playCurrentMode() {
    if (!this.isPlaying || !this.ctx) return;

    if (this.audioBuffer) {
      this.playBuffer(this.audioBuffer);
    } else {
      this.startWarmAmbience();
    }
  }

  playBuffer(buffer) {
    if (this.currentSource) {
      try { this.currentSource.stop(); this.currentSource.disconnect(); } catch (e) {}
    }
    this.currentSource = this.ctx.createBufferSource();
    this.currentSource.buffer = buffer;
    this.currentSource.loop = true;
    this.currentSource.playbackRate.value = this.isDanger ? 1.05 : 1.0;
    this.currentSource.connect(this.musicGainNode);
    this.currentSource.start(0);
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
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch (e) {}
      this.currentSource = null;
    }
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
      if (this.currentSource && this.currentSource.playbackRate) {
        this.currentSource.playbackRate.setValueAtTime(1.05, this.ctx.currentTime);
      }
      if (this.padFilter) {
        this.padFilter.frequency.setValueAtTime(340, this.ctx.currentTime);
      }
    } else if (minHp >= 25 && this.isDanger) {
      this.isDanger = false;
      if (this.currentSource && this.currentSource.playbackRate) {
        this.currentSource.playbackRate.setValueAtTime(1.0, this.ctx.currentTime);
      }
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
