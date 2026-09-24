"""
import argparse, json, shutil, sys
from pathlib import Path

import numpy as np
from PIL import Image

CELL = 1024
IDLE_FILL = 0.88
CHAR_IDS = ['topper', 'backbencher', 'hosteler', 'senior', 'placement', 'sports', 'cypher', 'gavel', 'bolt', 'palette']
KEY = {'senior': 'magenta'}                      # everyone else defaults to green
FILL = {'hosteler': 0.92, 'palette': 0.85}       # broad tank a bit bigger, Palette a bit smaller (fraction of cell height)
STATES = ['idle', 'walk', 'run', 'jump', 'crouch', 'light', 'heavy', 'block', 'dodge',
          'hit', 'special', 'ultimate', 'dash', 'air']


def key_out(img: Image.Image, mode: str, session=None) -> Image.Image:
    img = img.convert('RGBA')
    if mode == 'rembg':
        from rembg import remove
        return remove(img, session=session)
    a = np.asarray(img).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    if mode == 'green':
        s = g - np.maximum(r, b)
    else:  # magenta
        s = np.minimum(r, b) - g
    alpha = 1.0 - np.clip((s - 20.0) / 50.0, 0.0, 1.0)      # soft edge between 20..70
    edge = (alpha > 0.0) & (alpha < 0.999)                   # de-spill ONLY edge pixels (keeps real pink/green clothing intact)
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
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def place(sprite: Image.Image, scale: float) -> Image.Image:
    """Crop to bbox, scale, drop into a CELLxCELL canvas, feet on the bottom edge, centred."""
    bb = bbox(sprite)
    cell = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    if not bb:
        return cell
    c = sprite.crop(bb)
    w, h = max(1, round(c.width * scale)), max(1, round(c.height * scale))
    fit = min(1.0, CELL / w, CELL / h)
    if fit < 1.0:
        print(f'    note: pose is larger than the cell at this scale, shrunk by {fit:.2f}')
        w, h = max(1, round(w * fit)), max(1, round(h * fit))
    c = c.resize((w, h), Image.LANCZOS)
    cell.paste(c, ((CELL - w) // 2, CELL - h), c)
    return cell


def process(src: Path, out_root: Path, char: str, key: str, strips: dict, fill: float):
    out = out_root / char
    out.mkdir(parents=True, exist_ok=True)
    session = None
    if key == 'rembg':
        from rembg import new_session
        session = new_session('u2net')

    def load_panels(state):
        f = next((src / f'{state}{e}' for e in ('.png', '.webp', '.jpg', '.jpeg') if (src / f'{state}{e}').exists()), None)
        if not f:
            return None
        im = Image.open(f).convert('RGBA')
        n = strips.get(state, 1)
        pw = im.width // n
        return [key_out(im.crop((i * pw, 0, (i + 1) * pw, im.height)), key, session) for i in range(n)]

    idle = load_panels('idle')
    if not idle:
        print(f'[{char}] SKIPPED: idle.png is required (it defines the character scale).')
        return False
    bb = bbox(idle[0])
    if not bb:
        print(f'[{char}] SKIPPED: idle.png has nothing left after background removal — check --key (green / magenta / rembg).')
        return False
    scale = (CELL * fill) / (bb[3] - bb[1])
    print(f'[{char}] key={key} fill={fill} scale {scale:.3f} (idle height {bb[3]-bb[1]}px)')

    manifest, done = {}, []
    for state in STATES:
        panels = idle if state == 'idle' else load_panels(state)
        if not panels:
            continue
        cells = [place(p, scale) for p in panels]
        sheet = Image.new('RGBA', (CELL * len(cells), CELL), (0, 0, 0, 0))
        for i, c in enumerate(cells):
            sheet.paste(c, (i * CELL, 0))
        sheet.save(out / f'{state}.png')
        done.append((state, cells))
        if len(cells) > 1:
            manifest[state] = {'frames': len(cells), 'impact': 1}
        print(f'  {state:9s} -> {len(cells)} frame(s)')

    for extra in ('portrait.png', 'hud.png'):
        if (src / extra).exists():
            shutil.copy(src / extra, out / extra)

    (out_root / f'manifest.{char}.json').write_text(json.dumps({char: manifest}, indent=2))

    if done:  # contact sheet on magenta (first frame of each state)
        th = 300
        prev = Image.new('RGB', (th * min(7, len(done)), th * ((len(done) + 6) // 7)), (255, 0, 255))
        for i, (state, cells) in enumerate(done):
            t = cells[0].resize((th, th), Image.LANCZOS)
            prev.paste(t, ((i % 7) * th, (i // 7) * th), t)
        prev.save(out / '_preview.png')
        print(f'  preview: {out / "_preview.png"}')
    missing = [s for s in STATES if s not in [d[0] for d in done]]
    if missing:
        print('  missing (renderer falls back to a similar pose):', ', '.join(missing))
    return True


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('src'); ap.add_argument('out')
    ap.add_argument('--char', help='character id (single-character mode)')
    ap.add_argument('--all', action='store_true', help='process every raw/<id>/ folder found in src')
    ap.add_argument('--key', choices=['green', 'magenta', 'rembg'], help='background colour (default: green; senior=magenta with --all)')
    ap.add_argument('--fill', type=float, help='idle height as a fraction of the cell (default 0.88)')
    ap.add_argument('--strip', nargs='*', default=[], help='state=N, e.g. light=3 heavy=3')
    args = ap.parse_args()
    strips = {k: int(v) for k, v in (s.split('=') for s in args.strip)}
    out_root = Path(args.out)

    if args.all:
        results = {}
        for cid in CHAR_IDS:
            d = Path(args.src) / cid
            if not d.is_dir():
                results[cid] = 'no folder'
                continue
            ok = process(d, out_root, cid, args.key or KEY.get(cid, 'green'), strips, args.fill or FILL.get(cid, IDLE_FILL))
            results[cid] = 'ok' if ok else 'skipped'
        print('\nSummary:', ', '.join(f'{k}: {v}' for k, v in results.items()))
    elif args.char:
        process(Path(args.src), out_root, args.char, args.key or KEY.get(args.char, 'green'), strips, args.fill or FILL.get(args.char, IDLE_FILL))
    else:
        sys.exit('give --char <id> for one character, or --all for every raw/<id>/ folder')


if __name__ == '__main__':
    main()
</USER_REQUEST>
