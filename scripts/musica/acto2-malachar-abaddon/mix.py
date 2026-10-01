"""«El pacto» (boss of the Dark Temple, Act II): mix and master of Malachar (ritual) and Abaddon
(chaos), the two tracks of one song (brief: docs/musica/acto2-malachar-abaddon.md, section 8
criteria 14–23).

Reads build/acto2-malachar.mid and build/acto2-abaddon.mid (written by compose.py), renders each
with its own MixSpec over one shared hall and one shared seating, masters them as seamless loops
(Malachar -17.3 LUFS, Abaddon -16.3 LUFS, -1 dBTP) and writes build/acto2-malachar.mp3 and
build/acto2-abaddon.mp3 with their JSON reports. Then builds the two crossfade tests the way the
game does it (src/fx/audio.ts, cruzarVersion: same loop position, linear 1.6 s fade, one way only):
build/acto2-pacto-cruce-c14.mp3 (Malachar 0–20 s, Abaddon up to 40 s) and
build/acto2-pacto-cruce-c39.mp3 (Malachar 0–57 s, Abaddon up to 75 s), and measures their
short-term loudness against Malachar.

Prints the reports, per-section loudness of every part (criterion 19: the choirs lead), the brief
checks and a comparison with the previous build, the approved sketch and the old tracks of src/audio/.

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/acto2-malachar-abaddon/mix.py
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import warnings
from contextlib import contextmanager

import numpy as np
import pyloudnorm

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(HERE, '..'))

from estudio import midi_io, mix, render  # noqa: E402
from estudio.render import Part  # noqa: E402

BUILD = os.path.join(HERE, 'build')
VERSIONS = ('malachar', 'abaddon')
MIDI = {v: os.path.join(BUILD, f'acto2-{v}.mid') for v in VERSIONS}
OUT = {v: os.path.join(BUILD, f'acto2-{v}.mp3') for v in VERSIONS}
REPORT = {v: os.path.join(BUILD, f'acto2-{v}.report.json') for v in VERSIONS}
CROSS_REPORT = os.path.join(BUILD, 'acto2-pacto-cruce.report.json')
REFERENCES = {  # earlier tracks to compare with (the approved sketch, the old Act II boss, the Act I boss)
    'boceto jefe-templo': os.path.join(ROOT, 'scripts', 'musica', 'leitmotivs', 'build', 'acto2-jefe-templo.mp3'),
    'src jefe2.mp3 (antigua)': os.path.join(ROOT, 'src', 'audio', 'jefe2.mp3'),
    'src cap1-e0-jefe.mp3': os.path.join(ROOT, 'src', 'audio', 'cap1-e0-jefe.mp3'),
}
SR = 44100
BPM, BEATS, BARS = 160, 4, 56
BAR_S = BEATS * 60 / BPM                      # 1.5 s
LOOP_SAMPLES = 3704400                        # 56 × 1.5 s × 44 100
TARGET_LUFS = {'malachar': -17.3, 'abaddon': -16.3}

VSCO = 'VSCO-2-CE'
VCSL_MEMB = 'VCSL/Membranophones/Struck Membranophones'
VCSL_IDIO = 'VCSL/Idiophones/Struck Idiophones'
SSO = 'sso/Sonatina Symphonic Orchestra'


def sso(folder: str, name: str) -> str:
    return f'{SSO}/{folder}/{name}.sfz'


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


# ── seating, shared by both tracks: track → (sfz, bus, pan, hall send, stereo width) ──
# The pans are the brief's. The choirs stand in the middle of the hall, a little back; the common
# skeleton (bass drum, frame drum, timpani) at the back; the organ, bells and gong far away in the
# temple (Malachar's ritual rings more); Abaddon's brass, tremolos and spiccato close and drier.
SEATS = {
    # common to both tracks (criterion 20: same placement; the common layers and the choirs also same gain)
    'Choir Low': (sso('Chorus - Performance', 'Large Chorus'), 'coro', -0.15, 0.32, 0.9),
    'Choir High': (sso('Chorus - Performance', 'Mixed Chorus'), 'coro', 0.15, 0.34, 0.9),
    'Chant': (sso('Chorus - Performance', 'Large Chorus'), 'coro', 0.0, 0.28, 0.7),
    'Organ Pedal': (sso('Organ', 'Pedal - Bourdon 16ft'), 'pedal', 0.0, 0.30, 0.6),
    'Bass Drum': (f'{VCSL_MEMB}/Bass Drum 2.sfz', 'bombo', 0.0, 0.38, 0.5),
    'Frame Drum': (f'{VCSL_MEMB}/Frame Drum.sfz', 'tambores', -0.20, 0.38, 0.6),
    'Timpani': (f'{VSCO}/Timpani.sfz', 'timbales', 0.10, 0.42, 0.6),
    # Malachar only
    'Choir High 2': (sso('Chorus - Performance', 'Large Chorus'), 'coro', 0.25, 0.36, 0.9),
    'Organ 8': (sso('Organ', 'Great - Open Diapason 8ft'), 'organo', -0.30, 0.50, 0.8),
    'Organ 16': (sso('Organ', 'Great - Bourdon 16ft'), 'bordon', 0.0, 0.42, 0.7),
    'Didgeridoo': ('VCSL/Aerophones/Lip Aerophones/Didgeridoo.sfz', 'drone', 0.0, 0.32, 0.5),
    'Contrabassoon': (sso('Woodwinds - Performance', 'Contrabassoon Solo Sustain (looped)'), 'drone', -0.10, 0.32, 0.5),
    'Low Trem': (sso('Strings - Performance', 'Basses Tremolo'), 'bajos', 0.10, 0.28, 0.7),
    'Darbuka': (f'{VCSL_MEMB}/Darbuka.sfz', 'ritmo', 0.30, 0.32, 0.6),
    'Col Legno Vc': (sso('Strings - Performance', 'Celli Col Legno'), 'ritmo', 0.35, 0.30, 0.8),
    'Pact Bells': (f'{VCSL_IDIO}/Tubular Bells 1.sfz', 'campanas', 0.20, 0.55, 0.7),
    'Hand Bell': (f'{VCSL_IDIO}/Hand Bells, Nepalese.sfz', 'campanas', -0.35, 0.55, 0.6),
    'Finger Cymbals': (f'{VCSL_IDIO}/Finger Cymbals.sfz', 'crotalos', 0.40, 0.55, 0.6),
    'Gong': (f'{VCSL_IDIO}/Gong 1.sfz', 'gong', 0.25, 0.60, 0.8),
    # Abaddon only
    'Horns Low': (sso('Brass - Performance', 'Horns Sustain'), 'metales', -0.30, 0.30, 0.7),
    'Choir Shout': (sso('Chorus - Performance', 'Large Chorus'), 'coro', 0.25, 0.30, 0.9),
    'Demon': (sso('Brass - Performance', 'Trombones Marcato'), 'metales', 0.25, 0.22, 0.7),
    'Demon Low': (sso('Brass - Performance', 'Tuba Marcato'), 'metales', 0.30, 0.20, 0.6),
    'Celli Trem': (sso('Strings - Performance', 'Celli Tremolo'), 'cuerdas', -0.15, 0.22, 0.9),
    'Violas Trem': (sso('Strings - Performance', 'Violas Tremolo'), 'cuerdas', 0.20, 0.24, 0.9),
    'Cellos Spic': (f'{VSCO}/CelloEnsSpic.sfz', 'ritmo', 0.30, 0.18, 0.8),
    'Knives': (f'{VSCO}/ViolinEnsSpic.sfz', 'ritmo', -0.40, 0.20, 0.8),
    'Tom': (f'{VCSL_MEMB}/Tom 2.sfz', 'toms', 0.15, 0.30, 0.6),
    'Gong Full': (f'{VCSL_IDIO}/Gong 2.sfz', 'gong', 0.25, 0.45, 0.8),
    'Cymbal': (f'{VCSL_IDIO}/Suspended Cymbal 2.sfz', 'plato', 0.20, 0.45, 0.8),
}

TRACKS = {
    'malachar': ['Choir Low', 'Choir High', 'Choir High 2', 'Chant', 'Organ Pedal', 'Organ 8', 'Organ 16', 'Didgeridoo',
                 'Contrabassoon', 'Low Trem', 'Darbuka', 'Col Legno Vc', 'Bass Drum', 'Frame Drum', 'Timpani',
                 'Pact Bells', 'Hand Bell', 'Finger Cymbals', 'Gong'],
    'abaddon': ['Choir Low', 'Choir High', 'Choir Shout', 'Chant', 'Organ Pedal', 'Horns Low', 'Demon', 'Demon Low',
                'Celli Trem', 'Violas Trem', 'Cellos Spic', 'Knives', 'Bass Drum', 'Frame Drum', 'Timpani', 'Tom',
                'Gong Full', 'Cymbal'],
}
CHOIRS = {'Choir Low', 'Choir High', 'Choir High 2', 'Chant', 'Choir Shout'}
COMMON_LAYERS = ('Bass Drum', 'Frame Drum', 'Timpani', 'Organ Pedal')

# ── levels (gain_db, before the bus) ──
# One gain for every track that exists in both: the common layers are note-for-note identical and must
# sum in phase in the crossfade; the choirs have the same notes and only their CC1 changes.
COMMON_GAIN = {
    'Choir Low': 0.0, 'Choir High': -3.5, 'Chant': 0.5,
    'Organ Pedal': -9.5, 'Bass Drum': -14.5, 'Frame Drum': -9.5, 'Timpani': -1.5,
}
# Each version's own accompaniment sits a step under the choir that sings (measured per bar after the
# bus): Malachar's rite 4–6 LU under it (the choirs lead), Abaddon's chaos about level with it.
GAIN = {
    'malachar': {
        'Choir High 2': -4.5, 'Organ 8': -25.0, 'Organ 16': -23.0, 'Didgeridoo': 14.0, 'Contrabassoon': -11.0,
        'Low Trem': -13.0, 'Darbuka': -18.0, 'Col Legno Vc': -7.0, 'Pact Bells': -8.0, 'Hand Bell': 4.0,
        'Finger Cymbals': 8.0, 'Gong': 4.0,
    },
    'abaddon': {
        'Choir Shout': -3.5, 'Horns Low': -16.5, 'Demon': -15.5, 'Demon Low': -15.5, 'Celli Trem': -11.5,
        'Violas Trem': -12.5, 'Cellos Spic': -12.5, 'Knives': -12.0, 'Tom': -11.5, 'Gong Full': -11.5, 'Cymbal': -8.5,
    },
}
# Fader rides. The tracks of both versions ride the same in the two (COMMON_AUTOMATION), so they stay
# in phase and at one level through the crossfade; the rest ride per version. The loop wraps from bar 56
# into bar 1, so a ride over both ends has the same value at the two.
# Bar 36 (the E♭7 held by both choirs, three voices each) peaks 3–4 dB over the rest of the choir parts:
# taming it lets the whole choir come up 1.5–2.5 dB under the -6 dB part ceiling (criterion 19).
CHORD_36 = ride((36, 36, -3.0))
COMMON_AUTOMATION: dict[str, list[tuple[float, float]]] = {'Choir Low': CHORD_36, 'Choir High': CHORD_36}
# The intro (1–4) and its return (53–56) are a drone and a kick: the floor of each version comes up there
# so the seam is not a hole (and a crossfade landing there does not jump): Malachar's didgeridoo and 16'
# bourdon, Abaddon's cello cluster and spiccato. Malachar's gong: the dark strokes (61) come up, the two
# full ones (60, bars 37 and 43, ringing on) stay where they were.
def ends(db: float, rise_from: float = 52.97) -> list[tuple[float, float]]:
    """+db over bars 1–4 and from bar 53 on (held past the loop end, so the tail folded onto bar 1 gets
    it too: no step at the seam). The lift starts at `rise_from`: a note held into bar 53 swells gently."""
    return [(4.95, db), (5, 0.0), (rise_from, 0.0), (53, db)]


AUTOMATION: dict[str, dict[str, list[tuple[float, float]]]] = {
    'malachar': {
        'Choir High 2': CHORD_36,
        'Didgeridoo': ends(8.5, rise_from=51),  # its note 68 holds from bar 49 to 56
        'Organ 16': ends(12.0),
        'Gong': ride((37, 48, -8.0)),
    },
    'abaddon': {
        'Celli Trem': ends(4.0),
        'Cellos Spic': ends(3.0),
    },
}

# ── subtractive EQ per bus: high-pass all but the bass, mud out at 200–400 Hz where it piles up, a
# dip in 2–5 kHz for the game's SFX, soft highs (the user hates highs that bite). The buses of the
# common layers are linear (no compressor) and, like the choir bus, identical in both tracks. ──
BUSES_SHARED = {
    'coro': {'highpass': 90, 'peaks': [(300, -2.0, 1.0), (3000, -3.0, 1.0), (5000, -2.0, 1.2)],
             'high_shelf': (7000, -3.0), 'comp': (-20, 1.5)},
    # the 16' pedal sounds an octave down (C#1–A#1, 35–58 Hz): its fundamental is cut so its 2nd and 3rd
    # harmonics carry the bass line and the sub band stays clear (criterion 18)
    'pedal': {'highpass': 80, 'low_shelf': (70, -8.0), 'peaks': [(40, -8.0, 1.0), (52, -6.0, 1.4), (250, -2.0, 1.0)],
              'high_shelf': (3000, -4.0)},
    # its boom sits at 40–50 Hz: the punch is left at 60–120 Hz
    'bombo': {'highpass': 75, 'low_shelf': (60, -6.0), 'peaks': [(46, -4.0, 1.2), (300, -3.0, 1.0)], 'high_shelf': (3500, -4.0)},
    'tambores': {'highpass': 60, 'peaks': [(320, -3.5, 0.9), (3500, -3.0, 0.8)], 'high_shelf': (6000, -4.0)},
    'timbales': {'highpass': 40, 'peaks': [(320, -2.0, 1.0)], 'high_shelf': (5000, -3.0)},
    'ritmo': {'highpass': 45, 'peaks': [(300, -2.5, 1.0), (3200, -3.0, 1.0)], 'high_shelf': (6000, -3.0)},
    'gong': {'highpass': 45, 'peaks': [(300, -2.0, 1.0), (3000, -3.0, 1.0)], 'high_shelf': (6000, -5.0)},
}
BUSES = {
    'malachar': {
        **BUSES_SHARED,
        'organo': {'highpass': 150, 'peaks': [(300, -3.0, 1.0), (2800, -3.0, 1.0)], 'high_shelf': (6000, -3.0)},
        # the 16' bourdon (C#1 and G#1 sounding): the same trim as the pedal, its fundamentals notched
        'bordon': {'highpass': 70, 'low_shelf': (60, -6.0), 'peaks': [(36, -6.0, 1.2), (52, -4.0, 1.4), (250, -2.0, 1.0)],
                   'high_shelf': (3000, -4.0)},
        'drone': {'highpass': 40, 'peaks': [(120, -3.0, 1.0), (300, -2.0, 1.0)], 'high_shelf': (5000, -3.0)},
        'bajos': {'highpass': 35, 'peaks': [(230, -1.5, 1.0)], 'high_shelf': (4000, -4.0)},
        'campanas': {'highpass': 300, 'peaks': [(3000, -3.0, 1.0)], 'high_shelf': (6000, -6.0)},
        'crotalos': {'highpass': 1000, 'peaks': [(3500, -3.0, 1.0)], 'high_shelf': (6000, -6.0)},
    },
    'abaddon': {
        **BUSES_SHARED,
        'metales': {'highpass': 70, 'peaks': [(300, -2.5, 1.0), (3000, -3.0, 1.0)], 'high_shelf': (5000, -3.0), 'comp': (-20, 1.6)},
        'cuerdas': {'highpass': 60, 'peaks': [(280, -3.0, 1.0), (3000, -2.5, 1.0)], 'high_shelf': (6000, -3.0)},
        'toms': {'highpass': 60, 'peaks': [(320, -3.0, 0.9), (3500, -3.0, 0.8)], 'high_shelf': (6000, -4.0)},
        'plato': {'highpass': 350, 'peaks': [(3500, -5.0, 0.7)], 'high_shelf': (7000, -6.0)},
    },
}

# one hall for both tracks (criterion 20): the sketch's 2.0 s a little longer for the rite
REVERB = {'seconds': 2.2, 'predelay': 0.025, 'damping': 0.5}
REVERB_EQ = {'highpass': 140, 'peaks': [(350, -3.0, 0.8)], 'high_shelf': (6500, -3.0)}  # no muddy or hissy hall
REVERB_RETURN_DB = -4.5
MASTER_BUS = {'highpass': 28, 'comp': (-18, 1.5)}

SECTIONS = {
    'intro 1-4': (1, 4), 'A 5-12': (5, 12), "A' 13-20": (13, 20), 'B 21-28': (21, 28),
    'puente 29-36': (29, 36), 'puente 29-30': (29, 30), 'puente 35-36': (35, 36),
    'clímax 37-48': (37, 48), 'clímax 37-44': (37, 44), 'caída 45-48': (45, 48), 'c43': (43, 43),
    'codetta 49-56': (49, 56),
}
FORM = ('intro 1-4', 'A 5-12', "A' 13-20", 'B 21-28', 'puente 29-36', 'clímax 37-48', 'codetta 49-56')  # §3

# the same trim on every part of both tracks: headroom so no part peaks over -6 dB before its bus
# (criterion 19); the master's loudness normalization gives it back
TRIM_DB = 0.0


def parts(version: str) -> list[Part]:
    gains = {track: g + TRIM_DB for track, g in {**COMMON_GAIN, **GAIN[version]}.items()}
    out = []
    for track in TRACKS[version]:
        sfz, bus, pan, send, width = SEATS[track]
        out.append(Part(track, sfz, bus, pan=pan, gain_db=gains[track], send=send, width=width,
                        automation=COMMON_AUTOMATION.get(track) or AUTOMATION[version].get(track, [])))
    return out


def spec(version: str) -> render.MixSpec:
    return render.MixSpec(
        midi=MIDI[version], out=OUT[version], bpm=BPM, beats_per_bar=BEATS, bars=BARS, parts=parts(version),
        buses=BUSES[version], reverb=REVERB, reverb_return_db=REVERB_RETURN_DB, reverb_eq=REVERB_EQ,
        master_bus=MASTER_BUS, target_lufs=TARGET_LUFS[version], ceiling_dbtp=-1.0, tail_seconds=4.0,
        sections=SECTIONS,
    )


# ── per-section loudness of each part (criterion 19) ───────────────────────
def _section_lufs(x: np.ndarray, sections: dict[str, tuple[int, int]]) -> dict[str, float]:
    bar = BAR_S * SR
    out = {}
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        for name, (a, b) in sections.items():
            seg = x[int(round((a - 1) * bar)): int(round(b * bar))]
            v = mix.lufs(seg, SR) if np.abs(seg).max() > 1e-6 else float('-inf')
            out[name] = round(v, 1) if np.isfinite(v) else None
    return out


def _bands_abs(x: np.ndarray) -> dict[str, float]:
    """Band levels in dB of mean power (absolute, so parts can be compared with each other)."""
    total = 10 * np.log10(np.mean(x.mean(axis=1) ** 2) + 1e-20)
    return {k: round(v + total, 1) for k, v in mix.band_energy(x, SR).items()}


@contextmanager
def capture_parts(spec_: render.MixSpec, store: dict, bands: dict):
    """While render() runs, records the per-section loudness of every part as it leaves its fader
    (after pan and gain_db, before the bus: what the report's pico_db measures) and of the sum of the
    choirs, and the band balance of each part (to see who fills which band before the bus EQ).
    render() places the parts in the order of spec.parts, so the n-th call is the n-th part."""
    original = render._place
    queue = list(spec_.parts)
    choir_sum = [None]

    def place(x, pan, width):
        y = original(x, pan, width)
        part = queue.pop(0)
        placed = y * 10 ** (part.gain_db / 20)
        store[part.track] = _section_lufs(placed, SECTIONS)
        bands[part.track] = _bands_abs(placed)
        if part.track in CHOIRS:
            choir_sum[0] = placed.copy() if choir_sum[0] is None else choir_sum[0] + placed
        return y

    render._place = place
    try:
        yield
    finally:
        render._place = original
        if choir_sum[0] is not None:
            store['(suma de coros)'] = _section_lufs(choir_sum[0], SECTIONS)


# ── measures of existing MP3s ──────────────────────────────────────────────
def decode(path: str) -> np.ndarray:
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def measure(x: np.ndarray, sections: dict[str, tuple[int, int]] | None = None) -> dict:
    out = {'samples': len(x), 'lufs': round(mix.lufs(x, SR), 2), 'true_peak_db': round(mix.true_peak_db(x, SR), 2),
           'seam_jump': round(mix.seam_jump(x), 4), 'bands_db': {k: round(v, 1) for k, v in mix.band_energy(x, SR).items()}}
    if sections:
        bar = BAR_S * SR
        out['sections_lufs'] = {name: round(mix.lufs(x[int(round((a - 1) * bar)): int(round(b * bar))], SR), 1)
                                for name, (a, b) in sections.items()}
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


# ── crossfade tests (criterion 22) ─────────────────────────────────────────
FADE = 1.6
CROSSES = {  # name → (Malachar until, Abaddon until), seconds; the fade starts at the first
    'c14': (20.0, 40.0),
    'c39': (57.0, 75.0),
}


def cross_out(name: str) -> str:
    return os.path.join(BUILD, f'acto2-pacto-cruce-{name}.mp3')


def crossfade(ma: np.ndarray, ab: np.ndarray, at: float, until: float) -> np.ndarray:
    """What the game plays: both tracks run in sync and a linear 1.6 s fade moves from Malachar to Abaddon."""
    n = int(round(until * SR))
    t = np.arange(n) / SR
    to_ab = np.clip((t - at) / FADE, 0, 1)[:, None]
    return (ma[:n] * (1 - to_ab) + ab[:n] * to_ab).astype(np.float32)


def cross_checks(ma: np.ndarray, ab: np.ndarray, cr: np.ndarray, at: float) -> dict:
    n = len(cr)
    t, l_ma = short_term(ma[:n])
    _, l_ab = short_term(ab[:n])
    _, l_cr = short_term(cr)
    near = (t >= at - 1.5) & (t <= at + FADE + 1.5)  # every 3 s window that overlaps the fade
    dip = float((l_ma - l_cr)[near].max())           # how far the crossfade sinks below Malachar
    jump = float((l_cr - l_ma)[near].max())          # how far it rises over Malachar
    over_ab = float((l_cr - l_ab)[near].max())       # never louder than where it lands
    gap = float((l_ab - l_ma)[near].mean())          # the level step between the tracks there
    slope = float(np.abs(np.diff(l_cr[near])).max() / 0.1)
    own = float(max(np.abs(np.diff(l_ma[near])).max(), np.abs(np.diff(l_ab[near])).max()) / 0.1)
    return {'bache_lu': round(dip, 2), 'salto_lu': round(jump, 2), 'sobre_abaddon_lu': round(over_ab, 2),
            'abaddon_menos_malachar_lu': round(gap, 2), 'pendiente_lu_s': round(slope, 2),
            'pendiente_propia_lu_s': round(own, 2)}


def onset_offsets(tracks: list[str]) -> dict[str, dict]:
    """For the tracks with the same name in both MIDIs: largest gap (ms) between attacks that share a
    16th of the grid (> ~15 ms would be heard as a flam) and whether the notes are identical."""
    ma, ab = midi_io.load(MIDI['malachar']).tracks, midi_io.load(MIDI['abaddon']).tracks
    grid = 60 / BPM / 4
    out = {}
    for name in tracks:
        a = {round(n.start / grid): n.start for n in ma[name].notes}
        b = {round(n.start / grid): n.start for n in ab[name].notes}
        shared = set(a) & set(b)
        same = [(n.pitch, round(n.start, 5), round(n.end, 5)) for n in ma[name].notes] == \
               [(n.pitch, round(n.start, 5), round(n.end, 5)) for n in ab[name].notes]
        out[name] = {'desfase_ms': round(max((abs(a[k] - b[k]) for k in shared), default=0) * 1000, 1),
                     'mismas_notas': same}
    return out


# ── report ──────────────────────────────────────────────────────────────────
def leaders(per_part: dict[str, dict], section: str, exclude_choirs: bool = True) -> tuple[str, float]:
    """Loudest single part of a section (by its gated loudness there)."""
    vals = [(name, s[section]) for name, s in per_part.items()
            if s.get(section) is not None and name != '(suma de coros)' and not (exclude_choirs and name in CHOIRS)]
    return max(vals, key=lambda kv: kv[1]) if vals else ('-', float('-inf'))


def checks(r: dict[str, dict], cross: dict) -> list[tuple[str, bool, str]]:
    ma, ab = r['malachar'], r['abaddon']
    res = [
        ('14 Malachar -17,3 ± 0,3 LUFS', abs(ma['lufs'] + 17.3) <= 0.3, f"{ma['lufs']} LUFS"),
        ('14 Abaddon -16,3 ± 0,3 LUFS', abs(ab['lufs'] + 16.3) <= 0.3, f"{ab['lufs']} LUFS"),
    ]
    for v in VERSIONS:
        res.append((f'14 {v} pico real ≤ -1 dBTP', r[v]['true_peak_db'] <= -1.0, f"{r[v]['true_peak_db']} dBTP"))
    for v in VERSIONS:
        res.append((f'15 {v} loop_samples = 3 704 400', r[v]['loop_samples'] == LOOP_SAMPLES, str(r[v]['loop_samples'])))
        res.append((f'15 {v} seam_jump < 0,02', r[v]['seam_jump'] < 0.02, str(r[v]['seam_jump'])))
    for v, (lo, hi) in (('malachar', (5, 9)), ('abaddon', (4, 8))):
        s = r[v]['sections_lufs']
        c = s['clímax 37-44'] - s['B 21-28']
        res.append((f'16 {v} clímax 37-44 − B en {lo}–{hi} LU', lo <= c <= hi, f'{c:.1f} LU'))
        p = s['puente 35-36'] - s['puente 29-30']
        res.append((f'16 {v} puente 35-36 − 29-30 ≥ +2 LU', p >= 2, f'{p:+.1f} LU'))
    for name in FORM:
        d = ab['sections_lufs'][name] - ma['sections_lufs'][name]
        res.append((f'17 Abaddon − Malachar en {name} en +0,5–3 LU', 0.5 <= d <= 3, f'{d:+.1f} LU'))
    for v in VERSIONS:
        b = r[v]['bands_db']
        air = -29 if v == 'malachar' else -28
        res.append((f'18 {v} presencia 2.5-6k ≤ -18 dB', b['presencia 2.5-6k'] <= -18, str(b['presencia 2.5-6k'])))
        res.append((f'18 {v} aire 6-16k ≤ {air} dB', b['aire 6-16k'] <= air, str(b['aire 6-16k'])))
        res.append((f'18 {v} sub <60 ≤ -18 dB', b['sub <60'] <= -18, str(b['sub <60'])))
    for v in VERSIONS:
        worst = max(r[v]['parts'].items(), key=lambda kv: kv[1]['pico_db'])
        res.append((f'19 {v} ninguna parte > -6 dB de pico', worst[1]['pico_db'] <= -6, f'{worst[0]} {worst[1]["pico_db"]} dB'))
    per = r['malachar']['por_seccion']
    for section in ('A 5-12', "A' 13-20", 'clímax 37-44'):
        choirs = per['(suma de coros)'][section]
        top, val = leaders(per, section)
        res.append((f'19 Malachar coros > resto en {section}', choirs > val, f'coros {choirs} LUFS · {top} {val} LUFS'))
    per = r['abaddon']['por_seccion']
    for section in ('A 5-12', 'clímax 37-44'):
        choirs = per['(suma de coros)'][section]
        demon = per['Demon'][section]
        res.append((f'19 Abaddon coros > Demon en {section}', choirs > demon, f'coros {choirs} LUFS · Demon {demon} LUFS'))
    for v, (lo, hi) in (('malachar', (-7, -4)), ('abaddon', (-8, -5))):
        w = r[v]['wet_dry_lu']
        res.append((f'21 {v} sala en {lo}–{hi} LU', lo <= w <= hi, f'{w} LU'))
    for name, c in cross.items():
        if name == 'ataques':
            continue
        res.append((f'22 cruce {name}: bache ≤ 2 LU bajo Malachar', c['bache_lu'] <= 2, f"{c['bache_lu']} LU"))
        res.append((f'22 cruce {name}: salto ≤ +4 LU', c['salto_lu'] <= 4, f"{c['salto_lu']} LU"))
    flams = cross['ataques']
    res.append(('22 sin flam en las pistas compartidas (≤ 1 ms)', all(f['desfase_ms'] <= 1 for f in flams.values()),
                ', '.join(f"{k} {f['desfase_ms']} ms" for k, f in flams.items())))
    res.append(('20 capas comunes idénticas nota a nota', all(flams[k]['mismas_notas'] for k in COMMON_LAYERS),
                ', '.join(k for k in COMMON_LAYERS if not flams[k]['mismas_notas']) or 'sí'))
    return res


def check_shared_seating() -> None:
    """Criterion 20, enforced by construction: one seat per track name, one hall, one gain and the
    same rides for the tracks of both versions, identical buses for the common layers and the choirs,
    and no compressor on the common layers."""
    both = set(TRACKS['malachar']) & set(TRACKS['abaddon'])
    assert both == set(COMMON_GAIN), sorted(both ^ set(COMMON_GAIN))
    for v in VERSIONS:
        assert not set(GAIN[v]) & set(COMMON_GAIN) and not set(AUTOMATION[v]) & set(COMMON_GAIN)
        assert set(TRACKS[v]) == set(COMMON_GAIN) | set(GAIN[v])
    for track in both:
        bus = SEATS[track][1]
        assert BUSES['malachar'][bus] == BUSES['abaddon'][bus], bus
        if track in COMMON_LAYERS:
            assert 'comp' not in BUSES['malachar'][bus], bus
    assert not {'Horn', 'Trumpet'} & {w.rstrip('s') for t in TRACKS['malachar'] for w in SEATS[t][0].replace('/', ' ').split()}


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
    cols = FORM
    print('  LUFS por sección y parte:  ' + ' '.join(f'{c.split()[0][:7]:>7s}' for c in cols))
    for name, s in report['por_seccion'].items():
        print(f'    {name:22s} ' + ' '.join(f'{s[c]:7.1f}' if s.get(c) is not None else '      -' for c in cols))
    if report.get('bandas_por_parte'):
        names = list(next(iter(report['bandas_por_parte'].values())))
        print('  Bandas por parte (dB absolutos, antes del bus): ' + ' '.join(f'{n.split()[0][:8]:>8s}' for n in names))
        for name, b in report['bandas_por_parte'].items():
            print(f'    {name:44s} ' + ' '.join(f'{b[n]:8.1f}' for n in names))
    print('  Secciones (LUFS sobre el máster):')
    for name, val in report['sections_lufs'].items():
        before = previous['sections_lufs'].get(name) if previous else None
        print(f'    {name:16s} {val:6.1f}' + (f'   (antes {before:6.1f})' if before is not None else ''))
    if previous:
        print(f"  Anterior: {previous['lufs']} LUFS · {previous['true_peak_db']} dBTP · seam {previous['seam_jump']} · "
              f"sala {previous.get('wet_dry_lu')} LU")


def render_version(v: str) -> dict:
    sp = spec(v)
    per_part: dict[str, dict] = {}
    bands: dict[str, dict] = {}
    with capture_parts(sp, per_part, bands):
        report = render.render(sp)
    report['por_seccion'] = per_part
    report['bandas_por_parte'] = bands
    # the measures that count are the MP3's; the render's own (before encoding) stay for reference
    keys = ('lufs', 'true_peak_db', 'seam_jump', 'bands_db', 'sections_lufs')
    report['antes_del_mp3'] = {k: report[k] for k in keys}
    decoded = measure(decode(OUT[v]), SECTIONS)
    assert decoded['samples'] == LOOP_SAMPLES, decoded['samples']
    report.update({k: decoded[k] for k in keys})
    return report


def main(only: list[str]) -> int:
    check_shared_seating()
    reports, previous = {}, {}
    for v in VERSIONS:
        previous[v] = json.load(open(REPORT[v])) if os.path.exists(REPORT[v]) else None
        if v in only or previous[v] is None:
            reports[v] = render_version(v)
            with open(REPORT[v], 'w') as f:
                json.dump(reports[v], f, indent=1, ensure_ascii=False)
            print_report(v, reports[v], previous[v])
        else:
            reports[v] = previous[v]
            print(f'\n══ {v} ══ (sin cambios: informe de {REPORT[v]})')

    # crossfades from the MP3s, as the game hears them (same decoder for both: same alignment)
    ma, ab = decode(OUT['malachar']), decode(OUT['abaddon'])
    cross: dict = {}
    print('\n══ cruces Malachar → Abaddon ══')
    for name, (at, until) in CROSSES.items():
        cr = crossfade(ma, ab, at, until)
        mix.export_mp3(cr, SR, cross_out(name))
        cross[name] = {'at_s': at, 'hasta_s': until, **cross_checks(ma, ab, cr, at)}
        c = cross[name]
        print(f'  {cross_out(name)}\n    fundido en {at} s (c. {int(at // BAR_S) + 1}): bache {c["bache_lu"]} LU · '
              f'salto {c["salto_lu"]} LU · sobre Abaddon {c["sobre_abaddon_lu"]} LU · Abaddon − Malachar '
              f'{c["abaddon_menos_malachar_lu"]} LU · pendiente máx. {c["pendiente_lu_s"]} LU/s '
              f'(la de las propias pistas: {c["pendiente_propia_lu_s"]} LU/s)')
    cross['ataques'] = onset_offsets(sorted(set(TRACKS['malachar']) & set(TRACKS['abaddon'])))
    print('  pistas compartidas: ' + ', '.join(f"{k} {f['desfase_ms']} ms{'' if f['mismas_notas'] else ' (notas distintas)'}"
                                              for k, f in cross['ataques'].items()))
    with open(CROSS_REPORT, 'w') as f:
        json.dump(cross, f, indent=1, ensure_ascii=False)

    refs = {name: measure(decode(path)) for name, path in REFERENCES.items() if os.path.exists(path)}
    print('\nBandas dB (rel. al total)   malachar  abaddon' + ''.join(f'  {n[:18]:>18s}' for n in refs))
    for k in reports['malachar']['bands_db']:
        print(f"  {k:24s} {reports['malachar']['bands_db'][k]:7.1f}  {reports['abaddon']['bands_db'][k]:7.1f}"
              + ''.join(f'  {m["bands_db"][k]:18.1f}' for m in refs.values()))
    for name, m in refs.items():
        print(f"  {name}: {m['samples']} muestras · {m['lufs']} LUFS · {m['true_peak_db']} dBTP · seam {m['seam_jump']}")

    print('\nCriterios del brief:')
    results = checks(reports, cross)
    for label, ok, value in results:
        print(f"  [{'ok' if ok else 'FALLA'}] {label}: {value}")
    return 0 if all(ok for _, ok, _ in results) else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:] or list(VERSIONS)))
