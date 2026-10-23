/**
 * Campus Clash — Audio Bus Controller & Dynamic Limiter
 * Manages gain hierarchy, sidechain ducking, limiter dynamics, and esports broadcaster modes.
 * @module engine/audio/busController
 */

import { BUS_CONFIG } from '../../../data/audio_configs/buses.config.js';

export class BusController {
  constructor(audioCtx) {
    this.ctx = audioCtx;
    this.buses = {};
    this.busVolumes = {};
    this.isMuted = false;
    this.casterMode = false;
    this.streamSafeMode = false;

    // Load saved preferences
    this.loadPreferences();

    // Build the master limiter and bus graph
    this.initGraph();
  }

  loadPreferences() {
    try {
      const saved = JSON.parse(localStorage.getItem('campus_clash_audio_v2') || '{}');
      this.masterVol = typeof saved.master === 'number' ? saved.master : BUS_CONFIG.master.defaultVolume;
      this.isMuted = !!saved.muted;
      this.casterMode = !!saved.casterMode;
      this.streamSafeMode = !!saved.streamSafeMode;

      for (const [busId, cfg] of Object.entries(BUS_CONFIG.buses)) {
        this.busVolumes[busId] = typeof saved[busId] === 'number' ? saved[busId] : cfg.defaultVolume;
      }
    } catch (e) {
      this.masterVol = BUS_CONFIG.master.defaultVolume;
      for (const [busId, cfg] of Object.entries(BUS_CONFIG.buses)) {
        this.busVolumes[busId] = cfg.defaultVolume;
      }
    }
  }

  savePreferences() {
    try {
      const data = {
        master: this.masterVol,
        muted: this.isMuted,
        casterMode: this.casterMode,
        streamSafeMode: this.streamSafeMode,
        ...this.busVolumes
      };
      localStorage.setItem('campus_clash_audio_v2', JSON.stringify(data));
    } catch (e) {}
  }

  initGraph() {
    const ctx = this.ctx;

    // 1. Master Output Gain
    this.masterGain = ctx.createGain();

    // 2. Subsonic High-Pass Filter (Cuts rumble below 28Hz)
    this.subsonicFilter = ctx.createBiquadFilter();
    this.subsonicFilter.type = BUS_CONFIG.master.subsonicFilter.type;
    this.subsonicFilter.frequency.value = BUS_CONFIG.master.subsonicFilter.frequency;
    this.subsonicFilter.Q.value = BUS_CONFIG.master.subsonicFilter.Q;

    // 3. Lookahead Brickwall Master Limiter (-1.2 dB threshold, 20:1 ratio)
    this.masterLimiter = ctx.createDynamicsCompressor();
    const lim = BUS_CONFIG.master.limiter;
    this.masterLimiter.threshold.value = lim.threshold;
    this.masterLimiter.knee.value = lim.knee;
    this.masterLimiter.ratio.value = lim.ratio;
    this.masterLimiter.attack.value = lim.attack;
    this.masterLimiter.release.value = lim.release;

    // Route: MasterGain -> Subsonic -> Limiter -> Destination
    this.masterGain.connect(this.subsonicFilter);
    this.subsonicFilter.connect(this.masterLimiter);
    this.masterLimiter.connect(ctx.destination);

    // 4. Create Individual Buses
    for (const busId of Object.keys(BUS_CONFIG.buses)) {
      const busGain = ctx.createGain();
      busGain.connect(this.masterGain);
      this.buses[busId] = busGain;
    }

    // Apply initial volume levels
    this.updateGainLevels();
  }

  updateGainLevels() {
    const now = this.ctx.currentTime;
    const masterMult = this.isMuted ? 0 : this.masterVol;
    this.masterGain.gain.setValueAtTime(masterMult, now);

    for (const [busId, node] of Object.entries(this.buses)) {
      let vol = this.busVolumes[busId] || 0.8;
      if (this.casterMode) {
        if (busId === 'voice') vol *= BUS_CONFIG.casterPreset.voiceBoost;
        if (busId === 'music') vol *= BUS_CONFIG.casterPreset.musicCut;
        if (busId === 'crowd') vol *= BUS_CONFIG.casterPreset.crowdLevel;
      }
      node.gain.setTargetAtTime(vol, now, 0.02);
    }
  }

  getBus(busId) {
    return this.buses[busId] || this.masterGain;
  }

  setMasterVolume(val) {
    this.masterVol = Math.max(0, Math.min(1, val));
    this.updateGainLevels();
    this.savePreferences();
  }

  setBusVolume(busId, val) {
    if (this.busVolumes[busId] !== undefined) {
      this.busVolumes[busId] = Math.max(0, Math.min(1, val));
      this.updateGainLevels();
      this.savePreferences();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.updateGainLevels();
    this.savePreferences();
    return this.isMuted;
  }

  setCasterMode(enabled) {
    this.casterMode = !!enabled;
    this.updateGainLevels();
    this.savePreferences();
  }

  setStreamSafeMode(enabled) {
    this.streamSafeMode = !!enabled;
    this.savePreferences();
  }

  /**
   * Applies dynamic sidechain ducking to music and crowd when announcer speaks
   * @param {number} durationSeconds 
   */
  duckForAnnouncer(durationSeconds = 1.5) {
    const musicBus = this.buses.music;
    const crowdBus = this.buses.crowd;
    if (!musicBus || !crowdBus) return;

    const now = this.ctx.currentTime;
    const duckCfg = BUS_CONFIG.ducking.announcer;
    const targetMusicDb = duckCfg.musicDuckDb;
    const musicScale = Math.pow(10, targetMusicDb / 20); // e.g. -8dB = ~0.398

    const curMusicVol = this.busVolumes.music || 0.6;
    musicBus.gain.setTargetAtTime(curMusicVol * musicScale, now, duckCfg.attackMs * 0.001);
    musicBus.gain.setTargetAtTime(curMusicVol, now + durationSeconds, duckCfg.releaseMs * 0.001);
  }

  /**
   * Match-ending decisive KO impact ducking
   */
  duckForMatchEndingKO() {
    const musicBus = this.buses.music;
    if (!musicBus) return;

    const now = this.ctx.currentTime;
    const duckCfg = BUS_CONFIG.ducking.matchEndingKO;
    const scale = Math.pow(10, duckCfg.musicDuckDb / 20); // -18dB

    const curMusicVol = this.busVolumes.music || 0.6;
    // Instant drop
    musicBus.gain.setTargetAtTime(curMusicVol * scale, now, duckCfg.attackMs * 0.001);
    // Recover after hold
    musicBus.gain.setTargetAtTime(curMusicVol, now + duckCfg.holdMs * 0.001, duckCfg.releaseMs * 0.001);
  }
}
