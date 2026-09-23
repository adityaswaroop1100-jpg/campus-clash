#!/usr/bin/env python3
"""
Campus Clash 2D — Chroma-Key Background Removal Tool
Removes solid green (#00FF00) or magenta (#FF00FF) backgrounds and preserves semi-transparent anti-aliased edges.
"""

import sys
import os
import argparse
try:
    from PIL import Image
except ImportError:
    print("Pillow is required: pip install pillow")
    sys.exit(1)

def chroma_key_image(img: Image.Image, key_color='green', tolerance=65, smoothness=25) -> Image.Image:
    img = img.convert('RGBA')
    datas = img.getdata()
    new_data = []

    if key_color == 'green':
        target_r, target_g, target_b = (0, 255, 0)
    elif key_color == 'magenta':
        target_r, target_g, target_b = (255, 0, 255)
    else:
        target_r, target_g, target_b = (0, 255, 0)

    for item in datas:
        r, g, b, a = item
        # Euclidean distance in RGB
        dist = ((r - target_r) ** 2 + (g - target_g) ** 2 + (b - target_b) ** 2) ** 0.5
        if dist < tolerance:
            new_data.append((r, g, b, 0))
        elif dist < tolerance + smoothness:
            alpha = int(255 * ((dist - tolerance) / smoothness))
            new_data.append((r, g, b, min(a, alpha)))
        else:
            new_data.append(item)

    img.putdata(new_data)
    return img

def main():
    parser = argparse.ArgumentParser(description="Chroma-Key Background Remover for Campus Clash")
    parser.add_argument("input", help="Input image file or directory")
    parser.add_argument("output", help="Output PNG file or directory")
    parser.add_argument("--key", choices=['green', 'magenta'], default='green', help="Chroma color to remove")
    parser.add_argument("--tolerance", type=float, default=65, help="Color distance threshold")
    parser.add_argument("--smoothness", type=float, default=25, help="Edge smoothing feather")

    args = parser.parse_args()

    if os.path.isfile(args.input):
        img = Image.open(args.input)
        out = chroma_key_image(img, args.key, args.tolerance, args.smoothness)
        os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
        out.save(args.output, "PNG")
        print(f"Processed: {args.input} -> {args.output}")
    elif os.path.isdir(args.input):
        os.makedirs(args.output, exist_ok=True)
        for fname in os.listdir(args.input):
            if fname.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                inp_p = os.path.join(args.input, fname)
                out_name = os.path.splitext(fname)[0] + '.png'
                out_p = os.path.join(args.output, out_name)
                img = Image.open(inp_p)
                out = chroma_key_image(img, args.key, args.tolerance, args.smoothness)
                out.save(out_p, "PNG")
                print(f"Processed: {inp_p} -> {out_p}")

if __name__ == "__main__":
    main()
