#!/usr/bin/env python3
"""
Master Visual Overhaul for CYPHER (The Campus Hacker) and THE GAVEL (Moot Court Legend).
Creates distinct, high-fidelity, heroic 2D fighting game artwork for both fighters.
"""

import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np

CELL = 1024

def bbox(im):
    return im.getbbox()

def make_portrait_hud(idle_img, border_color, char_name=""):
    bb = bbox(idle_img)
    if not bb:
        crop_box = (CELL // 4, 80, CELL * 3 // 4, 580)
    else:
        cx = (bb[0] + bb[2]) // 2
        top = bb[1]
        crop_box = (cx - 200, top - 20, cx + 200, top + 380)

    head = idle_img.crop(crop_box).resize((512, 512), Image.Resampling.LANCZOS)
    port = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    pdraw = ImageDraw.Draw(port)

    # Circular mask
    pdraw.ellipse([16, 16, 496, 496], fill=(12, 18, 30, 245))
    mask = Image.new('L', (512, 512), 0)
    ImageDraw.Draw(mask).ellipse([20, 20, 492, 492], fill=255)
    port.paste(head, (0, 0), mask)

    # Neon rim
    pdraw.ellipse([16, 16, 496, 496], outline=border_color, width=8)
    pdraw.ellipse([24, 24, 488, 488], outline=(255, 255, 255, 140), width=2)

    hud = port.resize((256, 256), Image.Resampling.LANCZOS)
    return port, hud

# =========================================================================
# 1. CYPHER (THE CAMPUS HACKER) — HIGH-TECH CYBER SPECTRE
# =========================================================================
def build_master_cypher():
    print("\n=== Building Master Artwork for CYPHER (The Campus Hacker) ===")
    out_dir = Path('assets/characters/cypher')
    out_dir.mkdir(parents=True, exist_ok=True)
    base_dir = Path('assets/characters/backbencher')

    def stylize_cypher(base_img, is_crouch=False):
        arr = np.asarray(base_img).astype(np.float32)
        alpha = arr[..., 3]
        r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]

        bb = bbox(base_img)
        head_top = bb[1] if bb else 90
        cx = (bb[0] + bb[2]) // 2 if bb else 512
        y_coords = np.arange(CELL)[:, None]

        # 1. Torso & Jacket: Deep matte obsidian techwear (#0B0F19)
        # Recolor jacket & clothing into sleek obsidian with dark slate shading
        is_clothes = (alpha > 40)
        arr[is_clothes, 0] = np.clip(arr[is_clothes, 0] * 0.12 + 10, 0, 255)
        arr[is_clothes, 1] = np.clip(arr[is_clothes, 1] * 0.16 + 15, 0, 255)
        arr[is_clothes, 2] = np.clip(arr[is_clothes, 2] * 0.24 + 25, 0, 255)

        tech_img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA')
        overlay = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        # 2. Sleek Techwear Hood & Dark Hair Contours
        hood_x1, hood_x2 = cx - 58, cx + 52
        hood_y1, hood_y2 = head_top - 12, head_top + 130
        draw.ellipse([hood_x1, hood_y1, hood_x2, hood_y2], fill=(10, 14, 24, 250), outline=(0, 229, 255, 200), width=2)

        # 3. Holographic Cyber Visor across eyes
        visor_y = head_top + (70 if not is_crouch else 60)
        vx1, vx2 = cx - 46, cx + 42
        vy1, vy2 = visor_y - 12, visor_y + 16

        # Visor outer glow
        glow_box = [vx1 - 6, vy1 - 6, vx2 + 6, vy2 + 6]
        draw.rounded_rectangle(glow_box, radius=8, fill=(0, 229, 255, 70))
        # Visor body
        draw.rounded_rectangle([vx1, vy1, vx2, vy2], radius=6, fill=(0, 229, 255, 220), outline=(0, 255, 65, 255), width=2)
        # Laser core
        draw.line([vx1 + 6, visor_y + 2, vx2 - 6, visor_y + 2], fill=(255, 255, 255, 255), width=3)
        # Digital HUD crosshair & ticks
        draw.line([cx - 4, vy1 + 2, cx - 4, vy2 - 2], fill=(255, 255, 255, 180), width=1)
        draw.line([cx + 10, vy1 + 2, cx + 10, vy2 - 2], fill=(255, 255, 255, 180), width=1)

        # 4. Matrix Neon Circuit Lines flowing down chest, shoulders, and sleeves
        torso_y = visor_y + 65
        # Spine & chest conduits
        draw.line([cx - 18, torso_y, cx - 18, torso_y + 160], fill=(0, 255, 65, 220), width=3)
        draw.line([cx + 16, torso_y + 20, cx + 16, torso_y + 180], fill=(0, 229, 255, 220), width=3)
        # Lateral cyber ribs
        draw.line([cx - 18, torso_y + 40, cx - 65, torso_y + 80], fill=(0, 229, 255, 200), width=2)
        draw.line([cx + 16, torso_y + 50, cx + 60, torso_y + 95], fill=(0, 255, 65, 200), width=2)
        draw.line([cx - 18, torso_y + 90, cx - 75, torso_y + 140], fill=(0, 255, 65, 190), width=2)
        draw.line([cx + 16, torso_y + 105, cx + 70, torso_y + 155], fill=(0, 229, 255, 190), width=2)

        # 5. Floating Translucent Holographic Data Screens & Wrist Terminals
        # Left wrist screen
        sx1, sy1 = cx - 145, torso_y + 45
        draw.rounded_rectangle([sx1, sy1, sx1 + 95, sy1 + 65], radius=5, fill=(0, 30, 50, 190), outline=(0, 229, 255, 240), width=2)
        draw.rectangle([sx1 + 4, sy1 + 4, sx1 + 91, sy1 + 16], fill=(0, 229, 255, 80))
        draw.line([sx1 + 10, sy1 + 28, sx1 + 80, sy1 + 28], fill=(0, 255, 65, 230), width=2)
        draw.line([sx1 + 10, sy1 + 38, sx1 + 65, sy1 + 38], fill=(0, 229, 255, 210), width=2)
        draw.line([sx1 + 10, sy1 + 48, sx1 + 75, sy1 + 48], fill=(0, 255, 65, 210), width=2)
        draw.text((sx1 + 12, sy1 + 5), "// OVERRIDE", fill=(0, 229, 255, 255))

        # Right wrist terminal & floating holographic data ring
        rx1, ry1 = cx + 55, torso_y + 70
        draw.ellipse([rx1, ry1, rx1 + 70, ry1 + 70], outline=(0, 229, 255, 210), width=2)
        draw.ellipse([rx1 + 8, ry1 + 8, rx1 + 62, ry1 + 62], outline=(0, 255, 65, 180), width=1)
        draw.text((rx1 + 14, ry1 + 26), "0x7F", fill=(0, 255, 65, 255))

        # 6. High-tech tactical cyber joggers & neon accents on shoes
        jog_y = torso_y + 220
        draw.line([cx - 45, jog_y, cx - 45, jog_y + 140], fill=(0, 229, 255, 170), width=2)
        draw.line([cx + 42, jog_y + 10, cx + 42, jog_y + 150], fill=(0, 255, 65, 170), width=2)
        # Shoe sole neon glow
        shoe_y = head_top + 880
        draw.line([cx - 85, shoe_y, cx - 25, shoe_y], fill=(0, 229, 255, 240), width=4)
        draw.line([cx + 25, shoe_y, cx + 85, shoe_y], fill=(0, 229, 255, 240), width=4)

        result = Image.alpha_composite(tech_img, overlay)
        return result

    # Build standard states
    states = ['idle', 'walk', 'run', 'crouch', 'jump', 'block', 'dodge', 'hit']
    for st in states:
        base_f = Image.open(base_dir / f'{st}.png').convert('RGBA')
        sp = stylize_cypher(base_f, is_crouch=(st == 'crouch'))
        sp.save(out_dir / f'{st}.png', 'PNG')
        print(f"  ✓ cypher {st}.png built")

    # Air & Dash
    dash = Image.open(out_dir / 'run.png')
    dash.save(out_dir / 'dash.png', 'PNG')
    air = Image.open(out_dir / 'jump.png')
    air.save(out_dir / 'air.png', 'PNG')

    # Heavy Attack: "Code Breaker Slam" (3-frame strip)
    raw_h = Image.open(base_dir / 'heavy.png').convert('RGBA')
    hw, hh = raw_h.size
    pw = hw // 3
    h_strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))
    for i in range(3):
        panel = raw_h.crop((i * pw, 0, (i + 1) * pw, hh))
        sp = stylize_cypher(panel)
        if i >= 1:
            cov = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
            cd = ImageDraw.Draw(cov)
            # Cyber burst rings
            cd.ellipse([500, 300, 800, 600], outline=(0, 229, 255, 220), width=5)
            cd.ellipse([540, 340, 760, 560], outline=(0, 255, 65, 200), width=3)
            cd.text((610, 420), "FIREWALL BREACHED", fill=(0, 229, 255, 240))
            sp = Image.alpha_composite(sp, cov)
        h_strip.paste(sp, (i * CELL, 0), sp)
    h_strip.save(out_dir / 'heavy.png', 'PNG')
    print("  ✓ cypher heavy.png built")

    # Light Attack: "Logic Strike" (3-frame strip)
    raw_l = Image.open(base_dir / 'light.png').convert('RGBA')
    lw, lh = raw_l.size
    pw = lw // 3
    l_strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))
    for i in range(3):
        panel = raw_l.crop((i * pw, 0, (i + 1) * pw, lh))
        sp = stylize_cypher(panel)
        l_strip.paste(sp, (i * CELL, 0), sp)
    l_strip.save(out_dir / 'light.png', 'PNG')
    print("  ✓ cypher light.png built")

    # Special: "Cyber Pulse" (3-frame strip)
    raw_s = Image.open(base_dir / 'special.png').convert('RGBA')
    sw, sh = raw_s.size
    pw = sw // 3
    s_strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))
    for i in range(3):
        panel = raw_s.crop((i * pw, 0, (i + 1) * pw, sh))
        sp = stylize_cypher(panel)
        s_strip.paste(sp, (i * CELL, 0), sp)
    s_strip.save(out_dir / 'special.png', 'PNG')
    print("  ✓ cypher special.png built")

    # Ultimate: "System Purge"
    base_u = Image.open(out_dir / 'idle.png')
    u_overlay = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    ud = ImageDraw.Draw(u_overlay)
    for x in range(200, 900, 40):
        ud.line([x, 100, x, 850], fill=(0, 255, 65, 75), width=2)
    ud.text((440, 260), "☠ SYSTEM OVERRIDE ☠", fill=(0, 229, 255, 240))
    ud.text((460, 290), "ROOT ACCESS CONFIRMED", fill=(0, 255, 65, 240))
    ult = Image.alpha_composite(base_u, u_overlay)
    ult.save(out_dir / 'ultimate.png', 'PNG')
    print("  ✓ cypher ultimate.png built")

    # Portrait & HUD
    idle_im = Image.open(out_dir / 'idle.png')
    port, hud = make_portrait_hud(idle_im, (0, 229, 255), "CYPHER")
    port.save(out_dir / 'portrait.png', 'PNG')
    hud.save(out_dir / 'hud.png', 'PNG')
    print("  ✓ cypher portrait.png & hud.png built")

    # Showcase Sprite (cropped to bounding box, normalized)
    cbb = bbox(idle_im)
    show_crop = idle_im.crop(cbb)
    show_crop.save(out_dir / 'showcase.png', 'PNG')
    print(f"  ✓ cypher showcase.png built: size={show_crop.size}")


# =========================================================================
# 2. THE GAVEL (MOOT COURT LEGEND) — DIGNIFIED LAW SUPREMACIST
# =========================================================================
def build_master_gavel():
    print("\n=== Building Master Artwork for THE GAVEL (Moot Court Legend) ===")
    out_dir = Path('assets/characters/gavel')
    out_dir.mkdir(parents=True, exist_ok=True)
    senior_dir = Path('assets/characters/senior')

    def stylize_gavel(base_img, is_crouch=False):
        arr = np.asarray(base_img).astype(np.float32)
        alpha = arr[..., 3]
        r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]

        bb = bbox(base_img)
        head_top = bb[1] if bb else 90
        cx = (bb[0] + bb[2]) // 2 if bb else 512

        # 1. Coat -> Deep Midnight Court Navy Blazer (#0D1326) with rich indigo satin sheen
        is_coat = (alpha > 40) & ((g > r * 0.75) | (b > r * 0.75) | (r > 50))
        arr[is_coat, 0] = np.clip(arr[is_coat, 0] * 0.12 + 12, 0, 255)
        arr[is_coat, 1] = np.clip(arr[is_coat, 1] * 0.16 + 18, 0, 255)
        arr[is_coat, 2] = np.clip(arr[is_coat, 2] * 0.35 + 40, 0, 255)

        gavel_img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA')
        overlay = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        collar_y = head_top + 130 if not is_crouch else head_top + 115

        # 2. Crisp Silk Barrister Neck Tabs (High Court Advocate attire)
        # Left Tab
        draw.polygon([(cx - 14, collar_y), (cx - 2, collar_y), (cx - 4, collar_y + 45), (cx - 16, collar_y + 45)],
                     fill=(250, 252, 255, 255), outline=(210, 215, 225, 255))
        # Right Tab
        draw.polygon([(cx + 2, collar_y), (cx + 14, collar_y), (cx + 16, collar_y + 45), (cx + 4, collar_y + 45)],
                     fill=(250, 252, 255, 255), outline=(210, 215, 225, 255))
        # Advocate neck band
        draw.rounded_rectangle([cx - 18, collar_y - 6, cx + 18, collar_y + 4], radius=2,
                               fill=(255, 255, 255, 255), outline=(220, 220, 230, 255))

        # 3. Gleaming Gold Scales of Justice Lapel Pin (#FFD700) on left breast
        pin_x, pin_y = cx - 45, collar_y + 25
        draw.ellipse([pin_x - 14, pin_y - 14, pin_x + 14, pin_y + 14], fill=(255, 215, 0, 255), outline=(180, 140, 20, 255), width=2)
        # Scales glyph inside pin
        draw.line([pin_x - 10, pin_y - 2, pin_x + 10, pin_y - 2], fill=(60, 40, 10, 255), width=2)
        draw.line([pin_x, pin_y - 8, pin_x, pin_y + 6], fill=(60, 40, 10, 255), width=2)

        # 4. Remove Senior's tea cup completely by painting glove / robe cuff over it
        # Senior cup was around x: 620-690, y: 390-480
        draw.rounded_rectangle([cx + 50, collar_y + 55, cx + 120, collar_y + 125], radius=15,
                               fill=(13, 19, 38, 255), outline=(25, 35, 65, 255), width=3)

        # 5. Render Massive, Handcrafted 3D Judicial Gavel in his hand
        gx, gy = cx + 85, collar_y + 70
        # Gavel Handle (carved dark polished mahogany with brass rings)
        handle_start = (gx - 35, gy + 85)
        handle_end = (gx + 30, gy - 35)
        draw.line([handle_start[0], handle_start[1], handle_end[0], handle_end[1]], fill=(65, 28, 12, 255), width=12)
        draw.line([handle_start[0], handle_start[1], handle_end[0], handle_end[1]], fill=(255, 215, 0, 255), width=3)

        # Gavel Head (Imposing cylindrical mahogany mallet with engraved gold bands)
        head_x1, head_y1 = gx + 10, gy - 65
        head_x2, head_y2 = gx + 70, gy - 15
        # Drop shadow for gavel
        draw.rounded_rectangle([head_x1 + 4, head_y1 + 4, head_x2 + 4, head_y2 + 4], radius=6, fill=(0, 0, 0, 140))
        # Mahogany wood body
        draw.rounded_rectangle([head_x1, head_y1, head_x2, head_y2], radius=6, fill=(75, 30, 15, 255), outline=(255, 215, 0, 255), width=3)
        # Polished wood specular highlight
        draw.line([head_x1 + 6, head_y1 + 10, head_x2 - 6, head_y1 + 10], fill=(160, 80, 40, 220), width=4)
        # Gold brass decorative bands on both sides
        draw.line([head_x1 + 14, head_y1 + 2, head_x1 + 14, head_y2 - 2], fill=(255, 215, 0, 255), width=4)
        draw.line([head_x2 - 14, head_y1 + 2, head_x2 - 14, head_y2 - 2], fill=(255, 215, 0, 255), width=4)
        # Central golden law seal "⚖"
        draw.ellipse([gx + 32, gy - 48, gx + 48, gy - 32], fill=(255, 215, 0, 255), outline=(180, 140, 20, 255), width=1)

        # 6. Golden Juridical Aura Particles around gavel
        draw.text((gx + 72, gy - 75), "§", fill=(255, 215, 0, 240))
        draw.text((gx + 20, gy - 85), "⚖", fill=(255, 215, 0, 230))
        draw.ellipse([gx + 80, gy - 30, gx + 85, gy - 25], fill=(255, 230, 100, 240))
        draw.ellipse([gx - 5, gy - 60, gx, gy - 55], fill=(255, 230, 100, 240))

        result = Image.alpha_composite(gavel_img, overlay)
        return result

    # Build standard states
    states = ['idle', 'walk', 'run', 'crouch', 'jump', 'block', 'dodge', 'hit']
    for st in states:
        base_f = Image.open(senior_dir / f'{st}.png').convert('RGBA')
        sp = stylize_gavel(base_f, is_crouch=(st == 'crouch'))
        sp.save(out_dir / f'{st}.png', 'PNG')
        print(f"  ✓ gavel {st}.png built")

    # Air & Dash
    dash = Image.open(out_dir / 'run.png')
    dash.save(out_dir / 'dash.png', 'PNG')
    air = Image.open(out_dir / 'jump.png')
    air.save(out_dir / 'air.png', 'PNG')

    # Light Attack: "Verdict Strike" (3-frame strip)
    raw_l = Image.open(senior_dir / 'light.png').convert('RGBA')
    lw, lh = raw_l.size
    pw = lw // 3
    l_strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))
    for i in range(3):
        panel = raw_l.crop((i * pw, 0, (i + 1) * pw, lh))
        sp = stylize_gavel(panel)
        if i == 1:
            gov = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
            gd = ImageDraw.Draw(gov)
            gd.arc([540, 320, 800, 580], start=180, end=330, fill=(255, 215, 0, 255), width=7)
            gd.text((680, 350), "§ 302 VERDICT", fill=(255, 215, 0, 255))
            sp = Image.alpha_composite(sp, gov)
        l_strip.paste(sp, (i * CELL, 0), sp)
    l_strip.save(out_dir / 'light.png', 'PNG')
    print("  ✓ gavel light.png built")

    # Heavy Attack: "Court In Session" (3-frame strip)
    raw_h = Image.open(senior_dir / 'heavy.png').convert('RGBA')
    hw, hh = raw_h.size
    pw = hw // 3
    h_strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))
    for i in range(3):
        panel = raw_h.crop((i * pw, 0, (i + 1) * pw, hh))
        sp = stylize_gavel(panel)
        h_strip.paste(sp, (i * CELL, 0), sp)
    h_strip.save(out_dir / 'heavy.png', 'PNG')
    print("  ✓ gavel heavy.png built")

    # Special: "Contempt of Court" (3-frame strip)
    raw_s = Image.open(senior_dir / 'special.png').convert('RGBA')
    sw, sh = raw_s.size
    pw = sw // 3
    s_strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))
    for i in range(3):
        panel = raw_s.crop((i * pw, 0, (i + 1) * pw, sh))
        sp = stylize_gavel(panel)
        s_strip.paste(sp, (i * CELL, 0), sp)
    s_strip.save(out_dir / 'special.png', 'PNG')
    print("  ✓ gavel special.png built")

    # Ultimate: "Supreme Jurisdiction"
    base_u = Image.open(out_dir / 'idle.png')
    u_overlay = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    ud = ImageDraw.Draw(u_overlay)
    # Golden juridical pillar
    ud.rectangle([350, 150, 670, 850], fill=(255, 215, 0, 45), outline=(255, 215, 0, 200), width=3)
    ud.text((430, 240), "⚖ SUPREME JURISDICTION ⚖", fill=(255, 215, 0, 255))
    ud.text((470, 280), "MOTION SUSTAINED", fill=(255, 255, 255, 240))
    ult = Image.alpha_composite(base_u, u_overlay)
    ult.save(out_dir / 'ultimate.png', 'PNG')
    print("  ✓ gavel ultimate.png built")

    # Portrait & HUD
    idle_im = Image.open(out_dir / 'idle.png')
    port, hud = make_portrait_hud(idle_im, (255, 215, 0), "GAVEL")
    port.save(out_dir / 'portrait.png', 'PNG')
    hud.save(out_dir / 'hud.png', 'PNG')
    print("  ✓ gavel portrait.png & hud.png built")

    # Showcase Sprite
    cbb = bbox(idle_im)
    show_crop = idle_im.crop(cbb)
    show_crop.save(out_dir / 'showcase.png', 'PNG')
    print(f"  ✓ gavel showcase.png built: size={show_crop.size}")

if __name__ == '__main__':
    build_master_cypher()
    build_master_gavel()
    print("\nMaster Cypher and Gavel Suites successfully generated!")
