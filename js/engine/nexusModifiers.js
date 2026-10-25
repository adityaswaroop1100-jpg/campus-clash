/**
 * Campus Clash 2D — Tech Modifier System
 * Spawns periodic Tech Pods (Cloud Backup, SSL Encryption, Edge Overclock, IoT EMP)
 * with holographic beacons, collision detection, particle explosions, and buff timers.
 * @module engine/nexusModifiers
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants.js';

export const NEXUS_POD_TYPES = {
  CLOUD_BACKUP: {
    id: 'cloud_backup',
    name: 'CLOUD BACKUP',
    domain: 'Cloud Computing',
    icon: '☁️',
    color: '#00e5ff',
    glowColor: '#00b4d8',
    duration: 0, // Instant
    description: '+25 HP System Recovery'
  },
  SSL_ENCRYPTION: {
    id: 'ssl_encryption',
    name: 'SSL ENCRYPTION',
    domain: 'Cyber Security',
    icon: '🛡️',
    color: '#ff1744',
    glowColor: '#ff5252',
    duration: 300, // 5 seconds (300 frames)
    description: '4096-Bit Super-Armor Shield'
  },
  EDGE_OVERCLOCK: {
    id: 'edge_overclock',
    name: 'EDGE OVERCLOCK',
    domain: 'Edge Computing',
    icon: '⚡',
    color: '#ffd700',
    glowColor: '#ffea00',
    duration: 360, // 6 seconds (360 frames)
    description: '+35% Speed & Zero Latency'
  },
  IOT_EMP: {
    id: 'iot_emp',
    name: 'IoT 2.4GHz EMP',
    domain: 'Internet of Things',
    icon: '📡',
    color: '#00ff41',
    glowColor: '#00e676',
    duration: 0, // Instant radial pulse
    description: 'Opponent Meter Drain & Glitch Stun'
  }
};

export class NexusPod {
  constructor(type, x, targetY) {
    this.type = type;
    this.x = x;
    this.y = -50;
    this.targetY = targetY;
    this.vy = 4.5;
    this.isLanded = false;
    this.radius = 24;
    this.active = true;
    this.life = 600; // 10 seconds before despawn
    this.animCycle = Math.random() * Math.PI * 2;
    this.beamAlpha = 1.0;
  }

  update() {
    if (!this.active) return;
    this.animCycle += 0.06;

    if (!this.isLanded) {
      this.y += this.vy;
      if (this.y >= this.targetY) {
        this.y = this.targetY;
        this.isLanded = true;
      }
    } else {
      this.life--;
      if (this.life <= 0) {
        this.active = false;
      }
    }
  }

  render(ctx) {
    if (!this.active) return;
    ctx.save();

    const hoverY = this.y + (this.isLanded ? Math.sin(this.animCycle) * 7 : 0);
    const pulse = 1.0 + Math.sin(this.animCycle * 2.5) * 0.12;
    const coreR = this.radius * pulse;
    const col = this.type.color || '#00e5ff';
    const glowCol = this.type.glowColor || '#00b4d8';
    const t = this.animCycle;

    // 1. Aerodynamic Descending Ion Contrail (while falling)
    if (!this.isLanded) {
      ctx.save();
      const trailGrad = ctx.createLinearGradient(this.x, Math.max(0, this.y - 140), this.x, hoverY);
      trailGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      trailGrad.addColorStop(0.5, `${col}33`);
      trailGrad.addColorStop(1, `${col}bb`);
      ctx.fillStyle = trailGrad;
      ctx.beginPath();
      ctx.moveTo(this.x - 8, Math.max(0, this.y - 140));
      ctx.lineTo(this.x + 8, Math.max(0, this.y - 140));
      ctx.lineTo(this.x + 16, hoverY);
      ctx.lineTo(this.x - 16, hoverY);
      ctx.closePath();
      ctx.fill();

      // Ion thrust exhaust particles
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 4; i++) {
        const py = hoverY - 20 - i * 22;
        const px = this.x + Math.sin(t * 8 + i) * 8;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 2. High-Tech Volumetric Laser Pillar & Holographic Scan Column
    if (this.isLanded || this.life > 100) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      
      // Atmospheric wide soft glow
      const wideGrad = ctx.createLinearGradient(this.x - 45, 0, this.x + 45, 0);
      wideGrad.addColorStop(0, 'rgba(0,0,0,0)');
      wideGrad.addColorStop(0.5, `${col}22`);
      wideGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = wideGrad;
      ctx.fillRect(this.x - 45, 0, 90, hoverY);

      // Core focused laser beam
      const coreGrad = ctx.createLinearGradient(this.x - 8, 0, this.x + 8, 0);
      coreGrad.addColorStop(0, `${col}44`);
      coreGrad.addColorStop(0.5, '#ffffffcc');
      coreGrad.addColorStop(1, `${col}44`);
      ctx.fillStyle = coreGrad;
      ctx.fillRect(this.x - 8, 0, 16, hoverY);

      // Downward flowing data stream packets inside laser column
      const streamY = ((t * 80) % hoverY);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(this.x - 4, streamY, 8, 22);
      const streamY2 = (((t * 80) + hoverY * 0.5) % hoverY);
      ctx.fillStyle = col;
      ctx.fillRect(this.x - 3, streamY2, 6, 16);

      // Rising upward digital micro-sparks
      for (let s = 0; s < 5; s++) {
        const sy = (hoverY - ((t * 45 + s * 70) % hoverY));
        const sx = this.x + Math.sin(t * 3 + s * 1.7) * 14;
        ctx.fillStyle = s % 2 === 0 ? '#ffffff' : col;
        ctx.fillRect(sx - 1.5, sy, 3, 3);
      }
      ctx.restore();
    }

    // 3. Ground Landing Projection Dais (when landed)
    if (this.isLanded) {
      ctx.save();
      ctx.translate(this.x, this.targetY + 16);
      ctx.scale(1, 0.38);

      // Outer radar sweep ring
      ctx.strokeStyle = `${col}77`;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = col;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, coreR * 2.2, 0, Math.PI * 2);
      ctx.stroke();

      // Pulsing inner ring
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, coreR * 1.4, 0, Math.PI * 2);
      ctx.stroke();

      // 4 Cardinal holographic ticks
      for (let a = 0; a < 4; a++) {
        const ang = (a * Math.PI / 2) + t * 0.8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * (coreR * 1.8), Math.sin(ang) * (coreR * 1.8));
        ctx.lineTo(Math.cos(ang) * (coreR * 2.5), Math.sin(ang) * (coreR * 2.5));
        ctx.stroke();
      }
      ctx.restore();
    }

    // 4. Central Hologram Quantum Tech Pod
    ctx.translate(this.x, hoverY);

    // 4a. Outer 3D Gyroscopic Gimbal Ring (slow horizontal rotation)
    ctx.save();
    ctx.rotate(t * 0.8);
    ctx.scale(1, 0.42);
    ctx.strokeStyle = `${col}bb`;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = col;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, coreR * 1.6, 0, Math.PI * 2);
    ctx.stroke();

    // Orbital Node Beads
    for (let b = 0; b < 4; b++) {
      const bAng = (b * Math.PI / 2) + t * 1.2;
      const bx = Math.cos(bAng) * coreR * 1.6;
      const by = Math.sin(bAng) * coreR * 1.6;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 4b. Inner Reverse-Spin Gyroscopic Gimbal Ring
    ctx.save();
    ctx.rotate(-t * 1.4);
    ctx.scale(0.48, 1);
    ctx.strokeStyle = `${glowCol}cc`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, coreR * 1.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 4c. Central Faceted Quantum Crystalline Core
    ctx.save();
    const radGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, coreR);
    radGrad.addColorStop(0, '#ffffff');
    radGrad.addColorStop(0.35, col);
    radGrad.addColorStop(0.75, glowCol);
    radGrad.addColorStop(1, `${col}00`);

    ctx.fillStyle = radGrad;
    ctx.shadowColor = col;
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(0, 0, coreR, 0, Math.PI * 2);
    ctx.fill();

    // Octagonal faceted crystal shell
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + t * 0.5;
      const px = Math.cos(ang) * (coreR * 0.75);
      const py = Math.sin(ang) * (coreR * 0.75);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // 4d. Tech Icon in Core Center
    ctx.font = 'bold 20px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.type.icon, 0, 1);
    ctx.restore();

    // 5. Floating Holographic Tech HUD Plaque
    ctx.save();
    const hudY = -coreR - 22;
    const tagText = `[ ${this.type.icon} ${this.type.name} ]`;

    ctx.font = '900 11px Orbitron, monospace';
    const tagW = ctx.measureText(tagText).width;
    const plateW = Math.max(140, tagW + 20);
    const plateH = 28;

    // Glass backing plate
    ctx.fillStyle = 'rgba(6, 14, 32, 0.90)';
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = col;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    // Chamfered plate
    ctx.moveTo(-plateW / 2 + 6, hudY - plateH / 2);
    ctx.lineTo(plateW / 2 - 6, hudY - plateH / 2);
    ctx.lineTo(plateW / 2, hudY - plateH / 2 + 6);
    ctx.lineTo(plateW / 2, hudY + plateH / 2 - 6);
    ctx.lineTo(plateW / 2 - 6, hudY + plateH / 2);
    ctx.lineTo(-plateW / 2 + 6, hudY + plateH / 2);
    ctx.lineTo(-plateW / 2, hudY + plateH / 2 - 6);
    ctx.lineTo(-plateW / 2, hudY - plateH / 2 + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Title Tag
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText(tagText, 0, hudY - 4);

    // Domain Subtitle chip
    ctx.font = 'bold 9px Rajdhani, monospace';
    ctx.fillStyle = col;
    ctx.fillText(this.type.description.toUpperCase(), 0, hudY + 7);

    // Remaining lifespan indicator ring around pod if landed
    if (this.isLanded && this.life < 500) {
      const lifePct = Math.max(0, this.life / 600);
      ctx.strokeStyle = lifePct > 0.3 ? col : '#ff1744';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, coreR * 1.85, -Math.PI / 2, -Math.PI / 2 + lifePct * Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
    ctx.restore();
  }
}

export class NexusModifierSystem {
  constructor() {
    this.pods = [];
    this.spawnTimer = 450; // First pod in ~7.5 seconds
    this.spawnInterval = 750; // Then every ~12.5 seconds (750 frames)
    this.typesList = Object.values(NEXUS_POD_TYPES);
    this.playerBuffs = {
      P1: { sslShield: 0, edgeOverclock: 0 },
      P2: { sslShield: 0, edgeOverclock: 0 }
    };
  }

  reset() {
    this.pods = [];
    this.spawnTimer = 400;
    this.playerBuffs = {
      P1: { sslShield: 0, edgeOverclock: 0 },
      P2: { sslShield: 0, edgeOverclock: 0 }
    };
  }

  update(p1, p2, stage, particleSystem, soundManager) {
    // 1. Update active player buffs
    for (const pid of ['P1', 'P2']) {
      const fighter = pid === 'P1' ? p1 : p2;
      const buffs = this.playerBuffs[pid];

      if (buffs.sslShield > 0) {
        buffs.sslShield--;
        fighter.invulnerableFrames = Math.max(fighter.invulnerableFrames, 2);
      }
      if (buffs.edgeOverclock > 0) {
        buffs.edgeOverclock--;
        // Overclock speed boost
        fighter.speed = (fighter.config.stats.speed || 5.2) * 1.35;
      } else {
        fighter.speed = fighter.config.stats.speed || 5.2;
      }
    }

    // 2. Spawn periodic pods
    this.spawnTimer--;
    if (this.spawnTimer <= 0) {
      this.spawnRandomPod(stage);
      this.spawnTimer = this.spawnInterval + Math.floor(Math.random() * 200);
    }

    // 3. Update active pods & detect collision
    for (let i = this.pods.length - 1; i >= 0; i--) {
      const pod = this.pods[i];
      pod.update();

      if (!pod.active) {
        this.pods.splice(i, 1);
        continue;
      }

      // Check collision with both fighters
      for (const pid of ['P1', 'P2']) {
        const fighter = pid === 'P1' ? p1 : p2;
        const opponent = pid === 'P1' ? p2 : p1;

        const dx = fighter.x - pod.x;
        const dy = (fighter.y - 65) - pod.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < pod.radius + 35) {
          // Collected!
          this.applyPodEffect(pod.type, pid, fighter, opponent, particleSystem, soundManager);
          particleSystem.spawnImpactRing(pod.x, pod.y, pod.type.color, 90, 15);
          particleSystem.spawnHitSparks(pod.x, pod.y, pod.type.color, 25, true);
          this.pods.splice(i, 1);
          break;
        }
      }
    }
  }

  spawnRandomPod(stage) {
    const type = this.typesList[Math.floor(Math.random() * this.typesList.length)];
    const margin = 180;
    const minX = margin;
    const maxX = CANVAS_WIDTH - margin;
    const spawnX = minX + Math.random() * (maxX - minX);
    const targetY = stage.groundY - 25;

    this.pods.push(new NexusPod(type, spawnX, targetY));
  }

  applyPodEffect(type, playerId, fighter, opponent, particleSystem, soundManager) {
    soundManager.playPerfect();

    switch (type.id) {
      case 'cloud_backup': {
        const healAmount = 25;
        fighter.health = Math.min(fighter.maxHealth, fighter.health + healAmount);
        fighter.showStatus(`☁️ CLOUD BACKUP (+${healAmount} HP)!`, '#00e5ff');
        particleSystem.spawnDamageText(fighter.x, fighter.y - 70, `+${healAmount} HP`, '#00e5ff', '#003366');
        break;
      }

      case 'ssl_encryption': {
        this.playerBuffs[playerId].sslShield = type.duration;
        fighter.showStatus('🔒 4096-BIT SSL SHIELD ACTIVE!', '#ff1744');
        particleSystem.spawnImpactRing(fighter.x, fighter.y - 60, '#ff1744', 80, 18);
        break;
      }

      case 'edge_overclock': {
        this.playerBuffs[playerId].edgeOverclock = type.duration;
        fighter.ultimateMeter = Math.min(fighter.maxUltimate, fighter.ultimateMeter + 20);
        fighter.showStatus('⚡ EDGE ZERO-LATENCY OVERCLOCK!', '#ffd700');
        particleSystem.spawnGoldPerfect(fighter.x, fighter.y - 60);
        break;
      }

      case 'iot_emp': {
        fighter.showStatus('📡 IoT 2.4GHz EMP DEPLOYED!', '#00ff41');
        // Drain opponent meter & mini stun
        opponent.ultimateMeter = Math.max(0, opponent.ultimateMeter - 25);
        opponent.applyStun(30, '⚡ IoT EMP GLITCH STUN!');
        particleSystem.createBinarySplash(opponent.x, opponent.y - 60);
        break;
      }
    }
  }

  render(ctx) {
    for (const pod of this.pods) {
      pod.render(ctx);
    }
  }

  /**
   * Renders active buff auras (SSL shield / Edge Overclock trails) around fighters
   */
  renderFighterBuffs(ctx, p1, p2) {
    const t = performance.now();
    for (const pid of ['P1', 'P2']) {
      const fighter = pid === 'P1' ? p1 : p2;
      const buffs = this.playerBuffs[pid];

      // SSL Encryption Shield Aura
      if (buffs.sslShield > 0) {
        ctx.save();
        ctx.translate(fighter.x, fighter.y - 65);
        ctx.strokeStyle = '#ff1744';
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 18;
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.rotate(t * 0.003);
        ctx.beginPath();
        ctx.arc(0, 0, 48, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.rotate(-t * 0.006);
        ctx.beginPath();
        ctx.arc(0, 0, 42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Edge Overclock Sonic Ring Aura
      if (buffs.edgeOverclock > 0) {
        ctx.save();
        ctx.translate(fighter.x, fighter.y - 65);
        ctx.strokeStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 14;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 36 + Math.sin(t * 0.02) * 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}
