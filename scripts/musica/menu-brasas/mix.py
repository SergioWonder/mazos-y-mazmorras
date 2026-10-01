"""Menu theme «Brasas» (fantasy and magic): mix and master (brief: docs/musica/menu-brasas.md,
§8 criteria 13–19).

Reads build/menu-brasas.mid (written by compose.py), renders it with Sonatina, VSCO 2 CE and VCSL
in a chamber-orchestra seating with one shared hall (the colour of the approved sketch
scripts/musica/leitmotivs/build/brasas-fantasia.mp3), masters to -17 LUFS / -1 dBTP as a seamless
loop and writes build/menu-brasas.mp3 and build/menu-brasas.report.json. Prints the report, the
brief checks and a comparison with the previous build and with the current track src/audio/menu.mp3.

Needs the «Base» disk mounted (VCSL and Sonatina).

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/menu-brasas/mix.py
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

MIDI = os.path.join(HERE, 'build', 'menu-brasas.mid')
OUT = os.path.join(HERE, 'build', 'menu-brasas.mp3')
REPORT = os.path.join(HERE, 'build', 'menu-brasas.report.json')
OLD_TRACK = os.path.join(ROOT, 'src', 'audio', 'menu.mp3')
SKETCH = os.path.join(ROOT, 'scripts', 'musica', 'leitmotivs', 'build', 'brasas-fantasia.mp3')
LOOP_SAMPLES = 3528000  # 28 bars × 4 beats × 60/84 s × 44 100

SSO = 'sso/Sonatina Symphonic Orchestra/'


def vsco(name: str) -> str:
    return os.path.join('VSCO-2-CE', name + '.sfz')


def vcsl(name: str) -> str:
    return os.path.join('VCSL', 'Idiophones', name + '.sfz')


def ride(*segments: tuple[float, float, float], ramp: float = 0.1) -> list[tuple[float, float]]:
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
# Pans are the orchestrator's; levels come from the per-part peaks and gated loudness of the
# report (the libraries differ by up to 25 dB at the same velocity). Melody on top, the magic
# (celesta, glass, harmonics, bells) as a halo behind it, the warmth (clarinet, horn, low strings)
# close enough to be felt.

# Quiet frame: the accompaniment of the intro and the codetta is ridden down (criterion 15: -27…-22 LUFS),
# so the door does not vanish under the UI sounds but the loop still breathes; in A it steps back
# so the exposition of the leitmotif is the clearest line of the loop.
FRAME = ((1, 2, -2.0), (25, 28, -3.0))

PARTS = [
    # melodies: alto flute in the centre, solo violin a little left (violins' side), clarinet centre-right
    Part('Flauta alto', SSO + 'Woodwinds - Performance/Alto Flute Solo Sustain.sfz', 'melodia', pan=-0.15,
         gain_db=0.0, send=0.32, width=0.5),
    Part('Violín solista', SSO + 'Strings - Performance/Violin Solo 1 Sustain.sfz', 'solista', pan=-0.20,
         gain_db=1.0, send=0.30, width=0.5,
         automation=ride((7, 10, 1.5), (23, 24, 2.5))),  # A' and the held D of the «light», on its softer CC1
    Part('Clarinete', vsco('ClarinetSus'), 'melodia', pan=0.10, gain_db=6.5, send=0.32, width=0.5),
    # horn: back, right of centre (the orchestrator's seat: away from the violin and the harp on the left)
    Part('Trompa', vsco('FHornSus'), 'trompa', pan=0.25, gain_db=0.0, send=0.45, width=0.6,
         automation=ride((13, 15, 6.0))),  # B's distant counter-line plays on the p layer, 18 dB under the clarinet
    # keys and glass: away from the melody's centre, behind it
    Part('Celesta', SSO + 'Percussion/Celeste.sfz', 'brillos', pan=0.30, gain_db=3.0, send=0.40, width=0.7,
         automation=ride((23, 26, 2.0))),  # the light of c. 23–24 and the music box of the codetta: it leads there
    Part('Glockenspiel', vsco('Glockenspiel'), 'brillos', pan=0.25, gain_db=17.0, send=0.50, width=0.5),
    Part('Copas', vcsl('Friction Idiophones/Wine Glasses - Slow'), 'brillos', pan=-0.30, gain_db=2.0, send=0.55,
         width=0.7),
    Part('Mark Trees', vcsl('Struck Idiophones/Mark Trees'), 'campanas', pan=-0.25, gain_db=3.0, send=0.55, width=0.8),
    # nearly all of the harmonics' energy is in 2.5–5 kHz: kept low, a mist rather than a line
    Part('Armónicos', SSO + 'Strings - Performance/1st Violins Harmonics.sfz', 'armonicos', pan=0.35, gain_db=-2.0,
         send=0.50, width=0.8),
    # harp: far left, behind the violin; the 14-note glissando (c. 18) and the D(add9) of c. 23 pile up
    # one-shots, so they are ridden down to keep the headroom (criterion 17)
    Part('Arpa', SSO + 'Concert Harp.sfz', 'arpa', pan=-0.40, gain_db=-1.0, send=0.40, width=0.8,
         automation=ride(*FRAME, (3, 6, -1.0), (7, 10, -1.0), (11, 14, -1.0), (18.7, 19.2, -3.0), (23, 24, -1.5),
                         ramp=0.05)),
    # choir: centre, far; under the melody at the climax
    Part('Coro', SSO + 'Chorus - Performance/Mixed Chorus.sfz', 'coro', pan=0.0, gain_db=0.0, send=0.50, width=1.0,
         automation=ride(*FRAME, (3, 6, -1.5), (11, 14, -1.0), (19, 22, -2.0), (23, 23, 1.5))),  # the door opens in D major
    # strings: violas and cellos right, basses centre-right
    Part('Violas pp', vsco('ViolaEnsSusVib-Quiet'), 'violas', pan=0.15, gain_db=6.0, send=0.30),
    Part('Violas trém', vsco('ViolaEnsTrem'), 'violas', pan=0.15, gain_db=4.0, send=0.30),  # the spell's tension, c. 17–18
    Part('Violas', vsco('ViolaEnsSusVib'), 'violas', pan=0.15, gain_db=-2.0, send=0.30),
    Part('Chelos pp', vsco('CelloEnsSusVib-Quiet'), 'chelos', pan=0.30, gain_db=6.0, send=0.28,
         automation=ride(*FRAME, (3, 6, -1.0))),
    Part('Chelos pizz', vsco('CelloEnsPizz'), 'chelos', pan=0.30, gain_db=5.0, send=0.32),  # the embers of B, felt
    Part('Chelos', vsco('CelloEnsSusVib'), 'chelos', pan=0.30, gain_db=-3.0, send=0.26),
    Part('Contrabajos', vsco('ContrabassSusVB'), 'bajos', pan=0.35, gain_db=3.0, send=0.20, width=0.6),
    # timpani and cymbal: at the back
    Part('Timbal', vsco('Timpani'), 'timbales', pan=-0.10, gain_db=2.0, send=0.50, width=0.6),
    Part('Timbal redoble', vsco('TimpaniRolls'), 'timbales', pan=-0.10, gain_db=8.0, send=0.50, width=0.6),
    Part('Plato', vcsl('Struck Idiophones/Suspended Cymbal 2'), 'plato', pan=0.20, gain_db=-8.0, send=0.55, width=0.8),
]

# ── subtractive EQ per bus: high-pass all but the bass, mud out at 200–400 Hz where it piles up,
# a dip in 2–5 kHz for the game's SFX, soft highs (the user found a bright vibraphone harsh) ──
BUSES = {
    'melodia': {'highpass': 140, 'peaks': [(320, -1.5, 1.0), (3200, -2.0, 1.2)], 'high_shelf': (8000, -2.0)},
    # the solo violin carries most of the 2.5–6 kHz energy (bow noise): a wider dip there
    'solista': {'highpass': 200, 'peaks': [(350, -1.5, 1.0), (2900, -4.5, 0.9), (4300, -2.0, 1.2)],
                'high_shelf': (6000, -4.0)},  # its G5–B♭5 at f was the brightest moment of the loop
    'trompa': {'highpass': 90, 'peaks': [(300, -2.0, 1.0), (2600, -2.0, 1.0)], 'high_shelf': (6000, -3.0)},
    # celesta, glockenspiel, glasses: the sparkle lives above 7 kHz, the harshness in 2.5–5 kHz
    'brillos': {'highpass': 300, 'peaks': [(3500, -3.0, 0.9)], 'high_shelf': (7500, -2.5)},
    'campanas': {'highpass': 500, 'peaks': [(4000, -4.0, 0.8)], 'high_shelf': (7000, -6.0)},
    'armonicos': {'highpass': 400, 'peaks': [(3200, -3.0, 0.8)], 'high_shelf': (5500, -6.0)},
    'arpa': {'highpass': 60, 'peaks': [(300, -2.0, 0.9), (3000, -2.0, 1.0)], 'high_shelf': (8000, -2.0)},
    'coro': {'highpass': 110, 'peaks': [(300, -2.0, 1.0), (3000, -3.0, 1.0)], 'high_shelf': (7000, -2.0)},
    'violas': {'highpass': 110, 'peaks': [(300, -2.5, 1.0), (2800, -2.0, 1.0)], 'high_shelf': (7000, -3.0)},
    'chelos': {'highpass': 45, 'peaks': [(260, -2.0, 1.0), (3000, -2.0, 1.0)], 'high_shelf': (6500, -3.0)},
    'bajos': {'highpass': 30, 'peaks': [(230, -1.5, 1.0)], 'high_shelf': (4000, -4.0)},
    'timbales': {'highpass': 40, 'peaks': [(320, -2.0, 1.0)], 'high_shelf': (5000, -3.0)},
    'plato': {'highpass': 350, 'peaks': [(3500, -5.0, 0.7)], 'high_shelf': (7000, -6.0)},
}

# brief §8 MixSpec sections
SECTIONS = {
    'intro 1-2': (1, 2), 'A 3-6': (3, 6), "A' 7-10": (7, 10), 'B 11-14': (11, 14),
    'puente 15-16': (15, 16), 'puente 17-18': (17, 18), 'retorno 19-22': (19, 22),
    'luz 23-24': (23, 24), 'codetta 25-28': (25, 28), 'c21': (21, 21),
}

SPEC = render.MixSpec(
    midi=MIDI, out=OUT, bpm=84, beats_per_bar=4, bars=28, parts=PARTS, buses=BUSES,
    reverb={'seconds': 2.8, 'predelay': 0.03, 'damping': 0.5}, reverb_return_db=-4.0,
    reverb_eq={'highpass': 150, 'peaks': [(350, -2.0, 0.8)], 'high_shelf': (6500, -3.0)},  # no muddy or hissy hall
    master_bus={'highpass': 28, 'comp': (-18, 1.5)},
    target_lufs=-17.0, ceiling_dbtp=-1.0, tail_seconds=6.0, sections=SECTIONS,
)


# ── measures of an existing MP3 (previous build, old track, sketch) ─────────
def decode(path: str) -> np.ndarray:
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', '44100', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def measure(path: str) -> dict:
    x, sr = decode(path), 44100
    return {'samples': len(x), 'lufs': round(mix.lufs(x, sr), 2), 'true_peak_db': round(mix.true_peak_db(x, sr), 2),
            'seam_jump': round(mix.seam_jump(x), 4), 'bands_db': {k: round(v, 1) for k, v in mix.band_energy(x, sr).items()}}


def checks(r: dict) -> list[tuple[str, bool, str]]:
    b, s, p = r['bands_db'], r['sections_lufs'], r['parts']
    ret, brk = s['retorno 19-22'], s['B 11-14']
    peak_part = max(p, key=lambda k: p[k]['pico_db'])
    violin = p['Violín solista']['lufs']
    return [
        ('13 sonoridad -17 ± 1 LUFS', abs(r['lufs'] + 17) <= 1, f"{r['lufs']} LUFS"),
        ('13 pico real ≤ -1 dBTP', r['true_peak_db'] <= -1.0, f"{r['true_peak_db']} dBTP"),
        ('14 loop_samples = 3 528 000', r['loop_samples'] == LOOP_SAMPLES, str(r['loop_samples'])),
        ('14 seam_jump < 0,02', r['seam_jump'] < 0.02, str(r['seam_jump'])),
        ('15 retorno 19-22 vs B en +4…+8 LU', 4 <= ret - brk <= 8, f'{ret - brk:+.1f} LU'),
        ('15 puente 17-18 vs 15-16 ≥ +2 LU', s['puente 17-18'] - s['puente 15-16'] >= 2,
         f"{s['puente 17-18'] - s['puente 15-16']:+.1f} LU"),
        ('15 luz 23-24 de 2 a 5 LU bajo 19-22', 2 <= ret - s['luz 23-24'] <= 5, f"{s['luz 23-24'] - ret:+.1f} LU"),
        ('15 intro en -27…-22 LUFS y ≥ 4 LU bajo 19-22',
         -27 <= s['intro 1-2'] <= -22 and ret - s['intro 1-2'] >= 4, f"{s['intro 1-2']} LUFS"),
        ('15 codetta en -27…-22 LUFS y ≥ 4 LU bajo 19-22',
         -27 <= s['codetta 25-28'] <= -22 and ret - s['codetta 25-28'] >= 4, f"{s['codetta 25-28']} LUFS"),
        ('16 presencia 2.5-6k ≤ -18 dB', b['presencia 2.5-6k'] <= -18, str(b['presencia 2.5-6k'])),
        ('16 aire 6-16k ≤ -28 dB', b['aire 6-16k'] <= -28, str(b['aire 6-16k'])),
        ('16 sub <60 ≤ -22 dB', b['sub <60'] <= -22, str(b['sub <60'])),
        ('17 ninguna parte > -6 dB de pico', p[peak_part]['pico_db'] <= -6, f"{peak_part} {p[peak_part]['pico_db']} dB"),
        ('17 armónicos ≥ 8 LU bajo el violín', violin - p['Armónicos']['lufs'] >= 8,
         f"{p['Armónicos']['lufs'] - violin:+.1f} LU"),
        ('17 copas ≥ 8 LU bajo el violín', violin - p['Copas']['lufs'] >= 8, f"{p['Copas']['lufs'] - violin:+.1f} LU"),
        ('17 celesta ≥ 2 LU bajo la flauta alto', p['Flauta alto']['lufs'] - p['Celesta']['lufs'] >= 2,
         f"{p['Celesta']['lufs'] - p['Flauta alto']['lufs']:+.1f} LU"),
        ('18 wet_dry_lu en -6…-3,5', -6 <= r['wet_dry_lu'] <= -3.5, f"{r['wet_dry_lu']} LU"),
        ('18 sala 2,6–3,0 s', 2.6 <= SPEC.reverb['seconds'] <= 3.0, f"{SPEC.reverb['seconds']} s"),
    ]


def main() -> int:
    previous = json.load(open(REPORT)) if os.path.exists(REPORT) else None
    report = render.render(SPEC)
    with open(REPORT, 'w') as f:
        json.dump(report, f, indent=1, ensure_ascii=False)

    print(f"{report['out']}\n  {report['seconds']} s · loop_samples {report['loop_samples']}")
    print(f"  {report['lufs']} LUFS · {report['true_peak_db']} dBTP · seam_jump {report['seam_jump']} · "
          f"sala {report['wet_dry_lu']} LU respecto a la señal directa")
    print('\nPartes (tras gain_db, antes de bus):          pico dB   LUFS' + ('     (antes pico / LUFS)' if previous else ''))
    for name, p in report['parts'].items():
        line = f'  {name:22s} {p["notas"]:4d} notas   {p["pico_db"]:6.1f}  {p["lufs"]:6.1f}'
        before = previous['parts'].get(name) if previous else None
        if before:
            line += f'     ({before["pico_db"]:6.1f} / {before["lufs"]:6.1f})'
        print(line)
    print('\nSecciones (LUFS sobre el máster):')
    for name, v in report['sections_lufs'].items():
        before = previous['sections_lufs'].get(name) if previous else None
        print(f'  {name:16s} {v:6.1f}' + (f'   (antes {before:6.1f})' if before is not None else ''))
    refs = {label: measure(path) for label, path in (('src/audio/menu.mp3', OLD_TRACK), ('boceto', SKETCH))
            if os.path.exists(path)}
    print('\nBandas dB (rel. al total)      nueva   ' + ('anterior   ' if previous else '') + '   '.join(refs))
    for k, v in report['bands_db'].items():
        line = f'  {k:24s} {v:7.1f}'
        if previous:
            line += f'   {previous["bands_db"][k]:7.1f}'
        for ref in refs.values():
            line += f'   {ref["bands_db"][k]:9.1f}'
        print(line)
    if previous:
        print(f"\nAnterior: {previous['lufs']} LUFS · {previous['true_peak_db']} dBTP · seam {previous['seam_jump']}")
    for label, ref in refs.items():
        print(f"{label}: {ref['samples']} muestras · {ref['lufs']} LUFS · {ref['true_peak_db']} dBTP · seam {ref['seam_jump']}")
    print('\nCriterios del brief:')
    results = checks(report)
    for label, ok, value in results:
        print(f"  [{'ok' if ok else 'FALLA'}] {label}: {value}")
    return 0 if all(ok for _, ok, _ in results) else 1


if __name__ == '__main__':
    sys.exit(main())
