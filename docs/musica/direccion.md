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

## Leitmotivs (decididos por el usuario tras oír los bocetos de `scripts/musica/leitmotivs/`)

- **Acto I:** el leitmotiv original (re mayor: D A | B A F# | G F# E | D). Ya en uso.
- **Menú principal:** el leitmotiv **3 «Brasas»** (re menor: D F E A | D F G A | B♭ A G E | D) con el
  arreglo de **fantasía y magia** del boceto `brasas-fantasia`: celesta y flauta alto en octavas,
  arpegios de arpa, halo de coro, violín solista, armónicos agudos, glockenspiel y copas de cristal.
- **Acto II:** el leitmotiv **7 «Sombra»** (cromático, con tritono: D E F G# | A F E C# | D F A B♭ A | D).
  - **La Cripta:** a partir del boceto `sombra-terror`, pero **sin el pitido agudo constante** (los
    armónicos tenidos a un semitono) y con **más variedad de instrumentos**. Versiones de
    exploración y de combate, como en el Acto I.
  - **El Templo Oscuro:** a partir del boceto `sombra-sombrio`, con **mucho más protagonismo de las
    voces, alternando agudas y graves**, y un tono de **cultistas oscuros que invocan demonios y
    clavan puñales**. Versiones de exploración y de combate.

### Acto II: lo que pidió el usuario tras oír los bocetos (`scripts/musica/leitmotivs/acto2_bocetos.py`)

- **Bocetos aprobados como base:** `acto2-cripta-explora`, `acto2-cripta-combate`, `acto2-templo-explora`,
  `acto2-templo-combate` y `acto2-jefe-cripta` (en `scripts/musica/leitmotivs/build/`).
  - Cripta · exploración: el vibráfono con arco **suave**, nada estridente (en el primer boceto lo era).
  - Templo · combate: **intenso de verdad**, no calmado (en el primer boceto lo parecía).
- **Jefe del Templo, Malachar y Abaddon: dos pistas que son la misma canción** (mismo tempo, compases,
  forma y armonía, como exploración/combate). El juego cambia de una a otra, desde el mismo punto,
  cuando cae Malachar y se alza Abaddon.
  - **Malachar: más ritual.** Mucho más énfasis en los coros. **Sin la trompa aguda** del boceto
    (estridente): en su lugar, instrumentos propios de un ritual (órgano, campanas, gong, tambores
    de marco, crótalos, drones graves como didgeridoo o contrafagot…).
  - **Abaddon: más caos.** El mismo esqueleto rítmico, desatado: metales graves, racimos, trémolos,
    golpes, coros que gritan.
- Ids de juego: `cap2-e0`, `cap2-e0-combate`, `cap2-e0-jefe` (Vol'guth), `cap2-e1`, `cap2-e1-combate`,
  `cap2-e1-jefe` (Malachar) y `cap2-e1-jefe-fase2` (Abaddon).

## Acto III

- **El Laberinto del Contemplador:** misterio y oscuridad profunda con metalcore progresivo (riffs pesados cortados por
  silencios, coros detrás, métricas cambiantes): música que no pertenece a un mundo de fantasía. Bocetos en
  `scripts/musica/leitmotivs/acto3_bocetos.py` (arreglo «Ojo del vacío») y `acto3_combate.py` («Asalto», «Espiral»).
- **La Guarida del Dragón:** **decadencia** (ruinas, lava, azufre, el tesoro del dragón); escalas menores e
  instrumentos para el dragón.
  - **Leitmotiv elegido: «Tesoro maldito»** (la menor, lamento que se hunde grado a grado hasta la sensible, 3/4 a
    ♩ = 84: A4 G4 | F4 E4 | D4 E4 F4 | E4 | C5 B4 | A4 G#4 F4 | E4 F4 D4 | A3), en el arreglo **«Ruinas de oro»**
    (boceto `ruinas-4-tesoro-maldito`): violonchelo solista, *ostinato* grave de arpa con el ♭2, contrafagot en la
    fundamental y su vecina ♭2, pandero de marco suave y brillo de vibráfono con arco (solo 61–77 y vel. ≤ 64).
  - **Combate: «adelante con todo».** Los dos bocetos de combate, «Saqueo» y «Derrumbe», son secciones de la misma
    pista de combate. El usuario quiere **frenesí**: mucha percusión y elementos que empujan, con el metal y la
    percusión pequeña **audibles** (en el boceto quedaban enterrados).
  - Como siempre: **nada agudo estridente** (nada tenido por encima de F5 salvo cumbres breves de la melodía).
  - Brief: [acto3-guarida.md](acto3-guarida.md). Ids de juego: `cap3-e0` y `cap3-e0-combate`.

### Acto III · El Laberinto del Contemplador (`cap3-e1`, `cap3-e1-combate`)

- **Leitmotiv elegido: «Fractura»** (re, semitono y tritono: D5 E♭5 A4 G♯4 D5 F5 E5 B♭4 en blancas, dos por compás),
  sobre colchón de coro disminuido re–fa–la♭ y cúmulo de órgano re–mi♭. ♩ = 70, 4/4.
- **Exploración:** el arreglo «Ojo del vacío» (boceto `ojo-1-fractura`): celesta y copas sobre el motivo encima del
  coro, y después el *breakdown* a medio tiempo sobre re grave lleno de huecos (guitarra distorsionada, bajo de púa,
  batería), con el coro tomando el motivo. Misterio y oscuridad profunda, metalcore progresivo, riffs pesados seguidos
  de pausas, ritmos que cambian, caos y locura: música que no pertenece a un mundo de fantasía.
- **Combate: «adelante con todo».** Los dos bocetos son secciones de la misma pista: «Asalto» (doble tiempo desde el
  primer tiempo, trémolo de semicorcheas en dos guitarras con acentos 3+3+3+3+2+2, doble bombo, *blast beats*,
  paradas en seco que dejan solo el coro, solista con el motivo) y «Espiral» (la célula de 7/16 que resbala sobre el
  4/4 encima de un bordón de coro en tritono, *breakdown* con doble bombo, un compás de *blast*, tres golpes y caída de
  toms). Batería y guitarras a tope: frenesí. El combate sigue la forma de la exploración compás a compás.
- **Nada de agudos que pitan:** la celesta va una octava por debajo del boceto (el motivo a su altura) y nada tenido
  pasa de F5.
- Brief: [acto3-laberinto.md](acto3-laberinto.md).

### Acto III · Jefe del Laberinto: El Contemplador (`cap3-e1-jefe`)

- **Caos y frenesí, metalcore moderno a lo Architects y Bad Omens:** un sintetizador encima de la batería y el bajo
  (supersierra, arpegios de *pluck*, *glitches*, *risers*, *sub drops*) y una voz rota tipo *vocal fry* (`growl`).
- El usuario aprobó **enteros** los dos bocetos de `scripts/musica/leitmotivs/acto3_jefes.py` («Mirada del abismo» y
  «Caos cromático»): una sola pista a ♩ = 140 que los encadena (4/4 → 7/8 → 4/4 → 5/4) sobre «Fractura» en si (♭2 = Do).
- Sintetizadores **audibles** (en el boceto quedaban enterrados bajo las guitarras) y, como siempre, nada agudo tenido
  por encima de F5 y la banda de 2,5–6 kHz domada.
- Brief: [acto3-contemplador.md](acto3-contemplador.md).

### Acto III · Jefe de la Guarida: Ignifax, el Dragón Rojo (`cap3-e0-jefe`)

- **El clímax de la música dracónica del acto y la última batalla del juego:** coros poderosos con pausas, épico y
  frenético, sobre «Tesoro maldito».
- El usuario aprobó **enteros** los dos bocetos de `scripts/musica/leitmotivs/acto3_jefes.py` («Llamarada», ♩ = 168 en
  3/4, y «Trono de ceniza», ♩ = 126 en 4/4): una sola pista de 80,5 s que los alterna por **modulación métrica exacta**
  (168 = 126 × 4/3) y guarda todas sus ideas (la máquina de guerra que se para en seco, los martillazos y el silencio, el
  trono con órgano, coro grave y latido de timbal, el groove 3+3+2, la ruptura con gritos, el motivo un semitono y una
  tercera menor arriba, los tres golpes en hemiolia). Una sola cumbre: el regreso en do menor.
- **El yunque del boceto («campanita») era demasiado agudo:** se cambia por un golpe de metal grave (tambor de freno con
  martillo) en un bus oscuro y ~11 dB por debajo. El órgano lleno tapaba la percusión: va a −14 dB de parte en el trono
  y más abajo en los clímax; la percusión empuja y el coro y las trompas lideran.
- Brief: [acto3-ignifax.md](acto3-ignifax.md).
