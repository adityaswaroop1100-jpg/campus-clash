/**
 * Campus Clash — Master Esports Audio Manager
 * Coordinates the complete 7-bus Web Audio graph, hit stack, spatial acoustics,
 * adaptive music, announcer, and voice priority systems.
 * @module engine/audio/audioManager
 */

import { BusController } from './busController.js?v=2.6.0';
import { VoiceLimiter } from './voiceLimiter.js?v=2.6.0';
import { HitSoundStack } from './hitSoundStack.js?v=2.6.0';
import { SpatialAcoustics } from './spatialAcoustics.js?v=2.6.0';
import { AnnouncerSystem } from './announcerSystem.js?v=2.6.0';
import { AdaptiveMusic } from './adaptiveMusic.js?v=2.6.0';
import { CrowdSystem } from './crowdSystem.js?v=2.6.0';
import { BUS_CONFIG } from '../../../data/audio_configs/buses.config.js?v=2.6.0';

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;

    // Subsystems (instantiated upon init on first user gesture)
    this.busController = null;
    this.voiceLimiter = null;
    this.hitStack = null;
    this.spatial = null;
    this.announcer = null;
    this.music = null;
    this.crowd = null;

    // Foley surface state
    this.lastFootstepTime = 0;
  }

  /**
   * Initializes AudioContext upon first user interaction to satisfy browser autoplay policies
   */
  init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      console.warn('[AudioManager] Web Audio API not supported in this browser.');
      return;
    }

    this.ctx = new AudioCtx();
    this.isInitialized = true;

    // 1. Bus Controller & Master Limiter
    this.busController = new BusController(this.ctx);

    // 2. Voice Limiter
    const limits = {};
    for (const [k, v] of Object.entries(BUS_CONFIG.buses)) {
      limits[k] = v.maxPolyphony;
    }
    this.voiceLimiter = new VoiceLimiter(limits);

    // 3. Combat Hit Stack (Transient + Body + Sub-Boom)
    this.hitStack = new HitSoundStack(this.ctx, this.busController.getBus('sfx'), this.voiceLimiter);

    // 4. Spatial Acoustics & Convolution Reverb
    this.spatial = new SpatialAcoustics(this.ctx, this.busController.getBus('venue'));

    // 5. Announcer ("The Proctor")
    this.announcer = new AnnouncerSystem(this.ctx, this.busController.getBus('voice'), this.busController);

    // 6. Adaptive Music Sequencer
    this.music = new AdaptiveMusic(this.ctx, this.busController.getBus('music'), this.busController);

    // 7. Reactive Crowd
    this.crowd = new CrowdSystem(this.ctx, this.busController.getBus('crowd'));

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- UI SOUNDS ---
  playHoverTick() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const freq = 1200 + (Math.random() - 0.5) * 80;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
    osc.connect(gain);
    gain.connect(this.busController.getBus('ui'));
    osc.start(now);
    osc.stop(now + 0.03);
  }

  playConfirmClick() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(960, now + 0.06);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.busController.getBus('ui'));
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playCancel() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.busController.getBus('ui'));
    osc.start(now);
    osc.stop(now + 0.13);
  }

  playCountdownPip(stepNum) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const freq = 440 + (3 - stepNum) * 120; // 440, 560, 680
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.busController.getBus('ui'));
    osc.start(now);
    osc.stop(now + 0.13);
  }

  playFightGong() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.8);
    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    osc.connect(gain);
    gain.connect(this.busController.getBus('ui'));
    osc.start(now);
    osc.stop(now + 0.9);
  }

  // --- COMBAT HITS ---
  playHit(hitType = 'light', comboHits = 0, xPos = 480) {
    if (!this.ctx) this.init();
    if (this.hitStack) {
      this.hitStack.playHit(hitType, comboHits, xPos);
    }
  }

  // --- MOVEMENT & FOLEY ---
  playFootstep(surface = 'concrete', xPos = 480) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    const now = performance.now();
    if (now - this.lastFootstepTime < 95) return; // Debounce rapid steps
    this.lastFootstepTime = now;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const freqs = { concrete: 160, metal: 320, cyber: 440, stone: 120 };
    osc.type = surface === 'metal' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime((freqs[surface] || 160) * (0.95 + Math.random() * 0.1), t);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.busController.getBus('movement'));
    osc.start(t);
    osc.stop(t + 0.06);
  }

  playJump() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.08);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(gain);
    gain.connect(this.busController.getBus('movement'));
    osc.start(t);
    osc.stop(t + 0.1);
  }

  playDash() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.14);
    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.busController.getBus('movement'));
    osc.start(t);
    osc.stop(t + 0.16);
  }

  // --- ANNOUNCER ---
  announce(lineKey) {
    if (!this.ctx) this.init();
    if (this.announcer) {
      this.announcer.announce(lineKey);
    }
  }

  // --- VENUES & AMBIENCE ---
  setVenue(venueId, roundNumber = 1) {
    if (!this.ctx) this.init();
    if (this.spatial) {
      this.spatial.setVenue(venueId, roundNumber);
    }
  }

  triggerHazardWarning() {
    if (this.spatial) {
      this.spatial.triggerHazardWarning();
    }
  }

  // --- ADAPTIVE MUSIC ---
  startCombatMusic() {
    if (!this.ctx) this.init();
    if (this.music) {
      this.music.startCombatMusic();
    }
    if (this.crowd) {
      this.crowd.startAmbientMurmur();
    }
  }

  startTitleMusic() {
    if (!this.ctx) this.init();
    if (this.music) {
      this.music.startTitleMusic();
    }
  }

  stopMusic() {
    if (this.music) {
      this.music.stop();
    }
    if (this.crowd) {
      this.crowd.stop();
    }
  }

  updateMusicIntensity(p1Health, p2Health, comboHits) {
    if (this.music) {
      this.music.updateIntensity(p1Health, p2Health, comboHits);
    }
    if (this.crowd && comboHits >= 5) {
      this.crowd.swellOnCombo(comboHits);
    }
  }

  onDecisiveKO() {
    if (this.busController) {
      this.busController.duckForMatchEndingKO();
    }
    if (this.crowd) {
      this.crowd.triggerKORoar();
    }
    this.announce('ko');
  }

  onMatchVictory() {
    if (this.music) {
      this.music.playVictoryFanfare();
    }
  }
}
