"""Boss theme III - "Ignifax and the Beholder": final battle, C harmonic minor, 150 BPM.

48 bars (40 in 4/4 + 8 in 7/8) = 188 beats = 75.2 s.

Form:
  intro (4)   huge hit (organ, low bells, braam, taikos), 16th ostinato wakes up
  a1 (8)      the dragon theme in trombones and tuba, 'oh' choir
  a2 (8)      theme in horns + trombones in octaves, trumpet stabs, frantic violins
  b (8, 7/8)  the Beholder: 2+2+3 limp, staccato choir chant, soft organ,
              low bell tolls on a C pedal with the Db/Bo7 rubs, horn lament
  c (8)       build: the game's leitmotiv in C MINOR (the enemy owns it),
              rising to the dominant of Eb
  climax (8)  the leitmotiv HEROIC and MAJOR: Eb major (horns + trumpets), then
              a chromatic-mediant jump to C major with trumpets on top
  turn (4)    Ab Fm Db G in C minor, rising brass, taiko fill -> back to the hit
"""
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import synth as S  # noqa: E402

BPM = 150
SPB = 60.0 / BPM
METER = [4.0] * 20 + [3.5] * 8 + [4.0] * 20
BARS = len(METER)
STARTS = np.concatenate([[0.0], np.cumsum(METER)])
TOTAL_BEATS = float(STARTS[-1])
N_LOOP = int(round(TOTAL_BEATS * SPB * S.SR))
N_TAIL = int(10.0 * S.SR)
OUT = os.path.join(HERE, 'jefe3')


def tb(bar, beat=0.0):
    return (STARTS[bar] + beat) * SPB


def blen(bar):
    return METER[bar] * SPB


# name: (bass midi, pitch classes)
CHORDS = {
    'Cm': (36, (0, 3, 7)), 'Db/C': (36, (1, 5, 8)), 'Bo7/C': (36, (11, 2, 5, 8)),
    'Db': (37, (1, 5, 8)), 'Eb': (39, (3, 7, 10)), 'Fm': (41, (5, 8, 0)),
    'G': (43, (7, 11, 2)), 'G7': (43, (7, 11, 2, 5)), 'Ab': (44, (8, 0, 3)),
    'Bb': (46, (10, 2, 5)), 'Bb7': (46, (10, 2, 5, 8)), 'C': (36, (0, 4, 7)),
    'Am': (45, (9, 0, 4)), 'Dm': (38, (2, 5, 9)), 'F': (41, (5, 9, 0)),
}
A_PROG = ['Cm', 'Cm', 'Ab', 'Ab', 'Fm', 'Db', 'G', 'G']
_simple = (['Cm', 'Cm', 'Ab', 'G'] + A_PROG + A_PROG
           + ['Cm', 'Db/C', 'Cm', 'Bo7/C', 'Cm', 'Db/C', 'Ab', 'G']
           + ['Cm', 'Ab', None, 'Cm', 'Fm', 'Db', 'Bb', 'Bb7']
           + ['Eb', 'Cm', None, 'Eb', 'C', 'Am', None, 'C']
           + ['Ab', 'Fm', 'Db', 'G7'])
SPLITS = {30: [(0.0, 'Fm'), (2.0, 'G')], 38: [(0.0, 'Fm'), (2.0, 'Bb')],
          42: [(0.0, 'Dm'), (2.0, 'G')]}
HARM = [SPLITS.get(i, [(0.0, c)]) for i, c in enumerate(_simple)]
assert len(HARM) == BARS == 48


def chord_at(bar, beat=0.0):
    name = HARM[bar][0][1]
    for b, c in HARM[bar]:
        if beat >= b - 1e-6:
            name = c
    return name


def section(bar):
    for name, end in (('intro', 4), ('a1', 12), ('a2', 20), ('b', 28), ('c', 36),
                      ('climax', 44), ('turn', 48)):
        if bar < end:
            return name


def tones(name, lo, hi):
    pcs = set(CHORDS[name][1])
    return [m for m in range(lo, hi + 1) if m % 12 in pcs]


def dyn(bar):
    sec = section(bar)
    return {
        'intro': [1.0, 0.55, 0.62, 0.72][bar] if bar < 4 else 1.0,
        'a1': 0.74 + 0.01 * (bar - 4),
        'a2': 0.84 + 0.01 * (bar - 12),
        'b': 0.7 + 0.02 * (bar - 20),
        'c': 0.8 + 0.028 * (bar - 28),
        'climax': 1.0,
        'turn': 0.95,
    }[sec]


# ---------------------------------------------------------------- melodies (midi, beats)

# the dragon (Ignifax): 8 bars over Cm Cm Ab Ab Fm Db G G, trombone register
DRAGON = [(48, 1.5), (48, 0.5), (55, 2),
          (56, 1), (55, 0.5), (53, 0.5), (51, 1), (50, 1),
          (48, 1.5), (51, 0.5), (56, 2),
          (58, 1), (56, 0.5), (55, 0.5), (56, 2),
          (53, 1.5), (56, 0.5), (60, 2),
          (61, 1), (60, 0.5), (58, 0.5), (56, 1), (53, 1),
          (55, 1.5), (59, 0.5), (62, 2),
          (56, 1), (59, 1), (55, 2)]

# game leitmotiv (D major original: D A | B A F# | G F# E | D), beat 4 of bar 1 left to the drums
LEIT_MINOR = [(60, 1), (67, 2), (None, 1), (68, 1), (67, 1), (63, 2),
              (65, 1), (63, 1), (62, 2), (60, 4),
              (65, 1), (72, 2), (None, 1), (73, 1), (72, 1), (68, 2),
              (70, 1), (72, 1), (74, 2), (70, 1), (68, 1), (67, 1), (65, 1)]
LEIT_EB = [(63, 1), (70, 2), (None, 1), (72, 1), (70, 1), (67, 2), (68, 1), (67, 1), (65, 2), (63, 4)]
LEIT_C = [(72, 1), (79, 2), (None, 1), (81, 1), (79, 1), (76, 2), (77, 1), (76, 1), (74, 2), (72, 4)]

# rising unison brass of the turnaround (Ab Fm Db G)
TURN_LINE = [(56, 1.5), (56, 0.5), (60, 2), (65, 1.5), (63, 0.5), (60, 2),
             (61, 1.5), (60, 0.5), (58, 1), (56, 1), (55, 1), (56, 1), (59, 1), (62, 1)]

# the Beholder's horn lament (7/8 bars 22-27)
LAMENT = [(67, 3.5), (68, 3.5), (67, 2), (63, 1.5), (65, 2), (68, 1.5), (72, 3.5), (71, 2), (67, 1.5)]


def line_events(notes, start_bar):
    """Yield (time, midi, seconds); crosses bar lines using the meter table."""
    bar, beat = start_bar, 0.0
    for m, d in notes:
        if m is not None:
            yield tb(bar, beat), m, d * SPB
        beat += d
        while bar < BARS and beat >= METER[bar] - 1e-6:
            beat -= METER[bar]
            bar += 1


# ---------------------------------------------------------------- tracks

ACC44 = {0, 3, 6, 8, 11, 14}
ACC78 = {0, 4, 8}


def render_ostinato():
    """Low strings: frantic 16th spiccato, 3-3-2 accents (2+2+3 in 7/8)."""
    rng = np.random.default_rng(31)
    tr = S.Track(N_LOOP, N_TAIL)
    cache = {}

    def note(m, acc):
        key = (m, acc)
        if key not in cache:
            cache[key] = S.spiccato(m, 1.0, rng, bright=1.0 if acc else 0.7)
        return cache[key]

    pat_a = [0, 0, 12, 0, 0, 12, 0, 0, 0, 0, 12, 0, 0, 12, 7, 12]
    pat_c = [0, 0, 12, 0, 1, 0, 12, 0, 0, 0, 12, 1, 0, 12, 0, 13]
    pat_b = [0, 0, 12, 0, 0, 1, 12, 0, 0, 1, 0, 12, 0, 1]
    for bar in range(BARS):
        sec = section(bar)
        d = dyn(bar)
        if bar == 0:
            for m in (36, 48):
                tr.add(S.strings_note(m, 1.8 * SPB, 0.9, rng, voices=4, attack=0.01, release=0.9,
                                      bright=0.9), tb(0), pan=-0.1)
            continue
        if sec == 'b':
            pat, acc = pat_b, ACC78
        elif sec in ('c', 'climax', 'turn'):
            pat, acc = pat_c, ACC44
        else:
            pat, acc = pat_a, ACC44
        for step, off in enumerate(pat):
            beat = step * 0.25
            root = CHORDS[chord_at(bar, beat)][0]
            if sec == 'climax' and off in (1, 13):
                off -= 1          # no Phrygian rub in the major climax
            a = step in acc
            v = S.hvel(rng, d * (1.0 if a else 0.55))
            t = tb(bar, beat) + S.humanize(rng, 0.002, 0.006)
            tr.add(note(root + off, a) * v, t, pan=-0.2)
            if sec in ('c', 'climax', 'turn') and a:
                tr.add(note(root + off + 12, True) * v * 0.4, t + 0.003, pan=0.25)
    return tr


def render_violins():
    """Upper strings: frantic 16th arpeggios (a2, c, climax, turn), tremolo in b."""
    rng = np.random.default_rng(32)
    tr = S.Track(N_LOOP, N_TAIL)
    cache = {}

    def note(m):
        if m not in cache:
            cache[m] = S.spiccato(m, 1.0, rng, bright=0.5, dur=0.07)
        return cache[m]

    shapes = ([0, 1, 2, 3], [3, 2, 1, 0], [0, 2, 1, 3], [1, 2, 3, 2], [2, 1, 0, 1], [0, 1, 3, 2])
    for bar in range(BARS):
        sec = section(bar)
        if sec not in ('a2', 'c', 'climax', 'turn'):
            continue
        d = dyn(bar)
        lo, hi = (62, 79) if sec != 'a2' else (60, 76)
        for beat in range(4):
            name = chord_at(bar, beat)
            ts = tones(name, lo, hi)
            base = (bar * 3 + beat * 2) % max(1, len(ts) - 3)
            shape = shapes[(bar * 4 + beat) % len(shapes)]
            for i, k in enumerate(shape):
                m = ts[min(base + k, len(ts) - 1)]
                v = S.hvel(rng, d * (0.8 if i == 0 else 0.5), 0.1)
                tr.add(note(m) * v, tb(bar, beat + i * 0.25) + S.humanize(rng, 0.003), pan=0.35)
    # b: eerie high tremolo on semitone rubs
    for bar, pair in ((20, (67, 68)), (22, (67, 68)), (24, (66, 67)), (26, (68, 71))):
        for m in pair:
            tr.add(S.strings_note(m, 2 * 3.5 * SPB, 0.3, rng, voices=4, attack=0.6, release=0.6,
                                  tremolo=18.0, bright=0.45), tb(bar), pan=0.4)
    return tr


def render_strings_sus():
    rng = np.random.default_rng(33)
    tr = S.Track(N_LOOP, N_TAIL)
    # low pedal: intro, b
    for bar, bars in ((1, 3), (20, 8)):
        dur = sum(METER[bar:bar + bars]) * SPB
        for m in (36, 43):
            tr.add(S.strings_note(m, dur, 0.3, rng, voices=4, attack=1.0, release=1.2,
                                  bright=0.45, spread=6.0), tb(bar), pan=0.1)
    # climax + turn: sustained mid harmony
    for bar in range(36, 48):
        for b0, name in HARM[bar]:
            dur = ((HARM[bar][1][0] if b0 == 0.0 and len(HARM[bar]) > 1 else 4.0) - b0) * SPB
            for m in tones(name, 55, 72)[:4]:
                tr.add(S.strings_note(m, dur, 0.32, rng, voices=4, attack=0.1, release=0.35,
                                      bright=0.55), tb(bar, b0), pan=-0.35)
    return tr


def render_low_brass():
    rng = np.random.default_rng(34)
    tr = S.Track(N_LOOP, N_TAIL)
    tb_ = lambda m, dur, v, **k: S.brass_note(m, dur, v, rng, kind='trombone', **k)
    tu_ = lambda m, dur, v, **k: S.brass_note(m, dur, v, rng, kind='tuba', **k)
    # intro: the hit (braam) and swells
    for m in (36, 43, 48, 51):
        tr.add((tu_ if m < 40 else tb_)(m, 1.8 * SPB, 1.0, release=1.2), tb(0), pan=0.15)
    for bar, notes in ((2, (44, 48, 51)), (3, (43, 47, 50))):
        for m in notes:
            dur = 4 * SPB - 0.05
            tr.add(tb_(m, dur, 0.7 + 0.1 * (bar - 2), swell=dur * 0.85), tb(bar), pan=0.2)
    # a1: dragon theme; a2: same under the horns
    for start, v in ((4, 0.9), (12, 0.85)):
        for t, m, d in line_events(DRAGON, start):
            tr.add(tb_(m, d * 0.93, S.hvel(rng, v)), t + S.humanize(rng), pan=0.2)
            if d >= 1.9 * SPB:
                tr.add(tu_(m - 12, d * 0.93, 0.7), t, pan=0.1)
    # b: braams on the Beholder's tolls
    for bar, notes in ((20, (36, 43)), (24, (36, 43)), (26, (44, 51)), (27, (43, 50, 55))):
        dur = 2 * 3.5 * SPB - 0.1 if bar in (20, 24) else 3.5 * SPB - 0.05
        for m in notes:
            tr.add((tu_ if m < 40 else tb_)(m, dur, 0.7, swell=dur * 0.7), tb(bar), pan=0.15)
    # c: 3-3-2 chord stabs, tuba roots
    for bar in range(28, 36):
        vel = 0.6 + 0.04 * (bar - 28)
        for beat, dd in ((0.0, 0.6), (1.5, 0.4), (3.0, 0.5)):
            name = chord_at(bar, beat)
            for m in tones(name, 46, 58)[:3]:
                tr.add(tb_(m, dd * SPB, S.hvel(rng, vel), voices=2), tb(bar, beat) + S.humanize(rng),
                       pan=0.25)
            tr.add(tu_(CHORDS[name][0], dd * SPB, S.hvel(rng, vel * 0.8), voices=2), tb(bar, beat), pan=0.1)
    # climax: trombones double phrase 1 an octave down, then hold chords
    for t, m, d in line_events(LEIT_EB, 36):
        tr.add(tb_(m - 12, d * 0.93, S.hvel(rng, 0.85)), t + S.humanize(rng), pan=0.2)
    for bar in range(36, 44):
        for b0, name in HARM[bar]:
            end = HARM[bar][1][0] if (b0 == 0.0 and len(HARM[bar]) > 1) else 4.0
            dur = (end - b0) * SPB - 0.05
            tr.add(tu_(CHORDS[name][0], dur, 0.75), tb(bar, b0), pan=0.1)
            if bar >= 40:
                for m in tones(name, 48, 60)[:3]:
                    tr.add(tb_(m, dur, S.hvel(rng, 0.7), voices=2), tb(bar, b0), pan=0.25)
    # turn: rising unison line, tuba octave below
    for t, m, d in line_events(TURN_LINE, 44):
        tr.add(tb_(m - 12, d * 0.93, S.hvel(rng, 0.9)), t + S.humanize(rng), pan=0.2)
        tr.add(tu_(m - 24, d * 0.93, 0.6), t, pan=0.1)
    return tr


def render_horns():
    rng = np.random.default_rng(35)
    tr = S.Track(N_LOOP, N_TAIL)
    hn = lambda m, dur, v, **k: S.brass_note(m, dur, v, rng, kind='horn', voices=4, **k)
    # intro hit + a1 soft chord pads
    for m in (60, 63, 67):
        tr.add(hn(m, 1.8 * SPB, 0.95, release=1.0), tb(0), pan=-0.3)
    for bar in range(4, 12, 2):
        m = min(tones(chord_at(bar), 60, 70), key=lambda x: abs(x - 64))
        tr.add(hn(m, 8 * SPB - 0.08, 0.45, swell=3.0), tb(bar), pan=-0.3)
    # a2: dragon theme an octave above the trombones
    for t, m, d in line_events(DRAGON, 12):
        tr.add(hn(m + 12, d * 0.93, S.hvel(rng, 0.88)), t + S.humanize(rng), pan=-0.3)
    # b: lament
    for t, m, d in line_events(LAMENT, 22):
        tr.add(hn(m - 12 if m > 70 else m, d - 0.04, 0.55, swell=d * 0.5), t, pan=-0.3)
    # c: leitmotiv in minor
    for t, m, d in line_events(LEIT_MINOR, 28):
        tr.add(hn(m, d * 0.94, S.hvel(rng, 0.8 + 0.1 * (t >= tb(32)))), t + S.humanize(rng), pan=-0.3)
    # climax: phrase 1 lead (Eb), phrase 2 an octave under the trumpets (C)
    for t, m, d in line_events(LEIT_EB, 36):
        tr.add(hn(m, d * 0.94, S.hvel(rng, 1.0, 0.03)), t + S.humanize(rng, 0.002), pan=-0.3)
    for t, m, d in line_events(LEIT_C, 40):
        tr.add(hn(m - 12, d * 0.94, S.hvel(rng, 0.95, 0.03)), t + S.humanize(rng, 0.002), pan=-0.3)
    for t, m, d in line_events(TURN_LINE, 44):
        tr.add(hn(m + 12, d * 0.93, S.hvel(rng, 0.85)), t + S.humanize(rng), pan=-0.3)
    return tr


def render_trumpets():
    rng = np.random.default_rng(36)
    tr = S.Track(N_LOOP, N_TAIL)
    tp = lambda m, dur, v, **k: S.brass_note(m, dur, v, rng, kind='trumpet', **k)
    # a2: stabs on the 3-3-2 accents every other bar
    for bar in range(13, 20, 2):
        for beat in (0.0, 1.5, 3.0):
            for m in tones(chord_at(bar, beat), 64, 72)[:2]:
                tr.add(tp(m, 0.35 * SPB, S.hvel(rng, 0.55), voices=2), tb(bar, beat) + S.humanize(rng), pan=0.35)
    # c: join the leitmotiv in its second half
    for t, m, d in line_events(LEIT_MINOR, 28):
        if t >= tb(32):
            tr.add(tp(m, d * 0.9, S.hvel(rng, 0.7)), t + S.humanize(rng), pan=0.35)
    # climax: phrase 1 in unison with the horns, phrase 2 on top
    for t, m, d in line_events(LEIT_EB, 36):
        tr.add(tp(m, d * 0.92, S.hvel(rng, 0.8, 0.03)), t + S.humanize(rng, 0.002), pan=0.35)
    for t, m, d in line_events(LEIT_C, 40):
        tr.add(tp(m, d * 0.92, S.hvel(rng, 0.78, 0.03)), t + S.humanize(rng, 0.002), pan=0.3)
    # fanfare pickups on the empty 4th beats of the leitmotiv
    for bar, notes in ((36, (67, 70)), (40, (72, 76))):
        for i, off in enumerate((0.0, 0.33, 0.66)):
            for m in notes:
                tr.add(tp(m, 0.22 * SPB, 0.55 + 0.1 * i, voices=2), tb(bar, 3.0 + off), pan=0.35)
    # turn: hits
    for bar in range(44, 48):
        for m in tones(chord_at(bar), 62, 71)[:2]:
            tr.add(tp(m, 0.4 * SPB, 0.6, voices=2), tb(bar), pan=0.35)
    return tr


def render_choir():
    rng = np.random.default_rng(37)
    tr = S.Track(N_LOOP, N_TAIL)

    def chord(notes, t, dur, vel, attack, release=1.0, formants=S.FORMANTS_AH, voices=4):
        for m in notes:
            pan = float(np.clip((m - 62) / 18.0, -0.6, 0.6))
            tr.add(S.choir_note(m, dur, S.hvel(rng, vel, 0.04), rng, attack=attack, release=release,
                                formants=formants, voices=voices), t, pan=pan)

    chord((48, 55, 60, 63, 67), tb(0), 1.8 * SPB, 0.8, 0.05, release=1.5)
    chord((48, 55, 60, 63), tb(1), 3 * 4 * SPB, 0.4, 2.0, formants=S.FORMANTS_OH)
    for bar in range(4, 12, 2):
        chord(tones(chord_at(bar), 48, 63), tb(bar), 8 * SPB, 0.45, 0.8, formants=S.FORMANTS_OH)
    for bar in range(12, 20):
        chord(tones(chord_at(bar), 52, 70), tb(bar), 4 * SPB, 0.55, 0.3)
    # b: staccato chant on the 2+2+3 accents
    for bar in range(20, 28):
        name = chord_at(bar)
        ns = tones(name, 55, 67)[:3] + [48]
        for step, v in ((0, 0.75), (4, 0.55), (8, 0.65)):
            dur = (0.35 if step < 8 else 0.6) * SPB
            chord(ns, tb(bar, step * 0.25), dur, v * dyn(bar), 0.02, release=0.25,
                  formants=S.FORMANTS_OH, voices=3)
    for bar in range(28, 36):
        for b0, name in HARM[bar]:
            end = HARM[bar][1][0] if (b0 == 0.0 and len(HARM[bar]) > 1) else 4.0
            chord(tones(name, 53, 72), tb(bar, b0), (end - b0) * SPB, 0.48 + 0.025 * (bar - 28), 0.25)
    for bar in range(36, 48):
        for b0, name in HARM[bar]:
            end = HARM[bar][1][0] if (b0 == 0.0 and len(HARM[bar]) > 1) else 4.0
            chord(tones(name, 55, 74), tb(bar, b0), (end - b0) * SPB, 0.62, 0.15)
    return tr


def render_organ():
    rng = np.random.default_rng(38)
    tr = S.Track(N_LOOP, N_TAIL)
    for m in (36, 48, 55, 60, 63, 67):
        tr.add(S.organ_note(m, 2.5 * SPB, 0.8, rng, release=1.5), tb(0), pan=0.0)
    for bar in range(20, 28):
        name = chord_at(bar)
        ns = [36] + tones(name, 55, 70)[:4]
        for m in ns:
            tr.add(S.organ_note(m, blen(bar) - 0.03, 0.5, rng, stops=S.ORGAN_SOFT, attack=0.12,
                                release=0.4), tb(bar), pan=-0.1 if m < 60 else 0.2)
    for bar in range(36, 48):
        for b0, name in HARM[bar]:
            end = HARM[bar][1][0] if (b0 == 0.0 and len(HARM[bar]) > 1) else 4.0
            ns = [CHORDS[name][0]] + tones(name, 52, 67)[:3]
            for m in ns:
                tr.add(S.organ_note(m, (end - b0) * SPB - 0.02, 0.4, rng, release=0.5),
                       tb(bar, b0), pan=0.0)
    return tr


def render_bells():
    rng = np.random.default_rng(39)
    tr = S.Track(N_LOOP, N_TAIL)
    tolls = [(0, 0, 48, 1.0), (0, 0, 60, 0.5), (20, 0, 48, 0.8), (21, 0, 49, 0.65),
             (22, 0, 48, 0.8), (23, 0, 47, 0.65), (24, 0, 48, 0.8), (25, 0, 49, 0.65),
             (26, 0, 44, 0.75), (27, 0, 43, 0.75), (28, 0, 48, 0.7), (31, 0, 48, 0.7),
             (44, 0, 44, 0.6), (47, 0, 43, 0.75)]
    for bar, beat, m, v in tolls:
        tr.add(S.bell(m, v, rng, decay=4.5), tb(bar, beat), pan=0.0 if m < 55 else 0.3)
    return tr


def render_taiko():
    rng = np.random.default_rng(40)
    tr = S.Track(N_LOOP, N_TAIL)
    big = lambda v: S.drum(92.0, 48.0, 0.45, v, rng, noise_amt=0.35)
    mid = lambda v: S.drum(185.0, 120.0, 0.16, v, rng, noise_amt=0.5, noise_fc=2200.0)
    boom = lambda v: S.drum(62.0, 38.0, 0.9, v, rng, noise_amt=0.15, noise_fc=600.0)
    pat_a = ({0: 1.0, 6: 0.8, 8: 0.9, 14: 0.7}, {3: 0.45, 11: 0.5, 12: 0.4})
    pat_full = ({0: 1.0, 3: 0.75, 6: 0.85, 8: 0.95, 11: 0.75, 14: 0.8},
                {2: 0.45, 5: 0.45, 7: 0.4, 10: 0.5, 13: 0.5, 15: 0.6})
    pat_b = ({0: 1.0, 8: 0.85}, {2: 0.25, 4: 0.6, 6: 0.25, 10: 0.5, 12: 0.55})
    fills = {3: 0, 11: 12, 19: 8, 27: 8, 35: 0, 39: 12, 43: 8, 47: 0}
    booms = {0: 1.0, 4: 0.6, 12: 0.6, 20: 0.7, 24: 0.6, 28: 0.65, 36: 0.85, 40: 0.85, 44: 0.6}
    for bar in range(BARS):
        sec = section(bar)
        d = dyn(bar)
        steps = int(round(METER[bar] * 4))
        if bar == 0:
            bigp, midp = {0: 1.0}, {}
        elif sec == 'intro':
            bigp, midp = {0: 0.6, 8: 0.5}, {}
        elif sec == 'b':
            bigp, midp = pat_b
        elif sec in ('a1', 'a2'):
            bigp, midp = pat_full if (sec == 'a2' and bar % 2) else pat_a
        else:
            bigp, midp = pat_full
        f0 = fills.get(bar)
        for step, v in bigp.items():
            if f0 == 0 and step > 0:
                continue
            tr.add(big(S.hvel(rng, v * d)), tb(bar, step * 0.25) + S.humanize(rng), pan=0.0)
        for step, v in midp.items():
            if f0 is not None and step >= f0:
                continue
            tr.add(mid(S.hvel(rng, v * d)), tb(bar, step * 0.25) + S.humanize(rng),
                   pan=-0.4 if step % 2 else 0.4)
        if f0 is not None:
            if f0 == 0:
                fs = np.concatenate([np.arange(0, steps // 2, 2.0), np.arange(steps // 2, steps, 1.0)])
            else:
                fs = np.arange(f0, steps, 1.0)
            for i, st in enumerate(fs):
                prog = (st - fs[0]) / (steps - fs[0])
                tr.add(mid(S.hvel(rng, (0.3 + 0.65 * prog) * d)), tb(bar, st * 0.25) + S.humanize(rng, 0.002),
                       pan=-0.35 if i % 2 else 0.35)
        if bar in booms:
            tr.add(boom(booms[bar]), tb(bar), pan=0.0)
    # climax: extra big hits filling the rest on beat 4 of the leitmotiv's first bar
    for bar in (36, 40):
        for off in (3.0, 3.5):
            tr.add(big(0.8), tb(bar, off), pan=0.0)
    return tr


def render_cymbals():
    rng = np.random.default_rng(41)
    tr = S.Track(N_LOOP, N_TAIL)
    for bar, v in ((0, 1.0), (4, 0.6), (12, 0.7), (20, 0.6), (28, 0.75), (32, 0.6), (36, 1.0),
                   (40, 0.95), (44, 0.7)):
        tr.add(S.cymbal(rng, decay=1.8 if bar in (0, 36) else 1.4, vel=v), tb(bar))
    for bar, beats, v in ((4, 2, 0.35), (12, 2, 0.4), (20, 2, 0.4), (28, 3.5, 0.5),
                          (36, 4, 0.8), (40, 2, 0.6), (48, 4, 0.75)):
        sw = beats * SPB
        tr.add(S.cymbal(rng, swell=sw, vel=v), tb(bar) - sw)
    return tr


# name: (render fn, gain, reverb send, hp, lp)
TRACKS = {
    'ostinato': (render_ostinato, 0.5, 0.25, 40.0, 6000.0),
    'violins': (render_violins, 0.3, 0.45, 250.0, 6500.0),
    'strings_sus': (render_strings_sus, 0.45, 0.5, 120.0, 6000.0),
    'low_brass': (render_low_brass, 0.36, 0.35, 32.0, 5500.0),
    'horns': (render_horns, 0.76, 0.45, 80.0, 5000.0),
    'trumpets': (render_trumpets, 0.47, 0.5, 220.0, 5500.0),
    'choir': (render_choir, 0.55, 0.6, 100.0, 5500.0),
    'organ': (render_organ, 0.3, 0.55, 35.0, 5000.0),
    'bells': (render_bells, 0.3, 0.8, 60.0, 6000.0),
    'taiko': (render_taiko, 0.55, 0.3, 38.0, 7000.0),
    'cymbals': (render_cymbals, 0.5, 0.45, 300.0, 9500.0),
}
SENDS = {k: v[2] for k, v in TRACKS.items()}


def run_track(name):
    fn, gain, _send, hp, lp = TRACKS[name]
    return S.finish_track(fn(), gain, hp, lp)


if __name__ == '__main__':
    print(f'III: {BARS} bars ({TOTAL_BEATS:g} beats) at {BPM} BPM = {N_LOOP / S.SR:.2f}s, {N_LOOP} samples')
    mix = S.render_song(list(TRACKS), run_track, SENDS, N_LOOP, OUT, rt60=3.0, reverb_seed=13)
    with open(OUT + '.loop.txt', 'w') as fh:
        fh.write(f'{N_LOOP}\n')
    m = mix.mean(axis=0)
    per = [S.db(np.sqrt((m[int(tb(b) * S.SR):int(tb(b + 1) * S.SR)] ** 2).mean())) for b in range(BARS)]
    print('   per-bar dB: ' + ' '.join('%.0f' % v for v in per))
    hi = S.fft_filter(mix, lambda f: S.hp_mag(f, 4000.0, 4))
    per_hi = [S.db(np.sqrt((hi[:, int(tb(b) * S.SR):int(tb(b + 1) * S.SR)] ** 2).mean())) for b in range(BARS)]
    print('   per-bar >4k dB: ' + ' '.join('%.0f' % v for v in per_hi))
