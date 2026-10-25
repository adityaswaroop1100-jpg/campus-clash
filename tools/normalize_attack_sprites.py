#!/usr/bin/env python3
"""
Normalize character attack sprites (light, heavy, special, ultimate) so their
visual pixel height and body proportion match their idle state exactly.
Prevents characters from shrinking when attacking.
"""

import os
import glob
import json
import numpy as np
from PIL import Image

CHARS_DIR = "assets/characters"
MANIFEST_PATH = os.path.join(CHARS_DIR, "manifest.json")

def normalize_character_sprites():
    manifest = {}
    if os.path.exists(MANIFEST_PATH):
        with open(MANIFEST_PATH, "r") as f:
            manifest = json.load(f)

    # Characters in roster
    char_dirs = sorted([d for d in os.listdir(CHARS_DIR) if os.path.isdir(os.path.join(CHARS_DIR, d)) and not d.startswith(".")])
    
    states_to_check = ["light", "heavy", "special", "ultimate"]

    total_scaled = 0

    for char_id in char_dirs:
        char_path = os.path.join(CHARS_DIR, char_id)
        idle_file = os.path.join(char_path, "idle.png")
        if not os.path.exists(idle_file):
            continue

        im_idle = Image.open(idle_file).convert("RGBA")
        arr_idle = np.array(im_idle)
        y_idle = np.where(arr_idle[:, :, 3] > 20)[0]
        if len(y_idle) == 0:
            continue

        target_h = int(np.max(y_idle)) - int(np.min(y_idle))
        target_bottom = int(np.max(y_idle))
        target_top = int(np.min(y_idle))

        print(f"\n[{char_id.upper()}] Baseline Idle: height={target_h}px, top={target_top}px, bottom={target_bottom}px")

        for state in states_to_check:
            state_file = os.path.join(char_path, f"{state}.png")
            if not os.path.exists(state_file):
                continue

            im = Image.open(state_file).convert("RGBA")
            mframes = manifest.get(char_id, {}).get(state, {}).get("frames", 1)
            fw = im.width // mframes
            fh = im.height

            arr = np.array(im)
            out_strip = Image.new("RGBA", im.size, (0, 0, 0, 0))
            modified_any = False

            for f in range(mframes):
                sub_img = im.crop((f * fw, 0, (f + 1) * fw, fh))
                sub_arr = np.array(sub_img)
                alpha = sub_arr[:, :, 3]

                y_idx = np.where(alpha > 20)[0]
                x_idx = np.where(alpha > 20)[1]

                if len(y_idx) == 0 or len(x_idx) == 0:
                    out_strip.paste(sub_img, (f * fw, 0))
                    continue

                ct = int(np.min(y_idx))
                cb = int(np.max(y_idx))
                cl = int(np.min(x_idx))
                cr = int(np.max(x_idx))

                ch = cb - ct
                cw = cr - cl

                # If character height in attack is significantly smaller than idle (> 6% smaller)
                if ch < target_h * 0.94:
                    scale = target_h / ch
                    # Ensure width doesn't clip outside frame boundaries
                    if (cw * scale) > (fw - 24):
                        scale = (fw - 24) / cw

                    new_w = max(1, int(round(cw * scale)))
                    new_h = max(1, int(round(ch * scale)))

                    cropped = sub_img.crop((cl, ct, cr + 1, cb + 1))
                    resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)

                    new_frame = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))

                    # Position feet at baseline target_bottom
                    paste_y = target_bottom - new_h
                    if paste_y < 0:
                        paste_y = max(0, fh - new_h)
                    if (paste_y + new_h) > fh:
                        paste_y = fh - new_h

                    # Center horizontally at the character's original center
                    orig_center_x = (cl + cr) / 2
                    paste_x = int(round(orig_center_x - new_w / 2))
                    if paste_x < 0:
                        paste_x = 0
                    if paste_x + new_w > fw:
                        paste_x = fw - new_w

                    new_frame.paste(resized, (paste_x, paste_y), resized)
                    out_strip.paste(new_frame, (f * fw, 0))
                    modified_any = True
                    total_scaled += 1
                    print(f"  -> {state:8s} frame {f}: scaled {ch}px -> {new_h}px (ratio={scale:.2f})")
                else:
                    out_strip.paste(sub_img, (f * fw, 0))

            if modified_any:
                out_strip.save(state_file, "PNG", optimize=True)
                print(f"  [SAVED] {state_file}")

    print(f"\n[DONE] Successfully normalized {total_scaled} attack frames to match idle character proportions!")

if __name__ == "__main__":
    normalize_character_sprites()
