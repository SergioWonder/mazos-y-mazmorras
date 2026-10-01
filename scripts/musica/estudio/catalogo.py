"""Regenerates INSTRUMENTOS.md: every playable instrument of the installed libraries,
with its real range, velocity layers, round robin and how its dynamics are driven.

Run: scripts/musica/estudio/.venv/bin/python scripts/musica/estudio/catalogo.py"""
from __future__ import annotations

import glob
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from estudio import config, sampler, sfz  # noqa: E402

NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

LIBRARIES = [
    ('VSCO-2-CE', 'VSCO 2 Community Edition (CC0)', '*.sfz',
     lambda p: True),
    ('sso', 'Sonatina Symphonic Orchestra (Creative Commons Sampling Plus 1.0)',
     'Sonatina Symphonic Orchestra/**/*.sfz',
     # «Performance» set only (Notation duplicates it); legato patches need a legato engine
     lambda p: '/includes/' not in p and '- Notation' not in p and 'Legato' not in p and 'Grand Piano' not in p),
    ('VCSL', 'Versilian Community Sample Library (CC0)', '**/*.sfz',
     lambda p: 'Legacy' not in p),
]


def name(n: int) -> str:
    return f'{NOTES[n % 12]}{n // 12 - 1}'


def row(lib: str, path: str) -> str | None:
    try:
        inst = sfz.load(path)
    except Exception:
        return None
    att = [r for r in inst.regions if r.get('trigger', 'attack') in ('attack', 'first')]
    if not att or not all(os.path.exists(r.sample_path) for r in att[:3]):
        return None
    lo, hi = min(r.lokey for r in att), max(r.hikey for r in att)
    layers = len({(r.lovel, r.hivel) for r in att})
    rr = max(int(r.num('seq_length', 1)) for r in att)
    rnd = any(r.get('lorand') for r in att)
    player = sampler.Instrument(inst)
    dyn = 'CC1' if 1 in player.reacts_to else 'velocidad'
    # regions that only sound once a controller opens them (organ stops on CC16–29…)
    gates = sorted({int(k[4:]) for r in att for k in r.opcodes if k.startswith('locc') and r.num(k, 0) > 0})
    if gates:
        dyn += f' · **mudo hasta abrir CC{gates[0]}–{gates[-1]} ≥ 64**' if len(gates) > 1 else f' · **mudo hasta abrir CC{gates[0]}**'
    ks = 'sí' if player.sw_range else ''
    rel = os.path.relpath(path, config.library(lib))
    return (f'| `{lib}/{rel}` | {name(lo)}–{name(hi)} ({lo}–{hi}) | {layers} | '
            f'{rr if rr > 1 else ("aleatorio" if rnd else "—")} | {dyn} | {ks} |')


def main() -> None:
    out = ['# Instrumentos disponibles', '',
           'Generado por `catalogo.py` a partir de los `.sfz` instalados (ver README). Rangos en notación',
           'MIDI (C4 = 60). **No escribas fuera del rango**: la nota no sonará.', '',
           '- **Capas**: niveles de velocidad grabados. **Dinámica**: qué la controla.',
           '  - `velocidad`: la velocidad de cada nota fija volumen y capa (VSCO, VCSL). Para frases, curva de CC11.',
           '  - `CC1`: la velocidad casi no cuenta; la dinámica es el **CC1** (volumen, brillo del filtro y cruce',
           '    de capas), también durante la nota. Toda pista de Sonatina **debe** llevar curva de CC1 (60–110 típico).',
           '- **KS**: keyswitches (una nota fuera del rango elige la articulación). El sampler los entiende, pero',
           '  es más claro usar el `.sfz` de cada articulación por separado.', '']
    for lib, title, pattern, keep in LIBRARIES:
        base = config.library(lib)
        if not os.path.isdir(base):
            out += [f'## {title}', '', f'_No instalada (se busca en {", ".join(config.roots())})._', '']
            continue
        paths = sorted(p for p in glob.glob(os.path.join(base, pattern), recursive=True) if keep(p))
        rows = [r for r in (row(lib, p) for p in paths) if r]
        out += [f'## {title}', '', f'Carpeta: `{base}` · {len(rows)} instrumentos.', '',
                '| Instrumento (ruta para `Part.sfz`) | Rango | Capas | Round robin | Dinámica | KS |',
                '|---|---|---|---|---|---|', *rows, '']
    path = os.path.join(os.path.dirname(__file__), 'INSTRUMENTOS.md')
    with open(path, 'w') as f:
        f.write('\n'.join(out))
    print(path, sum(1 for line in out if line.startswith('| `')), 'instrumentos')


if __name__ == '__main__':
    main()
