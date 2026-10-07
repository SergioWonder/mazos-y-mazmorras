"""Convert the painted chapter openings into the WebP vignettes the game ships.

Sources: docs/arte/presentaciones/capitulo-*.png (gpt-image-2, 1536x1024, prompts in
prompts.tsv; the PNGs are not committed). Each one is cropped to 16:9 keeping the
heroes' silhouettes at the bottom, scaled to 1280x720 and saved as
src/arte/escenas/<id>.webp.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'docs' / 'arte' / 'presentaciones'
OUT = ROOT / 'src' / 'arte' / 'escenas'
SIZE = (1280, 720)
TOP_OFFSET = 100  # px cut from the top of a 1536x1024 source (the rest from the bottom)
MAX_BYTES = 250 * 1024

for png in sorted(SRC.glob('capitulo-*.png')):
    img = Image.open(png).convert('RGB')
    w, h = img.size
    crop_h = round(w * 9 / 16)
    top = min(TOP_OFFSET, h - crop_h)
    img = img.crop((0, top, w, top + crop_h)).resize(SIZE, Image.LANCZOS)
    dest = OUT / f'{png.stem}.webp'
    for quality in (82, 76, 70, 64):
        img.save(dest, 'WEBP', quality=quality, method=6)
        if dest.stat().st_size <= MAX_BYTES:
            break
    print(f'{dest.name}: {dest.stat().st_size // 1024} KB (q{quality})')
