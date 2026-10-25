/**
 * The Archive Vault — Venue Stage Implementation
 * One fighting floor that shifts across three eras (medieval, industrial, digital wireframe)
 * between rounds. Depth sets and character lighting dynamically morph with each era.
 * Enhanced: Era-specific student crowd themes (medieval scholars chanting, industrial workers
 *           cheering, digital hackathon crowd), reactive crowd cheer wave, confetti/sparks
 *           on heavy hits per era, stronger 3D floor grid per era, atmospheric fog layers.
 * @module stages/venues/archiveVaultStage
 */

import { StageBase } from '../stageBase.js';
import { ARCHIVE_VAULT_CONFIG } from '../configs/archiveVault.config.js';
import { CharacterSyncLayer } from '../characterSync.js';

export class ArchiveVaultStage extends StageBase {
  constructor() {
    super(ARCHIVE_VAULT_CONFIG);

    this.activeEra = 1; // 1 = Medieval, 2 = Industrial, 3 = Digital Wireframe
    this.targetEra = 1;
    this.transitionProgress = 1.0; // 0 to 1

    // Torch & molten sparks
    this.ambientParticles = [];
    const pCount = this.qualityTier === 'high' ? 45 : (this.qualityTier === 'medium' ? 20 : 8);
    for (let i = 0; i < pCount; i++) {
      this.ambientParticles.push({
        x: Math.random() * 1200,
        y: 400 + Math.random() * 200,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -1.0 - Math.random() * 1.5,
        radius: 1.5 + Math.random() * 2.5,
        alpha: 0.3 + Math.random() * 0.5
      });
    }

    // Crowd state — spectator audience themed per era
    this.crowdCheerLevel = 0;
    this.wavePos = -1;
    this.waveActive = false;

    // Era-specific crowd silhouettes (crowd layout is different per era)
    this.spectatorRows = [];
    const specCount = this.qualityTier === 'high' ? 34 : (this.qualityTier === 'medium' ? 20 : 8);
    for (let i = 0; i < specCount; i++) {
      this.spectatorRows.push({
        x: -60 + i * 32,
        bob: Math.random() * Math.PI * 2,
        speed: 2.5 + Math.random() * 2,
        wavePhase: i
      });
    }

    // Hit effect bursts — era themed
    this.hitBursts = [];   // {x, y, radius, alpha, color}
    this.floorRipples = []; // {x, radius, alpha, era}
  }

  onRoundTransition(newRound) {
    super.onRoundTransition(newRound);
    this.targetEra = Math.min(3, newRound);
    this.transitionProgress = 0.0;

    // Update lighting presets per era
    if (this.targetEra === 1) {
      this.config.lighting.rimLight.color = '#ffd08a';
      this.config.lighting.keyLight.color = '#ff9d42';
    } else if (this.targetEra === 2) {
      this.config.lighting.rimLight.color = '#ff6a00';
      this.config.lighting.keyLight.color = '#ff4500';
    } else if (this.targetEra >= 3) {
      this.config.lighting.rimLight.color = '#00e5ff';
      this.config.lighting.keyLight.color = '#00f0ff';
    }
    // Invalidate cached floor gradients so they rebuild for the new era
    if (this._floorGrads) delete this._floorGrads[this.targetEra];
    if (this._skyGrads) delete this._skyGrads[this.targetEra];
  }

  update(dt, fighters = [], particles = null, sound = null) {
    super.update(dt, fighters, particles, sound);

    // Progress era transition
    if (this.transitionProgress < 1.0) {
      this.transitionProgress += 0.015;
      if (this.transitionProgress >= 1.0) {
        this.transitionProgress = 1.0;
        this.activeEra = this.targetEra;
      }
    }

    // Decay crowd
    this.crowdCheerLevel = Math.max(0, this.crowdCheerLevel - 0.014);

    // Crowd wave
    if (this.waveActive) {
      this.wavePos += 0.35;
      if (this.wavePos > 38) { this.waveActive = false; this.wavePos = -1; }
    }

    // Update sparks
    for (const p of this.ambientParticles) {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.006;
      if (p.alpha <= 0 || p.y < 250) {
        p.x = 200 + Math.random() * 800;
        p.y = this.groundY - 15;
        p.alpha = 0.4 + Math.random() * 0.5;
      }
    }

    // Decay hit bursts
    for (let i = this.hitBursts.length - 1; i >= 0; i--) {
      const b = this.hitBursts[i];
      b.radius += 4.5;
      b.alpha -= 0.055;
      if (b.alpha <= 0) this.hitBursts.splice(i, 1);
    }

    // Decay floor ripples
    for (let i = this.floorRipples.length - 1; i >= 0; i--) {
      const r = this.floorRipples[i];
      r.radius += 5;
      r.alpha -= 0.06;
      if (r.alpha <= 0) this.floorRipples.splice(i, 1);
    }
  }

  onFighterHit(x, y, isHeavy = false) {
    super.onFighterHit(x, y, isHeavy);

    this.crowdCheerLevel = Math.min(1, this.crowdCheerLevel + (isHeavy ? 0.65 : 0.28));

    if (isHeavy) {
      this.waveActive = true;
      this.wavePos = 0;
    }

    // Era-specific hit burst color
    const burstColor = this.activeEra === 3 ? '#00e5ff' : (this.activeEra === 2 ? '#ff5500' : '#ffd08a');
    this.hitBursts.push({
      x, y,
      radius: isHeavy ? 20 : 10,
      alpha: isHeavy ? 0.85 : 0.55,
      color: burstColor
    });

    // Floor ripple
    this.floorRipples.push({
      x,
      radius: 8,
      alpha: isHeavy ? 0.75 : 0.45,
      era: this.activeEra
    });
  }

  renderBackground(ctx, camera = { x: 0, y: 0, scale: 1 }) {
    const camX = camera.x || 0;
    const t = this.time;
    const era = this.activeEra;

    // 1. Atmosphere Gradient (Morphed by active era - Cached per era)
    if (!this._skyGrads) this._skyGrads = {};
    if (!this._skyGrads[era]) {
      const sg = ctx.createLinearGradient(0, 0, 0, 640);
      if (era === 1) {
        // Medieval Golden Sunset
        sg.addColorStop(0, '#120703');
        sg.addColorStop(0.45, '#2b1008');
        sg.addColorStop(0.85, '#5e230f');
        sg.addColorStop(1, '#180702');
      } else if (era === 2) {
        // Industrial Smog & Blast Furnace Glow
        sg.addColorStop(0, '#0c0704');
        sg.addColorStop(0.45, '#240d04');
        sg.addColorStop(0.85, '#692006');
        sg.addColorStop(1, '#140602');
      } else {
        // Digital Cyberspace Grid
        sg.addColorStop(0, '#020614');
        sg.addColorStop(0.45, '#071533');
        sg.addColorStop(0.85, '#0a2659');
        sg.addColorStop(1, '#02050f');
      }
      this._skyGrads[era] = sg;
    }
    ctx.fillStyle = this._skyGrads[era];
    ctx.fillRect(0, 0, 960, 640);

    // Era-specific atmospheric depth fog
    if (!this._fogGrads) this._fogGrads = {};
    if (!this._fogGrads[era]) {
      const fg = ctx.createLinearGradient(0, 0, 0, 360);
      if (era === 1) {
        fg.addColorStop(0, 'rgba(18, 7, 3, 0.75)');
        fg.addColorStop(0.65, 'rgba(18, 7, 3, 0.22)');
        fg.addColorStop(1, 'rgba(18, 7, 3, 0)');
      } else if (era === 2) {
        fg.addColorStop(0, 'rgba(12, 7, 4, 0.82)');
        fg.addColorStop(0.65, 'rgba(12, 7, 4, 0.28)');
        fg.addColorStop(1, 'rgba(12, 7, 4, 0)');
      } else {
        fg.addColorStop(0, 'rgba(2, 6, 20, 0.85)');
        fg.addColorStop(0.65, 'rgba(2, 6, 20, 0.25)');
        fg.addColorStop(1, 'rgba(2, 6, 20, 0)');
      }
      this._fogGrads[era] = fg;
    }
    ctx.fillStyle = this._fogGrads[era];
    ctx.fillRect(0, 0, 960, 360);

    // 2. Far Background Architecture (Z = -450, Parallax 0.1)
    const farOffsetX = -camX * 0.1;
    ctx.save();
    ctx.translate(farOffsetX, 0);

    if (era === 1) {
      // Distant Mountain Castles & Waterfall Spires (Towering spires in medieval form)
      ctx.fillStyle = '#1c0c08';
      ctx.fillRect(180, 80, 160, 440);
      ctx.fillRect(620, 60, 180, 460);
      // Battlements on towers
      for (let b = 0; b < 5; b++) {
        ctx.fillRect(185 + b * 28, 74, 16, 14);
        ctx.fillRect(628 + b * 32, 54, 18, 14);
      }
      // Mountain Silhouette Center
      ctx.beginPath();
      ctx.moveTo(340, 520);
      ctx.lineTo(480, 120);
      ctx.lineTo(620, 520);
      ctx.fill();
      // Glowing stained glass windows on towers
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(255, 190, 60, 0.3)';
      for (let w = 0; w < 4; w++) {
        ctx.fillRect(200 + w * 28, 140 + w * 22, 14, 22);
        ctx.fillRect(640 + w * 28, 120 + w * 22, 14, 22);
      }
      ctx.globalCompositeOperation = 'source-over';
    } else if (era === 2) {
      // Towering Blast Furnace & Iron Stacks
      ctx.fillStyle = '#170905';
      ctx.fillRect(380, 40, 200, 480);
      ctx.fillRect(100, 80, 120, 440);
      ctx.fillRect(740, 70, 130, 450);
      // Stack pipes
      ctx.fillStyle = '#100704';
      ctx.fillRect(160, 30, 30, 90);
      ctx.fillRect(800, 25, 30, 95);
      ctx.fillRect(460, 0, 35, 55);
      // Molten Cascade Stream
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = '#ff5500';
      ctx.shadowColor = '#ff3300'; ctx.shadowBlur = 18;
      ctx.fillRect(470, 70, 20, 450);
      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowBlur = 0;
    } else {
      // Cyber Digital Wireframe Castle Matrix
      ctx.strokeStyle = '#00e5ff66';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        ctx.strokeRect(180 + i * 110, 80, 80, 440);
        // Inner wireframe subdivisions
        ctx.strokeStyle = '#00e5ff22';
        for (let row = 0; row < 5; row++) {
          ctx.beginPath();
          ctx.moveTo(180 + i * 110, 150 + row * 75);
          ctx.lineTo(260 + i * 110, 150 + row * 75);
          ctx.stroke();
        }
        ctx.strokeStyle = '#00e5ff66';
      }
    }
    ctx.restore();

    // 3. Midground Era-Specific Student Crowd Audience (Z = -200, Parallax 0.35)
    const crowdOffsetX = -camX * 0.35;
    ctx.save();
    ctx.translate(crowdOffsetX, 0);

    // Upper crowd balcony rail
    const railColor = era === 3 ? '#00e5ff44' : (era === 2 ? '#ff550033' : '#ffd08a33');
    ctx.fillStyle = era === 3 ? '#06101e' : (era === 2 ? '#120806' : '#180c06');
    ctx.fillRect(-100, 240, 1200, 18);
    ctx.strokeStyle = railColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(-100, 240, 1200, 18);

    // Era-themed crowd silhouettes
    const crowdFill = era === 3 ? '#04091a' : (era === 2 ? '#0e0603' : '#140804');
    ctx.fillStyle = crowdFill;
    ctx.beginPath();
    for (const s of this.spectatorRows) {
      const waveBonus = this.waveActive
        ? Math.max(0, 1 - Math.abs(s.wavePhase - this.wavePos) / 4) * 9
        : 0;
      const bob = Math.sin(t * s.speed + s.bob) * (2 + this.crowdCheerLevel * 5) - waveBonus;
      ctx.moveTo(s.x + 6, 228 + bob);
      ctx.arc(s.x, 228 + bob, 6, 0, Math.PI * 2);
      // Era-specific silhouette shape
      if (era === 1) {
        // Medieval scholars — taller, robes
        ctx.rect(s.x - 5, 234 + bob, 10, 18);
      } else if (era === 2) {
        // Industrial workers — stocky
        ctx.rect(s.x - 6, 234 + bob, 12, 15);
      } else {
        // Digital crowd — slim, phone held up
        ctx.rect(s.x - 4, 234 + bob, 8, 15);
      }
      // Arms raised on cheer/wave
      if (waveBonus > 2 || this.crowdCheerLevel > 0.35) {
        ctx.rect(s.x - 9, 226 + bob, 4, 2);
        ctx.rect(s.x + 5, 226 + bob, 4, 2);
      }
    }
    ctx.fill();

    // Era-specific crowd accents
    if (this.qualityTier !== 'low') {
      if (era === 1) {
        // Burning torches in the crowd
        ctx.globalCompositeOperation = 'screen';
        for (let f = 0; f < 6; f++) {
          const fx = 50 + f * 165;
          const flicker = Math.sin(t * 8 + f * 1.7) * 4;
          ctx.fillStyle = `rgba(255, 160, 30, ${0.4 + Math.sin(t * 6 + f) * 0.2})`;
          ctx.shadowColor = '#ff6a00'; ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(fx, 210 + flicker, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.shadowBlur = 0;
      } else if (era === 2) {
        // Steam whistles / horns
        ctx.fillStyle = '#604020';
        for (let h = 0; h < 5; h++) {
          const hx = 80 + h * 192;
          ctx.fillRect(hx, 222, 8, 20);
          // Steam puff
          if (Math.sin(t * 3 + h) > 0.6) {
            ctx.fillStyle = `rgba(200, 200, 200, 0.35)`;
            ctx.beginPath();
            ctx.arc(hx + 4, 218, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#604020';
          }
        }
      } else {
        // Digital crowd — phone screens lit
        ctx.globalCompositeOperation = 'screen';
        for (let p = 0; p < 10; p++) {
          const px = 30 + p * 90;
          const alpha = 0.3 + Math.sin(t * 3 + p * 1.2) * 0.15;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#00e5ff';
          ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 6;
          ctx.fillRect(px - 4, 222, 8, 12);
        }
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    // Banners — era-styled
    if (this.qualityTier !== 'low') {
      for (let b = 0; b < 4; b++) {
        const bx = 60 + b * 225;
        const bannerColor = era === 3 ? '#00e5ff' : (era === 2 ? '#ff5500' : '#ffd08a');
        ctx.fillStyle = bannerColor;
        ctx.shadowColor = bannerColor; ctx.shadowBlur = 5;
        ctx.fillRect(bx, 250, 28, 45);
        ctx.fillStyle = '#ffffff22';
        ctx.fillRect(bx + 6, 258, 16, 2);
        ctx.fillRect(bx + 6, 264, 16, 2);
      }
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    // 4. Near Midground Architecture per Era (Z = -80, Parallax 0.6)
    const nearOffsetX = -camX * 0.6;
    ctx.save();
    ctx.translate(nearOffsetX, 0);

    if (era === 1) {
      // Stone gate archways framing the arena
      ctx.fillStyle = '#1c0d08';
      ctx.fillRect(60, 200, 130, 340);
      ctx.fillRect(770, 200, 130, 340);
      ctx.beginPath();
      ctx.arc(125, 200, 65, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(835, 200, 65, Math.PI, 0);
      ctx.fill();
      // Torch brackets
      ctx.fillStyle = '#8b1414';
      ctx.fillRect(135, 230, 50, 140);
      ctx.fillRect(775, 230, 50, 140);
    } else if (era === 2) {
      // Heavy Industrial Steel Trusses & Catwalks
      ctx.strokeStyle = '#2b1208';
      ctx.lineWidth = 6;
      ctx.strokeRect(100, 220, 760, 40);
      ctx.fillStyle = '#1c0a04';
      ctx.fillRect(100, 220, 760, 40);
      // Rivet accents
      ctx.fillStyle = '#3a1a08';
      for (let r = 0; r < 12; r++) {
        ctx.beginPath();
        ctx.arc(115 + r * 62, 238, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Glowing Cyan Holographic Voxel Blocks
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 10;
      for (let v = 0; v < 5; v++) {
        ctx.strokeRect(160 + v * 150, 200 + (v % 2) * 40, 50, 50);
        // Inner mesh
        ctx.strokeStyle = '#00f0ff44';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(160 + v * 150, 225 + (v % 2) * 40);
        ctx.lineTo(210 + v * 150, 225 + (v % 2) * 40);
        ctx.stroke();
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
      }
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    // 5. Ambient Torch / Molten / Digital Sparks
    ctx.save();
    const sparkColor = era === 3
      ? 'rgba(0, 240, 255, '
      : (era === 2 ? 'rgba(255, 120, 20, ' : 'rgba(255, 160, 30, ');
    const sparkShadow = era === 3 ? '#00e5ff' : '#ff5500';
    for (const p of this.ambientParticles) {
      ctx.fillStyle = `${sparkColor}${p.alpha})`;
      ctx.shadowColor = sparkShadow; ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x - camX * 0.6, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    // 6. Hit burst effects
    if (this.hitBursts.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (const b of this.hitBursts) {
        const bg = ctx.createRadialGradient(b.x, b.y, 2, b.x, b.y, b.radius);
        bg.addColorStop(0, b.color);
        bg.addColorStop(0.5, `${b.color}66`);
        bg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = b.alpha;
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    }

    // 7. Central Combat Dais & Playable Floor (Z = 0, Parallax 1.0)
    this.renderDaisFloor(ctx, camX, t, era);
  }

  renderDaisFloor(ctx, camX, time, era) {
    const gy = this.groundY; // 535

    // Base Dais Texture per Era (Cached per era)
    if (!this._floorGrads) this._floorGrads = {};
    if (!this._floorGrads[era]) {
      const fg = ctx.createLinearGradient(0, gy, 0, 640);
      if (era === 1) {
        // Weathered Flagstone
        fg.addColorStop(0, '#2b160e');
        fg.addColorStop(0.35, '#170b07');
        fg.addColorStop(1, '#0a0402');
      } else if (era === 2) {
        // Heat-Treated Industrial Diamond Plate
        fg.addColorStop(0, '#2e1208');
        fg.addColorStop(0.35, '#180703');
        fg.addColorStop(1, '#0c0301');
      } else {
        // Cyan Wireframe Holographic Glass
        fg.addColorStop(0, '#0a1d3d');
        fg.addColorStop(0.35, '#040d1e');
        fg.addColorStop(1, '#02050c');
      }
      this._floorGrads[era] = fg;
    }
    ctx.fillStyle = this._floorGrads[era];
    ctx.fillRect(0, gy, 960, 640 - gy);

    // Glowing Floor Rim Line (era-colored)
    const rimColor = era === 3 ? '#00e5ff' : (era === 2 ? '#ff5500' : '#ffd08a');
    ctx.save();
    ctx.strokeStyle = rimColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = rimColor;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(960, gy);
    ctx.stroke();

    // Central Concentric Dais Inscription
    ctx.strokeStyle = `${rimColor}44`;
    ctx.lineWidth = 1.5;
    for (let r = 1; r <= 3; r++) {
      ctx.beginPath();
      ctx.ellipse(480 - camX * 0.1, gy + 35, r * 150, r * 20, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Enhanced 3D perspective floor grid (era-styled)
    ctx.save();
    if (era === 1) {
      // Flagstone joint lines
      ctx.strokeStyle = 'rgba(90, 40, 18, 0.35)';
      ctx.lineWidth = 1.5;
    } else if (era === 2) {
      // Diamond plate grid
      ctx.strokeStyle = 'rgba(120, 60, 20, 0.3)';
      ctx.lineWidth = 1.5;
    } else {
      // Digital cyan grid
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.1)';
      ctx.lineWidth = 1;
    }

    const vp = 480;
    for (let x = -80; x < 1100; x += 55) {
      ctx.beginPath();
      ctx.moveTo(x - camX * 0.12, gy);
      const bx = vp + (x - vp) * 1.4 - camX * 0.05;
      ctx.lineTo(bx, 640);
      ctx.stroke();
    }
    // Horizontal receding rows with increasing gap
    let rowY = gy + 8;
    let rowGap = 6;
    while (rowY < 640) {
      ctx.beginPath();
      ctx.moveTo(0, rowY);
      ctx.lineTo(960, rowY);
      ctx.stroke();
      rowGap = Math.min(rowGap + 1.8, 28);
      rowY += rowGap;
    }
    ctx.restore();

    // Floor ripple rings from hit impacts
    if (this.floorRipples.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (const r of this.floorRipples) {
        const rc = r.era === 3 ? '#00e5ff' : (r.era === 2 ? '#ff5500' : '#ffd08a');
        ctx.strokeStyle = rc;
        ctx.lineWidth = 2;
        ctx.globalAlpha = r.alpha;
        ctx.shadowColor = rc; ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.ellipse(r.x, gy + 8, r.radius * 2.5, r.radius * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    }
  }

  renderForeground(ctx, camera = { x: 0, y: 0, scale: 1 }, fighters = []) {
    const camX = camera.x || 0;
    const era = this.activeEra;

    // Corner Foreground Framing Element (Z = +100, Parallax 1.25)
    const leftX = 60;
    const rightX = 900;

    const leftAlpha = CharacterSyncLayer.getOcclusionAlpha(leftX, 60, fighters, 0.9);
    ctx.save();
    ctx.globalAlpha = leftAlpha;
    ctx.translate(-camX * 1.25, 0);

    if (era === 1) {
      // Stone Fire Urn Brazier
      ctx.fillStyle = '#1c0d08';
      ctx.fillRect(leftX - 25, 490, 50, 150);
      ctx.fillStyle = '#ff6a00';
      ctx.shadowColor = '#ff4500'; ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(leftX, 485, 12, 0, Math.PI * 2);
      ctx.fill();
      // Flame flicker
      const flicker = Math.sin(this.time * 8.5) * 4;
      ctx.fillStyle = 'rgba(255, 200, 40, 0.7)';
      ctx.beginPath();
      ctx.arc(leftX + flicker * 0.5, 478 - Math.abs(flicker), 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (era === 2) {
      // Iron Safety Truss Railing
      ctx.strokeStyle = '#2b1208';
      ctx.lineWidth = 5;
      ctx.strokeRect(leftX - 20, 480, 40, 160);
      // Rivet heads
      ctx.fillStyle = '#3a1808';
      ctx.beginPath();
      ctx.arc(leftX - 20, 490, 4, 0, Math.PI * 2);
      ctx.arc(leftX + 20, 490, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Digital Wireframe Voxel Node
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 8;
      ctx.strokeRect(leftX - 20, 490, 40, 40);
      // Inner mesh
      ctx.strokeStyle = '#00e5ff44';
      ctx.lineWidth = 1;
      ctx.strokeRect(leftX - 12, 498, 24, 24);
    }
    ctx.restore();

    // Right Frame
    const rightAlpha = CharacterSyncLayer.getOcclusionAlpha(rightX, 60, fighters, 0.9);
    ctx.save();
    ctx.globalAlpha = rightAlpha;
    ctx.translate(-camX * 1.25, 0);

    if (era === 1) {
      ctx.fillStyle = '#1c0d08';
      ctx.fillRect(rightX - 25, 490, 50, 150);
      ctx.fillStyle = '#ff6a00';
      ctx.shadowColor = '#ff4500'; ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(rightX, 485, 12, 0, Math.PI * 2);
      ctx.fill();
      const flicker = Math.sin(this.time * 7.8 + 1.2) * 4;
      ctx.fillStyle = 'rgba(255, 200, 40, 0.7)';
      ctx.beginPath();
      ctx.arc(rightX + flicker * 0.5, 478 - Math.abs(flicker), 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (era === 2) {
      ctx.strokeStyle = '#2b1208';
      ctx.lineWidth = 5;
      ctx.strokeRect(rightX - 20, 480, 40, 160);
      ctx.fillStyle = '#3a1808';
      ctx.beginPath();
      ctx.arc(rightX - 20, 490, 4, 0, Math.PI * 2);
      ctx.arc(rightX + 20, 490, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 8;
      ctx.strokeRect(rightX - 20, 490, 40, 40);
      ctx.strokeStyle = '#00e5ff44';
      ctx.lineWidth = 1;
      ctx.strokeRect(rightX - 12, 498, 24, 24);
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}
