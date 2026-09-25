"""Act I, proposal B: "Taberna y travesura".

Playful, cheeky goblin jig. G mixolydian (with a lydian wink at the bridge end),
6/8 at dotted quarter = 100 (eighth = 300 per minute), 64 bars (~76.8 s), seamless loop.
Bassoon and clarinet melodies, lute oom-pa-pa, pizzicato bass, soft pad,
frame drum, tambourine and shaker.
Form: A (bassoon) - A' (clarinet, bassoon hops) - bridge (tiptoe question/answer) -
A'' (bassoon + clarinet in octaves, tutti).
"""
import os

import synth_lib as sl

DOTTED_BPM = 100
EIGHTH = 60.0 / DOTTED_BPM / 3
BAR = 6 * EIGHTH
BARS = 64
HERE = os.path.dirname(os.path.abspath(__file__))

CHORDS = {
    "G": ("G2", ["G3", "B3", "D4"]),
    "F": ("F2", ["F3", "A3", "C4"]),
    "C": ("C3", ["G3", "C4", "E4"]),
    "Dm": ("D2", ["F3", "A3", "D4"]),
    "Em": ("E2", ["G3", "B3", "E4"]),
    "Am": ("A2", ["A3", "C4", "E4"]),
}

A_CHORDS = ["G", "G", "F", "G", "G", "C", "Dm", "F", "G", "Em", "F", "C", "Am", "G", "F", "G"]
BRIDGE_CHORDS = ["C", "C", "Am", "Am", "F", "F", "G", "G", "C", "C", "Am", "Em", "F", "Dm", "F", "F"]
PROGRESSION = A_CHORDS + A_CHORDS + BRIDGE_CHORDS + A_CHORDS[:15] + ["F"]

R = None
THEME = [  # bassoon register, lengths in eighths
    [("D3", 1), ("G3", 2), ("A3", 1), ("B3", 2)],
    [("C4", 1), ("B3", 1), ("A3", 1), ("G3", 2), ("D3", 1)],
    [("F3", 2), ("A3", 1), ("C4", 2), ("A3", 1)],
    [("B3", 1), ("D4", 1), ("B3", 1), ("G3", 3)],
    [("D3", 1), ("G3", 2), ("A3", 1), ("B3", 2)],
    [("C4", 2), ("E4", 1), ("D4", 1), ("C4", 1), ("B3", 1)],
    [("A3", 1), ("D4", 1), ("F4", 1), ("E4", 2), ("D4", 1)],
    [("C4", 3), ("A3", 1), ("F3", 1), (R, 1)],
    [("D3", 1), ("G3", 2), ("A3", 1), ("B3", 1), ("D4", 1)],
    [("E4", 2), ("D4", 1), ("B3", 1), ("G3", 1), ("E3", 1)],
    [("F3", 1), ("A3", 1), ("C4", 1), ("F4", 2), ("E4", 1)],
    [("D4", 1), ("C4", 1), ("B3", 1), ("C4", 3)],
    [("A3", 2), ("C4", 1), ("E4", 2), ("C4", 1)],
    [("D4", 1), ("B3", 1), ("G3", 1), ("B3", 2), ("D4", 1)],
    [("C4", 1), ("D4", 1), ("C4", 1), ("A3", 1), ("F3", 1), ("A3", 1)],
    [("G3", 3), (R, 3)],
]

# clarinet variation, one octave up, with new bar endings
THEME_CL = [[(p if p is None else sl.midi(p) + 12, d) for p, d in bar] for bar in THEME]
THEME_CL[1] = [("C5", 1), ("B4", 1), ("A4", 1), ("G4", 1), ("F4", 1), ("D4", 1)]
THEME_CL[3] = [("B4", 1), ("D5", 1), ("G5", 1), ("F5", 1), ("D5", 1), ("B4", 1)]
THEME_CL[7] = [("C5", 1), ("A4", 1), ("C5", 1), ("F5", 2), (R, 1)]
THEME_CL[11] = [("E5", 1), ("D5", 1), ("C5", 1), ("G4", 1), ("C5", 2)]
THEME_CL[15] = [("G4", 1), ("B4", 1), ("D5", 1), ("G5", 2), (R, 1)]

# bridge: (voice, bar) question/answer; "both" = bassoon + clarinet an octave up
BRIDGE = [
    ("bsn", [("E3", 1), ("G3", 1), ("C4", 1), ("E4", 2), ("D4", 1)]),
    ("bsn", [("C4", 1), (R, 1), ("G3", 1), (R, 1), ("E3", 2)]),
    ("cl", [("E5", 1), (R, 1), ("C5", 1), (R, 1), ("A4", 2)]),
    ("cl", [("B4", 1), ("C5", 1), ("D5", 1), ("E5", 3)]),
    ("bsn", [("F3", 1), ("A3", 1), ("C4", 1), ("F4", 2), ("E4", 1)]),
    ("bsn", [("D4", 1), ("C4", 1), ("A3", 1), ("F3", 3)]),
    ("cl", [("G4", 1), ("B4", 1), ("D5", 1), ("F5", 2), ("E5", 1)]),
    ("cl", [("D5", 1), ("B4", 1), ("G4", 1), ("D5", 3)]),
    ("bsn", [("G3", 2), ("C4", 1), ("E4", 1), ("D4", 1), ("C4", 1)]),
    ("bsn", [("B3", 1), ("C4", 1), ("D4", 1), ("G3", 3)]),
    ("cl", [("A4", 2), ("C5", 1), ("E5", 1), ("D5", 1), ("C5", 1)]),
    ("cl", [("B4", 2), ("G4", 1), ("E4", 3)]),
    ("both", [("F3", 1), ("A3", 1), ("C4", 1), ("F4", 2), ("E4", 1)]),
    ("both", [("D4", 1), ("C4", 1), ("A3", 1), ("F3", 1), ("D3", 2)]),
    ("both", [("C4", 1), (R, 1), ("C4", 1), (R, 1), ("C4", 1), ("D4", 1)]),
    ("both", [("A3", 1), ("B3", 1), ("C4", 1), ("B3", 1), ("A3", 1), ("F3", 1)]),
]

THEME_END = THEME[:15] + [[("A3", 1), ("C4", 1), ("A3", 1), ("F3", 2), ("E3", 1)]]


def bar_t(bar, eighth=0.0):
    return bar * BAR + eighth * EIGHTH


def section(bar):
    return ["A", "A2", "BR", "A3"][bar // 16]


def melody_events(bars, first_bar, voice, vel, transpose=0):
    """Short notes use the staccato articulation for a cheeky, bouncy line."""
    events = []
    for i, bar in enumerate(bars):
        pos = 0
        for pitch, length in bar:
            if pitch is not None:
                short = length <= 1
                events.append({"t": bar_t(first_bar + i, pos),
                               "inst": voice + ("_st" if short else ""),
                               "pitch": sl.midi(pitch) + transpose,
                               "dur": length * EIGHTH * (0.9 if not short else 1.0),
                               "vel": vel * (1.12 if pos in (0, 3) else 0.92)})
            pos += length
    return events


def build_parts(total):
    bassoon, clarinet, lute, pizz_bass, pizz, pad, perc, glock = ([] for _ in range(8))

    bassoon += melody_events(THEME, 0, "bassoon", 0.8)
    clarinet += melody_events(THEME_CL, 16, "clarinet", 0.7)
    for i, (voice, bar) in enumerate(BRIDGE):
        if voice in ("bsn", "both"):
            bassoon += melody_events([bar], 32 + i, "bassoon", 0.78)
        if voice == "cl":
            clarinet += melody_events([bar], 32 + i, "clarinet", 0.7)
        if voice == "both":
            clarinet += melody_events([bar], 32 + i, "clarinet", 0.55, transpose=12)
    bassoon += melody_events(THEME_END, 48, "bassoon", 0.8)
    clarinet += melody_events(THEME_END, 48, "clarinet", 0.55, transpose=12)

    for bar, name in enumerate(PROGRESSION):
        sec = section(bar)
        bass, voicing = CHORDS[name]
        root = sl.midi(bass)
        # pizzicato bass: root on 1, fifth on 4
        pizz_bass.append({"t": bar_t(bar, 0), "inst": "pizz", "pitch": root,
                          "dur": 2 * EIGHTH, "vel": 0.9})
        pizz_bass.append({"t": bar_t(bar, 3), "inst": "pizz", "pitch": root + 7,
                          "dur": 2 * EIGHTH, "vel": 0.7 if sec != "BR" else 0.55})
        if sec == "A2":
            # bassoon hops under the clarinet tune
            for pos, off, v in ((0, 12, 0.5), (3, 19, 0.42)):
                bassoon.append({"t": bar_t(bar, pos), "inst": "bassoon_st",
                                "pitch": root + off, "dur": EIGHTH, "vel": v})
        if sec == "BR":
            # tiptoe pizzicato: short chords on 1 and 4
            for pos in (0, 3):
                for j, note in enumerate(voicing[1:]):
                    pizz.append({"t": bar_t(bar, pos) + 0.01 * j, "inst": "pizz",
                                 "pitch": note, "dur": EIGHTH, "vel": 0.4, "human": 0.3})
        else:
            # lute oom-pa-pa on eighths 2-3 and 5-6
            for pos in (1, 2, 4, 5):
                accent = 0.36 if pos in (1, 4) else 0.27
                for j, note in enumerate(voicing):
                    lute.append({"t": bar_t(bar, pos) + 0.008 * j, "inst": "lute",
                                 "pitch": note, "dur": EIGHTH,
                                 "vel": accent * (1.1 if sec == "A3" else 1.0), "human": 0.4})
        if sec in ("A2", "A3"):
            pad.append({"t": bar_t(bar, 0), "inst": "pad",
                        "pitches": [sl.midi(n) + 12 for n in voicing],
                        "dur": BAR, "vel": 0.3 if sec == "A2" else 0.4})

        # percussion
        if sec == "A":
            perc.append({"t": bar_t(bar, 0), "inst": "drum", "vel": 0.45})
        elif sec == "BR":
            for pos in (0, 2, 3, 5):
                perc.append({"t": bar_t(bar, pos), "inst": "shaker", "vel": 0.16})
            if bar % 2 == 0:
                perc.append({"t": bar_t(bar, 0), "inst": "drum", "vel": 0.35, "pitch_hz": 110.0})
        else:
            perc.append({"t": bar_t(bar, 0), "inst": "drum", "vel": 0.55})
            perc.append({"t": bar_t(bar, 3), "inst": "tamb", "vel": 0.28,
                         "long": bar % 4 == 3})
            if sec == "A3":
                perc.append({"t": bar_t(bar, 3), "inst": "drum", "vel": 0.3, "pitch_hz": 100.0})
            for pos in range(6):
                perc.append({"t": bar_t(bar, pos), "inst": "shaker",
                             "vel": 0.2 if pos in (0, 3) else 0.12})

    # glockenspiel winks after each clarinet answer in the bridge, and phrase ends
    for bar, notes in ((35, ["E6"]), (39, ["F6", "D6"]), (43, ["E6", "B5"]),
                       (47, ["B5", "C6", "D6"]), (15, ["G5", "D6"]), (63, ["C6", "D6"])):
        for j, n in enumerate(notes):
            glock.append({"t": bar_t(bar, 4 + j * 0.66), "inst": "glock", "pitch": n,
                          "dur": .4, "vel": 0.25})

    return [
        ("bassoon", bassoon, total, -0.15, 0.3, 11),
        ("clarinet", clarinet, total, 0.25, 0.17, 12),
        ("lute", lute, total, 0.35, 0.7, 13),
        ("pizz_bass", pizz_bass, total, -0.05, 0.7, 14),
        ("pizz", pizz, total, -0.35, 0.6, 15),
        ("pad", pad, total, 0.0, 0.3, 16),
        ("perc", perc, total, -0.2, 0.3, 17),
        ("glock", glock, total, 0.4, 0.35, 18),
    ]


SENDS = {"bassoon": 0.25, "clarinet": 0.3, "lute": 0.22, "pizz_bass": 0.1, "pizz": 0.3,
         "pad": 0.5, "perc": 0.18, "glock": 0.5}

if __name__ == "__main__":
    loop_len = int(round(BARS * BAR * sl.SR))
    total = loop_len + int(5 * sl.SR)
    parts = sl.render_parts(build_parts(total))
    sl.finish("acto1-b", HERE, parts, SENDS, loop_len)
