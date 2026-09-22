/**
 * Campus Clash — Particle System with Object Pooling, Impact Rings & Bold Damage Text
 * @module engine/particleSystem
 */

export const EMITTER_TYPE = {
  SLASH: 'slash',           // Topper: Paper cuts, razor sharp diamond blades
  BLOB: 'blob',             // Backbencher: Ink droplets, chaotic messy splatters
  FEATHER: 'feather',       // Hosteler: Soft floating white pillow feathers
  HEXAGON: 'hexagon',       // Senior: Crackling amber glass hexagons
  SQUARE: 'square',         // Placement Warrior: Green corporate grid data blocks
  RING: 'ring',             // Sports Star: Sonic boom shockwave concentric rings
  BINARY: 'binary',         // Cypher: Floating 0 and 1 green matrix bits
  TRIANGLE: 'triangle',     // Gavel: Heavy golden court shards & gavel dust
  WIND_BURST: 'wind_burst', // Bolt: Aerodynamic blue supersonic vapor trails
  PAINT_DROP: 'paint_drop'  // Palette: Multi-colored chromatic wet paint droplets
};

export class Particle {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.size = 3;
    this.color = '#ffd700';
    this.life = 0;
    this.maxLife = 20;
    this.gravity = 0.2;
    this.shape = 'circle';
    this.text = '';
    this.rotation = 0;
    this.vRot = 0;
    this.glowRadius = 0;
  }

  reset(x, y, vx, vy, size, color, maxLife, gravity = 0.2, shape = 'circle', text = '', glowRadius = 0) {
    this.active = true;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.color = color;
    this.life = 0;
    this.maxLife = maxLife;
    this.gravity = gravity;
    this.shape = shape;
    this.text = text;
    this.rotation = Math.random() * Math.PI * 2;
    this.vRot = (Math.random() - 0.5) * 0.25;
    this.glowRadius = glowRadius;
  }

  update() {
    if (!this.active) return;
    this.life++;
    if (this.life >= this.maxLife) {
      this.active = false;
      return;
    }
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.rotation += this.vRot;
  }

  render(ctx) {
    if (!this.active) return;
    const progress = this.life / this.maxLife;
    const alpha = Math.max(0, 1 - progress);
    const currentSize = Math.max(0.5, this.size * (1 - progress * 0.4));

    ctx.save();
    ctx.globalAlpha = alpha;
    
    // Glow pass
    if (this.shape !== 'text' && this.glowRadius > 0) {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = this.glowRadius * (1 - progress * 0.7);
    }
    
    ctx.fillStyle = this.color;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (this.shape === 'rect') {
      ctx.fillRect(-currentSize / 2, -currentSize / 2, currentSize, currentSize);
    } else if (this.shape === 'text' && this.text) {
      ctx.font = `900 ${Math.round(currentSize * 2.8)}px "Arial Black", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(this.text, 0, 0);
      ctx.fillText(this.text, 0, 0);
    } else if (this.shape === 'slash' || this.shape === 'shard') {
      // Razor sharp geometric diamond shard / paper cut with glinting edge
      const w = currentSize * 1.8;
      const h = currentSize * 0.5;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(-w, 0);
      ctx.lineTo(0, -h);
      ctx.lineTo(w, 0);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Bright white core glint
      ctx.globalAlpha = alpha * 0.9;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-w * 0.7, 0);
      ctx.lineTo(w * 0.7, 0);
      ctx.stroke();
    } else if (this.shape === 'blob') {
      // Chaotic organic ink/paint droplet
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(0, 0, currentSize, 0, Math.PI * 2);
      ctx.fill();
      // Satellite droplet
      ctx.beginPath();
      ctx.arc(currentSize * 0.8, currentSize * 0.8, currentSize * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shape === 'feather') {
      // Soft drifting pillow feather
      const w = currentSize * 1.6;
      const h = currentSize * 0.7;
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
      // Center quill
      ctx.strokeStyle = 'rgba(200,220,240,0.8)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-w, 0);
      ctx.lineTo(w, 0);
      ctx.stroke();
    } else if (this.shape === 'hexagon') {
      // Crackling amber glass hexagon
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const hx = Math.cos(a) * currentSize;
        const hy = Math.sin(a) * currentSize;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 0.75;
      ctx.stroke();
    } else if (this.shape === 'square') {
      // Crisp geometric green data block
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(-currentSize / 2, -currentSize / 2, currentSize, currentSize);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 0.7;
      ctx.strokeRect(-currentSize / 2, -currentSize / 2, currentSize, currentSize);
    } else if (this.shape === 'ring') {
      // Expanding hollow sonic shock ring
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(1, currentSize * 0.4);
      ctx.beginPath();
      ctx.arc(0, 0, currentSize * 1.4, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.shape === 'binary') {
      // Glowing 0 / 1 matrix bit
      ctx.font = `bold ${Math.round(currentSize * 2.2)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#00FF41';
      ctx.shadowColor = '#00FF41';
      ctx.shadowBlur = 10;
      ctx.fillText(this.text || (Math.random() > 0.5 ? '1' : '0'), 0, 0);
    } else if (this.shape === 'triangle') {
      // Heavy golden 3-pointed court shard
      const r = currentSize * 1.3;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.866, r * 0.5);
      ctx.lineTo(-r * 0.866, r * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#FFE082';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    } else if (this.shape === 'wind_burst') {
      // Aerodynamic supersonic speed streak
      const len = currentSize * 2.4;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(1, currentSize * 0.4);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-len / 2, 0);
      ctx.lineTo(len / 2, 0);
      ctx.stroke();
    } else if (this.shape === 'paint_drop') {
      // Teardrop chromatic wet paint droplet
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, currentSize, 0, Math.PI);
      ctx.lineTo(0, -currentSize * 1.8);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, currentSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export class ImpactRing {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.color = '#ffd700';
    this.startRadius = 20;
    this.maxRadius = 100;
    this.life = 0;
    this.maxLife = 15;
    this.lineWidth = 4;
  }

  reset(x, y, color = '#ffd700', maxRadius = 100, maxLife = 15, lineWidth = 4) {
    this.active = true;
    this.x = x;
    this.y = y;
    this.color = color;
    this.startRadius = 18;
    this.maxRadius = maxRadius;
    this.life = 0;
    this.maxLife = maxLife;
    this.lineWidth = lineWidth;
  }

  update() {
    if (!this.active) return;
    this.life++;
    if (this.life >= this.maxLife) {
      this.active = false;
    }
  }

  render(ctx) {
    if (!this.active) return;
    const progress = this.life / this.maxLife;
    const radius = this.startRadius + (this.maxRadius - this.startRadius) * Math.sin(progress * Math.PI * 0.5);
    const alpha = Math.max(0, 1 - progress);

    ctx.save();
    // Outer larger ring, more transparent
    ctx.globalAlpha = alpha * 0.6;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = Math.max(1, this.lineWidth * (1 - progress * 0.6));

    ctx.beginPath();
    ctx.arc(this.x, this.y, radius * 1.2, 0, Math.PI * 2);
    ctx.stroke();

    // Secondary inner bright ring at 60% radius
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(1, this.lineWidth * 0.6 * (1 - progress));
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius * 0.6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}

export class DamageText {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.text = '';
    this.color = '#ffffff';
    this.borderColor = '#ff1744';
    this.life = 0;
    this.maxLife = 45; // 45 frames
    this.vy = -2.2;
  }

  reset(x, y, text, color = '#ffffff', borderColor = '#ff1744') {
    this.active = true;
    this.x = x + (Math.random() - 0.5) * 20;
    this.y = y - 20;
    this.text = text;
    this.color = color;
    this.borderColor = borderColor;
    this.life = 0;
    this.maxLife = 45;
    this.vy = -2.2; // Floats up ~60px
  }

  update() {
    if (!this.active) return;
    this.life++;
    this.y += this.vy;
    this.vy *= 0.94; // Decelerates upward
    if (this.life >= this.maxLife) {
      this.active = false;
    }
  }

  render(ctx) {
    if (!this.active) return;
    const progress = this.life / this.maxLife;
    const alpha = Math.max(0, 1 - progress);

    // Initial scale pop (36px base size)
    const scale = progress < 0.12 ? 1 + (0.12 - progress) * 3.0 : 1;
    const fontSize = Math.round(36 * scale);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `900 ${fontSize}px "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Bold thick border outline
    ctx.strokeStyle = this.borderColor || '#ff1744';
    ctx.lineWidth = 6;
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 8;
    ctx.strokeText(this.text, this.x, this.y);

    // Inner crisp fill
    ctx.fillStyle = this.color || '#FFFFFF';
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

export class ParticleSystem {
  constructor(maxParticles = 300) {
    this.maxParticles = maxParticles;
    this.pool = Array.from({ length: maxParticles }, () => new Particle());
    this.damageTexts = Array.from({ length: 40 }, () => new DamageText());
    this.impactRings = Array.from({ length: 20 }, () => new ImpactRing());
  }

  spawn(x, y, vx, vy, size, color, maxLife, gravity = 0.2, shape = 'circle', text = '', glowRadius = 0) {
    const p = this.pool.find(item => !item.active);
    if (p) {
      p.reset(x, y, vx, vy, size, color, maxLife, gravity, shape, text, glowRadius);
    }
  }

  spawnImpactRing(x, y, color = '#ffd700', maxRadius = 100, maxLife = 15) {
    const ring = this.impactRings.find(item => !item.active);
    if (ring) {
      ring.reset(x, y, color, maxRadius, maxLife);
    }
  }

  spawnDamageText(x, y, damage, color = '#ffffff', borderColor = '#ff1744') {
    const dt = this.damageTexts.find(item => !item.active);
    if (dt) {
      dt.reset(x, y, `-${damage}`, color, borderColor);
    }
  }

  /**
   * Enhanced Hit Sparks: 30 particles, 3-8px size, 40-frame lifetime, explosive spread.
   * @param {boolean} [isHeavy=false] - If true, adds 8 fixed-angle angular spark shards
   */
  spawnHitSparks(x, y, color = '#ffd700', count = 30, isHeavy = false) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.0 + Math.random() * 8.5;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 2.5;
      const size = 3 + Math.random() * 5.0;
      const life = 25 + Math.floor(Math.random() * 16);
      this.spawn(x, y, vx, vy, size, color, life, 0.25, 'circle', '', 12);
    }
    // Bright white core sparks
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 6.0;
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 1.5, 3.0, '#FFFFFF', 20, 0.15, 'circle', '', 10);
    }
    // Heavy attacks get 8 fixed-angle angular shard spikes (GG-style star-burst)
    if (isHeavy) {
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const speed = 7.0 + Math.random() * 4.0;
        this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 4.5, '#FFFFFF', 15, 0.1, 'shard', '', 15);
      }
      // Outer accent ring shards
      for (let i = 0; i < 4; i++) {
        const angle = ((i / 4) * Math.PI * 2) + Math.PI / 8;
        this.spawn(x, y, Math.cos(angle) * 9.5, Math.sin(angle) * 9.5, 5.5, color, 14, 0.08, 'shard', '', 12);
      }
    }
  }

  /**
   * Glass Shatter: counter-hit visual — jagged red/white shards persisting 18 frames.
   */
  spawnGlassShatter(x, y) {
    const colors = ['#ffffff', '#ffcdd2', '#ff5252', '#ffffff', '#ef9a9a'];
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = 4.5 + Math.random() * 8.0;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 4.0 + Math.random() * 5.5;
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 2.0, size, color, 18, 0.18, 'shard');
    }
    // Slow drifting glass chips
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.spawn(x, y, Math.cos(angle) * 2.5, Math.sin(angle) * 2.5 - 1.0, 3.0, '#ffffff', 22, 0.12, 'shard');
    }
    // Central bright flash rings
    this.spawnImpactRing(x, y, '#ff1744', 70, 10);
    this.spawnImpactRing(x, y, '#ffffff', 45, 7);
  }

  /**
   * Landing Dust Ring: triggered on high-impact landings.
   */
  spawnLandingRing(x, y) {
    this.spawnImpactRing(x, y, '#cfd8dc', 45, 10);
    for (let i = 0; i < 10; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * Math.PI * 0.8;
      const speed = 1.5 + Math.random() * 3.5;
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 1.0, 3.5, '#b0bec5', 16, 0.06, 'circle');
    }
  }

  spawnBlockSparks(x, y, color = '#64b5f6') {
    for (let i = 0; i < 18; i++) {
      const vx = (Math.random() - 0.5) * 8.5;
      const vy = -Math.random() * 6.5;
      this.spawn(x, y, vx, vy, 4.0, color, 20, 0.22, 'rect');
    }
  }

  spawnDust(x, y, direction = 1) {
    for (let i = 0; i < 6; i++) {
      const vx = -direction * (1.5 + Math.random() * 3.5);
      const vy = -Math.random() * 2.2;
      this.spawn(x, y, vx, vy, 4.0, '#cfd8dc', 18, 0.05, 'circle');
    }
  }

  spawnGoldPerfect(x, y) {
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2;
      const speed = 4.0 + Math.random() * 5.5;
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 5.0, '#ffe082', 30, 0.05, 'circle');
    }
    this.spawnImpactRing(x, y, '#ffd700', 120, 20);
  }

  spawnPaperExplosion(x, y) {
    const items = ['📄', '📝', '📃', '✏️', '📎'];
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 6.0;
      const sym = items[Math.floor(Math.random() * items.length)];
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 2.5, 4.5, '#FF6B35', 35, 0.15, 'text', sym);
    }
  }

  spawnFoodExplosion(x, y) {
    const items = ['🍛', '🍚', '💧', '🌶️', '🍲'];
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 7.0;
      const sym = items[Math.floor(Math.random() * items.length)];
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 2.5, 4.5, '#CC5533', 35, 0.2, 'text', sym);
    }
  }

  spawnMathExplosion(x, y) {
    const numbers = ['42', '69', '99', '420', '√', '✓', 'π'];
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 6.5;
      const num = numbers[Math.floor(Math.random() * numbers.length)];
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 2.0, 5.0, '#FFD700', 35, 0.1, 'text', num);
    }
  }

  spawnChaiExplosion(x, y) {
    const drops = ['💧', '♨', '☁', '🍂'];
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 6.0;
      const drop = drops[Math.floor(Math.random() * drops.length)];
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 2.0, 4.5, '#C9A84C', 35, 0.15, 'text', drop);
    }
  }

  spawnCricketExplosion(x, y) {
    const sparks = ['⚡', '💥', '🏏', '6!'];
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.5 + Math.random() * 7.5;
      const spark = sparks[Math.floor(Math.random() * sparks.length)];
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 3.0, 5.0, '#39FF14', 35, 0.15, 'text', spark);
    }
  }

  /**
   * Binary Splash: Cypher's hacker VFX — glowing 0/1 glyph particles in matrix green.
   */
  createBinarySplash(x, y) {
    const glyphs = ['0', '1', '01', '10', '>>',  '{}', '//'];
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 6.5;
      const glyph = glyphs[Math.floor(Math.random() * glyphs.length)];
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 2.5, 4.5, '#00ff41', 30, 0.12, 'text', glyph);
    }
    // Bright hex ring pulse
    this.spawnImpactRing(x, y, '#00ff41', 80, 12);
    this.spawnImpactRing(x, y, '#00e5ff', 50, 8);
    // Core sparks
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.0 + Math.random() * 5.0;
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 1.5, 3.5, '#00e5ff', 18, 0.2, 'circle');
    }
  }

  /**
   * Paint Splatter: Palette's wet chromatic paint droplets.
   * @param {string} [color='#ff69b4']
   */
  createPaintSplatter(x, y, color = '#ff69b4') {
    const paintColors = ['#ff1493', '#ff69b4', '#da70d6', '#9b59b6', '#ff7f50', '#ffd700', '#00e5ff'];
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 7.0;
      const c = paintColors[Math.floor(Math.random() * paintColors.length)];
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 2.0, 4.0 + Math.random() * 4, c, 32, 0.18, 'circle');
    }
    // Large paint blobs (rects)
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 4.0;
      const c = paintColors[Math.floor(Math.random() * paintColors.length)];
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 1.0, 7.0, c, 28, 0.22, 'rect');
    }
    this.spawnImpactRing(x, y, color, 65, 10);
  }

  /**
   * Shockwave Ring: Gavel's crater impact — dense expanding pressure wave.
   * @param {number} [radius=120]
   */
  createShockwaveRing(x, y, radius = 120) {
    this.spawnImpactRing(x, y, '#ffd700', radius, 18, 6);
    this.spawnImpactRing(x, y, '#ffffff', radius * 0.7, 12, 3);
    this.spawnImpactRing(x, y, '#ff8c00', radius * 0.45, 8, 4);
    // Radial debris
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4.0 + Math.random() * 9.0;
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 3.0, 5.0, '#ffd700', 20, 0.25, 'shard');
    }
  }

  /**
   * Feather Burst: Hosteler's pillow explosion — soft white drifting feathers.
   */
  createFeatherBurst(x, y) {
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 3.5;
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 2.5, 5.0 + Math.random() * 3, '#f8f8ff', 45, 0.04, 'rect');
    }
    // Soft puff ring
    this.spawnImpactRing(x, y, '#e0e0e0', 60, 14, 3);
    // Micro feather fragments
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.spawn(x, y, Math.cos(angle) * 1.5, Math.sin(angle) * 1.5 - 1.0, 2.5, '#ffffff', 55, 0.02, 'circle');
    }
  }

  /**
   * Chalk Dust: Backbencher's defence cloud — swirling white powder + eraser bits.
   */
  createChalkDust(x, y) {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 3.0;
      const grey = Math.floor(180 + Math.random() * 75);
      const col = `rgb(${grey},${grey},${grey})`;
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 1.5, 3.5 + Math.random() * 4, col, 38, 0.03, 'circle');
    }
    // Eraser fragments (pink rect)
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 4.0;
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 2.0, 5.0, '#ffb3ba', 22, 0.18, 'rect');
    }
  }

  /**
   * Paper Cuts: Topper's sharp geometric slash shards — white/cyan hard angles.
   */
  createPaperCuts(x, y) {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      const speed = 5.0 + Math.random() * 8.0;
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 2.0, 5.5, '#ffffff', 15, 0.1, 'shard');
    }
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.0 + Math.random() * 5.0;
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 1.5, 4.0, '#00e5ff', 12, 0.12, 'shard');
    }
    this.spawnImpactRing(x, y, '#00e5ff', 55, 8);
  }

  /**
   * Dispatches visual sparks & thematic impact particles for each character.
   * @param {string} characterId - e.g. 'topper', 'backbencher', etc.
   * @param {number} x - Impact world X
   * @param {number} y - Impact world Y
   * @param {string} [color='#ffd700'] - Primary color
   * @param {boolean} [isHeavy=false] - Whether it's a heavy/ultimate impact
   */
  spawnCharacterSparks(characterId, x, y, color = '#ffd700', isHeavy = false) {
    const count = isHeavy ? 35 : 20;

    switch (characterId) {
      case 'topper': {
        // Razor-sharp geometric diamond slash shards + cyan glints
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = (isHeavy ? 5.0 : 3.0) + Math.random() * 7.0;
          const col = Math.random() > 0.4 ? '#00e5ff' : '#FFFFFF';
          this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 1.5, 4.0 + Math.random() * 4.0, col, 22, 0.12, EMITTER_TYPE.SLASH);
        }
        this.spawnMathExplosion(x, y);
        break;
      }
      case 'backbencher': {
        // Chaotic ink droplets + pink eraser bits + paper scraps
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2.5 + Math.random() * 8.0;
          const col = Math.random() > 0.5 ? '#ff6b35' : (Math.random() > 0.5 ? '#cc2200' : '#2c2c2c');
          this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 2.0, 3.5 + Math.random() * 5.0, col, 28, 0.22, EMITTER_TYPE.BLOB);
        }
        this.createChalkDust(x, y);
        this.spawnPaperExplosion(x, y);
        break;
      }
      case 'hosteler': {
        // Soft drifting white pillow feathers + steel tiffin food splatter
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1.0 + Math.random() * 4.5;
          this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 2.5, 5.0 + Math.random() * 4.0, '#FFFFFF', 45, 0.05, EMITTER_TYPE.FEATHER);
        }
        this.createFeatherBurst(x, y);
        this.spawnFoodExplosion(x, y);
        break;
      }
      case 'senior': {
        // Crackling amber glass hexagons + hot steaming chai droplets
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
          const speed = 3.5 + Math.random() * 6.5;
          const col = Math.random() > 0.4 ? '#ffd700' : '#c9a84c';
          this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 1.5, 4.5 + Math.random() * 4.5, col, 24, 0.15, EMITTER_TYPE.HEXAGON);
        }
        this.spawnChaiExplosion(x, y);
        break;
      }
      case 'placementWarrior': {
        // Sharp matrix green / cyber blue data squares & career nodes
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 3.0 + Math.random() * 7.5;
          const col = Math.random() > 0.5 ? '#00c853' : '#4a90d9';
          this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 1.8, 4.0 + Math.random() * 4.0, col, 20, 0.18, EMITTER_TYPE.SQUARE);
        }
        break;
      }
      case 'sportsStar': {
        // Concentric sonic boom shockwave rings + athletic power sparks
        for (let i = 0; i < (isHeavy ? 6 : 3); i++) {
          this.spawn(x, y, 0, 0, 8.0 + i * 6.0, '#39ff14', 16 + i * 3, 0, EMITTER_TYPE.RING);
        }
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 4.0 + Math.random() * 8.0;
          this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 2.5, 3.5 + Math.random() * 4.0, '#00d4ff', 22, 0.15, 'circle');
        }
        this.spawnCricketExplosion(x, y);
        break;
      }
      case 'cypher': {
        // Glowing matrix binary stream bits + cyber cyan pulses
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2.0 + Math.random() * 6.5;
          const bit = Math.random() > 0.5 ? '1' : '0';
          this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 2.0, 5.0, '#00ff41', 32, 0.10, EMITTER_TYPE.BINARY, bit);
        }
        this.createBinarySplash(x, y);
        break;
      }
      case 'gavel': {
        // Heavy golden court shards & thick golden shockwave ring
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 4.0 + Math.random() * 9.0;
          const col = Math.random() > 0.5 ? '#ffd700' : '#c8a84b';
          this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 2.5, 4.5 + Math.random() * 5.0, col, 26, 0.25, EMITTER_TYPE.TRIANGLE);
        }
        this.createShockwaveRing(x, y, isHeavy ? 130 : 90);
        break;
      }
      case 'bolt': {
        // Supersonic blue vapor streaks + gold dash trail bursts
        for (let i = 0; i < count; i++) {
          const angle = (Math.random() - 0.5) * Math.PI * 0.8;
          const speed = 6.0 + Math.random() * 9.0;
          const col = Math.random() > 0.5 ? '#00e5ff' : '#ffd700';
          this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 4.0 + Math.random() * 4.0, col, 18, 0.08, EMITTER_TYPE.WIND_BURST);
        }
        break;
      }
      case 'palette': {
        // Multi-chromatic wet paint droplets
        this.createPaintSplatter(x, y, color);
        break;
      }
      default: {
        this.spawnHitSparks(x, y, color, count, isHeavy);
        break;
      }
    }
  }

  update() {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) this.pool[i].update();
    }
    for (let i = 0; i < this.damageTexts.length; i++) {
      if (this.damageTexts[i].active) this.damageTexts[i].update();
    }
    for (let i = 0; i < this.impactRings.length; i++) {
      if (this.impactRings[i].active) this.impactRings[i].update();
    }
  }

  render(ctx) {
    // 1. Render shockwave rings underneath particles
    for (let i = 0; i < this.impactRings.length; i++) {
      if (this.impactRings[i].active) this.impactRings[i].render(ctx);
    }
    // 2. Render particles
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) this.pool[i].render(ctx);
    }
    // 3. Render damage texts on top
    for (let i = 0; i < this.damageTexts.length; i++) {
      if (this.damageTexts[i].active) this.damageTexts[i].render(ctx);
    }
  }

  clear() {
    for (let i = 0; i < this.pool.length; i++) {
      this.pool[i].active = false;
    }
    for (let i = 0; i < this.damageTexts.length; i++) {
      this.damageTexts[i].active = false;
    }
    for (let i = 0; i < this.impactRings.length; i++) {
      this.impactRings[i].active = false;
    }
  }
}
