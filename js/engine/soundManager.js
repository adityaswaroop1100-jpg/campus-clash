/**
 * Campus Clash — Procedural Web Audio API Sound Manager
 * Bridges legacy calls with the new esports-grade AudioManager & 7-Bus Limiter architecture.
 * @module engine/soundManager
 */

import { AudioManager } from './audio/audioManager.js';

export class SoundManager {
  constructor() {
    this.audioManager = new AudioManager();
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

    // Studio Title & Gameplay Soundtrack (Official Suno Campus Clash Track)
    this.titleAudio = null;
    this.titleTrackUrl = 'assets/audio/music/title_theme.mp3';
    this.bindUserGestureUnlock();
  }

  bindUserGestureUnlock() {
    const unlock = () => {
      this.init();
      if (!this.isMuted) {
        this.playTitleThemeAudio();
      }
    };
    if (typeof window !== 'undefined') {
      ['click', 'pointerdown', 'touchstart', 'keydown'].forEach(evt => {
        window.addEventListener(evt, unlock, { passive: true });
      });
    }
  }

  /**
   * Initializes audio context and gain routing on first user interaction
   */
  init() {
    if (this.audioManager) {
      this.audioManager.init();
      this.ctx = this.audioManager.ctx;
    }
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
    if (this.audioManager && this.audioManager.busController) {
      this.audioManager.busController.setMasterVolume(this.masterVolume);
      this.audioManager.busController.setBusVolume('sfx', this.sfxVolume);
      this.audioManager.busController.setBusVolume('music', this.musicVolume);
    }
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const effectiveMaster = this.isMuted ? 0 : this.masterVolume;
    this.masterGain.gain.setValueAtTime(effectiveMaster, now);
    this.sfxGain.gain.setValueAtTime(this.sfxVolume, now);
    this.musicGain.gain.setValueAtTime(this.musicVolume, now);
    this.syncTitleAudioVolume();
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

  mute() {
    this.isMuted = true;
    if (this.titleAudio) {
      try {
        this.titleAudio.pause();
        this.titleAudio.volume = 0;
      } catch (e) {}
    }
    this.updateGainNodes();
    this.saveAudioPreferences();
  }

  unmute() {
    this.isMuted = false;
    this.updateGainNodes();
    this.syncTitleAudioVolume();
    this.playTitleThemeAudio();
    this.saveAudioPreferences();
  }

  toggleStreamSafe() {
    if (this.audioManager && this.audioManager.busController) {
      const current = this.audioManager.busController.streamSafeMode;
      this.audioManager.busController.setStreamSafeMode(!current);
      return !current;
    }
    return false;
  }

  get isStreamSafe() {
    return this.audioManager?.busController?.streamSafeMode || false;
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

  playLightHit(x = 480) {
    this.init();
    if (this.audioManager) {
      this.audioManager.playHit('light', 0, x);
    } else {
      this.playTone(280, 'triangle', 0.08, 0.2);
    }
  }

  playHeavyHit(x = 480) {
    this.init();
    if (this.audioManager) {
      this.audioManager.playHit('heavy', 0, x);
    } else {
      this.playTone(130, 'sawtooth', 0.22, 0.35);
    }
  }

  playBlock(x = 480) {
    this.init();
    if (this.audioManager) {
      this.audioManager.playHit('block', 0, x);
    } else {
      this.playTone(520, 'square', 0.09, 0.18);
    }
  }

  playDodge() {
    this.init();
    if (this.audioManager) {
      this.audioManager.playDash();
    } else {
      this.playTone(380, 'sine', 0.12, 0.12);
    }
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
    if (this.audioManager) {
      this.audioManager.playHit('parry', 0);
    } else {
      this.playTone(980, 'sine', 0.18, 0.28);
      setTimeout(() => this.playTone(490, 'triangle', 0.22, 0.22), 30);
    }
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
   * Deep sub-bass impact thump (disabled to eliminate procedural beeps)
   */
  playTitleThump() {
    // Disabled in favor of clear soundtrack audio
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
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(240, this.ctx.currentTime + 0.025);
      gain.gain.setValueAtTime(0.025, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.025);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.025);
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
   * Starts high-energy adaptive combat music using the official Suno soundtrack
   */
  startCombatMusic() {
    this.init();
    if (this.audioManager) {
      this.audioManager.startCombatMusic();
    }
    this.musicPlaying = true;
    this.musicType = 'combat';

    // Keep the official Campus Clash soundtrack playing through combat with ZERO beeps
    this.playTitleThemeAudio();
  }

  /**
   * Starts atmospheric title / menu music using the clear studio theme song
   */
  startTitleMusic() {
    this.init();
    if (this.audioManager) {
      this.audioManager.startTitleMusic();
    }
    this.musicPlaying = true;
    this.musicType = 'title';

    this.playTitleThemeAudio();
  }

  /**
   * Plays the official Campus Clash title track (high-clarity Suno audio)
   */
  playTitleThemeAudio() {
    if (this.isMuted) return;
    if (!this.titleAudio) {
      if (typeof document !== 'undefined') {
        this.titleAudio = document.getElementById('campus-clash-bgm');
      }
      if (!this.titleAudio) {
        try {
          this.titleAudio = new Audio(this.titleTrackUrl);
          this.titleAudio.loop = true;
          this.titleAudio.preload = 'auto';
        } catch (e) {
          console.warn('[SoundManager] titleAudio creation error:', e);
        }
      }
    }
    if (this.titleAudio) {
      this.syncTitleAudioVolume();
      if (this.titleAudio.paused) {
        const p = this.titleAudio.play();
        if (p !== undefined) {
          p.catch(() => {
            // Browser autoplay restricted; will play on first user tap/click
          });
        }
      }
    }
  }

  /**
   * Stops title theme track smoothly
   */
  stopTitleThemeAudio() {
    if (this.titleAudio) {
      try {
        this.titleAudio.pause();
        this.titleAudio.currentTime = 0;
      } catch (e) {}
    }
  }

  /**
   * Synchronizes title audio volume with current game settings
   */
  syncTitleAudioVolume() {
    if (!this.titleAudio) return;
    const effectiveVol = this.isMuted ? 0 : Math.max(0, Math.min(1, this.masterVolume * this.musicVolume));
    this.titleAudio.volume = effectiveVol;
  }

  /**
   * Checks if title track is currently playing
   */
  isTitleMusicPlaying() {
    return Boolean(this.titleAudio && !this.titleAudio.paused);
  }

  /**
   * Stops background music and ambient streams cleanly
   */
  stopMusic() {
    if (this.audioManager) {
      this.audioManager.stopMusic();
    }
    this.stopTitleThemeAudio();
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
    if (this.audioManager && this.audioManager.music) {
      this.audioManager.music.isDanger = isDanger;
      if (isDanger) this.audioManager.music.tempo = 148;
    }
    if (this.musicPlaying && this.musicType === 'combat') {
      this.musicBpm = isDanger ? 148 : 132;
    }
  }

  setVenue(venueId, roundNumber = 1) {
    if (this.audioManager) {
      this.audioManager.setVenue(venueId, roundNumber);
    }
  }

  triggerHazardWarning() {
    if (this.audioManager) {
      this.audioManager.triggerHazardWarning();
    }
  }

  updateMusicIntensity(p1Hp, p2Hp, combo) {
    if (this.audioManager) {
      this.audioManager.updateMusicIntensity(p1Hp, p2Hp, combo);
    }
  }

  runMusicSequencer() {
    // Procedural beeping sequencer permanently disabled in favor of real soundtrack
  }

  playCombatStep(step, time) {
    // Procedural square-wave hi-hat and sawtooth synthesizer permanently disabled
  }

  playTitleStep(step, time) {
    // Legacy procedural beeping tone completely purged
  }

  // =========================================================================
  // ARCADE ANNOUNCER VOICE & SYNTH STABS
  // =========================================================================

  /**
   * Speaks announcer line with speech synthesis and layered audio chime
   */
  speakAnnouncer(text, chimePitch = 440) {
    // 1. Soft Warm Chime (Harmonic sine, non-irritating)
    this.playTone(chimePitch, 'sine', 0.12, 0.08);

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
    this.init();
    if (this.audioManager) {
      const key = roundNumber === 3 ? 'roundFinal' : ('round' + roundNumber);
      this.audioManager.announce(key);
    } else {
      const text = roundNumber === 3 ? "FINAL ROUND" : `ROUND ${roundNumber}`;
      this.speakAnnouncer(text, 523.25);
    }
  }

  announceFight() {
    this.init();
    if (this.audioManager) {
      this.audioManager.playFightGong();
      this.audioManager.announce('fight');
    } else {
      this.playFightGong();
      this.speakAnnouncer("FIGHT!", 659.25);
    }
  }

  announceKO() {
    this.init();
    if (this.audioManager) {
      this.audioManager.onDecisiveKO();
    } else {
      this.playTitleThump();
      this.speakAnnouncer("K. O.!", 320);
    }
  }

  announceWinner(characterName, isPlayer1 = true) {
    this.init();
    if (this.audioManager) {
      this.audioManager.announce(isPlayer1 ? 'p1Wins' : 'p2Wins');
      this.audioManager.onMatchVictory();
    } else {
      const winnerLabel = isPlayer1 ? "PLAYER ONE WINS" : "PLAYER TWO WINS";
      this.speakAnnouncer(`${winnerLabel}!`, 783.99);
      setTimeout(() => {
        this.playFightFanfare();
      }, 450);
    }
  }
}

