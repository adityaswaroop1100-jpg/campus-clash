/**
 * Campus Clash 2D — WebNexus Stage: Edge Gateway Station
 * Dedicated to Edge Computing, Micro-Data Centers & Ultra-Low Latency Relays
 * @module stages/edgeGateway
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants.js';

export class EdgeGatewayStage {
  constructor() {
    this.id = 'edgegateway';
    this.name = 'Edge Gateway Station';
    this.shortName = 'EDGE GATEWAY';
    this.subtitle = 'WebNexus Edge Computing & Ultra-Low Latency Hub';
    this.groundY = 520;
    this.minX = 40;
    this.maxX = CANVAS_WIDTH - 40;

    // High-speed optical data pulses traveling horizontally
    this.opticalPulses = [];
    for (let i = 0; i < 16; i++) {
      this.opticalPulses.push({
        x: Math.random() * CANVAS_WIDTH,
        y: 120 + Math.random() * 260,
        speed: 6 + Math.random() * 8,
        length: 60 + Math.random() * 100,
        color: Math.random() > 0.5 ? '#ffd700' : '#e040fb'
      });
    }

    // Decentralized Edge Micro-Nodes
    this.edgeNodes = [
      { x: 120, y: 260, latency: '0.4ms', status: 'ACTIVE', fanAngle: 0 },
      { x: 420, y: 200, latency: '0.2ms', status: 'SYNCED', fanAngle: 1.2 },
      { x: 780, y: 220, latency: '0.5ms', status: 'ACTIVE', fanAngle: 2.4 },
      { x: 1080, y: 280, latency: '0.3ms', status: 'SYNCED', fanAngle: 0.8 }
    ];
  }

  update(dt, fighters, particleSystem, soundManager) {
    // 1. Update Optical Data Pulses
    for (const p of this.opticalPulses) {
      p.x += p.speed;
      if (p.x > CANVAS_WIDTH + p.length) {
        p.x = -p.length;
        p.y = 120 + Math.random() * 260;
      }
    }

    // 2. Rotate Edge Server Cooling Fans
    for (const node of this.edgeNodes) {
      node.fanAngle += 0.25;
    }
  }

  render(ctx) {
    this.draw(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  draw(ctx, width, height) {
    const t = performance.now();

    // 1. Deep Space Cyber Sky Gradient (Violet / Neon Gold / Cyan)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.groundY);
    skyGrad.addColorStop(0, '#10051d');
    skyGrad.addColorStop(0.5, '#220b3b');
    skyGrad.addColorStop(1, '#3b1263');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. High-Speed Horizontal Optical Bus Lines
    ctx.save();
    for (const p of this.opticalPulses) {
      ctx.strokeStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.length, p.y);
      ctx.stroke();

      // Bright white pulse head
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(p.x + p.length, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3. Decentralized Edge Node Towers
    for (const node of this.edgeNodes) {
      ctx.save();
      const nx = node.x;
      const ny = node.y;
      const nw = 100;
      const nh = 180;

      // Node Housing
      ctx.fillStyle = '#180a2c';
      ctx.strokeStyle = '#e040fb';
      ctx.shadowColor = '#e040fb';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2;
      ctx.fillRect(nx - nw / 2, ny, nw, nh);
      ctx.strokeRect(nx - nw / 2, ny, nw, nh);

      // Spinning High-Speed Cooling Fan
      ctx.save();
      ctx.translate(nx, ny + 45);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.rotate(node.fanAngle);
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(-3, -20, 6, 40);
      }
      ctx.restore();

      // Latency Badge Tag
      ctx.font = '900 10px monospace';
      ctx.fillStyle = '#00e5ff';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 6;
      ctx.fillText(`⚡ ${node.latency}`, nx, ny + 110);
      ctx.fillStyle = '#ffd700';
      ctx.fillText(node.status, nx, ny + 130);

      ctx.restore();
    }

    // 4. Edge Platform Stage Ground (Carbon Fiber with Optical Glow Rails)
    ctx.save();
    const platGrad = ctx.createLinearGradient(0, this.groundY, 0, height);
    platGrad.addColorStop(0, '#e040fb');
    platGrad.addColorStop(0.04, '#38104e');
    platGrad.addColorStop(0.5, '#1e052d');
    platGrad.addColorStop(1, '#0b0112');

    ctx.fillStyle = platGrad;
    ctx.fillRect(0, this.groundY, width, height - this.groundY);

    // Glowing Neon Violet Platform Edge
    ctx.strokeStyle = '#e040fb';
    ctx.shadowColor = '#e040fb';
    ctx.shadowBlur = 18;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(width, this.groundY);
    ctx.stroke();

    // Dual Optical Bus Channel on Floor
    ctx.strokeStyle = '#ffd70066';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY + 30);
    ctx.lineTo(width, this.groundY + 30);
    ctx.stroke();
    ctx.restore();

    // 5. WebNexus Header Banner
    ctx.save();
    ctx.fillStyle = 'rgba(20, 5, 35, 0.88)';
    ctx.strokeStyle = '#e040fb';
    ctx.lineWidth = 2;
    ctx.fillRect(width / 2 - 240, 20, 480, 36);
    ctx.strokeRect(width / 2 - 240, 20, 480, 36);

    ctx.font = '900 13px "Arial Black", sans-serif';
    ctx.fillStyle = '#e040fb';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#e040fb';
    ctx.shadowBlur = 12;
    ctx.fillText('⚡ WEBNEXUS EDGE GATEWAY — ULTRA-LOW LATENCY (0.2ms)', width / 2, 43);
    ctx.restore();
  }
}
