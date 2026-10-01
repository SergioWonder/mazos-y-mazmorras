"""Act III boss sketches, two options per boss.

- El Contemplador (El Laberinto): chaos and frenzy, modern metalcore in the vein of Architects and
  Bad Omens — drop riffs, breakdowns with sub drops, synths (supersaw, pluck arpeggios, glitches,
  risers) and a vocal-fry growl, on the Laberinto's leitmotif «Fractura».
- Ignifax (La Guarida del Dragón): the climax of the act's draconic music on «Tesoro maldito» —
  powerful choirs, hammer-blow pauses, more epic and more frantic.

The synths come from estudio/synths.py (built into <external disk>/audio-samples/dracs-synths).
Run: scripts/musica/estudio/.venv/bin/python scripts/musica/leitmotivs/acto3_jefes.py [prefix…]"""
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
from acto3_bocetos import BUS, CRASH, KICK, RIDE, SNARE, chug, m  # noqa: E402
from acto3_combate import CRASH2, LIB, TESORO, TOMS, power  # noqa: E402

BUILD = os.path.join(HERE, 'build')
SYN = 'dracs-synths/'
LIB = {**LIB, 'saw_lead': SYN + 'supersaw-lead.sfz', 'saw_pad': SYN + 'supersaw-pad.sfz', 'pluck': SYN + 'pluck.sfz',
       'sub': SYN + 'sub-bass.sfz', 'drop': SYN + 'sub-drop.sfz', 'growl': SYN + 'growl.sfz', 'sfx': SYN + 'fx.sfz',
       'organ_full': LIB.get('organ_full', 'sso/Sonatina Symphonic Orchestra/Organ/Full Organ.sfz')}
BUS = {**BUS,
       'synth': {'highpass': 40, 'peaks': [(350, -2, 1)], 'high_shelf': (6500, -5), 'comp': (-18, 2.0)},
       'sub': {'highpass': 24, 'peaks': [(140, -2, 1)], 'high_shelf': (400, -12)},
       'voice': {'highpass': 60, 'peaks': [(300, -3, 1), (2800, 2, 1)], 'high_shelf': (6000, -4), 'comp': (-20, 2.5)},
       'sfx': {'highpass': 30, 'high_shelf': (7000, -4)}}
RISER, DOWNLIFTER, IMPACT, SWELL = 60, 61, 62, 63

# «Fractura» a minor third lower, in B: the boss sits under its labyrinth
FRACTURA_B = [p - 3 for p in m('D5 Eb5 A4 G#4 D5 F5 E5 Bb4')]
B1, C2, B0 = n('B1'), n('C2'), n('B0')

CONTEMPLADOR_PARTS = [
    ('Guitar', 'guitar', 'guitar', -0.35, -7, 0.08), ('Guitar 2', 'guitar', 'guitar', 0.35, -8, 0.08),
    ('Bass', 'bass_el', 'bass_el', 0.0, -3, 0.05), ('Drums', 'drums', 'kit', 0.0, -1, 0.10),
    ('Sub', 'sub', 'sub', 0.0, -2, 0.0), ('Drop', 'drop', 'sub', 0.0, -4, 0.05),
    ('Saw Lead', 'saw_lead', 'synth', 0.1, 0, 0.30), ('Saw Pad', 'saw_pad', 'synth', -0.1, -5, 0.45),
    ('Pluck', 'pluck', 'synth', 0.25, 5, 0.35), ('Glitch', 'saw_lead', 'synth', -0.25, -3, 0.15),
    ('Growl', 'growl', 'voice', 0.0, -2, 0.25), ('Choir', 'choir_mixed', 'choir', -0.1, 0, 0.45),
    ('Choir Low', 'choir_large', 'choir', 0.1, 2, 0.45), ('FX', 'sfx', 'sfx', 0.0, -2, 0.40),
]


def riff_hits(s, at, pattern, root, vel=116, dur=.22, kick=True):
    """Chugs on 16ths: pattern is a string of 16 chars, 'x' accent (power chord), 'o' single chug, '.' rest."""
    for k, c in enumerate(pattern):
        if c == '.':
            continue
        t = at + k / 4
        acc = c == 'x'
        chug(s, t, dur, root, vel if acc else vel - 22, power=acc)
        power(s, 'Guitar 2', t, dur, root, vel - 8 if acc else vel - 28)
        if kick:
            s.note('Drums', t, .2, KICK, 114 if acc else 98)


def stutter(s, track, at, beats, pitch, rate=8, vel=96, cc=(30, 120)):
    """Glitch: the same note retriggered `rate` times per beat while the filter opens."""
    steps = int(beats * rate)
    for k in range(steps):
        s.note(track, at + k / rate, 1 / rate * .6, pitch, vel)
    s.curve(track, [(at, cc[0]), (at + beats, cc[1])])


def contemplador_abismo():
    """«Mirada del abismo» (♩=140, 4/4, B): a pluck arpeggio and a reverse swell open the eye; a djent
    riff full of holes with growls on the accents; a melodic chorus (B–G–D–C) with the motif on the
    supersaw and the choir; a dead stop with only the creak of the voice; then the half-time breakdown,
    every hit dropping a sub, and a blast into the loop."""
    s = Score(140, 4)
    arp = [B1 + 24, B1 + 31, B1 + 25, B1 + 36, B1 + 27, B1 + 31, B1 + 25, B1 + 30]  # B F# C B D F# C F
    # intro (bars 1–2)
    for k in range(32):
        s.note('Pluck', k / 4, .3, arp[k % 8], 70 + 20 * (k % 4 == 0))
    s.curve('Pluck', [(0, 20), (8, 110)])
    for x in (B1 + 12, B1 + 19, B1 + 25):
        s.note('Saw Pad', 0, 8.05, x, 90)
    s.note('FX', 8 - 4.67, 4.67, SWELL, 110)
    s.note('Growl', 2, 6, n('B2'), 70)
    stutter(s, 'Glitch', 7, 1, B1 + 36, rate=8)
    # verse (bars 3–6): the riff, growls on the accents
    verse = ['x.oxo.x..xo.x.o.', 'x.ox..xo.x.xo.x.', 'x.oxo.x..xo.x.o.', 'x..x..x.x..xxoxo']
    for i, pat in enumerate(verse):
        at = 8 + i * 4
        if i % 2 == 1:  # the ♭2 answers in the last beat of every other bar
            riff_hits(s, at, pat[:12] + '....', B1)
            riff_hits(s, at + 3, pat[12:], C2)
        else:
            riff_hits(s, at, pat, B1)
        for b in (1, 3):
            s.note('Drums', at + b, .3, SNARE, 118)
        for b in range(4):
            s.note('Drums', at + b, .3, CRASH2 if b == 0 else RIDE, 96 if b == 0 else 78)
        s.note('Sub', at, 3.9, B0 + 12, 100)
        if i % 2 == 0:
            s.note('Drop', at, 3, B0 + 12, 110)
        for k, c in enumerate(pat):
            if c == 'x' and k in (0, 6, 12):
                s.note('Growl', at + k / 4, .45, n('B2'), 104)
        for k in range(16):
            s.note('Pluck', at + k / 4, .25, arp[k % 8], 56)
    # chorus (bars 7–10): open chords, the motif on the supersaw and in the choir
    chords = [(B1, 'B2 D3 F#3'), (n('G2'), 'G2 B2 D3'), (n('D2'), 'D3 F#3 A3'), (C2, 'C3 E3 G3')]
    for i, (root, pad) in enumerate(chords):
        at = 24 + i * 4
        for e in range(8):
            power(s, 'Guitar', at + e / 2, .5, root, 110 if e % 2 == 0 else 96)
            power(s, 'Guitar 2', at + e / 2, .5, root, 104 if e % 2 == 0 else 90)
            s.note('Bass', at + e / 2, .5, root - 12 if root - 12 >= 26 else root, 100)
        for k in range(16):
            s.note('Drums', at + k / 4, .2, KICK, 96 + 10 * (k % 4 == 0))
        for b in (1, 3):
            s.note('Drums', at + b, .3, SNARE, 120)
        for b in range(4):
            s.note('Drums', at + b, .4, CRASH if b == 0 else CRASH2, 104 if b == 0 else 88)
        for x in m(pad):
            s.note('Saw Pad', at, 4.05, x, 96)
            s.note('Choir', at, 4.05, x + 12, 86)
        s.note('Sub', at, 3.9, root - 12 if root - 12 >= 24 else root, 104)
        for k in range(2):
            p = FRACTURA_B[(i * 2 + k) % 8]
            s.note('Saw Lead', at + k * 2, 1.95, p - 12, 108)
            s.note('Choir Low', at + k * 2, 2.05, p - 12, 100)
    s.curve('Saw Lead', [(24, 60), (40, 110)])
    # stop (bar 11): one hit, then only the voice and a glitch
    at = 40
    riff_hits(s, at, 'x...............', B1, vel=124)
    s.note('Drums', at, .8, CRASH, 120)
    s.note('FX', at, 3, IMPACT, 120)
    s.note('Drop', at, 3.5, B0 + 12, 120)
    s.note('Growl', at + 1, 2.5, n('A#2'), 96)
    stutter(s, 'Glitch', at + 3, 1, B1 + 24, rate=12, cc=(20, 127))
    s.note('FX', 44 - 4.67, 4.67, SWELL, 120)
    # breakdown (bars 12–16): half time, every hit drops a sub
    breakdown = ['x..x..x.....x.x.', 'x..x..x.........', 'x..x..x.....x.x.', 'x.x.x...x.x.x.xx', 'x..x..x.....x.x.']
    for i, pat in enumerate(breakdown):
        at = 44 + i * 4
        riff_hits(s, at, pat, B1 if i != 3 else C2, vel=124, dur=.3)
        s.note('Drums', at + 2, .4, SNARE, 124)
        for b in range(4):
            s.note('Drums', at + b, .4, CRASH2, 98)
        s.note('Drop', at, 3.5, B0 + 12, 124)
        s.note('Growl', at, .8, n('B1') + 12, 112)
        s.note('Growl', at + 1.5, .6, n('B1') + 12, 104)
        for x in (B1 + 12, B1 + 13):
            s.note('Saw Pad', at, 4.05, x, 100)
        s.note('Choir Low', at, 4.05, FRACTURA_B[i % 8] - 12, 104)
    s.curve('Choir Low', [(44, 96), (64, 112)])
    # blast into the loop (bars 17–18), the supersaw stuttering open
    for k in range(32):
        t = 64 + k / 4
        root = B1 if k < 16 else (C2 if k < 24 else n('F2'))
        chug(s, t, .2, root, 112)
        power(s, 'Guitar 2', t, .2, root, 104)
        s.note('Drums', t, .2, KICK, 110)
        s.note('Drums', t, .2, SNARE, 100 + 2 * (k % 4 == 0))
        if k % 2 == 0:
            s.note('Drums', t, .2, CRASH2, 90)
    stutter(s, 'Glitch', 64, 6, B1 + 24, rate=4, cc=(20, 120))
    for i, tom in enumerate(TOMS):
        s.note('Drums', 70 + i / 3, .3, tom, 108 + 2 * i)
    s.note('FX', 72 - 4.67 * 2, 9.3, RISER, 110)  # the riser (4 s) lands on the loop's downbeat
    return s, CONTEMPLADOR_PARTS, 1.6, 18, 4


def contemplador_caos():
    """«Caos cromático» (♩=150, shifting metres): eight bars of 7/8 where a sidechained supersaw pumps
    against a 2+2+3 riff and the pluck runs in sevens; the growl spits the accents; then four bars of
    4/4 half-time with sub drops and the choir crying the motif; two bars of 5/4 build back with a
    glitch storm. Every bar line moves."""
    s = Score(150, 1)
    at = 0.0
    pump: list[tuple[float, float]] = []
    seven = [B1 + 24, B1 + 25, B1 + 31, B1 + 30, B1 + 27, B1 + 25, B1 + 36]
    for bar in range(8):  # 7/8: 2+2+3
        stop = bar == 7
        groups = [0, 1, 2] if not stop else [0]
        for g in groups:
            t = at + [0, 1, 2][g]
            root = B1 if bar % 4 != 3 or g < 2 else C2
            chug(s, t, .35, root, 118)
            power(s, 'Guitar 2', t, .35, root, 110)
            s.note('Drums', t, .3, KICK, 116)
            chug(s, t + .5, .2, root, 92, power=False)
            s.note('Drums', t + .5, .2, KICK, 96)
            pump += [(t, 0), (t + .001, -16), (t + .45, 0)]
            if g == 2:
                chug(s, t + 1, .2, root + 6, 100, power=False)  # the tritone flicks at the end of the long group
        if not stop:
            s.note('Drums', at + 1, .3, SNARE, 118)
            s.note('Drums', at + 2.5, .3, SNARE, 112)
            s.note('Growl', at, .4, n('B2'), 106)
        for k in range(7):
            s.note('Pluck', at + k / 2, .4, seven[k], 74 + 16 * (k == 0))
            s.note('Drums', at + k / 2, .2, CRASH2 if k == 0 else RIDE, 92 if k == 0 else 74)
        for x in (B1 + 12, B1 + 19, B1 + 25):
            s.note('Saw Pad', at, 3.55, x, 104)
        s.note('Saw Lead', at, 3.45, FRACTURA_B[bar] - 12, 104)
        s.note('Sub', at, 3.4, B0 + 12, 100)
        if stop:
            s.note('Drums', at, .8, CRASH, 120)
            s.note('FX', at, 3, IMPACT, 118)
            stutter(s, 'Glitch', at + 1.5, 2, B1 + 30, rate=6, cc=(30, 127))
        at += 3.5
    s.curve('Saw Lead', [(0, 60), (at, 112)])
    for bar in range(4):  # 4/4 half-time: the eye opens
        b = at + bar * 4
        riff_hits(s, b, ['x..x..x.....x.x.', 'x..x..x.........', 'x.x..x..x.x..x..', 'x..x..x...x.xxxx'][bar], B1, vel=124, dur=.3)
        s.note('Drums', b + 2, .4, SNARE, 124)
        for k in range(4):
            s.note('Drums', b + k, .4, CRASH2, 98)
        s.note('Drop', b, 3.5, B0 + 12, 124)
        s.note('Growl', b, 1.2, n('B1') + 12, 114)
        for k in range(2):
            p = FRACTURA_B[(bar * 2 + k) % 8]
            s.note('Choir', b + k * 2, 2.05, p - 12, 108)
        for x in (B1 + 12, B1 + 13):
            s.note('Saw Pad', b, 4.05, x, 104)
            s.note('Choir Low', b, 4.05, x, 96)
    at += 16
    for bar in range(2):  # 5/4: 3+2, the glitch storm builds back to the top
        b = at + bar * 5
        for k in range(20):
            t = b + k / 4
            root = B1 if k < 12 else C2
            chug(s, t, .2, root, 104 + 10 * (k % 4 == 0), power=k % 4 == 0)
            power(s, 'Guitar 2', t, .2, root, 96)
            s.note('Drums', t, .2, KICK, 104)
            if bar == 1:
                s.note('Drums', t, .2, SNARE, min(124, 90 + 2 * k))
        if bar == 0:
            s.note('Drums', b + 1, .3, SNARE, 116)
            s.note('Drums', b + 3, .3, SNARE, 116)
        s.note('Sub', b, 4.9, B0 + 12 + bar, 100)
        for x in (B1 + 12 + bar, B1 + 19 + bar):
            s.note('Saw Pad', b, 5.05, x, 104)
    stutter(s, 'Glitch', at, 10, B1 + 36, rate=4, cc=(10, 127))
    s.note('FX', at + 10 - 10, 10, RISER, 112)
    total = at + 10
    return s, CONTEMPLADOR_PARTS, 1.6, int(total), 1, {'Saw Pad': [(b + 1, d) for b, d in pump]}


IGNIFAX_PARTS = [
    ('Choir', 'choir_mixed', 'choir', -0.1, 4, 0.40), ('Choir Low', 'choir_large', 'choir', 0.1, 4, 0.42),
    ('Shout', 'choir_large', 'choir', 0.0, 6, 0.40), ('Horns', 'horns', 'brass', -0.3, 0, 0.35),
    ('Low Brass', 'trombones_marcato', 'brass', 0.25, -3, 0.28), ('Tuba', 'tuba_marcato', 'brass', 0.3, 0, 0.26),
    ('Strings', 'violins_marcato', 'strings', -0.25, -4, 0.30), ('Spiccato', 'cellos_spic', 'rhythm', 0.3, 5, 0.22),
    ('Violin Spiccato', 'violins_spic', 'rhythm', -0.3, 2, 0.22), ('Basses', 'basses_spic', 'rhythm', 0.35, 4, 0.20),
    ('Organ', 'organ_full', 'organ', 0.0, -14, 0.45), ('War Drums', 'bass_drum', 'drums', 0.0, 0, 0.32),
    ('Toms', 'tom', 'drums', 0.15, 1, 0.30), ('Snare', 'snare_rope', 'drums', -0.1, 5, 0.25),
    ('Timpani', 'timpani', 'perc', -0.1, 8, 0.35), ('Timp Roll', 'timp_roll', 'perc', -0.1, 8, 0.45),
    ('Anvil', 'anvil', 'bells', 0.35, 2, 0.30), ('Clash', 'clash', 'bells', 0.1, 2, 0.50),
    ('Cymbal', 'cymbal', 'bells', 0.2, 2, 0.55), ('Gong', 'gong', 'perc', 0.25, 6, 0.55),
]


def tesoro_notes(start=0.0, shift=0):
    out, at = [], start
    for name, d in TESORO:
        out.append((at, d, n(name) + shift))
        at += d
    return out


def ignifax_frenzy(s, start, bars, root, beats=3, intensity=1.0):
    """The draconic engine: spiccato ostinato with the ♭2, war drums with 16th pickups, toms against the
    metre, anvil, basses and low brass on the root."""
    ost = [root + 12, root + 19, root + 24, root + 25, root + 19, root + 24]
    for k in range(bars * beats * 4):
        t = start + k / 4
        s.note('Spiccato', t, .22, ost[k % 6], 100 if k % 6 == 0 else 84)
        if k % 2 == 0:
            s.note('Violin Spiccato', t, .2, ost[k % 6] + 12, 82 + 12 * (k % 6 == 0))
        s.note('Toms', t, .2, 62 if k % 3 == 0 else 60, int((104 if k % 3 == 0 else 72) * intensity))
    for bar in range(bars):
        b = start + bar * beats
        r = root if bar % 2 == 0 else root + 1
        for t, vel in ((0, 122), (beats - .5, 96), (beats - .25, 104)):
            s.note('War Drums', b + t, .5, 62, vel)
        s.note('Anvil', b + 1, .3, 60, 100)
        s.note('Timpani', b, .6, r + 24 if r + 24 <= 55 else r + 12, 112)
        s.note('Basses', b, .4, r, 112)
        s.note('Low Brass', b, .4, r + 12, 116)
        s.note('Tuba', b, .4, r, 112)
        s.note('Snare', b + beats - 1, .2, 62, 90)
        s.note('Snare', b + beats - .5, .2, 62, 100)


def hammer(s, at, pitches, vel=124):
    """A tutti hammer blow: choir shout, brass, drums and cymbals together."""
    for p in pitches:
        s.note('Shout', at, .9, p, vel)
        s.note('Low Brass', at, .6, p - 12, vel)
        s.note('Horns', at, .7, p, vel)
    s.note('Tuba', at, .6, pitches[0] - 24, vel)
    s.note('War Drums', at, .6, 62, 127)
    s.note('Timpani', at, .6, n('A2'), 124)
    s.note('Clash', at, 1.5, 60, 118)


def ignifax_llamarada():
    """«Llamarada» (♩=168, 3/4, A minor): the war machine starts under shouted choir stabs and stops
    dead; the full choir sings «Tesoro maldito» over the draconic engine; two hammer blows and
    silence; the motif returns a semitone higher, in octaves, with gong and organ — the climax —
    and three blows in hemiola close the loop."""
    s = Score(168, 3)
    A1, A2 = n('A1'), n('A2')
    # intro (bars 1–4)
    ignifax_frenzy(s, 0, 3, A1, intensity=.8)
    for bar in range(3):
        for p in m('A3 E4'):
            s.note('Shout', bar * 3, .9, p, 112 + 4 * bar)
    s.curve('Toms', [(0, 60), (9, 110)])
    hammer(s, 9, m('A3 E4 A4'))
    s.note('Cymbal', 9.5, 2.5, 64, 90)
    # A (bars 5–12): the full choir sings the motif
    ignifax_frenzy(s, 12, 8, A1)
    for t, d, p in tesoro_notes(12):
        s.note('Choir', t, d + .05, p, 108)
        s.note('Choir Low', t, d + .05, p - 12, 104)
        s.note('Horns', t, d + .04, p - 12, 100)
    phrase_cc(s, 'Horns', 12, 24, 90, 116)
    s.note('Clash', 12, 2, 60, 110)
    s.note('Clash', 24, 2, 60, 104)
    # two hammer blows and silence (bars 13–14)
    hammer(s, 36, m('A3 E4 A4'))
    hammer(s, 39, m('Bb3 F4 Bb4'))
    s.note('Choir', 40.5, 1.5, n('E4'), 96)
    s.note('Timp Roll', 40, 2, n('E2') + 12, 90)
    # A' (bars 15–22): a semitone higher, in octaves — the climax
    ignifax_frenzy(s, 42, 8, n('Bb1'))
    for t, d, p in tesoro_notes(42, 1):
        s.note('Choir', t, d + .05, p, 116)
        s.note('Choir Low', t, d + .05, p - 12, 112)
        s.note('Horns', t, d + .04, p - 12, 110)
        s.note('Strings', t, d + .04, p, 100)
    phrase_cc(s, 'Horns', 42, 24, 100, 124)
    for x in (n('Bb2'), n('F3'), n('Bb3'), n('Db4')):
        s.note('Organ', 42, 12, x, 92)
        s.note('Organ', 54, 12, x if x != n('Db4') else n('C4'), 92)
    s.note('Gong', 42, 4, 61, 110)
    s.note('Timp Roll', 63, 3, n('F2') + 12, 100)
    # three blows in hemiola (bars 23–24), then the drums pick the loop back up
    hammer(s, 66, m('A3 E4 A4'))
    hammer(s, 67.5, m('A3 E4 A4'))
    hammer(s, 69, m('A3 E4 A4'))
    s.note('Gong', 69, 3, 61, 120)
    for k in range(4):
        s.note('War Drums', 71 + k / 4, .3, 62, 100 + 6 * k)
    return s, IGNIFAX_PARTS, 2.4, 24, 3


def ignifax_trono():
    """«Trono de ceniza» (♩=126, 4/4, A minor): the dragon as a dark god — full organ and a low choir
    drone over a timpani heartbeat; the motif, set against the 4/4 so its stresses fall on new beats,
    rides 3+3+2 taiko grooves with brass stabs; a break of blows answered by choir shouts in the
    silences; the motif comes back a minor third up, organ and gong, everything at once."""
    s = Score(126, 4)
    A1 = n('A1')
    for x in m('A2 E3 A3 C4'):
        s.note('Organ', 0, 8.05, x, 88)
    s.note('Choir Low', 0, 8.05, n('A2'), 92)
    for b in range(8):
        s.note('Timpani', b, .5, n('A2') if b % 2 == 0 else n('E2') + 12, 100 + 3 * b)
    hammer(s, 7, m('A3 E4'), 116)

    def groove(start, bars, root):
        for bar in range(bars):
            b = start + bar * 4
            for k in range(16):  # 3+3+2 accents on the 16ths: 0, 3, 6 / 8, 11, 14
                acc = k in (0, 3, 6, 8, 11, 14)
                s.note('Toms', b + k / 4, .2, 62 if acc else 60, 108 if acc else 66)
                s.note('Spiccato', b + k / 4, .22, root + (12 if k % 8 < 6 else 13), 100 if acc else 80)
                if acc:
                    s.note('War Drums', b + k / 4, .4, 62, 120 if k in (0, 8) else 100)
                    s.note('Low Brass', b + k / 4, .3, root + 12, 112)
                    s.note('Basses', b + k / 4, .3, root, 108)
            s.note('Anvil', b + 1.5, .3, 60, 100)
            s.note('Anvil', b + 3.5, .3, 61, 96)
            s.note('Snare', b + 3, .2, 62, 96)
            s.note('Snare', b + 3.5, .2, 62, 106)
            s.note('Tuba', b, 1, root, 110)

    groove(8, 6, A1)
    for t, d, p in tesoro_notes(8):
        s.note('Choir', t, d + .05, p, 108)
        s.note('Choir Low', t, d + .05, p - 12, 100)
        s.note('Horns', t, d + .04, p - 12, 100)
    phrase_cc(s, 'Horns', 8, 24, 90, 116)
    s.note('Clash', 8, 2, 60, 110)
    # the break (bars 9–10): blows and shouts in the silences
    at = 32
    for t, pitches in ((0, 'A3 E4 A4'), (1.5, 'A3 E4 A4'), (4, 'Bb3 F4 Bb4'), (5.5, 'Bb3 F4 Bb4'), (6.5, 'A3 E4 A4')):
        hammer(s, at + t, m(pitches))
    for t in (2.5, 3.0, 7.0):
        s.note('Shout', at + t, .5, n('A3'), 120)
    # A' (bars 11–16): a minor third up, everything at once
    groove(40, 6, n('C2'))
    for t, d, p in tesoro_notes(40, 3):
        s.note('Choir', t, d + .05, p, 118)
        s.note('Choir Low', t, d + .05, p - 12, 112)
        s.note('Horns', t, d + .04, p - 12, 112)
        s.note('Strings', t, d + .04, p, 100)
    phrase_cc(s, 'Horns', 40, 24, 100, 124)
    for x in m('C3 G3 C4 Eb4'):
        s.note('Organ', 40, 12, x, 94)
    for x in m('Ab2 Eb3 Ab3 C4'):
        s.note('Organ', 52, 12, x, 94)
    s.note('Gong', 40, 4, 61, 116)
    s.note('Timp Roll', 61, 3, n('G2'), 104)
    return s, IGNIFAX_PARTS, 2.4, 16, 4


SKETCHES = [('contemplador-1-mirada-del-abismo', contemplador_abismo), ('contemplador-2-caos-cromatico', contemplador_caos),
            ('ignifax-1-llamarada', ignifax_llamarada), ('ignifax-2-trono-de-ceniza', ignifax_trono)]


def main() -> None:
    os.makedirs(BUILD, exist_ok=True)
    wanted = sys.argv[1:]
    clips = []
    for title, build in SKETCHES:
        if wanted and not any(title.startswith(w) for w in wanted):
            continue
        score, parts, reverb_s, bars, beats_per_bar, *extra = build()
        automation = extra[0] if extra else {}
        mid_path = os.path.join(BUILD, f'acto3-jefe-{title}.mid')
        score.save(mid_path)
        used = set(score.tracks)
        spec = render.MixSpec(
            midi=mid_path, out=os.path.join(BUILD, f'acto3-jefe-{title}.mp3'), bpm=score.bpm, beats_per_bar=beats_per_bar,
            bars=bars, parts=[render.Part(t, LIB[lib], bus=bus, pan=pan, gain_db=g, send=send, automation=automation.get(t, []))
                              for t, lib, bus, pan, g, send in parts if t in used],
            buses=BUS, reverb={'seconds': reverb_s, 'predelay': 0.02, 'damping': 0.55}, reverb_return_db=-5,
            target_lufs=-15.0, tail_seconds=3.0)
        r = render.render(spec)
        peaks = {k: v['lufs'] for k, v in r['parts'].items()}
        print(f'{title:34s} {r["seconds"]:5.1f} s  {r["lufs"]:6.1f} LUFS  presencia {r["bands_db"]["presencia 2.5-6k"]:6.1f}  LUFS por parte {peaks}')
        clips.append((title, r['out']))
    sr = config.SR
    for prefix in ('contemplador', 'ignifax'):
        chosen = [(t, c) for t, c in clips if t.startswith(prefix)]
        if not chosen:
            continue
        pieces, stamps, t = [], [], 0.0
        with tempfile.TemporaryDirectory() as tmp:
            for title, c in chosen:
                wav = os.path.join(tmp, 'x.wav')
                subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', c, wav], check=True)
                y, _ = sf.read(wav, dtype='float32')
                y = np.concatenate([y, y])  # twice round the loop, to hear the seam
                y[-sr:] *= np.linspace(1, 0, sr)[:, None]
                stamps.append((title, t))
                pieces += [y, np.zeros((int(1.5 * sr), 2), dtype=np.float32)]
                t += len(y) / sr + 1.5
        out = os.path.join(BUILD, f'acto3-jefe-{prefix}-bocetos.mp3')
        mix.export_mp3(np.concatenate(pieces), sr, out)
        print(out, ' · '.join(f'{ti} {int(st // 60)}:{int(st % 60):02d}' for ti, st in stamps))


if __name__ == '__main__':
    main()
