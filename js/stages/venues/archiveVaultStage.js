/**
 * The Archive Vault — Venue Stage Implementation
 * One fighting floor that shifts across three eras (medieval, industrial, digital wireframe)
 * between rounds. Depth sets and character lighting dynamically morph with each era.
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
    const pCount = this.qualityTier === 'high' ? 45 : 20;
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
  }

  renderBackground(ctx, camera = { x: 0, y: 0, scale: 1 }) {
    const camX = camera.x || 0;
    const t = this.time;
    const era = this.activeEra;

    // 1. Atmosphere Gradient (Morphed by active era - Cached)
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

    // 2. Far Background Architecture (Z = -450, Parallax 0.1)
    const farOffsetX = -camX * 0.1;
    ctx.save();
    ctx.translate(farOffsetX, 0);

    if (era === 1) {
      // Distant Mountain Castles & Waterfall Spires
      ctx.fillStyle = '#1c0c08';
      ctx.fillRect(180, 80, 160, 440);
      ctx.fillRect(620, 60, 180, 460);
      // Mountain Silhouette in Center
      ctx.beginPath();
      ctx.moveTo(340, 520);
      ctx.lineTo(480, 120);
      ctx.lineTo(620, 520);
      ctx.fill();
    } else if (era === 2) {
      // Towering Blast Furnace & Iron Stacks
      ctx.fillStyle = '#170905';
      ctx.fillRect(380, 40, 200, 480);
      // Molten Cascade Stream down center
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = '#ff5500';
      ctx.shadowColor = '#ff3300';
      ctx.shadowBlur = 18;
      ctx.fillRect(470, 70, 20, 450);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      // Cyber Digital Wireframe Castle Matrix
      ctx.strokeStyle = '#00e5ff66';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        ctx.strokeRect(180 + i * 110, 80, 80, 440);
      }
    }
    ctx.restore();

    // 3. Midground Era Structures (Z = -150, Parallax 0.38)
    const midOffsetX = -camX * 0.38;
    ctx.save();
    ctx.translate(midOffsetX, 0);

    if (era === 1) {
      // High Stone Masonry Arches & Red Heraldic Banners
      ctx.fillStyle = '#26140d';
      ctx.fillRect(120, 180, 80, 350);
      ctx.fillRect(760, 180, 80, 350);
      ctx.beginPath();
      ctx.arc(480, 240, 280, Math.PI, 0);
      ctx.lineWidth = 26;
      ctx.strokeStyle = '#26140d';
      ctx.stroke();

      // Crimson Hanging Tapestries
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
    } else {
      // Glowing Cyan Holographic Voxel Blocks
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      for (let v = 0; v < 5; v++) {
        ctx.strokeRect(160 + v * 150, 200 + (v % 2) * 40, 50, 50);
      }
    }
    ctx.restore();

    // 4. Ambient Torch / Molten Sparks
    ctx.save();
    for (const p of this.ambientParticles) {
      ctx.fillStyle = era === 3 ? `rgba(0, 240, 255, ${p.alpha})` : `rgba(255, 120, 20, ${p.alpha})`;
      ctx.shadowColor = era === 3 ? '#00e5ff' : '#ff5500';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x - camX * 0.6, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 5. Central Combat Dais & Playable Floor (Z = 0, Parallax 1.0)
    this.renderDaisFloor(ctx, camX, t, era);
  }

  renderDaisFloor(ctx, camX, time, era) {
    const gy = this.groundY; // 535

    // Base Dais Texture per Era (Cached)
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

    // Glowing Floor Rim Line
    ctx.save();
    const rimColor = era === 3 ? '#00e5ff' : (era === 2 ? '#ff5500' : '#ffd08a');
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
      // Flame Glow
      ctx.fillStyle = '#ff6a00';
      ctx.shadowColor = '#ff4500';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(leftX, 485, 12, 0, Math.PI * 2);
      ctx.fill();
    } else if (era === 2) {
      // Iron Safety Truss Railing
      ctx.strokeStyle = '#2b1208';
      ctx.lineWidth = 5;
      ctx.strokeRect(leftX - 20, 480, 40, 160);
    } else {
      // Digital Wireframe Voxel Node
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 8;
      ctx.strokeRect(leftX - 20, 490, 40, 40);
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
      ctx.shadowColor = '#ff4500';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(rightX, 485, 12, 0, Math.PI * 2);
      ctx.fill();
    } else if (era === 2) {
      ctx.strokeStyle = '#2b1208';
      ctx.lineWidth = 5;
      ctx.strokeRect(rightX - 20, 480, 40, 160);
    } else {
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 8;
      ctx.strokeRect(rightX - 20, 490, 40, 40);
    }
    ctx.restore();
  }
}
