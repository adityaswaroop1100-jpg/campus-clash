/**
 * Campus Clash — Stage: Vendhar Square ("The Founder Monument")
 * 1:1 procedural rendering of Vendhar Square at SRM Institute of Science and Technology, Kattankulathur.
 * Features:
 *  - Dramatic fiery golden/amber sunset sky with glowing backlit clouds
 *  - Colossal monumental neoclassical & temple-fusion white stone monument with grand ascending staircases
 *  - Central colonnade with 4 fluted classical pillars and stone jali lattice relief frieze
 *  - Colossal Golden Statue of Founder-Chancellor Dr. T. R. Paarivendhar standing at the pinnacle
 *  - Geodesic dome water fountains spraying arching crystalline jets in real time
 *  - Geometric landscaped royal parterre gardens with purple petunias and manicured hedges
 *  - Ceremonial paved plaza combat arena with water surge and sunset god ray effects
 * @module stages/vendarSquare
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants.js';

export class VendharSquareStage {
  constructor() {
    this.id = 'vendharsquare';
    this.name = 'Vendhar Square';
    this.shortName = 'VENDHAR SQUARE';
    this.subtitle = 'The Grand Founder Monument & Plaza';
    this.groundY = 520;
    this.minX = 40;
    this.maxX = CANVAS_WIDTH - 40;

    this.animTime = 0;

    // Drifting Jasmine Petals & Golden Sunset Dust Particles
    this.particles = [];
    for (let i = 0; i < 28; i++) {
      this.particles.push({
        x: Math.random() * CANVAS_WIDTH,
        y: 60 + Math.random() * 420,
        vx: 0.3 + Math.random() * 0.7,
        vy: 0.2 + Math.random() * 0.5,
        size: 2.5 + Math.random() * 3,
        color: Math.random() > 0.4 ? '#ffffff' : '#ffd54f', // Jasmine flower petals & gold dust
        rot: Math.random() * Math.PI * 2,
        rotSpeed: 0.02 + Math.random() * 0.05
      });
    }

    // Geodesic Dome Fountain Water Sprays
    this.fountains = [
      { x: 190, y: 505, radius: 24, sprayTimer: 0 },
      { x: CANVAS_WIDTH / 2, y: 495, radius: 36, sprayTimer: 0.5 },
      { x: CANVAS_WIDTH - 190, y: 505, radius: 24, sprayTimer: 1.0 }
    ];

    // Water Droplets Array
    this.droplets = [];
    for (let i = 0; i < 45; i++) {
      this.droplets.push({
        fIndex: i % 3,
        angle: (i / 15) * Math.PI,
        dist: Math.random(),
        speed: 1.5 + Math.random() * 2
      });
    }

    // Stage Gimmick: Fountain Water Surge & Golden Sunset Aura
    this.surgeTimer = 480; // ~8 seconds
    this.surgeActive = 0;
  }

  update(dt = 0.016, fighters = [], particles = null, sound = null) {
    this.animTime += dt;

    // Update Drifting Jasmine Petals & Gold Dust
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy + Math.sin(this.animTime * 2.5 + p.x * 0.03) * 0.4;
      p.rot += p.rotSpeed;
      if (p.x > CANVAS_WIDTH + 20) {
        p.x = -20;
        p.y = 60 + Math.random() * 380;
      }
      if (p.y > this.groundY) {
        p.y = 60;
      }
    });

    // Fountain Surge Timer
    this.surgeTimer--;
    if (this.surgeTimer <= 0) {
      this.surgeTimer = 550 + Math.floor(Math.random() * 200);
      this.surgeActive = 70;
      if (sound && typeof sound.playTone === 'function') {
        sound.playTone(440, 'sine', 0.6, 0.4); // A4 bell chime
      }
    }

    if (this.surgeActive > 0) {
      this.surgeActive--;
    }
  }

  render(ctx) {
    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;
    const cx = w / 2;

    // =========================================================================
    // 1. DRAMATIC RADIANT SUNSET SKY & FIERY BACKLIT CLOUDS (PHOTO 1 & 2)
    // =========================================================================
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 360);
    skyGrad.addColorStop(0, '#7c2d12');   // Deep amber twilight top
    skyGrad.addColorStop(0.25, '#c2410c'); // Radiant orange
    skyGrad.addColorStop(0.55, '#ea580c'); // Blazing sunset orange
    skyGrad.addColorStop(0.8, '#f59e0b');  // Golden horizon
    skyGrad.addColorStop(1, '#fef08a');    // Molten white-gold sun core
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Volumetric Sunset God Rays Beaming Behind the Founder Statue
    ctx.save();
    ctx.globalAlpha = 0.25;
    const rayCount = 12;
    for (let r = 0; r < rayCount; r++) {
      const angle = (r / rayCount) * Math.PI - Math.PI / 2 + Math.sin(this.animTime * 0.5 + r) * 0.05;
      const rayGrad = ctx.createLinearGradient(cx, 130, cx + Math.cos(angle) * 600, 130 + Math.sin(angle) * 600);
      rayGrad.addColorStop(0, 'rgba(255, 245, 157, 0.9)');
      rayGrad.addColorStop(0.5, 'rgba(255, 213, 79, 0.3)');
      rayGrad.addColorStop(1, 'rgba(255, 152, 0, 0)');
      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(cx - 10, 130);
      ctx.lineTo(cx + 10, 130);
      ctx.lineTo(cx + Math.cos(angle + 0.12) * 600, 130 + Math.sin(angle + 0.12) * 600);
      ctx.lineTo(cx + Math.cos(angle - 0.12) * 600, 130 + Math.sin(angle - 0.12) * 600);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Fiery Backlit Sunset Clouds (Photo 1)
    this.renderSunsetClouds(ctx);

    // =========================================================================
    // 2. MONUMENTAL ARCHITECTURE: VENDHAR SQUARE EDIFICE (PHOTO 1 & 2)
    // Symmetrical Ascending Grand Staircases, Central Colonnade & Upper Terrace
    // =========================================================================
    this.renderMonumentStructure(ctx);

    // =========================================================================
    // 3. THE COLOSSAL GOLDEN STATUE OF DR. T. R. PAARIVENDHAR (PHOTO 1 & 2)
    // Towering at the summit on dark granite plinth against the sunset
    // =========================================================================
    this.renderFounderStatue(ctx);

    // =========================================================================
    // 4. CEREMONIAL GARDEN PARTERRES & GEODESIC DOME FOUNTAINS (PHOTO 2)
    // Geometric purple petunia parterres, green hedges & arching water jets
    // =========================================================================
    this.renderFountainsAndParterres(ctx);

    // =========================================================================
    // 5. CEREMONIAL PROMENADE COMBAT GROUND
    // =========================================================================
    this.renderPromenadeGround(ctx);

    // =========================================================================
    // 6. DRIFTING JASMINE PETALS & GOLD DUST
    // =========================================================================
    this.renderParticles(ctx);

    if (this.surgeActive > 0) {
      this.renderSurgeAlert(ctx);
    }
  }

  // ---------------------------------------------------------------------------
  // FIERY BACKLIT SUNSET CLOUDS (PHOTO 1)
  // ---------------------------------------------------------------------------
  renderSunsetClouds(ctx) {
    ctx.save();
    const drawSunsetCloud = (x, y, scale, speedFactor) => {
      const cx = x + Math.sin(this.animTime * 0.2 * speedFactor) * 15;
      // Dark cloud core
      ctx.fillStyle = 'rgba(124, 45, 18, 0.55)';
      ctx.beginPath();
      ctx.ellipse(cx, y, 90 * scale, 24 * scale, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 40 * scale, y - 8 * scale, 60 * scale, 26 * scale, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - 35 * scale, y + 4 * scale, 55 * scale, 20 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glowing golden cloud fringes (Backlit by the sunset)
      ctx.fillStyle = 'rgba(254, 240, 138, 0.45)';
      ctx.beginPath();
      ctx.ellipse(cx, y - 6 * scale, 85 * scale, 18 * scale, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 42 * scale, y - 12 * scale, 55 * scale, 20 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    drawSunsetCloud(160, 60, 1.2, 1);
    drawSunsetCloud(800, 75, 1.3, 0.8);
    drawSunsetCloud(350, 40, 0.9, 1.2);
    drawSunsetCloud(620, 50, 1.0, 0.9);
    drawSunsetCloud(480, 100, 1.5, 0.7);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // MONUMENT STRUCTURE: GRAND STAIRCASES & CENTRAL COLONNADE (PHOTO 1 & 2)
  // ---------------------------------------------------------------------------
  renderMonumentStructure(ctx) {
    const cx = CANVAS_WIDTH / 2;
    const monW = 760;
    const monX = cx - monW / 2; // 100
    const monBaseY = 485;
    const monTopY = 195; // Terrace level
    const centerWallW = 320;
    const centerWallX = cx - centerWallW / 2;

    ctx.save();

    // -------------------------------------------------------------------------
    // A. CENTRAL PALE MARBLE EDIFICE WALL (PHOTO 1 & 2)
    // -------------------------------------------------------------------------
    const wallGrad = ctx.createLinearGradient(0, monTopY, 0, monBaseY);
    wallGrad.addColorStop(0, '#fffcf7');
    wallGrad.addColorStop(0.3, '#faece6');
    wallGrad.addColorStop(0.7, '#f5ded7');
    wallGrad.addColorStop(1, '#ebd0c7');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(centerWallX, monTopY, centerWallW, monBaseY - monTopY);

    ctx.strokeStyle = '#d7b8ae';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(centerWallX, monTopY, centerWallW, monBaseY - monTopY);

    // Vertical Fine Ashlar Scoring on Marble Wall
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    for (let sy = monTopY + 18; sy < monBaseY; sy += 18) {
      ctx.beginPath();
      ctx.moveTo(centerWallX, sy);
      ctx.lineTo(centerWallX + centerWallW, sy);
      ctx.stroke();
    }

    // -------------------------------------------------------------------------
    // B. FOUR GRAND FLUTED CLASSICAL PILLARS (PHOTO 1 & 2)
    // Fluted white columns with ornate Dravidian-classical bracket capitals
    // -------------------------------------------------------------------------
    const colCount = 4;
    const colSpacing = (centerWallW - 50) / (colCount - 1);
    for (let c = 0; c < colCount; c++) {
      const colX = centerWallX + 25 + c * colSpacing;
      // Column Base Plinth
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(colX - 12, monBaseY - 24, 24, 24);
      ctx.strokeStyle = '#d7b8ae';
      ctx.lineWidth = 1;
      ctx.strokeRect(colX - 12, monBaseY - 24, 24, 24);

      // Fluted Shaft with Warm Marble Light Sheen
      const shaftGrad = ctx.createLinearGradient(colX - 9, 0, colX + 9, 0);
      shaftGrad.addColorStop(0, '#f2e8e3');
      shaftGrad.addColorStop(0.4, '#ffffff');
      shaftGrad.addColorStop(0.8, '#f7eee8');
      shaftGrad.addColorStop(1, '#e6d5cb');
      ctx.fillStyle = shaftGrad;
      ctx.fillRect(colX - 8, monTopY + 28, 16, monBaseY - monTopY - 52);

      // Fluting Lines
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      [-4, 0, 4].forEach(fx => {
        ctx.beginPath();
        ctx.moveTo(colX + fx, monTopY + 28);
        ctx.lineTo(colX + fx, monBaseY - 24);
        ctx.stroke();
      });

      // Ornate Tiered Bracket Capitals (Photo 1 signature)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(colX - 14, monTopY + 14, 28, 14);
      ctx.strokeStyle = '#d7b8ae';
      ctx.lineWidth = 1;
      ctx.strokeRect(colX - 14, monTopY + 14, 28, 14);

      // Stepped Corbel / Bracket Extrusion
      ctx.fillStyle = '#fff4eb';
      ctx.beginPath();
      ctx.moveTo(colX - 16, monTopY + 14);
      ctx.lineTo(colX + 16, monTopY + 14);
      ctx.lineTo(colX + 11, monTopY + 24);
      ctx.lineTo(colX - 11, monTopY + 24);
      ctx.closePath();
      ctx.fill();
    }

    // -------------------------------------------------------------------------
    // C. LOWER JALI LATTICE FRIEZE & GUARDIAN APSARA NICHES (PHOTO 1)
    // -------------------------------------------------------------------------
    const friezeY = monBaseY - 45;
    const friezeH = 22;
    ctx.fillStyle = '#f8ede7';
    ctx.fillRect(centerWallX, friezeY, centerWallW, friezeH);
    ctx.strokeStyle = '#c5a395';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(centerWallX, friezeY, centerWallW, friezeH);

    // Intricate Stone Lattice / Jali Diamond Grid (Photo 1)
    ctx.strokeStyle = 'rgba(188, 170, 164, 0.8)';
    ctx.lineWidth = 1;
    for (let jx = centerWallX + 8; jx < centerWallX + centerWallW - 8; jx += 10) {
      ctx.strokeRect(jx, friezeY + 4, 6, 6);
      ctx.strokeRect(jx + 3, friezeY + 11, 6, 6);
    }

    // Seated Sculptural Niches in Folded Hands Namaste Posture (Photo 1 flanks)
    const drawNicheFigure = (nx) => {
      ctx.save();
      // Arched Niche Recess
      ctx.fillStyle = '#4e342e';
      ctx.beginPath();
      ctx.arc(nx, friezeY - 14, 9, Math.PI, 0);
      ctx.lineTo(nx + 9, friezeY);
      ctx.lineTo(nx - 9, friezeY);
      ctx.closePath();
      ctx.fill();

      // White Stone Apsara Sculpture in Namaste (🙏)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(nx, friezeY - 15, 3.5, 0, Math.PI * 2); // Head
      ctx.fill();
      ctx.fillRect(nx - 4, friezeY - 11, 8, 8); // Torso & seated base
      ctx.restore();
    };

    drawNicheFigure(centerWallX + 38);
    drawNicheFigure(centerWallX + centerWallW - 38);

    // -------------------------------------------------------------------------
    // D. SYMMETRICAL GRAND ASCENDING STAIRCASES (PHOTO 1 & 2)
    // Left and Right grand stone stairways with stepped white balustrades
    // -------------------------------------------------------------------------
    const stairW = 210;
    const stairLeftX = centerWallX - stairW;
    const stairRightX = centerWallX + centerWallW;

    const renderGrandStaircase = (stX, isLeft) => {
      ctx.save();
      // 1. Triangular Staircase Flank Wall
      ctx.fillStyle = '#fcebed';
      ctx.beginPath();
      if (isLeft) {
        ctx.moveTo(stX, monBaseY);
        ctx.lineTo(stX + stairW, monTopY + 10);
        ctx.lineTo(stX + stairW, monBaseY);
      } else {
        ctx.moveTo(stX, monTopY + 10);
        ctx.lineTo(stX + stairW, monBaseY);
        ctx.lineTo(stX, monBaseY);
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#d7b8ae';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 2. Terraced Stone Steps (Granite treads & risers)
      const stepCount = 14;
      for (let s = 0; s < stepCount; s++) {
        const stepProgress = s / stepCount;
        const sx = isLeft
          ? stX + stepProgress * stairW
          : stX + (1 - stepProgress) * stairW - (stairW / stepCount);
        const sy = monBaseY - (stepCount - s) * ((monBaseY - monTopY - 10) / stepCount);

        // Step Riser
        ctx.fillStyle = '#d7ccc8';
        ctx.fillRect(sx, sy, stairW / stepCount + 2, 8);
        // Step Tread
        ctx.fillStyle = '#efebe9';
        ctx.fillRect(sx, sy - 3, stairW / stepCount + 4, 3);
      }

      // 3. Stepped White Balustrade Railing & Finials (Photo 1 & 2)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      if (isLeft) {
        ctx.moveTo(stX - 4, monBaseY - 18);
        ctx.lineTo(stX + stairW, monTopY - 6);
      } else {
        ctx.moveTo(stX, monTopY - 6);
        ctx.lineTo(stX + stairW + 4, monBaseY - 18);
      }
      ctx.stroke();

      // Baluster Pillars along the Incline
      for (let b = 1; b < stepCount; b++) {
        const prog = b / stepCount;
        const bx = isLeft ? stX + prog * stairW : stX + (1 - prog) * stairW;
        const by = isLeft
          ? monBaseY - 18 - prog * (monBaseY - monTopY - 12)
          : monTopY - 6 + prog * (monBaseY - monTopY - 12);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bx - 1.5, by, 3, 14);
      }

      // 4. Rooftop Mandapam / Pavilions at the Staircase Landing (Photo 1 & 2)
      const pavX = isLeft ? stX + stairW - 14 : stX - 10;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(pavX - 10, monTopY - 24, 24, 24);
      ctx.strokeStyle = '#d7b8ae';
      ctx.lineWidth = 1;
      ctx.strokeRect(pavX - 10, monTopY - 24, 24, 24);

      // Dravidian Tiered Stepped Pyramid Shikhara Top (Photo 1 & 2)
      for (let sh = 0; sh < 3; sh++) {
        ctx.fillStyle = sh % 2 === 0 ? '#fffcf7' : '#ffd54f';
        ctx.fillRect(pavX - 12 + sh * 3, monTopY - 28 - sh * 5, 24 - sh * 6, 5);
      }
      // Kalasam Spire Finial
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(pavX, monTopY - 45, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(pavX - 1, monTopY - 49, 2, 5);

      ctx.restore();
    };

    renderGrandStaircase(stairLeftX, true);
    renderGrandStaircase(stairRightX, false);

    // -------------------------------------------------------------------------
    // E. UPPER ROOFTOP TERRACE BALUSTRADE & FINIALS (PHOTO 1)
    // -------------------------------------------------------------------------
    const terraceW = centerWallW + 24;
    const terraceX = cx - terraceW / 2;
    const terraceY = monTopY;

    // Terrace Base Slab
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(terraceX, terraceY, terraceW, 8);
    ctx.strokeStyle = '#d7b8ae';
    ctx.lineWidth = 1;
    ctx.strokeRect(terraceX, terraceY, terraceW, 8);

    // White Turned Balustrade along Summit Terrace
    const balTopY = terraceY - 18;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(terraceX, balTopY, terraceW, 4); // Handrail
    for (let bx = terraceX + 6; bx < terraceX + terraceW - 6; bx += 8) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx, balTopY + 4, 3, 14);
    }

    // Classical Stone Spire Finials (Photo 1 signature)
    for (let fx = terraceX + 12; fx < terraceX + terraceW; fx += 32) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(fx - 3, balTopY);
      ctx.lineTo(fx, balTopY - 8);
      ctx.lineTo(fx + 3, balTopY);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // THE COLOSSAL GOLDEN STATUE OF DR. T. R. PAARIVENDHAR (PHOTO 1 & 2)
  // ---------------------------------------------------------------------------
  renderFounderStatue(ctx) {
    const cx = CANVAS_WIDTH / 2;
    const terraceY = 195;

    ctx.save();

    // 1. Dark Polished Granite Pedestal Plinth (Photo 1)
    const plinthW = 54;
    const plinthH = 22;
    const plinthX = cx - plinthW / 2;
    const plinthY = terraceY - plinthH - 14;

    // Dark Granite Gradient
    const pGrad = ctx.createLinearGradient(plinthX, plinthY, plinthX, plinthY + plinthH);
    pGrad.addColorStop(0, '#37474f');
    pGrad.addColorStop(0.5, '#263238');
    pGrad.addColorStop(1, '#102027');
    ctx.fillStyle = pGrad;
    ctx.fillRect(plinthX, plinthY, plinthW, plinthH);

    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(plinthX, plinthY, plinthW, plinthH);

    // Plinth Golden Inscribed Dedication Plaque
    ctx.font = '900 4px sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.fillText('DR. T. R. PAARIVENDHAR', cx, plinthY + 10);
    ctx.font = 'bold 3.5px sans-serif';
    ctx.fillStyle = '#fff59d';
    ctx.fillText('FOUNDER CHANCELLOR', cx, plinthY + 16);

    // 2. Colossal Golden Statue Figure (Photo 1 & 2)
    // Cast in brilliant radiant gold, formal suit, hands clasped in front
    const statueBaseY = plinthY;
    const statueH = 65;
    const statueTopY = statueBaseY - statueH;

    // Golden Aura Sun Disc behind Statue
    ctx.save();
    const auraGrad = ctx.createRadialGradient(cx, statueTopY + 25, 6, cx, statueTopY + 25, 45);
    auraGrad.addColorStop(0, 'rgba(255, 235, 59, 0.8)');
    auraGrad.addColorStop(0.4, 'rgba(255, 179, 0, 0.4)');
    auraGrad.addColorStop(1, 'rgba(255, 111, 0, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(cx, statueTopY + 25, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Metallic Gold Shader Gradient
    const goldGrad = ctx.createLinearGradient(cx - 12, statueTopY, cx + 12, statueBaseY);
    goldGrad.addColorStop(0, '#fff9c4'); // Highlight
    goldGrad.addColorStop(0.2, '#ffd54f');
    goldGrad.addColorStop(0.5, '#ffb300');
    goldGrad.addColorStop(0.8, '#ff8f00');
    goldGrad.addColorStop(1, '#c47d00'); // Shadow
    ctx.fillStyle = goldGrad;

    // Shoes on Pedestal
    ctx.fillRect(cx - 5, statueBaseY - 4, 4, 4);
    ctx.fillRect(cx + 1, statueBaseY - 4, 4, 4);

    // Suit Trousers (Formal Pants)
    ctx.fillRect(cx - 6, statueBaseY - 28, 5, 24);
    ctx.fillRect(cx + 1, statueBaseY - 28, 5, 24);

    // Suit Jacket / Torso (Standing tall, dignified presence)
    ctx.beginPath();
    ctx.moveTo(cx - 8, statueBaseY - 28);
    ctx.lineTo(cx + 8, statueBaseY - 28);
    ctx.lineTo(cx + 10, statueBaseY - 50);
    ctx.lineTo(cx - 10, statueBaseY - 50);
    ctx.closePath();
    ctx.fill();

    // Clasped Hands in Front (Photo 1 signature posture)
    ctx.fillStyle = '#fff176';
    ctx.beginPath();
    ctx.arc(cx, statueBaseY - 38, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Suit Lapels & Necktie
    ctx.fillStyle = '#c47d00';
    ctx.beginPath();
    ctx.moveTo(cx - 3, statueBaseY - 50);
    ctx.lineTo(cx, statueBaseY - 42);
    ctx.lineTo(cx + 3, statueBaseY - 50);
    ctx.closePath();
    ctx.fill();

    // Head & Hair Profile (Photo 1)
    ctx.fillStyle = goldGrad;
    ctx.beginPath();
    ctx.arc(cx, statueTopY + 7, 6.5, 0, Math.PI * 2);
    ctx.fill();

    // Spectacles & Facial Features (Subtle gold highlight)
    ctx.strokeStyle = '#fff9c4';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 4, statueTopY + 5, 3.5, 3);
    ctx.strokeRect(cx + 1, statueTopY + 5, 3.5, 3);

    // Dynamic Sunlight Shimmer Glint
    const glint = (Math.sin(this.animTime * 3) + 1) * 0.5;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + glint * 0.6})`;
    ctx.beginPath();
    ctx.arc(cx - 3, statueTopY + 18, 2 + glint * 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // GEODESIC DOME FOUNTAINS & ROYAL PARTERRES (PHOTO 2)
  // ---------------------------------------------------------------------------
  renderFountainsAndParterres(ctx) {
    const gy = this.groundY;
    const cx = CANVAS_WIDTH / 2;

    ctx.save();

    // 1. Geometric Landscaped Garden Parterres (Photo 2)
    // Manicured hedges and purple petunia beds flanking the fountains
    const renderGardenParterre = (px, py, pw, ph) => {
      // Dark Soil Bed
      ctx.fillStyle = '#2e1c14';
      ctx.fillRect(px, py, pw, ph);

      // Manicured Green Boxwood Hedge Border
      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = 3;
      ctx.strokeRect(px, py, pw, ph);

      // Clustered Purple Petunias & Lavender (Photo 2 signature color)
      for (let fx = px + 4; fx < px + pw - 4; fx += 7) {
        ctx.fillStyle = (fx % 14 === 0) ? '#7e57c2' : '#ab47bc'; // Purple & lavender
        ctx.beginPath();
        ctx.arc(fx, py + ph / 2 + Math.sin(fx) * 2, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    renderGardenParterre(60, 488, 100, 16);
    renderGardenParterre(240, 492, 90, 14);
    renderGardenParterre(cx - 80, 494, 160, 12);
    renderGardenParterre(CANVAS_WIDTH - 330, 492, 90, 14);
    renderGardenParterre(CANVAS_WIDTH - 160, 488, 100, 16);

    // 2. Geodesic Dome Wireframe Water Fountains (Photo 2 signature)
    this.fountains.forEach(f => {
      // Circular Stone Basin
      const bGrad = ctx.createLinearGradient(f.x - f.radius, f.y, f.x + f.radius, f.y);
      bGrad.addColorStop(0, '#90a4ae');
      bGrad.addColorStop(0.5, '#cfd8dc');
      bGrad.addColorStop(1, '#78909c');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y + 4, f.radius + 6, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Crystalline Cyan Water Pool in Basin
      ctx.fillStyle = '#29b6f6';
      ctx.beginPath();
      ctx.ellipse(f.x, f.y + 4, f.radius + 2, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Stainless Steel Geodesic Dome Frame (Photo 2)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(f.x, f.y + 4, f.radius * 0.75, Math.PI, 0);
      ctx.stroke();

      // Geodesic Interlocking Ribs
      for (let r = 1; r <= 3; r++) {
        ctx.beginPath();
        ctx.ellipse(f.x, f.y + 4 - r * 5, f.radius * (0.75 - r * 0.18), 3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Arching Crystalline Water Jet Sprays (Active Simulation)
      const surgeMultiplier = this.surgeActive > 0 ? 1.8 : 1.0;
      ctx.save();
      const jetCount = 8;
      for (let j = 0; j < jetCount; j++) {
        const jAngle = (j / jetCount) * Math.PI;
        const sprayHeight = (18 + Math.sin(this.animTime * 4 + j) * 4) * surgeMultiplier;
        const sprayWidth = f.radius * (0.8 + Math.cos(this.animTime * 3 + j) * 0.1);

        // Water Arc
        ctx.strokeStyle = 'rgba(224, 247, 250, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(f.x, f.y + 2);
        ctx.quadraticCurveTo(
          f.x + Math.cos(jAngle) * sprayWidth * 0.5,
          f.y - sprayHeight,
          f.x + Math.cos(jAngle) * sprayWidth,
          f.y + 3
        );
        ctx.stroke();
      }

      // Prismatic Rainbow Mist Cloud over Fountain
      const mistAlpha = (0.25 + Math.sin(this.animTime * 2 + f.x) * 0.1) * surgeMultiplier;
      const mistGrad = ctx.createRadialGradient(f.x, f.y - 12, 2, f.x, f.y - 12, f.radius);
      mistGrad.addColorStop(0, `rgba(255, 255, 255, ${mistAlpha})`);
      mistGrad.addColorStop(0.5, `rgba(0, 229, 255, ${mistAlpha * 0.6})`);
      mistGrad.addColorStop(1, 'rgba(0, 229, 255, 0)');
      ctx.fillStyle = mistGrad;
      ctx.beginPath();
      ctx.arc(f.x, f.y - 12, f.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // CEREMONIAL PROMENADE COMBAT GROUND
  // ---------------------------------------------------------------------------
  renderPromenadeGround(ctx) {
    const w = CANVAS_WIDTH;
    const gy = this.groundY;

    ctx.save();
    // Ceremonial Granite Asphalt
    const groundGrad = ctx.createLinearGradient(0, gy, 0, CANVAS_HEIGHT);
    groundGrad.addColorStop(0, '#37474f');
    groundGrad.addColorStop(0.4, '#263238');
    groundGrad.addColorStop(1, '#102027');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, gy, w, CANVAS_HEIGHT - gy);

    // Warm Sunset Ground Light Sheen
    const sheenGrad = ctx.createLinearGradient(0, gy, 0, gy + 15);
    sheenGrad.addColorStop(0, 'rgba(255, 179, 0, 0.25)');
    sheenGrad.addColorStop(1, 'rgba(255, 179, 0, 0)');
    ctx.fillStyle = sheenGrad;
    ctx.fillRect(0, gy, w, 15);

    // Promenade Pavement Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }

    // White Stone Curb Edge
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();

    // Golden Accent Curb Line
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, gy + 2.5);
    ctx.lineTo(w, gy + 2.5);
    ctx.stroke();

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // DRIFTING JASMINE PETALS & GOLD DUST
  // ---------------------------------------------------------------------------
  renderParticles(ctx) {
    ctx.save();
    this.particles.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // FOUNTAIN SURGE AUDIO-VISUAL ALERT
  // ---------------------------------------------------------------------------
  renderSurgeAlert(ctx) {
    ctx.save();
    const alpha = this.surgeActive / 70;
    ctx.font = '900 12px "Arial Black", monospace';
    ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 10;
    ctx.textAlign = 'center';
    ctx.fillText('⚡ VENDHAR SQUARE FOUNTAIN SURGE ⚡', CANVAS_WIDTH / 2, 70);
    ctx.restore();
  }
}

// Backwards compatibility alias
export { VendharSquareStage as VendarSquareStage };
