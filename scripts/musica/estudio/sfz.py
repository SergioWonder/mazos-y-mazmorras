"""Minimal SFZ parser: headers, opcode inheritance, #define and #include, note names."""
from __future__ import annotations

import os
import re
from dataclasses import dataclass, field

_NOTE = {'c': 0, 'd': 2, 'e': 4, 'f': 5, 'g': 7, 'a': 9, 'b': 11}
_OPCODE = re.compile(r'([A-Za-z0-9_]+)=')
_HEADER = re.compile(r'<(\w+)>')


def note_number(value: str) -> int:
    """SFZ note: a MIDI number or a name such as c4 (= 60), f#3, Bb2."""
    v = value.strip()
    if re.fullmatch(r'-?\d+', v):
        return int(v)
    m = re.fullmatch(r'([a-gA-G])([#b]?)(-?\d+)', v)
    if not m:
        raise ValueError(f'bad SFZ note: {value!r}')
    acc = {'#': 1, 'b': -1, '': 0}[m.group(2)]
    return (int(m.group(3)) + 1) * 12 + _NOTE[m.group(1).lower()] + acc


@dataclass
class Region:
    opcodes: dict[str, str]
    base_dir: str

    def get(self, key: str, default=None):
        return self.opcodes.get(key, default)

    def num(self, key: str, default: float) -> float:
        v = self.opcodes.get(key)
        return float(v) if v is not None else default

    def note(self, key: str, default: int) -> int:
        v = self.opcodes.get(key)
        return note_number(v) if v is not None else default

    @property
    def sample_path(self) -> str:
        rel = (self.opcodes.get('default_path', '') + self.opcodes.get('sample', '')).replace('\\', '/')
        return os.path.normpath(os.path.join(self.base_dir, rel))

    @property
    def lokey(self) -> int:
        return self.note('lokey', self.note('key', 0))

    @property
    def hikey(self) -> int:
        return self.note('hikey', self.note('key', 127))

    @property
    def keycenter(self) -> int:
        return self.note('pitch_keycenter', self.note('key', 60))

    @property
    def lovel(self) -> int:
        return int(self.num('lovel', 1))

    @property
    def hivel(self) -> int:
        return int(self.num('hivel', 127))


@dataclass
class SfzInstrument:
    path: str
    regions: list[Region] = field(default_factory=list)


def _preprocess(path: str, defines: dict[str, str], depth: int = 0) -> str:
    if depth > 8:
        raise RecursionError('#include nested too deep')
    with open(path, encoding='utf-8', errors='replace') as f:
        text = f.read()
    text = re.sub(r'/\*.*?\*/', ' ', text, flags=re.S)
    out = []
    for line in text.splitlines():
        line = line.split('//', 1)[0]
        m = re.match(r'\s*#define\s+(\$\w+)\s+(.+)', line)
        if m:
            defines[m.group(1)] = m.group(2).strip()
            continue
        m = re.match(r'\s*#include\s+"(.+)"', line)
        if m:
            inc = os.path.join(os.path.dirname(path), m.group(1))
            out.append(_preprocess(inc, defines, depth + 1))
            continue
        for name in sorted(defines, key=len, reverse=True):
            line = line.replace(name, defines[name])
        out.append(line)
    return '\n'.join(out)


def _opcodes(segment: str) -> dict[str, str]:
    found = list(_OPCODE.finditer(segment))
    result = {}
    for i, m in enumerate(found):
        end = found[i + 1].start() if i + 1 < len(found) else len(segment)
        result[m.group(1)] = ' '.join(segment[m.end():end].split())
    return result


def load(path: str) -> SfzInstrument:
    """Parses an .sfz file into flat regions (each with every inherited opcode)."""
    text = _preprocess(path, {})
    base = os.path.dirname(os.path.abspath(path))
    inst = SfzInstrument(path=path)
    levels = {'control': {}, 'global': {}, 'master': {}, 'group': {}}
    parts = _HEADER.split(text)
    # parts = [before, header1, body1, header2, body2, ...]
    for header, body in zip(parts[1::2], parts[2::2]):
        ops = _opcodes(body)
        if header == 'control':
            levels['control'] = ops
        elif header == 'global':
            levels['global'], levels['master'], levels['group'] = ops, {}, {}
        elif header == 'master':
            levels['master'], levels['group'] = ops, {}
        elif header == 'group':
            levels['group'] = ops
        elif header == 'region':
            merged = {**levels['control'], **levels['global'], **levels['master'], **levels['group'], **ops}
            inst.regions.append(Region(opcodes=merged, base_dir=base))
    return inst
