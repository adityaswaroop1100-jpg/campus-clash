/**
 * Campus Clash 2D — WebNexus Stage: Cyber Fortress (Zero-Day)
 * Dedicated to Cyber Security, Penetration Testing & Cryptographic Firewalls
 * @module stages/cyberFortress
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants.js';

export class CyberFortressStage {
  constructor() {
    this.id = 'cyberfortress';
    this.name = 'Cyber Fortress Zero-Day';
    this.shortName = 'CYBER FORTRESS';
    this.subtitle = 'WebNexus Cyber Security & Cryptographic Firewall';
    this.groundY = 520;
    this.minX = 40;
    this.maxX = CANVAS_WIDTH - 40;

    // Terminal command log stream
    this.logs = [
      'root@nexus-sec:~# nmap -sS -p 1-65535 192.168.1.1',
      '[+] PORT 22/SSH: OPEN [ENCRYPTED]',
      '[+] PORT 443/HTTPS: ACTIVE [TLS 1.3]',
      '[!] WARNING: INTRUSION ATTEMPT DETECTED',
      '[*] DEPLOYING ADAPTIVE FIREWALL MATRIX...',
      '[+] ZERO-DAY PATCH APPLIED: CVE-2026-9042',
      '[*] RSA-4096 BIT KEY ROTATION: COMPLETE'
    ];
    this.logScroll = 0;

    // Binary code rain columns
    this.binaryColumns = [];
    for (let i = 0; i < 28; i++) {
      this.binaryColumns.push({
        x: 30 + i * 44,
        y: Math.random() * CANVAS_HEIGHT,
        speed: 2 + Math.random() * 4,
        chars: Array.from({ length: 12 }, () => (Math.random() > 0.5 ? '1' : '0'))
      });
    }

    // Defensive firewall perimeter laser nodes
    this.laserNodes = [
      { x: 160, y: 380, pulse: 0 },
      { x: 480, y: 340, pulse: 1.2 },
      { x: 800, y: 340, pulse: 2.4 },
      { x: 1120, y: 380, pulse: 3.6 }
    ];

    // Red alert beacon pulse
    this.alertTimer = 0;
  }

  update(dt, fighters, particleSystem, soundManager) {
    // 1. Scroll terminal logs
    this.logScroll += 0.2;

    // 2. Binary rain updates
    for (const col of this.binaryColumns) {
      col.y += col.speed;
      if (col.y > this.groundY) {
        col.y = -60;
        col.chars = Array.from({ length: 12 }, () => (Math.random() > 0.5 ? '1' : '0'));
      }
    }

    // 3. Laser node pulses
    for (const node of this.laserNodes) {
      node.pulse += 0.05;
    }
  }

  render(ctx) {
    this.draw(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  draw(ctx, width, height) {
    const t = performance.now();

    // 1. Dark Cyber Terminal Canvas
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, width, height);

    // 2. Background Matrix Grid & Effects
    ctx.save();
    
    // Terminal Glow Bloom
    ctx.globalCompositeOperation = 'screen';
    const bloom = ctx.createRadialGradient(480, 400, 0, 480, 400, 200);
    bloom.addColorStop(0, 'rgba(0,255,65,0.06)');
    bloom.addColorStop(1, 'transparent');
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(480, 400, 200, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    ctx.strokeStyle = 'rgba(255, 23, 68, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.groundY);
      ctx.stroke();
    }
    for (let y = 0; y < this.groundY; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Scanline Effect
    ctx.fillStyle = 'rgba(0,0,0,0.03)';
    for (let y = 0; y < height; y += 6) {
      ctx.fillRect(0, y, width, 2);
    }
    ctx.restore();

    // 3. Binary Rain Matrix Columns
    ctx.save();
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00ff41';
    ctx.shadowBlur = 6;
    for (const col of this.binaryColumns) {
      for (let i = 0; i < col.chars.length; i++) {
        const charY = col.y + i * 16;
        if (charY < this.groundY && charY > 0) {
          const alpha = i === col.chars.length - 1 ? 0.9 : 0.25 + (i / col.chars.length) * 0.5;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = i === col.chars.length - 1 ? '#FFFFFF' : '#FF1744';
          ctx.shadowColor = '#00ff41';
          ctx.shadowBlur = 6;
          ctx.fillText(col.chars[i], col.x, charY);
        }
      }
    }
    ctx.restore();

    // 4. Central Terminal HUD Display (Giant Hacker Command Console)
    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 18, 0.85)';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 12;
    const termW = 560;
    const termH = 140;
    const termX = width / 2 - termW / 2;
    const termY = 90;
    ctx.fillRect(termX, termY, termW, termH);
    ctx.strokeRect(termX, termY, termW, termH);

    // Terminal header bar
    ctx.fillStyle = '#00e5ff22';
    ctx.fillRect(termX, termY, termW, 24);
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('🔴 SEC_OPS // FIREWALL DEFENSE TERMINAL v4.2', termX + 12, termY + 16);

    // Live terminal text stream
    ctx.font = '10px monospace';
    for (let i = 0; i < 5; i++) {
      const lineIdx = (Math.floor(this.logScroll) + i) % this.logs.length;
      ctx.fillStyle = i === 4 ? '#00ff41' : '#ffcdd2';
      ctx.fillText(this.logs[lineIdx], termX + 16, termY + 44 + i * 18);
    }
    ctx.restore();

    // 5. Defensive Laser Pylons (Red vs Blue Security Laser Perimeter)
    ctx.save();
    for (const node of this.laserNodes) {
      const glow = Math.sin(node.pulse) * 0.4 + 0.6;
      ctx.strokeStyle = `rgba(255, 23, 68, ${glow})`;
      ctx.shadowColor = '#ff1744';
      ctx.shadowBlur = 18;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(node.x, this.groundY);
      ctx.lineTo(node.x, node.y);
      ctx.stroke();

      // Pylon Emitter Core
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(node.x, node.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 6. Stage Ground (Cyber Fortress Hex-Grid Floor)
    ctx.save();
    const platGrad = ctx.createLinearGradient(0, this.groundY, 0, height);
    platGrad.addColorStop(0, '#ff1744');
    platGrad.addColorStop(0.04, '#300810');
    platGrad.addColorStop(0.4, '#150308');
    platGrad.addColorStop(1, '#050103');

    ctx.fillStyle = platGrad;
    ctx.fillRect(0, this.groundY, width, height - this.groundY);

    // Glowing Crimson Neon Perimeter
    ctx.strokeStyle = '#ff1744';
    ctx.shadowColor = '#ff1744';
    ctx.shadowBlur = 18;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(width, this.groundY);
    ctx.stroke();

    // Honeycomb Hexagon Tiles
    ctx.strokeStyle = 'rgba(255, 23, 68, 0.25)';
    ctx.lineWidth = 1.5;
    for (let x = 40; x < width; x += 80) {
      ctx.strokeRect(x, this.groundY + 15, 60, 40);
    }

    // Glowing Neon Grid
    ctx.strokeStyle = 'rgba(0,255,65,0.05)';
    ctx.shadowColor = 'rgba(0,255,65,0.05)';
    ctx.shadowBlur = 2;
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, this.groundY);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = this.groundY; y < height; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();

    // 7. WebNexus Header Banner
    ctx.save();
    ctx.fillStyle = 'rgba(10, 0, 5, 0.88)';
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 2;
    ctx.fillRect(width / 2 - 240, 20, 480, 36);
    ctx.strokeRect(width / 2 - 240, 20, 480, 36);

    ctx.font = '900 13px "Arial Black", sans-serif';
    ctx.fillStyle = '#ff1744';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff1744';
    ctx.shadowBlur = 12;
    ctx.fillText('🛡️ WEBNEXUS CYBER FORTRESS — ZERO-DAY PROTOCOL ACTIVE', width / 2, 43);
    ctx.restore();
  }
}
