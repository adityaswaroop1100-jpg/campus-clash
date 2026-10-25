/**
 * The Server Core — Venue Stage Implementation
 * Floating circuit-trace platforms, data-stream ribbons as hazards, "breathing" quantum glow,
 * and endless server racks receding into the cyber void.
 * Enhanced: Student engineers watching from walkways, reactive crowd
 *           phone-glow, enhanced 3D server depth, breathing floor circuit pattern,
 *           student silhouettes on upper catwalks synced to hits.
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
    const pCount = this.qualityTier === 'high' ? 50 : (this.qualityTier === 'medium' ? 25 : 10);
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

    // Pre-bake static server towers to eliminate per-frame rect calls
    this.initPrebakedLayers();

    // Hackathon student spectators on catwalk
    this.crowdCheerLevel = 0;
    this.hackerSpectators = [];
    const hCount = this.qualityTier === 'high' ? 18 : (this.qualityTier === 'medium' ? 10 : 0);
    for (let i = 0; i < hCount; i++) {
      this.hackerSpectators.push({
        x: 60 + i * 52,
        side: i % 3 === 2 ? 'right' : 'left',
        flashTimer: Math.random() * 100,
        flashAlpha: 0,
        bob: Math.random() * Math.PI * 2,
        laptopOpen: Math.random() > 0.4 // some have laptops open
      });
    }

    // Quantum pulse burst on hit
    this.quantumBurst = 0;
    // Glitch scanline on heavy hit
    this.glitchLines = [];
  }

  initPrebakedLayers() {
    if (typeof document === 'undefined') return;
    this.farTowersCanvas = document.createElement('canvas');
    this.farTowersCanvas.width = 1600;
    this.farTowersCanvas.height = 640;
    const bCtx = this.farTowersCanvas.getContext('2d');

    bCtx.fillStyle = '#110424';
    for (let i = -1; i < 11; i++) {
      const tx = (i + 1) * 160;
      bCtx.fillRect(tx + 20, 40, 100, 500);
      bCtx.fillStyle = '#2d0a54';
      for (let w = 0; w < 4; w++) {
        for (let h = 0; h < 12; h++) {
          bCtx.fillRect(tx + 28 + w * 22, 60 + h * 35, 14, 18);
        }
      }
      // Glowing rack LED indicators (baked in, dim)
      bCtx.fillStyle = '#00e5ff18';
      for (let h = 0; h < 12; h++) {
        bCtx.fillRect(tx + 22, 62 + h * 35, 6, 4);
      }
      bCtx.fillStyle = '#110424';
    }
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

  update(dt, fighters = [], particles = null, sound = null) {
    super.update(dt, fighters, particles, sound);

    // Decay crowd cheer
    this.crowdCheerLevel = Math.max(0, this.crowdCheerLevel - 0.012);
    this.quantumBurst = Math.max(0, this.quantumBurst - 0.05);

    // Update hacker spectators
    for (const hs of this.hackerSpectators) {
      hs.flashTimer++;
      const flashRate = 60 + (1 - this.crowdCheerLevel) * 70;
      if (hs.flashTimer > flashRate + Math.random() * 50) {
        hs.flashAlpha = 0.85;
        hs.flashTimer = 0;
      }
      hs.flashAlpha = Math.max(0, hs.flashAlpha - 0.08);
    }

    // Decay glitch lines
    for (let i = this.glitchLines.length - 1; i >= 0; i--) {
      this.glitchLines[i].alpha -= 0.15;
      if (this.glitchLines[i].alpha <= 0) this.glitchLines.splice(i, 1);
    }
  }

  onFighterHit(x, y, isHeavy = false) {
    super.onFighterHit(x, y, isHeavy);

    this.crowdCheerLevel = Math.min(1, this.crowdCheerLevel + (isHeavy ? 0.7 : 0.3));
    this.quantumBurst = isHeavy ? 1.0 : 0.55;

    // Trigger hacker phone flashes
    const flashCount = isHeavy ? 8 : 4;
    for (let i = 0; i < flashCount; i++) {
      const hs = this.hackerSpectators[Math.floor(Math.random() * this.hackerSpectators.length)];
      if (hs) { hs.flashAlpha = 1.0; hs.flashTimer = 0; }
    }

    // Add glitch scanlines on heavy hit
    if (isHeavy) {
      for (let i = 0; i < 5; i++) {
        this.glitchLines.push({
          y: 100 + Math.random() * 440,
          alpha: 0.6 + Math.random() * 0.3,
          color: Math.random() > 0.5 ? '#00e5ff' : '#d500f9',
          width: 40 + Math.random() * 200,
          x: Math.random() * 960
        });
      }
    }
  }

  renderBackground(ctx, camera = { x: 0, y: 0, scale: 1 }) {
    const camX = camera.x || 0;
    const t = this.time;
    const breathing = (Math.sin(t * 2.5) + 1) / 2; // 0 to 1 breathing pulse

    // 1. Deep Cybernetic Void Sky (Cached)
    if (!this._voidGrad) {
      this._voidGrad = ctx.createLinearGradient(0, 0, 0, 640);
      this._voidGrad.addColorStop(0, '#0a0217');
      this._voidGrad.addColorStop(0.45, '#16052e');
      this._voidGrad.addColorStop(0.8, '#26094a');
      this._voidGrad.addColorStop(1, '#06010f');
    }
    ctx.fillStyle = this._voidGrad;
    ctx.fillRect(0, 0, 960, 640);

    // Depth fog over far zone
    if (!this._fogGrad) {
      this._fogGrad = ctx.createLinearGradient(0, 0, 0, 350);
      this._fogGrad.addColorStop(0, 'rgba(10, 2, 23, 0.8)');
      this._fogGrad.addColorStop(0.7, 'rgba(10, 2, 23, 0.2)');
      this._fogGrad.addColorStop(1, 'rgba(10, 2, 23, 0)');
    }
    ctx.fillStyle = this._fogGrad;
    ctx.fillRect(0, 0, 960, 350);

    // 2. Far Background: Distant Monolithic Server Towers (Z = -400, Parallax 0.1)
    const farOffsetX = -camX * 0.1;
    ctx.save();
    ctx.translate(farOffsetX, 0);
    if (this.farTowersCanvas) {
      ctx.drawImage(this.farTowersCanvas, -160, 0);
    } else {
      ctx.fillStyle = '#110424';
      for (let i = -1; i < 9; i++) {
        const tx = i * 160;
        ctx.fillRect(tx + 20, 40, 100, 500);
      }
    }
    // Animated rack indicator lights (high quality only)
    if (this.qualityTier === 'high') {
      ctx.globalCompositeOperation = 'screen';
      for (let i = -1; i < 9; i++) {
        const tx = i * 160;
        for (let h = 0; h < 8; h++) {
          const blinkAlpha = Math.sin(t * 4 + i * 2.3 + h * 1.1) > 0 ? 0.6 : 0.15;
          const blinkColor = h % 2 === 0 ? '#00e5ff' : '#d500f9';
          ctx.fillStyle = `${blinkColor}`;
          ctx.globalAlpha = blinkAlpha;
          ctx.fillRect(tx + 22, 62 + h * 35, 6, 4);
        }
      }
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();

    // Central Distant Giant Planetoid / Ring Structure (Cached gradient)
    const planetX = 480;
    if (!this._planetGrad) {
      this._planetGrad = ctx.createRadialGradient(planetX, 180, 20, planetX, 180, 140);
      this._planetGrad.addColorStop(0, 'rgba(213, 0, 249, 1.0)');
      this._planetGrad.addColorStop(0.7, 'rgba(106, 0, 125, 0.25)');
      this._planetGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    }
    ctx.save();
    ctx.globalAlpha = 0.4 + breathing * 0.2 + this.quantumBurst * 0.3;
    ctx.fillStyle = this._planetGrad;
    ctx.beginPath();
    ctx.arc(planetX, 180, 140, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Cascading Vertical Data Streams (Z = -200, Parallax 0.3)
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
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    // Hackathon student engineers on catwalks above server racks (Z = -100, Parallax 0.25)
    if (this.qualityTier !== 'low') {
      const hackOffsetX = -camX * 0.25;
      ctx.save();
      ctx.translate(hackOffsetX, 0);

      // Catwalk rail
      ctx.strokeStyle = '#2a0852';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 300); ctx.lineTo(960, 300);
      ctx.stroke();
      ctx.strokeStyle = '#d500f933';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Student silhouettes
      ctx.fillStyle = '#0d0320';
      for (const hs of this.hackerSpectators) {
        const bob = Math.sin(t * (2.5 + this.crowdCheerLevel * 3) + hs.bob) * (1.5 + this.crowdCheerLevel * 4);
        ctx.beginPath();
        ctx.arc(hs.x, 292 + bob, 5, 0, Math.PI * 2); // head
        ctx.fill();
        ctx.fillRect(hs.x - 4, 297 + bob, 8, 12); // torso

        // Laptop glow
        if (hs.laptopOpen) {
          ctx.fillStyle = '#00e5ff22';
          ctx.fillRect(hs.x - 6, 306 + bob, 12, 6);
          ctx.fillStyle = '#0d0320';
        }
      }

      // Phone screen glows from hacker crowd
      ctx.globalCompositeOperation = 'screen';
      for (const hs of this.hackerSpectators) {
        if (hs.flashAlpha > 0.05) {
          ctx.globalAlpha = hs.flashAlpha * 0.8;
          ctx.fillStyle = '#c0e0ff';
          ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 8;
          const bob = Math.sin(t * 2.5 + hs.bob) * 1.5;
          ctx.beginPath();
          ctx.arc(hs.x, 294 + bob, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    }

    // 4. Central Overhead Quantum Server Manifold with Energy Beam (Z = -80, Parallax 0.65)
    const manifoldOffsetX = -camX * 0.65;
    ctx.save();
    ctx.translate(manifoldOffsetX, 0);

    // Overhead Hanging Cylindrical Manifold
    ctx.fillStyle = '#1c0836';
    ctx.strokeStyle = '#d500f9';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#d500f9';
    ctx.shadowBlur = 12 + this.quantumBurst * 20;
    ctx.fillRect(360, 0, 240, 70);
    ctx.strokeRect(360, 0, 240, 70);

    // Glowing Concentric Reactor Rings
    for (let r = 0; r < 3; r++) {
      ctx.strokeStyle = r % 2 === 0 ? '#00e5ff' : '#d500f9';
      ctx.lineWidth = 2;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 8 + this.quantumBurst * 12;
      ctx.beginPath();
      ctx.ellipse(480, 70 + r * 15, 90 - r * 15, 20 - r * 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Direct Vertical Quantum Laser Beam down to Playable Platform
    ctx.globalCompositeOperation = 'screen';
    const beamGrad = ctx.createLinearGradient(460, 70, 500, 70);
    beamGrad.addColorStop(0, 'rgba(0, 229, 255, 0.1)');
    beamGrad.addColorStop(0.5, `rgba(0, 240, 255, ${0.45 + breathing * 0.3 + this.quantumBurst * 0.4})`);
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

    // 6. Glitch scanlines on heavy hit
    if (this.glitchLines.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (const gl of this.glitchLines) {
        ctx.globalAlpha = gl.alpha;
        ctx.fillStyle = gl.color;
        ctx.fillRect(gl.x, gl.y, gl.width, 2);
      }
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    }

    // 7. The Primary Floating Circuit Dais & Playable Floor (Z = 0, Parallax 1.0)
    this.renderFloatingFloor(ctx, camX, t, breathing);
  }

  renderFloatingFloor(ctx, camX, time, breathing) {
    const gy = this.groundY; // 535

    // Platform Base Underbelly (Floating in dark void - Cached)
    if (!this._baseGrad) {
      this._baseGrad = ctx.createLinearGradient(0, gy, 0, 640);
      this._baseGrad.addColorStop(0, '#1a0633');
      this._baseGrad.addColorStop(0.35, '#0e031c');
      this._baseGrad.addColorStop(1, 'rgba(2, 0, 6, 0.0)');
    }
    ctx.fillStyle = this._baseGrad;
    ctx.fillRect(80, gy, 800, 640 - gy);

    // Glowing Platform Edge Rim Line (Cyan & Magenta dual rim)
    ctx.save();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 16 + this.quantumBurst * 22;
    ctx.beginPath();
    ctx.moveTo(80, gy);
    ctx.lineTo(880, gy);
    ctx.stroke();

    // Under-Platform Energy Core Glow
    ctx.strokeStyle = '#d500f9';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#d500f9';
    ctx.shadowBlur = 10 + this.quantumBurst * 16;
    ctx.beginPath();
    ctx.moveTo(110, gy + 22);
    ctx.lineTo(850, gy + 22);
    ctx.stroke();
    ctx.restore();

    // Circular Concentric Floor Circuit Traces (breathing + hit pulse)
    const circuitAlpha = 0.2 + breathing * 0.25 + this.quantumBurst * 0.35;
    ctx.save();
    ctx.strokeStyle = `rgba(0, 240, 255, ${circuitAlpha})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8 + this.quantumBurst * 14;
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

    // Floor Perspective Grid
    ctx.save();
    ctx.strokeStyle = `rgba(0, 240, 255, 0.06)`;
    ctx.lineWidth = 1;
    const vp = 480;
    for (let x = 80; x <= 880; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x - camX * 0.08, gy);
      const bx = vp + (x - vp) * 1.35 - camX * 0.03;
      ctx.lineTo(bx, 640);
      ctx.stroke();
    }
    let rowY = gy + 8;
    let rowGap = 5;
    while (rowY < 640) {
      ctx.beginPath(); ctx.moveTo(80, rowY); ctx.lineTo(880, rowY); ctx.stroke();
      rowGap = Math.min(rowGap + 2, 28);
      rowY += rowGap;
    }
    ctx.restore();

    // Floor Boundary Laser Pylons (arena markers)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 18 + this.quantumBurst * 20;
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
