/**
 * Campus Clash 2D — Stage Select Screen Manager & Procedural Thumbnail Renderer
 * Renders live procedural mini-canvas snapshots for all 6 authentic SRM KTR venues,
 * handles selection state, hover audio, and random stage picking.
 * @module ui/stageSelectManager
 */

export class StageSelectManager {
  /**
   * @param {Object} game - Reference to main Game instance
   */
  constructor(game) {
    this.game = game;
    this.arenas = game.arenas;
    this.selectedIndex = game.currentArenaIndex || 0;
    this.hoveredIndex = -1;
    this.canvasItems = [];
    this.isRunning = false;
    this.lastFrameTime = 0;
    this.fpsInterval = 1000 / 30; // 30 FPS throttle
    this.animFrameId = null;
  }

  /**
   * Binds the DOM elements for the Stage Select Screen
   */
  initDOM() {
    this.screenEl = document.getElementById('stageSelectScreen');
    this.gridEl = document.getElementById('stage-grid');
    this.backBtn = document.getElementById('stage-back-btn');
    this.startBtn = document.getElementById('stage-start-btn');
    this.randomBtn = document.getElementById('stage-random-btn');
    this.selectedNameEl = document.getElementById('stage-selected-name');
    this.selectedSubEl = document.getElementById('stage-selected-sub');
    this.matchupPillEl = document.getElementById('stage-matchup-text');

    if (this.backBtn) {
      this.backBtn.addEventListener('click', () => {
        this.game.sound.playCancel();
        this.close();
        this.game.openCharSelect();
        this.game.currentScreen = 'charSelect';
      });
    }

    if (this.startBtn) {
      this.startBtn.addEventListener('click', () => {
        this.confirmAndStart();
      });
    }

    if (this.randomBtn) {
      this.randomBtn.addEventListener('click', () => {
        this.pickRandom();
      });
    }

    // Bind cards
    const cards = this.screenEl ? this.screenEl.querySelectorAll('.stage-card') : [];
    this.canvasItems = Array.from(cards).map((card, index) => {
      const canvas = card.querySelector('.stage-thumb-canvas');
      const ctx = canvas ? canvas.getContext('2d') : null;

      card.addEventListener('mouseenter', () => {
        this.hoveredIndex = index;
        this.game.sound.playCardWhoosh();
      });

      card.addEventListener('mouseleave', () => {
        if (this.hoveredIndex === index) this.hoveredIndex = -1;
      });

      card.addEventListener('click', () => {
        this.selectStage(index);
        this.game.sound.playCharNavTick();
      });

      return {
        card,
        canvas,
        ctx,
        arena: this.arenas[index],
        index
      };
    });

    this.updateUI();
  }

  selectStage(index) {
    this.selectedIndex = Math.max(0, Math.min(this.arenas.length - 1, index));
    this.game.currentArenaIndex = this.selectedIndex;
    this.updateUI();
  }

  pickRandom() {
    const r = Math.floor(Math.random() * this.arenas.length);
    this.selectStage(r);
    this.game.sound.playLockIn();
  }

  confirmAndStart() {
    this.game.currentArenaIndex = this.selectedIndex;
    this.game.sound.playLockIn();
    this.close();
    // Launch dramatic match countdown with chosen venue!
    this.game.startMatchCountdown();
  }

  navigate(dir) {
    const cols = 5;
    const rows = Math.ceil(this.arenas.length / cols);
    let row = Math.floor(this.selectedIndex / cols);
    let col = this.selectedIndex % cols;

    if (dir === 'left') col = (col - 1 + cols) % cols;
    if (dir === 'right') col = (col + 1) % cols;
    if (dir === 'up') row = (row - 1 + rows) % rows;
    if (dir === 'down') row = (row + 1) % rows;

    const target = row * cols + col;
    if (target < this.arenas.length) {
      this.selectStage(target);
      this.game.sound.playCharNavTick();
    }
  }

  updateUI() {
    const current = this.arenas[this.selectedIndex];

    if (this.selectedNameEl && current) {
      this.selectedNameEl.textContent = `${current.emoji} ${current.shortName}`;
    }
    if (this.selectedSubEl && current) {
      this.selectedSubEl.textContent = `"${current.subtitle}" • ${current.landmark || ''}`;
    }

    if (this.matchupPillEl) {
      const p1 = this.game.roster[this.game.p1CharIndex]?.config?.displayName || 'P1';
      const p2 = this.game.roster[this.game.p2CharIndex]?.config?.displayName || 'P2';
      this.matchupPillEl.textContent = `${p1.toUpperCase()} VS ${p2.toUpperCase()}`;
    }

    for (const item of this.canvasItems) {
      if (item.card) {
        if (item.index === this.selectedIndex) {
          item.card.classList.add('selected');
        } else {
          item.card.classList.remove('selected');
        }
      }
    }
  }

  open() {
    if (this.screenEl) {
      this.screenEl.classList.remove('hidden');
    }
    this.selectedIndex = this.game.currentArenaIndex || 0;
    this.updateUI();
    this.start();
  }

  close() {
    if (this.screenEl) {
      this.screenEl.classList.add('hidden');
    }
    this.stop();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();

    const loop = (time) => {
      if (!this.isRunning) return;
      this.animFrameId = requestAnimationFrame(loop);

      const elapsed = time - this.lastFrameTime;
      if (elapsed >= this.fpsInterval) {
        this.lastFrameTime = time - (elapsed % this.fpsInterval);
        this.renderThumbnails(time);
      }
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  renderThumbnails(time) {
    for (const item of this.canvasItems) {
      if (!item.ctx || !item.canvas) continue;
      this.renderVenueThumbnail(item.ctx, item.arena.id, item.canvas.width, item.canvas.height, time);
    }
  }

  /**
   * Procedurally renders an animated miniature representation of the SRM KTR venue
   */
  renderVenueThumbnail(ctx, venueId, w, h, time) {
    const t = time * 0.001;
    ctx.clearRect(0, 0, w, h);

    if (venueId === 'techpark') {
      // Tech Park Sky
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#1976d2');
      sky.addColorStop(0.6, '#42a5f5');
      sky.addColorStop(1, '#bbdefb');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Sun
      ctx.fillStyle = '#fffde7';
      ctx.beginPath();
      ctx.arc(w - 24, 18, 10, 0, Math.PI * 2);
      ctx.fill();

      const cx = w / 2;
      const bTop = 10;
      const bBottom = 75;

      // Outer White Corner Columns
      ctx.fillStyle = '#f0f3f6';
      ctx.fillRect(cx - 95, bTop + 4, 18, bBottom - bTop);
      ctx.fillRect(cx + 77, bTop + 4, 18, bBottom - bTop);

      // Blue Reflective Wings
      const wingGrad = ctx.createLinearGradient(0, bTop, 0, bBottom);
      wingGrad.addColorStop(0, '#0d2d60');
      wingGrad.addColorStop(0.5, '#15438c');
      wingGrad.addColorStop(1, '#091c3d');
      ctx.fillStyle = wingGrad;
      ctx.fillRect(cx - 77, bTop + 6, 38, bBottom - bTop - 6);
      ctx.fillRect(cx + 39, bTop + 6, 38, bBottom - bTop - 6);

      // White Vertical Louvers on lower half of blue wings
      ctx.fillStyle = '#ffffff';
      for (let lx = cx - 74; lx < cx - 42; lx += 4) {
        ctx.fillRect(lx, bTop + 35, 1.8, bBottom - bTop - 35);
      }
      for (let rx = cx + 42; rx < cx + 74; rx += 4) {
        ctx.fillRect(rx, bTop + 35, 1.8, bBottom - bTop - 35);
      }

      // Red Accent Stripe
      ctx.fillStyle = '#d32f2f';
      ctx.fillRect(cx - 41, bTop + 2, 4, bBottom - bTop);
      ctx.fillRect(cx + 37, bTop + 2, 4, bBottom - bTop);

      // Central Bright Yellow Tower
      ctx.fillStyle = '#ffd600';
      ctx.fillRect(cx - 37, bTop + 4, 74, bBottom - bTop - 4);

      // Central Blue Glass Wall
      ctx.fillStyle = '#0f3263';
      ctx.fillRect(cx - 20, bTop + 8, 40, 42);
      // Yellow Mullion Grid
      ctx.strokeStyle = '#ffd600';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 20, bTop + 8, 40, 42);
      ctx.beginPath();
      ctx.moveTo(cx - 7, bTop + 8);
      ctx.lineTo(cx - 7, bTop + 50);
      ctx.moveTo(cx + 7, bTop + 8);
      ctx.lineTo(cx + 7, bTop + 50);
      ctx.moveTo(cx - 20, bTop + 22);
      ctx.lineTo(cx + 20, bTop + 22);
      ctx.moveTo(cx - 20, bTop + 36);
      ctx.lineTo(cx + 20, bTop + 36);
      ctx.stroke();

      // "SRM" lettering in center
      ctx.font = '900 6px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('SRM', cx, bTop + 32);

      // Red Cantilevered Roof Canopy
      ctx.fillStyle = '#d32f2f';
      ctx.fillRect(cx - 45, bTop, 90, 5);

      // Red Entrance Porch
      ctx.fillRect(cx - 28, bTop + 50, 56, 4);

      // Ground Glass Lobby
      ctx.fillStyle = '#cfd8dc';
      ctx.fillRect(cx - 24, bTop + 54, 48, bBottom - (bTop + 54));

      // Sloping Green Grass Flanks
      ctx.fillStyle = '#2e7d32';
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(cx - 50, h);
      ctx.lineTo(cx - 50, 75);
      ctx.lineTo(0, 75);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(w, h);
      ctx.lineTo(cx + 50, h);
      ctx.lineTo(cx + 50, 75);
      ctx.lineTo(w, 75);
      ctx.fill();

      // Yellow & Lime Bushes on grass
      ctx.fillStyle = '#fbc02d';
      ctx.beginPath();
      ctx.arc(cx - 65, 74, 8, 0, Math.PI * 2);
      ctx.arc(cx + 65, 74, 8, 0, Math.PI * 2);
      ctx.fill();

      // Grand Center Concrete Stairs
      ctx.fillStyle = '#90a4ae';
      for (let s = 0; s < 6; s++) {
        const sw = 60 + s * 14;
        ctx.fillRect(cx - sw / 2, 75 + s * 4.5, sw, 4.5);
      }

      // Ground Plaza Pavement
      ctx.fillStyle = '#607d8b';
      ctx.fillRect(0, 102, w, h - 102);

      // 3D SRM Sign
      ctx.font = '900 9px "Arial Black", sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.fillText('SRM', w - 24, 106);

    } else if (venueId === 'universitybuilding') {
      // Chennai Sky
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#1565c0');
      sky.addColorStop(0.6, '#42a5f5');
      sky.addColorStop(1, '#e3f2fd');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Background Trees & Neoclassical Wing
      ctx.fillStyle = '#1b5e20';
      ctx.beginPath();
      ctx.arc(45, 60, 25, 0, Math.PI * 2);
      ctx.arc(w - 45, 60, 25, 0, Math.PI * 2);
      ctx.fill();

      // Royal Palm Trees
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(35, 85);
      ctx.quadraticCurveTo(30, 45, 40, 25);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w - 35, 85);
      ctx.quadraticCurveTo(w - 30, 45, w - 40, 25);
      ctx.stroke();

      // Palm fronds
      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = 1.5;
      for (let f = 0; f < 6; f++) {
        const fa = (f / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(40, 25);
        ctx.lineTo(40 + Math.cos(fa) * 14, 25 + Math.sin(fa) * 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(w - 40, 25);
        ctx.lineTo(w - 40 + Math.cos(fa) * 14, 25 + Math.sin(fa) * 10);
        ctx.stroke();
      }

      const tcx = w / 2;

      // -----------------------------------------------------------------------
      // REAL FREESTANDING SRM CLOCK TOWER
      // -----------------------------------------------------------------------
      // Fluted Golden Dome
      const domeGrad = ctx.createLinearGradient(tcx - 16, 6, tcx + 16, 22);
      domeGrad.addColorStop(0, '#fff3e0');
      domeGrad.addColorStop(0.5, '#ffd54f');
      domeGrad.addColorStop(1, '#ffb300');
      ctx.fillStyle = domeGrad;
      ctx.beginPath();
      ctx.moveTo(tcx - 14, 22);
      ctx.bezierCurveTo(tcx - 14, 10, tcx - 4, 6, tcx, 6);
      ctx.bezierCurveTo(tcx + 4, 6, tcx + 14, 10, tcx + 14, 22);
      ctx.closePath();
      ctx.fill();

      // Dome Finial Spire
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(tcx - 1, 2, 2, 4);
      ctx.beginPath();
      ctx.arc(tcx, 2, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Dome Cornice
      ctx.fillStyle = '#ffe082';
      ctx.fillRect(tcx - 16, 22, 32, 3);

      // Square Ochre Clock Chamber
      ctx.fillStyle = '#ffca28';
      ctx.fillRect(tcx - 16, 25, 32, 24);
      ctx.strokeStyle = '#ffa000';
      ctx.lineWidth = 1;
      ctx.strokeRect(tcx - 16, 25, 32, 24);

      // Corner Finials
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(tcx - 16, 23, 3, 3);
      ctx.fillRect(tcx + 13, 23, 3, 3);

      // Dark Clock Inset Frame
      ctx.fillStyle = '#0f2b48';
      ctx.fillRect(tcx - 9, 28, 18, 18);

      // Circular White Clock Face
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(tcx, 37, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Live Clock Hands
      const ha = t * 1.5;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(tcx, 37);
      ctx.lineTo(tcx + Math.sin(ha) * 4, 37 - Math.cos(ha) * 4);
      ctx.stroke();
      ctx.strokeStyle = '#b71c1c';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(tcx, 37);
      ctx.lineTo(tcx + Math.sin(ha * 6) * 5.5, 37 - Math.cos(ha * 6) * 5.5);
      ctx.stroke();

      // Tower Mid-Section: Yellow Piers & Twin Fluted White Columns
      ctx.fillStyle = '#ffd54f';
      ctx.fillRect(tcx - 18, 49, 36, 28);
      // Breezeway Depth
      ctx.fillStyle = '#263238';
      ctx.fillRect(tcx - 10, 51, 20, 26);
      // Twin White Columns
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(tcx - 14, 51, 3, 26);
      ctx.fillRect(tcx - 9, 51, 3, 26);
      ctx.fillRect(tcx + 6, 51, 3, 26);
      ctx.fillRect(tcx + 11, 51, 3, 26);

      // Pedestal Base with Medallion
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(tcx - 20, 77, 40, 9);
      ctx.fillStyle = '#ffca28';
      ctx.fillRect(tcx - 19, 79, 38, 7);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(tcx, 82, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pink Bougainvillea Flower Foliage at Base
      ctx.fillStyle = '#e91e63';
      for (let fx = tcx - 24; fx <= tcx + 24; fx += 5) {
        ctx.beginPath();
        ctx.arc(fx, 86 + Math.sin(fx) * 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Circular Roundabout Balustrade Wall
      ctx.fillStyle = '#d7ccc8';
      ctx.fillRect(tcx - 55, 88, 110, 2);
      ctx.fillRect(tcx - 55, 94, 110, 2);
      // White Balusters
      ctx.fillStyle = '#ffffff';
      for (let bx = tcx - 52; bx < tcx + 52; bx += 4) {
        ctx.fillRect(bx, 90, 1.8, 4);
      }

      // Campus Road Pavement
      ctx.fillStyle = '#455a64';
      ctx.fillRect(0, 96, w, h - 96);

      // Yellow Road Barricades (SRM)
      ctx.fillStyle = '#ffd600';
      ctx.fillRect(15, 98, 18, 8);
      ctx.fillRect(w - 33, 98, 18, 8);
      ctx.fillStyle = '#d50000';
      ctx.fillRect(18, 98, 4, 8);
      ctx.fillRect(w - 30, 98, 4, 8);

    } else if (venueId === 'tpganesan') {
      // -----------------------------------------------------------------------
      // REAL DR. T.P. GANESAN AUDITORIUM (SRM KTR)
      // -----------------------------------------------------------------------
      // Dark Cavernous Auditorium Hall Void
      const hallGrad = ctx.createLinearGradient(0, 0, 0, h);
      hallGrad.addColorStop(0, '#0a0d18');
      hallGrad.addColorStop(0.5, '#10172c');
      hallGrad.addColorStop(1, '#1b2444');
      ctx.fillStyle = hallGrad;
      ctx.fillRect(0, 0, w, h);

      // Acoustic Ceiling Grid & Recessed Downlights
      for (let i = 0; i < 8; i++) {
        const lx = 20 + i * (w - 40) / 7;
        ctx.fillStyle = '#fffde7';
        ctx.beginPath();
        ctx.arc(lx, 8, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Tiered Velvet Seating with Numbered Seats (Royal Blue Rear, Crimson Front)
      for (let r = 0; r < 4; r++) {
        const sy = 34 + r * 11;
        ctx.fillStyle = r < 2 ? '#0d2d5e' : '#4a0011';
        ctx.fillRect(15, sy, w - 30, 7);
        // Student heads & stencils
        for (let s = 0; s < 11; s++) {
          const sx = 22 + s * ((w - 44) / 10);
          ctx.fillStyle = (s + r) % 3 === 0 ? '#ffca28' : '#263238';
          ctx.beginPath();
          ctx.arc(sx, sy - 2, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Deep Midnight Blue Rear Stage Curtain Backdrop
      ctx.fillStyle = '#0a122c';
      ctx.fillRect(w * 0.18, 16, w * 0.64, 46);

      // Center Stage Event Backdrop Banner
      ctx.fillStyle = '#faeed9';
      ctx.fillRect(w * 0.28, 20, w * 0.44, 22);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1;
      ctx.strokeRect(w * 0.28, 20, w * 0.44, 22);
      ctx.fillStyle = '#002b80';
      ctx.font = '900 5.5px serif';
      ctx.textAlign = 'center';
      ctx.fillText('SRM DR. T.P. GANESAN AUDITORIUM', w / 2, 28);
      ctx.fillStyle = '#b71c1c';
      ctx.font = 'bold 5px sans-serif';
      ctx.fillText('MILAN 2026 CONVOCATION', w / 2, 37);

      // Left Projection Screen
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(w * 0.08, 20, 20, 24);
      ctx.fillStyle = '#1976d2';
      ctx.fillRect(w * 0.08 + 1, 21, 18, 22);

      // Proscenium Header Beam: Light Beige with Blue "LEARN. LEAP. LEAD." (Photo 1 & 4)
      ctx.fillStyle = '#ede6da';
      ctx.fillRect(w * 0.12, 4, w * 0.76, 11);
      ctx.strokeStyle = '#c4b8a5';
      ctx.lineWidth = 1;
      ctx.strokeRect(w * 0.12, 4, w * 0.76, 11);

      // Circular SRM Blue Seals
      ctx.fillStyle = '#002b80';
      ctx.beginPath();
      ctx.arc(w / 2 - 45, 9.5, 3, 0, Math.PI * 2);
      ctx.arc(w / 2 + 45, 9.5, 3, 0, Math.PI * 2);
      ctx.fill();

      // Motto: LEARN. LEAP. LEAD. in Bold Royal Blue
      ctx.font = '900 6.5px sans-serif';
      ctx.fillStyle = '#002b80';
      ctx.textAlign = 'center';
      ctx.fillText('LEARN. LEAP. LEAD.', w / 2, 12);

      // Midnight Navy Blue Scalloped Valance Drapes (Underneath Motto Beam)
      ctx.fillStyle = '#0d1a40';
      for (let c = 0; c < 8; c++) {
        const cxPos = 20 + c * (w - 40) / 8;
        ctx.beginPath();
        ctx.arc(cxPos + (w - 40) / 16, 15, (w - 40) / 16, 0, Math.PI);
        ctx.fill();
        // Gold edge
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Dynamic Spotlights
      const s1X = w * 0.35 + Math.sin(t * 1.6) * 30;
      const beam1 = ctx.createLinearGradient(w * 0.25, 0, s1X, h);
      beam1.addColorStop(0, 'rgba(0, 229, 255, 0.45)');
      beam1.addColorStop(1, 'rgba(0, 229, 255, 0)');
      ctx.fillStyle = beam1;
      ctx.beginPath();
      ctx.moveTo(w * 0.25 - 6, 0);
      ctx.lineTo(w * 0.25 + 6, 0);
      ctx.lineTo(s1X + 22, h);
      ctx.lineTo(s1X - 22, h);
      ctx.closePath();
      ctx.fill();

      // Polished Honey-Oak Hardwood Stage Apron
      const teakGrad = ctx.createLinearGradient(0, 76, 0, h);
      teakGrad.addColorStop(0, '#6d4c41');
      teakGrad.addColorStop(0.5, '#4e342e');
      teakGrad.addColorStop(1, '#271710');
      ctx.fillStyle = teakGrad;
      ctx.fillRect(0, 76, w, h - 76);

      // Crimson Red Stage Skirt / Riser Cloth (Photos 1, 2, 4)
      ctx.fillStyle = '#b71c1c';
      ctx.fillRect(0, 80, w, 6);

      // Multi-tier Marigold Flower Bed on Stage Apron (Yellow, Orange & White)
      for (let g = 0; g < 24; g++) {
        const gx = 4 + g * ((w - 8) / 23);
        ctx.fillStyle = g % 2 === 0 ? '#ff6f00' : '#ffd600'; // Orange & Yellow
        ctx.beginPath();
        ctx.arc(gx, 78, 2.2, 0, Math.PI * 2);
        ctx.fill();
        if (g % 3 === 0) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(gx + 2, 76.5, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

    } else if (venueId === 'archgate') {
      // -----------------------------------------------------------------------
      // REAL SRM SILVER JUBILEE ARCH GATE (GST ROAD / NH45)
      // -----------------------------------------------------------------------
      // Tamil Nadu Coastal Sky
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#3a85b9');
      sky.addColorStop(0.5, '#78b5db');
      sky.addColorStop(1, '#dff0fa');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.beginPath();
      ctx.ellipse(w * 0.25, 12, 22, 6, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.8, 16, 26, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Background SRM High-Rise Tower (Behind Left Pavilion)
      ctx.fillStyle = '#ebccd1';
      ctx.fillRect(25, 4, 34, 75);
      ctx.fillStyle = '#0288d1';
      for (let bc = 0; bc < 3; bc++) {
        ctx.fillRect(28 + bc * 10, 8, 6, 68);
      }

      // University Green Canopy (Behind Arches)
      ctx.fillStyle = '#1b4332';
      for (let gx = 50; gx < w - 50; gx += 20) {
        ctx.beginPath();
        ctx.arc(gx, 65, 16, 0, Math.PI * 2);
        ctx.fill();
      }

      // Silver Jubilee Arch: Blush Pink Main Block
      const aw = w - 46;
      const ax = 23;
      const ay = 26;
      const ah = 54;
      const bgGrad = ctx.createLinearGradient(ax, ay, ax, ay + ah);
      bgGrad.addColorStop(0, '#fae1e5');
      bgGrad.addColorStop(0.5, '#f5b8c0');
      bgGrad.addColorStop(1, '#e3949f');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(ax, ay, aw, ah);
      ctx.strokeStyle = '#c57881';
      ctx.lineWidth = 1;
      ctx.strokeRect(ax, ay, aw, ah);

      // Left & Right Pavilion Pediments
      ctx.fillStyle = '#ffffff';
      // Left Pediment
      ctx.beginPath();
      ctx.moveTo(ax - 2, ay);
      ctx.lineTo(ax + 17, ay - 9);
      ctx.lineTo(ax + 36, ay);
      ctx.closePath();
      ctx.fill();
      // Right Pediment
      ctx.beginPath();
      ctx.moveTo(ax + aw - 36, ay);
      ctx.lineTo(ax + aw - 17, ay - 9);
      ctx.lineTo(ax + aw + 2, ay);
      ctx.closePath();
      ctx.fill();

      // Twin Grand Roman Arches (Cutout to Greenery)
      const archLeftX = w / 2 - 42;
      const archRightX = w / 2 + 42;
      const archR = 26;
      const archSpringY = 56;

      const drawThumbArch = (acx) => {
        ctx.save();
        ctx.fillStyle = '#143625';
        ctx.beginPath();
        ctx.arc(acx, archSpringY, archR, Math.PI, 0);
        ctx.lineTo(acx + archR, ay + ah);
        ctx.lineTo(acx - archR, ay + ah);
        ctx.closePath();
        ctx.fill();

        // White Archivolt
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Keystone
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(acx - 3, archSpringY - archR - 3, 6, 5);
        ctx.restore();
      };

      drawThumbArch(archLeftX);
      drawThumbArch(archRightX);

      // Center Dividing Pier & SRM Circular Seal
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(w / 2, 48, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0033a0';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#0033a0';
      ctx.beginPath();
      ctx.arc(w / 2, 46, 5, 0, Math.PI * 2);
      ctx.fill();

      // White Architrave & Frieze: "SRM UNIVERSITY"
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ax + 28, ay - 5, aw - 56, 10);
      ctx.font = '900 6.5px serif';
      ctx.fillStyle = '#002b80';
      ctx.textAlign = 'center';
      ctx.fillText('SRM UNIVERSITY', w / 2, ay + 2);

      // Rooftop White Balustrade
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ax + 25, ay - 9, aw - 50, 2);
      for (let bx = ax + 28; bx < ax + aw - 28; bx += 6) {
        ctx.fillRect(bx, ay - 9, 2, 4);
      }

      // Rooftop Tamil Typography: "எஸ்.ஆர்.எம்"
      ctx.font = 'bold 5px sans-serif';
      ctx.fillStyle = '#002b80';
      ctx.fillText('எஸ்.ஆர்.எம் பல்கலைக்கழகம்', w / 2, ay - 11);

      // Fan-Patterned Cobblestone Forecourt Ground
      const groundGrad = ctx.createLinearGradient(0, 80, 0, h);
      groundGrad.addColorStop(0, '#78909c');
      groundGrad.addColorStop(1, '#37474f');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, 80, w, h - 80);

      // Cobblestone arcs
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 0.8;
      for (let r = 8; r <= 35; r += 7) {
        ctx.beginPath();
        ctx.arc(w / 2, 95, r, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }

      // Central Mahatma Gandhi Bronze Statue Silhouette on White Plinth
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(w / 2 - 9, 74, 18, 10); // White plinth
      ctx.fillStyle = '#c59b27'; // Bronze Gandhi
      ctx.fillRect(w / 2 - 2, 60, 4, 14); // Torso & dhoti
      ctx.beginPath();
      ctx.arc(w / 2, 58, 2.5, 0, Math.PI * 2); // Head
      ctx.fill();
      ctx.strokeStyle = '#ffd54f';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w / 2 + 3, 58);
      ctx.lineTo(w / 2 + 4, 74); // Walking stick
      ctx.stroke();

      // Yellow SRM Security Barricades
      ctx.fillStyle = '#ffd600';
      ctx.fillRect(18, 76, 16, 12);
      ctx.fillRect(w - 34, 76, 16, 12);
      ctx.fillStyle = '#d50000';
      ctx.fillRect(22, 78, 8, 8);
      ctx.fillRect(w - 30, 78, 8, 8);

    } else if (venueId === 'vendharsquare' || venueId === 'canteen') {
      // -----------------------------------------------------------------------
      // REAL SRM VENDHAR SQUARE (FOUNDER MONUMENT & PLAZA)
      // -----------------------------------------------------------------------
      // Fiery Golden Sunset Sky
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#c2410c'); // Radiant orange
      sky.addColorStop(0.5, '#ea580c');
      sky.addColorStop(0.8, '#f59e0b'); // Golden horizon
      sky.addColorStop(1, '#fef08a'); // Bright gold
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Sunset Clouds
      ctx.fillStyle = 'rgba(124, 45, 18, 0.45)';
      ctx.beginPath();
      ctx.ellipse(w * 0.2, 16, 28, 8, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.8, 14, 32, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // God Rays Beaming Behind Founder Statue
      ctx.save();
      ctx.globalAlpha = 0.25;
      for (let r = 0; r < 6; r++) {
        const angle = (r / 6) * Math.PI - Math.PI / 2;
        ctx.fillStyle = '#fff59d';
        ctx.beginPath();
        ctx.moveTo(w / 2, 38);
        ctx.lineTo(w / 2 + Math.cos(angle - 0.15) * 80, 38 + Math.sin(angle - 0.15) * 80);
        ctx.lineTo(w / 2 + Math.cos(angle + 0.15) * 80, 38 + Math.sin(angle + 0.15) * 80);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Monument Central Edifice: Pale Pink/Cream Marble
      const mw = 120;
      const mx = w / 2 - mw / 2;
      const my = 36;
      const mh = 44;
      ctx.fillStyle = '#fff8f5';
      ctx.fillRect(mx, my, mw, mh);
      ctx.strokeStyle = '#d7b8ae';
      ctx.lineWidth = 1;
      ctx.strokeRect(mx, my, mw, mh);

      // 4 Fluted Pillars on Monument
      for (let c = 0; c < 4; c++) {
        const px = mx + 16 + c * 29;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 3, my + 6, 6, mh - 6);
        ctx.fillStyle = '#ffecb3';
        ctx.fillRect(px - 4, my + 3, 8, 4); // Capital
      }

      // Symmetrical Ascending Grand Staircases (Left & Right)
      // Left Staircase
      ctx.fillStyle = '#fcebed';
      ctx.beginPath();
      ctx.moveTo(mx - 54, my + mh);
      ctx.lineTo(mx, my + 4);
      ctx.lineTo(mx, my + mh);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mx - 54, my + mh - 4);
      ctx.lineTo(mx, my);
      ctx.stroke();

      // Right Staircase
      ctx.fillStyle = '#fcebed';
      ctx.beginPath();
      ctx.moveTo(mx + mw, my + 4);
      ctx.lineTo(mx + mw + 54, my + mh);
      ctx.lineTo(mx + mw, my + mh);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mx + mw, my);
      ctx.lineTo(mx + mw + 54, my + mh - 4);
      ctx.stroke();

      // Mandapam Pavilions atop Staircases
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(mx - 8, my - 6, 8, 8);
      ctx.fillRect(mx + mw, my - 6, 8, 8);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(mx - 6, my - 10, 4, 4);
      ctx.fillRect(mx + mw + 2, my - 10, 4, 4);

      // Summit Balustrade
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(mx - 4, my - 4, mw + 8, 4);

      // Dark Granite Pedestal
      ctx.fillStyle = '#263238';
      ctx.fillRect(w / 2 - 8, my - 11, 16, 8);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(w / 2 - 8, my - 11, 16, 8);

      // Colossal Golden Statue of Dr. T. R. Paarivendhar (Founder)
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(w / 2 - 3, my - 26, 6, 15); // Suit & trousers
      ctx.beginPath();
      ctx.arc(w / 2, my - 29, 3, 0, Math.PI * 2); // Head
      ctx.fill();
      ctx.fillStyle = '#fff9c4';
      ctx.beginPath();
      ctx.arc(w / 2, my - 21, 2, 0, Math.PI * 2); // Clasped hands
      ctx.fill();

      // Sun Aura Disc Behind Founder Head
      ctx.save();
      ctx.fillStyle = 'rgba(255, 235, 59, 0.45)';
      ctx.beginPath();
      ctx.arc(w / 2, my - 26, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Ceremonial Plaza Promenade (Ground)
      const groundGrad = ctx.createLinearGradient(0, 80, 0, h);
      groundGrad.addColorStop(0, '#455a64');
      groundGrad.addColorStop(1, '#263238');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, 80, w, h - 80);

      // Geometric Purple Petunia Garden Beds
      ctx.fillStyle = '#7e57c2';
      ctx.fillRect(14, 82, 38, 6);
      ctx.fillRect(w - 52, 82, 38, 6);
      ctx.fillStyle = '#2e7d32';
      ctx.fillRect(14, 88, 38, 2);
      ctx.fillRect(w - 52, 88, 38, 2);

      // 3 Geodesic Dome Water Fountains with Arching Crystalline Jets
      const thumbFountains = [w * 0.26, w * 0.5, w * 0.74];
      thumbFountains.forEach((fx, idx) => {
        // Basin
        ctx.fillStyle = '#90a4ae';
        ctx.beginPath();
        ctx.ellipse(fx, 94, 12, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Water Pool
        ctx.fillStyle = '#29b6f6';
        ctx.beginPath();
        ctx.ellipse(fx, 94, 10, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Arching Water Sprays
        ctx.strokeStyle = 'rgba(224, 247, 250, 0.85)';
        ctx.lineWidth = 1;
        const sprayH = 8 + Math.sin(t * 4 + idx) * 2;
        ctx.beginPath();
        ctx.moveTo(fx, 94);
        ctx.quadraticCurveTo(fx - 5, 94 - sprayH, fx - 10, 95);
        ctx.moveTo(fx, 94);
        ctx.quadraticCurveTo(fx + 5, 94 - sprayH, fx + 10, 95);
        ctx.moveTo(fx, 94);
        ctx.lineTo(fx, 94 - sprayH * 1.2);
        ctx.stroke();
      });

    } else if (venueId === 'architectureblock' || venueId === 'centrallibrary') {
      // -----------------------------------------------------------------------
      // REAL SRM SCHOOL OF ARCHITECTURE & DESIGN
      // -----------------------------------------------------------------------
      // Morning Azure Sky
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#1976d2');
      sky.addColorStop(0.6, '#64b5f6');
      sky.addColorStop(1, '#e3f2fd');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Slate-Grey Structural Building Frame
      const bx = 16;
      const bw = w - 32;
      const by = 16;
      const bh = 64;
      ctx.fillStyle = '#37474f';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = '#263238';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, bh);

      // Yellow Parapet Accent Blocks
      ctx.fillStyle = '#fbc02d';
      for (let yb = bx + 8; yb < bx + bw - 8; yb += 22) {
        ctx.fillRect(yb, by - 3, 14, 3);
      }

      // Left & Right Wings: White Horizontal Solar Louvers
      const wingW = 60;
      const drawThumbLouvers = (wx) => {
        ctx.fillStyle = '#1c313a';
        ctx.fillRect(wx, by + 8, wingW, 36);
        // 3 Bays of 3 horizontal white slats
        for (let r = 0; r < 3; r++) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(wx, by + 8 + r * 12, wingW, 2);
          for (let s = 1; s <= 2; s++) {
            ctx.fillStyle = '#e0e0e0';
            ctx.fillRect(wx + 2, by + 8 + r * 12 + s * 3.5, wingW - 4, 1);
          }
        }
      };
      drawThumbLouvers(bx + 6);
      drawThumbLouvers(bx + bw - wingW - 6);

      // Central Massive Teal Reflective Glass Curtain Wall
      const gw = 110;
      const gx = w / 2 - gw / 2;
      const gy = by + 4;
      const gh = 46;

      const glassGrad = ctx.createLinearGradient(gx, gy, gx + gw, gy + gh);
      glassGrad.addColorStop(0, '#00838f');
      glassGrad.addColorStop(0.5, '#00acc1');
      glassGrad.addColorStop(1, '#26c6da');
      ctx.fillStyle = glassGrad;
      ctx.fillRect(gx, gy, gw, gh);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(gx, gy, gw, gh);

      // Diagonal Sun Glint
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.moveTo(gx + 20, gy);
      ctx.lineTo(gx + 45, gy);
      ctx.lineTo(gx + 25, gy + gh);
      ctx.lineTo(gx, gy + gh);
      ctx.closePath();
      ctx.fill();

      // Yellow Middle Lintel Band
      ctx.fillStyle = '#fbc02d';
      ctx.fillRect(gx, gy + 32, gw, 2.5);

      // Typography on Glass: "SRM" & "School of Architecture"
      ctx.font = '900 6px serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('SRM', w / 2, gy + 12);
      ctx.font = 'italic 5px cursive, sans-serif';
      ctx.fillText('School of Architecture', w / 2, gy + 22);

      // Ground-Floor White Portico Colonnade (6 Columns)
      const pw = 120;
      const px = w / 2 - pw / 2;
      const py = by + 48;
      // White Roof Slab
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px, py, pw, 3);
      // Columns
      for (let c = 0; c < 6; c++) {
        const cxPos = px + 6 + c * ((pw - 12) / 5);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cxPos - 1.5, py + 3, 3, 14);
      }

      // Blue Entrance Plinth
      ctx.fillStyle = '#0277bd';
      ctx.fillRect(px - 4, py + 17, pw + 8, 15);

      // Lush Green Planter Beds with Orange Flowers (Flanking Base)
      ctx.fillStyle = '#2e7d32';
      ctx.fillRect(bx + 4, 76, 55, 6);
      ctx.fillRect(bx + bw - 59, 76, 55, 6);
      ctx.fillStyle = '#ff7043';
      for (let fl = bx + 6; fl < bx + 55; fl += 8) {
        ctx.fillRect(fl, 74, 2, 2);
        ctx.fillRect(bx + bw - 58 + (fl - (bx + 6)), 74, 2, 2);
      }

      // Forecourt Pavement (Ground)
      const roadGrad = ctx.createLinearGradient(0, 80, 0, h);
      roadGrad.addColorStop(0, '#455a64');
      roadGrad.addColorStop(1, '#263238');
      ctx.fillStyle = roadGrad;
      ctx.fillRect(0, 80, w, h - 80);

      // Black & White Curb Dividers
      for (let cb = 0; cb < w; cb += 14) {
        ctx.fillStyle = (Math.floor(cb / 14) % 2 === 0) ? '#ffffff' : '#212121';
        ctx.fillRect(cb, 80, 14, 2);
      }
    } else if (venueId === 'cloudcitadel') {
      // 1. Cloud Citadel Thumbnail (Deep blue gradient + glowing server towers + Kubernetes node)
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#020b1e');
      sky.addColorStop(1, '#0b3558');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Server Blade Towers
      ctx.fillStyle = '#06162d';
      ctx.fillRect(20, 25, 45, 55);
      ctx.fillRect(75, 15, 55, 65);
      ctx.fillRect(150, 18, 55, 62);
      ctx.fillRect(215, 28, 45, 52);

      // Glowing Server LEDs
      for (let y = 30; y < 70; y += 8) {
        ctx.fillStyle = '#00e5ff';
        ctx.fillRect(80, y, 4, 3);
        ctx.fillRect(155, y, 4, 3);
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(90, y, 4, 3);
      }

      // Central Hexagon Pod Node
      ctx.strokeStyle = '#00e5ff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(w / 2, 45, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = 'bold 8px monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText('K8S', w / 2, 48);

      // Stage Platform
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(0, 80, w, 2);
      ctx.fillStyle = '#071e3d';
      ctx.fillRect(0, 82, w, h - 82);

    } else if (venueId === 'cyberfortress') {
      // 2. Cyber Fortress Thumbnail (Dark matrix canvas + binary streams + red firewall lasers)
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, w, h);

      // Terminal HUD Box
      ctx.fillStyle = 'rgba(10, 10, 20, 0.9)';
      ctx.strokeStyle = '#ff1744';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(30, 15, w - 60, 50);
      ctx.fillRect(30, 15, w - 60, 50);

      // Terminal text
      ctx.font = 'bold 7px monospace';
      ctx.fillStyle = '#ff1744';
      ctx.textAlign = 'left';
      ctx.fillText('> SEC_OPS // ZERO-DAY DETECTED', 38, 28);
      ctx.fillStyle = '#00ff41';
      ctx.fillText('> RSA-4096 ENCRYPTION ACTIVE', 38, 42);
      ctx.fillText('> FIREWALL: 100% SECURE', 38, 54);

      // Red laser node beams
      ctx.strokeStyle = '#ff1744';
      ctx.shadowColor = '#ff1744';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, 80);
      ctx.lineTo(40, 30);
      ctx.moveTo(w - 40, 80);
      ctx.lineTo(w - 40, 30);
      ctx.stroke();

      // Stage Floor
      ctx.fillStyle = '#ff1744';
      ctx.fillRect(0, 80, w, 2);
      ctx.fillStyle = '#1e050c';
      ctx.fillRect(0, 82, w, h - 82);

    } else if (venueId === 'iotsensormatrix') {
      // 3. IoT Sensor Matrix Thumbnail (Green PCB + ESP32 Chip + WiFi radio ripples)
      ctx.fillStyle = '#021208';
      ctx.fillRect(0, 0, w, h);

      // Radio Ripples
      ctx.strokeStyle = '#00e676';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(w / 2, 40, 18, 0, Math.PI * 2);
      ctx.arc(w / 2, 40, 32, 0, Math.PI * 2);
      ctx.stroke();

      // ESP32 Chip
      ctx.fillStyle = '#0a1a10';
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.5;
      ctx.fillRect(w / 2 - 25, 25, 50, 35);
      ctx.strokeRect(w / 2 - 25, 25, 50, 35);

      ctx.font = '900 7px sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText('ESP32', w / 2, 45);

      // Stage Floor
      ctx.fillStyle = '#00e676';
      ctx.fillRect(0, 80, w, 2);
      ctx.fillStyle = '#041f0c';
      ctx.fillRect(0, 82, w, h - 82);

    } else if (venueId === 'edgegateway') {
      // 4. Edge Gateway Thumbnail (Violet sky + optical pulses + micro-nodes)
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#10051d');
      sky.addColorStop(1, '#3b1263');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Horizontal Optical Laser lines
      ctx.strokeStyle = '#e040fb';
      ctx.shadowColor = '#e040fb';
      ctx.shadowBlur = 6;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(20, 25);
      ctx.lineTo(w - 20, 25);
      ctx.moveTo(30, 48);
      ctx.lineTo(w - 30, 48);
      ctx.stroke();

      // Edge Node
      ctx.fillStyle = '#1c0832';
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.5;
      ctx.fillRect(w / 2 - 30, 20, 60, 50);
      ctx.strokeRect(w / 2 - 30, 20, 60, 50);

      ctx.font = 'bold 8px monospace';
      ctx.fillStyle = '#00e5ff';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ 0.2ms', w / 2, 45);
      ctx.fillStyle = '#ffd700';
      ctx.fillText('EDGE NODE', w / 2, 58);

      // Stage Floor
      ctx.fillStyle = '#e040fb';
      ctx.fillRect(0, 80, w, 2);
      ctx.fillStyle = '#1c052c';
      ctx.fillRect(0, 82, w, h - 82);
    }
  }
}
