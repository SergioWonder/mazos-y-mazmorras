"""Boss theme A - "Warlord": orchestral battle epic in D minor, 140 BPM, 40 bars.

Form: intro (4) | A1 low brass theme (8) | A2 horns + trombones, choir (8) |
B bridge, high strings melody over brass stabs (8) | A3 tutti climax (8) |
turnaround (4) ending on the dominant, which falls back into the intro.
Driving 16th-note low string ostinato with 3-3-2 accents, taikos and cymbals.
"""
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import synth as S  # noqa: E402

BPM = 140
SPB = 60.0 / BPM
BARS = 40
N_LOOP = int(round(BARS * 4 * SPB * S.SR))
N_TAIL = int(4.0 * S.SR)
OUT = os.path.join(HERE, 'jefe-a')


def tb(bar, beat=0.0):
    return (bar * 4 + beat) * SPB


CHORDS = {
    'Dm': (38, (0, 3, 7)), 'Bb': (34, (0, 4, 7)), 'C': (36, (0, 4, 7)),
    'A': (33, (0, 4, 7)), 'A7': (33, (0, 4, 7, 10)), 'Gm': (43, (0, 3, 7)),
    'Eb': (39, (0, 4, 7)),
}
A_PROG = ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Gm', 'A', 'A']
PROG = (['Dm', 'Dm', 'Bb', 'A'] + A_PROG + A_PROG
        + ['Bb', 'C', 'A', 'Dm', 'Bb', 'Gm', 'Eb', 'A'] + A_PROG + ['Dm', 'Bb', 'Gm', 'A7'])
assert len(PROG) == BARS


def section(bar):
    for name, end in (('intro', 4), ('a1', 12), ('a2', 20), ('b', 28), ('a3', 36), ('turn', 40)):
        if bar < end:
            return name


def tones(name, lo, hi):
    root, iv = CHORDS[name]
    pcs = {(root + i) % 12 for i in iv}
    return [m for m in range(lo, hi + 1) if m % 12 in pcs]


# (midi or None, beats) - 8 bars each
THEME_HEAD = [(62, 1.5), (62, 0.5), (69, 2), (67, 1), (65, 0.5), (67, 0.5), (69, 2),
              (70, 1.5), (69, 0.5), (67, 1), (65, 1), (64, 1), (67, 1), (72, 2),
              (74, 1.5), (72, 0.5), (69, 2), (70, 1), (69, 0.5), (67, 0.5), (74, 2),
              (73, 1.5), (69, 0.5), (64, 1), (67, 1)]
THEME_ENDS = {'a1': [(69, 3), (None, 1)],
              'a2': [(69, 2), (73, 1), (76, 1)],
              'a3': [(76, 2), (73, 1), (69, 1)]}
B_MELODY = [(77, 2), (74, 1), (70, 1), (76, 2), (72, 2), (73, 2), (76, 1), (81, 1),
            (77, 3), (76, 0.5), (74, 0.5), (74, 2), (77, 1), (82, 1), (81, 2), (79, 1), (74, 1),
            (79, 2), (82, 1), (79, 1), (81, 4)]


def line_events(notes, start_bar):
    beat = 0.0
    for m, d in notes:
        if m is not None:
            yield tb(start_bar, beat), m, d * SPB
        beat += d


def theme(sec):
    return THEME_HEAD + THEME_ENDS[sec]


def dyn(bar):
    """Global dynamic curve used by the ostinato and percussion."""
    sec = section(bar)
    return {'intro': 0.72 + 0.04 * bar, 'a1': 0.75, 'a2': 0.85,
            'b': 0.72 + 0.03 * (bar - 20), 'a3': 1.0, 'turn': 0.88}[sec]


ACCENTS = {0, 3, 6, 8, 11, 14}


# ---------------------------------------------------------------- tracks

def render_ostinato():
    rng = np.random.default_rng(11)
    tr = S.Track(N_LOOP, N_TAIL)
    cache = {}
    for bar in range(BARS):
        root, iv = CHORDS[PROG[bar]]
        sec = section(bar)
        third = iv[1]
        if sec == 'b':
            pat = [0, 0, 7, 0, 0, third, 0, 7, 0, 0, 12, 0, 7, 0, third, 0]
        elif sec == 'turn' or bar % 2 == 1:
            pat = [0, 0, 12, 0, 0, 12, 0, 0, 0, 0, 12, 7, 0, 12, 0, 12]
        else:
            pat = [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 0, 12, 7, 12]
        for step, off in enumerate(pat):
            if sec == 'intro' and bar < 1 and step % 2:
                continue  # intro starts in 8ths
            acc = step in ACCENTS
            midi = root + off
            key = (midi, acc)
            if key not in cache:
                cache[key] = S.strings_note(midi, 0.085, 1.0, rng, voices=3, attack=0.005,
                                            release=0.12, bright=1.1 if acc else 0.75, vib=False)
            v = S.hvel(rng, dyn(bar) * (1.0 if acc else 0.55))
            t = tb(bar, step * 0.25) + S.humanize(rng, 0.002, 0.006)
            tr.add(cache[key] * v, t, pan=-0.2)
            # violas double an octave up in the loud sections
            if sec in ('a2', 'a3', 'turn') and acc:
                k2 = (midi + 12, True)
                if k2 not in cache:
                    cache[k2] = S.strings_note(midi + 12, 0.085, 1.0, rng, voices=3, attack=0.005,
                                               release=0.12, bright=0.8, vib=False)
                tr.add(cache[k2] * v * 0.45, t + 0.003, pan=0.3)
    return tr


def render_low_brass():
    rng = np.random.default_rng(12)
    tr = S.Track(N_LOOP, N_TAIL)
    # intro swells on the chord roots
    for bar, beats, root, vel in ((0, 8, 50, 0.85), (2, 4, 46, 0.9), (3, 4, 45, 1.0)):
        dur = beats * SPB - 0.05
        for m, kind, g in ((root, 'trombone', 1.0), (root - 12, 'tuba', 0.8)):
            tr.add(S.brass_note(m, dur, vel, rng, kind=kind, swell=dur * 0.9) * g, tb(bar), pan=0.15)
    # theme in trombones an octave down (A1, A2, A3)
    for sec, start in (('a1', 4), ('a2', 12), ('a3', 28)):
        vel = {'a1': 0.8, 'a2': 0.85, 'a3': 0.95}[sec]
        for t, m, d in line_events(theme(sec), start):
            tr.add(S.brass_note(m - 12, d * 0.95, S.hvel(rng, vel), rng, kind='trombone'),
                   t + S.humanize(rng), pan=0.2)
            if d >= 1.9 * SPB:  # tuba reinforces long notes
                tr.add(S.brass_note(m - 24, d * 0.95, vel * 0.7, rng, kind='tuba'), t, pan=0.1)
    # B and turnaround: chord stabs
    for bar in range(20, 28):
        vel = 0.6 + 0.04 * (bar - 20)
        for beat, d in ((0.0, 0.35), (1.5, 0.3), (2.5, 0.3)):
            for m in tones(PROG[bar], 45, 57)[:3]:
                tr.add(S.brass_note(m, d * SPB, S.hvel(rng, vel), rng, kind='trombone', voices=2),
                       tb(bar, beat) + S.humanize(rng), pan=0.25)
    for bar in range(36, 40):
        stabs = ((0.0, 0.4), (0.75, 0.4), (1.5, 0.4), (2.0, 1.8)) if bar < 39 else ((0.0, 3.8),)
        for beat, d in stabs:
            for m in tones(PROG[bar], 45, 59)[:3]:
                sw = d * SPB * 0.9 if bar == 39 else 0.0
                tr.add(S.brass_note(m, d * SPB, S.hvel(rng, 0.85), rng, kind='trombone',
                                    voices=2, swell=sw), tb(bar, beat) + S.humanize(rng), pan=0.25)
            tr.add(S.brass_note(tones(PROG[bar], 33, 44)[0], d * SPB, 0.7, rng, kind='tuba'),
                   tb(bar, beat), pan=0.1)
    return tr


def render_horns():
    rng = np.random.default_rng(13)
    tr = S.Track(N_LOOP, N_TAIL)
    for sec, start, vel in (('a2', 12, 0.8), ('a3', 28, 0.95)):
        for t, m, d in line_events(theme(sec), start):
            tr.add(S.brass_note(m, d * 0.95, S.hvel(rng, vel), rng, kind='horn', voices=4),
                   t + S.humanize(rng), pan=-0.3)
    # B: sustained counter-line on chord tones near F4
    for bar in range(20, 28):
        m = min(tones(PROG[bar], 58, 70), key=lambda x: abs(x - 64))
        vel = 0.5 + 0.05 * (bar - 20)
        tr.add(S.brass_note(m, 4 * SPB - 0.06, vel, rng, kind='horn', voices=4, swell=1.2),
               tb(bar), pan=-0.3)
    # turnaround: horns on top of the stabs
    for bar in range(36, 40):
        m = min(tones(PROG[bar], 60, 70), key=lambda x: abs(x - 65))
        tr.add(S.brass_note(m, 4 * SPB - 0.06, 0.75, rng, kind='horn', voices=4,
                            swell=3.5 if bar == 39 else 0.0), tb(bar), pan=-0.3)
    return tr


def render_trumpets():
    rng = np.random.default_rng(14)
    tr = S.Track(N_LOOP, N_TAIL)
    # climax only: theme an octave up, softened
    for t, m, d in line_events(theme('a3'), 28):
        tr.add(S.brass_note(m + 12, d * 0.9, S.hvel(rng, 0.7), rng, kind='trumpet', voices=3),
               t + S.humanize(rng), pan=0.35)
    return tr


def render_strings():
    rng = np.random.default_rng(15)
    tr = S.Track(N_LOOP, N_TAIL)
    # intro: high tremolo pedal building tension
    for bar in range(4):
        for m in (74, 69):
            tr.add(S.strings_note(m, 4 * SPB, 0.25 + 0.08 * bar, rng, voices=4, attack=0.3,
                                  tremolo=18.0, bright=0.6) * 1.4, tb(bar), pan=0.35)
    # A1: soft legato chord pad
    for bar in range(4, 12):
        for m in tones(PROG[bar], 50, 65):
            tr.add(S.strings_note(m, 4 * SPB, 0.3, rng, voices=3, attack=0.25, release=0.5,
                                  bright=0.5), tb(bar), pan=0.25)
    # B: violins carry the melody (octave doubled softly below)
    for t, m, d in line_events(B_MELODY, 20):
        vel = S.hvel(rng, 0.7)
        tr.add(S.strings_note(m, d, vel, rng, voices=5, attack=0.12, release=0.45, bright=0.8),
               t + S.humanize(rng), pan=-0.35)
        tr.add(S.strings_note(m - 12, d, vel * 0.55, rng, voices=4, attack=0.12, release=0.45,
                              bright=0.7), t + S.humanize(rng), pan=0.3)
    # A3: high tremolo chords for energy
    for bar in range(28, 36):
        for m in tones(PROG[bar], 69, 81)[:3]:
            tr.add(S.strings_note(m, 4 * SPB, 0.4, rng, voices=4, attack=0.1, tremolo=17.5,
                                  bright=0.55), tb(bar), pan=0.4)
    return tr


def render_choir():
    rng = np.random.default_rng(16)
    tr = S.Track(N_LOOP, N_TAIL)
    for bar in range(BARS):
        sec = section(bar)
        if sec == 'a2':
            lo, hi, vel = 57, 72, 0.5
        elif sec == 'b':
            lo, hi, vel = 50, 65, 0.4
        elif sec == 'a3':
            lo, hi, vel = 57, 77, 0.7
        elif sec == 'turn':
            lo, hi, vel = 50, 69, 0.55
        else:
            lo, hi, vel = 50, 65, 0.3 + 0.03 * bar
        for m in tones(PROG[bar], lo, hi):
            pan = float(np.clip((m - 64) / 20.0, -0.6, 0.6))
            tr.add(S.choir_note(m, 4 * SPB, vel, rng, attack=0.35, release=0.9), tb(bar), pan=pan)
    return tr


def render_taiko():
    rng = np.random.default_rng(17)
    tr = S.Track(N_LOOP, N_TAIL)
    big = lambda v: S.drum(95.0, 50.0, 0.42, v, rng, noise_amt=0.35)
    mid = lambda v: S.drum(190.0, 125.0, 0.16, v, rng, noise_amt=0.5, noise_fc=2200.0)
    boom = lambda v: S.drum(68.0, 42.0, 0.7, v, rng, noise_amt=0.15, noise_fc=600.0)
    patterns = {
        'intro': ({0: 1.0, 6: 0.6, 8: 0.8}, {11: 0.4, 14: 0.45}),
        'a1': ({0: 1.0, 6: 0.8, 8: 0.9}, {3: 0.5, 11: 0.5, 14: 0.6}),
        'a2': ({0: 1.0, 3: 0.7, 6: 0.8, 8: 0.9, 11: 0.7}, {2: 0.4, 5: 0.4, 10: 0.45, 13: 0.5, 14: 0.55, 15: 0.6}),
        'b': ({0: 1.0, 8: 0.85}, {4: 0.45, 6: 0.4, 12: 0.5, 14: 0.45}),
        'a3': ({0: 1.0, 3: 0.75, 6: 0.85, 8: 0.95, 11: 0.75, 14: 0.8}, {2: 0.45, 5: 0.45, 7: 0.4, 10: 0.5, 13: 0.5, 15: 0.6}),
        'turn': ({0: 1.0, 6: 0.85, 8: 0.9, 14: 0.8}, {3: 0.5, 11: 0.55}),
    }
    fills = {11: 8, 27: 0, 35: 8, 39: 8, 3: 12, 19: 12}  # bar -> first 16th of a mid-taiko fill
    for bar in range(BARS):
        sec = section(bar)
        bigp, midp = patterns[sec]
        d = dyn(bar)
        for step, v in bigp.items():
            tr.add(big(S.hvel(rng, v * d)), tb(bar, step * 0.25) + S.humanize(rng), pan=0.0)
        fill_from = fills.get(bar)
        for step, v in midp.items():
            if fill_from is not None and step >= fill_from:
                continue
            tr.add(mid(S.hvel(rng, v * d)), tb(bar, step * 0.25) + S.humanize(rng),
                   pan=-0.4 if step % 2 else 0.4)
        if fill_from is not None:
            steps = np.arange(fill_from, 16, 0.5 if bar == 27 and fill_from == 0 else 1.0)
            if bar == 27:
                steps = np.concatenate([np.arange(0, 12, 1.0), np.arange(12, 16, 0.5)])
            for i, st in enumerate(steps):
                prog = (st - steps[0]) / max(16 - steps[0], 1)
                tr.add(mid(S.hvel(rng, (0.3 + 0.6 * prog) * d)), tb(bar, st * 0.25) + S.humanize(rng, 0.002),
                       pan=-0.35 if i % 2 else 0.35)
        if bar in (0, 4, 12, 20, 28, 32, 36):
            tr.add(boom(0.6), tb(bar), pan=0.0)
    return tr


def render_cymbals():
    rng = np.random.default_rng(18)
    tr = S.Track(N_LOOP, N_TAIL)
    for bar, v in ((12, 0.8), (20, 0.55), (28, 1.0), (32, 0.8), (36, 0.7), (4, 0.6)):
        tr.add(S.cymbal(rng, decay=1.6, vel=v), tb(bar))
    for bar, beats, v in ((11, 2, 0.5), (27, 4, 0.7), (3, 2, 0.35), (19, 2, 0.4)):
        sw = beats * SPB
        tr.add(S.cymbal(rng, swell=sw, vel=v), tb(bar + 1) - sw)
    return tr


# name: (render fn, gain, reverb send, hp, lp)
TRACKS = {
    'ostinato': (render_ostinato, 0.55, 0.25, 45.0, 6000.0),
    'low_brass': (render_low_brass, 0.38, 0.35, 35.0, 6000.0),
    'horns': (render_horns, 0.75, 0.45, 80.0, 5000.0),
    'trumpets': (render_trumpets, 0.45, 0.5, 200.0, 6000.0),
    'strings': (render_strings, 0.7, 0.5, 80.0, 7000.0),
    'choir': (render_choir, 0.6, 0.6, 90.0, 6000.0),
    'taiko': (render_taiko, 0.55, 0.3, 42.0, 7000.0),
    'cymbals': (render_cymbals, 0.6, 0.45, 300.0, 9500.0),
}
SENDS = {k: v[2] for k, v in TRACKS.items()}


def run_track(name):
    fn, gain, _send, hp, lp = TRACKS[name]
    return S.finish_track(fn(), gain, hp, lp)


if __name__ == '__main__':
    print(f'A: {BARS} bars at {BPM} BPM = {N_LOOP / S.SR:.2f}s')
    S.render_song(list(TRACKS), run_track, SENDS, N_LOOP, OUT, rt60=2.4)
