/**
 * Campus Clash — Stage: Dr. T.P. Ganesan Auditorium
 * 1:1 procedural rendering of Asia's premier 4,000-seat university auditorium at SRM KTR,
 * faithfully modeled after the real-life photographs from the audience & stage perspective.
 * Features:
 *  - Light-beige angled acoustic proscenium header with blue circular SRM seals & bold blue "LEARN. LEAP. LEAD."
 *  - Midnight navy blue scalloped pelmet valance drapes with warm spotlight illumination
 *  - Deep midnight blue rear velvet stage backdrop with center event banner & left projection screen
 *  - Stage apron with multi-tiered yellow & orange marigold flower bed atop crimson red stage riser cloth
 *  - Left stage stainless-steel access staircase & wooden speaker podium/lectern
 *  - 4,000-seat amphitheater with tiered crimson (lower) and royal blue (upper) stenciled numbered velvet seats (5, 6, 7, 8...)
 *  - Overhead ceiling matrix of recessed downlights & suspended black line-array concert speakers
 *  - Dual volumetric moving spotlights dynamically tracking Player 1 and Player 2
 * @module stages/tpGanesanAuditorium
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants.js';

export class TPGanesanAuditoriumStage {
  constructor() {
    this.id = 'tpganesan';
    this.name = 'Dr. T.P. Ganesan Auditorium';
    this.shortName = 'TP GANESAN AUDITORIUM';
    this.subtitle = 'Asia\'s Premier 4000-Seat Hall';
    this.groundY = 520;
    this.minX = 40;
    this.maxX = CANVAS_WIDTH - 40;

    this.animTime = 0;

    // Dual Moving Theatrical Spotlights tracking P1 and P2
    this.spotlight1 = { x: 300, targetX: 260 };
    this.spotlight2 = { x: 660, targetX: 700 };

    // Concert crowd phone flashlight torch sparkles
    this.crowdLights = [];
    for (let i = 0; i < 45; i++) {
      this.crowdLights.push({
        x: 30 + Math.random() * (CANVAS_WIDTH - 60),
        y: 280 + Math.random() * 170,
        phase: Math.random() * Math.PI * 2,
        speed: 2 + Math.random() * 3,
        size: 1.5 + Math.random() * 2
      });
    }

    // Overhead truss LED par lights (cycling colors)
    this.parLightColors = ['#00e5ff', '#ff1744', '#ffd700', '#d500f9', '#00e676'];

    // Stage Gimmick: Subwoofer Concert Bass Rumble & Confetti
    this.bassTimer = 480;
    this.confetti = [];
  }

  update(dt = 0.016, fighters = [], particles = null, sound = null) {
    this.animTime += dt;

    // Track fighters with spotlights
    if (fighters.length > 0 && fighters[0]) {
      this.spotlight1.targetX = fighters[0].x;
    }
    if (fighters.length > 1 && fighters[1]) {
      this.spotlight2.targetX = fighters[1].x;
    }

    // Smooth lerp
    this.spotlight1.x += (this.spotlight1.targetX - this.spotlight1.x) * 0.08;
    this.spotlight2.x += (this.spotlight2.targetX - this.spotlight2.x) * 0.08;

    // Confetti update
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.x += c.vx;
      c.y += c.vy;
      c.rot += 0.08;
      c.life--;
      if (c.life <= 0 || c.y > this.groundY) {
        this.confetti.splice(i, 1);
      }
    }

    // Bass subwoofer trigger
    this.bassTimer--;
    if (this.bassTimer <= 0) {
      this.bassTimer = 600 + Math.floor(Math.random() * 300);
      this.triggerConfettiBurst(CANVAS_WIDTH / 2, 180);
      if (sound && typeof sound.playTone === 'function') {
        sound.playTone(65.41, 'triangle', 0.8, 0.4); // C2 sub-bass
      }
    }
  }

  triggerConfettiBurst(x, y) {
    const colors = ['#ffd700', '#ff1744', '#00e5ff', '#76ff03', '#e040fb'];
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.confetti.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        rot: Math.random() * Math.PI * 2,
        size: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 90
      });
    }
  }

  render(ctx) {
    const t = this.animTime;
    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;
    const cx = w / 2; // 480

    // =========================================================================
    // 1. CAVERNOUS 4,000-SEAT HALL & RECESSED CEILING DOWNLIGHTS (PHOTOS 1, 2, 3, 4)
    // =========================================================================
    const hallGrad = ctx.createLinearGradient(0, 0, 0, this.groundY);
    hallGrad.addColorStop(0, '#0a0d18');
    hallGrad.addColorStop(0.3, '#101526');
    hallGrad.addColorStop(0.7, '#161c30');
    hallGrad.addColorStop(1, '#1b233d');
    ctx.fillStyle = hallGrad;
    ctx.fillRect(0, 0, w, this.groundY);

    // Vaulted Acoustic Ceiling with Perspective Rows of Recessed Downlights (Photo 3 & 4)
    ctx.save();
    const ceilGrad = ctx.createLinearGradient(0, 0, 0, 110);
    ceilGrad.addColorStop(0, '#1c2236');
    ceilGrad.addColorStop(0.7, '#242c44');
    ceilGrad.addColorStop(1, '#181d30');
    ctx.fillStyle = ceilGrad;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w, 100);
    ctx.quadraticCurveTo(cx, 115, 0, 100);
    ctx.closePath();
    ctx.fill();

    // Matrix of Glowing Recessed Ceiling Spotlights (Photo 3 signature)
    for (let row = 0; row < 3; row++) {
      const cy = 18 + row * 22;
      const count = 16 - row * 2;
      for (let col = 0; col < count; col++) {
        const lx = cx - ((count - 1) * 36) / 2 + col * 36;
        const ly = cy + Math.sin((lx / w) * Math.PI) * 6;

        ctx.fillStyle = '#fffde7';
        ctx.shadowColor = '#fff59d';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    // =========================================================================
    // 2. AUDITORIUM SIDE WALLS & SUSPENDED LINE-ARRAY SPEAKERS (PHOTOS 1, 2, 4)
    // Warm Champagne/Grey Acoustic Panel Blocks with Vertical Joint Lines
    // =========================================================================
    ctx.save();
    const sideW = 95;
    // Left Acoustic Wall
    const leftWallGrad = ctx.createLinearGradient(0, 0, sideW, 0);
    leftWallGrad.addColorStop(0, '#546e7a');
    leftWallGrad.addColorStop(0.5, '#78909c');
    leftWallGrad.addColorStop(1, '#90a4ae');
    ctx.fillStyle = leftWallGrad;
    ctx.fillRect(0, 100, sideW, this.groundY - 100);
    // Right Acoustic Wall
    const rightWallGrad = ctx.createLinearGradient(w - sideW, 0, w, 0);
    rightWallGrad.addColorStop(0, '#90a4ae');
    rightWallGrad.addColorStop(0.5, '#78909c');
    rightWallGrad.addColorStop(1, '#546e7a');
    ctx.fillStyle = rightWallGrad;
    ctx.fillRect(w - sideW, 100, sideW, this.groundY - 100);

    // Vertical Acoustic Panel Grooves on Walls (Photo 4)
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 1.5;
    [25, 55, 80, w - 80, w - 55, w - 25].forEach(px => {
      ctx.beginPath();
      ctx.moveTo(px, 100);
      ctx.lineTo(px, this.groundY);
      ctx.stroke();
    });

    // Hanging Black Concert Line-Array Speaker Stacks (Photo 2 & 3)
    const drawSpeakerArray = (sx, sy) => {
      ctx.save();
      ctx.fillStyle = '#111111';
      ctx.strokeStyle = '#37474f';
      ctx.lineWidth = 1.2;

      // Steel hanging cable
      ctx.beginPath();
      ctx.moveTo(sx + 10, 40);
      ctx.lineTo(sx + 10, sy);
      ctx.stroke();

      // Curved array of 5 line-array speaker boxes
      for (let b = 0; b < 5; b++) {
        const by = sy + b * 15;
        const curveX = sx + Math.sin((b / 4) * 0.4) * 5;
        ctx.fillRect(curveX, by, 20, 12);
        ctx.strokeRect(curveX, by, 20, 12);
        ctx.fillStyle = '#212121';
        ctx.fillRect(curveX + 2, by + 2, 16, 8);
        ctx.fillStyle = '#111111';
      }
      ctx.restore();
    };

    drawSpeakerArray(88, 70);      // Left line-array
    drawSpeakerArray(w - 108, 70);  // Right line-array

    // Left Side Wall Live Video Projection Screen (Photo 4 signature!)
    const projX = 8;
    const projY = 160;
    const projW = 76;
    const projH = 95;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(projX - 2, projY - 2, projW + 4, projH + 4);
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 2;
    ctx.strokeRect(projX - 2, projY - 2, projW + 4, projH + 4);

    // Live Video Feed Gradient (Speaker on stage)
    const vidGrad = ctx.createLinearGradient(projX, projY, projX + projW, projY + projH);
    vidGrad.addColorStop(0, '#0d47a1');
    vidGrad.addColorStop(0.5, '#1976d2');
    vidGrad.addColorStop(1, '#0b2046');
    ctx.fillStyle = vidGrad;
    ctx.fillRect(projX, projY, projW, projH);

    // Live speaker silhouette in video feed
    ctx.fillStyle = '#ffca28';
    ctx.beginPath();
    ctx.arc(projX + projW / 2, projY + 32, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(projX + projW / 2 - 14, projY + 46, 28, 42);

    ctx.font = 'bold 5px monospace';
    ctx.fillStyle = '#00e5ff';
    ctx.textAlign = 'center';
    ctx.fillText('LIVE STAGE FEED', projX + projW / 2, projY + 90);
    ctx.restore();

    // =========================================================================
    // 3. DEEP MIDNIGHT BLUE REAR STAGE BACKDROP CURTAIN & EVENT BANNER (PHOTOS 1, 2, 4)
    // =========================================================================
    ctx.save();
    const stageBgX = sideW;
    const stageBgW = w - sideW * 2;
    const stageBgY = 95;

    // Deep Midnight Velvet Curtain Texture (Photos 1, 2, 4)
    const curtainGrad = ctx.createLinearGradient(0, stageBgY, 0, this.groundY);
    curtainGrad.addColorStop(0, '#070c1e');
    curtainGrad.addColorStop(0.4, '#0a122c');
    curtainGrad.addColorStop(0.8, '#0e183a');
    curtainGrad.addColorStop(1, '#111e48');
    ctx.fillStyle = curtainGrad;
    ctx.fillRect(stageBgX, stageBgY, stageBgW, this.groundY - stageBgY);

    // Vertical Velvet Pleats in Backdrop
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 2;
    for (let px = stageBgX + 15; px < stageBgX + stageBgW; px += 24) {
      ctx.beginPath();
      ctx.moveTo(px, stageBgY);
      ctx.lineTo(px, this.groundY);
      ctx.stroke();
    }

    // Center Stage Backdrop Banner (Photos 1, 2, 4: Event Backdrop)
    const scrW = 440;
    const scrH = 115;
    const scrX = cx - scrW / 2;
    const scrY = 160;

    // Backdrop Frame
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(scrX - 3, scrY - 3, scrW + 6, scrH + 6);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(scrX - 3, scrY - 3, scrW + 6, scrH + 6);

    // Banner Surface
    const scrGrad = ctx.createLinearGradient(scrX, scrY, scrX, scrY + scrH);
    scrGrad.addColorStop(0, '#fffdf9');
    scrGrad.addColorStop(0.4, '#faeed9');
    scrGrad.addColorStop(1, '#f5deb3');
    ctx.fillStyle = scrGrad;
    ctx.fillRect(scrX, scrY, scrW, scrH);

    // SRM Convocation / Milan Cultural Fest Branding on Stage Backdrop (Photo 2 & 4)
    ctx.font = '900 11px "Times New Roman", Georgia, serif';
    ctx.fillStyle = '#002b80';
    ctx.textAlign = 'center';
    ctx.fillText('SRM INSTITUTE OF SCIENCE & TECHNOLOGY', cx, scrY + 24);

    ctx.font = '900 17px "Arial Black", sans-serif';
    ctx.fillStyle = '#b71c1c';
    ctx.fillText('★ DR. T.P. GANESAN AUDITORIUM ★', cx, scrY + 50);

    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#0d47a1';
    ctx.fillText('ASIA\'S PREMIER 4,000-SEAT HALL  •  MILAN 2026', cx, scrY + 70);

    ctx.font = '900 11px sans-serif';
    ctx.fillStyle = '#ff6f00';
    ctx.fillText('⚡ BRAWL FOR THE 10 CGPA ⚡', cx, scrY + 92);
    ctx.restore();

    // =========================================================================
    // 4. THE PROSCENIUM ARCH: LIGHT BEIGE "LEARN. LEAP. LEAD." BEAM & BLUE SWAGS
    // Photo 1 & Photo 4 Exact Reality!
    // =========================================================================
    ctx.save();
    const beamY = 58;
    const beamH = 34;
    const beamW = w - 40;
    const beamX = cx - beamW / 2;

    // Light Beige / Off-White Acoustic Panel Canopy Beam (Photos 1, 2, 4)
    const beamGrad = ctx.createLinearGradient(beamX, beamY, beamX, beamY + beamH);
    beamGrad.addColorStop(0, '#fbf8f2');
    beamGrad.addColorStop(0.5, '#ede6da');
    beamGrad.addColorStop(1, '#ded5c5');
    ctx.fillStyle = beamGrad;
    ctx.fillRect(beamX, beamY, beamW, beamH);

    ctx.strokeStyle = '#c4b8a5';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(beamX, beamY, beamW, beamH);

    // Vertical Panel Joint Lines on Beam (Photo 4)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    for (let bx = beamX + 40; bx < beamX + beamW; bx += 40) {
      ctx.beginPath();
      ctx.moveTo(bx, beamY);
      ctx.lineTo(bx, beamY + beamH);
      ctx.stroke();
    }

    // Circular SRM Seal Medallions Flanking the Motto (Photo 4 signature!)
    const drawBeamSeal = (sx) => {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx, beamY + beamH / 2, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#002b80';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#002b80';
      ctx.beginPath();
      ctx.arc(sx, beamY + beamH / 2 - 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(sx - 1.5, beamY + beamH / 2 - 2, 3, 6);
      ctx.restore();
    };

    drawBeamSeal(cx - 190);
    drawBeamSeal(cx + 190);

    // The Famous SRM University Motto: "LEARN. LEAP. LEAD." in Royal Blue (Photos 1 & 4)
    ctx.font = '900 16px "Arial Black", "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#002b80'; // Bold Royal Blue (exact match to photo!)
    ctx.textAlign = 'center';
    ctx.fillText('L E A R N .   L E A P .   L E A D .', cx, beamY + 23);

    // -------------------------------------------------------------------------
    // MIDNIGHT NAVY BLUE SCALLOPED VALANCE DRAPES (PHOTOS 1, 2, 3, 4)
    // Directly beneath the motto beam with downlight scallop illumination!
    // -------------------------------------------------------------------------
    const swagY = beamY + beamH;
    const swagH = 36;
    const swagCount = 11;
    const swagW = w / swagCount;

    for (let s = 0; s < swagCount; s++) {
      const sx = s * swagW;
      const drapeGrad = ctx.createLinearGradient(sx, swagY, sx + swagW, swagY + swagH);
      drapeGrad.addColorStop(0, '#060d20');
      drapeGrad.addColorStop(0.4, '#0d1a40');
      drapeGrad.addColorStop(0.8, '#14275c');
      drapeGrad.addColorStop(1, '#081028');
      ctx.fillStyle = drapeGrad;

      // Scalloped curve
      ctx.beginPath();
      ctx.moveTo(sx, swagY);
      ctx.lineTo(sx + swagW, swagY);
      ctx.quadraticCurveTo(sx + swagW / 2, swagY + swagH, sx, swagY);
      ctx.closePath();
      ctx.fill();

      // Golden Edge Trim & Fringe
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Warm Downlight Glow from Behind the Scallop (Photos 1, 2, 4)
      ctx.fillStyle = 'rgba(255, 235, 179, 0.45)';
      ctx.beginPath();
      ctx.arc(sx + swagW / 2, swagY + 4, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // =========================================================================
    // 5. STAGE CONCERT LIGHTING TRUSS & VOLUMETRIC TRACKING SPOTLIGHTS
    // Volumetric Cyan (P1) and Gold (P2) Spotlight Beams
    // =========================================================================
    ctx.save();
    const trussY = swagY + swagH + 2;

    const renderSpotlight = (srcX, tgtX, col) => {
      ctx.save();
      const spotGrad = ctx.createLinearGradient(srcX, trussY, tgtX, this.groundY);
      spotGrad.addColorStop(0, `${col}88`);
      spotGrad.addColorStop(0.3, `${col}44`);
      spotGrad.addColorStop(0.75, `${col}15`);
      spotGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = spotGrad;
      ctx.beginPath();
      ctx.moveTo(srcX - 10, trussY);
      ctx.lineTo(srcX + 10, trussY);
      ctx.lineTo(tgtX + 75, this.groundY);
      ctx.lineTo(tgtX - 75, this.groundY);
      ctx.closePath();
      ctx.fill();

      // Glowing Oval Stage Light Pool under Fighter
      ctx.fillStyle = `${col}33`;
      ctx.shadowColor = col;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.ellipse(tgtX, this.groundY - 2, 70, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    };

    renderSpotlight(w * 0.28, this.spotlight1.x, '#00e5ff'); // P1 Spotlight (Cyan)
    renderSpotlight(w * 0.72, this.spotlight2.x, '#ffd700'); // P2 Spotlight (Gold)
    ctx.restore();

    // =========================================================================
    // 6. POLISHED HARDWOOD STAGE ARENA & STAIRS (PHOTOS 1, 2, 4)
    // Honey-Oak Hardwood Stage with Glossy Surface Sheen
    // =========================================================================
    ctx.save();
    const stageY = 478;
    const stageH = h - stageY;

    // Hardwood Teak Stage Gradient (Photo 2)
    const floorGrad = ctx.createLinearGradient(0, stageY, 0, h);
    floorGrad.addColorStop(0, '#6d4c41');
    floorGrad.addColorStop(0.25, '#5d4037');
    floorGrad.addColorStop(0.65, '#4e342e');
    floorGrad.addColorStop(1, '#271711');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, stageY, w, stageH);

    // Floor Plank Seam Perspective Lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 1.2;
    for (let x = 0; x < w; x += 38) {
      ctx.beginPath();
      ctx.moveTo(x, stageY);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Surface Gloss Reflection
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(0, stageY, w, 16);

    // Left Stage Stainless Steel Access Stairs (Photos 1 & 4)
    const stairX = 92;
    const stairW = 48;
    for (let st = 0; st < 6; st++) {
      const sty = stageY + st * 7;
      ctx.fillStyle = '#37474f';
      ctx.fillRect(stairX - st * 6, sty, stairW, 6);
      ctx.fillStyle = '#b0bec5';
      ctx.fillRect(stairX - st * 6, sty - 1, stairW, 2);
    }
    // Stainless Steel Handrail
    ctx.strokeStyle = '#eceff1';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(stairX + 38, stageY - 18);
    ctx.lineTo(stairX - 28, stageY + 36);
    ctx.stroke();

    // Wooden Speaker Podium / Lectern on Left Stage (Photos 1, 2, 4)
    const podX = 160;
    const podY = stageY - 34;
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(podX, podY, 24, 34);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    ctx.strokeRect(podX, podY, 24, 34);
    // Microphone
    ctx.strokeStyle = '#90a4ae';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(podX + 12, podY);
    ctx.lineTo(podX + 12, podY - 10);
    ctx.lineTo(podX + 16, podY - 14);
    ctx.stroke();
    // Podium Flowers
    ctx.fillStyle = '#ff6f00';
    ctx.beginPath();
    ctx.arc(podX + 12, podY + 2, 5, 0, Math.PI * 2);
    ctx.fill();

    // -------------------------------------------------------------------------
    // MASSIVE MARIGOLD FLOWER BED & CRIMSON STAGE RISER SKIRT (PHOTOS 1, 2, 4)
    // Multi-tier yellow, orange, and white flowers atop bright red stage riser
    // -------------------------------------------------------------------------
    // Crimson Red Stage Skirt / Riser Cloth
    ctx.fillStyle = '#b71c1c';
    ctx.fillRect(0, stageY + 8, w, 16);
    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, stageY + 8, w, 16);

    // Dense Floral Marigold Arrangement (Photos 1, 2, 4 signature!)
    const flowerY = stageY + 2;
    for (let fx = 0; fx < w; fx += 8) {
      // Orange Marigolds (Layer 1)
      ctx.fillStyle = fx % 16 === 0 ? '#ff6f00' : '#ff8f00';
      ctx.beginPath();
      ctx.arc(fx, flowerY + 4 + Math.sin(fx * 0.2) * 2, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Bright Yellow Marigolds (Layer 2)
      ctx.fillStyle = fx % 24 === 0 ? '#ffee58' : '#ffd600';
      ctx.beginPath();
      ctx.arc(fx + 4, flowerY + Math.cos(fx * 0.25) * 2, 4, 0, Math.PI * 2);
      ctx.fill();

      // White Jasmine Flower Accents (Layer 3)
      if (fx % 32 === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(fx + 2, flowerY - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // =========================================================================
    // 7. 4,000-SEAT THEATER AUDIENCE: STENCILED NUMBERED SEATS (PHOTOS 1, 3, 4)
    // Lower Section: Crimson Velvet with Stencils (5, 6, 7, 8...)
    // Upper Section: Royal Blue Velvet with Stencils (23, 27, 31, 33...)
    // =========================================================================
    ctx.save();
    // -------------------------------------------------------------------------
    // A. UPPER/MID AUDITORIUM SECTION: ROYAL BLUE VELVET SEATS (PHOTO 3)
    // -------------------------------------------------------------------------
    const blueTierY = 285;
    for (let r = 0; r < 2; r++) {
      const ry = blueTierY + r * 28;
      // Blue Curved Seating Row
      ctx.fillStyle = '#0d2d5e';
      ctx.beginPath();
      ctx.ellipse(cx, ry + 10, w * 0.44, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Blue Theater Seat Backs with Stencils
      const seatCount = 14;
      for (let s = 0; s < seatCount; s++) {
        const sx = 140 + s * ((w - 280) / (seatCount - 1));
        // Black Shell Back
        ctx.fillStyle = '#1a2332';
        ctx.fillRect(sx - 10, ry - 6, 20, 14);
        // Royal Blue Cushion
        ctx.fillStyle = '#1565c0';
        ctx.fillRect(sx - 9, ry - 5, 18, 8);

        // Silver Stenciled Seat Numbers (Photo 3: "23", "27", "31", "33"...)
        ctx.font = 'bold 5px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.textAlign = 'center';
        ctx.fillText(String(20 + s * 2 + r * 3), sx, ry + 5);

        // Student Head Silhouette
        ctx.fillStyle = (s + r) % 3 === 0 ? '#ffca28' : '#263238';
        ctx.beginPath();
        ctx.arc(sx, ry - 10, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // -------------------------------------------------------------------------
    // B. LOWER AUDITORIUM SECTION: CRIMSON / MAROON VELVET SEATS (PHOTOS 1 & 4)
    // Stenciled with crisp white numbers: 5, 6, 7, 8...
    // -------------------------------------------------------------------------
    const redTierY = 350;
    for (let r = 0; r < 3; r++) {
      const ry = redTierY + r * 34;
      // Crimson Seating Row
      ctx.fillStyle = '#4a0011';
      ctx.beginPath();
      ctx.ellipse(cx, ry + 14, w * 0.48, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      // Crimson Plush Seat Backs
      const seatCount = 12;
      for (let s = 0; s < seatCount; s++) {
        const sx = 130 + s * ((w - 260) / (seatCount - 1));
        // Black Hard Seat Shell
        ctx.fillStyle = '#10141c';
        ctx.fillRect(sx - 12, ry - 8, 24, 18);
        // Deep Crimson Velvet Cushion
        ctx.fillStyle = '#b71c1c';
        ctx.fillRect(sx - 10, ry - 6, 20, 10);
        ctx.fillStyle = '#d32f2f';
        ctx.fillRect(sx - 10, ry - 6, 20, 2);

        // White Stenciled Seat Numbers (Photos 1 & 4: "5", "6", "7", "8"...)
        ctx.font = '900 6.5px "Arial Black", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.textAlign = 'center';
        ctx.fillText(String(s + 1 + r * 4), sx, ry + 7);

        // Cheering Audience Heads
        ctx.fillStyle = '#212121';
        ctx.beginPath();
        ctx.arc(sx, ry - 13, 5.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Thousands of Student Phone Flashlight Torches Swaying (Photos 1, 3, 4)
    for (const light of this.crowdLights) {
      const pulse = (Math.sin(t * light.speed + light.phase) + 1) * 0.5;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.45 + pulse * 0.55})`;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 8 * pulse;
      ctx.beginPath();
      ctx.arc(light.x, light.y, light.size * (0.9 + pulse * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    // =========================================================================
    // 8. CELEBRATORY CONFETTI EXPLOSIONS (MILAN / CONVOCATION GIMMICK)
    // =========================================================================
    ctx.save();
    for (const c of this.confetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.65);
      ctx.restore();
    }
    ctx.restore();

    // =========================================================================
    // 9. SUBWOOFER BASS RUMBLE SHOCKWAVE ALERT
    // =========================================================================
    if (this.bassTimer < 40) {
      ctx.save();
      const alpha = (40 - this.bassTimer) / 40;
      ctx.strokeStyle = `rgba(224, 64, 251, ${0.7 * (1 - alpha)})`;
      ctx.lineWidth = 4;
      ctx.shadowColor = '#e040fb';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(cx, this.groundY - 30, alpha * 260, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
