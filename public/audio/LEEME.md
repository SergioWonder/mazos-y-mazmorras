# Música y sonido

El juego usa **efectos de sonido sintetizados** (Web Audio API, sin ficheros) y
**música lo-fi de mazmorreo generada al vuelo**, con un tema distinto por capítulo
y una variante más intensa (con bombo) durante el combate:

| Capítulo | Exploración        | Combate                   |
|----------|--------------------|---------------------------|
| I        | `cap1`             | `cap1-combate`            |
| II       | `cap2`             | `cap2-combate`            |
| III      | `cap3`             | `cap3-combate`            |

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
