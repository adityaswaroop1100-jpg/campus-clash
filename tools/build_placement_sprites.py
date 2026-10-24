#!/usr/bin/env python3
"""
Campus Clash — Build missing Placement Warrior sprites
Replaces placeholder Senior sprites with genuine Placement Warrior RGBA sprites.
Generates: block, dodge, hit, special (3-frame strip), ultimate, portrait, hud.
"""

import os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from prepare_sprites import key_out

CELL = 1024

def make_block(crouch_img, idle_img):
    # Base is crouch
    base = crouch_img.copy()
    # Add cyan hex defense barrier & portfolio guard glow
    overlay = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Cyan energy shield in front of Placement Warrior
    shield_cx, shield_cy = 680, 620
    for r in range(160, 40, -25):
        alpha = int(45 * (1 - r / 160))
        # Draw hex polygon
        pts = []
        for i in range(6):
            ang = math.radians(60 * i)
            pts.append((shield_cx + r * math.cos(ang), shield_cy + r * math.sin(ang)))
        draw.polygon(pts, outline=(0, 229, 255, 180), fill=(0, 200, 83, alpha))

    # Inner hex rim
    pts = []
    for i in range(6):
        ang = math.radians(60 * i)
        pts.append((shield_cx + 120 * math.cos(ang), shield_cy + 120 * math.sin(ang)))
    draw.polygon(pts, outline=(0, 229, 255, 240), width=4)

    # Leather portfolio shield highlights
    draw.rounded_rectangle([shield_cx - 60, shield_cy - 90, shield_cx + 20, shield_cy + 90], radius=8, fill=(20, 20, 25, 230), outline=(255, 215, 0, 220), width=3)
    draw.line([shield_cx - 50, shield_cy, shield_cx + 10, shield_cy], fill=(255, 215, 0, 180), width=2)

    result = Image.alpha_composite(base, overlay)
    return result

def make_dodge(dash_img):
    # Dash with 2 motion ghosts behind him
    result = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))

    # Ghost 1 (farthest behind, tinted cyan)
    g1 = dash_img.copy()
    g1_data = np.asarray(g1).astype(np.float32)
    g1_data[..., 3] *= 0.25
    g1_data[..., 0] = g1_data[..., 0] * 0.3
    g1_data[..., 1] = g1_data[..., 1] * 0.7 + 100 * 0.3
    g1_data[..., 2] = 240
    g1_img = Image.fromarray(np.clip(g1_data, 0, 255).astype(np.uint8), 'RGBA')
    result.paste(g1_img, (-90, 0), g1_img)

    # Ghost 2 (closer behind)
    g2 = dash_img.copy()
    g2_data = np.asarray(g2).astype(np.float32)
    g2_data[..., 3] *= 0.50
    g2_data[..., 0] = g2_data[..., 0] * 0.5
    g2_data[..., 2] = 220
    g2_img = Image.fromarray(np.clip(g2_data, 0, 255).astype(np.uint8), 'RGBA')
    result.paste(g2_img, (-45, 0), g2_img)

    # Main fighter
    result.paste(dash_img, (0, 0), dash_img)
    return result

def make_hit(idle_img):
    # Fighter recoiling in stun: tilt back by -12 degrees, slight red flash
    bbox = idle_img.getbbox()
    if not bbox:
        return idle_img

    # Crop, rotate around bottom centre, paste back
    cropped = idle_img.crop(bbox)
    rot = cropped.rotate(-12, resample=Image.BICUBIC, expand=True)

    result = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    # Place with feet near bottom
    rw, rh = rot.size
    px = (CELL - rw) // 2 - 40
    py = CELL - rh
    result.paste(rot, (px, py), rot)

    # Stun flash overlay (yellow/white impact sparks)
    sparks = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    draw = ImageDraw.Draw(sparks)
    cx, cy = px + rw // 2 + 60, py + rh // 3
    for a in range(0, 360, 45):
        rad = math.radians(a)
        x1 = cx + 25 * math.cos(rad)
        y1 = cy + 25 * math.sin(rad)
        x2 = cx + 65 * math.cos(rad)
        y2 = cy + 65 * math.sin(rad)
        draw.line([x1, y1, x2, y2], fill=(255, 230, 100, 220), width=3)
    draw.ellipse([cx - 15, cy - 15, cx + 15, cy + 15], fill=(255, 255, 255, 240))

    result = Image.alpha_composite(result, sparks)
    return result

def make_special(light_img, heavy_img):
    # 3-frame 3072x1024 strip: Offer Letter / Resume Barrage!
    # Frame 0: Panel 0 of light (windup) + offer letters preparing
    # Frame 1: Panel 1 of light (forward swipe) + storm of offer letters flying
    # Frame 2: Panel 2 of light (follow-through) + letters floating
    w, h = light_img.size
    cell = w // 3
    p0 = light_img.crop((0, 0, cell, h))
    p1 = light_img.crop((cell, 0, cell * 2, h))
    p2 = light_img.crop((cell * 2, 0, cell * 3, h))

    strip = Image.new('RGBA', (CELL * 3, CELL), (0, 0, 0, 0))

    # Panel 0: Windup with glowing resume
    f0 = p0.copy()
    ov0 = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    d0 = ImageDraw.Draw(ov0)
    # Glowing aura around hand
    d0.ellipse([540, 440, 640, 540], outline=(0, 229, 255, 200), fill=(0, 229, 255, 60), width=3)
    f0 = Image.alpha_composite(f0, ov0)
    strip.paste(f0, (0, 0), f0)

    # Panel 1: Full Offer Letter Volley!
    f1 = p1.copy()
    ov1 = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    d1 = ImageDraw.Draw(ov1)

    # Flying Offer Letters (white cards with blue/gold headers)
    letters = [
        (580, 380, 22, 'DAY 1 OFFER'),
        (680, 440, -15, 'MARQUEE 42 LPA'),
        (620, 520, 35, 'SELECTED'),
        (760, 360, 10, 'CTC: HIGH'),
        (720, 580, -28, 'INTERNSHIP+FTE'),
        (840, 460, 18, 'LEETCODE 500+'),
    ]
    for lx, ly, ang, label in letters:
        card = Image.new('RGBA', (130, 80), (0, 0, 0, 0))
        cd = ImageDraw.Draw(card)
        cd.rounded_rectangle([4, 4, 126, 76], radius=6, fill=(250, 252, 255, 245), outline=(0, 200, 83, 230), width=3)
        # Blue banner
        cd.rounded_rectangle([4, 4, 126, 26], radius=4, fill=(30, 60, 180, 240))
        # Text placeholder lines
        cd.line([15, 42, 115, 42], fill=(80, 80, 90, 200), width=3)
        cd.line([15, 54, 95, 54], fill=(80, 80, 90, 180), width=2)
        cd.line([15, 64, 105, 64], fill=(0, 200, 83, 220), width=2)

        rot_card = card.rotate(ang, resample=Image.BICUBIC, expand=True)
        ov1.paste(rot_card, (lx, ly), rot_card)

        # Cyan trail behind each letter
        rad = math.radians(ang + 180)
        d1.line([lx, ly, lx + 70 * math.cos(rad), ly + 70 * math.sin(rad)], fill=(0, 229, 255, 140), width=3)

    f1 = Image.alpha_composite(f1, ov1)
    strip.paste(f1, (CELL, 0), f1)

    # Panel 2: Recovery / Follow-through
    f2 = p2.copy()
    ov2 = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    d2 = ImageDraw.Draw(ov2)
    # Lingering green data particles
    for i in range(12):
        sx = 580 + (i * 37) % 360
        sy = 360 + (i * 47) % 320
        d2.rectangle([sx, sy, sx + 8, sy + 8], fill=(0, 200, 83, 190), outline=(0, 229, 255, 230))
    f2 = Image.alpha_composite(f2, ov2)
    strip.paste(f2, (CELL * 2, 0), f2)

    return strip

def make_ultimate(heavy_img):
    # Ultimate: Day 1 Marquee Offer Slam (1024x1024)
    # Using Panel 1 of heavy attack (active whip/slam)
    w, h = heavy_img.size
    cell = w // 3
    base = heavy_img.crop((cell, 0, cell * 2, h)).copy()

    overlay = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Giant glowing golden/cyan Marquee Offer Document
    doc_x, doc_y = 620, 380
    # Gold radiant glow
    for r in range(180, 40, -30):
        alpha = int(40 * (1 - r / 180))
        draw.ellipse([doc_x - r, doc_y - r, doc_x + r, doc_y + r], fill=(255, 215, 0, alpha))

    # Giant Marquee Offer Letter Card
    card = Image.new('RGBA', (260, 340), (0, 0, 0, 0))
    cd = ImageDraw.Draw(card)
    cd.rounded_rectangle([6, 6, 254, 334], radius=12, fill=(255, 255, 255, 250), outline=(255, 215, 0, 255), width=5)
    # Royal Navy header
    cd.rounded_rectangle([6, 6, 254, 75], radius=8, fill=(27, 42, 74, 255))
    # Stamp / Seal
    cd.ellipse([160, 210, 240, 290], outline=(198, 40, 40, 230), fill=(198, 40, 40, 50), width=4)
    cd.text((180, 242), "VERIFIED", fill=(198, 40, 40, 240))
    # Offer lines
    for ly in range(95, 210, 18):
        cd.line([25, ly, 235, ly], fill=(50, 60, 80, 200), width=4)
    cd.line([25, 235, 145, 235], fill=(0, 200, 83, 240), width=5)
    cd.line([25, 260, 135, 260], fill=(0, 229, 255, 240), width=5)

    rot_doc = card.rotate(-15, resample=Image.BICUBIC, expand=True)
    overlay.paste(rot_doc, (doc_x - 120, doc_y - 150), rot_doc)

    # Cyan laser grid burst across canvas
    for i in range(-3, 4):
        gx = doc_x + i * 45
        draw.line([gx, doc_y - 200, gx, doc_y + 200], fill=(0, 229, 255, 75), width=2)
        gy = doc_y + i * 45
        draw.line([doc_x - 200, gy, doc_x + 200, gy], fill=(0, 200, 83, 75), width=2)

    result = Image.alpha_composite(base, overlay)
    return result

def main():
    placement_dir = 'assets/characters/placement'
    raw_dir = 'raw/placement'

    crouch_img = Image.open(f'{placement_dir}/crouch.png').convert('RGBA')
    idle_img = Image.open(f'{placement_dir}/idle.png').convert('RGBA')
    dash_img = Image.open(f'{placement_dir}/dash.png').convert('RGBA')
    light_img = Image.open(f'{placement_dir}/light.png').convert('RGBA')
    heavy_img = Image.open(f'{placement_dir}/heavy.png').convert('RGBA')

    print("Generating genuine Placement Warrior block.png...")
    block = make_block(crouch_img, idle_img)
    block.save(f'{placement_dir}/block.png', 'PNG')

    print("Generating genuine Placement Warrior dodge.png...")
    dodge = make_dodge(dash_img)
    dodge.save(f'{placement_dir}/dodge.png', 'PNG')

    print("Generating genuine Placement Warrior hit.png...")
    hit = make_hit(idle_img)
    hit.save(f'{placement_dir}/hit.png', 'PNG')

    print("Generating genuine Placement Warrior special.png (3-frame strip)...")
    special = make_special(light_img, heavy_img)
    special.save(f'{placement_dir}/special.png', 'PNG')

    print("Generating genuine Placement Warrior ultimate.png...")
    ultimate = make_ultimate(heavy_img)
    ultimate.save(f'{placement_dir}/ultimate.png', 'PNG')

    print("Keying portrait.png and hud.png...")
    raw_portrait = Image.open(f'{raw_dir}/portrait.png')
    keyed_portrait = key_out(raw_portrait, 'green')
    keyed_portrait.save(f'{placement_dir}/portrait.png', 'PNG')
    keyed_portrait.save(f'{placement_dir}/hud.png', 'PNG')

    print("Also keying bolt portrait.png and hud.png...")
    if os.path.exists('raw/bolt/portrait.png'):
        bolt_port = key_out(Image.open('raw/bolt/portrait.png'), 'green')
    else:
        bolt_port = key_out(Image.open('assets/characters/bolt/portrait.png'), 'green')
    bolt_port.save('assets/characters/bolt/portrait.png', 'PNG')
    bolt_port.save('assets/characters/bolt/hud.png', 'PNG')

    print("All Placement Warrior sprites built successfully!")

if __name__ == '__main__':
    main()
