/**
 * Campus Clash — Stage: SRM Silver Jubilee Arch Gate ("The Main Entrance")
 * 1:1 procedural rendering of the iconic neoclassical blush-pink twin-arch monument
 * at SRM Institute of Science and Technology, Kattankulathur (GST Road / NH45).
 * Features:
 *  - Symmetrical blush-pink neoclassical facade with ashlar masonry joints
 *  - Left and right pavilion towers crowned with classical pediments and balustrade loggias
 *  - Twin grand semicircular Roman arches with molded white archivolts & keystones
 *  - Central dividing pier with twin fluted Corinthian columns & circular SRM University Seal
 *  - Mahatma Gandhi Bronze Statue on curved white marble plinth with dedication plaque
 *  - Horizontal entablature with embossed "SRM UNIVERSITY" and rooftop Tamil script "எஸ்.ஆர்.எம் பல்கலைக்கழகம்"
 *  - Background tall SRM high-rise building with pink facade and vertical blue solar-glass ribbons
 *  - Fan-patterned cobblestone plaza ground with interactive SRM security barricades
 * @module stages/archGate
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants.js';

export class ArchGateStage {
  constructor() {
    this.id = 'archgate';
    this.name = 'SRM Silver Jubilee Arch Gate';
    this.shortName = 'SILVER JUBILEE ARCH';
    this.subtitle = 'GST Road (NH45) Main Entrance';
    this.groundY = 520;
    this.minX = 40;
    this.maxX = CANVAS_WIDTH - 40;

    this.animTime = 0;

    // Drifting Chennai Coastal Sea Breeze Leaves
    this.leaves = [];
    for (let i = 0; i < 22; i++) {
      this.leaves.push({
        x: Math.random() * CANVAS_WIDTH,
        y: 80 + Math.random() * 380,
        vx: 0.5 + Math.random() * 0.8,
        vy: 0.15 + Math.random() * 0.35,
        size: 3 + Math.random() * 2.5,
        color: Math.random() > 0.4 ? '#4caf50' : '#81c784',
        rot: Math.random() * Math.PI * 2,
        rotSpeed: 0.03 + Math.random() * 0.05
      });
    }

    // Interactive SRM University Safety Barricades
    this.leftBarricade = { x: 65, y: 462, w: 72, h: 58, wobble: 0 };
    this.rightBarricade = { x: CANVAS_WIDTH - 137, y: 462, w: 72, h: 58, wobble: 0 };

    // Stage Gimmick: SRM Campus Transport Bus Horn
    this.busHornTimer = 620; // ~10 seconds
    this.busHornActive = 0;
    this.busHonked = false;
  }

  update(dt = 0.016, fighters = [], particles = null, sound = null) {
    this.animTime += dt;

    // Update Drifting Leaves
    this.leaves.forEach(l => {
      l.x += l.vx;
      l.y += l.vy + Math.sin(this.animTime * 2 + l.x * 0.02) * 0.3;
      l.rot += l.rotSpeed;
      if (l.x > CANVAS_WIDTH + 25) {
        l.x = -25;
        l.y = 80 + Math.random() * 360;
      }
      if (l.y > this.groundY) {
        l.y = 80;
      }
    });

    // Barricade Wobble Decay
    if (this.leftBarricade.wobble > 0) this.leftBarricade.wobble -= 0.1;
    if (this.rightBarricade.wobble > 0) this.rightBarricade.wobble -= 0.1;

    // Check fighter collisions with Security Barricades
    fighters.forEach(f => {
      if (!f) return;
      // Left Barricade Collision
      if (f.x < 135 && Math.abs(f.vx) > 2.5 && f.isGrounded) {
        this.leftBarricade.wobble = 6.5;
        f.vx = Math.abs(f.vx) * 0.65; // Elastic bounce
        if (particles && typeof particles.spawnHitSparks === 'function') {
          particles.spawnHitSparks(105, f.y - 30, '#ffd700', 8);
        }
        if (sound && typeof sound.playBlock === 'function') sound.playBlock();
      }
      // Right Barricade Collision
      if (f.x > CANVAS_WIDTH - 135 && Math.abs(f.vx) > 2.5 && f.isGrounded) {
        this.rightBarricade.wobble = 6.5;
        f.vx = -Math.abs(f.vx) * 0.65; // Elastic bounce
        if (particles && typeof particles.spawnHitSparks === 'function') {
          particles.spawnHitSparks(CANVAS_WIDTH - 105, f.y - 30, '#ffd700', 8);
        }
        if (sound && typeof sound.playBlock === 'function') sound.playBlock();
      }
    });

    // Campus Bus Horn Timer
    this.busHornTimer--;
    if (this.busHornTimer <= 0) {
      if (!this.busHonked) {
        this.busHonked = true;
        this.busHornActive = 60;
        if (sound && typeof sound.playBusHorn === 'function') {
          sound.playBusHorn();
        } else if (sound && typeof sound.playTone === 'function') {
          sound.playTone(220, 'sawtooth', 0.5, 0.4);
        }
      }
    }

    if (this.busHornActive > 0) {
      this.busHornActive--;
      if (this.busHornActive <= 0) {
        this.busHornTimer = 650 + Math.floor(Math.random() * 200);
        this.busHonked = false;
      }
    }
  }

  render(ctx) {
    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;
    const cx = w / 2;

    // =========================================================================
    // 1. TAMIL NADU COASTAL SKY & CLOUDS (PHOTO 1 & 2)
    // =========================================================================
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.groundY);
    skyGrad.addColorStop(0, '#3a85b9');
    skyGrad.addColorStop(0.35, '#68a8cf');
    skyGrad.addColorStop(0.7, '#bad9ed');
    skyGrad.addColorStop(1, '#e8f3fa');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Drifting Cumulus Clouds
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    const drawCloud = (x, y, scale) => {
      ctx.beginPath();
      ctx.ellipse(x, y, 70 * scale, 22 * scale, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 35 * scale, y - 8 * scale, 50 * scale, 26 * scale, 0, 0, Math.PI * 2);
      ctx.ellipse(x - 30 * scale, y + 2 * scale, 45 * scale, 18 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    drawCloud(170, 50, 1.1);
    drawCloud(780, 65, 1.3);
    drawCloud(490, 35, 0.85);
    ctx.restore();

    // =========================================================================
    // 2. BACKGROUND ARCHITECTURE: SRM HIGH-RISE TOWER & LUSH CANOPY (PHOTO 1 & 2)
    // Rising behind the left wing: pale pink high-rise with vertical solar glass ribbons
    // =========================================================================
    this.renderBackgroundTower(ctx);

    // =========================================================================
    // 3. THE SILVER JUBILEE ARCH GATE (NEOCLASSICAL PINK TWIN ARCH)
    // =========================================================================
    this.renderArchMonument(ctx);

    // =========================================================================
    // 4. MAHATMA GANDHI BRONZE STATUE & WHITE MARBLE PLINTH (PHOTO 1 & 2)
    // =========================================================================
    this.renderGandhiMonument(ctx);

    // =========================================================================
    // 5. INTERACTIVE SRM SECURITY BARRICADES & PLANTERS (PHOTO 1, 2 & 3)
    // =========================================================================
    this.renderBarricadesAndPlanters(ctx);

    // =========================================================================
    // 6. FAN-PATTERNED COBBLESTONE COURTYARD ARENA (GROUND)
    // =========================================================================
    this.renderCourtyardGround(ctx);

    // =========================================================================
    // 7. DRIFTING TROPICAL LEAVES & BUS HORN INDICATOR
    // =========================================================================
    this.renderLeaves(ctx);

    if (this.busHornActive > 0) {
      this.renderBusHornAlert(ctx);
    }
  }

  // ---------------------------------------------------------------------------
  // BACKGROUND SRM HIGH-RISE (PHOTO 1 & 2 SIGNATURE)
  // ---------------------------------------------------------------------------
  renderBackgroundTower(ctx) {
    ctx.save();

    // Towering SRM University / Medical High-Rise Block (Behind Left Pavilion)
    const bldX = 90;
    const bldY = 18;
    const bldW = 185;
    const bldH = 460;

    // Building Main Facade: Pale Blush Pink
    const bGrad = ctx.createLinearGradient(bldX, bldY, bldX + bldW, bldY);
    bGrad.addColorStop(0, '#f2d4d8');
    bGrad.addColorStop(0.5, '#ebd0d4');
    bGrad.addColorStop(1, '#dfc1c6');
    ctx.fillStyle = bGrad;
    ctx.fillRect(bldX, bldY, bldW, bldH);

    ctx.strokeStyle = '#cbaab0';
    ctx.lineWidth = 1;
    ctx.strokeRect(bldX, bldY, bldW, bldH);

    // Attic Stepped Pediment on High-Rise (Photo 1)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bldX + 15, bldY - 10, bldW - 30, 10);
    ctx.beginPath();
    ctx.moveTo(bldX + 35, bldY - 10);
    ctx.lineTo(bldX + bldW / 2, bldY - 20);
    ctx.lineTo(bldX + bldW - 35, bldY - 10);
    ctx.closePath();
    ctx.fillStyle = '#ebd0d4';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Iconic Vertical Solar Blue Glass Window Columns (Photo 1 & 2)
    const winCols = 4;
    const colSpacing = (bldW - 30) / winCols;
    for (let c = 0; c < winCols; c++) {
      const wx = bldX + 18 + c * colSpacing;
      // Multi-story continuous blue vertical glass strip
      const glassGrad = ctx.createLinearGradient(wx, 0, wx + 18, 0);
      glassGrad.addColorStop(0, '#0277bd');
      glassGrad.addColorStop(0.5, '#00b0ff');
      glassGrad.addColorStop(1, '#01579b');
      ctx.fillStyle = glassGrad;
      ctx.fillRect(wx, bldY + 8, 17, 340);

      // Floor Spandrel Dividers
      ctx.fillStyle = '#ffffff';
      for (let f = 1; f < 8; f++) {
        ctx.fillRect(wx - 1, bldY + f * 42, 19, 3);
      }
    }

    // Right Building Wing (Distant background behind right pavilion)
    const rBldX = CANVAS_WIDTH - 240;
    ctx.fillStyle = '#f0d6d9';
    ctx.fillRect(rBldX, bldY + 45, 140, bldH);
    ctx.strokeStyle = '#cbaab0';
    ctx.strokeRect(rBldX, bldY + 45, 140, bldH);
    for (let c = 0; c < 3; c++) {
      const rwx = rBldX + 18 + c * 40;
      ctx.fillStyle = '#0288d1';
      ctx.fillRect(rwx, bldY + 60, 16, 260);
    }

    // Dense Green University Canopy through Arch Openings (Photo 1 & 2)
    // Trees behind center pier and twin arches
    ctx.fillStyle = '#1b4332';
    for (let tx = 210; tx <= 750; tx += 35) {
      ctx.beginPath();
      ctx.arc(tx, 340 + Math.sin(tx * 0.05) * 15, 38, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#2d6a4f';
    for (let tx = 225; tx <= 735; tx += 40) {
      ctx.beginPath();
      ctx.arc(tx, 325 + Math.cos(tx * 0.06) * 12, 32, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#40916c';
    for (let tx = 240; tx <= 720; tx += 50) {
      ctx.beginPath();
      ctx.arc(tx, 310 + Math.sin(tx * 0.08) * 10, 26, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // MAIN MONUMENT: THE SILVER JUBILEE ARCH (PHOTO 1, 2, 3)
  // ---------------------------------------------------------------------------
  renderArchMonument(ctx) {
    const cx = CANVAS_WIDTH / 2;
    const archTotalW = 760;
    const archX = cx - archTotalW / 2; // 100
    const archTopY = 150;
    const archBottomY = 480;

    ctx.save();

    // -------------------------------------------------------------------------
    // A. MAIN PINK NEOCLASSICAL STONE FACADE WITH ASHLAR GROOVING
    // -------------------------------------------------------------------------
    const facadeGrad = ctx.createLinearGradient(0, archTopY, 0, archBottomY);
    facadeGrad.addColorStop(0, '#fbe4e8');
    facadeGrad.addColorStop(0.3, '#f7c5cb');
    facadeGrad.addColorStop(0.7, '#f0abb3');
    facadeGrad.addColorStop(1, '#e3939c');
    ctx.fillStyle = facadeGrad;
    ctx.fillRect(archX, archTopY, archTotalW, archBottomY - archTopY);

    ctx.strokeStyle = '#c57881';
    ctx.lineWidth = 2;
    ctx.strokeRect(archX, archTopY, archTotalW, archBottomY - archTopY);

    // Authentic Horizontal Ashlar Stone Scoring (Photo 1 & 2)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1;
    for (let sy = archTopY + 14; sy < archBottomY; sy += 14) {
      ctx.beginPath();
      ctx.moveTo(archX, sy);
      ctx.lineTo(archX + archTotalW, sy);
      ctx.stroke();
    }

    // -------------------------------------------------------------------------
    // B. LEFT & RIGHT PAVILION TOWERS WITH CLASSICAL PEDIMENTS (PHOTO 1 & 2)
    // -------------------------------------------------------------------------
    const towerW = 115;
    const leftTowerX = archX;
    const rightTowerX = archX + archTotalW - towerW;

    const renderTowerPavilion = (tx, isLeft) => {
      // 1. Classical Triangular Pediment (Rooftop Gable)
      const pedTopY = archTopY - 42;
      const pedBaseY = archTopY;
      ctx.fillStyle = '#fcebed';
      ctx.beginPath();
      ctx.moveTo(tx - 6, pedBaseY);
      ctx.lineTo(tx + towerW / 2, pedTopY);
      ctx.lineTo(tx + towerW + 6, pedBaseY);
      ctx.closePath();
      ctx.fill();

      // Pediment Raking Cornice & Dentils
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(tx - 8, pedBaseY - 4, towerW + 16, 5);

      // Tympanum Relief Rosette
      ctx.fillStyle = '#e3939c';
      ctx.beginPath();
      ctx.arc(tx + towerW / 2, pedBaseY - 14, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // 2. White Rusticated Corner Quoins (Photo 1 & 2)
      const quoinX = isLeft ? tx : tx + towerW - 12;
      for (let qy = archTopY + 8; qy < archBottomY - 20; qy += 24) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(quoinX, qy, 12, 11);
        ctx.fillRect(quoinX + (isLeft ? 0 : 3), qy + 12, 9, 11);
      }

      // 3. Upper Arched Loggia Window Niche (Photo 1 & 2)
      const logX = tx + towerW / 2 - 20;
      const logY = archTopY + 45;
      const logW = 40;
      const logH = 105;

      // Dark Interior Niche
      ctx.fillStyle = '#212121';
      ctx.beginPath();
      ctx.arc(logX + logW / 2, logY + logW / 2, logW / 2, Math.PI, 0);
      ctx.lineTo(logX + logW, logY + logH);
      ctx.lineTo(logX, logY + logH);
      ctx.closePath();
      ctx.fill();

      // White Molded Window Surround & Keystone
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(logX + logW / 2 - 6, logY - 4, 12, 8);

      // White Balustrade Balcony Railing (Photo 1)
      const balY = logY + logH - 24;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(logX - 4, balY, logW + 8, 4);
      ctx.fillRect(logX - 4, logY + logH, logW + 8, 4);
      for (let bx = logX; bx <= logX + logW; bx += 7) {
        ctx.fillRect(bx, balY + 4, 3, 20);
      }

      // 4. Ground-Level Arched Pedestrian Gate (Photo 1 & 2)
      const pedGateX = tx + towerW / 2 - 22;
      const pedGateY = archBottomY - 95;
      const pedGateW = 44;
      const pedGateH = 95;

      // Deep Shadowed Passage
      ctx.fillStyle = '#101e18';
      ctx.beginPath();
      ctx.arc(pedGateX + pedGateW / 2, pedGateY + pedGateW / 2, pedGateW / 2, Math.PI, 0);
      ctx.lineTo(pedGateX + pedGateW, pedGateY + pedGateH);
      ctx.lineTo(pedGateX, pedGateY + pedGateH);
      ctx.closePath();
      ctx.fill();

      // White Arch Molding & Keystone
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(pedGateX + pedGateW / 2 - 6, pedGateY - 4, 12, 8);

      // Wrought Iron Black Gate Grille
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
      ctx.lineWidth = 1.5;
      for (let gx = pedGateX + 6; gx < pedGateX + pedGateW; gx += 8) {
        ctx.beginPath();
        ctx.moveTo(gx, pedGateY + pedGateH);
        ctx.lineTo(gx, pedGateY + 22);
        ctx.stroke();
      }
    };

    renderTowerPavilion(leftTowerX, true);
    renderTowerPavilion(rightTowerX, false);

    // -------------------------------------------------------------------------
    // C. TWIN GRAND ROMAN ARCH OPENINGS (LEFT & RIGHT MAIN GATES)
    // -------------------------------------------------------------------------
    const mainArchRadius = 96;
    const mainArchSpringY = 320;
    const archLeftCX = cx - 150;
    const archRightCX = cx + 150;

    const renderGrandRomanArch = (acx) => {
      // 1. Cutout Interior Showing University Greenery & Sky
      ctx.save();
      ctx.beginPath();
      ctx.arc(acx, mainArchSpringY, mainArchRadius, Math.PI, 0);
      ctx.lineTo(acx + mainArchRadius, archBottomY);
      ctx.lineTo(acx - mainArchRadius, archBottomY);
      ctx.closePath();
      ctx.clip();

      // Sky & Foliage inside the arch
      const innerSky = ctx.createLinearGradient(0, mainArchSpringY - mainArchRadius, 0, archBottomY);
      innerSky.addColorStop(0, '#7ab0d1');
      innerSky.addColorStop(0.5, '#b9d9ed');
      innerSky.addColorStop(1, '#1b4332');
      ctx.fillStyle = innerSky;
      ctx.fillRect(acx - mainArchRadius - 10, mainArchSpringY - mainArchRadius - 10, mainArchRadius * 2 + 20, archBottomY);

      // Campus Interior Pathway & Lush Banyan Foliage
      ctx.fillStyle = '#143625';
      for (let tx = acx - mainArchRadius; tx <= acx + mainArchRadius; tx += 28) {
        ctx.beginPath();
        ctx.arc(tx, 390 + Math.sin(tx * 0.1) * 14, 30, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#26573c';
      for (let tx = acx - mainArchRadius + 14; tx <= acx + mainArchRadius; tx += 32) {
        ctx.beginPath();
        ctx.arc(tx, 375 + Math.cos(tx * 0.12) * 12, 24, 0, Math.PI * 2);
        ctx.fill();
      }

      // Distant Campus Road & Yellow SRM Campus Shuttle Bus
      ctx.fillStyle = '#37474f';
      ctx.fillRect(acx - mainArchRadius, 435, mainArchRadius * 2, 45);
      ctx.strokeStyle = '#ffffff';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(acx - mainArchRadius, 455);
      ctx.lineTo(acx + mainArchRadius, 455);
      ctx.stroke();
      ctx.setLineDash([]);

      // Distant SRM Blue Bus Fleet (Photo 1 background)
      const busX = acx - 30 + Math.sin(this.animTime * 0.8) * 18;
      ctx.fillStyle = '#0d47a1'; // SRM Blue Bus
      ctx.fillRect(busX, 422, 54, 22);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(busX, 420, 54, 3);
      ctx.fillStyle = '#81d4fa';
      for (let w = 0; w < 4; w++) {
        ctx.fillRect(busX + 5 + w * 11, 425, 8, 8);
      }
      ctx.fillStyle = '#212121';
      ctx.beginPath();
      ctx.arc(busX + 12, 444, 4.5, 0, Math.PI * 2);
      ctx.arc(busX + 44, 444, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Black & Gold Decorative Wrought Iron Security Gates (Open)
      ctx.strokeStyle = '#1b1b1b';
      ctx.lineWidth = 2.5;
      for (let gx = acx - mainArchRadius + 10; gx < acx - mainArchRadius + 45; gx += 10) {
        ctx.beginPath();
        ctx.moveTo(gx, archBottomY);
        ctx.lineTo(gx, archBottomY - 60);
        ctx.stroke();
      }
      for (let gx = acx + mainArchRadius - 45; gx < acx + mainArchRadius - 5; gx += 10) {
        ctx.beginPath();
        ctx.moveTo(gx, archBottomY);
        ctx.lineTo(gx, archBottomY - 60);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Thick Molded White Archivolt & Rings
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(acx, mainArchSpringY, mainArchRadius, Math.PI, 0);
      ctx.stroke();

      ctx.strokeStyle = '#e0a3ab';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(acx, mainArchSpringY, mainArchRadius + 5, Math.PI, 0);
      ctx.stroke();

      // 3. Classical Impost Molding Brackets at Spring Line
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(acx - mainArchRadius - 8, mainArchSpringY - 4, 16, 12);
      ctx.fillRect(acx + mainArchRadius - 8, mainArchSpringY - 4, 16, 12);

      // 4. Prominent Classical Keystone at 12 o'clock (Photo 1 & 2)
      const ksY = mainArchSpringY - mainArchRadius;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(acx - 12, ksY + 8);
      ctx.lineTo(acx - 16, ksY - 14);
      ctx.lineTo(acx + 16, ksY - 14);
      ctx.lineTo(acx + 12, ksY + 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#c57881';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Vertical White Pilaster Shafts Flanking the Arch
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(acx - mainArchRadius - 6, mainArchSpringY, 8, archBottomY - mainArchSpringY);
      ctx.fillRect(acx + mainArchRadius - 2, mainArchSpringY, 8, archBottomY - mainArchSpringY);
    };

    renderGrandRomanArch(archLeftCX);
    renderGrandRomanArch(archRightCX);

    // -------------------------------------------------------------------------
    // D. CENTER DIVIDING PIER & SRM EMBOSSED SEAL MEDALLION (PHOTO 1 & 2)
    // Sits symmetrically right between the twin grand arches
    // -------------------------------------------------------------------------
    const pierW = 108;
    const pierX = cx - pierW / 2; // 426 to 534

    // Twin Fluted White Corinthian Columns Supporting the Center (Photo 1 & 2)
    const drawCenterColumn = (colX) => {
      // Column Base Plinth
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(colX - 10, archBottomY - 18, 20, 18);
      ctx.strokeStyle = '#c57881';
      ctx.lineWidth = 1;
      ctx.strokeRect(colX - 10, archBottomY - 18, 20, 18);

      // Fluted Shaft
      const colGrad = ctx.createLinearGradient(colX - 8, 0, colX + 8, 0);
      colGrad.addColorStop(0, '#f5f5f5');
      colGrad.addColorStop(0.5, '#ffffff');
      colGrad.addColorStop(1, '#e0e0e0');
      ctx.fillStyle = colGrad;
      ctx.fillRect(colX - 7, archTopY + 45, 14, archBottomY - archTopY - 63);

      // Fluting Vertical Lines
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.lineWidth = 1;
      [-4, 0, 4].forEach(fx => {
        ctx.beginPath();
        ctx.moveTo(colX + fx, archTopY + 45);
        ctx.lineTo(colX + fx, archBottomY - 18);
        ctx.stroke();
      });

      // Corinthian Capital Top (Gold / White Acanthus leaves)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(colX - 11, archTopY + 38, 22, 8);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(colX - 9, archTopY + 40, 18, 4);
    };

    drawCenterColumn(pierX + 16);
    drawCenterColumn(pierX + pierW - 16);

    // Grand Circular SRM University Seal Medallion (Photo 1 & 2)
    const sealY = archTopY + 110;
    const sealRadius = 40;

    ctx.save();
    // White Circular Plaque
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, sealY, sealRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0033a0';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Outer Navy Blue Ring
    ctx.strokeStyle = '#0d47a1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, sealY, sealRadius - 4, 0, Math.PI * 2);
    ctx.stroke();

    // Golden Accent Ring
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, sealY, sealRadius - 9, 0, Math.PI * 2);
    ctx.stroke();

    // Embossed Tree of Wisdom Symbol (Photo 1 & 2 SRM Seal)
    ctx.fillStyle = '#0033a0';
    ctx.beginPath();
    ctx.arc(cx, sealY - 7, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - 3.5, sealY - 7, 7, 18);

    // Seal Circular Typography: "SRM UNIVERSITY"
    ctx.font = '900 6.5px "Arial Black", sans-serif';
    ctx.fillStyle = '#0033a0';
    ctx.textAlign = 'center';
    ctx.fillText('SRM UNIVERSITY', cx, sealY + 22);

    ctx.font = 'bold 5px sans-serif';
    ctx.fillStyle = '#c67d00';
    ctx.fillText('LEARN • LEAP • LEAD', cx, sealY + 29);
    ctx.restore();

    // Center Festive Banner (Photo 3: "WELCOME FRESHERS • SRM KTR")
    const bannerW = 90;
    const bannerH = 55;
    const bannerY = sealY + 48;
    const banGrad = ctx.createLinearGradient(cx - bannerW / 2, bannerY, cx + bannerW / 2, bannerY + bannerH);
    banGrad.addColorStop(0, '#0d47a1');
    banGrad.addColorStop(0.5, '#1565c0');
    banGrad.addColorStop(1, '#0a2463');
    ctx.fillStyle = banGrad;
    ctx.fillRect(cx - bannerW / 2, bannerY, bannerW, bannerH);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - bannerW / 2, bannerY, bannerW, bannerH);

    ctx.font = '900 6px sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.fillText('SRM INSTITUTE OF SCI & TECH', cx, bannerY + 13);
    ctx.font = '900 9px "Arial Black", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('WELCOMES', cx, bannerY + 26);
    ctx.fillStyle = '#ff1744';
    ctx.fillText('FRESHERS', cx, bannerY + 38);
    ctx.font = 'bold 5.5px monospace';
    ctx.fillStyle = '#00e5ff';
    ctx.fillText('BRAWL FOR THE 10 CGPA', cx, bannerY + 48);

    // -------------------------------------------------------------------------
    // E. GRAND ENTABLATURE & "SRM UNIVERSITY" TYPOGRAPHY (PHOTO 1 & 2)
    // -------------------------------------------------------------------------
    const entW = archTotalW - towerW * 2 + 30; // 560
    const entX = cx - entW / 2;
    const entY = archTopY - 24;
    const entH = 34;

    // White Architrave & Frieze Panel
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(entX, entY, entW, entH);
    ctx.strokeStyle = '#c57881';
    ctx.lineWidth = 2;
    ctx.strokeRect(entX, entY, entW, entH);

    // Horizontal Row of White Relief Rosette Panels (Photo 1)
    ctx.strokeStyle = '#d79ba2';
    ctx.lineWidth = 1;
    for (let rx = entX + 12; rx < entX + 85; rx += 14) {
      ctx.strokeRect(rx, entY + 8, 9, 9);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(rx + 3, entY + 11, 3, 3);
    }
    for (let rx = entX + entW - 90; rx < entX + entW - 12; rx += 14) {
      ctx.strokeRect(rx, entY + 8, 9, 9);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(rx + 3, entY + 11, 3, 3);
    }

    // Embossed 3D Royal Blue Serif Typography: "SRM UNIVERSITY" (Photo 1 & 2)
    ctx.font = '900 24px "Times New Roman", Georgia, serif';
    ctx.textAlign = 'center';
    // 3D Shadow
    ctx.fillStyle = '#0a1d4a';
    ctx.fillText('S R M   U N I V E R S I T Y', cx + 2, entY + 24);
    // Main Face
    ctx.fillStyle = '#002b80';
    ctx.fillText('S R M   U N I V E R S I T Y', cx, entY + 23);

    // -------------------------------------------------------------------------
    // F. ROOFTOP BALUSTRADE & SIGNATURE TAMIL SCRIPT (PHOTO 1 & 2)
    // Photo 1 & 2: "எஸ்.ஆர்.எம் பல்கலைக்கழகம்"
    // -------------------------------------------------------------------------
    const balustradeY = entY - 18;
    // Balustrade Bottom Rail
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(entX - 6, entY - 3, entW + 12, 4);
    // Balustrade Top Handrail
    ctx.fillRect(entX - 6, balustradeY, entW + 12, 4);

    // Turned White Baluster Pillars
    for (let bx = entX + 4; bx < entX + entW - 4; bx += 9) {
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(bx, balustradeY + 4, 3.5, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx - 0.5, balustradeY + 7, 4.5, 6);
    }

    // The Famous Rooftop Tamil Script Typography: "எஸ்.ஆர்.எம் பல்கலைக்கழகம்"
    // (SRM Palkalaikkazhagam) mounted proudly on rooftop metal stanchions
    ctx.save();
    // Metal Support Stanchions
    ctx.strokeStyle = '#90a4ae';
    ctx.lineWidth = 2;
    for (let stx = cx - 180; stx <= cx + 180; stx += 60) {
      ctx.beginPath();
      ctx.moveTo(stx, balustradeY);
      ctx.lineTo(stx, balustradeY - 16);
      ctx.stroke();
    }

    // Tamil Script Lettering (Navy Blue with Crisp White Outline)
    ctx.font = '900 16px "Latha", "Nirmala UI", "Mukta Malar", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeText('எஸ்.ஆர்.எம் பல்கலைக்கழகம்', cx, balustradeY - 7);
    ctx.fillStyle = '#002b80';
    ctx.fillText('எஸ்.ஆர்.எம் பல்கலைக்கழகம்', cx, balustradeY - 7);
    ctx.restore();

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // CENTRAL MAHATMA GANDHI BRONZE STATUE (PHOTO 1, 2, 3)
  // Positioned on the central axis in front of the center dividing pier
  // ---------------------------------------------------------------------------
  renderGandhiMonument(ctx) {
    const cx = CANVAS_WIDTH / 2;
    const gy = this.groundY;

    ctx.save();

    // 1. Curved White Marble Pedestal / Plinth (Photo 1 & 2)
    const plinthW = 76;
    const plinthH = 36;
    const plinthY = gy - plinthH;

    // Foundation Base Step
    ctx.fillStyle = '#eceff1';
    ctx.fillRect(cx - (plinthW + 16) / 2, gy - 10, plinthW + 16, 10);
    ctx.strokeStyle = '#b0bec5';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - (plinthW + 16) / 2, gy - 10, plinthW + 16, 10);

    // Main Curved Marble Plinth Shaft
    const pGrad = ctx.createLinearGradient(cx - plinthW / 2, plinthY, cx + plinthW / 2, plinthY);
    pGrad.addColorStop(0, '#f5f5f5');
    pGrad.addColorStop(0.5, '#ffffff');
    pGrad.addColorStop(1, '#e0e0e0');
    ctx.fillStyle = pGrad;
    ctx.fillRect(cx - plinthW / 2, plinthY, plinthW, plinthH - 10);

    ctx.strokeStyle = '#cfd8dc';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - plinthW / 2, plinthY, plinthW, plinthH - 10);

    // Top Plinth Molded Capital
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - (plinthW + 8) / 2, plinthY - 4, plinthW + 8, 5);

    // Bronze Dedication Plaque (Photo 1: "Silver Jubilee Arch")
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(cx - 24, plinthY + 6, 48, 14);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 24, plinthY + 6, 48, 14);
    ctx.font = '900 4.5px sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.fillText('SILVER JUBILEE ARCH', cx, plinthY + 13);
    ctx.fillText('SRM UNIVERSITY', cx, plinthY + 18);

    // Marigold Flower Garland Draped across Plinth (Photo 1 & 2)
    ctx.fillStyle = '#ff6d00';
    for (let fx = cx - plinthW / 2 + 4; fx <= cx + plinthW / 2 - 4; fx += 5.5) {
      ctx.beginPath();
      ctx.arc(fx, plinthY - 2 + Math.sin(fx * 0.4) * 2, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffeb3b';
    for (let fx = cx - plinthW / 2 + 7; fx <= cx + plinthW / 2 - 7; fx += 5.5) {
      ctx.beginPath();
      ctx.arc(fx, plinthY - 2 + Math.sin(fx * 0.4) * 2, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Bronze-Gold Mahatma Gandhi Statue (Standing with Staff) (Photo 1 & 2)
    const statueBaseY = plinthY - 4;
    const statueH = 68;
    const statueTopY = statueBaseY - statueH;

    // Bronze Metallic Shader
    const bronzeGrad = ctx.createLinearGradient(cx - 10, statueTopY, cx + 10, statueBaseY);
    bronzeGrad.addColorStop(0, '#e5c07b');
    bronzeGrad.addColorStop(0.3, '#c59b27');
    bronzeGrad.addColorStop(0.7, '#8c6819');
    bronzeGrad.addColorStop(1, '#5a410b');
    ctx.fillStyle = bronzeGrad;

    // Bare Feet on Plinth
    ctx.fillRect(cx - 6, statueBaseY - 4, 4, 4);
    ctx.fillRect(cx + 2, statueBaseY - 4, 4, 4);

    // Dhoti (Lower Garment)
    ctx.beginPath();
    ctx.moveTo(cx - 8, statueBaseY - 4);
    ctx.lineTo(cx + 8, statueBaseY - 4);
    ctx.lineTo(cx + 9, statueBaseY - 32);
    ctx.lineTo(cx - 9, statueBaseY - 32);
    ctx.closePath();
    ctx.fill();

    // Shawl & Upper Torso (Lean ascetic frame)
    ctx.beginPath();
    ctx.moveTo(cx - 9, statueBaseY - 32);
    ctx.lineTo(cx + 9, statueBaseY - 32);
    ctx.lineTo(cx + 11, statueBaseY - 54);
    ctx.lineTo(cx - 8, statueBaseY - 54);
    ctx.closePath();
    ctx.fill();

    // Head Profile & Iconic Round Glasses
    ctx.beginPath();
    ctx.arc(cx, statueTopY + 7, 6.5, 0, Math.PI * 2);
    ctx.fill();

    // Round Wireframe Glasses (Gold)
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 4, statueTopY + 5, 3.5, 3);
    ctx.strokeRect(cx + 1, statueTopY + 5, 3.5, 3);

    // Walking Staff (Stick) extending to plinth base
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx + 10, statueTopY + 3);
    ctx.lineTo(cx + 12, statueBaseY);
    ctx.stroke();

    // Bronze Statue Highlights
    ctx.fillStyle = 'rgba(255, 235, 59, 0.4)';
    ctx.fillRect(cx - 3, statueTopY + 12, 2.5, 38);

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // INTERACTIVE BARRICADES & ORNAMENTAL TERRACOTTA PLANTERS
  // ---------------------------------------------------------------------------
  renderBarricadesAndPlanters(ctx) {
    const gy = this.groundY;

    // Red Terracotta Potted Palms Flanking the Plinth (Photo 1 & 3)
    const drawPlanter = (px) => {
      ctx.save();
      // Terracotta Pot
      ctx.fillStyle = '#bf360c';
      ctx.beginPath();
      ctx.moveTo(px - 10, gy);
      ctx.lineTo(px + 10, gy);
      ctx.lineTo(px + 13, gy - 16);
      ctx.lineTo(px - 13, gy - 16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#d84315';
      ctx.fillRect(px - 14, gy - 19, 28, 4);

      // Lush Green Foliage & Red Flowers
      ctx.fillStyle = '#2e7d32';
      ctx.beginPath();
      ctx.arc(px, gy - 26, 14, 0, Math.PI * 2);
      ctx.arc(px - 9, gy - 23, 10, 0, Math.PI * 2);
      ctx.arc(px + 9, gy - 23, 10, 0, Math.PI * 2);
      ctx.fill();

      // Red Hibiscus Dots
      ctx.fillStyle = '#e91e63';
      ctx.fillRect(px - 5, gy - 28, 3, 3);
      ctx.fillRect(px + 4, gy - 24, 3, 3);
      ctx.restore();
    };

    drawPlanter(CANVAS_WIDTH / 2 - 58);
    drawPlanter(CANVAS_WIDTH / 2 + 58);
    drawPlanter(150);
    drawPlanter(CANVAS_WIDTH - 150);

    // Interactive SRM Yellow & Red Security Barricades (Photo 1 & 3)
    const drawBarricade = (b) => {
      ctx.save();
      ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
      if (b.wobble > 0) {
        ctx.rotate((Math.sin(this.animTime * 22) * b.wobble * Math.PI) / 180);
      }
      ctx.translate(-b.w / 2, -b.h / 2);

      // Cast Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(2, b.h + 8, b.w - 4, 4);

      // Yellow Steel Frame
      ctx.fillStyle = '#ffd600';
      ctx.fillRect(0, 0, b.w, b.h);
      ctx.strokeStyle = '#ff8f00';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(0, 0, b.w, b.h);

      // Red Warning Chevrons (Photo 3 barricade detail)
      ctx.fillStyle = '#d50000';
      for (let cx = 0; cx < b.w; cx += 22) {
        ctx.beginPath();
        ctx.moveTo(cx + 8, 0);
        ctx.lineTo(cx + 18, 0);
        ctx.lineTo(cx + 10, b.h);
        ctx.lineTo(cx, b.h);
        ctx.closePath();
        ctx.fill();
      }

      // Center Sign Plate: "SRM UNIVERSITY" (Photo 3)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(6, b.h / 2 - 9, b.w - 12, 18);
      ctx.strokeStyle = '#d50000';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(6, b.h / 2 - 9, b.w - 12, 18);

      ctx.font = '900 7px "Arial Black", sans-serif';
      ctx.fillStyle = '#d50000';
      ctx.textAlign = 'center';
      ctx.fillText('SRM UNIVERSITY', b.w / 2, b.h / 2 + 3);

      // Metal Legs & Casters
      ctx.fillStyle = '#263238';
      ctx.fillRect(4, b.h, 6, 12);
      ctx.fillRect(b.w - 10, b.h, 6, 12);
      ctx.beginPath();
      ctx.arc(7, b.h + 12, 3, 0, Math.PI * 2);
      ctx.arc(b.w - 7, b.h + 12, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    drawBarricade(this.leftBarricade);
    drawBarricade(this.rightBarricade);
  }

  // ---------------------------------------------------------------------------
  // FAN-PATTERNED COBBLESTONE ARENA GROUND (PHOTO 1 & 2)
  // ---------------------------------------------------------------------------
  renderCourtyardGround(ctx) {
    const w = CANVAS_WIDTH;
    const gy = this.groundY;

    ctx.save();
    // Granite Paver Ground Gradient
    const gGrad = ctx.createLinearGradient(0, gy, 0, CANVAS_HEIGHT);
    gGrad.addColorStop(0, '#90a4ae');
    gGrad.addColorStop(0.3, '#78909c');
    gGrad.addColorStop(0.7, '#546e7a');
    gGrad.addColorStop(1, '#37474f');
    ctx.fillStyle = gGrad;
    ctx.fillRect(0, gy, w, CANVAS_HEIGHT - gy);

    // Authentic Concentric Fan-Cobblestone Interlocking Pattern (Photo 1 & 2)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    const fanCenters = [120, 280, 480, 680, 840];
    fanCenters.forEach(fcx => {
      for (let r = 10; r <= 85; r += 14) {
        ctx.beginPath();
        ctx.arc(fcx, gy + 50, r, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }
    });

    // Plaza Curb & Tactile Warning Line
    ctx.strokeStyle = '#eceff1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();

    ctx.strokeStyle = '#ffd600';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, gy + 2.5);
    ctx.lineTo(w, gy + 2.5);
    ctx.stroke();

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // FLOATING COASTAL LEAVES
  // ---------------------------------------------------------------------------
  renderLeaves(ctx) {
    ctx.save();
    this.leaves.forEach(l => {
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rot);
      ctx.fillStyle = l.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, l.size * 1.6, l.size * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // BUS HORN AUDIO-VISUAL ALERT
  // ---------------------------------------------------------------------------
  renderBusHornAlert(ctx) {
    ctx.save();
    const alpha = this.busHornActive / 60;
    ctx.strokeStyle = `rgba(0, 229, 255, ${alpha * 0.8})`;
    ctx.lineWidth = 2.5;
    ctx.font = '900 12px "Arial Black", monospace';
    ctx.fillStyle = `rgba(255, 235, 59, ${alpha})`;
    ctx.textAlign = 'center';
    ctx.fillText('🔊 SRM BLUE BUS HORN • GST ROAD', CANVAS_WIDTH / 2, 75);
    ctx.restore();
  }
}
