"""Boss theme «El festín de Gorzug» (cap1-e0-jefe): mix and master (brief: docs/musica/acto1-gorzug.md,
§8 criteria 11–16).

Reads build/acto1-gorzug.mid (written by compose.py), renders it with VSCO 2 CE, VCSL and Sonatina in a
symphonic seating with one shared (shorter, boss-tempo) hall, masters to -17 LUFS / -1 dBTP as a seamless
loop and writes build/acto1-gorzug.mp3. Prints the report, the brief checks and a comparison with the
previous build (build/acto1-gorzug.report.json) and with the old synthesized boss (src/audio/jefe1.mp3).

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/acto1-gorzug/mix.py
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

NAME = 'acto1-gorzug'
MIDI = os.path.join(HERE, 'build', NAME + '.mid')
OUT = os.path.join(HERE, 'build', NAME + '.mp3')
REPORT = os.path.join(HERE, 'build', NAME + '.report.json')
OLD_TRACK = os.path.join(ROOT, 'src', 'audio', 'jefe1.mp3')  # the synthesized Act I boss it replaces

BPM, BEATS, BARS = 160, 4, 56
BAR_SECONDS = BEATS * 60 / BPM


def vsco(name: str) -> str:
    return os.path.join('VSCO-2-CE', name + '.sfz')


def vcsl(group: str, name: str) -> str:
    return os.path.join('VCSL', group, name + '.sfz')


def sso(group: str, name: str) -> str:
    return os.path.join('sso', 'Sonatina Symphonic Orchestra', group, name + '.sfz')


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


def choke(at: float, db: float, until: float, fall: float = 0.35) -> list[tuple[float, float]]:
    """Damps a part right after a hit at bar position `at` (by `db`, reached `fall` bars later) and
    brings it back at `until`: the bite of bar 16 has to leave a hole, not a ringing tail."""
    return [(at, 0.0), (at + fall, db), (until - 0.05, db), (until, 0.0)]


# ── seating: pan (-1 left … 1 right), level, depth (hall send) and stereo width ──
# gain_db first evens out the libraries (VSCO, VCSL and Sonatina differ by 20+ dB at the same
# dynamic) and then sets the role: the leitmotif (brass, violins, chorus) on top, the bite short
# and hard, the ostinato under it, the metals and the gong at the back.
PARTS = [
    # woodwinds: centre, a little back (the goblin motif sits centre-left, the xylophone answers right)
    Part('Clarinet Stac', vsco('ClarinetStac'), 'maderas', pan=-0.15, gain_db=3.0, send=0.30, width=0.6),
    Part('Xylophone', vcsl('Idiophones/Struck Idiophones', 'Xylophone - Soft Mallets'), 'xilo', pan=0.20,
         gain_db=6.0, send=0.36, width=0.5),
    Part('Contrabassoon Sustain', sso('Woodwinds - Performance', 'Contrabassoon Solo Sustain (looped)'), 'fagot',
         pan=-0.05, gain_db=-2.0, send=0.30, width=0.5),
    Part('Contrabassoon Staccato', sso('Woodwinds - Performance', 'Contrabassoon Solo Staccato'), 'fagot',
         pan=-0.05, gain_db=-5.0, send=0.26, width=0.5),
    # horns: left and back
    Part('Horns Marcato', sso('Brass - Performance', 'Horns Marcato'), 'trompas', pan=-0.30, gain_db=-7.5,
         send=0.40, width=0.7,
         automation=choke(16.13, -10, 28.9) + ride((29, 32, -1.5))),  # hole after the bite; the bridge starts lower
    Part('Horns Sustain', sso('Brass - Performance', 'Horns Sustain'), 'trompas', pan=-0.30, gain_db=-7.0,
         send=0.42, width=0.7),
    # trombones centre-right, low brass a touch closer to the centre
    Part('Trombones Marcato', sso('Brass - Performance', 'Trombones Marcato'), 'trombones', pan=0.30,
         gain_db=-7.0, send=0.32, width=0.7,
         automation=choke(16.13, -10, 28.9) + ride((29, 32, -1.5))),
    Part('Trombones Sustain', sso('Brass - Performance', 'Trombones Sustain (looped)'), 'trombones', pan=0.30,
         gain_db=-8.5, send=0.34, width=0.7),
    Part('Trombones Staccato', sso('Brass - Performance', 'Trombones Staccato'), 'trombones', pan=0.30,
         gain_db=-6.0, send=0.28, width=0.7),
    Part('Bass Trombone Marcato', sso('Brass - Performance', 'Bass Trombone Solo Marcato'), 'tubas', pan=0.35,
         gain_db=-1.0, send=0.28, width=0.5),
    Part('Bass Trombone Sustain', sso('Brass - Performance', 'Bass Trombone Solo Sustain (looped)'), 'tubas',
         pan=0.35, gain_db=-3.0, send=0.30, width=0.5),
    Part('Tuba Marcato', sso('Brass - Performance', 'Tuba Marcato'), 'tubas', pan=0.15, gain_db=-3.0, send=0.28,
         width=0.5, automation=choke(16.13, -10, 28.9) + ride((5, 12, -1.0), (33, 36, -1.5))),  # bass, under the riff and the violins
    # timpani and percussion: at the back
    Part('Timpani', vsco('Timpani'), 'timbales', pan=-0.10, gain_db=3.0, send=0.42, width=0.6),
    Part('Timpani Roll', vsco('TimpaniRolls'), 'timbales', pan=-0.10, gain_db=8.0, send=0.45, width=0.6),
    Part('Bass Drum', vcsl('Membranophones/Struck Membranophones', 'Bass Drum 2'), 'tambores', pan=0.0,
         gain_db=-8.5, send=0.38, width=0.5),
    Part('Tom', vcsl('Membranophones/Struck Membranophones', 'Tom 2'), 'tambores', pan=0.10, gain_db=-4.0,
         send=0.40, width=0.5),
    Part('Forge', vcsl('Idiophones/Struck Idiophones', 'Brake Drum'), 'forja', pan=0.45, gain_db=1.0,
         send=0.45, width=0.5),
    Part('Cymbal', vcsl('Idiophones/Struck Idiophones', 'Suspended Cymbal 2'), 'platos', pan=-0.30, gain_db=-8.0,
         send=0.50, width=0.8),
    Part('Tam-tam', sso('Percussion', 'Cymbals & Tamtam'), 'platos', pan=0.25, gain_db=-4.5, send=0.50, width=0.8,
         automation=choke(16.13, -12, 36.9, fall=0.5)),  # damped after the bite of bar 16
    Part('Gong', vcsl('Idiophones/Struck Idiophones', 'Gong 1'), 'platos', pan=-0.25, gain_db=28.0, send=0.50,
         width=0.8),
    # chorus: centre, wide, behind the orchestra
    Part('Large Chorus', sso('Chorus - Performance', 'Large Chorus'), 'coro', pan=0.0, gain_db=-4.5, send=0.40,
         width=1.0, automation=ride((33, 36, 2.0))),  # its entry is the bridge's crescendo
    # strings: violins I left, violas and cellos right, basses centre-right
    Part('1st Violins Marcato', sso('Strings - Performance', '1st Violins Marcato'), 'violines', pan=-0.45,
         gain_db=-4.2, send=0.26,
         automation=ride((13, 15, 0.5), (33, 36, 1.0))),  # melody of 33–36 over the semiquaver ostinato
    Part('Violins Sus', vsco('ViolinEnsSusVib'), 'violines', pan=-0.40, gain_db=6.0, send=0.28),
    Part('Violins Trem', vsco('ViolinEnsTrem'), 'violines', pan=-0.50, gain_db=2.5, send=0.32),
    Part('Violas Trem', vsco('ViolaEnsTrem'), 'violas', pan=0.20, gain_db=-2.0, send=0.30),
    Part('Violas Spic', vsco('ViolaEnsSpic'), 'violas', pan=0.20, gain_db=-6.0, send=0.26),
    Part('Violas Col Legno', sso('Strings - Performance', 'Violas Col Legno'), 'violas', pan=0.20, gain_db=10.0,
         send=0.26),
    Part('Cellos Spic', vsco('CelloEnsSpic'), 'chelos', pan=0.35, gain_db=-1.5, send=0.20),
    Part('Celli Col Legno', sso('Strings - Performance', 'Celli Col Legno'), 'chelos', pan=0.35, gain_db=0.0,
         send=0.22),
    Part('Basses Spic', vsco('ContrabassSpic'), 'bajos', pan=0.25, gain_db=-2.0, send=0.16, width=0.6),
    Part('Basses Trem', vsco('ContrabassTrem'), 'bajos', pan=0.25, gain_db=12.0, send=0.18, width=0.6),
    Part('Basses Col Legno', sso('Strings - Performance', 'Basses Col Legno'), 'bajos', pan=0.25, gain_db=0.0,
         send=0.16, width=0.6),
]

# ── subtractive EQ per bus: high-pass all but the bass (and the bass too, below its lowest
# fundamental, so the sub stays under control), mud out at 200–400 Hz where the low brass,
# cellos, chorus and drums pile up, a dip in 2–5 kHz for the game's SFX, soft highs ──
BUSES = {
    'violines': {'highpass': 220, 'peaks': [(350, -2.0, 1.0), (2800, -3.0, 1.0), (4500, -2.0, 1.0)],
                 'high_shelf': (6000, -3.0), 'comp': (-20, 1.6)},
    'violas': {'highpass': 130, 'peaks': [(300, -2.5, 1.0), (2800, -2.5, 1.0)], 'high_shelf': (6500, -3.0)},
    'chelos': {'highpass': 55, 'peaks': [(250, -2.5, 1.0), (3000, -2.0, 1.0)], 'high_shelf': (6000, -3.0)},
    'bajos': {'highpass': 36, 'peaks': [(220, -2.0, 1.0)], 'high_shelf': (4000, -4.0)},
    'maderas': {'highpass': 180, 'peaks': [(350, -1.5, 1.0), (3200, -2.5, 1.2)], 'high_shelf': (8000, -3.0)},
    'xilo': {'highpass': 400, 'peaks': [(3000, -3.0, 1.0)], 'high_shelf': (6000, -4.0)},
    'fagot': {'highpass': 32, 'peaks': [(260, -2.0, 1.0)], 'high_shelf': (5000, -3.0)},
    'trompas': {'highpass': 100, 'peaks': [(300, -2.5, 1.0), (2600, -2.5, 1.0)], 'high_shelf': (6000, -3.0),
                'comp': (-18, 1.5)},
    'trombones': {'highpass': 70, 'peaks': [(280, -2.5, 1.0), (2500, -2.0, 1.0)], 'high_shelf': (6000, -3.0),
                  'comp': (-18, 1.5)},
    'tubas': {'highpass': 36, 'peaks': [(230, -2.0, 1.0)], 'high_shelf': (4000, -3.0)},
    'timbales': {'highpass': 40, 'peaks': [(300, -2.0, 1.0)], 'high_shelf': (5000, -3.0)},
    'tambores': {'highpass': 60, 'peaks': [(42, -6.0, 1.4), (320, -3.0, 1.0), (3000, -2.0, 1.0)], 'high_shelf': (5000, -4.0)},
    'forja': {'highpass': 250, 'peaks': [(3500, -4.0, 0.8)], 'high_shelf': (6000, -5.0)},
    'platos': {'highpass': 120, 'peaks': [(3500, -5.0, 0.7)], 'high_shelf': (7000, -6.0)},
    'coro': {'highpass': 110, 'peaks': [(300, -2.5, 1.0), (2800, -3.0, 1.0)], 'high_shelf': (6500, -3.0)},
}

# brief §3 sections plus the spans of criterion 13
SECTIONS = {
    'intro 1-4': (1, 4), 'A 5-12': (5, 12), "A' 13-20": (13, 20), "A' 13-15": (13, 15), "A' 17-20": (17, 20),
    'B 21-28': (21, 28),
    'puente 29-32': (29, 32), 'puente 33-36': (33, 36), 'clímax 37-44': (37, 44), 'mordiscos 45-48': (45, 48),
    'codetta 49-56': (49, 56), 'c. 41': (41, 41),
}

SPEC = render.MixSpec(
    midi=MIDI, out=OUT, bpm=BPM, beats_per_bar=BEATS, bars=BARS, parts=PARTS, buses=BUSES,
    reverb={'seconds': 1.9, 'predelay': 0.020, 'damping': 0.6}, reverb_return_db=-4.0,
    reverb_eq={'highpass': 160, 'peaks': [(350, -2.5, 0.8)], 'high_shelf': (6500, -3.0)},  # no muddy or hissy hall
    master_bus={'highpass': 30, 'comp': (-18, 1.5)},
    target_lufs=-17.0, ceiling_dbtp=-1.0, tail_seconds=4.0, sections=SECTIONS,
)


# ── how hard the master limiter works (criterion 15): wraps mix.master to see its input ──
LIMITER: dict = {}


def _watch_master(original):
    def wrapped(x, sr, target_lufs=-17.0, ceiling_dbtp=-1.0):
        out = original(x, sr, target_lufs, ceiling_dbtp)
        win = int(0.010 * sr)
        n = len(x) // win * win
        pin = np.abs(x[:n]).max(axis=1).reshape(-1, win).max(axis=1)
        pout = np.abs(out[:n]).max(axis=1).reshape(-1, win).max(axis=1)
        loud = pin > pin.max() * 0.05
        ratio = pin[loud] / np.maximum(pout[loud], 1e-9)
        gr = 20 * np.log10(ratio / ratio.min())  # the unlimited windows share the plain loudness gain
        t = np.flatnonzero(loud) * win / sr
        worst = np.argsort(gr)[::-1]
        bars = []
        for i in worst:
            b = int(t[i] // BAR_SECONDS) + 1
            if gr[i] < 0.5 or len(bars) >= 6:
                break
            if b not in [x for x, _ in bars]:
                bars.append((b, round(float(gr[i]), 1)))
        LIMITER.update(max_db=round(float(gr.max()), 1), bars=bars)
        return out
    return wrapped


render.mix.master = _watch_master(mix.master)


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
    b, s, p = r['bands_db'], r['sections_lufs'], r['parts']
    climax = s['clímax 37-44'] - s['B 21-28']
    crescendo = s['puente 33-36'] - s['puente 29-32']
    loudest = max(p, key=lambda k: p[k]['pico_db'])
    lim = r.get('limitador', {})
    return [
        ('11 sonoridad -17 ± 1 LUFS', abs(r['lufs'] + 17) <= 1, f"{r['lufs']} LUFS"),
        ('11 pico real ≤ -1 dBTP', r['true_peak_db'] <= -1.0, f"{r['true_peak_db']} dBTP"),
        ('12 loop_samples = 3 704 400', r['loop_samples'] == 3704400, str(r['loop_samples'])),
        ('12 seam_jump < 0,02', r['seam_jump'] < 0.02, str(r['seam_jump'])),
        ('13 clímax 37-44 vs B 21-28 en +4…+8 LU', 4 <= climax <= 8, f'{climax:+.1f} LU'),
        ('13 puente 33-36 vs 29-32 ≥ +2 LU', crescendo >= 2, f'{crescendo:+.1f} LU'),
        ('14 presencia 2.5-6k ≤ -18 dB', b['presencia 2.5-6k'] <= -18, str(b['presencia 2.5-6k'])),
        ('14 aire 6-16k ≤ -28 dB', b['aire 6-16k'] <= -28, str(b['aire 6-16k'])),
        ('14 sub <60 ≤ -18 dB', b['sub <60'] <= -18, str(b['sub <60'])),
        ('15 ninguna parte > -6 dB de pico', p[loudest]['pico_db'] <= -6, f"{loudest} {p[loudest]['pico_db']} dB"),
        ('15 limitador del máster ≤ 3 dB', lim.get('max_db', 99) <= 3, f"{lim.get('max_db')} dB en c. {lim.get('bars')}"),
    ]


def main() -> int:
    previous = json.load(open(REPORT)) if os.path.exists(REPORT) else None
    report = render.render(SPEC)
    report['limitador'] = dict(LIMITER)
    with open(REPORT, 'w') as f:
        json.dump(report, f, indent=1, ensure_ascii=False)

    print(f"{report['out']}\n  {report['seconds']} s · loop_samples {report['loop_samples']}")
    print(f"  {report['lufs']} LUFS · {report['true_peak_db']} dBTP · seam_jump {report['seam_jump']} · "
          f"sala {report['wet_dry_lu']} LU respecto a la señal directa · limitador hasta {LIMITER.get('max_db')} dB "
          f"(c. {LIMITER.get('bars')})")
    prev_parts = previous['parts'] if previous else {}
    print('\nPartes (tras gain_db, antes de bus):          pico dB   LUFS' + ('    (antes pico / LUFS)' if previous else ''))
    for name, p in report['parts'].items():
        line = f'  {name:24s} {p["notas"]:4d} notas   {p["pico_db"]:6.1f}  {p["lufs"]:6.1f}'
        if name in prev_parts:
            line += f'    ({prev_parts[name]["pico_db"]:6.1f} / {prev_parts[name]["lufs"]:6.1f})'
        print(line)
    print('\nSecciones (LUFS sobre el máster):')
    for name, v in report['sections_lufs'].items():
        before = previous['sections_lufs'].get(name) if previous and 'sections_lufs' in previous else None
        print(f'  {name:16s} {v:6.1f}' + (f'   (antes {before:6.1f})' if before is not None else ''))
    old = measure(OLD_TRACK) if os.path.exists(OLD_TRACK) else None
    print('\nBandas dB (rel. al total)      nueva   ' + ('anterior   ' if previous else '') + ('src/audio/jefe1.mp3' if old else ''))
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
        print(f"Antigua src/audio/jefe1.mp3: {old['samples']} muestras · {old['lufs']} LUFS · "
              f"{old['true_peak_db']} dBTP · seam {old['seam_jump']}")
    print('\nCriterios del brief:')
    results = checks(report)
    for label, ok, value in results:
        print(f"  [{'ok' if ok else 'FALLA'}] {label}: {value}")
    return 0 if all(ok for _, ok, _ in results) else 1


if __name__ == '__main__':
    sys.exit(main())
