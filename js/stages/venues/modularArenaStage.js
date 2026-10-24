/**
 * The Modular Arena — Venue Stage Implementation
 * Hex floor panels that raise and lower between rounds to reconfigure the layout,
 * surrounded by stadium tiers, broadcast rigs, and overhead LED screens.
 * Enhanced: Dense SRM student stadium audience, reactive crowd wave, confetti burst
 *           on heavy hits, richer camera-flash density, enhanced 3D perspective floor,
 *           holographic fighter stats on Jumbotron, combat energy flares.
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

    // Stadium camera flash sparks
    this.ambientParticles = [];
    const pCount = this.qualityTier === 'high' ? 40 : (this.qualityTier === 'medium' ? 20 : 8);
    for (let i = 0; i < pCount; i++) {
      this.ambientParticles.push({
        x: Math.random() * 1200,
        y: 120 + Math.random() * 280,
        flashTimer: Math.random() * 100,
        alpha: 0
      });
    }

    // Crowd cheer state
    this.crowdCheerLevel = 0;

    // Crowd wave — animated sweep across grandstands on hit
    this.wavePos = -1;
    this.waveActive = false;

    // Confetti burst particles
    this.confetti = [];

    // Combat energy flare on the floor (circular shockwave)
    this.shockwaves = [];

    // Dense student crowd per tier — pre-computed positions
    this.tierCrowds = [];
    const crowdPerTier = this.qualityTier === 'high' ? 38 : (this.qualityTier === 'medium' ? 22 : 10);
    for (let tier = 0; tier < 4; tier++) {
      const row = [];
      for (let i = 0; i < crowdPerTier; i++) {
        row.push({
          x: -80 + i * 30,
          bob: Math.random() * Math.PI * 2,
          speed: 3 + Math.random() * 2,
          wavePhase: i,
          armUp: false
        });
      }
      this.tierCrowds.push(row);
    }
  }

  onRoundTransition(newRound) {
    super.onRoundTransition(newRound);
    this.isReconfiguring = true;
    this.reconfigureTimer = 70; // ~1.1s hydraulic reconfiguration

    if (newRound === 2) {
      this.targetOffsets = [-12, -4, 16, 16, -4, -12];
    } else if (newRound >= 3) {
      this.targetOffsets = [14, -8, -14, -14, -8, 14];
    } else {
      this.targetOffsets = [0, 0, 0, 0, 0, 0];
    }
  }

  update(dt, fighters = [], particles = null, sound = null) {
    super.update(dt, fighters, particles, sound);

    // Smooth hydraulic lerp for panels
    for (let i = 0; i < this.panelOffsets.length; i++) {
      this.panelOffsets[i] += (this.targetOffsets[i] - this.panelOffsets[i]) * 0.08;
    }

    if (this.reconfigureTimer > 0) {
      this.reconfigureTimer--;
      if (this.reconfigureTimer <= 0) this.isReconfiguring = false;
    }

    // Decay crowd cheer
    this.crowdCheerLevel = Math.max(0, this.crowdCheerLevel - 0.014);

    // Camera flash updates
    for (const p of this.ambientParticles) {
      p.flashTimer++;
      const flashRate = 50 + (1 - this.crowdCheerLevel) * 90;
      if (p.flashTimer > flashRate + Math.random() * 60) {
        p.alpha = 0.9;
        p.flashTimer = 0;
      }
      p.alpha = Math.max(0, p.alpha - 0.15);
    }

    // Advance crowd wave
    if (this.waveActive) {
      this.wavePos += 0.4;
      if (this.wavePos > 45) { this.waveActive = false; this.wavePos = -1; }
    }

    // Update confetti
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.x += c.vx;
      c.y += c.vy;
      c.vy += 0.15; // gravity
      c.vx *= 0.98;
      c.alpha -= 0.012;
      c.rot += c.rotV;
      if (c.alpha <= 0 || c.y > 680) this.confetti.splice(i, 1);
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += 5;
      sw.alpha -= 0.055;
      if (sw.alpha <= 0) this.shockwaves.splice(i, 1);
    }
  }

  onFighterHit(x, y, isHeavy = false) {
    super.onFighterHit(x, y, isHeavy);

    this.crowdCheerLevel = Math.min(1, this.crowdCheerLevel + (isHeavy ? 0.65 : 0.28));

    // Trigger crowd wave
    if (isHeavy) {
      this.waveActive = true;
      this.wavePos = 0;
    }

    // Mass camera flash
    const flashCount = isHeavy ? 14 : 6;
    for (let i = 0; i < flashCount; i++) {
      const p = this.ambientParticles[Math.floor(Math.random() * this.ambientParticles.length)];
      if (p) { p.alpha = 0.95; p.flashTimer = 0; }
    }

    // Confetti burst on heavy
    if (isHeavy && this.qualityTier !== 'low') {
      const confettiColors = ['#00e5ff', '#ff007f', '#ffd600', '#ffffff', '#ff9100'];
      for (let i = 0; i < 28; i++) {
        this.confetti.push({
          x: x + (Math.random() - 0.5) * 80,
          y: this.groundY - 60,
          vx: (Math.random() - 0.5) * 6,
          vy: -5 - Math.random() * 5,
          color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
          alpha: 0.9,
          rot: Math.random() * Math.PI * 2,
          rotV: (Math.random() - 0.5) * 0.25,
          w: 5 + Math.random() * 5,
          h: 3 + Math.random() * 3
        });
      }
    }

    // Shockwave on floor
    this.shockwaves.push({ x, radius: 10, alpha: isHeavy ? 0.8 : 0.5, isHeavy });
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

    // Depth fog — ceiling haze to push far tiers back
    if (!this._fogGrad) {
      this._fogGrad = ctx.createLinearGradient(0, 0, 0, 320);
      this._fogGrad.addColorStop(0, 'rgba(6, 12, 24, 0.8)');
      this._fogGrad.addColorStop(0.6, 'rgba(6, 12, 24, 0.25)');
      this._fogGrad.addColorStop(1, 'rgba(6, 12, 24, 0)');
    }
    ctx.fillStyle = this._fogGrad;
    ctx.fillRect(0, 0, 960, 320);

    // 2. Far Background: Tiered Stadium Grandstands with Dense SRM Crowd (Z = -400, Parallax 0.1)
    const farOffsetX = -camX * 0.1;
    ctx.save();
    ctx.translate(farOffsetX, 0);

    for (let tier = 0; tier < 4; tier++) {
      const ty = 100 + tier * 55;
      ctx.fillStyle = '#0a1426';
      ctx.fillRect(-100, ty, 1200, 45);

      // LED Edge Strip
      ctx.strokeStyle = '#00e5ff44';
      ctx.lineWidth = 2;
      ctx.strokeRect(-100, ty + 43, 1200, 2);

      // Dense Cheering Student Crowd Silhouettes with crowd wave
      ctx.fillStyle = '#060d19';
      ctx.beginPath();
      const crowd = this.tierCrowds[tier];
      for (const s of crowd) {
        const waveBonus = this.waveActive
          ? Math.max(0, 1 - Math.abs(s.wavePhase - this.wavePos) / 4) * 10
          : 0;
        const bob = Math.sin(t * s.speed + s.bob) * (2 + this.crowdCheerLevel * 5) - waveBonus;
        ctx.moveTo(s.x + 6, ty + 22 + bob);
        ctx.arc(s.x, ty + 22 + bob, 5, 0, Math.PI * 2);
        ctx.rect(s.x - 4, ty + 27 + bob, 8, 12);
        // Arms raised during wave or high cheer
        if (waveBonus > 2 || this.crowdCheerLevel > 0.4) {
          ctx.rect(s.x - 8, ty + 18 + bob, 4, 2);
          ctx.rect(s.x + 4, ty + 18 + bob, 4, 2);
        }
      }
      ctx.fill();

      // SRM colour banners on tier rails
      if (this.qualityTier !== 'low' && tier < 2) {
        const bannerColors = ['#00e5ff', '#ffffff', '#ffd600', '#ff007f'];
        for (let b = 0; b < 5; b++) {
          const bx = -40 + b * 220;
          const bc = bannerColors[b % bannerColors.length];
          ctx.fillStyle = bc;
          ctx.shadowColor = bc; ctx.shadowBlur = 5;
          ctx.fillRect(bx, ty + 43, 28, 42);
          ctx.fillStyle = '#00000033';
          ctx.fillRect(bx + 6, ty + 50, 16, 2);
          ctx.fillRect(bx + 6, ty + 56, 16, 2);
        }
        ctx.shadowBlur = 0;
      }
    }

    // Camera Flash Flashes in Grandstand
    ctx.globalCompositeOperation = 'screen';
    for (const p of this.ambientParticles) {
      if (p.alpha > 0.05) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 12;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    // 3. Central Overhead Jumbotron Screens (Z = -180, Parallax 0.3)
    const jumboOffsetX = -camX * 0.3;
    ctx.save();
    ctx.translate(jumboOffsetX, 0);

    // Jumbotron Rig Chassis
    ctx.fillStyle = '#0c1524';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 14;
    ctx.fillRect(320, 20, 320, 100);
    ctx.strokeRect(320, 20, 320, 100);

    // Active Match Broadcast Screen
    ctx.fillStyle = '#040812';
    ctx.fillRect(328, 28, 304, 84);
    ctx.fillStyle = '#00e5ff';
    ctx.font = '900 13px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`ARENA // ROUND ${this.currentRound}`, 480, 52);

    // Cheer intensity bar
    ctx.fillStyle = '#00e5ff33';
    ctx.fillRect(350, 58, 260, 8);
    ctx.fillStyle = this.crowdCheerLevel > 0.7 ? '#ff9100' : '#00e5ff';
    ctx.fillRect(350, 58, 260 * this.crowdCheerLevel, 8);

    // Animated Audio Waveform inside Jumbotron — more energetic on crowd high
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const amp = 14 + this.crowdCheerLevel * 14;
    for (let w = 0; w < 24; w++) {
      const wx = 350 + w * 11;
      const wy = 80 + Math.sin(t * 7 + w * 0.6) * amp;
      if (w === 0) ctx.moveTo(wx, wy);
      else ctx.lineTo(wx, wy);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
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

    // Hazard Stripes
    ctx.fillStyle = '#ff9100';
    for (let h = 0; h < 6; h++) {
      ctx.fillRect(110 + h * 20, 500, 10, 8);
      ctx.fillRect(730 + h * 20, 500, 10, 8);
    }
    ctx.restore();

    // 5. Confetti particles
    if (this.confetti.length > 0) {
      ctx.save();
      for (const c of this.confetti) {
        ctx.save();
        ctx.globalAlpha = c.alpha;
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot);
        ctx.fillStyle = c.color;
        ctx.shadowColor = c.color; ctx.shadowBlur = 4;
        ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        ctx.restore();
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // 6. Reconfigurable Modular Hex Panel Playable Floor (Z = 0, Parallax 1.0)
    this.renderModularFloor(ctx, camX, t);
  }

  renderModularFloor(ctx, camX, time) {
    const gy = this.groundY; // 535
    const zoneWidth = 160;

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

      // High-Gloss Composite Plate
      ctx.save();
      ctx.translate(0, panelY);
      ctx.fillStyle = this._panelGrad;
      ctx.fillRect(zx, 0, zoneWidth - 4, 640 - panelY);
      ctx.restore();

      // Hydraulic Bevel
      if (offset > 2) {
        ctx.fillStyle = '#0a101d';
        ctx.fillRect(zx, gy, zoneWidth - 4, offset);
      }

      // Panel LED Seam & Hex Motif
      ctx.save();
      const isAmberWarning = this.isReconfiguring && (Math.sin(time * 12) > 0);
      ctx.strokeStyle = isAmberWarning ? '#ff9100' : '#00e5ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = isAmberWarning ? 16 : 8;
      ctx.strokeRect(zx, panelY, zoneWidth - 4, 640 - panelY);

      // Hex ring motif
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

      // Perspective grid lines on each panel
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.06)';
      ctx.lineWidth = 1;
      const panelVP = zx + zoneWidth / 2;
      for (let gx = zx + 16; gx < zx + zoneWidth - 4; gx += 28) {
        ctx.beginPath();
        ctx.moveTo(gx - camX * 0.05, panelY);
        const bx = panelVP + (gx - panelVP) * 1.3;
        ctx.lineTo(bx, 640);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Floor shockwaves (combat energy rings on panels)
    if (this.shockwaves.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (const sw of this.shockwaves) {
        ctx.strokeStyle = sw.isHeavy ? '#ff9100' : '#00e5ff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = sw.alpha;
        ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(sw.x, gy + 5, sw.radius * 2, sw.radius * 0.4, 0, 0, Math.PI * 2);
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
    ctx.shadowColor = '#ff0055'; ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(craneX, 535, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}
