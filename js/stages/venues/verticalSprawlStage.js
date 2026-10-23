/**
 * The Vertical Sprawl — Venue Stage Implementation
 * Five-level neon city block with rooftops, balconies, walkways, and wet courtyard.
 * High verticality, architectural depth layers, and rain-slick reflections.
 * @module stages/venues/verticalSprawlStage
 */

import { StageBase } from '../stageBase.js';
import { VERTICAL_SPRAWL_CONFIG } from '../configs/verticalSprawl.config.js';
import { CharacterSyncLayer } from '../characterSync.js';

export class VerticalSprawlStage extends StageBase {
  constructor() {
    super(VERTICAL_SPRAWL_CONFIG);

    // Drifting rain drops
    this.ambientParticles = [];
    const pCount = this.qualityTier === 'high' ? 60 : 30;
    for (let i = 0; i < pCount; i++) {
      this.ambientParticles.push({
        x: Math.random() * 1200,
        y: Math.random() * 640,
        vx: -1.2,
        vy: 14 + Math.random() * 6,
        length: 8 + Math.random() * 8,
        alpha: 0.15 + Math.random() * 0.3
      });
    }
  }

  updateAmbientParticles(dt) {
    for (const p of this.ambientParticles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y > this.groundY) {
        p.y = 0;
        p.x = Math.random() * 1200;
      }
    }
  }

  renderBackground(ctx, camera = { x: 0, y: 0, scale: 1 }) {
    const camX = camera.x || 0;
    const t = this.time;

    // 1. Deep Midnight Cyberpunk Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 640);
    skyGrad.addColorStop(0, '#040814');
    skyGrad.addColorStop(0.5, '#0b162b');
    skyGrad.addColorStop(0.85, '#132342');
    skyGrad.addColorStop(1, '#050a14');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 960, 640);

    // 2. Far Background: Mega Skyscrapers & Towering Cyber Sprawl (Z = -500, Parallax 0.08)
    const farOffsetX = -camX * 0.08;
    ctx.save();
    ctx.translate(farOffsetX, 0);
    ctx.fillStyle = '#081122';
    ctx.fillRect(200, 20, 160, 480);
    ctx.fillRect(400, 10, 220, 490);
    ctx.fillRect(660, 40, 180, 460);

    // Giant Glowing Cyan / Magenta Cyber Billboards on Far Towers
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(0, 229, 255, 0.45)';
    ctx.fillRect(220, 50, 45, 140);
    ctx.fillStyle = 'rgba(255, 0, 127, 0.45)';
    ctx.fillRect(440, 40, 70, 120);
    ctx.fillStyle = 'rgba(0, 229, 255, 0.35)';
    ctx.fillRect(700, 70, 50, 160);
    ctx.restore();

    // 3. High Aerial Suspension Skybridge (Z = -300, Parallax 0.22)
    const bridgeOffsetX = -camX * 0.22;
    ctx.save();
    ctx.translate(bridgeOffsetX, 0);
    ctx.strokeStyle = '#142544';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(480, 180, 260, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();

    // Amber lights on bridge walkway
    for (let b = 0; b < 10; b++) {
      const bx = 300 + b * 40;
      const by = 135 + Math.sin(b * 0.3) * 6;
      ctx.fillStyle = '#ffe082';
      ctx.fillRect(bx, by, 4, 4);
    }
    ctx.restore();

    // 4. Midground Multi-Tier Walkways & Concrete Balconies (Z = -120, Parallax 0.45)
    const midOffsetX = -camX * 0.45;
    ctx.save();
    ctx.translate(midOffsetX, 0);

    // Left Balcony Complex (3 Tiers)
    for (let tier = 1; tier <= 3; tier++) {
      const by = 140 + tier * 85;
      const bw = 240 - tier * 30;
      ctx.fillStyle = '#0e1c36';
      ctx.fillRect(-80, by, bw, 22);

      // Warm Amber Underglow
      ctx.fillStyle = 'rgba(255, 180, 50, 0.18)';
      ctx.fillRect(-80, by + 22, bw, 35);

      // Neon Signage (Hot Magenta / Cyan)
      ctx.fillStyle = tier % 2 === 0 ? '#ff007f' : '#00e5ff';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10;
      ctx.fillRect(20, by + 4, 65, 14);
      ctx.shadowBlur = 0;
    }

    // Right Balcony Complex (3 Tiers)
    for (let tier = 1; tier <= 3; tier++) {
      const by = 140 + tier * 85;
      const bx = 760 + tier * 30;
      const bw = 280;
      ctx.fillStyle = '#0e1c36';
      ctx.fillRect(bx, by, bw, 22);

      // Warm Amber Underglow
      ctx.fillStyle = 'rgba(255, 180, 50, 0.18)';
      ctx.fillRect(bx, by + 22, bw, 35);

      // Neon Signage (Cyan / Magenta)
      ctx.fillStyle = tier % 2 === 0 ? '#00e5ff' : '#ff007f';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10;
      ctx.fillRect(bx + 20, by + 4, 65, 14);
      ctx.shadowBlur = 0;
    }

    // Dual Concrete Stairways on Left and Right
    ctx.fillStyle = '#0c172e';
    for (let s = 0; s < 8; s++) {
      // Left Stairs
      ctx.fillRect(100 + s * 16, 410 + s * 16, 80, 16);
      // Right Stairs
      ctx.fillRect(780 - s * 16, 410 + s * 16, 80, 16);
    }
    ctx.restore();

    // 5. Ambient Cyber Rain Particles
    ctx.save();
    ctx.strokeStyle = 'rgba(160, 210, 255, 0.35)';
    ctx.lineWidth = 1.2;
    for (const r of this.ambientParticles) {
      ctx.beginPath();
      ctx.moveTo(r.x - camX * 0.8, r.y);
      ctx.lineTo(r.x - camX * 0.8 + r.vx, r.y + r.length);
      ctx.stroke();
    }
    ctx.restore();

    // 6. Wet Courtyard Pavement & Specular Ground Line (Z = 0, Parallax 1.0)
    this.renderWetCourtyard(ctx, camX, t);
  }

  renderWetCourtyard(ctx, camX, time) {
    const gy = this.groundY; // 535

    // Wet Stone Pavement
    const pavementGrad = ctx.createLinearGradient(0, gy, 0, 640);
    pavementGrad.addColorStop(0, '#0f1b33');
    pavementGrad.addColorStop(0.35, '#0a1224');
    pavementGrad.addColorStop(1, '#03060d');
    ctx.fillStyle = pavementGrad;
    ctx.fillRect(0, gy, 960, 640 - gy);

    // Wet Puddle Specular Sheens
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    // Magenta Puddle Reflection (from left neon)
    const puddleLeft = ctx.createRadialGradient(240 - camX * 0.3, gy + 35, 10, 240 - camX * 0.3, gy + 35, 180);
    puddleLeft.addColorStop(0, 'rgba(255, 0, 127, 0.28)');
    puddleLeft.addColorStop(0.6, 'rgba(255, 0, 127, 0.08)');
    puddleLeft.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = puddleLeft;
    ctx.fillRect(60, gy, 380, 105);

    // Cyan Puddle Reflection (from right neon)
    const puddleRight = ctx.createRadialGradient(720 - camX * 0.3, gy + 35, 10, 720 - camX * 0.3, gy + 35, 180);
    puddleRight.addColorStop(0, 'rgba(0, 229, 255, 0.28)');
    puddleRight.addColorStop(0.6, 'rgba(0, 229, 255, 0.08)');
    puddleRight.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = puddleRight;
    ctx.fillRect(520, gy, 380, 105);
    ctx.restore();

    // Ground Rim Highlight
    ctx.save();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(960, gy);
    ctx.stroke();
    ctx.restore();

    // Pavement Seam Gridlines
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = -80; x < 1080; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x - camX * 0.2, gy);
      ctx.lineTo(x - camX * 0.2 + (x - 480) * 0.12, 640);
      ctx.stroke();
    }
    ctx.restore();
  }

  renderForeground(ctx, camera = { x: 0, y: 0, scale: 1 }, fighters = []) {
    const camX = camera.x || 0;

    // Industrial Machinery & Crates at Canvas Margins (Z = +100, Parallax 1.25)
    const leftCrateX = 40;
    const rightCrateX = 920;

    // Left Shipping Crate (with Occlusion Guard)
    const leftAlpha = CharacterSyncLayer.getOcclusionAlpha(leftCrateX, 70, fighters, 0.9);
    ctx.save();
    ctx.globalAlpha = leftAlpha;
    ctx.translate(-camX * 1.25, 0);
    ctx.fillStyle = '#081224';
    ctx.fillRect(leftCrateX - 35, 470, 70, 170);
    ctx.strokeStyle = '#ffe08266';
    ctx.lineWidth = 2;
    ctx.strokeRect(leftCrateX - 35, 470, 70, 170);
    ctx.restore();

    // Right Industrial Terminal (with Occlusion Guard)
    const rightAlpha = CharacterSyncLayer.getOcclusionAlpha(rightCrateX, 70, fighters, 0.9);
    ctx.save();
    ctx.globalAlpha = rightAlpha;
    ctx.translate(-camX * 1.25, 0);
    ctx.fillStyle = '#081224';
    ctx.fillRect(rightCrateX - 35, 470, 70, 170);
    ctx.strokeStyle = '#00e5ff66';
    ctx.lineWidth = 2;
    ctx.strokeRect(rightCrateX - 35, 470, 70, 170);
    ctx.restore();
  }
}
