"""«Tesoro maldito» (La Guarida del Dragón, Act III): mix and master of the two synchronized
versions (brief: docs/musica/acto3-guarida.md, section 8 criteria 15-22).

Reads build/acto3-guarida-explora.mid and build/acto3-guarida-combate.mid (written by compose.py),
renders each with its own MixSpec over one shared hall and one shared seating, masters them as
seamless loops (exploration -17.4 LUFS, combat -16.6 LUFS, -1 dBTP; the studio folds the tails into
the start and exports LAME VBR) and writes build/acto3-guarida-explora.mp3 and
build/acto3-guarida-combate.mp3 with their JSON reports. Then builds the crossfade test
build/acto3-guarida-cruce.mp3 the way the game does it (src/fx/audio.ts, cruzarVersion: same loop
position, linear 1.6 s fade): exploration 0-24 s, combat from 24 s (bar 12), exploration again from
56 s (bar 27), and measures its short-term loudness against the two versions.

Prints the reports, the brief checks and a comparison with the previous build and with the approved
sketches (scripts/musica/leitmotivs/build/acto3-*.mp3).

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/acto3-guarida/mix.py
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
MIDI = {v: os.path.join(BUILD, f'acto3-guarida-{v}.mid') for v in VERSIONS}
OUT = {v: os.path.join(BUILD, f'acto3-guarida-{v}.mp3') for v in VERSIONS}
REPORT = {v: os.path.join(BUILD, f'acto3-guarida-{v}.report.json') for v in VERSIONS}
CROSS_OUT = os.path.join(BUILD, 'acto3-guarida-cruce.mp3')
CROSS_REPORT = os.path.join(BUILD, 'acto3-guarida-cruce.report.json')
SKETCH_DIR = os.path.join(ROOT, 'scripts', 'musica', 'leitmotivs', 'build')
SKETCHES = {'boceto ruinas': 'acto3-ruinas-4-tesoro-maldito.mp3', 'boceto saqueo': 'acto3-dragon-combate-saqueo.mp3',
            'boceto derrumbe': 'acto3-dragon-combate-derrumbe.mp3'}
SR = 44100
BPM, BEATS, BARS = 84, 3, 36
BAR_SECONDS = BEATS * 60 / BPM
LOOP_SAMPLES = 3402000
TARGET_LUFS = {'explora': -17.4, 'combate': -16.6}

VSCO = 'VSCO-2-CE'
ID = 'VCSL/Idiophones/Struck Idiophones'
MB = 'VCSL/Membranophones/Struck Membranophones'
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
# Cello and horns centre (cello a little right, horns left and back), the harp far left, the low winds and the
# contrabassoon centre-right; in combat the spiccato cellos right and the violin daggers left, the brass right and
# back, the war drums centre, the toms and the anvil right, the shaker and the ratchet left, the cymbals wide and
# back: the metal sits around the tune, never on it.
SEATS = {
    # common layers (criterion 21: identical in both versions, same gain, linear buses)
    'Contrabassoon': (f'{SSO}/Woodwinds - Performance/Contrabassoon Solo Sustain (looped).sfz', 'grave', 0.10, 0.26, 0.6),
    'Gong': (f'{ID}/Gong 1.sfz', 'gong', 0.25, 0.60, 0.8),
    'Bell': (f'{ID}/Tubular Bells 1.sfz', 'campana', -0.20, 0.55, 0.8),
    # in both versions with different notes or dynamics (same seat, own gain)
    'Cello Solo': (f'{SSO}/Strings - Performance/Cello Solo Sustain.sfz', 'solista', 0.12, 0.30, 0.6),
    'Harp': ('VCSL/Chordophones/Composite Chordophones/Concert Harp.sfz', 'arpa', -0.42, 0.36, 0.8),
    'Choir': (f'{SSO}/Chorus - Performance/Mixed Chorus.sfz', 'coro', 0.0, 0.48, 1.0),
    'Timp Roll': (vsco('TimpaniRolls'), 'timbales', -0.10, 0.42, 0.6),
    'Timpani': (vsco('Timpani'), 'timbales', -0.10, 0.42, 0.6),
    'Frame Drum': (f'{MB}/Frame Drum.sfz', 'pandero', 0.22, 0.34, 0.6),
    # exploration only
    'Alto Flute': (f'{SSO}/Woodwinds - Performance/Alto Flute Solo Sustain (looped).sfz', 'maderas', -0.20, 0.34, 0.6),
    'Bass Clarinet': (f'{SSO}/Woodwinds - Performance/Bass Clarinet Solo Sustain (looped).sfz', 'clarinete', 0.22, 0.32, 0.6),
    'Vibes Bowed': (f'{ID}/Vibraphone - Bowed.sfz', 'vibes', -0.30, 0.48, 0.8),
    # combat only
    'Horns': (f'{SSO}/Brass - Performance/Horns Sustain.sfz', 'trompas', -0.22, 0.38, 0.7),
    'Choir Melody': (f'{SSO}/Chorus - Performance/Mixed Chorus.sfz', 'coro', -0.05, 0.42, 1.0),
    'Low Brass': (f'{SSO}/Brass - Performance/Trombones Marcato.sfz', 'metales', 0.25, 0.28, 0.7),
    'Tuba': (f'{SSO}/Brass - Performance/Tuba Marcato.sfz', 'metales', 0.30, 0.24, 0.6),
    'Cellos Spic': (vsco('CelloEnsSpic'), 'ritmo', 0.32, 0.22, 1.0),
    'Violins Spic': (vsco('ViolinEnsSpic'), 'dagas', -0.32, 0.24, 1.0),
    'Basses Spic': (vsco('ContrabassSpic'), 'bajos', 0.35, 0.18, 0.6),
    'War Drums': (f'{MB}/Bass Drum 2.sfz', 'tambores', 0.0, 0.34, 0.5),
    'Toms': (f'{MB}/Tom 2.sfz', 'toms', 0.18, 0.30, 0.7),
    'Snare': (f'{MB}/Snare Drum, Rope Tension.sfz', 'caja', -0.15, 0.30, 0.6),
    'Anvil': (f'{ID}/Anvil.sfz', 'metal', 0.40, 0.30, 0.6),
    'Shaker': (f'{ID}/Shaker, Small.sfz', 'maraca', -0.42, 0.22, 0.6),
    'Clash': (f'{ID}/Clash Cymbals 1.sfz', 'platos', 0.12, 0.45, 0.9),
    'Cymbal': (f'{ID}/Suspended Cymbal 2.sfz', 'platos', 0.22, 0.50, 0.9),
    'Ratchet': (f'{ID}/Ratchet.sfz', 'metal', -0.28, 0.30, 0.6),
}
COMMON = ('Contrabassoon', 'Gong', 'Bell')

# ── levels (gain_db, before the bus) ──
COMMON_GAIN = {'Contrabassoon': 0.0, 'Gong': 8.0, 'Bell': 3.0}
GAIN = {
    'explora': {
        'Cello Solo': 2.0, 'Harp': 2.0, 'Choir': -2.0, 'Timp Roll': 12.0, 'Timpani': 10.0, 'Frame Drum': 0.0,
        'Alto Flute': -1.0, 'Bass Clarinet': -1.0, 'Vibes Bowed': 3.0,
    },
    'combate': {
        'Cello Solo': 1.0, 'Harp': 0.0, 'Choir': -4.0, 'Timp Roll': 6.0, 'Timpani': 6.0, 'Frame Drum': -5.0,
        'Horns': -5.0, 'Choir Melody': -3.0, 'Low Brass': -8.0, 'Tuba': -8.0, 'Cellos Spic': 2.0, 'Violins Spic': -1.0,
        'Basses Spic': 0.0, 'War Drums': -5.0, 'Toms': -5.0, 'Snare': 3.0, 'Anvil': -2.0, 'Shaker': 1.0,
        'Clash': -1.0, 'Cymbal': -9.0, 'Ratchet': -4.0,
    },
}

# Fader rides (the loop wraps from bar 36 into bar 1: a ride over both ends has the same value at the two).
# Exploration: A' (flute, lament, choir and harp) stays a step under the return, and the bridge starts a step down
# and climbs (bars 27-28 under 29-30). Combat: the «Derrumbe» of A' gives the return room; the tune and the drums
# of the return come up (the climax, bar 31, is the loudest moment of the loop).
AUTOMATION: dict[str, dict[str, list[tuple[float, float]]]] = {
    'explora': {
        'Alto Flute': ride((13, 20, -1.0)),
        'Cello Solo': ride((27, 28, -1.0)),
        'Bass Clarinet': ride((13, 20, -2.0), (27, 28, -1.0)),
        'Choir': ride((13, 20, -1.5), (27, 28, -1.5), (29, 30, 0.5)),
        'Harp': ride((13, 20, -1.5), (27, 28, -1.0), (29, 30, 0.5)),
        'Frame Drum': ride((13, 20, -1.0), (27, 28, -1.5), (29, 30, 1.5)),
    },
    'combate': {
        'Cellos Spic': ride((13, 20, -1.0)),
        'Violins Spic': ride((13, 20, -1.0)),
        'Low Brass': ride((13, 20, -1.0)),
        'Horns': ride((31, 34, 1.0)),
        'Choir Melody': ride((31, 34, 1.0)),
        'War Drums': ride((31, 34, 1.0)),
    },
}

TRACKS = {v: list(COMMON) + list(GAIN[v]) for v in VERSIONS}  # common layers first: same sampler state in both

# ── subtractive EQ per bus: high-pass all but the bass, mud out at 250-350 Hz where it piles up, a dip in
# 2.5-4 kHz for the game's SFX, soft highs; the metal is heard by its attack (1-4 kHz), not by its hiss. The buses
# of the shared tracks are identical in both versions; those of the common layers (grave, gong, campana) are linear. ──
BUSES_SHARED = {
    'grave': {'highpass': 26, 'peaks': [(300, -2.0, 1.0)], 'high_shelf': (3000, -3.0)},
    'campana': {'highpass': 300, 'peaks': [(3000, -2.0, 1.0)], 'high_shelf': (6000, -4.0)},
    'gong': {'highpass': 40, 'peaks': [(3500, -3.0, 1.0)], 'high_shelf': (6000, -4.0)},
    'solista': {'highpass': 80, 'peaks': [(280, -2.0, 1.0), (3200, -2.0, 1.2)], 'high_shelf': (7000, -3.0)},
    'arpa': {'highpass': 45, 'peaks': [(300, -3.0, 0.9), (3000, -2.0, 1.0)], 'high_shelf': (7000, -3.0)},
    'coro': {'highpass': 110, 'peaks': [(300, -2.0, 1.0), (3000, -3.0, 1.0)], 'high_shelf': (7000, -3.0)},
    'timbales': {'highpass': 35, 'peaks': [(320, -2.0, 1.0), (3500, -3.0, 1.0)], 'high_shelf': (5000, -3.0)},
    'pandero': {'highpass': 70, 'peaks': [(300, -2.0, 1.0), (3500, -2.0, 1.0)], 'high_shelf': (7000, -3.0)},
}
BUSES = {
    'explora': {
        **BUSES_SHARED,
        # the bowed bar rings its 4th partial two octaves up almost as loud as the note: a wide cut and a soft shelf
        'vibes': {'highpass': 200, 'peaks': [(2000, -5.0, 1.4), (2650, -6.0, 1.4), (3400, -3.0, 1.0)], 'high_shelf': (5000, -4.0)},
        'maderas': {'highpass': 180, 'peaks': [(350, -1.5, 1.0), (3200, -2.0, 1.2)], 'high_shelf': (8000, -3.0)},
        'clarinete': {'highpass': 70, 'peaks': [(300, -2.0, 1.0), (3200, -3.0, 1.0)], 'high_shelf': (7000, -3.0)},
    },
    'combate': {
        **BUSES_SHARED,
        'trompas': {'highpass': 70, 'peaks': [(300, -2.0, 1.0), (2800, -2.5, 1.0)], 'high_shelf': (5000, -3.0)},
        'metales': {'highpass': 40, 'peaks': [(280, -2.5, 1.0), (2800, -2.5, 1.0)], 'high_shelf': (5000, -3.0), 'comp': (-20, 1.6)},
        'ritmo': {'highpass': 40, 'peaks': [(300, -2.5, 1.0), (3200, -3.0, 1.0)], 'high_shelf': (6000, -3.0)},
        'dagas': {'highpass': 220, 'peaks': [(2600, -2.5, 1.0), (3600, -3.0, 1.0)], 'high_shelf': (5000, -4.0)},
        'bajos': {'highpass': 32, 'low_shelf': (65, -3.0), 'peaks': [(230, -1.5, 1.0)], 'high_shelf': (4000, -4.0)},
        # the bass drum's boom sits at 40-50 Hz: out, and a little of its skin (1.8 kHz) up so it reads as a drum
        'tambores': {'highpass': 55, 'low_shelf': (100, -2.0), 'peaks': [(48, -6.0, 1.0), (300, -2.5, 1.0), (1800, 2.0, 1.0)],
                     'high_shelf': (4000, -4.0)},
        'toms': {'highpass': 60, 'peaks': [(350, -2.0, 1.0), (1200, 2.5, 1.0), (3500, -2.0, 1.0)], 'high_shelf': (7000, -3.0)},
        # the rope snare's buzz is what swells into the phrase ends: its body (shared with the timpani roll) goes
        'caja': {'highpass': 180, 'low_shelf': (300, -4.0), 'peaks': [(2200, 3.0, 0.9)], 'high_shelf': (7000, -4.0)},
        'metal': {'highpass': 250, 'peaks': [(3500, -2.0, 1.0)], 'high_shelf': (6000, -6.0)},
        'maraca': {'highpass': 400, 'peaks': [(3500, -2.0, 1.0)], 'high_shelf': (5500, -7.0)},   # its slap, not its hiss
        'platos': {'highpass': 300, 'peaks': [(3500, -2.0, 1.0)], 'high_shelf': (6000, -5.0)},
    },
}

# one hall for both versions (criterion 21): the dragon's cavern
REVERB = {'seconds': 2.6, 'predelay': 0.03, 'damping': 0.55}
REVERB_EQ = {'highpass': 140, 'peaks': [(350, -3.0, 0.8)], 'high_shelf': (6000, -3.0)}  # no muddy or hissy hall
REVERB_RETURN_DB = -3.0
MASTER_BUS = {'highpass': 26, 'comp': (-18, 1.5)}

SECTIONS = {'intro 1-4': (1, 4), 'A 5-12': (5, 12), "A' 13-20": (13, 20), 'B 21-26': (21, 26),
            'puente 27-28': (27, 28), 'puente 29-30': (29, 30), 'retorno 31-34': (31, 34),
            'codetta 35-36': (35, 36), 'c31': (31, 31)}
# the sections of §3 for the contrast between versions (criterion 18)
FORM = {'intro 1-4': (1, 4), 'A 5-12': (5, 12), "A' 13-20": (13, 20), 'B 21-26': (21, 26), 'puente 27-30': (27, 30),
        'retorno 31-34': (31, 34), 'codetta 35-36': (35, 36)}

# the same trim on every part of both versions: headroom so no part peaks over -6 dB before its bus
# (criterion 20); the master's loudness normalization gives it back
TRIM_DB = -6.0


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


# ── part balance (criterion 20): a few parts rendered alone, the way render() places them ──
_SONGS: dict[str, midi_io.Song] = {}
_INSTRUMENTS: dict[str, sampler.Instrument] = {}


def solo(version: str, track: str, with_bus: bool) -> np.ndarray:
    """One part as render() builds it (samples, fader rides, seat, gain) and, if `with_bus`, through its
    bus EQ (no compressor): what the listener gets of it before the hall."""
    p = next(p for p in parts(version) if p.track == track)
    song = _SONGS.setdefault(version, midi_io.load(MIDI[version]))
    total = LOOP_SAMPLES / SR + 4.0
    path = config.library(p.sfz)
    inst = _INSTRUMENTS.setdefault(path, sampler.Instrument.load(path, SR))
    audio = inst.render_track(song.tracks[track].notes, total, cc=song.tracks[track].cc)
    if p.automation:
        audio = audio * render.automation_curve(p.automation, len(audio), SR, BAR_SECONDS)[:, None]
    audio = render._place(audio, p.pan, p.width) * 10 ** (p.gain_db / 20)
    if with_bus:
        audio = mix.process_bus(audio, SR, **{k: v for k, v in BUSES[version][p.bus].items() if k != 'comp'})
    return audio


# struck parts that must cut through in combat (criterion 20): while each plays, its energy in its strongest band
# against the rest of the mix in that band must reach this many dB (a masking proxy), and its loudness stays under
# the tune's. The metal and small percussion must stand out (-3 dB); the drums share the lows with the war drums
# and the basses (-9 dB). Measured in A (bars 5-12), the snare and the ratchet in A' (bars 13-20).
AUDIBLE = {'Anvil': -3.0, 'Shaker': -3.0, 'Clash': -3.0, 'Snare': -3.0, 'Ratchet': -3.0, 'Toms': -9.0, 'Frame Drum': -9.0}
WINDOW = {'Snare': (13, 20), 'Ratchet': (13, 20)}
BANDS = {'60-250': (60, 250), '250-800': (250, 800), '0.8-2.5k': (800, 2500), '2.5-6k': (2500, 6000),
         '6-16k': (6000, 16000)}


def band_frames(x: np.ndarray, frame: int = 2048) -> tuple[np.ndarray, dict[str, np.ndarray]]:
    """Per-frame RMS level (dB) and per-band power of a mono-summed signal (hop = frame / 2)."""
    mono = x.mean(axis=1)
    hop = frame // 2
    count = 1 + (len(mono) - frame) // hop
    idx = np.arange(frame)[None, :] + hop * np.arange(count)[:, None]
    frames = mono[idx] * np.hanning(frame)[None, :]
    spec = np.abs(np.fft.rfft(frames, axis=1)) ** 2
    freqs = np.fft.rfftfreq(frame, 1 / SR)
    level = 10 * np.log10(np.mean(frames ** 2, axis=1) + 1e-20)
    return level, {k: spec[:, (freqs >= a) & (freqs < b)].sum(axis=1) for k, (a, b) in BANDS.items()}


def balance() -> dict:
    """Combat: for each struck part, over the frames where it sounds (within 20 dB of its loudest frame) in its
    window, its strongest band against the same band of everything else (dB), and its gated loudness against the
    cello's in section A. Exploration (A, bars 5-12): the cello over the harp and the glow (gated LUFS)."""
    def span(first, last):
        return int(round((first - 1) * BAR_SECONDS * SR)), int(round(last * BAR_SECONDS * SR))
    out = {'combate': {}, 'explora': {}}
    stems = {t: solo('combate', t, True) for t in TRACKS['combate']}
    total = sum(stems.values())
    a0, a1 = span(5, 12)
    lead = mix.lufs(stems['Cello Solo'][a0:a1], SR)
    for t in AUDIBLE:
        w0, w1 = span(*WINDOW.get(t, (5, 12)))
        level, own = band_frames(stems[t][w0:w1])
        _, rest = band_frames((total - stems[t])[w0:w1])
        active = level >= level.max() - 20
        ratios = {k: 10 * np.log10(own[k][active].sum() / (rest[k][active].sum() + 1e-20) + 1e-20) for k in BANDS}
        band = max(ratios, key=ratios.get)
        out['combate'][t] = {'banda': band, 'frente_al_resto_db': round(float(ratios[band]), 1),
                             'lufs': round(mix.lufs(stems[t][w0:w1], SR) - lead, 1)}
    lead_ex = mix.lufs(solo('explora', 'Cello Solo', True)[a0:a1], SR)
    for t in ('Harp', 'Vibes Bowed'):
        out['explora'][t] = round(mix.lufs(solo('explora', t, True)[a0:a1], SR) - lead_ex, 1)
    return out


# ── crossfade test (criterion 22) ──────────────────────────────────────────
CROSS_AT = (24.0, 56.0)  # explora → combate at 24 s (bar 12), back to explora at 56 s (bar 27)
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
        out[f'{at:g} s'] = {'bache_lu': round(dip, 2), 'exceso_lu': round(over, 2), 'salto_lu': round(step, 2)}
    return out


def onset_offsets(tracks: list[str]) -> dict[str, float]:
    """Largest gap (ms) between the attacks the two versions share on the same sixteenth, for the tracks
    with the same name: more than ~15 ms would be heard as a flam in the crossfade."""
    ex, co = midi_io.load(MIDI['explora']).tracks, midi_io.load(MIDI['combate']).tracks
    grid = 60 / BPM / 4
    out = {}
    for name in tracks:
        a = {round(n.start / grid): n.start for n in ex[name].notes}
        b = {round(n.start / grid): n.start for n in co[name].notes}
        shared = set(a) & set(b)
        out[name] = round(max((abs(a[k] - b[k]) for k in shared), default=0) * 1000, 1)
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
def checks(r: dict[str, dict], cross: dict, bal: dict) -> list[tuple[str, bool, str]]:
    ex, co = r['explora'], r['combate']
    res = [
        ('15 explora -17,4 ± 0,5 LUFS', abs(ex['lufs'] + 17.4) <= 0.5, f"{ex['lufs']} LUFS"),
        ('15 combate -16,6 ± 0,5 LUFS', abs(co['lufs'] + 16.6) <= 0.5, f"{co['lufs']} LUFS"),
        ('15 combate − explora en 0–1,2 LU', 0 <= co['lufs'] - ex['lufs'] <= 1.2, f"{co['lufs'] - ex['lufs']:+.2f} LU"),
    ]
    for v in VERSIONS:
        res.append((f'15 {v} pico real ≤ -1 dBTP', r[v]['true_peak_db'] <= -1.0, f"{r[v]['true_peak_db']} dBTP"))
    for v in VERSIONS:
        res.append((f'16 {v} loop_samples = 3 402 000', r[v]['loop_samples'] == LOOP_SAMPLES, str(r[v]['loop_samples'])))
        res.append((f'16 {v} seam_jump < 0,02', r[v]['seam_jump'] < 0.02, str(r[v]['seam_jump'])))
    for v, (lo, hi) in (('explora', (4, 9)), ('combate', (3, 8))):
        s = r[v]['sections_lufs']
        c = s['retorno 31-34'] - s['B 21-26']
        res.append((f'17 {v} retorno − B en {lo}–{hi} LU', lo <= c <= hi, f'{c:.1f} LU'))
        p = s['puente 29-30'] - s['puente 27-28']
        res.append((f'17 {v} puente 29-30 − 27-28 ≥ 1,5 LU', p >= 1.5, f'{p:.1f} LU'))
    for name in FORM:
        d = co['form_lufs'][name] - ex['form_lufs'][name]
        res.append((f'18 combate − explora en {name} en -1,5–5 LU', -1.5 <= d <= 5, f'{d:+.1f} LU'))
    for v, (pres, air) in (('explora', (-19, -30)), ('combate', (-17, -26))):
        b = r[v]['bands_db']
        res.append((f'19 {v} presencia 2.5-6k ≤ {pres} dB', b['presencia 2.5-6k'] <= pres, str(b['presencia 2.5-6k'])))
        res.append((f'19 {v} aire 6-16k ≤ {air} dB', b['aire 6-16k'] <= air, str(b['aire 6-16k'])))
        res.append((f'19 {v} sub <60 ≤ -18 dB', b['sub <60'] <= -18, str(b['sub <60'])))
    for v in VERSIONS:
        worst = max(r[v]['parts'].items(), key=lambda kv: kv[1]['pico_db'])
        res.append((f'20 {v} ninguna parte > -6 dB de pico', worst[1]['pico_db'] <= -6, f'{worst[0]} {worst[1]["pico_db"]} dB'))
    for track, floor in AUDIBLE.items():
        d = bal['combate'][track]
        res.append((f'20 combate A: {track} asoma (≥ {floor} dB frente al resto en su banda) bajo la melodía',
                    d['frente_al_resto_db'] >= floor and d['lufs'] < 0,
                    f"{d['frente_al_resto_db']:+.1f} dB en {d['banda']}, sonoridad {d['lufs']:+.1f} LU"))
    res.append(('20 explora A: chelo ≥ arpa + 3 LU', bal['explora']['Harp'] <= -3, f"{bal['explora']['Harp']:+.1f} LU"))
    res.append(('20 explora A: chelo ≥ vibráfono + 6 LU', bal['explora']['Vibes Bowed'] <= -6,
                f"{bal['explora']['Vibes Bowed']:+.1f} LU"))
    for at, c in cross.items():
        res.append((f'22 cruce {at}: bache ≤ 3 LU bajo la menor', c['bache_lu'] <= 3, f"{c['bache_lu']} LU"))
        res.append((f'22 cruce {at}: salto ≤ 4 LU', c['salto_lu'] <= 4 and c['exceso_lu'] <= 4,
                    f"{c['salto_lu']} LU entre versiones (exceso {c['exceso_lu']} LU)"))
    return res


def check_shared_seating() -> None:
    """Criterion 21, enforced by construction: one seat per track name, one hall, one gain and no rides
    for the common layers, identical buses for the shared tracks and linear ones for the common layers."""
    both = set(TRACKS['explora']) & set(TRACKS['combate'])
    assert both == set(COMMON) | {'Cello Solo', 'Harp', 'Choir', 'Timp Roll', 'Timpani', 'Frame Drum'}, sorted(both)
    for v in VERSIONS:
        assert not set(GAIN[v]) & set(COMMON) and not set(AUTOMATION[v]) & set(COMMON)
        assert set(GAIN[v]) | set(COMMON) == set(midi_io.load(MIDI[v]).tracks), 'every MIDI track gets a seat'
    for track in COMMON:
        bus = SEATS[track][1]
        assert BUSES['explora'][bus] == BUSES['combate'][bus] and 'comp' not in BUSES['explora'][bus]
    for track in both:
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
    same = common_identity()
    with open(CROSS_REPORT, 'w') as f:
        json.dump({'cruce': cross, 'desfase_ataques_ms': flams, 'capas_comunes_diferencia_db': same,
                   'decoded_samples': {'explora': len(ex), 'combate': len(co)}}, f, indent=1, ensure_ascii=False)
    print(f'\n══ cruce ══ {CROSS_OUT}')
    print(f'  muestras decodificadas: explora {len(ex)}, combate {len(co)}')
    for at, c in cross.items():
        print(f'  {at}: bache {c["bache_lu"]} LU · exceso {c["exceso_lu"]} LU · salto entre versiones {c["salto_lu"]} LU')
    print('  desfase máximo de ataques compartidos (ms): ' + ', '.join(f'{k} {v}' for k, v in flams.items()))
    print('  capas comunes, pico de (explora − combate) tras su bus (dB): ' + ', '.join(f'{k} {v}' for k, v in same.items()))

    print('\n  Contraste combate − explora por sección (LU): ' + ', '.join(
        f"{k} {reports['combate']['form_lufs'][k] - reports['explora']['form_lufs'][k]:+.1f}" for k in FORM))

    bal = balance()
    print(f"\n  Equilibrio en A (c. 5-12, cada parte sola tras la EQ de su bus, LU respecto al chelo): {bal}")

    refs = {k: measure(decode(os.path.join(SKETCH_DIR, f))) for k, f in SKETCHES.items()
            if os.path.exists(os.path.join(SKETCH_DIR, f))}
    print('\nBandas dB (rel. al total)    explora  combate' + ''.join(f'  {k:>16s}' for k in refs))
    for k in reports['explora']['bands_db']:
        line = f"  {k:24s} {reports['explora']['bands_db'][k]:7.1f}  {reports['combate']['bands_db'][k]:7.1f}"
        line += ''.join(f"  {m['bands_db'][k]:16.1f}" for m in refs.values())
        print(line)

    print('\nCriterios del brief:')
    results = checks(reports, cross, bal)
    for label, ok, value in results:
        print(f"  [{'ok' if ok else 'FALLA'}] {label}: {value}")
    return 0 if all(ok for _, ok, _ in results) else 1


if __name__ == '__main__':
    sys.exit(main())
