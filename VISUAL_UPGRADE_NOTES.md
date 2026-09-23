# Campus Clash 2D — Visual Upgrade System Audit

**Audit Date**: 2026-09-24  
**Project**: Campus Clash 2D (SRM Campus Brawler)  
**Status**: Step 0 Complete — Audit & State/Roster Mapping (No feature code modified)

---

## 1. Codebase Architecture & Rendering Pipeline

### Rendering Model
- **Core Technology**: 100% Native HTML5 Canvas 2D (`CanvasRenderingContext2D`), rendering to a single `#game-canvas` with base dimensions **960 × 640 px** (scaled via CSS within an arcade chassis container).
- **Framework**: Pure vanilla JavaScript (ES modules, no bundler, no external runtime dependencies).
- **Game Loop**: Governed by `GameLoop` in `js/engine/gameLoop.js` using `requestAnimationFrame`, fixed timestep accumulator for physics (60 FPS target, ~16.67ms), and variable `dt` for render interpolation.

### Fighter Object Shape
Each fighter is an instance of `Fighter` (`js/entities/fighter.js`) with:
- **Spatial Coordinates**: `x` (ground horizontal position), `y` (ground vertical anchor, `y = stage.groundY`), `vx`, `vy`.
- **Orientation**: `facing`: `1` (facing right) or `-1` (facing left).
- **Dimensions**: `width: 64`, `height: 135` (hurtbox spans `Box(-28, -130, 56, 130)` relative to `(x, y)`).
- **Hitboxes**: `activeHitboxes` array of `Box` instances with offset `x, y, w, h` and move properties (`damage`, `hitstun`, `knockback`, `blockable`, `specialEffect`).
- **State Machine**: `stateMachine` (`js/engine/stateMachine.js`) managing states from `FIGHTER_STATES` (`js/utils/constants.js`).
- **Combat Systems**: `stamina` (`StaminaSystem`), `cooldowns` (`CooldownSystem`), `parry` (`ParrySystem`), `rage` (`RageSystem`), `weaponTrail` (`WeaponTrail`), `weaponGlow` (`WeaponGlow`).

### Where Fighters Are Currently Drawn
- **In Match**: `Fighter.prototype.render(ctx, debugHitboxes)` in `js/entities/fighter.js` (lines 537–625).
  - Translates to `(this.x, this.y)` and scales by `(this.facing, 1)`.
  - Dispatches to character-specific methods: `renderRealisticTopper()`, `renderRealisticBackbencher()`, `renderRealisticHosteler()`, `renderRealisticSenior()`, `renderRealisticPlacement()`, `renderRealisticSportsStar()`, `renderRealisticCypher()`, `renderRealisticGavel()`, `renderRealisticBolt()`, `renderRealisticPalette()`.
- **In Character Select / Portraits**: `CharacterPortraitManager` in `js/ui/characterPortrait.js` (lines 185–225) invokes `fighter.renderRealistic<Character>(ctx, state, isHurt, isBlock, isAttack)`.

### Where Combat Events Are Triggered
- **Light Attack**: `Fighter.prototype.handleInputs` in `js/entities/fighter.js` (line 230). Calls `this.startAttack(this.config.moves.light)`.
- **Heavy Attack**: `Fighter.prototype.handleInputs` in `js/entities/fighter.js` (line 244). Calls `this.startAttack(this.config.moves.heavy)`.
- **Special Attack / Study Combo**: Can be mapped to specific input combinations or move extensions.
- **Block / Parry**: `Fighter.prototype.handleInputs` (lines 213–227). `this.parry.attemptParry()` and `this.stateMachine.changeState(FIGHTER_STATES.BLOCKING)`.
- **Dodge**: `Fighter.prototype.executeDodge` (lines 202, 288). Spawns afterimages and applies velocity boost.
- **Hits / Damage Dealt**: `CampusClashGame.prototype.updateCombat` in `js/main.js` (lines 1280–1420). Detects AABB intersection between attacker hitbox and defender hurtbox, applies damage, triggers parry, block, hitstop (`hitstopTimer`), screen shake (`this.screenShake.shake`), particle sparks, and sounds.
- **Ultimate ("Exam Mode")**: `Fighter.prototype.handleInputs` (line 193) and `CampusClashGame.prototype.updateCombat` (lines 1346–1352, 1403–1409). Triggers ultimate move, freeze duration, god rays, and vignette.

### Where Menus and HUD Live
- **Landing Screen**: `LandingScene` (`js/engine/landingScene.js`) renders retro marquee arcade UI on canvas + DOM buttons.
- **Mode Select**: Handled in `js/main.js` (`renderModeSelect(ctx)`).
- **Character Select**: `renderCharSelect(ctx)` in `js/main.js` + card previews in `js/ui/characterPortrait.js`.
- **Stage Select**: DOM overlay managed by `StageSelectManager` (`js/ui/stageSelectManager.js`).
- **In-Game HUD**: Drawn directly onto the canvas in `CampusClashGame.prototype.renderHUD(ctx)` in `js/main.js` (lines 1800–2150), rendering health bars, lag bars, ultimate meter pips, round timer, character portraits, and combo counters.

---

## 2. State Mapping: Game States to Canonical 12 States

| Canonical State (`campus-clash-visuals.js`) | Existing Game State (`FIGHTER_STATES` / `Fighter`) | Detection / Condition in Game Engine |
| :--- | :--- | :--- |
| `idle` | `FIGHTER_STATES.IDLE` (`'idle'`) | Default actionable ground state (`!vx`, grounded) |
| `walk` | `FIGHTER_STATES.WALKING` (`'walking'`) | Walking forward/backward with normal movement |
| `run` | `FIGHTER_STATES.WALKING` + high velocity | Active during dash, rush, or when speed buff is active |
| `jump` | `FIGHTER_STATES.JUMPING` (`'jumping'`) | `!this.isGrounded` or airborne vy != 0 |
| `crouch` | Down input held or low hurtbox | `input.isActionActive(INPUT_ACTIONS.DOWN)` |
| `light` | `FIGHTER_STATES.ATTACKING` + `currentMove.type === 'document' \|\| 'pen' \|\| light` | `this.currentMove === this.config.moves.light` |
| `heavy` | `FIGHTER_STATES.ATTACKING` + `currentMove.type === 'textbook' \|\| 'calculator' \|\| heavy` | `this.currentMove === this.config.moves.heavy` |
| `block` | `FIGHTER_STATES.BLOCKING` (`'blocking'`) | `this.isBlocking === true` or parry active |
| `dodge` | `FIGHTER_STATES.DODGING` (`'dodging'`) | `state === FIGHTER_STATES.DODGING` |
| `hit` | `FIGHTER_STATES.HITSTUN` (`'hitstun'`) / `KNOCKDOWN` | `state === FIGHTER_STATES.HITSTUN \|\| KNOCKDOWN` |
| `special` | `FIGHTER_STATES.ATTACKING` + special move | Attack during counter-hit buff or special input |
| `ultimate` | `FIGHTER_STATES.ULTIMATE_FREEZE` / `moves.ultimate` | `this.currentMove === this.config.moves.ultimate` |

---

## 3. Roster Mapping: Existing 10 Characters to Canonical IDs

| Index | Canonical ID | Existing In-Engine ID (`config.id`) | Display Name | Archetype / Role | Accent Color |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | `topper` | `topper` (`TOPPER_CONFIG`) | The Topper (P1 Default) | Academic Assassin | `#2f7bff` (Cyan/Blue) + `#ffd23f` (Gold) |
| **02** | `backbencher` | `backbencher` (`BACKBENCHER_CONFIG`) | The Backbencher (CPU Default) | Chaos Brawler | `#ff3b47` (Crimson) + `#ffffff` |
| **03** | `hosteler` | `hosteler` (`HOSTELER_CONFIG`) | The Hosteler | Tank Grappler | `#ff6a3d` (Flame Orange) + `#ffd7c0` |
| **04** | `senior` | `senior` (`SENIOR_CONFIG`) | The Senior | Control Zoner | `#2fbf71` (Emerald Green) + `#cfe9dc` |
| **05** | `placement` | `placementWarrior` (`PLACEMENT_WARRIOR_CONFIG`) | Placement Warrior | Rushdown Combo | `#4f6bff` (Royal Navy) + `#b9c8ff` |
| **06** | `sports` | `sportsStar` (`SPORTS_STAR_CONFIG`) | Sports Star | Agile Brawler | `#2e8bff` (Electric Blue) + `#ffd23f` |
| **07** | `cypher` | `cypher` (`CYPHER_CONFIG`) | Cypher | Campus Hacker | `#19e6d4` (Neon Cyan) + `#0a1f26` |
| **08** | `gavel` | `gavel` (`GAVEL_CONFIG`) | Gavel | Moot Court Legend | `#f2b233` (Legal Gold) + `#ffd23f` |
| **09** | `bolt` | `bolt` (`BOLT_CONFIG`) | Bolt | The Track Star | `#29b6ff` (Track Cyan) + `#e6f0ff` |
| **10** | `palette` | `palette` (`PALETTE_CONFIG`) | Palette | Fine Arts Major | `#ff4fb8` (Vibrant Pink) + `#ffd6ec` |

---

## 4. Integration Blueprint (Planned Next Steps Upon User OK)

1. **Step 1: Asset Pipeline Setup**
   - Create directories: `assets/characters/{topper,backbencher,hosteler,senior,placement,sports,cypher,gavel,bolt,palette}/`.
   - Setup asset specification guide / chroma-key removal script if needed.
   - Retain procedural 2D vector renderer as guaranteed 100% fallback whenever sprite files are loading or absent (`CampusVisuals.drawFighter` returns `false` -> fallback renders seamlessly).

2. **Step 2: Core Visuals Integration (`campus-clash-visuals.js`)**
   - Install `js/engine/campus-clash-visuals.js`.
   - Wire into `js/main.js`:
     - Pre-match: `await CampusVisuals.loadCharacter(charId)` for active fighters.
     - Frame loop: `CampusVisuals.beginFrame(ctx, rawDt)`, `CampusVisuals.drawDim(ctx, W, H)`, `CampusVisuals.drawFighter(ctx, f, dt)`, `CampusVisuals.updateFX(dt)`, `CampusVisuals.drawFX(ctx)`, `CampusVisuals.endFrame(ctx, W, H)`.
     - Event hooks: Hook `onLightAttack`, `onHeavyAttack`, `onHit`, `onBlock`, `onSpecial`, `onUltimate` directly into the existing combat resolution in `updateCombat` and `handleInputs`.

3. **Step 3: Neon UI & Character Select Integration (`campus-clash-ui.css`, `campus-clash-select.js`)**
   - Include `campus-clash-ui.css`.
   - Upgrade HUD styling (chamfered panels, damage lag bar, 10-pip meter, hexagonal round timer, high-contrast stage banner to prevent text collision).
   - Integrate `CampusSelect.build` for the character selection screen with keyboard and mouse navigation.

4. **Zero Gameplay Regression Guarantee**:
   - All hitboxes, hurtboxes, speeds, weights, damage numbers, frame data, AI routines, and input bindings (`WASD`, `J`, `K`, `L`, `Space`, `U`) will remain exactly identical.
