# Brief: Tema del menú principal, «Brasas» (la puerta del juego)

Nuevo tema del menú principal. Sustituye al de [menu.md](menu.md) (3/4, re mayor, ya publicado), que se queda
como documentación del tema anterior. Pista nueva en `scripts/musica/menu-brasas/` con las convenciones del
[README del estudio](../../scripts/musica/estudio/README.md): `compose.py` → `build/menu-brasas.mid`,
`test_compose.py` (los criterios de §8 que se leen en el MIDI, escritos **antes** que `compose.py`),
`mix.py` → `build/menu-brasas.mp3` y `build/menu-brasas.report.json`. Necesita montado el disco **Base**
(VCSL y Sonatina).

Fuentes: [direccion.md](direccion.md), sección «Leitmotivs» (el usuario eligió el leitmotiv **3 «Brasas»** con
el arreglo de **fantasía y magia**). Referencia de color, ya escuchada y aprobada:
`scripts/musica/leitmotivs/arreglos.py` (función `fantasia`) y `scripts/musica/leitmotivs/build/brasas-fantasia.mp3`.
De ese boceto se conservan los timbres (celesta y flauta alto en octavas, arpegios de arpa, halo de coro mixto,
violín solista con la celesta respondiendo arriba, armónicos agudos, glockenspiel y copas en las notas largas),
el tempo y la métrica. Lo que este brief añade: forma, desarrollo armónico y temático, calidez (clarinete,
trompa, cuerdas graves) y un único clímax.

## 1. Función, emoción y repetición

- **Dónde suena:** pantalla de título y selección de clase. Es la puerta del juego: lo primero que oye el
  jugador y donde **aprende el leitmotiv «Brasas»**.
- **Emoción:** misterio y magia, pero **acogedora**. Una puerta antigua que se entreabre y deja ver luz cálida
  al otro lado: brillo de cristal y celesta arriba, el calor de una hoguera abajo (clarinete, trompa, chelos,
  coro masculino en boca cerrada). Re menor modal, con la sexta dórica (Mi natural sobre Sol menor) y el color
  lidio (Mi sobre Si♭) en lugar del menor oscuro. Nada de terror, nada de pompa: orquesta de cámara.
- **Repetición:** de 30 s a varios minutos eligiendo clase; el bucle tiene que aguantar 4–5 vueltas. Un solo
  clímax corto (c. 21), un respiro claro (c. 11–14) y una vuelta al c. 1 que suene a cadencia (A7sus4 → Dm),
  no a corte.
- **Transformación del leitmotiv en esta pista** (ver §5): se expone entero una vez (c. 3–6), y a partir de ahí
  **nunca vuelve igual**: inversión (la «llave» de la intro), variación rítmica y desvío cadencial a la relativa,
  **modo mayor** con ritmo de nana, fragmento en secuencia, **aumentación**, rearmonización sobre bajo
  ascendente con la nota final convertida en apoyatura, tercera de Picardía y **disminución** en caja de
  música.

## 2. Tempo, métrica, tonalidad, duración

| Parámetro | Valor |
|---|---|
| Tempo | ♩ = 84, fijo (sin cambios de tempo ni rubato en el MIDI), como el boceto |
| Métrica | 4/4 |
| Tonalidad | re menor (eólico/dórico); A' modula a **fa mayor** (relativo), B en fa mayor con préstamo de fa menor; puente con **♭II napolitano** (E♭maj7(#11)); **re mayor** (Picardía) en el c. 23 |
| Compases | **28** |
| Duración del bucle | 28 × 4 × 60/84 = **80,000 s** → `loop_samples` = 28 × 4 × 60/84 × 44 100 = **3 528 000** (entero: a ♩ = 84 en 4/4 cada compás son exactamente 126 000 muestras) |
| `MixSpec` | `bpm=84`, `beats_per_bar=4`, `bars=28` (y `loop_samples` esperado en el informe: 3 528 000) |

Compás = 2,857 s; negra = 0,714 s; corchea = 0,357 s. Inicio del compás *n* = (*n* − 1) × 2,857 s.

**Figuras:** la más rápida es la **corchea**. Excepciones: el glissando de arpa del c. 18 (tiempo 4) y los
acordes arpegiados del arpa (≤ 60 ms entre notas). Nada de semicorcheas.

## 3. Forma compás a compás e intensidad

Intensidad de 1 (casi silencio) a 10 (lo más fuerte de la pista, que en este tema es un *f* contenido).

| Sección | Compases | Tiempo (s) | Contenido | Intensidad |
|---|---|---|---|---|
| Intro «El umbral» | 1–2 | 0,0–5,7 | Pedal de re; onda de arpa, armónicos, copa y coro lejano; Mark Trees en el tiempo 1. La celesta toca la **inversión** de la cabeza: la llave en la cerradura | 2 → 3 |
| A «La llama» | 3–6 | 5,7–17,1 | **Exposición**: flauta alto con la celesta a la octava, sobre arpa y halo de coro (el color del boceto). Semicadencia | 4 (cumbre suave en el c. 5) |
| A' «El violín» | 7–10 | 17,1–28,6 | Violín solista con el motivo variado; la celesta responde arriba; bajo descendente con IV dórico; **modula a fa mayor** | 5 → 6 (c. 9) → 5 |
| B «Junto al fuego» | 11–14 | 28,6–40,0 | **Respiro.** Clarinete con el motivo **en mayor** y ritmo de nana; pizzicato de chelos como brasas; coro en boca cerrada; trompa al final. Sin celesta ni armónicos | 3 (mínimo de las secciones centrales) |
| Puente «El hechizo» | 15–18 | 40,0–51,4 | Cadencia rota a B♭; la cabeza en **secuencia** (violín → flauta + celesta) y en **aumentación**; napolitano; trémolo, redoble, plato y glissando | 4 → 7 |
| Retorno «La puerta» | 19–24 | 51,4–68,6 | Motivo completo en violín + flauta al unísono sobre bajo ascendente, trompa y coro; **clímax en el c. 21**; la puerta se abre en **re mayor** (c. 23) y se vuelve a cerrar (IV → iv, c. 24) | 7 → **10** (c. 21) → 8 → 6 (c. 23) → 5 |
| Codetta «Brasas» | 25–28 | 68,6–80,0 | La celesta, caja de música, toca el motivo en **disminución**; la flauta alto deja la cabeza en **aumentación**, sin respuesta; A7sus4 → c. 1 | 4 → 2 |

Puntos de respiro: tiempo 4 de los c. 6 y 10 (la melodía calla), todo B, c. 24–28. El oído tiene que descansar
en B para que el puente y el retorno suenen a llegada. La intro y la codetta juntas (c. 25–2, 6 compases) son
la zona más tranquila: por eso la codetta tiene el motivo en la celesta (caja de música) y la intro la inversión,
para que no sean seis compases de pedal sin melodía.

## 4. Armonía

Cifrado por compás; «(1–2) / (3–4)» indica cambio de acorde en el tiempo 3. Bajo tras la barra cuando no es la
fundamental. La nota del bajo que escribe el chelo/contrabajo es la del cifrado (criterio 11).

**Intro (1–2)**: pedal de re; el «umbral» oscila entre tónica y VI lidio.

| 1 | 2 |
|---|---|
| Dm(add9) | B♭maj7(#11)/D (1–3) / A7sus4 (4) |

**A (3–6)**: la armonía indicada para el arreglo de fantasía. Nota: en el boceto el c. 2 del motivo va sobre
Dm(add9) (chelo en D3); aquí va sobre **B♭maj7** (D–F–A del acorde, G como 13.ª), que da más movimiento.

| 3 | 4 | 5 | 6 |
|---|---|---|---|
| Dm(add9) | B♭maj7 | Gm(add9) (1–2) / Gm6 (3–4) | A7sus4 (1–3) / A7 (4) |

Sobre Gm la E natural de la melodía es la **sexta dórica**: el color «mágico» del tema. El c. 6 es una
semicadencia: la sus4 se resuelve en el tiempo 4 (la C# la ponen arpa y coro cuando la flauta ya ha soltado).

**A' (7–10)**: bajo descendente D – C – B♭ y luego cromático ascendente B♭ – B♮ – C hacia la relativa.
**G7/B** es el IV dórico prestado (Si natural): calidez inesperada.

| 7 | 8 | 9 | 10 |
|---|---|---|---|
| Dm(add9) (1–2) / Dm/C (3–4) | B♭maj7 (1–2) / **G7/B** (3–4) | C7sus4 (1–2) / C7 (3–4) (V de fa) | **F(add9)** |

Bajo: D3 C3 · B♭2 B2 · C3 · F2.

**B (11–14)**: fa mayor, que nunca se asienta del todo: ii–V, tónica en primera inversión, **iv menor
prestado** de fa menor (B♭m6) y semicadencia a la dominante de re menor.

| 11 | 12 | 13 | 14 |
|---|---|---|---|
| Gm9 (1–2) / C9sus4 (3–4) | F/A (1–2) / **B♭m6** (3–4) | Dm7 (1–2) / C7 (3–4) | F(add9) (1–2) / **A7(♭9)** (3–4) |

Bajo: G2 C3 · A2 B♭2 · D3 C3 · F2 A2.

**Puente (15–18)**: **cadencia rota** (A7 → B♭), terceras descendentes en el bajo y **napolitano** con #11.

| 15 | 16 | 17 | 18 |
|---|---|---|---|
| **B♭maj7(#11)** (V→VI) | Gm(add9) | **E♭maj7(#11)** (♭II) | A7sus4 (1–2) / A7(♭9) (3–4) |

Bajo: B♭2 · G2 · E♭2 · A2 (contrabajo a la octava grave en 17–18).

**Retorno (19–24)**: el motivo sobre un **bajo ascendente** D – E – F – G hasta la cumbre en B♭; dominante con
apoyatura; **Picardía** (re mayor) y cierre plagal **IV mayor → iv menor** que devuelve al menor sin cadencia.

| 19 | 20 | 21 | 22 | 23 | 24 |
|---|---|---|---|---|---|
| Dm(add9) (1–2) / A7/E (3–4) | Dm/F (1–2) / Gm9 (3–4) | **B♭maj7(#11)** (clímax) | A7sus4 (1–2) / A7(♭9) (3–4) | **D(add9)** (Picardía) | G/D (1–2) / Gm6/D (3–4) |

Bajo: D E · F G · B♭ · A · D · D (pedal).

**Codetta (25–28)**: pedal de re con el napolitano encima (misterio) y dominante suspendida que enlaza con el
Dm(add9) del c. 1: la costura es una cadencia V–i.

| 25 | 26 | 27 | 28 |
|---|---|---|---|
| Dm(add9) | Gm(add9)/D | E♭maj7(#11)/D | A7sus4 |

Recurrentes a propósito: el VI (B♭maj7) es el color de la pista y aparece en 4, 8, 15 y 21, pero cada vez con
otra función (subdominante, paso del bajo descendente, cadencia rota, cumbre) y otro bajo u otra orquestación.
No hay dos compases seguidos con el mismo cifrado salvo el pedal del c. 23–24 → 25.

## 5. Leitmotiv

Referencia «Brasas» (re menor), con el ritmo de `scripts/musica/leitmotivs/demos.py`, que es el que oyó el
usuario en el boceto (q = negra, h = blanca, h. = blanca con puntillo, w = redonda, e = corchea):

```
| D4  F4  E4  A3 | D4  F4  G4  A4 | B♭4    A4  E4 | D4       |
| q   q   q   q  | q   q   q   q  | h      q   q  | w        |
  62  65  64  57   62  65  67  69   70     69  64   62
```

`direccion.md` escribe el tercer compás como «B♭ A G E» (cuatro negras); el boceto y `demos.py` tienen
«B♭ (h) A E». La versión canónica de esta pista es la del boceto; la de cuatro notas con el Sol de paso aparece
como variante en la caja de música de la codetta (c. 26) y como cola desviada en A' (c. 9).

| Compases | Instrumento | Notas (MIDI) y ritmo | Transformación |
|---|---|---|---|
| 2 | Celesta | D6 B♭5 C6 G6 (86 82 84 91), q q q q | **Inversión diatónica** de la cabeza (3.ª abajo, 2.ª arriba, 4.ª arriba en vez de 3.ª arriba, 2.ª abajo, 5.ª abajo). La llave: el jugador aún no sabe qué abre. |
| **3–6** | **Flauta alto** + **Celesta** a la octava | Fl.: 62 65 64 57 · 62 65 67 69 · 70 (h) 69 64 · **62 (h.)** · Cel.: 74 77 76 69 · 74 77 79 81 · 82 (h) 81 76 · 74 (h.) | **Exposición** (la única completa y en su ritmo original): la del boceto, rearmonizada en el c. 4 (B♭maj7). La redonda final se acorta a blanca con puntillo: la semicadencia del tiempo 4 se oye sin la melodía. Tiene que poder cantarse tras oírla una vez. |
| 7–10 | Violín solista (8va) | 74 (q.) 77 (e) 76 69 · 74 77 79 81 · 82 (h) 81 **79** · **77 (h.)** | **Variación rítmica** (puntillo en la primera nota: siembra la nana de B) y **desvío cadencial**: el tercer compás baja B♭ A **G** y el motivo termina en **F5**, la tónica de la relativa. |
| 7–10 | Celesta (respuesta) | En la corchea débil de los tiempos 2 y 4 («2 y», «4 y»), una corchea: 86 88 · 86 91 · 94 93 · 89 84 | Eco de las notas 1.ª y 3.ª de cada compás del violín, una octava arriba (el gesto del boceto, que ya no cae sobre el ataque del violín). |
| 11–14 | Clarinete | 65 (q.) 69 (e) 67 60 · 65 (q.) 69 (e) 70 72 · 74 (h) 72 67 · 65 (h) **64 (h)** | **Modo mayor** (fa mayor, mismos grados: 1 3 2 5 · 1 3 4 5 · 6 5 2 · 1) con **ritmo de nana** (negra con puntillo + corchea). No llega a reposar: la última nota se sustituye por F4 → **E4**, la quinta de A7, que abre el puente. |
| 15 | Violín solista | 74 77 76 69, q q q q | **Fragmento** (la cabeza) con las alturas de A una octava arriba, **rearmonizado**: sobre B♭maj7(#11) la E es la #11 lidia. |
| 16 | Flauta alto + Celesta a la octava | Fl. 67 70 69 62 · Cel. 79 82 81 74, q q q q | **Secuencia** de la cabeza a la 4.ª superior (G B♭ A D), como respuesta al violín. |
| 17–18 | Violín solista + Flauta alto 8vb | Vl. 79 (h) 82 (h) · 81 (h) **74 (q) 73 (q)** · Fl. 67 (h) 70 (h) · 69 (h) 62 (q) 61 (q) | **Aumentación** (×2) de la cabeza secuenciada (G B♭ A D); la D del c. 18 se convierte en **apoyatura** que resuelve a C# sobre A7(♭9). |
| **19–22** | **Violín solista + Flauta alto al unísono** | 74 77 76 69 · 74 77 79 81 · **82 (h)** 81 76 · **74 (h) 73 (h)** | Motivo completo en el ritmo original, **rearmonizado** sobre el bajo ascendente (A7/E, Dm/F, Gm9, B♭maj7(#11)); el B♭5 del c. 21 es la cumbre. La D final se vuelve **apoyatura D → C#** sobre la dominante. |
| 23–25 | Violín solista (+ flauta alto en el c. 23; celesta 8va en el c. 24) | Vl. 74 (w) · 71 (h) 70 (h) · 69 (h.) · Fl. 66 (h.) · Cel. 83 (h) 82 (h) | **Prolongación**: la D por fin llega, sobre **re mayor** (la flauta canta la tercera de Picardía, F#4); luego la cola cromática B → B♭ → A devuelve el menor. |
| 25–26 | Celesta | 74 77 76 69 74 77 79 81 (8 e) · 82 81 79 76 (4 e) 74 (h) | **Disminución** (×2): el motivo entero en dos compases, como caja de música; el tercer compás con el Sol de paso (B♭ A G E). |
| 27–28 | Flauta alto | 62 (h) 65 (h) · 64 (h) 57 (h) | **Aumentación** (×2) de la cabeza, sola, *pp*: la pregunta sin respuesta que devuelve al c. 1. |

**Ninguna frase se repite idéntica**: las únicas dos apariciones con las mismas alturas y el mismo ritmo, A
(c. 3–6, en la octava de la flauta) y el retorno (c. 19–22, una octava arriba), difieren en armonía de los c. 4 y
19–21, en orquestación y en el final (h. y silencio frente a apoyatura D → C#).

## 6. Orquestación por sección

Registros en MIDI (C4 = 60). Las pistas del MIDI llevan el nombre de la columna «Pista».

### Patches

| Pista | Ruta `.sfz` | Dinámica | Duración máx. por nota |
|---|---|---|---|
| Celesta | `sso/Sonatina Symphonic Orchestra/Percussion/Celeste.sfz` | velocidad | — (decae; ≥ 3,5 s) |
| Flauta alto | `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Alto Flute Solo Sustain.sfz` | **CC1** | **≤ 2,8 s** (sin bucle; sample más corto 3,03 s, en G3) |
| Violín solista | `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violin Solo 1 Sustain.sfz` | **CC1** | **≤ 5,0 s** (sin bucle; sample más corto 5,59 s) |
| Arpa | `sso/Sonatina Symphonic Orchestra/Concert Harp.sfz` | velocidad | — (one shot) |
| Coro | `sso/Sonatina Symphonic Orchestra/Chorus - Performance/Mixed Chorus.sfz` | **CC1** | sin límite (con bucle); por diseño ≤ 2 compases |
| Armónicos | `sso/Sonatina Symphonic Orchestra/Strings - Performance/1st Violins Harmonics.sfz` | **CC1** | sin límite (con bucle); por diseño ≤ 4 compases |
| Clarinete | `VSCO-2-CE/ClarinetSus.sfz` | velocidad + CC11 | ≤ 8 s (samples ≥ 8,6 s en su registro) |
| Trompa | `VSCO-2-CE/FHornSus.sfz` | velocidad + CC11 | ≤ 7 s |
| Violas pp | `VSCO-2-CE/ViolaEnsSusVib-Quiet.sfz` | velocidad + CC11 | ≤ 7 s |
| Violas trém | `VSCO-2-CE/ViolaEnsTrem.sfz` | velocidad + CC11 | — |
| Violas | `VSCO-2-CE/ViolaEnsSusVib.sfz` | velocidad + CC11 | ≤ 7 s |
| Chelos pp | `VSCO-2-CE/CelloEnsSusVib-Quiet.sfz` | velocidad + CC11 | ≤ 6 s |
| Chelos pizz | `VSCO-2-CE/CelloEnsPizz.sfz` | velocidad | — |
| Chelos | `VSCO-2-CE/CelloEnsSusVib.sfz` | velocidad + CC11 | ≤ 6 s |
| Contrabajos | `VSCO-2-CE/ContrabassSusVB.sfz` | velocidad + CC11 | ≤ 6 s |
| Glockenspiel | `VSCO-2-CE/Glockenspiel.sfz` | velocidad | — |
| Copas | `VCSL/Idiophones/Friction Idiophones/Wine Glasses - Slow.sfz` | velocidad | ≤ 11 s (sample más corto 11,7 s, D6) |
| Timbal redoble | `VSCO-2-CE/TimpaniRolls.sfz` | velocidad + CC11 | ≤ 16 s |
| Timbal | `VSCO-2-CE/Timpani.sfz` | velocidad | — |
| Plato | `VCSL/Idiophones/Struck Idiophones/Suspended Cymbal 2.sfz`, nota 63 (crescendo ≈ 2,5 s) | velocidad | — |
| Mark Trees | `VCSL/Idiophones/Struck Idiophones/Mark Trees.sfz`, nota 60 (barrido ascendente) | velocidad | — |

**Sonatina por CC1** (flauta alto, violín solista, coro, armónicos): **curva de CC1 obligatoria**, con un punto
en el tick 0 y la forma de cada frase; como mucho un punto cada corchea. **Celesta y arpa** (Sonatina, por
velocidad): **sin curva de CC1** (el sampler la aplicaría como volumen); si el orquestador la necesita, un único
valor fijo de 100 en el tick 0.

La flauta alto pasa del `(looped)` del boceto a la versión **sin bucle**: ninguna nota de la flauta en esta pista
dura más de una blanca con puntillo (2,14 s), y el sample sin bucle tiene ataque y vibrato naturales en lugar de
bucles de 0,8–3 s. Lo mismo el violín solista: su nota más larga es la redonda del c. 23 (2,86 s).

### Intro «El umbral» (1–2): máximo 7 capas

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| La llave | Celesta | c. 2: D6 B♭5 C6 G6 (86 82 84 91), negras | *p* (vel. 48). Nada más de celesta en la intro. |
| Onda | Arpa | c. 1: D2 A2 E3 F3 A3 E4 F4 A4 (38 45 52 53 57 64 65 69), 8 corcheas ascendentes · c. 2: D2 B♭2 F3 A3 D4 E4 (38 46 53 57 62 64) en los tiempos 1–3 y A2 D3 (45 50) en el tiempo 4 | *pp* → *p* (vel. 38 → 50); la primera corchea de cada compás +8. |
| Niebla | Armónicos | D6 (86), tenido c. 1–2 | CC1 40 → 52. |
| Cristal | Copas | A5 (81), del tiempo 2 del c. 1 (adelantada 150 ms) al final del c. 2 | *pp* (vel. 35). |
| Halo lejano | Coro | c. 1: A3 D4 E4 (57 62 64) · c. 2: B♭3 D4 E4 (58 62 64) (1–3) → A3 D4 G4 (57 62 67) (4) | CC1 42 → 55. |
| Pedal | Chelos pp | D2 (38) del c. 1 al tiempo 3 del c. 2; A2 (45) en el tiempo 4 | *pp* (vel. 35). |
| La puerta | Mark Trees | 60, tiempo 1 del c. 1 | *pp* (vel. ≤ 35). |

### A «La llama» (3–6): máximo 8 capas

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía** | Flauta alto | §5 (57–70) | Legato (solape 40 ms, como el boceto); CC1 en arco 62 → **88 (tiempo 1 del c. 5)** → 64. Suelta en el tiempo 4 del c. 6. |
| **Melodía 8va** | Celesta | §5 (69–82) | Unísono a la octava declarado. Vel. 64–70 (por debajo del 72 del boceto: aquí no está sola). |
| Onda | Arpa | 38–64 (≤ E4) | 8 corcheas por compás: fundamental grave + notas del acorde con su color (9.ª, 7.ª, 6.ª), 5 subiendo y 3 bajando. Modelo exacto del c. 3: D2 A2 E3 F3 A3 E4 A3 F3 (38 45 52 53 57 64 57 53). *p* (vel. 46–56). En el tiempo 4 del c. 6, acorde A2 C#3 G3 (45 49 55) arpegiado: la resolución de la semicadencia. |
| Halo | Coro | c. 3: D4 F4 E5 (62 65 76) · c. 4: D4 F4 E5 (62 65 76) · c. 5: B♭3 D4 A5 (58 62 81) · c. 6: A3 D4 G5 (57 62 79) (1–3) → A3 C#4 G5 (57 61 79) (4) | Voz aguda tenida como nota común (la del boceto: E5 es la #11 sobre B♭) y par grave masculino. CC1 52 → 66 → 54, siempre ≥ 15 por debajo del CC1 de la flauta. |
| Niebla | Armónicos | D6 · D6 · G5 · A5 (86 86 79 81), una por compás | CC1 40 → 56 → 42. |
| Bajo | Chelos pp | D3 · B♭2 · G2 · A2 (50 46 43 45), redondas | *p* (vel. 45). |
| Destellos | Glockenspiel | D6 (86) en el tiempo 1 del c. 5; A5 (81) en el tiempo 1 del c. 6 | *pp* (vel. 38). En las notas largas de la melodía, como en el boceto. |
| Cristal | Copas | A5 (81), c. 6 completo (adelantada 150 ms) | *pp* (vel. 40). |

### A' «El violín» (7–10): máximo 9 capas

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía** | Violín solista | §5 (69–82) | CC1 66 → **94 (tiempo 1 del c. 9)** → 72; suelta en el tiempo 4 del c. 10 (respiración). |
| Respuesta | Celesta | §5 (84–94), corcheas en «2 y» y «4 y» | Vel. 50–56: un eco, nunca una segunda melodía. |
| Onda | Arpa | 38–67 (≤ G4) | Como en A, sobre la armonía nueva; el bajo del arpa sigue el del chelo (D C · B♭ B · C · F). *p* → *mp* en el c. 9. |
| Notas guía | Violas pp | A3 (w) · A3 (h) F3 (h) · **F3 (h) E3 (h)** · A3 (w) (57 · 57 53 · 53 52 · 57) | *p* (vel. 42–48). El F3 → E3 del c. 9 es la resolución de la sus4. |
| Bajo | Chelos pp | D3 (h) C3 (h) · B♭2 (h) **B2** (h) · C3 (w) · F2 (w) (50 48 · 46 47 · 48 · 41) | *p* (vel. 48). |
| Halo | Coro | Solo c. 9–10: B♭3 F4 G4 (58 65 67) (1–2) → B♭3 E4 G4 (58 64 67) (3–4) · A3 C4 G4 (57 60 67) | CC1 50 → 70 → 56. |
| Niebla | Armónicos | D6 (86) tenido c. 7–8 · G6 (91) · F6 (89) | CC1 40 → 55. |
| Destellos | Glockenspiel | D6 (86) en el tiempo 1 del c. 9; C6 (84) en el tiempo 1 del c. 10 | *pp* (vel. 38). |
| Cristal | Copas | F5 (77), c. 10 completo (adelantada 150 ms) | *pp* (vel. 40). Unísono declarado con el F5 del violín: la copa canta la nota de llegada. |

### B «Junto al fuego» (11–14): máximo 6 capas. Respiro.

Sin celesta, sin armónicos, sin glockenspiel, sin copas: la magia se aparta y queda el calor.

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía** | Clarinete | §5 (60–74) | *p* dolce (vel. 50–56); swell < > de CC11 (±15 %) en el D5 del c. 13. |
| Contracanto | Trompa | c. 13: F3 (h) E3 (h) · c. 14: F3 (h) G3 (h) · c. 15: F3 (h) (53 52 · 53 55 · 53) | *p* (vel. 44–50), lejana. La G3 → F3 resuelve la 7.ª de A7 en la 5.ª de B♭ (cadencia rota). |
| Brasas | Chelos pizz | Tiempos 1 y 3: G2 C3 · A2 B♭2 · D3 C3 · F2 A2 (43 48 · 45 46 · 50 48 · 41 45) | *p* (vel. 46); el tiempo 3, −6. |
| Boca cerrada | Coro | c. 11: F3 B♭3 (53 58) · c. 12: F3 A3 (53 57) → F3 **D♭4** (53 61) · c. 13: F3 A3 (53 57) → E3 B♭3 (52 58) · c. 14: A3 C4 (57 60) → G3 C#4 (55 61) | Solo voces graves (todo < G4), CC1 45 → 55. La D♭4 del c. 12 es el préstamo de fa menor. |
| Arpa | Arpa | Acorde arpegiado grave en el tiempo 1 (41–57) + **una** nota aguda en el tiempo 3: A5 · C6 · A5 · E5 (81 84 81 76) | *p* (vel. 42–50). Mucho espacio. |

### Puente «El hechizo» (15–18): máximo 12 capas

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía 15** | Violín solista | §5 | CC1 70 → 78. |
| **Melodía 16** | Flauta alto + Celesta 8va | §5 | Fl. CC1 72 → 82; Cel. vel. 60. |
| **Melodía 17–18** | Violín + Flauta alto 8vb | §5 | Crescendo CC1 82 → 96 hasta el tiempo 3 del c. 18; la apoyatura D → C# con < >. |
| Fin del contracanto | Trompa | F3 (h), c. 15 | Cola de B. |
| Halo que crece | Coro | c. 15: F3 A3 E4 (53 57 64) · c. 16: G3 B♭3 D4 (55 58 62) · c. 17: G3 B♭3 D4 (55 58 62) · c. 18: G3 A3 D4 (55 57 62) → G3 A3 C#4 (55 57 61) | CC1 50 → 82 (tiempo 4 del c. 18). Siempre por debajo de la flauta. |
| Niebla | Armónicos | E6 · D6 · D6 · E6 (88 86 86 88) | CC1 45 → 65. La E6 del c. 15 es la #11. |
| Tensión | Violas trém | c. 17: B♭3 D4 (58 62) · c. 18: A3 D4 (57 62) (1–2) → B♭3 C#4 (58 61) (3–4) | *pp* → *mf* (vel. 40; CC11 de 50 % a 100 %). |
| Bajo | Chelos | B♭2 · G2 · E♭2 · A2 (46 43 39 45), redondas | *p* → *mf* (vel. 50 → 72). |
| Bajo grave | Contrabajos | c. 17–18: E♭1 · A1 (27 33) | *p* → *mf*. |
| Onda y glissando | Arpa | c. 15–17: corcheas como en A (38–67); **c. 18, tiempo 4: glissando** en re menor armónica A3 → A5 (57 58 61 62 64 65 67 69 70 73 74 76 77 79, 14 notas repartidas en el tiempo 4) con **A5 (81) en el tiempo 1 del c. 19** | vel. 50 → 70. |
| Redoble | Timbal redoble | A2 (45), del tiempo 1 del c. 17 al final del c. 18 | *pp* → *mp* (vel. 45; CC11 30 % → 85 %). Corta en el tiempo 1 del c. 19. |
| Plato | Plato (63) | — | El pico del crescendo cae en el **tiempo 1 del c. 19** (empieza ≈ 2,5 s antes, en el c. 18 tras el tiempo 1: el orquestador mide el pico del sample y lo alinea). Vel. ≤ 65. **Único plato del bucle.** |

### Retorno «La puerta» (19–24): máximo 12 capas

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía** | Violín solista + Flauta alto (unísono, 69–82) | §5 | CC1 violín 88 → **100 (tiempo 1 del c. 21)** → 84 (c. 22) → 72 (c. 23) → 62 (c. 24) → 50 (c. 25). Flauta 4 por debajo. La flauta solo hasta el c. 23 (F#4, h.). |
| Contracanto | Trompa | c. 19: F4 (h) E4 (h) · c. 20: A3 (h) B♭3 (h) · c. 21: **D4 (w)** · c. 22: E4 (h) G4 (h) (65 64 · 57 58 · 62 · 64 67) | *mf* (vel. 72 → **85 en el c. 21** → 70). Una octava por debajo de la melodía o más; calla en el c. 23. |
| Coro | Coro | c. 19: A3 D4 F4 (57 62 65) → G3 C#4 E4 (55 61 64) · c. 20: D4 F4 (62 65) → B♭3 D4 A4 (58 62 69) · c. 21: B♭3 D4 F4 A4 (58 62 65 69) · c. 22: A3 D4 (57 62) → A3 C#4 (57 61) · c. 23: A3 D4 F#4 (57 62 66) · c. 24: G3 B3 D4 (55 59 62) → G3 B♭3 E4 (55 58 64) | CC1 75 → **92 (c. 21)** → 72 (c. 23) → 60 (c. 24). Nunca por encima de A4 (69). |
| Armonía interior | Violas | c. 19: A3 (h) G3 (h) · c. 20: A3 (w) · c. 21: F3 (w) · c. 22: G3 (h) B♭3 (h) (57 55 · 57 · 53 · 55 58) | *mp* (vel. 60–68). Calla en 23–24. |
| Bajo | Chelos | D3 (h) E3 (h) · F3 (h) G3 (h) · B♭2 (w) · A2 (w) · D3 (w) · D3 (w) (50 52 · 53 55 · 46 · 45 · 50 · 50) | *mf* (vel. 72 → **84 en el c. 21**) → *p* en el c. 24. |
| Bajo grave | Contrabajos | D2 E2 · F2 G2 · B♭1 · A1 · D2 · D2 (38 40 · 41 43 · 34 · 33 · 38 · 38) | Octava del chelo, *mf* → *p*. Suelta antes del final del c. 24. |
| Onda | Arpa | c. 19–22: corcheas 38–69, siempre por debajo de la melodía · c. 23: acorde arpegiado D(add9) D2 A2 E3 F#3 A3 D4 F#4 (38 45 52 54 57 62 66) en el tiempo 1 · c. 24: G/D D3 G3 B3 D4 (50 55 59 62) en el tiempo 1, Gm6/D D3 G3 B♭3 E4 (50 55 58 64) en el tiempo 3 | *mp* (vel. 55–66). |
| La luz | Celesta | c. 23: D5 E5 F#5 A5 D6 E6 (corcheas) F#6 (h) (74 76 78 81 86 88 90) · c. 24: B5 (h) B♭5 (h) (83 82), octava del violín | *p* (vel. 52). Calla en 19–22: el clímax es de cuerda, viento y coro. |
| Destellos | Glockenspiel | D6 (86) en el tiempo 1 del c. 21; **F#6 (90)** en el tiempo 1 del c. 23 | *mp* (vel. 55) / *pp* (vel. 40). La F#6 es la única F# del glockenspiel: la Picardía. |
| Cristal | Copas | F#5 (78), del tiempo 1 del c. 23 (adelantada 150 ms) al final del tiempo 2 del c. 24 | *pp* (vel. 40). Suelta antes del Gm6. |
| Golpes | Timbal | D2 (38) en el tiempo 1 del c. 19 (*mp*, vel. 62); B♭2 (46) en el tiempo 1 del c. 21 (*mf*, vel. 78) | **Solo estos dos golpes** en el bucle. |
| La puerta se abre | Mark Trees | 60, tiempo 1 del c. 23 | *pp* (vel. ≤ 35). |

### Codetta «Brasas» (25–28): máximo 8 capas

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Caja de música** | Celesta | §5, c. 25–26 (69–82) | *p* → *pp* (vel. 50 → 40). |
| Cola | Violín solista | A4 (h.) (69), c. 25 | CC1 55 → 40. |
| **Pregunta** | Flauta alto | §5, c. 27–28 (57–65) | CC1 60 → 50 → 45; la A3 final (blanca de los tiempos 3–4 del c. 28) suelta antes de 79,6 s. |
| Arpa | Arpa | Un acorde arpegiado en el tiempo 1 de cada compás: Dm(add9) D2 A2 E3 F3 · Gm(add9)/D D2 G2 B♭2 A3 · E♭maj7(#11)/D D2 E♭3 G3 A3 · A7sus4 A2 D3 E3 G3 (38 45 52 53 · 38 43 46 57 · 38 51 55 57 · 45 50 52 55) | *p* → *pp*. |
| Niebla | Armónicos | A5 (81), tenido c. 25–28 | CC1 50 → 38; suelta antes de 80,0 s. |
| Halo | Coro | c. 25: F3 A3 E4 (53 57 64) · c. 26: G3 B♭3 D4 (55 58 62) · c. 27: G3 A3 D4 (55 57 62) · c. 28: A3 D4 E4 (57 62 64) | CC1 55 → 40. El cúmulo G–A del c. 27 es la #11 del napolitano. |
| Pedal | Chelos pp | D3 (50) c. 25–27 (reataque en cada compás) · A2 (45) c. 28 | *p* → *pp*. |
| Cristal | Copas | D6 (86), del tiempo 1 del c. 26 al final del c. 27 (adelantada 150 ms) | *pp* (vel. 35). |

### Notas sobre los samples

- **Glockenspiel del boceto:** el boceto escribe D7 (98), fuera del rango de `Glockenspiel.sfz` (67–96): no
  sonaba. Aquí el glockenspiel va entre 81 y 90, con 6 golpes por bucle (c. 5, 6, 9, 10, 21, 23).
- **Copas** (`Wine Glasses - Slow`): ataque lento; empezar cada nota 150 ms antes del tiempo (la del c. 1 entra en
  el tiempo 2, así que tampoco nada empieza antes del tick 0). Samples en 75, 78, 82 y 86: F#5 (78) y D6 (86)
  suenan sin transponer; A5 (81) y F5 (77) a un semitono.
- **Coro:** por debajo de G4 suena con muestras masculinas y desde G4 con femeninas. En A la voz aguda (E5–A5)
  es femenina y el par grave masculino, como en el boceto; en B todo es masculino a propósito (boca cerrada,
  calor). Vigilar el salto de nivel entre voces en el c. 5 (A5).
- **Celesta** (1 capa): su brillo está en 2–5 kHz. Por eso nunca va sola por encima de la melodía con más de
  vel. 56, calla en B y en el clímax, y en A va por debajo del 72 del boceto.
- **Brillos contados por bucle** (energía por encima de 2,5 kHz): Mark Trees **2** (c. 1 y 23), plato **1**
  (pico en el c. 19), glockenspiel **6**.
- **Arpa** (1 capa, one shot; las notas por encima de 89 duran < 0,7 s): la dinámica solo cambia el volumen, por
  eso nunca pasa de *mp*.
- Ningún `KS`. Ningún cambio de patch en mitad de una nota tenida.

## 7. Dinámica

| Nivel | pp | p | mp | mf | f |
|---|---|---|---|---|---|
| Velocidad (VSCO, VCSL, celesta, arpa) | 25–40 | 40–55 | 55–70 | 70–85 | 85–92 |
| CC1 (flauta alto, violín, coro, armónicos) | 40–55 | 55–70 | 70–85 | 85–95 | 95–100 |

Prohibido: velocidad > 92, CC1 > 100 (es un menú: el *f* es contenido). CC11 da la forma de las notas largas de
VSCO (clarinete, trompa, cuerdas, redoble).

| Sección | Nivel | Gestos |
|---|---|---|
| Intro 1–2 | pp → p | La onda del arpa crece hacia el c. 2; coro y armónicos abren su CC1. |
| A 3–6 | p (acompañamiento) / mp (flauta) | Un solo arco de CC1 en la flauta con cumbre en el tiempo 1 del c. 5. |
| A' 7–10 | mp → mf (c. 9) → mp | Arco del violín con cumbre en el B♭5 del c. 9; el coro entra en el c. 9 y se va en el 10. |
| B 11–14 | p / pp | Plano. Único gesto: el swell del clarinete en el D5 del c. 13. |
| Puente 15–18 | p → mf | Crescendo continuo de 4 compases (CC1, CC11 y velocidades); redoble y plato desde el c. 17–18. |
| Retorno 19–24 | mf → **f (c. 21)** → mp (c. 23) → p (c. 24) | Pico en el tiempo 1 del c. 21; desde ahí, diminuendo por compases. El c. 23 es luz, no volumen. |
| Codetta 25–28 | p → pp | Todo lo tenido se apaga antes del final del c. 28. |

## 8. Criterios de aceptación

**Partitura (se comprueba en `test_compose.py` leyendo `build/menu-brasas.mid`):**

1. 28 compases de 4/4 a ♩ = 84 sin cambios de tempo; ninguna nota empieza antes del tick 0 ni después de
   80,000 s, y todo lo que suena en el c. 28 termina antes de 80,000 s.
2. Todas las notas dentro del rango del catálogo de su patch y de los registros de §6. Techos y suelos:
   violín solista 69–82, flauta alto 57–82, celesta 69–94, clarinete 60–74, trompa 52–67, coro 52–81 (y ≤ 69 en
   B y en el retorno), armónicos 79–91, glockenspiel 81–90, copas 77–86, arpa 38–84, chelos 38–55, contrabajos
   27–43, violas 52–62.
3. El leitmotiv aparece con las alturas y figuras exactas de §5 en los c. 2, 3–6 (flauta alto y celesta),
   7–10 (violín y celesta), 11–14 (clarinete), 15, 16, 17–18, 19–22 (violín y flauta), 23–25, 25–26 (celesta) y
   27–28 (flauta alto).
4. **Ninguna frase idéntica:** ningún par de ventanas de 4 compases de la pista de melodía (la pista con la nota
   más aguda de §5 en cada compás) tiene las mismas alturas, figuras y cifrado del §4.
5. Ninguna figura más corta que la corchea, salvo el glissando del c. 18 y los acordes arpegiados del arpa.
6. Capas simultáneas (pistas con notas sonando) por sección ≤ 7 / 8 / 9 / 6 / 12 / 12 / 8
   (intro / A / A' / B / puente / retorno / codetta).
7. **Sin choques de registro:** mientras suena una melodía de §5, ninguna otra pista mantiene notas de negra o más
   en la misma octava con velocidad (o CC1) ≥ la de la melodía. Unísonos declarados: celesta + flauta alto a la
   octava (3–6, 16), violín + flauta al unísono o a la octava (17–23), copas + violín (c. 10), celesta 8va del violín (c. 24). El coro en
   A, por CC1, al menos 15 por debajo de la flauta.
8. Ninguna velocidad > 92 ni CC1 > 100. El c. 21 tiene el CC1 más alto del violín, la flauta y el coro, y la
   velocidad más alta de trompa, chelos y timbal.
9. Cada pista de Sonatina por CC1 tiene CC1 en el tick 0 y como mucho un punto por corchea; **duraciones
   máximas**: flauta alto ≤ 2,8 s y violín solista ≤ 5,0 s por nota (sin bucle); coro y armónicos con bucle,
   sin límite técnico (≤ 2 y ≤ 4 compases por diseño). Celesta y arpa sin curva de CC1 (o fija a 100).
10. Brillos: exactamente 2 Mark Trees (c. 1 y 23), 1 plato (pico en el tiempo 1 del c. 19 ± 50 ms), 6 golpes de
    glockenspiel, 2 golpes de timbal (c. 19 y 21) y 1 redoble (c. 17–18).
11. **Armonía:** la nota más grave que suena en el primer y el tercer tiempo de cada compás tiene la clase de altura del
    bajo de §4; la nota grave del arpa sigue siempre ese bajo (p. ej. B2 en el c. 8, tiempo 3; E♭ en el c. 17; B♭ en el c. 21; A2 en el c. 28).
12. Respiraciones: ninguna nota de la melodía suena en el tiempo 4 de los c. 6 y 10.

**Mezcla (se comprueba con el informe de `mix.py`):**

13. Sonoridad integrada **−17 LUFS ± 1**; pico real **≤ −1 dBTP**.
14. `loop_samples` = **3 528 000**; `seam_jump` < 0,02 y sin clic ni hueco al pasar del c. 28 al c. 1.
15. Contrastes (`sections_lufs`):
    - retorno c. 19–22 frente a B c. 11–14: entre **+4 y +8 LU** (menos de 4, B no respira; más de 8, el clímax
      salta del menú);
    - puente c. 17–18 frente a c. 15–16: al menos **+2 LU**;
    - «luz» c. 23–24: entre 2 y 5 LU por debajo de los c. 19–22;
    - intro c. 1–2 y codetta c. 25–28: entre −27 y −22 LUFS (la puerta no desaparece bajo los sonidos de la
      interfaz) y al menos 4 LU por debajo de los c. 19–22.
16. Bandas (`bands_db`, relativas al total): `presencia 2.5-6k` ≤ −18 dB, `aire 6-16k` ≤ −28 dB,
    `sub <60` ≤ −22 dB.
17. Ninguna parte pasa de −6 dB de pico antes del bus. En `parts`: armónicos y copas al menos 8 LU por debajo del
    violín solista; celesta al menos 2 LU por debajo de la flauta alto.
18. Sala: `wet_dry_lu` entre −6 y −3,5 (más mojada que las pistas de combate: es la pista de la magia, pero la
    melodía no puede emborronarse). Sala de 2,6–3,0 s como el boceto.
19. Escucha: la flauta alto de los c. 3–6 se entiende y se puede tararear; la celesta de A' suena a eco, no a
    segunda melodía; en B se nota el cambio a mayor y la calidez (no hay nada por encima de C6 salvo la nota de
    arpa del tiempo 3); el napolitano del c. 17 suena a hechizo, no a error; el c. 23 suena a puerta que se abre;
    la vuelta del c. 28 al c. 1 suena a cadencia.

### `MixSpec`

```python
MixSpec(
    midi='scripts/musica/menu-brasas/build/menu-brasas.mid',
    out='scripts/musica/menu-brasas/build/menu-brasas.mp3',
    bpm=84, beats_per_bar=4, bars=28,          # loop_samples = 28 × 4 × 60/84 × 44 100 = 3 528 000
    target_lufs=-17, ceiling_dbtp=-1.0,
    reverb={'seconds': 2.8, 'predelay': 0.03, 'damping': 0.5},
    sections={'intro 1-2': (1, 2), 'A 3-6': (3, 6), "A' 7-10": (7, 10), 'B 11-14': (11, 14),
              'puente 15-16': (15, 16), 'puente 17-18': (17, 18), 'retorno 19-22': (19, 22),
              'luz 23-24': (23, 24), 'codetta 25-28': (25, 28), 'c21': (21, 21)},
    ...)
```

Buses de partida (los del boceto, `arreglos.py`, `BUS`): celesta, glockenspiel y copas en un bus de brillos con
paso alto ≈ 300 Hz y estantería −3 dB desde 7 kHz; armónicos con paso alto 400 Hz y estantería −4 dB desde 6 kHz;
coro con picos −2 dB en 300 Hz y −3 dB en 3 kHz; melodías (flauta alto, violín, clarinete) con −2 dB en 3,2 kHz.
El ingeniero de mezcla los ajusta para cumplir 15–18.

**Integración (cuando el usuario lo apruebe):** copiar `build/menu-brasas.mp3` a `src/audio/menu.mp3` y cambiar
`loopSamples` de `'menu'` en `src/fx/music-tracks.ts` de 3 087 000 a **3 528 000** (y su comentario: 4/4, 84 BPM,
28 compases, leitmotiv «Brasas»).
