"""Boss theme of Vexis «La función de medianoche» (cap1-e1-jefe): mix and master
(brief: docs/musica/acto1-vexis.md, §8 criteria 12–17).

Reads build/acto1-vexis.mid (written by compose.py) and prepares a mix copy of it
(build/acto1-vexis.mix.mid) with one change: the celesta of the mirage (bars 21–28) moves to its own
track, «Celesta B», so it can float in the hall while the music box of the intro and the codetta stays
dry (§6, notes on the samples). Renders it with VSCO 2 CE, VCSL and Sonatina in an orchestral seating
with one short shared hall, masters to -17 LUFS / -1 dBTP as a seamless loop and writes
build/acto1-vexis.mp3 and its report (build/acto1-vexis.report.json).

Prints the report, the brief checks (including how hard the master limiter works on the hits of bars 4
and 60 and the bands of bar 53), and a comparison with the previous build and with the old act I boss
track (src/audio/jefe1.mp3) and the sampled menu theme (src/audio/menu.mp3).

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/acto1-vexis/mix.py
"""
from __future__ import annotations

import json
import os
import subprocess
import sys

import mido
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(HERE, '..'))

from estudio import mix, render  # noqa: E402
from estudio.render import Part  # noqa: E402

NAME = 'acto1-vexis'
BUILD = os.path.join(HERE, 'build')
MIDI = os.path.join(BUILD, f'{NAME}.mid')
MIX_MIDI = os.path.join(BUILD, f'{NAME}.mix.mid')
OUT = os.path.join(BUILD, f'{NAME}.mp3')
REPORT = os.path.join(BUILD, f'{NAME}.report.json')
OLD_TRACKS = {'src/audio/jefe1.mp3': os.path.join(ROOT, 'src', 'audio', 'jefe1.mp3'),
              'src/audio/menu.mp3': os.path.join(ROOT, 'src', 'audio', 'menu.mp3')}
BPM, BEATS_PER_BAR, BARS = 180, 3, 80
BAR_SECONDS = BEATS_PER_BAR * 60 / BPM          # one bar = 1 s
LOOP_SAMPLES = 3528000                          # 80 bars × 1 s × 44 100
MIRAGE = (21, 28)                               # bars of «Celesta B»


def vsco(name: str) -> str:
    return f'VSCO-2-CE/{name}.sfz'


SSO = 'sso/Sonatina Symphonic Orchestra/'
STRUCK = 'VCSL/Idiophones/Struck Idiophones/'


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


# bar 60: the players damp their drums and strings after the hit, so beats 2–3 are a held breath
# (only the hall rings); back to unity just before the downbeat of bar 61
CHOKE_60 = [(60.40, 0.0), (60.55, -12.0), (60.92, -12.0), (61.0, 0.0)]


# ── mix copy of the MIDI: the mirage's celesta on its own track (its own hall send) ──
def split_mirage(src: str = MIDI, dst: str = MIX_MIDI, track: str = 'Celesta', new: str = 'Celesta B',
                 bars: tuple[int, int] = MIRAGE) -> None:
    """Moves the notes of `track` that start inside `bars` (with a little slack for the humanized
    attacks) to a new track `new`; the controller curves are copied to both, so nothing else changes."""
    mid = mido.MidiFile(src)
    tpb = mid.ticks_per_beat
    first, last = (bars[0] - 1.1) * BEATS_PER_BAR * tpb, (bars[1] - 0.1) * BEATS_PER_BAR * tpb
    out = mido.MidiFile(type=1, ticks_per_beat=tpb)
    for tr in mid.tracks:
        name = next((m.name for m in tr if m.type == 'track_name'), None)
        if name != track:
            out.tracks.append(tr)
            continue
        keep, moved, held, tick = [], [], {}, 0
        for msg in tr:
            tick += msg.time
            if msg.type == 'note_on' and msg.velocity > 0:
                go = first <= tick < last
                held[msg.note] = go
                (moved if go else keep).append((tick, msg))
            elif msg.type in ('note_off', 'note_on'):
                (moved if held.pop(msg.note, False) else keep).append((tick, msg))
            elif msg.is_meta:
                keep.append((tick, msg))
                moved.append((tick, msg.copy(name=new) if msg.type == 'track_name' else msg))
            else:  # controllers: both tracks follow the same curves
                keep.append((tick, msg))
                moved.append((tick, msg))
        for events in (keep, moved):
            t, part = 0, mido.MidiTrack()
            for at, msg in events:
                part.append(msg.copy(time=at - t))
                t = at
            out.tracks.append(part)
    out.save(dst)


# ── seating: pan (-1 left … 1 right), level, depth (hall send) and stereo width ──
# Levels come from rendering every part solo (pico/LUFS in the report): the three libraries differ by
# up to 25 dB at the same velocity, so gain_db first evens them out and then sets the role (melody on
# top), keeping every part's peak at or under -6 dB before its bus (criterion 16).
# The Sonatina patches that do not react to CC1 (celesta, organ, col legno, trombones staccato,
# tam-tam) get their CC1 curve from the sampler as an overall volume (square law): those curves are
# small phrase shapes that follow the brief's dynamics (the bridge's crescendo on col legno, the
# organ's swells, the celesta fading as the mirage cracks), so they stay; their static offset
# (-1 to -2.5 dB) is folded into gain_db.
PARTS = [
    # woodwinds: centre, a little back
    Part('Flute Sus', vsco('FluteSusVib'), 'maderas', pan=-0.15, gain_db=-1.0, send=0.28, width=0.6,
         automation=ride((17, 20, 2.5))),  # the trick again, over the waltz
    Part('Flute Stac', vsco('FluteStac'), 'maderas', pan=-0.15, gain_db=6.0, send=0.28, width=0.6),
    Part('Clarinet Stac', vsco('ClarinetStac'), 'maderas', pan=-0.05, gain_db=1.0, send=0.26, width=0.6),
    Part('Bassoon Stac', vsco('BassoonStac'), 'fagot', pan=0.10, gain_db=-5.0, send=0.26, width=0.6,
         automation=ride((13, 16, -2.0))),  # under the solo violin
    # the menu's horn: same patch, place and hall as in scripts/musica/menu/mix.py (criterion 17)
    Part('Trompa 1', vsco('FHornSus'), 'trompa_menu', pan=-0.25, gain_db=2.5, send=0.40, width=0.7),
    # horn section: left and back
    Part('Horns Marcato', SSO + 'Brass - Performance/Horns Marcato.sfz', 'trompas', pan=-0.30, gain_db=-12.5,
         send=0.38, width=0.8,  # the hits of bars 4 and 60, the bridge's crescendo, the trick shouted in 65–68
         automation=ride((4, 4, 1.5), (60, 60, 1.5), (37, 40, 3.0), (41, 43, 5.0), (44, 44, 2.0), (65, 68, 4.5))),
    Part('Horns Sus', SSO + 'Brass - Performance/Horns Sustain.sfz', 'trompas', pan=-0.30, gain_db=-7.5,
         send=0.38, width=0.8, automation=ride((36, 37, -4.5))),  # the arrival of bar 36 opens, does not burst
    # trombones and tuba: centre-right
    Part('Trombones Marcato', SSO + 'Brass - Performance/Trombones Marcato.sfz', 'trombones', pan=0.30,
         gain_db=-8.5, send=0.32, width=0.8),
    Part('Trombones Sus', SSO + 'Brass - Performance/Trombones Sustain (looped).sfz', 'trombones', pan=0.30,
         gain_db=-6.5, send=0.32, width=0.8, automation=ride((3, 4, -4.0))),  # the threat under the music box
    Part('Trombones Stac', SSO + 'Brass - Performance/Trombones Staccato.sfz', 'trombones', pan=0.30,
         gain_db=-3.0, send=0.30, width=0.8),
    Part('Tuba Stac', vsco('TubaStac'), 'tuba', pan=0.40, gain_db=7.0, send=0.20, width=0.5),
    # timpani and percussion: at the back
    Part('Timpani', vsco('Timpani'), 'timbales', pan=-0.10, gain_db=2.0, send=0.42, width=0.6,
         automation=CHOKE_60),
    Part('Timpani Roll', vsco('TimpaniRolls'), 'timbales', pan=-0.10, gain_db=10.0, send=0.42, width=0.6),
    Part('Bass Drum', 'VCSL/Membranophones/Struck Membranophones/Bass Drum 2.sfz', 'bombo', pan=0.0,
         gain_db=-5.0, send=0.36, width=0.5, automation=CHOKE_60),
    Part('Cymbal', STRUCK + 'Suspended Cymbal 2.sfz', 'platos', pan=0.20, gain_db=-8.0, send=0.48, width=0.8),
    Part('Tam-tam', SSO + 'Percussion/Cymbals & Tamtam.sfz', 'tamtam', pan=0.25, gain_db=0.0, send=0.50,
         width=0.8),
    Part('Cuchillo', STRUCK + 'Woodblock.sfz', 'cuchillo', pan=0.15, gain_db=4.0, send=0.26, width=0.5,
         automation=[(37, -2.0), (45, 1.0)]),  # the knives grow with the bridge
    # the counted tricks: bright by nature, so soft and far
    Part('Flexaton', STRUCK + 'Flexatone.sfz', 'trucos', pan=-0.50, gain_db=4.0, send=0.45, width=0.6),
    Part('Carraca', STRUCK + 'Ratchet.sfz', 'trucos', pan=0.35, gain_db=4.0, send=0.40, width=0.6),
    Part('Mark Trees', STRUCK + 'Mark Trees.sfz', 'trucos', pan=-0.35, gain_db=2.0, send=0.45, width=0.8),
    # tuned percussion and keys: around the melody, not on it
    Part('Xylophone', STRUCK + 'Xylophone - Soft Mallets.sfz', 'laminas', pan=0.25, gain_db=6.0, send=0.30,
         width=0.6),
    Part('Vibraphone Bowed', STRUCK + 'Vibraphone - Bowed.sfz', 'laminas', pan=-0.20, gain_db=4.5, send=0.40,
         width=0.7),
    Part('Copas', 'VCSL/Idiophones/Friction Idiophones/Wine Glasses - Slow.sfz', 'laminas', pan=0.45,
         gain_db=8.0, send=0.48, width=0.8),
    Part('Celesta', SSO + 'Percussion/Celeste.sfz', 'celesta', pan=0.30, gain_db=7.0, send=0.08, width=0.6,
         automation=ride((77, 80, 1.5))),  # the codetta's music box as present as the intro's
    Part('Celesta B', SSO + 'Percussion/Celeste.sfz', 'celesta', pan=0.30, gain_db=7.0, send=0.32, width=0.7),
    Part('Organillo', SSO + 'Organ/Great - Flute 4ft.sfz', 'organillo', pan=-0.45, gain_db=-11.0, send=0.30,
         width=0.6),
    # strings: violins I left, violas and cellos right, basses centre-right
    Part('Violin Solo', SSO + 'Strings - Performance/Violin Solo 1 Sustain.sfz', 'solista', pan=-0.20,
         gain_db=1.0, send=0.18, width=0.5, automation=ride((13, 16, 1.5))),  # the devil's violin, in front
    Part('Violins Spic', vsco('ViolinEnsSpic'), 'violines', pan=-0.40, gain_db=-7.0, send=0.24),
    Part('Violins Col Legno', SSO + 'Strings - Performance/1st Violins Col Legno.sfz', 'violines', pan=-0.40,
         gain_db=4.0, send=0.24),
    Part('Violas Pizz', vsco('ViolaEnsPizz'), 'violas', pan=0.15, gain_db=-7.0, send=0.26,
         automation=ride((77, 80, 1.5))),
    Part('Violas Spic', vsco('ViolaEnsSpic'), 'violas', pan=0.15, gain_db=-3.0, send=0.24,
         automation=[(37, -3.0), (45, 0.0)]),  # the frenzy: mp → f across the bridge
    Part('Celli Col Legno', SSO + 'Strings - Performance/Celli Col Legno.sfz', 'chelos', pan=0.30, gain_db=5.0,
         send=0.24),
    Part('Basses Pizz', vsco('ContrabassPizz'), 'bajos', pan=0.35, gain_db=6.0, send=0.18, width=0.6,
         automation=CHOKE_60 + ride((77, 80, 1.5))),
    Part('Basses Trem', vsco('ContrabassTrem'), 'bajos', pan=0.35, gain_db=12.0, send=0.20, width=0.6),
    # choir: centre, wide, behind the orchestra
    Part('Coro', SSO + 'Chorus - Performance/Mixed Chorus.sfz', 'coro', pan=0.0, gain_db=-5.0, send=0.36,
         width=1.0),
]

# ── subtractive EQ per bus: high-pass all but the bass, mud out at 200–400 Hz where it piles up,
# a dip in 2–5 kHz for the game's SFX, soft highs; gentle glue compression only on the brass ──
BUSES = {
    'maderas': {'highpass': 180, 'peaks': [(350, -1.5, 1.0), (3200, -4.0, 0.9)], 'high_shelf': (8000, -3.0)},
    'fagot': {'highpass': 70, 'peaks': [(280, -2.0, 1.0), (3000, -2.0, 1.0)], 'high_shelf': (6000, -3.0)},
    'trompa_menu': {'highpass': 90, 'peaks': [(300, -2.5, 1.0), (2600, -2.0, 1.0)], 'high_shelf': (6000, -3.0)},
    'trompas': {'highpass': 90, 'peaks': [(300, -2.5, 1.0), (2800, -2.5, 1.0)], 'high_shelf': (6000, -3.0),
                'comp': (-22, 1.6)},
    'trombones': {'highpass': 60, 'peaks': [(250, -2.0, 1.0), (3000, -3.0, 1.0)], 'high_shelf': (5500, -3.0),
                  'comp': (-22, 1.6)},
    'tuba': {'highpass': 28, 'peaks': [(220, -1.5, 1.0)], 'high_shelf': (3000, -4.0)},
    'timbales': {'highpass': 40, 'peaks': [(320, -2.0, 1.0)], 'high_shelf': (5000, -3.0)},
    'bombo': {'highpass': 60, 'peaks': [(45, -6.0, 1.4), (350, -3.0, 1.0)],  # its 45 Hz boom is the sub
              'high_shelf': (3000, -4.0)},
    'platos': {'highpass': 300, 'peaks': [(3500, -5.0, 0.7)], 'high_shelf': (7000, -6.0)},
    'tamtam': {'highpass': 60, 'peaks': [(3000, -4.0, 0.8)], 'high_shelf': (6000, -5.0)},
    'cuchillo': {'highpass': 300, 'peaks': [(3500, -3.0, 1.0)], 'high_shelf': (6000, -4.0)},
    'trucos': {'highpass': 400, 'peaks': [(3500, -3.0, 0.8)], 'high_shelf': (7000, -5.0)},
    'laminas': {'highpass': 250, 'peaks': [(3000, -3.5, 0.9)], 'high_shelf': (7000, -3.0)},
    'celesta': {'highpass': 200, 'peaks': [(3200, -2.0, 1.0)], 'high_shelf': (8000, -3.0)},
    'organillo': {'highpass': 180, 'peaks': [(320, -2.0, 1.0), (3000, -2.0, 1.0)], 'high_shelf': (6000, -3.0)},
    'solista': {'highpass': 180, 'peaks': [(300, -1.5, 1.0), (3000, -5.0, 0.9), (4500, -2.0, 1.2)],
                'high_shelf': (6000, -3.5)},  # Sonatina's solo violin is bright: most of the mix's 2.5–6k
    'violines': {'highpass': 180, 'peaks': [(320, -2.0, 1.0), (2800, -4.5, 1.0)], 'high_shelf': (6000, -3.0)},
    'violas': {'highpass': 120, 'peaks': [(300, -2.5, 1.0), (2800, -2.0, 1.0)], 'high_shelf': (6500, -3.0)},
    'chelos': {'highpass': 55, 'peaks': [(260, -2.0, 1.0), (3000, -2.0, 1.0)], 'high_shelf': (6000, -3.0)},
    'bajos': {'highpass': 30, 'peaks': [(230, -1.5, 1.0)], 'high_shelf': (4000, -4.0)},
    'coro': {'highpass': 100, 'peaks': [(300, -2.5, 1.0), (3000, -3.5, 0.9)], 'high_shelf': (6500, -3.0),
             'comp': (-22, 1.5)},
}

# brief §3 sections, the spans of criterion 14, and the two music boxes that meet at the loop's seam
SECTIONS = {
    'intro 1-4': (1, 4), 'A 5-20': (5, 20), 'B 21-28': (21, 28), 'B 29-36': (29, 36), 'puente 37-44': (37, 44),
    'clímax 45-60': (45, 60), 'retorno 61-76': (61, 76), 'codetta 77-80': (77, 80),
    'c45-58': (45, 58), 'c37-40': (37, 40), 'c41-44': (41, 44), 'c53': (53, 53), 'c1-3': (1, 3), 'c77-79': (77, 79),
}

SPEC = render.MixSpec(
    midi=MIX_MIDI, out=OUT, bpm=BPM, beats_per_bar=BEATS_PER_BAR, bars=BARS, parts=PARTS, buses=BUSES,
    reverb={'seconds': 1.8, 'predelay': 0.020, 'damping': 0.6}, reverb_return_db=-5.5,  # short and dry-ish: fast boss
    reverb_eq={'highpass': 160, 'peaks': [(350, -2.0, 0.8), (3000, -2.0, 1.0)], 'high_shelf': (6500, -3.0)},
    master_bus={'highpass': 28, 'comp': (-18, 1.5)},
    target_lufs=-17.0, ceiling_dbtp=-1.0, tail_seconds=4.0, sections=SECTIONS,
)


# ── measures taken on the master itself (render() keeps it private) ─────────
_captured: dict[str, np.ndarray] = {}
_master = mix.master


def _capturing_master(x: np.ndarray, sr: int, target_lufs: float = -17.0, ceiling_dbtp: float = -1.0) -> np.ndarray:
    out = _master(x, sr, target_lufs, ceiling_dbtp)
    _captured['in'], _captured['out'] = x, out
    return out


def limiter_work_db(x: np.ndarray, out: np.ndarray, sr: int, first_bar: float, last_bar: float) -> float:
    """dB the master's limiter takes off at most in those bars: the drop of the out/in peak ratio
    (10 ms windows) below its usual value, which is the plain loudness gain."""
    win = int(0.01 * sr)
    n = len(x) // win * win
    peak_in = np.abs(x[:n]).max(axis=1).reshape(-1, win).max(axis=1)
    peak_out = np.abs(out[:n]).max(axis=1).reshape(-1, win).max(axis=1)
    live = peak_in > peak_in.max() * 1e-3
    ratio = 20 * np.log10(np.maximum(peak_out, 1e-12) / np.maximum(peak_in, 1e-12))
    gain = float(np.median(ratio[live]))
    a, b = int((first_bar - 1) * BAR_SECONDS * sr / win), int(last_bar * BAR_SECONDS * sr / win)
    span = ratio[a:b][live[a:b]]
    return round(max(0.0, gain - float(span.min())) if len(span) else 0.0, 2)


def bar_bands(out: np.ndarray, sr: int, first_bar: int, last_bar: int) -> dict[str, float]:
    seg = out[int((first_bar - 1) * BAR_SECONDS * sr): int(last_bar * BAR_SECONDS * sr)]
    return {k: round(v, 1) for k, v in mix.band_energy(seg, sr).items()}


def silence_after_hit(out: np.ndarray, sr: int) -> dict[str, float]:
    """Bar 60: the hit on beat 1 and the structural silence of beats 2–3 (only the hall's tail rings)."""
    def rms_db(a: float, b: float) -> float:
        seg = out[int(a * sr): int(b * sr)]
        return round(float(10 * np.log10(np.mean(seg.astype(np.float64) ** 2) + 1e-12)), 1)
    beat, start = BAR_SECONDS / 3, (60 - 1) * BAR_SECONDS
    hit, rest = rms_db(start, start + beat), rms_db(start + beat, start + 3 * beat)
    return {'golpe_db': hit, 't2_3_db': rest, 'caida_db': round(hit - rest, 1),
            'final_db': rms_db(start + 2.67 * beat, start + 3 * beat)}


# ── measures of an existing MP3 (previous build, old tracks) ────────────────
def decode(path: str) -> np.ndarray:
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', '44100', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def measure(path: str) -> dict:
    x, sr = decode(path), 44100
    return {'samples': len(x), 'lufs': round(mix.lufs(x, sr), 2), 'true_peak_db': round(mix.true_peak_db(x, sr), 2),
            'seam_jump': round(mix.seam_jump(x), 4), 'bands_db': {k: round(v, 1) for k, v in mix.band_energy(x, sr).items()}}


def checks(r: dict) -> list[tuple[str, bool, str]]:
    b, s, lim = r['bands_db'], r['sections_lufs'], r['limitador_db']
    climax_vs_b = s['c45-58'] - s['B 21-28']
    bridge = s['c41-44'] - s['c37-40']
    loudest = max(r['parts'].items(), key=lambda kv: kv[1]['pico_db'])
    return [
        ('12 sonoridad -17 ± 1 LUFS', abs(r['lufs'] + 17) <= 1, f"{r['lufs']} LUFS"),
        ('12 pico real ≤ -1 dBTP', r['true_peak_db'] <= -1.0, f"{r['true_peak_db']} dBTP"),
        ('12 pico real del MP3 ≤ -1 dBTP', r['mp3']['true_peak_db'] <= -1.0, f"{r['mp3']['true_peak_db']} dBTP"),
        ('13 loop_samples = 3 528 000', r['loop_samples'] == LOOP_SAMPLES, str(r['loop_samples'])),
        ('13 seam_jump < 0,02', r['seam_jump'] < 0.02, str(r['seam_jump'])),
        ('14 clímax c45-58 vs B c21-28 en +5…+9 LU', 5 <= climax_vs_b <= 9, f'{climax_vs_b:+.1f} LU'),
        ('14 puente c41-44 vs c37-40 ≥ +2 LU', bridge >= 2, f'{bridge:+.1f} LU'),
        ('15 presencia 2.5-6k ≤ -18 dB', b['presencia 2.5-6k'] <= -18, str(b['presencia 2.5-6k'])),
        ('15 aire 6-16k ≤ -28 dB', b['aire 6-16k'] <= -28, str(b['aire 6-16k'])),
        ('15 sub <60 ≤ -18 dB', b['sub <60'] <= -18, str(b['sub <60'])),
        ('16 ninguna parte > -6 dB de pico', loudest[1]['pico_db'] <= -6, f'{loudest[0]} {loudest[1]["pico_db"]} dB'),
        ('16 limitador ≤ 3 dB en el golpe del c. 4', lim['c4'] <= 3, f"{lim['c4']} dB"),
        ('16 limitador ≤ 3 dB en el golpe del c. 60', lim['c60'] <= 3, f"{lim['c60']} dB"),
        ('17 presencia 2.5-6k del c. 53 ≤ -18 dB', r['bands_c53']['presencia 2.5-6k'] <= -18,
         str(r['bands_c53']['presencia 2.5-6k'])),
    ]


def main() -> int:
    previous = json.load(open(REPORT)) if os.path.exists(REPORT) else None
    split_mirage()
    mix.master = _capturing_master
    try:
        report = render.render(SPEC)
    finally:
        mix.master = _master
    sr = SPEC.sr
    x, out = _captured['in'], _captured['out']
    report['limitador_db'] = {'c4': limiter_work_db(x, out, sr, 4, 4), 'c60': limiter_work_db(x, out, sr, 60, 60),
                              'bucle': limiter_work_db(x, out, sr, 1, BARS)}
    report['bands_c53'] = bar_bands(out, sr, 53, 53)
    report['silencio_c60'] = silence_after_hit(out, sr)
    report['mp3'] = measure(OUT)
    with open(REPORT, 'w') as f:
        json.dump(report, f, indent=1, ensure_ascii=False)

    print(f"{report['out']}\n  {report['seconds']} s · loop_samples {report['loop_samples']}")
    print(f"  {report['lufs']} LUFS · {report['true_peak_db']} dBTP · seam_jump {report['seam_jump']} · "
          f"sala {report['wet_dry_lu']} LU respecto a la señal directa")
    m = report['mp3']
    print(f"  MP3 decodificado: {m['samples']} muestras · {m['lufs']} LUFS · {m['true_peak_db']} dBTP · seam {m['seam_jump']}")
    lim = report['limitador_db']
    print(f"  limitador del máster: c. 4 {lim['c4']} dB · c. 60 {lim['c60']} dB · máximo del bucle {lim['bucle']} dB")
    sil = report['silencio_c60']
    print(f"  c. 60: golpe {sil['golpe_db']} dB RMS · tiempos 2–3 {sil['t2_3_db']} dB RMS (cae {sil['caida_db']} dB; "
          f"último tercio del t. 3: {sil['final_db']} dB)")
    print('\nPartes (tras gain_db, antes de bus):          pico dB   LUFS' + ('   (antes pico/LUFS)' if previous else ''))
    for name, p in report['parts'].items():
        line = f'  {name:22s} {p["notas"]:4d} notas   {p["pico_db"]:6.1f}  {p["lufs"]:6.1f}'
        before = previous['parts'].get(name) if previous else None
        if before:
            line += f'   ({before["pico_db"]:6.1f} {before["lufs"]:6.1f})'
        print(line)
    print('\nSecciones (LUFS sobre el máster):')
    for name, v in report['sections_lufs'].items():
        before = previous['sections_lufs'].get(name) if previous and 'sections_lufs' in previous else None
        print(f'  {name:16s} {v:6.1f}' + (f'   (antes {before:6.1f})' if before is not None else ''))
    olds = {label: measure(p) for label, p in OLD_TRACKS.items() if os.path.exists(p)}
    print('\nBandas dB (rel. al total)   nueva     c. 53' + ('  anterior' if previous else '')
          + ''.join(f'  {label[10:]:>10s}' for label in olds))
    for k, v in report['bands_db'].items():
        line = f'  {k:24s} {v:7.1f}   {report["bands_c53"][k]:7.1f}'
        if previous:
            line += f'   {previous["bands_db"][k]:7.1f}'
        for o in olds.values():
            line += f'     {o["bands_db"][k]:7.1f}'
        print(line)
    if previous:
        print(f"\nAnterior: {previous['lufs']} LUFS · {previous['true_peak_db']} dBTP · seam {previous['seam_jump']}"
              + (f" · limitador c4 {previous['limitador_db']['c4']} / c60 {previous['limitador_db']['c60']} dB"
                 if 'limitador_db' in previous else ''))
    for label, o in olds.items():
        print(f"Antigua {label}: {o['samples']} muestras · {o['lufs']} LUFS · {o['true_peak_db']} dBTP · seam {o['seam_jump']}")
    print('\nCriterios del brief:')
    results = checks(report)
    for label, ok, value in results:
        print(f"  [{'ok' if ok else 'FALLA'}] {label}: {value}")
    return 0 if all(ok for _, ok, _ in results) else 1


if __name__ == '__main__':
    sys.exit(main())
