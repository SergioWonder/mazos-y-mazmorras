"""El Contemplador's boss theme «Mirada del abismo / Caos cromático» (cap3-e1-jefe): mix and master
(brief: docs/musica/acto3-contemplador.md, section 8 criteria 17-22).

Reads build/acto3-contemplador.mid (written by compose.py), renders it with the band (distorted guitar,
picked bass, kit), Sonatina's choirs and the code-generated synths (estudio/synths.py), masters it as a
seamless loop (-16.5 LUFS, -1 dBTP) and writes build/acto3-contemplador.mp3 and its JSON report. Prints
the report, the brief checks (measured on the decoded MP3) and a comparison with the previous build and
with the two approved sketches.

The loop has three metres, so the MixSpec counts in beats (beats_per_bar=1, bars=188): sections and
fader rides are written in bars of the score and converted with `beats()`.

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/acto3-contemplador/mix.py
"""
from __future__ import annotations

import json
import os
import subprocess
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))

import compose  # noqa: E402
from estudio import mix, render  # noqa: E402
from estudio.render import Part  # noqa: E402

NAME = 'acto3-contemplador'
MIDI = compose.OUT
OUT = os.path.join(HERE, 'build', NAME + '.mp3')
REPORT = os.path.join(HERE, 'build', NAME + '.report.json')
SKETCHES = {k: os.path.join(ROOT, 'scripts', 'musica', 'leitmotivs', 'build', f'acto3-jefe-contemplador-{k}.mp3')
            for k in ('1-mirada-del-abismo', '2-caos-cromatico')}
SR = 44100
BPM = 140
TOTAL_BEATS = 188
LOOP_SAMPLES = 3553200                      # 188 beats × 60/140 s × 44 100 (18 900 samples per beat)
BEAT_SAMPLES = SR * 60 / BPM


def beats(first_bar: int, last_bar: int) -> tuple[int, int]:
    """Score bars -> MixSpec 'bars' (1-based beats), inclusive."""
    return int(compose.BAR_BEAT[first_bar]) + 1, int(compose.BAR_BEAT[last_bar + 1])


def ride(*segments: tuple[int, int, float], ramp: float = 0.25) -> list[tuple[float, float]]:
    """Fader rides in score bars: each (first bar, last bar, dB), short ramps (in beats) at the edges."""
    pts = []
    for first, last, db in segments:
        a, b = compose.BAR_BEAT[first] + 1, compose.BAR_BEAT[last + 1] + 1
        pts += [(a - ramp, 0.0), (a, db), (b - ramp, db), (b, 0.0)]
    return sorted(pts)


# ── seating: track → (bus, pan, hall send, stereo width) ──
# Rhythm guitars hard-ish left and right, bass, kit, sub and drop in the middle; the supersaw lead a little
# right and forward, the pad wide and back, the pluck and the glitch on opposite sides; the growl in the
# middle like a singer; the choirs either side of centre, far back.
SEATS = {
    'Guitar': ('guitarras', -0.35, 0.08, 0.5), 'Guitar 2': ('guitarras', 0.35, 0.08, 0.5),
    'Bass': ('bajo', 0.0, 0.05, 0.3), 'Drums': ('bateria', 0.0, 0.10, 1.0),
    'Sub': ('sub', 0.0, 0.0, 0.0), 'Drop': ('sub', 0.0, 0.05, 0.0),
    'Saw Lead': ('synth', 0.10, 0.30, 0.8), 'Saw Pad': ('synth', -0.10, 0.45, 1.0),
    'Pluck': ('synth', 0.25, 0.35, 1.0), 'Glitch': ('synth', -0.25, 0.15, 0.8),
    'Growl': ('voz', 0.0, 0.25, 0.5),
    'Choir': ('coro', -0.10, 0.45, 1.0), 'Choir Low': ('coro', 0.10, 0.45, 1.0),
    'FX': ('sfx', 0.0, 0.40, 1.0),
}
# ── levels (dB before the bus): the sketch's balance, synths kept clearly above the guitars' wall ──
GAIN = {'Guitar': -7.0, 'Guitar 2': -8.0, 'Bass': -3.0, 'Drums': -1.0, 'Sub': -5.0, 'Drop': -9.0,
        'Saw Lead': 0.0, 'Saw Pad': -5.0, 'Pluck': 5.0, 'Glitch': -3.0, 'Growl': -2.0,
        'Choir': 0.0, 'Choir Low': 2.0, 'FX': -2.0}
TRIM_DB = -11.0                             # headroom: no part over -6 dB peak before its bus (criterion 22)
# Fader rides. The pluck swells in from far away as in the sketch (there its CC1 curve acted as volume; here
# CC1 opens its filter, and this ride gives back the swell). The band steps back in the verses and forward
# in the climax, so the chorus lifts and the climax is the one peak.
PLUCK_SWELL = [(1, -14.0), (beats(3, 3)[0], -6.0), (beats(4, 4)[1] + 1, 0.0)]
BAND_RIDE = ride((3, 4, -3.0), (5, 12, -1.5), (34, 37, 0.5), (38, 41, 1.0))
AUTOMATION = {
    'Saw Pad': compose.pump_points(),        # the sidechain pumping of the 7/8
    'Pluck': PLUCK_SWELL,
    'Guitar': BAND_RIDE, 'Guitar 2': BAND_RIDE, 'Bass': BAND_RIDE, 'Drums': BAND_RIDE,
    'Sub': ride((3, 4, -4.0)),               # the intro's pulse arrives softly
}

# ── buses: the sketch's, with the Laberinto's cuts in 3-5 kHz on the band and one on the synths ──
BUSES = {
    'guitarras': {'highpass': 70, 'peaks': [(250, -2.0, 1.0), (3200, -7.0, 1.0), (4800, -4.0, 1.2)],
                  'high_shelf': (6000, -6.0), 'comp': (-18, 2.0)},
    'bajo': {'highpass': 35, 'peaks': [(800, -2.0, 1.0)], 'high_shelf': (3000, -6.0)},
    'bateria': {'highpass': 35, 'peaks': [(400, -2.0, 1.0), (3500, -6.0, 0.9)], 'high_shelf': (6000, -6.0),
                'comp': (-16, 1.8)},
    'sub': {'highpass': 30, 'peaks': [(140, -2.0, 1.0)], 'high_shelf': (400, -12.0)},   # 24 Hz in the sketch
    'synth': {'highpass': 40, 'peaks': [(350, -2.0, 1.0), (3500, -4.0, 0.9)], 'high_shelf': (6500, -5.0),
              'comp': (-18, 2.0)},
    'voz': {'highpass': 60, 'peaks': [(300, -3.0, 1.0), (2800, 2.0, 1.0)], 'high_shelf': (6000, -4.0),
            'comp': (-20, 2.5)},
    'coro': {'highpass': 110, 'peaks': [(300, -2.0, 1.0), (3000, -4.0, 1.0)], 'high_shelf': (6000, -4.0)},
    'sfx': {'highpass': 40, 'high_shelf': (7000, -4.0)},   # 30 Hz in the sketch: the impact's boom stays above the drops
}
REVERB = {'seconds': 1.8, 'predelay': 0.02, 'damping': 0.55}
REVERB_EQ = {'highpass': 140, 'peaks': [(350, -3.0, 0.8)], 'high_shelf': (6000, -3.0)}
REVERB_RETURN_DB = -5.0
MASTER_BUS = {'highpass': 28, 'comp': (-18, 1.5)}
TARGET_LUFS = -16.5

FORM = {'intro 1-4': (1, 4), 'verso 5-8': (5, 8), 'verso II 9-12': (9, 12), 'estribillo 13-16': (13, 16),
        'parada 17': (17, 17), 'breakdown 18-21': (18, 21), 'caos 22-29': (22, 29), 'medio tiempo 30-33': (30, 33),
        'climax 34-37': (34, 37), 'climax 38-41': (38, 41), 'blast 42-43': (42, 43), 'tormenta 44-47': (44, 47)}
EXTRA = {'intro 2-3': (2, 3), 'c39': (39, 39)}
SECTIONS_BARS = {**FORM, **EXTRA}
SECTIONS = {name: beats(a, b) for name, (a, b) in SECTIONS_BARS.items()}


def parts() -> list[Part]:
    return [Part(track, compose.SFZ_OF[track], bus, pan=pan, gain_db=GAIN[track] + TRIM_DB, send=send, width=width,
                 automation=AUTOMATION.get(track, []))
            for track, (bus, pan, send, width) in SEATS.items()]


def spec() -> render.MixSpec:
    return render.MixSpec(
        midi=MIDI, out=OUT, bpm=BPM, beats_per_bar=1, bars=TOTAL_BEATS, parts=parts(), buses=BUSES,
        reverb=REVERB, reverb_return_db=REVERB_RETURN_DB, reverb_eq=REVERB_EQ, master_bus=MASTER_BUS,
        target_lufs=TARGET_LUFS, ceiling_dbtp=-1.0, tail_seconds=4.0, sections=SECTIONS)


# ── measures of the MP3 ──────────────────────────────────────────────────────
def decode(path: str) -> np.ndarray:
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def section_lufs(x: np.ndarray) -> dict[str, float]:
    return {name: round(mix.lufs(x[int(round((a - 1) * BEAT_SAMPLES)): int(round(b * BEAT_SAMPLES))], SR), 1)
            for name, (a, b) in SECTIONS.items()}


def bar_lufs(x: np.ndarray) -> list[float]:
    out = []
    for bar in range(1, compose.BARS + 1):
        a, b = beats(bar, bar)
        out.append(round(mix.lufs(x[int(round((a - 1) * BEAT_SAMPLES)): int(round(b * BEAT_SAMPLES))], SR), 1))
    return out


def measure(x: np.ndarray, sections: bool = True) -> dict:
    out = {'samples': len(x), 'lufs': round(mix.lufs(x, SR), 2), 'true_peak_db': round(mix.true_peak_db(x, SR), 2),
           'seam_jump': round(mix.seam_jump(x), 4), 'bands_db': {k: round(v, 1) for k, v in mix.band_energy(x, SR).items()}}
    if sections:
        out['sections_lufs'] = section_lufs(x)
    return out


def checks(r: dict) -> list[tuple[str, bool, str]]:
    s, b, p = r['sections_lufs'], r['bands_db'], r['parts']
    chorus = s['estribillo 13-16']
    loudest = max(FORM, key=lambda k: s[k])
    worst = max(p.items(), key=lambda kv: kv[1]['pico_db'])
    return [
        ('17 -16,5 ± 0,5 LUFS', abs(r['lufs'] - TARGET_LUFS) <= 0.5, f"{r['lufs']} LUFS"),
        ('17 pico real ≤ -1 dBTP', r['true_peak_db'] <= -1.0, f"{r['true_peak_db']} dBTP"),
        ('18 loop_samples = 3 553 200 (y en el MP3)', r['loop_samples'] == LOOP_SAMPLES == r['decoded_samples'],
         f"{r['loop_samples']} / {r['decoded_samples']}"),
        ('18 seam_jump < 0,02', r['seam_jump'] < 0.02, str(r['seam_jump'])),
        ('19 intro c. 2-3 ≥ 6 LU bajo el estribillo', s['intro 2-3'] <= chorus - 6, f"{s['intro 2-3'] - chorus:+.1f} LU"),
        ('19 parada c. 17 ≥ 4 LU bajo el estribillo', s['parada 17'] <= chorus - 4, f"{s['parada 17'] - chorus:+.1f} LU"),
        ('19 clímax 38-41 la sección más fuerte', loudest == 'climax 38-41', f'la más fuerte: {loudest} {s[loudest]}'),
        ('19 clímax 38-41 − estribillo en +0,5…+4 LU', 0.5 <= s['climax 38-41'] - chorus <= 4,
         f"{s['climax 38-41'] - chorus:+.1f} LU"),
        ('20 presencia 2.5-6k ≤ -19 dB', b['presencia 2.5-6k'] <= -19, str(b['presencia 2.5-6k'])),
        ('20 aire 6-16k ≤ -34 dB', b['aire 6-16k'] <= -34, str(b['aire 6-16k'])),
        ('20 sub <60 ≤ -12 dB', b['sub <60'] <= -12, str(b['sub <60'])),
        ('21 Saw Lead a ≤ 6 LU de Guitar', p['Saw Lead']['lufs'] >= p['Guitar']['lufs'] - 6,
         f"{p['Saw Lead']['lufs'] - p['Guitar']['lufs']:+.1f} LU"),
        ('21 Pluck a ≤ 8 LU de Guitar', p['Pluck']['lufs'] >= p['Guitar']['lufs'] - 8,
         f"{p['Pluck']['lufs'] - p['Guitar']['lufs']:+.1f} LU"),
        ('22 ninguna parte > -6 dB de pico', worst[1]['pico_db'] <= -6, f'{worst[0]} {worst[1]["pico_db"]} dB'),
    ]


def print_report(report: dict, previous: dict | None) -> None:
    print(f"\n══ {report['out']}\n  {report['seconds']} s · loop_samples {report['loop_samples']}")
    pre = report['antes_del_mp3']
    print(f"  MP3: {report['lufs']} LUFS · {report['true_peak_db']} dBTP · seam_jump {report['seam_jump']} · "
          f"sala {report['wet_dry_lu']} LU respecto a la señal directa")
    print(f"  (antes de codificar: {pre['lufs']} LUFS · {pre['true_peak_db']} dBTP · seam_jump {pre['seam_jump']})")
    print('  Partes (tras gain_db, antes de bus):     pico dB   LUFS' + ('   (antes pico / LUFS)' if previous else ''))
    for name, q in report['parts'].items():
        line = f'    {name:12s} {q["notas"]:5d} notas  {q["pico_db"]:6.1f}  {q["lufs"]:6.1f}'
        if previous and name in previous['parts']:
            o = previous['parts'][name]
            line += f'   ({o["pico_db"]:6.1f} / {o["lufs"]:6.1f})'
        print(line)
    print('  Secciones (LUFS sobre el máster):')
    for name, val in report['sections_lufs'].items():
        before = previous['sections_lufs'].get(name) if previous else None
        print(f'    {name:20s} {val:6.1f}' + (f'   (antes {before:6.1f})' if before is not None else ''))
    print('  Compases: ' + ' '.join(f'{x:.0f}' for x in report['bars_lufs']))
    if previous:
        print(f"  Anterior: {previous['lufs']} LUFS · {previous['true_peak_db']} dBTP · seam {previous['seam_jump']}")


def main() -> int:
    previous = json.load(open(REPORT)) if os.path.exists(REPORT) else None
    report = render.render(spec())
    keys = ('lufs', 'true_peak_db', 'seam_jump', 'bands_db', 'sections_lufs')
    report['antes_del_mp3'] = {k: report[k] for k in keys}
    x = decode(OUT)
    decoded = measure(x)
    report.update({k: decoded[k] for k in keys})
    report['decoded_samples'] = decoded['samples']
    report['bars_lufs'] = bar_lufs(x)
    with open(REPORT, 'w') as f:
        json.dump(report, f, indent=1, ensure_ascii=False)
    print_report(report, previous)

    refs = {k: measure(decode(p), sections=False) for k, p in SKETCHES.items() if os.path.exists(p)}
    print('\nBandas dB (rel. al total)    pista' + ''.join(f'  {k[:20]:>20s}' for k in refs))
    for k in report['bands_db']:
        print(f"  {k:24s} {report['bands_db'][k]:7.1f}" + ''.join(f"  {m['bands_db'][k]:20.1f}" for m in refs.values()))

    print('\nCriterios del brief:')
    results = checks(report)
    for label, ok, value in results:
        print(f"  [{'ok' if ok else 'FALLA'}] {label}: {value}")
    return 0 if all(ok for _, ok, _ in results) else 1


if __name__ == '__main__':
    sys.exit(main())
