#!/usr/bin/env python3
"""
Campus Clash — Build Complete Backbencher Sprite Set
Replaces placeholder Senior sprites with genuine Backbencher RGBA sprites.
Generates: idle, walk, run, jump, crouch, dash, air, light (3-frame),
heavy (3-frame), block, dodge, hit, special (3-frame), ultimate, portrait, hud, _preview.
"""

import os, math, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

CELL = 1024
FILL = 0.88  # Fraction of cell height for character standing pose

def key_out(img: Image.Image, mode: str = 'green') -> Image.Image:
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
    """Crop to bbox, scale, drop into a CELLxCELL canvas, feet on bottom edge with y_pad margin."""
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

def make_block(crouch_img, idle_img):
    """Backbencher in defensive guard using backpack as a riot shield + neon orange hex graffiti barrier."""
    base = crouch_img.copy()
    overlay = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Neon orange graffiti shield in front of Backbencher
    shield_cx, shield_cy = 670, 640
    # Outer radiant glow
    for r in range(160, 40, -25):
        alpha = int(45 * (1 - r / 160))
        pts = []
        for i in range(6):
            ang = math.radians(60 * i)
            pts.append((shield_cx + r * math.cos(ang), shield_cy + r * math.sin(ang)))
        draw.polygon(pts, outline=(255, 107, 53, 190), fill=(255, 60, 0, alpha))

    # Inner high-contrast hex border
    pts = []
    for i in range(6):
        ang = math.radians(60 * i)
        pts.append((shield_cx + 120 * math.cos(ang), shield_cy + 120 * math.sin(ang)))
    draw.polygon(pts, outline=(255, 170, 50, 240), width=4)

    # Rebel graffiti tags and spray streaks on shield
    draw.line([shield_cx - 70, shield_cy - 40, shield_cx + 70, shield_cy + 40], fill=(0, 212, 170, 200), width=3)
    draw.line([shield_cx - 50, shield_cy + 50, shield_cx + 50, shield_cy - 50], fill=(255, 255, 255, 220), width=2)
    draw.text((shield_cx - 42, shield_cy - 12), "BUNK", fill=(255, 255, 255, 230))

    result = Image.alpha_composite(base, overlay)
    return result

def make_dodge(dash_img):
    """Dash with two trailing neon orange motion ghosts."""
    result = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))

    # Ghost 1 (farthest behind, tinted neon orange)
    g1 = dash_img.copy()
    g1_data = np.asarray(g1).astype(np.float32)
    g1_data[..., 3] *= 0.25
    g1_data[..., 0] = np.clip(g1_data[..., 0] * 0.8 + 100, 0, 255)
    g1_data[..., 1] = g1_data[..., 1] * 0.4
    g1_data[..., 2] = 40
    g1_img = Image.fromarray(np.clip(g1_data, 0, 255).astype(np.uint8), 'RGBA')
    result.paste(g1_img, (-100, 0), g1_img)

    # Ghost 2 (closer behind)
    g2 = dash_img.copy()
    g2_data = np.asarray(g2).astype(np.float32)
    g2_data[..., 3] *= 0.50
    g2_data[..., 0] = np.clip(g2_data[..., 0] * 0.9 + 50, 0, 255)
    g2_data[..., 1] = g2_data[..., 1] * 0.6
    g2_data[..., 2] = 60
    g2_img = Image.fromarray(np.clip(g2_data, 0, 255).astype(np.uint8), 'RGBA')
    result.paste(g2_img, (-50, 0), g2_img)

    # Main fighter
    result.paste(dash_img, (0, 0), dash_img)
    return result

def make_hit(idle_img):
    """Fighter recoiling in stun: tilted back -14 degrees with impact shockwave sparks."""
    bb = bbox(idle_img)
    if not bb:
        return idle_img
    cropped = idle_img.crop(bb)
    rot = cropped.rotate(-14, resample=Image.Resampling.BICUBIC, expand=True)

    result = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    rw, rh = rot.size
    px = (CELL - rw) // 2 - 45
    py = CELL - rh - 25
    result.paste(rot, (px, py), rot)

    # Impact spark flash
    sparks = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    draw = ImageDraw.Draw(sparks)
    cx, cy = px + rw // 2 + 70, py + rh // 3
    for a in range(0, 360, 40):
        rad = math.radians(a)
        x1 = cx + 20 * math.cos(rad)
        y1 = cy + 20 * math.sin(rad)
        x2 = cx + 70 * math.cos(rad)
        y2 = cy + 70 * math.sin(rad)
        draw.line([x1, y1, x2, y2], fill=(255, 107, 53, 230), width=4)
        draw.line([x1, y1, x2, y2], fill=(255, 230, 100, 240), width=2)
    draw.ellipse([cx - 18, cy - 18, cx + 18, cy + 18], fill=(255, 255, 255, 245))

    result = Image.alpha_composite(result, sparks)
    return result

def make_special(light_img, heavy_img):
    """3-frame strip (3072x1024): Origami Paper Airplane Snipe Barrage!"""
    w, h = light_img.size
    cell = w // 3
    p0 = light_img.crop((0, 0, cell, h))
    p1 = light_img.crop((cell, 0, cell * 2, h))
    p2 = light_img.crop((cell * 2, 0, cell * 3, h))

    strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))

    # Panel 0: Windup with glowing orange aura around fingers
    f0 = p0.copy()
    ov0 = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    d0 = ImageDraw.Draw(ov0)
    d0.ellipse([540, 420, 660, 540], outline=(255, 107, 53, 220), fill=(255, 107, 53, 70), width=3)
    f0 = Image.alpha_composite(f0, ov0)
    strip.paste(f0, (0, 0), f0)

    # Panel 1: Multiple Origami Paper Airplanes Launching with Speedlines
    f1 = p1.copy()
    ov1 = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    d1 = ImageDraw.Draw(ov1)

    planes = [
        (580, 420, 12, 1.2),
        (660, 360, -8, 1.0),
        (710, 480, 24, 0.9),
        (790, 400, 5, 1.3),
        (860, 340, -14, 1.1),
    ]

    for px, py, ang, scale in planes:
        pw = int(90 * scale)
        ph = int(50 * scale)
        plane = Image.new('RGBA', (pw, ph), (0, 0, 0, 0))
        pd = ImageDraw.Draw(plane)
        # Triangular origami plane
        pts = [(pw - 4, ph // 2), (4, 4), (ph // 2, ph // 2), (4, ph - 4)]
        pd.polygon(pts, fill=(255, 255, 255, 245), outline=(255, 107, 53, 230))
        pd.line([(4, 4), (pw - 4, ph // 2)], fill=(255, 170, 50, 240), width=2)
        pd.line([(4, ph - 4), (pw - 4, ph // 2)], fill=(0, 212, 170, 240), width=2)

        rot_plane = plane.rotate(ang, resample=Image.Resampling.BICUBIC, expand=True)
        ov1.paste(rot_plane, (px, py), rot_plane)

        # Orange/cyan aerodynamic speed trails
        rad = math.radians(ang + 180)
        d1.line([px, py, px + 80 * math.cos(rad), py + 80 * math.sin(rad)], fill=(255, 107, 53, 160), width=3)
        d1.line([px + 5, py + 5, px + 5 + 60 * math.cos(rad), py + 5 + 60 * math.sin(rad)], fill=(0, 212, 170, 140), width=2)

    f1 = Image.alpha_composite(f1, ov1)
    strip.paste(f1, (CELL, 0), f1)

    # Panel 2: Recovery / Lingering Paper Flutter
    f2 = p2.copy()
    ov2 = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    d2 = ImageDraw.Draw(ov2)
    for i in range(14):
        fx = 560 + (i * 39) % 380
        fy = 320 + (i * 49) % 360
        d2.rectangle([fx, fy, fx + 10, fy + 10], fill=(255, 255, 255, 180), outline=(255, 107, 53, 220))
    f2 = Image.alpha_composite(f2, ov2)
    strip.paste(f2, (CELL * 2, 0), f2)

    return strip

def make_ultimate(heavy_img):
    """Ultimate: Last Bench Anarchy / Paper Storm (1024x1024)."""
    w, h = heavy_img.size
    cell = w // 3
    base = heavy_img.crop((cell, 0, cell * 2, h)).copy()

    overlay = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Massive swirling vortex of paper planes & spiral notes
    cx, cy = 600, 480
    for r in range(260, 40, -35):
        alpha = int(45 * (1 - r / 260))
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 107, 53, alpha))

    # Chaotic swirling paper sheets and chalk projectiles
    for a in range(0, 360, 24):
        rad = math.radians(a)
        dist = 80 + (a * 17) % 190
        sx = cx + int(dist * math.cos(rad))
        sy = cy + int(dist * math.sin(rad) * 0.7)

        # Swirling textbook page
        sheet = Image.new('RGBA', (60, 45), (0, 0, 0, 0))
        sd = ImageDraw.Draw(sheet)
        sd.rounded_rectangle([2, 2, 58, 43], radius=4, fill=(255, 255, 255, 230), outline=(255, 107, 53, 220), width=2)
        sd.line([8, 12, 52, 12], fill=(40, 40, 50, 180), width=2)
        sd.line([8, 22, 44, 22], fill=(40, 40, 50, 160), width=2)
        sd.line([8, 32, 50, 32], fill=(0, 212, 170, 200), width=2)

        rot_sheet = sheet.rotate(a * 2, resample=Image.Resampling.BICUBIC, expand=True)
        overlay.paste(rot_sheet, (sx, sy), rot_sheet)

    # Stylized neon graffiti watermark "LAST BENCH ANARCHY"
    draw.text((cx - 160, cy - 220), "⚡ LAST BENCH ANARCHY ⚡", fill=(255, 215, 0, 240))

    result = Image.alpha_composite(base, overlay)
    return result

def make_portrait_and_hud(idle_img):
    """Create high-res portrait (1024x1024) and square hud badge (1024x1024)."""
    bb = bbox(idle_img)
    if not bb:
        return idle_img, idle_img

    # Crop upper body (head, shoulders, chest with smirk and hoodie)
    head_h = int((bb[3] - bb[1]) * 0.52)
    crop_box = (bb[0], bb[1], bb[2], bb[1] + head_h)
    bust = idle_img.crop(crop_box)

    # Zoom in and center on 1024x1024 canvas
    scale = (CELL * 0.90) / bust.height
    bw = int(bust.width * scale)
    bh = int(bust.height * scale)
    bust_scaled = bust.resize((bw, bh), Image.Resampling.LANCZOS)

    portrait = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    px = (CELL - bw) // 2
    py = (CELL - bh) // 2
    portrait.paste(bust_scaled, (px, py), bust_scaled)

    # Add subtle neon orange & mint green rim aura for character card
    aura = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    ad = ImageDraw.Draw(aura)
    ad.ellipse([CELL//2 - 360, CELL//2 - 360, CELL//2 + 360, CELL//2 + 360],
               outline=(255, 107, 53, 120), width=6)
    ad.ellipse([CELL//2 - 380, CELL//2 - 380, CELL//2 + 380, CELL//2 + 380],
               outline=(0, 212, 170, 90), width=3)
    portrait_final = Image.alpha_composite(aura, portrait)

    # HUD is clean square headshot
    hud = portrait_final.copy()
    return portrait_final, hud

def main():
    raw_dir = Path('/Users/adityaswaroop/.gemini/antigravity/brain/4328f101-e735-4aa4-abe0-f144274b9a1f')
    out_dir = Path('assets/characters/backbencher')
    out_dir.mkdir(parents=True, exist_ok=True)

    print("=== Processing The Backbencher Base Poses ===")

    # 1. Idle
    raw_idle = Image.open(raw_dir / 'backbencher_idle_stance_1792921165824.jpg')
    keyed_idle = key_out(raw_idle, 'green')
    bb = bbox(keyed_idle)
    if not bb:
        print("ERROR: Idle pose bounding box empty!")
        return 1
    scale = (CELL * FILL) / (bb[3] - bb[1])
    print(f"Calculated master scale: {scale:.3f} (idle height {bb[3]-bb[1]}px)")

    idle = place(keyed_idle, scale)
    idle.save(out_dir / 'idle.png', 'PNG')
    print("✓ idle.png saved")

    # 2. Walk
    raw_walk = Image.open(raw_dir / 'backbencher_walk_stride_1792921273655.jpg')
    walk = place(key_out(raw_walk, 'green'), scale)
    walk.save(out_dir / 'walk.png', 'PNG')
    print("✓ walk.png saved")

    # 3. Run & Dash
    raw_run = Image.open(raw_dir / 'backbencher_sprint_pose_1792921268714.jpg')
    run = place(key_out(raw_run, 'green'), scale)
    run.save(out_dir / 'run.png', 'PNG')
    dash = run.copy()
    dash.save(out_dir / 'dash.png', 'PNG')
    print("✓ run.png & dash.png saved")

    # 4. Crouch
    raw_crouch = Image.open(raw_dir / 'backbencher_crouch_pose_v2_1792921299661.jpg')
    crouch = place(key_out(raw_crouch, 'green'), scale, y_pad=20)
    crouch.save(out_dir / 'crouch.png', 'PNG')
    print("✓ crouch.png saved")

    # 5. Jump & Air
    # Use dynamic athletic leap from run/jump pose elevated into the air
    jump = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    # Crop run pose and elevate 140px up with a slight 8-deg tilt
    run_bb = bbox(run)
    run_cropped = run.crop(run_bb)
    run_rot = run_cropped.rotate(8, resample=Image.Resampling.BICUBIC, expand=True)
    rw, rh = run_rot.size
    jump.paste(run_rot, ((CELL - rw) // 2 + 30, CELL - rh - 150), run_rot)
    jump.save(out_dir / 'jump.png', 'PNG')
    jump.save(out_dir / 'air.png', 'PNG')
    print("✓ jump.png & air.png saved")

    # 6. Light Attack (3-frame strip: 3072x1024)
    raw_light = Image.open(raw_dir / 'backbencher_light_attack_spritesheet_v2_1792921268154.jpg')
    lw, lh = raw_light.size
    pw = lw // 3
    light_strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))
    for i in range(3):
        panel = raw_light.crop((i * pw, 0, (i + 1) * pw, lh))
        k_panel = key_out(panel, 'green')
        placed_panel = place(k_panel, scale)
        light_strip.paste(placed_panel, (i * CELL, 0), placed_panel)
    light_strip.save(out_dir / 'light.png', 'PNG')
    print("✓ light.png (3-frame strip) saved")

    # 7. Heavy Attack (3-frame strip: 3072x1024)
    raw_heavy = Image.open(raw_dir / 'backbencher_heavy_attack_spritesheet_1792921248094.jpg')
    hw, hh = raw_heavy.size
    hpw = hw // 3
    heavy_strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))
    for i in range(3):
        panel = raw_heavy.crop((i * hpw, 0, (i + 1) * hpw, hh))
        k_panel = key_out(panel, 'green')
        placed_panel = place(k_panel, scale)
        heavy_strip.paste(placed_panel, (i * CELL, 0), placed_panel)
    heavy_strip.save(out_dir / 'heavy.png', 'PNG')
    print("✓ heavy.png (3-frame strip) saved")

    # 8. Block
    print("Generating genuine Backbencher block.png...")
    block = make_block(crouch, idle)
    block.save(out_dir / 'block.png', 'PNG')
    print("✓ block.png saved")

    # 9. Dodge
    print("Generating genuine Backbencher dodge.png...")
    dodge = make_dodge(dash)
    dodge.save(out_dir / 'dodge.png', 'PNG')
    print("✓ dodge.png saved")

    # 10. Hit
    print("Generating genuine Backbencher hit.png...")
    hit = make_hit(idle)
    hit.save(out_dir / 'hit.png', 'PNG')
    print("✓ hit.png saved")

    # 11. Special (3-frame strip)
    print("Generating genuine Backbencher special.png (Paper Airplane Snipe)...")
    special = make_special(light_strip, heavy_strip)
    special.save(out_dir / 'special.png', 'PNG')
    print("✓ special.png saved")

    # 12. Ultimate
    print("Generating genuine Backbencher ultimate.png (Last Bench Anarchy)...")
    ultimate = make_ultimate(heavy_strip)
    ultimate.save(out_dir / 'ultimate.png', 'PNG')
    print("✓ ultimate.png saved")

    # 13. Portrait & HUD
    print("Generating genuine Backbencher portrait.png and hud.png...")
    portrait, hud = make_portrait_and_hud(idle)
    portrait.save(out_dir / 'portrait.png', 'PNG')
    hud.save(out_dir / 'hud.png', 'PNG')
    print("✓ portrait.png & hud.png saved")

    # 14. Contact Sheet Preview (_preview.png)
    print("Generating 4x4 _preview.png...")
    preview = Image.new('RGBA', (CELL * 4, CELL * 4), (10, 15, 28, 255))
    sprites_to_preview = [
        idle, walk, run, jump,
        crouch, dash, block, dodge,
        hit, ultimate, portrait, hud
    ]
    for idx, sp in enumerate(sprites_to_preview):
        gx = (idx % 4) * CELL
        gy = (idx // 4) * CELL
        # Add a subtle grid border
        preview.paste(sp, (gx, gy), sp)
    preview.save(out_dir / '_preview.png', 'PNG')
    print("✓ _preview.png saved")

    print("\n✅ All Backbencher sprites compiled successfully into assets/characters/backbencher/!")
    return 0

if __name__ == '__main__':
    sys.exit(main())
