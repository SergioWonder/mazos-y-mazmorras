# Música y sonido

El juego usa **efectos de sonido sintetizados** (Web Audio API, sin ficheros) y
**música chiptune (8-bit) de mazmorreo generada al vuelo**: un tema de menú, y por
cada acto un tema normal (exploración y combate corriente) y un tema de **jefe**
rápido y épico:

| Tema             | Cuándo suena                          |
|------------------|---------------------------------------|
| `menu`           | menú principal                        |
| `cap1` / `cap1-jefe` | Acto I — El Asentamiento Ogro / su jefe |
| `cap2` / `cap2-jefe` | Acto II — La Cripta / su jefe         |
| `cap3` / `cap3-jefe` | Acto III — La Guarida del Dragón / su jefe |

La música se **pausa automáticamente** cuando la pestaña/app pasa a segundo plano
y se reanuda al volver. El botón flotante 🔊/🔇 silencia todo (se recuerda).

## Usar pistas CC0 reales (opcional)

Cada tema admite una pista real que sustituye al loop procedural. Para activarla:

1. Consigue una pista con licencia **CC0 / dominio público** (sin atribución) o
   **CC-BY** (acredita al autor en el `README.md`). Fuentes:
   - OpenGameArt — https://opengameart.org/ (filtra «CC0» + «music»)
   - Freesound — https://freesound.org/ (licencia «Creative Commons 0»)
   - Pixabay Music — https://pixabay.com/music/
   - Incompetech (Kevin MacLeod) — https://incompetech.com/ (CC-BY)
2. Déjala en esta carpeta, p. ej. `cap2-combate.mp3`.
3. En `src/fx/audio.ts`, añade el campo `archivo` al tema correspondiente dentro
   de `TEMAS`, p. ej.: `'cap2-combate': { …, archivo: 'cap2-combate.mp3' }`.

Si el fichero falta o falla la carga, el tema vuelve solo al loop procedural.
