"""Convert the empty chapter scenarios into the WebP layers the game ships.

Sources: docs/arte/presentaciones/v2/escenario-<id>.png (gpt-image-2, 1536x1024,
comic style, no characters; prompts in that folder; the PNGs are not committed).
Each one is saved whole (3:2) as src/arte/escenas/capas/capitulo-<id>.webp; the
hero's puppet is laid over it in the game (ui/chapter-layers.ts).
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'docs' / 'arte' / 'presentaciones' / 'v2'
OUT = ROOT / 'src' / 'arte' / 'escenas' / 'capas'
MAX_BYTES = 400 * 1024

for png in sorted(SRC.glob('escenario-*.png')):
    img = Image.open(png).convert('RGB')
    dest = OUT / f"capitulo-{png.stem.removeprefix('escenario-')}.webp"
    for quality in (80, 74, 68):
        img.save(dest, 'WEBP', quality=quality, method=6)
        if dest.stat().st_size <= MAX_BYTES:
            break
    print(f'{dest.name}: {dest.stat().st_size // 1024} KB (q{quality})')
