"""Reads a multitrack MIDI file into notes and controller curves in seconds."""
from __future__ import annotations

from dataclasses import dataclass, field

import mido


@dataclass
class Note:
    pitch: int
    velocity: int
    start: float  # seconds
    end: float


@dataclass
class Track:
    name: str
    notes: list[Note] = field(default_factory=list)
    cc: dict[int, list[tuple[float, int]]] = field(default_factory=dict)  # controller → [(time, value)]


@dataclass
class Song:
    tracks: dict[str, Track]
    length: float  # seconds until the last event
    tempo_map: list[tuple[int, int]]  # (tick, microseconds per beat)
    ticks_per_beat: int


def _tempo_map(mid: mido.MidiFile) -> list[tuple[int, int]]:
    changes = []
    for tr in mid.tracks:
        tick = 0
        for msg in tr:
            tick += msg.time
            if msg.type == 'set_tempo':
                changes.append((tick, msg.tempo))
    changes.sort()
    if not changes or changes[0][0] > 0:
        changes.insert(0, (0, 500000))
    return changes


def _seconds(tick: int, tmap: list[tuple[int, int]], tpb: int) -> float:
    t, last_tick, tempo = 0.0, 0, tmap[0][1]
    for change_tick, change_tempo in tmap[1:]:
        if change_tick >= tick:
            break
        t += (change_tick - last_tick) * tempo / 1e6 / tpb
        last_tick, tempo = change_tick, change_tempo
    return t + (tick - last_tick) * tempo / 1e6 / tpb


def load(path: str) -> Song:
    mid = mido.MidiFile(path)
    tmap, tpb = _tempo_map(mid), mid.ticks_per_beat
    tracks: dict[str, Track] = {}
    length = 0.0
    for i, tr in enumerate(mid.tracks):
        name = next((m.name for m in tr if m.type == 'track_name'), f'track{i}')
        track = tracks.setdefault(name, Track(name))
        tick, open_notes = 0, {}
        for msg in tr:
            tick += msg.time
            now = _seconds(tick, tmap, tpb)
            if msg.type == 'note_on' and msg.velocity > 0:
                open_notes.setdefault(msg.note, []).append((now, msg.velocity))
            elif msg.type in ('note_off', 'note_on'):
                if open_notes.get(msg.note):
                    start, vel = open_notes[msg.note].pop(0)
                    track.notes.append(Note(msg.note, vel, start, now))
            elif msg.type == 'control_change':
                track.cc.setdefault(msg.control, []).append((now, msg.value))
            length = max(length, now)
        track.notes.sort(key=lambda n: n.start)
    return Song({k: v for k, v in tracks.items() if v.notes or v.cc}, length, tmap, tpb)
