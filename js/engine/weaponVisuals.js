/**
 * Campus Clash — Weapon Trail & Weapon Glow Visual System
 * @module engine/weaponVisuals
 */

export class WeaponTrail {
  /**
   * @param {Object} [config={}]
   */
  constructor(config = {}) {
    this.points = [];
    this.maxPoints = config.maxPoints || 25;
    this.color = config.color || '#FFD700';
    this.width = config.width || 4;
    this.glowColor = config.glowColor || '#FFD700';
    this.glowRadius = config.glowRadius || 15;
    this.particleType = config.particleType || 'gold_sparkles';
    this.particles = [];
    this.isActive = false;
    this.position = { x: 0, y: 0 };
    this.angle = 0;
  }

  /**
   * Reconfigures the trail for an active move
   */
  configure(color, glowColor, width, maxPoints, glowRadius, particleType, trailStyle = 'ribbon') {
    this.color = color || this.color;
    this.glowColor = glowColor || color || this.glowColor;
    this.width = width || this.width;
    this.maxPoints = maxPoints || 25;
    this.glowRadius = glowRadius || 15;
    this.particleType = particleType || 'gold_sparkles';
    this.trailStyle = trailStyle || 'ribbon';
  }

  /**
   * Adds a tracking point along the weapon's swing arc
   * @param {number} x - World X
   * @param {number} y - World Y
   * @param {number} [angle=0]
   */
  addPoint(x, y, angle = 0) {
    this.position = { x, y };
    this.angle = angle;

    this.points.push({
      x,
      y,
      angle,
      life: 1.0
    });

    if (this.points.length > this.maxPoints) {
      this.points.shift();
    }

    // Emit 3-5 vivid particles along trail
    this.emitTrailParticles(x, y);
  }

  emitTrailParticles(x, y) {
    const symbols = {
      gold_sparkles: ['+', '=', '√', 'π', '✓', '•'],
      number_explosion: ['42', '69', '99', '420', '100', '∑'],
      paper_flutter: ['📄', '📝', '📃', '▫', '◽'],
      item_explosion: ['✏️', '📎', '🍬', '📦', '🖊️'],
      food_splatter: ['🍛', '🍚', '💧', '🌶️', '•'],
      curry_splatter: ['🥘', '🍲', '💧', '🥔', '•'],
      steam_burst: ['♨', '☁', '💧', '•'],
      paper_explosion: ['📜', '📑', '📄', '📝'],
      blue_sparkles: ['01', 'CV', '💻', '💼', '★'],
      whip_crack: ['⚡', '✦', '✧', '★'],
      air_burst: ['💨', '💥', '⚡', '•'],
      cricket_explosion: ['🏏', '⚾', '⚡', '💥', '6!'],
      binary_splash: ['0', '1', '>>', '{}', '//'],
      shockwave_ring: ['✦', '✧', '⚖️', '§', '¶'],
      paint_splatter: ['💧', '🎨', '🖌️', '✦', '●']
    };

    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const typeList = symbols[this.particleType] || ['•', '★'];
      const symbol = typeList[Math.floor(Math.random() * typeList.length)];
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 3.5,
        vy: (Math.random() - 0.5) * 3.5 - 1.2,
        life: 20 + Math.random() * 14,
        maxLife: 34,
        size: 2 + Math.random() * 4.5,
        color: this.color,
        symbol: symbol,
        isText: symbol.length > 0 && symbol !== '•'
      });
    }
  }

  update() {
    // Update trail points decay
    for (const p of this.points) {
      p.life -= 0.045;
    }
    this.points = this.points.filter(p => p.life > 0);

    // Update particles
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06; // slight gravity
      p.life--;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  /**
   * Renders the glowing weapon trail according to its configured style.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (this.points.length > 2) {
      ctx.save();
      ctx.shadowColor = this.glowColor;
      ctx.shadowBlur = this.glowRadius;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const style = this.trailStyle || 'ribbon';

      if (style === 'splatter') {
        // Backbencher: Irregular jagged ink splatter trail with edge droplets
        for (let i = 0; i < this.points.length - 1; i++) {
          const p1 = this.points[i];
          const p2 = this.points[i + 1];
          const alpha = Math.max(0, Math.min(1, p1.life * 0.9));
          const w = this.width * p1.life * (0.8 + Math.sin(i * 3.7) * 0.5);

          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;

          ctx.globalAlpha = alpha;
          ctx.fillStyle = this.color;
          ctx.beginPath();
          ctx.arc(p1.x, p1.y, w, 0, Math.PI * 2);
          ctx.fill();

          // Splatter bleeding edges
          if (i % 2 === 0) {
            ctx.beginPath();
            ctx.arc(p1.x + nx * (w + 6), p1.y + ny * (w + 6), w * 0.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (style === 'soft_ribbon' || style === 'bloom') {
        // Hosteler: Ultra-thick soft bloom ribbon with heavy diffuse glow
        for (let i = 0; i < this.points.length - 1; i++) {
          const p1 = this.points[i];
          const p2 = this.points[i + 1];
          const alpha = Math.max(0, Math.min(0.65, p1.life * 0.6));
          const w = this.width * 1.6 * p1.life;

          ctx.globalAlpha = alpha;
          ctx.strokeStyle = this.color;
          ctx.lineWidth = w;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();

          // Soft white core
          ctx.globalAlpha = alpha * 0.8;
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = w * 0.35;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      } else if (style === 'lightning') {
        // Senior: Jagged zig-zag segmented crackling lightning trail
        for (let i = 0; i < this.points.length - 1; i++) {
          const p1 = this.points[i];
          const p2 = this.points[i + 1];
          const alpha = Math.max(0, Math.min(1, p1.life));
          const midX = (p1.x + p2.x) / 2 + (Math.sin(i * 5.3 + performance.now() * 0.02) * 8);
          const midY = (p1.y + p2.y) / 2 + (Math.cos(i * 5.3 + performance.now() * 0.02) * 8);

          ctx.globalAlpha = alpha;
          ctx.strokeStyle = this.color;
          ctx.lineWidth = Math.max(1, this.width * p1.life);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(midX, midY);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();

          // White electric core
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = Math.max(0.5, this.width * 0.35 * p1.life);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(midX, midY);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      } else if (style === 'grid') {
        // Placement Warrior: Green laser crosshatching and digital grid matrix
        for (let i = 0; i < this.points.length - 1; i++) {
          const p1 = this.points[i];
          const p2 = this.points[i + 1];
          const alpha = Math.max(0, Math.min(1, p1.life * 0.85));

          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          const span = this.width * 1.4 * p1.life;

          ctx.globalAlpha = alpha;
          ctx.strokeStyle = this.color;
          ctx.lineWidth = 2;

          // Main rail lines
          ctx.beginPath();
          ctx.moveTo(p1.x + nx * span, p1.y + ny * span);
          ctx.lineTo(p2.x + nx * span, p2.y + ny * span);
          ctx.moveTo(p1.x - nx * span, p1.y - ny * span);
          ctx.lineTo(p2.x - nx * span, p2.y - ny * span);
          ctx.stroke();

          // Ladder crossbars
          if (i % 2 === 0) {
            ctx.beginPath();
            ctx.moveTo(p1.x + nx * span, p1.y + ny * span);
            ctx.lineTo(p1.x - nx * span, p1.y - ny * span);
            ctx.stroke();
          }
        }
      } else if (style === 'wind') {
        // Sports Star: Curving aerodynamic wind-tunnel lines & sonic pressure waves
        const strandOffsets = [-8, -3, 0, 3, 8];
        for (const off of strandOffsets) {
          ctx.beginPath();
          for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            const pNext = this.points[Math.min(this.points.length - 1, i + 1)];
            const dx = pNext.x - p.x;
            const dy = pNext.y - p.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx = -dy / len;
            const ny = dx / len;
            const wx = p.x + nx * off * p.life;
            const wy = p.y + ny * off * p.life;
            if (i === 0) ctx.moveTo(wx, wy);
            else ctx.lineTo(wx, wy);
          }
          ctx.globalAlpha = 0.55;
          ctx.strokeStyle = off === 0 ? '#FFFFFF' : this.color;
          ctx.lineWidth = off === 0 ? 3 : 1.5;
          ctx.stroke();
        }
      } else if (style === 'pixel') {
        // Cypher: Discrete matrix pixel squares & cyber data tiles
        for (let i = 0; i < this.points.length; i++) {
          const p = this.points[i];
          const alpha = Math.max(0, p.life * 0.9);
          const pxSize = Math.max(3, Math.round(this.width * 1.5 * p.life));
          ctx.globalAlpha = alpha;
          ctx.fillStyle = i % 2 === 0 ? this.color : '#00FF41';
          ctx.fillRect(Math.round(p.x - pxSize / 2), Math.round(p.y - pxSize / 2), pxSize, pxSize);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(Math.round(p.x - pxSize / 2), Math.round(p.y - pxSize / 2), pxSize, pxSize);
        }
      } else if (style === 'gold_dust') {
        // Gavel: Faceted golden court shards and glittering gold dust ribbon
        for (let i = 0; i < this.points.length - 1; i++) {
          const p1 = this.points[i];
          const p2 = this.points[i + 1];
          const alpha = Math.max(0, Math.min(1, p1.life * 0.95));
          const w = this.width * p1.life;

          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;

          const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
          grad.addColorStop(0, '#FFD700');
          grad.addColorStop(0.5, '#FFF8DC');
          grad.addColorStop(1, '#DAA520');

          ctx.globalAlpha = alpha;
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(p1.x + nx * w, p1.y + ny * w);
          ctx.lineTo(p2.x + nx * w * 0.8, p2.y + ny * w * 0.8);
          ctx.lineTo(p2.x - nx * w * 0.8, p2.y - ny * w * 0.8);
          ctx.lineTo(p1.x - nx * w, p1.y - ny * w);
          ctx.closePath();
          ctx.fill();
        }
      } else if (style === 'ghost') {
        // Bolt: Supersonic motion blur echo trails
        for (let i = 0; i < this.points.length - 1; i++) {
          const p1 = this.points[i];
          const p2 = this.points[i + 1];
          const alpha = Math.max(0, Math.min(0.8, p1.life * 0.8));
          const w = this.width * 1.5 * p1.life;

          ctx.globalAlpha = alpha;
          ctx.strokeStyle = i % 2 === 0 ? '#00E5FF' : '#FFD700';
          ctx.lineWidth = w;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      } else if (style === 'rainbow') {
        // Palette: Smooth HSV continuous rainbow gradient ribbon
        for (let i = 0; i < this.points.length - 1; i++) {
          const p1 = this.points[i];
          const p2 = this.points[i + 1];
          const tBase = i / this.points.length;
          const alpha = Math.max(0, Math.min(1, p1.life * 0.95));
          const w = this.width * p1.life;

          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;

          const hue = (tBase * 360 + performance.now() * 0.1) % 360;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
          ctx.beginPath();
          ctx.moveTo(p1.x + nx * w, p1.y + ny * w);
          ctx.lineTo(p2.x + nx * w, p2.y + ny * w);
          ctx.lineTo(p2.x - nx * w, p2.y - ny * w);
          ctx.lineTo(p1.x - nx * w, p1.y - ny * w);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        // Standard ribbon (Topper): Tapered sharp quad ribbon with bright tip
        for (let i = 0; i < this.points.length - 1; i++) {
          const p1 = this.points[i];
          const p2 = this.points[i + 1];
          const tBase = i / this.points.length;
          const tTip = (i + 1) / this.points.length;
          const alpha = Math.max(0, Math.min(1, p1.life * 0.9));
          const w1 = Math.max(0.5, this.width * (1 - tBase) * p1.life);
          const w2 = Math.max(0.5, this.width * (1 - tTip) * p1.life);

          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;

          const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
          grad.addColorStop(0, this.color);
          grad.addColorStop(1, '#FFFFFF');

          ctx.globalAlpha = alpha;
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(p1.x + nx * w1, p1.y + ny * w1);
          ctx.lineTo(p2.x + nx * w2, p2.y + ny * w2);
          ctx.lineTo(p2.x - nx * w2, p2.y - ny * w2);
          ctx.lineTo(p1.x - nx * w1, p1.y - ny * w1);
          ctx.closePath();
          ctx.fill();
        }
      }

      ctx.restore();
    }

    // 2. Draw trail particles
    if (this.particles.length > 0) {
      ctx.save();
      for (const p of this.particles) {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.shadowColor = this.glowColor;
        ctx.shadowBlur = 8;

        if (p.isText && p.symbol !== '•') {
          ctx.font = `bold ${Math.round(11 + p.size)}px "Arial Black", sans-serif`;
          ctx.fillStyle = p.color;
          ctx.textAlign = 'center';
          ctx.fillText(p.symbol, p.x, p.y);
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(1, p.size), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  clear() {
    this.points = [];
    this.particles = [];
  }
}

export class WeaponGlow {
  /**
   * @param {Object} [config={}]
   */
  constructor(config = {}) {
    this.color = config.color || '#FFD700';
    this.intensity = 0;
    this.targetIntensity = 0;
    this.radius = config.radius || 22;
    this.particles = [];
  }

  startWindUp(color, radius = 22) {
    if (color) this.color = color;
    if (radius) this.radius = radius;
    this.targetIntensity = 1.0;
  }

  release() {
    this.targetIntensity = 0;
  }

  update(worldX = 0, worldY = 0) {
    // Smooth intensity ramp
    this.intensity += (this.targetIntensity - this.intensity) * 0.2;

    // Emit glow particles during wind-up
    if (this.intensity > 0.3 && Math.random() < 0.6) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * this.radius * 0.8;
      this.particles.push({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 2.0 - 0.5,
        life: 18 + Math.random() * 12,
        maxLife: 30,
        size: 2 + Math.random() * 3.5,
        color: this.color
      });
    }

    // Update particles
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  /**
   * Draws the radial energy glow buildup + vacuum wind-up speed lines during startup.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   */
  draw(ctx, x, y) {
    if (this.intensity < 0.05) return;

    ctx.save();
    const effectiveRadius = this.radius * (0.8 + 0.4 * this.intensity);
    const pulse = Math.sin(performance.now() * 0.02) * 0.15;
    const currentRadius = Math.max(1, effectiveRadius * (1 + pulse));

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, currentRadius);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.3, this.color);
    gradient.addColorStop(0.7, `${this.color}44`);
    gradient.addColorStop(1, `${this.color}00`);

    ctx.globalAlpha = Math.min(1, this.intensity * 0.95);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.radius * 1.2;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
    ctx.fill();

    // Concentric shock rings during peak wind-up
    if (this.intensity > 0.7) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, currentRadius * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Vacuum wind-up: inward-converging speed lines that shrink toward the tip
    if (this.intensity > 0.2) {
      const lineCount = 6;
      const vacuumRadius = 52 + (1 - this.intensity) * 28;
      ctx.globalAlpha = this.intensity * 0.55;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      for (let i = 0; i < lineCount; i++) {
        const angle = (i / lineCount) * Math.PI * 2 + performance.now() * 0.001;
        const ox = x + Math.cos(angle) * vacuumRadius;
        const oy = y + Math.sin(angle) * vacuumRadius;
        const mx = x + Math.cos(angle) * (vacuumRadius * 0.35);
        const my = y + Math.sin(angle) * (vacuumRadius * 0.35);
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(mx, my);
        ctx.stroke();
      }
    }

    // Wind-up particles
    for (const p of this.particles) {
      const alpha = (p.life / p.maxLife) * this.intensity;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(x + p.x, y + p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Per-character weapon aura during active frames.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x - World X of weapon tip
   * @param {number} y - World Y of weapon tip
   * @param {string} characterId - e.g. 'topper', 'sportsStar', 'senior'
   */
  drawWeaponAura(ctx, x, y, characterId) {
    const t = performance.now();
    ctx.save();

    if (characterId === 'topper') {
      // Orbiting spectral pages with paper-cut cyan glints
      for (let i = 0; i < 3; i++) {
        const orbitAngle = (i / 3) * Math.PI * 2 + t * 0.004;
        const ox = x + Math.cos(orbitAngle) * 18;
        const oy = y + Math.sin(orbitAngle) * 12;
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(orbitAngle);
        ctx.globalAlpha = 0.80;
        ctx.fillStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 10;
        ctx.fillRect(-5, -3, 10, 6);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(-3, -1, 6, 1);
        ctx.fillRect(-3,  1, 4, 1);
        ctx.restore();
      }
      // Paper-cut glints
      if (Math.sin(t * 0.03) > 0.6) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(x - 12, y - 8);
        ctx.lineTo(x + 12, y + 4);
        ctx.stroke();
      }

    } else if (characterId === 'backbencher') {
      // Chaotic red ink splatter trail
      const inkCount = 5;
      for (let i = 0; i < inkCount; i++) {
        const bangle = (i / inkCount) * Math.PI * 2 + t * 0.006;
        const r = 10 + Math.sin(t * 0.012 + i * 1.3) * 6;
        ctx.beginPath();
        ctx.arc(x + Math.cos(bangle) * r, y + Math.sin(bangle) * r * 0.7, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#cc2200';
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur = 8;
        ctx.globalAlpha = 0.75;
        ctx.fill();
      }
      // Steaming chai arc
      ctx.strokeStyle = '#c8860a';
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.60;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.arc(x, y, 20, -Math.PI * 0.8, Math.PI * 0.1);
      ctx.stroke();
      ctx.setLineDash([]);

    } else if (characterId === 'hosteler') {
      // Soft puffy white pillow puff rings
      const puffR = 16 + Math.sin(t * 0.008) * 4;
      ctx.globalAlpha = 0.50;
      ctx.shadowColor = '#e8e8e8';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#f5f5f5';
      ctx.beginPath();
      ctx.arc(x, y, puffR, 0, Math.PI * 2);
      ctx.fill();
      // Drifting feather fragments
      for (let i = 0; i < 3; i++) {
        const fa = (i / 3) * Math.PI * 2 + t * 0.002;
        const fr = 22 + i * 4;
        ctx.globalAlpha = 0.40;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + Math.cos(fa) * fr - 3, y + Math.sin(fa) * fr - 6, 3, 8);
      }

    } else if (characterId === 'senior') {
      // Gold crackling lightning arcs around ID whip tip
      ctx.strokeStyle = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 18;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 3]);
      ctx.globalAlpha = 0.80;
      const crackAngle = Math.sin(t * 0.018) * Math.PI * 0.4;
      ctx.beginPath();
      ctx.arc(x, y, 24, crackAngle, crackAngle + Math.PI * 0.7);
      ctx.stroke();
      ctx.setLineDash([3, 6]);
      ctx.globalAlpha = 0.50;
      ctx.beginPath();
      ctx.arc(x, y, 18, crackAngle + Math.PI, crackAngle + Math.PI * 1.5);
      ctx.stroke();
      ctx.setLineDash([]);
      // Smear frame: lingering tip trail
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#ffee88';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(t * 0.03) * 16, y + Math.sin(t * 0.02) * 10);
      ctx.stroke();

    } else if (characterId === 'placementWarrior') {
      // Green spreadsheet grid lines exploding in air
      ctx.strokeStyle = '#00c853';
      ctx.shadowColor = '#00c853';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.70;
      const gridSize = 10;
      for (let i = -2; i <= 2; i++) {
        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(x - 22, y + i * gridSize);
        ctx.lineTo(x + 22, y + i * gridSize);
        ctx.stroke();
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(x + i * gridSize, y - 22);
        ctx.lineTo(x + i * gridSize, y + 22);
        ctx.stroke();
      }

    } else if (characterId === 'sportsStar') {
      // Dense white sonic boom ring + curving neon wind-lines
      ctx.strokeStyle = '#39ff14';
      ctx.shadowColor = '#39ff14';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.75;
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + t * 0.002;
        const innerR = 14;
        const outerR = 30 + Math.sin(t * 0.015 + i) * 8;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(angle) * innerR, y + Math.sin(angle) * innerR);
        ctx.lineTo(x + Math.cos(angle) * outerR, y + Math.sin(angle) * outerR);
        ctx.stroke();
      }
      // Sonic boom ring
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.45 + Math.sin(t * 0.02) * 0.2;
      ctx.beginPath();
      ctx.arc(x, y, 28 + Math.sin(t * 0.025) * 5, 0, Math.PI * 2);
      ctx.stroke();

    } else if (characterId === 'cypher') {
      // Green binary matrix stream — falling 0/1 digits
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#00ff41';
      ctx.shadowBlur = 12;
      for (let i = 0; i < 5; i++) {
        const colOffset = (i - 2) * 10;
        const yOff = ((t * 0.08 + i * 18) % 60) - 30;
        const bit = Math.floor((t / 200 + i) % 2) ? '1' : '0';
        ctx.globalAlpha = Math.max(0, 0.9 - Math.abs(yOff) / 30);
        ctx.fillStyle = '#00ff41';
        ctx.fillText(bit, x + colOffset, y + yOff);
      }
      // Rotating hex code ring
      ctx.globalAlpha = 0.65;
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 16;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(x, y, 22, t * 0.005, t * 0.005 + Math.PI * 1.5);
      ctx.stroke();
      ctx.setLineDash([]);

    } else if (characterId === 'gavel') {
      // Golden legal aura pulsing halo
      const gavelPulse = 0.7 + 0.3 * Math.sin(t * 0.015);
      const grad = ctx.createRadialGradient(x, y, 5, x, y, 32);
      grad.addColorStop(0, `rgba(255,215,0,${gavelPulse * 0.6})`);
      grad.addColorStop(0.5, `rgba(255,140,0,${gavelPulse * 0.3})`);
      grad.addColorStop(1, 'rgba(255,140,0,0)');
      ctx.globalAlpha = 1;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 20;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, 32, 0, Math.PI * 2);
      ctx.fill();
      // "OBJECTION!" spark bursts (periodic)
      if (Math.sin(t * 0.008) > 0.85) {
        ctx.globalAlpha = 0.90;
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 8px "Arial Black", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('OBJECTION!', x, y - 32);
      }

    } else if (characterId === 'bolt') {
      // Supersonic golden/cyan wind tunnel ribbons
      const ribbonCount = 4;
      for (let i = 0; i < ribbonCount; i++) {
        const phase = (i / ribbonCount) * Math.PI * 2;
        const ribbonAngle = phase + t * 0.008;
        const innerR = 8 + i * 3;
        const outerR = 25 + i * 5;
        ctx.strokeStyle = i % 2 === 0 ? '#ffd700' : '#00e5ff';
        ctx.shadowColor = i % 2 === 0 ? '#ffd700' : '#00e5ff';
        ctx.shadowBlur = 14;
        ctx.lineWidth = 2.5 - i * 0.4;
        ctx.globalAlpha = 0.75 - i * 0.1;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ribbonAngle) * innerR, y + Math.sin(ribbonAngle) * innerR);
        ctx.quadraticCurveTo(
          x + Math.cos(ribbonAngle + 0.6) * (innerR + outerR) * 0.5,
          y + Math.sin(ribbonAngle + 0.6) * (innerR + outerR) * 0.5,
          x + Math.cos(ribbonAngle + 1.2) * outerR,
          y + Math.sin(ribbonAngle + 1.2) * outerR
        );
        ctx.stroke();
      }

    } else if (characterId === 'palette') {
      // Swirling rainbow chromatic vortex paint trails
      const hueOffset = (t * 0.15) % 360;
      const vortexCount = 6;
      for (let i = 0; i < vortexCount; i++) {
        const hue = (hueOffset + (i / vortexCount) * 360) % 360;
        const vAngle = (i / vortexCount) * Math.PI * 2 + t * 0.006;
        const vR = 12 + i * 3;
        ctx.strokeStyle = `hsl(${hue}, 100%, 65%)`;
        ctx.shadowColor = `hsl(${hue}, 100%, 65%)`;
        ctx.shadowBlur = 12;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.80;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(vAngle) * vR, y + Math.sin(vAngle) * vR);
        ctx.lineTo(
          x + Math.cos(vAngle + Math.PI * 0.4) * (vR + 12),
          y + Math.sin(vAngle + Math.PI * 0.4) * (vR + 12)
        );
        ctx.stroke();
      }
    }

    ctx.restore();
  }


  clear() {
    this.intensity = 0;
    this.targetIntensity = 0;
    this.particles = [];
  }
}
