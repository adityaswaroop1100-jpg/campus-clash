#!/usr/bin/env python3
"""
Generate high-fidelity, cinematic arena thumbnails for Campus Clash 2D battle venues.
Outputs 640x360 crisp 16:9 artwork saved to assets/stages/:
  - verticalsprawl.jpg
  - neonoctagon.jpg
  - servercore.jpg
  - modulararena.jpg
  - archivevault.jpg
"""

import os
import math
import random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 640, 360
os.makedirs("assets/stages", exist_ok=True)

def create_gradient(w, h, top_color, bottom_color):
    """Creates a vertical linear gradient Image."""
    base = Image.new("RGBA", (w, h))
    arr = np.zeros((h, w, 4), dtype=np.uint8)
    for y in range(h):
        ratio = y / (h - 1)
        r = int(top_color[0] + (bottom_color[0] - top_color[0]) * ratio)
        g = int(top_color[1] + (bottom_color[1] - top_color[1]) * ratio)
        b = int(top_color[2] + (bottom_color[2] - top_color[2]) * ratio)
        a = int(top_color[3] + (bottom_color[3] - top_color[3]) * ratio)
        arr[y, :] = [r, g, b, a]
    return Image.fromarray(arr, "RGBA")

def add_glow(base_img, draw_fn, blur_radius=12, intensity=1.5):
    """Draws onto a glow layer, blurs it, and composites it over base."""
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    draw_fn(d)
    blurred = glow.filter(ImageFilter.GaussianBlur(blur_radius))
    # Enhance glow brightness if needed
    base_img.alpha_composite(blurred)
    # Re-draw crisp core over glow
    crisp = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d_crisp = ImageDraw.Draw(crisp)
    draw_fn(d_crisp)
    base_img.alpha_composite(crisp)

# ==========================================
# 1. THE VERTICAL SPRAWL
# ==========================================
def render_vertical_sprawl():
    img = create_gradient(W, H, (4, 8, 20, 255), (14, 24, 48, 255))
    draw = ImageDraw.Draw(img)

    # Distant towering skyscrapers
    rng = random.Random(42)
    towers = [
        (20, 40, 70, 320, (8, 16, 32)),
        (100, 20, 90, 340, (12, 22, 42)),
        (200, 10, 120, 350, (10, 18, 36)),
        (330, 30, 80, 330, (14, 26, 50)),
        (420, 15, 110, 345, (8, 18, 38)),
        (540, 25, 80, 335, (12, 20, 40))
    ]
    for x, y, w, h, col in towers:
        draw.rectangle([x, y, x + w, H], fill=col)
        # Windows
        for wy in range(y + 20, H - 90, 14):
            for wx in range(x + 10, x + w - 10, 10):
                if rng.random() > 0.45:
                    win_col = (0, 229, 255, int(rng.uniform(60, 180))) if rng.random() > 0.3 else (255, 180, 50, int(rng.uniform(60, 160)))
                    draw.rectangle([wx, wy, wx + 4, wy + 6], fill=win_col)

    # Neon Billboards & Skybridges
    def draw_signs(d):
        # Sign 1: NEXUS
        d.rectangle([115, 60, 175, 120], outline=(255, 0, 127, 255), width=3)
        d.rectangle([120, 65, 170, 115], fill=(255, 0, 127, 70))
        # Sign 2: CYBER
        d.rectangle([345, 80, 400, 130], outline=(0, 229, 255, 255), width=3)
        d.rectangle([350, 85, 395, 125], fill=(0, 229, 255, 60))
        # Skybridges
        d.rectangle([0, 160, W, 172], fill=(20, 35, 60, 240), outline=(0, 229, 255, 200), width=2)
        d.rectangle([50, 220, 590, 230], fill=(16, 28, 50, 240), outline=(255, 0, 127, 180), width=2)
    add_glow(img, draw_signs, blur_radius=10)

    # Balcony Spectator Silhouettes & Flash Lights
    draw = ImageDraw.Draw(img)
    for bx in range(20, W, 22):
        if rng.random() > 0.3:
            # Person silhouette
            py = 158
            draw.ellipse([bx, py - 10, bx + 6, py - 4], fill=(4, 8, 16, 255))
            draw.rectangle([bx - 1, py - 4, bx + 7, py + 2], fill=(4, 8, 16, 255))
            # Camera phone light
            if rng.random() > 0.6:
                draw.ellipse([bx + 4, py - 8, bx + 8, py - 4], fill=(255, 255, 255, 255))

    # Wet Courtyard Ground with Reflections
    ground_y = 255
    floor_grad = create_gradient(W, H - ground_y, (16, 28, 52, 255), (6, 10, 20, 255))
    img.paste(floor_grad, (0, ground_y), floor_grad)

    # Glowing Neon Ground Boundary Line
    def draw_ground_rim(d):
        d.line([(0, ground_y), (W, ground_y)], fill=(0, 229, 255, 255), width=4)
        # Wet floor reflection pools
        d.ellipse([100, ground_y + 10, 220, ground_y + 45], fill=(255, 0, 127, 45))
        d.ellipse([320, ground_y + 15, 480, ground_y + 55], fill=(0, 229, 255, 55))
        # Ground Grid Perspective Lines
        for gx in range(0, W + 100, 60):
            d.line([(gx, ground_y), (int(gx * 1.4 - 120), H)], fill=(0, 229, 255, 70), width=2)
        for gy in range(ground_y + 18, H, 24):
            d.line([(0, gy), (W, gy)], fill=(0, 229, 255, 40), width=1)
    add_glow(img, draw_ground_rim, blur_radius=8)

    # Rain Streaks
    draw = ImageDraw.Draw(img)
    for _ in range(120):
        rx = rng.randint(0, W)
        ry = rng.randint(0, H - 40)
        rlen = rng.randint(12, 24)
        draw.line([(rx, ry), (rx - 4, ry + rlen)], fill=(180, 225, 255, rng.randint(40, 120)), width=1)

    # Vignette
    vignette = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d_vig = ImageDraw.Draw(vignette)
    d_vig.rectangle([0, 0, W, H], outline=(0, 0, 0, 200), width=15)
    vignette = vignette.filter(ImageFilter.GaussianBlur(14))
    img.alpha_composite(vignette)

    return img.convert("RGB")

# ==========================================
# 2. THE NEON OCTAGON
# ==========================================
def render_neon_octagon():
    img = create_gradient(W, H, (2, 6, 14, 255), (8, 16, 32, 255))
    draw = ImageDraw.Draw(img)

    # Volumetric Overhead Spotlights
    rng = random.Random(101)
    spot_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d_spot = ImageDraw.Draw(spot_layer)
    # Left spotlight cone
    d_spot.polygon([(160, 0), (60, 310), (320, 310)], fill=(0, 229, 255, 38))
    # Right spotlight cone
    d_spot.polygon([(480, 0), (320, 310), (580, 310)], fill=(0, 140, 255, 42))
    # Center dramatic highlight
    d_spot.polygon([(320, 0), (220, 280), (420, 280)], fill=(255, 255, 255, 28))
    spot_layer = spot_layer.filter(ImageFilter.GaussianBlur(16))
    img.alpha_composite(spot_layer)

    # Industrial Stadium Roof Trusses & Rafters
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, W, 22], fill=(12, 18, 28, 255))
    for rx in range(0, W, 50):
        draw.line([(rx, 0), (rx + 25, 22)], fill=(28, 42, 64, 255), width=2)
        draw.line([(rx + 25, 22), (rx + 50, 0)], fill=(28, 42, 64, 255), width=2)
    # Overhead floodlight fixtures
    for fx in [160, 320, 480]:
        draw.rectangle([fx - 18, 18, fx + 18, 30], fill=(240, 250, 255, 255))

    # Dark Arena Perimeter Crowd Silhouette
    crowd_y = 215
    for cx in range(0, W, 10):
        ch = rng.randint(18, 34)
        cw = rng.randint(7, 12)
        draw.ellipse([cx, crowd_y - ch, cx + cw, crowd_y - ch + 8], fill=(5, 10, 18, 255))
        draw.rectangle([cx - 1, crowd_y - ch + 6, cx + cw + 1, crowd_y + 10], fill=(5, 10, 18, 255))

    # Center Hero: Raised Octagonal Dais & Cage Arena
    oct_center_x, oct_center_y = 320, 280
    rx_outer, ry_outer = 250, 75
    rx_inner, ry_inner = 190, 56

    def get_oct_points(cx, cy, rx, ry):
        pts = []
        for i in range(8):
            angle = (i * 45 + 22.5) * math.pi / 180
            px = cx + rx * math.cos(angle)
            py = cy + ry * math.sin(angle)
            pts.append((px, py))
        return pts

    outer_oct = get_oct_points(oct_center_x, oct_center_y, rx_outer, ry_outer)
    inner_oct = get_oct_points(oct_center_x, oct_center_y, rx_inner, ry_inner)

    # Dais platform riser
    draw.polygon(outer_oct, fill=(10, 20, 36, 255))
    # Drop side of the platform
    riser_pts = [outer_oct[3], outer_oct[4], (outer_oct[4][0], outer_oct[4][1] + 35),
                 (outer_oct[3][0], outer_oct[3][1] + 35)]
    draw.polygon(riser_pts, fill=(6, 12, 22, 255))
    riser_pts2 = [outer_oct[4], outer_oct[5], (outer_oct[5][0], outer_oct[5][1] + 35),
                  (outer_oct[4][0], outer_oct[4][1] + 35)]
    draw.polygon(riser_pts2, fill=(8, 14, 26, 255))

    # Inner fighting floor
    draw.polygon(inner_oct, fill=(14, 28, 50, 255))

    # Glowing Neon Ring Beams & Octagon Seams
    def draw_octagon_glow(d):
        d.polygon(outer_oct, outline=(0, 229, 255, 255), width=4)
        d.polygon(inner_oct, outline=(0, 140, 255, 255), width=3)
        # Center logo ring
        d.ellipse([oct_center_x - 45, oct_center_y - 14, oct_center_x + 45, oct_center_y + 14],
                  outline=(255, 215, 0, 255), width=2)
        d.line([(oct_center_x - 35, oct_center_y), (oct_center_x + 35, oct_center_y)],
               fill=(255, 215, 0, 255), width=2)
        # Wire cage posts & vertical laser pillars
        for pt in outer_oct:
            d.line([pt, (pt[0], pt[1] - 85)], fill=(0, 229, 255, 200), width=2)
            d.ellipse([pt[0] - 3, pt[1] - 88, pt[0] + 3, pt[1] - 82], fill=(0, 255, 255, 255))
        # Cage crossbeams
        for i in range(len(outer_oct)):
            p1 = outer_oct[i]
            p2 = outer_oct[(i + 1) % len(outer_oct)]
            d.line([(p1[0], p1[1] - 40), (p2[0], p2[1] - 40)], fill=(0, 229, 255, 90), width=1)
            d.line([(p1[0], p1[1] - 80), (p2[0], p2[1] - 80)], fill=(0, 229, 255, 120), width=2)
    add_glow(img, draw_octagon_glow, blur_radius=8)

    return img.convert("RGB")

# ==========================================
# 3. THE SERVER CORE
# ==========================================
def render_server_core():
    img = create_gradient(W, H, (1, 5, 10, 255), (3, 14, 22, 255))
    draw = ImageDraw.Draw(img)

    rng = random.Random(77)
    # Background Matrix Digital Rain / Data streams
    data_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d_data = ImageDraw.Draw(data_layer)
    for col in range(20, W, 18):
        stream_len = rng.randint(4, 12)
        start_y = rng.randint(0, 200)
        for step in range(stream_len):
            alpha = int(255 * (step + 1) / stream_len)
            d_data.rectangle([col, start_y + step * 10, col + 3, start_y + step * 10 + 6],
                             fill=(0, 255, 170, alpha))
    img.alpha_composite(data_layer)

    # Towering Quantum Server Monoliths
    servers = [
        (40, 20, 80, 280),
        (130, 40, 60, 250),
        (450, 35, 70, 260),
        (530, 15, 80, 290)
    ]
    for sx, sy, sw, sh in servers:
        draw.rectangle([sx, sy, sx + sw, sy + sh], fill=(6, 15, 24, 255), outline=(0, 255, 170, 80), width=1)
        # Blade rack lines and status blinking LEDs
        for by in range(sy + 12, sy + sh - 10, 10):
            draw.line([(sx + 5, by), (sx + sw - 5, by)], fill=(12, 28, 40, 255), width=1)
            led_col = (0, 255, 170, 255) if rng.random() > 0.3 else (0, 229, 255, 255)
            draw.ellipse([sx + 8, by - 3, sx + 12, by + 1], fill=led_col)
            draw.ellipse([sx + sw - 14, by - 3, sx + sw - 10, by + 1], fill=led_col)

    # Center Hero: Quantum Pulsing Core Sphere & Reactor Rings
    core_cx, core_cy = 320, 155
    core_radius = 52

    def draw_reactor(d):
        # Outer containment ring
        d.ellipse([core_cx - 110, core_cy - 110, core_cx + 110, core_cy + 110],
                  outline=(0, 255, 170, 140), width=3)
        # Rotated energy rings
        d.ellipse([core_cx - 95, core_cy - 35, core_cx + 95, core_cy + 35],
                  outline=(0, 229, 255, 220), width=3)
        d.ellipse([core_cx - 40, core_cy - 95, core_cx + 40, core_cy + 95],
                  outline=(0, 255, 170, 200), width=3)
        # Inner plasma sphere
        d.ellipse([core_cx - core_radius, core_cy - core_radius, core_cx + core_radius, core_cy + core_radius],
                  fill=(0, 255, 180, 220), outline=(255, 255, 255, 255), width=3)
        # Pure white nuclear focal core
        d.ellipse([core_cx - 24, core_cy - 24, core_cx + 24, core_cy + 24], fill=(255, 255, 255, 255))
        # Energy lightning bolts to servers
        d.line([(core_cx - 80, core_cy), (190, 120)], fill=(0, 255, 220, 200), width=2)
        d.line([(core_cx + 80, core_cy), (450, 110)], fill=(0, 255, 220, 200), width=2)
    add_glow(img, draw_reactor, blur_radius=14)

    # Suspended Floating Glass Gangway / Combat Runway
    draw = ImageDraw.Draw(img)
    runway_y = 270
    runway_poly = [(120, runway_y + 10), (520, runway_y + 10), (590, H), (50, H)]
    draw.polygon(runway_poly, fill=(8, 20, 32, 250))

    def draw_runway_grid(d):
        d.polygon(runway_poly, outline=(0, 255, 170, 255), width=3)
        # Central circuit spine
        d.line([(320, runway_y + 10), (320, H)], fill=(0, 255, 200, 255), width=4)
        for gx in range(160, 500, 45):
            d.line([(gx, runway_y + 10), (int(320 + (gx - 320) * 1.4), H)],
                   fill=(0, 229, 255, 110), width=2)
        for gy in range(runway_y + 20, H, 20):
            d.line([(int(320 - (320 - 120) * (gy - runway_y + 40) / 100), gy),
                    (int(320 + (520 - 320) * (gy - runway_y + 40) / 100), gy)],
                   fill=(0, 255, 170, 80), width=1)
    add_glow(img, draw_runway_grid, blur_radius=7)

    return img.convert("RGB")

# ==========================================
# 4. THE MODULAR ARENA
# ==========================================
def render_modular_arena():
    img = create_gradient(W, H, (14, 8, 2, 255), (32, 16, 4, 255))
    draw = ImageDraw.Draw(img)

    rng = random.Random(88)

    # Background Stadium Floodlights & Industrial Trusses
    def draw_stadium_lights(d):
        d.rectangle([60, 20, 150, 50], fill=(255, 180, 0, 120), outline=(255, 215, 0, 255), width=2)
        d.rectangle([490, 20, 580, 50], fill=(255, 180, 0, 120), outline=(255, 215, 0, 255), width=2)
        # Cones
        d.polygon([(105, 50), (20, 280), (300, 280)], fill=(255, 160, 0, 25))
        d.polygon([(535, 50), (340, 280), (620, 280)], fill=(255, 160, 0, 25))
    add_glow(img, draw_stadium_lights, blur_radius=15)

    draw = ImageDraw.Draw(img)
    # Giant Background Hydraulic Hex Pillars at different elevated heights
    def draw_hex(d, cx, cy, rad, fill, outline, width=2):
        pts = []
        for i in range(6):
            ang = (i * 60 + 30) * math.pi / 180
            pts.append((cx + rad * math.cos(ang), cy + rad * 0.55 * math.sin(ang)))
        d.polygon(pts, fill=fill, outline=outline, width=width)
        return pts

    # Elevated background hex platforms
    bg_hexes = [
        (130, 150, 55, 45),
        (220, 120, 60, 75),
        (320, 100, 65, 90),
        (420, 120, 60, 75),
        (510, 150, 55, 45)
    ]
    for hx, hy, hrad, hlift in bg_hexes:
        # Piston shaft underneath
        draw.rectangle([hx - 14, hy + 20, hx + 14, hy + 20 + hlift], fill=(30, 22, 16, 255),
                       outline=(60, 45, 30, 255), width=2)
        # Warning caution stripes on riser
        for sy in range(hy + 25, hy + 20 + hlift - 5, 8):
            draw.line([(hx - 12, sy), (hx + 12, sy + 4)], fill=(255, 180, 0, 180), width=2)
        # Hex top
        draw_hex(draw, hx, hy, hrad, (40, 28, 16, 255), (120, 80, 30, 255))

    # Foreground Combat Hex Grid Dais
    center_x, center_y = 320, 275
    fg_hex_layout = [
        (320, 275, 75),   # Center
        (210, 255, 65),   # Left mid
        (430, 255, 65),   # Right mid
        (130, 285, 60),   # Far left
        (510, 285, 60),   # Far right
        (260, 315, 70),   # Bottom left
        (380, 315, 70)    # Bottom right
    ]

    for fx, fy, frad in fg_hex_layout:
        draw_hex(draw, fx, fy, frad, (26, 18, 10, 255), (55, 38, 20, 255), width=2)

    def draw_amber_seams(d):
        for fx, fy, frad in fg_hex_layout:
            draw_hex(d, fx, fy, frad, (0, 0, 0, 0), (255, 145, 0, 255), width=3)
            # Center caution marking inside hex
            d.ellipse([fx - 14, fy - 6, fx + 14, fy + 6], outline=(255, 215, 0, 255), width=2)
            d.line([(fx - 8, fy), (fx + 8, fy)], fill=(255, 215, 0, 255), width=2)
        # Perimeter warning laser fence
        d.line([(40, 290), (600, 290)], fill=(255, 145, 0, 220), width=3)
    add_glow(img, draw_amber_seams, blur_radius=8)

    return img.convert("RGB")

# ==========================================
# 5. THE ARCHIVE VAULT
# ==========================================
def render_archive_vault():
    img = create_gradient(W, H, (10, 2, 18, 255), (28, 8, 42, 255))
    draw = ImageDraw.Draw(img)

    rng = random.Random(99)

    # Ancient Stone Columns fused with Neon Databanks
    col_x_list = [50, 160, 480, 590]
    for cx in col_x_list:
        # Stone pillar body
        draw.rectangle([cx - 28, 20, cx + 28, 300], fill=(22, 14, 34, 255),
                       outline=(65, 35, 90, 255), width=2)
        # Capital & Base
        draw.rectangle([cx - 36, 12, cx + 36, 26], fill=(35, 20, 52, 255))
        draw.rectangle([cx - 36, 288, cx + 36, 305], fill=(35, 20, 52, 255))
        # Holographic Codex Slots glowing inside pillar
        for slot_y in range(40, 270, 18):
            draw.rectangle([cx - 18, slot_y, cx + 18, slot_y + 10],
                           fill=(224, 64, 251, 140), outline=(255, 180, 255, 220), width=1)

    # Cascading Knowledge Waterfalls (Digital runic streams)
    data_stream_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d_stream = ImageDraw.Draw(data_stream_layer)
    for sx in [110, 220, 420, 530]:
        for step in range(25):
            sy = rng.randint(40, 280)
            d_stream.rectangle([sx, sy, sx + 4, sy + rng.randint(6, 18)],
                               fill=(224, 64, 251, rng.randint(80, 220)))
    img.alpha_composite(data_stream_layer)

    # Center Hero: Celestial Temporal Rings & Holographic Armillary Sphere
    arm_cx, arm_cy = 320, 145
    def draw_temporal_sphere(d):
        # Outer great runic circle
        d.ellipse([arm_cx - 105, arm_cy - 105, arm_cx + 105, arm_cy + 105],
                  outline=(224, 64, 251, 240), width=3)
        # Angled orbital rings
        d.ellipse([arm_cx - 95, arm_cy - 38, arm_cx + 95, arm_cy + 38],
                  outline=(255, 215, 0, 240), width=2)
        d.ellipse([arm_cx - 45, arm_cy - 95, arm_cx + 45, arm_cy + 95],
                  outline=(186, 104, 200, 220), width=2)
        # Central glowing golden chronometer core
        d.ellipse([arm_cx - 28, arm_cy - 28, arm_cx + 28, arm_cy + 28],
                  fill=(255, 215, 0, 220), outline=(255, 255, 255, 255), width=2)
        # Radiating glyph rays
        for ang_deg in range(0, 360, 45):
            rad = ang_deg * math.pi / 180
            d.line([(arm_cx + 35 * math.cos(rad), arm_cy + 35 * math.sin(rad)),
                    (arm_cx + 80 * math.cos(rad), arm_cy + 80 * math.sin(rad))],
                   fill=(224, 64, 251, 180), width=2)
    add_glow(img, draw_temporal_sphere, blur_radius=12)

    # Marble & Obsidian Floor with Constellation Inlays
    draw = ImageDraw.Draw(img)
    floor_poly = [(60, 275), (580, 275), (630, H), (10, H)]
    draw.polygon(floor_poly, fill=(18, 10, 28, 255), outline=(90, 45, 120, 255), width=2)

    def draw_floor_constellation(d):
        # Floor center dais
        d.ellipse([320 - 150, 305 - 28, 320 + 150, 305 + 28],
                  outline=(224, 64, 251, 255), width=3)
        d.ellipse([320 - 90, 305 - 16, 320 + 90, 305 + 16],
                  outline=(255, 215, 0, 240), width=2)
        # Constellation connection lines
        stars = [(240, 300), (280, 315), (320, 295), (360, 315), (400, 300)]
        for i in range(len(stars) - 1):
            d.line([stars[i], stars[i+1]], fill=(255, 215, 0, 200), width=2)
        for sx, sy in stars:
            d.ellipse([sx - 3, sy - 3, sx + 3, sy + 3], fill=(255, 255, 255, 255))
    add_glow(img, draw_floor_constellation, blur_radius=8)

    return img.convert("RGB")


def main():
    print("Generating arena artwork for all 5 battle venues...")
    
    stages = [
        ("verticalsprawl.jpg", render_vertical_sprawl),
        ("neonoctagon.jpg", render_neon_octagon),
        ("servercore.jpg", render_server_core),
        ("modulararena.jpg", render_modular_arena),
        ("archivevault.jpg", render_archive_vault),
    ]

    for filename, render_fn in stages:
        dest_path = os.path.join("assets/stages", filename)
        img = render_fn()
        img.save(dest_path, "JPEG", quality=95, optimize=True)
        print(f"  -> Generated {dest_path} ({W}x{H})")

    print("All stage artwork generated successfully!")

if __name__ == "__main__":
    main()
