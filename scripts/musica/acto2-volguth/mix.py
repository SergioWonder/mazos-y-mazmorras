"""Vol'guth's boss theme «Misa de la filacteria» (cap2-e0-jefe): mix and master (brief:
docs/musica/acto2-volguth.md, §8 criteria 13–18).

Reads build/acto2-volguth.mid (written by compose.py), renders it with VSCO 2 CE, VCSL and Sonatina in a
symphonic seating inside one shared rock-cut church, masters it as a seamless loop and writes
build/acto2-volguth.mp3. Prints the report, the brief checks (measured on the decoded MP3) and a comparison
with the previous build (build/acto2-volguth.report.json), the approved sketch
(scripts/musica/leitmotivs/build/acto2-jefe-cripta.mp3) and the old synthesized Act II boss (src/audio/jefe2.mp3).

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/acto2-volguth/mix.py
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

from estudio import midi_io, mix, render  # noqa: E402
from estudio.render import Part  # noqa: E402

NAME = 'acto2-volguth'
MIDI = os.path.join(HERE, 'build', NAME + '.mid')
OUT = os.path.join(HERE, 'build', NAME + '.mp3')
REPORT = os.path.join(HERE, 'build', NAME + '.report.json')
REFERENCES = {  # what the new track is compared with
    'boceto': os.path.join(ROOT, 'scripts', 'musica', 'leitmotivs', 'build', 'acto2-jefe-cripta.mp3'),
    'jefe2': os.path.join(ROOT, 'src', 'audio', 'jefe2.mp3'),  # the synthesized Act II boss it replaces
}

BPM, BEATS, BARS = 144, 4, 56
BAR_SECONDS = BEATS * 60 / BPM
LOOP_SAMPLES = 4116000


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


def combine(*curves: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Sum of several fader rides (in dB), sampled at the union of their points (all of them ramp, so
    piecewise-linear sums stay exact)."""
    marks = sorted({b for c in curves for b, _ in c})
    return [(m, float(sum(np.interp(m, [b for b, _ in c], [g for _, g in c]) for c in curves if c))) for m in marks]


SONG = midi_io.load(MIDI) if os.path.exists(MIDI) else None


def level_keys(track: str, offsets: dict[int, float], ramp: float = 0.03) -> list[tuple[float, float]]:
    """The Sonatina organ stops are uneven from key to key and ignore velocity: a ride that follows the notes
    and trims (or lifts) the loud (or weak) keys, measured one by one, so the line keeps one level."""
    if SONG is None:
        return []
    points: list[tuple[float, float]] = []
    last = 0.0
    by_start: dict[float, list[int]] = {}
    for n in SONG.tracks[track].notes:
        by_start.setdefault(round(n.start / BAR_SECONDS + 1, 4), []).append(n.pitch)
    for pos in sorted(by_start):
        off = float(np.mean([offsets.get(p, 0.0) for p in by_start[pos]]))
        if off != last:
            points += [(pos - ramp, last), (pos, off)]
            last = off
    return points


# levels of each key at the same velocity (LUFS of a held note): Open Diapason 59/60 -23.8, 62/63 -21.9, 66/67
# -20.1, 68 -21.4, 72 -17.9, 75 -19.4, 79 -24.3, 80 -21.7; Stopped Diapason 59–63 -34.7…-32.4, 66/67 -26.1,
# 68 -30.9; Gedact 59/60 -24.4, 62/63 -17.6, 66/67 -19.7, 68 -26.0
OPEN_KEYS = {66: -2.0, 67: -2.0, 72: -3.0, 75: -1.5}
STOPPED_KEYS = {66: -6.5, 67: -6.5, 68: -2.0}
GEDACT_KEYS = {59: 1.5, 60: 1.5, 62: -4.5, 63: -4.5, 66: -2.5, 67: -2.5, 68: 3.0}


def INTRO_LIFT(db: float) -> list[tuple[float, float]]:
    """The intro (bars 1–4) is the gallop and the pedal almost alone: lifted so that it is not quieter than B.
    Its copy in bars 53–56 gets the same lift (the points that close it belong to each part), so the seam
    56 → 1 does not move."""
    return [(1.0, db), (4.9, db), (5.0, 0.0)]


# VSCO's timpani has two hit layers some 20 dB apart (keys 36–43 switch at velocity 81, keys 44–47 at 61):
# the heartbeat of B (velocity ≤ 62) falls in the soft one except bar 27 (A♭2, velocity 61), which jumps to
# the hard one. These rides even it out to a soft but audible pulse (≈ -30 dB peaks before the bus) and keep
# the bridge growing from there (29–30 above B, 31 where the hard layer comes back).
HEARTBEAT = [(21.2, 0.0), (21.4, 4.0), (21.9, 4.0), (21.97, 12.0), (26.9, 12.0), (26.94, -11.0), (27.9, -11.0),
             (27.95, 12.0), (28.9, 12.0), (29.0, 14.0), (30.93, 14.0), (30.97, 0.0)]


# ── seating: pan (-1 left … 1 right), level, depth (hall send) and stereo width ──
# gain_db first evens out the libraries (the Sonatina organ stops differ by 20 dB and ignore velocity in
# some divisions; VCSL and VSCO sit far apart) and then sets the role: the hymn (choir, organ 8') on top,
# the gallop crisp and close, the hits short, the bells and the gong far back. Every part peaks under -6 dB
# before its bus (criterion 17).
PARTS = [
    # chorus: centre, wide, behind the orchestra; the whisper of B further back and a little left
    Part('Choir', sso('Chorus - Performance', 'Large Chorus'), 'coro', pan=0.0, gain_db=-2.5, send=0.40, width=1.0,
         automation=[(28.9, 0.0), (29.0, -3.0), (35.0, 0.0)]),  # the bridge opens from below: a longer crescendo
    Part('Choir Whisper', sso('Chorus - Performance', 'Mixed Chorus'), 'coro', pan=-0.10, gain_db=-3.0, send=0.55,
         width=0.9),
    # organ: the 8' manuals around the centre (unison with the choir), the swell Gedact distant
    Part('Organ 8', sso('Organ', 'Great - Open Diapason 8ft'), 'organo', pan=-0.10, gain_db=-16.0, send=0.42,
         width=0.8, automation=combine(ride((49, 52, 4.0)), level_keys('Organ 8', OPEN_KEYS))),
    # in 49–52 the hymn without choir: the organ carries it alone
    Part('Organ Stopped', sso('Organ', 'Great - Stopped Diapason 8ft'), 'organo', pan=0.10, gain_db=-11.0,
         send=0.42, width=0.8, automation=combine(ride((49, 52, 4.0)), level_keys('Organ Stopped', STOPPED_KEYS))),
    Part('Organ Gedact', sso('Organ', 'Swell - Gedact 8ft'), 'organo', pan=-0.30, gain_db=-10.0, send=0.58,
         width=0.7, automation=level_keys('Organ Gedact', GEDACT_KEYS)),
    # pedal 16': centre, the floor of the church
    Part('Organ Pedal', sso('Organ', 'Pedal - Bourdon 16ft'), 'pedal', pan=0.0, gain_db=-14.0, send=0.36, width=0.6,
         automation=INTRO_LIFT(3.0) + [(21.2, 0.0), (21.5, -6.0), (28.9, -6.0), (29.0, 0.0), (52.9, 0.0), (53.0, 3.0)]),
    # lifted in the intro texture (1–4 and its return in 53–56), lowered in B under the Gedact's retrograde
    Part('Organ Violon', sso('Organ', 'Pedal - Violon 16ft'), 'pedal', pan=0.05, gain_db=-27.0, send=0.36,
         width=0.6),
    # horns: left and back
    Part('Horns Marc', sso('Brass - Performance', 'Horns Marcato'), 'trompas', pan=-0.30, gain_db=-10.0, send=0.42,
         width=0.7, automation=ride((29, 32, 1.5), (29, 44, 1.0))),  # the melody of the bridge (over the choir) and the climax
    Part('Horns', sso('Brass - Performance', 'Horns Sustain'), 'trompas', pan=-0.30, gain_db=-10.0, send=0.44,
         width=0.7),
    # trombones and tuba: centre-right
    Part('Trombones Marc', sso('Brass - Performance', 'Trombones Marcato'), 'trombones', pan=0.25, gain_db=-9.0,
         send=0.32, width=0.7, automation=ride((29, 44, -1.5))),  # 8vb doubling: under the horns
    Part('Tuba Marc', sso('Brass - Performance', 'Tuba Marcato'), 'tuba', pan=0.30, gain_db=-9.0, send=0.30,
         width=0.5),
    # strings: cellos right, the basses' gallop centre-right and close (it has to stay crisp)
    Part('Celli Trem', sso('Strings - Performance', 'Celli Tremolo'), 'chelos', pan=0.15, gain_db=-9.0, send=0.28),
    Part('Gallop', vsco('ContrabassSpic'), 'galope', pan=0.35, gain_db=-6.5, send=0.20, width=0.6,
         automation=INTRO_LIFT(6.5) + [(48.9, 0.0), (49.0, -2.0), (52.5, -2.0), (53.0, 6.5)]),  # under the organ's hymn
    Part('Gallop 8va', vsco('CelloEnsSpic'), 'galope', pan=-0.20, gain_db=-4.0, send=0.22, width=0.7),
    # woodwind: the contrabassoon's breath, centre, a little back
    Part('Contrabassoon', sso('Woodwinds - Performance', 'Contrabassoon Solo Sustain (looped)'), 'fagot',
         pan=0.10, gain_db=-8.0, send=0.34, width=0.5),
    # timpani and percussion: at the back
    Part('Timpani', vsco('Timpani'), 'timbales', pan=-0.10, gain_db=1.5, send=0.40, width=0.6,
         automation=INTRO_LIFT(2.0) + HEARTBEAT + [(52.9, 0.0), (53.0, 2.0)]),
    Part('Timp Roll', vsco('TimpaniRolls'), 'timbales', pan=-0.10, gain_db=6.0, send=0.42, width=0.6),
    Part('Bass Drum', vcsl('Membranophones/Struck Membranophones', 'Bass Drum 2'), 'tambores', pan=0.0,
         gain_db=-8.0, send=0.38, width=0.5, automation=[(21.2, 0.0), (21.4, 6.0), (28.9, 6.0), (29.0, 0.0)]),
    Part('Tom', vcsl('Membranophones/Struck Membranophones', 'Tom 2'), 'tambores', pan=0.15, gain_db=-8.0,
         send=0.40, width=0.5),
    Part('Bell', vcsl('Idiophones/Struck Idiophones', 'Tubular Bells 1'), 'campanas', pan=-0.20, gain_db=-4.0,
         send=0.52, width=0.7),
    Part('Gong', vcsl('Idiophones/Struck Idiophones', 'Gong 1'), 'gong', pan=0.25, gain_db=-3.0, send=0.52,
         width=0.8),
    Part('Glass', vcsl('Idiophones/Friction Idiophones', 'Wine Glasses - Slow'), 'campanas', pan=-0.35,
         gain_db=5.0, send=0.55, width=0.7),
]

# ── subtractive EQ per bus: high-pass all but the 16' and the gallop (and those just under their lowest
# fundamental), mud out at 250–350 Hz where the pedal, trombones, cellos and male choir pile up, a dip in
# 2.5–4 kHz for the game's SFX and soft highs (no bite anywhere) ──
BUSES = {
    'coro': {'highpass': 100, 'peaks': [(300, -3.0, 1.0), (3000, -2.0, 1.0)], 'high_shelf': (7000, -3.0)},
    'organo': {'highpass': 110, 'peaks': [(300, -2.5, 1.0), (500, -1.5, 1.2)], 'high_shelf': (6000, -3.0)},
    'pedal': {'highpass': 45, 'low_shelf': (60, -14.0), 'peaks': [(250, -2.0, 1.0)], 'high_shelf': (3000, -3.0)},
    'trompas': {'highpass': 90, 'peaks': [(300, -2.5, 1.0), (2600, -2.5, 1.0)], 'high_shelf': (6000, -3.0),
                'comp': (-18, 1.5)},
    'trombones': {'highpass': 70, 'peaks': [(300, -2.0, 1.0), (3000, -3.0, 1.0)], 'high_shelf': (6000, -3.0),
                  'comp': (-20, 1.6)},
    'tuba': {'highpass': 35, 'peaks': [(230, -2.0, 1.0)], 'high_shelf': (4000, -3.0)},
    'chelos': {'highpass': 55, 'peaks': [(250, -2.5, 1.0), (3000, -2.0, 1.0)], 'high_shelf': (6000, -3.0)},
    'galope': {'highpass': 40, 'peaks': [(300, -2.0, 1.0), (3200, -3.0, 1.0)], 'high_shelf': (5000, -3.0)},
    'fagot': {'highpass': 28, 'peaks': [(260, -2.0, 1.0)], 'high_shelf': (5000, -3.0)},
    'timbales': {'highpass': 40, 'peaks': [(300, -2.0, 1.0)], 'high_shelf': (5000, -3.0)},
    'tambores': {'highpass': 65, 'low_shelf': (70, -6.0), 'peaks': [(46, -6.0, 1.5), (320, -3.0, 1.0), (3500, -4.0, 1.0)],
                 'high_shelf': (5000, -4.0)},
    'campanas': {'highpass': 300, 'peaks': [(3000, -3.0, 1.0)], 'high_shelf': (6000, -4.0)},
    'gong': {'highpass': 50, 'peaks': [(3500, -4.0, 0.8)], 'high_shelf': (6000, -5.0)},
}

# brief §8 criterion 15 spans
SECTIONS = {'intro 1-4': (1, 4), 'A 5-12': (5, 12), "A' 13-20": (13, 20), 'golpe 21': (21, 21),
            'B 22-28': (22, 28), 'puente 29-30': (29, 30), 'puente 35-36': (35, 36), 'clímax 37-44': (37, 44),
            'clímax 45-48': (45, 48), 'c46': (46, 46), 'codetta 49-56': (49, 56)}

SPEC = render.MixSpec(
    midi=MIDI, out=OUT, bpm=BPM, beats_per_bar=BEATS, bars=BARS, parts=PARTS, buses=BUSES,
    reverb={'seconds': 2.4, 'predelay': 0.03, 'damping': 0.5}, reverb_return_db=-4.8,
    reverb_eq={'highpass': 160, 'peaks': [(350, -2.5, 0.8)], 'high_shelf': (6000, -3.0)},  # no muddy or hissy hall
    master_bus={'highpass': 28, 'comp': (-18, 1.5)},
    target_lufs=-16.5, ceiling_dbtp=-1.0, tail_seconds=4.0, sections=SECTIONS,
)


# ── how hard the master limiter works (criterion 17): wraps mix.master to see its input ──
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
        bars: list[tuple[int, float]] = []
        for i in np.argsort(gr)[::-1]:
            b = int(t[i] // BAR_SECONDS) + 1
            if gr[i] < 0.5 or len(bars) >= 6:
                break
            if b not in [x for x, _ in bars]:
                bars.append((b, round(float(gr[i]), 1)))
        bar21 = [g for g, ti in zip(gr, t) if 20 * BAR_SECONDS <= ti < 21 * BAR_SECONDS]
        LIMITER.update(max_db=round(float(gr.max()), 1), bars=bars,
                       bar21_db=round(float(max(bar21)) if bar21 else 0.0, 1))
        return out
    return wrapped


render.mix.master = _watch_master(mix.master)


# ── measures of an MP3 (the new build decoded, previous build, references) ─────────────────
def decode(path: str) -> np.ndarray:
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', '44100', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def measure(path: str, sections: dict[str, tuple[int, int]] | None = None) -> dict:
    x, sr = decode(path), 44100
    bar = BAR_SECONDS * sr
    out = {'samples': len(x), 'lufs': round(mix.lufs(x, sr), 2), 'true_peak_db': round(mix.true_peak_db(x, sr), 2),
           'seam_jump': round(mix.seam_jump(x), 4),
           'bands_db': {k: round(v, 1) for k, v in mix.band_energy(x, sr).items()}}
    if sections:
        out['sections_lufs'] = {name: round(mix.lufs(x[int(round((a - 1) * bar)): int(round(b * bar))], sr), 1)
                                for name, (a, b) in sections.items()}
    return out


def checks(r: dict, mp3: dict) -> list[tuple[str, bool, str]]:
    b, s, p = mp3['bands_db'], mp3['sections_lufs'], r['parts']
    climax_b = s['clímax 45-48'] - s['B 22-28']
    wake = s['puente 35-36'] - s['puente 29-30']
    climax_a = s['clímax 45-48'] - s['A 5-12']
    loudest = max(p, key=lambda k: p[k]['pico_db'])
    lim = r.get('limitador', {})
    return [
        ('13 sonoridad -16,5 ± 0,5 LUFS', abs(mp3['lufs'] + 16.5) <= 0.5, f"{mp3['lufs']} LUFS"),
        ('13 pico real ≤ -1 dBTP', mp3['true_peak_db'] <= -1.0, f"{mp3['true_peak_db']} dBTP"),
        ('14 loop_samples = 4 116 000', r['loop_samples'] == LOOP_SAMPLES and mp3['samples'] == LOOP_SAMPLES,
         f"{r['loop_samples']} (MP3 decodificado: {mp3['samples']})"),
        ('14 seam_jump < 0,02', mp3['seam_jump'] < 0.02, str(mp3['seam_jump'])),
        ('15 clímax 45-48 vs B 22-28 en +9…+15 LU', 9 <= climax_b <= 15, f'{climax_b:+.1f} LU'),
        ('15 B 22-28 en -30…-23 LUFS', -30 <= s['B 22-28'] <= -23, f"{s['B 22-28']} LUFS"),
        ('15 puente 35-36 vs 29-30 ≥ +4 LU', wake >= 4, f'{wake:+.1f} LU'),
        ('15 clímax 45-48 vs A 5-12 en +1,5…+4 LU', 1.5 <= climax_a <= 4, f'{climax_a:+.1f} LU'),
        ('16 presencia 2.5-6k ≤ -18 dB', b['presencia 2.5-6k'] <= -18, str(b['presencia 2.5-6k'])),
        ('16 aire 6-16k ≤ -30 dB', b['aire 6-16k'] <= -30, str(b['aire 6-16k'])),
        ('16 sub <60 ≤ -17 dB', b['sub <60'] <= -17, str(b['sub <60'])),
        ('17 ninguna parte > -6 dB de pico', p[loudest]['pico_db'] <= -6, f"{loudest} {p[loudest]['pico_db']} dB"),
        ('17 limitador en el golpe del c. 21 ≤ 3 dB', lim.get('bar21_db', 99) <= 3,
         f"{lim.get('bar21_db')} dB (máximo {lim.get('max_db')} dB en c. {lim.get('bars')})"),
        ('18 sala wet_dry_lu en -7…-4', -7 <= r['wet_dry_lu'] <= -4, f"{r['wet_dry_lu']} LU"),
    ]


def main() -> int:
    previous = json.load(open(REPORT)) if os.path.exists(REPORT) else None
    report = render.render(SPEC)
    report['limitador'] = dict(LIMITER)
    mp3 = measure(OUT, SECTIONS)
    report['mp3'] = mp3
    with open(REPORT, 'w') as f:
        json.dump(report, f, indent=1, ensure_ascii=False)

    print(f"{report['out']}\n  {report['seconds']} s · loop_samples {report['loop_samples']}")
    print(f"  MP3 decodificado: {mp3['lufs']} LUFS · {mp3['true_peak_db']} dBTP · seam_jump {mp3['seam_jump']} · "
          f"{mp3['samples']} muestras")
    print(f"  sala {report['wet_dry_lu']} LU respecto a la señal directa · limitador hasta {LIMITER.get('max_db')} dB "
          f"(c. {LIMITER.get('bars')}; c. 21: {LIMITER.get('bar21_db')} dB)")
    prev_parts = previous['parts'] if previous else {}
    print('\nPartes (tras gain_db, antes de bus):          pico dB   LUFS' + ('    (antes pico / LUFS)' if previous else ''))
    for name, p in report['parts'].items():
        line = f'  {name:24s} {p["notas"]:4d} notas   {p["pico_db"]:6.1f}  {p["lufs"]:6.1f}'
        if name in prev_parts:
            line += f'    ({prev_parts[name]["pico_db"]:6.1f} / {prev_parts[name]["lufs"]:6.1f})'
        print(line)
    prev_sections = (previous.get('mp3') or {}).get('sections_lufs', {}) if previous else {}
    print('\nSecciones (LUFS sobre el MP3):')
    for name, v in mp3['sections_lufs'].items():
        before = prev_sections.get(name)
        print(f'  {name:16s} {v:6.1f}' + (f'   (antes {before:6.1f})' if before is not None else ''))
    refs = {k: measure(path) for k, path in REFERENCES.items() if os.path.exists(path)}
    prev_bands = (previous.get('mp3') or previous)['bands_db'] if previous else None
    print('\nBandas dB (rel. al total)      nueva   ' + ('anterior   ' if prev_bands else '')
          + '   '.join(f'{k:>7s}' for k in refs))
    for k, v in mp3['bands_db'].items():
        line = f'  {k:24s} {v:7.1f}'
        if prev_bands:
            line += f'   {prev_bands[k]:7.1f}'
        for ref in refs.values():
            line += f'   {ref["bands_db"][k]:7.1f}'
        print(line)
    if previous:
        pm = previous.get('mp3') or previous
        print(f"\nAnterior: {pm['lufs']} LUFS · {pm['true_peak_db']} dBTP · seam {pm['seam_jump']}")
    for k, ref in refs.items():
        print(f"{k} ({os.path.relpath(REFERENCES[k], ROOT)}): {ref['samples']} muestras · {ref['lufs']} LUFS · "
              f"{ref['true_peak_db']} dBTP · seam {ref['seam_jump']}")
    print('\nCriterios del brief:')
    results = checks(report, mp3)
    for label, ok, value in results:
        print(f"  [{'ok' if ok else 'FALLA'}] {label}: {value}")
    return 0 if all(ok for _, ok, _ in results) else 1


if __name__ == '__main__':
    sys.exit(main())
