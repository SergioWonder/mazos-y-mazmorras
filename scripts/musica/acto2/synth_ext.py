"""Extensions for the Act II tracks of "Mazo y Mazmorra".

Builds on local copies of the Act I library (synth_lib: event rendering, plucks,
reeds, FM bells, mastering) and the boss library (synth: formant choir, multiband
reverb IR). Adds the crypt palette: bass clarinet, warm marimba, dry "bone"
xylophone, soft "ooh" choir, distant organ and a muffled tambourine.
"""
import os
from multiprocessing import Pool

import numpy as np

import synth as S
import synth_lib as sl

SR = sl.SR


# ---------------------------------------------------------------- new instruments
def bass_clarinet(freq, dur, vel, seed, staccato=False):
    """Single reed: odd harmonics dominate, dark roll-off, woody breath."""
    rel = 0.07 if staccato else 0.15
    play = min(dur, 0.16) if staccato else dur
    n = int((play + rel) * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    vib_amt = np.clip((t - 0.35) / 0.4, 0, 1) * 0.003
    vib = vib_amt * np.sin(2 * np.pi * 4.9 * t)
    drift = 0.0012 * np.sin(2 * np.pi * rng.uniform(0.2, 0.6) * t + rng.uniform(0, 6))
    phase = 2 * np.pi * np.cumsum(freq * (1 + vib + drift)) / SR
    y = np.zeros(n)
    nh = int(5000 / freq)
    for h in range(1, nh + 1):
        fh = freq * h
        a = (1.0 if h % 2 else 0.18) / h ** 0.8
        a *= np.exp(-fh / 1300.0) + 0.15 * np.exp(-((fh - 1100) / 500) ** 2)
        y += a * np.sin(h * phase)
    y /= np.max(np.abs(y)) + 1e-9
    breath = sl.fft_filter(rng.standard_normal(n), lo=500, hi=2500, slope_hz=600)
    breath /= np.max(np.abs(breath)) + 1e-9
    env = sl.adsr(n, a=0.015 if staccato else 0.05, d=0.1, s=0.82, r=rel, hold=play)
    return (y + 0.03 * breath) * env * vel


def _modal(freq, partials, length, click_lo, click_hi, click_amt, seed, attack=0.0012):
    n = int(length * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    y = np.zeros(n)
    for ratio, gain, decay in partials:
        f = freq * ratio
        if f > 7500:
            continue
        y += gain * np.sin(2 * np.pi * f * t + rng.uniform(0, 0.3)) * np.exp(-t * decay)
    click = sl.fft_filter(rng.standard_normal(n), lo=click_lo, hi=click_hi, slope_hz=click_lo * 0.6)
    click /= np.max(np.abs(click)) + 1e-9
    y += click_amt * click * np.exp(-t * 180)
    y *= np.minimum(1, t / attack)
    y[-128:] *= np.linspace(1, 0, 128)
    return y / (np.max(np.abs(y)) + 1e-9)


def marimba(freq, dur, vel, seed):
    """Warm rosewood bar with a tuned resonator: long fundamental, 4th-partial shimmer."""
    k = freq / 220.0
    partials = ((1.0, 1.0, 2.6 * k ** 0.5), (3.93, 0.22, 9.0 * k ** 0.5), (9.3, 0.05, 22.0))
    y = _modal(freq, partials, 1.3, 400, 2500, 0.12, seed, attack=0.002)
    return y * vel


def bone_xylo(freq, dur, vel, seed):
    """Dry, soft 'bone' xylophone: short bar, hollow knock, no ringing."""
    partials = ((1.0, 1.0, 16.0), (3.0, 0.28, 30.0), (6.2, 0.07, 55.0))
    y = _modal(freq, partials, 0.45, 700, 3200, 0.22, seed)
    return sl.fft_filter(y, hi=6000, slope_hz=1500) * vel


def tiny_bells(freq, dur, vel, seed):
    """Small, soft handbell: glockenspiel FM, darker and shorter."""
    y = sl.bell_fm(freq, dur, 1.0, seed, "glock")
    return sl.fft_filter(y, hi=6500, slope_hz=1500) * vel


def organ(freqs, dur, vel, seed):
    """Distant chapel organ: flute drawbars, slow wind, gentle tremulant."""
    rel = 1.2
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    y = np.zeros(n)
    for f0 in freqs:
        for ratio, g in ((0.5, 0.35), (1.0, 1.0), (2.0, 0.45), (3.0, 0.18), (4.0, 0.12)):
            f = f0 * ratio * (1 + rng.uniform(-0.0008, 0.0008))
            if f > 3500:
                continue
            y += g * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.3))
    y /= np.max(np.abs(y)) + 1e-9
    wind = sl.fft_filter(rng.standard_normal(n), lo=300, hi=2000, slope_hz=500)
    wind /= np.max(np.abs(wind)) + 1e-9
    trem = 1 + 0.07 * np.sin(2 * np.pi * 5.3 * t)
    env = sl.adsr(n, a=0.6, d=0.3, s=0.9, r=rel, hold=dur)
    return (y * trem + 0.02 * wind) * env * vel


FORMANTS_OOH = ((320.0, 70.0, 1.0), (800.0, 110.0, 0.28), (2300.0, 160.0, 0.04),
                (3000.0, 200.0, 0.015))


def choir_ooh(midis, dur, vel, seed):
    rng = np.random.default_rng(seed)
    parts = [S.choir_note(m, dur, vel, rng, voices=3, attack=0.9, release=1.4,
                          formants=FORMANTS_OOH) for m in midis]
    n = max(len(p) for p in parts)
    y = np.zeros(n)
    for p in parts:
        y[:len(p)] += p
    return y / max(1, len(midis)) ** 0.5


def muffled_tamb(vel, seed, long=False):
    """Tambourine played with a damping hand: short, dark jingle, soft thump."""
    n = int((0.3 if long else 0.14) * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(seed)
    noise = sl.fft_filter(rng.standard_normal(n), lo=2500, hi=6000, slope_hz=1500)
    noise /= np.max(np.abs(noise)) + 1e-9
    jingles = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) for f in (3100, 4250, 5300)) / 3
    thump = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 45)
    env = np.minimum(1, t / 0.003) * np.exp(-t * (14 if long else 32))
    y = (0.65 * noise + 0.25 * jingles) * env + 0.35 * thump
    y[-64:] *= np.linspace(1, 0, 64)
    return y * vel


NOTE_INSTRUMENTS = dict(sl.INSTRUMENTS)
NOTE_INSTRUMENTS.update({
    "bcl": bass_clarinet,
    "bcl_st": lambda f, d, v, s: bass_clarinet(f, d, v, s, staccato=True),
    "marimba": marimba,
    "bones": bone_xylo,
    "bells": tiny_bells,
})


# ---------------------------------------------------------------- rendering
def render_part(args):
    """Like synth_lib.render_part, with the Act II instruments."""
    name, events, total, pan, gain, seed = args
    out = np.zeros(total)
    rng = np.random.default_rng(seed)
    cache = {}
    for i, ev in enumerate(events):
        inst = ev["inst"]
        vel = ev.get("vel", 0.8) * (1 + rng.uniform(-0.08, 0.08))
        t0 = ev["t"] + rng.uniform(-0.008, 0.008) * ev.get("human", 1.0)
        note_seed = seed * 1000 + i
        if inst == "organ":
            sig = organ([sl.hz(m) for m in ev["pitches"]], ev["dur"], vel, note_seed)
        elif inst == "ooh":
            sig = choir_ooh([sl.midi(m) for m in ev["pitches"]], ev["dur"], vel, note_seed)
        elif inst == "pad":
            sig = sl.string_pad([sl.hz(m) for m in ev["pitches"]], ev["dur"], vel, note_seed)
        elif inst == "mtamb":
            sig = muffled_tamb(vel, note_seed % 16, ev.get("long", False))
        elif inst == "shaker":
            sig = sl.shaker(vel, note_seed % 12)
        elif inst == "drum":
            sig = sl.frame_drum(vel, note_seed % 8, ev.get("pitch_hz", 85.0))
        else:
            m = sl.midi(ev["pitch"])
            key = (inst, m, round(ev["dur"], 2), note_seed % 3)
            if key not in cache:
                cache[key] = NOTE_INSTRUMENTS[inst](sl.hz(m), ev["dur"], 1.0, note_seed % 3 + m)
            sig = cache[key] * vel
        s0 = max(0, int(t0 * SR))
        s1 = min(total, s0 + len(sig))
        out[s0:s1] += sig[:s1 - s0]
    gl, gr = sl.pan_gains(pan)
    return name, np.stack([out * gl * gain, out * gr * gain])


def render_parts(parts, processes=10):
    with Pool(min(processes, len(parts))) as pool:
        return dict(pool.map(render_part, parts))


def finish(name, folder, dry_parts, sends, loop_len, rt60=2.6, target_lufs=-14.0):
    """Sum, reverb (multiband crypt IR), wrap into a seamless loop, master, export."""
    total = next(iter(dry_parts.values())).shape[1]
    dry = np.zeros((2, total))
    wet_in = np.zeros((2, total))
    for k, sig in dry_parts.items():
        print(f"   part {k:10s} rms {20 * np.log10(np.sqrt(np.mean(sig ** 2)) + 1e-12):6.1f} dB")
        dry += sig
        wet_in += sig * sends.get(k, 0.25)
    wet = sl.convolve_stereo(wet_in, S.make_ir(seconds=3.4, rt60=rt60, seed=5))[:, :total]
    mix = sl.wrap_loop(dry + wet, loop_len)
    out = sl.master(mix, target_lufs=target_lufs)
    wav = os.path.join(folder, name + ".wav")
    mp3 = os.path.join(folder, name + ".mp3")
    sl.write_wav(wav, out)
    sl.report(name + " wav", out)
    sl.to_mp3(wav, mp3)
    sl.report(name + " mp3", sl.decode(mp3))
    os.remove(wav)
    return out
