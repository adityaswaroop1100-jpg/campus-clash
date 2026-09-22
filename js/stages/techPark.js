/**
 * Campus Clash — Stage: Tech Park Steps & Plaza ("The Grand Staircase")
 * Based on the iconic SRM Tech Park & University Building plaza
 * @module stages/techPark
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants.js';

export class TechParkStage {
  constructor() {
    this.id = 'techpark';
    this.name = 'Tech Park Steps & Plaza';
    this.shortName = 'TECH PARK PLAZA';
    this.subtitle = '15-Floor IT Powerhouse & Skywalk';
    this.groundY = 520;
    this.minX = 40;
    this.maxX = CANVAS_WIDTH - 40;

    // Animated Clouds in the Chennai Sky
    this.clouds = [
      { x: 50, y: 40, w: 130, h: 42, speed: 0.18 },
      { x: 320, y: 70, w: 170, h: 50, speed: 0.12 },
      { x: 680, y: 30, w: 150, h: 44, speed: 0.22 },
      { x: 880, y: 60, w: 120, h: 36, speed: 0.15 }
    ];

    // Cheering Student NPCs on the Steps
    this.crowd = [
      { x: 260, y: 350, shirt: '#0033a0', animPhase: 0, holdingPhone: false },
      { x: 300, y: 340, shirt: '#ff6b35', animPhase: 1.2, holdingPhone: true },
      { x: 340, y: 330, shirt: '#2e7d32', animPhase: 2.5, holdingPhone: false },
      { x: 380, y: 320, shirt: '#8e24aa', animPhase: 0.8, holdingPhone: true },
      { x: 425, y: 310, shirt: '#e53935', animPhase: 1.9, holdingPhone: false },
      { x: 470, y: 300, shirt: '#fdd835', animPhase: 3.1, holdingPhone: true }
    ];

    // Phone Flash Effects from the Crowd
    this.crowdFlashTimer = 0;
    this.crowdFlashIndex = 0;

    // Interactive 3D "SRM" Letters Sign
    this.srmSign = {
      x: 640,
      y: 430,
      w: 120,
      h: 75,
      wobble: 0,
      hitCooldown: 0
    };

    // Stage Gimmick 1: Security Guard Whistle ("ID Card Check!")
    this.securityTimer = 600; // Triggers every ~15 seconds (900 frames)
    this.securityWarning = 0; // 60 frames warning
    this.securityAlert = 0;   // 60 frames active alert
    this.whistlePlayed = false;

    // Stage Gimmick 2: Chennai Sea Breeze & Flying Exam Notes
    this.windGustTimer = 450;
    this.windActiveTimer = 0;
    this.flyingPapers = [];

    // Ambient floating dust / light particles
    this.dustParticles = [];
    for (let i = 0; i < 20; i++) {
      this.dustParticles.push({
        x: Math.random() * CANVAS_WIDTH,
        y: 180 + Math.random() * (this.groundY - 180),
        vx: 0.3 + Math.random() * 0.5,
        vy: -0.1 + (Math.random() - 0.5) * 0.2,
        r: 1.5 + Math.random() * 2,
        alpha: 0.2 + Math.random() * 0.4
      });
    }
  }

  update(dt, fighters, particleSystem, soundManager) {
    // 1. Update Clouds
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed;
      if (cloud.x > CANVAS_WIDTH + 80) {
        cloud.x = -cloud.w - 50;
      }
    }

    // 2. Crowd Cheering Animation & Phone Camera Flashes
    for (const person of this.crowd) {
      person.animPhase += 0.08;
    }
    this.crowdFlashTimer--;
    if (this.crowdFlashTimer <= 0) {
      this.crowdFlashIndex = Math.floor(Math.random() * this.crowd.length);
      this.crowdFlashTimer = 45 + Math.floor(Math.random() * 75);
    }

    // 3. Dust Particles
    for (const p of this.dustParticles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x > CANVAS_WIDTH) p.x = 0;
      if (p.y < 180) p.y = this.groundY - 10;
      if (p.y > this.groundY) p.y = 190;
    }

    // 4. Interactive 3D SRM Letters Wobble
    if (this.srmSign.wobble > 0) {
      this.srmSign.wobble *= 0.88;
      if (this.srmSign.wobble < 0.2) this.srmSign.wobble = 0;
    }
    if (this.srmSign.hitCooldown > 0) this.srmSign.hitCooldown--;

    // Check if any fighter attacks or collides near the SRM sign
    for (const f of fighters) {
      if (Math.abs(f.x - (this.srmSign.x + this.srmSign.w / 2)) < 70 &&
          Math.abs(f.y - (this.srmSign.y + this.srmSign.h / 2)) < 60) {
        if (f.stateMachine.getState() === 'attacking' && this.srmSign.hitCooldown === 0) {
          this.srmSign.wobble = 14;
          this.srmSign.hitCooldown = 25;
          soundManager.playMetalClang();
          particleSystem.spawnHitSparks(this.srmSign.x + this.srmSign.w / 2, this.srmSign.y + 20, '#00e5ff', 12);
        }
      }
    }

    // 5. Gimmick 1: Security Guard Whistle ("ID Card Check!")
    this.securityTimer--;
    if (this.securityTimer === 70) {
      this.securityWarning = 70; // 1.1s visual warning
    }

    if (this.securityTimer <= 0) {
      this.securityAlert = 75; // Active alert banner
      this.whistlePlayed = false;
      this.securityTimer = 900 + Math.floor(Math.random() * 300); // 15-20s cooldown
    }

    if (this.securityWarning > 0) this.securityWarning--;

    if (this.securityAlert > 0) {
      this.securityAlert--;
      if (!this.whistlePlayed) {
        this.whistlePlayed = true;
        soundManager.playSecurityWhistle();

        // Check if fighters are blocking. Unblocked fighters get startled!
        for (const f of fighters) {
          if (!f.isBlocking && f.stateMachine.isActionable()) {
            f.applyStun(24, 'ID Card Check?!');
            f.showStatus('⚠️ NO ID CARD!', '#ff5252');
          } else if (f.isBlocking) {
            f.showStatus('✓ ID SHOWN', '#69f0ae');
          }
        }
      }
    }

    // 6. Gimmick 2: Chennai Sea Breeze & Flying Exam Papers
    this.windGustTimer--;
    if (this.windGustTimer <= 0) {
      this.windActiveTimer = 180; // 3 seconds of breezy wind
      this.windGustTimer = 750 + Math.floor(Math.random() * 450);
      soundManager.playWindGust();

      // Spawn a burst of flying Xerox notes and leaves
      for (let i = 0; i < 14; i++) {
        this.flyingPapers.push({
          x: -20 - Math.random() * 100,
          y: 260 + Math.random() * 220,
          vx: 5.5 + Math.random() * 4.5,
          vy: -1.0 + (Math.random() - 0.5) * 2.2,
          rot: Math.random() * Math.PI,
          vrot: 0.08 + Math.random() * 0.12,
          w: 16 + Math.random() * 8,
          h: 12 + Math.random() * 6,
          isLeaf: Math.random() > 0.65
        });
      }
    }

    // Update flying papers & apply slight wind drift to airborne fighters
    if (this.windActiveTimer > 0) {
      this.windActiveTimer--;
      for (const f of fighters) {
        if (!f.isGrounded) {
          f.vx += 0.15; // Gentle rightward breeze push in mid-air
        }
      }
    }

    for (let i = this.flyingPapers.length - 1; i >= 0; i--) {
      const p = this.flyingPapers[i];
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      if (p.x > CANVAS_WIDTH + 60 || p.y > this.groundY + 20) {
        this.flyingPapers.splice(i, 1);
      }
    }
  }

  render(ctx) {
    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;

    // =========================================================================
    // 1. SKY & SUNLIGHT (Multi-layer Atmospheric Sky)
    // =========================================================================
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.groundY);
    skyGrad.addColorStop(0, '#050e1f');    // Deep navy
    skyGrad.addColorStop(0.2, '#0a1628');  // Dark blue
    skyGrad.addColorStop(0.5, '#1a3a6e');  // Warm horizon blue
    skyGrad.addColorStop(0.75, '#c17a2a55'); // Golden horizon
    skyGrad.addColorStop(1, '#2a4a8822');    // Haze
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, this.groundY);

    // Warm Solar Sun/Moon Glow in Upper Right
    ctx.save();
    const sunGrad = ctx.createRadialGradient(820, 80, 0, 820, 80, 60);
    sunGrad.addColorStop(0, '#ffe082');
    sunGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(820, 80, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Ground Reflection Strip
    ctx.save();
    const groundRefGrad = ctx.createLinearGradient(0, this.groundY - 12, 0, this.groundY);
    groundRefGrad.addColorStop(0, 'rgba(255,215,0,0.08)');
    groundRefGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = groundRefGrad;
    ctx.fillRect(0, this.groundY - 12, w, 12);
    ctx.restore();

    // Drifting Cumulus Clouds
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    for (const c of this.clouds) {
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
      ctx.ellipse(c.x - c.w * 0.25, c.y + 3, c.w * 0.3, c.h * 0.35, 0, 0, Math.PI * 2);
      ctx.ellipse(c.x + c.w * 0.25, c.y + 2, c.w * 0.28, c.h * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Distant Highway & Campus Trees Silhouette (Far Background)
    ctx.save();
    ctx.fillStyle = '#1b5e20';
    for (let x = 0; x < w; x += 32) {
      ctx.beginPath();
      ctx.arc(x + 16, 360, 24 + Math.sin(x * 0.08) * 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // =========================================================================
    // 2. THE REAL SRM TECH PARK 15-STORY SKYSCRAPER (1:1 PHOTO MATCH)
    // Symmetrical, Monumental Tower with Yellow Center, Red Caps, Blue Glass & Louvers
    // =========================================================================
    const cx = 480; // Symmetrical center
    const bldgTopY = 32;
    const bldgBottomY = 365;
    const bldgH = bldgBottomY - bldgTopY;

    // Building Dimensions
    const centerW = 230;     // Yellow center block
    const centerX = cx - centerW / 2; // 365
    const wingW = 160;       // Blue glass wing width
    const leftWingX = centerX - wingW; // 205
    const rightWingX = centerX + centerW; // 595
    const cornerW = 55;      // Outer white pillar
    const leftCornerX = leftWingX - cornerW; // 150
    const rightCornerX = rightWingX + wingW; // 755

    // -------------------------------------------------------------------------
    // A. FLANKING OUTER WHITE CORNER TOWERS (Left: 150..205, Right: 755..810)
    // -------------------------------------------------------------------------
    ctx.save();
    [leftCornerX, rightCornerX].forEach((x, idx) => {
      // White concrete facade
      const colGrad = ctx.createLinearGradient(x, bldgTopY, x + cornerW, bldgTopY);
      colGrad.addColorStop(0, idx === 0 ? '#f0f3f6' : '#dbe1e8');
      colGrad.addColorStop(1, idx === 0 ? '#dbe1e8' : '#f0f3f6');
      ctx.fillStyle = colGrad;
      ctx.fillRect(x, bldgTopY + 12, cornerW, bldgH - 12);

      // Top decorative parapet cap with square cutaways (matching photo)
      ctx.fillStyle = '#cfd8dc';
      ctx.fillRect(x - 2, bldgTopY + 6, cornerW + 4, 10);
      ctx.fillStyle = '#0a192f';
      ctx.fillRect(x + 8, bldgTopY + 8, 12, 6);
      ctx.fillRect(x + cornerW - 20, bldgTopY + 8, 12, 6);

      // Vertical grid of square punched windows
      ctx.fillStyle = '#102238';
      for (let wy = bldgTopY + 30; wy < bldgBottomY - 20; wy += 22) {
        ctx.fillRect(x + 10, wy, 14, 12);
        ctx.fillRect(x + 30, wy, 14, 12);
        // Window glass tint
        ctx.fillStyle = '#42a5f5';
        ctx.fillRect(x + 10, wy, 14, 2);
        ctx.fillRect(x + 30, wy, 14, 2);
        ctx.fillStyle = '#102238';
      }
    });
    ctx.restore();

    // -------------------------------------------------------------------------
    // B. FLANKING DEEP BLUE REFLECTIVE GLASS WINGS (Left & Right)
    // -------------------------------------------------------------------------
    ctx.save();
    [leftWingX, rightWingX].forEach((wx) => {
      // Deep Cobalt Blue Reflective Curtain Glass
      const glassGrad = ctx.createLinearGradient(wx, bldgTopY, wx + wingW, bldgBottomY);
      glassGrad.addColorStop(0, '#0a234a');
      glassGrad.addColorStop(0.3, '#15438c');
      glassGrad.addColorStop(0.7, '#0d2d60');
      glassGrad.addColorStop(1, '#081c3c');
      ctx.fillStyle = glassGrad;
      ctx.fillRect(wx, bldgTopY + 18, wingW, bldgH - 18);

      // Symmetrical Diagonal Sunlight Reflection Sheen
      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.beginPath();
      ctx.moveTo(wx + 20, bldgTopY + 18);
      ctx.lineTo(wx + 75, bldgTopY + 18);
      ctx.lineTo(wx + 15, bldgBottomY);
      ctx.lineTo(wx - 40, bldgBottomY);
      ctx.closePath();
      ctx.fill();

      // Horizontal Glass Mullions
      ctx.strokeStyle = '#28589c';
      ctx.lineWidth = 1;
      for (let gy = bldgTopY + 36; gy < bldgBottomY; gy += 18) {
        ctx.beginPath();
        ctx.moveTo(wx, gy);
        ctx.lineTo(wx + wingW, gy);
        ctx.stroke();
      }

      // Vertical Glass Mullions
      for (let vx = wx + 32; vx < wx + wingW; vx += 32) {
        ctx.beginPath();
        ctx.moveTo(vx, bldgTopY + 18);
        ctx.lineTo(vx, bldgBottomY);
        ctx.stroke();
      }

      // -----------------------------------------------------------------------
      // SIGNATURE FEATURE: WHITE VERTICAL LOUVER PINSTRIPES (||||||||||)
      // Exactly as in all 4 real photos at the bottom third of the blue wings!
      // -----------------------------------------------------------------------
      const louverTopY = bldgTopY + 195;
      const louverH = bldgBottomY - louverTopY;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 3;
      for (let lx = wx + 12; lx < wx + wingW - 8; lx += 11) {
        ctx.fillRect(lx, louverTopY, 4.5, louverH);
      }
      ctx.shadowBlur = 0;

      // Top White Cornice Cap on Wing
      ctx.fillStyle = '#f0f3f6';
      ctx.fillRect(wx, bldgTopY + 14, wingW, 7);
    });
    ctx.restore();

    // -------------------------------------------------------------------------
    // C. RED VERTICAL ACCENT DIVIDER STRIPES
    // Flanking the central yellow tower (Connecting wings to center)
    // -------------------------------------------------------------------------
    ctx.save();
    ctx.fillStyle = '#d32f2f'; // Vibrant SRM Crimson
    ctx.fillRect(centerX - 10, bldgTopY + 8, 10, bldgH - 8);
    ctx.fillRect(centerX + centerW, bldgTopY + 8, 10, bldgH - 8);
    ctx.restore();

    // -------------------------------------------------------------------------
    // D. CENTRAL TOWER: BRIGHT YELLOW CLADDING (365..595)
    // -------------------------------------------------------------------------
    ctx.save();
    // Vibrant Yellow Facade with subtle 3D lighting
    const yellowGrad = ctx.createLinearGradient(centerX, bldgTopY, centerX + centerW, bldgTopY);
    yellowGrad.addColorStop(0, '#ffd600');
    yellowGrad.addColorStop(0.3, '#ffea00');
    yellowGrad.addColorStop(0.7, '#ffc400');
    yellowGrad.addColorStop(1, '#ffab00');
    ctx.fillStyle = yellowGrad;
    ctx.fillRect(centerX, bldgTopY + 12, centerW, bldgH - 12);

    // Architectural Horizontal Joint Grooves on Yellow Facade
    ctx.strokeStyle = 'rgba(180, 120, 0, 0.25)';
    ctx.lineWidth = 1;
    for (let jy = bldgTopY + 24; jy < bldgBottomY; jy += 16) {
      ctx.beginPath();
      ctx.moveTo(centerX, jy);
      ctx.lineTo(centerX + centerW, jy);
      ctx.stroke();
    }

    // Vertical Rows of Square Windows on Left & Right Yellow Bands
    ctx.fillStyle = '#0f2747';
    for (let wy = bldgTopY + 34; wy < bldgBottomY - 100; wy += 24) {
      // Left yellow band windows
      ctx.fillRect(centerX + 14, wy, 16, 13);
      ctx.fillStyle = '#64b5f6';
      ctx.fillRect(centerX + 14, wy, 16, 2.5);
      ctx.fillStyle = '#0f2747';

      // Right yellow band windows
      ctx.fillRect(centerX + centerW - 30, wy, 16, 13);
      ctx.fillStyle = '#64b5f6';
      ctx.fillRect(centerX + centerW - 30, wy, 16, 2.5);
      ctx.fillStyle = '#0f2747';
    }
    ctx.restore();

    // -------------------------------------------------------------------------
    // E. CENTRAL TOWER: MULTI-STORY DEEP BLUE SOLAR CURTAIN WALL GLASS
    // Symmetrically embedded in yellow center (Width 134px, Height 210px)
    // -------------------------------------------------------------------------
    ctx.save();
    const midGlassW = 134;
    const midGlassX = cx - midGlassW / 2; // 413
    const midGlassY = bldgTopY + 24;
    const midGlassH = 226;

    const midGlassGrad = ctx.createLinearGradient(midGlassX, midGlassY, midGlassX + midGlassW, midGlassY + midGlassH);
    midGlassGrad.addColorStop(0, '#091c3d');
    midGlassGrad.addColorStop(0.4, '#133e7d');
    midGlassGrad.addColorStop(0.8, '#0b244d');
    midGlassGrad.addColorStop(1, '#051329');
    ctx.fillStyle = midGlassGrad;
    ctx.fillRect(midGlassX, midGlassY, midGlassW, midGlassH);

    // Diagonal Glass Sunlight Reflection
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.beginPath();
    ctx.moveTo(midGlassX + 25, midGlassY);
    ctx.lineTo(midGlassX + 80, midGlassY);
    ctx.lineTo(midGlassX + 35, midGlassY + midGlassH);
    ctx.lineTo(midGlassX - 20, midGlassY + midGlassH);
    ctx.closePath();
    ctx.fill();

    // Distinctive Bold Yellow/Gold Grid Mullions (3 vertical bays, 6 horizontal tiers)
    ctx.strokeStyle = '#ffd600';
    ctx.lineWidth = 2.5;

    // 2 Vertical Mullions dividing into 3 bays
    const bayW = midGlassW / 3;
    for (let col = 1; col < 3; col++) {
      ctx.beginPath();
      ctx.moveTo(midGlassX + col * bayW, midGlassY);
      ctx.lineTo(midGlassX + col * bayW, midGlassY + midGlassH);
      ctx.stroke();
    }

    // 6 Horizontal Mullion Tiers
    const tierH = midGlassH / 6;
    for (let tier = 1; tier < 6; tier++) {
      ctx.beginPath();
      ctx.moveTo(midGlassX, midGlassY + tier * tierH);
      ctx.lineTo(midGlassX + midGlassW, midGlassY + tier * tierH);
      ctx.stroke();
    }

    // Border around central glass
    ctx.strokeStyle = '#ffab00';
    ctx.lineWidth = 3;
    ctx.strokeRect(midGlassX, midGlassY, midGlassW, midGlassH);

    // -------------------------------------------------------------------------
    // "SRM Tech Park" EMBOSSED WHITE TEXT (Exact Match to Center Glass!)
    // -------------------------------------------------------------------------
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 6;
    ctx.textAlign = 'center';
    ctx.font = '900 17px "Arial Black", Impact, sans-serif';
    ctx.fillText('SRM', cx, midGlassY + midGlassH * 0.58);
    ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
    ctx.fillText('Tech Park', cx, midGlassY + midGlassH * 0.58 + 17);
    ctx.shadowBlur = 0;
    ctx.restore();

    // -------------------------------------------------------------------------
    // F. TOP CANTILEVERED CRIMSON ROOF CANOPY & ROOFTOP SIGN (THE CROWN)
    // -------------------------------------------------------------------------
    ctx.save();
    // Overhanging Cantilevered Roof Slab
    const roofOverhangW = centerW + 50; // 280
    const roofOverhangX = cx - roofOverhangW / 2; // 340
    const roofY = bldgTopY;

    // Deep red overhang body
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(roofOverhangX, roofY, roofOverhangW, 16);
    // Roof top bright trim
    ctx.fillStyle = '#ef5350';
    ctx.fillRect(roofOverhangX - 2, roofY - 2, roofOverhangW + 4, 4);
    // Roof underside cast shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(roofOverhangX, roofY + 16, roofOverhangW, 7);

    // Rooftop Blue Signboard (Tamil & English Sign atop SRM Tech Park)
    const signW = 120;
    const signH = 15;
    ctx.fillStyle = '#0d47a1';
    ctx.fillRect(cx - signW / 2, roofY - signH - 2, signW, signH);
    ctx.strokeStyle = '#90caf9';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - signW / 2, roofY - signH - 2, signW, signH);
    ctx.font = 'bold 8px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('★ SRM TECH PARK ★', cx, roofY - 6);
    ctx.restore();

    // -------------------------------------------------------------------------
    // G. RED GROUND-FLOOR ENTRANCE CANOPY & GLASS FOYER / LOBBY (250..365)
    // -------------------------------------------------------------------------
    ctx.save();
    const porchY = midGlassY + midGlassH;
    const porchW = centerW + 16;
    const porchX = cx - porchW / 2;

    // Cantilevered Red Entrance Porch Canopy
    ctx.fillStyle = '#c62828';
    ctx.fillRect(porchX, porchY, porchW, 12);
    ctx.fillStyle = '#ef5350';
    ctx.fillRect(porchX, porchY, porchW, 3);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(porchX, porchY + 12, porchW, 8);

    // Double-Height Transparent Glass Entrance Atrium Lobby
    const lobbyY = porchY + 12;
    const lobbyH = bldgBottomY - lobbyY;
    const lobbyW = midGlassW + 40;
    const lobbyX = cx - lobbyW / 2;

    // Lobby interior lighting
    const lobbyGrad = ctx.createLinearGradient(lobbyX, lobbyY, lobbyX, lobbyY + lobbyH);
    lobbyGrad.addColorStop(0, '#263238');
    lobbyGrad.addColorStop(0.5, '#37474f');
    lobbyGrad.addColorStop(1, '#eceff1');
    ctx.fillStyle = lobbyGrad;
    ctx.fillRect(lobbyX, lobbyY, lobbyW, lobbyH);

    // Interior Warm Turnstiles & Reception Glow
    ctx.fillStyle = 'rgba(255, 236, 179, 0.4)';
    ctx.fillRect(lobbyX + 10, lobbyY + 20, lobbyW - 20, lobbyH - 25);

    // Vertical Glass Revolving Door Panes & Stainless Steel Frames
    ctx.strokeStyle = '#cfd8dc';
    ctx.lineWidth = 1.5;
    for (let dx = lobbyX + 24; dx < lobbyX + lobbyW; dx += 28) {
      ctx.beginPath();
      ctx.moveTo(dx, lobbyY);
      ctx.lineTo(dx, lobbyY + lobbyH);
      ctx.stroke();
    }
    ctx.strokeRect(lobbyX, lobbyY, lobbyW, lobbyH);
    ctx.restore();

    // =========================================================================
    // 3. SLOPING GREEN GRASS MOUNDS & LANDSCAPING (FLANKING THE STAIRS)
    // Exactly as seen in Photo 2 and Photo 3!
    // =========================================================================
    ctx.save();
    // Left Sloping Grass Embankment
    const grassGrad = ctx.createLinearGradient(0, 360, 0, this.groundY);
    grassGrad.addColorStop(0, '#43a047');
    grassGrad.addColorStop(0.5, '#2e7d32');
    grassGrad.addColorStop(1, '#1b5e20');
    ctx.fillStyle = grassGrad;

    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(240, this.groundY);
    ctx.lineTo(240, 370);
    ctx.lineTo(leftCornerX, 360);
    ctx.lineTo(0, 360);
    ctx.closePath();
    ctx.fill();

    // Right Sloping Grass Embankment
    ctx.beginPath();
    ctx.moveTo(w, this.groundY);
    ctx.lineTo(720, this.groundY);
    ctx.lineTo(720, 370);
    ctx.lineTo(rightCornerX + cornerW, 360);
    ctx.lineTo(w, 360);
    ctx.closePath();
    ctx.fill();

    // Neatly Trimmed Golden-Yellow & Lime Bush Clusters atop Embankment (Photo 2)
    const drawBush = (bx, by, radius, col1, col2) => {
      ctx.save();
      const bGrad = ctx.createRadialGradient(bx, by - radius * 0.3, radius * 0.2, bx, by, radius);
      bGrad.addColorStop(0, col1);
      bGrad.addColorStop(1, col2);
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(bx, by, radius, 0, Math.PI * 2);
      ctx.arc(bx - radius * 0.45, by + 2, radius * 0.7, 0, Math.PI * 2);
      ctx.arc(bx + radius * 0.45, by + 2, radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    // Left Bush Cluster (Yellow & Lime)
    drawBush(100, 368, 22, '#fdd835', '#f57f17');
    drawBush(140, 366, 26, '#aeea00', '#64dd17');
    drawBush(185, 369, 20, '#fdd835', '#f57f17');
    drawBush(60, 372, 18, '#81c784', '#2e7d32');

    // Right Bush Cluster (Yellow & Lime)
    drawBush(770, 369, 20, '#fdd835', '#f57f17');
    drawBush(815, 366, 26, '#aeea00', '#64dd17');
    drawBush(860, 368, 22, '#fdd835', '#f57f17');
    drawBush(900, 372, 18, '#81c784', '#2e7d32');

    // Photo 3: Iconic Multi-Color Campus Arts Installation Sculpture on Left Lawn
    ctx.save();
    const scX = 135;
    const scY = 430;
    // Angled Lightning/Flame modern art sculpture (Red, Yellow, Green, Cyan)
    ctx.fillStyle = '#ff1744';
    ctx.beginPath();
    ctx.moveTo(scX, scY + 30);
    ctx.lineTo(scX + 18, scY - 35);
    ctx.lineTo(scX + 32, scY - 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffd600';
    ctx.beginPath();
    ctx.moveTo(scX + 18, scY - 35);
    ctx.lineTo(scX + 36, scY - 60);
    ctx.lineTo(scX + 44, scY - 20);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#00e676';
    ctx.beginPath();
    ctx.moveTo(scX + 32, scY - 10);
    ctx.lineTo(scX + 50, scY - 45);
    ctx.lineTo(scX + 58, scY + 25);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Photo 1: Maroon "25 Years of SRM" Commemorative Landmark Board on Right Lawn
    ctx.save();
    const mbX = 780;
    const mbY = 425;
    ctx.fillStyle = '#880e4f'; // Deep maroon
    ctx.fillRect(mbX, mbY, 68, 48);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(mbX, mbY, 68, 48);

    ctx.font = '900 13px "Arial Black", sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.fillText('25', mbX + 34, mbY + 20);
    ctx.font = 'bold 7px sans-serif';
    ctx.fillText('YEARS OF SRM', mbX + 34, mbY + 31);
    ctx.font = '6px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('TECH PARK KTR', mbX + 34, mbY + 41);

    // Board support posts
    ctx.fillStyle = '#37474f';
    ctx.fillRect(mbX + 12, mbY + 48, 4, 30);
    ctx.fillRect(mbX + 52, mbY + 48, 4, 30);
    ctx.restore();
    ctx.restore();

    // =========================================================================
    // 4. THE GRAND CONCRETE / GRANITE STAIRCASE (MATCHING PHOTO 2 & PHOTO 4)
    // 14 Wide Granite Steps Descending from Atrium to Battle Plaza
    // =========================================================================
    ctx.save();
    const stairsTopY = 360;
    const stairsBottomY = this.groundY;
    const stairsTopW = centerW + 30; // 260
    const stairsBottomW = 500;       // Wide base (230 to 730)
    const stepCount = 14;
    const stepH = (stairsBottomY - stairsTopY) / stepCount;

    for (let s = 0; s < stepCount; s++) {
      const p = s / stepCount;
      const sy = stairsTopY + s * stepH;
      const curW = stairsTopW + p * (stairsBottomW - stairsTopW);
      const sx = cx - curW / 2;

      // Concrete Step Riser (Vertical Face with depth gradient)
      const riserGrad = ctx.createLinearGradient(sx, sy, sx, sy + stepH);
      riserGrad.addColorStop(0, s % 2 === 0 ? '#90a4ae' : '#78909c');
      riserGrad.addColorStop(1, '#546e7a');
      ctx.fillStyle = riserGrad;
      ctx.fillRect(sx, sy, curW, stepH);

      // Step Tread Highlight (Direct Sunlit Surface)
      ctx.fillStyle = '#eceff1';
      ctx.fillRect(sx, sy, curW, 3);

      // Tread Edge Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(sx, sy + stepH - 1.5, curW, 1.5);
    }

    // Stainless Steel Handrails Running Down the Steps (Left, Center, Right)
    const drawRail = (topX, bottomX) => {
      ctx.save();
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 4;

      ctx.beginPath();
      ctx.moveTo(topX, stairsTopY - 4);
      ctx.lineTo(bottomX, stairsBottomY - 6);
      ctx.stroke();

      // Handrail Vertical Posts
      for (let p = 0; p <= 4; p++) {
        const pr = p / 4;
        const rx = topX + pr * (bottomX - topX);
        const ry = stairsTopY - 4 + pr * (stairsBottomY - stairsTopY - 2);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx, ry + 16);
        ctx.stroke();
      }
      ctx.restore();
    };

    drawRail(cx - stairsTopW / 2 + 6, cx - stairsBottomW / 2 + 8); // Left rail
    drawRail(cx, cx);                                             // Center rail
    drawRail(cx + stairsTopW / 2 - 6, cx + stairsBottomW / 2 - 8); // Right rail

    // Terraced Flower Pots along Stair Edges
    for (let fp = 0; fp < 5; fp++) {
      const p = fp / 4;
      const lx = cx - stairsTopW / 2 + 6 - p * 30;
      const rx = cx + stairsTopW / 2 - 6 + p * 30;
      const fy = stairsTopY + 10 + p * (stairsBottomY - stairsTopY - 30);

      // Terracotta Pot
      ctx.fillStyle = '#d84315';
      ctx.fillRect(lx - 6, fy, 12, 10);
      ctx.fillRect(rx - 6, fy, 12, 10);
      // Green Shrub
      ctx.fillStyle = '#43a047';
      ctx.beginPath();
      ctx.arc(lx, fy - 2, 7, 0, Math.PI * 2);
      ctx.arc(rx, fy - 2, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // =========================================================================
    // 5. CHEERING SRM STUDENT CROWD ON THE UPPER STAIRS
    // =========================================================================
    // Ambient Light Cones from Tech Park Building Windows
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255,255,200,0.04)';
    for(let i=0; i<4; i++) {
      ctx.beginPath();
      ctx.moveTo(350 + i * 80, 150);
      ctx.lineTo(250 + i * 150, this.groundY);
      ctx.lineTo(320 + i * 150, this.groundY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    
    // Faint Reflective Shimmer Strip
    ctx.save();
    const shimmerGrad = ctx.createLinearGradient(0, this.groundY, 0, this.groundY + 8);
    shimmerGrad.addColorStop(0, 'rgba(255,255,255,0.06)');
    shimmerGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = shimmerGrad;
    ctx.fillRect(0, this.groundY, w, 8);
    ctx.restore();

    ctx.save();
    for (let i = 0; i < this.crowd.length; i++) {
      const p = this.crowd[i];
      const bobY = Math.sin(p.animPhase) * 2.5;

      // Student Head & Hair
      ctx.fillStyle = '#d7ccc8';
      ctx.beginPath();
      ctx.arc(p.x, p.y + bobY - 20, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#212121';
      ctx.beginPath();
      ctx.arc(p.x, p.y + bobY - 22, 5.5, Math.PI, Math.PI * 2);
      ctx.fill();

      // Shirt / Body
      ctx.fillStyle = p.shirt;
      ctx.fillRect(p.x - 6, p.y + bobY - 14, 12, 14);

      // Jeans / Legs
      ctx.fillStyle = '#1e3a5f';
      ctx.fillRect(p.x - 5, p.y + bobY, 4, 10);
      ctx.fillRect(p.x + 1, p.y + bobY, 4, 10);

      // Smartphone filming
      if (p.holdingPhone) {
        ctx.fillStyle = '#37474f';
        ctx.fillRect(p.x + 7, p.y + bobY - 16, 3.5, 6);

        // Flash burst
        if (this.crowdFlashIndex === i && this.crowdFlashTimer < 8) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(p.x + 8, p.y + bobY - 13, 10, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();

    // =========================================================================
    // 6. INTERACTIVE 3D "SRM" LETTERS SIGN (FOOT OF THE STAIRS)
    // =========================================================================
    ctx.save();
    const srm = this.srmSign;
    const wobbleOffset = Math.sin(Date.now() * 0.05) * srm.wobble;
    ctx.translate(srm.x + wobbleOffset, srm.y);

    // Cast Shadow on Plaza Floor
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(srm.w / 2, srm.h + 10, srm.w * 0.55, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Concrete Pedestal
    ctx.fillStyle = '#eceff1';
    ctx.fillRect(-8, srm.h - 10, srm.w + 16, 20);
    ctx.fillStyle = '#b0bec5';
    ctx.fillRect(-8, srm.h + 6, srm.w + 16, 5);

    // 3D Extruded Standing S R M Letters
    const letterW = 34;
    const letterH = 65;
    const gap = 12;

    ['S', 'R', 'M'].forEach((char, idx) => {
      const lx = idx * (letterW + gap) + 8;

      // 3D Depth Shadow Extrusion
      ctx.font = '900 58px "Arial Black", sans-serif';
      ctx.fillStyle = '#061326';
      ctx.fillText(char, lx + 5, letterH + 2);

      // Letter Front Face (SRM Blue with Bevel)
      const letterGrad = ctx.createLinearGradient(lx, 0, lx, letterH);
      letterGrad.addColorStop(0, '#0052cc');
      letterGrad.addColorStop(0.7, '#0033a0');
      letterGrad.addColorStop(1, '#001a4d');
      ctx.fillStyle = letterGrad;
      ctx.fillText(char, lx, letterH);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.strokeText(char, lx, letterH);
    });
    ctx.restore();

    // =========================================================================
    // 7. BATTLE PLAZA PAVEMENT FLOOR (GROUND & TARMAC MARKINGS - PHOTO 4)
    // =========================================================================
    ctx.save();
    // Warm Sunlit Concrete / Tarmac Ground
    const floorGrad = ctx.createLinearGradient(0, this.groundY, 0, h);
    floorGrad.addColorStop(0, '#78909c');
    floorGrad.addColorStop(0.35, '#607d8b');
    floorGrad.addColorStop(1, '#455a64');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, this.groundY, w, h - this.groundY);

    // Interlocking Concrete Paver Joints
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    for (let x = 0; x < w; x += 65) {
      ctx.beginPath();
      ctx.moveTo(x, this.groundY);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = this.groundY + 32; y < h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Photo 4 Real Road Markings: Pedestrian Crossing & Ground Letters
    ctx.save();
    ctx.font = '900 18px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.textAlign = 'center';
    ctx.fillText('SRM KTR  •  TECH PARK PLAZA', w / 2, this.groundY + 45);

    // Yellow & Black Safety Curb Edge
    ctx.fillStyle = '#ffc107';
    ctx.fillRect(0, this.groundY, w, 5);
    ctx.fillStyle = '#212121';
    for (let x = 0; x < w; x += 50) {
      ctx.fillRect(x, this.groundY, 25, 5);
    }
    ctx.restore();
    ctx.restore();

    // =========================================================================
    // 8. AMBIENT PARTICLES & FLYING XEROX NOTES (CHENNAI SEA BREEZE)
    // =========================================================================
    ctx.save();
    for (const d of this.dustParticles) {
      ctx.fillStyle = `rgba(255, 236, 179, ${d.alpha})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Flying Exam Notes & Xerox Papers
    for (const p of this.flyingPapers) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.isLeaf) {
        ctx.fillStyle = '#ff7043';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.strokeStyle = '#90a4ae';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.fillStyle = '#37474f';
        ctx.fillRect(-p.w / 2 + 2, -2, p.w - 4, 1.2);
        ctx.fillRect(-p.w / 2 + 2, 2, p.w - 6, 1.2);
      }
      ctx.restore();
    }
    ctx.restore();

    // =========================================================================
    // 9. HAZARD OVERLAYS: SECURITY GUARD ID-CHECK ALERT & WHISTLE
    // =========================================================================
    if (this.securityWarning > 0) {
      ctx.save();
      const pulse = Math.sin(Date.now() * 0.02) * 0.15 + 0.85;
      ctx.fillStyle = `rgba(255, 23, 68, ${0.15 * pulse})`;
      ctx.fillRect(0, 0, w, 60);

      ctx.fillStyle = '#ff1744';
      ctx.font = '900 15px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️ SECURITY GUARD APPROACHING! HOLD BLOCK (L / 3) TO SHOW ID! ⚠️', w / 2, 38);
      ctx.restore();
    }

    if (this.securityAlert > 0) {
      ctx.save();
      const bannerY = 80;
      const bannerW = 480;
      const bannerH = 46;
      const bannerX = (w - bannerW) / 2;

      ctx.fillStyle = 'rgba(183, 28, 28, 0.95)';
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.5;
      ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
      ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);

      ctx.font = '900 17px "Arial Black", sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.textAlign = 'center';
      ctx.fillText('👮 "WHERE IS YOUR ID CARD?!" (WHISTLE!)', w / 2, bannerY + 28);
      ctx.restore();
    }
  }
}
