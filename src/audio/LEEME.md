# Música y sonido

El juego usa **efectos de sonido realistas** (MP3 en `sfx/`) y una
**banda sonora original**, compuesta para el juego y sintetizada por código (Python +
numpy, sin samples) por el agente `compositor-musical` (`.claude/agents/`).

Hay un tema principal y, para cada acto, un tema de combate y un tema de jefe; el Dungeon Master tiene una pista propia que rompe con el resto (metalcore). Todos
comparten un **leitmotiv** del héroe (re mayor: D A | B A F# | G F# E | D). Cada pista
es un **bucle exacto**. `src/fx/music-tracks.ts` guarda cuántas muestras dura cada bucle,
y el juego lo reproduce con Web Audio sin cortes, saltándose el relleno del MP3 si el
navegador no lo quita. Si un fichero no carga, suena un **loop chiptune** de respaldo.
La música se **pausa** en segundo plano y el botón flotante 🎵 apaga o enciende solo la música (los efectos siguen sonando).

| Fichero     | Tema | Carácter |
|-------------|------|----------|
| `menu.mp3`  | Tema principal | Orquesta de cámara con samples reales (VSCO 2): vals de aventura en re mayor, 3/4 a 108; trompa, maderas, cuerdas y arpa. Hecho con el estudio de `scripts/musica/estudio/` |
| `cap1.mp3`  | Acto I: Asentamiento Ogro y Contrabandistas | «Taberna y travesura», giga pícara en 6/8 |
| `jefe1.mp3` | Jefes del acto I | «Señor de la guerra», épica orquestal en re menor |
| `cap2.mp3`  | Acto II: La Cripta y El Templo Oscuro | «Marcha de los huesos», misterio travieso en re dórico |
| `jefe2.mp3` | Jefes del acto II | «Presagio», tensión ritual en mi frigio |
| `cap3.mp3`  | Acto III: Guarida del Dragón y Laberinto | «Brasas y locura», amenaza sombría en mi frigio a 90 BPM, con el leitmotiv como eco lúgubre |
| `jefe3.mp3` | Jefes del acto III | Combate final, la pista más épica |
| `dm.mp3`    | El Dungeon Master | «Behind the Screen», metalcore progresivo instrumental en sol menor a 140 BPM; su intro suena una vez y queda fuera del bucle |

El tema del menú ya sale del **estudio con samples** (`scripts/musica/estudio/`, ver su README):
`scripts/musica/menu/compose.py` genera el MIDI y `scripts/musica/menu/mix.py` lo renderiza a
192 kbps. Las demás pistas siguen siendo las sintetizadas, a 160 kbps. Los scripts de las sintetizadas
están en `scripts/musica/<pista>/` y solo necesitan Python 3, numpy y ffmpeg: por
ejemplo, `python3 scripts/musica/acto2/cap2.py` deja `cap2.mp3` junto al script. Para
publicarla, cópiala aquí (Vite le pone un hash en el nombre, así que la caché del juego la renueva) y, si cambió su duración, actualiza `loopSamples` en
`src/fx/music-tracks.ts`. El smoke test comprueba que cada tema tiene su fichero.

## Efectos de sonido

Los efectos de `sfx/` son MP3 mono a 96 kbps hechos por el agente `disenador-sfx` sin
samples: `python3 scripts/sfx/make_sfx.py [nombre ...]` los sintetiza con numpy
(modos inarmónicos para el metal, ruido filtrado con barrido para tajos y oleaje, pulsos
glotales con formantes para gruñidos y aullidos, campanas y reverb por convolución) y los
deja aquí. Cada fichero se llama como el efecto (`cura.mp3`) o lleva un número si es una
variación (`tajo-1.mp3`, `tajo-2.mp3`…). La tabla de nombres está en `src/fx/sfx-bank.ts`:
incluye los eventos del motor y todas las claves `fx` de cartas y enemigos. El motor
alterna las variaciones y cambia un poco el tono y el volumen en cada golpe. Mientras un
fichero no ha cargado suena la receta sintetizada de `src/fx/audio.ts`. El smoke test
comprueba que cada nombre tiene su MP3 y que pesan poco.
