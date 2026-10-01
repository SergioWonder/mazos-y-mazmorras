"""Ignifax's boss theme «Llamarada y trono de ceniza» (cap3-e0-jefe): mix and master (brief:
docs/musica/acto3-ignifax.md, section 8, criteria 16-20).

Reads build/acto3-ignifax.mid (written by compose.py), renders it with Sonatina, VSCO 2 CE and VCSL inside the
dragon's cavern, masters it as a seamless loop and writes build/acto3-ignifax.mp3 and its report. Prints the report,
the brief's checks (measured on the decoded MP3), the part balance in A and the forge hit against the sketch's anvil,
and a comparison with the previous build and with the two approved sketches.

The score mixes bars of 3/4 at 168 and 4/4 at 126, so the MixSpec counts in the common unit, a 126 sixteenth
(= a 168 eighth-note triplet = 5 250 samples): bpm=168, beats_per_bar=1/3, bars=676. Bar numbers of the score are
turned into that unit with the score's own time map (compose.BAR_SEC).

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/acto3-ignifax/mix.py
"""
from __future__ import annotations

import json
import os
import subprocess
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))

import compose  # noqa: E402
from estudio import config, midi_io, mix, render, sampler  # noqa: E402
from estudio.render import Part  # noqa: E402

NAME = 'acto3-ignifax'
MIDI = os.path.join(HERE, 'build', NAME + '.mid')
OUT = os.path.join(HERE, 'build', NAME + '.mp3')
REPORT = os.path.join(HERE, 'build', NAME + '.report.json')
SKETCHES = os.path.join(ROOT, 'scripts', 'musica', 'leitmotivs', 'build')
REFERENCES = {'llamarada': os.path.join(SKETCHES, 'acto3-jefe-ignifax-1-llamarada.mp3'),
              'trono': os.path.join(SKETCHES, 'acto3-jefe-ignifax-2-trono-de-ceniza.mp3'),
              'volguth': os.path.join(ROOT, 'src', 'audio', 'cap2-e0-jefe.mp3')}
SR = config.SR
LOOP_SAMPLES = 3549000
UNIT_SAMPLES = 5250                      # a 126 sixteenth = a 168 eighth-note triplet
BPM, BEATS, UNITS = 168, 1 / 3, LOOP_SAMPLES // UNIT_SAMPLES
UNIT_S = UNIT_SAMPLES / SR
assert compose.LOOP_SAMPLES == LOOP_SAMPLES and UNITS * UNIT_SAMPLES == LOOP_SAMPLES


def pos(bar: float) -> float:
    """Score bar (1-based, fractions inside the bar) → MixSpec position in units (1-based)."""
    b = int(bar)
    start = compose.BAR_SEC[b]
    if bar > b:
        start += (bar - b) * (compose.BAR_SEC[b + 1] - compose.BAR_SEC[b])
    return 1 + start / UNIT_S


def span(first: int, last: int) -> tuple[int, int]:
    """Score bars (inclusive) → MixSpec unit range (render's sections take (first, last) 1-based)."""
    return int(round(pos(first))), int(round(pos(last + 1))) - 1


def ride(*segments: tuple[float, float, float], ramp: float = 0.08) -> list[tuple[float, float]]:
    """Fader rides on score bars: each (first bar, last bar, dB) moves those bars (inclusive), ramping over
    `ramp` of a bar at each edge; overlapping rides add up."""
    marks = sorted({m for first, last, _ in segments for m in (first - ramp, first, last + 1 - ramp, last + 1)})

    def level(m: float) -> float:
        total = 0.0
        for first, last, db in segments:
            up = np.clip((m - (first - ramp)) / ramp, 0, 1)
            down = np.clip(((last + 1) - m) / ramp, 0, 1)
            total += db * min(up, down)
        return float(total)
    return [(pos(max(1.0, m)), level(m)) for m in marks]


def sso(group: str, name: str) -> str:
    return os.path.join('sso', 'Sonatina Symphonic Orchestra', group, name + '.sfz')


def vsco(name: str) -> str:
    return os.path.join('VSCO-2-CE', name + '.sfz')


def vcsl(group: str, name: str) -> str:
    return os.path.join('VCSL', group, name + '.sfz')


ID, MB = 'Idiophones/Struck Idiophones', 'Membranophones/Struck Membranophones'

# ── seating: pan, level, depth (hall send), width. Starting point: the sketch's IGNIFAX_PARTS, then the brief:
# percussion drives (war drums, toms, timpani, snare up front), choir and horns lead, the organ pulled down to the
# sketch's -14 dB so it does not mask the drums, the forge hit low and discreet (the anvil it replaces pinged). ──
HEADROOM = -9.0     # every part peaks under -6 dB before its bus (criterion 20); the master sets the loudness

# fader rides on score bars: the climax II (49-54) is the one peak, its tail (55-56) a step under it; the silence
# of bar 22 is a real silence (the choir's E4 and the roll in p)
PEAK = (49, 54, 2.0)
CHOKE = [(4.35, 4, -15.0), (22.35, 22, -15.0), (58.35, 58, -15.0)]   # «se para en seco»: the blow's tail is cut


def seat(track, sfz, bus, pan, gain, send, width=1.0, rides=()):
    return Part(track, sfz, bus, pan=pan, gain_db=gain + HEADROOM, send=send, width=width,
                automation=ride(*rides) if rides else [])


PARTS = [
    seat('Choir', sso('Chorus - Performance', 'Mixed Chorus'), 'coro', -0.10, 4.0, 0.40,
         rides=[(22, 22, -6.0), PEAK, (55, 56, -2.0)]),
    seat('Choir Low', sso('Chorus - Performance', 'Large Chorus'), 'coro', 0.10, 4.0, 0.42,
         rides=[PEAK, (55, 56, -1.5)]),
    seat('Shout', sso('Chorus - Performance', 'Large Chorus'), 'coro', 0.0, 6.0, 0.40, rides=[*CHOKE, (55, 56, -3.0)]),
    seat('Horns', sso('Brass - Performance', 'Horns Sustain'), 'metales', -0.30, 0.0, 0.35,
         rides=[*CHOKE, PEAK, (55, 56, -2.0)]),
    seat('Low Brass', sso('Brass - Performance', 'Trombones Marcato'), 'metales', 0.25, -3.0, 0.28, rides=CHOKE),
    seat('Tuba', sso('Brass - Performance', 'Tuba Marcato'), 'metales', 0.30, 0.0, 0.26, rides=CHOKE),
    seat('Strings', sso('Strings - Performance', '1st Violins Marcato'), 'cuerdas', -0.25, -4.0, 0.30),
    seat('Spiccato', vsco('CelloEnsSpic'), 'ritmo', 0.30, 5.0, 0.22),
    seat('Violin Spiccato', vsco('ViolinEnsSpic'), 'ritmo', -0.30, 2.0, 0.22),
    seat('Basses', vsco('ContrabassSpic'), 'ritmo', 0.35, 4.0, 0.20),
    # the sketch's -14 dB, then 6 dB more under the climaxes (where the drums must stay on top), not in the throne
    seat('Organ', sso('Organ', 'Great - Open Diapason 8ft'), 'organo', 0.0, -20.0, 0.45,
         rides=[(23, 26, 6.0), (49, 56, 1.0)]),
    seat('Organ Pedal', sso('Organ', 'Pedal - Bourdon 16ft'), 'pedal', 0.0, -14.0, 0.40, width=0.6),
    seat('War Drums', vcsl(MB, 'Bass Drum 2'), 'tambores', 0.0, -2.0, 0.32, width=0.6, rides=[(49, 54, 1.0)]),
    seat('Toms', vcsl(MB, 'Tom 2'), 'tambores', 0.15, 0.0, 0.30, width=0.6),
    seat('Snare', vcsl(MB, 'Snare Drum, Rope Tension'), 'tambores', -0.10, 5.0, 0.25, width=0.6),
    seat('Timpani', vsco('Timpani'), 'timbales', -0.10, 8.0, 0.35, width=0.6, rides=[(49, 54, 1.0)]),
    seat('Timp Roll', vsco('TimpaniRolls'), 'timbales', -0.10, 8.0, 0.45, width=0.6, rides=[(22, 22, -4.0)]),
    seat('Forge', vcsl(ID, 'Brake Drum'), 'forja', 0.35, -8.0, 0.30, width=0.5),
    seat('Clash', vcsl(ID, 'Clash Cymbals 1'), 'platos', 0.10, 0.0, 0.50, rides=CHOKE),
    seat('Cymbal', vcsl(ID, 'Suspended Cymbal 2'), 'platos', 0.20, -8.0, 0.55),
    seat('Gong', vcsl(ID, 'Gong 1'), 'gong', 0.25, 6.0, 0.55),
]

# ── subtractive EQ per bus: mud out at 250-350 Hz, a dip at 3-3.5 kHz for the game's SFX, soft highs; the forge and
# the cymbals behind a dark shelf (no ping) ──
BUSES = {
    'coro': {'highpass': 100, 'peaks': [(300, -2.5, 1.0), (3000, -3.0, 1.0)], 'high_shelf': (7000, -3.0)},
    'metales': {'highpass': 40, 'peaks': [(300, -2.0, 1.0), (3000, -3.0, 1.0)], 'high_shelf': (6000, -3.0),
                'comp': (-20, 1.6)},
    'cuerdas': {'highpass': 120, 'peaks': [(280, -2.0, 1.0), (3200, -4.0, 1.0)], 'high_shelf': (5000, -4.0)},
    'ritmo': {'highpass': 40, 'peaks': [(300, -2.0, 1.0), (3200, -3.0, 1.0)], 'high_shelf': (5500, -3.0)},
    'organo': {'highpass': 40, 'peaks': [(300, -2.0, 1.0)], 'high_shelf': (5000, -3.0)},
    'pedal': {'highpass': 32, 'low_shelf': (60, -6.0), 'peaks': [(250, -2.0, 1.0)], 'high_shelf': (2500, -4.0)},
    'tambores': {'highpass': 65, 'peaks': [(46, -6.0, 1.5), (3500, -4.0, 1.0)], 'high_shelf': (6000, -4.0)},
    'timbales': {'highpass': 35, 'peaks': [(3500, -4.0, 1.0)], 'high_shelf': (5000, -3.0)},
    'forja': {'highpass': 150, 'peaks': [(3500, -4.0, 1.0)], 'high_shelf': (2000, -9.0)},
    'platos': {'highpass': 250, 'peaks': [(3500, -3.0, 1.0)], 'high_shelf': (5000, -6.0)},
    'gong': {'highpass': 40, 'high_shelf': (5000, -5.0)},
}

# criterion 18 spans (score bars)
SECTIONS = {'intro 1-3': (1, 3), 'A 5-12': (5, 12), "A' 13-20": (13, 20), 'martillazos 21-22': (21, 22),
            'trono 23-26': (23, 26), 'tambores 29-34': (29, 34), 'ruptura 35-36': (35, 36), 'puente 37-40': (37, 40),
            'clímax I 41-48': (41, 48), 'clímax II 49-54': (49, 54), 'cola 55-56': (55, 56), 'coda 57-58': (57, 58)}

SPEC = render.MixSpec(
    midi=MIDI, out=OUT, bpm=BPM, beats_per_bar=BEATS, bars=UNITS, parts=PARTS, buses=BUSES,
    reverb={'seconds': 2.4, 'predelay': 0.02, 'damping': 0.55}, reverb_return_db=-5.0,
    reverb_eq={'highpass': 160, 'peaks': [(350, -2.5, 0.8)], 'high_shelf': (6000, -3.0)},
    master_bus={'highpass': 28, 'comp': (-18, 1.5)},
    target_lufs=-16.5, ceiling_dbtp=-1.0, tail_seconds=4.0,
    sections={name: span(a, b) for name, (a, b) in SECTIONS.items()},
)


# ── measures ────────────────────────────────────────────────────────────────
def decode(path: str) -> np.ndarray:
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def window(x: np.ndarray, t0: float, t1: float) -> np.ndarray:
    return x[int(round(t0 * SR)): int(round(t1 * SR))]


def measure(path: str, sections: bool = False) -> dict:
    x = decode(path)
    out = {'samples': len(x), 'lufs': round(mix.lufs(x, SR), 2), 'true_peak_db': round(mix.true_peak_db(x, SR), 2),
           'seam_jump': round(mix.seam_jump(x), 4), 'bands_db': {k: round(v, 1) for k, v in mix.band_energy(x, SR).items()}}
    if sections:
        out['sections_lufs'] = {name: round(mix.lufs(window(x, compose.BAR_SEC[a], compose.BAR_SEC[b + 1]), SR), 1)
                                for name, (a, b) in SECTIONS.items()}
        silence = window(x, compose.BAR_SEC[22] + 1.5 * 60 / 168, compose.BAR_SEC[23])
        out['sections_lufs']['silencio c. 22'] = round(mix.lufs(silence, SR), 1)
    return out


_INSTRUMENTS: dict[str, sampler.Instrument] = {}


def solo(song: midi_io.Song, part: Part, buses: dict, bar_seconds: float, total: float) -> np.ndarray:
    """One part as render() builds it (samples, fader rides, seat, gain) through its bus EQ (no compressor)."""
    path = config.library(*part.sfz.split('/'))
    inst = _INSTRUMENTS.setdefault(path, sampler.Instrument.load(path, SR))
    track = song.tracks[part.track]
    audio = inst.render_track(track.notes, total, cc=track.cc)
    if part.automation:
        audio = audio * render.automation_curve(part.automation, len(audio), SR, bar_seconds)[:, None]
    audio = render._place(audio, part.pan, part.width) * 10 ** (part.gain_db / 20)
    return mix.process_bus(audio, SR, **{k: v for k, v in buses[part.bus].items() if k != 'comp'})


def hf_db(x: np.ndarray, ref: np.ndarray) -> float:
    """Energy of x in 2.5-16 kHz relative to the total energy of ref (dB)."""
    def power(y, lo=0.0, hi=SR / 2):
        mono = y.mean(axis=1)
        spec = np.abs(np.fft.rfft(mono)) ** 2
        f = np.fft.rfftfreq(len(mono), 1 / SR)
        return spec[(f >= lo) & (f < hi)].sum()
    return float(10 * np.log10(power(x, 2500, 16000) / power(ref) + 1e-12))


BALANCE = ['War Drums', 'Toms', 'Timpani', 'Snare', 'Forge', 'Horns', 'Spiccato']


def balance() -> dict:
    """Criterion 19: each part alone after its bus EQ, gated LUFS in A (bars 5-12) against the choir; and the forge
    hit against the war drums, compared with the sketch's anvil against its war drums."""
    song = midi_io.load(MIDI)
    bar_s = BEATS * 60 / BPM
    total = LOOP_SAMPLES / SR + 2.0
    a0, a1 = compose.BAR_SEC[5], compose.BAR_SEC[13]
    full = {p.track: solo(song, p, BUSES, bar_s, total) for p in PARTS if p.track in BALANCE + ['Choir', 'Organ']}
    stems = {t: window(x, a0, a1) for t, x in full.items()}
    choir = mix.lufs(stems['Choir'], SR)
    out = {'rel_choir_lu': {t: round(mix.lufs(stems[t], SR) - choir, 1) for t in BALANCE}}
    c0, c1 = compose.BAR_SEC[41], compose.BAR_SEC[57]   # the organ in the two climaxes, against the war drums
    out['organ_vs_drums_lu'] = round(mix.lufs(window(full['Organ'], c0, c1), SR)
                                     - mix.lufs(window(full['War Drums'], c0, c1), SR), 1)
    forge_rel = mix.lufs(stems['Forge'], SR) - mix.lufs(stems['War Drums'], SR)
    forge_hf = hf_db(stems['Forge'], stems['War Drums'])
    # the sketch «Llamarada» (3/4 at 168): its anvil and war drums with its own gains and buses, bars 5-12
    sk_mid = os.path.join(SKETCHES, 'acto3-jefe-ignifax-1-llamarada.mid')
    sk_song = midi_io.load(sk_mid)
    sk_buses = {'bells': {'highpass': 300, 'high_shelf': (7000, -3)},
                'drums': {'highpass': 55, 'peaks': [(46, -6, 1.5), (3500, -4, 1)]}}
    sk_buses['organ'] = {'highpass': 30, 'peaks': [(300, -2, 1)]}
    sk_parts = [Part('Anvil', vcsl(ID, 'Anvil'), 'bells', pan=0.35, gain_db=2.0, send=0.30),
                Part('War Drums', vcsl(MB, 'Bass Drum 2'), 'drums', pan=0.0, gain_db=0.0, send=0.32),
                Part('Organ', sso('Organ', 'Great - Open Diapason 8ft'), 'organ', pan=0.0, gain_db=-14.0, send=0.45)]
    sk_bar = 3 * 60 / 168
    sk_full = {p.track: solo(sk_song, p, sk_buses, sk_bar, 30.0) for p in sk_parts}
    sk = {t: window(x, 4 * sk_bar, 12 * sk_bar) for t, x in sk_full.items()}
    # the sketch's climax (its bars 15-22, the motif a semitone up with the organ at -14 dB)
    out['organ_vs_drums_lu (boceto)'] = round(mix.lufs(window(sk_full['Organ'], 14 * sk_bar, 22 * sk_bar), SR)
                                              - mix.lufs(window(sk_full['War Drums'], 14 * sk_bar, 22 * sk_bar), SR), 1)
    anvil_rel = mix.lufs(sk['Anvil'], SR) - mix.lufs(sk['War Drums'], SR)
    anvil_hf = hf_db(sk['Anvil'], sk['War Drums'])
    out['forja'] = {'forge_vs_drums_lu': round(forge_rel, 1), 'anvil_vs_drums_lu (boceto)': round(anvil_rel, 1),
                    'forge_hf_db': round(forge_hf, 1), 'anvil_hf_db (boceto)': round(anvil_hf, 1)}
    return out


def checks(r: dict, mp3: dict, bal: dict) -> list[tuple[str, bool, str]]:
    b, s, p, rel, fj = mp3['bands_db'], mp3['sections_lufs'], r['parts'], bal['rel_choir_lu'], bal['forja']
    peak2 = s['clímax II 49-54']
    loudest = max(p, key=lambda k: p[k]['pico_db'])
    drop = fj['anvil_vs_drums_lu (boceto)'] - fj['forge_vs_drums_lu']
    hf_drop = fj['anvil_hf_db (boceto)'] - fj['forge_hf_db']
    return [
        ('16 sonoridad -16,5 ± 0,5 LUFS', abs(mp3['lufs'] + 16.5) <= 0.5, f"{mp3['lufs']} LUFS"),
        ('16 pico real ≤ -1 dBTP', mp3['true_peak_db'] <= -1.0, f"{mp3['true_peak_db']} dBTP"),
        ('16 loop_samples = 3 549 000', r['loop_samples'] == LOOP_SAMPLES and mp3['samples'] == LOOP_SAMPLES,
         f"{r['loop_samples']} (MP3 decodificado: {mp3['samples']})"),
        ('16 seam_jump < 0,02', mp3['seam_jump'] < 0.02, str(mp3['seam_jump'])),
        ('17 presencia 2.5-6k ≤ -20 dB', b['presencia 2.5-6k'] <= -20, str(b['presencia 2.5-6k'])),
        ('17 aire 6-16k ≤ -30 dB', b['aire 6-16k'] <= -30, str(b['aire 6-16k'])),
        ('17 sub <60 ≤ -17 dB', b['sub <60'] <= -17, str(b['sub <60'])),
        ('18 clímax II vs trono en +5…+12 LU', 5 <= peak2 - s['trono 23-26'] <= 12, f"{peak2 - s['trono 23-26']:+.1f} LU"),
        ('18 clímax II vs A en +1…+4 LU', 1 <= peak2 - s['A 5-12'] <= 4, f"{peak2 - s['A 5-12']:+.1f} LU"),
        ('18 silencio del c. 22 ≥ 8 LU bajo A', s['A 5-12'] - s['silencio c. 22'] >= 8,
         f"{s['silencio c. 22'] - s['A 5-12']:+.1f} LU"),
        ('19 War Drums ≥ -6 LU (vs coro, A)', rel['War Drums'] >= -6, f"{rel['War Drums']:+.1f}"),
        ('19 Toms ≥ -9 LU', rel['Toms'] >= -9, f"{rel['Toms']:+.1f}"),
        ('19 Timpani ≥ -9 LU', rel['Timpani'] >= -9, f"{rel['Timpani']:+.1f}"),
        ('19 Snare ≥ -12 LU', rel['Snare'] >= -12, f"{rel['Snare']:+.1f}"),
        ('19 el coro por encima de la percusión', all(rel[t] < 0 for t in ('War Drums', 'Toms', 'Timpani', 'Snare')),
         ', '.join(f'{t} {rel[t]:+.1f}' for t in ('War Drums', 'Toms', 'Timpani', 'Snare'))),
        ('19 forja ≥ 10 LU más abajo que el yunque del boceto (vs tambores)', drop >= 10,
         f"forja {fj['forge_vs_drums_lu']:+.1f} LU · yunque {fj['anvil_vs_drums_lu (boceto)']:+.1f} LU → {drop:.1f} LU"),
        ('19 forja: 2,5-16 kHz ≥ 10 dB bajo el yunque', hf_drop >= 10,
         f"forja {fj['forge_hf_db']:+.1f} dB · yunque {fj['anvil_hf_db (boceto)']:+.1f} dB → {hf_drop:.1f} dB"),
        ('18 una sola cumbre: clímax II ≥ clímax I + 0,5 LU y ≥ su cola', peak2 >= s['clímax I 41-48'] + 0.5
         and peak2 >= s['cola 55-56'], f"II {peak2} · I {s['clímax I 41-48']} · cola {s['cola 55-56']}"),
        ('19 el órgano no tapa los tambores (clímax, frente a los tambores no más alto que en el boceto)',
         bal['organ_vs_drums_lu'] <= bal['organ_vs_drums_lu (boceto)'],
         f"{bal['organ_vs_drums_lu']:+.1f} LU · boceto {bal['organ_vs_drums_lu (boceto)']:+.1f} LU"),
        ('20 ninguna parte > -6 dB de pico', p[loudest]['pico_db'] <= -6, f"{loudest} {p[loudest]['pico_db']} dB"),
        ('20 sala wet_dry_lu en -8…-4', -8 <= r['wet_dry_lu'] <= -4, f"{r['wet_dry_lu']} LU"),
    ]


def main() -> int:
    if not os.path.exists(MIDI):
        compose.write_midi(MIDI)
    previous = json.load(open(REPORT)) if os.path.exists(REPORT) else None
    report = render.render(SPEC)
    mp3 = measure(OUT, sections=True)
    bal = balance()
    report.update(mp3=mp3, balance=bal)
    with open(REPORT, 'w') as f:
        json.dump(report, f, indent=1, ensure_ascii=False)

    print(f"{report['out']}\n  {report['seconds']} s · loop_samples {report['loop_samples']}")
    print(f"  MP3 decodificado: {mp3['lufs']} LUFS · {mp3['true_peak_db']} dBTP · seam_jump {mp3['seam_jump']} · "
          f"{mp3['samples']} muestras · sala {report['wet_dry_lu']} LU")
    prev_parts = previous['parts'] if previous else {}
    print('\nPartes (tras gain_db, antes del bus):     pico dB   LUFS' + ('    (antes)' if previous else ''))
    for name, part in report['parts'].items():
        line = f'  {name:16s} {part["notas"]:4d} notas   {part["pico_db"]:6.1f}  {part["lufs"]:6.1f}'
        if name in prev_parts:
            line += f'    ({prev_parts[name]["pico_db"]:6.1f} / {prev_parts[name]["lufs"]:6.1f})'
        print(line)
    prev_sections = (previous.get('mp3') or {}).get('sections_lufs', {}) if previous else {}
    print('\nSecciones (LUFS sobre el MP3):')
    for name, v in mp3['sections_lufs'].items():
        before = prev_sections.get(name)
        print(f'  {name:18s} {v:6.1f}' + (f'   (antes {before:6.1f})' if before is not None else ''))
    print('\nBalance en A (LU respecto al coro, cada parte sola tras su bus):')
    for name, v in bal['rel_choir_lu'].items():
        print(f'  {name:16s} {v:+6.1f}')
    print('  forja:', bal['forja'], '· órgano vs tambores (41-56):', bal['organ_vs_drums_lu'])
    refs = {k: measure(path) for k, path in REFERENCES.items() if os.path.exists(path)}
    prev_bands = (previous.get('mp3') or previous)['bands_db'] if previous else None
    print('\nBandas dB (rel. al total)      nueva   ' + ('anterior   ' if prev_bands else '')
          + '   '.join(f'{k:>9s}' for k in refs))
    for k, v in mp3['bands_db'].items():
        line = f'  {k:24s} {v:7.1f}'
        if prev_bands:
            line += f'   {prev_bands[k]:7.1f}'
        for ref in refs.values():
            line += f'   {ref["bands_db"][k]:9.1f}'
        print(line)
    print('\nCriterios del brief:')
    results = checks(report, mp3, bal)
    for label, ok, value in results:
        print(f"  [{'ok' if ok else 'FALLA'}] {label}: {value}")
    return 0 if all(ok for _, ok, _ in results) else 1


if __name__ == '__main__':
    sys.exit(main())
