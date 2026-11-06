/* ==========================================================================
   Campus Clash 2D — campus-clash-visuals.js
   Sprite-based fighter renderer + academic-theme FX + screen "juice".
   Plain script (no build step). Exposes window.CampusVisuals and ES export.

   HOW IT PLUGS IN:
     boot:        await CampusVisuals.loadCharacter('topper'); (for every fighter in the match)
     each frame:  const dt = CampusVisuals.beginFrame(ctx, rawDt);   // 0 during hit-stop
                  ...draw stage...
                  CampusVisuals.drawDim(ctx, W, H);                  // ultimate spotlight
                  for (f of fighters) if (!CampusVisuals.drawFighter(ctx, f, dt)) legacyDraw(f);
                  CampusVisuals.updateFX(dt); CampusVisuals.drawFX(ctx);
                  CampusVisuals.endFrame(ctx, W, H);
     on events:   CampusVisuals.onLightAttack(f) / onHeavyAttack(f) / onHit(x,y,heavy) /
                  onBlock(f) / onSpecial(f) / onUltimate(f)

   Fighter object needs: { charId, x, y (feet position), facing (1 right / -1 left),
                           state (string), height (optional, on-screen px) }
   drawFighter returns false when sprites are missing, so the old blocky
   renderer keeps working as a fallback.
   ========================================================================== */
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- data */
  const STATES = ['idle', 'walk', 'run', 'jump', 'air', 'crouch', 'light', 'heavy',
                  'block', 'dodge', 'dash', 'hit', 'special', 'ultimate'];

  const DEFAULT_ANIM = {
    idle:     { fps: 8,  loop: true  }, walk:    { fps: 10, loop: true  }, run:     { fps: 14, loop: true  },
    jump:     { fps: 10, loop: false }, air:     { fps: 10, loop: false }, crouch:  { fps: 10, loop: false },
    light:    { fps: 18, loop: false }, heavy:   { fps: 14, loop: false }, block:   { fps: 10, loop: false },
    dodge:    { fps: 14, loop: false }, dash:    { fps: 18, loop: false }, hit:     { fps: 14, loop: false },
    special:  { fps: 14, loop: false }, ultimate:{ fps: 12, loop: true  },
  };

  // Map whatever the game calls its states -> our canonical states.
  const ALIASES = {
    attack: 'light', punch: 'light', kick: 'light', 'light-attack': 'light', lightattack: 'light',
    'heavy-attack': 'heavy', heavyattack: 'heavy', smash: 'heavy',
    parry: 'block', shield: 'block', blocking: 'block', guard: 'block',
    hurt: 'hit', hitstun: 'hit', stunned: 'hit', ko: 'hit', dead: 'hit',
    walking: 'walk', running: 'run', jumping: 'jump', falling: 'air', crouching: 'crouch',
    dodging: 'dodge', roll: 'dodge',
    ult: 'ultimate', super: 'special', win: 'idle', victory: 'idle', stand: 'idle',
    ultimatefreeze: 'ultimate'
  };
  const mapState = (s) => {
    s = String(s || 'idle').toLowerCase();
    return STATES.includes(s) ? s : (ALIASES[s] || 'idle');
  };

  // id: [name, role, quote, accent, accent2, palette[4], glyphs[], stats[power,speed,range,control,difficulty], icon]
  const RAW = {
    topper:      ['The Topper', 'Academic Assassin', 'Syllabus fears me.', '#2f7bff', '#ffd23f',
                  ['#f2f4ff', '#8aa4d6', '#1f4fe0', '#ffd23f'], ['∑', '∫', 'π', 'E=mc²', 'Δx', '√', 'A+'], [4, 3, 3, 4, 3], '♛'],
    backbencher: ['The Backbencher', 'Chaos Brawler', 'Attendance is a suggestion.', '#ff6b35', '#00d4aa',
                  ['#2c2c2c', '#ff6b35', '#00d4aa', '#ffffff'], ['✈️', 'BUNK', 'PROXY', 'CHAOS', '404', 'CHILL'], [4, 4, 2, 2, 3], '🔥'],
    hosteler:    ['The Hosteler', 'Tank Grappler', 'Mess food built this.', '#ff6a3d', '#ffd7c0',
                  ['#ffd7c0', '#ff5a36', '#5a1b12', '#ffffff'], ['7', '🏀', 'BAM', 'DUNK'], [5, 2, 2, 3, 2], '✊'],
    senior:      ['The Senior', 'Control Zoner', 'I have seen this exam before.', '#2fbf71', '#cfe9dc',
                  ['#cfe9dc', '#22a06b', '#0f4d3a', '#ffffff'], ['if', 'for', '{}', 'O(n)', 'git'], [3, 2, 5, 5, 4], '🎓'],
    placement:   ['Placement Warrior', 'Rushdown Combo', 'Tell me about yourself.', '#4f6bff', '#b9c8ff',
                  ['#b9c8ff', '#1f3fd6', '#1a2a7a', '#ffffff'], ['CV', 'CTC', 'HR', 'OFFER', '✓'], [3, 5, 2, 3, 4], '👔'],
    sports:      ['Sports Star', 'Agile Brawler', 'Game on.', '#2e8bff', '#ffd23f',
                  ['#dfe6ee', '#8fc2ff', '#1f4f9c', '#ffffff'], ['ACE', 'SPIKE', '+1', 'GG'], [3, 5, 3, 3, 3], '🏐'],
    cypher:      ['Cypher', 'Campus Hacker', 'Root access granted.', '#19e6d4', '#0a1f26',
                  ['#19e6d4', '#0f3a44', '#0a1f26', '#ffffff'], ['0x1F', '01', '>_', '☠', 'SYN'], [3, 3, 4, 5, 5], '🔒'],
    gavel:       ['Gavel', 'Moot Court Legend', 'Objection — sustained.', '#f2b233', '#ffd23f',
                  ['#f3d9a4', '#5a4212', '#a37a12', '#ffd23f'], ['§', '⚖', 'ORDER', 'VOID'], [5, 2, 3, 3, 3], '⚖'],
    bolt:        ['Bolt', 'The Track Star', 'Catch me if you can.', '#29b6ff', '#e6f0ff',
                  ['#29a9ff', '#2b7fff', '#0f2d66', '#e6f0ff'], ['⚡', '9.58', 'GO', '>>>'], [2, 5, 3, 3, 4], '⚡'],
    palette:     ['Palette', 'Fine Arts Major', 'Every stroke is a strike.', '#ff4fb8', '#ffd6ec',
                  ['#f2d6ff', '#d38cff', '#e8259f', '#ffd6ec'], ['✦', '#FF4FB8', '✎', 'ART'], [3, 3, 4, 4, 4], '🎨'],
  };

  const CHARACTERS = {};
  Object.keys(RAW).forEach((id, i) => {
    const [name, role, quote, accent, accent2, palette, glyphs, stats, icon] = RAW[id];
    CHARACTERS[id] = { id, index: i + 1, name, role, quote, accent, accent2, palette, glyphs, stats, icon };
  });
  // Non-enumerable aliases for engine config IDs (preserves 10-item iteration while allowing direct lookup)
  Object.defineProperty(CHARACTERS, 'sportsStar', { get: () => CHARACTERS.sports, enumerable: false });
  Object.defineProperty(CHARACTERS, 'placementWarrior', { get: () => CHARACTERS.placement, enumerable: false });

  /* ------------------------------------------------------------ sprites */
  const store = {}; // id -> { states, portrait, ready, promise }

  function autoChromaKey(img) {
    try {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, c.width, c.height);
      const d = imgData.data;

      // Sample 4 corners to detect green (#00FF00) or magenta (#FF00FF)
      const sampleIndices = [0, (c.width - 1) * 4, ((c.height - 1) * c.width) * 4, (c.width * c.height - 1) * 4];
      let isGreen = false;
      let isMagenta = false;
      for (const idx of sampleIndices) {
        if (d[idx + 1] > 160 && d[idx + 1] > d[idx] + 60 && d[idx + 1] > d[idx + 2] + 60) isGreen = true;
        if (d[idx] > 160 && d[idx + 2] > 160 && d[idx + 1] < 100) isMagenta = true;
      }

      if (isGreen || isMagenta) {
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i+1], b = d[i+2];
          const dist = isGreen ? Math.hypot(r, g - 255, b) : Math.hypot(r - 255, g, b - 255);
          if (dist < 110) {
            d[i+3] = 0;
          } else if (dist < 160) {
            d[i+3] = Math.min(d[i+3], Math.round(255 * ((dist - 110) / 50)));
          }
        }
        ctx.putImageData(imgData, 0, 0);
        return c;
      }
    } catch (e) {
      // In case of tainted canvas (file:// protocol), fall back to original image cleanly
    }
    return img;
  }

  const loadImage = (src) => new Promise((res) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });

  /** Loads assets/characters/<id>/<state>.png (+ optional manifest.json, portrait.png). Never throws. */
  function loadCharacter(id, base = 'assets/characters') {
    // Normalise aliases (e.g. placementWarrior -> placement, sportsStar -> sports)
    if (id === 'placementWarrior') id = 'placement';
    if (id === 'sportsStar') id = 'sports';

    if (store[id] && store[id].promise) return store[id].promise;
    const entry = (store[id] = { states: {}, portrait: null, ready: false });
    entry.promise = (async () => {
      let manifest = {};
      try {
        const r = await fetch(`${base}/manifest.json`);
        if (r.ok) manifest = (await r.json())[id] || {};
      } catch (e) { /* file:// or missing manifest — fine */ }

      const loadAsset = async (name) => {
        return (await loadImage(`${base}/${id}/${name}.webp`)) || (await loadImage(`${base}/${id}/${name}.png`));
      };

      // 1. Immediately load idle sprite (WebP prioritized, PNG fallback)
      const idleImg = await loadAsset('idle');
      if (idleImg) {
        const m = manifest.idle || {};
        const frames = m.frames || 1;
        entry.states.idle = {
          img: idleImg, frames, fw: idleImg.width / frames, fh: idleImg.height,
          fps: m.fps || DEFAULT_ANIM.idle.fps,
          loop: m.loop !== undefined ? m.loop : DEFAULT_ANIM.idle.loop,
        };
        entry.portrait = idleImg;
        entry.ready = true;
      }

      // 2. Concurrently load portrait and remaining combat animation states
      const portraitPromise = loadAsset('portrait').then((img) => {
        if (img) entry.portrait = img;
        return img;
      });

      await Promise.all([
        portraitPromise,
        ...STATES.filter((s) => s !== 'idle').map(async (s) => {
          let img = await loadAsset(s);
          if (!img) {
            // Automatic state alias fallback for storage optimization (air->jump, dash->run)
            if (s === 'air') {
              img = (entry.states.jump && entry.states.jump.img) || await loadAsset('jump');
            } else if (s === 'dash') {
              img = (entry.states.run && entry.states.run.img) || await loadAsset('run');
            }
          }
          if (!img) return;
          const m = manifest[s] || (s === 'air' ? manifest.jump : (s === 'dash' ? manifest.run : {})) || {};
          const frames = m.frames || 1;
          entry.states[s] = {
            img, frames, fw: img.width / frames, fh: img.height,
            fps: m.fps || (DEFAULT_ANIM[s] && DEFAULT_ANIM[s].fps) || 8,
            loop: m.loop !== undefined ? m.loop : ((DEFAULT_ANIM[s] && DEFAULT_ANIM[s].loop) ?? true),
          };
        })
      ]);

      if (!entry.portrait && entry.states.idle) {
        entry.portrait = entry.states.idle.img;
      }
      entry.ready = !!entry.states.idle;
      return entry;
    })();
    return entry.promise;
  }
  const preloadAll = (ids = ['topper', 'backbencher'], base) => Promise.all(ids.map((id) => loadCharacter(id, base)));
  const getPortrait = (id) => {
    if (id === 'placementWarrior') id = 'placement';
    if (id === 'sportsStar') id = 'sports';
    const e = store[id];
    return e ? (e.portrait || (e.states && e.states.idle && e.states.idle.img)) : null;
  };

  // Silhouette tint (for ghost trails + hit flash). Cached per image+colour.
  const tintCache = new Map();
  function tinted(img, color) {
    const key = img.src + color;
    let c = tintCache.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = color;
      g.fillRect(0, 0, c.width, c.height);
      tintCache.set(key, c);
    }
    return c;
  }

  /* ------------------------------------------------- procedural motion
     Used for dynamic kinetic animation across both 1-frame poses and multi-frame
     spritesheets. Adds anticipation coils, forward strike lunges, impact recoil,
     and braced defensive stances for a classy, punchy arcade feel. */
  const NEUTRAL = { dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, a: 1 };
  const clamp01 = (n) => Math.max(0, Math.min(1, n));

  function proceduralPose(state, t, facing, frames = 1, frame = 0) {
    const p = { ...NEUTRAL };
    switch (state) {
      case 'idle':
        p.sy = 1 + 0.018 * Math.sin(t * 3);
        p.sx = 1 - 0.008 * Math.sin(t * 3);
        break;
      case 'walk':
        p.dy = -Math.abs(Math.sin(t * 9)) * 4;
        p.rot = 0.03 * facing;
        break;
      case 'run':
        p.dy = -Math.abs(Math.sin(t * 13)) * 6;
        p.rot = 0.09 * facing;
        p.dx = facing * 4;
        break;
      case 'jump':
        p.sy = 1.06; p.sx = 0.96; p.dy = -2;
        break;
      case 'air':
        p.sy = 0.94; p.sx = 1.04; p.dy = -4; // descending stretch
        break;
      case 'crouch':
        p.sy = 0.88; p.sx = 1.05;
        break;
      case 'light': {
        if (frames >= 3) {
          // Dynamic kinetic weight transfer for multi-frame attack strips
          if (frame === 0) {
            // Anticipation / coil back
            p.dx = -facing * 10;
            p.sy = 0.94; p.sx = 1.04;
            p.rot = -0.05 * facing;
          } else if (frame === 1) {
            // Explosive active strike lunge
            p.dx = facing * 28;
            p.sx = 1.08; p.sy = 0.96;
            p.rot = 0.08 * facing;
          } else {
            // Recovery & deceleration
            p.dx = facing * 12;
            p.sx = 1.01; p.sy = 0.99;
            p.rot = 0.02 * facing;
          }
        } else {
          const k = clamp01(t / 0.18);
          p.dx = facing * Math.sin(k * Math.PI) * 26;
          p.rot = 0.07 * facing * Math.sin(k * Math.PI);
        }
        break;
      }
      case 'heavy': {
        if (frames >= 3) {
          if (frame === 0) {
            // Deep gathering windup
            p.dx = -facing * 18;
            p.sy = 0.88; p.sx = 1.08;
            p.rot = -0.12 * facing;
          } else if (frame === 1) {
            // Enormous forward smash impulse
            p.dx = facing * 48;
            p.sx = 1.15; p.sy = 0.95;
            p.rot = 0.16 * facing;
          } else {
            // Ground impact follow-through
            p.dx = facing * 22;
            p.sy = 0.92; p.sx = 1.06;
            p.rot = 0.04 * facing;
          }
        } else {
          if (t < 0.22) {
            const k = t / 0.22;
            p.dx = -facing * 14 * k;
            p.sy = 1 - 0.1 * k;
            p.rot = -0.09 * facing * k;
          } else {
            const k = clamp01((t - 0.22) / 0.18);
            p.dx = facing * (-14 + 62 * k);
            p.sy = 1.06;
            p.rot = 0.14 * facing * (1 - k * 0.4);
          }
        }
        break;
      }
      case 'block': {
        // Braced, grounded defensive guard stance
        p.dx = -facing * 8;
        p.sx = 1.08;
        p.sy = 0.92;
        p.rot = 0.04 * facing;
        break;
      }
      case 'dodge':
        p.dx = -facing * 28 * Math.sin(clamp01(t / 0.3) * Math.PI * 0.5);
        p.rot = -0.14 * facing;
        p.a = 0.75;
        break;
      case 'dash': {
        const k = clamp01(t / 0.2);
        p.dx = facing * 42 * Math.sin(k * Math.PI * 0.5);
        p.rot = 0.14 * facing * (1 - k);
        p.sy = 0.90; p.sx = 1.10;
        p.a = 0.92;
        break;
      }
      case 'hit': {
        const k = clamp01(t / 0.25);
        p.dx = -facing * 20 * (1 - k);
        p.rot = -0.12 * facing * (1 - k);
        p.sy = 1 - 0.08 * Math.sin(k * Math.PI);
        break;
      }
      case 'special': {
        const pulse = Math.sin(t * 18);
        p.sy = 1 + 0.04 * pulse;
        p.dx = facing * (10 + 8 * Math.sin(t * 12));
        p.rot = 0.05 * facing * pulse;
        break;
      }
      case 'ultimate': {
        p.sy = 1 + 0.03 * Math.sin(t * 6);
        p.dy = -8 - Math.abs(Math.sin(t * 3)) * 6;
        p.dx = facing * 6;
        break;
      }
    }
    return p;
  }

  const TRAIL_STATES = { run: 1, dodge: 1, dash: 1, heavy: 1, special: 1, ultimate: 1 };

  const TRAIL_LIFE = 0.22;

  function blit(ctx, set, frame, x, y, facing, pose, H, alpha, source) {
    const w = H * set.fw / set.fh;
    ctx.save();
    ctx.globalAlpha = alpha * pose.a;
    ctx.translate(x + pose.dx, y + pose.dy);
    ctx.rotate(pose.rot);
    ctx.scale(facing * pose.sx, pose.sy);
    ctx.drawImage(source || set.img, frame * set.fw, 0, set.fw, set.fh, -w / 2, -H, w, H);
    ctx.restore();
  }

  const warnedFallbacks = new Set();
  const warnedStates = new Set();

  /** Holographic cybernetic energy barrier for active guard/blocking */
  function drawGuardBarrier(ctx, f, meta, facing, H, t, alpha, blockFlash) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const bx = f.x + facing * (H * 0.28);
    const by = f.y - H * 0.48;
    const radius = H * 0.46 * (1 + blockFlash * 0.12);
    const shieldArc = 0.82;
    const baseAngle = facing > 0 ? 0 : Math.PI;
    const a0 = baseAngle - shieldArc;
    const a1 = baseAngle + shieldArc;
    const primaryColor = meta.accent || '#00f0ff';
    const secondaryColor = blockFlash > 0.05 ? '#ffffff' : (meta.accent2 && meta.accent2 !== '#0a1f26' ? meta.accent2 : '#7fe3ff');

    const masterAlpha = alpha * (0.82 + 0.18 * Math.sin(t * 8));
    ctx.globalAlpha = Math.min(1, masterAlpha);

    // 1. Holographic energy curtain fill
    const grad = ctx.createRadialGradient(bx, by, radius * 0.65, bx, by, radius * 1.05);
    grad.addColorStop(0, 'rgba(0, 240, 255, 0)');
    grad.addColorStop(0.7, primaryColor === '#0a1f26' ? 'rgba(0, 240, 255, 0.22)' : primaryColor);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.45)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bx, by, radius, a0, a1, false);
    ctx.arc(bx - facing * 12, by, radius * 0.78, a1, a0, true);
    ctx.closePath();
    ctx.fill();

    // 2. Outer glowing perimeter arc
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 16 + blockFlash * 25;
    ctx.strokeStyle = blockFlash > 0.1 ? '#ffffff' : primaryColor;
    ctx.lineWidth = 4 + blockFlash * 4;
    ctx.beginPath();
    ctx.arc(bx, by, radius, a0, a1, false);
    ctx.stroke();

    // 3. Inner reinforcing arc
    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bx - facing * 10, by, radius * 0.82, a0 * 0.95 + baseAngle * 0.05, a1 * 0.95 + baseAngle * 0.05, false);
    ctx.stroke();

    // 4. Hexagonal lattice nodes along the barrier arc
    const numHexes = 5;
    for (let i = 0; i < numHexes; i++) {
      const frac = (i + 0.5) / numHexes;
      const ang = a0 + (a1 - a0) * frac;
      const hx = bx + Math.cos(ang) * (radius * 0.91);
      const hy = by + Math.sin(ang) * (radius * 0.91);
      const hSize = 10 + 3 * Math.sin(t * 12 + i * 1.5);

      ctx.strokeStyle = blockFlash > 0.1 ? '#ffffff' : primaryColor;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let h = 0; h < 6; h++) {
        const hAng = (h * TAU) / 6 + t * 0.5;
        const px = hx + Math.cos(hAng) * hSize;
        const py = hy + Math.sin(hAng) * hSize;
        h === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hx, hy, 2, 0, TAU);
      ctx.fill();
    }

    // 5. Dynamic scanline sweeps
    const scanPhase = (t * 2.5) % 1;
    const scanAng = a0 + (a1 - a0) * scanPhase;
    const sx1 = bx + Math.cos(scanAng) * (radius * 0.78);
    const sy1 = by + Math.sin(scanAng) * (radius * 0.78);
    const sx2 = bx + Math.cos(scanAng) * radius;
    const sy2 = by + Math.sin(scanAng) * radius;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();

    // 6. Floor ground anchor spark
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(bx, f.y, 22 + 6 * Math.sin(t * 15), 4, 0, 0, TAU);
    ctx.stroke();

    ctx.restore();
  }

  /** Draws one fighter. Returns false if sprites aren't available (use legacy renderer). */
  function drawFighter(ctx, f, dt = 1 / 60) {
    let charId = f.charId || (f.config && f.config.id);
    if (charId === 'placementWarrior') charId = 'placement';
    if (charId === 'sportsStar') charId = 'sports';

    const entry = store[charId];
    if (!entry || !entry.ready) {
      if (!warnedFallbacks.has(charId)) {
        warnedFallbacks.add(charId);
        console.warn(`[CampusVisuals] drawFighter: Character "${charId}" sprite set not ready (missing idle.png). Using procedural vector fallback.`);
      }
      return false;
    }
    const state = mapState(f.state);
    if (!entry.states[state]) {
      const warnKey = `${charId}_${state}`;
      if (!warnedStates.has(warnKey)) {
        warnedStates.add(warnKey);
        console.warn(`[CampusVisuals] drawFighter: Character "${charId}" is missing sprite for state "${state}". Falling back to idle pose.`);
      }
    }
    const set = entry.states[state] || entry.states.idle;
    const meta = CHARACTERS[charId] || CHARACTERS.topper;
    const facing = f.facing < 0 ? -1 : 1;
    const H = f.height || 180; // Default scaled height matching hitbox

    const v = f._vis || (f._vis = { trail: [], last: null, t: 0, clock: 0, blockFlash: 0, barrierAlpha: 0 });
    if (v.last !== state) { v.last = state; v.t = 0; } else v.t += dt;
    if (v.blockFlash > 0) v.blockFlash = Math.max(0, v.blockFlash - dt * 3.5);

    const isDefending = state === 'block' || Boolean(f.isBlocking);
    v.barrierAlpha = isDefending
      ? Math.min(1, (v.barrierAlpha || 0) + dt * 8)
      : Math.max(0, (v.barrierAlpha || 0) - dt * 6);

    const frame = set.frames === 1 ? 0
      : set.loop ? Math.floor(v.t * set.fps) % set.frames
      : Math.min(set.frames - 1, Math.floor(v.t * set.fps));
    const pose = proceduralPose(state, v.t, facing, set.frames, frame);

    // ground shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(f.x, f.y + 4, H * 0.24 * (state === 'jump' ? 0.7 : 1), H * 0.05, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    // ghost trail
    if (TRAIL_STATES[state] && dt > 0) {
      v.clock += dt;
      if (v.clock > 0.035) { v.clock = 0; v.trail.push({ x: f.x, y: f.y, facing, pose, frame, set, age: 0 }); }
    }
    v.trail = v.trail.filter((g) => (g.age += dt) < TRAIL_LIFE);
    v.trail.forEach((g) => {
      const alpha = (1 - g.age / TRAIL_LIFE) * 0.35;
      blit(ctx, g.set, g.frame, g.x, g.y, g.facing, g.pose, H, alpha, tinted(g.set.img, meta.accent));
    });

    // body with accent rim-glow
    ctx.save();
    ctx.shadowColor = meta.accent;
    ctx.shadowBlur = state === 'ultimate' ? 30 : 14;
    blit(ctx, set, frame, f.x, f.y, facing, pose, H, 1);
    ctx.restore();

    // hit flash
    if (state === 'hit' && v.t < 0.08) blit(ctx, set, frame, f.x, f.y, facing, pose, H, 0.7, tinted(set.img, '#ffffff'));

    // active guard barrier
    if (v.barrierAlpha > 0.01) {
      drawGuardBarrier(ctx, f, meta, facing, H, v.t, v.barrierAlpha, v.blockFlash || 0);
    }
    return true;
  }

  /* ------------------------------------------------------------------ FX */
  const fx = [];
  const emitters = [];
  let clock = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);

  function spawn(p) {
    if (fx.length > 250) fx.shift(); // Performance cap
    fx.push(Object.assign({ age: 0, life: 0.5, x: 0, y: 0, vx: 0, vy: 0, ay: 0, rot: 0, vr: 0,
      size: 8, grow: 0, color: '#fff', kind: 'spark', fade: true, seed: Math.random() * 10 }, p));
  }

  function updateFX(dt) {
    clock += dt;
    for (let i = emitters.length - 1; i >= 0; i--) {
      const e = emitters[i];
      if (clock > e.until) { emitters.splice(i, 1); continue; }
      e.acc += dt;
      while (e.acc >= e.every) { e.acc -= e.every; e.fn(); }
    }
    for (let i = fx.length - 1; i >= 0; i--) {
      const p = fx[i];
      p.age += dt;
      if (p.age >= p.life) { fx.splice(i, 1); continue; }
      p.vy += p.ay * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.size += p.grow * dt;
    }
    if (screen.dimTarget !== screen.dim) screen.dim += (screen.dimTarget - screen.dim) * Math.min(1, dt * 8 + 0.02);
  }

  const ADDITIVE = {
    spark: 1, glow: 1, ring: 1, arc: 1, hex: 1, glyph: 1,
    starburst: 1, slash_streak: 1, guard_ripple: 1, ember: 1, lightning: 1
  };

  function drawFX(ctx) {
    ctx.save();
    for (const p of fx) {
      const k = p.age / p.life;
      const a = p.fade ? 1 - k * k : 1;
      ctx.globalAlpha = Math.max(0, a);
      ctx.globalCompositeOperation = ADDITIVE[p.kind] ? 'lighter' : 'source-over';
      switch (p.kind) {
        case 'spark':
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(1, p.size * 0.3 * (1 - k));
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
          ctx.stroke();
          break;
        case 'glow': {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          g.addColorStop(0, p.color);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.fill();
          break;
        }
        case 'ring':
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(1, (p.lw || 5) * (1 - k));
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size, p.size * (p.squash || 0.28), 0, 0, TAU);
          ctx.stroke();
          break;
        case 'hex': {
          ctx.strokeStyle = p.color;
          ctx.fillStyle = p.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const ang = p.rot + (i * TAU) / 6;
            const px = p.x + Math.cos(ang) * p.size, py = p.y + Math.sin(ang) * p.size;
            i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.globalAlpha *= 0.15;
          ctx.fill();
          break;
        }
        case 'arc': { // High-contrast crescent slash with white razor cutting edge
          const sweep = 1 - Math.pow(1 - clamp01(k * 2.4), 3);
          const a0 = p.a0, a1 = p.a0 + (p.a1 - p.a0) * sweep;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.scale(p.facing, 1);
          ctx.rotate(p.rot);

          // Saturated inner corona
          const g = ctx.createRadialGradient(0, 0, p.size * 0.55, 0, 0, p.size);
          g.addColorStop(0, 'rgba(255,255,255,0)');
          g.addColorStop(0.5, p.color);
          g.addColorStop(1, '#ffffff');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, a0, a1, false);
          ctx.arc(p.size * 0.12, 0, p.size * 0.74, a1, a0, true);
          ctx.closePath();
          ctx.fill();

          // Hot-white razor perimeter
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(1.2, 3.2 * (1 - k));
          ctx.beginPath();
          ctx.arc(0, 0, p.size, a0, a1, false);
          ctx.stroke();
          ctx.restore();
          break;
        }
        case 'starburst': { // 8-point high-contrast arcade hitstar
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          const sz = p.size * (1 - k * 0.35);

          // 4 diagonal secondary points
          ctx.fillStyle = p.corona || p.color;
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const ang = (i * Math.PI) / 2 + Math.PI / 4;
            const r1 = sz * 0.72, r2 = sz * 0.16;
            const aL = ang - 0.22, aR = ang + 0.22;
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(aL) * r2, Math.sin(aL) * r2);
            ctx.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
            ctx.lineTo(Math.cos(aR) * r2, Math.sin(aR) * r2);
          }
          ctx.fill();

          // 4 primary cardinal points (pure white)
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const ang = (i * Math.PI) / 2;
            const r1 = sz, r2 = sz * 0.18;
            const aL = ang - 0.25, aR = ang + 0.25;
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(aL) * r2, Math.sin(aL) * r2);
            ctx.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
            ctx.lineTo(Math.cos(aR) * r2, Math.sin(aR) * r2);
          }
          ctx.fill();

          // Central core flare
          ctx.beginPath();
          ctx.arc(0, 0, sz * 0.22, 0, TAU);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'slash_streak': { // Directional vector laser cut
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.ang);
          const L = p.len * (1 + k * 0.25);
          const W = (p.width || 4) * (1 - k);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = W;
          ctx.beginPath();
          ctx.moveTo(-L * 0.5, 0);
          ctx.lineTo(L * 0.5, 0);
          ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(1, W * 0.4);
          ctx.stroke();
          ctx.restore();
          break;
        }
        case 'guard_ripple': { // Deflection shockwave arc
          ctx.save();
          ctx.translate(p.x, p.y);
          const r = p.radius + p.grow * k;
          const a0 = p.facing > 0 ? -Math.PI * 0.42 : Math.PI * 0.58;
          const a1 = p.facing > 0 ? Math.PI * 0.42 : Math.PI * 1.42;
          ctx.strokeStyle = p.color || '#00f0ff';
          ctx.lineWidth = (p.lw || 6) * (1 - k);
          ctx.beginPath();
          ctx.arc(0, 0, r, a0, a1, false);
          ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(1, (p.lw || 6) * 0.35 * (1 - k));
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(1, r - 7), a0, a1, false);
          ctx.stroke();
          ctx.restore();
          break;
        }
        case 'ember': { // Drifting fire embers
          const flicker = 0.75 + 0.25 * Math.sin(p.age * 22 + p.seed);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.5, p.size * (1 - k * 0.5) * flicker), 0, TAU);
          ctx.fill();
          break;
        }
        case 'lightning': { // Jagged electric arcs
          ctx.save();
          ctx.strokeStyle = p.color || '#29b6ff';
          ctx.lineWidth = Math.max(1, (p.lw || 3) * (1 - k));
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          let curX = p.x, curY = p.y;
          for (const seg of (p.segs || [])) {
            curX += seg.dx; curY += seg.dy;
            ctx.lineTo(curX, curY);
          }
          ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(0.8, (p.lw || 3) * 0.35 * (1 - k));
          ctx.stroke();
          ctx.restore();
          break;
        }
        case 'page': { // Fluttering paper sheet
          const flutter = Math.cos(p.age * 9 + p.seed);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.scale(Math.max(0.15, Math.abs(flutter)), 1);
          ctx.fillStyle = p.color;
          ctx.strokeStyle = p.edge || '#5aa7ff';
          ctx.lineWidth = 1.5;
          ctx.fillRect(-p.size * 0.7, -p.size, p.size * 1.4, p.size * 2);
          ctx.strokeRect(-p.size * 0.7, -p.size, p.size * 1.4, p.size * 2);
          ctx.beginPath();
          for (let i = -2; i <= 2; i++) {
            ctx.moveTo(-p.size * 0.5, i * p.size * 0.3);
            ctx.lineTo(p.size * 0.5, i * p.size * 0.3);
          }
          ctx.stroke();
          ctx.restore();
          break;
        }
        case 'glyph':
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.font = `700 ${p.size}px "Rajdhani", "Segoe UI", sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.fillText(p.text, 0, 0);
          ctx.restore();
          break;
      }
    }
    ctx.restore();
  }

  /* --------------------------------------------------------- FX recipes */
  const getCharId = (f) => {
    let cid = (typeof f === 'string') ? f : (f.charId || (f.config && f.config.id) || 'topper');
    if (cid === 'placementWarrior') cid = 'placement';
    if (cid === 'sportsStar') cid = 'sports';
    return cid;
  };
  const meta = (f) => CHARACTERS[getCharId(f)] || CHARACTERS.topper;
  const chest = (f) => ({ x: f.x + f.facing * 46, y: f.y - (f.height || 180) * 0.55 });

  function paperBurst(x, y, m, n = 8, power = 260) {
    for (let i = 0; i < n; i++) {
      const ang = rnd(0, TAU), sp = rnd(power * 0.4, power);
      spawn({
        kind: 'page', x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 60, ay: 380,
        life: rnd(0.6, 1.0), size: rnd(7, 12), rot: rnd(0, TAU), vr: rnd(-8, 8), color: '#f4f9ff', edge: m.accent
      });
    }
  }
  function sparks(x, y, color, n, power) {
    for (let i = 0; i < n; i++) {
      const ang = rnd(0, TAU), sp = rnd(power * 0.4, power);
      spawn({ kind: 'spark', x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: rnd(0.18, 0.4), size: rnd(6, 12), color });
    }
  }
  function glyphs(x, y, m, n = 6, rise = 90) {
    for (let i = 0; i < n; i++) {
      spawn({
        kind: 'glyph', text: m.glyphs[(Math.random() * m.glyphs.length) | 0], x: x + rnd(-70, 70), y: y + rnd(-40, 30),
        vx: rnd(-20, 20), vy: -rise * rnd(0.6, 1.2), life: rnd(0.7, 1.2), size: rnd(16, 28), rot: rnd(-0.3, 0.3),
        color: m.accent2 === '#ffffff' || m.accent2 === '#0a1f26' ? m.accent : m.accent2
      });
    }
  }

  function spawnArchetypeParticles(cid, x, y, m, facing, type = 'light') {
    const isHeavy = type === 'heavy';
    const isUlt = type === 'ultimate';
    const countMult = isUlt ? 2.5 : (isHeavy ? 1.8 : 1);

    switch (cid) {
      case 'topper': {
        // Cyan formulas, math theorems, gold examination sparks
        glyphs(x, y - 20, m, Math.round(isHeavy ? 5 : 2), isHeavy ? 140 : 80);
        paperBurst(x, y, m, Math.round(isHeavy ? 8 : 3), isHeavy ? 340 : 200);
        sparks(x, y, '#ffd23f', Math.round(12 * countMult), isHeavy ? 460 : 300);
        break;
      }
      case 'backbencher': {
        // Fiery combustion flames, embers, proxy chaos tags
        const nEmbers = Math.round((isHeavy ? 14 : 7) * countMult);
        for (let i = 0; i < nEmbers; i++) {
          const ang = rnd(-0.6, 0.6) + (facing > 0 ? 0 : Math.PI);
          const sp = rnd(120, isHeavy ? 420 : 260);
          spawn({
            kind: 'ember', x, y: y + rnd(-15, 15),
            vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - rnd(30, 80),
            ay: -30, life: rnd(0.35, 0.75), size: rnd(4, 9),
            color: Math.random() < 0.6 ? '#ff6b35' : (Math.random() < 0.5 ? '#ff3b00' : '#00d4aa')
          });
        }
        glyphs(x, y - 20, m, Math.round(isHeavy ? 4 : 2), isHeavy ? 130 : 70);
        sparks(x, y, '#ff6b35', Math.round(10 * countMult), isHeavy ? 440 : 280);
        break;
      }
      case 'hosteler': {
        // Seismic iron sparks, heavy meal shockwaves
        sparks(x, y, '#ffd7c0', Math.round(14 * countMult), isHeavy ? 480 : 320);
        sparks(x, y, '#ff6a3d', Math.round(10 * countMult), isHeavy ? 400 : 240);
        glyphs(x, y - 25, m, Math.round(isHeavy ? 4 : 1), 90);
        if (isHeavy) {
          spawn({ kind: 'ring', x, y: y + 50, size: 25, grow: 380, lw: 7, life: 0.35, color: '#ff6a3d' });
        }
        break;
      }
      case 'senior': {
        // Emerald code blocks, algorithm syntax runes, crystalline chimes
        glyphs(x, y - 30, m, Math.round(isHeavy ? 6 : 3), isHeavy ? 150 : 90);
        sparks(x, y, '#2fbf71', Math.round(12 * countMult), isHeavy ? 420 : 280);
        sparks(x, y, '#cfe9dc', Math.round(8 * countMult), isHeavy ? 340 : 220);
        break;
      }
      case 'placement': {
        // Royal blue vector speedlines, corporate badges, CTC offers
        glyphs(x, y - 20, m, Math.round(isHeavy ? 5 : 2), isHeavy ? 140 : 80);
        sparks(x, y, '#4f6bff', Math.round(14 * countMult), isHeavy ? 460 : 320);
        sparks(x, y, '#b9c8ff', Math.round(10 * countMult), isHeavy ? 360 : 240);
        break;
      }
      case 'sports': {
        // Stadium comet trails, volleyball spike stars, athletic victory ribbons
        glyphs(x, y - 20, m, Math.round(isHeavy ? 5 : 2), isHeavy ? 150 : 90);
        sparks(x, y, '#ffd23f', Math.round(14 * countMult), isHeavy ? 460 : 320);
        sparks(x, y, '#2e8bff', Math.round(10 * countMult), isHeavy ? 380 : 260);
        break;
      }
      case 'cypher': {
        // Binary packet bursts, hex glyphs, cybernetic wireframe matrices
        glyphs(x, y - 20, m, Math.round(isHeavy ? 6 : 3), isHeavy ? 140 : 80);
        sparks(x, y, '#19e6d4', Math.round(14 * countMult), isHeavy ? 480 : 320);
        for (let i = 0; i < (isHeavy ? 5 : 2); i++) {
          spawn({
            kind: 'hex', x: x + rnd(-30, 30), y: y + rnd(-30, 30),
            size: rnd(14, 24), grow: 40, rot: rnd(0, TAU),
            life: rnd(0.25, 0.45), color: '#19e6d4'
          });
        }
        break;
      }
      case 'gavel': {
        // Golden judicial gavel waves, court scales, law verdict shockwaves
        glyphs(x, y - 25, m, Math.round(isHeavy ? 5 : 2), isHeavy ? 130 : 80);
        sparks(x, y, '#ffd23f', Math.round(14 * countMult), isHeavy ? 480 : 320);
        sparks(x, y, '#f2b233', Math.round(10 * countMult), isHeavy ? 380 : 260);
        break;
      }
      case 'bolt': {
        // High-voltage lightning blades, electric spark forks, thunderflash
        glyphs(x, y - 20, m, Math.round(isHeavy ? 4 : 2), isHeavy ? 160 : 100);
        sparks(x, y, '#29b6ff', Math.round(16 * countMult), isHeavy ? 500 : 340);
        sparks(x, y, '#ffffff', Math.round(10 * countMult), isHeavy ? 420 : 280);
        const nArcs = isHeavy ? 4 : 2;
        for (let a = 0; a < nArcs; a++) {
          const segs = [];
          const totalLen = rnd(40, isHeavy ? 90 : 60);
          const steps = 4;
          const mainAng = rnd(-0.6, 0.6) + (facing > 0 ? 0 : Math.PI);
          for (let s = 0; s < steps; s++) {
            const stepL = totalLen / steps;
            const devAng = mainAng + rnd(-0.5, 0.5);
            segs.push({ dx: Math.cos(devAng) * stepL, dy: Math.sin(devAng) * stepL });
          }
          spawn({
            kind: 'lightning', x, y, segs,
            life: rnd(0.12, 0.22), lw: isHeavy ? 4 : 2.5, color: '#29b6ff'
          });
        }
        break;
      }
      case 'palette': {
        // Chromatic RGB acrylic paint splash droplets & art stars
        glyphs(x, y - 20, m, Math.round(isHeavy ? 5 : 2), isHeavy ? 130 : 80);
        const colors = ['#ff4fb8', '#00f0ff', '#ffd23f', '#a8ff3e', '#ffffff'];
        const nPaint = Math.round((isHeavy ? 16 : 8) * countMult);
        for (let i = 0; i < nPaint; i++) {
          const ang = rnd(0, TAU);
          const sp = rnd(100, isHeavy ? 420 : 260);
          const c = colors[i % colors.length];
          spawn({
            kind: 'spark', x, y,
            vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 30,
            life: rnd(0.2, 0.45), size: rnd(7, 14), color: c
          });
        }
        break;
      }
      default: {
        glyphs(x, y - 20, m, 3, 90);
        sparks(x, y, m.accent, 8, 300);
        break;
      }
    }
  }

  const onLightAttack = (f) => {
    const cid = getCharId(f), m = meta(f), c = chest(f);
    const facing = f.facing < 0 ? -1 : 1;
    spawn({
      kind: 'arc', x: c.x + facing * 12, y: c.y, facing,
      size: 105, a0: -1.3, a1: 1.2, rot: 0, life: 0.26, color: m.accent
    });
    spawnArchetypeParticles(cid, c.x, c.y, m, facing, 'light');
  };

  const onHeavyAttack = (f) => {
    const cid = getCharId(f), m = meta(f), c = chest(f);
    const facing = f.facing < 0 ? -1 : 1;
    const slashColor = m.accent2 === '#0a1f26' || m.accent2 === '#ffffff' ? m.accent : m.accent2;
    spawn({
      kind: 'arc', x: c.x + facing * 24, y: c.y - 12, facing,
      size: 165, a0: -2.0, a1: 1.6, rot: -0.12, life: 0.38, color: slashColor
    });
    spawn({
      kind: 'ring', x: f.x + facing * 80, y: f.y,
      size: 24, grow: 460, lw: 8, life: 0.38, color: m.accent
    });
    spawnArchetypeParticles(cid, c.x, c.y, m, facing, 'heavy');
    shake(9, 0.25);
    hitStop(65);
  };

  const onHit = (x, y, heavy = false, m = CHARACTERS.topper, facing = 1) => {
    const accent = (m && m.accent) || '#ffd23f';
    const accent2 = (m && m.accent2 && m.accent2 !== '#0a1f26') ? m.accent2 : '#ffffff';

    // 1. Arcade 8-Point Starburst
    spawn({
      kind: 'starburst', x, y,
      size: heavy ? 56 : 34,
      color: '#ffffff',
      corona: accent,
      rot: rnd(0, Math.PI / 4),
      life: heavy ? 0.24 : 0.16
    });

    // 2. High-speed vector slash streak
    spawn({
      kind: 'slash_streak', x, y,
      len: heavy ? 120 : 70,
      width: heavy ? 5 : 3.5,
      ang: (facing > 0 ? 0.35 : Math.PI - 0.35) + rnd(-0.15, 0.15),
      color: accent2,
      life: 0.18
    });

    // 3. Radial core flash
    spawn({
      kind: 'glow', x, y,
      size: heavy ? 95 : 55,
      life: 0.14,
      color: '#ffffff'
    });

    // 4. Directional spark needle shower along facing
    const nSparks = heavy ? 18 : 10;
    const baseAng = facing > 0 ? 0 : Math.PI;
    for (let i = 0; i < nSparks; i++) {
      const ang = baseAng + rnd(-0.65, 0.65);
      const sp = rnd(heavy ? 220 : 160, heavy ? 560 : 380);
      spawn({
        kind: 'spark', x, y,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 25,
        life: rnd(0.18, 0.38),
        size: rnd(7, 13),
        color: i % 2 === 0 ? '#ffffff' : accent
      });
    }

    // 5. Expanding impact ring on heavy hits
    if (heavy) {
      spawn({
        kind: 'ring', x, y,
        size: 16, grow: 380, lw: 6, life: 0.32, color: accent
      });
    }

    hitStop(heavy ? 80 : 40);
    shake(heavy ? 9 : 4.5, 0.2);
  };

  const onBlock = (f) => {
    const m = meta(f);
    const H = f.height || 180;
    const facing = f.facing < 0 ? -1 : 1;
    const bx = f.x + facing * (H * 0.28);
    const by = f.y - H * 0.48;

    // Flash the active guard barrier
    const v = f._vis || (f._vis = { trail: [], last: null, t: 0, clock: 0, blockFlash: 0, barrierAlpha: 0 });
    v.blockFlash = 1.0;

    // Conical deflection ripple wave
    spawn({
      kind: 'guard_ripple', x: bx, y: by, facing,
      radius: H * 0.35, grow: 180, lw: 7, life: 0.28, color: '#00f0ff'
    });

    // Ricocheting deflection sparks shooting backward away from defender
    const reboundAng = facing > 0 ? Math.PI : 0;
    for (let i = 0; i < 14; i++) {
      const ang = reboundAng + rnd(-0.7, 0.7);
      const sp = rnd(180, 420);
      spawn({
        kind: 'spark', x: bx, y: by + rnd(-20, 20),
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 30,
        life: rnd(0.15, 0.32), size: rnd(6, 11),
        color: i % 2 === 0 ? '#ffffff' : '#7fe3ff'
      });
    }

    // Deflection hexagonal flash
    spawn({
      kind: 'hex', x: bx, y: by,
      size: 72, grow: 50, rot: 0.2, life: 0.26, color: '#00f0ff'
    });

    shake(3, 0.12);
    hitStop(30);
  };

  const onSpecial = (f) => {
    const cid = getCharId(f), m = meta(f), c = chest(f);
    const facing = f.facing < 0 ? -1 : 1;
    spawnArchetypeParticles(cid, c.x, c.y, m, facing, 'special');
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        onLightAttack(f);
        shake(4, 0.12);
      }, i * 90);
    }
  };

  const onUltimate = (f, duration = 2.4) => {
    const cid = getCharId(f), m = meta(f), cy = f.y - (f.height || 180) * 0.5;
    const facing = f.facing < 0 ? -1 : 1;
    screen.dimTarget = 0.55;
    screen.flash = 0.85;
    shake(13, 0.5);
    hitStop(120);

    spawn({ kind: 'glow', x: f.x, y: cy, size: 280, life: duration, color: m.accent, fade: true });
    spawnArchetypeParticles(cid, f.x, cy, m, facing, 'ultimate');

    const until = clock + duration;
    emitters.push({
      until, every: 0.15, acc: 0,
      fn: () => spawn({ kind: 'ring', x: f.x, y: f.y, size: 28, grow: 360, lw: 8, life: 0.65, color: m.accent })
    });
    emitters.push({
      until, every: 0.08, acc: 0,
      fn: () => spawnArchetypeParticles(cid, f.x + rnd(-70, 70), cy + rnd(-30, 30), m, facing, 'light')
    });

    setTimeout(() => { screen.dimTarget = 0; }, duration * 1000);
  };

  /* ---------------------------------------------------- screen "juice" */
  const screen = { shake: 0, shakeT: 0, shakeDur: 0.2, hitstop: 0, dim: 0, dimTarget: 0, flash: 0 };
  const hitStop = (ms) => { if (!reduceMotion) screen.hitstop = Math.max(screen.hitstop, ms / 1000); };
  function shake(mag, dur = 0.2) {
    screen.shake = Math.max(screen.shake, reduceMotion ? mag * 0.25 : mag);
    screen.shakeDur = dur; screen.shakeT = dur;
  }

  /** Call first each frame. Returns the dt to use for game logic + animation (0 during hit-stop). */
  function beginFrame(ctx, rawDt) {
    let dt = rawDt;
    if (screen.hitstop > 0) { screen.hitstop -= rawDt; dt = 0; }
    ctx.save();
    if (screen.shakeT > 0) {
      screen.shakeT -= rawDt;
      const m = screen.shake * Math.max(0, screen.shakeT / screen.shakeDur);
      ctx.translate(rnd(-m, m), rnd(-m, m));
      if (screen.shakeT <= 0) screen.shake = 0;
    }
    screen._raw = rawDt;
    return dt;
  }
  /** Ultimate spotlight: call after the stage, before fighters. */
  function drawDim(ctx, W, H) {
    if (screen.dim < 0.01) return;
    ctx.save(); ctx.fillStyle = `rgba(4,10,34,${screen.dim})`; ctx.fillRect(-20, -20, W + 40, H + 40); ctx.restore();
  }
  /** Call last each frame: vignette + white flash, then restores the shake transform. */
  function endFrame(ctx, W, H) {
    ctx.restore();
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(2,6,24,0.35)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (screen.flash > 0.01 && !reduceMotion) {
      ctx.fillStyle = `rgba(255,255,255,${screen.flash})`; ctx.fillRect(0, 0, W, H);
      screen.flash *= 0.85;
    }
  }

  window.CampusVisuals = {
    store, blit, STATES, CHARACTERS, mapState, loadCharacter, preloadAll, getPortrait, drawFighter,
    updateFX, drawFX, beginFrame, drawDim, endFrame, hitStop, shake,
    onLightAttack, onHeavyAttack, onHit, onBlock, onSpecial, onUltimate,
    fx: { spawn, sparks, paperBurst, glyphs },
  };
})();

export const CampusVisuals = window.CampusVisuals;
