/**
 * Campus Clash — Original Announcer System ("The Proctor")
 * Academic esports adjudicator callouts with dual harmonic chimes & sidechain ducking.
 * @module engine/audio/announcerSystem
 */

import { VOICES_CONFIG } from '../../../data/audio_configs/voices.config.js';

export class AnnouncerSystem {
  constructor(audioCtx, voiceBusNode, busController) {
    this.ctx = audioCtx;
    this.voiceBus = voiceBusNode;
    this.busController = busController;
    this.subtitlesEnabled = true;
    this.subtitleCallback = null;
  }

  setSubtitleCallback(cb) {
    this.subtitleCallback = cb;
  }

  /**
   * Plays the signature academic harmonic dual-tone chime
   */
  playDualChime(now) {
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(VOICES_CONFIG.announcer.chimeFreq || 520, now);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime((VOICES_CONFIG.announcer.chimeFreq || 520) * 1.5, now);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.voiceBus);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  }

  /**
   * Announces an esports line with ducking and Web Speech API / synthesized voice
   * @param {string} lineKey 'round1' | 'round2' | 'roundFinal' | 'fight' | 'ko' | 'perfect' | 'timeUp' | 'p1Wins' | 'p2Wins'
   */
  announce(lineKey) {
    const lines = VOICES_CONFIG.announcer.lines[lineKey] || ['BRAWL!'];
    const chosenText = lines[Math.floor(Math.random() * lines.length)];

    const now = this.ctx.currentTime;

    // 1. Play dual harmonic chime
    this.playDualChime(now);

    // 2. Trigger sidechain ducking on Music & Crowd
    if (this.busController) {
      this.busController.duckForAnnouncer(1.6);
    }

    // 3. Emit subtitle to HUD
    if (this.subtitleCallback) {
      this.subtitleCallback(chosenText);
    }

    // 4. Voice Delivery via Web Speech API or synthesized formant sweep
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel(); // Flush previous
        const utter = new SpeechSynthesisUtterance(chosenText);
        utter.rate = 1.08;
        utter.pitch = 0.95;
        utter.volume = 1.0;

        // Try to pick an authoritative English voice
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Daniel') || v.name.includes('Google') || v.name.includes('Male')));
        if (preferred) utter.voice = preferred;

        window.speechSynthesis.speak(utter);
      } catch (e) {
        this.fallbackSynthesizeSpeech(now);
      }
    } else {
      this.fallbackSynthesizeSpeech(now);
    }
  }

  fallbackSynthesizeSpeech(now) {
    // Procedural robot formant vocal burst fallback
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.45);

    gain.gain.setValueAtTime(0.4, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

    osc.connect(gain);
    gain.connect(this.voiceBus);

    osc.start(now + 0.08);
    osc.stop(now + 0.5);
  }
}
