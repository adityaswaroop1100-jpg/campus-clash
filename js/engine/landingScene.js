/**
 * Campus Clash 2D — Landing Page & Title Screen Scene Controller
 * Procedural SRM Tech Park Parallax Skyline, Rotating Spotlights,
 * Academic Dust FX (Layer 2), Versus Silhouettes, and Audio Sync.
 * @module engine/landingScene
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT, GAME_SCREENS, GAME_MODES } from '../utils/constants.js';

export class LandingScene {
  /**
   * @param {Object} game - Reference to main CampusClashGame instance
   */
  constructor(game) {
    this.game = game;
    this.canvas = game.canvas;
    this.ctx = game.ctx;
    this.sound = game.sound;
    this.screenShake = game.screenShake;

    // Layer 1 DOM Elements
    this.overlay = document.getElementById('landing-overlay');
    this.titleContainer = document.getElementById('landing-title-container');
    this.menuBtns = Array.from(document.querySelectorAll('.cabinet-menu-btn'));
    this.creditsModal = document.getElementById('credits-modal');
    this.creditsCloseBtn = document.getElementById('credits-close-btn');

    // Cyber Modals
    this.clearanceModal = document.getElementById('pilot-clearance-modal');
    this.modeSelectModal = document.getElementById('mode-select-modal');
    this.briefingModal = document.getElementById('briefing-modal');

    // Layer 2 Particles Canvas
    this.fxCanvas = document.getElementById('particles-canvas');
    this.fxCtx = this.fxCanvas ? this.fxCanvas.getContext('2d') : null;
    if (this.fxCanvas) {
      this.fxCanvas.width = CANVAS_WIDTH;
      this.fxCanvas.height = CANVAS_HEIGHT;
    }

    // Menu State
    this.selectedIndex = 0;
    this.isTransitioning = false;
    this.isCreditsOpen = false;
    this.isClearanceOpen = false;
    this.isModeSelectOpen = false;

    // Animation Timers & Parallax Offsets
    this.time = 0;
    this.bgSkylineX = 0;
    this.fgSkylineX = 0;
    this.lastThumpTime = 0;
    this.coinCredits = 1;

    // Procedural Spotlight Angles
    this.spotlightCyanAngle = -Math.PI / 4;
    this.spotlightGoldAngle = -3 * Math.PI / 4;

    // Academic Dust & Fireflies Particles for Layer 2
    this.dustParticles = [];
    this.initDustParticles(45);

    // Bind DOM Listeners
    this.setupDOMEvents();
    this.updatePilotStatus();
  }

  initDustParticles(count) {
    this.dustParticles = [];
    for (let i = 0; i < count; i++) {
      this.dustParticles.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.4 - Math.random() * 0.8,
        size: 1.5 + Math.random() * 3.5,
        isSquare: Math.random() > 0.4,
        color: ['#ffd602', '#fe6b00', '#00f0ff'][Math.floor(Math.random() * 3)],
        alpha: 0.2 + Math.random() * 0.7,
        pulseSpeed: 0.02 + Math.random() * 0.04,
        pulsePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.03 + Math.random() * 0.03,
        wobblePhase: Math.random() * Math.PI * 2
      });
    }
  }

  setupDOMEvents() {
    if (!this.overlay) return;

    // Hover sound & index sync for menu buttons
    this.menuBtns.forEach((btn, index) => {
      btn.addEventListener('mouseenter', () => {
        if (this.isTransitioning || this.isCreditsOpen || this.isClearanceOpen || this.isModeSelectOpen) return;
        this.sound.init();
        if (this.selectedIndex !== index) {
          this.setSelectedIndex(index);
          this.sound.playMenuBlip();
        }
      });

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.sound.init();
        if (this.isTransitioning || this.isCreditsOpen || this.isClearanceOpen || this.isModeSelectOpen) return;
        this.selectOption(index);
      });
    });

    // Credits Modal Close
    if (this.creditsCloseBtn) {
      this.creditsCloseBtn.addEventListener('click', () => {
        this.closeCredits();
      });
    }

    if (this.creditsModal) {
      this.creditsModal.addEventListener('click', (e) => {
        if (e.target === this.creditsModal) {
          this.closeCredits();
        }
      });
    }

    // Interactive Coin Slot
    const coinSlot = document.getElementById('deck-coin-slot');
    if (coinSlot) {
      coinSlot.addEventListener('click', () => {
        this.sound.init();
        this.sound.playCoinInsert();
        this.coinCredits++;
        const counter = document.getElementById('deck-coin-counter');
        if (counter) {
          counter.textContent = `CREDIT ${this.coinCredits < 10 ? '0' + this.coinCredits : this.coinCredits}`;
          counter.style.borderColor = '#00f0ff';
          counter.style.color = '#00f0ff';
          setTimeout(() => {
            if (counter) {
              counter.style.borderColor = 'rgba(255, 214, 2, 0.4)';
              counter.style.color = '#ffffff';
            }
          }, 400);
        }
      });
    }

    // Bottom Nav Links
    const navFs = document.getElementById('deck-nav-fullscreen');
    if (navFs) {
      navFs.addEventListener('click', () => {
        this.toggleFullscreen();
      });
    }

    const navCred = document.getElementById('deck-nav-credits');
    if (navCred) {
      navCred.addEventListener('click', () => {
        this.openCredits();
      });
    }

    // Top Header Buttons
    const rigFs = document.getElementById('rig-btn-fullscreen');
    if (rigFs) {
      rigFs.addEventListener('click', () => {
        this.toggleFullscreen();
      });
    }

    const rigSound = document.getElementById('rig-btn-sound');
    if (rigSound) {
      rigSound.addEventListener('click', () => {
        this.sound.init();
        this.sound.isMuted = !this.sound.isMuted;
        const soundText = document.getElementById('rig-sound-icon');
        if (soundText) {
          soundText.textContent = this.sound.isMuted ? '🔇 MUTED' : '🔊 SOUND';
        }
      });
    }

    const rigBriefing = document.getElementById('rig-btn-briefing');
    if (rigBriefing && this.briefingModal) {
      rigBriefing.addEventListener('click', () => {
        this.briefingModal.classList.remove('hidden');
        this.sound.playLightHit();
      });
    }

    // Pilot Status Chip (Click to open / update Clearance)
    const pilotChip = document.getElementById('pilot-status-chip');
    if (pilotChip) {
      pilotChip.addEventListener('click', () => {
        this.openClearanceModal();
      });
    }

    // Clearance Modal Close & Guest Play
    const closeClearance = document.getElementById('btn-close-clearance');
    if (closeClearance) {
      closeClearance.addEventListener('click', () => {
        this.closeClearanceModal();
      });
    }

    const guestPlay = document.getElementById('btn-guest-play');
    if (guestPlay) {
      guestPlay.addEventListener('click', () => {
        this.closeClearanceModal();
        this.openModeSelectModal();
      });
    }

    // Mode Select Modal Buttons
    const modePvc = document.getElementById('mode-btn-pvc');
    if (modePvc) {
      modePvc.addEventListener('click', () => {
        this.closeModeSelectModal();
        this.triggerFightTransition(GAME_MODES.PVC);
      });
    }

    const modePvp = document.getElementById('mode-btn-pvp');
    if (modePvp) {
      modePvp.addEventListener('click', () => {
        this.closeModeSelectModal();
        this.triggerFightTransition(GAME_MODES.PVP);
      });
    }

    const closeModeSelect = document.getElementById('btn-close-mode-select');
    if (closeModeSelect) {
      closeModeSelect.addEventListener('click', () => {
        this.closeModeSelectModal();
      });
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  updatePilotStatus() {
    const chipText = document.getElementById('pilot-status-text');
    if (!chipText) return;
    try {
      const stored = localStorage.getItem('campus_clash_current_participant');
      if (stored) {
        const participant = JSON.parse(stored);
        if (participant && participant.name) {
          chipText.textContent = `PILOT: ${participant.name.toUpperCase()} [${participant.registration_number || 'VERIFIED'}]`;
          return;
        }
      }
    } catch (e) {}
    chipText.textContent = 'PILOT: CLEARANCE PENDING';
  }

  openClearanceModal() {
    if (this.clearanceModal) {
      this.isClearanceOpen = true;
      this.clearanceModal.classList.remove('hidden');
      this.sound.playLightHit();
    }
  }

  closeClearanceModal() {
    if (this.clearanceModal) {
      this.isClearanceOpen = false;
      this.clearanceModal.classList.add('hidden');
      this.sound.playCancel ? this.sound.playCancel() : this.sound.playLightHit();
    }
  }

  openModeSelectModal() {
    if (this.modeSelectModal) {
      this.isModeSelectOpen = true;
      this.modeSelectModal.classList.remove('hidden');
      this.sound.playLightHit();
    }
  }

  closeModeSelectModal() {
    if (this.modeSelectModal) {
      this.isModeSelectOpen = false;
      this.modeSelectModal.classList.add('hidden');
      this.sound.playCancel ? this.sound.playCancel() : this.sound.playLightHit();
    }
  }

  setSelectedIndex(index) {
    this.selectedIndex = Math.max(0, Math.min(index, this.menuBtns.length - 1));
    this.menuBtns.forEach((btn, idx) => {
      if (idx === this.selectedIndex) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  }

  tiltJoystick(direction) {
    const stick1 = document.getElementById('deck-stick-p1');
    const stick2 = document.getElementById('deck-stick-p2');
    [stick1, stick2].forEach(st => {
      if (!st) return;
      st.className = `deck-joystick tilt-${direction}`;
      setTimeout(() => {
        if (st) st.className = 'deck-joystick';
      }, 180);
    });
  }

  handleKeyDown(e) {
    if (this.isTransitioning) return;

    // Modal intercepts
    if (this.isClearanceOpen) {
      if (e.code === 'Escape') this.closeClearanceModal();
      return;
    }

    if (this.isModeSelectOpen) {
      if (e.code === 'Escape') {
        this.closeModeSelectModal();
      } else if (e.code === 'Digit1' || e.code === 'KeyC') {
        this.closeModeSelectModal();
        this.triggerFightTransition(GAME_MODES.PVC);
      } else if (e.code === 'Digit2' || e.code === 'KeyP') {
        this.closeModeSelectModal();
        this.triggerFightTransition(GAME_MODES.PVP);
      }
      return;
    }

    if (this.isCreditsOpen) {
      if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') {
        this.closeCredits();
      }
      return;
    }

    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      this.tiltJoystick('up');
      this.setSelectedIndex((this.selectedIndex - 1 + this.menuBtns.length) % this.menuBtns.length);
      this.sound.playMenuBlip();
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      this.tiltJoystick('down');
      this.setSelectedIndex((this.selectedIndex + 1) % this.menuBtns.length);
      this.sound.playMenuBlip();
    } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      this.tiltJoystick('left');
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      this.tiltJoystick('right');
    } else if (e.code === 'Enter' || e.code === 'Space') {
      this.selectOption(this.selectedIndex);
    } else if (e.code === 'KeyF') {
      this.toggleFullscreen();
    } else if (e.code === 'Escape') {
      this.openCredits();
    }
  }

  selectOption(index) {
    if (this.isTransitioning) return;

    if (index === 0) {
      // [ FIGHT ! ] Option
      let hasRegistered = false;
      try {
        const stored = localStorage.getItem('campus_clash_current_participant');
        if (stored) {
          const p = JSON.parse(stored);
          if (p && p.name && p.registration_number) hasRegistered = true;
        }
      } catch (e) {}

      if (!hasRegistered) {
        this.openClearanceModal();
      } else {
        this.openModeSelectModal();
      }
    } else if (index === 1) {
      // [ TRAINING ] Option
      this.triggerFightTransition(GAME_MODES.TRAINING);
    } else if (index === 2) {
      // [ LEADERBOARD ] Option
      if (this.game.leaderboardManager) {
        this.game.leaderboardManager.open();
        this.sound.playLightHit();
      }
    } else if (index === 3) {
      // [ CREDITS ] Option
      this.openCredits();
    }
  }

  openCredits() {
    if (this.creditsModal) {
      this.isCreditsOpen = true;
      this.creditsModal.classList.add('active');
      this.sound.playLightHit();
    }
  }

  closeCredits() {
    if (this.creditsModal && this.isCreditsOpen) {
      this.isCreditsOpen = false;
      this.creditsModal.classList.remove('active');
      this.sound.playCancel();
    }
  }

  triggerFightTransition(mode = GAME_MODES.PVP) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.game.selectedMode = mode;

    // 1. Play Triumphant Arcade Fanfare
    this.sound.playFightFanfare();

    // 2. Trigger 1-second Camera Trauma Shake (60 frames)
    this.screenShake.shake(14, 60);

    // 3. Add Screen Distortion / Crush Animation
    if (this.overlay) {
      this.overlay.classList.add('crush-transition');
    }

    // 4. Smooth Transition to Character Select after 1 second (1000ms)
    setTimeout(() => {
      if (this.overlay) {
        this.overlay.classList.add('hidden');
        this.overlay.classList.remove('crush-transition');
      }
      this.isTransitioning = false;
      this.game.currentScreen = GAME_SCREENS.CHAR_SELECT;
      this.game.charSelectStep = 0;
      this.game.openCharSelect();
    }, 1000);
  }

  show() {
    if (this.overlay) {
      this.overlay.classList.remove('hidden');
      this.overlay.classList.remove('crush-transition');
    }
    this.isTransitioning = false;
    this.isCreditsOpen = false;
    if (this.creditsModal) {
      this.creditsModal.classList.remove('active');
    }
    this.setSelectedIndex(0);
  }

  hide() {
    if (this.overlay) {
      this.overlay.classList.add('hidden');
    }
  }

  // =========================================================================
  // UPDATE LOOP (60 FPS)
  // =========================================================================
  update(dt) {
    this.time += 0.025;

    // Audio Sync: Trigger deep thump on title pulse peak every 2.2s (~132 frames)
    const pulseCycle = Math.sin(this.time * 2.85);
    if (pulseCycle > 0.98 && Date.now() - this.lastThumpTime > 1800) {
      this.lastThumpTime = Date.now();
      if (!this.isTransitioning && !this.isCreditsOpen && this.game.currentScreen === GAME_SCREENS.LANDING) {
        this.sound.playTitleThump();
      }
    }

    // Parallax Skyline Scrolls
    this.bgSkylineX = (this.bgSkylineX + 0.22) % 480;
    this.fgSkylineX = (this.fgSkylineX + 0.52) % 480;

    // Spotlights Oscillating Sweeps
    // Cyan from bottom-left corner
    this.spotlightCyanAngle = -Math.PI / 4 + Math.sin(this.time * 0.9) * 0.28;
    // Gold from bottom-right corner
    this.spotlightGoldAngle = -3 * Math.PI / 4 + Math.cos(this.time * 0.85) * 0.28;

    // Update Academic Dust Particles
    for (const p of this.dustParticles) {
      p.y += p.vy;
      p.x += p.vx + Math.sin(this.time * 2 + p.wobblePhase) * 0.35;
      p.pulsePhase += p.pulseSpeed;

      // Wrap around screen boundaries
      if (p.y < -10) {
        p.y = CANVAS_HEIGHT + 10;
        p.x = Math.random() * CANVAS_WIDTH;
      }
      if (p.x < -10) p.x = CANVAS_WIDTH + 10;
      if (p.x > CANVAS_WIDTH + 10) p.x = -10;
    }
  }

  // =========================================================================
  // RENDER LAYER 0 (Game Canvas Background, Spotlights, Parallax, Silhouettes)
  // =========================================================================
  renderBackground(ctx) {
    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;

    ctx.save();
    this.screenShake.apply(ctx);

    // 1. Primary Deep Charcoal/Navy with Solar Flare upper ambient
    const bgGrad = ctx.createRadialGradient(w / 2, h * 0.35, 30, w / 2, h / 2, w * 0.78);
    bgGrad.addColorStop(0, 'rgba(254, 107, 0, 0.16)');
    bgGrad.addColorStop(0.35, '#0c162c');
    bgGrad.addColorStop(0.75, '#070c18');
    bgGrad.addColorStop(1, '#04060c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 3 Radial Pulse Rings (Dual Solar Gold & Cyan)
    const pulseT = (this.time * 0.8) % 1;
    for (let i = 0; i < 3; i++) {
      const offset = (pulseT + i / 3) % 1;
      const r = offset * 340;
      const a = (1 - offset) * 0.08;
      ctx.save();
      ctx.strokeStyle = i % 2 === 0 ? `rgba(255, 214, 2, ${a})` : `rgba(0, 240, 255, ${a})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Subtle Retro Cyber-Grid at Floor & Distance
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Parallax Skyline (Distant & Mid SRM Architecture)
    this.renderParallaxSkyline(ctx, w, h);

    // 4. Rotating Spotlights Sweep (Intersecting Title Area with Additive Blend)
    this.renderSpotlights(ctx, w, h);

    // 5. Dynamic Versus Silhouettes (Bottom 10% preview: Topper vs Backbencher)
    this.renderVersusSilhouettes(ctx, w, h);

    ctx.restore();

    // 6. Render Layer 2 Top Particles Canvas (Academic Dust)
    this.renderLayer2Particles();
  }

  // =========================================================================
  // SRM TECH PARK PARALLAX SKYLINE
  // =========================================================================
  renderParallaxSkyline(ctx, w, h) {
    const groundBase = h - 35;

    // --- Layer A: Distant Silhouette (University Building & Spires, 0.22 px speed) ---
    ctx.save();
    ctx.fillStyle = '#081224';
    const distOffset = -this.bgSkylineX;

    for (let repeat = -1; repeat <= 2; repeat++) {
      const baseX = repeat * 480 + distOffset;

      // UB Tall Central Tower
      ctx.fillRect(baseX + 160, groundBase - 180, 80, 180);
      // Pyramid / Crown Roof
      ctx.beginPath();
      ctx.moveTo(baseX + 155, groundBase - 180);
      ctx.lineTo(baseX + 200, groundBase - 220);
      ctx.lineTo(baseX + 245, groundBase - 180);
      ctx.closePath();
      ctx.fill();

      // Campus Antenna Spire
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(baseX + 200, groundBase - 220);
      ctx.lineTo(baseX + 200, groundBase - 250);
      ctx.stroke();

      // Adjacent academic blocks
      ctx.fillRect(baseX + 240, groundBase - 140, 100, 140);
      ctx.fillRect(baseX + 60, groundBase - 120, 100, 120);
      ctx.fillRect(baseX + 340, groundBase - 90, 80, 90);
      ctx.fillRect(baseX + 0, groundBase - 100, 60, 100);
    }
    ctx.restore();

    // --- Layer B: Foreground SRM Tech Park Facade with Glowing Windows (0.52 px speed) ---
    ctx.save();
    const fgOffset = -this.fgSkylineX;

    for (let repeat = -1; repeat <= 2; repeat++) {
      const baseX = repeat * 480 + fgOffset;

      // Tech Park Glass Towers Facade
      const tpGrad = ctx.createLinearGradient(0, groundBase - 150, 0, groundBase);
      tpGrad.addColorStop(0, '#0d1d3a');
      tpGrad.addColorStop(1, '#070e1c');
      ctx.fillStyle = tpGrad;

      // Main TP structure
      ctx.fillRect(baseX + 20, groundBase - 135, 140, 135);
      ctx.fillRect(baseX + 180, groundBase - 165, 150, 165);
      ctx.fillRect(baseX + 350, groundBase - 120, 110, 120);

      // Tech Park Architectural Stepped Roof
      ctx.fillStyle = '#152b52';
      ctx.fillRect(baseX + 175, groundBase - 170, 160, 6);
      ctx.fillRect(baseX + 195, groundBase - 175, 120, 5);

      // Glowing Laboratory Windows
      const timeFlicker = Math.sin(this.time * 3);
      for (let floor = 0; floor < 5; floor++) {
        for (let col = 0; col < 6; col++) {
          const winX = baseX + 195 + col * 20;
          const winY = groundBase - 150 + floor * 24;
          
          const isGold = (col + floor + repeat) % 3 === 0;
          const isCyan = (col * 2 + floor) % 4 === 0;
          
          if (isGold) {
            ctx.fillStyle = `rgba(255, 215, 0, ${0.45 + 0.15 * Math.sin(this.time + col)})`;
          } else if (isCyan) {
            ctx.fillStyle = `rgba(0, 229, 255, ${0.4 + 0.2 * timeFlicker})`;
          } else {
            ctx.fillStyle = 'rgba(21, 101, 192, 0.35)';
          }
          ctx.fillRect(winX, winY, 11, 14);
        }
      }

      // Windows on Left Block
      for (let floor = 0; floor < 4; floor++) {
        for (let col = 0; col < 5; col++) {
          const winX = baseX + 32 + col * 24;
          const winY = groundBase - 120 + floor * 22;
          ctx.fillStyle = (col + floor) % 2 === 0 ? 'rgba(255, 215, 0, 0.4)' : 'rgba(0, 229, 255, 0.3)';
          ctx.fillRect(winX, winY, 12, 12);
        }
      }
    }
    ctx.restore();

    // Dark ground base strip
    ctx.save();
    const groundGrad = ctx.createLinearGradient(0, groundBase, 0, h);
    groundGrad.addColorStop(0, '#091326');
    groundGrad.addColorStop(1, '#04070d');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundBase, w, h - groundBase);

    // Neon Ground Accent Line
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, groundBase);
    ctx.lineTo(w, groundBase);
    ctx.stroke();
    ctx.restore();
  }

  // =========================================================================
  // ROTATING DUAL SPOTLIGHT SWEEP
  // =========================================================================
  renderSpotlights(ctx, w, h) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 1. Cyan Spotlight (anchored at bottom-left: 0, h)
    const cyanLength = 880;
    const cyanSpread = 0.28;
    const cyanAngle = this.spotlightCyanAngle;
    const c1x = cyanLength * Math.cos(cyanAngle - cyanSpread / 2);
    const c1y = h + cyanLength * Math.sin(cyanAngle - cyanSpread / 2);
    const c2x = cyanLength * Math.cos(cyanAngle + cyanSpread / 2);
    const c2y = h + cyanLength * Math.sin(cyanAngle + cyanSpread / 2);

    const cyanGrad = ctx.createRadialGradient(0, h, 20, (c1x + c2x) / 2, (c1y + c2y) / 2, cyanLength);
    cyanGrad.addColorStop(0, 'rgba(0, 240, 255, 0.32)');
    cyanGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.14)');
    cyanGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');

    ctx.fillStyle = cyanGrad;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(c1x, c1y);
    ctx.lineTo(c2x, c2y);
    ctx.closePath();
    ctx.fill();

    // 2. Solar Gold/Orange Spotlight (anchored at bottom-right: w, h)
    const goldLength = 880;
    const goldSpread = 0.28;
    const goldAngle = this.spotlightGoldAngle;
    const g1x = w + goldLength * Math.cos(goldAngle - goldSpread / 2);
    const g1y = h + goldLength * Math.sin(goldAngle - goldSpread / 2);
    const g2x = w + goldLength * Math.cos(goldAngle + goldSpread / 2);
    const g2y = h + goldLength * Math.sin(goldAngle + goldSpread / 2);

    const goldGrad = ctx.createRadialGradient(w, h, 20, (g1x + g2x) / 2, (g1y + g2y) / 2, goldLength);
    goldGrad.addColorStop(0, 'rgba(255, 214, 2, 0.32)');
    goldGrad.addColorStop(0.5, 'rgba(254, 107, 0, 0.14)');
    goldGrad.addColorStop(1, 'rgba(254, 107, 0, 0)');

    ctx.fillStyle = goldGrad;
    ctx.beginPath();
    ctx.moveTo(w, h);
    ctx.lineTo(g1x, g1y);
    ctx.lineTo(g2x, g2y);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // =========================================================================
  // DYNAMIC VERSUS SILHOUETTES (Bottom Section)
  // =========================================================================
  renderVersusSilhouettes(ctx, w, h) {
    const groundY = 500;
    
    ctx.save();
    
    // Silhouettes & Energy Line
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    
    // Left Silhouette
    const lx = 180;
    ctx.fillRect(lx - 25, groundY - 120, 50, 120); // Body
    ctx.beginPath();
    ctx.arc(lx, groundY - 140, 20, 0, Math.PI * 2); // Head
    ctx.fill();
    // Arm extended
    ctx.fillRect(lx, groundY - 80, 40, 15);
    
    // Right Silhouette
    const rx = 780;
    ctx.fillRect(rx - 25, groundY - 120, 50, 120); // Body
    ctx.beginPath();
    ctx.arc(rx, groundY - 140, 20, 0, Math.PI * 2); // Head
    ctx.fill();
    // Arm extended
    ctx.fillRect(rx - 40, groundY - 80, 40, 15);
    
    // Thin energy line
    const energyGrad = ctx.createLinearGradient(lx + 40, groundY - 72, rx - 40, groundY - 72);
    energyGrad.addColorStop(0, '#00e5ff');
    energyGrad.addColorStop(1, '#ff6b35');
    ctx.strokeStyle = energyGrad;
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(lx + 40, groundY - 72);
    ctx.lineTo(rx - 40, groundY - 72);
    ctx.stroke();

    ctx.restore();
  }

  // =========================================================================
  // LAYER 2: TOP PARTICLES CANVAS (Academic Dust / Fireflies over UI)
  // =========================================================================
  renderLayer2Particles() {
    if (!this.fxCtx || !this.fxCanvas) return;
    const ctx = this.fxCtx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    for (const p of this.dustParticles) {
      const alphaPulse = Math.max(0.05, p.alpha * (0.6 + 0.4 * Math.sin(p.pulsePhase)));
      ctx.globalAlpha = alphaPulse;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;

      if (p.isSquare) {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
