# Estudio de música con samples

Pipeline para la banda sonora de «Dracs & Rogues» con **instrumentos grabados** en lugar de
síntesis. Sustituye a los mini-sintetizadores numpy de las pistas antiguas.

```
brief (docs/musica/<pista>.md)  →  compose.py → build/<pista>.mid  →  mix.py → build/<pista>.mp3
     director-musical                 orquestador-midi                  ingeniero-mezcla
```

## Entorno

- Python 3.12 en `scripts/musica/estudio/.venv` (no se versiona). Recrearlo:
  `/opt/homebrew/bin/python3.12 -m venv scripts/musica/estudio/.venv && scripts/musica/estudio/.venv/bin/pip install -r scripts/musica/estudio/requirements.txt`
- Samples fuera del repo, en `~/WonderBits/personal/audio-samples/` (cambiable con la variable
  `DRACS_SAMPLES`). Hoy: **VSCO 2 Community Edition** (CC0), rama `SFZ` de
  `github.com/sgossner/VSCO-2-CE`. Catálogo con rangos: [INSTRUMENTOS.md](INSTRUMENTOS.md).
- `ffmpeg` con `libmp3lame` para exportar.
- Tests: `scripts/musica/estudio/.venv/bin/python -m unittest discover scripts/musica/estudio/tests`

## Módulos (`estudio/`)

| Módulo | Qué hace |
|---|---|
| `sfz.py` | Lee `.sfz`: cabeceras, herencia de opcodes, `#define`, `#include`, nombres de nota |
| `sampler.py` | Reproduce regiones por nota, velocidad y round robin; transposición, bucles, envolvente ADSR, samples de release, curva de CC11/CC1 |
| `midi_io.py` | MIDI multipista → notas y curvas de controlador en segundos (respeta cambios de tempo) |
| `mix.py` | Buses (paso alto Butterworth de 12 dB/oct, estanterías, picos, compresión), sala de convolución, sonoridad (LUFS), limitador true-peak, bucle perfecto, MP3, medidas por bandas |
| `render.py` | `MixSpec` + `render()`: MIDI → instrumentos → buses → sala → máster → bucle → MP3, con informe de medidas |

### Opciones de mezcla de `render.py`

- `Part.automation`: movimientos de fader por compás, `[(compás, dB), …]` (compases desde 1; 13.5 = mitad del c. 13).
  Interpola en dB entre puntos; dos puntos en el mismo compás hacen un salto, en el orden escrito.
- Los envíos a la sala salen **después de la EQ y el nivel del bus** y antes de su compresor: la sala oye lo que
  deja pasar el bus (sin barro ni graves que el bus ya quitó).
- `MixSpec.reverb_eq`: EQ del retorno de la sala (argumentos de `mix.process_bus`).
- `MixSpec.sections`: `{nombre: (primer compás, último compás)}`; el informe da su sonoridad sobre el máster
  (`sections_lufs`), para comprobar contrastes entre secciones.
- El informe incluye por parte `pico_db` y `lufs` (con puerta: solo mientras suena), y `wet_dry_lu`
  (sonoridad de la sala respecto a la señal directa: cuanto más cerca de 0, más mojada la mezcla).

## Convenciones por pista (`scripts/musica/<pista>/`)

- `compose.py` genera `build/<pista>.mid` (una pista MIDI por instrumento, con nombre).
- `mix.py` define el `MixSpec` y llama a `render()`; imprime el informe (y lo guarda en `build/<pista>.report.json`
  para compararlo con la siguiente versión).
- `build/` no se versiona. La versión aprobada se copia a `src/audio/<archivo>.mp3` y su
  `loop_samples` va a `MUSIC_TRACKS` en `src/fx/music-tracks.ts`.

## Objetivos de máster

- **−17 LUFS** integrados (±1) y pico real **≤ −1 dBTP**: la música va debajo de los efectos.
- Hueco en 2–5 kHz para los SFX de combate; nada de agudos por encima de 8 kHz salvo brillos.
- Bucle perfecto: `seam_jump` < 0,02 y colas plegadas al inicio (lo hace `render()`).
