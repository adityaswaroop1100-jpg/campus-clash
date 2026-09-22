/**
 * Campus Clash — Stage: SRM School of Architecture ("The Design Block")
 * 1:1 procedural rendering of the SRM School of Architecture building at SRM University, Kattankulathur.
 * Features:
 *  - Massive teal/cyan reflective curtain glass wall with diagonal sunlight sheens
 *  - Prominent white central typography: "SRM" & cursive "School of Architecture"
 *  - Flanking wings with slate-grey panels, yellow parapet accent blocks & 4 rows of white horizontal solar louvers (brise-soleil)
 *  - Symmetrical white entrance portico colonnade with 6 rectangular columns & blue plinth
 *  - Lush tropical front garden planter beds with blooming flowering bushes & agave plants
 *  - Paved campus forecourt with black-and-white road curbs and drafting blueprint particles
 * @module stages/architectureBlock
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants.js';

export class ArchitectureBlockStage {
  constructor() {
    this.id = 'architectureblock';
    this.name = 'School of Architecture';
    this.shortName = 'ARCHITECTURE BLOCK';
    this.subtitle = 'SRM School of Architecture & Design';
    this.groundY = 520;
    this.minX = 40;
    this.maxX = CANVAS_WIDTH - 40;

    this.animTime = 0;

    // Drifting Architecture Blueprint Paper Slips & Autumn Leaves
    this.blueprints = [];
    for (let i = 0; i < 20; i++) {
      this.blueprints.push({
        x: Math.random() * CANVAS_WIDTH,
        y: 80 + Math.random() * 380,
        vx: 0.4 + Math.random() * 0.7,
        vy: 0.1 + Math.random() * 0.3,
        size: 3 + Math.random() * 3,
        color: Math.random() > 0.4 ? '#4fc3f7' : '#ffffff', // Blueprint cyan & tracing paper
        rot: Math.random() * Math.PI * 2,
        rotSpeed: 0.03 + Math.random() * 0.04
      });
    }

    // Interactive Portico Column Pillars (Hit-Test / Wobble on Impact)
    this.leftPillar = { x: 260, y: 390, w: 18, h: 130, wobble: 0 };
    this.rightPillar = { x: CANVAS_WIDTH - 278, y: 390, w: 18, h: 130, wobble: 0 };

    // Stage Gimmick: Architecture Jury Laser Level / Grid Scan
    this.juryTimer = 460;
    this.juryActive = 0;
  }

  update(dt = 0.016, fighters = [], particles = null, sound = null) {
    this.animTime += dt;

    // Update Floating Blueprint Papers
    this.blueprints.forEach(b => {
      b.x += b.vx;
      b.y += b.vy + Math.sin(this.animTime * 2 + b.x * 0.02) * 0.35;
      b.rot += b.rotSpeed;
      if (b.x > CANVAS_WIDTH + 20) {
        b.x = -20;
        b.y = 80 + Math.random() * 360;
      }
      if (b.y > this.groundY) {
        b.y = 80;
      }
    });

    // Pillar Impact Recovery
    if (this.leftPillar.wobble > 0) this.leftPillar.wobble -= 0.1;
    if (this.rightPillar.wobble > 0) this.rightPillar.wobble -= 0.1;

    // Check fighter collisions near entrance portico
    fighters.forEach(f => {
      if (!f) return;
      if (Math.abs(f.x - 269) < 25 && f.isGrounded && Math.abs(f.vx) > 3) {
        this.leftPillar.wobble = 5;
        f.vx = Math.abs(f.vx) * 0.6;
        if (particles && typeof particles.spawnHitSparks === 'function') {
          particles.spawnHitSparks(269, f.y - 30, '#00e5ff', 8);
        }
        if (sound && typeof sound.playBlock === 'function') sound.playBlock();
      }
      if (Math.abs(f.x - (CANVAS_WIDTH - 269)) < 25 && f.isGrounded && Math.abs(f.vx) > 3) {
        this.rightPillar.wobble = 5;
        f.vx = -Math.abs(f.vx) * 0.6;
        if (particles && typeof particles.spawnHitSparks === 'function') {
          particles.spawnHitSparks(CANVAS_WIDTH - 269, f.y - 30, '#00e5ff', 8);
        }
        if (sound && typeof sound.playBlock === 'function') sound.playBlock();
      }
    });

    // Architecture Jury Review Laser Grid Timer
    this.juryTimer--;
    if (this.juryTimer <= 0) {
      this.juryTimer = 520 + Math.floor(Math.random() * 200);
      this.juryActive = 65;
      if (sound && typeof sound.playTone === 'function') {
        sound.playTone(587.33, 'triangle', 0.5, 0.35); // D5 chime
      }
    }

    if (this.juryActive > 0) {
      this.juryActive--;
    }
  }

  render(ctx) {
    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;
    const cx = w / 2;

    // =========================================================================
    // 1. CHENNAI MORNING AZURE SKY & GENTLE CLOUDS (PHOTO 3)
    // =========================================================================
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 320);
    skyGrad.addColorStop(0, '#1565c0');
    skyGrad.addColorStop(0.3, '#1e88e5');
    skyGrad.addColorStop(0.65, '#64b5f6');
    skyGrad.addColorStop(1, '#bbdefb');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Drifting Cumulus Clouds
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    const drawCloud = (x, y, scale) => {
      ctx.beginPath();
      ctx.ellipse(x, y, 65 * scale, 20 * scale, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 30 * scale, y - 6 * scale, 45 * scale, 24 * scale, 0, 0, Math.PI * 2);
      ctx.ellipse(x - 28 * scale, y + 2 * scale, 40 * scale, 16 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    drawCloud(180, 45, 1.2);
    drawCloud(760, 55, 1.3);
    drawCloud(490, 30, 0.9);
    ctx.restore();

    // =========================================================================
    // 2. THE SCHOOL OF ARCHITECTURE EDIFICE (PHOTO 1, 2, & 3)
    // Symmetrical Modern Facade: Slate-Grey Frames, Yellow Accents & Teal Glass
    // =========================================================================
    this.renderArchitectureBuilding(ctx);

    // =========================================================================
    // 3. GROUND-FLOOR WHITE PORTICO & RECESSED LOBBY (PHOTO 1 & 3)
    // 6 Rectangular White Colonnade Pillars & Blue Entrance Plinth
    // =========================================================================
    this.renderPorticoColonnade(ctx);

    // =========================================================================
    // 4. LUSH TROPICAL PLANTERS & FLOWERING HEDGES (PHOTO 1 & 2)
    // Dense foliage along the base with salmon/orange flowers and agave plants
    // =========================================================================
    this.renderTropicalPlanters(ctx);

    // =========================================================================
    // 5. FORECOURT DRIVEWAY & CURB PAVEMENT (PHOTO 2 & 3)
    // =========================================================================
    this.renderForecourtPavement(ctx);

    // =========================================================================
    // 6. FLOATING BLUEPRINT PAPER SLIPS
    // =========================================================================
    this.renderBlueprints(ctx);

    // 7. Architecture Jury Laser Grid Scan Alert
    if (this.juryActive > 0) {
      this.renderJuryLaserGrid(ctx);
    }
  }

  // ---------------------------------------------------------------------------
  // MAIN ARCHITECTURE BUILDING FACADE (PHOTO 1, 2, 3)
  // ---------------------------------------------------------------------------
  renderArchitectureBuilding(ctx) {
    const cx = CANVAS_WIDTH / 2;
    const bldW = 780;
    const bldX = cx - bldW / 2; // 90
    const bldTopY = 65;
    const bldBaseY = 485;

    ctx.save();

    // -------------------------------------------------------------------------
    // A. MAIN SLATE-GREY STRUCTURAL REAR PANELS (PHOTO 1 & 3)
    // -------------------------------------------------------------------------
    const frameGrad = ctx.createLinearGradient(bldX, 0, bldX + bldW, 0);
    frameGrad.addColorStop(0, '#37474f');
    frameGrad.addColorStop(0.15, '#455a64');
    frameGrad.addColorStop(0.5, '#546e7a');
    frameGrad.addColorStop(0.85, '#455a64');
    frameGrad.addColorStop(1, '#37474f');
    ctx.fillStyle = frameGrad;
    ctx.fillRect(bldX, bldTopY, bldW, bldBaseY - bldTopY);

    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 2;
    ctx.strokeRect(bldX, bldTopY, bldW, bldBaseY - bldTopY);

    // -------------------------------------------------------------------------
    // B. ROOFTOP PARAPET & YELLOW ACCENT BLOCKS (PHOTO 1, 2, & 3)
    // Signature yellow/gold rectangular accent blocks along the roofline
    // -------------------------------------------------------------------------
    ctx.fillStyle = '#263238';
    ctx.fillRect(bldX - 6, bldTopY - 12, bldW + 12, 12);
    ctx.strokeStyle = '#607d8b';
    ctx.lineWidth = 1;
    ctx.strokeRect(bldX - 6, bldTopY - 12, bldW + 12, 12);

    // Yellow / Gold Parapet Accent Panels (Photo 1 & 3 signature)
    ctx.fillStyle = '#fbc02d';
    const accentBlocks = [
      bldX + 35, bldX + 85, bldX + 135,
      bldX + 220, bldX + 270,
      cx - 65, cx - 15, cx + 35,
      bldX + bldW - 290, bldX + bldW - 240,
      bldX + bldW - 155, bldX + bldW - 105, bldX + bldW - 55
    ];
    accentBlocks.forEach(bx => {
      ctx.fillRect(bx, bldTopY - 10, 36, 8);
      ctx.strokeStyle = '#f57f17';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, bldTopY - 10, 36, 8);
    });

    // Small Gold Finial Spikes along parapet (Photo 1 & 3)
    ctx.fillStyle = '#ffeb3b';
    for (let px = bldX + 15; px <= bldX + bldW - 15; px += 28) {
      ctx.beginPath();
      ctx.moveTo(px, bldTopY - 12);
      ctx.lineTo(px + 3, bldTopY - 18);
      ctx.lineTo(px + 6, bldTopY - 12);
      ctx.closePath();
      ctx.fill();
    }

    // -------------------------------------------------------------------------
    // C. LEFT & RIGHT FLANKING WINGS: WHITE HORIZONTAL SOLAR LOUVERS (PHOTO 1 & 3)
    // Distinctive modern brise-soleil horizontal white shading slats
    // -------------------------------------------------------------------------
    const wingW = 190;
    const leftWingX = bldX + 22;
    const rightWingX = bldX + bldW - wingW - 22;
    const louverTopY = bldTopY + 45;
    const louverH = 175;

    const renderLouverWing = (wx) => {
      // Dark Slate Window Glass Recess
      ctx.fillStyle = '#1c313a';
      ctx.fillRect(wx, louverTopY, wingW, louverH);
      ctx.strokeStyle = '#004d40';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(wx, louverTopY, wingW, louverH);

      // Cyan Glass Under-sheen
      ctx.fillStyle = 'rgba(0, 188, 212, 0.2)';
      ctx.fillRect(wx, louverTopY, wingW, louverH);

      // 4 Main Louver Bay Sections (Photo 3: 4 horizontal rows of white slats)
      const rowCount = 4;
      const rowH = louverH / rowCount;
      for (let r = 0; r < rowCount; r++) {
        const ry = louverTopY + r * rowH;

        // White Divider Frame
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(wx - 2, ry, wingW + 4, 4);

        // 3 Horizontal White Solar Louver Slats within each bay
        for (let s = 1; s <= 3; s++) {
          const sy = ry + s * (rowH / 4);
          ctx.fillStyle = '#f5f5f5';
          ctx.fillRect(wx + 4, sy, wingW - 8, 3);
          ctx.fillStyle = '#cfd8dc';
          ctx.fillRect(wx + 4, sy + 3, wingW - 8, 1);
        }
      }

      // Vertical White Mullion Strips
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(wx + wingW * 0.33, louverTopY, 4, louverH);
      ctx.fillRect(wx + wingW * 0.66, louverTopY, 4, louverH);

      // Lower Charcoal Tint Panels (Below Louvers - Photo 3)
      ctx.fillStyle = '#102027';
      ctx.fillRect(wx, louverTopY + louverH + 8, wingW, 110);
      ctx.strokeStyle = '#263238';
      ctx.lineWidth = 1;
      ctx.strokeRect(wx, louverTopY + louverH + 8, wingW, 110);
    };

    renderLouverWing(leftWingX);
    renderLouverWing(rightWingX);

    // -------------------------------------------------------------------------
    // D. CENTRAL MASSIVE TEAL REFLECTIVE CURTAIN GLASS WALL (PHOTO 1, 2, & 3)
    // The centerpiece signature of the School of Architecture
    // -------------------------------------------------------------------------
    const glassW = 320;
    const glassX = cx - glassW / 2; // 320 to 640
    const glassTopY = bldTopY + 25;
    const glassH = 265;

    // Teal Reflective Glass Curtain Gradient (Photo 1 & 3)
    const glassGrad = ctx.createLinearGradient(glassX, glassTopY, glassX + glassW, glassTopY + glassH);
    glassGrad.addColorStop(0, '#006064');
    glassGrad.addColorStop(0.25, '#00838f');
    glassGrad.addColorStop(0.55, '#00acc1');
    glassGrad.addColorStop(0.85, '#26c6da');
    glassGrad.addColorStop(1, '#00838f');
    ctx.fillStyle = glassGrad;
    ctx.fillRect(glassX, glassTopY, glassW, glassH);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(glassX, glassTopY, glassW, glassH);

    // Glass Grid Mullions (Vertical & Horizontal Panes)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.2;
    // Vertical mullions
    for (let mx = glassX + 40; mx < glassX + glassW; mx += 40) {
      ctx.beginPath();
      ctx.moveTo(mx, glassTopY);
      ctx.lineTo(mx, glassTopY + glassH);
      ctx.stroke();
    }
    // Horizontal mullions
    for (let my = glassTopY + 38; my < glassTopY + glassH; my += 38) {
      ctx.beginPath();
      ctx.moveTo(glassX, my);
      ctx.lineTo(glassX + glassW, my);
      ctx.stroke();
    }

    // Diagonal Dynamic Sun Sheen Reflections Across Glass (Photo 1 & 3)
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.beginPath();
    ctx.moveTo(glassX + 60, glassTopY);
    ctx.lineTo(glassX + 130, glassTopY);
    ctx.lineTo(glassX + 30, glassTopY + glassH);
    ctx.lineTo(glassX - 40, glassTopY + glassH);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(glassX + 180, glassTopY);
    ctx.lineTo(glassX + 270, glassTopY);
    ctx.lineTo(glassX + 170, glassTopY + glassH);
    ctx.lineTo(glassX + 80, glassTopY + glassH);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Horizontal Yellow Lintel Band Across Middle Glass (Photo 3 signature)
    const midBandY = glassTopY + 185;
    ctx.fillStyle = '#fbc02d';
    ctx.fillRect(glassX - 2, midBandY, glassW + 4, 8);
    ctx.strokeStyle = '#f57f17';
    ctx.lineWidth = 1;
    ctx.strokeRect(glassX - 2, midBandY, glassW + 4, 8);

    // -------------------------------------------------------------------------
    // E. CENTRAL TYPOGRAPHY: "SRM" & "School of Architecture" (PHOTO 1 & 3)
    // Centered prominently across the upper teal glass curtain
    // -------------------------------------------------------------------------
    ctx.save();
    const logoY = glassTopY + 68;

    // "SRM" in Bold Crisp White Serif Lettering (Photo 1 & 3)
    ctx.font = '900 24px "Times New Roman", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0, 38, 48, 0.6)';
    ctx.fillText('S R M', cx + 2, logoY + 2); // Shadow
    ctx.fillStyle = '#ffffff';
    ctx.fillText('S R M', cx, logoY);

    // "School of Architecture" in Elegant Cursive / Script Italic (Photo 1 & 3 signature!)
    ctx.font = 'italic 20px "Brush Script MT", "Segoe Script", "Dancing Script", cursive, sans-serif';
    ctx.fillStyle = 'rgba(0, 38, 48, 0.6)';
    ctx.fillText('School of Architecture', cx + 2, logoY + 34); // Shadow
    ctx.fillStyle = '#ffffff';
    ctx.fillText('School of Architecture', cx, logoY + 32);

    ctx.font = 'bold 8px sans-serif';
    ctx.fillStyle = '#e0f7fa';
    ctx.fillText('SRM INSTITUTE OF SCIENCE & TECHNOLOGY', cx, logoY + 54);
    ctx.restore();

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // GROUND-FLOOR ENTRANCE PORTICO COLONNADE (PHOTO 1 & 3)
  // Symmetrical White Covered Porch Supported by 6 Rectangular Columns
  // ---------------------------------------------------------------------------
  renderPorticoColonnade(ctx) {
    const cx = CANVAS_WIDTH / 2;
    const portW = 340;
    const portX = cx - portW / 2; // 310 to 650
    const portTopY = 378;
    const portH = 107;
    const colBaseY = portTopY + portH; // 485

    ctx.save();

    // 1. Recessed Ground-Floor Glass Entrance Lobby (Behind Columns)
    ctx.fillStyle = '#0a192f';
    ctx.fillRect(portX, portTopY + 12, portW, portH - 12);

    // Warm Interior Drafting Studio Lighting through Lobby Glass
    const studioGrad = ctx.createLinearGradient(0, portTopY + 12, 0, colBaseY);
    studioGrad.addColorStop(0, 'rgba(255, 236, 179, 0.35)');
    studioGrad.addColorStop(0.7, 'rgba(255, 213, 79, 0.15)');
    studioGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = studioGrad;
    ctx.fillRect(portX, portTopY + 12, portW, portH - 12);

    // Central Glass Entrance Double Doors
    ctx.fillStyle = '#172a45';
    ctx.fillRect(cx - 36, portTopY + 32, 72, colBaseY - (portTopY + 32));
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 36, portTopY + 32, 72, colBaseY - (portTopY + 32));
    ctx.beginPath();
    ctx.moveTo(cx, portTopY + 32);
    ctx.lineTo(cx, colBaseY);
    ctx.stroke();

    // 2. White Portico Roof Slab / Cornice (Photo 3)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(portX - 8, portTopY, portW + 16, 12);
    ctx.strokeStyle = '#b0bec5';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(portX - 8, portTopY, portW + 16, 12);

    // Blue Fascia Trim Stripe on Portico Roof
    ctx.fillStyle = '#0288d1';
    ctx.fillRect(portX - 6, portTopY + 8, portW + 12, 3);

    // 3. Six Symmetrical Rectangular White Colonnade Columns (Photo 3)
    const colCount = 6;
    const colSpacing = (portW - 40) / (colCount - 1);
    for (let c = 0; c < colCount; c++) {
      const colX = portX + 20 + c * colSpacing;
      const isInteractive = (c === 1 || c === 4);
      const wobble = isInteractive ? (c === 1 ? this.leftPillar.wobble : this.rightPillar.wobble) : 0;

      ctx.save();
      if (wobble > 0) {
        ctx.translate(colX, colBaseY);
        ctx.rotate((Math.sin(this.animTime * 25) * wobble * Math.PI) / 180);
        ctx.translate(-colX, -colBaseY);
      }

      // Column Shaft
      const colGrad = ctx.createLinearGradient(colX - 8, 0, colX + 8, 0);
      colGrad.addColorStop(0, '#eceff1');
      colGrad.addColorStop(0.4, '#ffffff');
      colGrad.addColorStop(0.8, '#f5f5f5');
      colGrad.addColorStop(1, '#cfd8dc');
      ctx.fillStyle = colGrad;
      ctx.fillRect(colX - 7, portTopY + 12, 14, portH - 12);

      ctx.strokeStyle = '#b0bec5';
      ctx.lineWidth = 1;
      ctx.strokeRect(colX - 7, portTopY + 12, 14, portH - 12);

      // Capital & Base Molding
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(colX - 9, portTopY + 12, 18, 5);
      ctx.fillRect(colX - 9, colBaseY - 6, 18, 6);
      ctx.restore();
    }

    // 4. Blue Entrance Podium Plinth / Steps (Photo 3)
    const plinthGrad = ctx.createLinearGradient(0, colBaseY - 6, 0, this.groundY);
    plinthGrad.addColorStop(0, '#0277bd');
    plinthGrad.addColorStop(0.5, '#01579b');
    plinthGrad.addColorStop(1, '#002f6c');
    ctx.fillStyle = plinthGrad;
    ctx.fillRect(portX - 12, colBaseY - 4, portW + 24, this.groundY - (colBaseY - 4));

    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(portX - 12, colBaseY - 4, portW + 24, this.groundY - (colBaseY - 4));

    // Plinth Step Lines
    ctx.strokeStyle = '#81d4fa';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(portX - 8, colBaseY + 12);
    ctx.lineTo(portX + portW + 8, colBaseY + 12);
    ctx.moveTo(portX - 4, colBaseY + 24);
    ctx.lineTo(portX + portW + 4, colBaseY + 24);
    ctx.stroke();

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // LUSH TROPICAL PLANTERS & FLOWERING HEDGES (PHOTO 1 & 2)
  // ---------------------------------------------------------------------------
  renderTropicalPlanters(ctx) {
    const gy = this.groundY;
    const cx = CANVAS_WIDTH / 2;

    ctx.save();

    // 1. Long Garden Planter Boxes Flanking the Entrance (Photo 1)
    const drawPlanterBox = (px, pw) => {
      // Blue/Grey Stone Planter Retaining Wall (Photo 1)
      ctx.fillStyle = '#455a64';
      ctx.fillRect(px, gy - 26, pw, 26);
      ctx.strokeStyle = '#78909c';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px, gy - 26, pw, 26);

      // Top White Stone Coping
      ctx.fillStyle = '#eceff1';
      ctx.fillRect(px - 2, gy - 29, pw + 4, 4);

      // Dense Lush Green Shrubs & Foliage Overflowing (Photo 1)
      for (let bx = px + 6; bx < px + pw - 6; bx += 18) {
        ctx.fillStyle = '#1b5e20';
        ctx.beginPath();
        ctx.arc(bx, gy - 36 + Math.sin(bx * 0.1) * 4, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#2e7d32';
        ctx.beginPath();
        ctx.arc(bx + 4, gy - 40 + Math.cos(bx * 0.12) * 5, 13, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#43a047';
        ctx.beginPath();
        ctx.arc(bx + 8, gy - 38 + Math.sin(bx * 0.15) * 3, 9, 0, Math.PI * 2);
        ctx.fill();

        // Salmon / Coral / Orange Flowers (Photo 1 signature)
        ctx.fillStyle = '#ff7043';
        ctx.beginPath();
        ctx.arc(bx + 3, gy - 45 + Math.sin(bx) * 3, 3, 0, Math.PI * 2);
        ctx.arc(bx + 11, gy - 42 + Math.cos(bx) * 3, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffab91';
        ctx.fillRect(bx + 2, gy - 46, 2, 2);
      }
    };

    drawPlanterBox(70, 220);
    drawPlanterBox(CANVAS_WIDTH - 290, 220);

    // 2. Spiky Ornamental Agave / Yucca Plants in Front (Photo 3)
    const drawAgave = (ax) => {
      ctx.save();
      ctx.fillStyle = '#33691e';
      const leafAngles = [-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6];
      leafAngles.forEach(ang => {
        ctx.beginPath();
        ctx.moveTo(ax, gy);
        ctx.lineTo(ax + Math.sin(ang) * 22, gy - Math.cos(ang) * 26);
        ctx.lineTo(ax + Math.sin(ang + 0.1) * 6, gy);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();
    };

    drawAgave(55);
    drawAgave(CANVAS_WIDTH - 55);

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // FORECOURT DRIVEWAY & CURB PAVEMENT (PHOTO 2 & 3)
  // ---------------------------------------------------------------------------
  renderForecourtPavement(ctx) {
    const w = CANVAS_WIDTH;
    const gy = this.groundY;

    ctx.save();

    // Smooth Campus Asphalt Forecourt
    const roadGrad = ctx.createLinearGradient(0, gy, 0, CANVAS_HEIGHT);
    roadGrad.addColorStop(0, '#37474f');
    roadGrad.addColorStop(0.5, '#263238');
    roadGrad.addColorStop(1, '#102027');
    ctx.fillStyle = roadGrad;
    ctx.fillRect(0, gy, w, CANVAS_HEIGHT - gy);

    // Interlocking Paver Texture Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1;
    for (let px = 0; px < w; px += 42) {
      ctx.beginPath();
      ctx.moveTo(px, gy);
      ctx.lineTo(px, CANVAS_HEIGHT);
      ctx.stroke();
    }

    // Top Platform Curb Edge Line
    ctx.strokeStyle = '#cfd8dc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();

    // Alternating Black & White Road Divider Curbs (Photo 2 signature!)
    const curbW = 28;
    for (let cb = 0; cb < w; cb += curbW) {
      ctx.fillStyle = (Math.floor(cb / curbW) % 2 === 0) ? '#ffffff' : '#212121';
      ctx.fillRect(cb, gy + 1, curbW, 4.5);
    }

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // FLOATING BLUEPRINT PAPER SLIPS
  // ---------------------------------------------------------------------------
  renderBlueprints(ctx) {
    ctx.save();
    this.blueprints.forEach(b => {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.fillStyle = b.color;
      ctx.fillRect(-b.size, -b.size * 0.7, b.size * 2, b.size * 1.4);
      // Blueprint grid line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(-b.size, -b.size * 0.7, b.size * 2, b.size * 1.4);
      ctx.restore();
    });
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // ARCHITECTURE JURY REVIEW LASER GRID OVERLAY
  // ---------------------------------------------------------------------------
  renderJuryLaserGrid(ctx) {
    ctx.save();
    const alpha = this.juryActive / 65;
    ctx.strokeStyle = `rgba(0, 229, 255, ${alpha * 0.4})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // Architectural drafting grid scan
    for (let x = 60; x < CANVAS_WIDTH; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 70);
      ctx.lineTo(x, this.groundY);
      ctx.stroke();
    }
    for (let y = 100; y < this.groundY; y += 50) {
      ctx.beginPath();
      ctx.moveTo(60, y);
      ctx.lineTo(CANVAS_WIDTH - 60, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.font = '900 12px "Arial Black", monospace';
    ctx.fillStyle = `rgba(0, 229, 255, ${alpha})`;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    ctx.textAlign = 'center';
    ctx.fillText('📐 JURY REVIEW SCAN • SCHOOL OF ARCHITECTURE', CANVAS_WIDTH / 2, 85);
    ctx.restore();
  }
}
