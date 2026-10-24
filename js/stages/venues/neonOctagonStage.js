/**
 * The Neon Octagon — Venue Stage Implementation
 * Underground Cybernetic Fight Cage with raised octagonal dais, rain-slick floor,
 * crowd balconies in silhouette, and reactive holographic displays.
 * Enhanced: Dense student fight-club audience with phones & banners, reactive cheer
 *           wave, volumetric spotlight shafts, stronger perspective floor grid,
 *           crowd phones flash sync'd to hit events.
 * @module stages/venues/neonOctagonStage
 */

import { StageBase } from '../stageBase.js';
import { NEON_OCTAGON_CONFIG } from '../configs/neonOctagon.config.js';
import { CharacterSyncLayer } from '../characterSync.js';

export class NeonOctagonStage extends StageBase {
  constructor() {
    super(NEON_OCTAGON_CONFIG);

    // Steam & ember ambient particles
    this.ambientParticles = [];
    const pCount = this.qualityTier === 'high' ? 45 : (this.qualityTier === 'medium' ? 25 : 10);
    for (let i = 0; i < pCount; i++) {
      this.ambientParticles.push({
        x: Math.random() * 1200,
        y: 400 + Math.random() * 200,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.6 - Math.random() * 0.8,
        radius: 1.5 + Math.random() * 3,
        alpha: 0.15 + Math.random() * 0.35,
        type: Math.random() > 0.4 ? 'steam' : 'ember'
      });
    }

    // Holographic waveform bars state
    this.wavePoints = 16;

    // Crowd fight-club spectator state
    // Dense underground crowd — 3 tiers per side
    this.crowdCheerLevel = 0;
    this.crowdPhoneFlashes = []; // {x, y, alpha} — phone flash dots
    const flashCount = this.qualityTier === 'high' ? 55 : (this.qualityTier === 'medium' ? 30 : 0);
    this.spectatorFlashes = [];
    for (let i = 0; i < flashCount; i++) {
      this.spectatorFlashes.push({
        x: 30 + Math.random() * 960,
        y: 100 + Math.random() * 230,
        flashTimer: Math.random() * 100,
        alpha: 0
      });
    }

    // Crowd wave state — fans do a "wave" on big hits
    this.waveOffset = -1; // current wave position index (-1 = inactive)
    this.waveSpeed = 0;

    // Corner ring post glow intensity (flares on hit)
    this.postGlow = 0;
  }

  updateAmbientParticles(dt) {
    for (const p of this.ambientParticles) {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.003;
      if (p.y < 280 || p.alpha <= 0) {
        p.x = 200 + Math.random() * 800;
        p.y = this.groundY - 10 + Math.random() * 40;
        p.alpha = 0.2 + Math.random() * 0.4;
      }
    }
  }

  update(dt, fighters = [], particles = null, sound = null) {
    super.update(dt, fighters, particles, sound);

    // Decay crowd cheer
    this.crowdCheerLevel = Math.max(0, this.crowdCheerLevel - 0.015);
    this.postGlow = Math.max(0, this.postGlow - 0.04);

    // Advance crowd wave
    if (this.waveOffset >= 0) {
      this.waveOffset += this.waveSpeed;
      if (this.waveOffset > 14) this.waveOffset = -1; // done
    }

    // Update spectator phone flashes
    for (const sp of this.spectatorFlashes) {
      sp.flashTimer++;
      const flashRate = 50 + (1 - this.crowdCheerLevel) * 80;
      if (sp.flashTimer > flashRate + Math.random() * 40) {
        sp.alpha = 0.9;
        sp.flashTimer = 0;
      }
      sp.alpha = Math.max(0, sp.alpha - 0.1);
    }
  }

  onFighterHit(x, y, isHeavy = false) {
    super.onFighterHit(x, y, isHeavy);

    // Spike crowd
    this.crowdCheerLevel = Math.min(1, this.crowdCheerLevel + (isHeavy ? 0.65 : 0.28));
    // Trigger ring post flare
    this.postGlow = isHeavy ? 1.0 : 0.6;
    // Trigger crowd wave on heavy hit
    if (isHeavy) {
      this.waveOffset = 0;
      this.waveSpeed = 0.35;
    }
    // Mass phone flash
    const flashCount = isHeavy ? 12 : 5;
    for (let i = 0; i < flashCount; i++) {
      const sp = this.spectatorFlashes[Math.floor(Math.random() * this.spectatorFlashes.length)];
      if (sp) { sp.alpha = 0.95; sp.flashTimer = 0; }
    }
  }

  renderBackground(ctx, camera = { x: 0, y: 0, scale: 1 }) {
    const camX = camera.x || 0;
    const t = this.time;

    // 1. Deep Colosseum Atmosphere (Cached)
    if (!this._skyGrad) {
      this._skyGrad = ctx.createLinearGradient(0, 0, 0, 640);
      this._skyGrad.addColorStop(0, '#040914');
      this._skyGrad.addColorStop(0.4, '#091326');
      this._skyGrad.addColorStop(0.75, '#101d36');
      this._skyGrad.addColorStop(1, '#050a14');
    }
    ctx.fillStyle = this._skyGrad;
    ctx.fillRect(0, 0, 960, 640);

    // Depth Fog — strong ceiling fog to push back grandstands
    if (!this._fogGrad) {
      this._fogGrad = ctx.createLinearGradient(0, 0, 0, 340);
      this._fogGrad.addColorStop(0, 'rgba(4, 9, 22, 0.85)');
      this._fogGrad.addColorStop(0.65, 'rgba(4, 9, 22, 0.25)');
      this._fogGrad.addColorStop(1, 'rgba(4, 9, 22, 0)');
    }
    ctx.fillStyle = this._fogGrad;
    ctx.fillRect(0, 0, 960, 340);

    // 2. Far Background: Tier 3 Stadium Colosseum Arches (Z = -300, Parallax 0.12)
    const farOffsetX = -camX * 0.12;
    ctx.save();
    ctx.translate(farOffsetX, 0);
    ctx.fillStyle = '#07101f';
    for (let i = -2; i < 14; i++) {
      const archX = i * 110;
      ctx.fillRect(archX + 10, 80, 85, 260);
      ctx.beginPath();
      ctx.arc(archX + 52.5, 80, 42.5, Math.PI, 0);
      ctx.fill();
    }
    // Arch LED strip accents
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
    ctx.lineWidth = 2;
    for (let i = -2; i < 14; i++) {
      const archX = i * 110;
      ctx.strokeRect(archX + 12, 82, 81, 256);
    }
    ctx.restore();

    // 3. Volumetric Overhead Spotlights from Ceiling Rig (enhanced — shaft width tied to cheer)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const spotPositions = [
      { x: 340, angle: 0.15 },
      { x: 480, angle: 0.0 },
      { x: 620, angle: -0.15 }
    ];
    for (const spot of spotPositions) {
      const sx = spot.x - camX * 0.25;
      const intensity = 0.22 + this.crowdCheerLevel * 0.18;
      const spotGrad = ctx.createRadialGradient(sx, 40, 10, sx + Math.tan(spot.angle) * 450, 520, 240);
      spotGrad.addColorStop(0, `rgba(255, 224, 130, ${intensity})`);
      spotGrad.addColorStop(0.5, `rgba(255, 215, 0, ${intensity * 0.35})`);
      spotGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = spotGrad;
      const halfW = 160 + this.crowdCheerLevel * 30;
      ctx.beginPath();
      ctx.moveTo(sx - 22, 40);
      ctx.lineTo(sx + 22, 40);
      ctx.lineTo(sx + Math.tan(spot.angle) * 500 + halfW, 540);
      ctx.lineTo(sx + Math.tan(spot.angle) * 500 - halfW, 540);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 4. Mid Background: Tier 2 Spectator Balconies with Dense Student Crowd (Z = -150, Parallax 0.35)
    const midOffsetX = -camX * 0.35;
    ctx.save();
    ctx.translate(midOffsetX, 0);

    // Upper Balcony
    ctx.fillStyle = '#0a172e';
    ctx.fillRect(-100, 220, 1200, 18);
    ctx.strokeStyle = '#00e5ff33';
    ctx.lineWidth = 2;
    ctx.strokeRect(-100, 220, 1200, 18);

    // Dense Upper Crowd — students with varied arm states
    ctx.fillStyle = '#060e1e';
    ctx.beginPath();
    for (let c = -5; c < 35; c++) {
      const cx = c * 36;
      // wave factor — fans near waveOffset bob higher
      const waveBonus = this.waveOffset >= 0 ? Math.max(0, 1 - Math.abs(c - this.waveOffset * 3.5) / 3) * 8 : 0;
      const bob = Math.sin(t * 4 + c) * (2 + this.crowdCheerLevel * 4) - waveBonus;
      ctx.moveTo(cx + 6, 210 + bob);
      ctx.arc(cx, 210 + bob, 6, 0, Math.PI * 2);
      ctx.rect(cx - 5, 216 + bob, 10, 10);
      // Raised arms on cheer or wave
      if (this.crowdCheerLevel > 0.3 || waveBonus > 2) {
        ctx.rect(cx - 9, 208 + bob, 4, 2);
        ctx.rect(cx + 5, 208 + bob, 4, 2);
      }
    }
    ctx.fill();

    // SRM College Banners on upper balcony rail
    if (this.qualityTier !== 'low') {
      const bannerColors = ['#00e5ff', '#ff007f', '#ffd600', '#00e5ff'];
      for (let b = 0; b < 4; b++) {
        const bx = 80 + b * 240;
        ctx.fillStyle = bannerColors[b];
        ctx.shadowColor = bannerColors[b]; ctx.shadowBlur = 6;
        ctx.fillRect(bx, 230, 35, 55);
        // Banner stripe
        ctx.fillStyle = '#ffffff22';
        ctx.fillRect(bx + 8, 240, 19, 3);
        ctx.fillRect(bx + 8, 248, 19, 3);
      }
      ctx.shadowBlur = 0;
    }

    // Lower Balcony
    ctx.fillStyle = '#081326';
    ctx.fillRect(-100, 310, 1200, 24);
    ctx.strokeStyle = '#ff910044';
    ctx.strokeRect(-100, 310, 1200, 24);

    // Dense Lower Crowd
    ctx.fillStyle = '#040b17';
    ctx.beginPath();
    for (let c = -5; c < 30; c++) {
      const cx = c * 42;
      const waveBonus = this.waveOffset >= 0 ? Math.max(0, 1 - Math.abs(c - this.waveOffset * 3) / 3) * 10 : 0;
      const bob = Math.sin(t * 5 + c * 1.5) * (3 + this.crowdCheerLevel * 5) - waveBonus;
      ctx.moveTo(cx + 7, 298 + bob);
      ctx.arc(cx, 298 + bob, 7, 0, Math.PI * 2);
      ctx.rect(cx - 6, 305 + bob, 12, 14);
      if (this.crowdCheerLevel > 0.25 || waveBonus > 2) {
        ctx.rect(cx - 10, 296 + bob, 5, 2);
        ctx.rect(cx + 5, 296 + bob, 5, 2);
      }
    }
    ctx.fill();

    // Phone flash lights in crowd
    if (this.qualityTier !== 'low') {
      ctx.globalCompositeOperation = 'screen';
      for (const sp of this.spectatorFlashes) {
        if (sp.alpha > 0.05) {
          ctx.globalAlpha = sp.alpha * 0.75;
          ctx.fillStyle = '#e8f4ff';
          ctx.shadowColor = '#aaddff'; ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'source-over';
    }

    // 5. Floating Curved Holographic Audio / Status Displays
    const holoLeftX = 140;
    const holoRightX = 720;
    this.renderHoloScreen(ctx, holoLeftX, 160, 160, 80, t, '#ff9100');
    this.renderHoloScreen(ctx, holoRightX, 160, 160, 80, t + 1.2, '#00e5ff');
    ctx.restore();

    // 6. Suspended Octagonal Heavy Truss Overhead (Z = -50, Parallax 0.7)
    const trussOffsetX = -camX * 0.7;
    ctx.save();
    ctx.translate(trussOffsetX, 0);
    ctx.strokeStyle = '#1b2a4a';
    ctx.lineWidth = 4;
    ctx.strokeRect(180, 20, 600, 30);
    // Amber Truss Warning Lights
    for (let l = 0; l < 8; l++) {
      const lx = 200 + l * 80;
      ctx.fillStyle = (Math.sin(t * 3 + l) > 0) ? '#ff9100' : '#ffe082';
      ctx.shadowColor = '#ff9100'; ctx.shadowBlur = 8;
      ctx.fillRect(lx, 26, 8, 8);
    }
    // Ring post glowing corners — flare on hit
    if (this.postGlow > 0) {
      ctx.globalCompositeOperation = 'screen';
      const gAlpha = this.postGlow * 0.6;
      ctx.fillStyle = `rgba(255, 145, 0, ${gAlpha})`;
      ctx.shadowColor = '#ff9100'; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(185, 50, 12 + this.postGlow * 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(775, 50, 12 + this.postGlow * 8, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    // 7. Ambient Drifting Steam / Smoke Particles
    ctx.save();
    for (const p of this.ambientParticles) {
      if (p.type === 'steam') {
        ctx.fillStyle = `rgba(180, 210, 240, ${p.alpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(p.x - camX * 0.6, p.y, p.radius * 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(255, 170, 0, ${p.alpha})`;
        ctx.shadowColor = '#ff9100'; ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(p.x - camX * 0.8, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // 8. The Raised Octagonal Steel Dais & Playable Floor (Z = 0, Parallax 1.0)
    this.renderOctagonalFloor(ctx, camX, t);
  }

  renderHoloScreen(ctx, x, y, w, h, time, color) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `${color}11`;
    ctx.strokeStyle = `${color}66`;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;

    ctx.strokeRect(x, y, w, h);
    ctx.fillRect(x, y, w, h);

    // Waveform visualization lines — more energetic during crowd cheer
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    const amp = 0.32 + this.crowdCheerLevel * 0.25;
    for (let i = 0; i < this.wavePoints; i++) {
      const wx = x + (i / (this.wavePoints - 1)) * w;
      const wy = y + h / 2 + Math.sin(time * 6 + i * 0.8) * (h * amp);
      if (i === 0) ctx.moveTo(wx, wy);
      else ctx.lineTo(wx, wy);
    }
    ctx.stroke();
    ctx.restore();
  }

  renderOctagonalFloor(ctx, camX, time) {
    const gy = this.groundY; // 535

    // Base Floor Foundation (Cached)
    if (!this._floorGrad) {
      this._floorGrad = ctx.createLinearGradient(0, gy, 0, 640);
      this._floorGrad.addColorStop(0, '#0c1526');
      this._floorGrad.addColorStop(0.3, '#080e1c');
      this._floorGrad.addColorStop(1, '#02050c');
    }
    ctx.fillStyle = this._floorGrad;
    ctx.fillRect(0, gy, 960, 640 - gy);

    // Front Edge Step of the Octagon Dais
    ctx.fillStyle = '#050a14';
    ctx.fillRect(0, gy + 32, 960, 75);

    // Brilliant Cyan Glowing Rim Strip
    ctx.save();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 14 + this.postGlow * 10;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(960, gy);
    ctx.stroke();

    // Secondary Amber Under-Step Light Line
    ctx.strokeStyle = '#ff9100';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff9100';
    ctx.shadowBlur = 8 + this.postGlow * 8;
    ctx.beginPath();
    ctx.moveTo(0, gy + 32);
    ctx.lineTo(960, gy + 32);
    ctx.stroke();
    ctx.restore();

    // Corner ring posts on the dais
    ctx.save();
    const postPositions = [120, 840];
    for (const px of postPositions) {
      ctx.fillStyle = '#0a1422';
      ctx.fillRect(px - 6, gy - 120, 12, 120);
      // Top cap
      ctx.fillStyle = this.postGlow > 0.1 ? '#ff9100' : '#00e5ff';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8 + this.postGlow * 12;
      ctx.fillRect(px - 8, gy - 124, 16, 6);
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    // Treadplate Steel Gridlines with Strong Perspective convergence
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.08)';
    ctx.lineWidth = 1;
    const vp = 480;
    for (let x = -100; x < 1100; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x - camX * 0.15, gy);
      const bottomX = vp + (x - vp) * 1.4 - camX * 0.05;
      ctx.lineTo(bottomX, 640);
      ctx.stroke();
    }
    // Horizontal receding rows
    let rowY = gy + 10;
    let rowGap = 6;
    while (rowY < 640) {
      ctx.beginPath();
      ctx.moveTo(0, rowY);
      ctx.lineTo(960, rowY);
      ctx.stroke();
      rowGap = Math.min(rowGap + 2, 30);
      rowY += rowGap;
    }
    ctx.restore();
  }

  renderForeground(ctx, camera = { x: 0, y: 0, scale: 1 }, fighters = []) {
    const camX = camera.x || 0;

    // Heavy Industrial Hanging Chains and Conduits (Z = +100, Parallax 1.25)
    const leftChainX = 45;
    const rightChainX = 915;

    // Left Chain Frame (with Occlusion Guard)
    const leftAlpha = CharacterSyncLayer.getOcclusionAlpha(leftChainX, 60, fighters, 0.85);
    ctx.save();
    ctx.globalAlpha = leftAlpha;
    ctx.translate(-camX * 1.25, 0);

    ctx.strokeStyle = '#152238';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(leftChainX, 0);
    ctx.lineTo(leftChainX + 15, 420);
    ctx.stroke();

    ctx.strokeStyle = '#ff910066';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(leftChainX, 0);
    ctx.lineTo(leftChainX + 15, 420);
    ctx.stroke();
    ctx.restore();

    // Right Chain Frame (with Occlusion Guard)
    const rightAlpha = CharacterSyncLayer.getOcclusionAlpha(rightChainX, 60, fighters, 0.85);
    ctx.save();
    ctx.globalAlpha = rightAlpha;
    ctx.translate(-camX * 1.25, 0);

    ctx.strokeStyle = '#152238';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(rightChainX, 0);
    ctx.lineTo(rightChainX - 15, 420);
    ctx.stroke();

    ctx.strokeStyle = '#00e5ff66';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rightChainX, 0);
    ctx.lineTo(rightChainX - 15, 420);
    ctx.stroke();
    ctx.restore();
  }
}
