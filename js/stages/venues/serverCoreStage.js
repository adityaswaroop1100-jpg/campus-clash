/**
 * The Server Core — Venue Stage Implementation
 * Floating circuit-trace platforms, data-stream ribbons as hazards, "breathing" quantum glow,
 * and endless server racks receding into the cyber void.
 * @module stages/venues/serverCoreStage
 */

import { StageBase } from '../stageBase.js';
import { SERVER_CORE_CONFIG } from '../configs/serverCore.config.js';
import { CharacterSyncLayer } from '../characterSync.js';

export class ServerCoreStage extends StageBase {
  constructor() {
    super(SERVER_CORE_CONFIG);

    // Floating digital data bit sparks
    this.ambientParticles = [];
    const pCount = this.qualityTier === 'high' ? 50 : 25;
    for (let i = 0; i < pCount; i++) {
      this.ambientParticles.push({
        x: Math.random() * 1200,
        y: Math.random() * 640,
        vy: -0.8 - Math.random() * 1.5,
        size: 2 + Math.random() * 3,
        alpha: 0.2 + Math.random() * 0.6,
        color: Math.random() > 0.5 ? '#00e5ff' : '#d500f9'
      });
    }

    // Data streams (vertical glowing waterfall ribbons)
    this.dataStreams = [
      { x: 120, speed: 4, width: 22, color: '#00e5ff' },
      { x: 260, speed: 6, width: 14, color: '#d500f9' },
      { x: 700, speed: 5, width: 18, color: '#00e5ff' },
      { x: 840, speed: 7, width: 24, color: '#d500f9' }
    ];
  }

  updateAmbientParticles(dt) {
    for (const p of this.ambientParticles) {
      p.y += p.vy;
      if (p.y < 0) {
        p.y = 640;
        p.x = Math.random() * 1200;
        p.alpha = 0.2 + Math.random() * 0.6;
      }
    }
  }

  renderBackground(ctx, camera = { x: 0, y: 0, scale: 1 }) {
    const camX = camera.x || 0;
    const t = this.time;
    const breathing = (Math.sin(t * 2.5) + 1) / 2; // 0 to 1 breathing pulse

    // 1. Deep Cybernetic Void Sky
    const voidGrad = ctx.createLinearGradient(0, 0, 0, 640);
    voidGrad.addColorStop(0, '#0a0217');
    voidGrad.addColorStop(0.45, '#16052e');
    voidGrad.addColorStop(0.8, '#26094a');
    voidGrad.addColorStop(1, '#06010f');
    ctx.fillStyle = voidGrad;
    ctx.fillRect(0, 0, 960, 640);

    // 2. Far Background: Distant Monolithic Server Towers (Z = -400, Parallax 0.1)
    const farOffsetX = -camX * 0.1;
    ctx.save();
    ctx.translate(farOffsetX, 0);
    ctx.fillStyle = '#110424';
    for (let i = -1; i < 9; i++) {
      const tx = i * 160;
      ctx.fillRect(tx + 20, 40, 100, 500);
      // Faint purple window LED grid
      ctx.fillStyle = '#2d0a54';
      for (let w = 0; w < 4; w++) {
        for (let h = 0; h < 12; h++) {
          ctx.fillRect(tx + 28 + w * 22, 60 + h * 35, 14, 18);
        }
      }
      ctx.fillStyle = '#110424';
    }

    // Central Distant Giant Planetoid / Ring Structure
    const planetX = 480;
    const planetGrad = ctx.createRadialGradient(planetX, 180, 20, planetX, 180, 140);
    planetGrad.addColorStop(0, `rgba(213, 0, 249, ${0.4 + breathing * 0.2})`);
    planetGrad.addColorStop(0.7, 'rgba(106, 0, 125, 0.15)');
    planetGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = planetGrad;
    ctx.beginPath();
    ctx.arc(planetX, 180, 140, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Cascading Vertical Data Streams (Waterfalls of Light) (Z = -200, Parallax 0.3)
    const midOffsetX = -camX * 0.3;
    ctx.save();
    ctx.translate(midOffsetX, 0);
    ctx.globalCompositeOperation = 'screen';
    for (const stream of this.dataStreams) {
      const grad = ctx.createLinearGradient(stream.x, 0, stream.x + stream.width, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.5, `${stream.color}66`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(stream.x, 0, stream.width, 540);

      // Downward flowing data pulses
      const pulseY = ((t * stream.speed * 40) % 540);
      ctx.fillStyle = stream.color;
      ctx.fillRect(stream.x + 4, pulseY, stream.width - 8, 30);
    }
    ctx.restore();

    // 4. Central Overhead Quantum Server Manifold with Energy Beam (Z = -80, Parallax 0.65)
    const manifoldOffsetX = -camX * 0.65;
    ctx.save();
    ctx.translate(manifoldOffsetX, 0);

    // Overhead Hanging Cylindrical Manifold
    ctx.fillStyle = '#1c0836';
    ctx.strokeStyle = '#d500f9';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#d500f9';
    ctx.shadowBlur = 12;
    ctx.fillRect(360, 0, 240, 70);
    ctx.strokeRect(360, 0, 240, 70);

    // Glowing Concentric Reactor Rings
    for (let r = 0; r < 3; r++) {
      ctx.strokeStyle = r % 2 === 0 ? '#00e5ff' : '#d500f9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(480, 70 + r * 15, 90 - r * 15, 20 - r * 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Direct Vertical Quantum Laser Beam down to Playable Platform
    ctx.globalCompositeOperation = 'screen';
    const beamGrad = ctx.createLinearGradient(460, 70, 500, 70);
    beamGrad.addColorStop(0, 'rgba(0, 229, 255, 0.1)');
    beamGrad.addColorStop(0.5, `rgba(0, 240, 255, ${0.45 + breathing * 0.3})`);
    beamGrad.addColorStop(1, 'rgba(0, 229, 255, 0.1)');
    ctx.fillStyle = beamGrad;
    ctx.fillRect(470, 90, 20, 445);
    ctx.restore();

    // 5. Floating Digital Particles
    ctx.save();
    for (const p of this.ambientParticles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.fillRect(p.x - camX * 0.5, p.y, p.size, p.size);
    }
    ctx.restore();

    // 6. The Primary Floating Circuit Dais & Playable Floor (Z = 0, Parallax 1.0)
    this.renderFloatingFloor(ctx, camX, t, breathing);
  }

  renderFloatingFloor(ctx, camX, time, breathing) {
    const gy = this.groundY; // 535

    // Platform Base Underbelly (Floating in dark void)
    const baseGrad = ctx.createLinearGradient(0, gy, 0, 640);
    baseGrad.addColorStop(0, '#1a0633');
    baseGrad.addColorStop(0.35, '#0e031c');
    baseGrad.addColorStop(1, 'rgba(2, 0, 6, 0.0)');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(80, gy, 800, 640 - gy);

    // Glowing Platform Edge Rim Line (Cyan & Magenta dual rim)
    ctx.save();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(80, gy);
    ctx.lineTo(880, gy);
    ctx.stroke();

    // Under-Platform Energy Core Glow
    ctx.strokeStyle = '#d500f9';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#d500f9';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(110, gy + 22);
    ctx.lineTo(850, gy + 22);
    ctx.stroke();
    ctx.restore();

    // Circular Concentric Floor Circuit Traces
    ctx.save();
    ctx.strokeStyle = `rgba(0, 240, 255, ${0.2 + breathing * 0.25})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    for (let c = 1; c <= 3; c++) {
      ctx.beginPath();
      ctx.ellipse(480 - camX * 0.1, gy + 45, c * 160, c * 25, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Radial Circuit Bus Lines
    for (let a = 0; a < 8; a++) {
      const angle = (a / 8) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(480 - camX * 0.1, gy);
      ctx.lineTo(480 - camX * 0.1 + Math.cos(angle) * 400, gy + Math.sin(angle) * 80);
      ctx.stroke();
    }
    ctx.restore();

    // Floor Boundary Laser Pylons (Playable arena markers at X=80 and X=880)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 18;
    ctx.fillRect(78, gy - 70, 6, 70);
    ctx.fillRect(876, gy - 70, 6, 70);
    ctx.restore();
  }

  renderForeground(ctx, camera = { x: 0, y: 0, scale: 1 }, fighters = []) {
    const camX = camera.x || 0;

    // Catwalk Safety Railings at Canvas Margins (Z = +80, Parallax 1.2)
    const leftRailX = 50;
    const rightRailX = 910;

    const leftAlpha = CharacterSyncLayer.getOcclusionAlpha(leftRailX, 50, fighters, 0.85);
    ctx.save();
    ctx.globalAlpha = leftAlpha;
    ctx.translate(-camX * 1.2, 0);
    ctx.strokeStyle = '#220842';
    ctx.lineWidth = 5;
    ctx.strokeRect(leftRailX - 15, 480, 30, 160);
    ctx.strokeStyle = '#00f0ff88';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(leftRailX - 15, 480, 30, 160);
    ctx.restore();

    const rightAlpha = CharacterSyncLayer.getOcclusionAlpha(rightRailX, 50, fighters, 0.85);
    ctx.save();
    ctx.globalAlpha = rightAlpha;
    ctx.translate(-camX * 1.2, 0);
    ctx.strokeStyle = '#220842';
    ctx.lineWidth = 5;
    ctx.strokeRect(rightRailX - 15, 480, 30, 160);
    ctx.strokeStyle = '#d500f988';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rightRailX - 15, 480, 30, 160);
    ctx.restore();
  }
}
