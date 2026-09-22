/**
 * Campus Clash 2D — WebNexus Stage: IoT Sensor Matrix
 * Dedicated to Internet of Things, Smart Microcontrollers & Sensor Mesh Networks
 * @module stages/iotSensorMatrix
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants.js';

export class IoTSensorMatrixStage {
  constructor() {
    this.id = 'iotsensormatrix';
    this.name = 'IoT Sensor Matrix';
    this.shortName = 'IOT SENSOR MATRIX';
    this.subtitle = 'WebNexus Internet of Things & Mesh Network';
    this.groundY = 520;
    this.minX = 40;
    this.maxX = CANVAS_WIDTH - 40;

    // Glowing Microcontroller IC Chips (ESP32, STM32, RP2040)
    this.microcontrollers = [
      { x: 140, y: 220, w: 90, h: 90, name: 'ESP32-WROOM', pins: 18, color: '#00e676' },
      { x: 420, y: 160, w: 110, h: 110, name: 'RASPBERRY PI 5', pins: 20, color: '#c51162' },
      { x: 740, y: 190, w: 100, h: 100, name: 'STM32 ARM CORTEX', pins: 16, color: '#00b0ff' },
      { x: 1060, y: 230, w: 85, h: 85, name: 'ZIGBEE GATEWAY', pins: 14, color: '#ffd600' }
    ];

    // Radio Wave Ripple Emitters (2.4GHz WiFi / Bluetooth / Zigbee)
    this.radioRipples = [
      { x: 200, y: 140, radius: 10, maxRadius: 180, speed: 1.5, color: '#00e676' },
      { x: 800, y: 120, radius: 40, maxRadius: 220, speed: 1.8, color: '#00b0ff' },
      { x: 1100, y: 150, radius: 20, maxRadius: 160, speed: 1.2, color: '#ffd600' }
    ];

    // Floating Sensor Telemetry Packets
    this.telemetryPackets = [
      { x: 180, y: 320, text: '📡 TEMP: 24.8°C | HUM: 58%', vy: -0.4 },
      { x: 500, y: 300, text: '⚡ NODE_0x4F: PING 1.2ms', vy: -0.3 },
      { x: 820, y: 330, text: '📶 BLE MESH: 42 NODES SYNC', vy: -0.45 },
      { x: 1080, y: 310, text: '🔋 SENSOR BATTERY: 98%', vy: -0.35 }
    ];
  }

  update(dt, fighters, particleSystem, soundManager) {
    // 1. Update Radio Ripples
    for (const r of this.radioRipples) {
      r.radius += r.speed;
      if (r.radius > r.maxRadius) {
        r.radius = 10;
      }
    }

    // 2. Update Floating Telemetry Packets
    for (const p of this.telemetryPackets) {
      p.y += p.vy;
      if (p.y < 80) p.y = 350;
    }
  }

  render(ctx) {
    this.draw(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  draw(ctx, width, height) {
    const t = performance.now();

    // 1. Deep Matte Circuit Green/Black Gradient Sky
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.groundY);
    bgGrad.addColorStop(0, '#021208');
    bgGrad.addColorStop(0.5, '#042211');
    bgGrad.addColorStop(1, '#07391c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Pulsating 2.4GHz / Bluetooth Concentric Radio Waves
    ctx.save();
    for (const r of this.radioRipples) {
      const alpha = Math.max(0, 1 - r.radius / r.maxRadius) * 0.45;
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Jumper Wires & Copper Circuit Traces in Background
    ctx.save();
    ctx.strokeStyle = '#ffd70055';
    ctx.lineWidth = 3;
    const wirePaths = [
      [[180, 220], [280, 180], [380, 180], [420, 200]],
      [[530, 210], [620, 260], [700, 260], [740, 220]],
      [[840, 230], [940, 270], [1020, 270], [1060, 250]]
    ];
    for (const path of wirePaths) {
      ctx.beginPath();
      ctx.moveTo(path[0][0], path[0][1]);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i][0], path[i][1]);
      }
      ctx.stroke();
    }
    ctx.restore();

    // 4. Glowing Microcontroller IC Chips
    for (const chip of this.microcontrollers) {
      ctx.save();
      ctx.fillStyle = '#0a100d';
      ctx.strokeStyle = chip.color;
      ctx.shadowColor = chip.color;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2.5;
      ctx.fillRect(chip.x, chip.y, chip.w, chip.h);
      ctx.strokeRect(chip.x, chip.y, chip.w, chip.h);

      // IC Metallic Pin Array
      ctx.fillStyle = '#e0e0e0';
      const pinGap = chip.w / (chip.pins / 2);
      for (let p = 0; p < chip.pins / 2; p++) {
        // Top Pins
        ctx.fillRect(chip.x + p * pinGap + 3, chip.y - 6, 4, 6);
        // Bottom Pins
        ctx.fillRect(chip.x + p * pinGap + 3, chip.y + chip.h, 4, 6);
      }

      // Chip Label & Logo
      ctx.font = '900 9px "Arial Black", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(chip.name, chip.x + chip.w / 2, chip.y + chip.h / 2);

      // Blinking Status LED
      const blink = Math.sin(t * 0.008 + chip.x) > 0;
      ctx.fillStyle = blink ? chip.color : '#003311';
      ctx.beginPath();
      ctx.arc(chip.x + 12, chip.y + 12, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 5. Floating Telemetry Tags
    ctx.save();
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#00ff41';
    ctx.shadowColor = '#00ff41';
    ctx.shadowBlur = 6;
    for (const tel of this.telemetryPackets) {
      ctx.fillText(tel.text, tel.x, tel.y);
    }
    ctx.restore();

    // 6. Stage Floor (Printed Circuit Board - PCB Solder Mask with Gold Traces)
    ctx.save();
    const platGrad = ctx.createLinearGradient(0, this.groundY, 0, height);
    platGrad.addColorStop(0, '#00e676');
    platGrad.addColorStop(0.04, '#0a3818');
    platGrad.addColorStop(0.5, '#041c0b');
    platGrad.addColorStop(1, '#010d05');

    ctx.fillStyle = platGrad;
    ctx.fillRect(0, this.groundY, width, height - this.groundY);

    // Glowing Gold PCB Rail
    ctx.strokeStyle = '#00e676';
    ctx.shadowColor = '#00e676';
    ctx.shadowBlur = 18;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(width, this.groundY);
    ctx.stroke();

    // Solder pads and golden vias
    ctx.fillStyle = '#ffd700';
    for (let x = 30; x < width; x += 50) {
      ctx.beginPath();
      ctx.arc(x, this.groundY + 25, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 7. WebNexus Header Banner
    ctx.save();
    ctx.fillStyle = 'rgba(2, 20, 10, 0.88)';
    ctx.strokeStyle = '#00e676';
    ctx.lineWidth = 2;
    ctx.fillRect(width / 2 - 240, 20, 480, 36);
    ctx.strokeRect(width / 2 - 240, 20, 480, 36);

    ctx.font = '900 13px "Arial Black", sans-serif';
    ctx.fillStyle = '#00e676';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00e676';
    ctx.shadowBlur = 12;
    ctx.fillText('📡 WEBNEXUS IOT MATRIX — SMART SENSOR MESH ACTIVE', width / 2, 43);
    ctx.restore();
  }
}
