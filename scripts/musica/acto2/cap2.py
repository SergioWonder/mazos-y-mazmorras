"""Act II normal combat: "Marcha de los huesos" (La Cripta / El Templo Oscuro).

Spooky-but-friendly mischief: a tiptoeing skeleton march in D dorian, 4/4 at
104 BPM, 32 bars (~73.8 s), seamless loop.
Form: A (bassoon over pizzicato and marimba) - A' (clarinet takes the tune,
bass clarinet counter-line, soft 'ooh' choir) - B (the crypt opens: distant organ,
choir, and the celesta quotes the game's leitmotif in dorian as a far echo of the
hero) - A'' (bassoon + clarinet in octaves, bone xylophone ostinato, A7 turnaround).
"""
import os

import synth_ext as sx
import synth_lib as sl

BPM = 104
EIGHTH = 60.0 / BPM / 2
BAR = 8 * EIGHTH
BARS = 32
HERE = os.path.dirname(os.path.abspath(__file__))
R = None

CHORDS = {
    "Dm": ("D2", ["D3", "F3", "A3"]),
    "Am": ("A2", ["E3", "A3", "C4"]),
    "G7": ("G2", ["F3", "B3", "D4"]),
    "C": ("C3", ["E3", "G3", "C4"]),
    "A7": ("A2", ["E3", "G3", "C#4"]),
    "F": ("F2", ["F3", "A3", "C4"]),
}
A_CHORDS = ["Dm", "Am", "G7", "Dm", "Dm", "C", "G7", "A7"]
B_CHORDS = ["F", "C", "Dm", "G7", "C", "Dm", "G7", "A7"]
PROGRESSION = A_CHORDS * 2 + B_CHORDS + A_CHORDS

# lengths in eighths, 8 per bar; bassoon register
THEME = [
    [("D3", 1), (R, 1), ("A3", 1), (R, 1), ("F3", 1), ("E3", 1), ("D3", 2)],
    [("A2", 1), (R, 1), ("C3", 1), ("D3", 1), ("E3", 2), (R, 2)],
    [("F3", 1), (R, 1), ("A3", 1), (R, 1), ("B3", 1), ("A3", 1), ("G3", 2)],
    [("F3", 1), ("E3", 1), ("D3", 1), ("E3", 1), ("A2", 3), (R, 1)],
    [("D3", 1), (R, 1), ("A3", 1), (R, 1), ("C4", 1), ("B3", 1), ("A3", 2)],
    [("G3", 1), ("F3", 1), ("E3", 1), ("G3", 1), ("E3", 2), ("C3", 2)],
    [("B2", 1), ("D3", 1), ("F3", 1), ("B3", 1), ("A3", 2), ("G3", 1), ("F3", 1)],
    [("E3", 1), ("F3", 1), ("E3", 1), ("C#3", 1), ("A2", 2), (R, 2)],
]

# clarinet: tune an octave up, cheekier bar endings
THEME_CL = [[(p if p is None else sl.midi(p) + 12, d) for p, d in bar] for bar in THEME]
THEME_CL[1] = [("A4", 1), (R, 1), ("C5", 1), ("E5", 1), ("D5", 1), ("C5", 1), ("A4", 2)]
THEME_CL[3] = [("F4", 1), ("A4", 1), ("D5", 1), ("F5", 1), ("E5", 2), ("D5", 2)]
THEME_CL[5] = [("G4", 1), ("C5", 1), ("E5", 1), ("G5", 1), ("E5", 2), ("C5", 2)]
THEME_CL[7] = [("E5", 1), ("D5", 1), ("C#5", 1), ("B4", 1), ("A4", 2), (R, 2)]

# bass clarinet counter-line under A' (slow, sneaky inner voice)
BCL_COUNTER = [
    [("F3", 6), ("E3", 2)], [("E3", 8)], [("D3", 4), ("F3", 4)], [("F3", 4), ("E3", 4)],
    [("F3", 6), ("G3", 2)], [("G3", 4), ("E3", 4)], [("D3", 4), ("B2", 4)], [("C#3", 4), ("E3", 4)],
]

# leitmotif (D major in the main theme) transformed to D dorian: F# -> F.
# A quarter rest turns its first bar into a hushed pickup.
LEITMOTIF = [
    [(R, 2), ("D5", 2), ("A5", 4)],
    [("B5", 2), ("A5", 2), ("F5", 4)],
    [("G5", 2), ("F5", 2), ("E5", 4)],
    [("D5", 8)],
]

THEME_END = THEME[:7] + [[("E3", 1), ("F3", 1), ("G3", 1), ("E3", 1), ("C#3", 1), ("E3", 1),
                          ("A2", 1), (R, 1)]]


def bar_t(bar, eighth=0.0):
    return bar * BAR + eighth * EIGHTH


def section(bar):
    return ["A", "A2", "B", "A3"][bar // 8]


def melody_events(bars, first_bar, voice, vel, transpose=0, staccato=True):
    events = []
    for i, bar in enumerate(bars):
        pos = 0
        for pitch, length in bar:
            if pitch is not None:
                short = staccato and length <= 1
                events.append({"t": bar_t(first_bar + i, pos),
                               "inst": voice + ("_st" if short else ""),
                               "pitch": sl.midi(pitch) + transpose,
                               "dur": length * EIGHTH * (1.0 if short else 0.92),
                               "vel": vel * (1.1 if pos in (0, 4) else 0.93)})
            pos += length
    return events


def build_parts(total):
    bassoon, clarinet, bcl, celesta, bells = [], [], [], [], []
    pizz, marimba, bones, choir, organ, perc = [], [], [], [], [], []

    # ---- melodies
    bassoon += melody_events(THEME, 0, "bassoon", 0.8)
    clarinet += melody_events(THEME_CL, 8, "clarinet", 0.66)
    bcl += melody_events(BCL_COUNTER, 8, "bcl", 0.5, staccato=False)
    # B: bass clarinet asks, bassoon answers on tiptoe, then the leitmotif echo
    bcl += melody_events([[("A2", 2), ("C3", 2), ("F3", 3), (R, 1)]], 16, "bcl", 0.62,
                         staccato=False)
    bassoon += melody_events([[("G3", 1), (R, 1), ("E3", 1), (R, 1), ("C3", 1), ("D3", 1),
                               ("E3", 2)]], 17, "bassoon", 0.7)
    celesta += melody_events(LEITMOTIF, 18, "celesta", 0.62, staccato=False)
    clarinet += melody_events(LEITMOTIF, 18, "clarinet", 0.34, transpose=-12, staccato=False)
    bcl += melody_events([[("D3", 8)], [("G2", 8)], [("C3", 8)], [("D3", 8)]], 18, "bcl", 0.36,
                         staccato=False)
    bassoon += melody_events([[("B2", 1), ("D3", 1), ("G3", 1), ("B3", 1), ("D4", 2), ("B3", 2)],
                              [("A3", 1), ("G3", 1), ("F3", 1), ("E3", 1), ("C#3", 1), ("E3", 1),
                               ("A2", 2)]], 22, "bassoon", 0.74)
    # A'': octave doubling, the clarinet answers in bar 27
    bassoon += melody_events(THEME_END, 24, "bassoon", 0.8)
    clar_end = [list(b) for b in THEME_END]
    clar_end[3] = [("F3", 1), ("A3", 1), ("D4", 1), ("F4", 1), ("E4", 2), ("D4", 2)]
    clarinet += melody_events(clar_end, 24, "clarinet", 0.5, transpose=12)

    # celesta winks in A' (answers at phrase ends) and bells in A
    for bar, notes in ((11, ["A5", "D6"]), (15, ["C#6", "E6", "A5"])):
        for j, n in enumerate(notes):
            celesta.append({"t": bar_t(bar, 5 + j), "inst": "celesta", "pitch": n,
                            "dur": EIGHTH, "vel": 0.35})
    for bar, notes in ((1, ["E6"]), (3, ["A5", "D6"]), (7, ["G5", "C#6"]), (29, ["C6", "G5"]),
                       (31, ["E6", "C#6", "A5"])):
        for j, n in enumerate(notes):
            bells.append({"t": bar_t(bar, 6 + j * 0.5), "inst": "bells", "pitch": n,
                          "dur": 0.3, "vel": 0.3})

    # ---- accompaniment
    for bar, name in enumerate(PROGRESSION):
        sec = section(bar)
        bass, voicing = CHORDS[name]
        root = sl.midi(bass)
        if sec == "B":
            # hushed half notes, root then fifth
            for pos, off, v in ((0, 0, 0.8), (4, 7, 0.55)):
                pizz.append({"t": bar_t(bar, pos), "inst": "pizz", "pitch": root + off,
                             "dur": 4 * EIGHTH, "vel": v})
            # marimba: slow rolled arpeggio in eighths, soft
            arp = [sl.midi(n) + 12 for n in voicing]
            for pos in range(8):
                note = arp[[0, 1, 2, 1][pos % 4]] + (12 if pos in (2, 6) else 0)
                marimba.append({"t": bar_t(bar, pos), "inst": "marimba", "pitch": note,
                                "dur": EIGHTH, "vel": 0.2 + (0.06 if pos % 2 == 0 else 0),
                                "human": 0.5})
            if bar >= 18 and bar % 2 == 0:
                perc.append({"t": bar_t(bar, 0), "inst": "drum", "vel": 0.3, "pitch_hz": 78.0})
            if bar == 23:
                perc.append({"t": bar_t(bar, 6), "inst": "mtamb", "vel": 0.25, "long": True})
            continue

        # march: root on 1, fifth on 3, a little pickup on 4& in the fuller sections
        pizz.append({"t": bar_t(bar, 0), "inst": "pizz", "pitch": root, "dur": 2 * EIGHTH,
                     "vel": 0.9})
        pizz.append({"t": bar_t(bar, 4), "inst": "pizz", "pitch": root + 7, "dur": 2 * EIGHTH,
                     "vel": 0.7})
        if sec == "A3" or (sec == "A2" and bar % 2):
            nxt = sl.midi(CHORDS[PROGRESSION[(bar + 1) % BARS]][0])
            pizz.append({"t": bar_t(bar, 7), "inst": "pizz", "pitch": nxt - 1 if bar % 4 == 3
                         else root + 12, "dur": EIGHTH, "vel": 0.5})
        # marimba off-beat stabs on 2 and 4 ("chk")
        for pos in (2, 6):
            for j, note in enumerate(voicing):
                marimba.append({"t": bar_t(bar, pos) + 0.006 * j, "inst": "marimba",
                                "pitch": note, "dur": EIGHTH,
                                "vel": 0.3 if sec != "A3" else 0.34, "human": 0.4})
        # bone xylophone: rattles in A, skeletal ostinato in A''
        top = [sl.midi(n) + 12 for n in voicing]
        if sec == "A3":
            for pos, idx in ((1, 2), (3, 1), (5, 2), (7, 0)):
                bones.append({"t": bar_t(bar, pos), "inst": "bones", "pitch": top[idx],
                              "dur": EIGHTH, "vel": 0.3, "human": 0.5})
        elif bar % 4 == 3:
            for j, idx in enumerate((0, 1, 2)):
                bones.append({"t": bar_t(bar, 6) + j * EIGHTH / 2, "inst": "bones",
                              "pitch": top[idx] + 12, "dur": EIGHTH, "vel": 0.3})
        # percussion
        perc.append({"t": bar_t(bar, 0), "inst": "drum", "vel": 0.42 if sec == "A" else 0.5})
        for pos in (2, 6):
            perc.append({"t": bar_t(bar, pos), "inst": "mtamb",
                         "vel": 0.22 if sec == "A" else 0.28, "long": pos == 6 and bar % 4 == 3})
        if sec in ("A2", "A3"):
            for pos in (1, 3, 5, 7):
                perc.append({"t": bar_t(bar, pos), "inst": "shaker", "vel": 0.1})
        if sec == "A3":
            perc.append({"t": bar_t(bar, 4), "inst": "drum", "vel": 0.25, "pitch_hz": 98.0})

    # bone rattle up into the return (bar 23) and down to the loop point (bar 31)
    for j, n in enumerate(["A4", "C#5", "E5", "G5", "A5"]):
        bones.append({"t": bar_t(23, 3 + j * 0.5), "inst": "bones", "pitch": n,
                      "dur": EIGHTH, "vel": 0.32})

    # ---- choir 'ooh' and distant organ (two-bar chords)
    for bar in range(8, 32, 2):
        sec = section(bar)
        name = PROGRESSION[bar]
        voicing = [sl.midi(n) + 12 for n in CHORDS[name][1]]
        vel = {"A2": 0.3, "B": 0.36, "A3": 0.3}[sec]
        choir.append({"t": bar_t(bar, 0), "inst": "ooh", "pitches": voicing[:1] + voicing[1:],
                      "dur": 2 * BAR - 0.1, "vel": vel})
        choir.append({"t": bar_t(bar + 1, 0), "inst": "ooh",
                      "pitches": [sl.midi(n) + 12 for n in CHORDS[PROGRESSION[bar + 1]][1]],
                      "dur": BAR - 0.1, "vel": vel * 0.6})
    for bar in range(16, 32):
        sec = section(bar)
        if sec == "A3" and bar % 2:
            continue
        name = PROGRESSION[bar]
        bass, voicing = CHORDS[name]
        pitches = [sl.midi(bass) + 12] + [sl.midi(n) for n in voicing]
        dur = BAR if sec == "B" else 2 * BAR
        organ.append({"t": bar_t(bar, 0), "inst": "organ", "pitches": pitches,
                      "dur": dur - 0.08, "vel": 0.5 if sec == "B" else 0.3})

    choir_a = [e for e in choir if e["t"] < bar_t(20)]
    choir_b = [e for e in choir if e["t"] >= bar_t(20)]
    return [
        ("bassoon", bassoon, total, -0.15, 0.42, 21),
        ("clarinet", clarinet, total, 0.25, 0.25, 22),
        ("bcl", bcl, total, -0.3, 0.16, 23),
        ("celesta", celesta, total, 0.35, 0.6, 24),
        ("bells", bells, total, 0.45, 0.4, 25),
        ("pizz", pizz, total, -0.05, 0.72, 26),
        ("marimba", marimba, total, 0.3, 0.24, 27),
        ("bones", bones, total, -0.4, 0.55, 28),
        ("choir_a", choir_a, total, 0.1, 0.36, 29),
        ("choir_b", choir_b, total, 0.1, 0.36, 30),
        ("organ", organ, total, -0.1, 0.16, 31),
        ("perc", perc, total, 0.15, 0.3, 32),
    ]


SENDS = {"bassoon": 0.25, "clarinet": 0.3, "bcl": 0.3, "celesta": 0.55, "bells": 0.6,
         "pizz": 0.12, "marimba": 0.25, "bones": 0.2, "choir_a": 0.6, "choir_b": 0.6,
         "organ": 0.9, "perc": 0.2}

LOW_CUTS = {"choir_a": 200, "choir_b": 200, "marimba": 160, "bcl": 90, "organ": 120}

if __name__ == "__main__":
    loop_len = int(round(BARS * BAR * sl.SR))
    total = loop_len + int(5 * sl.SR)
    print(f"{BARS} bars at {BPM} BPM = {loop_len / sl.SR:.2f}s ({loop_len} samples)")
    parts = sx.render_parts(build_parts(total))
    # clear the low-mids so the tune stays in front of the pads
    for name, lo in LOW_CUTS.items():
        parts[name] = sl.fft_filter_stereo(parts[name], lo=lo)
    out = sx.finish("cap2", HERE, parts, SENDS, loop_len, rt60=2.6)
    with open(os.path.join(HERE, "cap2.loop.txt"), "w") as fh:
        fh.write(f"{loop_len}\n")
