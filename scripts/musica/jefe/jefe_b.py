"""Boss theme B - "Omen": dark ritual tension in E Phrygian, 132 BPM, 40 bars.

Form: P1 contained (8): heartbeat, low pulse, dissonant 'aah' cluster, distant
bells | P2 build (8): 16th ostinato on an E pedal with the Phrygian F, brass
laments | P3 intensify (8): moving bass, rising string tremolo, taikos |
Climax (10): brass theme, choir, full percussion, Phrygian cadence F -> E |
Fall (6): one huge hit on E major, silence, and the heartbeat returns so the
loop falls back into P1 with the same texture.
"""
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import synth as S  # noqa: E402

BPM = 132
SPB = 60.0 / BPM
BARS = 40
N_LOOP = int(round(BARS * 4 * SPB * S.SR))
N_TAIL = int(4.5 * S.SR)
OUT = os.path.join(HERE, 'jefe-b')


def tb(bar, beat=0.0):
    return (bar * 4 + beat) * SPB


# name: (bass midi, pitch classes of the upper harmony)
CHORDS = {
    'Emb9': (40, (4, 7, 11, 5)), 'Em': (40, (4, 7, 11)), 'F/E': (40, (5, 9, 0)),
    'F': (41, (5, 9, 0)), 'Dm/E': (40, (2, 5, 9)), 'Dm': (38, (2, 5, 9)),
    'E': (40, (4, 8, 11)), 'Am': (45, (9, 0, 4)), 'Bb': (46, (10, 2, 5)), 'C': (36, (0, 4, 7)),
}
PROG = (['Emb9'] * 4 + ['F/E'] * 4
        + ['Em', 'F/E', 'Em', 'F/E', 'Dm/E', 'F/E', 'Em', 'E']
        + ['Am', 'F', 'Dm', 'E', 'Am', 'F', 'Bb', 'E']
        + ['Em', 'F', 'Em', 'Dm', 'C', 'F', 'E', 'E', 'Em', 'F']
        + ['E', 'Em', 'Em', 'F/E', 'Emb9', 'Emb9'])
assert len(PROG) == BARS
HIT = 34


def section(bar):
    for name, end in (('p1', 8), ('p2', 16), ('p3', 24), ('climax', 34), ('fall', 40)):
        if bar < end:
            return name


def tones(name, lo, hi):
    pcs = set(CHORDS[name][1])
    return [m for m in range(lo, hi + 1) if m % 12 in pcs]


CLIMAX_THEME = [(64, 1.5), (65, 0.5), (64, 2), (69, 1), (67, 0.5), (65, 0.5), (72, 2),
                (71, 1.5), (72, 0.5), (71, 1), (67, 1), (69, 1), (65, 1), (62, 2),
                (64, 1.5), (67, 0.5), (72, 2), (74, 1), (72, 0.5), (69, 0.5), (77, 2),
                (76, 3), (68, 1), (71, 1), (68, 1), (65, 1), (64, 1),
                (64, 1.5), (65, 0.5), (67, 1), (65, 1), (65, 4)]


def line_events(notes, start_bar):
    beat = 0.0
    for m, d in notes:
        if m is not None:
            yield tb(start_bar, beat), m, d * SPB
        beat += d


def dyn(bar):
    sec = section(bar)
    if sec == 'p1':
        return 0.4 + 0.012 * bar
    if sec == 'p2':
        return 0.55 + 0.025 * (bar - 8)
    if sec == 'p3':
        return 0.75 + 0.02 * (bar - 16)
    if sec == 'climax':
        return 1.0
    return 1.0 if bar == HIT else 0.34 + 0.015 * (bar - 35)


ACCENTS = {0, 3, 6, 8, 11, 14}


# ---------------------------------------------------------------- tracks

def render_pulse():
    rng = np.random.default_rng(21)
    tr = S.Track(N_LOOP, N_TAIL)
    cache = {}

    def note(midi, acc):
        key = (midi, acc)
        if key not in cache:
            cache[key] = S.strings_note(midi, 0.09, 1.0, rng, voices=3, attack=0.006,
                                        release=0.13, bright=1.0 if acc else 0.7, vib=False)
        return cache[key]

    for bar in range(BARS):
        sec = section(bar)
        root = CHORDS[PROG[bar]][0]
        d = dyn(bar)
        if bar == HIT:
            for m in (40, 52):
                tr.add(S.strings_note(m, 2.5 * SPB, 0.9, rng, voices=4, attack=0.01, release=1.2,
                                      bright=0.9), tb(bar), pan=-0.1)
            continue
        if bar == HIT + 1:
            continue
        if sec in ('p1', 'fall'):
            # contained 8ths, swelling every 2 bars
            for step in range(0, 16, 2):
                wave_ = 0.75 + 0.25 * np.sin(np.pi * ((bar % 2) * 16 + step) / 32.0)
                v = S.hvel(rng, d * wave_ * (1.0 if step % 8 == 0 else 0.7))
                tr.add(note(40, step % 8 == 0) * v, tb(bar, step * 0.25) + S.humanize(rng, 0.002), pan=-0.15)
            continue
        if sec == 'p2':
            pat = [0, 0, 12, 0, 0, 1, 0, 0, 0, 0, 12, 0, 1, 0, 0, 12]
        elif sec == 'p3':
            pat = [0, 0, 12, 0, 0, 12, 0, 0, 0, 0, 12, 0, 0, 12, 7, 12]
        else:
            pat = [0, 0, 12, 0, 1, 0, 12, 0, 0, 0, 12, 1, 0, 12, 0, 13]
        for step, off in enumerate(pat):
            acc = step in ACCENTS
            v = S.hvel(rng, d * (1.0 if acc else 0.55))
            t = tb(bar, step * 0.25) + S.humanize(rng, 0.002, 0.006)
            tr.add(note(root + off, acc) * v, t, pan=-0.2)
            if sec == 'climax' and acc:
                tr.add(note(root + off + 12, True) * v * 0.45, t + 0.003, pan=0.3)
    return tr


def render_heartbeat():
    rng = np.random.default_rng(22)
    tr = S.Track(N_LOOP, N_TAIL)
    for bar in list(range(0, 16)) + list(range(36, 40)):
        d = dyn(bar)
        for beat, v in ((0.0, 0.8), (0.5, 0.55)):
            tr.add(S.drum(72.0, 44.0, 0.35, S.hvel(rng, v * (0.6 + 0.4 * d)), rng, noise_amt=0.12,
                          noise_fc=500.0), tb(bar, beat) + S.humanize(rng, 0.002), pan=0.0)
        if section(bar) == 'p2' or bar % 2 == 1:
            for beat, v in ((2.0, 0.55), (2.5, 0.38)):
                tr.add(S.drum(72.0, 44.0, 0.35, S.hvel(rng, v * (0.6 + 0.4 * d)), rng, noise_amt=0.12,
                              noise_fc=500.0), tb(bar, beat) + S.humanize(rng, 0.002), pan=0.0)
    return tr


def render_choir():
    rng = np.random.default_rng(23)
    tr = S.Track(N_LOOP, N_TAIL)

    def chord(notes, bar, bars, vel, attack, release=1.2):
        for m in notes:
            pan = float(np.clip((m - 62) / 18.0, -0.6, 0.6))
            tr.add(S.choir_note(m, bars * 4 * SPB, S.hvel(rng, vel, 0.04), rng, attack=attack,
                                release=release), tb(bar), pan=pan)

    cluster = (52, 59, 65)          # E3 B3 F4: minor ninth rub
    chord(cluster, 0, 4, 0.34, 2.2)
    chord((52, 57, 60, 65), 4, 4, 0.36, 1.5)  # F triad over the E pedal
    for bar in range(8, 16, 2):
        name = PROG[bar]
        vel = 0.4 + 0.02 * (bar - 8)
        notes = tones(name, 52, 69) + ([65, 77] if name == 'Em' else [76])
        chord(notes, bar, 1, vel, 0.8)
        chord(tones(PROG[bar + 1], 52, 71), bar + 1, 1, vel + 0.03, 0.5)
    for bar in range(16, 24):
        chord(tones(PROG[bar], 55, 74), bar, 1, 0.5 + 0.02 * (bar - 16), 0.35)
    for bar in range(24, 34):
        chord(tones(PROG[bar], 55, 79), bar, 1, 0.68, 0.25)
    chord(tones('E', 52, 76), HIT, 0.75, 0.75, 0.05, release=3.0)
    chord(cluster, 36, 4, 0.3, 2.5, release=1.6)
    return tr


def render_bells():
    rng = np.random.default_rng(24)
    tr = S.Track(N_LOOP, N_TAIL)
    distant = [(0, 0, 76), (1, 2, 71), (2, 0, 77), (3, 2, 76), (4, 0, 72), (5, 2, 71),
               (6, 0, 77), (7, 0, 75), (7, 2, 76), (8, 0, 76), (10, 0, 77), (12, 0, 76),
               (14, 0, 77), (36, 0, 76), (37, 2, 71), (38, 0, 77), (39, 2, 75)]
    for bar, beat, m in distant:
        tr.add(S.bell(m, S.hvel(rng, 0.55), rng, decay=3.5), tb(bar, beat), pan=0.35 if m > 73 else -0.3)
    # doom toll on the climax downbeats and the final hit
    for bar in (24, 28, 32, HIT):
        tr.add(S.bell(52, 0.8, rng, decay=5.0), tb(bar), pan=0.0)
    return tr


def render_low_brass():
    rng = np.random.default_rng(25)
    tr = S.Track(N_LOOP, N_TAIL)
    laments = [(8, 8, 52, 0.55), (10, 4, 53, 0.6), (11, 4, 52, 0.6), (12, 8, 50, 0.68),
               (14, 4, 52, 0.72), (15, 4, 56, 0.8)]
    for bar, beats, m, vel in laments:
        dur = beats * SPB - 0.05
        tr.add(S.brass_note(m, dur, vel, rng, kind='trombone', swell=dur * 0.7), tb(bar), pan=0.2)
        tr.add(S.brass_note(m - 12, dur, vel * 0.7, rng, kind='tuba', swell=dur * 0.7), tb(bar), pan=0.1)
    for bar in range(16, 23):
        vel = 0.6 + 0.035 * (bar - 16)
        for beat, d in ((0.0, 0.5), (1.5, 0.35), (3.0, 0.35)):
            for m in tones(PROG[bar], 47, 59)[:3]:
                tr.add(S.brass_note(m, d * SPB, S.hvel(rng, vel), rng, kind='trombone', voices=2),
                       tb(bar, beat) + S.humanize(rng), pan=0.25)
    for m in tones('E', 47, 59)[:3]:
        dur = 4 * SPB - 0.05
        tr.add(S.brass_note(m, dur, 0.9, rng, kind='trombone', swell=dur * 0.95), tb(23), pan=0.25)
    for t, m, d in line_events(CLIMAX_THEME, 24):
        tr.add(S.brass_note(m - 12, d * 0.95, S.hvel(rng, 0.9), rng, kind='trombone'),
               t + S.humanize(rng), pan=0.2)
        if d >= 1.9 * SPB:
            tr.add(S.brass_note(m - 24, d * 0.95, 0.65, rng, kind='tuba'), t, pan=0.1)
    for m, kind in ((52, 'trombone'), (56, 'trombone'), (59, 'trombone'), (40, 'tuba')):
        tr.add(S.brass_note(m, 2 * SPB, 1.0, rng, kind=kind, release=1.0), tb(HIT), pan=0.2)
    return tr


def render_horns():
    rng = np.random.default_rng(26)
    tr = S.Track(N_LOOP, N_TAIL)
    for bar in range(16, 24):
        m = min(tones(PROG[bar], 62, 72), key=lambda x: abs(x - 67))
        tr.add(S.brass_note(m, 4 * SPB - 0.06, 0.5 + 0.05 * (bar - 16), rng, kind='horn', voices=4,
                            swell=2.0), tb(bar), pan=-0.3)
    for t, m, d in line_events(CLIMAX_THEME, 24):
        tr.add(S.brass_note(m, d * 0.95, S.hvel(rng, 0.9), rng, kind='horn', voices=4),
               t + S.humanize(rng), pan=-0.3)
    for m in (64, 68, 71):
        tr.add(S.brass_note(m, 2 * SPB, 0.95, rng, kind='horn', voices=4, release=1.0), tb(HIT), pan=-0.3)
    return tr


def render_trumpets():
    rng = np.random.default_rng(27)
    tr = S.Track(N_LOOP, N_TAIL)
    for t, m, d in line_events(CLIMAX_THEME, 24):
        if t >= tb(28):
            tr.add(S.brass_note(m, d * 0.9, S.hvel(rng, 0.75), rng, kind='trumpet'),
                   t + S.humanize(rng), pan=0.35)
    for m in (68, 71, 76):
        tr.add(S.brass_note(m, 2 * SPB, 0.8, rng, kind='trumpet', release=0.9), tb(HIT), pan=0.35)
    return tr


def render_strings():
    rng = np.random.default_rng(28)
    tr = S.Track(N_LOOP, N_TAIL)
    # low pedal under the contained sections
    for bar, bars in ((0, 8), (8, 8), (36, 4)):
        for m in (40, 47):
            tr.add(S.strings_note(m, bars * 4 * SPB, 0.28, rng, voices=4, attack=1.5, release=1.5,
                                  bright=0.45, spread=6.0), tb(bar), pan=0.1)
    # eerie high tremolo semitone
    for m in (76, 77):
        tr.add(S.strings_note(m, 16 * SPB, 0.22, rng, voices=4, attack=4.0, release=1.0,
                              tremolo=17.6, bright=0.45), tb(12), pan=0.4)
    # rising tremolo line in P3
    tops = [76, 77, 77, 80, 81, 81, 82, 83]
    for i, bar in enumerate(range(16, 24)):
        for m in (tops[i], tops[i] - 12, tops[i] - 5):
            tr.add(S.strings_note(m, 4 * SPB, 0.3 + 0.03 * i, rng, voices=4, attack=0.15,
                                  tremolo=17.6, bright=0.55), tb(bar), pan=0.4 if m == tops[i] else -0.3)
    # climax: high sustained harmony
    for bar in range(24, 34):
        for m in tones(PROG[bar], 69, 83)[:3]:
            tr.add(S.strings_note(m, 4 * SPB, 0.42, rng, voices=4, attack=0.12, release=0.4,
                                  bright=0.55, tremolo=17.6 if bar % 2 else 0.0), tb(bar), pan=0.4)
    tr.add(S.strings_note(76, 3 * SPB, 0.4, rng, voices=4, attack=0.01, release=2.0, tremolo=17.6,
                          bright=0.6), tb(HIT), pan=0.4)
    return tr


def render_taiko():
    rng = np.random.default_rng(29)
    tr = S.Track(N_LOOP, N_TAIL)
    big = lambda v: S.drum(92.0, 48.0, 0.45, v, rng, noise_amt=0.35)
    mid = lambda v: S.drum(185.0, 120.0, 0.16, v, rng, noise_amt=0.5, noise_fc=2200.0)
    boom = lambda v: S.drum(66.0, 40.0, 0.8, v, rng, noise_amt=0.15, noise_fc=600.0)
    for bar in range(12, 16):
        tr.add(big(S.hvel(rng, 0.55 + 0.05 * (bar - 12))), tb(bar), pan=0.0)
        if bar >= 14:
            for step in range(2, 16, 2):
                tr.add(mid(S.hvel(rng, 0.2 + 0.02 * step)), tb(bar, step * 0.25) + S.humanize(rng),
                       pan=0.35 if step % 4 else -0.35)
    fills = {19: 12, 23: 0, 27: 8, 31: 8, 33: 0}
    for bar in range(16, 34):
        sec = section(bar)
        d = dyn(bar)
        if sec == 'p3':
            bigp, midp = {0: 1.0, 6: 0.8, 8: 0.9, 14: 0.75}, {3: 0.45, 11: 0.5, 12: 0.4}
        else:
            bigp = {0: 1.0, 3: 0.75, 6: 0.85, 8: 0.95, 11: 0.75, 14: 0.8}
            midp = {2: 0.45, 5: 0.45, 7: 0.4, 10: 0.5, 13: 0.5, 15: 0.6}
        fill_from = fills.get(bar)
        for step, v in bigp.items():
            if fill_from == 0 and step > 0:
                continue
            tr.add(big(S.hvel(rng, v * d)), tb(bar, step * 0.25) + S.humanize(rng), pan=0.0)
        for step, v in midp.items():
            if fill_from is not None and step >= fill_from:
                continue
            tr.add(mid(S.hvel(rng, v * d)), tb(bar, step * 0.25) + S.humanize(rng),
                   pan=-0.4 if step % 2 else 0.4)
        if fill_from is not None:
            if fill_from == 0:
                steps = np.concatenate([np.arange(0, 8, 1.0), np.arange(8, 16, 0.5)])
            else:
                steps = np.arange(fill_from, 16, 1.0)
            for i, st in enumerate(steps):
                prog = (st - steps[0]) / (16 - steps[0])
                tr.add(mid(S.hvel(rng, (0.25 + 0.7 * prog) * d)), tb(bar, st * 0.25) + S.humanize(rng, 0.002),
                       pan=-0.35 if i % 2 else 0.35)
        if bar in (16, 24, 28, 32):
            tr.add(boom(0.6), tb(bar), pan=0.0)
    tr.add(big(1.0), tb(HIT), pan=0.0)
    tr.add(boom(0.85), tb(HIT), pan=0.0)
    return tr


def render_cymbals():
    rng = np.random.default_rng(30)
    tr = S.Track(N_LOOP, N_TAIL)
    for bar, v in ((16, 0.5), (24, 1.0), (28, 0.75), (32, 0.8), (HIT, 1.0)):
        tr.add(S.cymbal(rng, decay=1.8 if bar == HIT else 1.5, vel=v), tb(bar))
    for bar, beats, v in ((15, 2, 0.35), (23, 4, 0.7), (33, 4, 0.8)):
        sw = beats * SPB
        tr.add(S.cymbal(rng, swell=sw, vel=v), tb(bar + 1) - sw)
    return tr


# name: (render fn, gain, reverb send, hp, lp)
TRACKS = {
    'pulse': (render_pulse, 0.55, 0.25, 40.0, 6000.0),
    'heartbeat': (render_heartbeat, 0.55, 0.3, 30.0, 3000.0),
    'choir': (render_choir, 0.7, 0.6, 90.0, 6000.0),
    'bells': (render_bells, 0.3, 0.9, 150.0, 7000.0),
    'low_brass': (render_low_brass, 0.4, 0.35, 35.0, 6000.0),
    'horns': (render_horns, 0.7, 0.45, 80.0, 5000.0),
    'trumpets': (render_trumpets, 0.4, 0.5, 200.0, 6000.0),
    'strings': (render_strings, 0.7, 0.5, 40.0, 7000.0),
    'taiko': (render_taiko, 0.55, 0.3, 42.0, 7000.0),
    'cymbals': (render_cymbals, 0.6, 0.45, 300.0, 9500.0),
}
SENDS = {k: v[2] for k, v in TRACKS.items()}


def run_track(name):
    fn, gain, _send, hp, lp = TRACKS[name]
    return S.finish_track(fn(), gain, hp, lp)


if __name__ == '__main__':
    print(f'B: {BARS} bars at {BPM} BPM = {N_LOOP / S.SR:.2f}s')
    S.render_song(list(TRACKS), run_track, SENDS, N_LOOP, OUT, rt60=2.9, reverb_seed=11)
