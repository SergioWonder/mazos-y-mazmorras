# Dirección musical (indicada por el usuario, 1 oct 2026)

Fuente de verdad para los briefs de `docs/musica/<pista>.md`. Orden de trabajo: menú →
(OK del usuario) → Acto I (sus dos escenarios y sus jefes) → Acto II → Acto III.

## Actos: dos versiones de la misma canción

- Cada escenario de cada acto tiene **una sola canción en dos tonalidades de intensidad**:
  - **Exploración** (mapa y eventos): tono más relajado.
  - **Combate** (combates normales y élites): misma música y temática, tono de combate.
- Al pasar de mapa a combate y viceversa, la pista cambia **desde el mismo punto en el que
  iba la otra**, con un fundido cruzado. Se tiene que notar el cambio de tono, pero que es la
  misma canción y que sigue desde donde estaba.
- Consecuencia técnica: las dos versiones comparten tempo, compases, forma y armonía, y
  tienen exactamente la misma duración de bucle (mismo `loopSamples`). El motor de audio
  las reproduce sincronizadas y cruza el volumen entre ellas (ver `src/fx/audio.ts`).

## Jefes

- Cambio radical respecto a los actos: temática mucho más oscura y ritmo frenético de
  batalla épica.

## Acto I

- **Escenario 0, El Asentamiento Ogro:** aventura de fantasía, pero con un tono algo más
  serio que la música anterior. Ritmos frenéticos y algo de oscuridad.
  - **Jefe, Gorzug el Jefe Ogro:** el combate se vuelve mucho más dramático y peligroso; el
    jefe devora a sus propios goblins. La aventura acaba de empezar y ya se ve que no es
    como te la habían pintado.
- **Escenario 1, La Guarida de los Contrabandistas:** tono ligeramente serio, como el
  anterior, pero con instrumentos y melodías de barco pirata o de tugurio de
  contrabandistas.
  - **Jefe, Vexis el Embaucador Arcano (pícaro):** además del ritmo frenético de jefe, un
    tono de circo macabro, trucos de magia y algo de terror.

## Actos II y III

Pendiente de que el usuario dé la dirección.
