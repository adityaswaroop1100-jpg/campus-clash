/**
 * Campus Clash — Stage: University Building (UB) Quadrangle & Clock Tower
 * The iconic administrative powerhouse and academic heart of SRM KTR.
 * Features red-and-cream brick facade, working 4-face Clock Tower,
 * arched colonnade portico, royal palm trees, and manicured quadrangle lawn.
 * @module stages/universityBuilding
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants.js';

export class UniversityBuildingStage {
  constructor() {
    this.id = 'universitybuilding';
    this.name = 'University Building (UB) Quadrangle';
    this.shortName = 'UB CLOCK TOWER';
    this.subtitle = 'The Administrative Heart';
    this.groundY = 520;
    this.minX = 40;
    this.maxX = CANVAS_WIDTH - 40;

    this.animTime = 0;

    // Distant birds soaring over the quadrangle
    this.birds = [
      { x: 120, y: 80, speed: 1.2, wingPhase: 0 },
      { x: 340, y: 110, speed: 0.9, wingPhase: 1.5 },
      { x: 720, y: 65, speed: 1.4, wingPhase: 2.8 }
    ];

    // Falling golden gulmohar / banyan leaves
    this.leaves = [];
    for (let i = 0; i < 18; i++) {
      this.leaves.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * (this.groundY - 100),
        vx: 0.3 + Math.random() * 0.5,
        vy: 0.4 + Math.random() * 0.6,
        size: 3 + Math.random() * 3,
        rot: Math.random() * Math.PI * 2,
        color: Math.random() > 0.4 ? '#e65100' : '#ffd54f'
      });
    }

    // Flagpole with waving SRMIST crest banner
    this.flagWave = 0;

    // Stage Gimmick: Clock Tower Bell Chime
    this.bellChimeTimer = 900; // Rings every 15 seconds
    this.bellActive = 0;
    this.bellRung = false;

    // Administrative Ambassador Car in Circular Driveway
    this.carLight = 0;
  }

  update(dt = 0.016, fighters = [], particles = null, sound = null) {
    this.animTime += dt;
    this.flagWave += dt * 3.5;

    // Update birds
    for (const b of this.birds) {
      b.x += b.speed;
      b.wingPhase += 0.2;
      if (b.x > CANVAS_WIDTH + 60) {
        b.x = -60;
        b.y = 50 + Math.random() * 90;
      }
    }

    // Update drifting leaves
    for (const l of this.leaves) {
      l.x += l.vx;
      l.y += l.vy;
      l.rot += 0.04;
      if (l.x > CANVAS_WIDTH + 20) l.x = -20;
      if (l.y > this.groundY - 10) {
        l.y = 100 + Math.random() * 50;
        l.x = Math.random() * CANVAS_WIDTH;
      }
    }

    // Clock Tower Bell Chime Gimmick
    this.bellChimeTimer--;
    if (this.bellChimeTimer <= 0) {
      this.bellActive = 90;
      this.bellChimeTimer = 900 + Math.floor(Math.random() * 300);
      this.bellRung = true;
      if (sound && typeof sound.playTone === 'function') {
        sound.playTone(392.00, 'sine', 1.8, 0.25); // G4 bell toll
      }
    }

    if (this.bellActive > 0) {
      this.bellActive--;
      if (particles && Math.random() < 0.3) {
        particles.spawnImpactRing(CANVAS_WIDTH / 2, 90, '#ffd700', 70, 20);
      }
    }
  }

  render(ctx) {
    const t = this.animTime;
    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;
    const cx = w / 2; // 480

    // =========================================================================
    // 1. CHENNAI SKY & SUNLIGHT (VIBRANT DAYLIGHT OVER KATTANKULATHUR)
    // =========================================================================
    const sky = ctx.createLinearGradient(0, 0, 0, this.groundY);
    sky.addColorStop(0, '#1565c0');   // Deep azure at zenith
    sky.addColorStop(0.35, '#29b6f6'); // Brilliant tropical blue
    sky.addColorStop(0.7, '#81d4fa');  // Soft horizon cyan
    sky.addColorStop(1, '#e1f5fe');    // Bright warm atmosphere
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, this.groundY);

    // Warm Solar Sunburst in Upper Right (Photo 4)
    ctx.save();
    const sunGrad = ctx.createRadialGradient(720, 50, 10, 720, 50, 180);
    sunGrad.addColorStop(0, 'rgba(255, 255, 240, 0.9)');
    sunGrad.addColorStop(0.2, 'rgba(255, 248, 180, 0.45)');
    sunGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.1)');
    sunGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(720, 50, 180, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Drifting Cumulus Clouds
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    const clouds = [
      { x: (120 + t * 6) % (w + 160) - 80, y: 45, rw: 65, rh: 24 },
      { x: (480 + t * 4) % (w + 180) - 90, y: 75, rw: 80, rh: 28 },
      { x: (780 + t * 8) % (w + 140) - 70, y: 35, rw: 55, rh: 20 }
    ];
    for (const c of clouds) {
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.rw, c.rh, 0, 0, Math.PI * 2);
      ctx.ellipse(c.x - c.rw * 0.4, c.y + 3, c.rw * 0.5, c.rh * 0.7, 0, 0, Math.PI * 2);
      ctx.ellipse(c.x + c.rw * 0.4, c.y + 2, c.rw * 0.45, c.rh * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // =========================================================================
    // 2. BACKGROUND ARCHITECTURE: NEOCLASSICAL UNIVERSITY BUILDING / LAW FACULTY
    // (Visible in left and far background of Photo 2 and Photo 4)
    // =========================================================================
    ctx.save();
    // Far Left Neoclassical White Academic Wing (Photo 4)
    const bgBldgLeft = 40;
    const bgBldgW = 240;
    const bgBldgY = 240;
    const bgBldgH = 180;

    ctx.fillStyle = '#edf2f7';
    ctx.fillRect(bgBldgLeft, bgBldgY, bgBldgW, bgBldgH);
    ctx.strokeStyle = '#cbd5e0';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bgBldgLeft, bgBldgY, bgBldgW, bgBldgH);

    // Neoclassical Arched Windows on Background Wing
    ctx.fillStyle = '#2b6cb0';
    for (let r = 0; r < 3; r++) {
      const wy = bgBldgY + 25 + r * 50;
      for (let c = 0; c < 5; c++) {
        const wx = bgBldgLeft + 18 + c * 44;
        ctx.beginPath();
        ctx.arc(wx + 12, wy, 12, Math.PI, 0, false);
        ctx.lineTo(wx + 24, wy + 26);
        ctx.lineTo(wx, wy + 26);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Background Roof Parapet & White Cupola Pavilion (Photo 4)
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(bgBldgLeft - 8, bgBldgY - 14, bgBldgW + 16, 14);
    // Classical roof pavilion
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bgBldgLeft + 80, bgBldgY - 38, 70, 24);
    ctx.beginPath();
    ctx.arc(bgBldgLeft + 115, bgBldgY - 38, 25, Math.PI, 0, false);
    ctx.fill();

    // Far Right Dense Green Canopy
    ctx.fillStyle = '#1b5e20';
    for (let rx = 700; rx < w + 30; rx += 35) {
      ctx.beginPath();
      ctx.arc(rx, 350 + Math.sin(rx * 0.05) * 12, 38, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // =========================================================================
    // 3. ROYAL PALM TREES & FLANKING GREENERY (PHOTO 2)
    // =========================================================================
    ctx.save();
    const palms = [
      { x: 190, y: 440, h: 220, lean: -12 },
      { x: 230, y: 450, h: 180, lean: -6 },
      { x: 740, y: 450, h: 190, lean: 8 },
      { x: 780, y: 440, h: 230, lean: 14 }
    ];

    for (const p of palms) {
      // Ringed Palm Trunk
      const crownX = p.x + p.lean;
      const crownY = p.y - p.h;

      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.quadraticCurveTo(p.x + p.lean * 0.4, p.y - p.h * 0.5, crownX, crownY);
      ctx.stroke();

      // Feathery Palm Fronds
      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = 3.5;
      for (let f = 0; f < 10; f++) {
        const fa = (f / 10) * Math.PI * 2;
        const fLen = 42;
        ctx.beginPath();
        ctx.moveTo(crownX, crownY);
        ctx.quadraticCurveTo(
          crownX + Math.cos(fa) * fLen * 0.6,
          crownY + Math.sin(fa) * fLen * 0.4 - 8,
          crownX + Math.cos(fa) * fLen,
          crownY + Math.sin(fa) * fLen * 0.7 + 12
        );
        ctx.stroke();
      }
    }
    ctx.restore();

    // Dense Tropical Garden Shrubbery behind the roundabout
    ctx.save();
    ctx.fillStyle = '#2e7d32';
    for (let gx = 0; gx < w; gx += 28) {
      ctx.beginPath();
      ctx.arc(gx + 14, 400 + Math.sin(gx * 0.1) * 8, 26, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // =========================================================================
    // 4. THE REAL FREESTANDING SRM CLOCK TOWER (1:1 ACCURATE PHOTO REPRODUCTION)
    // Symmetrical, Monumental Tower with Fluted Dome, Roman Clock Face & White Columns
    // =========================================================================
    const towerW = 126;       // Main body width
    const towerLeft = cx - towerW / 2; // 417
    const towerRight = cx + towerW / 2; // 543
    const towerTopY = 48;
    const towerBaseY = 385;

    // -------------------------------------------------------------------------
    // A. FLUTED RIBBED NEOCLASSICAL GOLDEN DOME / CUPOLA (PHOTO 1, 2, 3)
    // -------------------------------------------------------------------------
    ctx.save();
    const domeW = 86;
    const domeH = 58;
    const domeTopY = towerTopY;
    const domeBaseY = domeTopY + domeH;

    // Gold/Cream Dome Gradient
    const domeGrad = ctx.createLinearGradient(cx - domeW / 2, domeTopY, cx + domeW / 2, domeBaseY);
    domeGrad.addColorStop(0, '#fff3e0');
    domeGrad.addColorStop(0.3, '#ffd54f');
    domeGrad.addColorStop(0.7, '#ffca28');
    domeGrad.addColorStop(1, '#ffb300');
    ctx.fillStyle = domeGrad;

    // Bell-shaped / Roman Cupola Dome
    ctx.beginPath();
    ctx.moveTo(cx - domeW / 2, domeBaseY);
    ctx.bezierCurveTo(cx - domeW / 2 + 2, domeTopY + 18, cx - 18, domeTopY, cx, domeTopY);
    ctx.bezierCurveTo(cx + 18, domeTopY, cx + domeW / 2 - 2, domeTopY + 18, cx + domeW / 2, domeBaseY);
    ctx.closePath();
    ctx.fill();

    // Fluted Vertical Ribs on the Dome (Matching Photo 1 & 3!)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 2;
    const ribOffsets = [-32, -20, -8, 8, 20, 32];
    for (const ro of ribOffsets) {
      ctx.beginPath();
      ctx.moveTo(cx + ro, domeBaseY);
      ctx.quadraticCurveTo(cx + ro * 0.45, domeTopY + 16, cx, domeTopY);
      ctx.stroke();
    }

    // Dome Gold Finial / Spire on Top
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(cx - 3, domeTopY - 14, 6, 14);
    ctx.beginPath();
    ctx.arc(cx, domeTopY - 16, 5, 0, Math.PI * 2);
    ctx.fill();

    // Dome Lower Octagonal Cornice & Dentils
    ctx.fillStyle = '#ffe082';
    ctx.fillRect(cx - domeW / 2 - 8, domeBaseY, domeW + 16, 10);
    ctx.strokeStyle = '#ffa000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - domeW / 2 - 8, domeBaseY, domeW + 16, 10);

    // Decorative Dentil Teeth under Dome Cornice
    ctx.fillStyle = '#fff8e1';
    for (let dx = cx - domeW / 2 - 4; dx < cx + domeW / 2 + 4; dx += 8) {
      ctx.fillRect(dx, domeBaseY + 3, 4, 4);
    }
    ctx.restore();

    // -------------------------------------------------------------------------
    // B. THE 4-FACE CLOCK CHAMBER (PHOTO 1, 2, 3)
    // Square Ochre Masonry Chamber with Inset Blue Frame & Roman Clock Face
    // -------------------------------------------------------------------------
    ctx.save();
    const clockBoxY = domeBaseY + 10;
    const clockBoxH = 92;
    const clockBoxW = 114;
    const clockBoxX = cx - clockBoxW / 2;

    // Warm Ochre Stone Cladding
    const stoneGrad = ctx.createLinearGradient(clockBoxX, clockBoxY, clockBoxX + clockBoxW, clockBoxY + clockBoxH);
    stoneGrad.addColorStop(0, '#ffe082');
    stoneGrad.addColorStop(0.5, '#ffd54f');
    stoneGrad.addColorStop(1, '#ffca28');
    ctx.fillStyle = stoneGrad;
    ctx.fillRect(clockBoxX, clockBoxY, clockBoxW, clockBoxH);

    // Four Corner Urn / Finial Ornaments on Terrace Cornice (Photo 1 & 3)
    ctx.fillStyle = '#ffd700';
    [clockBoxX - 4, clockBoxX + clockBoxW - 8].forEach((ux) => {
      ctx.fillRect(ux, clockBoxY - 8, 12, 8);
      ctx.beginPath();
      ctx.arc(ux + 6, clockBoxY - 10, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Inset Square Dark Teal/Navy Border Frame around Circular Clock
    const frameSize = 72;
    const frameX = cx - frameSize / 2;
    const frameY = clockBoxY + 10;
    ctx.fillStyle = '#0f2b48';
    ctx.fillRect(frameX, frameY, frameSize, frameSize);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(frameX, frameY, frameSize, frameSize);

    // Corner Gold Rosettes in Clock Frame
    ctx.fillStyle = '#ffd700';
    [[frameX + 5, frameY + 5], [frameX + frameSize - 5, frameY + 5],
     [frameX + 5, frameY + frameSize - 5], [frameX + frameSize - 5, frameY + frameSize - 5]].forEach(([rx, ry]) => {
      ctx.beginPath();
      ctx.arc(rx, ry, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // -------------------------------------------------------------------------
    // THE REAL CLOCK FACE: WHITE ENAMEL WITH ROMAN NUMERALS & LIVE HANDS
    // -------------------------------------------------------------------------
    const clockFaceRadius = 31;
    const clockCenterX = cx;
    const clockCenterY = frameY + frameSize / 2;

    // Pure White Porcelain Dial
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(clockCenterX, clockCenterY, clockFaceRadius, 0, Math.PI * 2);
    ctx.fill();

    // Outer Dual Brass Rim
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(clockCenterX, clockCenterY, clockFaceRadius - 2, 0, Math.PI * 2);
    ctx.stroke();

    // Roman Numerals: XII, I, II, III, IV, V, VI, VII, VIII, IX, X, XI
    const romanNumerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 7px "Times New Roman", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const numDist = clockFaceRadius - 7.5;
      const nx = clockCenterX + Math.sin(angle) * numDist;
      const ny = clockCenterY - Math.cos(angle) * numDist;
      ctx.fillText(romanNumerals[i], nx, ny);
    }

    // Minute Ticks
    for (let m = 0; m < 60; m++) {
      if (m % 5 !== 0) {
        const ma = (m / 60) * Math.PI * 2;
        const mx1 = clockCenterX + Math.sin(ma) * (clockFaceRadius - 3.5);
        const my1 = clockCenterY - Math.cos(ma) * (clockFaceRadius - 3.5);
        const mx2 = clockCenterX + Math.sin(ma) * (clockFaceRadius - 2);
        const my2 = clockCenterY - Math.cos(ma) * (clockFaceRadius - 2);
        ctx.beginPath();
        ctx.moveTo(mx1, my1);
        ctx.lineTo(mx2, my2);
        ctx.stroke();
      }
    }

    // Live Animated Antique Clock Hands
    const hourAngle = (t * 0.05) % (Math.PI * 2);
    const minuteAngle = (t * 0.6) % (Math.PI * 2);

    // Antique Spade Hour Hand
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(clockCenterX, clockCenterY);
    ctx.lineTo(clockCenterX + Math.sin(hourAngle) * 14, clockCenterY - Math.cos(hourAngle) * 14);
    ctx.stroke();

    // Ornate Minute Hand
    ctx.strokeStyle = '#b71c1c';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(clockCenterX, clockCenterY);
    ctx.lineTo(clockCenterX + Math.sin(minuteAngle) * 22, clockCenterY - Math.cos(minuteAngle) * 22);
    ctx.stroke();

    // Center Gold Pin
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(clockCenterX, clockCenterY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Resonant Bell Ring Wave Pulse
    if (this.bellActive > 0) {
      ctx.save();
      const waveRadius = clockFaceRadius + 10 + Math.sin(t * 18) * 8;
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.85)';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(clockCenterX, clockCenterY, waveRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // -------------------------------------------------------------------------
    // C. UPPER BALUSTRADE & INTERMEDIATE CORNICE (BELOW CLOCK CHAMBER)
    // -------------------------------------------------------------------------
    ctx.save();
    const cornY = clockBoxY + clockBoxH;
    const cornW = towerW + 16;
    const cornX = cx - cornW / 2;

    ctx.fillStyle = '#ffe082';
    ctx.fillRect(cornX, cornY, cornW, 14);
    ctx.strokeStyle = '#ffb300';
    ctx.lineWidth = 2;
    ctx.strokeRect(cornX, cornY, cornW, 14);

    // Decorative Modillion Brackets
    ctx.fillStyle = '#fff8e1';
    for (let bx = cornX + 8; bx < cornX + cornW - 8; bx += 14) {
      ctx.fillRect(bx, cornY + 4, 7, 7);
    }
    ctx.restore();

    // -------------------------------------------------------------------------
    // D. TOWER SHAFT: CORNER PIERS & TWIN FLUTED WHITE ROMAN COLUMNS
    // Exact match to Photo 1, 2, 3!
    // -------------------------------------------------------------------------
    ctx.save();
    const shaftY = cornY + 14;
    const shaftH = 145;

    // Center Breezeway Depth Shadow (Open breezeway between pillars)
    const breezewayGrad = ctx.createLinearGradient(towerLeft, shaftY, towerRight, shaftY);
    breezewayGrad.addColorStop(0, '#ffe082');
    breezewayGrad.addColorStop(0.25, '#37474f');
    breezewayGrad.addColorStop(0.5, '#212121');
    breezewayGrad.addColorStop(0.75, '#37474f');
    breezewayGrad.addColorStop(1, '#ffe082');
    ctx.fillStyle = breezewayGrad;
    ctx.fillRect(towerLeft, shaftY, towerW, shaftH);

    // Left & Right Yellow Masonry Corner Piers with Rusticated Grooves
    const pierW = 28;
    [towerLeft, towerRight - pierW].forEach((px) => {
      ctx.fillStyle = '#ffd54f';
      ctx.fillRect(px, shaftY, pierW, shaftH);

      // Horizontal Rusticated Masonry Grooves (Photo 1 & 3)
      ctx.strokeStyle = 'rgba(180, 120, 0, 0.35)';
      ctx.lineWidth = 1.5;
      for (let gy = shaftY + 14; gy < shaftY + shaftH; gy += 14) {
        ctx.beginPath();
        ctx.moveTo(px, gy);
        ctx.lineTo(px + pierW, gy);
        ctx.stroke();
      }
    });

    // -------------------------------------------------------------------------
    // THE TWIN FLUTED WHITE ROMAN COLUMNS (|| ||) (KEY ARCHITECTURAL SIGNATURE)
    // -------------------------------------------------------------------------
    const colW = 13;
    const colH = shaftH - 12;
    const colPositions = [towerLeft + 26, towerLeft + 44, towerRight - 57, towerRight - 39];

    for (const cpx of colPositions) {
      // Column Base
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(cpx - 2, shaftY + shaftH - 10, colW + 4, 10);
      ctx.fillStyle = '#ffffff';

      // Fluted Cylindrical Column Body
      const colGrad = ctx.createLinearGradient(cpx, shaftY, cpx + colW, shaftY);
      colGrad.addColorStop(0, '#f5f5f5');
      colGrad.addColorStop(0.4, '#ffffff');
      colGrad.addColorStop(0.8, '#e0e0e0');
      colGrad.addColorStop(1, '#bdbdbd');
      ctx.fillStyle = colGrad;
      ctx.fillRect(cpx, shaftY + 8, colW, colH);

      // Vertical Fluting Grooves
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cpx + 3.5, shaftY + 8);
      ctx.lineTo(cpx + 3.5, shaftY + 8 + colH);
      ctx.moveTo(cpx + 6.5, shaftY + 8);
      ctx.lineTo(cpx + 6.5, shaftY + 8 + colH);
      ctx.moveTo(cpx + 9.5, shaftY + 8);
      ctx.lineTo(cpx + 9.5, shaftY + 8 + colH);
      ctx.stroke();

      // Corinthian / Ionic Capital
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cpx - 3, shaftY + 2, colW + 6, 8);
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(cpx - 1, shaftY + 8, colW + 2, 3);
    }
    ctx.restore();

    // -------------------------------------------------------------------------
    // E. ORNAMENTAL PLINTH BASE WITH FLORAL CREST MEDALLIONS (PHOTO 1, 2, 3)
    // -------------------------------------------------------------------------
    ctx.save();
    const plinthY = shaftY + shaftH;
    const plinthW = towerW + 28;
    const plinthH = 48;
    const plinthX = cx - plinthW / 2;

    // Upper White Moulding Trim
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(plinthX - 6, plinthY, plinthW + 12, 10);
    ctx.strokeStyle = '#bdbdbd';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(plinthX - 6, plinthY, plinthW + 12, 10);

    // Plinth Yellow Face
    ctx.fillStyle = '#ffca28';
    ctx.fillRect(plinthX, plinthY + 10, plinthW, plinthH - 10);

    // Carved White Floral Crest Medallion in Center (Photo 1 & 3)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx, plinthY + 26, 22, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.stroke();

    // SRM University Seal Medallion
    ctx.fillStyle = '#1565c0';
    ctx.beginPath();
    ctx.arc(cx, plinthY + 26, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 5px sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.fillText('SRM', cx, plinthY + 28);

    // Flanking Floral Medallions
    [plinthX + 22, plinthX + plinthW - 22].forEach((mx) => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(mx, plinthY + 26, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
    ctx.restore();

    // -------------------------------------------------------------------------
    // F. VIBRANT PINK BOUGAINVILLEA & RED HIBISCUS FLOWERS AT TOWER BASE (PHOTO 1, 3)
    // -------------------------------------------------------------------------
    ctx.save();
    const flowerY = plinthY + plinthH - 6;
    for (let fx = plinthX - 12; fx <= plinthX + plinthW + 12; fx += 8) {
      // Pink Bougainvillea clusters
      ctx.fillStyle = fx % 16 === 0 ? '#e91e63' : (fx % 24 === 0 ? '#f06292' : '#d81b60');
      ctx.beginPath();
      ctx.arc(fx, flowerY - Math.sin(fx * 0.2) * 8, 7, 0, Math.PI * 2);
      ctx.arc(fx - 4, flowerY - Math.sin(fx * 0.2) * 8 - 4, 5, 0, Math.PI * 2);
      ctx.arc(fx + 4, flowerY - Math.sin(fx * 0.2) * 8 - 3, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Green foliage
      ctx.fillStyle = '#2e7d32';
      ctx.fillRect(fx - 3, flowerY + 2, 6, 6);
    }
    ctx.restore();

    // =========================================================================
    // 5. THE GRAND CIRCULAR ROUNDABOUT ISLAND & BALUSTRADE WALL (PHOTO 2 & 4)
    // =========================================================================
    ctx.save();
    const roundY = 445;
    const roundW = 580;
    const roundX = cx - roundW / 2;

    // Multi-Tiered Circular Stone Island Base
    ctx.fillStyle = '#e0e0e0';
    ctx.beginPath();
    ctx.ellipse(cx, roundY + 20, roundW / 2 + 30, 40, 0, 0, Math.PI * 2);
    ctx.fill();

    // Terraced Circular Lawn Mound around Tower
    ctx.fillStyle = '#43a047';
    ctx.beginPath();
    ctx.ellipse(cx, roundY - 5, roundW / 2 - 20, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Potted Plants Lining Roundabout Platform (Photo 2)
    for (let px = cx - roundW / 2 + 50; px <= cx + roundW / 2 - 50; px += 34) {
      // Red Terracotta Pot
      ctx.fillStyle = '#c84b31';
      ctx.fillRect(px - 5, roundY - 14, 10, 8);
      // Lush green shrub inside
      ctx.fillStyle = '#7cb342';
      ctx.beginPath();
      ctx.arc(px, roundY - 17, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // -------------------------------------------------------------------------
    // CIRCULAR BALUSTRADE PARAPET WALL WITH WHITE BALUSTERS (PHOTO 2 & 4)
    // -------------------------------------------------------------------------
    const balustradeY = roundY + 12;
    const balustradeH = 26;

    // Balustrade Smooth Stone Coping / Plinth
    ctx.fillStyle = '#d7ccc8';
    ctx.fillRect(roundX, balustradeY, roundW, 6); // Top rail
    ctx.fillRect(roundX, balustradeY + balustradeH, roundW, 7); // Bottom plinth

    // Classical White Turned Balusters (||||||||||||||||||)
    ctx.fillStyle = '#ffffff';
    for (let bx = roundX + 16; bx < roundX + roundW - 16; bx += 14) {
      ctx.fillRect(bx, balustradeY + 6, 6, balustradeH - 6);
      // Baluster central swell
      ctx.beginPath();
      ctx.arc(bx + 3, balustradeY + 16, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Intermittent Stone Pier Posts with Spherical Finials
    for (let px = roundX; px <= roundX + roundW; px += 116) {
      ctx.fillStyle = '#d7ccc8';
      ctx.fillRect(px - 6, balustradeY - 4, 16, balustradeH + 12);
      ctx.strokeStyle = '#bcaaa4';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px - 6, balustradeY - 4, 16, balustradeH + 12);

      // Spherical Stone Finials
      ctx.fillStyle = '#efebe9';
      ctx.beginPath();
      ctx.arc(px + 2, balustradeY - 9, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    // =========================================================================
    // 6. CAMPUS BOULEVARD COMBAT ARENA (ASPHALT ROADWAY AROUND ROUNDABOUT)
    // Photo 4 Reality: Smooth Wide Road with SRM Barricades
    // =========================================================================
    ctx.save();
    const roadY = 485;

    // Smooth High-Quality Campus Asphalt
    const roadGrad = ctx.createLinearGradient(0, roadY, 0, h);
    roadGrad.addColorStop(0, '#546e7a');
    roadGrad.addColorStop(0.3, '#455a64');
    roadGrad.addColorStop(1, '#37474f');
    ctx.fillStyle = roadGrad;
    ctx.fillRect(0, roadY, w, h - roadY);

    // Concrete Curb Separator
    ctx.fillStyle = '#b0bec5';
    ctx.fillRect(0, roadY - 4, w, 5);

    // Real Thermoplastic Painted Road Markings (Photo 4)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 3;
    ctx.setLineDash([28, 20]);
    ctx.beginPath();
    ctx.moveTo(0, roadY + 45);
    ctx.lineTo(w, roadY + 45);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pedestrian White Arrow Marking
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '900 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SRM KTR  •  CLOCK TOWER ROUNDABOUT', cx, roadY + 85);

    // -------------------------------------------------------------------------
    // PHOTO 4: YELLOW & RED SRM CAMPUS SAFETY BARRICADES
    // -------------------------------------------------------------------------
    const drawBarricade = (bx, by) => {
      ctx.save();
      // Legs
      ctx.fillStyle = '#212121';
      ctx.fillRect(bx + 6, by + 28, 4, 18);
      ctx.fillRect(bx + 60, by + 28, 4, 18);

      // Yellow Barricade Body
      ctx.fillStyle = '#ffd600';
      ctx.fillRect(bx, by, 70, 28);
      ctx.strokeStyle = '#e65100';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, 70, 28);

      // Red Diagonal Chevrons
      ctx.fillStyle = '#d50000';
      for (let ch = 8; ch < 60; ch += 18) {
        ctx.beginPath();
        ctx.moveTo(bx + ch, by);
        ctx.lineTo(bx + ch + 10, by);
        ctx.lineTo(bx + ch, by + 28);
        ctx.lineTo(bx + ch - 10, by + 28);
        ctx.closePath();
        ctx.fill();
      }

      // "SRM" Bold Marking on Barricade
      ctx.font = '900 9px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 3;
      ctx.fillText('SRM', bx + 35, by + 18);
      ctx.restore();
    };

    drawBarricade(55, roadY + 6);
    drawBarricade(135, roadY + 12);
    drawBarricade(w - 195, roadY + 10);
    drawBarricade(w - 115, roadY + 5);
    ctx.restore();

    // =========================================================================
    // 7. AMBIENT DRIFTING GULMOHAR LEAVES & FLYING BIRDS
    // =========================================================================
    ctx.save();
    for (const l of this.leaves) {
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rot);
      ctx.fillStyle = l.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, l.size, l.size * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Flying Birds in High Sky
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 1.8;
    for (const b of this.birds) {
      const wingY = Math.sin(b.wingPhase) * 4;
      ctx.beginPath();
      ctx.moveTo(b.x - 7, b.y + wingY);
      ctx.quadraticCurveTo(b.x - 3, b.y - 4, b.x, b.y);
      ctx.quadraticCurveTo(b.x + 3, b.y - 4, b.x + 7, b.y + wingY);
      ctx.stroke();
    }
    ctx.restore();
  }
}
