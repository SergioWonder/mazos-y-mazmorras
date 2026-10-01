"""Ignifax's boss theme «Llamarada y trono de ceniza»: score generator (brief: docs/musica/acto3-ignifax.md).

Writes build/acto3-ignifax.mid: one MIDI track per instrument (Sonatina, VSCO 2 CE and VCSL) plus a conductor track
with the tempo and metre changes. The two approved sketches of scripts/musica/leitmotivs/acto3_jefes.py are both in
the loop: «Llamarada» (3/4 at 168) is the engine, «Trono de ceniza» (4/4 at 126) the weight. 168 = 126 x 4/3, so
three beats at 126 last as long as four at 168 and a 126 sixteenth is a 168 eighth-note triplet: every bar is an
exact number of samples (47 250 for 3/4 at 168, 84 000 for 4/4 at 126).

Form (58 bars, A minor with the Phrygian b2):
  1-4    Intro «La máquina de guerra»   L  the engine starts under choir shouts; bar 4 hammer and dead stop
  5-12   A «Llamarada»                  L  the full choir sings «Tesoro maldito» over the engine
  13-20  A' «Fauces»                    L  the motif low (male choir, trombones, horns); stop-time and shouts
  21-22  «Dos martillazos»              L  hammer on A, hammer on Bb, silence (choir E4, timpani roll on E)
  23-26  «Trono de ceniza»              T  organ, 16' pedal, low choir and the timpani heartbeat; hammer on beat 4
  27-34  «Tambores del trono»           T  3+3+2 taiko groove with brass stabs; the motif against the 4/4
  35-36  «Golpes y gritos»              T  the break: hammer blows answered by shouts in the silences
  37-40  Puente «La máquina despierta»  L  the engine again; the head of the motif and its sequence over F
  41-48  Clímax I «Llamarada en octavas» L the motif a semitone up in octaves, organ and gong
  49-56  Clímax II «Todo a la vez»      T  the motif a minor third up against the 4/4, everything at once (peak: 49)
  57-58  «Tres golpes»                  L  three hemiola hammer blows, the drums pick the loop back up

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/acto3-ignifax/compose.py
"""
from __future__ import annotations

import os
import random
import sys

import mido

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))

from estudio.config import library  # noqa: E402

OUT = os.path.join(HERE, 'build', 'acto3-ignifax.mid')
SEED = 168
SR = 44100

# ── time map ────────────────────────────────────────────────────────────────
TPB = 480
L, T = (168, 3), (126, 4)                    # (bpm, beats per bar)
SECTIONS = [('intro', 1, 4, L), ('A', 5, 12, L), ("A'", 13, 20, L), ('blows', 21, 22, L), ('throne', 23, 26, T),
            ('drums', 27, 34, T), ('break', 35, 36, T), ('bridge', 37, 40, L), ('climax1', 41, 48, L),
            ('climax2', 49, 56, T), ('coda', 57, 58, L)]
BARS = SECTIONS[-1][2]
METRE = {b: m for _, first, last, m in SECTIONS for b in range(first, last + 1)}
BAR_TICK, BAR_SEC, BAR_SAMPLES = {1: 0}, {1: 0.0}, {1: 0}
for _b in range(1, BARS + 1):
    _bpm, _beats = METRE[_b]
    BAR_TICK[_b + 1] = BAR_TICK[_b] + _beats * TPB
    BAR_SEC[_b + 1] = BAR_SEC[_b] + _beats * 60 / _bpm
    BAR_SAMPLES[_b + 1] = BAR_SAMPLES[_b] + _beats * 60 * SR // _bpm
LOOP_TICKS = BAR_TICK[BARS + 1]
LOOP_SAMPLES = BAR_SAMPLES[BARS + 1]         # 3 549 000
assert all((METRE[b][1] * 60 * SR) % METRE[b][0] == 0 for b in METRE), 'every bar is a whole number of samples'


def tick(bar: int, beat: float = 0.0) -> int:
    """Tick of a beat of a bar (local beats); beats past the bar line run on into the next bars."""
    while bar <= BARS and beat >= METRE[bar][1] - 1e-9:
        beat -= METRE[bar][1]
        bar += 1
    return BAR_TICK[bar] + int(round(beat * TPB))


def bar_at(tk: int) -> int:
    for b in range(1, BARS + 1):
        if tk < BAR_TICK[b + 1]:
            return b
    return BARS


def sec(tk: int) -> float:
    """Seconds of a tick (piecewise by bars)."""
    b = bar_at(max(0, min(tk, LOOP_TICKS - 1)))
    return BAR_SEC[b] + (tk - BAR_TICK[b]) * 60 / (METRE[b][0] * TPB)


def tick_at(seconds: float) -> int:
    for b in range(1, BARS + 1):
        if seconds < BAR_SEC[b + 1] or b == BARS:
            return BAR_TICK[b] + int(round((seconds - BAR_SEC[b]) * METRE[b][0] * TPB / 60))
    return LOOP_TICKS


def ms_ticks(tk: int, ms: float) -> int:
    """Ticks between tick tk and `ms` milliseconds later (or earlier, if negative), across tempo changes."""
    return tick_at(sec(tk) + ms / 1000) - tk


# ── instruments ─────────────────────────────────────────────────────────────
SSO = 'sso/Sonatina Symphonic Orchestra/'
ID, MB = 'VCSL/Idiophones/Struck Idiophones/', 'VCSL/Membranophones/Struck Membranophones/'
PATCHES = {
    'Choir': SSO + 'Chorus - Performance/Mixed Chorus.sfz',
    'Choir Low': SSO + 'Chorus - Performance/Large Chorus.sfz',
    'Shout': SSO + 'Chorus - Performance/Large Chorus.sfz',
    'Horns': SSO + 'Brass - Performance/Horns Sustain.sfz',
    'Low Brass': SSO + 'Brass - Performance/Trombones Marcato.sfz',
    'Tuba': SSO + 'Brass - Performance/Tuba Marcato.sfz',
    'Strings': SSO + 'Strings - Performance/1st Violins Marcato.sfz',
    'Spiccato': 'VSCO-2-CE/CelloEnsSpic.sfz',
    'Violin Spiccato': 'VSCO-2-CE/ViolinEnsSpic.sfz',
    'Basses': 'VSCO-2-CE/ContrabassSpic.sfz',
    'Organ': SSO + 'Organ/Great - Open Diapason 8ft.sfz',
    'Organ Pedal': SSO + 'Organ/Pedal - Bourdon 16ft.sfz',
    'War Drums': MB + 'Bass Drum 2.sfz',
    'Toms': MB + 'Tom 2.sfz',
    'Snare': MB + 'Snare Drum, Rope Tension.sfz',
    'Timpani': 'VSCO-2-CE/Timpani.sfz',
    'Timp Roll': 'VSCO-2-CE/TimpaniRolls.sfz',
    'Forge': ID + 'Brake Drum.sfz',            # replaces the sketch's anvil: a low metal hammer hit, not a ping
    'Clash': ID + 'Clash Cymbals 1.sfz',
    'Cymbal': ID + 'Suspended Cymbal 2.sfz',
    'Gong': ID + 'Gong 1.sfz',
}
SFZ_OF = {name: library(*rel.split('/')) for name, rel in PATCHES.items()}
TRACKS = list(PATCHES)
CC1_TRACKS = ['Choir', 'Choir Low', 'Shout', 'Horns', 'Low Brass', 'Tuba', 'Strings']
LINE_TRACKS = {'Choir', 'Choir Low', 'Horns', 'Low Brass', 'Strings'}
# velocity ceilings outside the peak (bar 49), where these three reach their maximum
CAPS = {'War Drums': 116, 'Timpani': 114, 'Gong': 108}
MAX_VEL = 120

# percussion keys
DRUM, TOM_HEAD, TOM_RIM, SNARE, FORGE, CLASH, SWELL, SWELL_LONG, GONG = 62, 62, 60, 62, 61, 60, 63, 64, 61

_STEPS = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def P(name: str) -> int:
    """'F#4' / 'Bb2' -> MIDI number (C4 = 60)."""
    step, rest, acc = name[0], name[1:], 0
    while rest and rest[0] in '#b':
        acc += 1 if rest[0] == '#' else -1
        rest = rest[1:]
    return (int(rest) + 1) * 12 + _STEPS[step] + acc


def chord(names: str) -> list[int]:
    return [P(x) for x in names.split()]


A1, Bb1, B1, C2, F1, G1, Ab1 = P('A1'), P('Bb1'), P('B1'), P('C2'), P('F1'), P('G1'), P('Ab1')
HAMMER_A, HAMMER_BB = chord('A3 E4 A4'), chord('Bb3 F4 Bb4')

# Section 5: «Tesoro maldito» as (beat, pitch, beats), and the bridge's head + its sequence a semitone up
_TESORO = [('A4', 2), ('G4', 1), ('F4', 2), ('E4', 1), ('D4', 1), ('E4', 1), ('F4', 1), ('E4', 3), ('C5', 2),
           ('B4', 1), ('A4', 1), ('G#4', 1), ('F4', 1), ('E4', 1.5), ('F4', .5), ('D4', 1), ('A3', 3)]
TESORO, _at = [], 0.0
for _name, _d in _TESORO:
    TESORO.append((_at, P(_name), _d))
    _at += _d
HEADS = [(0, 69, 2), (2, 67, 1), (3, 65, 2), (5, 64, 1), (6, 70, 2), (8, 68, 1), (9, 66, 2), (11, 65, 1)]


# ── the score ───────────────────────────────────────────────────────────────
class Score:
    def __init__(self):
        self.notes: dict[str, list[dict]] = {t: [] for t in TRACKS}
        self.keys: dict[str, list[tuple[int, int, float]]] = {t: [] for t in CC1_TRACKS}

    def note(self, track, bar, beat, beats, pitch, vel=100, hv=4, peak=False, kind='hit', end_tick=None):
        start = tick(bar, beat)
        end = end_tick if end_tick is not None else tick(bar, beat + beats)
        self.notes[track].append({'start': start, 'end': end, 'pitch': pitch, 'vel': vel, 'hv': hv, 'peak': peak,
                                  'kind': kind})

    def notes_at(self, track, bar, beat, beats, pitches, vel=100, **kw):
        for p in pitches:
            self.note(track, bar, beat, beats, p, vel, **kw)

    def line(self, track, bar, events, shift=0, finals=None):
        """A legato line: every note overlaps the next by 10-30 ms, phrase-final notes stop 20 ms early."""
        finals = {len(events) - 1} if finals is None else finals
        for i, (beat, pitch, beats) in enumerate(events):
            self.note(track, bar, beat, beats, pitch + shift, 100, hv=0,
                      kind='final' if i in finals else 'legato')

    def cc1(self, track, *keys):
        """CC1 keyframes (bar, beat, value), interpolated beat by beat."""
        self.keys[track].extend(keys)


# ── patterns (the sketch's) ─────────────────────────────────────────────────
def ostinato(root):
    return [root + 12, root + 19, root + 24, root + 25, root + 19, root + 24]


def motor(s: Score, bar, root, ost_root, intensity=1.0, low_brass=True, violins=True, snare=True, stop=False):
    """The draconic engine (`ignifax_frenzy`): spiccato ostinato with the b2, toms against the metre (an accent every
    three sixteenths), war drums with the sixteenth pickup, the forge hit, timpani, basses and low brass on the root.
    In a stop bar only beat 1 and the pickup sound."""
    ost = ostinato(ost_root)
    for k in range(12 if not stop else 1):
        b = k / 4
        s.note('Spiccato', bar, b, .22, ost[k % 6], round((100 if k % 6 == 0 else 84) * (0.92 + 0.08 * intensity)))
        if violins and k % 2 == 0:
            s.note('Violin Spiccato', bar, b, .2, ost[k % 6] + 12, round((94 if k % 6 == 0 else 82) * (0.9 + 0.1 * intensity)))
        s.note('Toms', bar, b, .2, TOM_HEAD if k % 3 == 0 else TOM_RIM, round((104 if k % 3 == 0 else 72) * intensity))
    for beat, vel in ((0, 112), (2.5, 92), (2.75, 100)):
        s.note('War Drums', bar, beat, .5 if beat == 0 else .25, DRUM, round(vel * (0.94 + 0.06 * intensity)))
    s.note('Timpani', bar, 0, .6, root + 24 if root + 24 <= 55 else root + 12, 108)
    s.note('Basses', bar, 0, .4, root, 108)
    s.note('Tuba', bar, 0, .4, root, 100, hv=0)
    if low_brass:
        s.note('Low Brass', bar, 0, .4, root + 12, 100, hv=0)
    if not stop:
        s.note('Forge', bar, 1, .3, FORGE, 82)
        if snare:
            s.note('Snare', bar, 2, .2, SNARE, 88)
            s.note('Snare', bar, 2.5, .2, SNARE, 98)


ACCENTS = (0, 3, 6, 8, 11, 14)


def timp_pair(root):
    low = root + 12 if root + 12 <= 55 else root
    return low, (low + 7 if low + 7 <= 55 else low - 5)


def groove(s: Score, bar, root, violins=False, strings=None, horns=None, shouts=None, timp_fifth=True, peak=False):
    """The 3+3+2 taiko groove of «Trono de ceniza»: accents on sixteenths 0, 3, 6 / 8, 11, 14 in toms, war drums,
    low brass and basses; the spiccato's b2 on the «2» of every 3+3+2."""
    for k in range(16):
        b, acc = k / 4, k in ACCENTS
        s.note('Toms', bar, b, .2, TOM_HEAD if acc else TOM_RIM, 104 if acc else 64)
        s.note('Spiccato', bar, b, .22, root + (12 if k % 8 < 6 else 13), 100 if acc else 80)
        if violins and k % 2 == 0:
            s.note('Violin Spiccato', bar, b, .2, root + (24 if k % 8 < 6 else 25), 90 if acc else 78)
        if acc:
            if peak and k == 0:
                s.note('War Drums', bar, b, .4, DRUM, 120, hv=0, peak=True)
            else:
                s.note('War Drums', bar, b, .4, DRUM, 112 if k in (0, 8) else 98)
            s.note('Low Brass', bar, b, .3, root + 12, 100, hv=0)
            s.note('Basses', bar, b, .3, root, 106)
            if horns:
                s.notes_at('Horns', bar, b, .3, horns, hv=0)
            if shouts:
                s.notes_at('Shout', bar, b, .4, shouts, hv=0)
    s.note('Forge', bar, 1.5, .3, FORGE, 84)
    s.note('Forge', bar, 3.5, .3, FORGE, 80)
    s.note('Snare', bar, 3, .2, SNARE, 94)
    s.note('Snare', bar, 3.5, .2, SNARE, 104)
    s.note('Tuba', bar, 0, 1, root, 100, hv=0)
    low, fifth = timp_pair(root)
    if peak:
        s.note('Timpani', bar, 0, .6, low, 118, hv=0, peak=True)
    else:
        s.note('Timpani', bar, 0, .6, low, 104)
    if timp_fifth:
        s.note('Timpani', bar, 2, .6, fifth, 92)
    if strings:
        for beat in (0, 2):
            s.notes_at('Strings', bar, beat, .35, strings, hv=0)


def hammer(s: Score, bar, beat, pitches, clash=True, shout_beats=.9):
    """A tutti hammer blow: choir shout, brass, war drum, timpani and clash cymbals together."""
    s.notes_at('Shout', bar, beat, shout_beats, pitches, hv=0)
    s.notes_at('Low Brass', bar, beat, .6, [p - 12 for p in pitches], hv=0)
    s.notes_at('Horns', bar, beat, .7, pitches, hv=0)
    s.note('Tuba', bar, beat, .6, pitches[0] - 24, hv=0)
    s.note('War Drums', bar, beat, .6, DRUM, 114, hv=2)
    s.note('Timpani', bar, beat, .6, pitches[0] - 12, 110)
    if clash:
        s.note('Clash', bar, beat, 1.5, CLASH, 104)


def swell(s: Score, bar, beat, key=SWELL, seconds=2.9, vel=88):
    """Suspended-cymbal crescendo (key 63 peaks 2.17 s after its start)."""
    start = tick(bar, beat)
    s.note('Cymbal', bar, beat, 0, key, vel, end_tick=start + ms_ticks(start, seconds * 1000))


# ── sections ────────────────────────────────────────────────────────────────
def intro(s: Score):
    for i, (bar, root) in enumerate(zip((1, 2, 3), (A1, Bb1, A1))):
        motor(s, bar, root, A1, intensity=0.8 + 0.1 * i)
        s.notes_at('Shout', bar, 0, .9, chord('A3 E4'), hv=0)
    hammer(s, 4, 0, HAMMER_A)
    swell(s, 4, .5, key=SWELL_LONG, seconds=2.5, vel=84)       # the sketch's swell, under the silence


def llamarada(s: Score):
    for bar in range(5, 13):
        motor(s, bar, A1 if bar % 2 else Bb1, A1)
    s.line('Choir', 5, TESORO)
    s.line('Choir Low', 5, TESORO, -12)
    s.line('Horns', 5, TESORO, -12)
    for bar in (5, 9):
        s.note('Clash', bar, 0, 2, CLASH, 100)


def fauces(s: Score):
    roots = [A1, Bb1, A1, A1, A1, Bb1, A1, A1]
    for bar, root in zip(range(13, 21), roots):
        stop = bar in (16, 20)
        motor(s, bar, root, A1, low_brass=False, stop=stop)
        if stop:
            for beat in (1, 2):
                s.notes_at('Shout', bar, beat, .6, HAMMER_A, hv=0)
    for track in ('Choir Low', 'Low Brass', 'Horns'):
        s.line(track, 13, TESORO, -12)


def blows(s: Score):
    hammer(s, 21, 0, HAMMER_A)
    hammer(s, 22, 0, HAMMER_BB)
    end = tick(23) + ms_ticks(tick(23), -20)
    s.note('Choir', 22, 1.5, 0, P('E4'), hv=0, kind='hold', end_tick=end)
    s.note('Timp Roll', 22, 1, 0, P('E3'), 66, end_tick=end)


def throne(s: Score):
    for bar, beats, names in ((23, 8, 'A2 E3 A3 C4'), (25, 4, 'F2 D3 F3 A3'), (26, 4, 'E2 B2 E3 G#3')):
        s.notes_at('Organ', bar, 0, beats, chord(names), 84, hv=2)
    s.note('Organ Pedal', 23, 0, 12, P('A2'), 72, hv=2)
    s.note('Organ Pedal', 26, 0, 4, P('E2'), 72, hv=2)
    s.note('Choir Low', 23, 0, 12, P('A2'), hv=0, kind='hold')
    s.note('Choir Low', 26, 0, 4, P('G#2'), hv=0, kind='hold')
    beats = [('A2', 'E3')] * 2 + [('F2', 'C3'), ('E2', 'B2')]
    for i in range(15):                                        # the 16th beat is the hammer's timpani
        bar, k = 23 + i // 4, i % 4
        low, high = beats[i // 4]
        s.note('Timpani', bar, k, .5, P(low if k % 2 == 0 else high), round(72 + 32 * i / 14), hv=2)
    hammer(s, 26, 3, chord('A3 E4'))


def drums(s: Score):
    for bar in range(27, 35):
        groove(s, bar, A1, horns=chord('A3 E4') if bar < 29 else None)
    s.line('Choir', 29, TESORO)
    s.line('Choir Low', 29, TESORO, -12)
    s.line('Horns', 29, TESORO, -12)
    s.note('Clash', 29, 0, 2, CLASH, 100)


def rupture(s: Score):
    for bar, beat, pitches, clash in ((35, 0, HAMMER_A, True), (35, 1.5, HAMMER_A, False), (36, 0, HAMMER_BB, True),
                                      (36, 1.5, HAMMER_BB, False), (36, 2.5, HAMMER_A, False)):
        hammer(s, bar, beat, pitches, clash=clash, shout_beats=.45)
    for bar, beat in ((35, 2.5), (35, 3.0), (36, 3.0)):
        s.note('Shout', bar, beat, .5, P('A3'), hv=0)


def bridge(s: Score):
    for bar, root, ost, inten in ((37, A1, A1, .85), (38, Bb1, A1, .9), (39, F1, F1, .95), (40, F1, F1, 1.0)):
        motor(s, bar, root, ost, intensity=inten, low_brass=False, violins=bar < 39, snare=bar < 40)
    for bar, names in ((37, 'A3 E4'), (38, 'Bb3 F4'), (39, 'F3 C4'), (40, 'F3 C4')):
        s.notes_at('Shout', bar, 0, .9, chord(names), hv=0)
    s.line('Horns', 37, HEADS, finals={3, 7})
    s.line('Low Brass', 37, HEADS, -12, finals={3, 7})
    for k in range(12):                                        # snare roll into the climax
        s.note('Snare', 40, k / 4, .2, SNARE, round(56 + 48 * k / 11), hv=2)
    s.note('Timp Roll', 40, 0, 0, P('F3'), 84, end_tick=tick(41) + ms_ticks(tick(41), -20))
    s.note('Clash', 37, 0, 2, CLASH, 100)
    swell(s, 39, 0)


def climax1(s: Score):
    for i, bar in enumerate(range(41, 49)):
        root = G1 if bar == 48 else (Bb1 if i % 2 == 0 else B1)
        motor(s, bar, root, Bb1)
    s.line('Choir', 41, TESORO, 1)
    s.line('Strings', 41, TESORO, 1)
    s.line('Choir Low', 41, TESORO, -11)
    s.line('Horns', 41, TESORO, -11)
    s.notes_at('Organ', 41, 0, 12, chord('Bb2 Db3 F3 Bb3'), 90, hv=2)
    s.notes_at('Organ', 45, 0, 12, chord('Bb2 C3 F3 Bb3'), 90, hv=2)
    s.note('Gong', 41, 0, 4, GONG, 102, hv=2)
    s.note('Clash', 45, 0, 2, CLASH, 100)
    swell(s, 47, 0, vel=92)
    s.note('Timp Roll', 48, 0, 0, P('G2'), 92, end_tick=tick(49) + ms_ticks(tick(49), -20))


def climax2(s: Score):
    cm, ab, bb = chord('G3 C4 Eb4'), chord('Ab3 C4 Eb4'), chord('Bb3 D4 F4')
    for bar in range(49, 55):
        groove(s, bar, C2, violins=True, strings=cm if bar < 52 else ab, peak=bar == 49)
    groove(s, 55, Ab1, violins=True, strings=ab, horns=chord('Ab3 Eb4'), shouts=chord('Ab3 Eb4'))
    groove(s, 56, Bb1, violins=True, strings=bb, horns=chord('Bb3 F4'), shouts=chord('Bb3 F4'), timp_fifth=False)
    s.line('Choir', 49, TESORO, 3)
    s.line('Choir Low', 49, TESORO, -9)
    s.line('Horns', 49, TESORO, -9)
    s.notes_at('Organ', 49, 0, 12, chord('C3 Eb3 G3 C4'), 92, hv=2)
    s.notes_at('Organ', 52, 0, 16, chord('Ab2 Eb3 Ab3 C4'), 92, hv=2)
    s.notes_at('Organ', 56, 0, 4, chord('Bb2 F3 Bb3 D4'), 92, hv=2)
    s.note('Organ Pedal', 49, 0, 24, P('C3'), 74, hv=2)
    s.note('Organ Pedal', 55, 0, 4, P('Ab2'), 74, hv=2)
    s.note('Organ Pedal', 56, 0, 4, P('Bb2'), 74, hv=2)
    s.notes_at('Choir', 55, 0, 4, chord('Eb4 Ab4 C5'), hv=0, kind='hold')
    s.notes_at('Choir', 56, 0, 3, chord('F4 Bb4 D5'), hv=0, kind='hold')
    s.note('Choir Low', 55, 0, 4, P('Ab3'), hv=0, kind='hold')
    s.note('Choir Low', 56, 0, 3, P('Bb3'), hv=0, kind='hold')
    s.note('Gong', 49, 0, 4, GONG, 116, hv=0, peak=True)
    s.note('Clash', 49, 0, 2, CLASH, 108)
    s.note('Clash', 55, 0, 2, CLASH, 100)
    s.note('Timp Roll', 56, 1, 0, P('Bb2'), 96, end_tick=tick(57) + ms_ticks(tick(57), -20))


def coda(s: Score):
    hammer(s, 57, 0, HAMMER_A)
    hammer(s, 57, 1.5, HAMMER_A, clash=False)
    hammer(s, 58, 0, HAMMER_A)
    s.note('Gong', 58, 0, 2, GONG, 106, hv=2)
    for k in range(4):                                         # the pickup into bar 1
        s.note('War Drums', 58, 2 + k / 4, .25, DRUM, 100 + 5 * k, hv=2)


def dynamics(s: Score):
    """CC1 of the Sonatina parts (section 7): a phrase arch on every statement of the motif, the hammers on top; only
    bar 49 reaches 112."""
    s.cc1('Choir', (1, 0, 90), (5, 0, 96), (8, 0, 104), (9, 0, 106), (11, 0, 100), (12, 2, 98), (22, 0, 90),
          (22, 2, 90), (29, 0, 98), (31, 0, 104), (32, 0, 106), (34, 3, 100), (41, 0, 102), (44, 0, 108),
          (45, 0, 110), (47, 0, 106), (48, 2, 104), (49, 0, 112), (49, 2, 110), (52, 0, 110), (54, 3, 106),
          (55, 0, 108), (56, 3, 104), (58, 2, 90))
    s.cc1('Choir Low', (1, 0, 90), (5, 0, 94), (9, 0, 104), (12, 2, 98), (13, 0, 98), (17, 0, 108), (20, 2, 100),
          (23, 0, 72), (26, 0, 84), (26, 3, 86), (29, 0, 96), (32, 0, 104), (34, 3, 98), (41, 0, 100), (45, 0, 108),
          (48, 2, 102), (49, 0, 108), (52, 0, 110), (54, 3, 104), (55, 0, 106), (56, 3, 104), (58, 0, 100))
    s.cc1('Shout', (1, 0, 100), (3, 0, 108), (4, 0, 110), (5, 0, 106), (16, 0, 106), (21, 0, 110), (26, 3, 108),
          (35, 0, 110), (37, 0, 104), (40, 0, 108), (55, 0, 108), (57, 0, 110))
    s.cc1('Horns', (1, 0, 96), (4, 0, 108), (5, 0, 90), (9, 0, 106), (12, 2, 96), (13, 0, 94), (17, 0, 104),
          (20, 2, 98), (21, 0, 108), (26, 3, 104), (27, 0, 98), (29, 0, 96), (32, 0, 106), (34, 3, 100), (37, 0, 100),
          (40, 2, 108), (41, 0, 102), (45, 0, 110), (48, 2, 104), (49, 0, 112), (49, 2, 110), (54, 3, 106),
          (55, 0, 108), (57, 0, 110))
    s.cc1('Low Brass', (1, 0, 100), (4, 0, 110), (5, 0, 104), (13, 0, 96), (17, 0, 106), (20, 2, 100), (21, 0, 110),
          (26, 3, 108), (27, 0, 104), (34, 3, 108), (35, 0, 110), (37, 0, 100), (40, 2, 108), (41, 0, 106),
          (48, 2, 108), (49, 0, 110), (56, 3, 108), (57, 0, 110))
    s.cc1('Tuba', (1, 0, 100), (5, 0, 104), (21, 0, 108), (23, 0, 100), (27, 0, 104), (35, 0, 108), (41, 0, 106),
          (49, 0, 110), (57, 0, 110))
    s.cc1('Strings', (1, 0, 90), (41, 0, 96), (44, 0, 104), (45, 0, 106), (48, 2, 100), (49, 0, 104), (56, 3, 102),
          (58, 0, 90))


def build() -> Score:
    s = Score()
    for section in (intro, llamarada, fauces, blows, throne, drums, rupture, bridge, climax1, climax2, coda, dynamics):
        section(s)
    return s


# ── performance: humanization and controller curves ─────────────────────────
def perform(s: Score) -> dict[str, list[tuple[int, int, int, int]]]:
    """Notes as (start, end, pitch, velocity) ticks: attacks move up to +-8 ms (+-5 ms in the legato lines, the same
    for every note of a chord), velocities by +-hv; legato notes overlap the next by 10-30 ms."""
    rng = random.Random(SEED)
    guard = LOOP_TICKS + ms_ticks(LOOP_TICKS, -12)
    out = {}
    for track in TRACKS:
        offsets: dict[int, int] = {}
        played = []
        for n in s.notes[track]:
            lim = 5 if n['kind'] in ('legato', 'final', 'hold') else 8
            if n['start'] not in offsets:
                j = ms_ticks(n['start'], rng.uniform(-lim, lim))
                offsets[n['start']] = abs(j) if n['start'] + j < 0 else j
            j = offsets[n['start']]
            start, end = n['start'] + j, n['end']
            if n['kind'] == 'legato':
                end += ms_ticks(end - 1, rng.uniform(12, 28))
            elif n['kind'] == 'final':
                end += ms_ticks(end, -20)
            elif n['kind'] == 'hit':
                end += j
            end = min(end, guard)
            vel = n['vel'] + (rng.randint(-n['hv'], n['hv']) if n['hv'] else 0)
            if not n['peak']:
                vel = min(vel, CAPS.get(track, MAX_VEL))
            played.append((start, max(start + 1, end), n['pitch'], max(1, min(MAX_VEL, vel))))
        out[track] = played
    return out


def curves(s: Score) -> dict[str, list[tuple[int, int]]]:
    """CC1 keyframes sampled once per beat (never denser than an eighth), repeated values dropped."""
    out = {}
    for track, keys in s.keys.items():
        pts = sorted((tick(b, beat), v) for b, beat, v in keys)
        values = []
        for bar in range(1, BARS + 1):
            for beat in range(METRE[bar][1]):
                tk = tick(bar, beat)
                if tk <= pts[0][0]:
                    v = pts[0][1]
                elif tk >= pts[-1][0]:
                    v = pts[-1][1]
                else:
                    (a, va), (b, vb) = next((p, q) for p, q in zip(pts, pts[1:]) if p[0] <= tk <= q[0])
                    v = va + (vb - va) * (tk - a) / (b - a) if b > a else vb
                v = int(round(v))
                if not values or values[-1][1] != v:
                    values.append((tk, v))
        out[track] = values
    return out


def write_midi(path: str = OUT) -> Score:
    s = build()
    played, ccs = perform(s), curves(s)
    mid = mido.MidiFile(ticks_per_beat=TPB)
    conductor = mido.MidiTrack()
    conductor.append(mido.MetaMessage('track_name', name='Conductor', time=0))
    last, now = None, 0
    for bar in range(1, BARS + 1):
        if METRE[bar] != last:
            bpm, beats = METRE[bar]
            conductor.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(bpm), time=BAR_TICK[bar] - now))
            conductor.append(mido.MetaMessage('time_signature', numerator=beats, denominator=4, time=0))
            now, last = BAR_TICK[bar], METRE[bar]
    conductor.append(mido.MetaMessage('end_of_track', time=LOOP_TICKS - now))
    mid.tracks.append(conductor)
    for ch, track in enumerate(TRACKS):
        tr = mido.MidiTrack()
        tr.append(mido.MetaMessage('track_name', name=track, time=0))
        events = [(tk, 1, mido.Message('control_change', control=1, value=v)) for tk, v in ccs.get(track, [])]
        for start, end, pitch, vel in played[track]:
            events.append((start, 2, mido.Message('note_on', note=pitch, velocity=vel)))
            events.append((end, 0, mido.Message('note_off', note=pitch, velocity=0)))
        events.sort(key=lambda e: (e[0], e[1], e[2].bytes()))
        now = 0
        for tk, _, msg in events:
            tr.append(msg.copy(time=tk - now))
            now = tk
        tr.append(mido.MetaMessage('end_of_track', time=max(0, LOOP_TICKS - now)))
        mid.tracks.append(tr)
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    mid.save(path)
    return s


def main():
    s = write_midi(OUT)
    print(f'{OUT}\n  {BARS} compases · {BAR_SEC[BARS + 1]:.3f} s · loop_samples {LOOP_SAMPLES}')
    for name in ('blows', 'throne', 'bridge', 'climax2', 'coda'):
        first = next(f for n, f, _, _ in SECTIONS if n == name)
        print(f'  {name:8s} c. {first:2d}: {BAR_SEC[first]:7.3f} s · muestra {BAR_SAMPLES[first]}')
    for track in TRACKS:
        print(f'  {track:16s} {len(s.notes[track]):4d} notas')


if __name__ == '__main__':
    main()
