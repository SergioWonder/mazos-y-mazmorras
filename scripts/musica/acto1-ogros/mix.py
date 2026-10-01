"""«Tambores en el valle» (El Asentamiento Ogro, Act I): mix and master of the two synchronized
versions (brief: docs/musica/acto1-ogros.md, section 8 criteria 12–19).

Reads build/acto1-ogros-explora.mid and build/acto1-ogros-combate.mid (written by compose.py),
renders each with its own MixSpec over one shared hall and one shared seating, masters them as
seamless loops (exploration -17.5 LUFS, combat -16.5 LUFS, -1 dBTP) and writes
build/acto1-ogros-explora.mp3 and build/acto1-ogros-combate.mp3 with their JSON reports.
Then builds the crossfade test build/acto1-ogros-cruce.mp3 the way the game does it
(src/fx/audio.ts, cruzarVersion: same loop position, linear 1.6 s fade): exploration 0–24 s,
combat from 24 s, exploration again from 56 s, and measures its short-term loudness against the
two versions.

Prints the reports, the brief checks and a comparison with the previous build and with the old
synthesized Act I track (src/audio/cap1.mp3).

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/acto1-ogros/mix.py
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

from estudio import mix, render  # noqa: E402
from estudio.render import Part  # noqa: E402

BUILD = os.path.join(HERE, 'build')
VERSIONS = ('explora', 'combate')
MIDI = {v: os.path.join(BUILD, f'acto1-ogros-{v}.mid') for v in VERSIONS}
OUT = {v: os.path.join(BUILD, f'acto1-ogros-{v}.mp3') for v in VERSIONS}
REPORT = {v: os.path.join(BUILD, f'acto1-ogros-{v}.report.json') for v in VERSIONS}
CROSS_OUT = os.path.join(BUILD, 'acto1-ogros-cruce.mp3')
CROSS_REPORT = os.path.join(BUILD, 'acto1-ogros-cruce.report.json')
OLD_TRACK = os.path.join(ROOT, 'src', 'audio', 'cap1.mp3')
SR = 44100
LOOP_SAMPLES = 3528000
TARGET_LUFS = {'explora': -17.5, 'combate': -16.5}
# LAME 4.0 in CBR (192k, as estudio.mix.export_mp3 writes) comes out 0.264 dB under its input (a 0.5 sine
# decodes at 0.4851 with ffmpeg and with libsndfile; VBR keeps the level). The master aims that much higher
# and every check below is measured on the decoded MP3, the file the game plays.
MP3_LOSS_DB = 0.0  # the studio now exports VBR, which keeps the level (it was 0.26 with CBR 192k)

VSCO = 'VSCO-2-CE'
VCSL_MEMB = 'VCSL/Membranophones/Struck Membranophones'
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
# horns left and back; trombones centre-right; timpani and drums at the back; the forge far away.
SEATS = {
    # common to both versions (criterion 18: same placement; the common layers also same gain)
    'Basses Pizz': (vsco('ContrabassPizz'), 'bajos', 0.40, 0.20, 0.6),
    'Harp': ('VCSL/Chordophones/Composite Chordophones/Concert Harp.sfz', 'arpa', -0.45, 0.32, 0.8),
    'Timpani': (vsco('Timpani'), 'timbales', -0.10, 0.45, 0.6),
    'Timpani Roll': (vsco('TimpaniRolls'), 'timbales', -0.10, 0.45, 0.6),
    'Frame Drum': (f'{VCSL_MEMB}/Frame Drum.sfz', 'tambores', 0.25, 0.38, 0.6),
    'Forge': (f'{VCSL_IDIO}/Brake Drum.sfz', 'forja', 0.35, 0.60, 0.5),
    'Violins Sus': (vsco('ViolinEnsSusVib'), 'violines', -0.40, 0.24, 1.0),
    'Violas Trem': (vsco('ViolaEnsTrem'), 'violas', 0.15, 0.28, 1.0),
    # exploration only
    'Trompa': (vsco('FHornSus'), 'trompas', -0.25, 0.40, 0.7),
    'Clarinet Sus': (vsco('ClarinetSus'), 'maderas', -0.05, 0.30, 0.6),
    'Recorder': ('VCSL/Aerophones/Edge-blown Aerophones/Baroque Alto Recorder - SusVib.sfz', 'maderas', 0.10, 0.30, 0.6),
    'Flute Sus': (vsco('FluteSusVib'), 'maderas', -0.15, 0.30, 0.6),
    'Violins Sus Quiet': (vsco('ViolinEnsSusVib-Quiet'), 'violines', -0.35, 0.26, 1.0),
    'Violas Sus': (vsco('ViolaEnsSusVib'), 'violas', 0.15, 0.26, 1.0),
    'Violas Sus Quiet': (vsco('ViolaEnsSusVib-Quiet'), 'violas', 0.15, 0.26, 1.0),
    'Cellos Sus': (vsco('CelloEnsSusVib'), 'chelos', 0.30, 0.22, 1.0),
    'Cellos Sus Quiet': (vsco('CelloEnsSusVib-Quiet'), 'chelos', 0.30, 0.22, 1.0),
    'Cellos Pizz': (vsco('CelloEnsPizz'), 'chelos', 0.30, 0.24, 1.0),
    'Basses Sus': (vsco('ContrabassSusVB'), 'bajos', 0.40, 0.18, 0.6),
    'Basses Sus Quiet': (vsco('ContrabassSusVB-Quiet'), 'bajos', 0.40, 0.18, 0.6),
    # combat only
    'Horns Marc': (f'{SSO}/Brass - Performance/Horns Marcato.sfz', 'trompas', -0.25, 0.40, 0.7),
    'Horns Sus': (f'{SSO}/Brass - Performance/Horns Sustain.sfz', 'trompas', -0.25, 0.42, 0.7),
    'Trombones Marc': (f'{SSO}/Brass - Performance/Trombones Marcato.sfz', 'trombones', 0.20, 0.34, 0.7),
    'Trombones Sus': (f'{SSO}/Brass - Performance/Trombones Sustain (looped).sfz', 'trombones', 0.20, 0.36, 0.7),
    'Violins Marc': (f'{SSO}/Strings - Performance/1st Violins Marcato.sfz', 'violines', -0.40, 0.22, 1.0),
    'Violins Trem': (vsco('ViolinEnsTrem'), 'violines', -0.35, 0.26, 1.0),
    'Violas Spic': (vsco('ViolaEnsSpic'), 'violas', 0.15, 0.24, 1.0),
    'Cellos Spic': (vsco('CelloEnsSpic'), 'chelos', 0.30, 0.20, 1.0),
    'Basses Spic': (vsco('ContrabassSpic'), 'bajos', 0.40, 0.18, 0.6),
    'Bass Drum': (f'{VCSL_MEMB}/Bass Drum 2.sfz', 'bombo', 0.0, 0.42, 0.5),
    'Bass Drum Roll': (f'{VCSL_MEMB}/Bass Drum 2.sfz', 'bombo', 0.0, 0.42, 0.5),
    'Tom': (f'{VCSL_MEMB}/Tom 2.sfz', 'tambores', -0.15, 0.40, 0.6),
    'Cymbal': (f'{VCSL_IDIO}/Suspended Cymbal 2.sfz', 'plato', 0.20, 0.50, 0.8),
}

# ── levels (gain_db, before the bus) ──
# The tracks that exist in both versions keep one gain: the common layers (Basses Pizz, Harp) must
# sum in phase in the crossfade, and the rest keep their seat when the version changes.
COMMON_GAIN = {
    'Basses Pizz': 3.0, 'Harp': 7.0, 'Timpani': 5.0, 'Timpani Roll': 5.0, 'Violins Sus': 10.0, 'Violas Trem': 2.0,
}
# Same track name, different strokes: the score plays Forja 63 (wool mallet, velocity 30–40) and Frame Drum
# 62/65 (muted) in the exploration, Forja 61 (hammer) and Frame Drum 61/64 (open) in combat. One gain would
# leave one version inaudible or the other on top, so these two keep their seat but not their gain.
STROKE_GAIN = {'explora': {'Forge': 12.0, 'Frame Drum': -1.5}, 'combate': {'Forge': 0.0, 'Frame Drum': -2.5}}
GAIN = {
    'explora': {
        'Trompa': 0.0, 'Clarinet Sus': 4.0, 'Recorder': 8.0, 'Flute Sus': 4.0, 'Violins Sus Quiet': 16.0,
        'Violas Sus': -3.0, 'Violas Sus Quiet': 6.0, 'Cellos Sus': -4.0, 'Cellos Sus Quiet': 8.0,
        'Cellos Pizz': 2.0, 'Basses Sus': 4.0, 'Basses Sus Quiet': 14.0, **STROKE_GAIN['explora'],
    },
    'combate': {
        'Horns Marc': -6.5, 'Horns Sus': -9.0, 'Trombones Marc': -10.0, 'Trombones Sus': -10.0, 'Violins Marc': -1.5,
        'Violins Trem': 4.0, 'Violas Spic': 1.0, 'Cellos Spic': -2.0, 'Basses Spic': 0.0, 'Bass Drum': -7.0,
        'Bass Drum Roll': -2.0, 'Tom': -2.0, 'Cymbal': -12.0, **STROKE_GAIN['combate'],
    },
}
# Fader rides. The loop wraps from bar 44 into bar 1, so a ride over both ends has the same value at the two.
# Exploration: the pp intro and codetta beds sit too far under the rest; the horn's head (1–4) and echo
# (41–44) come up to the bed; the A bed and the B solos step back (A at intensity 4 and B, the breath, under
# A'); the violins lift where they carry the tune (A', bridge, 37–40) and step back under the motif in 33–36;
# the horn's countermelody gives way to the tune in 37–40.
# Combat: the return (33–40) is the climax, so its roles get a push, while the intro/codetta ostinato and the
# bridge's build-up stay a step under it.
ENDS_UP = ((1, 4, 5.5), (41, 44, 5.5))
ENDS_DOWN = ((1, 4, -0.75), (41, 44, -0.75))
AUTOMATION: dict[str, dict[str, list[tuple[float, float]]]] = {
    'explora': {
        'Violas Sus Quiet': ride(*ENDS_UP, (5, 12, -1.5)),
        'Cellos Sus Quiet': ride(*ENDS_UP, (5, 12, -1.5), (21, 28, -1.0)),
        'Frame Drum': ride((1, 4, 4.0), (5, 12, 1.5), (13, 20, 2.0), (29, 40, -1.5), (41, 44, 3.0)),
        'Trompa': ride((1, 4, 8.5), (33, 36, -1.0), (37, 40, -3.0), (41, 44, 6.5)),  # over the bed of its register; silent at the seam
        'Clarinet Sus': ride((7, 12, -1.0), (21, 28, -1.0), (33, 40, -1.5)),
        'Recorder': ride((21, 28, -1.0)),
        'Violins Sus': ride((13, 20, 1.5), (29, 32, 1.0), (33, 36, -1.5), (37, 40, 1.0)),
    },
    'combate': {
        'Horns Marc': ride(*ENDS_DOWN, (29, 32, -1.0), (33, 40, 2.0)),
        'Trombones Marc': ride(*ENDS_DOWN, (33, 40, 3.0)),
        'Trombones Sus': ride(*ENDS_DOWN, (29, 32, -1.0), (33, 40, 3.0)),
        'Violins Marc': ride((29, 32, -1.0), (33, 40, 2.0)),
        'Horns Sus': ride((21, 28, 1.5), (33, 40, 3.0)),
        'Violins Trem': ride((33, 40, 1.0)), 'Violas Spic': ride((33, 40, 1.5)), 'Timpani': ride((33, 40, 1.0)),
        'Violins Sus': ride((25, 28, 1.5), (33, 40, 1.5)),
        'Cellos Spic': ride(*ENDS_DOWN, (21, 28, 1.5), (29, 32, -2.0), (33, 40, 2.0)),
        'Basses Spic': ride(*ENDS_DOWN, (33, 40, 1.5)),
        'Bass Drum': ride(*ENDS_DOWN, (33, 40, 2.0)),
        'Frame Drum': ride(*ENDS_DOWN, (29, 32, -2.0)),
        'Tom': ride(*ENDS_DOWN, (29, 32, -2.0)),
        'Bass Drum Roll': ride((29, 32, -2.0)), 'Violas Trem': ride((29, 32, -2.0)), 'Cymbal': ride((29, 32, -1.0)),
    },
}

TRACKS = {
    'explora': ['Recorder', 'Flute Sus', 'Clarinet Sus', 'Trompa', 'Timpani', 'Timpani Roll', 'Frame Drum', 'Forge',
                'Harp', 'Violins Sus', 'Violins Sus Quiet', 'Violas Sus', 'Violas Sus Quiet', 'Violas Trem',
                'Cellos Sus', 'Cellos Sus Quiet', 'Cellos Pizz', 'Basses Sus', 'Basses Sus Quiet', 'Basses Pizz'],
    'combate': ['Horns Marc', 'Horns Sus', 'Trombones Marc', 'Trombones Sus', 'Timpani', 'Timpani Roll', 'Bass Drum',
                'Bass Drum Roll', 'Frame Drum', 'Tom', 'Forge', 'Cymbal', 'Harp', 'Violins Marc', 'Violins Sus',
                'Violins Trem', 'Violas Spic', 'Violas Trem', 'Cellos Spic', 'Basses Spic', 'Basses Pizz'],
}

# ── subtractive EQ per bus: high-pass all but the bass, mud out at 200–400 Hz where it piles up, a
# dip in 2–5 kHz for the game's SFX, soft highs. The buses carrying common layers (bajos, arpa) are
# linear (no compressor) and identical in both versions, so those layers stay bit-identical. ──
BUSES_SHARED = {
    'violines': {'highpass': 200, 'peaks': [(320, -2.0, 1.0), (2700, -3.0, 1.2), (4500, -2.0, 1.0)], 'high_shelf': (3000, -2.5)},
    'violas': {'highpass': 120, 'peaks': [(300, -3.5, 1.0), (2800, -2.0, 1.0)], 'high_shelf': (7500, -3.0)},
    'chelos': {'highpass': 50, 'peaks': [(260, -3.0, 1.0), (3000, -2.0, 1.0)], 'high_shelf': (6500, -3.0)},
    'bajos': {'highpass': 38, 'low_shelf': (70, -2.5), 'peaks': [(230, -1.5, 1.0)], 'high_shelf': (4000, -4.0)},
    'arpa': {'highpass': 55, 'peaks': [(300, -3.0, 0.9), (3000, -2.0, 1.0)], 'high_shelf': (8000, -2.0)},
    'timbales': {'highpass': 40, 'peaks': [(320, -2.0, 1.0)], 'high_shelf': (5000, -3.0)},
    'tambores': {'highpass': 60, 'peaks': [(320, -3.5, 0.9), (3500, -3.0, 0.8)], 'high_shelf': (6000, -4.0)},
    'forja': {'highpass': 300, 'peaks': [(3000, -3.5, 0.9)], 'high_shelf': (6000, -4.0)},
}
BUSES = {
    'explora': {
        **BUSES_SHARED,
        'maderas': {'highpass': 160, 'peaks': [(350, -1.5, 1.0), (3500, -2.0, 1.2)], 'high_shelf': (9000, -3.0)},
        'trompas': {'highpass': 90, 'peaks': [(300, -2.5, 1.0), (2600, -2.0, 1.0)], 'high_shelf': (6000, -3.0)},
    },
    'combate': {
        **BUSES_SHARED,
        'trompas': {'highpass': 90, 'peaks': [(300, -2.5, 1.0), (2600, -2.5, 1.0)], 'high_shelf': (6000, -3.0)},
        'trombones': {'highpass': 60, 'peaks': [(280, -2.5, 1.0), (2500, -2.0, 1.0)], 'high_shelf': (5000, -3.0)},
        'bombo': {'highpass': 60, 'low_shelf': (110, -1.5), 'peaks': [(46, -6.0, 1.2), (300, -3.0, 1.0)], 'high_shelf': (4000, -4.0)},  # its boom sits at 40–50 Hz
        'plato': {'highpass': 350, 'peaks': [(3500, -5.0, 0.7)], 'high_shelf': (7000, -6.0)},
    },
}

# one hall for both versions (criterion 18): 2.3 s, a little shorter than the menu for the 132 bpm ostinato
REVERB = {'seconds': 2.3, 'predelay': 0.022, 'damping': 0.6}
REVERB_EQ = {'highpass': 140, 'peaks': [(350, -3.0, 0.8)], 'high_shelf': (7000, -2.0)}  # no muddy or hissy hall
REVERB_RETURN_DB = -4.0

SECTIONS = {
    'intro 1-4': (1, 4), 'A 5-12': (5, 12), "A' 13-20": (13, 20), 'B 21-28': (21, 28),
    'puente 29-32': (29, 32), 'retorno 33-40': (33, 40), 'codetta 41-44': (41, 44),
}


# the same trim on every part of both versions: headroom so no part peaks over -6 dB before its bus
# (criterion 17); the master's loudness normalization gives it back
TRIM_DB = -2.0


def parts(version: str) -> list[Part]:
    gains = {track: g + TRIM_DB for track, g in {**COMMON_GAIN, **GAIN[version]}.items()}
    out = []
    for track in TRACKS[version]:
        sfz, bus, pan, send, width = SEATS[track]
        out.append(Part(track, sfz, bus, pan=pan, gain_db=gains[track], send=send, width=width,
                        automation=AUTOMATION[version].get(track, [])))
    return out


def spec(version: str) -> render.MixSpec:
    return render.MixSpec(
        midi=MIDI[version], out=OUT[version], bpm=132, beats_per_bar=4, bars=44, parts=parts(version),
        buses=BUSES[version], reverb=REVERB, reverb_return_db=REVERB_RETURN_DB, reverb_eq=REVERB_EQ,
        master_bus={'highpass': 28, 'comp': (-18, 1.6)},
        target_lufs=TARGET_LUFS[version] + MP3_LOSS_DB, ceiling_dbtp=-1.0, tail_seconds=4.0, sections=SECTIONS,
    )


# ── measures of existing MP3s ──────────────────────────────────────────────
def decode(path: str) -> np.ndarray:
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def measure(x: np.ndarray, sections: dict[str, tuple[int, int]] | None = None) -> dict:
    out = {'samples': len(x), 'lufs': round(mix.lufs(x, SR), 2), 'true_peak_db': round(mix.true_peak_db(x, SR), 2),
           'seam_jump': round(mix.seam_jump(x), 4), 'bands_db': {k: round(v, 1) for k, v in mix.band_energy(x, SR).items()}}
    if sections:
        bar = 4 * 60 / 132 * SR
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


# ── crossfade test (criterion 19) ──────────────────────────────────────────
CROSS_AT = (24.0, 56.0)  # explora → combate at 24 s, back to explora at 56 s
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
    from estudio import midi_io
    ex, co = midi_io.load(MIDI['explora']).tracks, midi_io.load(MIDI['combate']).tracks
    grid = 60 / 132 / 4
    out = {}
    for name in tracks:
        a = {round(n.start / grid): n.start for n in ex[name].notes}
        b = {round(n.start / grid): n.start for n in co[name].notes}
        shared = set(a) & set(b)
        out[name] = round(max((abs(a[k] - b[k]) for k in shared), default=0) * 1000, 1)
    return out


# ── report ──────────────────────────────────────────────────────────────────
def checks(r: dict[str, dict], cross: dict) -> list[tuple[str, bool, str]]:
    ex, co = r['explora'], r['combate']
    res = [
        ('12 explora -17,5 ± 0,5 LUFS', abs(ex['lufs'] + 17.5) <= 0.5, f"{ex['lufs']} LUFS"),
        ('12 combate -16,5 ± 0,5 LUFS', abs(co['lufs'] + 16.5) <= 0.5, f"{co['lufs']} LUFS"),
    ]
    for v in VERSIONS:
        res.append((f'12 {v} pico real ≤ -1 dBTP', r[v]['true_peak_db'] <= -1.0, f"{r[v]['true_peak_db']} dBTP"))
    for v in VERSIONS:
        res.append((f'13 {v} loop_samples = 3 528 000', r[v]['loop_samples'] == LOOP_SAMPLES, str(r[v]['loop_samples'])))
        res.append((f'13 {v} seam_jump < 0,02', r[v]['seam_jump'] < 0.02, str(r[v]['seam_jump'])))
    for v, (lo, hi) in (('explora', (5, 9)), ('combate', (3, 7))):
        s = r[v]['sections_lufs']
        c = s['retorno 33-40'] - s['B 21-28']
        res.append((f'14 {v} retorno − B en {lo}–{hi} LU', lo <= c <= hi, f'{c:.1f} LU'))
    for name in SECTIONS:
        d = co['sections_lufs'][name] - ex['sections_lufs'][name]
        res.append((f'15 combate − explora en {name} en 0–4 LU', 0 <= d <= 4, f'{d:+.1f} LU'))
    for v in VERSIONS:
        b = r[v]['bands_db']
        res.append((f'16 {v} presencia 2.5-6k ≤ -18 dB', b['presencia 2.5-6k'] <= -18, str(b['presencia 2.5-6k'])))
        res.append((f'16 {v} aire 6-16k ≤ -28 dB', b['aire 6-16k'] <= -28, str(b['aire 6-16k'])))
        res.append((f'16 {v} sub <60 ≤ -20 dB', b['sub <60'] <= -20, str(b['sub <60'])))
    for v in VERSIONS:
        worst = max(r[v]['parts'].items(), key=lambda kv: kv[1]['pico_db'])
        res.append((f'17 {v} ninguna parte > -6 dB de pico', worst[1]['pico_db'] <= -6, f'{worst[0]} {worst[1]["pico_db"]} dB'))
    for at, c in cross.items():
        res.append((f'19 cruce {at}: bache ≤ 3 LU bajo la menor', c['bache_lu'] <= 3, f"{c['bache_lu']} LU"))
        res.append((f'19 cruce {at}: salto ≤ 4 LU', c['salto_lu'] <= 4 and c['exceso_lu'] <= 4,
                    f"{c['salto_lu']} LU entre versiones (exceso {c['exceso_lu']} LU)"))
    return res


def check_shared_seating() -> None:
    """Criterion 18, enforced by construction: one seat per track name, one hall, one gain for the
    tracks of both versions, identical linear buses for the common layers."""
    both = set(TRACKS['explora']) & set(TRACKS['combate'])
    assert both == set(COMMON_GAIN) | set(STROKE_GAIN['explora']), sorted(both ^ set(COMMON_GAIN))
    for v in VERSIONS:
        assert not set(GAIN[v]) & set(COMMON_GAIN) and not set(AUTOMATION[v]) & {'Basses Pizz', 'Harp'}
    for bus in ('bajos', 'arpa'):
        assert BUSES['explora'][bus] == BUSES['combate'][bus] and 'comp' not in BUSES['explora'][bus]


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
        decoded = measure(decode(OUT[v]), SECTIONS)
        assert decoded['samples'] == LOOP_SAMPLES, decoded['samples']
        reports[v].update({k: decoded[k] for k in keys})
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
    with open(CROSS_REPORT, 'w') as f:
        json.dump({'cruce': cross, 'desfase_ataques_ms': flams, 'decoded_samples': {'explora': len(ex), 'combate': len(co)}},
                  f, indent=1, ensure_ascii=False)
    print(f'\n══ cruce ══ {CROSS_OUT}')
    print(f'  muestras decodificadas: explora {len(ex)}, combate {len(co)}')
    for at, c in cross.items():
        print(f'  {at}: bache {c["bache_lu"]} LU · exceso {c["exceso_lu"]} LU · salto entre versiones {c["salto_lu"]} LU · '
              f'pendiente máx. {c["pendiente_lu_s"]} LU/s (la de las propias versiones: {c["pendiente_propia_lu_s"]} LU/s)')
    print('  desfase máximo de ataques compartidos (ms): ' + ', '.join(f'{k} {v}' for k, v in flams.items()))

    old = measure(decode(OLD_TRACK)) if os.path.exists(OLD_TRACK) else None
    print('\nBandas dB (rel. al total)    explora  combate' + ('   cap1.mp3 (antigua)' if old else ''))
    for k in reports['explora']['bands_db']:
        line = f"  {k:24s} {reports['explora']['bands_db'][k]:7.1f}  {reports['combate']['bands_db'][k]:7.1f}"
        if old:
            line += f"   {old['bands_db'][k]:7.1f}"
        print(line)
    if old:
        print(f"Antigua src/audio/cap1.mp3: {old['samples']} muestras · {old['lufs']} LUFS · "
              f"{old['true_peak_db']} dBTP · seam {old['seam_jump']}")

    print('\nCriterios del brief:')
    results = checks(reports, cross)
    for label, ok, value in results:
        print(f"  [{'ok' if ok else 'FALLA'}] {label}: {value}")
    return 0 if all(ok for _, ok, _ in results) else 1


if __name__ == '__main__':
    sys.exit(main())
