/**
 * The Vertical Sprawl — Venue Stage Implementation
 * Five-level neon city block with rooftops, balconies, walkways, and wet courtyard.
 * High verticality, architectural depth layers, rain-slick reflections.
 * Enhanced: Student crowd on balconies, phone-light spectators, reactive cheer,
 *           stronger 3D perspective floor grid, depth fog layers.
 * @module stages/venues/verticalSprawlStage
 */

import { StageBase } from '../stageBase.js';
import { VERTICAL_SPRAWL_CONFIG } from '../configs/verticalSprawl.config.js';
import { CharacterSyncLayer } from '../characterSync.js';

export class VerticalSprawlStage extends StageBase {
  constructor() {
    super(VERTICAL_SPRAWL_CONFIG);

    // Rain drops
    this.ambientParticles = [];
    const pCount = this.qualityTier === 'high' ? 60 : (this.qualityTier === 'medium' ? 30 : 10);
    for (let i = 0; i < pCount; i++) {
      this.ambientParticles.push({
        x: Math.random() * 1200,
        y: Math.random() * 640,
        vx: -1.2,
        vy: 14 + Math.random() * 6,
        length: 8 + Math.random() * 8,
        alpha: 0.15 + Math.random() * 0.3
      });
    }

    // Student crowd spectators on balconies
    // Each spectator: position index, phone-flash timer, cheer bob offset, cheer intensity
    this.spectators = [];
    const specCount = this.qualityTier === 'high' ? 48 : (this.qualityTier === 'medium' ? 28 : 12);
    for (let i = 0; i < specCount; i++) {
      this.spectators.push({
        side: i % 2 === 0 ? 'left' : 'right',
        index: Math.floor(i / 2),
        tier: Math.floor(Math.random() * 3) + 1, // 1-3
        flashTimer: Math.random() * 120,
        flashAlpha: 0,
        cheerBob: Math.random() * Math.PI * 2,
        cheerSpeed: 3.5 + Math.random() * 2,
        phoneUp: Math.random() > 0.5, // phone up = recording
        cheerIntensity: 0 // boosted on hit
      });
    }

    // Crowd cheer intensity (decays over time, spiked by onFighterHit)
    this.crowdCheerLevel = 0;
    // Ripple splashes on ground puddles triggered by hits
    this.puddelSplashes = [];
  }

  updateAmbientParticles(dt) {
    for (const p of this.ambientParticles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y > this.groundY) {
        p.y = 0;
        p.x = Math.random() * 1200;
      }
    }
  }

  update(dt, fighters = [], particles = null, sound = null) {
    super.update(dt, fighters, particles, sound);

    // Decay crowd cheer
    this.crowdCheerLevel = Math.max(0, this.crowdCheerLevel - 0.018);

    // Update spectators
    for (const s of this.spectators) {
      s.flashTimer++;
      // Cheer more during high excitement
      const flashRate = 40 + (1 - this.crowdCheerLevel) * 80;
      if (s.flashTimer > flashRate + Math.random() * 60) {
        s.flashAlpha = 0.85;
        s.flashTimer = 0;
      }
      s.flashAlpha = Math.max(0, s.flashAlpha - 0.12);

      // Update cheer intensity per spectator
      s.cheerIntensity = Math.max(0, s.cheerIntensity + (this.crowdCheerLevel - s.cheerIntensity) * 0.06);
    }

    // Decay puddle splashes
    for (let i = this.puddelSplashes.length - 1; i >= 0; i--) {
      const sp = this.puddelSplashes[i];
      sp.radius += 4;
      sp.alpha -= 0.06;
      if (sp.alpha <= 0) this.puddelSplashes.splice(i, 1);
    }
  }

  onFighterHit(x, y, isHeavy = false) {
    super.onFighterHit(x, y, isHeavy);
    // Spike crowd cheer
    this.crowdCheerLevel = Math.min(1, this.crowdCheerLevel + (isHeavy ? 0.55 : 0.25));
    // Boost spectator flash rate (random spectators grab phones)
    for (const s of this.spectators) {
      if (Math.random() < (isHeavy ? 0.6 : 0.3)) {
        s.flashTimer = 999; // trigger flash immediately
        s.phoneUp = true;
      }
    }
    // Splash puddle rings on ground
    this.puddelSplashes.push({ x, radius: 5, alpha: 0.7 });
  }

  renderBackground(ctx, camera = { x: 0, y: 0, scale: 1 }) {
    const camX = camera.x || 0;
    const t = this.time;

    // 1. Deep Midnight Cyberpunk Sky (Cached)
    if (!this._skyGrad) {
      this._skyGrad = ctx.createLinearGradient(0, 0, 0, 640);
      this._skyGrad.addColorStop(0, '#040814');
      this._skyGrad.addColorStop(0.5, '#0b162b');
      this._skyGrad.addColorStop(0.85, '#132342');
      this._skyGrad.addColorStop(1, '#050a14');
    }
    ctx.fillStyle = this._skyGrad;
    ctx.fillRect(0, 0, 960, 640);

    // 2. Atmospheric far-depth haze overlay (fades mid-to-top for depth fog)
    if (!this._fogGrad) {
      this._fogGrad = ctx.createLinearGradient(0, 0, 0, 380);
      this._fogGrad.addColorStop(0, 'rgba(6, 14, 30, 0.72)');
      this._fogGrad.addColorStop(0.6, 'rgba(6, 14, 30, 0.22)');
      this._fogGrad.addColorStop(1, 'rgba(6, 14, 30, 0)');
    }
    ctx.fillStyle = this._fogGrad;
    ctx.fillRect(0, 0, 960, 380);

    // 3. Far Background: Mega Skyscrapers & Towering Cyber Sprawl (Z = -500, Parallax 0.08)
    const farOffsetX = -camX * 0.08;
    ctx.save();
    ctx.translate(farOffsetX, 0);

    // Towering academic silhouettes
    ctx.fillStyle = '#060f1e';
    ctx.fillRect(80, 30, 100, 500); // narrow left tower
    ctx.fillRect(200, 20, 160, 490); // main slab
    ctx.fillRect(400, 10, 220, 490); // wide center
    ctx.fillRect(660, 40, 180, 460); // right tower
    ctx.fillRect(870, 25, 130, 510); // far right

    // Antennas on top of towers
    ctx.strokeStyle = '#0d2240';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(480, 10); ctx.lineTo(480, -30);
    ctx.moveTo(290, 20); ctx.lineTo(290, -20);
    ctx.stroke();

    // Blinking antenna lights
    ctx.fillStyle = (Math.sin(t * 2.5) > 0) ? '#ff0044' : '#550011';
    ctx.shadowColor = '#ff0044'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(480, -30, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(290, -20, 3, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Giant Glowing Cyan / Magenta Cyber Billboards on Far Towers
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(0, 229, 255, 0.45)';
    ctx.fillRect(220, 50, 45, 140);
    ctx.fillStyle = 'rgba(255, 0, 127, 0.45)';
    ctx.fillRect(440, 40, 70, 120);
    ctx.fillStyle = 'rgba(0, 229, 255, 0.35)';
    ctx.fillRect(700, 70, 50, 160);
    ctx.globalCompositeOperation = 'source-over';

    // Rows of lit windows — depth faded
    ctx.globalAlpha = 0.4;
    for (let wy = 60; wy < 420; wy += 22) {
      for (let wx = 210; wx < 360; wx += 14) {
        if (Math.sin(wx * 13.7 + wy * 7.3) > 0.2) {
          ctx.fillStyle = Math.sin(wx + wy) > 0 ? '#ffe08244' : '#00e5ff22';
          ctx.fillRect(wx, wy, 8, 12);
        }
      }
      for (let wx = 415; wx < 610; wx += 14) {
        if (Math.sin(wx * 11.1 + wy * 5.9) > 0.1) {
          ctx.fillStyle = '#00e5ff33';
          ctx.fillRect(wx, wy, 8, 12);
        }
      }
    }
    ctx.globalAlpha = 1.0;
    ctx.restore();

    // 4. High Aerial Suspension Skybridge (Z = -300, Parallax 0.22)
    const bridgeOffsetX = -camX * 0.22;
    ctx.save();
    ctx.translate(bridgeOffsetX, 0);
    ctx.strokeStyle = '#142544';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(480, 180, 260, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();

    // Amber lights on bridge walkway
    for (let b = 0; b < 10; b++) {
      const bx = 300 + b * 40;
      const by = 135 + Math.sin(b * 0.3) * 6;
      ctx.fillStyle = '#ffe082';
      ctx.shadowColor = '#ffe082'; ctx.shadowBlur = 4;
      ctx.fillRect(bx, by, 4, 4);
    }
    ctx.shadowBlur = 0;

    // Students visible on the skybridge
    if (this.qualityTier !== 'low') {
      ctx.fillStyle = '#060e1e';
      for (let b = 0; b < 6; b++) {
        const bx = 320 + b * 44;
        const by = 128;
        const bob = Math.sin(t * 2.8 + b) * 2;
        ctx.beginPath();
        ctx.arc(bx, by + bob, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(bx - 4, by + bob + 5, 8, 10);
      }
    }
    ctx.restore();

    // 5. Midground Multi-Tier Walkways & Concrete Balconies with Spectators (Z = -120, Parallax 0.45)
    const midOffsetX = -camX * 0.45;
    ctx.save();
    ctx.translate(midOffsetX, 0);

    // Left Balcony Complex (3 Tiers)
    for (let tier = 1; tier <= 3; tier++) {
      const by = 140 + tier * 85;
      const bw = 240 - tier * 30;
      ctx.fillStyle = '#0e1c36';
      ctx.fillRect(-80, by, bw, 22);

      // Warm Amber Underglow
      ctx.fillStyle = 'rgba(255, 180, 50, 0.18)';
      ctx.fillRect(-80, by + 22, bw, 35);

      // Neon Signage (Hot Magenta / Cyan)
      const signColor = tier % 2 === 0 ? '#ff007f' : '#00e5ff';
      ctx.fillStyle = signColor;
      ctx.shadowColor = signColor; ctx.shadowBlur = 10;
      ctx.fillRect(20, by + 4, 65, 14);
      ctx.shadowBlur = 0;

      // Student crowd on left balconies
      this._renderBalconyCrowd(ctx, t, 'left', tier, by - 18, bw - 100, this.crowdCheerLevel);
    }

    // Right Balcony Complex (3 Tiers)
    for (let tier = 1; tier <= 3; tier++) {
      const by = 140 + tier * 85;
      const bx = 760 + tier * 30;
      const bw = 280;
      ctx.fillStyle = '#0e1c36';
      ctx.fillRect(bx, by, bw, 22);

      // Warm Amber Underglow
      ctx.fillStyle = 'rgba(255, 180, 50, 0.18)';
      ctx.fillRect(bx, by + 22, bw, 35);

      // Neon Signage (Cyan / Magenta)
      const signColor = tier % 2 === 0 ? '#00e5ff' : '#ff007f';
      ctx.fillStyle = signColor;
      ctx.shadowColor = signColor; ctx.shadowBlur = 10;
      ctx.fillRect(bx + 20, by + 4, 65, 14);
      ctx.shadowBlur = 0;

      // Student crowd on right balconies
      this._renderBalconyCrowd(ctx, t, 'right', tier, by - 18, bx + 20, this.crowdCheerLevel);
    }

    // Phone flash lights from spectators
    if (this.qualityTier !== 'low') {
      ctx.globalCompositeOperation = 'screen';
      for (const s of this.spectators) {
        if (s.flashAlpha > 0.05) {
          const tier = s.tier;
          const baseY = 140 + tier * 85 - 18;
          let bx;
          if (s.side === 'left') {
            bx = 10 + s.index * 20;
          } else {
            bx = 790 + tier * 30 + s.index * 20;
          }
          ctx.globalAlpha = s.flashAlpha * 0.7;
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#aaddff'; ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(bx, baseY - 6, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'source-over';
    }

    // Dual Concrete Stairways on Left and Right
    ctx.fillStyle = '#0c172e';
    for (let s = 0; s < 8; s++) {
      ctx.fillRect(100 + s * 16, 410 + s * 16, 80, 16);
      ctx.fillRect(780 - s * 16, 410 + s * 16, 80, 16);
    }
    ctx.restore();

    // 6. Ambient Cyber Rain Particles
    ctx.save();
    ctx.strokeStyle = 'rgba(160, 210, 255, 0.35)';
    ctx.lineWidth = 1.2;
    for (const r of this.ambientParticles) {
      ctx.beginPath();
      ctx.moveTo(r.x - camX * 0.8, r.y);
      ctx.lineTo(r.x - camX * 0.8 + r.vx, r.y + r.length);
      ctx.stroke();
    }
    ctx.restore();

    // 7. Wet Courtyard Pavement & Specular Ground Line (Z = 0, Parallax 1.0)
    this.renderWetCourtyard(ctx, camX, t);
  }

  /**
   * Renders a row of student silhouettes on a balcony — batched single fill for perf
   */
  _renderBalconyCrowd(ctx, t, side, tier, baseY, startX, intensity) {
    if (this.qualityTier === 'low') return;
    const count = this.qualityTier === 'high' ? 10 : 6;
    ctx.fillStyle = '#070f20';
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const cx = startX + i * 18;
      // Bob height increases with crowd intensity
      const bob = Math.sin(t * (3 + intensity * 4) + i * 1.1 + tier) * (2 + intensity * 5);
      // Raised arm on high intensity
      const armRaise = intensity > 0.4 ? -4 : 0;
      ctx.moveTo(cx + 5, baseY + bob);
      ctx.arc(cx, baseY + bob, 5, 0, Math.PI * 2); // head
      ctx.rect(cx - 4, baseY + bob + 5, 8, 12); // torso
      // Arms raised on cheer
      if (intensity > 0.35 && i % 2 === 0) {
        ctx.rect(cx - 8, baseY + bob + armRaise + 5, 5, 2); // left arm up
        ctx.rect(cx + 3, baseY + bob + armRaise + 5, 5, 2); // right arm up
      }
    }
    ctx.fill();
  }

  renderWetCourtyard(ctx, camX, time) {
    const gy = this.groundY; // 535

    // Wet Stone Pavement (Cached)
    if (!this._pavementGrad) {
      this._pavementGrad = ctx.createLinearGradient(0, gy, 0, 640);
      this._pavementGrad.addColorStop(0, '#0f1b33');
      this._pavementGrad.addColorStop(0.35, '#0a1224');
      this._pavementGrad.addColorStop(1, '#03060d');
    }
    ctx.fillStyle = this._pavementGrad;
    ctx.fillRect(0, gy, 960, 640 - gy);

    // Wet Puddle Specular Sheens
    if (!this._puddleLeftGrad) {
      this._puddleLeftGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 180);
      this._puddleLeftGrad.addColorStop(0, 'rgba(255, 0, 127, 0.28)');
      this._puddleLeftGrad.addColorStop(0.6, 'rgba(255, 0, 127, 0.08)');
      this._puddleLeftGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    }
    if (!this._puddleRightGrad) {
      this._puddleRightGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 180);
      this._puddleRightGrad.addColorStop(0, 'rgba(0, 229, 255, 0.28)');
      this._puddleRightGrad.addColorStop(0.6, 'rgba(0, 229, 255, 0.08)');
      this._puddleRightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    }

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    // Magenta Puddle Reflection (from left neon)
    ctx.save();
    ctx.translate(240 - camX * 0.3, gy + 35);
    ctx.fillStyle = this._puddleLeftGrad;
    ctx.fillRect(-180, -35, 380, 105);
    ctx.restore();

    // Cyan Puddle Reflection (from right neon)
    ctx.save();
    ctx.translate(720 - camX * 0.3, gy + 35);
    ctx.fillStyle = this._puddleRightGrad;
    ctx.fillRect(-200, -35, 380, 105);
    ctx.restore();

    // Hit-triggered puddle splash ripples
    for (const sp of this.puddelSplashes) {
      ctx.strokeStyle = `rgba(0, 229, 255, ${sp.alpha * 0.6})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(sp.x, gy + 15, sp.radius * 2, sp.radius * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Ground Rim Highlight
    ctx.save();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(960, gy);
    ctx.stroke();
    ctx.restore();

    // Enhanced Perspective Pavement Seam Grid (3D convergence toward vanishing point)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.055)';
    ctx.lineWidth = 1;
    const vp = 480; // vanishing point X
    for (let x = -100; x < 1100; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x - camX * 0.15, gy);
      // converge lines toward vp at bottom of screen
      const bottomX = vp + (x - vp) * 1.35 - camX * 0.05;
      ctx.lineTo(bottomX, 640);
      ctx.stroke();
    }
    // Horizontal receding rows — closer rows taller gap (perspective)
    let rowY = gy + 8;
    let rowGap = 7;
    while (rowY < 640) {
      ctx.beginPath();
      ctx.moveTo(0, rowY);
      ctx.lineTo(960, rowY);
      ctx.stroke();
      rowGap = Math.min(rowGap + 1.8, 28);
      rowY += rowGap;
    }
    ctx.restore();
  }

  renderForeground(ctx, camera = { x: 0, y: 0, scale: 1 }, fighters = []) {
    const camX = camera.x || 0;

    // Industrial Machinery & Crates at Canvas Margins (Z = +100, Parallax 1.25)
    const leftCrateX = 40;
    const rightCrateX = 920;

    // Left Shipping Crate (with Occlusion Guard)
    const leftAlpha = CharacterSyncLayer.getOcclusionAlpha(leftCrateX, 70, fighters, 0.9);
    ctx.save();
    ctx.globalAlpha = leftAlpha;
    ctx.translate(-camX * 1.25, 0);
    ctx.fillStyle = '#081224';
    ctx.fillRect(leftCrateX - 35, 470, 70, 170);
    ctx.strokeStyle = '#ffe08266';
    ctx.lineWidth = 2;
    ctx.strokeRect(leftCrateX - 35, 470, 70, 170);
    // Hazard stripe on crate
    ctx.fillStyle = 'rgba(255,145,0,0.3)';
    for (let h = 0; h < 4; h++) {
      ctx.fillRect(leftCrateX - 35 + h * 18, 472, 9, 166);
    }
    ctx.restore();

    // Right Industrial Terminal (with Occlusion Guard)
    const rightAlpha = CharacterSyncLayer.getOcclusionAlpha(rightCrateX, 70, fighters, 0.9);
    ctx.save();
    ctx.globalAlpha = rightAlpha;
    ctx.translate(-camX * 1.25, 0);
    ctx.fillStyle = '#081224';
    ctx.fillRect(rightCrateX - 35, 470, 70, 170);
    ctx.strokeStyle = '#00e5ff66';
    ctx.lineWidth = 2;
    ctx.strokeRect(rightCrateX - 35, 470, 70, 170);
    ctx.restore();
  }
}
