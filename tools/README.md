# Campus Clash 2D — Asset Pipeline & Chroma-Key Spec

## Directory Structure
```
assets/characters/
  manifest.json (optional, for multi-frame strips)
  topper/
    idle.png
    walk.png
    run.png
    jump.png
    crouch.png
    light.png
    heavy.png
    block.png
    dodge.png
    hit.png
    special.png
    ultimate.png
    portrait.png (3:4 aspect ratio, bust)
    hud.png (square crop, head & shoulders)
  backbencher/ ... (same 14 files)
  hosteler/ ...
  senior/ ...
  placement/ ...
  sports/ ...
  cypher/ ...
  gavel/ ...
  bolt/ ...
  palette/ ...
```

## Image Specifications
- **Format**: Transparent PNG (`RGBA`).
- **Canvas Dimensions**: `1024 × 1024 px` (square, consistent baseline).
- **Framing**: Full body visible, head-to-toe with feet positioned near the bottom edge (~40px margin).
- **Facing**: Facing **RIGHT** (the in-game engine mirrors automatically for left-facing fighters).
- **Style**: Anime cel-shaded illustration, bold dark vector contours, vibrant saturated palette, glowing neon rim light.

## Background Removal Tool (`tools/chroma_key.py`)
If generating on solid pure green `#00FF00` (or magenta `#FF00FF` for The Senior), you can process them with:

```bash
# Process a single green-screen image:
python3 tools/chroma_key.py input.png output.png --key green

# Process all images in a directory:
python3 tools/chroma_key.py ./raw_topper/ ./assets/characters/topper/ --key green
```
