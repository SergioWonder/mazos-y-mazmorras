"""Renders a multitrack MIDI with sample instruments into a mastered, seamless loop.

A song is described by a MixSpec: which SFZ instrument plays each MIDI track, which bus
it goes to (EQ and compression per instrument family), where it sits (pan, level) and
how much of it goes to the shared hall. `render()` returns objective measures so the
mix can be judged and compared without ears."""
from __future__ import annotations

import os
from dataclasses import dataclass, field

import numpy as np

from . import config, midi_io, mix, sampler


@dataclass
class Part:
    track: str          # MIDI track name
    sfz: str            # instrument (absolute path, or relative to the sample libraries)
    bus: str = 'main'
    pan: float = 0.0    # -1 left … 1 right
    gain_db: float = 0.0
    send: float = 0.25  # share sent to the hall reverb
    width: float = 1.0  # stereo width of the samples (0 = mono)
    automation: list[tuple[float, float]] = field(default_factory=list)  # fader ride: (bar position, dB)


@dataclass
class MixSpec:
    midi: str
    out: str
    bpm: float
    beats_per_bar: float
    bars: int
    parts: list[Part]
    buses: dict[str, dict] = field(default_factory=dict)  # bus → mix.process_bus kwargs
    reverb: dict = field(default_factory=lambda: {'seconds': 2.6, 'predelay': 0.022, 'damping': 0.55})
    reverb_return_db: float = -4.0
    reverb_eq: dict = field(default_factory=dict)  # mix.process_bus kwargs for the hall return
    master_bus: dict = field(default_factory=lambda: {'highpass': 28, 'comp': (-16, 1.6)})
    target_lufs: float = -17.0
    ceiling_dbtp: float = -1.0
    tail_seconds: float = 4.0
    sections: dict[str, tuple[int, int]] = field(default_factory=dict)  # name → (first bar, last bar), 1-based
    sr: int = config.SR


def automation_curve(points: list[tuple[float, float]], n: int, sr: int, bar_seconds: float) -> np.ndarray:
    """Fader ride → per-sample gain. Points are (bar position, dB) with bars 1-based (2.5 = middle
    of bar 2); dB is interpolated linearly between points and held before the first and after the last."""
    if not points:
        return np.ones(n, dtype=np.float32)
    pts = sorted(points, key=lambda p: p[0])  # stable: two points on one bar make a step, in the written order
    times = np.array([(b - 1) * bar_seconds * sr for b, _ in pts])
    db = np.interp(np.arange(n), times, np.array([g for _, g in pts], dtype=np.float64))
    return (10 ** (db / 20)).astype(np.float32)


def _place(x: np.ndarray, pan: float, width: float) -> np.ndarray:
    mid, side = (x[:, 0] + x[:, 1]) / 2, (x[:, 0] - x[:, 1]) / 2 * width
    l, r = mid + side, mid - side
    a = (pan + 1) * np.pi / 4
    return np.stack([l * np.cos(a), r * np.sin(a)], axis=1) * np.sqrt(2)


def render(spec: MixSpec) -> dict:
    sr = spec.sr
    song = midi_io.load(spec.midi)
    bar_seconds = spec.beats_per_bar * 60 / spec.bpm
    loop_samples = int(round(spec.bars * bar_seconds * sr))
    total = loop_samples / sr + spec.tail_seconds
    instruments: dict[str, sampler.Instrument] = {}
    buses: dict[str, np.ndarray] = {}
    sends: dict[str, np.ndarray] = {}
    report_parts = {}
    for part in spec.parts:
        track = song.tracks.get(part.track)
        if track is None:
            raise KeyError(f'MIDI track {part.track!r} not found (has: {sorted(song.tracks)})')
        path = part.sfz if os.path.isabs(part.sfz) else config.library(part.sfz)
        inst = instruments.setdefault(path, sampler.Instrument.load(path, sr))
        audio = inst.render_track(track.notes, total, cc=track.cc)
        if part.automation:
            audio = audio * automation_curve(part.automation, len(audio), sr, bar_seconds)[:, None]
        audio = _place(audio, part.pan, part.width) * 10 ** (part.gain_db / 20)
        report_parts[part.track] = {'notas': len(track.notes), 'pico_db': round(20 * np.log10(np.abs(audio).max() + 1e-9), 1),
                                    'lufs': round(mix.lufs(audio, sr), 1)}  # gated: only while it plays
        buses[part.bus] = buses.get(part.bus, 0) + audio
        sends[part.bus] = sends.get(part.bus, 0) + audio * part.send
    n = int(round(total * sr))
    dry = np.zeros((n, 2), dtype=np.float32)
    send_sum = np.zeros((n, 2), dtype=np.float32)
    for name, audio in buses.items():
        bus = spec.buses.get(name, {})
        dry += mix.process_bus(audio, sr, **bus)
        # sends leave after the bus EQ and level (the hall hears what the bus lets through), before its compressor
        send_sum += mix.process_bus(sends[name], sr, **{k: v for k, v in bus.items() if k != 'comp'})
    wet = mix.reverb(send_sum, mix.hall_ir(sr, **spec.reverb))[: len(dry)] * 10 ** (spec.reverb_return_db / 20)
    wet = mix.process_bus(wet, sr, **spec.reverb_eq)
    wet_dry_lu = mix.lufs(wet, sr) - mix.lufs(dry, sr)
    full = mix.process_bus(dry + wet, sr, **spec.master_bus)
    looped = mix.fold_loop(full, loop_samples)
    out = mix.master(looped, sr, spec.target_lufs, spec.ceiling_dbtp)
    mix.export_mp3(out, sr, spec.out)
    bar = bar_seconds * sr
    sections = {name: round(mix.lufs(out[int(round((a - 1) * bar)): int(round(b * bar))], sr), 1)
                for name, (a, b) in spec.sections.items()}
    return {
        'out': spec.out, 'loop_samples': loop_samples, 'seconds': round(loop_samples / sr, 2),
        'lufs': round(mix.lufs(out, sr), 2), 'true_peak_db': round(mix.true_peak_db(out, sr), 2),
        'seam_jump': round(mix.seam_jump(out), 4), 'bands_db': {k: round(v, 1) for k, v in mix.band_energy(out, sr).items()},
        'parts': report_parts, 'sections_lufs': sections, 'wet_dry_lu': round(wet_dry_lu, 1),
    }
