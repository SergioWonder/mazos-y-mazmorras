"""Shared painting helpers: SVG rasterization through headless Chrome and
numpy/PIL post-processing that gives procedural scenes a painted look."""

import os
import subprocess

import numpy as np
from PIL import Image, ImageFilter

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def render_svg(svg, w, h, out_png, scale=2):
    """Rasterize an SVG string at `scale`x and downsample to w x h."""
    html_path = out_png.replace(".png", ".html")
    with open(html_path, "w") as f:
        f.write(
            "<!doctype html><html><head><style>html,body{margin:0;padding:0;"
            "background:#000;overflow:hidden}svg{display:block}</style></head>"
            f"<body>{svg}</body></html>"
        )
    raw = out_png.replace(".png", "-raw.png")
    subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
         f"--force-device-scale-factor={scale}", f"--window-size={w},{h}",
         "--virtual-time-budget=20000", f"--screenshot={raw}",
         "file://" + os.path.abspath(html_path)],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    img = Image.open(raw).convert("RGB")
    img = img.crop((0, 0, w * scale, h * scale)).resize((w, h), Image.LANCZOS)
    img.save(out_png)
    return img


def fractal_noise(h, w, rng, octaves=5, base=4, persistence=0.55):
    """Value noise in [0,1] built from upscaled random grids."""
    acc = np.zeros((h, w), np.float32)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        cells = base * (2 ** o)
        gh = max(2, int(cells * h / max(h, w)) + 2)
        gw = max(2, int(cells * w / max(h, w)) + 2)
        grid = (rng.random((gh, gw)) * 255).astype(np.uint8)
        layer = Image.fromarray(grid).resize((w, h), Image.BICUBIC)
        acc += amp * (np.asarray(layer, np.float32) / 255.0)
        total += amp
        amp *= persistence
    acc /= total
    acc -= acc.min()
    acc /= max(acc.max(), 1e-6)
    return acc


def blur(arr, radius):
    """Gaussian blur for a float HxWx3 array in 0..1."""
    img = Image.fromarray(np.clip(arr * 255, 0, 255).astype(np.uint8))
    return np.asarray(img.filter(ImageFilter.GaussianBlur(radius)), np.float32) / 255.0


def painterly_warp(arr, rng, amp=2.2, scale=6):
    """Displace pixels along a smooth noise field to wobble edges like brushwork."""
    h, w, _ = arr.shape
    dx = (fractal_noise(h, w, rng, octaves=3, base=scale) - 0.5) * 2 * amp
    dy = (fractal_noise(h, w, rng, octaves=3, base=scale) - 0.5) * 2 * amp
    yy, xx = np.mgrid[0:h, 0:w]
    sx = np.clip((xx + dx).round().astype(int), 0, w - 1)
    sy = np.clip((yy + dy).round().astype(int), 0, h - 1)
    return arr[sy, sx]


def brush_texture(h, w, rng, strength=0.06, angle_jitter=True):
    """Streaky multiplicative texture that reads as dry-brush strokes."""
    n = rng.random((h // 3 + 2, w // 18 + 2)).astype(np.float32)
    img = Image.fromarray((n * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    img = img.filter(ImageFilter.GaussianBlur(1.2))
    if angle_jitter:
        img = img.rotate(8, resample=Image.BICUBIC, expand=False, fillcolor=128)
    t = np.asarray(img, np.float32) / 255.0 - 0.5
    return 1.0 + t[..., None] * strength * 2


def bloom(arr, threshold=0.62, radii=(6, 22, 60), gain=(0.35, 0.3, 0.25)):
    lum = arr[..., 0] * 0.3 + arr[..., 1] * 0.55 + arr[..., 2] * 0.15
    mask = np.clip((lum - threshold) / (1 - threshold), 0, 1)[..., None]
    bright = arr * mask
    out = arr.copy()
    for r, g in zip(radii, gain):
        out += blur(bright, r) * g
    return np.clip(out, 0, 1).astype(np.float32)


def vignette(h, w, cx=0.5, cy=0.5, strength=0.55, power=2.2):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx / w - cx) / 0.75) ** 2 + ((yy / h - cy) / 0.75) ** 2)
    return (1 - strength * np.clip(d, 0, 1.2) ** power)[..., None]


def vertical_band(h, w, y0, y1, value):
    """Multiplier that eases from `value` at y0 to 1 at y1 (fractions of h)."""
    yy = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    t = np.clip((yy - y0) / (y1 - y0), 0, 1)
    t = t * t * (3 - 2 * t)
    m = value + (1 - value) * t
    return np.repeat(m, w, axis=1)[..., None]


def save_webp(arr, path, quality=82, max_kb=None):
    img = Image.fromarray(np.clip(arr * 255, 0, 255).astype(np.uint8))
    q = quality
    while True:
        img.save(path, "WEBP", quality=q, method=6)
        kb = os.path.getsize(path) / 1024
        if max_kb is None or kb <= max_kb or q <= 70:
            return q, kb
        q -= 2


def mockup(arr, out_png, hero_x=0.2, enemies=(0.62, 0.8), floor_y=0.9):
    """Review composite: black silhouettes + dark top bar (not delivered)."""
    from PIL import ImageDraw
    img = Image.fromarray(np.clip(arr * 255, 0, 255).astype(np.uint8)).convert("RGBA")
    w, h = img.size
    over = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    d.rectangle([0, 0, w, int(h * 0.075)], fill=(10, 8, 12, 215))
    s = h / 1080 if w > h else w / 1080 * 0.9

    def figure(cx, height, width):
        top = floor_y * h - height
        d.ellipse([cx - width * 0.22, top, cx + width * 0.22, top + width * 0.44], fill=(0, 0, 0, 255))
        d.polygon([(cx - width * 0.5, floor_y * h), (cx - width * 0.35, top + width * 0.4),
                   (cx + width * 0.35, top + width * 0.4), (cx + width * 0.5, floor_y * h)],
                  fill=(0, 0, 0, 255))

    figure(hero_x * w, 330 * s, 150 * s)
    for i, ex in enumerate(enemies):
        figure(ex * w, (300 + 60 * (i % 2)) * s, (190 + 40 * (i % 2)) * s)
    # card hand placeholder
    d.rounded_rectangle([w * 0.3, h * 0.965, w * 0.7, h * 1.05], 12, fill=(30, 26, 22, 200))
    Image.alpha_composite(img, over).convert("RGB").save(out_png)


def _box_mean(a, r):
    """Mean over a (2r+1)^2 box using an integral image (edge-padded)."""
    p = np.pad(a, ((r + 1, r), (r + 1, r)) + ((0, 0),) * (a.ndim - 2), mode="edge")
    c = p.astype(np.float64).cumsum(0).cumsum(1)
    k = 2 * r + 1
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)


def kuwahara(arr, r=3):
    """Kuwahara filter: flattens texture into paint-like patches while keeping edges."""
    h, w, _ = arr.shape
    lum = arr[..., 0] * 0.3 + arr[..., 1] * 0.55 + arr[..., 2] * 0.15
    m = _box_mean(arr, r // 2 + 1 if r > 2 else 1)
    rr = r // 2 + 1 if r > 2 else 1
    ml = _box_mean(lum, rr)
    ml2 = _box_mean(lum * lum, rr)
    var = ml2 - ml * ml
    best_v = np.full((h, w), np.inf, np.float32)
    out = np.zeros_like(arr)
    for oy in (-rr, rr):
        for ox in (-rr, rr):
            sv = np.roll(np.roll(var, oy, 0), ox, 1)
            sm = np.roll(np.roll(m, oy, 0), ox, 1)
            sel = sv < best_v
            best_v = np.where(sel, sv, best_v)
            out[sel] = sm[sel]
    return np.clip(out, 0, 1).astype(np.float32)
