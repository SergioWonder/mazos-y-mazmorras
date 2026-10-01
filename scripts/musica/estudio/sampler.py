"""SFZ sample player: picks regions by key, velocity and round robin, pitch-shifts,
loops and shapes every note with its amplitude envelope, then lays notes on a track."""
from __future__ import annotations

import random

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

from . import sfz
from .midi_io import Note

MIN_ATTACK = 0.003  # seconds: no sample starts with a click
END_FADE = 0.006    # seconds: a sample cut short fades out instead of clicking


class Instrument:
    def __init__(self, inst: sfz.SfzInstrument, sr: int = 44100, seed: int = 1):
        self.inst, self.sr = inst, sr
        self._audio: dict[str, np.ndarray] = {}
        self._rr: dict[tuple, int] = {}
        self._rng = random.Random(seed)

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
                from math import gcd
                g = gcd(rate, self.sr)
                data = resample_poly(data, self.sr // g, rate // g, axis=0).astype(np.float32)
            self._audio[path] = data
        return self._audio[path]

    # ── region choice ────────────────────────────────────────────────────────
    def pick(self, key: int, vel: int, trigger: str = 'attack') -> sfz.Region | None:
        cands = [r for r in self.inst.regions
                 if r.lokey <= key <= r.hikey and r.get('trigger', 'attack') == trigger]
        if not cands:
            return None
        by_vel = [r for r in cands if r.lovel <= vel <= r.hivel]
        if not by_vel:  # outside every layer: the nearest one
            nearest = min(cands, key=lambda r: min(abs(vel - r.lovel), abs(vel - r.hivel)))
            by_vel = [r for r in cands if (r.lovel, r.hivel) == (nearest.lovel, nearest.hivel)]
        rnd = self._rng.random()
        by_rand = [r for r in by_vel if r.num('lorand', 0) <= rnd < r.num('hirand', 1.0001)] or by_vel
        seq = int(by_rand[0].num('seq_length', 1))
        if seq > 1:
            sig = (by_rand[0].lokey, by_rand[0].hikey, by_rand[0].lovel, by_rand[0].hivel, trigger)
            n = self._rr.get(sig, 0)
            self._rr[sig] = n + 1
            pos = n % seq + 1
            by_rand = [r for r in by_rand if int(r.num('seq_position', 1)) == pos] or by_rand
        return by_rand[0]

    # ── one note ─────────────────────────────────────────────────────────────
    def render_note(self, key: int, vel: int, duration: float, trigger: str = 'attack') -> np.ndarray:
        region = self.pick(key, vel, trigger)
        if region is None:
            return np.zeros((0, 2), dtype=np.float32)
        src = self.audio(region)
        sr = self.sr
        semis = (key - region.keycenter) * region.num('pitch_keytrack', 100) / 100
        semis += region.num('transpose', 0) + region.num('tune', 0) / 100
        ratio = 2 ** (semis / 12)

        attack = max(MIN_ATTACK, region.num('ampeg_attack', 0))
        hold, decay = region.num('ampeg_hold', 0), region.num('ampeg_decay', 0)
        sustain = region.num('ampeg_sustain', 100) / 100
        release = max(END_FADE, region.num('ampeg_release', 0.02))
        one_shot = region.get('loop_mode') == 'one_shot' or trigger == 'release'
        gate = len(src) / ratio / sr if one_shot else duration
        n = int(round((gate + (0 if one_shot else release)) * sr))

        offset = region.num('offset', 0)
        pos = offset + np.arange(n) * ratio
        loop = region.get('loop_mode') in ('loop_continuous', 'loop_sustain') and region.get('loop_end') is not None
        if loop:
            ls, le = region.num('loop_start', 0), min(region.num('loop_end', len(src) - 1), len(src) - 2)
            span = max(1.0, le - ls + 1)
            over = pos > le
            pos[over] = ls + np.mod(pos[over] - ls, span)
        valid = pos < len(src) - 1
        n_valid = int(valid.sum()) if not loop else n
        pos = pos[:n_valid]
        i = pos.astype(np.int64)
        frac = (pos - i)[:, None].astype(np.float32)
        out = src[i] * (1 - frac) + src[np.minimum(i + 1, len(src) - 1)] * frac

        # amplitude envelope (attack, hold, decay → sustain, release at note-off)
        t = np.arange(len(out)) / sr
        env = np.ones(len(out), dtype=np.float32)
        env = np.where(t < attack, t / attack, env)
        d0 = attack + hold
        if decay > 0:
            dec = sustain + (1 - sustain) * np.exp(-5 * (t - d0) / decay)
            env = np.where(t >= d0, dec, env)
        elif sustain < 1:
            env = np.where(t >= d0, sustain, env)
        if not one_shot:
            after = t >= gate
            level = float(env[min(int(gate * sr), len(env) - 1)]) if len(env) else 0
            rel = level * np.clip(1 - (t - gate) / release, 0, 1) ** 2
            env = np.where(after, np.minimum(env, rel), env)
        if len(out) and n_valid < n:  # the sample ran out early: fade its end
            k = min(len(out), int(END_FADE * sr))
            env[-k:] *= np.linspace(1, 0, k)
        out = out * env[:, None]

        gain = 10 ** (region.num('volume', 0) / 20)
        track = region.num('amp_veltrack', 100) / 100
        gain *= (1 - track) + track * (vel / 127) ** 2
        pan = region.num('pan', 0) / 100
        lr = np.array([np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)], dtype=np.float32) * np.sqrt(2)
        return (out * gain * lr).astype(np.float32)

    # ── a whole track ────────────────────────────────────────────────────────
    def render_track(self, notes: list[Note], total_seconds: float,
                     expression: list[tuple[float, int]] | None = None) -> np.ndarray:
        """Lays every note (plus release samples) and applies the CC11/CC1 gain curve."""
        n = int(round(total_seconds * self.sr))
        out = np.zeros((n, 2), dtype=np.float32)
        has_release = any(r.get('trigger') == 'release' for r in self.inst.regions)
        for note in notes:
            parts = [(note.start, self.render_note(note.pitch, note.velocity, note.end - note.start))]
            if has_release:
                parts.append((note.end, self.render_note(note.pitch, note.velocity, 0, 'release') * 0.7))
            for start, audio in parts:
                s = int(round(start * self.sr))
                e = min(n, s + len(audio))
                if e > s:
                    out[s:e] += audio[: e - s]
        if expression:
            out *= expression_curve(expression, n, self.sr)[:, None]
        return out


def expression_curve(points: list[tuple[float, int]], n: int, sr: int) -> np.ndarray:
    """CC points (time, 0–127) → per-sample gain, linear between points, square law."""
    times = np.array([p[0] for p in points]) * sr
    values = np.array([p[1] for p in points], dtype=np.float32) / 127
    curve = np.interp(np.arange(n), times, values)
    return (curve ** 2).astype(np.float32)
