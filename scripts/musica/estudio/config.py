"""Where the (large, not versioned) sample libraries live."""
import os

SR = 44100  # the game's loop points are stored in samples at 44.1 kHz

SAMPLES_DIR = os.environ.get(
    'DRACS_SAMPLES', os.path.expanduser('~/WonderBits/personal/audio-samples'))


def library(*parts: str) -> str:
    """Absolute path inside the sample libraries folder."""
    return os.path.join(SAMPLES_DIR, *parts)
