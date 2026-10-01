"""«Bajo la posada vieja» (Acto I, La Guarida de los Contrabandistas): mix and master of the two
synchronized versions (brief: docs/musica/acto1-contrabandistas.md, §8 criteria 12–19).

Reads build/acto1-contrabandistas-{explora,combate}.mid (written by compose.py) and renders both with
the same seating, the same buses and the same hall (only the fader levels and rides change), masters
exploration to -17.5 LUFS and combat to -16.5 LUFS (-1 dBTP) as seamless loops of the same length and
writes build/acto1-contrabandistas-{explora,combate}.mp3 with their reports (.report.json). The loudness
and true-peak checks are made on the decoded MP3s (the studio's MP3 export lowers the level ~0.26 dB,
which the master target compensates: see mp3_gain_db()).

Then the crossfade test (criterion 19): build/acto1-contrabandistas-cruce.mp3 plays exploration, crosses
linearly over 1.6 s to combat at 24 s (bar 19, middle of A') and back at 56 s (bar 43, middle of the
bridge), as the game does (src/fx/audio.ts), and measures the short-term loudness (3 s) and the
alignment of both versions around each crossing.

Prints the reports, the brief checks and a comparison with the previous build and with the old act I
track (src/audio/cap1.mp3).

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/acto1-contrabandistas/mix.py
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from dataclasses import dataclass

import numpy as np
import pyloudnorm

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(HERE, '..'))

from estudio import config, mix, render  # noqa: E402
from estudio.render import Part  # noqa: E402

NAME = 'acto1-contrabandistas'
BUILD = os.path.join(HERE, 'build')
VERSIONS = ('explora', 'combate')
TARGET_LUFS = {'explora': -17.5, 'combate': -16.5}
LOOP_SAMPLES = 3528000                     # 60 bars × 3 quarters × 60/135 s × 44 100
OLD_TRACKS = {'src/audio/cap1.mp3': os.path.join(ROOT, 'src', 'audio', 'cap1.mp3')}
CROSS_OUT = os.path.join(BUILD, f'{NAME}-cruce.mp3')
CROSS_FADE = 1.6                           # seconds, CRUCE_VERSIONES in src/fx/audio.ts
CROSS_AT = (24.0, 56.0)                    # to combat, back to exploration


def path(version: str, ext: str) -> str:
    return os.path.join(BUILD, f'{NAME}-{version}.{ext}')


def vsco(name: str) -> str:
    return f'VSCO-2-CE/{name}.sfz'


VCSL = 'VCSL/'
SSO = 'sso/Sonatina Symphonic Orchestra/'


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


# ── seating: one chair per MIDI track, identical in both versions (criterion 18) ──
@dataclass(frozen=True)
class Seat:
    sfz: str
    bus: str
    pan: float      # -1 left … 1 right
    send: float     # depth: share sent to the hall
    width: float = 1.0


SEATS = {
    # soloists of the tavern: the fiddle in front and dry, the whistles in the middle, the ocarina far off
    'Violin Solo': Seat(SSO + 'Strings - Performance/Violin Solo 1 Sustain.sfz', 'violin', 0.10, 0.12, 0.5),
    'Ocarina': Seat(VCSL + 'Aerophones/Edge-blown Aerophones/Ocarina, Typical - SusVib.sfz', 'maderas', -0.05, 0.55, 0.5),
    'Tenor Recorder': Seat(VCSL + 'Aerophones/Edge-blown Aerophones/Baroque Tenor Recorder - SusVib.sfz', 'maderas',
                           -0.15, 0.30, 0.5),
    'Bass Clarinet': Seat(SSO + 'Woodwinds - Performance/Bass Clarinet Solo Sustain (looped).sfz', 'maderas_graves',
                          -0.10, 0.30, 0.5),
    'Bassoon Stac': Seat(vsco('BassoonStac'), 'maderas_graves', 0.10, 0.30, 0.5),
    # the harmonica as an accordion, right of centre (away from the violins I and the strumstick)
    'Harmonica Vib': Seat(VCSL + 'Aerophones/Free Aerophones/Harmonica-Hohner-Super64 - Vib.sfz', 'armonica',
                          0.30, 0.28, 0.6),
    'Harmonica Accented': Seat(VCSL + 'Aerophones/Free Aerophones/Harmonica-Hohner-Super64 - Accented.sfz', 'armonica',
                               0.30, 0.28, 0.6),
    # plucked and keys: left (strumstick, harp) and right (piano), off the melody's centre
    'Strumstick': Seat(VCSL + 'Chordophones/Composite Chordophones/Strumstick.sfz', 'pulsadas', -0.35, 0.24, 0.7),
    'Folk Harp': Seat(VCSL + 'Chordophones/Composite Chordophones/Folk Harp.sfz', 'pulsadas', -0.45, 0.32, 0.8),
    'Tavern Piano': Seat(VCSL + 'Chordophones/Zithers/Upright Piano, Knight.sfz', 'piano', 0.25, 0.24, 0.7),
    # brass: horns left and back, tuba centre-right
    'Horns Marcato': Seat(SSO + 'Brass - Performance/Horns Marcato.sfz', 'trompas', -0.30, 0.40, 0.7),
    'Horns Sustain': Seat(SSO + 'Brass - Performance/Horns Sustain.sfz', 'trompas', -0.30, 0.42, 0.7),
    'Horn Sus': Seat(vsco('FHornSus'), 'trompas', -0.30, 0.42, 0.7),
    'Tuba Stac': Seat(vsco('TubaStac'), 'tuba', 0.15, 0.28, 0.5),
    # strings: violins I left, violas and cellos right, basses centre-right
    'Violins Marcato': Seat(SSO + 'Strings - Performance/1st Violins Marcato.sfz', 'violines', -0.40, 0.25),
    'Violins Sus': Seat(vsco('ViolinEnsSusVib'), 'violines', -0.40, 0.25),
    'Violins Pizz': Seat(vsco('ViolinEnsPizz'), 'violines', -0.40, 0.30),
    'Violas Sus Quiet': Seat(vsco('ViolaEnsSusVib-Quiet'), 'violas', 0.20, 0.27),
    'Violas Trem': Seat(vsco('ViolaEnsTrem'), 'violas', 0.20, 0.27),
    'Violas Spic': Seat(vsco('ViolaEnsSpic'), 'violas', 0.20, 0.24),
    'Cellos Sus': Seat(vsco('CelloEnsSusVib'), 'chelos', 0.35, 0.22),
    'Cellos Sus Quiet': Seat(vsco('CelloEnsSusVib-Quiet'), 'chelos', 0.35, 0.22),
    'Cellos Spic': Seat(vsco('CelloEnsSpic'), 'chelos', 0.35, 0.20),
    'Basses Pizz': Seat(vsco('ContrabassPizz'), 'bajos', 0.20, 0.18, 0.6),
    'Basses Sus Quiet': Seat(vsco('ContrabassSusVB-Quiet'), 'bajos', 0.20, 0.18, 0.6),
    'Basses Trem': Seat(vsco('ContrabassTrem'), 'bajos', 0.20, 0.18, 0.6),
    # timpani and percussion: at the back
    'Timpani': Seat(vsco('Timpani'), 'timbales', -0.10, 0.45, 0.6),
    'Timpani Roll': Seat(vsco('TimpaniRolls'), 'timbales', -0.10, 0.45, 0.6),
    'Cajon': Seat(VCSL + 'Idiophones/Struck Idiophones/Cajon.sfz', 'percusion', 0.0, 0.34, 0.6),
    'Frame Drum': Seat(VCSL + 'Membranophones/Struck Membranophones/Frame Drum.sfz', 'percusion', -0.15, 0.38, 0.6),
    'Bass Drum': Seat(VCSL + 'Membranophones/Struck Membranophones/Bass Drum 2.sfz', 'bombo', 0.05, 0.40, 0.6),
    'Tom': Seat(VCSL + 'Membranophones/Struck Membranophones/Tom 2.sfz', 'percusion', 0.15, 0.40, 0.6),
    'Cymbal': Seat(VCSL + 'Idiophones/Struck Idiophones/Suspended Cymbal 2.sfz', 'plato', 0.25, 0.50, 0.8),
    # the ship: the hull creaks and the sea, wide and far
    'Hull Creak': Seat(VCSL + 'Membranophones/Struck Membranophones/Bass Drum 2.sfz', 'casco', 0.0, 0.50, 1.0),
    'Ocean Drum': Seat(VCSL + 'Membranophones/Other Membranophones/Ocean Drum.sfz', 'olas', 0.0, 0.50, 1.0),
}

# ── fader levels (dB) per version ──
# From measuring every part solo (report «pico dB / LUFS»): VCSL, VSCO and Sonatina differ by up to 25 dB
# at the same dynamic, so gain_db first evens them out and then sets the role (melody on top, the
# accompaniment 4–8 LU under it, the ship's ambience far below). The rides below do the rest per phrase.
LEVELS = {
    'explora': {
        'Tenor Recorder': 3.5, 'Violin Solo': -1.0, 'Ocarina': 5.0, 'Harmonica Vib': -1.0, 'Bass Clarinet': -6.5,
        'Horn Sus': -1.5, 'Tavern Piano': -4.0, 'Strumstick': 6.0, 'Folk Harp': -1.0, 'Cellos Sus': -3.0,
        'Cellos Sus Quiet': 8.0, 'Violas Sus Quiet': 9.0, 'Violas Trem': 1.0, 'Basses Sus Quiet': 10.0,
        'Cajon': 8.0, 'Frame Drum': -6.0, 'Timpani': 6.0, 'Timpani Roll': 10.0, 'Hull Creak': -5.0, 'Ocean Drum': 9.5,
    },
    'combate': {
        'Horns Marcato': -12.0, 'Horns Sustain': -12.0, 'Violin Solo': -2.0, 'Violins Sus': 4.0, 'Violins Marcato': -6.5,
        'Violins Pizz': -3.0, 'Violas Spic': -5.0, 'Cellos Spic': -1.5, 'Tuba Stac': 8.0, 'Bassoon Stac': -5.5,
        'Bass Clarinet': -4.5, 'Harmonica Accented': -4.0, 'Strumstick': 1.5, 'Tavern Piano': -8.0, 'Timpani': 5.0,
        'Timpani Roll': 7.0, 'Cajon': 4.0, 'Frame Drum': 6.0, 'Bass Drum': -8.0, 'Tom': -5.0, 'Cymbal': -12.0,
        'Hull Creak': -7.0, 'Basses Trem': 12.0,
    },
}
COMMON_GAIN = {'Basses Pizz': 1.0}  # same gain_db in both versions (criterion 18)
# fader rides as (first bar, last bar, dB) segments, inclusive (see ride())
RIDES: dict[str, dict[str, list[tuple[float, float, float]]]] = {
    'explora': {
        # the melody on top in every phrase (measured per 4 bars against the loudest accompaniment)
        'Tenor Recorder': [(5, 8, 4.0), (17, 20, 1.5), (37, 40, 6.0), (41, 56, -0.5), (49, 52, -2.0), (53, 56, 7.0)],
        'Harmonica Vib': [(9, 12, 3.0), (37, 40, 4.0)],   # consequent of A; unison with the recorder in 37–40
        'Strumstick': [(5, 8, 2.0), (37, 56, -1.5)],
        'Cajon': [(5, 12, 2.0), (37, 56, -1.5)],
        'Folk Harp': [(17, 20, -2.5)],                     # arpeggios under the recorder
        'Cellos Sus Quiet': [(29, 34, -2.0)],               # the cellar pedal under the bass clarinet
        'Violin Solo': [(37, 56, -0.5)],
        'Cellos Sus': [(37, 56, -1.5)],
        'Horn Sus': [(45, 52, -1.0)],
        'Frame Drum': [(45, 52, -1.5)],
        'Ocarina': [(57, 60, 1.5)],
    },
    'combate': {
        'Violin Solo': [(1, 4, 1.5), (53, 60, 1.5)],   # the signal over the jig; the tail of the return
        'Cellos Spic': [(1, 4, 1.0), (5, 12, -1.0), (37, 48, 0.7), (49, 56, -1.5), (57, 60, 1.0)],
        'Cajon': [(1, 4, 2.0), (37, 56, 0.7), (57, 60, 2.0)],
        'Horns Marcato': [(5, 8, -1.0)],
        'Violas Spic': [(5, 12, -1.0)],
        'Violins Marcato': [(37, 44, 1.0)],
        'Violins Sus': [(49, 52, 1.0)],
    },
}
# group rides of a whole version (every part but the common Basses Pizz, which stays identical in both)
VCA: dict[str, list[tuple[float, float, float]]] = {
    'explora': [(29, 36, -0.7), (37, 44, -1.5), (45, 56, -1.7)],  # cellar, bridge and return a little lower: combat stays on top
    'combate': [(37, 56, 0.4)],
}

# ── subtractive EQ per bus (shared): high-pass all but the bass, mud out at 200–400 Hz where it
# piles up, a dip in 2–5 kHz for the game's SFX, soft highs ──
BUSES = {
    'violin': {'highpass': 180, 'peaks': [(320, -1.5, 1.0), (2800, -4.0, 0.9), (4500, -3.5, 1.0)], 'high_shelf': (7000, -3.0)},
    'maderas': {'highpass': 170, 'peaks': [(350, -1.5, 1.0), (3500, -2.5, 1.2)], 'high_shelf': (8000, -3.0)},
    'maderas_graves': {'highpass': 70, 'peaks': [(280, -2.0, 1.0), (3000, -3.5, 1.0)], 'high_shelf': (7000, -3.0)},
    'armonica': {'highpass': 160, 'peaks': [(300, -1.5, 1.0), (3000, -4.0, 0.9), (8500, -6.0, 0.7)],
                 'high_shelf': (5500, -9.0)},
    'pulsadas': {'highpass': 100, 'peaks': [(280, -2.5, 1.0), (3200, -2.5, 1.0)], 'high_shelf': (6500, -5.0)},
    'piano': {'highpass': 50, 'peaks': [(260, -2.5, 1.0), (3000, -2.5, 1.0)], 'high_shelf': (7000, -3.0)},
    'violines': {'highpass': 200, 'peaks': [(320, -2.0, 1.0), (2700, -3.5, 1.2), (4500, -3.0, 1.0)],
                 'high_shelf': (7000, -2.5)},
    'violas': {'highpass': 120, 'peaks': [(300, -2.5, 1.0), (2800, -2.0, 1.0)], 'high_shelf': (7000, -3.0)},
    'chelos': {'highpass': 55, 'peaks': [(260, -2.0, 1.0), (3000, -2.0, 1.0)], 'high_shelf': (6500, -3.0)},
    'bajos': {'highpass': 32, 'low_shelf': (75, -5.5), 'peaks': [(230, -1.5, 1.0)], 'high_shelf': (4000, -4.0)},
    'trompas': {'highpass': 90, 'peaks': [(300, -2.5, 1.0), (2600, -2.0, 1.0)], 'high_shelf': (6000, -3.0)},
    'tuba': {'highpass': 32, 'peaks': [(250, -2.0, 1.0)], 'high_shelf': (4000, -4.0)},
    'timbales': {'highpass': 40, 'peaks': [(320, -2.0, 1.0)], 'high_shelf': (5000, -3.0)},
    'percusion': {'highpass': 45, 'peaks': [(350, -2.0, 1.0), (3500, -3.0, 0.8)], 'high_shelf': (6000, -6.0)},
    'bombo': {'highpass': 85, 'peaks': [(110, 2.0, 1.0), (330, -2.0, 1.0), (3500, -3.0, 0.8)], 'high_shelf': (5000, -4.0)},
    'plato': {'highpass': 350, 'peaks': [(3500, -5.0, 0.7)], 'high_shelf': (7000, -6.0)},
    'casco': {'highpass': 30, 'high_shelf': (1000, -6.0)},
    'olas': {'highpass': 120, 'peaks': [(3000, -6.0, 0.7)], 'high_shelf': (1800, -15.0)},  # «low-pass» ~2 kHz
}
REVERB = {'seconds': 2.3, 'predelay': 0.020, 'damping': 0.6}
REVERB_EQ = {'highpass': 150, 'peaks': [(350, -2.0, 0.8), (3500, -2.0, 0.8)], 'high_shelf': (7000, -2.5)}
MASTER_BUS = {'highpass': 32, 'comp': (-18, 1.5)}  # gentle glue only

# brief §3 sections plus the spans of criterion 14
SECTIONS = {
    'intro 1-4': (1, 4), 'A 5-12': (5, 12), "A' 13-20": (13, 20), 'B 21-28': (21, 28), 'C 29-36': (29, 36),
    'puente 37-44': (37, 44), 'retorno 45-56': (45, 56), 'codetta 57-60': (57, 60), 'c45-52': (45, 52),
}
FORM = [k for k in SECTIONS if k != 'c45-52']


def parts(version: str) -> list[Part]:
    tracks = render.midi_io.load(path(version, 'mid')).tracks
    out = []
    for name in tracks:
        if not tracks[name].notes:
            continue
        seat = SEATS[name]
        gain = COMMON_GAIN.get(name, LEVELS[version].get(name, 0.0))
        segments = RIDES[version].get(name, []) + ([] if name in COMMON_GAIN else VCA[version])
        out.append(Part(name, seat.sfz, seat.bus, pan=seat.pan, gain_db=gain, send=seat.send, width=seat.width,
                        automation=ride(*segments) if segments else []))
    return out


def mp3_gain_db(sr: int = config.SR) -> float:
    """Level change of the studio's MP3 export (mix.export_mp3 → decoder), measured on a 1 kHz tone.
    The encoder lowers the level by about 0.26 dB, so render()'s report (measured before the export) reads
    louder than the file the game plays; the master target is raised by this much to land on the brief."""
    import tempfile
    t = np.arange(sr * 4) / sr
    tone = np.stack([0.3 * np.sin(2 * np.pi * 1000 * t)] * 2, axis=1).astype(np.float32)
    with tempfile.TemporaryDirectory() as tmp:
        out = os.path.join(tmp, 'tone.mp3')
        mix.export_mp3(tone, sr, out)
        back = decode(out)[sr: 3 * sr]
    return float(20 * np.log10(np.sqrt((back ** 2).mean()) / np.sqrt((tone[sr: 3 * sr] ** 2).mean())))


def spec(version: str, mp3_gain: float = 0.0) -> render.MixSpec:
    return render.MixSpec(
        midi=path(version, 'mid'), out=path(version, 'mp3'), bpm=135, beats_per_bar=3, bars=60,
        parts=parts(version), buses=BUSES, reverb=REVERB, reverb_return_db=-4.0, reverb_eq=REVERB_EQ,
        master_bus=MASTER_BUS, target_lufs=TARGET_LUFS[version] - mp3_gain, ceiling_dbtp=-1.0, tail_seconds=4.0,
        sections=SECTIONS,
    )


# ── measures of existing MP3s ───────────────────────────────────────────────
def decode(file: str) -> np.ndarray:
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', file, '-f', 'f32le', '-ac', '2', '-ar', '44100', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def measure(file: str) -> dict:
    x, sr = decode(file), config.SR
    return {'samples': len(x), 'lufs': round(mix.lufs(x, sr), 2), 'true_peak_db': round(mix.true_peak_db(x, sr), 2),
            'seam_jump': round(mix.seam_jump(x), 4), 'bands_db': {k: round(v, 1) for k, v in mix.band_energy(x, sr).items()}}


def short_term(x: np.ndarray, sr: int, window: float = 3.0, hop: float = 0.1) -> tuple[np.ndarray, np.ndarray]:
    """EBU short-term loudness (K-weighted, 3 s window) every `hop` seconds: (window centres, LUFS)."""
    k = x.astype(np.float64)
    for f in pyloudnorm.Meter(sr)._filters.values():
        k = f.apply_filter(k)
    power = np.concatenate([[0.0], np.cumsum((k ** 2).sum(axis=1))])
    w, h = int(window * sr), int(hop * sr)
    starts = np.arange(0, len(k) - w + 1, h)
    ms = (power[starts + w] - power[starts]) / w
    return (starts + w / 2) / sr, -0.691 + 10 * np.log10(ms + 1e-12)


def lag_ms(a: np.ndarray, b: np.ndarray, sr: int, max_ms: float = 40) -> float:
    """Lag (ms) that best aligns the low band (< 250 Hz, where the common bass and drums sit) of b to a."""
    from scipy.signal import butter, sosfilt
    sos = butter(4, 250, 'lowpass', fs=sr, output='sos')
    a, b = sosfilt(sos, a.mean(axis=1)), sosfilt(sos, b.mean(axis=1))
    m = int(max_ms / 1000 * sr)
    lags = np.arange(-m, m + 1)
    core = slice(m, len(a) - m)
    corr = [np.dot(a[core], b[m + l: len(b) - m + l]) for l in lags]
    return float(lags[int(np.argmax(corr))] / sr * 1000)


def crossfade_test(sr: int = config.SR) -> dict:
    """Exploration → combat at CROSS_AT[0] → exploration at CROSS_AT[1], linear 1.6 s fades on the decoded
    MP3s (what the game plays), both from the same loop position."""
    e, c = (decode(path(v, 'mp3'))[:LOOP_SAMPLES] for v in VERSIONS)
    n, fade = len(e), int(CROSS_FADE * sr)
    g = np.zeros(n)  # share of combat
    t1, t2 = (int(t * sr) for t in CROSS_AT)
    g[t1:t1 + fade] = np.linspace(0, 1, fade)
    g[t1 + fade:t2] = 1
    g[t2:t2 + fade] = np.linspace(1, 0, fade)
    x = (e * (1 - g)[:, None] + c * g[:, None]).astype(np.float32)
    mix.export_mp3(x, sr, CROSS_OUT)
    times, st_x = short_term(x, sr)
    _, st_e = short_term(e, sr)
    _, st_c = short_term(c, sr)
    crossings = []
    for t in CROSS_AT:
        near = (times > t - 1.5) & (times < t + CROSS_FADE + 1.5)  # windows that hear the fade
        dip = float((st_x[near] - np.minimum(st_e[near], st_c[near])).min())
        before = st_x[np.argmin(np.abs(times - (t - 1.5)))]                 # last window before the fade
        after = st_x[np.argmin(np.abs(times - (t + CROSS_FADE + 1.5)))]     # first window after it
        seg = slice(int((t - 4) * sr), int((t + 4) * sr))
        crossings.append({'t': t, 'bache_lu': round(dip, 2), 'salto_lu': round(float(after - before), 2),
                          'st_antes': round(float(before), 1), 'st_despues': round(float(after), 1),
                          'desfase_ms': round(lag_ms(e[seg], c[seg], sr), 2)})
    return {'out': CROSS_OUT, 'lufs': round(mix.lufs(x, sr), 2), 'true_peak_db': round(mix.true_peak_db(x, sr), 2),
            'cruces': crossings}


# ── brief checks ────────────────────────────────────────────────────────────
def checks(version: str, r: dict) -> list[tuple[str, bool, str]]:
    b, s = r['bands_db'], r['sections_lufs']
    target = TARGET_LUFS[version]
    contrast = s['c45-52'] - s['C 29-36']
    lo, hi = (5, 9) if version == 'explora' else (3, 7)
    worst = max(r['parts'].items(), key=lambda kv: kv[1]['pico_db'])
    f = r['mp3']  # the decoded MP3: what the game plays
    return [
        (f'12 sonoridad {target} ± 0,5 LUFS (MP3)', abs(f['lufs'] - target) <= 0.5, f"{f['lufs']} LUFS"),
        ('12 pico real ≤ -1 dBTP (render y MP3)', max(r['true_peak_db'], f['true_peak_db']) <= -1.0,
         f"{r['true_peak_db']} / {f['true_peak_db']} dBTP"),
        ('13 loop_samples = 3 528 000 (y muestras del MP3)', r['loop_samples'] == LOOP_SAMPLES == f['samples'],
         f"{r['loop_samples']} / {f['samples']}"),
        ('13 seam_jump < 0,02 (render y MP3)', max(r['seam_jump'], f['seam_jump']) < 0.02,
         f"{r['seam_jump']} / {f['seam_jump']}"),
        (f'14 contraste c45-52 vs C en {lo}–{hi} LU', lo <= contrast <= hi, f'{contrast:.1f} LU'),
        ('16 presencia 2.5-6k ≤ -18 dB', b['presencia 2.5-6k'] <= -18, str(b['presencia 2.5-6k'])),
        ('16 aire 6-16k ≤ -28 dB', b['aire 6-16k'] <= -28, str(b['aire 6-16k'])),
        ('16 sub <60 ≤ -20 dB', b['sub <60'] <= -20, str(b['sub <60'])),
        ('17 ninguna parte > -6 dB de pico', worst[1]['pico_db'] <= -6, f'{worst[0]} {worst[1]["pico_db"]} dB'),
    ]


def joint_checks(reports: dict[str, dict], cross: dict) -> list[tuple[str, bool, str]]:
    e, c = reports['explora']['sections_lufs'], reports['combate']['sections_lufs']
    diffs = {k: round(c[k] - e[k], 1) for k in FORM}
    seated = {v: {p.track: (p.sfz, p.bus, p.pan, p.send, p.width) for p in parts(v)} for v in VERSIONS}
    common = sorted(set(seated['explora']) & set(seated['combate']))
    same_seat = all(seated['explora'][t] == seated['combate'][t] for t in common)
    pizz = {v: next(p.gain_db for p in parts(v) if p.track == 'Basses Pizz') for v in VERSIONS}
    out = [
        ('13 mismo loop_samples', reports['explora']['loop_samples'] == reports['combate']['loop_samples'],
         str(reports['explora']['loop_samples'])),
        ('15 combate - exploración en 0–4 LU por sección', all(0 <= d <= 4 for d in diffs.values()),
         ' · '.join(f'{k.split()[0]} {d:+.1f}' for k, d in diffs.items())),
        ('18 misma sala y colocación; Basses Pizz mismo gain_db', same_seat and pizz['explora'] == pizz['combate'],
         f"{len(common)} pistas comunes · Basses Pizz {pizz['explora']} / {pizz['combate']} dB"),
    ]
    for x in cross['cruces']:
        out.append((f"19 cruce en {x['t']:.0f} s: bache ≤ 3 LU, salto ≤ 4 LU, sin desfase",
                    x['bache_lu'] >= -3 and abs(x['salto_lu']) <= 4 and abs(x['desfase_ms']) < 1,
                    f"bache {x['bache_lu']} LU · salto {x['salto_lu']:+} LU · desfase {x['desfase_ms']} ms"))
    return out


def print_report(version: str, r: dict, previous: dict | None) -> None:
    print(f"\n══ {version} ══ {r['out']}\n  {r['seconds']} s · loop_samples {r['loop_samples']}")
    print(f"  {r['lufs']} LUFS · {r['true_peak_db']} dBTP · seam_jump {r['seam_jump']} · "
          f"sala {r['wet_dry_lu']} LU respecto a la señal directa")
    f = r['mp3']
    print(f"  MP3 decodificado: {f['samples']} muestras · {f['lufs']} LUFS · {f['true_peak_db']} dBTP · "
          f"seam_jump {f['seam_jump']}")
    if previous:
        print(f"  anterior: {previous['lufs']} LUFS · {previous['true_peak_db']} dBTP · seam {previous['seam_jump']}")
    print('\n  Partes (tras gain_db, antes de bus):       pico dB   LUFS' + ('   (antes pico / LUFS)' if previous else ''))
    for name, p in r['parts'].items():
        line = f'    {name:20s} {p["notas"]:4d} notas   {p["pico_db"]:6.1f}  {p["lufs"]:6.1f}'
        old = previous['parts'].get(name) if previous else None
        if old:
            line += f'   ({old["pico_db"]:6.1f} / {old["lufs"]:6.1f})'
        print(line)
    print('\n  Secciones (LUFS sobre el máster):')
    for name, v in r['sections_lufs'].items():
        before = previous['sections_lufs'].get(name) if previous else None
        print(f'    {name:16s} {v:6.1f}' + (f'   (antes {before:6.1f})' if before is not None else ''))


def main() -> int:
    previous = {v: json.load(open(path(v, 'report.json'))) if os.path.exists(path(v, 'report.json')) else None
                for v in VERSIONS}
    reports = {}
    gain = mp3_gain_db()
    print(f'Exportación MP3 del estudio: {gain:+.2f} dB (se compensa en target_lufs)')
    for v in VERSIONS:
        reports[v] = render.render(spec(v, gain))
        reports[v]['mp3'] = measure(path(v, 'mp3'))
        with open(path(v, 'report.json'), 'w') as f:
            json.dump(reports[v], f, indent=1, ensure_ascii=False)
        print_report(v, reports[v], previous[v])
    old = {name: measure(f) for name, f in OLD_TRACKS.items() if os.path.exists(f)}
    head = '  '.join(f'{v:>9s}' for v in VERSIONS) + ''.join(f'  {v + " ant.":>13s}' for v in VERSIONS if previous[v])
    print(f'\nBandas dB (rel. al total)   {head}' + ''.join(f'  {n}' for n in old))
    for k in reports['explora']['bands_db']:
        line = f'  {k:24s}' + ''.join(f'  {reports[v]["bands_db"][k]:9.1f}' for v in VERSIONS)
        line += ''.join(f'  {previous[v]["bands_db"][k]:13.1f}' for v in VERSIONS if previous[v])
        line += ''.join(f'  {o["bands_db"][k]:{len(n)}.1f}' for n, o in old.items())
        print(line)
    for n, o in old.items():
        print(f"Antigua {n}: {o['samples']} muestras · {o['lufs']} LUFS · {o['true_peak_db']} dBTP · seam {o['seam_jump']}")

    cross = crossfade_test()
    print(f"\nPrueba de cruce: {cross['out']} · {cross['lufs']} LUFS · {cross['true_peak_db']} dBTP")
    for x in cross['cruces']:
        print(f"  {x['t']:4.0f} s: corto plazo {x['st_antes']} → {x['st_despues']} LUFS · bache {x['bache_lu']} LU "
              f"respecto a la menor · desfase {x['desfase_ms']} ms")

    print('\nCriterios del brief:')
    results = [(f'[{v}] ' + label, ok, value) for v in VERSIONS for label, ok, value in checks(v, reports[v])]
    results += joint_checks(reports, cross)
    for label, ok, value in results:
        print(f"  [{'ok' if ok else 'FALLA'}] {label}: {value}")
    return 0 if all(ok for _, ok, _ in results) else 1


if __name__ == '__main__':
    sys.exit(main())
