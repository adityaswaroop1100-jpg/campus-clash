/**
 * Campus Clash — Stage: Vendhar Square ("A Place of Joyousness")
 * Based on the iconic Vendhar Square stepped monument, Founder statue, and illuminated fountain plaza
 * @module stages/vendharSquare
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants.js';

export class VendharSquareStage {
  constructor() {
    this.id = 'vendharsquare';
    this.name = 'Vendhar Square Plaza';
    this.groundY = 520;
    this.minX = 40;
    this.maxX = CANVAS_WIDTH - 40;

    // Laser & Projection Mapping Animation Phase
    this.animTime = 0;
    this.treeGlow = 1.0;
    this.spotlightAngle = 0;

    // Fountain Water Jets
    this.fountainX = CANVAS_WIDTH / 2;
    this.fountainY = 485;
    this.fountainJets = [];
    for (let i = 0; i < 28; i++) {
      this.fountainJets.push({
        x: this.fountainX + (Math.random() - 0.5) * 140,
        y: this.fountainY,
        vx: (Math.random() - 0.5) * 1.8,
        vy: -3.5 - Math.random() * 3.5,
        gravity: 0.14,
        alpha: 0.8,
        size: 1.5 + Math.random() * 2
      });
    }

    // Interactive Stage Hazard: High Fountain Geyser
    this.geyserTimer = 540; // Every 9-10 seconds
    this.geyserActive = 0;
    this.geyserSplashed = false;

    // Light Motes / Wisdom Embers
    this.wisdomMotes = [];
    for (let i = 0; i < 20; i++) {
      this.wisdomMotes.push({
        x: 200 + Math.random() * 560,
        y: 180 + Math.random() * 240,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.3 - Math.random() * 0.5,
        size: 2 + Math.random() * 2.5,
        alpha: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2
      });
    }

    // Ambient floating mist particles
    this.mistParticles = [];
    for (let i = 0; i < 15; i++) {
      this.mistParticles.push({
        x: Math.random() * CANVAS_WIDTH,
        y: 440 + Math.random() * 80,
        vx: 0.2 + Math.random() * 0.3,
        size: 15 + Math.random() * 20,
        alpha: 0.08 + Math.random() * 0.08
      });
    }
  }

  update(dt, fighters = [], particles = null, sound = null) {
    this.animTime += dt || 0.016;

    // Update Fountain Water Drops
    this.fountainJets.forEach(jet => {
      jet.x += jet.vx;
      jet.y += jet.vy;
      jet.vy += jet.gravity;
      jet.alpha -= 0.012;
      if (jet.y >= this.fountainY || jet.alpha <= 0) {
        jet.x = this.fountainX + (Math.random() - 0.5) * 130;
        jet.y = this.fountainY;
        jet.vx = (Math.random() - 0.5) * 1.6;
        jet.vy = -3.2 - Math.random() * 3.8;
        jet.alpha = 0.75 + Math.random() * 0.25;
      }
    });

    // High Fountain Geyser Hazard
    this.geyserTimer--;
    if (this.geyserTimer <= 45 && this.geyserTimer > 0) {
      // Pre-warning bubble fizz
      if (particles && Math.random() < 0.4) {
        particles.spawnHitSparks(this.fountainX + (Math.random() - 0.5) * 80, this.fountainY - 5, '#00e5ff', 2);
      }
    } else if (this.geyserTimer <= 0) {
      if (!this.geyserSplashed) {
        this.geyserSplashed = true;
        this.geyserActive = 80;
        if (sound) sound.playFountainSplash();
        if (particles) {
          particles.spawnHitSparks(this.fountainX, this.fountainY - 40, '#00e5ff', 25);
          particles.spawnHitSparks(this.fountainX, this.fountainY - 60, '#ffffff', 18);
        }
      }
    }

    if (this.geyserActive > 0) {
      this.geyserActive--;
      // Push or speed boost grounded fighters crossing the fountain
      fighters.forEach(f => {
        if (Math.abs(f.x - this.fountainX) < 90 && f.isGrounded) {
          f.vx += (f.facing || 1) * 0.4;
          if (Math.random() < 0.2 && particles) {
            particles.spawnHitSparks(f.x, f.y - 40, '#80d8ff', 1);
          }
        }
      });
      if (this.geyserActive <= 0) {
        this.geyserTimer = 540 + Math.floor(Math.random() * 120);
        this.geyserSplashed = false;
      }
    }

    // Update Wisdom Light Motes
    this.wisdomMotes.forEach(m => {
      m.x += m.vx;
      m.y += m.vy;
      m.phase += 0.04;
      if (m.y < 120) {
        m.y = 420;
        m.x = 220 + Math.random() * 520;
      }
    });

    // Update Mist
    this.mistParticles.forEach(p => {
      p.x += p.vx;
      if (p.x > CANVAS_WIDTH + 50) p.x = -50;
    });
  }

  render(ctx) {
    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;

    // 1. Warm Sunset Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 480);
    skyGrad.addColorStop(0, '#0d0d1a');
    skyGrad.addColorStop(0.4, '#1a0a2e');
    skyGrad.addColorStop(0.75, '#7a2c1a');
    skyGrad.addColorStop(1, '#c45e1a44');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Stars & Twinkling Constellations
    ctx.save();
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 35; i++) {
      const sx = (i * 73 + 29) % w;
      const sy = (i * 47 + 13) % 180;
      const sAlpha = 0.3 + Math.sin(this.animTime * 2 + i) * 0.3;
      ctx.globalAlpha = Math.max(0.1, sAlpha);
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }
    ctx.restore();

    // 2. Upward Spotlight Beams Behind Founder Statue
    ctx.save();
    const beamGrad = ctx.createRadialGradient(w / 2, 80, 10, w / 2, 80, 320);
    beamGrad.addColorStop(0, 'rgba(255, 215, 0, 0.45)');
    beamGrad.addColorStop(0.4, 'rgba(0, 229, 255, 0.15)');
    beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 20, 100);
    ctx.lineTo(w / 2 - 140, 0);
    ctx.lineTo(w / 2 + 140, 0);
    ctx.lineTo(w / 2 + 20, 100);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 3. Background Grand Stepped Monument (Pyramid Architecture)
    this.renderMonument(ctx);

    // 4. "VENDHAR SQUARE" Ornamental Entrance Wall (Left Backdrop)
    this.renderVendharWall(ctx);

    // 5. Central Fountain Basin & Lighted Domes
    this.renderFountain(ctx);

    // 6. Wisdom Tree Laser Projection Particles
    this.renderWisdomMotes(ctx);

    // 7. Ground Paving & Radial Cobblestones
    this.renderGround(ctx);
  }

  renderMonument(ctx) {
    const cx = CANVAS_WIDTH / 2;
    const baseWidth = 560;
    const topWidth = 220;
    const monumentBottomY = 475;
    const monumentTopY = 175;

    ctx.save();

    // Main Stepped Pyramid Backfill
    const pyramidGrad = ctx.createLinearGradient(0, monumentTopY, 0, monumentBottomY);
    pyramidGrad.addColorStop(0, '#f2dcd5');
    pyramidGrad.addColorStop(0.5, '#deb3a6');
    pyramidGrad.addColorStop(1, '#8f5345');
    ctx.fillStyle = pyramidGrad;

    ctx.beginPath();
    ctx.moveTo(cx - topWidth / 2, monumentTopY);
    ctx.lineTo(cx + topWidth / 2, monumentTopY);
    ctx.lineTo(cx + baseWidth / 2, monumentBottomY);
    ctx.lineTo(cx - baseWidth / 2, monumentBottomY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c59b8f';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Stepped Staircase Walkways on Left and Right Sides
    ctx.fillStyle = '#edd1c9';
    ctx.strokeStyle = '#a86f62';
    ctx.lineWidth = 1;
    const stepCount = 14;
    for (let i = 0; i < stepCount; i++) {
      const t = i / stepCount;
      const stepY = monumentTopY + t * (monumentBottomY - monumentTopY);
      const halfW = (topWidth / 2) + t * ((baseWidth - topWidth) / 2);

      // Left stairs
      ctx.fillRect(cx - halfW - 22, stepY, 26, 8);
      ctx.strokeRect(cx - halfW - 22, stepY, 26, 8);

      // Right stairs
      ctx.fillRect(cx + halfW - 4, stepY, 26, 8);
      ctx.strokeRect(cx + halfW - 4, stepY, 26, 8);

      // Balustrade posts
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - halfW - 20, stepY - 4, 3, 5);
      ctx.fillRect(cx + halfW + 17, stepY - 4, 3, 5);
      ctx.fillStyle = '#edd1c9';
    }

    // Central Classical Facade with 6 Corinthian Fluted Pillars
    const facadeW = 200;
    const facadeX = cx - facadeW / 2;
    const facadeH = monumentBottomY - monumentTopY - 30;

    // Dark Laser-Projection Backing Wall
    ctx.fillStyle = '#061329';
    ctx.fillRect(facadeX, monumentTopY + 25, facadeW, facadeH);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(facadeX, monumentTopY + 25, facadeW, facadeH);

    // Projection Mapping: Glowing Tree of Wisdom
    this.renderTreeProjection(ctx, cx, monumentTopY + 25, facadeW, facadeH);

    // 6 Corinthian Pillars
    const colSpacing = facadeW / 5;
    for (let i = 0; i < 6; i++) {
      const colX = facadeX + i * colSpacing;
      
      // Pillar Shaft (Fluted Gradient)
      const colGrad = ctx.createLinearGradient(colX - 7, 0, colX + 7, 0);
      colGrad.addColorStop(0, '#f5e9e2');
      colGrad.addColorStop(0.3, '#ffffff');
      colGrad.addColorStop(0.7, '#d6beba');
      colGrad.addColorStop(1, '#8f6e69');
      ctx.fillStyle = colGrad;
      ctx.fillRect(colX - 6, monumentTopY + 30, 12, facadeH - 10);

      // Column Capital (Ornate Top)
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(colX - 8, monumentTopY + 26, 16, 6);
      // Column Base
      ctx.fillStyle = '#c59b8f';
      ctx.fillRect(colX - 8, monumentTopY + facadeH + 15, 16, 7);
    }

    // Top Classical Balustrade & Pavilion
    ctx.fillStyle = '#f5e9e2';
    ctx.fillRect(cx - topWidth / 2 - 15, monumentTopY - 10, topWidth + 30, 12);
    ctx.strokeStyle = '#8f5345';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - topWidth / 2 - 15, monumentTopY - 10, topWidth + 30, 12);

    // Top Balusters
    for (let bx = cx - topWidth / 2 - 10; bx < cx + topWidth / 2 + 10; bx += 10) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx, monumentTopY - 22, 4, 12);
    }
    ctx.fillStyle = '#f5e9e2';
    ctx.fillRect(cx - topWidth / 2 - 15, monumentTopY - 25, topWidth + 30, 5);

    // Golden Founder Statue on the Summit
    this.renderFounderStatue(ctx, cx, monumentTopY - 25);

    ctx.restore();
  }

  renderTreeProjection(ctx, cx, wallY, w, h) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - w / 2, wallY, w, h);
    ctx.clip();

    // Ambient pulsing golden glow
    const pulse = 0.8 + Math.sin(this.animTime * 3) * 0.2;

    // Golden Tree Trunk & Roots
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.85 * pulse})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ffb300';
    ctx.shadowBlur = 14;

    const rootY = wallY + h - 10;
    ctx.beginPath();
    // Central Trunk
    ctx.moveTo(cx, rootY);
    ctx.lineTo(cx, wallY + h * 0.5);

    // Root branches
    ctx.moveTo(cx, rootY);
    ctx.quadraticCurveTo(cx - 30, rootY + 6, cx - 60, rootY + 4);
    ctx.moveTo(cx, rootY);
    ctx.quadraticCurveTo(cx + 30, rootY + 6, cx + 60, rootY + 4);

    // Canopy Branches spreading outward
    ctx.moveTo(cx, wallY + h * 0.5);
    ctx.quadraticCurveTo(cx - 40, wallY + h * 0.35, cx - 75, wallY + h * 0.2);

    ctx.moveTo(cx, wallY + h * 0.5);
    ctx.quadraticCurveTo(cx + 40, wallY + h * 0.35, cx + 75, wallY + h * 0.2);

    ctx.moveTo(cx, wallY + h * 0.5);
    ctx.quadraticCurveTo(cx - 20, wallY + h * 0.25, cx - 40, wallY + h * 0.1);

    ctx.moveTo(cx, wallY + h * 0.5);
    ctx.quadraticCurveTo(cx + 20, wallY + h * 0.25, cx + 40, wallY + h * 0.1);
    ctx.stroke();

    // Golden Leaves / Wisdom Particles
    ctx.fillStyle = '#ffd700';
    for (let i = 0; i < 24; i++) {
      const lx = cx + Math.sin(i * 1.7) * 75;
      const ly = wallY + 30 + Math.cos(i * 2.3) * (h * 0.35);
      ctx.beginPath();
      ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Projected SRM Emblem in Center
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(cx - 38, wallY + h * 0.38, 76, 22);
    ctx.strokeStyle = '#0033a0';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 38, wallY + h * 0.38, 76, 22);

    ctx.font = '900 11px monospace';
    ctx.fillStyle = '#0033a0';
    ctx.textAlign = 'center';
    ctx.fillText('SRMIST', cx, wallY + h * 0.38 + 15);

    ctx.restore();
  }

  renderFounderStatue(ctx, cx, y) {
    ctx.save();

    // Golden Pedestal
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(cx - 16, y - 10, 32, 10);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 16, y - 10, 32, 10);

    // Large soft golden radial glow behind statue
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const statueGlow = ctx.createRadialGradient(cx, y - 40, 0, cx, y - 40, 120);
    statueGlow.addColorStop(0, '#ffd700');
    statueGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = statueGlow;
    ctx.beginPath();
    ctx.arc(cx, y - 40, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Glowing Golden Aura behind statue
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 20;

    // Statue Body (Gold Silhouette in Classic Suit Posture with Folded Arms)
    ctx.fillStyle = '#ffd700';
    // Legs
    ctx.fillRect(cx - 6, y - 30, 5, 20);
    ctx.fillRect(cx + 1, y - 30, 5, 20);
    // Torso / Suit
    ctx.fillRect(cx - 9, y - 52, 18, 24);
    // Arms crossed
    ctx.fillRect(cx - 11, y - 48, 22, 10);
    // Head
    ctx.beginPath();
    ctx.arc(cx, y - 58, 6, 0, Math.PI * 2);
    ctx.fill();

    // Ray of Sun / Spotlight shining directly down on statue
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, y - 64);
    ctx.stroke();

    ctx.restore();
  }

  renderVendharWall(ctx) {
    ctx.save();
    const wallX = 30;
    const wallY = 320;
    const wallW = 175;
    const wallH = 145;

    // White Neoclassical Stonework Wall
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(wallX, wallY, wallW, wallH);
    ctx.strokeStyle = '#cfd8dc';
    ctx.lineWidth = 2;
    ctx.strokeRect(wallX, wallY, wallW, wallH);

    // Stone Brick Scoring
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let r = wallY + 20; r < wallY + wallH; r += 16) {
      ctx.beginPath();
      ctx.moveTo(wallX, r);
      ctx.lineTo(wallX + wallW, r);
      ctx.stroke();
    }

    // Ornate Top Cornice & Balustrade
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(wallX - 6, wallY - 12, wallW + 12, 14);
    ctx.strokeStyle = '#b0bec5';
    ctx.strokeRect(wallX - 6, wallY - 12, wallW + 12, 14);

    // Lattice Openings at Bottom Balustrade
    ctx.fillStyle = '#eceff1';
    ctx.fillRect(wallX, wallY + wallH - 26, wallW, 26);
    ctx.fillStyle = '#37474f';
    for (let lx = wallX + 8; lx < wallX + wallW - 8; lx += 14) {
      ctx.beginPath();
      ctx.arc(lx + 4, wallY + wallH - 13, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Central Plaque with Inscription: "VENDHAR SQUARE"
    const plaqueX = wallX + 10;
    const plaqueY = wallY + 30;
    const plaqueW = wallW - 20;
    const plaqueH = 50;

    ctx.fillStyle = '#f3ebe1';
    ctx.fillRect(plaqueX, plaqueY, plaqueW, plaqueH);
    ctx.strokeStyle = '#c5a880';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(plaqueX, plaqueY, plaqueW, plaqueH);

    ctx.font = '900 11px "Arial Black", sans-serif';
    ctx.fillStyle = '#5d4037';
    ctx.textAlign = 'center';
    ctx.fillText('VENDHAR SQUARE', plaqueX + plaqueW / 2, plaqueY + 22);

    ctx.font = 'italic 9px Georgia, serif';
    ctx.fillStyle = '#2e7d32';
    ctx.fillText('A Place of Joyousness', plaqueX + plaqueW / 2, plaqueY + 38);

    ctx.restore();
  }

  renderFountain(ctx) {
    const fx = this.fountainX;
    const fy = this.fountainY;

    ctx.save();

    // Concentric Garden Flowerbeds behind fountain
    ctx.fillStyle = '#4a148c'; // Deep purple floral ring
    ctx.beginPath();
    ctx.ellipse(fx, fy - 2, 180, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2e7d32'; // Emerald green grass hedge
    ctx.beginPath();
    ctx.ellipse(fx, fy - 2, 150, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main Circular Fountain Basin (Stone Base)
    ctx.fillStyle = '#102a43';
    ctx.beginPath();
    ctx.ellipse(fx, fy, 110, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Water Surface (Glowing Blue)
    const waterGrad = ctx.createRadialGradient(fx, fy, 5, fx, fy, 90);
    waterGrad.addColorStop(0, '#80d8ff');
    waterGrad.addColorStop(0.6, '#0091ea');
    waterGrad.addColorStop(1, '#01579b');
    ctx.fillStyle = waterGrad;
    ctx.beginPath();
    ctx.ellipse(fx, fy, 95, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ornate Geodesic Wire Domes / Lanterns
    const drawDome = (dx, dy, radius) => {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(dx, dy, radius, Math.PI, 0, false);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(dx - radius, dy);
      ctx.lineTo(dx + radius, dy);
      ctx.stroke();
    };

    drawDome(fx, fy - 5, 26);
    drawDome(fx - 70, fy - 2, 16);
    drawDome(fx + 70, fy - 2, 16);

    // Render Animated Water Jets
    ctx.fillStyle = '#e1f5fe';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 6;
    this.fountainJets.forEach(jet => {
      ctx.globalAlpha = Math.max(0, jet.alpha);
      ctx.beginPath();
      ctx.arc(jet.x, jet.y, jet.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // High Geyser Eruption Effect
    if (this.geyserActive > 0) {
      const geyserH = 90 + Math.sin(this.animTime * 15) * 20;
      const gGrad = ctx.createLinearGradient(fx, fy, fx, fy - geyserH);
      gGrad.addColorStop(0, 'rgba(0, 229, 255, 0.85)');
      gGrad.addColorStop(0.7, 'rgba(128, 216, 255, 0.7)');
      gGrad.addColorStop(1, 'rgba(255, 255, 255, 0.9)');
      ctx.fillStyle = gGrad;

      ctx.beginPath();
      ctx.moveTo(fx - 18, fy);
      ctx.lineTo(fx - 8, fy - geyserH);
      ctx.lineTo(fx + 8, fy - geyserH);
      ctx.lineTo(fx + 18, fy);
      ctx.closePath();
      ctx.fill();
    }

    // Animated water ripple rings
    ctx.strokeStyle = 'rgba(128, 216, 255, 0.4)';
    for (let i = 0; i < 3; i++) {
      const rippleT = (this.animTime * 0.5 + i / 3) % 1;
      const rx = 10 + rippleT * 90;
      const ry = 2 + rippleT * 18;
      ctx.globalAlpha = 1 - rippleT;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(fx, fy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  renderWisdomMotes(ctx) {
    ctx.save();
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ff9100';
    ctx.shadowBlur = 8;
    this.wisdomMotes.forEach(m => {
      ctx.globalAlpha = m.alpha * (0.6 + Math.sin(m.phase) * 0.4);
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  renderGround(ctx) {
    const w = CANVAS_WIDTH;
    const gy = this.groundY;

    ctx.save();

    // Dark Plaza Interlocking Pavers
    const groundGrad = ctx.createLinearGradient(0, gy, 0, CANVAS_HEIGHT);
    groundGrad.addColorStop(0, '#1c2430');
    groundGrad.addColorStop(0.4, '#131922');
    groundGrad.addColorStop(1, '#0b0f15');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, gy, w, CANVAS_HEIGHT - gy);

    // Dark marble reflection strip
    const marbleGrad = ctx.createLinearGradient(0, gy, 0, gy + 16);
    marbleGrad.addColorStop(0, 'rgba(255,200,100,0.06)');
    marbleGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = marbleGrad;
    ctx.fillRect(0, gy, w, 16);

    // Radial Cobblestone Paver Arcs (From Photo)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let rad = 30; rad < 220; rad += 22) {
      ctx.beginPath();
      ctx.arc(w / 2, gy + 80, rad, Math.PI * 0.9, Math.PI * 2.1);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(180, gy + 60, rad * 0.7, Math.PI * 0.9, Math.PI * 2.1);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(w - 180, gy + 60, rad * 0.7, Math.PI * 0.9, Math.PI * 2.1);
      ctx.stroke();
    }

    // Top Platform Curb Edge Line
    ctx.strokeStyle = '#455a64';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();

    // Golden Accent Curb Trim
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, gy + 2);
    ctx.lineTo(w, gy + 2);
    ctx.stroke();

    ctx.restore();
  }
}
