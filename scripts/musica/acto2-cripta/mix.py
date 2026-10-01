"""«Nana para los que no duermen» (La Cripta, Act II): mix and master of the two synchronized
versions (brief: docs/musica/acto2-cripta.md, section 8 criteria 13–20).

Reads build/acto2-cripta-explora.mid and build/acto2-cripta-combate.mid (written by compose.py),
renders each with its own MixSpec over one shared hall and one shared seating, masters them as
seamless loops (exploration -17.5 LUFS, combat -16.5 LUFS, -1 dBTP) and writes
build/acto2-cripta-explora.mp3 and build/acto2-cripta-combate.mp3 with their JSON reports.
Then builds the crossfade test build/acto2-cripta-cruce.mp3 the way the game does it
(src/fx/audio.ts, cruzarVersion: same loop position, linear 1.6 s fade): exploration 0–24 s,
combat from 24 s (bar 8), exploration again from 56 s (bar 17), and measures its short-term
loudness against the two versions.

Prints the reports, the brief checks and a comparison with the previous build, with the approved
sketch (scripts/musica/leitmotivs/build/acto2-cripta-*.mp3) and with the old synthesized Act II
track (src/audio/cap2.mp3).

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/acto2-cripta/mix.py
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
MIDI = {v: os.path.join(BUILD, f'acto2-cripta-{v}.mid') for v in VERSIONS}
OUT = {v: os.path.join(BUILD, f'acto2-cripta-{v}.mp3') for v in VERSIONS}
REPORT = {v: os.path.join(BUILD, f'acto2-cripta-{v}.report.json') for v in VERSIONS}
CROSS_OUT = os.path.join(BUILD, 'acto2-cripta-cruce.mp3')
CROSS_REPORT = os.path.join(BUILD, 'acto2-cripta-cruce.report.json')
SKETCH = {v: os.path.join(ROOT, 'scripts', 'musica', 'leitmotivs', 'build', f'acto2-cripta-{v}.mp3') for v in VERSIONS}
OLD_TRACK = os.path.join(ROOT, 'src', 'audio', 'cap2.mp3')
SR = 44100
BPM, BEATS, BARS = 72, 4, 24
BAR_SECONDS = BEATS * 60 / BPM
LOOP_SAMPLES = 3528000
TARGET_LUFS = {'explora': -17.5, 'combate': -16.5}

VSCO = 'VSCO-2-CE'
VCSL_IDIO = 'VCSL/Idiophones/Struck Idiophones'
SSO = 'sso/Sonatina Symphonic Orchestra'


def vsco(name: str) -> str:
    return os.path.join(VSCO, name + '.sfz')


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
# Violins I left, violas and cellos right, basses centre-right; woodwinds centre and a little back;
# horns left and back; trombones centre-right; timpani, gong and bell at the back of the crypt.
# The melody leads (vibraphone, alto flute, violins) sit centre-left; harp far left and celesta/xylophone
# right so the colours never land on the tune.
SEATS = {
    # common layers (criterion 19: identical in both versions, same gain, linear buses)
    'Low Trem': (f'{SSO}/Strings - Performance/Basses Tremolo.sfz', 'grave', 0.30, 0.30, 0.6),
    'Bell': (f'{VCSL_IDIO}/Tubular Bells 1.sfz', 'campana', -0.20, 0.55, 0.8),
    'Gong': (f'{VCSL_IDIO}/Gong 1.sfz', 'gong', 0.25, 0.60, 0.8),
    'Col Legno Vc': (f'{SSO}/Strings - Performance/Celli Col Legno.sfz', 'huesos', 0.35, 0.32, 0.8),
    # in both versions with a different dynamic (same seat, own gain)
    'Choir': (f'{SSO}/Chorus - Performance/Mixed Chorus.sfz', 'coro', 0.0, 0.50, 1.0),
    'Piano Cluster': ('VCSL/Chordophones/Zithers/Upright Piano, Knight.sfz', 'cumulo', -0.20, 0.50, 0.7),
    'Timpani': (vsco('Timpani'), 'timbales', -0.10, 0.45, 0.6),
    'Timp Roll': (vsco('TimpaniRolls'), 'timbales', -0.10, 0.45, 0.6),
    # exploration only
    'Vibes Bowed': (f'{VCSL_IDIO}/Vibraphone - Bowed.sfz', 'vibes', -0.15, 0.42, 0.8),
    'Alto Flute': (f'{SSO}/Woodwinds - Performance/Alto Flute Solo Sustain.sfz', 'maderas', -0.25, 0.34, 0.6),
    'Bass Clarinet': (f'{SSO}/Woodwinds - Performance/Bass Clarinet Solo Sustain.sfz', 'clarinete', 0.20, 0.32, 0.6),
    'Cello Solo': (f'{SSO}/Strings - Performance/Cello Solo Sustain.sfz', 'solista', 0.15, 0.30, 0.6),
    'Celesta': (f'{SSO}/Percussion/Celeste.sfz', 'brillos', 0.30, 0.48, 0.8),
    'Harp': ('VCSL/Chordophones/Composite Chordophones/Concert Harp.sfz', 'arpa', -0.45, 0.40, 0.8),
    'Basses': (vsco('ContrabassSusVB'), 'bajos', 0.25, 0.20, 0.6),
    'Basses Quiet': (vsco('ContrabassSusVB-Quiet'), 'bajos', 0.25, 0.20, 0.6),
    'Glass': ('VCSL/Idiophones/Friction Idiophones/Wine Glasses - Slow.sfz', 'brillos', -0.35, 0.58, 0.8),
    'Hand Chimes': (f'{VCSL_IDIO}/Hand Chimes.sfz', 'brillos', 0.35, 0.52, 0.8),
    # combat only
    'Horns': (f'{SSO}/Brass - Performance/Horns Sustain.sfz', 'trompas', -0.15, 0.42, 0.7),
    'Trombones': (f'{SSO}/Brass - Performance/Trombones Sustain (looped).sfz', 'trombones', 0.20, 0.36, 0.7),
    'Violins': (vsco('ViolinEnsSusVib'), 'violines', -0.25, 0.28, 1.0),
    'Violins Trem': (vsco('ViolinEnsTrem'), 'violines', -0.30, 0.30, 1.0),
    'Violas Trem': (vsco('ViolaEnsTrem'), 'violas', 0.15, 0.30, 1.0),
    'Xylophone': (f'{VCSL_IDIO}/Xylophone - Soft Mallets.sfz', 'xilofono', 0.25, 0.34, 0.7),
    'Cellos Spic': (vsco('CelloEnsSpic'), 'ritmo', 0.30, 0.22, 1.0),
    'Basses Spic': (vsco('ContrabassSpic'), 'bajos', 0.35, 0.20, 0.6),
    'Col Legno Vn': (f'{SSO}/Strings - Performance/1st Violins Col Legno.sfz', 'huesos_vn', -0.35, 0.30, 0.8),
    'Choir Melody': (f'{SSO}/Chorus - Performance/Mixed Chorus.sfz', 'coro', -0.05, 0.45, 1.0),
    'Bass Drum': ('VCSL/Membranophones/Struck Membranophones/Bass Drum 2.sfz', 'bombo', 0.0, 0.45, 0.5),
}
COMMON = ('Low Trem', 'Bell', 'Gong', 'Col Legno Vc')

# ── levels (gain_db, before the bus) ──
COMMON_GAIN = {'Low Trem': 0.0, 'Bell': 3.5, 'Gong': 10.0, 'Col Legno Vc': 6.0}
GAIN = {
    'explora': {
        'Choir': -1.0, 'Piano Cluster': -3.0, 'Timpani': 11.0, 'Timp Roll': 12.0,
        'Vibes Bowed': 5.0, 'Alto Flute': -1.5, 'Bass Clarinet': -1.5, 'Cello Solo': 3.0, 'Celesta': 4.0,
        'Harp': 4.0, 'Basses': 4.0, 'Basses Quiet': 10.0, 'Glass': -2.5, 'Hand Chimes': 1.0,
    },
    'combate': {
        'Choir': -4.0, 'Piano Cluster': -4.0, 'Timpani': 9.0, 'Timp Roll': 9.5,
        'Horns': -6.5, 'Trombones': -6.5, 'Violins': 5.0, 'Violins Trem': -4.0, 'Violas Trem': 8.0, 'Xylophone': 7.0,
        'Cellos Spic': 4.0, 'Basses Spic': 3.0, 'Col Legno Vn': 5.0, 'Choir Melody': -2.0, 'Bass Drum': -1.0,
    },
}

# Fader rides (the loop wraps from bar 24 into bar 1, so a ride over both ends has the same value at the two).
# Exploration: the bass clarinet's lament steps under the alto flute in A' and under the slab in 15–16 (so the
# bridge climbs); the alto flute steps forward in 17–18 while the harp and choir of the bridge stay a step under
# the return; the vibraphone halo of B stays under the solo cello, and the cello and harp of the chapel come up a
# little (B is the breath, not a hole); the cello's countermelody gives way to the flute and vibraphone in the
# return, and the bed of the return (harp, choir, basses) stays a step under the combat's climax; the pp intro and
# codetta come up a little (the same at both ends of the seam) so the map never drops out between loops.
# Combat: the violins lead A over the horns' 8vb doubling; the horns come up where they carry the head (intro,
# 17–18, codetta) and step back as countermelody in the return; the trombones' lament stays under the violins in
# A'; the dance and the choir get a push in 17–18 (the bridge climbs) and the tune and the dance in the return
# (the climax, never under the map).
ENDS_UP = ((1, 2, 1.0), (23, 24, 1.0))
AUTOMATION: dict[str, dict[str, list[tuple[float, float]]]] = {
    'explora': {
        'Bass Clarinet': ride(*ENDS_UP, (7, 10, -3.0), (15, 16, -1.5)),
        'Alto Flute': ride((17, 18, 1.0)),
        'Vibes Bowed': ride((11, 14, -3.0), (23, 24, 1.0)),
        'Cello Solo': ride((11, 14, 1.5), (19, 22, -1.5)),
        'Harp': ride(*ENDS_UP, (11, 14, 1.0), (15, 18, -1.5), (19, 22, -1.0)),
        'Choir': ride((15, 18, -1.0), (19, 22, -1.0)),
        'Basses': ride((19, 22, -1.0)),
        'Basses Quiet': ride((1, 2, 1.5), (23, 24, 1.5)),
    },
    'combate': {
        'Violins': ride((3, 6, 2.0), (19, 22, 2.0)),
        'Horns': ride((1, 2, 1.5), (3, 6, -2.0), (17, 18, 1.0), (19, 22, -2.0), (23, 24, 1.5)),
        'Trombones': ride((7, 10, -2.0)),
        'Cellos Spic': ride((17, 22, 1.0)),
        'Basses Spic': ride((19, 22, 1.0)),
        'Choir Melody': ride((19, 22, 1.5)),
        'Bass Drum': ride((19, 22, 1.0)),
        'Timpani': ride((19, 22, 1.0)),
        'Choir': ride((17, 18, 1.0)),
    },
}

TRACKS = {v: list(COMMON) + list(GAIN[v]) for v in VERSIONS}  # common layers first: same sampler state in both

# ── subtractive EQ per bus: high-pass all but the bass, mud out at 200–400 Hz where it piles up, a
# dip in 2–5 kHz for the game's SFX, soft highs. The buses of the common layers (grave, campana, gong,
# huesos) are linear (no compressor) and identical in both versions, so those layers stay identical. ──
BUSES_SHARED = {
    'grave': {'highpass': 30, 'peaks': [(300, -2.0, 1.0)], 'high_shelf': (4000, -3.0)},
    'campana': {'highpass': 300, 'peaks': [(3000, -2.0, 1.0)], 'high_shelf': (6000, -4.0)},
    'gong': {'highpass': 40, 'peaks': [(3500, -3.0, 1.0)], 'high_shelf': (6000, -4.0)},
    'huesos': {'highpass': 60, 'peaks': [(300, -2.0, 1.0), (3500, -3.0, 1.0)], 'high_shelf': (7000, -3.0)},
    'coro': {'highpass': 110, 'peaks': [(300, -2.0, 1.0), (3000, -3.0, 1.0)], 'high_shelf': (7000, -3.0)},
    'cumulo': {'highpass': 35, 'peaks': [(300, -2.0, 1.0), (3000, -3.0, 1.0)], 'high_shelf': (5000, -4.0)},
    'timbales': {'highpass': 35, 'peaks': [(320, -2.0, 1.0), (3500, -3.0, 1.0)], 'high_shelf': (5000, -3.0)},
    # double basses (sustained in exploration, spiccato in combat): the E1 fundamental stays, the sub under it goes
    'bajos': {'highpass': 34, 'low_shelf': (65, -3.0), 'peaks': [(230, -1.5, 1.0)], 'high_shelf': (4000, -4.0)},
}
BUSES = {
    'explora': {
        **BUSES_SHARED,
        # the bowed bar rings its 4th partial two octaves up (1.3–2.8 kHz for E4–F5) almost as loud as the note:
        # that is the whistle the user heard in the sketch, so a wide cut takes it down and the shelf keeps it soft
        'vibes': {'highpass': 200, 'peaks': [(2000, -5.0, 1.4), (2650, -6.0, 1.4), (3400, -3.0, 1.0)], 'high_shelf': (5000, -4.0)},
        'maderas': {'highpass': 180, 'peaks': [(350, -1.5, 1.0), (3200, -2.0, 1.2)], 'high_shelf': (8000, -3.0)},
        'clarinete': {'highpass': 70, 'peaks': [(300, -2.0, 1.0), (3200, -3.0, 1.0)], 'high_shelf': (7000, -3.0)},
        'solista': {'highpass': 80, 'peaks': [(280, -2.0, 1.0), (3200, -2.0, 1.2)], 'high_shelf': (7000, -3.0)},
        'brillos': {'highpass': 300, 'peaks': [(3000, -2.0, 1.0)], 'high_shelf': (6000, -4.0)},
        'arpa': {'highpass': 55, 'peaks': [(300, -3.0, 0.9), (3000, -2.0, 1.0)], 'high_shelf': (7000, -3.0)},
    },
    'combate': {
        **BUSES_SHARED,
        'violines': {'highpass': 200, 'peaks': [(320, -2.0, 1.0), (2600, -2.5, 1.0), (3600, -3.0, 1.0)], 'high_shelf': (5000, -4.0)},
        'violas': {'highpass': 120, 'peaks': [(300, -3.0, 1.0), (2800, -2.0, 1.0)], 'high_shelf': (6000, -3.0)},
        'trompas': {'highpass': 70, 'peaks': [(300, -2.0, 1.0), (2800, -2.5, 1.0)], 'high_shelf': (5000, -3.0)},
        'trombones': {'highpass': 50, 'peaks': [(280, -2.5, 1.0), (2500, -2.0, 1.0)], 'high_shelf': (5000, -3.0)},
        'xilofono': {'highpass': 300, 'peaks': [(3000, -2.0, 1.0)], 'high_shelf': (6000, -4.0)},
        'ritmo': {'highpass': 40, 'peaks': [(300, -2.5, 1.0), (3200, -3.0, 1.0)], 'high_shelf': (6000, -3.0)},
        'huesos_vn': {'highpass': 180, 'peaks': [(3500, -4.0, 1.0)], 'high_shelf': (6000, -4.0)},
        'bombo': {'highpass': 48, 'low_shelf': (90, -2.0), 'peaks': [(46, -5.0, 1.2), (300, -3.0, 1.0)], 'high_shelf': (4000, -4.0)},  # its boom sits at 40–50 Hz
    },
}

# one hall for both versions (criterion 19): the sketch's stone crypt
REVERB = {'seconds': 2.8, 'predelay': 0.03, 'damping': 0.5}
REVERB_EQ = {'highpass': 140, 'peaks': [(350, -3.0, 0.8)], 'high_shelf': (6000, -3.0)}  # no muddy or hissy hall
REVERB_RETURN_DB = -3.0
MASTER_BUS = {'highpass': 28, 'comp': (-18, 1.5)}

SECTIONS = {'intro 1-2': (1, 2), 'A 3-6': (3, 6), "A' 7-10": (7, 10), 'B 11-14': (11, 14),
            'puente 15-16': (15, 16), 'puente 17-18': (17, 18), 'retorno 19-22': (19, 22),
            'codetta 23-24': (23, 24), 'c21': (21, 21)}
# the sections of §3 for the contrast between versions (criterion 16)
FORM = {'intro 1-2': (1, 2), 'A 3-6': (3, 6), "A' 7-10": (7, 10), 'B 11-14': (11, 14), 'puente 15-18': (15, 18),
        'retorno 19-22': (19, 22), 'codetta 23-24': (23, 24)}

# the same trim on every part of both versions: headroom so no part peaks over -6 dB before its bus
# (criterion 18); the master's loudness normalization gives it back
TRIM_DB = -4.5


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
        buses=BUSES[version], reverb=REVERB, reverb_return_db=REVERB_RETURN_DB, reverb_eq=REVERB_EQ,
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


# ── part balance (criterion 18): a few parts rendered alone, the way render() places them ──
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
        audio = mix.process_bus(audio, SR, **{k: v for k, v in BUSES[version][p.bus].items() if k != 'comp'})
    return audio


def balance() -> dict:
    """Exploration, A (bars 3–6): the bowed vibraphone at least 3 LU over the choir, and the glass swell
    at least 8 LU under the vibraphone. Measured on each part alone through its bus EQ (gated LUFS)."""
    a = (int(round(2 * BAR_SECONDS * SR)), int(round(6 * BAR_SECONDS * SR)))
    lv = {t: solo('explora', t, True) for t in ('Vibes Bowed', 'Choir', 'Glass')}
    loud = {t: round(mix.lufs(x[a[0]:a[1]], SR), 1) for t, x in lv.items()}
    return {'A 3-6 (tras la EQ del bus)': loud,
            'vibes - choir': round(loud['Vibes Bowed'] - loud['Choir'], 1),
            'vibes - glass': round(loud['Vibes Bowed'] - loud['Glass'], 1)}


# ── crossfade test (criterion 20) ──────────────────────────────────────────
CROSS_AT = (24.0, 56.0)  # explora → combate at 24 s (bar 8), back to explora at 56 s (bar 17)
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
        slope = float(np.abs(np.diff(l_cr[near])).max() / 0.1)  # steepest change of the crossfade, LU/s
        own = float(max(np.abs(np.diff(l_ex[near])).max(), np.abs(np.diff(l_co[near])).max()) / 0.1)
        out[f'{at:g} s'] = {'bache_lu': round(dip, 2), 'exceso_lu': round(over, 2), 'salto_lu': round(step, 2),
                            'pendiente_lu_s': round(slope, 2), 'pendiente_propia_lu_s': round(own, 2)}
    return out


def onset_offsets(tracks: list[str]) -> dict[str, float]:
    """Largest gap (ms) between the attacks the two versions share on the same grid position (16th),
    for the tracks with the same name: more than ~15 ms would be heard as a flam in the crossfade."""
    ex, co = midi_io.load(MIDI['explora']).tracks, midi_io.load(MIDI['combate']).tracks
    grid = 60 / BPM / 4
    out = {}
    for name in tracks:
        a = {round(n.start / grid): n.start for n in ex[name].notes}
        b = {round(n.start / grid): n.start for n in co[name].notes}
        shared = set(a) & set(b)
        out[name] = round(max((abs(a[k] - b[k]) for k in shared), default=0) * 1000, 1)
    return out


def common_identity(ex: np.ndarray, co: np.ndarray) -> dict[str, float]:
    """The common layers alone through their (shared, linear) buses, exploration minus combat:
    0 (or -inf dB) means they sum in phase in the crossfade."""
    out = {}
    for track in COMMON:
        a, b = solo('explora', track, True), solo('combate', track, True)
        out[track] = round(float(20 * np.log10(np.abs(a - b).max() + 1e-12)), 1)
    return out


# ── report ──────────────────────────────────────────────────────────────────
def checks(r: dict[str, dict], cross: dict, bal: dict) -> list[tuple[str, bool, str]]:
    ex, co = r['explora'], r['combate']
    res = [
        ('13 explora -17,5 ± 0,5 LUFS', abs(ex['lufs'] + 17.5) <= 0.5, f"{ex['lufs']} LUFS"),
        ('13 combate -16,5 ± 0,5 LUFS', abs(co['lufs'] + 16.5) <= 0.5, f"{co['lufs']} LUFS"),
    ]
    for v in VERSIONS:
        res.append((f'13 {v} pico real ≤ -1 dBTP', r[v]['true_peak_db'] <= -1.0, f"{r[v]['true_peak_db']} dBTP"))
    for v in VERSIONS:
        res.append((f'14 {v} loop_samples = 3 528 000', r[v]['loop_samples'] == LOOP_SAMPLES, str(r[v]['loop_samples'])))
        res.append((f'14 {v} seam_jump < 0,02', r[v]['seam_jump'] < 0.02, str(r[v]['seam_jump'])))
    for v, (lo, hi) in (('explora', (4, 8)), ('combate', (3, 6))):
        s = r[v]['sections_lufs']
        c = s['retorno 19-22'] - s['B 11-14']
        res.append((f'15 {v} retorno − B en {lo}–{hi} LU', lo <= c <= hi, f'{c:.1f} LU'))
        p = s['puente 17-18'] - s['puente 15-16']
        res.append((f'15 {v} puente 17-18 − 15-16 ≥ 1,5 LU', p >= 1.5, f'{p:.1f} LU'))
    for name in FORM:
        d = co['form_lufs'][name] - ex['form_lufs'][name]
        res.append((f'16 combate − explora en {name} en 0–4 LU', 0 <= d <= 4, f'{d:+.1f} LU'))
    for v in VERSIONS:
        b = r[v]['bands_db']
        res.append((f'17 {v} presencia 2.5-6k ≤ -19 dB', b['presencia 2.5-6k'] <= -19, str(b['presencia 2.5-6k'])))
        res.append((f'17 {v} aire 6-16k ≤ -30 dB', b['aire 6-16k'] <= -30, str(b['aire 6-16k'])))
        res.append((f'17 {v} sub <60 ≤ -20 dB', b['sub <60'] <= -20, str(b['sub <60'])))
    for v in VERSIONS:
        worst = max(r[v]['parts'].items(), key=lambda kv: kv[1]['pico_db'])
        res.append((f'18 {v} ninguna parte > -6 dB de pico', worst[1]['pico_db'] <= -6, f'{worst[0]} {worst[1]["pico_db"]} dB'))
    res.append(('18 explora A: vibráfono ≥ coro + 3 LU', bal['vibes - choir'] >= 3, f"{bal['vibes - choir']} LU"))
    res.append(('18 explora: copa ≥ 8 LU bajo el vibráfono', bal['vibes - glass'] >= 8, f"{bal['vibes - glass']} LU"))
    for at, c in cross.items():
        res.append((f'20 cruce {at}: bache ≤ 3 LU bajo la menor', c['bache_lu'] <= 3, f"{c['bache_lu']} LU"))
        res.append((f'20 cruce {at}: salto ≤ 4 LU', c['salto_lu'] <= 4 and c['exceso_lu'] <= 4,
                    f"{c['salto_lu']} LU entre versiones (exceso {c['exceso_lu']} LU)"))
    return res


def check_shared_seating() -> None:
    """Criterion 19, enforced by construction: one seat per track name, one hall, one gain and no rides
    for the common layers, identical linear buses for them."""
    both = set(TRACKS['explora']) & set(TRACKS['combate'])
    assert both == set(COMMON) | {'Choir', 'Piano Cluster', 'Timpani', 'Timp Roll'}, sorted(both)
    for v in VERSIONS:
        assert not set(GAIN[v]) & set(COMMON) and not set(AUTOMATION[v]) & set(COMMON)
        assert set(GAIN[v]) | set(COMMON) == set(midi_io.load(MIDI[v]).tracks), 'every MIDI track gets a seat'
    for track in COMMON:
        bus = SEATS[track][1]
        assert BUSES['explora'][bus] == BUSES['combate'][bus] and 'comp' not in BUSES['explora'][bus]
    for track in both:  # shared buses are the same object in both versions
        assert BUSES['explora'][SEATS[track][1]] == BUSES['combate'][SEATS[track][1]]


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
        assert decoded['samples'] == LOOP_SAMPLES, decoded['samples']
        reports[v].update({k: decoded[k] for k in keys})
        reports[v]['form_lufs'] = section_lufs(x, FORM)
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
    same = common_identity(ex, co)
    with open(CROSS_REPORT, 'w') as f:
        json.dump({'cruce': cross, 'desfase_ataques_ms': flams, 'capas_comunes_diferencia_db': same,
                   'decoded_samples': {'explora': len(ex), 'combate': len(co)}}, f, indent=1, ensure_ascii=False)
    print(f'\n══ cruce ══ {CROSS_OUT}')
    print(f'  muestras decodificadas: explora {len(ex)}, combate {len(co)}')
    for at, c in cross.items():
        print(f'  {at}: bache {c["bache_lu"]} LU · exceso {c["exceso_lu"]} LU · salto entre versiones {c["salto_lu"]} LU · '
              f'pendiente máx. {c["pendiente_lu_s"]} LU/s (la de las propias versiones: {c["pendiente_propia_lu_s"]} LU/s)')
    print('  desfase máximo de ataques compartidos (ms): ' + ', '.join(f'{k} {v}' for k, v in flams.items()))
    print('  capas comunes, pico de (explora − combate) tras su bus (dB): ' + ', '.join(f'{k} {v}' for k, v in same.items()))

    print('\n  Contraste combate − explora por sección (LU): ' + ', '.join(
        f"{k} {reports['combate']['form_lufs'][k] - reports['explora']['form_lufs'][k]:+.1f}" for k in FORM))

    bal = balance()
    print(f"\n  Equilibrio (exploración, A 3-6, cada parte sola tras la EQ de su bus, LUFS): {bal['A 3-6 (tras la EQ del bus)']}"
          f" · vibráfono − coro {bal['vibes - choir']} LU · vibráfono − copa {bal['vibes - glass']} LU")

    refs = {f'boceto {v}': measure(decode(SKETCH[v])) for v in VERSIONS if os.path.exists(SKETCH[v])}
    if os.path.exists(OLD_TRACK):
        refs['cap2.mp3 (antigua)'] = measure(decode(OLD_TRACK))
    print('\nBandas dB (rel. al total)    explora  combate' + ''.join(f'  {k:>18s}' for k in refs))
    for k in reports['explora']['bands_db']:
        line = f"  {k:24s} {reports['explora']['bands_db'][k]:7.1f}  {reports['combate']['bands_db'][k]:7.1f}"
        line += ''.join(f"  {m['bands_db'][k]:18.1f}" for m in refs.values())
        print(line)
    for name, m in refs.items():
        print(f"  {name}: {m['samples']} muestras · {m['lufs']} LUFS · {m['true_peak_db']} dBTP · seam {m['seam_jump']}")

    print('\nCriterios del brief:')
    results = checks(reports, cross, bal)
    for label, ok, value in results:
        print(f"  [{'ok' if ok else 'FALLA'}] {label}: {value}")
    return 0 if all(ok for _, ok, _ in results) else 1


if __name__ == '__main__':
    sys.exit(main())
