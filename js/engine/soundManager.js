/**
 * Campus Clash — Procedural Web Audio API Sound Manager
 * @module engine/soundManager
 */

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  /**
   * Initializes audio context on first user interaction
   */
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type, duration, vol = 0.15) {
    if (this.isMuted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playLightHit() {
    this.init();
    this.playTone(280, 'triangle', 0.08, 0.2);
  }

  playHeavyHit() {
    this.init();
    this.playTone(130, 'sawtooth', 0.22, 0.35);
  }

  playBlock() {
    this.init();
    this.playTone(520, 'square', 0.09, 0.18);
  }

  playDodge() {
    this.init();
    this.playTone(380, 'sine', 0.12, 0.12);
  }

  playPerfect() {
    this.init();
    this.playTone(880, 'sine', 0.3, 0.25);
    setTimeout(() => this.playTone(1174, 'triangle', 0.35, 0.25), 60);
  }

  playUltimate() {
    this.init();
    this.playTone(110, 'sawtooth', 0.6, 0.4);
    setTimeout(() => this.playTone(440, 'sine', 0.5, 0.3), 150);
  }

  playFoodSplash() {
    this.init();
    this.playTone(180, 'triangle', 0.18, 0.2);
  }

  playMetalClang() {
    this.init();
    this.playTone(980, 'sine', 0.18, 0.28);
    setTimeout(() => this.playTone(490, 'triangle', 0.22, 0.22), 30);
  }

  playWhack() {
    this.init();
    this.playTone(90, 'sawtooth', 0.25, 0.4);
    setTimeout(() => this.playTone(140, 'square', 0.15, 0.25), 40);
  }

  playChaiSplash() {
    this.init();
    this.playTone(420, 'triangle', 0.12, 0.2);
    setTimeout(() => this.playTone(680, 'sine', 0.16, 0.15), 50);
  }

  playWhipCrack() {
    this.init();
    this.playTone(1200, 'sawtooth', 0.06, 0.35);
    setTimeout(() => this.playTone(220, 'triangle', 0.14, 0.25), 25);
  }

  playCricketShot() {
    this.init();
    this.playTone(320, 'square', 0.14, 0.35);
    setTimeout(() => this.playTone(180, 'triangle', 0.2, 0.25), 35);
  }

  playSecurityWhistle() {
    this.init();
    this.playTone(2600, 'sawtooth', 0.18, 0.15);
    setTimeout(() => this.playTone(3100, 'sine', 0.14, 0.22), 60);
    setTimeout(() => this.playTone(2800, 'triangle', 0.16, 0.18), 120);
  }

  playWindGust() {
    this.init();
    this.playTone(160, 'triangle', 0.45, 0.18);
    setTimeout(() => this.playTone(110, 'sine', 0.6, 0.15), 50);
  }

  playFountainSplash() {
    this.init();
    this.playTone(850, 'sine', 0.12, 0.15);
    setTimeout(() => this.playTone(620, 'triangle', 0.18, 0.18), 30);
    setTimeout(() => this.playTone(440, 'sine', 0.25, 0.12), 70);
  }

  playBusHorn() {
    this.init();
    this.playTone(340, 'sawtooth', 0.25, 0.18);
    setTimeout(() => this.playTone(420, 'sawtooth', 0.25, 0.18), 10);
  }

  /**
   * Deep sub-bass impact thump on title pulse
   */
  playTitleThump() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(95, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(32, this.ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch (e) {}
  }

  /**
   * Retro arcade menu hover / cursor blip
   */
  playMenuBlip() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(580, this.ctx.currentTime);
      osc.frequency.setValueAtTime(820, this.ctx.currentTime + 0.025);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch (e) {}
  }

  /**
   * Triumphant arcade fanfare arpeggio on FIGHT selection
   */
  playFightFanfare() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    const notes = [
      { f: 261.63, t: 0, d: 0.12, type: 'sawtooth', v: 0.22 },     // C4
      { f: 329.63, t: 0.10, d: 0.12, type: 'sawtooth', v: 0.24 },    // E4
      { f: 392.00, t: 0.20, d: 0.14, type: 'sawtooth', v: 0.26 },    // G4
      { f: 523.25, t: 0.32, d: 0.45, type: 'triangle', v: 0.32 },    // C5
      { f: 659.25, t: 0.44, d: 0.65, type: 'sawtooth', v: 0.28 },    // E5
      { f: 783.99, t: 0.44, d: 0.70, type: 'triangle', v: 0.25 }     // G5 (harmony)
    ];

    notes.forEach(n => {
      setTimeout(() => {
        try {
          if (!this.ctx || this.ctx.state === 'suspended') this.init();
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = n.type;
          osc.frequency.setValueAtTime(n.f, this.ctx.currentTime);
          gain.gain.setValueAtTime(n.v, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + n.d);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start();
          osc.stop(this.ctx.currentTime + n.d);
        } catch (err) {}
      }, n.t * 1000);
    });
  }

  /**
   * Cancel / back / dismiss blip
   */
  playCancel() {
    this.init();
    this.playTone(380, 'square', 0.08, 0.14);
    setTimeout(() => this.playTone(220, 'triangle', 0.12, 0.14), 40);
  }

  /**
   * Character select navigation tick (crisp arcade click)
   */
  playCharNavTick() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1900, this.ctx.currentTime + 0.03);
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.035);
    } catch (e) {}
  }

  /**
   * Soft whoosh on card hover / focus change
   */
  playCardWhoosh() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(460, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.11);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.11);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.11);
    } catch (e) {}
  }

  /**
   * Deep satisfying THUD + synthesized orchestral hit (layered oscillators)
   */
  playLockIn() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // 1. Deep Sub-bass Thud
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(140, now);
      subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.45);
      subGain.gain.setValueAtTime(0.45, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start();
      subOsc.stop(now + 0.45);

      // 2. Synthesized Orchestral Brass/Stab Chord: C3, G3, C4, E4
      const chordFreqs = [130.81, 196.00, 261.63, 329.63];
      chordFreqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = idx % 2 === 0 ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.15 / (idx + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(now + 0.65);
      });
    } catch (e) {}
  }

  /**
   * Crisp mechanical keyboard switch click-clack — Cypher's signature.
   */
  playKeyboardClick() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Click transient (high white noise burst)
      const bufferSize = this.ctx.sampleRate * 0.035;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 3500;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
      // Clack register tone
      this.playTone(1200, 'square', 0.025, 0.08);
    } catch (e) {}
  }

  /**
   * Heavy resonant wooden gavel strike on desk — Gavel's signature.
   */
  playGavelThwack() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Deep thud body
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);
      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.35);
      // Wood knock transient
      this.playTone(340, 'triangle', 0.06, 0.30);
    } catch (e) {}
  }

  /**
   * High-frequency whistling wind rush — Bolt's sonic dash.
   */
  playSonicDash() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(1800, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.25);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.32, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.28);
    } catch (e) {}
  }

  /**
   * Wet chromatic squelch / paint splat — Palette's signature.
   */
  playPaintSplat() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Low squelch body
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.14);
      gain.gain.setValueAtTime(0.38, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.18);
      // Chromatic shimmer — quick high beep
      this.playTone(1400, 'triangle', 0.05, 0.12);
    } catch (e) {}
  }

  /**
   * Rising beep on countdown (3, 2, 1)
   */
  playCountdownBeep(num) {
    this.init();
    if (this.isMuted || !this.ctx) return;
    try {
      const freqs = { 3: 523.25, 2: 659.25, 1: 783.99 }; // C5, E5, G5
      const freq = freqs[num] || 523.25;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.28);
    } catch (e) {}
  }

  /**
   * Loud resonant gong on "FIGHT!"
   */
  playFightGong() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Inharmonic metallic gong layers
      const gongPitches = [164.81, 220.00, 311.13, 440.00, 622.25];
      gongPitches.forEach((pitch, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = i === 0 ? 'sine' : (i % 2 === 0 ? 'triangle' : 'sawtooth');
        osc.frequency.setValueAtTime(pitch, now);
        gain.gain.setValueAtTime(0.28 / (i + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(now + 1.4);
      });
    } catch (e) {}
  }

  /**
   * Plays a distinct procedural audio signature hit sound for any character.
   * @param {string} characterId
   * @param {Object} [move=null]
   * @param {boolean} [isHeavy=false]
   * @param {boolean} [isBlocked=false]
   */
  playCharacterHitSound(characterId, move = null, isHeavy = false, isBlocked = false) {
    this.init();
    if (this.isMuted || !this.ctx) return;

    if (isBlocked) {
      this.playBlock();
      return;
    }

    try {
      const now = this.ctx.currentTime;

      switch (characterId) {
        case 'topper': {
          // Sharp piercing sine sweep (800Hz -> 200Hz) + high overtone glint
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(isHeavy ? 950 : 800, now);
          osc.frequency.exponentialRampToValueAtTime(isHeavy ? 180 : 220, now + (isHeavy ? 0.12 : 0.07));
          gain.gain.setValueAtTime(isHeavy ? 0.35 : 0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + (isHeavy ? 0.12 : 0.07));
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start();
          osc.stop(now + (isHeavy ? 0.12 : 0.07));

          // Chime harmonic
          this.playTone(isHeavy ? 1680 : 1320, 'triangle', 0.06, 0.12);
          break;
        }

        case 'backbencher': {
          // Chaotic sawtooth crunch + lowpass filtered distortion
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1400, now);
          filter.frequency.exponentialRampToValueAtTime(300, now + (isHeavy ? 0.24 : 0.14));

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(isHeavy ? 120 : 160, now);
          osc.frequency.exponentialRampToValueAtTime(isHeavy ? 45 : 60, now + (isHeavy ? 0.24 : 0.14));

          gain.gain.setValueAtTime(isHeavy ? 0.40 : 0.28, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + (isHeavy ? 0.24 : 0.14));

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start();
          osc.stop(now + (isHeavy ? 0.24 : 0.14));
          break;
        }

        case 'hosteler': {
          // Ultra-low sub-bass muffled thump (65Hz -> 28Hz)
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(260, now);

          osc.type = 'sine';
          osc.frequency.setValueAtTime(isHeavy ? 70 : 85, now);
          osc.frequency.exponentialRampToValueAtTime(28, now + (isHeavy ? 0.38 : 0.26));

          gain.gain.setValueAtTime(isHeavy ? 0.55 : 0.42, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + (isHeavy ? 0.38 : 0.26));

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start();
          osc.stop(now + (isHeavy ? 0.38 : 0.26));

          // Metallic tray clang layer
          this.playTone(480, 'sawtooth', 0.08, 0.15);
          break;
        }

        case 'senior': {
          // Snapping whip crack (square wave 1800Hz -> 350Hz) + resonant snap
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(800, now);

          osc.type = 'square';
          osc.frequency.setValueAtTime(1800, now);
          osc.frequency.exponentialRampToValueAtTime(320, now + (isHeavy ? 0.10 : 0.05));

          gain.gain.setValueAtTime(isHeavy ? 0.38 : 0.28, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + (isHeavy ? 0.10 : 0.05));

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start();
          osc.stop(now + (isHeavy ? 0.10 : 0.05));

          this.playChaiSplash();
          break;
        }

        case 'placementWarrior': {
          // Crisp polyphonic metallic inharmonic ping (520Hz + 1040Hz + 1560Hz)
          [520, 1040, 1560].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = idx === 0 ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime((isHeavy ? 0.28 : 0.20) / (idx + 1), now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + (isHeavy ? 0.18 : 0.09));
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(now + (isHeavy ? 0.18 : 0.09));
          });
          break;
        }

        case 'sportsStar': {
          // Distorted sine cricket bat crack (220Hz -> 60Hz) with wood knock transient
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(isHeavy ? 280 : 220, now);
          osc.frequency.exponentialRampToValueAtTime(55, now + (isHeavy ? 0.26 : 0.16));

          gain.gain.setValueAtTime(isHeavy ? 0.45 : 0.32, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + (isHeavy ? 0.26 : 0.16));
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start();
          osc.stop(now + (isHeavy ? 0.26 : 0.16));

          // High transient wood click
          this.playTone(1200, 'square', 0.03, 0.25);
          break;
        }

        case 'cypher': {
          // 8-bit cyber mechanical switch & bitcrush arpeggio
          this.playKeyboardClick();
          const notes = isHeavy ? [580, 880, 1160, 1440] : [720, 1080];
          notes.forEach((freq, i) => {
            setTimeout(() => {
              this.playTone(freq, 'square', 0.04, 0.14);
            }, i * 18);
          });
          break;
        }

        case 'gavel': {
          // Resonant heavy mahogany gavel slam
          this.playGavelThwack();
          if (isHeavy) {
            this.playTone(70, 'sawtooth', 0.35, 0.45);
          }
          break;
        }

        case 'bolt': {
          // Supersonic whoosh & sine vibrato
          this.playSonicDash();
          this.playTone(isHeavy ? 1800 : 1400, 'sine', 0.08, 0.22);
          break;
        }

        case 'palette': {
          // Wet squelch & chromatic glide
          this.playPaintSplat();
          if (isHeavy) {
            this.playTone(320, 'triangle', 0.20, 0.25);
          }
          break;
        }

        default: {
          if (isHeavy) this.playHeavyHit();
          else this.playLightHit();
          break;
        }
      }
    } catch (e) {}
  }
}

