/**
 * Campus Clash — Procedural Web Audio API Sound Manager
 * @module engine/soundManager
 */

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterVolume = 0.8;
    this.sfxVolume = 0.8;
    this.musicVolume = 0.55;

    // Load saved volume preferences
    try {
      const saved = JSON.parse(localStorage.getItem('campus_clash_audio') || '{}');
      if (typeof saved.masterVolume === 'number') this.masterVolume = saved.masterVolume;
      if (typeof saved.sfxVolume === 'number') this.sfxVolume = saved.sfxVolume;
      if (typeof saved.musicVolume === 'number') this.musicVolume = saved.musicVolume;
      if (typeof saved.isMuted === 'boolean') this.isMuted = saved.isMuted;
    } catch (e) {}

    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;

    // BGM sequencer state
    this.musicPlaying = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.musicBpm = 132;
    this.isDangerMusic = false;
    this.musicType = 'none'; // 'title' | 'combat'
  }

  /**
   * Initializes audio context and gain routing on first user interaction
   */
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        // Setup master gain graph
        this.masterGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();

        this.sfxGain.connect(this.masterGain);
        this.musicGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        this.updateGainNodes();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  updateGainNodes() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const effectiveMaster = this.isMuted ? 0 : this.masterVolume;
    this.masterGain.gain.setValueAtTime(effectiveMaster, now);
    this.sfxGain.gain.setValueAtTime(this.sfxVolume, now);
    this.musicGain.gain.setValueAtTime(this.musicVolume, now);
  }

  saveAudioPreferences() {
    try {
      localStorage.setItem('campus_clash_audio', JSON.stringify({
        masterVolume: this.masterVolume,
        sfxVolume: this.sfxVolume,
        musicVolume: this.musicVolume,
        isMuted: this.isMuted
      }));
    } catch (e) {}
  }

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    this.updateGainNodes();
    this.saveAudioPreferences();
  }

  setSFXVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    this.updateGainNodes();
    this.saveAudioPreferences();
  }

  setMusicVolume(val) {
    this.musicVolume = Math.max(0, Math.min(1, val));
    this.updateGainNodes();
    this.saveAudioPreferences();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.updateGainNodes();
    this.saveAudioPreferences();
    return this.isMuted;
  }

  getOutputNode(isMusic = false) {
    if (!this.ctx) return null;
    if (this.sfxGain && !isMusic) return this.sfxGain;
    if (this.musicGain && isMusic) return this.musicGain;
    return this.ctx.destination;
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
      gain.connect(this.getOutputNode(false));
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
   * Retro arcade coin insert chime (two-tone rising ping)
   */
  playCoinInsert() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.45);
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

  // =========================================================================
  // PROCEDURAL ARCADE BACKGROUND MUSIC SYNTHESIZER
  // =========================================================================

  /**
   * Starts high-energy procedural synthwave combat music
   */
  startCombatMusic() {
    this.init();
    if (this.musicPlaying && this.musicType === 'combat') return;
    this.stopMusic();

    this.musicPlaying = true;
    this.musicType = 'combat';
    this.musicStep = 0;
    this.musicBpm = 132;
    this.isDangerMusic = false;

    this.runMusicSequencer();
  }

  /**
   * Starts atmospheric title / menu music
   */
  startTitleMusic() {
    this.init();
    if (this.musicPlaying && this.musicType === 'title') return;
    this.stopMusic();

    this.musicPlaying = true;
    this.musicType = 'title';
    this.musicStep = 0;
    this.musicBpm = 95;

    this.runMusicSequencer();
  }

  /**
   * Stops background music cleanly
   */
  stopMusic() {
    this.musicPlaying = false;
    this.musicType = 'none';
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  /**
   * Toggles danger / tension mode in music (when a fighter is on low HP)
   */
  setMusicDanger(isDanger) {
    if (this.isDangerMusic === isDanger) return;
    this.isDangerMusic = isDanger;
    if (this.musicPlaying && this.musicType === 'combat') {
      this.musicBpm = isDanger ? 148 : 132;
    }
  }

  runMusicSequencer() {
    if (!this.musicPlaying || !this.ctx) return;

    const stepInterval = (60 / this.musicBpm) / 4; // 16th note in seconds
    const time = this.ctx.currentTime;

    if (this.musicType === 'combat') {
      this.playCombatStep(this.musicStep, time);
    } else if (this.musicType === 'title') {
      this.playTitleStep(this.musicStep, time);
    }

    this.musicStep = (this.musicStep + 1) % 64;

    this.musicTimer = setTimeout(() => {
      this.runMusicSequencer();
    }, stepInterval * 1000);
  }

  playCombatStep(step, time) {
    if (this.isMuted) return;
    const dest = this.getOutputNode(true);
    if (!dest) return;

    // 1. Kick Drum: on steps 0, 4, 8, 12 of every 16
    const step16 = step % 16;
    if (step16 === 0 || step16 === 4 || step16 === 8 || step16 === 12) {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(this.isDangerMusic ? 145 : 125, time);
        osc.frequency.exponentialRampToValueAtTime(32, time + 0.12);
        gain.gain.setValueAtTime(0.28, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(time);
        osc.stop(time + 0.14);
      } catch (e) {}
    }

    // 2. Snare Drum: on steps 4 and 12
    if (step16 === 4 || step16 === 12) {
      try {
        // High-frequency burst
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, time);
        gain.gain.setValueAtTime(0.18, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.10);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(time);
        osc.stop(time + 0.10);
      } catch (e) {}
    }

    // 3. Hi-Hat: on every odd step
    if (step % 2 === 1) {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(4200, time);
        gain.gain.setValueAtTime(step % 4 === 2 ? 0.04 : 0.02, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.025);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(time);
        osc.stop(time + 0.025);
      } catch (e) {}
    }

    // 4. Synth Bassline Arpeggio (Am -> F -> C -> G progression)
    const bar = Math.floor(step / 16) % 4;
    const rootPitches = [
      [55, 110, 82.4, 110],  // A1, A2, E2, A2
      [43.65, 87.3, 65.4, 87.3], // F1, F2, C2, F2
      [65.4, 130.8, 98.0, 130.8], // C2, C3, G2, C3
      [49.0, 98.0, 73.4, 98.0]   // G1, G2, D2, G2
    ];
    const barNotes = rootPitches[bar];
    const noteFreq = barNotes[step16 % 4];

    if (noteFreq) {
      try {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(noteFreq, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(this.isDangerMusic ? 1800 : 900, time);
        filter.frequency.exponentialRampToValueAtTime(220, time + 0.10);

        gain.gain.setValueAtTime(0.12, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        osc.start(time);
        osc.stop(time + 0.11);
      } catch (e) {}
    }
  }

  playTitleStep(step, time) {
    if (this.isMuted) return;
    const dest = this.getOutputNode(true);
    if (!dest) return;

    // Atmospheric chill pulse every 8 steps
    if (step % 8 === 0) {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        const notes = [130.81, 164.81, 196.00, 246.94]; // C chord tones
        const note = notes[(step / 8) % notes.length];
        osc.frequency.setValueAtTime(note, time);
        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.45);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(time);
        osc.stop(time + 0.45);
      } catch (e) {}
    }
  }

  // =========================================================================
  // ARCADE ANNOUNCER VOICE & SYNTH STABS
  // =========================================================================

  /**
   * Speaks announcer line with speech synthesis and layered audio chime
   */
  speakAnnouncer(text, chimePitch = 440) {
    // 1. Synth Chime Stabs
    this.playTone(chimePitch, 'sawtooth', 0.25, 0.35);
    setTimeout(() => this.playTone(chimePitch * 1.5, 'triangle', 0.35, 0.25), 80);

    // 2. Web Speech API Announcer Voice
    if (!this.isMuted && typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel(); // Cancel any lingering utterance
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.08;
        utterance.pitch = 0.78; // Deep, booming arcade voice
        utterance.volume = Math.min(1, this.masterVolume * this.sfxVolume * 1.2);

        // Select an English voice if available
        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Male') || v.name.includes('David') || v.name.includes('Google') || v.name.includes('Natural')));
        if (englishVoice) utterance.voice = englishVoice;

        window.speechSynthesis.speak(utterance);
      } catch (e) {}
    }
  }

  announceRound(roundNumber) {
    const text = roundNumber === 3 ? "FINAL ROUND" : `ROUND ${roundNumber}`;
    this.speakAnnouncer(text, 523.25);
  }

  announceFight() {
    this.playFightGong();
    this.speakAnnouncer("FIGHT!", 659.25);
  }

  announceKO() {
    // Massive seismic drop
    this.playTitleThump();
    this.speakAnnouncer("K. O.!", 320);
  }

  announceWinner(characterName, isPlayer1 = true) {
    const winnerLabel = isPlayer1 ? "PLAYER ONE WINS" : "PLAYER TWO WINS";
    this.speakAnnouncer(`${winnerLabel}!`, 783.99);
    setTimeout(() => {
      this.playFightFanfare();
    }, 450);
  }
}

