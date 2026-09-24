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
  const STATES = ['idle', 'walk', 'run', 'jump', 'crouch', 'light', 'heavy',
                  'block', 'dodge', 'hit', 'special', 'ultimate'];

  const DEFAULT_ANIM = {
    idle: { fps: 8, loop: true },   walk: { fps: 10, loop: true },  run: { fps: 14, loop: true },
    jump: { fps: 10, loop: false }, crouch: { fps: 10, loop: false }, light: { fps: 18, loop: false },
    heavy: { fps: 14, loop: false }, block: { fps: 10, loop: false }, dodge: { fps: 14, loop: false },
    hit: { fps: 14, loop: false },  special: { fps: 14, loop: false }, ultimate: { fps: 12, loop: true },
  };

  // Map whatever the game calls its states -> our 12 canonical states.
  const ALIASES = {
    attack: 'light', punch: 'light', kick: 'light', 'light-attack': 'light', lightattack: 'light',
    'heavy-attack': 'heavy', heavyattack: 'heavy', smash: 'heavy',
    parry: 'block', shield: 'block', blocking: 'block', guard: 'block',
    hurt: 'hit', hitstun: 'hit', stunned: 'hit', ko: 'hit', dead: 'hit',
    walking: 'walk', running: 'run', jumping: 'jump', falling: 'jump', crouching: 'crouch',
    dodging: 'dodge', roll: 'dodge', dash: 'dodge',
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
    backbencher: ['The Backbencher', 'Chaos Brawler', 'Attendance is a suggestion.', '#ff3b47', '#ffffff',
                  ['#ffffff', '#e5202e', '#231a28', '#ffffff'], ['</>', '{ }', '404', 'sudo', 'rm -rf'], [4, 4, 2, 2, 3], '</>'],
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
    i.onload = () => res(autoChromaKey(i));
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
      await Promise.all(STATES.map(async (s) => {
        const img = await loadImage(`${base}/${id}/${s}.png`);
        if (!img) {
          console.warn(`[CampusVisuals] Missing sprite for character "${id}", state "${s}": ${base}/${id}/${s}.png`);
          return;
        }
        const m = manifest[s] || {};
        const frames = m.frames || 1;
        entry.states[s] = {
          img, frames, fw: img.width / frames, fh: img.height,
          fps: m.fps || DEFAULT_ANIM[s].fps,
          loop: m.loop !== undefined ? m.loop : DEFAULT_ANIM[s].loop,
        };
      }));
      entry.portrait = await loadImage(`${base}/${id}/portrait.png`);
      if (!entry.portrait) {
        console.warn(`[CampusVisuals] Missing portrait for character "${id}": ${base}/${id}/portrait.png`);
      }
      entry.ready = !!entry.states.idle;
      if (!entry.ready) {
        console.warn(`[CampusVisuals] Character "${id}" is NOT ready (idle.png missing in ${base}/${id}/). Falling back to procedural renderer.`);
      } else {
        console.log(`[CampusVisuals] Character "${id}" loaded successfully (${Object.keys(entry.states).length} states ready).`);
      }
      return entry;
    })();
    return entry.promise;
  }
  const preloadAll = (ids = Object.keys(CHARACTERS), base) => Promise.all(ids.map((id) => loadCharacter(id, base)));
  const getPortrait = (id) => {
    if (id === 'placementWarrior') id = 'placement';
    if (id === 'sportsStar') id = 'sports';
    return (store[id] && store[id].portrait) || null;
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
     Used when a state is a single pose (frames === 1). Gives squash/stretch,
     lunges and lean so single generated poses still feel animated. */
  const NEUTRAL = { dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, a: 1 };
  const clamp01 = (n) => Math.max(0, Math.min(1, n));

  function proceduralPose(state, t, facing) {
    const p = { ...NEUTRAL };
    switch (state) {
      case 'idle':   p.sy = 1 + 0.018 * Math.sin(t * 3); p.sx = 1 - 0.008 * Math.sin(t * 3); break;
      case 'walk':   p.dy = -Math.abs(Math.sin(t * 9)) * 4;  p.rot = 0.03 * facing; break;
      case 'run':    p.dy = -Math.abs(Math.sin(t * 13)) * 6; p.rot = 0.09 * facing; break;
      case 'jump':   p.sy = 1.06; p.sx = 0.96; break;
      case 'crouch': p.sy = 0.88; p.sx = 1.05; break;
      case 'light': {
        const k = clamp01(t / 0.18);
        p.dx = facing * Math.sin(k * Math.PI) * 26; p.rot = 0.07 * facing * Math.sin(k * Math.PI); break;
      }
      case 'heavy': {
        if (t < 0.22) { p.dx = -facing * 12 * (t / 0.22); p.sy = 0.95; p.rot = -0.06 * facing; }
        else { const k = clamp01((t - 0.22) / 0.16); p.dx = facing * (-12 + 56 * k); p.sy = 1.04; p.rot = 0.12 * facing * (1 - k * 0.5); }
        break;
      }
      case 'block':  p.sx = 1.03; p.sy = 0.97; break;
      case 'dodge':  p.dx = -facing * 24 * Math.sin(clamp01(t / 0.3) * Math.PI * 0.5); p.rot = -0.14 * facing; p.a = 0.7; break;
      case 'hit':    p.dx = -facing * 16 * (1 - clamp01(t / 0.25)); p.rot = -0.1 * facing * (1 - clamp01(t / 0.25)); break;
      case 'special': p.sy = 1 + 0.02 * Math.sin(t * 22); p.dx = facing * Math.sin(t * 10) * 6; break;
      case 'ultimate': p.sy = 1 + 0.03 * Math.sin(t * 6); p.dy = -Math.abs(Math.sin(t * 3)) * 5; break;
    }
    return p;
  }

  const TRAIL_STATES = { run: 1, dodge: 1, heavy: 1, special: 1, ultimate: 1 };
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

    const v = f._vis || (f._vis = { trail: [], last: null, t: 0, clock: 0 });
    if (v.last !== state) { v.last = state; v.t = 0; } else v.t += dt;

    const frame = set.frames === 1 ? 0
      : set.loop ? Math.floor(v.t * set.fps) % set.frames
      : Math.min(set.frames - 1, Math.floor(v.t * set.fps));
    const pose = set.frames > 1 ? NEUTRAL : proceduralPose(state, v.t, facing);

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

  const ADDITIVE = { spark: 1, glow: 1, ring: 1, arc: 1, hex: 1, glyph: 1 };

  function drawFX(ctx) {
    ctx.save();
    for (const p of fx) {
      const k = p.age / p.life;
      const a = p.fade ? 1 - k * k : 1;
      ctx.globalAlpha = Math.max(0, a);
      ctx.globalCompositeOperation = ADDITIVE[p.kind] ? 'lighter' : 'source-over';
      switch (p.kind) {
        case 'spark':
          ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(1, p.size * 0.3 * (1 - k));
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); ctx.stroke();
          break;
        case 'glow': {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          g.addColorStop(0, p.color); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
          break;
        }
        case 'ring':
          ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(1, (p.lw || 5) * (1 - k));
          ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size, p.size * (p.squash || 0.28), 0, 0, TAU); ctx.stroke();
          break;
        case 'hex': {
          ctx.strokeStyle = p.color; ctx.fillStyle = p.color; ctx.lineWidth = 3;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const ang = p.rot + (i * TAU) / 6;
            const px = p.x + Math.cos(ang) * p.size, py = p.y + Math.sin(ang) * p.size;
            i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.closePath(); ctx.stroke(); ctx.globalAlpha *= 0.15; ctx.fill();
          break;
        }
        case 'arc': { // crescent slash, sweeps in then fades
          const sweep = 1 - Math.pow(1 - clamp01(k * 2.2), 3);
          const a0 = p.a0, a1 = p.a0 + (p.a1 - p.a0) * sweep;
          ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.facing, 1); ctx.rotate(p.rot);
          const g = ctx.createLinearGradient(-p.size, 0, p.size, 0);
          g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, p.color); g.addColorStop(1, '#fff');
          ctx.fillStyle = g; ctx.beginPath();
          ctx.arc(0, 0, p.size, a0, a1, false);
          ctx.arc(p.size * 0.12, 0, p.size * 0.8, a1, a0, true);
          ctx.closePath(); ctx.fill(); ctx.restore();
          break;
        }
        case 'page': { // fluttering paper sheet
          const flutter = Math.cos(p.age * 9 + p.seed);
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(Math.max(0.15, Math.abs(flutter)), 1);
          ctx.fillStyle = p.color; ctx.strokeStyle = p.edge || '#5aa7ff'; ctx.lineWidth = 1.5;
          ctx.fillRect(-p.size * 0.7, -p.size, p.size * 1.4, p.size * 2);
          ctx.strokeRect(-p.size * 0.7, -p.size, p.size * 1.4, p.size * 2);
          ctx.beginPath();
          for (let i = -2; i <= 2; i++) { ctx.moveTo(-p.size * 0.5, i * p.size * 0.3); ctx.lineTo(p.size * 0.5, i * p.size * 0.3); }
          ctx.stroke(); ctx.restore();
          break;
        }
        case 'glyph':
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.font = `700 ${p.size}px "Rajdhani", "Segoe UI", sans-serif`; ctx.textAlign = 'center';
          ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 10; ctx.fillText(p.text, 0, 0);
          ctx.restore();
          break;
      }
    }
    ctx.restore();
  }

  /* --------------------------------------------------------- FX recipes */
  const getCharId = (f) => {
    let cid = f.charId || (f.config && f.config.id) || 'topper';
    if (cid === 'placementWarrior') cid = 'placement';
    if (cid === 'sportsStar') cid = 'sports';
    return cid;
  };
  const meta = (f) => CHARACTERS[getCharId(f)] || CHARACTERS.topper;
  const chest = (f) => ({ x: f.x + f.facing * 46, y: f.y - (f.height || 180) * 0.55 });

  function paperBurst(x, y, m, n = 8, power = 260) {
    for (let i = 0; i < n; i++) {
      const ang = rnd(0, TAU), sp = rnd(power * 0.4, power);
      spawn({ kind: 'page', x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 60, ay: 380,
        life: rnd(0.6, 1.0), size: rnd(7, 12), rot: rnd(0, TAU), vr: rnd(-8, 8), color: '#f4f9ff', edge: m.accent });
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
      spawn({ kind: 'glyph', text: m.glyphs[(Math.random() * m.glyphs.length) | 0], x: x + rnd(-70, 70), y: y + rnd(-40, 30),
        vx: rnd(-20, 20), vy: -rise * rnd(0.6, 1.2), life: rnd(0.7, 1.2), size: rnd(16, 28), rot: rnd(-0.3, 0.3), color: m.accent2 === '#ffffff' ? m.accent : m.accent2 });
    }
  }

  const onLightAttack = (f) => { // BOOK SLASH
    const m = meta(f), c = chest(f);
    spawn({ kind: 'arc', x: c.x, y: c.y, facing: f.facing < 0 ? -1 : 1, size: 96, a0: -1.2, a1: 1.1, rot: 0, life: 0.28, color: m.accent });
    paperBurst(c.x, c.y, m, 4, 200); sparks(c.x, c.y, m.accent2, 6, 320);
  };
  const onHeavyAttack = (f) => { // SYLLABUS SMASH
    const m = meta(f), c = chest(f);
    spawn({ kind: 'arc', x: c.x, y: c.y - 10, facing: f.facing < 0 ? -1 : 1, size: 150, a0: -1.9, a1: 1.5, rot: -0.1, life: 0.4, color: m.accent2 });
    spawn({ kind: 'ring', x: f.x + f.facing * 90, y: f.y, size: 20, grow: 420, lw: 8, life: 0.4, color: m.accent });
    paperBurst(c.x, c.y, m, 12, 380); sparks(c.x, c.y, m.accent2, 12, 480);
    shake(9, 0.25); hitStop(60);
  };
  const onHit = (x, y, heavy = false, m = CHARACTERS.topper) => {
    spawn({ kind: 'glow', x, y, size: heavy ? 90 : 55, life: 0.16, color: '#ffffff' });
    sparks(x, y, m.accent2 === '#0a1f26' ? '#ffffff' : m.accent2, heavy ? 16 : 9, heavy ? 520 : 380);
    hitStop(heavy ? 90 : 45); shake(heavy ? 10 : 4, 0.18);
  };
  const onBlock = (f) => { // HEX SHIELD
    const m = meta(f), c = chest(f);
    spawn({ kind: 'hex', x: f.x + f.facing * 22, y: f.y - (f.height || 180) * 0.5, size: 78, grow: 60, rot: 0.3, life: 0.35, color: '#7fe3ff' });
    sparks(c.x, c.y, '#bff4ff', 8, 300); shake(3, 0.1);
  };
  const onSpecial = (f) => { // STUDY COMBO
    const m = meta(f), c = chest(f);
    glyphs(f.x, f.y - (f.height || 180) * 0.7, m, 7, 110);
    paperBurst(c.x, c.y, m, 10, 300);
    for (let i = 0; i < 3; i++) setTimeout(() => onLightAttack(f), i * 110);
  };
  const onUltimate = (f, duration = 2.4) => { // EXAM MODE
    const m = meta(f), cy = f.y - (f.height || 180) * 0.5;
    screen.dimTarget = 0.55; screen.flash = 0.8; shake(12, 0.5); hitStop(120);
    spawn({ kind: 'glow', x: f.x, y: cy, size: 260, life: duration, color: m.accent, fade: true });
    const until = clock + duration;
    emitters.push({ until, every: 0.16, acc: 0, fn: () => spawn({ kind: 'ring', x: f.x, y: f.y, size: 24, grow: 340, lw: 7, life: 0.7, color: m.accent }) });
    emitters.push({ until, every: 0.07, acc: 0, fn: () => {
      spawn({ kind: 'page', x: f.x + rnd(-90, 90), y: f.y - rnd(0, 40), vy: -rnd(140, 300), vx: rnd(-30, 30), life: rnd(0.8, 1.3), size: rnd(8, 14), rot: rnd(0, TAU), vr: rnd(-5, 5), color: '#eaf5ff', edge: m.accent });
      if (Math.random() < 0.4) glyphs(f.x, cy, m, 1, 120);
    } });
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
    STATES, CHARACTERS, mapState, loadCharacter, preloadAll, getPortrait, drawFighter,
    updateFX, drawFX, beginFrame, drawDim, endFrame, hitStop, shake,
    onLightAttack, onHeavyAttack, onHit, onBlock, onSpecial, onUltimate,
    fx: { spawn, sparks, paperBurst, glyphs },
  };
})();

export const CampusVisuals = window.CampusVisuals;
