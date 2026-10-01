"""Act III combat sketches: frantic versions of the two chosen songs, on the same tempo and bar grid
as their exploration version so the game can switch between them from the same point.

- Laberinto — «Fractura» in the «Ojo del vacío» arrangement: drums and guitars flat out.
- Guarida del Dragón — «Tesoro maldito» in the «Ruinas de oro» arrangement: driving percussion,
  spiccato strings, low brass and metal.

Each act gets two combat versions plus a demo that switches from the calm version to the first one.
Run: scripts/musica/estudio/.venv/bin/python scripts/musica/leitmotivs/acto3_combate.py"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, HERE)

from estudio import config, mix, render  # noqa: E402
from demos import n  # noqa: E402
from arreglos import Score, phrase_cc  # noqa: E402
from acto3_bocetos import (BUS, CRASH, KICK, LIB, RIDE, SNARE, chug, m,  # noqa: E402
                           ojo_fractura, ruinas_tesoro)

BUILD = os.path.join(HERE, 'build')
VCSL_PERC = 'VCSL/Idiophones/Struck Idiophones/'
LIB = {**LIB,
       'anvil': VCSL_PERC + 'Anvil.sfz', 'shaker': VCSL_PERC + 'Shaker, Small.sfz',
       'clash': VCSL_PERC + 'Clash Cymbals 1.sfz', 'ratchet': VCSL_PERC + 'Ratchet.sfz',
       'snare_rope': 'VCSL/Membranophones/Struck Membranophones/Snare Drum, Rope Tension.sfz'}
CRASH2, TOMS = 57, [50, 48, 47, 45, 43, 41]

FRACTURA = m('D5 Eb5 A4 G#4 D5 F5 E5 Bb4')
TESORO = [('A4', 2), ('G4', 1), ('F4', 2), ('E4', 1), ('D4', 1), ('E4', 1), ('F4', 1), ('E4', 3),
          ('C5', 2), ('B4', 1), ('A4', 1), ('G#4', 1), ('F4', 1), ('E4', 1.5), ('F4', .5), ('D4', 1), ('A3', 3)]

METAL_PARTS = [('Guitar', 'guitar', 'guitar', -0.3, -5, 0.10), ('Guitar 2', 'guitar', 'guitar', 0.3, -6, 0.10),
               ('Lead', 'guitar', 'guitar', 0.15, -8, 0.25), ('Bass', 'bass_el', 'bass_el', 0.0, -2, 0.06),
               ('Drums', 'drums', 'kit', 0.0, -1, 0.12), ('Choir', 'choir_large', 'choir', -0.15, 3, 0.40),
               ('Choir Pad', 'choir_mixed', 'choir', 0.0, -2, 0.50), ('Choir Low', 'choir_large', 'choir', 0.1, -1, 0.45),
               ('Celeste', 'celeste', 'bells', 0.3, 0, 0.50), ('Glasses', 'glasses', 'bells', -0.3, 0, 0.55),
               ('Organ', 'organ_8', 'organ', 0.2, -9, 0.40)]


def fractura_choir(s, vel=100):
    """The motif in the choir across all eight bars, the diminished pad under it."""
    for bar in range(8):
        at = bar * 4
        for k in range(2):
            p = FRACTURA[(bar * 2 + k) % 8]
            s.note('Choir', at + k * 2, 2.05, p - 12, vel)
        for x in m('D3 F3 Ab3'):
            s.note('Choir Pad', at, 4.05, x, 72)


def power(s, track, at, dur, root, vel):
    """A power chord on its own guitar track (for the double-tracked rhythm part)."""
    for k in (0, 7, 12):
        s.note(track, at, dur, root + k, vel - (6 if k else 0))


def fractura_asalto():
    """«Asalto»: double time from the first beat. 16th tremolo chugs grouped 3+3+3+3+2+2 against the
    bar, double kick under the whole loop, blast beats in bars 3 and 7, a dead stop on the last half of
    bars 4 and 8; the lead guitar takes the motif in the second half, the choir sings it throughout."""
    s = Score(70, 4)
    D2, Eb2, Ab2 = n('D2'), n('Eb2'), n('G#2')
    accents = {0, 3, 6, 9, 12, 14}
    for bar in range(8):
        at = bar * 4
        stop = bar in (3, 7)
        for k in range(16):
            t = at + k / 4
            if stop and k >= 8:
                break
            root = D2
            if bar % 2 == 1 and k >= 12:
                root = Eb2 if k < 14 else Ab2
            acc = k in accents
            chug(s, t, .22, root, 116 if acc else 90, power=acc)
            power(s, 'Guitar 2', t, .22, root, 108 if acc else 84)
            blast = bar in (2, 6)
            s.note('Drums', t, .2, KICK, 112 if acc else 98)
            if blast:
                s.note('Drums', t, .2, SNARE, 104 + 8 * acc)
            elif k % 4 == 2:
                s.note('Drums', t, .3, SNARE, 118)
            if k % 2 == 0:
                s.note('Drums', t, .2, CRASH2 if k % 4 == 0 else RIDE, 92 if k % 4 == 0 else 76)
        if stop:
            s.note('Drums', at + 2, .6, CRASH, 116)  # the band hits once and leaves the choir alone
            chug(s, at + 2, .6, D2, 120)
        if bar % 4 == 0:
            s.note('Drums', at, .8, CRASH, 118)
        if bar >= 4:
            for k in range(2):
                p = FRACTURA[(bar * 2 + k) % 8]
                s.note('Lead', at + k * 2, 2.0, p - 12, 100)
            for x in m('D3 Eb3'):
                s.note('Organ', at, 4.05, x, 84)
        else:
            for k in range(2):
                s.note('Celeste', at + k * 2, 2, FRACTURA[(bar * 2 + k) % 8] + 12, 56)
    fractura_choir(s, 102)
    s.curve('Choir', [(0, 96), (32, 112)])
    s.curve('Choir Pad', [(0, 70), (32, 84)])
    return s, METAL_PARTS, 1.8, 8, 4


def fractura_espiral():
    """«Espiral»: progressive — a 7/16 cell (root, root, rest, ♭2, root, rest, tritone) slides across
    four bars of 4/4 over a tritone choir drone; bars 5–6 are the «Ojo» breakdown with double kick
    under it, bar 7 blasts, bar 8 hits three times and falls down the toms."""
    s = Score(70, 4)
    D2 = n('D2')
    cell = [0, 0, None, 1, 0, None, 6]
    for k in range(4 * 16):
        step = cell[k % 7]
        t = k / 4
        if step is None:
            continue
        acc = k % 7 == 0
        chug(s, t, .22, D2 + step, 114 if acc else 92, power=step == 0)
        power(s, 'Guitar 2', t, .22, D2 + step, 104 if acc else 86)
        s.note('Drums', t, .2, KICK, 108 if acc else 94)
    for bar in range(4):
        at = bar * 4
        for b in (1, 3):
            s.note('Drums', at + b, .3, SNARE, 116)
        for e in range(8):
            s.note('Drums', at + e / 2, .2, RIDE, 80)
        s.note('Drums', at, .6, CRASH2, 104)
        for k in range(2):
            p = FRACTURA[(bar * 2 + k) % 8]
            if 74 <= p <= 87:
                s.note('Glasses', at + k * 2, 2.05, p, 62)
    for x in (n('D3'), n('G#3')):
        s.note('Choir Low', 0, 16.05, x, 84)
    for bar in (4, 5):  # the breakdown, now with double kick
        at = bar * 4
        hits = [0, .75, 1.5, 2.5, 3.25] if bar == 4 else [0, .75, 1.5]
        for h in hits:
            chug(s, at + h, .35, D2, 118)
            power(s, 'Guitar 2', at + h, .35, D2, 112)
        for k in range(16):
            s.note('Drums', at + k / 4, .2, KICK, 100)
        s.note('Drums', at + 2, .4, SNARE, 120)
        s.note('Drums', at, .8, CRASH, 116)
        for x in m('D3 Eb3'):
            s.note('Organ', at, 4.05, x, 86)
    at = 24
    for k in range(16):  # bar 7: blast
        t = at + k / 4
        chug(s, t, .22, n('Eb2') if k >= 8 else D2, 112)
        power(s, 'Guitar 2', t, .22, n('Eb2') if k >= 8 else D2, 104)
        s.note('Drums', t, .2, KICK, 108)
        s.note('Drums', t, .2, SNARE, 104)
        if k % 2 == 0:
            s.note('Drums', t, .2, CRASH2, 88)
    at = 28
    for h in (0, .75, 1.5):  # bar 8: three hits, then the toms fall
        chug(s, at + h, .35, D2, 122)
        power(s, 'Guitar 2', at + h, .35, D2, 116)
        s.note('Drums', at + h, .3, KICK, 118)
        s.note('Drums', at + h, .4, CRASH, 110)
    for i, tom in enumerate(TOMS):
        s.note('Drums', at + 2.5 + i / 4, .25, tom, 104 + 2 * i)
    for bar in range(4, 8):
        for k in range(2):
            s.note('Lead', bar * 4 + k * 2, 2.0, FRACTURA[(bar * 2 + k) % 8] - 12, 96)
    fractura_choir(s, 98)
    s.curve('Choir', [(0, 92), (32, 110)])
    s.curve('Choir Low', [(0, 76), (16, 90)])
    return s, METAL_PARTS, 1.8, 8, 4


DRAGON_PARTS = [('Cello', 'cello_solo', 'lead', 0.15, 0, 0.28), ('Horns', 'horns', 'brass', -0.25, -2, 0.35),
                ('Choir', 'choir_mixed', 'choir', 0.0, 0, 0.40), ('Harp', 'harp', 'harp', -0.4, 0, 0.35),
                ('Spiccato', 'cellos_spic', 'rhythm', 0.3, 2, 0.22), ('Violin Spiccato', 'violins_spic', 'rhythm', -0.3, -1, 0.22),
                ('Basses', 'basses_spic', 'rhythm', 0.35, 0, 0.20), ('Low Brass', 'trombones_marcato', 'brass', 0.25, -6, 0.28),
                ('Tuba', 'tuba_marcato', 'brass', 0.3, -6, 0.26), ('War Drums', 'bass_drum', 'drums', 0.0, -6, 0.32),
                ('Toms', 'tom', 'drums', 0.15, -5, 0.30), ('Frame Drum', 'frame_drum', 'drums', -0.2, -6, 0.30),
                ('Snare', 'snare_rope', 'drums', -0.1, -3, 0.25), ('Timpani', 'timpani', 'perc', -0.1, 2, 0.35),
                ('Anvil', 'anvil', 'bells', 0.35, -5, 0.30), ('Shaker', 'shaker', 'bells', -0.35, -2, 0.20),
                ('Clash', 'clash', 'bells', 0.1, -7, 0.50), ('Cymbal', 'cymbal', 'bells', 0.2, -10, 0.55),
                ('Ratchet', 'ratchet', 'bells', -0.25, -6, 0.30)]


def tesoro_melody(s, horns=True, choir=False):
    """The motif on the solo cello, doubled by the horns or the choir."""
    at = 0.0
    for name, d in TESORO:
        s.note('Cello', at, d + .04, n(name), 92)
        if horns:
            s.note('Horns', at, d + .04, n(name) - 12, 90)
        if choir:
            s.note('Choir', at, d + .05, n(name), 92)
        at += d
    phrase_cc(s, 'Cello', 0, 24, 88, 110)
    if horns:
        phrase_cc(s, 'Horns', 0, 24, 84, 108)


def tesoro_saqueo():
    """«Saqueo»: the cello and horns sing over 16th spiccato and a running harp; war drums on the
    downbeat with a 16th pickup, toms accented every dotted eighth against the 3/4, a frame drum on
    eighths, an anvil on beat 2 and low brass striking the root (and its ♭2 every other bar)."""
    s = Score(84, 3)
    tesoro_melody(s, horns=True)
    ost = m('A2 E3 A3 Bb3 E3 A3')
    harp = m('A1 E2 A2 Bb2 E2 A2')
    for k in range(24 * 4):
        t = k / 4
        bar, pos = divmod(k, 12)
        s.note('Spiccato', t, .22, ost[k % 6], 96 if k % 6 == 0 else 80)
        s.note('Harp', t, .25, harp[k % 6], 62 + 10 * (k % 6 == 0))
        s.note('Toms', t, .2, 62 if pos % 3 == 0 else 60, 104 if pos % 3 == 0 else 70)
        s.note('Shaker', t, .2, 61, 70 + 14 * (k % 2 == 0))
    for bar in range(8):
        b = bar * 3
        root = n('A1') if bar % 2 == 0 else n('Bb1')
        s.note('Basses', b, .4, root, 110)
        s.note('Basses', b + 1.5, .4, root, 96)
        for t, vel in ((0, 116), (2.5, 92), (2.75, 100)):
            s.note('War Drums', b + t, .5, 62, vel)
        for e in range(6):
            s.note('Frame Drum', b + e / 2, .3, 61 if e % 2 == 0 else 63, 88 if e % 2 == 0 else 66)
        s.note('Anvil', b + 1, .3, 60, 96)
        s.note('Timpani', b, .6, n('A2') if bar % 2 == 0 else n('E2'), 108)
        s.note('Low Brass', b, .4, root + 12, 112)
        s.note('Tuba', b, .4, root, 108)
        s.note('Low Brass', b + 1.5, .3, root + 12, 96)
        if bar % 4 == 3:
            s.note('Cymbal', b, 3, 64, 70)
        if bar % 4 == 0:
            s.note('Clash', b, 2, 60, 100)
    s.curve('Spiccato', [(0, 92), (24, 108)])
    return s, DRAGON_PARTS, 2.2, 1, 24


def tesoro_derrumbe():
    """«Derrumbe»: hemiola everywhere — the strings and low brass in 6/8 (two groups of three eighths)
    while the war drums keep 3/4; violin spiccato daggers, the choir doubling the cello, timpani rolls
    into each phrase, a rope snare roll swelling in bars 4 and 8 and a ratchet as the ceiling gives way."""
    s = Score(84, 3)
    tesoro_melody(s, horns=False, choir=True)
    s.curve('Choir', [(0, 88), (24, 108)])
    cells = m('A2 Bb2 A2 E3 F3 E3')
    daggers = m('A4 Bb4 A4 E4 F4 E4')
    for k in range(24 * 2):  # eighths
        t = k / 2
        acc = k % 3 == 0  # 6/8 accents against the 3/4 drums
        s.note('Spiccato', t, .4, cells[k % 6], 104 if acc else 78)
        s.note('Violin Spiccato', t, .2, daggers[k % 6], 86 if acc else 66)
        s.note('Violin Spiccato', t + .25, .2, daggers[k % 6], 64)
        if acc:
            s.note('Low Brass', t, .4, cells[k % 6], 108)
            s.note('Basses', t, .5, cells[k % 6] - 12, 108)
    for bar in range(8):
        b = bar * 3
        for beat in range(3):
            s.note('War Drums', b + beat, .5, 62, 116 if beat == 0 else 94)
        for k in range(12):
            if k % 4 != 3:
                s.note('Toms', b + k / 4, .2, 60 + (k % 3), 70 + 30 * (k % 6 == 0))
        s.note('Anvil', b + 1.5, .3, 61, 92)
        s.note('Shaker', b, .2, 61, 60)
        if bar in (3, 7):  # swelling snare roll and timpani roll into the next phrase
            for k in range(24):
                s.note('Snare', b + k / 8, .15, 62, 56 + 2 * k)
            s.note('Timpani', b, 3, n('E2'), 90)
            s.note('Ratchet', b + 2, 1, 60, 96)
        else:
            s.note('Timpani', b, .6, n('A2'), 104)
            s.note('Timpani', b + 1.5, .4, n('E2'), 92)
        if bar in (0, 4):
            s.note('Clash', b, 2, 60, 104)
            s.note('Tuba', b, 2.5, n('A1'), 108)
    return s, DRAGON_PARTS, 2.2, 1, 24


VERSIONS = [
    ('laberinto', 'mapa', ojo_fractura), ('laberinto', 'combate-asalto', fractura_asalto),
    ('laberinto', 'combate-espiral', fractura_espiral),
    ('dragon', 'mapa', ruinas_tesoro), ('dragon', 'combate-saqueo', tesoro_saqueo),
    ('dragon', 'combate-derrumbe', tesoro_derrumbe),
]


def decode(path, tmp):
    wav = os.path.join(tmp, os.path.basename(path) + '.wav')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', path, wav], check=True)
    y, _ = sf.read(wav, dtype='float32')
    return y


def main() -> None:
    os.makedirs(BUILD, exist_ok=True)
    rendered = {}
    for act, version, build in VERSIONS:
        score, parts, reverb_s, bars, beats_per_bar = build()
        name = f'acto3-{act}-{version}'
        mid_path = os.path.join(BUILD, name + '.mid')
        score.save(mid_path)
        used = set(score.tracks)
        spec = render.MixSpec(
            midi=mid_path, out=os.path.join(BUILD, name + '.mp3'), bpm=score.bpm, beats_per_bar=beats_per_bar,
            bars=bars, parts=[render.Part(t, LIB[lib], bus=bus, pan=pan, gain_db=g, send=send)
                              for t, lib, bus, pan, g, send in parts if t in used],
            buses=BUS, reverb={'seconds': reverb_s, 'predelay': 0.025, 'damping': 0.55}, reverb_return_db=-4,
            target_lufs=-16.5 if version == 'mapa' else -15.0, tail_seconds=3.5)
        r = render.render(spec)
        peaks = {k: round(float(v['pico_db']), 1) for k, v in r['parts'].items()}
        print(f'{name:36s} {r["seconds"]:5.1f} s  {r["lufs"]:6.1f} LUFS  presencia {r["bands_db"]["presencia 2.5-6k"]:6.1f}  picos {peaks}')
        rendered[(act, version)] = (r['out'], score.bpm * 1.0)
    sr = config.SR
    with tempfile.TemporaryDirectory() as tmp:
        for act, switch_beat in (('laberinto', 8), ('dragon', 9)):
            calm_path, bpm = rendered[(act, 'mapa')]
            combats = [v for a, v, _ in VERSIONS if a == act and v != 'mapa']
            calm = decode(calm_path, tmp)
            fight = decode(rendered[(act, combats[0])][0], tmp)
            # the in-game switch: from the calm version into combat at the same point of the loop
            cut, fade = int(switch_beat * 60 / bpm * sr), int(1.6 * sr)
            length = min(len(calm), len(fight))
            ramp = np.linspace(0, 1, fade)[:, None]
            demo = np.concatenate([calm[:cut], calm[cut:cut + fade] * (1 - ramp) + fight[cut:cut + fade] * ramp,
                                   fight[cut + fade:length]])
            pieces, stamps, t = [], [], 0.0
            for label, y in [('mapa', calm), *[(v, decode(rendered[(act, v)][0], tmp)) for v in combats],
                             ('cambio mapa→combate', demo)]:
                y = y.copy()
                y[-sr:] *= np.linspace(1, 0, sr)[:, None]
                stamps.append((label, t))
                pieces += [y, np.zeros((int(1.5 * sr), 2), dtype=np.float32)]
                t += len(y) / sr + 1.5
            out = os.path.join(BUILD, f'acto3-{act}-combate-bocetos.mp3')
            mix.export_mp3(np.concatenate(pieces), sr, out)
            print(out, ' · '.join(f'{lb} {int(st // 60)}:{int(st % 60):02d}' for lb, st in stamps))


if __name__ == '__main__':
    main()
