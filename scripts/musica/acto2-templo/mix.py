"""«Vísperas del pozo» (Act II, The Dark Temple): mix and master of the two synchronized versions
(brief: docs/musica/acto2-templo.md, §8 criteria 13–21).

Reads build/acto2-templo-{explora,combate}.mid (written by compose.py) and renders both with the same
hall, the same seats (pan, depth, width) for every track that exists in both, and the same buses and
gain_db for the common layers (Organ Pedal, Contrabassoon, Frame Drum) and the two choirs, so that the
game's 1.6 s crossfade sums them in phase. Exploration is mastered to -17.5 LUFS and combat to -16.5 LUFS
(-1 dBTP) as seamless loops of 3 704 400 samples; writes build/acto2-templo-{explora,combate}.mp3 with
their reports (.report.json). Loudness, true peak, loop length and seam are also checked on the decoded
MP3s (the studio's VBR export keeps the level: nothing is compensated).

Then the crossfade test (criterion 20): build/acto2-templo-cruce.mp3 plays exploration, crosses linearly
over 1.6 s to combat at 24 s (bar 9, middle of A') and back at 56 s (bar 19 beat 3, middle of the bridge),
as the game does (src/fx/audio.ts), and measures the short-term loudness (3 s) and the alignment of both
versions around each crossing (low band: common bass and frame drum; voice band: the choirs).

Prints the reports, the brief checks and a comparison with the previous build, the approved sketches
(scripts/musica/leitmotivs/build/acto2-templo-*.mp3) and the old act II track (src/audio/cap2.mp3).

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/acto2-templo/mix.py
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
sys.path.insert(0, HERE)

from estudio import config, mix, render  # noqa: E402
from estudio.render import Part  # noqa: E402
from compose import PAN  # noqa: E402  (the orchestrator's seating, one pan per track)

NAME = 'acto2-templo'
BUILD = os.path.join(HERE, 'build')
VERSIONS = ('explora', 'combate')
TARGET_LUFS = {'explora': -17.5, 'combate': -16.5}   # brief, ± 0.5 LU
# master targets: 0.3 LU apart from the brief's centre, inside its tolerance, so that combat sits 1.6 LU over
# exploration overall and can be 1–5 LU over it in every section (criterion 16)
MASTER_LUFS = {'explora': -17.8, 'combate': -16.2}
LOOP_SAMPLES = 3704400                     # 28 bars × 4 quarters × 60/80 s × 44 100
REFERENCES = {
    'boceto E': os.path.join(ROOT, 'scripts', 'musica', 'leitmotivs', 'build', 'acto2-templo-explora.mp3'),
    'boceto C': os.path.join(ROOT, 'scripts', 'musica', 'leitmotivs', 'build', 'acto2-templo-combate.mp3'),
    'cap2.mp3': os.path.join(ROOT, 'src', 'audio', 'cap2.mp3'),
}
CROSS_OUT = os.path.join(BUILD, f'{NAME}-cruce.mp3')
CROSS_FADE = 1.6                           # seconds, CRUCE_VERSIONES in src/fx/audio.ts
CROSS_AT = (24.0, 56.0)                    # to combat (bar 9), back to exploration (bar 19, beat 3)

VSCO = 'VSCO-2-CE/'
VCSL = 'VCSL/'
SSO = 'sso/Sonatina Symphonic Orchestra/'
STRUCK_M = VCSL + 'Membranophones/Struck Membranophones/'
STRUCK_I = VCSL + 'Idiophones/Struck Idiophones/'


def path(version: str, ext: str) -> str:
    return os.path.join(BUILD, f'{NAME}-{version}.{ext}')


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


# ── seating: one chair per MIDI track (pan from compose.PAN), identical in both versions (criterion 19) ──
@dataclass(frozen=True)
class Seat:
    sfz: str
    bus: str
    send: float     # depth: share sent to the hall
    width: float = 1.0


SEATS = {
    # the two choirs that answer each other: low voices left of centre, high voices right, in the nave
    'Choir Low': Seat(SSO + 'Chorus - Performance/Large Chorus.sfz', 'coros', 0.40, 0.8),
    'Choir High': Seat(SSO + 'Chorus - Performance/Mixed Chorus.sfz', 'coros', 0.44, 0.8),
    # the shouted invocation (combat): centre, a little drier and in front of the choirs
    'Chant': Seat(SSO + 'Chorus - Performance/Large Chorus.sfz', 'salmodia', 0.30, 0.7),
    # the organ: manuals behind the choirs, the pedal and the contrabassoon as the floor (common layers)
    'Organ': Seat(SSO + 'Organ/Great - Stopped Diapason 8ft.sfz', 'organo', 0.50, 0.9),
    'Organ Open': Seat(SSO + 'Organ/Great - Open Diapason 8ft.sfz', 'organo', 0.50, 0.9),
    'Organ Pedal': Seat(SSO + 'Organ/Pedal - Bourdon 16ft.sfz', 'pedal', 0.30, 0.6),
    'Contrabassoon': Seat(SSO + 'Woodwinds - Performance/Contrabassoon Solo Sustain (looped).sfz', 'contrafagot',
                          0.30, 0.5),
    # woodwinds: centre-right, a little back
    'Cor Anglais': Seat(SSO + 'Woodwinds - Performance/Cor Anglais Solo Sustain.sfz', 'maderas', 0.42, 0.5),
    # brass: trombones centre-right, horns (sustain and marcato) left and back
    'Trombones': Seat(SSO + 'Brass - Performance/Trombones Sustain (looped).sfz', 'trombones', 0.34, 0.7),
    'Horns': Seat(SSO + 'Brass - Performance/Horns Sustain.sfz', 'trompas', 0.44, 0.7),
    'Brass Stabs': Seat(SSO + 'Brass - Performance/Horns Marcato.sfz', 'trompas', 0.38, 0.7),
    # strings: cellos and basses right (spiccato ostinato), violins I left (the daggers)
    'Ostinato': Seat(VSCO + 'CelloEnsSpic.sfz', 'cuerdas', 0.22),
    'Ostinato Low': Seat(VSCO + 'ContrabassSpic.sfz', 'contrabajos', 0.20, 0.6),
    'Daggers': Seat(VSCO + 'ViolinEnsSpic.sfz', 'punales', 0.26),
    # timpani and percussion at the back
    'Timpani': Seat(VSCO + 'Timpani.sfz', 'timbales', 0.45, 0.6),
    'Timp Roll': Seat(VSCO + 'TimpaniRolls.sfz', 'timbales', 0.45, 0.6),
    'Frame Drum': Seat(STRUCK_M + 'Frame Drum.sfz', 'tambor', 0.40, 0.6),
    'Darbuka': Seat(STRUCK_M + 'Darbuka.sfz', 'parches', 0.40, 0.6),
    'Bass Drum': Seat(STRUCK_M + 'Bass Drum 2.sfz', 'bombo', 0.38, 0.6),
    'Tom': Seat(STRUCK_M + 'Tom 2.sfz', 'parches', 0.38, 0.6),
    # metal: far away in the hall, counted
    'Finger Cymbals': Seat(STRUCK_I + 'Finger Cymbals.sfz', 'crotalos', 0.55, 0.6),
    'Hand Bell': Seat(STRUCK_I + 'Hand Bells, Nepalese.sfz', 'campanas', 0.55, 0.6),
    'Bell': Seat(STRUCK_I + 'Tubular Bells 1.sfz', 'campanas', 0.55, 0.7),
    'Broken Bells': Seat(STRUCK_I + 'Tubular Bells 1.sfz', 'campanas', 0.55, 0.7),
    'Gong': Seat(STRUCK_I + 'Gong 1.sfz', 'metal', 0.60, 0.9),
    'Metal': Seat(STRUCK_I + 'Gong 2.sfz', 'metal', 0.55, 0.9),
}
COMMON = ('Organ Pedal', 'Contrabassoon', 'Frame Drum')       # identical in both MIDIs
CHOIRS = ('Choir Low', 'Choir High')                          # same notes, only CC1 changes

# ── fader levels (dB) ──
# Same gain_db in both versions for the common layers and the choirs (criterion 19); the rest per version.
COMMON_GAIN = {'Choir Low': 0.0, 'Choir High': 0.0, 'Organ Pedal': -16.5, 'Contrabassoon': -8.0, 'Frame Drum': -4.0}
LEVELS = {
    'explora': {
        'Organ': -16.5, 'Organ Open': -28.5, 'Cor Anglais': -7.0, 'Darbuka': -2.0, 'Finger Cymbals': 14.0,
        'Hand Bell': 12.0, 'Bell': -2.0, 'Gong': 10.0, 'Timp Roll': 16.0,
    },
    'combate': {
        'Trombones': -12.0, 'Horns': -11.5, 'Chant': -4.5, 'Brass Stabs': -10.0, 'Ostinato': 0.0, 'Ostinato Low': -3.0,
        'Daggers': -9.0, 'Timpani': -1.0, 'Timp Roll': 10.0, 'Bass Drum': -11.5, 'Tom': -8.0, 'Metal': -8.0,
        'Broken Bells': -3.0, 'Finger Cymbals': 12.0,
    },
}
# fader rides as (first bar, last bar, dB) segments, inclusive (see ride()); never on COMMON_GAIN tracks
RIDES: dict[str, dict[str, list[tuple[float, float, float]]]] = {
    'explora': {},
    'combate': {
        # the shouted chant and the horn stabs sit right in the choirs' band (250 Hz–2.5 kHz): they keep out of
        # the climb of the return, which the drums, the ostinato and the trombones carry
        'Chant': [(19, 24, -1.5)],
        'Brass Stabs': [(19, 24, -2.5)],
    },
}
# Group rides of a whole version (every part but the common layers and the choirs, which stay identical).
# Combat must be 1–5 LU above exploration in every section (criterion 16) while the integrated levels are
# only 1 LU apart, so combat has to follow exploration's shape: its band steps back in A' (the choirs lead)
# and in the first half of the bridge, keeps B moving, and takes the climb into the return; exploration's
# band leans a little the other way. Sized from per-bar stems (choirs / common / band) and a loudness model
# calibrated on the render, then checked on the render.
VCA: dict[str, list[tuple[float, float, float]]] = {
    'explora': [(3, 10, 0.5), (11, 16, -1.0), (17, 18, 0.8), (19, 20, -1.0), (21, 24, -1.75)],
    'combate': [(1, 2, 1.0), (3, 6, -1.0), (7, 10, -3.0), (11, 16, 2.0), (17, 18, -2.0), (19, 20, 2.5),
                (21, 24, 3.25), (25, 26, 1.0)],
}
# the choirs in octaves of the return are the loudest thing in exploration: the same ride in both versions
# (so they stay identical) tames them there, and in combat the band around them takes the climb instead
CHOIR_RIDE = [(11, 16, -1.0), (19, 20, -0.5), (21, 24, -1.75), (25, 26, -0.25)]  # B breathes in both

# ── subtractive EQ per bus (shared by both versions): high-pass all but the floor, mud out at
# 200–400 Hz where it piles up, a dip in 2–5 kHz for the game's SFX, soft highs. The buses of the
# common layers and the choirs have no compressor (they must behave the same in both versions). ──
BUSES = {
    'coros': {'highpass': 100, 'peaks': [(300, -2.0, 1.0), (3000, -3.0, 1.0)], 'high_shelf': (8000, -3.0)},
    # a pocket at 800 Hz in the parts that share the choirs' band, so the melody reads through them
    'salmodia': {'highpass': 90, 'peaks': [(300, -2.5, 1.0), (800, -2.5, 0.8), (3000, -3.5, 1.0)], 'high_shelf': (7000, -3.0)},
    'organo': {'highpass': 70, 'peaks': [(300, -2.0, 1.0), (3000, -2.0, 1.0)], 'high_shelf': (7000, -3.0)},
    # the Bourdon 16' sounds an octave down (35–65 Hz): most of its fundamental goes, its upper partials stay
    'pedal': {'highpass': 75, 'low_shelf': (100, -10.0), 'peaks': [(250, -1.5, 1.0)], 'high_shelf': (4000, -4.0)},
    'contrafagot': {'highpass': 50, 'low_shelf': (70, -4.0), 'peaks': [(250, -1.5, 1.0)], 'high_shelf': (4000, -4.0)},
    'maderas': {'highpass': 150, 'peaks': [(350, -2.0, 1.0), (3000, -3.0, 1.0)], 'high_shelf': (7000, -3.0)},
    'trombones': {'highpass': 70, 'peaks': [(300, -2.5, 1.0), (3000, -3.0, 1.0)], 'high_shelf': (7000, -3.0),
                  'comp': (-20, 1.6)},
    'trompas': {'highpass': 90, 'peaks': [(300, -2.5, 1.0), (750, -2.5, 0.9), (3000, -3.0, 1.0)], 'high_shelf': (6500, -3.0),
                'comp': (-20, 1.6)},
    'cuerdas': {'highpass': 60, 'peaks': [(300, -2.0, 1.0), (750, -2.0, 1.0), (3200, -3.0, 1.0)], 'high_shelf': (7000, -3.0)},
    'contrabajos': {'highpass': 55, 'low_shelf': (70, -4.0), 'peaks': [(250, -1.5, 1.0), (3200, -3.0, 1.0)],
                    'high_shelf': (5000, -4.0)},
    'punales': {'highpass': 250, 'peaks': [(400, -2.0, 1.0), (3000, -3.0, 1.0), (5000, -3.0, 1.2)],
                'high_shelf': (6500, -5.0)},
    'timbales': {'highpass': 40, 'peaks': [(320, -2.0, 1.0)], 'high_shelf': (5000, -3.0)},
    'tambor': {'highpass': 55, 'peaks': [(46, -6.0, 1.5), (3500, -4.0, 1.0)], 'high_shelf': (6000, -4.0)},
    'parches': {'highpass': 55, 'peaks': [(350, -2.0, 1.0), (3500, -4.0, 1.0)], 'high_shelf': (6000, -4.0)},
    'bombo': {'highpass': 70, 'low_shelf': (80, -6.0), 'peaks': [(110, 2.0, 1.0), (330, -2.0, 1.0), (3500, -4.0, 1.0)],
              'high_shelf': (5000, -4.0)},
    'crotalos': {'highpass': 1000, 'peaks': [(3500, -3.0, 0.8)], 'high_shelf': (6000, -6.0)},
    'campanas': {'highpass': 300, 'peaks': [(3500, -3.0, 0.8)], 'high_shelf': (6000, -6.0)},
    'metal': {'highpass': 150, 'peaks': [(3500, -3.0, 0.8)], 'high_shelf': (6000, -6.0)},
}
REVERB = {'seconds': 2.8, 'predelay': 0.03, 'damping': 0.5}       # one hall for both versions (brief §8)
REVERB_EQ = {'highpass': 150, 'peaks': [(350, -2.0, 0.8), (3500, -2.5, 0.8)], 'high_shelf': (7000, -3.0)}
REVERB_RETURN_DB = {'explora': -3.0, 'combate': -4.5}            # the vespers ring more than the fight
MASTER_BUS = {'highpass': 35}  # no master glue: it flattened combat's climb (the buses already hold it together)

SECTIONS = {'intro 1-2': (1, 2), 'A 3-6': (3, 6), "A' 7-10": (7, 10), 'B 11-16': (11, 16),
            'puente 17-18': (17, 18), 'puente 19-20': (19, 20), 'retorno 21-24': (21, 24),
            'extensión 25-26': (25, 26), 'codetta 27-28': (27, 28), 'c23': (23, 23)}
FORM = [k for k in SECTIONS if k != 'c23']
# tracks held or melodic that must stay at least 3 LU under the choirs (criterion 18)
HELD = {'explora': ('Organ', 'Organ Open', 'Organ Pedal', 'Contrabassoon', 'Cor Anglais'),
        'combate': ('Chant', 'Trombones', 'Horns', 'Organ Pedal', 'Contrabassoon')}


def parts(version: str) -> list[Part]:
    # MIDI order: Choir Low comes before Chant, which shares its instrument (and its random/round-robin
    # state) in combat, so Choir Low picks the same samples in both versions.
    tracks = render.midi_io.load(path(version, 'mid')).tracks
    order = list(tracks)
    assert 'Chant' not in order or order.index('Choir Low') < order.index('Chant'), 'Choir Low must render first'
    out = []
    for name in tracks:
        if not tracks[name].notes:
            continue
        seat = SEATS[name]
        gain = COMMON_GAIN.get(name, LEVELS[version].get(name, 0.0))
        if name in COMMON_GAIN:  # identical in both versions: only the shared ride of the choirs
            segments = CHOIR_RIDE if name in CHOIRS else []
        else:
            segments = RIDES[version].get(name, []) + VCA[version]
        out.append(Part(name, seat.sfz, seat.bus, pan=PAN[name], gain_db=gain, send=seat.send, width=seat.width,
                        automation=ride(*segments) if segments else []))
    return out


def spec(version: str) -> render.MixSpec:
    return render.MixSpec(
        midi=path(version, 'mid'), out=path(version, 'mp3'), bpm=80, beats_per_bar=4, bars=28,
        parts=parts(version), buses=BUSES, reverb=REVERB, reverb_return_db=REVERB_RETURN_DB[version],
        reverb_eq=REVERB_EQ, master_bus=MASTER_BUS, target_lufs=MASTER_LUFS[version], ceiling_dbtp=-1.0,
        tail_seconds=4.0, sections=SECTIONS,
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


def lag_ms(a: np.ndarray, b: np.ndarray, sr: int, band: tuple[float, float], max_ms: float = 40) -> float:
    """Lag (ms) that best aligns band `band` (Hz) of b to a: 0 = no flam between the versions."""
    from scipy.signal import butter, sosfilt
    sos = butter(4, band, 'bandpass', fs=sr, output='sos')
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
        steps = np.abs(np.diff(st_x[near]))                          # 0.1 s steps of the 3 s loudness
        before = st_x[np.argmin(np.abs(times - (t - 1.5)))]          # last window before the fade
        after = st_x[np.argmin(np.abs(times - (t + CROSS_FADE + 1.5)))]  # first window after it
        seg = slice(int((t - 4) * sr), int((t + 4) * sr))
        crossings.append({'t': t, 'bache_lu': round(dip, 2), 'salto_lu': round(float(after - before), 2),
                          'paso_max_lu': round(float(steps.max()), 2),
                          'st_antes': round(float(before), 1), 'st_despues': round(float(after), 1),
                          'desfase_graves_ms': round(lag_ms(e[seg], c[seg], sr, (40, 250)), 2),
                          'desfase_voces_ms': round(lag_ms(e[seg], c[seg], sr, (300, 1500)), 2)})
    return {'out': CROSS_OUT, 'lufs': round(mix.lufs(x, sr), 2), 'true_peak_db': round(mix.true_peak_db(x, sr), 2),
            'cruces': crossings}


# ── brief checks ────────────────────────────────────────────────────────────
def checks(version: str, r: dict) -> list[tuple[str, bool, str]]:
    b, s, p = r['bands_db'], r['sections_lufs'], r['parts']
    target = TARGET_LUFS[version]
    contrast = s['retorno 21-24'] - s['B 11-16']
    lo, hi = (4, 8) if version == 'explora' else (3, 6)
    bridge = s['puente 19-20'] - s['puente 17-18']
    presence = -19 if version == 'explora' else -18
    worst = max(p.items(), key=lambda kv: kv[1]['pico_db'])
    choir = min(p[c]['lufs'] for c in CHOIRS)
    held = max((t for t in HELD[version] if t in p), key=lambda t: p[t]['lufs'])
    f = r['mp3']  # the decoded MP3: what the game plays
    out = [
        (f'13 sonoridad {target} ± 0,5 LUFS (MP3)', abs(f['lufs'] - target) <= 0.5, f"{f['lufs']} LUFS"),
        ('13 pico real ≤ -1 dBTP (render y MP3)', max(r['true_peak_db'], f['true_peak_db']) <= -1.0,
         f"{r['true_peak_db']} / {f['true_peak_db']} dBTP"),
        ('14 loop_samples = 3 704 400 (y muestras del MP3)', r['loop_samples'] == LOOP_SAMPLES == f['samples'],
         f"{r['loop_samples']} / {f['samples']}"),
        ('14 seam_jump < 0,02 (render y MP3)', max(r['seam_jump'], f['seam_jump']) < 0.02,
         f"{r['seam_jump']} / {f['seam_jump']}"),
        (f'15 retorno 21-24 vs B en {lo}–{hi} LU', lo <= contrast <= hi, f'{contrast:+.1f} LU'),
        ('15 puente 19-20 vs 17-18 ≥ +1,5 LU', bridge >= 1.5, f'{bridge:+.1f} LU'),
        (f'17 presencia 2.5-6k ≤ {presence} dB', b['presencia 2.5-6k'] <= presence, str(b['presencia 2.5-6k'])),
        ('17 aire 6-16k ≤ -30 dB', b['aire 6-16k'] <= -30, str(b['aire 6-16k'])),
        ('17 sub <60 ≤ -20 dB', b['sub <60'] <= -20, str(b['sub <60'])),
        ('18 ninguna parte > -6 dB de pico', worst[1]['pico_db'] <= -6, f'{worst[0]} {worst[1]["pico_db"]} dB'),
        ('18 coros ≥ 3 LU sobre lo tenido/melódico', choir - p[held]['lufs'] >= 3,
         f"coro más bajo {choir} LUFS · {held} {p[held]['lufs']} LUFS"),
        ('18 Finger Cymbals ≥ 12 LU bajo los coros', choir - p['Finger Cymbals']['lufs'] >= 12,
         f"{choir - p['Finger Cymbals']['lufs']:.1f} LU"),
    ]
    if version == 'combate':
        out.append(('18 Daggers ≥ 6 LU bajo Choir High', p['Choir High']['lufs'] - p['Daggers']['lufs'] >= 6,
                    f"{p['Choir High']['lufs'] - p['Daggers']['lufs']:.1f} LU"))
    return out


def joint_checks(reports: dict[str, dict], cross: dict) -> list[tuple[str, bool, str]]:
    e, c = reports['explora']['sections_lufs'], reports['combate']['sections_lufs']
    diffs = {k: round(c[k] - e[k], 1) for k in FORM}
    placed = {v: {p.track: p for p in parts(v)} for v in VERSIONS}
    common = sorted(set(placed['explora']) & set(placed['combate']))
    seat = lambda p: (p.sfz, p.bus, p.pan, p.send, p.width)  # noqa: E731
    same_seat = all(seat(placed['explora'][t]) == seat(placed['combate'][t]) for t in common)
    shared = COMMON + CHOIRS
    same_gain = all(placed['explora'][t].gain_db == placed['combate'][t].gain_db
                    and placed['explora'][t].automation == placed['combate'][t].automation for t in shared)
    no_comp = all('comp' not in BUSES[SEATS[t].bus] for t in shared)
    shared_buses = {SEATS[t].bus for t in shared}
    alone = all(SEATS[t].bus not in shared_buses for v in VERSIONS for t in placed[v] if t not in shared)
    out = [
        ('14 mismo loop_samples', reports['explora']['loop_samples'] == reports['combate']['loop_samples'],
         str(reports['explora']['loop_samples'])),
        ('16 combate - exploración en +1…+5 LU por sección', all(1 <= d <= 5 for d in diffs.values()),
         ' · '.join(f'{k.split()[0]} {d:+.1f}' for k, d in diffs.items())),
        ('19 misma sala; misma colocación en las pistas comunes', same_seat, f'{len(common)} pistas en las dos'),
        ('19 capas comunes y coros: mismo gain_db, buses propios sin compresor', same_gain and no_comp and alone,
         ', '.join(f'{t} {placed["explora"][t].gain_db:+.1f}' for t in shared)),
    ]
    for x in cross['cruces']:
        out.append((f"20 cruce en {x['t']:.0f} s: bache ≤ 3 LU, salto ≤ 5 LU, sin flam",
                    x['bache_lu'] >= -3 and abs(x['salto_lu']) <= 5 and abs(x['desfase_graves_ms']) < 1
                    and abs(x['desfase_voces_ms']) < 1,
                    f"bache {x['bache_lu']} LU · salto {x['salto_lu']:+} LU · paso máx. {x['paso_max_lu']} LU/0,1 s · "
                    f"desfase {x['desfase_graves_ms']} / {x['desfase_voces_ms']} ms"))
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
    for v in VERSIONS:
        reports[v] = render.render(spec(v))
        reports[v]['mp3'] = measure(path(v, 'mp3'))
        with open(path(v, 'report.json'), 'w') as f:
            json.dump(reports[v], f, indent=1, ensure_ascii=False)
        print_report(v, reports[v], previous[v])
    refs = {name: measure(f) for name, f in REFERENCES.items() if os.path.exists(f)}
    head = '  '.join(f'{v:>9s}' for v in VERSIONS) + ''.join(f'  {v + " ant.":>13s}' for v in VERSIONS if previous[v])
    print(f'\nBandas dB (rel. al total)   {head}' + ''.join(f'  {n:>9s}' for n in refs))
    for k in reports['explora']['bands_db']:
        line = f'  {k:24s}' + ''.join(f'  {reports[v]["bands_db"][k]:9.1f}' for v in VERSIONS)
        line += ''.join(f'  {previous[v]["bands_db"][k]:13.1f}' for v in VERSIONS if previous[v])
        line += ''.join(f'  {o["bands_db"][k]:9.1f}' for o in refs.values())
        print(line)
    for n, o in refs.items():
        print(f"Referencia {n}: {o['samples']} muestras · {o['lufs']} LUFS · {o['true_peak_db']} dBTP · seam {o['seam_jump']}")

    cross = crossfade_test()
    print(f"\nPrueba de cruce: {cross['out']} · {cross['lufs']} LUFS · {cross['true_peak_db']} dBTP")
    for x in cross['cruces']:
        print(f"  {x['t']:4.0f} s: corto plazo {x['st_antes']} → {x['st_despues']} LUFS · bache {x['bache_lu']} LU "
              f"respecto a la menor · paso máx. {x['paso_max_lu']} LU · desfase graves {x['desfase_graves_ms']} ms, "
              f"voces {x['desfase_voces_ms']} ms")

    print('\nCriterios del brief:')
    results = [(f'[{v}] ' + label, ok, value) for v in VERSIONS for label, ok, value in checks(v, reports[v])]
    results += joint_checks(reports, cross)
    for label, ok, value in results:
        print(f"  [{'ok' if ok else 'FALLA'}] {label}: {value}")
    return 0 if all(ok for _, ok, _ in results) else 1


if __name__ == '__main__':
    sys.exit(main())
