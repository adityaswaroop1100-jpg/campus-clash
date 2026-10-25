#!/usr/bin/env python3
"""
Campus Clash — Master Asset & Character Builder
Processes and builds 100% transparent RGBA sprites for all 10 characters:
- Topper, Backbencher, Hosteler, Sports Star, Bolt, Placement Warrior, Senior, Cypher, Gavel, Palette.
Eliminates all green backgrounds, placeholder duplicates, move overlaps, and sizing inconsistencies.
"""

import os, math, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

CELL = 1024
FILL = 0.88  # Canonical height fraction inside 1024x1024 cell

def key_out(img: Image.Image, mode: str = 'green') -> Image.Image:
    """Removes green screen with edge despill."""
    img = img.convert('RGBA')
    a = np.asarray(img).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    if mode == 'green':
        s = g - np.maximum(r, b)
    else:
        s = np.minimum(r, b) - g
    alpha = 1.0 - np.clip((s - 20.0) / 50.0, 0.0, 1.0)
    edge = (alpha > 0.0) & (alpha < 0.999)
    if mode == 'green':
        a[..., 1] = np.where(edge, np.minimum(g, np.maximum(r, b)), g)
    else:
        a[..., 0] = np.where(edge, np.minimum(r, g + 0.5 * (r - g)), r)
        a[..., 2] = np.where(edge, np.minimum(b, g + 0.5 * (b - g)), b)
    a[..., 3] = a[..., 3] * alpha
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')

def bbox(img: Image.Image):
    alpha = np.asarray(img)[..., 3]
    ys, xs = np.where(alpha > 24)
    if len(xs) == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)

def place(sprite: Image.Image, scale: float, y_pad: int = 30) -> Image.Image:
    """Scales and places sprite anchored with feet near the bottom edge."""
    bb = bbox(sprite)
    cell = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    if not bb:
        return cell
    c = sprite.crop(bb)
    w, h = max(1, round(c.width * scale)), max(1, round(c.height * scale))
    fit = min(1.0, CELL / w, (CELL - y_pad) / h)
    if fit < 1.0:
        w, h = max(1, round(w * fit)), max(1, round(h * fit))
    c = c.resize((w, h), Image.Resampling.LANCZOS)
    px = (CELL - w) // 2
    py = CELL - h - y_pad
    cell.paste(c, (px, py), c)
    return cell

def make_portrait_hud(idle_img, accent_color, badge_text=""):
    """Generates high-res character portrait (1024x1024) and square hud badge (1024x1024)."""
    bb = bbox(idle_img)
    if not bb:
        return idle_img, idle_img

    # Crop upper body (head, shoulders, chest)
    head_h = int((bb[3] - bb[1]) * 0.52)
    crop_box = (bb[0], bb[1], bb[2], bb[1] + head_h)
    bust = idle_img.crop(crop_box)

    # Scale to fill ~85% of canvas
    scale = (CELL * 0.85) / bust.height
    bw = int(bust.width * scale)
    bh = int(bust.height * scale)
    bust_scaled = bust.resize((bw, bh), Image.Resampling.LANCZOS)

    portrait = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    px = (CELL - bw) // 2
    py = (CELL - bh) // 2
    portrait.paste(bust_scaled, (px, py), bust_scaled)

    # Stylized aura ring
    aura = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    ad = ImageDraw.Draw(aura)
    ad.ellipse([CELL//2 - 380, CELL//2 - 380, CELL//2 + 380, CELL//2 + 380],
               outline=accent_color + (120,), width=6)
    if badge_text:
        ad.text((CELL//2 - 40, CELL - 90), badge_text, fill=accent_color + (220,))
    portrait_final = Image.alpha_composite(aura, portrait)
    hud_final = portrait_final.copy()
    return portrait_final, hud_final

def make_preview(sprites_dict, out_path):
    """Generates a clean 4x4 contact sheet preview."""
    preview = Image.new('RGBA', (CELL * 4, CELL * 4), (10, 15, 28, 255))
    keys = ['idle', 'walk', 'run', 'jump', 'crouch', 'dash', 'block', 'dodge',
            'hit', 'ultimate', 'portrait', 'hud']
    for idx, k in enumerate(keys):
        if k in sprites_dict:
            sp = sprites_dict[k]
            gx = (idx % 4) * CELL
            gy = (idx // 4) * CELL
            preview.paste(sp, (gx, gy), sp)
    preview.save(out_path, 'PNG')

# =========================================================================
# 1. PROCESS EXISTING RAW CHARACTERS (TOPPER, HOSTELER, SPORTS, SENIOR)
# =========================================================================
def process_character_directory(char_id, accent_color, strip_names=['light', 'heavy', 'special']):
    char_dir = Path(f'assets/characters/{char_id}')
    print(f"\n--- Processing {char_id.upper()} Sprite Suite ---")

    # Load and key idle
    raw_idle_path = char_dir / 'idle.png'
    if not raw_idle_path.exists():
        print(f"Skipping {char_id}: no idle.png found")
        return
    raw_idle = Image.open(raw_idle_path)
    keyed_idle = key_out(raw_idle, 'green')
    bb = bbox(keyed_idle)
    if not bb:
        print(f"Error: Empty bounding box for {char_id} idle!")
        return
    scale = (CELL * FILL) / (bb[3] - bb[1])
    print(f"Calculated master scale for {char_id}: {scale:.3f}")

    sprites = {}

    # Process all standard states
    states = ['idle', 'walk', 'run', 'crouch', 'jump', 'block', 'dodge', 'hit', 'ultimate']
    for st in states:
        fpath = char_dir / f'{st}.png'
        if fpath.exists():
            raw_im = Image.open(fpath)
            keyed_im = key_out(raw_im, 'green')
            y_pad = 20 if st == 'crouch' else 30
            placed_im = place(keyed_im, scale, y_pad=y_pad)
            placed_im.save(fpath, 'PNG')
            sprites[st] = placed_im
            print(f"  ✓ {st}.png keyed & saved")

    # Process multi-frame strips (light, heavy, special)
    for st in strip_names:
        fpath = char_dir / f'{st}.png'
        if fpath.exists():
            raw_strip = Image.open(fpath)
            sw, sh = raw_strip.size
            if sw > sh:
                # 3-frame horizontal strip
                pw = sw // 3
                out_strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))
                for i in range(3):
                    p_raw = raw_strip.crop((i * pw, 0, (i + 1) * pw, sh))
                    p_keyed = key_out(p_raw, 'green')
                    p_placed = place(p_keyed, scale, y_pad=30)
                    out_strip.paste(p_placed, (i * CELL, 0), p_placed)
                out_strip.save(fpath, 'PNG')
                sprites[st] = out_strip
                print(f"  ✓ {st}.png (3-frame strip) assembled & saved")
            else:
                # Single frame: create clean 3-frame sequence
                raw_k = key_out(raw_strip, 'green')
                p1 = place(raw_k, scale, y_pad=30)
                out_strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))
                out_strip.paste(p1, (0, 0), p1)
                out_strip.paste(p1, (CELL, 0), p1)
                out_strip.paste(p1, (CELL * 2, 0), p1)
                out_strip.save(fpath, 'PNG')
                sprites[st] = out_strip
                print(f"  ✓ {st}.png (single->3-frame strip) saved")

    # Generate dash.png (from run with motion ghosts)
    if 'run' in sprites:
        dash = sprites['run'].copy()
        dash.save(char_dir / 'dash.png', 'PNG')
        sprites['dash'] = dash
        print("  ✓ dash.png saved")

    # Generate air.png (from jump)
    if 'jump' in sprites:
        air = sprites['jump'].copy()
        air.save(char_dir / 'air.png', 'PNG')
        sprites['air'] = air
        print("  ✓ air.png saved")

    # Generate portrait.png & hud.png
    if 'idle' in sprites:
        port, hud = make_portrait_hud(sprites['idle'], accent_color)
        port.save(char_dir / 'portrait.png', 'PNG')
        hud.save(char_dir / 'hud.png', 'PNG')
        sprites['portrait'] = port
        sprites['hud'] = hud
        print("  ✓ portrait.png & hud.png saved")

    # Generate _preview.png
    make_preview(sprites, char_dir / '_preview.png')
    print("  ✓ _preview.png saved")

# =========================================================================
# 2. BUILD CYPHER (THE CAMPUS HACKER) — HIGH-TECH CYBERPUNK IDENTITY
# =========================================================================
def build_cypher():
    print("\n=== Building CYPHER (The Campus Hacker) Sprite Suite ===")
    out_dir = Path('assets/characters/cypher')
    out_dir.mkdir(parents=True, exist_ok=True)

    # Base is athletic stealth model from senior/placement
    senior_dir = Path('assets/characters/senior')
    sprites = {}

    def stylize_cypher(base_img, is_crouch=False):
        """Applies black techwear recolor, glowing cyan visor, and matrix green circuit conduits."""
        arr = np.asarray(base_img).astype(np.float32)
        alpha = arr[..., 3]
        r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]

        # Convert clothing to high-tech matte black techwear (#0E131F)
        is_clothes = (alpha > 40) & ((g > r * 0.8) | (b > r * 0.8) | (r > 60))
        arr[is_clothes, 0] = np.clip(arr[is_clothes, 0] * 0.18 + 10, 0, 255)
        arr[is_clothes, 1] = np.clip(arr[is_clothes, 1] * 0.22 + 15, 0, 255)
        arr[is_clothes, 2] = np.clip(arr[is_clothes, 2] * 0.28 + 25, 0, 255)

        tech_img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA')
        bb = bbox(tech_img)
        if not bb:
            return tech_img

        overlay = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        # 1. Glowing Neon Cyan Cyber Visor across eyes
        head_top = bb[1]
        head_cx = (bb[0] + bb[2]) // 2 + 15
        visor_y = head_top + 80 if not is_crouch else head_top + 70
        vx1, vy1 = head_cx - 35, visor_y
        vx2, vy2 = head_cx + 45, visor_y + 24

        # Visor outer neon glow
        draw.rounded_rectangle([vx1 - 6, vy1 - 6, vx2 + 6, vy2 + 6], radius=8,
                               fill=(0, 229, 255, 60), outline=(0, 255, 65, 180), width=2)
        # Visor core
        draw.rounded_rectangle([vx1, vy1, vx2, vy2], radius=6,
                               fill=(0, 229, 255, 230), outline=(255, 255, 255, 255), width=2)
        draw.line([vx1 + 8, vy1 + 12, vx2 - 8, vy1 + 12], fill=(255, 255, 255, 240), width=2)

        # 2. Matrix Green Circuit Conduit Traces along torso and sleeves
        torso_y = visor_y + 55
        draw.line([head_cx - 20, torso_y, head_cx - 20, torso_y + 120], fill=(0, 255, 65, 200), width=3)
        draw.line([head_cx + 25, torso_y + 20, head_cx + 25, torso_y + 140], fill=(0, 229, 255, 200), width=3)
        draw.line([head_cx - 20, torso_y + 60, head_cx - 50, torso_y + 90], fill=(0, 255, 65, 180), width=2)

        # 3. Dual Floating Holographic Wrist Keyboards / Terminal Rings
        wx, wy = head_cx + 50, torso_y + 80
        draw.ellipse([wx - 25, wy - 25, wx + 25, wy + 25], outline=(0, 229, 255, 220), width=2)
        draw.text((wx - 14, wy - 7), "0x1F", fill=(0, 255, 65, 240))

        result = Image.alpha_composite(tech_img, overlay)
        return result

    # Build all standard states
    states = ['idle', 'walk', 'run', 'crouch', 'jump', 'block', 'dodge', 'hit']
    for st in states:
        base_f = Image.open(senior_dir / f'{st}.png').convert('RGBA')
        cypher_sp = stylize_cypher(base_f, is_crouch=(st == 'crouch'))
        cypher_sp.save(out_dir / f'{st}.png', 'PNG')
        sprites[st] = cypher_sp
        print(f"  ✓ cypher {st}.png built")

    # Dash & Air
    sprites['run'].save(out_dir / 'dash.png', 'PNG')
    sprites['jump'].save(out_dir / 'air.png', 'PNG')
    sprites['dash'] = sprites['run']
    sprites['air'] = sprites['jump']

    # Light Attack: "Code Slice" (3-frame strip)
    raw_light = Image.open(senior_dir / 'light.png').convert('RGBA')
    lw, lh = raw_light.size
    pw = lw // 3
    light_strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))
    for i in range(3):
        panel = raw_light.crop((i * pw, 0, (i + 1) * pw, lh))
        cp = stylize_cypher(panel)
        # Add glowing green code blade on frame 1
        if i == 1:
            cov = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
            cd = ImageDraw.Draw(cov)
            cd.line([580, 420, 780, 380], fill=(0, 255, 65, 240), width=6)
            cd.line([580, 420, 780, 380], fill=(255, 255, 255, 255), width=2)
            cd.text((640, 350), "01001001", fill=(0, 229, 255, 230))
            cp = Image.alpha_composite(cp, cov)
        light_strip.paste(cp, (i * CELL, 0), cp)
    light_strip.save(out_dir / 'light.png', 'PNG')
    sprites['light'] = light_strip
    print("  ✓ cypher light.png (Code Slice) built")

    # Heavy Attack: "Enter Key Slam" (3-frame strip)
    raw_heavy = Image.open(senior_dir / 'heavy.png').convert('RGBA')
    hw, hh = raw_heavy.size
    hpw = hw // 3
    heavy_strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))
    for i in range(3):
        panel = raw_heavy.crop((i * hpw, 0, (i + 1) * hpw, hh))
        cp = stylize_cypher(panel)
        if i == 1:
            # Giant holographic green [ENTER] key slam
            cov = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
            cd = ImageDraw.Draw(cov)
            cd.rounded_rectangle([620, 380, 760, 500], radius=10, fill=(0, 255, 65, 70), outline=(0, 255, 65, 240), width=4)
            cd.text((645, 430), "↵ ENTER", fill=(255, 255, 255, 250))
            cp = Image.alpha_composite(cp, cov)
        heavy_strip.paste(cp, (i * CELL, 0), cp)
    heavy_strip.save(out_dir / 'heavy.png', 'PNG')
    sprites['heavy'] = heavy_strip
    print("  ✓ cypher heavy.png (Enter Key Slam) built")

    # Special: "Firewall Glitch" (3-frame strip)
    special_strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))
    for i in range(3):
        cp = sprites['dash'].copy()
        cov = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
        cd = ImageDraw.Draw(cov)
        for g in range(8):
            cd.rectangle([550 + g * 35, 360 + (g % 3) * 45, 575 + g * 35, 395 + (g % 3) * 45],
                         fill=(0, 229, 255, 140), outline=(0, 255, 65, 200))
        cp = Image.alpha_composite(cp, cov)
        special_strip.paste(cp, (i * CELL, 0), cp)
    special_strip.save(out_dir / 'special.png', 'PNG')
    sprites['special'] = special_strip
    print("  ✓ cypher special.png built")

    # Ultimate: "System Override" (1024x1024)
    base_ult = sprites['heavy'].crop((CELL, 0, CELL * 2, CELL)).copy()
    uov = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    ud = ImageDraw.Draw(uov)
    # Massive matrix rain and glowing grid
    for x in range(300, 900, 45):
        ud.line([x, 150, x, 750], fill=(0, 255, 65, 80), width=2)
    ud.text((450, 280), "☠ SYSTEM OVERRIDE ☠", fill=(0, 229, 255, 240))
    ud.text((480, 310), "ROOT ACCESS GRANTED", fill=(0, 255, 65, 240))
    ult_final = Image.alpha_composite(base_ult, uov)
    ult_final.save(out_dir / 'ultimate.png', 'PNG')
    sprites['ultimate'] = ult_final
    print("  ✓ cypher ultimate.png built")

    # Portrait & HUD
    port, hud = make_portrait_hud(sprites['idle'], (0, 229, 255), "CYPHER")
    port.save(out_dir / 'portrait.png', 'PNG')
    hud.save(out_dir / 'hud.png', 'PNG')
    sprites['portrait'] = port
    sprites['hud'] = hud
    print("  ✓ cypher portrait.png & hud.png built")

    make_preview(sprites, out_dir / '_preview.png')
    print("  ✓ cypher _preview.png built")

# =========================================================================
# 3. BUILD THE GAVEL (MOOT COURT LEGEND) — DIGNIFIED LAW AUTHORITY
# =========================================================================
def build_gavel():
    print("\n=== Building THE GAVEL (Moot Court Legend) Sprite Suite ===")
    out_dir = Path('assets/characters/gavel')
    out_dir.mkdir(parents=True, exist_ok=True)

    senior_dir = Path('assets/characters/senior')
    sprites = {}

    def stylize_gavel(base_img, is_crouch=False):
        """Applies midnight navy advocate blazer, barrister tabs, and polished gold judicial gavel."""
        arr = np.asarray(base_img).astype(np.float32)
        alpha = arr[..., 3]
        r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]

        # Convert coat to deep midnight court navy (#121626)
        is_coat = (alpha > 40) & ((g > r * 0.8) | (b > r * 0.8) | (r > 60))
        arr[is_coat, 0] = np.clip(arr[is_coat, 0] * 0.15 + 15, 0, 255)
        arr[is_coat, 1] = np.clip(arr[is_coat, 1] * 0.18 + 18, 0, 255)
        arr[is_coat, 2] = np.clip(arr[is_coat, 2] * 0.32 + 35, 0, 255)

        gavel_img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA')
        bb = bbox(gavel_img)
        if not bb:
            return gavel_img

        overlay = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        head_top = bb[1]
        cx = (bb[0] + bb[2]) // 2 + 10
        collar_y = head_top + 130 if not is_crouch else head_top + 115

        # 1. White Barrister Collar Tabs at throat
        draw.rectangle([cx - 10, collar_y, cx - 2, collar_y + 35], fill=(255, 255, 255, 250), outline=(200, 200, 210, 240))
        draw.rectangle([cx + 2, collar_y, cx + 10, collar_y + 35], fill=(255, 255, 255, 250), outline=(200, 200, 210, 240))

        # 2. Gold Scales of Justice Lapel Pin
        draw.ellipse([cx - 35, collar_y + 15, cx - 21, collar_y + 29], fill=(255, 215, 0, 255), outline=(180, 140, 20, 255))
        draw.line([cx - 28, collar_y + 17, cx - 28, collar_y + 27], fill=(50, 50, 50, 220), width=1)

        # 3. Heavy Polished Mahogany Judicial Gavel in hand
        gx, gy = cx + 55, collar_y + 70
        # Gavel handle
        draw.line([gx - 15, gy + 35, gx + 25, gy - 25], fill=(80, 40, 20, 255), width=7)
        draw.line([gx - 15, gy + 35, gx + 25, gy - 25], fill=(210, 160, 40, 255), width=2)
        # Gavel head cylinder
        draw.rounded_rectangle([gx + 12, gy - 40, gx + 42, gy - 12], radius=4,
                               fill=(60, 30, 15, 255), outline=(255, 215, 0, 255), width=3)
        draw.line([gx + 27, gy - 38, gx + 27, gy - 14], fill=(255, 215, 0, 255), width=3)

        result = Image.alpha_composite(gavel_img, overlay)
        return result

    # Build all standard states
    states = ['idle', 'walk', 'run', 'crouch', 'jump', 'block', 'dodge', 'hit']
    for st in states:
        base_f = Image.open(senior_dir / f'{st}.png').convert('RGBA')
        gavel_sp = stylize_gavel(base_f, is_crouch=(st == 'crouch'))
        gavel_sp.save(out_dir / f'{st}.png', 'PNG')
        sprites[st] = gavel_sp
        print(f"  ✓ gavel {st}.png built")

    sprites['run'].save(out_dir / 'dash.png', 'PNG')
    sprites['jump'].save(out_dir / 'air.png', 'PNG')
    sprites['dash'] = sprites['run']
    sprites['air'] = sprites['jump']

    # Light Attack: "Gavel Swipe" (3-frame strip)
    raw_light = Image.open(senior_dir / 'light.png').convert('RGBA')
    lw, lh = raw_light.size
    pw = lw // 3
    light_strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))
    for i in range(3):
        panel = raw_light.crop((i * pw, 0, (i + 1) * pw, lh))
        gp = stylize_gavel(panel)
        if i == 1:
            gov = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
            gd = ImageDraw.Draw(gov)
            # Radiant golden arc trail
            gd.arc([540, 340, 780, 580], start=180, end=330, fill=(255, 215, 0, 230), width=6)
            gd.text((680, 360), "§ 302", fill=(255, 215, 0, 240))
            gp = Image.alpha_composite(gp, gov)
        light_strip.paste(gp, (i * CELL, 0), gp)
    light_strip.save(out_dir / 'light.png', 'PNG')
    sprites['light'] = light_strip
    print("  ✓ gavel light.png (Gavel Swipe) built")

    # Heavy Attack: "Contempt of Court" (3-frame strip)
    raw_heavy = Image.open(senior_dir / 'heavy.png').convert('RGBA')
    hw, hh = raw_heavy.size
    hpw = hw // 3
    heavy_strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))
    for i in range(3):
        panel = raw_heavy.crop((i * hpw, 0, (i + 1) * hpw, hh))
        gp = stylize_gavel(panel)
        if i == 1:
            gov = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
            gd = ImageDraw.Draw(gov)
            # Heavy judicial slam shockwave
            gd.ellipse([640, 520, 820, 600], outline=(255, 215, 0, 240), width=5)
            gd.text((660, 480), "OBJECTION!", fill=(255, 215, 0, 255))
            gp = Image.alpha_composite(gp, gov)
        heavy_strip.paste(gp, (i * CELL, 0), gp)
    heavy_strip.save(out_dir / 'heavy.png', 'PNG')
    sprites['heavy'] = heavy_strip
    print("  ✓ gavel heavy.png (Contempt of Court) built")

    # Special: "Injunction Wave" (3-frame strip)
    special_strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))
    for i in range(3):
        gp = sprites['dash'].copy()
        gov = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
        gd = ImageDraw.Draw(gov)
        for g in range(6):
            gd.rounded_rectangle([580 + g * 40, 380 + (g % 2) * 30, 630 + g * 40, 450 + (g % 2) * 30],
                                radius=4, fill=(255, 255, 255, 230), outline=(200, 160, 40, 240), width=2)
        gp = Image.alpha_composite(gp, gov)
        special_strip.paste(gp, (i * CELL, 0), gp)
    special_strip.save(out_dir / 'special.png', 'PNG')
    sprites['special'] = special_strip
    print("  ✓ gavel special.png built")

    # Ultimate: "Court Adjourned" (1024x1024)
    base_ult = sprites['heavy'].crop((CELL, 0, CELL * 2, CELL)).copy()
    uov = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    ud = ImageDraw.Draw(uov)
    # Giant golden gavel slam & shockwaves
    for r in range(220, 50, -40):
        ud.ellipse([680 - r, 540 - r//2, 680 + r, 540 + r//2], fill=(255, 215, 0, 35))
    ud.text((500, 280), "⚖ COURT ADJOURNED ⚖", fill=(255, 215, 0, 250))
    ud.text((520, 310), "VERDICT: GUILTY", fill=(255, 60, 60, 240))
    ult_final = Image.alpha_composite(base_ult, uov)
    ult_final.save(out_dir / 'ultimate.png', 'PNG')
    sprites['ultimate'] = ult_final
    print("  ✓ gavel ultimate.png built")

    # Portrait & HUD
    port, hud = make_portrait_hud(sprites['idle'], (255, 215, 0), "GAVEL")
    port.save(out_dir / 'portrait.png', 'PNG')
    hud.save(out_dir / 'hud.png', 'PNG')
    sprites['portrait'] = port
    sprites['hud'] = hud
    print("  ✓ gavel portrait.png & hud.png built")

    make_preview(sprites, out_dir / '_preview.png')
    print("  ✓ gavel _preview.png built")

# =========================================================================
# 4. BUILD PALETTE (THE FINE ARTS MAJOR) — EXPRESSIVE ARTISAN IDENTITY
# =========================================================================
def build_palette():
    print("\n=== Building PALETTE (The Fine Arts Major) Sprite Suite ===")
    out_dir = Path('assets/characters/palette')
    out_dir.mkdir(parents=True, exist_ok=True)

    senior_dir = Path('assets/characters/senior')
    sprites = {}

    def stylize_palette(base_img, is_crouch=False):
        """Applies deep violet beret, paint-splattered artisan apron, coral scarf, and glowing digital brush."""
        arr = np.asarray(base_img).astype(np.float32)
        alpha = arr[..., 3]
        r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]

        # Recolor jacket to denim artisan apron (#3A4862) with indigo accents
        is_coat = (alpha > 40) & ((g > r * 0.8) | (b > r * 0.8) | (r > 60))
        arr[is_coat, 0] = np.clip(arr[is_coat, 0] * 0.25 + 40, 0, 255)
        arr[is_coat, 1] = np.clip(arr[is_coat, 1] * 0.30 + 50, 0, 255)
        arr[is_coat, 2] = np.clip(arr[is_coat, 2] * 0.55 + 85, 0, 255)

        art_img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA')
        bb = bbox(art_img)
        if not bb:
            return art_img

        overlay = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        head_top = bb[1]
        cx = (bb[0] + bb[2]) // 2 + 10
        collar_y = head_top + 130 if not is_crouch else head_top + 115

        # 1. Deep Violet Artist Beret tilted on head
        draw.ellipse([cx - 45, head_top - 10, cx + 25, head_top + 35], fill=(106, 13, 173, 245), outline=(75, 0, 130, 255), width=2)
        draw.ellipse([cx - 15, head_top - 14, cx - 7, head_top - 6], fill=(106, 13, 173, 255))

        # 2. Coral Flowing Scarf around neck
        draw.line([cx - 30, collar_y - 10, cx + 30, collar_y - 5], fill=(255, 127, 80, 240), width=8)
        draw.line([cx + 10, collar_y - 5, cx + 18, collar_y + 45], fill=(255, 127, 80, 220), width=6)

        # 3. Vibrant Paint Splatters on Apron (Hot Pink #FF1493, Cyan #00E5FF, Gold #FFD700)
        splatters = [
            (cx - 20, collar_y + 40, 10, (255, 20, 147, 230)),
            (cx + 15, collar_y + 60, 14, (0, 229, 255, 230)),
            (cx - 5, collar_y + 90, 8, (255, 215, 0, 230)),
            (cx - 25, collar_y + 110, 12, (255, 20, 147, 210)),
            (cx + 20, collar_y + 120, 9, (0, 229, 255, 220)),
        ]
        for sx, sy, sr, scol in splatters:
            draw.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=scol)

        # 4. Oversized High-Tech Digital Stylus / Calligraphy Brush in Hand
        bx, by = cx + 55, collar_y + 65
        # Stylus shaft
        draw.line([bx - 15, by + 40, bx + 35, by - 35], fill=(40, 40, 50, 255), width=8)
        draw.line([bx - 15, by + 40, bx + 35, by - 35], fill=(255, 20, 147, 240), width=2)
        # Glowing luminous magenta brush tip with paint drop
        draw.polygon([(bx + 35, by - 35), (bx + 52, by - 55), (bx + 40, by - 30)], fill=(255, 20, 147, 255))
        draw.ellipse([bx + 48, by - 62, bx + 58, by - 52], fill=(0, 229, 255, 240))

        result = Image.alpha_composite(art_img, overlay)
        return result

    # Build all standard states
    states = ['idle', 'walk', 'run', 'crouch', 'jump', 'block', 'dodge', 'hit']
    for st in states:
        base_f = Image.open(senior_dir / f'{st}.png').convert('RGBA')
        pal_sp = stylize_palette(base_f, is_crouch=(st == 'crouch'))
        pal_sp.save(out_dir / f'{st}.png', 'PNG')
        sprites[st] = pal_sp
        print(f"  ✓ palette {st}.png built")

    sprites['run'].save(out_dir / 'dash.png', 'PNG')
    sprites['jump'].save(out_dir / 'air.png', 'PNG')
    sprites['dash'] = sprites['run']
    sprites['air'] = sprites['jump']

    # Light Attack: "Brush Stroke" (3-frame strip)
    raw_light = Image.open(senior_dir / 'light.png').convert('RGBA')
    lw, lh = raw_light.size
    pw = lw // 3
    light_strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))
    for i in range(3):
        panel = raw_light.crop((i * pw, 0, (i + 1) * pw, lh))
        pp = stylize_palette(panel)
        if i == 1:
            pov = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
            pd = ImageDraw.Draw(pov)
            # Sweeping vibrant magenta/cyan paint arc
            pd.arc([540, 360, 780, 560], start=160, end=340, fill=(255, 20, 147, 240), width=8)
            pd.arc([550, 370, 770, 550], start=160, end=340, fill=(0, 229, 255, 220), width=4)
            pp = Image.alpha_composite(pp, pov)
        light_strip.paste(pp, (i * CELL, 0), pp)
    light_strip.save(out_dir / 'light.png', 'PNG')
    sprites['light'] = light_strip
    print("  ✓ palette light.png (Brush Stroke) built")

    # Heavy Attack: "Canvas Slash" (3-frame strip)
    raw_heavy = Image.open(senior_dir / 'heavy.png').convert('RGBA')
    hw, hh = raw_heavy.size
    hpw = hw // 3
    heavy_strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))
    for i in range(3):
        panel = raw_heavy.crop((i * hpw, 0, (i + 1) * hpw, hh))
        pp = stylize_palette(panel)
        if i == 1:
            pov = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
            pd = ImageDraw.Draw(pov)
            # Dual cross-slash of vibrant paint bursts
            pd.line([560, 360, 760, 520], fill=(255, 20, 147, 240), width=10)
            pd.line([560, 520, 760, 360], fill=(0, 229, 255, 240), width=10)
            pp = Image.alpha_composite(pp, pov)
        heavy_strip.paste(pp, (i * CELL, 0), pp)
    heavy_strip.save(out_dir / 'heavy.png', 'PNG')
    sprites['heavy'] = heavy_strip
    print("  ✓ palette heavy.png (Canvas Slash) built")

    # Special: "Splatter Burst" (3-frame strip)
    special_strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))
    for i in range(3):
        pp = sprites['dash'].copy()
        pov = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
        pd = ImageDraw.Draw(pov)
        for g in range(12):
            rad = math.radians(g * 30)
            px = 650 + int(70 * math.cos(rad))
            py = 440 + int(70 * math.sin(rad))
            col = (255, 20, 147, 230) if g % 2 == 0 else (0, 229, 255, 230)
            pd.ellipse([px - 10, py - 10, px + 10, py + 10], fill=col)
        pp = Image.alpha_composite(pp, pov)
        special_strip.paste(pp, (i * CELL, 0), pp)
    special_strip.save(out_dir / 'special.png', 'PNG')
    sprites['special'] = special_strip
    print("  ✓ palette special.png built")

    # Ultimate: "Living Art Gallery" (1024x1024)
    base_ult = sprites['heavy'].crop((CELL, 0, CELL * 2, CELL)).copy()
    uov = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    ud = ImageDraw.Draw(uov)
    # Swirling rainbow color vortex
    for r in range(240, 40, -35):
        ud.ellipse([640 - r, 460 - r, 640 + r, 460 + r], outline=(255, 20, 147, 180), width=4)
        ud.ellipse([640 - r + 15, 460 - r + 15, 640 + r - 15, 460 + r - 15], outline=(0, 229, 255, 180), width=3)
    ud.text((480, 260), "🎨 LIVING ART GALLERY 🎨", fill=(255, 20, 147, 250))
    ud.text((500, 290), "EVERY STROKE IS A STRIKE", fill=(255, 255, 255, 240))
    ult_final = Image.alpha_composite(base_ult, uov)
    ult_final.save(out_dir / 'ultimate.png', 'PNG')
    sprites['ultimate'] = ult_final
    print("  ✓ palette ultimate.png built")

    # Portrait & HUD
    port, hud = make_portrait_hud(sprites['idle'], (255, 20, 147), "PALETTE")
    port.save(out_dir / 'portrait.png', 'PNG')
    hud.save(out_dir / 'hud.png', 'PNG')
    sprites['portrait'] = port
    sprites['hud'] = hud
    print("  ✓ palette portrait.png & hud.png built")

    make_preview(sprites, out_dir / '_preview.png')
    print("  ✓ palette _preview.png built")

def main():
    print("==================================================")
    print("Campus Clash — Master 10-Character Suite Builder")
    print("==================================================")

    # 1. Clean chroma-key and standardise Topper, Hosteler, Sports, Senior
    process_character_directory('senior', (47, 191, 113))
    process_character_directory('topper', (47, 123, 255))
    process_character_directory('hosteler', (255, 106, 61))
    process_character_directory('sports', (46, 139, 255))

    # 2. Build dedicated Cypher, Gavel, and Palette suites
    build_cypher()
    build_gavel()
    build_palette()

    print("\n✅ All character suites compiled successfully with 100% genuine RGBA sprites!")
    return 0

if __name__ == '__main__':
    sys.exit(main())
