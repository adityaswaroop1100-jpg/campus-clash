#!/usr/bin/env python3
"""
Build Fresh Distinct Looks for Cypher and Palette:
- Cypher: High-tech cyber-stealth hacker built on Bolt's athletic sprinter frame.
  Deep carbon techwear, glowing cyan visor, matrix green circuit conduits, holographic wrist terminals.
- Palette: Bohemian fine arts artisan built on Backbencher's relaxed casual silhouette.
  Off-white linen apron with vibrant acrylic splatters, royal violet beret, coral scarf, giant calligraphy brush.
"""

import os, sys, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

CELL = 1024

def bbox(im):
    return im.getbbox()

def make_preview(sprites, out_path):
    keys = ['idle', 'walk', 'run', 'jump', 'air', 'crouch', 'light', 'heavy',
            'block', 'dodge', 'dash', 'hit', 'special', 'ultimate', 'portrait', 'hud']
    cols = 4
    rows = (len(keys) + cols - 1) // cols
    cell = 256
    preview = Image.new('RGBA', (cols * cell, rows * cell), (10, 14, 22, 255))
    draw = ImageDraw.Draw(preview)

    for idx, k in enumerate(keys):
        sp = sprites.get(k)
        if sp is None:
            continue
        c = idx % cols
        r = idx // cols
        x = c * cell
        y = r * cell

        if k in ['light', 'heavy', 'special']:
            w, h = sp.size
            if w > h:
                frame_w = w // 3
                f = sp.crop((frame_w, 0, frame_w * 2, h))
            else:
                f = sp
        else:
            f = sp

        thumb = f.copy()
        thumb.thumbnail((cell - 20, cell - 36), Image.Resampling.LANCZOS)
        px = x + (cell - thumb.width) // 2
        py = y + 10 + (cell - 36 - thumb.height) // 2
        preview.paste(thumb, (px, py), thumb)
        draw.text((x + 8, y + cell - 20), k, fill=(200, 220, 240, 255))

    preview.save(out_path, 'PNG')
    print(f"  ✓ Saved preview sheet -> {out_path}")

def make_portrait_hud(idle_img, border_color, char_name=""):
    bb = bbox(idle_img) or (200, 80, 800, 950)
    head_top = bb[1]
    head_cx = (bb[0] + bb[2]) // 2

    # Generous bust crop (face, headwear, collar, upper chest)
    crop_w = 460
    crop_h = 560
    cx1 = max(0, head_cx - crop_w // 2)
    cy1 = max(0, head_top - 30)
    cx2 = min(idle_img.width, cx1 + crop_w)
    cy2 = min(idle_img.height, cy1 + crop_h)

    bust = idle_img.crop((cx1, cy1, cx2, cy2))

    # 1. Portrait (512x512)
    port = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    scale = min(480 / bust.width, 480 / bust.height)
    bw, bh = int(bust.width * scale), int(bust.height * scale)
    scaled_bust = bust.resize((bw, bh), Image.Resampling.LANCZOS)
    port.paste(scaled_bust, ((512 - bw) // 2, (512 - bh) // 2), scaled_bust)

    pdraw = ImageDraw.Draw(port)
    # Hexagonal / Rounded Tech frame border
    pdraw.rounded_rectangle([12, 12, 500, 500], radius=24, outline=border_color, width=5)
    pdraw.rounded_rectangle([18, 18, 494, 494], radius=20, outline=(255, 255, 255, 120), width=2)
    if char_name:
        pdraw.text((36, 460), char_name, fill=border_color)

    # 2. HUD Icon (256x256)
    hud = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
    hscale = min(230 / bust.width, 230 / bust.height)
    hbw, hbh = int(bust.width * hscale), int(bust.height * hscale)
    scaled_hud_bust = bust.resize((hbw, hbh), Image.Resampling.LANCZOS)
    hud.paste(scaled_hud_bust, ((256 - hbw) // 2, (256 - hbh) // 2), scaled_hud_bust)

    hdraw = ImageDraw.Draw(hud)
    hdraw.rounded_rectangle([6, 6, 250, 250], radius=14, outline=border_color, width=4)

    return port, hud

# =========================================================================
# 1. BUILD FRESH CYPHER (THE CYBER SPECTRE / UNDERGROUND HACKER)
#    Base: Bolt's athletic, low-crouched runner silhouette
# =========================================================================
def build_fresh_cypher():
    print("\n=== Building FRESH CYPHER (Cyber Spectre Hacker) ===")
    out_dir = Path('assets/characters/cypher')
    out_dir.mkdir(parents=True, exist_ok=True)
    bolt_dir = Path('assets/characters/bolt')
    sprites = {}

    def stylize_cypher(base_img, is_crouch=False):
        arr = np.asarray(base_img).astype(np.float32)
        alpha = arr[..., 3]
        r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]

        # Convert athlete gear into sleek matte-black stealth techwear (#0A0E17)
        # Identify clothing and skin
        is_clothes = (alpha > 40) & ((r > 30) | (g > 30) | (b > 30))
        # Keep head skin slightly tinted cyber-pale
        bb = bbox(base_img)
        head_top = bb[1] if bb else 120
        head_bot = head_top + 180

        # Body darkening to deep obsidian techwear
        arr[is_clothes, 0] = np.clip(arr[is_clothes, 0] * 0.12 + 10, 0, 255)
        arr[is_clothes, 1] = np.clip(arr[is_clothes, 1] * 0.16 + 14, 0, 255)
        arr[is_clothes, 2] = np.clip(arr[is_clothes, 2] * 0.22 + 22, 0, 255)

        tech_img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA')
        if not bb:
            return tech_img

        overlay = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        head_cx = (bb[0] + bb[2]) // 2
        head_y = bb[1]

        # 1. Low-profile Cyber Cowl / Hood over head
        hood_x1 = head_cx - 48
        hood_x2 = head_cx + 42
        hood_y1 = head_y - 6
        hood_y2 = head_y + 110
        draw.ellipse([hood_x1, hood_y1, hood_x2, hood_y2], fill=(12, 16, 26, 255), outline=(0, 229, 255, 180), width=2)

        # 2. Glowing Neon Cyan Cyber Visor with White Laser Core across eyes
        visor_y = head_y + (55 if not is_crouch else 50)
        vx1, vx2 = head_cx - 40, head_cx + 36
        draw.rounded_rectangle([vx1, visor_y - 10, vx2, visor_y + 12], radius=6, fill=(0, 229, 255, 230), outline=(0, 255, 65, 240), width=2)
        # Laser core
        draw.line([vx1 + 4, visor_y + 1, vx2 - 4, visor_y + 1], fill=(255, 255, 255, 255), width=3)

        # 3. Glowing Matrix Green Circuit Conduits coursing along arms and spine
        torso_y = visor_y + 60
        draw.line([head_cx - 24, torso_y, head_cx - 24, torso_y + 130], fill=(0, 255, 65, 210), width=3)
        draw.line([head_cx + 20, torso_y + 15, head_cx + 20, torso_y + 140], fill=(0, 229, 255, 210), width=3)
        draw.line([head_cx - 24, torso_y + 50, head_cx - 55, torso_y + 90], fill=(0, 255, 65, 180), width=2)
        draw.line([head_cx + 20, torso_y + 60, head_cx + 52, torso_y + 100], fill=(0, 229, 255, 180), width=2)

        # 4. Floating Holographic Terminal Rings around wrists
        wx, wy = head_cx + 58, torso_y + 85
        draw.ellipse([wx - 26, wy - 26, wx + 26, wy + 26], outline=(0, 229, 255, 220), width=2)
        draw.text((wx - 15, wy - 8), "0x1F", fill=(0, 255, 65, 250))

        result = Image.alpha_composite(tech_img, overlay)
        return result

    # Standard states
    states = ['idle', 'walk', 'run', 'crouch', 'jump', 'block', 'dodge', 'hit']
    for st in states:
        base_f = Image.open(bolt_dir / f'{st}.png').convert('RGBA')
        cypher_sp = stylize_cypher(base_f, is_crouch=(st == 'crouch'))
        cypher_sp.save(out_dir / f'{st}.png', 'PNG')
        sprites[st] = cypher_sp
        print(f"  ✓ cypher {st}.png built")

    sprites['run'].save(out_dir / 'dash.png', 'PNG')
    sprites['jump'].save(out_dir / 'air.png', 'PNG')
    sprites['dash'] = sprites['run']
    sprites['air'] = sprites['jump']

    # Light Attack: "Holographic Code Daggers" (3-frame strip)
    raw_light = Image.open(bolt_dir / 'light.png').convert('RGBA')
    lw, lh = raw_light.size
    pw = lw // 3
    light_strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))
    for i in range(3):
        panel = raw_light.crop((i * pw, 0, (i + 1) * pw, lh))
        cp = stylize_cypher(panel)
        if i == 1:
            cov = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
            cd = ImageDraw.Draw(cov)
            # Dual neon green & cyan data daggers
            cd.line([560, 410, 770, 370], fill=(0, 255, 65, 240), width=6)
            cd.line([560, 410, 770, 370], fill=(255, 255, 255, 255), width=2)
            cd.line([550, 435, 750, 460], fill=(0, 229, 255, 240), width=5)
            cd.text((630, 340), "01001001", fill=(0, 255, 65, 230))
            cp = Image.alpha_composite(cp, cov)
        light_strip.paste(cp, (i * CELL, 0), cp)
    light_strip.save(out_dir / 'light.png', 'PNG')
    sprites['light'] = light_strip
    print("  ✓ cypher light.png (Code Daggers) built")

    # Heavy Attack: "Enter Key Slam" (3-frame strip)
    raw_heavy = Image.open(bolt_dir / 'heavy.png').convert('RGBA')
    hw, hh = raw_heavy.size
    hpw = hw // 3
    heavy_strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))
    for i in range(3):
        panel = raw_heavy.crop((i * hpw, 0, (i + 1) * hpw, hh))
        cp = stylize_cypher(panel)
        if i == 1:
            cov = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
            cd = ImageDraw.Draw(cov)
            # Giant holographic green [ENTER] key smash
            cd.rounded_rectangle([610, 360, 780, 490], radius=12, fill=(0, 255, 65, 80), outline=(0, 255, 65, 240), width=4)
            cd.text((640, 415), "↵ ENTER", fill=(255, 255, 255, 250))
            cp = Image.alpha_composite(cp, cov)
        heavy_strip.paste(cp, (i * CELL, 0), cp)
    heavy_strip.save(out_dir / 'heavy.png', 'PNG')
    sprites['heavy'] = heavy_strip
    print("  ✓ cypher heavy.png (Enter Key Slam) built")

    # Special: "Firewall Glitch" (3-frame strip)
    raw_special = Image.open(bolt_dir / 'special.png').convert('RGBA')
    sw, sh = raw_special.size
    spw = sw // 3
    special_strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))
    for i in range(3):
        panel = raw_special.crop((i * spw, 0, (i + 1) * spw, sh))
        cp = stylize_cypher(panel)
        cov = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
        cd = ImageDraw.Draw(cov)
        for g in range(8):
            cd.rectangle([540 + g * 36, 350 + (g % 3) * 45, 566 + g * 36, 385 + (g % 3) * 45],
                         fill=(0, 229, 255, 160), outline=(0, 255, 65, 220))
        cp = Image.alpha_composite(cp, cov)
        special_strip.paste(cp, (i * CELL, 0), cp)
    special_strip.save(out_dir / 'special.png', 'PNG')
    sprites['special'] = special_strip
    print("  ✓ cypher special.png built")

    # Ultimate: "System Override" (1024x1024)
    base_ult = sprites['heavy'].crop((CELL, 0, CELL * 2, CELL)).copy()
    uov = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    ud = ImageDraw.Draw(uov)
    for x in range(250, 950, 40):
        ud.line([x, 120, x, 850], fill=(0, 255, 65, 75), width=2)
    ud.text((430, 240), "☠ SYSTEM OVERRIDE ☠", fill=(0, 229, 255, 240))
    ud.text((460, 275), "ROOT ACCESS GRANTED", fill=(0, 255, 65, 240))
    ult_final = Image.alpha_composite(base_ult, uov)
    ult_final.save(out_dir / 'ultimate.png', 'PNG')
    sprites['ultimate'] = ult_final
    print("  ✓ cypher ultimate.png built")

    # Portrait & HUD (Cyan theme #00E5FF)
    port, hud = make_portrait_hud(sprites['idle'], (0, 229, 255), "CYPHER")
    port.save(out_dir / 'portrait.png', 'PNG')
    hud.save(out_dir / 'hud.png', 'PNG')
    sprites['portrait'] = port
    sprites['hud'] = hud
    print("  ✓ cypher portrait.png & hud.png built")

    make_preview(sprites, out_dir / '_preview.png')
    print("  ✓ cypher _preview.png built")

# =========================================================================
# 2. BUILD FRESH PALETTE (THE AVANT-GARDE FINE ARTS MAJORETTE)
#    Base: Backbencher's relaxed, casual bohemian frame
# =========================================================================
def build_fresh_palette():
    print("\n=== Building FRESH PALETTE (Avant-Garde Fine Arts Major) ===")
    out_dir = Path('assets/characters/palette')
    out_dir.mkdir(parents=True, exist_ok=True)
    bb_dir = Path('assets/characters/backbencher')
    sprites = {}

    def stylize_palette(base_img, is_crouch=False):
        arr = np.asarray(base_img).astype(np.float32)
        alpha = arr[..., 3]
        r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]

        bb = bbox(base_img)
        head_top = bb[1] if bb else 100
        collar_y = head_top + 135 if not is_crouch else head_top + 115
        waist_y = collar_y + 190

        # 1. Torso Clothing -> Crisp Linen Artisan Apron / Smock (#F4F4F8)
        # Identify torso region
        y_coords = np.arange(CELL)[:, None]
        is_torso = (alpha > 40) & (y_coords >= collar_y - 20) & (y_coords <= waist_y)
        arr[is_torso, 0] = np.clip(arr[is_torso, 0] * 0.4 + 180, 0, 255)
        arr[is_torso, 1] = np.clip(arr[is_torso, 1] * 0.4 + 180, 0, 255)
        arr[is_torso, 2] = np.clip(arr[is_torso, 2] * 0.4 + 195, 0, 255)

        # 2. Lower Body -> Indigo Denim Trousers (#2C3E50)
        is_legs = (alpha > 40) & (y_coords > waist_y)
        arr[is_legs, 0] = np.clip(arr[is_legs, 0] * 0.2 + 35, 0, 255)
        arr[is_legs, 1] = np.clip(arr[is_legs, 1] * 0.25 + 48, 0, 255)
        arr[is_legs, 2] = np.clip(arr[is_legs, 2] * 0.45 + 85, 0, 255)

        art_img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA')
        if not bb:
            return art_img

        overlay = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        cx = (bb[0] + bb[2]) // 2

        # 3. Chic Oversized French Beret in Vivid Royal Violet (#8E24AA)
        beret_x1 = cx - 55
        beret_x2 = cx + 38
        beret_y1 = head_top - 18
        beret_y2 = head_top + 40
        draw.ellipse([beret_x1, beret_y1, beret_x2, beret_y2], fill=(142, 36, 170, 250), outline=(106, 27, 154, 255), width=3)
        # Beret top stalk
        draw.ellipse([cx - 14, head_top - 24, cx - 6, head_top - 14], fill=(142, 36, 170, 255))

        # 4. Flowing Bohemian Coral Scarf around collar
        draw.line([cx - 36, collar_y - 12, cx + 34, collar_y - 4], fill=(255, 110, 64, 240), width=10)
        draw.line([cx + 12, collar_y - 4, cx + 22, collar_y + 55], fill=(255, 110, 64, 230), width=8)

        # 5. Vibrant Pop-Art Paint Splatters on the Linen Apron (Hot Pink #FF1493, Cyan #00E5FF, Lemon #FFEB3B, Royal Violet #8E24AA)
        splatters = [
            (cx - 24, collar_y + 35, 11, (255, 20, 147, 240)),
            (cx + 18, collar_y + 55, 15, (0, 229, 255, 240)),
            (cx - 8, collar_y + 85, 9, (255, 235, 59, 240)),
            (cx - 28, collar_y + 115, 13, (142, 36, 170, 230)),
            (cx + 22, collar_y + 125, 10, (255, 20, 147, 230)),
            (cx - 2, collar_y + 145, 14, (0, 229, 255, 240)),
        ]
        for sx, sy, sr, scol in splatters:
            draw.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=scol)
            # Small secondary splatter drops
            draw.ellipse([sx + sr + 4, sy - 2, sx + sr + 7, sy + 1], fill=scol)

        # 6. Giant Calligraphy Paintbrush in Hand
        bx, by = cx + 65, collar_y + 70
        # Bamboo / Ebony shaft
        draw.line([bx - 20, by + 50, bx + 45, by - 45], fill=(50, 40, 35, 255), width=9)
        draw.line([bx - 20, by + 50, bx + 45, by - 45], fill=(255, 20, 147, 230), width=2)
        # Saturated glowing magenta brush tip with paint drop
        draw.polygon([(bx + 45, by - 45), (bx + 68, by - 70), (bx + 52, by - 38)], fill=(255, 20, 147, 255))
        draw.ellipse([bx + 62, by - 78, bx + 74, by - 66], fill=(0, 229, 255, 240))

        result = Image.alpha_composite(art_img, overlay)
        return result

    # Standard states
    states = ['idle', 'walk', 'run', 'crouch', 'jump', 'block', 'dodge', 'hit']
    for st in states:
        base_f = Image.open(bb_dir / f'{st}.png').convert('RGBA')
        pal_sp = stylize_palette(base_f, is_crouch=(st == 'crouch'))
        pal_sp.save(out_dir / f'{st}.png', 'PNG')
        sprites[st] = pal_sp
        print(f"  ✓ palette {st}.png built")

    sprites['run'].save(out_dir / 'dash.png', 'PNG')
    sprites['jump'].save(out_dir / 'air.png', 'PNG')
    sprites['dash'] = sprites['run']
    sprites['air'] = sprites['jump']

    # Light Attack: "Sweeping Watercolor Arc" (3-frame strip)
    raw_light = Image.open(bb_dir / 'light.png').convert('RGBA')
    lw, lh = raw_light.size
    pw = lw // 3
    light_strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))
    for i in range(3):
        panel = raw_light.crop((i * pw, 0, (i + 1) * pw, lh))
        pp = stylize_palette(panel)
        if i == 1:
            pov = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
            pd = ImageDraw.Draw(pov)
            # Huge luminous multi-colored watercolor arc
            pd.arc([520, 330, 810, 580], start=150, end=340, fill=(255, 20, 147, 240), width=12)
            pd.arc([535, 345, 795, 565], start=150, end=340, fill=(0, 229, 255, 230), width=6)
            pd.arc([550, 360, 780, 550], start=150, end=340, fill=(255, 235, 59, 220), width=3)
            pp = Image.alpha_composite(pp, pov)
        light_strip.paste(pp, (i * CELL, 0), pp)
    light_strip.save(out_dir / 'light.png', 'PNG')
    sprites['light'] = light_strip
    print("  ✓ palette light.png (Watercolor Arc) built")

    # Heavy Attack: "Canvas Cross-Slash" (3-frame strip)
    raw_heavy = Image.open(bb_dir / 'heavy.png').convert('RGBA')
    hw, hh = raw_heavy.size
    hpw = hw // 3
    heavy_strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))
    for i in range(3):
        panel = raw_heavy.crop((i * hpw, 0, (i + 1) * hpw, hh))
        pp = stylize_palette(panel)
        if i == 1:
            pov = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
            pd = ImageDraw.Draw(pov)
            # Radiant cross-slash of saturated pink and cyan acrylic bursts
            pd.line([540, 340, 780, 540], fill=(255, 20, 147, 250), width=12)
            pd.line([540, 540, 780, 340], fill=(0, 229, 255, 250), width=12)
            pd.line([540, 340, 780, 540], fill=(255, 255, 255, 240), width=3)
            pd.line([540, 540, 780, 340], fill=(255, 255, 255, 240), width=3)
            pp = Image.alpha_composite(pp, pov)
        heavy_strip.paste(pp, (i * CELL, 0), pp)
    heavy_strip.save(out_dir / 'heavy.png', 'PNG')
    sprites['heavy'] = heavy_strip
    print("  ✓ palette heavy.png (Canvas Cross-Slash) built")

    # Special: "Splatter Burst" (3-frame strip)
    raw_special = Image.open(bb_dir / 'special.png').convert('RGBA')
    sw, sh = raw_special.size
    spw = sw // 3
    special_strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))
    for i in range(3):
        panel = raw_special.crop((i * spw, 0, (i + 1) * spw, sh))
        pp = stylize_palette(panel)
        pov = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
        pd = ImageDraw.Draw(pov)
        for g in range(16):
            rad = math.radians(g * 22.5)
            px = 660 + int(85 * math.cos(rad))
            py = 430 + int(85 * math.sin(rad))
            col = (255, 20, 147, 240) if g % 3 == 0 else ((0, 229, 255, 240) if g % 3 == 1 else (255, 235, 59, 240))
            pd.ellipse([px - 12, py - 12, px + 12, py + 12], fill=col)
        pp = Image.alpha_composite(pp, pov)
        special_strip.paste(pp, (i * CELL, 0), pp)
    special_strip.save(out_dir / 'special.png', 'PNG')
    sprites['special'] = special_strip
    print("  ✓ palette special.png built")

    # Ultimate: "Living Art Gallery" (1024x1024)
    base_ult = sprites['heavy'].crop((CELL, 0, CELL * 2, CELL)).copy()
    uov = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    ud = ImageDraw.Draw(uov)
    for r in range(260, 40, -32):
        ud.ellipse([640 - r, 460 - r, 640 + r, 460 + r], outline=(255, 20, 147, 180), width=4)
        ud.ellipse([640 - r + 16, 460 - r + 16, 640 + r - 16, 460 + r - 16], outline=(0, 229, 255, 180), width=3)
    ud.text((460, 230), "🎨 LIVING ART GALLERY 🎨", fill=(255, 20, 147, 255))
    ud.text((480, 265), "EVERY STROKE IS A STRIKE", fill=(255, 235, 59, 240))
    ult_final = Image.alpha_composite(base_ult, uov)
    ult_final.save(out_dir / 'ultimate.png', 'PNG')
    sprites['ultimate'] = ult_final
    print("  ✓ palette ultimate.png built")

    # Portrait & HUD (Hot Pink theme #FF1493)
    port, hud = make_portrait_hud(sprites['idle'], (255, 20, 147), "PALETTE")
    port.save(out_dir / 'portrait.png', 'PNG')
    hud.save(out_dir / 'hud.png', 'PNG')
    sprites['portrait'] = port
    sprites['hud'] = hud
    print("  ✓ palette portrait.png & hud.png built")

    make_preview(sprites, out_dir / '_preview.png')
    print("  ✓ palette _preview.png built")

def main():
    build_fresh_cypher()
    build_fresh_palette()
    print("\n✅ Cypher and Palette rebuilt with completely fresh, distinct identities!")

if __name__ == '__main__':
    main()
