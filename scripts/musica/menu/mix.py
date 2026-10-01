"""Menu theme «La puerta del juego»: mix and master (brief: docs/musica/menu.md, §8 criteria 9–13).

Reads build/menu.mid (written by compose.py), renders it with VSCO 2 CE in a chamber-orchestra
seating with one shared hall, masters to -17 LUFS / -1 dBTP as a seamless loop and writes
build/menu.mp3. Prints the report, the brief checks and a comparison with the previous build
(build/menu.report.json) and with the old synthesized track (src/audio/menu.mp3).

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/menu/mix.py
"""
from __future__ import annotations

import json
import os
import subprocess
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(HERE, '..'))

from estudio import mix, render  # noqa: E402
from estudio.render import Part  # noqa: E402

MIDI = os.path.join(HERE, 'build', 'menu.mid')
OUT = os.path.join(HERE, 'build', 'menu.mp3')
REPORT = os.path.join(HERE, 'build', 'menu.report.json')
OLD_TRACK = os.path.join(ROOT, 'src', 'audio', 'menu.mp3')


def vsco(name: str) -> str:
    return os.path.join('VSCO-2-CE', name + '.sfz')


def ride(*segments: tuple[int, int, float], ramp: float = 0.1) -> list[tuple[float, float]]:
    """Fader rides as automation points: each (first bar, last bar, dB) lifts or lowers those bars
    (inclusive), with short ramps at the bar lines. Overlapping or adjacent rides add up in dB."""
    def level(pos: float) -> float:
        total = 0.0
        for first, last, db in segments:
            up = np.clip((pos - (first - ramp)) / ramp, 0, 1)
            down = np.clip(((last + 1) - pos) / ramp, 0, 1)
            total += db * min(up, down)
        return float(total)
    marks = sorted({m for first, last, _ in segments for m in (first - ramp, first, last + 1 - ramp, last + 1)})
    return [(m, level(m)) for m in marks]


# ── seating: pan (-1 left … 1 right), level, depth (hall send) and stereo width ──
# Levels come from measuring every part solo: the VSCO patches differ by up to 25 dB at the
# same velocity, so gain_db first evens them out and then sets the role (melody on top).
PARTS = [
    # woodwinds: centre, a little back
    Part('Flute Sus', vsco('FluteSusVib'), 'maderas', pan=-0.15, gain_db=5.0, send=0.30, width=0.6,
         automation=ride((9, 12, 1.5))),  # consequent phrase of A, over the strings
    Part('Oboe Sus', vsco('OboeSusVib'), 'maderas', pan=0.10, gain_db=14.5, send=0.30, width=0.6),
    Part('Clarinet Sus', vsco('ClarinetSus'), 'maderas', pan=-0.05, gain_db=8.5, send=0.30, width=0.6,
         automation=ride((25, 28, -3.0))),  # melody in 21–24, harmony under the oboe in 25–28
    # horns: left and back
    Part('Trompa 1', vsco('FHornSus'), 'trompas', pan=-0.25, gain_db=-1.5, send=0.40, width=0.7,
         automation=ride((5, 8, 1.5), (41, 42, 3.0))),  # leitmotif solo; echo over the harp
    Part('Trompa 2', vsco('FHornSus'), 'trompas', pan=-0.30, gain_db=0.0, send=0.42, width=0.7),
    # timpani and percussion: at the back
    Part('Timpani', vsco('Timpani'), 'timbales', pan=-0.10, gain_db=4.0, send=0.45, width=0.6),
    Part('Timpani Roll', vsco('TimpaniRolls'), 'timbales', pan=-0.10, gain_db=7.0, send=0.45, width=0.6),
    Part('Cymbal', vsco('GM-StylePerc'), 'plato', pan=0.20, gain_db=4.0, send=0.50, width=0.8),
    Part('Glockenspiel', vsco('Glockenspiel'), 'glock', pan=0.25, gain_db=17.0, send=0.45, width=0.5),
    # harp: far left, behind the violins; the score keeps it below the melody's octave
    Part('Harp', vsco('Harp'), 'arpa', pan=-0.45, gain_db=7.5, send=0.32, width=0.8,
         automation=ride((41, 42, -5.0))),  # under the horn's echo in the codetta
    # strings: violins I left, violas and cellos right, basses centre-right
    Part('Violins Sus', vsco('ViolinEnsSusVib'), 'violines', pan=-0.40, gain_db=10.0, send=0.24,
         automation=ride((13, 16, 3.5), (17, 20, 1.5))),  # A' melody on the softer velocity layers
    Part('Violins Sus Quiet', vsco('ViolinEnsSusVib-Quiet'), 'violines', pan=-0.35, gain_db=9.0, send=0.26),
    Part('Violas Sus', vsco('ViolaEnsSusVib'), 'violas', pan=0.15, gain_db=-4.0, send=0.26),
    Part('Violas Sus Quiet', vsco('ViolaEnsSusVib-Quiet'), 'violas', pan=0.15, gain_db=6.0, send=0.26),
    Part('Violas Pizz', vsco('ViolaEnsPizz'), 'violas', pan=0.15, gain_db=-4.0, send=0.30),
    Part('Violas Trem', vsco('ViolaEnsTrem'), 'violas', pan=0.15, gain_db=-4.0, send=0.28),
    Part('Cellos Sus', vsco('CelloEnsSusVib'), 'chelos', pan=0.30, gain_db=-4.0, send=0.22),
    Part('Cellos Sus Quiet', vsco('CelloEnsSusVib-Quiet'), 'chelos', pan=0.30, gain_db=8.0, send=0.22),
    Part('Basses Sus', vsco('ContrabassSusVB'), 'bajos', pan=0.40, gain_db=4.0, send=0.18, width=0.6),
    Part('Basses Pizz', vsco('ContrabassPizz'), 'bajos', pan=0.40, gain_db=5.0, send=0.20, width=0.6),
]

# ── subtractive EQ per bus: high-pass all but the bass, mud out at 200–400 Hz where it piles
# up, a dip in 2–5 kHz for the game's SFX, soft highs (no harsh top) ──
BUSES = {
    'violines': {'highpass': 200, 'peaks': [(320, -2.0, 1.0), (2700, -3.0, 1.2), (4500, -2.0, 1.0)], 'high_shelf': (3000, -2.5),
                 'comp': (-20, 1.8), 'gain_db': 1.0},  # gentle: works mostly on the f of the return
    'violas': {'highpass': 120, 'peaks': [(300, -2.5, 1.0), (2800, -2.0, 1.0)], 'high_shelf': (7500, -3.0)},
    'chelos': {'highpass': 50, 'peaks': [(260, -2.0, 1.0), (3000, -2.0, 1.0)], 'high_shelf': (6500, -3.0)},
    'bajos': {'highpass': 30, 'peaks': [(230, -1.5, 1.0)], 'high_shelf': (4000, -4.0)},
    'maderas': {'highpass': 160, 'peaks': [(350, -1.5, 1.0), (3500, -2.0, 1.2)], 'high_shelf': (9000, -3.0)},
    'trompas': {'highpass': 90, 'peaks': [(300, -2.5, 1.0), (2600, -2.0, 1.0)], 'high_shelf': (6000, -3.0)},
    'arpa': {'highpass': 55, 'peaks': [(300, -3.0, 0.9), (3000, -2.0, 1.0)], 'high_shelf': (8000, -2.0)},
    'timbales': {'highpass': 40, 'peaks': [(320, -2.0, 1.0)], 'high_shelf': (5000, -3.0)},
    'plato': {'highpass': 350, 'peaks': [(3500, -5.0, 0.7)], 'high_shelf': (7000, -6.0)},
    'glock': {'highpass': 600, 'peaks': [(3000, -3.0, 1.0)], 'high_shelf': (6000, -5.0)},
}

# brief §3 sections plus the two spans of criterion 11
SECTIONS = {
    'intro 1-4': (1, 4), 'A 5-12': (5, 12), "A' 13-20": (13, 20), 'B 21-28': (21, 28),
    'puente 29-32': (29, 32), 'retorno 33-40': (33, 40), 'codetta 41-42': (41, 42),
    'c21-26': (21, 26), 'c33-38': (33, 38),
}

SPEC = render.MixSpec(
    midi=MIDI, out=OUT, bpm=108, beats_per_bar=3, bars=42, parts=PARTS, buses=BUSES,
    reverb={'seconds': 2.4, 'predelay': 0.024, 'damping': 0.6}, reverb_return_db=-4.0,
    reverb_eq={'highpass': 140, 'peaks': [(350, -2.0, 0.8)], 'high_shelf': (7000, -2.0)},  # no muddy or hissy hall
    master_bus={'highpass': 28, 'comp': (-18, 1.6)},
    target_lufs=-17.0, ceiling_dbtp=-1.0, tail_seconds=4.0, sections=SECTIONS,
)


# ── measures of an existing MP3 (previous build, old track) ─────────────────
def decode(path: str) -> np.ndarray:
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', '44100', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def measure(path: str) -> dict:
    x, sr = decode(path), 44100
    return {'samples': len(x), 'lufs': round(mix.lufs(x, sr), 2), 'true_peak_db': round(mix.true_peak_db(x, sr), 2),
            'seam_jump': round(mix.seam_jump(x), 4), 'bands_db': {k: round(v, 1) for k, v in mix.band_energy(x, sr).items()}}


def checks(r: dict) -> list[tuple[str, bool, str]]:
    b, s = r['bands_db'], r['sections_lufs']
    contrast = s['c33-38'] - s['c21-26']
    return [
        ('9  sonoridad -17 ± 1 LUFS', abs(r['lufs'] + 17) <= 1, f"{r['lufs']} LUFS"),
        ('9  pico real ≤ -1 dBTP', r['true_peak_db'] <= -1.0, f"{r['true_peak_db']} dBTP"),
        ('10 loop_samples = 3 087 000', r['loop_samples'] == 3087000, str(r['loop_samples'])),
        ('10 seam_jump < 0,02', r['seam_jump'] < 0.02, str(r['seam_jump'])),
        ('11 contraste c33-38 vs c21-26 en 6–10 LU', 6 <= contrast <= 10, f'{contrast:.1f} LU'),
        ('12 presencia 2.5-6k ≤ -18 dB', b['presencia 2.5-6k'] <= -18, str(b['presencia 2.5-6k'])),
        ('12 aire 6-16k ≤ -28 dB', b['aire 6-16k'] <= -28, str(b['aire 6-16k'])),
        ('12 sub <60 ≤ -20 dB', b['sub <60'] <= -20, str(b['sub <60'])),
    ]


def main() -> int:
    previous = json.load(open(REPORT)) if os.path.exists(REPORT) else None
    report = render.render(SPEC)
    with open(REPORT, 'w') as f:
        json.dump(report, f, indent=1, ensure_ascii=False)

    print(f"{report['out']}\n  {report['seconds']} s · loop_samples {report['loop_samples']}")
    print(f"  {report['lufs']} LUFS · {report['true_peak_db']} dBTP · seam_jump {report['seam_jump']} · "
          f"sala {report['wet_dry_lu']} LU respecto a la señal directa")
    print('\nPartes (tras gain_db, antes de bus):          pico dB   LUFS')
    for name, p in report['parts'].items():
        print(f'  {name:22s} {p["notas"]:4d} notas   {p["pico_db"]:6.1f}  {p["lufs"]:6.1f}')
    print('\nSecciones (LUFS sobre el máster):')
    for name, v in report['sections_lufs'].items():
        before = previous['sections_lufs'].get(name) if previous and 'sections_lufs' in previous else None
        print(f'  {name:16s} {v:6.1f}' + (f'   (antes {before:6.1f})' if before is not None else ''))
    old = measure(OLD_TRACK) if os.path.exists(OLD_TRACK) else None
    print('\nBandas dB (rel. al total)      nueva   ' + ('anterior   ' if previous else '') + ('src/audio/menu.mp3' if old else ''))
    for k, v in report['bands_db'].items():
        line = f'  {k:24s} {v:7.1f}'
        if previous:
            line += f'   {previous["bands_db"][k]:7.1f}'
        if old:
            line += f'   {old["bands_db"][k]:7.1f}'
        print(line)
    if previous:
        print(f"\nAnterior: {previous['lufs']} LUFS · {previous['true_peak_db']} dBTP · seam {previous['seam_jump']}")
    if old:
        print(f"Antigua src/audio/menu.mp3: {old['samples']} muestras · {old['lufs']} LUFS · "
              f"{old['true_peak_db']} dBTP · seam {old['seam_jump']}")
    print('\nCriterios del brief:')
    results = checks(report)
    for label, ok, value in results:
        print(f"  [{'ok' if ok else 'FALLA'}] {label}: {value}")
    return 0 if all(ok for _, ok, _ in results) else 1


if __name__ == '__main__':
    sys.exit(main())
