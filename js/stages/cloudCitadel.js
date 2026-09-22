/**
 * Campus Clash 2D — WebNexus Stage: The Cloud Citadel
 * Dedicated to Cloud Computing, Serverless Clusters & Kubernetes Data Pods
 * @module stages/cloudCitadel
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants.js';

export class CloudCitadelStage {
  constructor() {
    this.id = 'cloudcitadel';
    this.name = 'The Cloud Citadel';
    this.shortName = 'CLOUD CITADEL';
    this.subtitle = 'WebNexus Cloud Computing & Serverless Cluster';
    this.groundY = 520;
    this.minX = 40;
    this.maxX = CANVAS_WIDTH - 40;

    // Floating Kubernetes pods / container nodes
    this.podNodes = [
      { x: 120, y: 160, size: 54, anim: 0, label: 'K8S-POD-01', color: '#00e5ff' },
      { x: 380, y: 110, size: 62, anim: 1.5, label: 'AWS-CLUSTER', color: '#ff9900' },
      { x: 640, y: 140, size: 70, anim: 3.0, label: 'NEXUS-MASTER', color: '#00ff41' },
      { x: 900, y: 100, size: 58, anim: 2.2, label: 'GCP-STORAGE', color: '#4285f4' },
      { x: 1140, y: 150, size: 50, anim: 0.8, label: 'AZURE-EDGE', color: '#0078d4' }
    ];

    // Cascading fiber-optic data stream lines
    this.dataStreams = [];
    for (let i = 0; i < 18; i++) {
      this.dataStreams.push({
        x: 60 + Math.random() * (CANVAS_WIDTH - 120),
        y: Math.random() * CANVAS_HEIGHT,
        len: 40 + Math.random() * 80,
        speed: 3 + Math.random() * 5,
        color: Math.random() > 0.4 ? '#00e5ff' : '#00ff41',
        alpha: 0.25 + Math.random() * 0.5
      });
    }

    // Ambient cloud particles
    this.ambientClouds = [];
    for (let i = 0; i < 12; i++) {
      this.ambientClouds.push({
        x: Math.random() * CANVAS_WIDTH,
        y: 200 + Math.random() * (this.groundY - 200),
        vx: 0.4 + Math.random() * 0.6,
        r: 20 + Math.random() * 35,
        alpha: 0.15 + Math.random() * 0.25
      });
    }

    // Server load status text ticker
    this.loadPercent = 42;
    this.loadTimer = 0;
  }

  update(dt, fighters, particleSystem, soundManager) {
    // 1. Update Pod Nodes
    for (const pod of this.podNodes) {
      pod.anim += 0.04;
    }

    // 2. Update Data Streams
    for (const s of this.dataStreams) {
      s.y += s.speed;
      if (s.y > this.groundY) {
        s.y = 40;
        s.x = 60 + Math.random() * (CANVAS_WIDTH - 120);
      }
    }

    // 3. Update Ambient Cloud Blobs
    for (const c of this.ambientClouds) {
      c.x += c.vx;
      if (c.x > CANVAS_WIDTH + 60) c.x = -60;
    }

    // 4. Load meter ticker
    this.loadTimer++;
    if (this.loadTimer % 45 === 0) {
      this.loadPercent = 35 + Math.floor(Math.random() * 55);
    }
  }

  render(ctx) {
    this.draw(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  draw(ctx, width, height) {
    const t = performance.now();

    // 1. Deep Cyber Cloud Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.groundY);
    skyGrad.addColorStop(0, '#020b1e');
    skyGrad.addColorStop(0.5, '#051b3d');
    skyGrad.addColorStop(1, '#0b3558');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Background Server Blade Skyscrapers
    ctx.save();
    
    // Atmospheric haze at the top
    const hazeGrad = ctx.createLinearGradient(0, 0, 0, height * 0.3);
    hazeGrad.addColorStop(0, 'rgba(0,30,60,0.4)');
    hazeGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = hazeGrad;
    ctx.fillRect(0, 0, width, height * 0.3);

    // God-ray shafts
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 4; i++) {
      const isAlt = i % 2 === 0;
      const rayGrad = ctx.createLinearGradient(0, 0, 0, this.groundY);
      rayGrad.addColorStop(0, isAlt ? 'rgba(0,229,255,0.06)' : 'rgba(0,136,204,0.04)');
      rayGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = rayGrad;
      ctx.fillRect(200 + i * 220, 0, 60 + i * 20, this.groundY);
    }
    ctx.globalCompositeOperation = 'source-over';

    const serverTowers = [
      { x: 80, w: 100, h: 360, rows: 12 },
      { x: 240, w: 120, h: 420, rows: 14 },
      { x: 440, w: 160, h: 460, rows: 16 },
      { x: 680, w: 150, h: 440, rows: 15 },
      { x: 910, w: 130, h: 400, rows: 13 },
      { x: 1090, w: 110, h: 350, rows: 11 }
    ];

    for (const tow of serverTowers) {
      const ty = this.groundY - tow.h;
      ctx.fillStyle = '#06162d';
      ctx.fillRect(tow.x, ty, tow.w, tow.h);

      // Server Blade Rack Grids & Blinking Activity LEDs
      for (let r = 0; r < tow.rows; r++) {
        const ry = ty + 20 + r * 24;
        ctx.fillStyle = '#0a2346';
        ctx.fillRect(tow.x + 8, ry, tow.w - 16, 18);

        // Green/Cyan/Amber Server Lights
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 8;
        for (let l = 0; l < 5; l++) {
          const blink = Math.sin(t * 0.005 + tow.x + r * 3 + l) > 0;
          ctx.fillStyle = blink ? (l === 4 ? '#ffaa00' : '#00e5ff') : '#003366';
          ctx.beginPath();
          ctx.arc(tow.x + 16 + l * 14, ry + 9, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      }
    }
    ctx.restore();

    // 3. Cascading Vertical Fiber-Optic Data Streams
    ctx.save();
    for (const s of this.dataStreams) {
      ctx.globalAlpha = s.alpha;
      ctx.strokeStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x, s.y + s.len);
      ctx.stroke();
    }
    ctx.restore();

    // 4. Floating Kubernetes Pod Nodes (Hexagonal / Cube Holograms)
    for (const pod of this.podNodes) {
      ctx.save();
      const hover = Math.sin(pod.anim) * 12;
      const px = pod.x;
      const py = pod.y + hover;

      // Holographic Hexagon Node
      ctx.translate(px, py);
      ctx.strokeStyle = pod.color;
      ctx.shadowColor = pod.color;
      ctx.shadowBlur = 18;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const hx = Math.cos(a) * pod.size;
        const hy = Math.sin(a) * pod.size;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fillStyle = `${pod.color}15`;
      ctx.fill();
      ctx.stroke();

      // Inner Core Ring
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, pod.size * 0.45, 0, Math.PI * 2);
      ctx.stroke();

      // Node Label
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(pod.label, 0, pod.size + 14);

      ctx.restore();
    }

    // 5. Cloud Citadel Stage Floor (High-Tech Translucent Glass Platform)
    ctx.save();
    const platGrad = ctx.createLinearGradient(0, this.groundY, 0, height);
    platGrad.addColorStop(0, '#00e5ff');
    platGrad.addColorStop(0.04, '#0d325a');
    platGrad.addColorStop(0.4, '#061833');
    platGrad.addColorStop(1, '#020b18');

    ctx.fillStyle = platGrad;
    ctx.fillRect(0, this.groundY, width, height - this.groundY);

    // Glowing Platform Edge Rail
    ctx.strokeStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 16;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(width, this.groundY);
    ctx.stroke();

    // Ground Grid Glow Line
    ctx.strokeStyle = '#00e5ff22';
    ctx.shadowBlur = 4;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(width, this.groundY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Circuit Board Traces on Stage Floor
    ctx.strokeStyle = '#00e5ff44';
    ctx.lineWidth = 2;
    for (let x = 60; x < width; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, this.groundY);
      ctx.lineTo(x + 40, this.groundY + 40);
      ctx.lineTo(x + 40, height);
      ctx.stroke();
    }
    ctx.restore();

    // 6. WebNexus Banner & Live Cluster Status Ticker
    ctx.save();
    ctx.fillStyle = 'rgba(2, 12, 30, 0.85)';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.fillRect(width / 2 - 220, 20, 440, 36);
    ctx.strokeRect(width / 2 - 220, 20, 440, 36);

    ctx.font = '900 13px "Arial Black", sans-serif';
    ctx.fillStyle = '#00e5ff';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    ctx.fillText(`🌐 WEBNEXUS CLOUD CITADEL — SERVER LOAD: ${this.loadPercent}% [HEALTHY]`, width / 2, 43);
    ctx.restore();
  }
}
