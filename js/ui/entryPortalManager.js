/**
 * Campus Clash / Aaruush Quest — Entry Portal Manager
 * Controls the cyber registration screen, participant validation, and Supabase syncing.
 * @module ui/entryPortalManager
 */

import { supabaseService } from '../database/supabaseClient.js';
import { GAME_MODES } from '../utils/constants.js';

export class EntryPortalManager {
  constructor(game) {
    this.game = game;
    this.portalEl = document.getElementById('pilot-clearance-modal') || document.getElementById('entry-portal');
    this.form = document.getElementById('portal-reg-form');
    this.nameInput = document.getElementById('entry-name');
    this.regNoInput = document.getElementById('entry-regno');
    this.srmMailInput = document.getElementById('entry-srmmail');
    this.partIdInput = document.getElementById('entry-partid');
    this.phoneInput = document.getElementById('entry-phone');
    this.alertBox = document.getElementById('entry-alert-box');
    this.submitBtn = document.getElementById('btn-start-quest');

    // Modals
    this.briefingBtn = document.getElementById('portal-btn-briefing');
    this.scheduleBtn = document.getElementById('portal-btn-schedule');
    this.soundBtn = document.getElementById('portal-btn-sound');
    this.briefingModal = document.getElementById('briefing-modal');
    this.scheduleModal = document.getElementById('schedule-modal');

    this.isMuted = false;
    this.init();
  }

  init() {
    this.prefillSavedData();
    this.initEventListeners();
  }

  prefillSavedData() {
    const participant = supabaseService.getCurrentParticipant();
    if (participant) {
      if (this.nameInput && participant.name) this.nameInput.value = participant.name;
      if (this.regNoInput && participant.registration_number) this.regNoInput.value = participant.registration_number;
      if (this.srmMailInput && participant.srm_mail_id) this.srmMailInput.value = participant.srm_mail_id;
      if (this.partIdInput && participant.participation_id) this.partIdInput.value = participant.participation_id;
      if (this.phoneInput && participant.phone_number) this.phoneInput.value = participant.phone_number;
      if (this.submitBtn) {
        this.submitBtn.innerHTML = '<span>ENTER ARENA 🚀</span>';
      }
    }
  }

  initEventListeners() {
    // Shield all input fields from any window-level key handlers
    const inputElements = [this.nameInput, this.regNoInput, this.srmMailInput, this.partIdInput, this.phoneInput];
    inputElements.forEach(inp => {
      if (!inp) return;
      inp.addEventListener('keydown', (e) => e.stopPropagation());
      inp.addEventListener('keyup', (e) => e.stopPropagation());
      inp.addEventListener('keypress', (e) => e.stopPropagation());
    });

    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleRegistration();
      });
    }

    if (this.briefingBtn && this.briefingModal) {
      this.briefingBtn.addEventListener('click', () => {
        this.briefingModal.classList.remove('hidden');
        if (this.game && this.game.sound) this.game.sound.playLightHit();
      });
    }

    if (this.scheduleBtn && this.scheduleModal) {
      this.scheduleBtn.addEventListener('click', () => {
        this.scheduleModal.classList.remove('hidden');
        if (this.game && this.game.sound) this.game.sound.playLightHit();
      });
    }

    if (this.soundBtn) {
      this.soundBtn.addEventListener('click', () => {
        this.isMuted = !this.isMuted;
        this.soundBtn.textContent = this.isMuted ? '🔇' : '🔊';
        if (this.game && this.game.sound) {
          if (this.isMuted) this.game.sound.mute();
          else this.game.sound.unmute();
        }
      });
    }

    this.fullscreenBtn = document.getElementById('portal-btn-fullscreen');
    if (this.fullscreenBtn) {
      this.fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        }
      });
    }

    // Modal close buttons
    document.querySelectorAll('.portal-modal-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.portal-modal');
        if (modal) modal.classList.add('hidden');
      });
    });

    // Close modals on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.briefingModal) this.briefingModal.classList.add('hidden');
        if (this.scheduleModal) this.scheduleModal.classList.add('hidden');
      }
    });
  }

  showAlert(message, isError = true) {
    if (!this.alertBox) return;
    this.alertBox.className = `portal-alert ${isError ? 'error' : 'success'}`;
    this.alertBox.textContent = message;
    this.alertBox.classList.remove('hidden');
  }

  hideAlert() {
    if (this.alertBox) this.alertBox.classList.add('hidden');
  }

  async handleRegistration() {
    const name = this.nameInput ? this.nameInput.value.trim() : '';
    const regNo = this.regNoInput ? this.regNoInput.value.trim().toUpperCase() : '';
    const srmMail = this.srmMailInput ? this.srmMailInput.value.trim().toLowerCase() : '';
    const partId = this.partIdInput ? this.partIdInput.value.trim().toUpperCase() : '';
    const phone = this.phoneInput ? this.phoneInput.value.trim() : '';

    // Validation
    if (!name || name.length < 2) {
      this.showAlert('⚠️ Please enter your full name.');
      if (this.nameInput) this.nameInput.focus();
      return;
    }

    if (!regNo || regNo.length < 5) {
      this.showAlert('⚠️ Please enter a valid Registration Number (e.g. RA2511026010269).');
      if (this.regNoInput) this.regNoInput.focus();
      return;
    }

    if (!srmMail || !srmMail.includes('@')) {
      this.showAlert('⚠️ Please enter a valid SRM Mail ID (e.g. as1234@srmist.edu.in).');
      if (this.srmMailInput) this.srmMailInput.focus();
      return;
    }

    if (!partId) {
      this.showAlert('⚠️ Please enter your Participation ID (e.g. AR-9842).');
      if (this.partIdInput) this.partIdInput.focus();
      return;
    }

    if (!phone || phone.replace(/\D/g, '').length < 10) {
      this.showAlert('⚠️ Please enter a valid 10-digit Phone Number.');
      if (this.phoneInput) this.phoneInput.focus();
      return;
    }

    this.hideAlert();
    if (this.submitBtn) {
      this.submitBtn.disabled = true;
      this.submitBtn.innerHTML = '<span>SYNCING CLEARANCE... ⚡</span>';
    }

    try {
      // 1. Save directly into Supabase database table
      const res = await supabaseService.registerParticipant({
        name,
        regNo,
        srmMail,
        partId,
        phone
      });

      this.showAlert('✅ CLEARANCE GRANTED! ENTERING ARENA...', false);

      // Play start sound
      if (this.game && this.game.sound) {
        this.game.sound.init();
        this.game.sound.playFightFanfare();
      }

      // Smoothly transition into game
      setTimeout(() => {
        this.enterGame();
      }, 700);

    } catch (err) {
      console.warn('[Registration Exception]', err);
      // Still allow playing if offline
      this.enterGame();
    }
  }

  enterGame() {
    if (this.portalEl) {
      this.portalEl.classList.add('hidden');
    }
    // Update player 1 name in game
    if (this.game && this.nameInput && this.nameInput.value.trim()) {
      const playerName = this.nameInput.value.trim();
      if (this.game.p1 && this.game.p1.config) {
        this.game.p1.config.displayName = playerName;
      }
    }
    // Update pilot badge on top marquee
    if (this.game && this.game.landingScene && this.game.landingScene.updatePilotStatus) {
      this.game.landingScene.updatePilotStatus();
    }
    // Smoothly enter chosen combat protocol
    if (this.game && this.game.landingScene && this.game.landingScene.triggerFightTransition) {
      const mode = this.game.landingScene.pendingMode || GAME_MODES.PVC;
      setTimeout(() => {
        this.game.landingScene.triggerFightTransition(mode);
      }, 200);
    }
  }
}
