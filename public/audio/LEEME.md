# Música y sonido

El juego usa **efectos de sonido sintetizados** (Web Audio API, sin ficheros) y
**música 8-bit/chiptune**: un tema de menú, y por cada acto un tema normal
(exploración y combate corriente) y un tema de **jefe** rápido y épico.

Cada tema reproduce una **pista CC0 real** (las de la tabla); si el fichero no
carga, suena un **loop chiptune procedural de respaldo** equivalente. La música se
**pausa automáticamente** en segundo plano y el botón flotante 🔊/🔇 silencia todo.

## Pistas usadas (todas CC0 / dominio público)

Fuente: [OpenGameArt.org](https://opengameart.org/). La licencia CC0 no exige
atribución; se acredita igualmente por cortesía.

| Fichero    | Tema                  | Pista            | Autor        |
|------------|-----------------------|------------------|--------------|
| `menu.ogg` | Menú principal        | *Exploring Town* | Spring Spring |
| `cap1.ogg` | Acto I — Asentamiento Ogro | *Overworld Theme* | Louswan |
| `cap2.mp3` | Acto II — La Cripta   | *Spooky Dungeon* | Memoraphile  |
| `cap3.mp3` | Acto III — Guarida del Dragón | *Fire Level* | Spring Spring |
| `jefe.ogg` | Jefes (los tres actos)| *Great Boss*     | Spring Spring |

## Cambiar o ampliar pistas

Para usar otra pista en un tema: déjala en esta carpeta y ajusta el campo
`archivo` del tema correspondiente en `TEMAS` (`src/fx/audio.ts`). Usa preferiblemente
**CC0**; si es **CC-BY**, añade la atribución aquí. Para dar a cada jefe su propia
pista, apunta `cap1-jefe` / `cap2-jefe` / `cap3-jefe` a ficheros distintos.
