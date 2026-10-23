/**
 * The Neon Octagon — Venue Stage Implementation
 * Underground Cybernetic Fight Cage with raised octagonal dais, rain-slick floor,
 * crowd balconies in silhouette, and reactive holographic displays.
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

  renderBackground(ctx, camera = { x: 0, y: 0, scale: 1 }) {
    const camX = camera.x || 0;
    const t = this.time;

    // 1. Deep Colosseum Atmosphere
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 640);
    skyGrad.addColorStop(0, '#040914');
    skyGrad.addColorStop(0.4, '#091326');
    skyGrad.addColorStop(0.75, '#101d36');
    skyGrad.addColorStop(1, '#050a14');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 960, 640);

    // 2. Far Background: Tier 3 Stadium Colosseum Arches (Z = -300, Parallax 0.12)
    const farOffsetX = -camX * 0.12;
    ctx.save();
    ctx.translate(farOffsetX, 0);
    ctx.fillStyle = '#081224';
    for (let i = -2; i < 14; i++) {
      const archX = i * 110;
      ctx.fillRect(archX + 10, 80, 85, 260);
      ctx.beginPath();
      ctx.arc(archX + 52.5, 80, 42.5, Math.PI, 0);
      ctx.fill();
    }
    ctx.restore();

    // 3. Volumetric Overhead Spotlights from Ceiling Rig
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const spotPositions = [
      { x: 340, angle: 0.15 },
      { x: 480, angle: 0.0 },
      { x: 620, angle: -0.15 }
    ];
    for (const spot of spotPositions) {
      const sx = spot.x - camX * 0.25;
      const spotGrad = ctx.createRadialGradient(sx, 40, 10, sx + Math.tan(spot.angle) * 450, 520, 240);
      spotGrad.addColorStop(0, 'rgba(255, 224, 130, 0.25)');
      spotGrad.addColorStop(0.5, 'rgba(255, 215, 0, 0.08)');
      spotGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = spotGrad;
      ctx.beginPath();
      ctx.moveTo(sx - 20, 40);
      ctx.lineTo(sx + 20, 40);
      ctx.lineTo(sx + Math.tan(spot.angle) * 500 + 160, 540);
      ctx.lineTo(sx + Math.tan(spot.angle) * 500 - 160, 540);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 4. Mid Background: Tier 2 Spectator Balconies with Animated Cheering Crowds (Z = -150, Parallax 0.35)
    const midOffsetX = -camX * 0.35;
    ctx.save();
    ctx.translate(midOffsetX, 0);

    // Balcony 1 (Upper)
    ctx.fillStyle = '#0a172e';
    ctx.fillRect(-100, 220, 1200, 18);
    ctx.strokeStyle = '#00e5ff33';
    ctx.lineWidth = 2;
    ctx.strokeRect(-100, 220, 1200, 18);

    // Cheering Crowds Upper (Batched into 1 draw call)
    ctx.fillStyle = '#060e1e';
    ctx.beginPath();
    for (let c = -5; c < 35; c++) {
      const cx = c * 36;
      const bob = Math.sin(t * 4 + c) * 3;
      ctx.moveTo(cx + 6, 210 + bob);
      ctx.arc(cx, 210 + bob, 6, 0, Math.PI * 2);
      ctx.rect(cx - 5, 216 + bob, 10, 10);
    }
    ctx.fill();

    // Balcony 2 (Lower)
    ctx.fillStyle = '#081326';
    ctx.fillRect(-100, 310, 1200, 24);
    ctx.strokeStyle = '#ff910044';
    ctx.strokeRect(-100, 310, 1200, 24);

    // Cheering Crowds Lower (Batched into 1 draw call)
    ctx.fillStyle = '#040b17';
    ctx.beginPath();
    for (let c = -5; c < 30; c++) {
      const cx = c * 42;
      const bob = Math.sin(t * 5 + c * 1.5) * 4;
      ctx.moveTo(cx + 7, 298 + bob);
      ctx.arc(cx, 298 + bob, 7, 0, Math.PI * 2);
      ctx.rect(cx - 6, 305 + bob, 12, 14);
    }
    ctx.fill();

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
      ctx.shadowColor = '#ff9100';
      ctx.shadowBlur = 8;
      ctx.fillRect(lx, 26, 8, 8);
    }
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
        // Glowing Amber Ember
        ctx.fillStyle = `rgba(255, 170, 0, ${p.alpha})`;
        ctx.shadowColor = '#ff9100';
        ctx.shadowBlur = 4;
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

    // Waveform visualization lines
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let i = 0; i < this.wavePoints; i++) {
      const wx = x + (i / (this.wavePoints - 1)) * w;
      const wy = y + h / 2 + Math.sin(time * 6 + i * 0.8) * (h * 0.32);
      if (i === 0) ctx.moveTo(wx, wy);
      else ctx.lineTo(wx, wy);
    }
    ctx.stroke();
    ctx.restore();
  }

  renderOctagonalFloor(ctx, camX, time) {
    const gy = this.groundY; // 535

    // Base Floor Foundation
    const floorGrad = ctx.createLinearGradient(0, gy, 0, 640);
    floorGrad.addColorStop(0, '#0c1526');
    floorGrad.addColorStop(0.3, '#080e1c');
    floorGrad.addColorStop(1, '#02050c');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, gy, 960, 640 - gy);

    // Front Edge Step of the Octagon Dais
    ctx.fillStyle = '#050a14';
    ctx.fillRect(0, gy + 32, 960, 75);

    // Brilliant Cyan Glowing Rim Strip
    ctx.save();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(960, gy);
    ctx.stroke();

    // Secondary Amber Under-Step Light Line
    ctx.strokeStyle = '#ff9100';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff9100';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, gy + 32);
    ctx.lineTo(960, gy + 32);
    ctx.stroke();
    ctx.restore();

    // Treadplate Steel Gridlines with Perspective
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = -100; x < 1100; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x - camX * 0.2, gy);
      ctx.lineTo(x - camX * 0.2 + (x - 480) * 0.15, 640);
      ctx.stroke();
    }
    // Horizontal Floor Seams
    for (let y = gy + 12; y < 640; y += 18) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(960, y);
      ctx.stroke();
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
    ctx.stroke();
    ctx.restore();
  }
}
