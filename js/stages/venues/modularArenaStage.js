/**
 * The Modular Arena — Venue Stage Implementation
 * Hex floor panels that raise and lower between rounds to reconfigure the layout,
 * surrounded by stadium tiers, broadcast rigs, and overhead LED screens.
 * @module stages/venues/modularArenaStage
 */

import { StageBase } from '../stageBase.js';
import { MODULAR_ARENA_CONFIG } from '../configs/modularArena.config.js';
import { CharacterSyncLayer } from '../characterSync.js';

export class ModularArenaStage extends StageBase {
  constructor() {
    super(MODULAR_ARENA_CONFIG);

    // Modular Hex Panel States (6 floor zones)
    this.panelOffsets = [0, 0, 0, 0, 0, 0];
    this.targetOffsets = [0, 0, 0, 0, 0, 0];
    this.isReconfiguring = false;
    this.reconfigureTimer = 0;

    // Stadium flash & camera sparks
    this.ambientParticles = [];
    const pCount = this.qualityTier === 'high' ? 40 : 20;
    for (let i = 0; i < pCount; i++) {
      this.ambientParticles.push({
        x: Math.random() * 1200,
        y: 120 + Math.random() * 280,
        flashTimer: Math.random() * 100,
        alpha: 0
      });
    }
  }

  onRoundTransition(newRound) {
    super.onRoundTransition(newRound);
    this.isReconfiguring = true;
    this.reconfigureTimer = 70; // ~1.1s hydraulic reconfiguration

    // Reconfigure target panel visual depths based on round
    if (newRound === 2) {
      // Round 2: Elevated Center Ring
      this.targetOffsets = [-12, -4, 16, 16, -4, -12];
    } else if (newRound >= 3) {
      // Round 3 (Final): Stepped Trench Formation
      this.targetOffsets = [14, -8, -14, -14, -8, 14];
    } else {
      // Round 1: Standard Flat Arena
      this.targetOffsets = [0, 0, 0, 0, 0, 0];
    }
  }

  update(dt, fighters = [], particles = null, sound = null) {
    super.update(dt, fighters, particles, sound);

    // Smooth pneumatic hydraulic lerp for panels
    for (let i = 0; i < this.panelOffsets.length; i++) {
      this.panelOffsets[i] += (this.targetOffsets[i] - this.panelOffsets[i]) * 0.08;
    }

    if (this.reconfigureTimer > 0) {
      this.reconfigureTimer--;
      if (this.reconfigureTimer <= 0) {
        this.isReconfiguring = false;
      }
    }

    // Camera flash updates in crowd
    for (const p of this.ambientParticles) {
      p.flashTimer++;
      if (p.flashTimer > 90 + Math.random() * 60) {
        p.alpha = 0.9;
        p.flashTimer = 0;
      }
      p.alpha = Math.max(0, p.alpha - 0.15);
    }
  }

  renderBackground(ctx, camera = { x: 0, y: 0, scale: 1 }) {
    const camX = camera.x || 0;
    const t = this.time;

    // 1. Stadium Interior Dome Atmosphere (Cached)
    if (!this._domeGrad) {
      this._domeGrad = ctx.createLinearGradient(0, 0, 0, 640);
      this._domeGrad.addColorStop(0, '#060c18');
      this._domeGrad.addColorStop(0.4, '#10192b');
      this._domeGrad.addColorStop(0.8, '#1e2c47');
      this._domeGrad.addColorStop(1, '#090f1a');
    }
    ctx.fillStyle = this._domeGrad;
    ctx.fillRect(0, 0, 960, 640);

    // 2. Far Background: Tiered Stadium Grandstands (Z = -400, Parallax 0.1)
    const farOffsetX = -camX * 0.1;
    ctx.save();
    ctx.translate(farOffsetX, 0);

    // Grandstand seating tiers
    for (let tier = 0; tier < 4; tier++) {
      const ty = 100 + tier * 55;
      ctx.fillStyle = '#0a1426';
      ctx.fillRect(-100, ty, 1200, 45);

      // Cyan LED Edge Strip
      ctx.strokeStyle = '#00e5ff44';
      ctx.lineWidth = 2;
      ctx.strokeRect(-100, ty + 43, 1200, 2);

      // Cheering Crowd Silhouettes
      ctx.fillStyle = '#060d19';
      for (let s = -4; s < 40; s++) {
        const sx = s * 28;
        const bob = Math.sin(t * 4 + s * 0.8) * 2;
        ctx.beginPath();
        ctx.arc(sx, ty + 22 + bob, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Camera Flash Flashes in Grandstand
    ctx.fillStyle = '#ffffff';
    for (const p of this.ambientParticles) {
      if (p.alpha > 0.05) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();

    // 3. Central Overhead Jumbotron Screens (Z = -180, Parallax 0.3)
    const jumboOffsetX = -camX * 0.3;
    ctx.save();
    ctx.translate(jumboOffsetX, 0);

    // Jumbotron Rig Chassis
    ctx.fillStyle = '#0c1524';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 14;
    ctx.fillRect(320, 20, 320, 100);
    ctx.strokeRect(320, 20, 320, 100);

    // Active Match Broadcast Screen (Live waveform & Round Indicator)
    ctx.fillStyle = '#040812';
    ctx.fillRect(328, 28, 304, 84);

    ctx.fillStyle = '#00e5ff';
    ctx.font = '900 13px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`ARENA // ROUND ${this.currentRound}`, 480, 52);

    // Animated Audio Waveform inside Jumbotron
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let w = 0; w < 24; w++) {
      const wx = 350 + w * 11;
      const wy = 80 + Math.sin(t * 7 + w * 0.6) * 14;
      if (w === 0) ctx.moveTo(wx, wy);
      else ctx.lineTo(wx, wy);
    }
    ctx.stroke();
    ctx.restore();

    // 4. Midground Perimeter Pneumatic Walls & Hazard Barricades (Z = -80, Parallax 0.6)
    const wallOffsetX = -camX * 0.6;
    ctx.save();
    ctx.translate(wallOffsetX, 0);
    ctx.fillStyle = '#e0e6ed';
    ctx.fillRect(100, 420, 140, 90);
    ctx.fillRect(720, 420, 140, 90);
    ctx.strokeStyle = '#00e5ff88';
    ctx.lineWidth = 2;
    ctx.strokeRect(100, 420, 140, 90);
    ctx.strokeRect(720, 420, 140, 90);

    // Hazard Stripes on Lower Wall Lip
    ctx.fillStyle = '#ff9100';
    for (let h = 0; h < 6; h++) {
      ctx.fillRect(110 + h * 20, 500, 10, 8);
      ctx.fillRect(730 + h * 20, 500, 10, 8);
    }
    ctx.restore();

    // 5. Reconfigurable Modular Hex Panel Playable Floor (Z = 0, Parallax 1.0)
    this.renderModularFloor(ctx, camX, t);
  }

  renderModularFloor(ctx, camX, time) {
    const gy = this.groundY; // 535
    const zoneWidth = 160;

    // Render 6 Reconfigurable Modular Zones
    if (!this._panelGrad) {
      this._panelGrad = ctx.createLinearGradient(0, 0, 0, 140);
      this._panelGrad.addColorStop(0, '#eaf0f7');
      this._panelGrad.addColorStop(0.2, '#cdd8e5');
      this._panelGrad.addColorStop(1, '#1b2536');
    }

    for (let z = 0; z < 6; z++) {
      const zx = z * zoneWidth;
      const offset = this.panelOffsets[z] || 0;
      const panelY = gy - offset;

      // High-Gloss White/Grey Composite Ceramic Plate (Cached gradient)
      ctx.save();
      ctx.translate(0, panelY);
      ctx.fillStyle = this._panelGrad;
      ctx.fillRect(zx, 0, zoneWidth - 4, 640 - panelY);
      ctx.restore();

      // Hydraulic Pneumatic Side Bevel (if panel is raised)
      if (offset > 2) {
        ctx.fillStyle = '#0a101d';
        ctx.fillRect(zx, gy, zoneWidth - 4, offset);
      }

      // Panel Perimeter Cyan LED Seam
      ctx.save();
      const isAmberWarning = this.isReconfiguring && (Math.sin(time * 12) > 0);
      ctx.strokeStyle = isAmberWarning ? '#ff9100' : '#00e5ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = isAmberWarning ? 16 : 8;
      ctx.strokeRect(zx, panelY, zoneWidth - 4, 640 - panelY);

      // Inner Hex Ring Motif
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let s = 0; s < 6; s++) {
        const a = (s / 6) * Math.PI * 2;
        const px = zx + zoneWidth / 2 + Math.cos(a) * 35;
        const py = panelY + 28 + Math.sin(a) * 12;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  renderForeground(ctx, camera = { x: 0, y: 0, scale: 1 }, fighters = []) {
    const camX = camera.x || 0;

    // Robotic Broadcast Camera Crane Rig at Bottom Corner (Z = +150, Parallax 1.35)
    const craneX = 110;
    const craneAlpha = CharacterSyncLayer.getOcclusionAlpha(craneX, 90, fighters, 0.85);

    ctx.save();
    ctx.globalAlpha = craneAlpha;
    ctx.translate(-camX * 1.35, 0);

    // Crane Base & Arm
    ctx.fillStyle = '#08111e';
    ctx.strokeStyle = '#00e5ff88';
    ctx.lineWidth = 3;
    ctx.fillRect(craneX - 30, 520, 60, 120);
    ctx.strokeRect(craneX - 30, 520, 60, 120);

    // Red Recording Tally Light
    ctx.fillStyle = (Math.sin(this.time * 5) > 0) ? '#ff0055' : '#880022';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(craneX, 535, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
