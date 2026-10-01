"""Where the (large, not versioned) sample libraries live.

They can be spread over several folders (the internal disk and the external «Base»
disk); `library()` finds each one in the first folder that holds it. Override the list
with DRACS_SAMPLES (folders separated by «:»)."""
from __future__ import annotations

import os

SR = 44100  # the game's loop points are stored in samples at 44.1 kHz

DEFAULT_ROOTS = [
    os.path.expanduser('~/WonderBits/personal/audio-samples'),  # VSCO 2 CE
    '/Volumes/Base/audio-samples',                               # VCSL, Sonatina (external disk)
]


def roots(env: str | None = os.environ.get('DRACS_SAMPLES')) -> list[str]:
    return [r for r in env.split(os.pathsep) if r] if env else list(DEFAULT_ROOTS)


SAMPLES_DIR = roots()[0]  # kept for older scripts


def library(*parts: str, roots: list[str] | None = None) -> str:
    """Absolute path of a library file: the first root that holds the library folder."""
    found = roots if roots is not None else globals()['roots']()
    for root in found:
        if parts and os.path.exists(os.path.join(root, parts[0])):
            return os.path.join(root, *parts)
    return os.path.join(found[0], *parts)
