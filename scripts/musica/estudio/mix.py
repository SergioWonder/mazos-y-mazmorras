"""Mix and master: buses with EQ and compression, a shared convolution hall,
loudness to target, true-peak limiting, seamless loop folding and MP3 export."""
from __future__ import annotations

import os
import subprocess
import tempfile

import numpy as np
import pyloudnorm
import soundfile as sf
from pedalboard import Compressor, HighShelfFilter, LowShelfFilter, Pedalboard, PeakFilter
from scipy.signal import butter, fftconvolve, resample_poly, sosfilt


# ── measures ────────────────────────────────────────────────────────────────
def lufs(x: np.ndarray, sr: int) -> float:
    return float(pyloudnorm.Meter(sr).integrated_loudness(x.astype(np.float64)))


def true_peak_db(x: np.ndarray, sr: int) -> float:
    """Inter-sample peak (4× oversampling), in dBTP."""
    up = resample_poly(x, 4, 1, axis=0)
    return float(20 * np.log10(max(1e-9, np.abs(up).max())))


def seam_jump(x: np.ndarray) -> float:
    """How much the loop jumps where its end meets its start (0 = continuous)."""
    step = np.abs(np.diff(x[-64:], axis=0)).max() if len(x) > 64 else 0.0
    return float(max(0.0, np.abs(x[0] - x[-1]).max() - step))


def band_energy(x: np.ndarray, sr: int) -> dict[str, float]:
    """Mean energy per band in dB, to compare mixes objectively."""
    mono = x.mean(axis=1) if x.ndim == 2 else x
    spec = np.abs(np.fft.rfft(mono)) ** 2
    freqs = np.fft.rfftfreq(len(mono), 1 / sr)
    bands = {'sub <60': (0, 60), 'graves 60-250': (60, 250), 'medios-graves 250-800': (250, 800),
             'medios 0.8-2.5k': (800, 2500), 'presencia 2.5-6k': (2500, 6000), 'aire 6-16k': (6000, 16000)}
    total = spec.sum() + 1e-12
    return {k: float(10 * np.log10(spec[(freqs >= a) & (freqs < b)].sum() / total + 1e-12)) for k, (a, b) in bands.items()}


# ── processing ──────────────────────────────────────────────────────────────
def process_bus(x: np.ndarray, sr: int, highpass: float = 40, low_shelf: tuple[float, float] | None = None,
                peaks: list[tuple[float, float, float]] = (), high_shelf: tuple[float, float] | None = None,
                comp: tuple[float, float] | None = None, gain_db: float = 0) -> np.ndarray:
    """EQ (12 dB/oct Butterworth high-pass, shelves, (freq, gain dB, Q) peaks) and gentle compression
    (threshold dB, ratio)."""
    x = sosfilt(butter(2, highpass, 'highpass', fs=sr, output='sos'), x, axis=0) if highpass else x
    fx = []
    if low_shelf:
        fx.append(LowShelfFilter(cutoff_frequency_hz=low_shelf[0], gain_db=low_shelf[1]))
    fx += [PeakFilter(cutoff_frequency_hz=f, gain_db=g, q=q) for f, g, q in peaks]
    if high_shelf:
        fx.append(HighShelfFilter(cutoff_frequency_hz=high_shelf[0], gain_db=high_shelf[1]))
    if comp:
        fx.append(Compressor(threshold_db=comp[0], ratio=comp[1], attack_ms=25, release_ms=200))
    out = Pedalboard(fx)(x.T.astype(np.float32), sr).T
    return out * 10 ** (gain_db / 20)


def hall_ir(sr: int, seconds: float = 2.6, predelay: float = 0.022, damping: float = 0.55, seed: int = 7) -> np.ndarray:
    """Synthetic stereo concert-hall impulse response: sparse early reflections, then a
    decorrelated diffuse tail whose highs die faster than its lows."""
    rng = np.random.default_rng(seed)
    n = int(seconds * sr)
    t = np.arange(n) / sr
    ir = np.zeros((n, 2), dtype=np.float64)
    for ch in range(2):
        noise = rng.standard_normal(n)
        lows = np.convolve(noise, np.ones(24) / 24, mode='same')
        highs = noise - lows
        rt_low, rt_high = seconds * 0.8, seconds * 0.8 * (1 - damping)
        tail = lows * np.exp(-6.9 * t / rt_low) * 3 + highs * np.exp(-6.9 * t / max(0.2, rt_high))
        onset = np.clip((t - predelay - 0.03) / 0.08, 0, 1)
        ir[:, ch] = tail * onset
        for _ in range(14):  # early reflections
            d = predelay + rng.uniform(0.003, 0.07)
            ir[int(d * sr), ch] += rng.uniform(0.25, 0.7) * rng.choice([-1, 1]) * np.exp(-d * 12)
    return (ir / np.sqrt((ir ** 2).sum(axis=0))).astype(np.float32)


def reverb(x: np.ndarray, ir: np.ndarray) -> np.ndarray:
    """Wet signal only (keeps its length plus the tail)."""
    return np.stack([fftconvolve(x[:, ch], ir[:, ch]) for ch in range(2)], axis=1).astype(np.float32)


def limiter(x: np.ndarray, sr: int, ceiling_db: float = -1.0, lookahead: float = 0.004, release: float = 0.08) -> np.ndarray:
    """Look-ahead peak limiter driven by the 4× oversampled peak."""
    ceiling = 10 ** (ceiling_db / 20)
    up = np.abs(resample_poly(x, 4, 1, axis=0)).max(axis=1)
    peak = up.reshape(-1, 4).max(axis=1)[: len(x)] if len(up) >= len(x) * 4 else np.abs(x).max(axis=1)
    need = np.minimum(1.0, ceiling / np.maximum(peak, 1e-9))
    la = max(1, int(lookahead * sr))
    from scipy.ndimage import minimum_filter1d
    need = minimum_filter1d(need, size=2 * la + 1, origin=0)
    gain = np.empty_like(need)
    coef = np.exp(-1 / (release * sr))
    g = 1.0
    for i, target in enumerate(need):  # instant attack (look-ahead done), smooth release
        g = target if target < g else target + (g - target) * coef
        gain[i] = g
    return (x * gain[:, None]).astype(np.float32)


def master(x: np.ndarray, sr: int, target_lufs: float = -17.0, ceiling_dbtp: float = -1.0) -> np.ndarray:
    """Loudness to target, then true-peak safe (trims a little more if the limiter is not enough)."""
    out = x.astype(np.float32)
    for _ in range(3):
        out = out * 10 ** ((target_lufs - lufs(out, sr)) / 20)
        out = limiter(out, sr, ceiling_dbtp - 0.3)
    over = true_peak_db(out, sr) - ceiling_dbtp
    if over > 0:
        out = out * 10 ** (-(over + 0.05) / 20)
    return out


def fold_loop(x: np.ndarray, loop_len: int) -> np.ndarray:
    """Exact loop: what rings past the end (reverb tails, releases) is added back to the start."""
    out = x[:loop_len].copy()
    tail = x[loop_len:]
    while len(tail):
        k = min(len(tail), loop_len)
        out[:k] += tail[:k]
        tail = tail[k:]
    return out


def export_mp3(x: np.ndarray, sr: int, path: str, quality: int = 2) -> None:
    """MP3 in LAME VBR (quality 2 ≈ 190 kbps): CBR 192k came out 0.264 dB quieter than its input,
    VBR keeps the level; the LAME header keeps the exact loop length for gapless decoding."""
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, 'x.wav')
        sf.write(wav, x, sr, subtype='PCM_24')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ar', str(sr), '-codec:a', 'libmp3lame',
                        '-q:a', str(quality), path], check=True)
