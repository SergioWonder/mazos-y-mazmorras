"""Synthesises every sound effect of «Mazo y Mazmorra» and writes the MP3 bank.

Usage:  python3 scripts/sfx/make_sfx.py [name ...]
Writes  src/audio/sfx/<name>.mp3 or <name>-<n>.mp3 (variations) and prints, for each
file, its peak, RMS, DC offset, edge samples and energy share per frequency band.
No samples are used: every sound is modelled from noise, damped modes and pulses.
"""
import os
import sys

import numpy as np

from sfxlib import (
    SR, bandpass, convolve, env_ad, env_swell, export, fade, finish, fm_bell, formants,
    glide, glottal, highpass, impulses, interp_curve, loudness, lowpass, measure, modal, mix, n_of,
    noise, osc, place, resonate, reverb, reverse_swell, rng, sweep_bandpass, time,
)

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'audio', 'sfx')


# ── Shared building blocks ───────────────────────────────────────────────────

def whoosh(dur, f_from, f_peak, f_to, q=1.6, peak_at=0.7, r=None, colour='pink'):
    """Air displaced by a moving object: band-passed noise sweeping in pitch and level."""
    src = noise(dur, colour, r)
    centre = interp_curve(dur, [(0, f_from), (dur * peak_at, f_peak), (dur, f_to)])
    return sweep_bandpass(src, centre, q) * env_swell(dur, dur * peak_at, 2.0, 1.4)


def thud(f0, f1, dur, tau, amp=1.0, noise_lp=600, noise_amp=0.8, r=None, knock=0.7, knock_fc=380):
    """Body of a blunt hit: falling sine, brown-noise thump and a mid knock that small
    speakers can still reproduce."""
    body = osc(glide(dur, f0, f1)) * env_ad(dur, 0.002, tau)
    thump = highpass(lowpass(noise(dur, 'brown', r), noise_lp), 70) * env_ad(dur, 0.001, tau * 0.6)
    mid = bandpass(noise(dur, 'white', r), knock_fc, 0.9) * env_ad(dur, 0.0008, tau * 0.35)
    return amp * (0.45 * body + 0.7 * noise_amp * thump + knock * 3.2 * mid)


def click(dur=0.006, fc=3000, r=None):
    return bandpass(noise(dur, 'white', r), fc, 0.7) * env_ad(dur, 0.0003, dur / 4)


def bubble(f, dur, amp=1.0, rise=1.8):
    """A bubble: sine gliding upwards with an exponential envelope."""
    return amp * osc(glide(dur, f, f * rise)) * env_ad(dur, 0.002, dur / 3)


def grains(total, count, maker, weight=None, r=None):
    """Scatter `count` grains over `total` seconds, denser where `weight` is high."""
    r = r or rng(5)
    out = np.zeros(n_of(total))
    if weight is None:
        weight = np.ones(len(out))
    p = weight / weight.sum()
    for k in r.choice(len(out), count, p=p):
        g = maker(r)
        end = min(len(out), k + len(g))
        out[k:end] += g[:end - k]
    return out


def glass_grain(r, lo=1300, hi=2800, tau=(0.08, 0.2)):
    f = r.uniform(lo, hi)
    t = r.uniform(*tau)
    return fm_bell(f, t * 4, ratio=3.01, index=0.7, tau=t) * r.uniform(0.3, 1.0)


def rustle_grain(r):
    d = r.uniform(0.006, 0.022)
    g = bandpass(noise(d, 'white', r), r.uniform(2200, 5500), 1.4) * np.hanning(n_of(d))
    return g * r.uniform(0.2, 1.0)


def rough(n, r, depth=0.5, rate=70):
    """Random amplitude modulation for gravel in a voice."""
    return 1 + depth * lowpass(r.standard_normal(n), rate) * 6


def voice(f0, dur, vowel, r, shift=1.0, roughness=0.0, breath=0.1):
    g = glottal(f0, dur, r)
    g *= rough(len(g), r, roughness) if roughness else 1
    v = formants(g, vowel, shift)
    v += breath * formants(noise(dur, 'pink', r), vowel, shift)
    return v


# ── Combat ───────────────────────────────────────────────────────────────────

def tajo(v):
    r = rng(100 + v)
    dur = 0.19 + 0.03 * v
    hit = dur * 0.72
    out = 0.9 * whoosh(dur, 450, 2000 + 350 * v, 1300, 1.7, 0.72, r)
    base = 1150 + 90 * v + r.uniform(-40, 40)
    ring = modal([base * k for k in (1, 2.76, 5.40)], [0.16, 0.08, 0.04], [0.3, 0.2, 0.07], 0.45, r, beat=0.003)
    cut = thud(170, 70, 0.16, 0.035, 0.55, 800, 0.6, r)
    out = place(out, mix(ring, cut, 0.6 * click(0.008, 2600, r)), hit)
    return finish(reverb(out, 0.12, 0.5, 0.12), -4.0)


def impacto(v):
    r = rng(200 + v)
    body = thud(115 + 12 * v, 42, 0.4, 0.085, 1.0, 650, 1.2, r)
    t = time(0.14)
    crunch = bandpass(impulses(0.14, 1100, r) * np.exp(-t / 0.03), 1700 + 250 * v, 0.8) * 1.6
    clank = modal([620 + 60 * v, 1340, 2210 + 100 * v], [0.12, 0.07, 0.04], [0.12, 0.08, 0.04], 0.35, r)
    out = mix(body, crunch, clank, 0.7 * click(0.005, 2200, r))
    return finish(reverb(out, 0.15, 0.55, 0.15), -3.5, drive=2.0)


def golpe_enemigo(v):
    r = rng(300 + v)
    body = thud(95 + 8 * v, 38, 0.35, 0.08, 1.0, 450, 0.9, r)
    slap = bandpass(noise(0.08, 'white', r), 1000 + 200 * v, 0.9) * env_ad(0.08, 0.001, 0.014) * 1.6
    cloth = bandpass(noise(0.16, 'pink', r), 2300, 1.2) * env_ad(0.16, 0.003, 0.04) * 0.25
    t = time(0.25)
    links = impulses(0.25, 260, r) * np.exp(-t / 0.05)
    mail = sum(resonate(links, r.uniform(2800, 4800), 0.006) for _ in range(3)) * 0.1
    out = mix(body, slap, cloth, mail)
    return finish(reverb(out, 0.12, 0.5, 0.13), -3.5, drive=1.8)


def bloqueo(v):
    r = rng(400 + v)
    base = 360 * (1 + 0.07 * v)
    ratios = [1, 1.59, 2.14, 2.30, 2.65, 2.92, 3.50, 4.06]
    taus = [0.45, 0.32, 0.27, 0.22, 0.18, 0.15, 0.11, 0.08]
    amps = [1, 0.7, 0.5, 0.45, 0.35, 0.3, 0.2, 0.12]
    metal = modal([base * k for k in ratios], taus, amps, 0.9, r, beat=0.004) * 0.5
    wood = thud(190, 120, 0.2, 0.045, 0.8, 500, 0.8, r)
    out = mix(metal, wood, 0.6 * click(0.006, 3000, r))
    return finish(reverb(out, 0.15, 0.6, 0.16), -4.5, top=6500)


def muerte(v):
    r = rng(500)
    out = thud(80, 35, 0.4, 0.12, 1.0, 400, 1.0, r)
    second = thud(70, 40, 0.3, 0.07, 0.5, 350, 0.8, r)
    second += modal([540, 1210, 1980], [0.1, 0.06, 0.03], [0.08, 0.05, 0.03], 0.3, r)
    out = place(out, second, 0.2)
    dur = 1.05
    groan = voice(glide(dur, 115, 55), dur, 'o', r, 0.85, roughness=0.3, breath=0.4)
    groan *= env_swell(dur, 0.18, 1.5, 1.3) * 0.9
    out = place(out, groan, 0.08)
    return finish(reverb(out, 0.3, 1.1, 0.33, 3500), -4.0)


def furia(v):
    r = rng(600)
    dur = 1.0
    f0 = interp_curve(dur, [(0, 88), (0.25, 128), (0.75, 118), (1.0, 92)])
    roar = voice(f0, dur, 'growl', r, 0.9, roughness=0.6, breath=0.35) * env_swell(dur, 0.22, 1.5, 1.2)
    flare = whoosh(dur, 250, 1400, 500, 1.0, 0.3, r) * 0.5
    sub = osc(55, dur) * env_swell(dur, 0.25) * 0.35
    return finish(reverb(mix(roar, flare, sub), 0.22, 0.8, 0.22), -4.0, drive=1.8)


def furia_perdida(v):
    r = rng(700)
    dur = 0.85
    sigh = sweep_bandpass(noise(dur, 'pink', r), glide(dur, 1400, 320), 0.9) * env_swell(dur, 0.12, 1.5, 1.6) * 0.8
    droop = osc(glide(dur, 140, 58)) * env_swell(dur, 0.1, 1.2, 1.4) * 0.12
    t = time(dur)
    embers = lowpass(resonate(impulses(dur, 70, r) * np.exp(-t / 0.25), 2400, 0.002), 5000) * 0.5
    return finish(reverb(mix(sigh, droop, embers), 0.2, 0.7, 0.2), -7.0)


def estado(v):
    r = rng(800)
    dur = 0.5
    tone = osc(glide(dur, 420, 820) * (1 + 0.006 * np.sin(2 * np.pi * 6 * time(dur)))) * env_swell(dur, 0.08, 1.5, 1.6) * 0.35
    sparkle = grains(dur, 7, lambda q: glass_grain(q, 1200, 2400, (0.05, 0.1)), env_swell(dur, 0.1), r) * 0.25
    air = bandpass(noise(dur, 'pink', r), 2800, 2.0) * env_swell(dur, 0.1) * 0.3
    return finish(reverb(mix(tone, sparkle, air), 0.25, 0.8, 0.22), -9.0)


def cura(v):
    r = rng(900)
    dur = 1.1
    out = np.zeros(n_of(dur))
    for i, f in enumerate([523.25, 659.25, 783.99, 1046.5]):
        out = place(out, fm_bell(f, 0.9, 2.0, 1.1, 0.45) * 0.3, 0.08 * i)
    shimmer = grains(dur, 30, lambda q: glass_grain(q, 1500, 3000, (0.03, 0.08)), env_swell(dur, 0.4), r) * 0.12
    air = bandpass(noise(dur, 'pink', r), 2200, 1.5) * env_swell(dur, 0.35) * 0.3
    warm = osc(261.63, dur) * env_swell(dur, 0.3) * 0.15
    return finish(reverb(mix(out, shimmer, air, warm), 0.35, 1.2, 0.33), -6.0)


# ── Nature and elements ──────────────────────────────────────────────────────

def tierra(v):
    r = rng(1000)
    dur = 1.2
    wob = 0.6 + 0.4 * lowpass(r.standard_normal(n_of(dur)), 6) * 8
    rumble = lowpass(noise(dur, 'brown', r), 180) * wob * env_swell(dur, 0.25, 1.2, 1.3)
    sub = osc(glide(dur, 46, 36)) * env_swell(dur, 0.2) * 0.3
    t = time(dur)
    rocks_src = impulses(dur, 24, r) * np.exp(-t / 0.5)
    rocks = lowpass(resonate(rocks_src, 320, 0.02) + 0.5 * resonate(rocks_src, 720, 0.01), 2500) * 1.2
    gravel = bandpass(impulses(dur, 420, r), 1700, 0.7) * env_swell(dur, 0.3) * 0.35
    first = thud(72, 34, 0.4, 0.12, 0.9, 300, 1.0, r)
    return finish(reverb(mix(rumble, sub, rocks, gravel, first), 0.2, 0.8, 0.25, 3000), -4.0, drive=1.8)


def creak(dur, r, f_lo=30, f_hi=120):
    """Stick-slip friction of wood: clicks speeding up, each one ringing the fibre."""
    out = np.zeros(n_of(dur))
    t = 0.0
    while t < dur:
        k = n_of(t)
        if k < len(out):
            out[k] = r.uniform(0.5, 1.0)
        rate = f_lo + (f_hi - f_lo) * (t / dur) ** 1.4
        t += (1 / rate) * r.uniform(0.7, 1.3)
    return resonate(out, 380, 0.014) + 0.6 * resonate(out, 830, 0.008)


def raices(v):
    r = rng(1100)
    dur = 0.95
    out = creak(0.55, r) * env_swell(0.55, 0.4, 1.0, 0.8) * 0.5
    out = np.concatenate([out, np.zeros(n_of(dur) - len(out))])
    for at in (0.36, 0.5, 0.63):
        snap = np.zeros(n_of(0.15))
        snap[0] = 1
        snap = resonate(snap, r.uniform(1200, 1600), 0.004) + 0.8 * resonate(snap, r.uniform(420, 560), 0.012)
        out = place(out, mix(snap * 0.8, click(0.004, 2400, r) * 0.4), at)
    dirt = bandpass(noise(dur, 'pink', r), 1400, 0.6) * env_swell(dur, 0.45) * 0.2
    low = lowpass(noise(dur, 'brown', r), 300) * env_swell(dur, 0.4) * 0.35
    return finish(reverb(mix(out, dirt, low), 0.15, 0.6, 0.15), -4.5)


def hojas(v):
    r = rng(1200)
    dur = 0.9
    gust = env_swell(dur, 0.35, 1.4, 1.2)
    leaves = grains(dur, 190, rustle_grain, gust + 0.02, r)
    wind = bandpass(noise(dur, 'pink', r), 900, 0.6) * gust * 0.25
    return finish(reverb(mix(leaves, wind), 0.15, 0.5, 0.14), -7.0, top=7000)


def ola(v):
    r = rng(1300)
    dur = 1.4
    centre = interp_curve(dur, [(0, 250), (0.55, 1300), (0.8, 900), (dur, 450)])
    level = interp_curve(dur, [(0, 0), (0.5, 0.6), (0.62, 1.0), (dur, 0)]) ** 1.5
    surf = sweep_bandpass(noise(dur, 'pink', r), centre, 0.7) * level
    crash = lowpass(noise(0.6, 'white', r), 4500) * env_ad(0.6, 0.015, 0.15) * 0.45
    body = lowpass(noise(dur, 'brown', r), 200) * env_swell(dur, 0.6) * 0.6
    fizz = grains(0.8, 26, lambda q: bubble(q.uniform(500, 1400), q.uniform(0.02, 0.05), q.uniform(0.3, 1.0)), None, r) * 0.15
    out = place(mix(surf, body), crash, 0.55)
    out = place(out, fizz, 0.6)
    return finish(reverb(out, 0.2, 0.8, 0.22), -4.5)


def veneno(v):
    r = rng(1400)
    dur = 0.9
    crackle = np.abs(lowpass(impulses(dur, 320, r), 400)) * 6
    sizzle = bandpass(highpass(noise(dur, 'white', r), 2500), 3800, 0.7) * crackle * env_swell(dur, 0.15, 1.2, 1.2) * 0.3
    pops = grains(0.8, 16, lambda q: bubble(q.uniform(350, 900), q.uniform(0.04, 0.08), q.uniform(0.4, 1.0), 1.6), None, r) * 0.3
    gloop = bubble(180, 0.14, 0.6, 1.8)
    out = place(mix(sizzle, pops), gloop, 0.04)
    return finish(reverb(out, 0.15, 0.6, 0.16), -6.0, top=6500)


def aliento(v):
    r = rng(1500)
    dur = 1.5
    level = interp_curve(dur, [(0, 0), (0.15, 1.0), (1.1, 0.8), (dur, 0)])
    src = noise(dur, 'brown', r) + 0.4 * noise(dur, 'pink', r)
    roar = sweep_bandpass(src, interp_curve(dur, [(0, 400), (0.3, 900), (dur, 500)]), 0.5) * level
    hiss = lowpass(bandpass(noise(dur, 'white', r), 2400, 0.6), 6000) * level * 0.15
    crackle = resonate(impulses(dur, 180, r), 1800, 0.002) * level * 0.3
    growl = voice(glide(dur, 60, 75), dur, 'growl', r, 0.6, roughness=0.7, breath=0.3) * env_swell(dur, 0.4) * 0.4
    return finish(reverb(mix(roar, hiss, crackle, growl), 0.2, 0.8, 0.22), -3.5, drive=1.7)


# ── Creatures ────────────────────────────────────────────────────────────────

def zarpa(v):
    r = rng(1600)
    out = whoosh(0.18, 400, 1200, 700, 1.2, 0.6, r) * 0.5
    for k in range(3):
        d = 0.09
        s = sweep_bandpass(noise(d, 'white', r), glide(d, 1200, 3100), 2.5) * env_swell(d, 0.03)
        rasp = 0.4 + np.abs(resonate(impulses(d, 900, r), 2600, 0.001)) * 2
        out = place(out, s * rasp * 1.1, 0.06 + 0.03 * k)
    hit = thud(130, 60, 0.2, 0.05, 0.6, 500, 0.8, r)
    hit = mix(hit, bandpass(noise(0.12, 'pink', r), 2000, 1.0) * env_ad(0.12, 0.002, 0.03) * 0.3)
    out = place(out, hit, 0.14)
    return finish(reverb(out, 0.12, 0.5, 0.13), -4.5)


def aullido(v):
    r = rng(1700)
    dur = 1.5
    t = time(dur)
    f0 = interp_curve(dur, [(0, 380), (0.28, 560), (0.9, 600), (1.3, 470), (dur, 400)])
    f0 *= 1 + (0.004 + 0.012 * t / dur) * np.sin(2 * np.pi * 5.5 * t)
    g = glottal(f0, dur, r, jitter=0.004, shimmer=0.05)
    morph = np.clip(t / dur, 0, 1)
    howl = (1 - morph) * formants(g, 'u') + morph * formants(g, 'o')
    howl += 0.12 * bandpass(noise(dur, 'pink', r), 1200, 1.0)
    howl = lowpass(howl, 4000) * env_swell(dur, 0.3, 1.5, 1.2)
    return finish(reverb(howl, 0.45, 1.4, 0.45, 3500), -5.0)


def transformacion(v):
    r = rng(1800)
    dur = 1.15
    out = np.zeros(n_of(dur))
    for at in np.sort(r.uniform(0.08, 0.45, 5)):
        crack = np.zeros(n_of(0.1))
        crack[0] = 1
        crack = resonate(crack, r.uniform(800, 1000), 0.006) + 0.5 * resonate(crack, r.uniform(1900, 2400), 0.003)
        out = place(out, crack * 0.6, at)
    growl = voice(glide(dur, 70, 140), dur, 'growl', r, 0.8, roughness=0.6, breath=0.3) * env_swell(dur, 0.75, 1.6, 1.0) * 0.6
    swell = whoosh(dur, 300, 2500, 1200, 1.2, 0.8, r) * 0.45
    leaves = grains(dur, 60, rustle_grain, env_swell(dur, 0.7), r) * 0.2
    return finish(reverb(mix(out, growl, swell, leaves), 0.25, 0.8, 0.25), -4.5)


def sangre(v):
    r = rng(1900)
    out = whoosh(0.14, 400, 1600, 900, 1.5, 0.75, r) * 0.6
    d = 0.25
    splat = sweep_bandpass(noise(d, 'white', r), glide(d, 900, 330), 1.5) * env_ad(d, 0.002, 0.05) * 1.6
    splat = mix(splat, thud(110, 60, 0.15, 0.05, 0.6, 400, 0.6, r))
    out = place(out, splat, 0.11)
    for at in (0.3, 0.43, 0.56):
        out = place(out, bubble(r.uniform(600, 800), 0.03, 0.25, 2.0), at)
    return finish(reverb(out, 0.12, 0.5, 0.13), -4.5)


def corazones(v):
    r = rng(2000)
    out = thud(65, 45, 0.18, 0.045, 0.9, 200, 0.8, r)
    out = place(out, thud(62, 44, 0.18, 0.04, 0.65, 200, 0.8, r), 0.16)
    out = np.concatenate([out, np.zeros(n_of(1.0) - len(out))])
    for i, f in enumerate([880.0, 1108.7, 1318.5]):
        out = place(out, fm_bell(f, 0.8, 2.0, 0.8, 0.45) * 0.22, 0.3 + 0.08 * i)
    sparkle = grains(1.0, 10, lambda q: glass_grain(q, 1600, 2800, (0.05, 0.12)), env_swell(1.0, 0.5), r) * 0.08
    return finish(reverb(mix(out, sparkle), 0.3, 1.0, 0.3), -6.0)


# ── Magic ────────────────────────────────────────────────────────────────────

def bell_modes(f, dur, r, scale=1.0):
    """Church-bell partials (hum, prime, minor third, fifth, nominal...)."""
    ratios = [0.5, 1, 1.183, 1.506, 2, 2.5, 2.66, 3.01, 4.0]
    taus = [2.0, 1.4, 1.0, 0.8, 0.7, 0.45, 0.4, 0.3, 0.2]
    amps = [0.5, 1, 0.8, 0.35, 0.6, 0.25, 0.2, 0.15, 0.08]
    return modal([f * k for k in ratios], [t * scale for t in taus], amps, dur, r, beat=0.002)


def divino(v):
    r = rng(2100)
    bell = bell_modes(523.25, 1.0, r, 0.6) * 0.5
    bell = reverse_swell(bell, 0.45, 0.2)
    lead = len(bell) / SR - 1.0
    dur = len(bell) / SR
    t = time(dur)
    choir = np.zeros(n_of(dur))
    for f in (261.63, 329.63, 392.0, 523.25):
        f0 = f * (1 + 0.006 * np.sin(2 * np.pi * (5.2 + r.uniform(-0.4, 0.4)) * t + r.uniform(0, 6)))
        choir += formants(glottal(f0, dur, r, 0.003, 0.05), 'a') * 0.25
    choir *= env_swell(dur, lead + 0.1, 1.5, 1.4)
    shimmer = grains(dur, 24, lambda q: glass_grain(q, 1500, 2600), env_swell(dur, lead + 0.1), r) * 0.08
    return finish(reverb(mix(bell, choir, shimmer), 0.3, 1.0, 0.35), -5.0)


def estrellas(v):
    r = rng(2200)
    dur = 1.0
    weight = np.exp(-time(dur) / 0.35)
    notes = [1318.5, 1568.0, 1760.0, 2093.0, 2349.3]

    def star(q):
        t = q.uniform(0.1, 0.25)
        return fm_bell(q.choice(notes), t * 4, 3.01, 0.8, t) * q.uniform(0.3, 1.0)

    sparkle = grains(dur, 22, star, weight, r) * 0.3
    rise = whoosh(0.5, 800, 3200, 2400, 1.5, 0.4, r) * 0.25
    pad = (osc(523.25, dur) + osc(783.99, dur)) * env_swell(dur, 0.3) * 0.06
    return finish(reverb(mix(sparkle, rise, pad), 0.35, 1.0, 0.3), -6.0)


def luna(v):
    r = rng(2300)
    dur = 1.3
    out = np.zeros(n_of(dur))
    for i, f in enumerate([659.25, 987.77, 1318.5]):
        glass = modal([f, f * 2.32, f * 4.25], [0.8, 0.35, 0.15], [1, 0.3, 0.1], 1.0, r, beat=0.002)
        out = place(out, glass * 0.35, 0.12 * i)
    t = time(dur)
    pad = sum(osc(f, dur) for f in (440, 441.6, 659.3, 661.0)) * env_swell(dur, 0.45) * 0.07
    air = bandpass(noise(dur, 'pink', r), 3800, 3.0) * env_swell(dur, 0.4) * 0.15
    return finish(reverb(mix(out, pad, air), 0.4, 1.3, 0.42, 5000), -6.0, top=7000)


def abisal(v):
    r = rng(2400)
    dur = 1.15
    t = time(dur)
    sub = osc(glide(dur, 90, 32)) * env_swell(dur, 0.15, 1.2, 1.2) * 0.4
    void = sum(osc(f, dur) for f in (220, 221.3, 329.6)) * env_swell(dur, 0.45) * 0.08
    drone = lowpass(sum(osc(f, dur) for f in (110, 110.7, 164.8, 165.9)), 800)
    drone *= (0.7 + 0.3 * np.sin(2 * np.pi * 2.2 * t)) * env_swell(dur, 0.4) * 0.25
    swirl = sweep_bandpass(noise(dur, 'pink', r), 520 + 260 * np.sin(2 * np.pi * 3 * t), 2.2) * env_swell(dur, 0.35) * 1.2
    rip = bandpass(noise(0.3, 'brown', r), 400, 0.8) * env_ad(0.3, 0.003, 0.08) * 0.7
    return finish(reverb(mix(sub, void, drone, swirl, rip), 0.35, 1.2, 0.4, 2500), -4.0)


def condena(v):
    r = rng(2500)
    dur = 1.5
    bell = bell_modes(146.83, dur, r) * 0.7
    strike = lowpass(noise(0.02, 'white', r), 2000) * env_ad(0.02, 0.0005, 0.004) * 0.4
    drone = lowpass(noise(dur, 'brown', r), 150) * env_swell(dur, 0.5) * 0.2
    sub = osc(73.4, dur) * env_swell(dur, 0.3) * 0.1
    return finish(reverb(mix(bell, strike, drone, sub), 0.3, 1.4, 0.5, 3000), -4.5, top=6000)


def oscuridad(v):
    r = rng(2600)
    dur = 1.1
    t = time(dur)
    level = (t / 0.85) ** 3 * (t < 0.85) + (t >= 0.85) * np.exp(-(t - 0.85) / 0.05)
    rev_whoosh = sweep_bandpass(noise(dur, 'pink', r), glide(dur, 300, 1100), 1.0) * level * 1.2
    am = np.clip(0.5 + lowpass(r.standard_normal(n_of(dur)), 7) * 12, 0, 1.2)
    whisper = formants(noise(dur, 'white', r), 'o', 1.2) * am * env_swell(dur, 0.5) * 0.7
    sub = osc(glide(dur, 62, 44)) * env_swell(dur, 0.6) * 0.25
    drone = lowpass(osc(98, dur) + osc(99.1, dur), 400) * env_swell(dur, 0.5) * 0.15
    return finish(reverb(mix(rev_whoosh, whisper, sub, drone), 0.35, 1.0, 0.35, 2500), -5.0)


def rara(v):
    r = rng(2700)
    dur = 1.2
    t = time(dur)
    level = np.clip(t / 0.5, 0, 1) ** 2.5 * np.where(t < 0.5, 1, np.exp(-(t - 0.5) / 0.08))
    riser = sweep_bandpass(noise(dur, 'pink', r), glide(dur, 300, 3500), 2.0) * level * 0.5
    shimmer = grains(0.5, 18, lambda q: glass_grain(q, 1200, 2600, (0.04, 0.1)), np.linspace(0.1, 1, n_of(0.5)), r) * 0.12
    sub = osc(55, dur) * env_swell(dur, 0.5) * 0.3
    hit = (fm_bell(1046.5, 0.7, 2.0, 1.0, 0.5) + 0.6 * fm_bell(1568.0, 0.7, 2.0, 1.0, 0.4)) * 0.3
    out = place(mix(riser, sub), shimmer, 0.0)
    out = place(out, hit, 0.5)
    return finish(reverb(out, 0.35, 1.0, 0.3), -7.0)


# ── Interface ────────────────────────────────────────────────────────────────

def carta(v):
    r = rng(2800 + v)
    dur = 0.13 + 0.02 * v
    swish = sweep_bandpass(noise(dur, 'pink', r), interp_curve(dur, [(0, 1800), (dur * 0.45, 4000 - 300 * v), (dur, 2400)]), 1.2)
    swish *= env_swell(dur, dur * 0.45, 1.6, 1.4)
    snap = np.zeros(n_of(0.05))
    snap[0] = 1
    snap = resonate(snap, 2500 + 200 * v, 0.003) + 0.7 * resonate(snap, 1150, 0.004)
    out = place(swish, snap * 0.35, 0.015)
    return finish(out, -10.0, top=7000)


def ui(v):
    r = rng(2900)
    wood = modal([1150, 2900, 4300], [0.03, 0.012, 0.006], [1, 0.4, 0.15], 0.12, r)
    return finish(mix(wood, 0.3 * click(0.003, 3000, r)), -12.0)


# name → (generator, variations, target loudness in dB as measured by `loudness`)
SOUNDS = {
    'tajo': (tajo, 3, -16), 'impacto': (impacto, 3, -16), 'golpeEnemigo': (golpe_enemigo, 3, -16),
    'bloqueo': (bloqueo, 3, -18), 'carta': (carta, 3, -27),
    'cura': (cura, 1, -18), 'muerte': (muerte, 1, -17), 'furia': (furia, 1, -16), 'divino': (divino, 1, -16),
    'tierra': (tierra, 1, -17), 'raices': (raices, 1, -17), 'estado': (estado, 1, -22),
    'furiaPerdida': (furia_perdida, 1, -21), 'ui': (ui, 1, -28),
    'estrellas': (estrellas, 1, -17), 'sangre': (sangre, 1, -17), 'abisal': (abisal, 1, -17),
    'luna': (luna, 1, -17), 'condena': (condena, 1, -16), 'veneno': (veneno, 1, -17),
    'transformacion': (transformacion, 1, -17), 'ola': (ola, 1, -17), 'zarpa': (zarpa, 1, -16),
    'oscuridad': (oscuridad, 1, -18), 'hojas': (hojas, 1, -20), 'aullido': (aullido, 1, -16),
    'corazones': (corazones, 1, -18), 'aliento': (aliento, 1, -15), 'rara': (rara, 1, -21),
}

CEILING_DB = -3.6  # leaves room for MP3 encoding overshoot (decoded peaks stay under -3 dBFS)


MAX_SQUASH_DB = 5.0


def level(x, target):
    """Scales to the target perceived loudness. Peaks that would pass the ceiling are
    rounded off by a soft clipper (at most MAX_SQUASH_DB of it, which also adds the
    harmonics that let a bass thump be heard on a phone)."""
    ceiling = 10 ** (CEILING_DB / 20)
    for _ in range(4):
        gain = target - loudness(x)
        peak = 20 * np.log10(np.max(np.abs(x)) + 1e-12)
        gain = min(gain, CEILING_DB + MAX_SQUASH_DB - peak)
        x = x * 10 ** (gain / 20)
        if np.max(np.abs(x)) > ceiling:
            x = ceiling * np.tanh(x / ceiling)
    return x


def main(names):
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for name in names or SOUNDS:
        gen, count, target = SOUNDS[name]
        for v in range(count):
            x = level(gen(v), target)
            fname = f'{name}-{v + 1}.mp3' if count > 1 else f'{name}.mp3'
            path = os.path.join(OUT, fname)
            export(x, path)
            m = measure(x)
            size = os.path.getsize(path)
            total += size
            bands = ' '.join(f'{b * 100:4.1f}' for b in m['bands'])
            bands += f'  loud {m["loud_db"]:5.1f}'
            print(f'{fname:22s} {m["dur"]:.2f}s peak {m["peak_db"]:5.1f} rms {m["rms_db"]:5.1f} '
                  f'dc {m["dc"]:+.4f} edges {m["edges"][0]:.4f}/{m["edges"][1]:.4f} '
                  f'bands% {bands}  {size / 1024:.1f} KB')
    print(f'total {total / 1024:.0f} KB')


if __name__ == '__main__':
    main(sys.argv[1:])
