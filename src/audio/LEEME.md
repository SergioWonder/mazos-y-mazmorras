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
| `menu.mp3`  | Tema principal | «Brasas», fantasía y magia: re menor a 84 con celesta, flauta alto, violín solista, arpa y coro (leitmotiv 3). Hecho con el estudio de `scripts/musica/menu-brasas/` |
| `cap1-e0.mp3` / `cap1-e0-combate.mp3` | Acto I, Asentamiento Ogro (mapa / combate) | «Tambores en el valle»: marcha en mi menor con color frigio a 132; la misma canción en dos versiones sincronizadas |
| `cap1-e0-jefe.mp3` | Jefe Gorzug | «El festín de Gorzug»: re menor a 160 en 3+3+2; el tema se va devorando a mordiscos |
| `cap1-e1.mp3` / `cap1-e1-combate.mp3` | Acto I, Contrabandistas (mapa / combate) | «Bajo la posada vieja»: saloma en 6/8, sol dórico; ocarina, armónica, piano de taberna; giga en combate |
| `cap1-e1-jefe.mp3` | Jefe Vexis | «La función de medianoche»: el vals del menú robado, do♯ menor a 180, circo macabro |
| `cap1.mp3`  | (respaldo del Acto I) | «Taberna y travesura», giga pícara en 6/8 (sintetizada) |
| `jefe1.mp3` | (respaldo de jefes del Acto I) | «Señor de la guerra», épica orquestal en re menor (sintetizada) |
| `cap2.mp3`  | Acto II: La Cripta y El Templo Oscuro | «Marcha de los huesos», misterio travieso en re dórico |
| `jefe2.mp3` | Jefes del acto II | «Presagio», tensión ritual en mi frigio |
| `cap3.mp3`  | Acto III: Guarida del Dragón y Laberinto | «Brasas y locura», amenaza sombría en mi frigio a 90 BPM, con el leitmotiv como eco lúgubre |
| `jefe3.mp3` | Jefes del acto III | Combate final, la pista más épica |
| `dm.mp3`    | El Dungeon Master | «Behind the Screen», metalcore progresivo instrumental en sol menor a 140 BPM; su intro suena una vez y queda fuera del bucle |

En cada escenario con música propia, el mapa y el combate son **dos versiones de la misma canción**
(mismo `group` y `loopSamples` en `src/fx/music-tracks.ts`): al cambiar de una a otra el juego sigue
desde el mismo punto del bucle con un fundido cruzado de 1,6 s. Sin pista propia, suena la del acto.

El tema del menú y el Acto I ya salen del **estudio con samples** (`scripts/musica/estudio/`, ver su README):
`scripts/musica/menu-brasas/compose.py` genera el MIDI y `scripts/musica/menu-brasas/mix.py` lo renderiza a
MP3 VBR de calidad 2 (mantiene el nivel exacto). Las pistas `acto1-*` siguen el mismo esquema en
`scripts/musica/acto1-*/`. Las demás pistas siguen siendo las sintetizadas, a 160 kbps. Los scripts de las sintetizadas
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
