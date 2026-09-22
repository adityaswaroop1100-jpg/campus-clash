/**
 * Campus Clash 2D — WebNexus Tech Modifier System
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

    const hoverY = this.y + (this.isLanded ? Math.sin(this.animCycle) * 6 : 0);
    const pulse = 1.0 + Math.sin(this.animCycle * 2) * 0.15;
    const currentRadius = this.radius * pulse;

    // 1. Vertical Hologram Beacon Beam
    if (!this.isLanded || this.life > 100) {
      const beamGrad = ctx.createLinearGradient(this.x, 0, this.x, hoverY);
      beamGrad.addColorStop(0, `${this.type.color}00`);
      beamGrad.addColorStop(0.7, `${this.type.color}22`);
      beamGrad.addColorStop(1, `${this.type.color}66`);
      ctx.fillStyle = beamGrad;
      ctx.fillRect(this.x - 12, 0, 24, hoverY);
    }

    // 2. Ground Projection Ring
    if (this.isLanded) {
      ctx.save();
      ctx.translate(this.x, this.targetY + 12);
      ctx.scale(1, 0.35);
      ctx.strokeStyle = this.type.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = this.type.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, 0, currentRadius * 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Central Hologram Orb
    ctx.translate(this.x, hoverY);

    const radGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, currentRadius);
    radGrad.addColorStop(0, '#FFFFFF');
    radGrad.addColorStop(0.4, this.type.color);
    radGrad.addColorStop(0.8, this.type.glowColor);
    radGrad.addColorStop(1, `${this.type.color}00`);

    ctx.fillStyle = radGrad;
    ctx.shadowColor = this.type.color;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
    ctx.fill();

    // 4. Rotating Tech Orbit Ring
    ctx.rotate(this.animCycle);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius * 1.25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. Tech Icon Emoji
    ctx.rotate(-this.animCycle);
    ctx.font = 'bold 18px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.type.icon, 0, 0);

    // 6. Floating Label Tag
    ctx.font = '900 10px "Arial Black", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 6;
    ctx.fillText(this.type.name, 0, -currentRadius - 10);

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
