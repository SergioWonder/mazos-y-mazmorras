"""SFZ sample player: picks every region that matches a note (key, velocity, round robin,
random, keyswitch and controller crossfades), pitch-shifts, loops, filters and shapes it
with its amplitude envelope, then lays the notes of a track over time.

Supported beyond the basics (needed by Sonatina Symphonic Orchestra):
- `xfin_/xfout_locc/hicc` crossfades and `xf_cccurve` (dynamics layers on CC1);
- `gain_ccN` (dB at full controller), also followed over time while a note is held;
- `fil_type` lpf_1p/lpf_2p with `cutoff`, `cutoff_ccN`, `fil_keytrack`, `fil_veltrack`;
- keyswitches (`sw_lokey/sw_hikey/sw_last/sw_default`): keyswitch notes do not sound;
- `trigger=first` plays as a normal attack, `trigger=legato` is skipped (no legato engine);
- `ampeg_vel2attack/vel2decay/vel2release`, `group_volume`, `master_volume`, `global_volume`.
"""
from __future__ import annotations

import random
import re
from math import gcd

import numpy as np
import soundfile as sf
from scipy.signal import butter, lfilter, resample_poly

from . import sfz
from .midi_io import Note

MIN_ATTACK = 0.003  # seconds: no sample starts with a click
END_FADE = 0.006    # seconds: a sample cut short fades out instead of clicking
_CC_OPCODE = re.compile(r'(?:xfin_|xfout_|gain_cc|cutoff_cc|lo?cc|hicc|loc|hic)')


def _cc_number(key: str, prefix: str) -> int | None:
    m = re.fullmatch(prefix + r'(\d+)', key)
    return int(m.group(1)) if m else None


class Instrument:
    def __init__(self, inst: sfz.SfzInstrument, sr: int = 44100, seed: int = 1):
        self.inst, self.sr = inst, sr
        self._audio: dict[str, np.ndarray] = {}
        self._rr: dict[tuple, int] = {}
        self._rng = random.Random(seed)
        regions = inst.regions
        # controller defaults (<control> set_ccN)
        self.cc_defaults: dict[int, int] = {}
        for r in regions:
            for k, v in r.opcodes.items():
                n = _cc_number(k, 'set_cc')
                if n is not None:
                    self.cc_defaults[n] = int(float(v))
        # keyswitch range and default
        sw = [r for r in regions if r.get('sw_last') is not None]
        self.sw_range = (min(r.note('sw_lokey', 0) for r in sw), max(r.note('sw_hikey', 127) for r in sw)) if sw else None
        self.sw_default = sw[0].note('sw_default', sw[0].note('sw_last', 0)) if sw else None
        # controllers the instrument itself reacts to (then they are not a plain volume curve)
        self.reacts_to = {int(m) for r in regions for k in r.opcodes for m in re.findall(r'(?:cc)(\d+)$', k)
                          if not k.startswith(('set_cc', 'label_cc'))}

    @classmethod
    def load(cls, path: str, sr: int = 44100, seed: int = 1) -> 'Instrument':
        return cls(sfz.load(path), sr, seed)

    # ── samples ──────────────────────────────────────────────────────────────
    def audio(self, region: sfz.Region) -> np.ndarray:
        """The region's sample as float32 stereo at the instrument rate (cached)."""
        path = region.sample_path
        if path not in self._audio:
            data, rate = sf.read(path, dtype='float32', always_2d=True)
            if data.shape[1] == 1:
                data = np.repeat(data, 2, axis=1)
            data = data[:, :2]
            if rate != self.sr:
                g = gcd(rate, self.sr)
                data = resample_poly(data, self.sr // g, rate // g, axis=0).astype(np.float32)
            self._audio[path] = data
        return self._audio[path]

    # ── region choice ────────────────────────────────────────────────────────
    def _controls(self, cc: dict[int, int] | None) -> dict[int, int]:
        return {**self.cc_defaults, **(cc or {})}

    @staticmethod
    def _xfade(region: sfz.Region, ccs: dict[int, int], vel: int) -> float:
        """Crossfade gain of a region for the current controllers and velocity."""
        g = 1.0
        power = region.get('xf_cccurve', 'power') == 'power'
        for k in region.opcodes:
            for kind in ('xfin_locc', 'xfout_locc'):
                n = _cc_number(k, kind)
                if n is None:
                    continue
                lo = region.num(f'{kind}{n}', 0)
                hi = region.num(f'{kind.replace("lo", "hi")}{n}', 127)
                v = ccs.get(n, 0)
                x = 1.0 if hi <= lo else min(1.0, max(0.0, (v - lo) / (hi - lo)))
                if kind.startswith('xfout'):
                    x = 1.0 - x if hi > lo else (0.0 if v > hi else 1.0)
                g *= np.sqrt(x) if power else x
        for kind in ('xfin_lovel', 'xfout_lovel'):
            if region.get(kind) is not None:
                lo, hi = region.num(kind, 0), region.num(kind.replace('lo', 'hi'), 127)
                x = 1.0 if hi <= lo else min(1.0, max(0.0, (vel - lo) / (hi - lo)))
                g *= (1.0 - x) if kind.startswith('xfout') else x
        return float(g)

    def pick_all(self, key: int, vel: int, trigger: str = 'attack', cc: dict[int, int] | None = None,
                 switch: int | None = None) -> list[tuple[sfz.Region, float]]:
        """Every region that sounds for this note, with its crossfade gain."""
        triggers = ('attack', 'first') if trigger == 'attack' else (trigger,)
        ccs = self._controls(cc)
        sw = switch if switch is not None else self.sw_default
        cands = [r for r in self.inst.regions
                 if r.lokey <= key <= r.hikey and r.get('trigger', 'attack') in triggers
                 and (r.get('sw_last') is None or r.note('sw_last', -1) == sw)
                 and all(r.num(f'locc{n}', 0) <= ccs.get(n, 0) <= r.num(f'hicc{n}', 127)
                         for n in {_cc_number(k, 'locc') for k in r.opcodes} - {None})]
        if not cands:
            return []
        by_vel = [r for r in cands if r.lovel <= vel <= r.hivel]
        if not by_vel:  # outside every layer: the nearest one
            nearest = min(cands, key=lambda r: min(abs(vel - r.lovel), abs(vel - r.hivel)))
            by_vel = [r for r in cands if (r.lovel, r.hivel) == (nearest.lovel, nearest.hivel)]
        rnd = self._rng.random()
        by_vel = [r for r in by_vel if r.num('lorand', 0) <= rnd < r.num('hirand', 1.0001)] or by_vel
        # round robin: one counter per layer that shares a seq_length
        chosen, counted = [], {}
        for r in by_vel:
            seq = int(r.num('seq_length', 1))
            if seq <= 1:
                chosen.append(r)
                continue
            sig = (r.lokey, r.hikey, r.lovel, r.hivel, seq, trigger)
            if sig not in counted:
                counted[sig] = self._rr.get(sig, 0)
                self._rr[sig] = counted[sig] + 1
            if int(r.num('seq_position', 1)) == counted[sig] % seq + 1:
                chosen.append(r)
        out = [(r, self._xfade(r, ccs, vel)) for r in chosen]
        return [(r, g) for r, g in out if g > 1e-4]

    def pick(self, key: int, vel: int, trigger: str = 'attack') -> sfz.Region | None:
        found = self.pick_all(key, vel, trigger)
        return found[0][0] if found else None

    # ── one note ─────────────────────────────────────────────────────────────
    def render_note(self, key: int, vel: int, duration: float, trigger: str = 'attack',
                    cc: dict[int, int] | None = None, switch: int | None = None) -> np.ndarray:
        layers = self.pick_all(key, vel, trigger, cc, switch)
        if not layers:
            return np.zeros((0, 2), dtype=np.float32)
        ccs = self._controls(cc)
        parts = [self._render_region(r, g, key, vel, duration, trigger, ccs) for r, g in layers]
        n = max(len(p) for p in parts)
        out = np.zeros((n, 2), dtype=np.float32)
        for p in parts:
            out[: len(p)] += p
        return out

    def _render_region(self, region: sfz.Region, xf: float, key: int, vel: int, duration: float,
                       trigger: str, ccs: dict[int, int]) -> np.ndarray:
        src = self.audio(region)
        sr = self.sr
        semis = (key - region.keycenter) * region.num('pitch_keytrack', 100) / 100
        semis += region.num('transpose', 0) + region.num('tune', 0) / 100
        ratio = 2 ** (semis / 12)
        v = vel / 127

        attack = max(MIN_ATTACK, region.num('ampeg_attack', 0) + region.num('ampeg_vel2attack', 0) * v)
        hold = max(0.0, region.num('ampeg_hold', 0))
        decay = max(0.0, region.num('ampeg_decay', 0) + region.num('ampeg_vel2decay', 0) * v)
        sustain = region.num('ampeg_sustain', 100) / 100
        release = max(END_FADE, region.num('ampeg_release', 0.02) + region.num('ampeg_vel2release', 0) * v)
        one_shot = region.get('loop_mode') == 'one_shot' or trigger == 'release'
        offset = region.num('offset', 0)
        gate = max(0.0, (len(src) - offset) / ratio / sr) if one_shot else duration
        n = int(round((gate + (0 if one_shot else release)) * sr))

        pos = offset + np.arange(n) * ratio
        loop = region.get('loop_mode') in ('loop_continuous', 'loop_sustain') and region.get('loop_end') is not None
        if loop:
            ls, le = region.num('loop_start', 0), min(region.num('loop_end', len(src) - 1), len(src) - 2)
            span = max(1.0, le - ls + 1)
            over = pos > le
            pos[over] = ls + np.mod(pos[over] - ls, span)
        n_valid = n if loop else int((pos < len(src) - 1).sum())
        pos = pos[:n_valid]
        i = pos.astype(np.int64)
        frac = (pos - i)[:, None].astype(np.float32)
        out = src[i] * (1 - frac) + src[np.minimum(i + 1, len(src) - 1)] * frac

        # low-pass filter: cutoff moved by controllers, key and velocity (in cents)
        ftype = region.get('fil_type', '')
        if ftype.startswith('lpf') and region.get('cutoff') is not None and len(out):
            cents = region.num('fil_veltrack', 0) * v
            cents += region.num('fil_keytrack', 0) * (key - region.note('fil_keycenter', 60))
            for k in region.opcodes:
                m = _cc_number(k, 'cutoff_cc')
                if m is not None:
                    cents += region.num(k, 0) * ccs.get(m, 0) / 127
            cutoff = region.num('cutoff', 20000) * 2 ** (cents / 1200)
            if cutoff < sr * 0.45:
                b, a = butter(1 if ftype == 'lpf_1p' else 2, cutoff / (sr / 2))
                out = lfilter(b, a, out, axis=0).astype(np.float32)

        # amplitude envelope (attack, hold, decay → sustain, release at note-off)
        t = np.arange(len(out)) / sr
        env = np.ones(len(out), dtype=np.float32)
        env = np.where(t < attack, t / attack, env)
        d0 = attack + hold
        if decay > 0:
            env = np.where(t >= d0, sustain + (1 - sustain) * np.exp(-5 * (t - d0) / decay), env)
        elif sustain < 1:
            env = np.where(t >= d0, sustain, env)
        if not one_shot and len(env):
            level = float(env[min(int(gate * sr), len(env) - 1)])
            rel = level * np.clip(1 - (t - gate) / release, 0, 1) ** 2
            env = np.where(t >= gate, np.minimum(env, rel), env)
        if len(out) and n_valid < n:  # the sample ran out early: fade its end
            k = min(len(out), int(END_FADE * sr))
            env[-k:] *= np.linspace(1, 0, k)
        out = out * env[:, None]

        db = sum(region.num(k, 0) for k in ('volume', 'group_volume', 'master_volume', 'global_volume'))
        for k in region.opcodes:  # gain_ccN: dB at full controller, scaled by its value now
            m = _cc_number(k, 'gain_cc')
            if m is not None:
                db += region.num(k, 0) * ccs.get(m, 0) / 127
        gain = 10 ** (db / 20) * xf
        track = region.num('amp_veltrack', 100) / 100
        gain *= (1 - track) + track * v ** 2
        pan = region.num('pan', 0) / 100
        lr = np.array([np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)], dtype=np.float32) * np.sqrt(2)
        return (out * gain * lr).astype(np.float32)

    def _gain_cc(self, key: int, vel: int) -> dict[int, float]:
        """dB per controller at full value (gain_ccN) of the regions this note uses."""
        found = self.pick_all(key, vel)
        out: dict[int, float] = {}
        for r, _ in found[:1]:
            for k in r.opcodes:
                m = _cc_number(k, 'gain_cc')
                if m is not None:
                    out[m] = r.num(k, 0)
        return out

    # ── a whole track ────────────────────────────────────────────────────────
    def render_track(self, notes: list[Note], total_seconds: float,
                     expression: list[tuple[float, int]] | None = None,
                     cc: dict[int, list[tuple[float, int]]] | None = None) -> np.ndarray:
        """Lays every note (plus release samples). Controllers the instrument reacts to
        (Sonatina's CC1 dynamics) shape each note; CC11 — and CC1 for instruments that
        ignore it — act as an overall volume curve (square law)."""
        sr = self.sr
        n = int(round(total_seconds * sr))
        out = np.zeros((n, 2), dtype=np.float32)
        cc = cc or {}
        has_release = any(r.get('trigger') == 'release' for r in self.inst.regions)
        switch = self.sw_default
        for note in notes:
            if self.sw_range and self.sw_range[0] <= note.pitch <= self.sw_range[1]:
                switch = note.pitch  # a keyswitch: changes the articulation, does not sound
                continue
            at = {k: _value_at(pts, note.start) for k, pts in cc.items() if k in self.reacts_to and pts}
            parts = [(note.start, self.render_note(note.pitch, note.velocity, note.end - note.start, cc=at, switch=switch))]
            if has_release:
                parts.append((note.end, self.render_note(note.pitch, note.velocity, 0, 'release', cc=at, switch=switch) * 0.7))
            for start, audio in parts:
                s = int(round(start * sr))
                e = min(n, s + len(audio))
                if e <= s:
                    continue
                chunk = audio[: e - s]
                # held notes follow their gain_ccN controllers (crescendos, swells)
                for m, db in self._gain_cc(note.pitch, note.velocity).items():
                    if cc.get(m):
                        times = np.arange(s, e) / sr
                        now = np.interp(times, *zip(*[(p[0], p[1]) for p in cc[m]]))
                        then = at.get(m, self.cc_defaults.get(m, 0))
                        chunk = chunk * (10 ** (db * (now - then) / 127 / 20)).astype(np.float32)[:, None]
                out[s:e] += chunk
        curve = expression if expression is not None else cc.get(11) or (cc.get(1) if 1 not in self.reacts_to else None)
        if curve:
            out *= expression_curve(curve, n, sr)[:, None]
        return out


def _value_at(points: list[tuple[float, int]], t: float) -> int:
    """Controller value at time t (linear between points, held outside)."""
    times = [p[0] for p in points]
    return int(round(float(np.interp(t, times, [p[1] for p in points]))))


def expression_curve(points: list[tuple[float, int]], n: int, sr: int) -> np.ndarray:
    """CC points (time, 0–127) → per-sample gain, linear between points, square law."""
    times = np.array([p[0] for p in points]) * sr
    values = np.array([p[1] for p in points], dtype=np.float32) / 127
    curve = np.interp(np.arange(n), times, values)
    return (curve ** 2).astype(np.float32)
