/**
 * Campus Clash — 3D Spatial Acoustics & Venue Convolution Reverb
 * Synthesizes venue-specific room impulse responses and handles 3D ambient emitters.
 * @module engine/audio/spatialAcoustics
 */

import { VENUES_AUDIO_CONFIG } from '../../../data/audio_configs/venues.config.js?v=2.6.0';

export class SpatialAcoustics {
  constructor(audioCtx, venueBusNode) {
    this.ctx = audioCtx;
    this.venueBus = venueBusNode;
    this.currentVenueId = 'neonoctagon';
    this.activeEmitters = [];
    this.hazardOsc = null;

    // Convolution Node & Wet/Dry Routing
    this.convolver = this.ctx.createConvolver();
    this.wetGain = this.ctx.createGain();
    this.dryGain = this.ctx.createGain();

    this.convolver.connect(this.wetGain);
    this.wetGain.connect(this.venueBus);
    this.dryGain.connect(this.venueBus);

    // Damping Biquad Filter to model acoustic wall absorption
    this.reverbFilter = this.ctx.createBiquadFilter();
    this.reverbFilter.type = 'lowpass';
    this.reverbFilter.connect(this.convolver);

    // Generate initial impulse response for default venue
    this.setVenue('neonoctagon');
  }

  /**
   * Mathematically creates an impulse response buffer for room convolution
   * @param {number} durationSeconds RT60 decay time
   * @param {number} decayRate exponential decay steepness
   */
  generateImpulseResponse(durationSeconds = 1.2, decayRate = 2.5) {
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * durationSeconds);
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Exponential decay envelope
      const env = Math.exp(-decayRate * t);
      // Random stereo diffusion reflections
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }

    return impulse;
  }

  /**
   * Configures venue spatial acoustic model and builds impulse response
   * @param {string} venueId 
   * @param {number} roundNumber (for Archive Vault tri-era shift)
   */
  setVenue(venueId = 'neonoctagon', roundNumber = 1) {
    this.currentVenueId = venueId;
    const cfg = VENUES_AUDIO_CONFIG[venueId] || VENUES_AUDIO_CONFIG.neonoctagon;

    let reverbCfg = cfg.reverb;
    if (venueId === 'archivevault') {
      const eraKey = roundNumber === 1 ? 'round1' : (roundNumber === 2 ? 'round2' : 'round3');
      reverbCfg = cfg.reverb[eraKey] || cfg.reverb.round1;
    }

    const rt60 = reverbCfg.rt60 || 1.2;
    const damping = reverbCfg.damping || 3000;
    const wetRatio = reverbCfg.wetDryRatio || 0.3;

    // Apply damping filter
    this.reverbFilter.frequency.setValueAtTime(damping, this.ctx.currentTime);

    // Generate new impulse response
    this.convolver.buffer = this.generateImpulseResponse(rt60, 3.2 / rt60);

    // Set Wet / Dry mix
    this.wetGain.gain.setValueAtTime(wetRatio, this.ctx.currentTime);
    this.dryGain.gain.setValueAtTime(1.0 - wetRatio * 0.5, this.ctx.currentTime);

    // Stop and restart venue ambient emitters
    this.startAmbientEmitters(cfg.emitters || []);
  }

  startAmbientEmitters(emitters) {
    // Disabled continuous ambient oscillators to guarantee zero background beeps
    this.stopAmbientEmitters();
  }

  stopAmbientEmitters() {
    for (const em of this.activeEmitters) {
      try {
        em.osc.stop();
        em.osc.disconnect();
      } catch (e) {}
    }
    this.activeEmitters = [];
  }

  /**
   * Triggers a venue hazard warning cue (e.g. Modular Arena pneumatic floor shift)
   */
  triggerHazardWarning() {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.setValueAtTime(820, now + 0.18);
    osc.frequency.setValueAtTime(680, now + 0.36);
    osc.frequency.setValueAtTime(820, now + 0.54);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);

    osc.connect(gain);
    gain.connect(this.venueBus);

    osc.start(now);
    osc.stop(now + 0.92);
  }
}
