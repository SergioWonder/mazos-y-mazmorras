"""«Fractura» (El Laberinto del Contemplador, Act III): mix and master of the two synchronized
versions (brief: docs/musica/acto3-laberinto.md, section 8 criteria 15-22).

Reads build/acto3-laberinto-explora.mid and build/acto3-laberinto-combate.mid (written by compose.py),
renders each with its own MixSpec over one shared hall, one shared seating and one set of buses,
masters them as seamless loops (exploration -17.5 LUFS, combat -16.5 LUFS, -1 dBTP) and writes
build/acto3-laberinto-explora.mp3 and build/acto3-laberinto-combate.mp3 with their JSON reports.
Then builds the crossfade test build/acto3-laberinto-cruce.mp3 the way the game does it
(src/fx/audio.ts, cruzarVersion: same loop position, linear 1.6 s fade): exploration 0-24 s,
combat from 24 s (bar 8), exploration again from 54.86 s (bar 17), and measures its short-term
loudness against the two versions.

Prints the reports, the brief checks and a comparison with the previous build and with the approved
sketches (scripts/musica/leitmotivs/build/acto3-ojo-1-fractura.mp3, acto3-laberinto-combate-*.mp3).

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/acto3-laberinto/mix.py
"""
from __future__ import annotations

import json
import os
import subprocess
import sys

import numpy as np
import pyloudnorm

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(HERE, '..'))

from estudio import config, midi_io, mix, render, sampler  # noqa: E402
from estudio.render import Part  # noqa: E402

BUILD = os.path.join(HERE, 'build')
VERSIONS = ('explora', 'combate')
MIDI = {v: os.path.join(BUILD, f'acto3-laberinto-{v}.mid') for v in VERSIONS}
OUT = {v: os.path.join(BUILD, f'acto3-laberinto-{v}.mp3') for v in VERSIONS}
REPORT = {v: os.path.join(BUILD, f'acto3-laberinto-{v}.report.json') for v in VERSIONS}
CROSS_OUT = os.path.join(BUILD, 'acto3-laberinto-cruce.mp3')
CROSS_REPORT = os.path.join(BUILD, 'acto3-laberinto-cruce.report.json')
SKETCHES = {name: os.path.join(ROOT, 'scripts', 'musica', 'leitmotivs', 'build', f'acto3-{name}.mp3')
            for name in ('ojo-1-fractura', 'laberinto-combate-asalto', 'laberinto-combate-espiral')}
SR = 44100
BPM, BEATS, BARS = 70, 4, 24
BAR_SECONDS = BEATS * 60 / BPM
LOOP_SAMPLES = 3628800                     # 24 bars × 4 beats × 60/70 s × 44 100
TARGET_LUFS = {'explora': -17.5, 'combate': -16.5}

SSO = 'sso/Sonatina Symphonic Orchestra'
GUITAR = 'electric-guitar-FSBS-dist1/EGuitarFSBS-dist1 bridge 20220911.sfz'
CHOIR_LARGE = f'{SSO}/Chorus - Performance/Large Chorus.sfz'


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


# ── seating, shared by both versions: track → (sfz, bus, pan, hall send, stereo width) ──
# The double-tracked rhythm guitars left and right, the bass and the kit in the centre, the lead a
# little right of centre; the big choir left of centre and the low choir right, the pad in the middle
# and wide; organ right and back; glasses left and celesta right, far back in the hall.
SEATS = {
    # common layers (criterion 21: identical in both versions, same gain, linear buses)
    'Choir Pad': (f'{SSO}/Chorus - Performance/Mixed Chorus.sfz', 'pad', 0.0, 0.50, 1.0),
    'Glasses': ('VCSL/Idiophones/Friction Idiophones/Wine Glasses - Slow.sfz', 'brillos', -0.30, 0.55, 0.8),
    'Celesta': (f'{SSO}/Percussion/Celeste.sfz', 'brillos', 0.30, 0.50, 0.8),
    # in both versions with their own notes and level
    'Choir': (CHOIR_LARGE, 'coro', -0.15, 0.40, 1.0),
    'Organ': (f'{SSO}/Organ/Great - Open Diapason 8ft.sfz', 'organo', 0.20, 0.40, 0.8),
    'Guitar': (GUITAR, 'guitarras', -0.35, 0.10, 0.5),
    'Guitar 2': (GUITAR, 'guitarras', 0.35, 0.10, 0.5),
    'Bass': ('electric-bass-YR/PickedBassYR 20190930.sfz', 'bajo', 0.0, 0.06, 0.3),
    'Drums': ('virtuosity_drums/Programs/01-basic-kit.sfz', 'bateria', 0.0, 0.12, 1.0),
    # combat only
    'Lead': (GUITAR, 'solista', 0.15, 0.25, 0.5),
    'Choir Low': (CHOIR_LARGE, 'coro', 0.10, 0.45, 1.0),
}
COMMON = ('Choir Pad', 'Glasses', 'Celesta')

# ── levels (gain_db, before the bus); starting points from the sketches' parts ──
COMMON_GAIN = {'Choir Pad': 2.0, 'Glasses': 3.0, 'Celesta': 9.5}   # the celesta carries the motif in A
GAIN = {
    'explora': {'Choir': 6.0, 'Organ': -14.0, 'Guitar': -6.0, 'Guitar 2': -6.0, 'Bass': -2.0, 'Drums': -2.0},
    'combate': {'Choir': 4.5, 'Organ': -13.0, 'Guitar': -5.0, 'Guitar 2': -5.0, 'Bass': -2.0, 'Drums': -1.5,
                'Lead': 1.5, 'Choir Low': -1.0},
}
# Fader rides. Exploration: the organ's D2 pedal stays far under the glasses and the celesta in the intro,
# A and coda (the same value at both ends of the seam), comes forward where it carries the tritone motif (C)
# and steps back under the choir's motif in the climax.
# The exploration's band sits a step back in its riffs and further back in the climax (the map never
# outshouts the fight); the choir that sings the motif over it does not. Combat: the climax pushes (and its blast of bar 21 most), the blast of
# bar 17 stays a step under it.
BAND_CALM = ride((7, 18, -2.0), (19, 22, -4.5))
CLIMAX_PUSH = ride((17, 17, -1.5), (19, 22, 1.0), (21, 21, 1.0))
AUTOMATION: dict[str, dict[str, list[tuple[float, float]]]] = {
    'explora': {'Organ': ride((1, 6, -10.0), (11, 14, 5.0), (19, 22, -3.0), (23, 24, -10.0)),
                'Guitar': BAND_CALM, 'Guitar 2': BAND_CALM, 'Drums': BAND_CALM, 'Bass': BAND_CALM},
    'combate': {'Guitar': CLIMAX_PUSH, 'Guitar 2': CLIMAX_PUSH, 'Drums': CLIMAX_PUSH, 'Bass': CLIMAX_PUSH},
}

TRACKS = {v: list(COMMON) + list(GAIN[v]) for v in VERSIONS}  # common layers first: same sampler state in both

# ── one set of buses for both versions: high-pass all but the low end, mud out at 250-400 Hz, a dip in
# 3-3.5 kHz for the game's SFX, soft highs (no pinging tops). The buses of the common layers (pad,
# brillos) are linear (no compressor). ──
BUSES = {
    'pad': {'highpass': 110, 'peaks': [(300, -2.0, 1.0), (3000, -3.0, 1.0)], 'high_shelf': (7000, -3.0)},
    'brillos': {'highpass': 300, 'peaks': [(3000, -2.0, 1.0)], 'high_shelf': (6000, -4.0)},
    'coro': {'highpass': 110, 'peaks': [(300, -2.0, 1.0), (3000, -4.0, 1.0)], 'high_shelf': (6000, -4.0)},
    'organo': {'highpass': 30, 'peaks': [(300, -2.0, 1.0)], 'high_shelf': (5000, -3.0)},
    'guitarras': {'highpass': 70, 'peaks': [(250, -2.0, 1.0), (3200, -7.0, 1.0), (4800, -4.0, 1.2)],
                  'high_shelf': (6000, -6.0), 'comp': (-18, 2.0)},
    # the lead's sustained distortion is the brightest thing in the song: a dark lead, no fizz
    'solista': {'highpass': 110, 'peaks': [(300, -2.0, 1.0), (2800, -6.0, 0.8), (4500, -6.0, 1.0)],
                'high_shelf': (4000, -8.0), 'comp': (-18, 1.8)},
    'bajo': {'highpass': 35, 'peaks': [(800, -2.0, 1.0)], 'high_shelf': (3000, -6.0)},
    'bateria': {'highpass': 35, 'peaks': [(400, -2.0, 1.0), (3500, -6.0, 0.9)], 'high_shelf': (6000, -6.0),
                'comp': (-16, 1.8)},
}
LINEAR_BUSES = ('pad', 'brillos')

# one hall for both versions (criterion 21): between the «Ojo» sketch's (2.6 s) and the combat sketches' (1.8 s)
REVERB = {'seconds': 2.4, 'predelay': 0.025, 'damping': 0.55}
REVERB_EQ = {'highpass': 140, 'peaks': [(350, -3.0, 0.8)], 'high_shelf': (6000, -3.0)}  # no muddy or hissy hall
REVERB_RETURN_DB = -4.0
MASTER_BUS = {'highpass': 28, 'comp': (-18, 1.5)}

SECTIONS = {'intro 1-2': (1, 2), 'A 3-6': (3, 6), 'B 7-10': (7, 10), 'C 11-14': (11, 14), 'D 15-18': (15, 18),
            'climax 19-22': (19, 22), 'coda 23-24': (23, 24), 'c21': (21, 21)}
FORM = {k: v for k, v in SECTIONS.items() if k != 'c21'}

# the same trim on every part of both versions: headroom so no part peaks over -6 dB before its bus
# (criterion 20); the master's loudness normalization gives it back
TRIM_DB = -11.0


def gains(version: str) -> dict[str, float]:
    return {track: g + TRIM_DB for track, g in {**COMMON_GAIN, **GAIN[version]}.items()}


def parts(version: str) -> list[Part]:
    g = gains(version)
    out = []
    for track in TRACKS[version]:
        sfz, bus, pan, send, width = SEATS[track]
        out.append(Part(track, sfz, bus, pan=pan, gain_db=g[track], send=send, width=width,
                        automation=AUTOMATION[version].get(track, [])))
    return out


def spec(version: str) -> render.MixSpec:
    return render.MixSpec(
        midi=MIDI[version], out=OUT[version], bpm=BPM, beats_per_bar=BEATS, bars=BARS, parts=parts(version),
        buses=BUSES, reverb=REVERB, reverb_return_db=REVERB_RETURN_DB, reverb_eq=REVERB_EQ,
        master_bus=MASTER_BUS, target_lufs=TARGET_LUFS[version], ceiling_dbtp=-1.0, tail_seconds=4.0,
        sections=SECTIONS,
    )


# ── measures of existing MP3s ──────────────────────────────────────────────
def decode(path: str) -> np.ndarray:
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def section_lufs(x: np.ndarray, sections: dict[str, tuple[int, int]]) -> dict[str, float]:
    bar = BAR_SECONDS * SR
    return {name: round(mix.lufs(x[int(round((a - 1) * bar)): int(round(b * bar))], SR), 1)
            for name, (a, b) in sections.items()}


def bar_lufs(x: np.ndarray) -> list[float]:
    return list(section_lufs(x, {str(b): (b, b) for b in range(1, BARS + 1)}).values())


def measure(x: np.ndarray, sections: dict[str, tuple[int, int]] | None = None) -> dict:
    out = {'samples': len(x), 'lufs': round(mix.lufs(x, SR), 2), 'true_peak_db': round(mix.true_peak_db(x, SR), 2),
           'seam_jump': round(mix.seam_jump(x), 4), 'bands_db': {k: round(v, 1) for k, v in mix.band_energy(x, SR).items()}}
    if sections:
        out['sections_lufs'] = section_lufs(x, sections)
    return out


def short_term(x: np.ndarray, window: float = 3.0, hop: float = 0.1) -> tuple[np.ndarray, np.ndarray]:
    """EBU short-term loudness (K-weighted, ungated, 3 s window) every `hop` seconds; returns
    (window centre times, LUFS)."""
    meter = pyloudnorm.Meter(SR)
    k = x.astype(np.float64)
    for f in meter._filters.values():
        k = f.apply_filter(k)
    power = np.cumsum(np.concatenate([np.zeros((1, 2)), k ** 2]), axis=0)
    w, h = int(window * SR), int(hop * SR)
    starts = np.arange(0, len(x) - w + 1, h)
    ms = (power[starts + w] - power[starts]) / w
    return (starts + w / 2) / SR, -0.691 + 10 * np.log10(ms.sum(axis=1) + 1e-12)


def solo(version: str, track: str, with_bus: bool) -> np.ndarray:
    """One part as render() builds it (samples, fader rides, seat, gain) and, if `with_bus`, through its
    bus EQ (no compressor): what the listener gets of it before the hall."""
    p = next(p for p in parts(version) if p.track == track)
    song = midi_io.load(MIDI[version])
    total = LOOP_SAMPLES / SR + 4.0
    inst = sampler.Instrument.load(config.library(p.sfz), SR)
    audio = inst.render_track(song.tracks[track].notes, total, cc=song.tracks[track].cc)
    if p.automation:
        audio = audio * render.automation_curve(p.automation, len(audio), SR, BAR_SECONDS)[:, None]
    audio = render._place(audio, p.pan, p.width) * 10 ** (p.gain_db / 20)
    if with_bus:
        audio = mix.process_bus(audio, SR, **{k: v for k, v in BUSES[p.bus].items() if k != 'comp'})
    return audio


# ── crossfade test (criterion 22) ──────────────────────────────────────────
CROSS_AT = (7 * BAR_SECONDS, 16 * BAR_SECONDS)  # explora → combate at 24.0 s (bar 8), back at 54.86 s (bar 17)
FADE = 1.6


def crossfade(ex: np.ndarray, co: np.ndarray) -> np.ndarray:
    """What the game plays: both versions run in sync and a linear 1.6 s fade moves between them."""
    t = np.arange(len(ex)) / SR
    a, b = CROSS_AT
    to_combat = np.clip((t - a) / FADE, 0, 1) * (1 - np.clip((t - b) / FADE, 0, 1))
    return (ex * (1 - to_combat)[:, None] + co * to_combat[:, None]).astype(np.float32)


def cross_checks(ex: np.ndarray, co: np.ndarray, cr: np.ndarray) -> dict:
    t, l_ex = short_term(ex)
    _, l_co = short_term(co)
    _, l_cr = short_term(cr)
    out = {}
    for at in CROSS_AT:
        near = (t >= at - 3) & (t <= at + FADE + 3)  # every 3 s window touching the fade
        dip = float((np.minimum(l_ex, l_co) - l_cr)[near].max())  # how far below the quieter version
        over = float((l_cr - np.maximum(l_ex, l_co))[near].max())  # how far above the louder one
        fade = (t >= at) & (t <= at + FADE)
        step = float(np.abs(l_co - l_ex)[fade].max())  # level gap between the versions while the fade runs
        out[f'{at:.2f} s'] = {'bache_lu': round(dip, 2), 'exceso_lu': round(over, 2), 'salto_lu': round(step, 2)}
    return out


def onset_offsets(tracks: list[str]) -> dict[str, float]:
    """Largest gap (ms) between attacks the two versions share on the same 16th and pitch, for the
    tracks with the same name: more than ~15 ms would be heard as a flam in the crossfade."""
    ex, co = midi_io.load(MIDI['explora']).tracks, midi_io.load(MIDI['combate']).tracks
    grid = 60 / BPM / 4
    out = {}
    for name in tracks:
        a = {(round(n.start / grid), n.pitch): n.start for n in ex[name].notes}
        b = {(round(n.start / grid), n.pitch): n.start for n in co[name].notes}
        shared = set(a) & set(b)
        out[name] = round(max((abs(a[k] - b[k]) for k in shared), default=0) * 1000, 2)
    return out


def common_identity() -> dict[str, float]:
    """The common layers alone through their (shared, linear) buses, exploration minus combat:
    -inf dB (here -240) means they sum in phase in the crossfade."""
    out = {}
    for track in COMMON:
        a, b = solo('explora', track, True), solo('combate', track, True)
        out[track] = round(float(20 * np.log10(np.abs(a - b).max() + 1e-12)), 1)
    return out


# ── report ──────────────────────────────────────────────────────────────────
def checks(r: dict[str, dict], cross: dict, same: dict) -> list[tuple[str, bool, str]]:
    ex, co = r['explora'], r['combate']
    res = [
        ('15 explora -17,5 ± 0,5 LUFS', abs(ex['lufs'] + 17.5) <= 0.5, f"{ex['lufs']} LUFS"),
        ('15 combate -16,5 ± 0,5 LUFS', abs(co['lufs'] + 16.5) <= 0.5, f"{co['lufs']} LUFS"),
    ]
    for v in VERSIONS:
        res.append((f'15 {v} pico real ≤ -1 dBTP', r[v]['true_peak_db'] <= -1.0, f"{r[v]['true_peak_db']} dBTP"))
    for v in VERSIONS:
        res.append((f'16 {v} loop_samples = 3 628 800 (y en el MP3)',
                    r[v]['loop_samples'] == LOOP_SAMPLES == r[v]['decoded_samples'],
                    f"{r[v]['loop_samples']} / {r[v]['decoded_samples']}"))
        res.append((f'16 {v} seam_jump < 0,02', r[v]['seam_jump'] < 0.02, str(r[v]['seam_jump'])))
    s, bars = ex['sections_lufs'], ex['bars_lufs']
    c = s['climax 19-22'] - s['A 3-6']
    res.append(('17 explora clímax − A en +5…+12 LU', 5 <= c <= 12, f'{c:+.1f} LU'))
    c = s['C 11-14'] - s['B 7-10']
    res.append(('17 explora C ≥ 3 LU bajo B', c <= -3, f'{c:+.1f} LU'))
    res.append(('17 explora c. 21 el compás más fuerte', max(bars) == bars[20], f'c. 21 {bars[20]}, máx. {max(bars)} '
                f'(c. {bars.index(max(bars)) + 1})'))
    s, bars = co['sections_lufs'], co['bars_lufs']
    c = s['C 11-14'] - s['climax 19-22']
    res.append(('17 combate C a ≤ 3 LU del clímax', c >= -3, f'{c:+.1f} LU'))
    res.append(('17 combate c. 21 a ±1 LU del compás más fuerte', max(bars) - bars[20] <= 1,
                f'c. 21 {bars[20]}, máx. {max(bars)} (c. {bars.index(max(bars)) + 1})'))
    for name in FORM:
        d = co['sections_lufs'][name] - ex['sections_lufs'][name]
        res.append((f'18 combate − explora en {name} en −1…+12 LU', -1 <= d <= 12, f'{d:+.1f} LU'))
    for v in VERSIONS:
        b = r[v]['bands_db']
        res.append((f'19 {v} presencia 2.5-6k ≤ -18 dB', b['presencia 2.5-6k'] <= -18, str(b['presencia 2.5-6k'])))
        res.append((f'19 {v} aire 6-16k ≤ -32 dB', b['aire 6-16k'] <= -32, str(b['aire 6-16k'])))
        res.append((f'19 {v} sub <60 ≤ -16 dB', b['sub <60'] <= -16, str(b['sub <60'])))
    for v in VERSIONS:
        worst = max(r[v]['parts'].items(), key=lambda kv: kv[1]['pico_db'])
        res.append((f'20 {v} ninguna parte > -6 dB de pico', worst[1]['pico_db'] <= -6, f'{worst[0]} {worst[1]["pico_db"]} dB'))
    for at, c in cross.items():
        res.append((f'22 cruce {at}: bache ≤ 3 LU bajo la menor', c['bache_lu'] <= 3, f"{c['bache_lu']} LU"))
        res.append((f'22 cruce {at}: exceso ≤ 1 LU sobre la mayor', c['exceso_lu'] <= 1,
                    f"{c['exceso_lu']} LU (salto entre versiones {c['salto_lu']} LU)"))
    res.append(('22 capas comunes idénticas tras su bus', all(v < -200 for v in same.values()), str(same)))
    return res


def check_shared_seating() -> None:
    """Criterion 21, enforced by construction: one seat per track name, one hall, one set of buses, one
    gain and no rides for the common layers, linear buses for them."""
    both = set(TRACKS['explora']) & set(TRACKS['combate'])
    assert both == set(COMMON) | {'Choir', 'Organ', 'Guitar', 'Guitar 2', 'Bass', 'Drums'}, sorted(both)
    for v in VERSIONS:
        assert not set(GAIN[v]) & set(COMMON) and not set(AUTOMATION[v]) & set(COMMON)
        assert set(GAIN[v]) | set(COMMON) == set(midi_io.load(MIDI[v]).tracks), 'every MIDI track gets a seat'
    for track in COMMON:
        bus = SEATS[track][1]
        assert bus in LINEAR_BUSES and 'comp' not in BUSES[bus]
        assert all(SEATS[t][1] in LINEAR_BUSES for t in COMMON)
    assert not {SEATS[t][1] for t in SEATS if t not in COMMON} & set(LINEAR_BUSES), 'common buses carry only them'


def print_report(v: str, report: dict, previous: dict | None) -> None:
    print(f"\n══ {v} ══ {report['out']}\n  {report['seconds']} s · loop_samples {report['loop_samples']}")
    pre = report['antes_del_mp3']
    print(f"  MP3: {report['lufs']} LUFS · {report['true_peak_db']} dBTP · seam_jump {report['seam_jump']} · "
          f"sala {report['wet_dry_lu']} LU respecto a la señal directa")
    print(f"  (antes de codificar: {pre['lufs']} LUFS · {pre['true_peak_db']} dBTP · seam_jump {pre['seam_jump']})")
    print('  Partes (tras gain_db, antes de bus):     pico dB   LUFS' + ('   (antes pico / LUFS)' if previous else ''))
    for name, p in report['parts'].items():
        line = f'    {name:20s} {p["notas"]:4d} notas  {p["pico_db"]:6.1f}  {p["lufs"]:6.1f}'
        if previous and name in previous['parts']:
            q = previous['parts'][name]
            line += f'   ({q["pico_db"]:6.1f} / {q["lufs"]:6.1f})'
        print(line)
    print('  Secciones (LUFS sobre el máster):')
    for name, val in report['sections_lufs'].items():
        before = previous['sections_lufs'].get(name) if previous else None
        print(f'    {name:16s} {val:6.1f}' + (f'   (antes {before:6.1f})' if before is not None else ''))
    print('  Compases: ' + ' '.join(f'{x:.0f}' for x in report['bars_lufs']))
    if previous:
        print(f"  Anterior: {previous['lufs']} LUFS · {previous['true_peak_db']} dBTP · seam {previous['seam_jump']}")


def main() -> int:
    check_shared_seating()
    reports, previous = {}, {}
    for v in VERSIONS:
        previous[v] = json.load(open(REPORT[v])) if os.path.exists(REPORT[v]) else None
        reports[v] = render.render(spec(v))
        # the measures that count are the MP3's; the render's own (before encoding) stay for reference
        keys = ('lufs', 'true_peak_db', 'seam_jump', 'bands_db', 'sections_lufs')
        reports[v]['antes_del_mp3'] = {k: reports[v][k] for k in keys}
        x = decode(OUT[v])
        decoded = measure(x, SECTIONS)
        reports[v].update({k: decoded[k] for k in keys})
        reports[v]['decoded_samples'] = decoded['samples']
        reports[v]['bars_lufs'] = bar_lufs(x)
        with open(REPORT[v], 'w') as f:
            json.dump(reports[v], f, indent=1, ensure_ascii=False)
        print_report(v, reports[v], previous[v])

    # crossfade from the MP3s, as the game hears them (same decoder for both: same alignment)
    ex, co = decode(OUT['explora']), decode(OUT['combate'])
    n = min(len(ex), len(co))
    cr = crossfade(ex[:n], co[:n])
    mix.export_mp3(cr, SR, CROSS_OUT)
    cross = cross_checks(ex[:n], co[:n], cr)
    flams = onset_offsets(sorted(set(TRACKS['explora']) & set(TRACKS['combate'])))
    same = common_identity()
    with open(CROSS_REPORT, 'w') as f:
        json.dump({'cruce': cross, 'desfase_ataques_ms': flams, 'capas_comunes_diferencia_db': same,
                   'decoded_samples': {'explora': len(ex), 'combate': len(co)}}, f, indent=1, ensure_ascii=False)
    print(f'\n══ cruce ══ {CROSS_OUT}')
    for at, c in cross.items():
        print(f'  {at}: bache {c["bache_lu"]} LU · exceso {c["exceso_lu"]} LU · salto entre versiones {c["salto_lu"]} LU')
    print('  desfase máximo de ataques compartidos (ms): ' + ', '.join(f'{k} {v}' for k, v in flams.items()))
    print('  capas comunes, pico de (explora − combate) tras su bus (dB): ' + ', '.join(f'{k} {v}' for k, v in same.items()))
    print('\n  Contraste combate − explora por sección (LU): ' + ', '.join(
        f"{k} {reports['combate']['sections_lufs'][k] - reports['explora']['sections_lufs'][k]:+.1f}" for k in FORM))

    refs = {k: measure(decode(p)) for k, p in SKETCHES.items() if os.path.exists(p)}
    print('\nBandas dB (rel. al total)    explora  combate' + ''.join(f'  {k[:18]:>18s}' for k in refs))
    for k in reports['explora']['bands_db']:
        line = f"  {k:24s} {reports['explora']['bands_db'][k]:7.1f}  {reports['combate']['bands_db'][k]:7.1f}"
        line += ''.join(f"  {m['bands_db'][k]:18.1f}" for m in refs.values())
        print(line)

    print('\nCriterios del brief:')
    results = checks(reports, cross, same)
    for label, ok, value in results:
        print(f"  [{'ok' if ok else 'FALLA'}] {label}: {value}")
    return 0 if all(ok for _, ok, _ in results) else 1


if __name__ == '__main__':
    sys.exit(main())
