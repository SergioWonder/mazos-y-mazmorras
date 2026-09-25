# Música y sonido

El juego usa **efectos de sonido sintetizados** (Web Audio API, sin ficheros) y una
**banda sonora original**, compuesta para el juego y sintetizada por código (Python +
numpy, sin samples) por el agente `compositor-musical` (`.claude/agents/`).

Hay un tema principal y, para cada acto, un tema de combate y un tema de jefe. Todos
comparten un **leitmotiv** del héroe (re mayor: D A | B A F# | G F# E | D). Cada pista
es un **bucle exacto**. `src/fx/music-tracks.ts` guarda cuántas muestras dura cada bucle,
y el juego lo reproduce con Web Audio sin cortes, saltándose el relleno del MP3 si el
navegador no lo quita. Si un fichero no carga, suena un **loop chiptune** de respaldo.
La música se **pausa** en segundo plano y el botón flotante 🔊/🔇 silencia todo.

| Fichero     | Tema | Carácter |
|-------------|------|----------|
| `menu.mp3`  | Tema principal | Obertura de aventura, cálida y heroica |
| `cap1.mp3`  | Acto I: Asentamiento Ogro y Contrabandistas | «Taberna y travesura», giga pícara en 6/8 |
| `jefe1.mp3` | Jefes del acto I | «Señor de la guerra», épica orquestal en re menor |
| `cap2.mp3`  | Acto II: La Cripta y El Templo Oscuro | «Marcha de los huesos», misterio travieso en re dórico |
| `jefe2.mp3` | Jefes del acto II | «Presagio», tensión ritual en mi frigio |
| `cap3.mp3`  | Acto III: Guarida del Dragón y Laberinto | Aventura heroica ante el peligro |
| `jefe3.mp3` | Jefes del acto III | Combate final, la pista más épica |

Todas las pistas son MP3 a 160 kbps, 44,1 kHz y estéreo. Los scripts que las generan
están en `scripts/musica/<pista>/` y solo necesitan Python 3, numpy y ffmpeg: por
ejemplo, `python3 scripts/musica/acto2/cap2.py` deja `cap2.mp3` junto al script. Para
publicarla, cópiala aquí y, si cambió su duración, actualiza `loopSamples` en
`src/fx/music-tracks.ts`. El smoke test comprueba que cada tema tiene su fichero.
