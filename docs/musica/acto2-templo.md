# Brief: Acto II, escenario 1, «El Templo Oscuro» — «Vísperas del pozo»

Una canción en **dos versiones sincronizadas**: **exploración** (mapa y eventos) y **combate** (combates normales y
élites). Ids de juego: `cap2-e1` y `cap2-e1-combate`. Pista nueva en `scripts/musica/acto2-templo/` con las
convenciones del [README del estudio](../../scripts/musica/estudio/README.md):

- `test_compose.py` (criterios 1–12 de §8) se escribe **antes** que `compose.py`.
- `compose.py` genera **los dos MIDIs a la vez** (`build/acto2-templo-explora.mid`, `build/acto2-templo-combate.mid`) desde
  una única descripción de forma, armonía y melodía.
- `mix.py` renderiza los dos (`.mp3` y `.report.json`), cada uno con su `MixSpec`, y la prueba de cruce
  `build/acto2-templo-cruce.mp3` (criterio 20).

Necesita montado el disco **Base**. Fuentes: [direccion.md](direccion.md) (Templo a partir de `sombra-sombrio`, **mucho más
protagonismo de las voces alternando agudas y graves**, **cultistas oscuros que invocan demonios y clavan puñales**; combate
**intenso de verdad**). Referencia de color aprobada: `temple()` en `scripts/musica/leitmotivs/acto2_bocetos.py` y
`build/acto2-templo-explora.mp3` / `acto2-templo-combate.mp3`. Del boceto se conservan: el motivo repartido compás a compás
entre voces graves (coro grande) y agudas (coro mixto), pedal de órgano y contrafagot, tambor de marco, crótalos, campana y
golpe metálico; en combate, trombones que doblan a las voces graves «como un demonio que responde», la salmodia de
invocación, semicorcheas de chelos y contrabajos acentuadas 3+3+2, golpes de metales, bombo y toms, y las **puñaladas** de
violines. Formato de referencia: [acto1-ogros.md](acto1-ogros.md).

## 1. Función, emoción y repetición

- **Dónde suena:** el mapa y los eventos del Templo Oscuro (exploración) y todos sus combates normales y de élite: acólitos,
  inquisidores, cultistas que invocan (combate).
- **Emoción:** unas **vísperas** en un templo excavado sobre un pozo. Los cultistas cantan en dos coros que se responden
  (graves, agudas, graves, agudas), salmodian sobre una sola nota, el órgano y el contrafagot sostienen el suelo, y algo
  contesta desde abajo. Más oscuro y más ceremonial que la Cripta: aquí nadie tiene miedo, rezan a lo que da miedo.
  - Exploración: el oficio a media voz. Antífonas, salmodia recto tono, tambor de marco, darbuka, crótalos contados,
    campanillas, un corno inglés en el respiro.
  - Combate: **la invocación en marcha, intensa**. Las mismas voces a pleno pulmón, trombones que doblan a los graves,
    salmodia gritada en 3+3+2, semicorcheas continuas de chelos y contrabajos, golpes de trompas en *marcato*, bombo y toms,
    golpes de gong y **puñaladas** de violines (díadas de semitono en semicorcheas) que nunca caen en la octava del coro
    que canta. Intensa, pero con hueco para los efectos.
- **Repetición:** 15–40 minutos por escenario, decenas de cambios de versión. El bucle aguanta 20 vueltas: un clímax (c. 23),
  un respiro (B, c. 11–16) y la costura sin señal.
- **Transformación del leitmotiv** (§5): **antífona** (el motivo partido compás a compás entre los dos coros); **salmodia**
  (el coro grave recita sobre la dominante en 3+3+2 mientras el agudo canta el motivo sobre un bajo en lamento);
  **aumentación ×2 sin resolver** (B: la invocación, que acaba en la dominante); **fragmento por semitonos** alternando
  registros (puente); **los dos coros en octavas** con la armonía nueva (retorno) y una **extensión** con la cola del motivo.

## 2. Tempo, métrica, tonalidad, duración

| Parámetro | Valor (idéntico en las dos versiones) |
|---|---|
| Tempo | ♩ = 80, fijo (el boceto iba a 76, que no da `loop_samples` entero en ningún número razonable de compases; 80 empuja un poco más el combate) |
| Métrica | 4/4 |
| Tonalidad | **si♭ menor** (eólico con sensible), elegida por las voces: el motivo cabe entero en voces masculinas a la altura de B♭3 (57–66) y en femeninas a la de B♭4 (69–78). Sexta alemana (G♭7), napolitano (C♭), lamento B♭–A–A♭–G♭–F, VI (G♭maj7) en el clímax |
| Compases | **28** |
| Duración del bucle | 28 × 4 × 60/80 = **84,000 s** → `loop_samples` = **3 704 400** a 44,1 kHz (cada compás son 132 300 muestras exactas) |
| `MixSpec` (ambas) | `bpm=80`, `beats_per_bar=4`, `bars=28` |

Compás = 3,000 s; negra = 0,750 s; corchea = 0,375 s; semicorchea = 0,188 s. Inicio del compás *n* = (*n* − 1) × 3 s.

**Figuras:** voces (las dos versiones), corchea mínima. Exploración: corchea mínima en todo. Combate: semicorcheas en el
*ostinato* (chelos y contrabajos en *spiccato*), la salmodia gritada (`Chant`), las puñaladas, el bombo, los toms y el redoble.
Nada de semicorcheas en trombones, trompas ni coros melódicos.

**Rejilla de semicorcheas** (combate): 0–15 por compás. **Acentos 3+3+2 (dos veces): 0, 3, 6, 8, 11, 14.**

### Reglas de sincronía (exploración ↔ combate)

El juego cruza las dos versiones con un fundido lineal de 1,6 s desde el mismo punto del bucle (`src/fx/audio.ts`,
`cruzarVersion`):

1. Mismo tempo, compases, forma y armonía compás a compás (§3 y §4 son comunes).
2. **Misma melodía**: las líneas de referencia de §5 tienen las mismas alturas y ataques en las dos versiones. Las cantan
   en las dos las mismas pistas (`Choir Low` = Large Chorus, `Choir High` = Mixed Chorus) con la **misma humanización**
   (misma semilla por nombre de pista); solo cambia su CC1. En el cruce suman en fase.
3. **Capas comunes** (idénticas nota a nota, mismas velocidades y CC):
   - `Organ Pedal` (Pedal - Bourdon 16′): la fundamental del bajo de §4.
   - `Contrabassoon` (Sonatina, con bucle): el bajo de §4 una octava abajo, con la misma curva de CC1; **calla en el retorno
     (c. 21–26)** en las dos.
   - `Frame Drum` (VCSL): el patrón de §6.
4. Todo lo demás puede diferir.

## 3. Forma compás a compás e intensidad

| Sección | Compases | Tiempo (s) | Contenido | Intensidad E | Intensidad C |
|---|---|---|---|---|---|
| Intro «El umbral» | 1–2 | 0–6 | Campana, gong, pedal de si♭, contrafagot, tambor de marco; **la llamada** de las voces graves (B♭ → A) | 2 → 3 | 5 → 6 |
| A «Antífona» | 3–6 | 6–18 | **El motivo partido entre los dos coros**, compás a compás: graves, agudas, graves, agudas | 4 | 7 |
| A' «Salmodia» | 7–10 | 18–30 | Las agudas cantan el motivo entero; las graves **recitan sobre Fa** en 3+3+2; bajo en lamento B♭–A–A♭–G♭–F | 5 | 8 |
| B «La invocación» | 11–16 | 30–48 | **Respiro.** Las graves cantan el motivo en aumentación ×2, sin llegar a la tónica; halo de agudas; corno inglés (E) / trompas (C) en contracanto | 3 (mínimo) | 6 (mínimo) |
| Puente «El círculo» | 17–20 | 48–60 | La **cabeza** sube por semitonos (si♭, do♭, do) alternando registros; F7(♭9); crescendo | 4 → 6 | 7 → 9 |
| Retorno «Invocación consumada» | 21–26 | 60–78 | **Los dos coros en octavas**, armonía nueva; **clímax en el c. 23** (66 s) sobre G♭maj7; extensión con la cola (25–26) | 7 → **8** (c. 23) → 6 | 9 → **10** (c. 23) → 8 |
| Codetta «Amén» | 27–28 | 78–84 | La tónica en las agudas; la llamada de los graves vuelve (= c. 2) y encadena con el c. 1 | 4 → 3 | 6 → 5 |

Respiros: el t4 del c. 6, toda B, el c. 27 tras la blanca con puntillo. En combate B baja de densidad (salmodia solo en los
compases impares y en su primera mitad, chelos sin acentos, sin contrabajos, sin puñaladas ni toms) pero **no se para**.

## 4. Armonía por sección (común a las dos versiones)

Cifrado por compás; «(1–2) / (3–4)» = cambio en el t3. Entre corchetes, el bajo real (contrafagot) en MIDI; el `Organ Pedal`
toca la misma clase de altura en 37–48 (D♭2 = 37 … C3 = 48).

**Intro (1–2)**

| 1 | 2 |
|---|---|
| B♭m | G♭maj7/B♭ (1–2) / F7(♭9) (3–4) |

[B♭1 · B♭1 F1] (34 · 34 29)

**A (3–6)**: la armonización de «Sombra» en si♭ menor. **G♭7** es la sexta alemana (Sol♭–Si♭–Re♭–Mi): el Mi de la melodía es su
sexta aumentada. **C♭** (♭II) en el c. 5.

| 3 | 4 | 5 | 6 |
|---|---|---|---|
| B♭m (1–2) / **G♭7** (Al+6) (3–4) | F7(♭13) (1–2) / F7 (3–4) | B♭m (1–2) / **C♭** (3) / F7 (4) | B♭m (1–2) / B♭m/A♭ (3–4) |

[B♭1 G♭1 · F1 · B♭1 B1 F1 · B♭1 A♭1] (34 30 · 29 · 34 35 29 · 34 32)

**A' (7–10)**: el mismo motivo sobre un **bajo en lamento** B♭ – A – A♭ – G♭ – F; C7/B♭ (V/V en tercera inversión) en el c. 7,
cadencial 6/4 y semicadencia en el c. 10.

| 7 | 8 | 9 | 10 |
|---|---|---|---|
| B♭m (1–2) / C7/B♭ (3–4) | F7(♭13)/A (1–2) / F7/A (3–4) | B♭m/A♭ (1–2) / G♭maj7 (3–4) | B♭m/F (1–2) / F7sus4 (3) / F7(♭9) (4) |

[B♭1 · A1 · A♭1 G♭1 · F1] (34 · 33 · 32 30 · 29)

**B (11–16)**: un acorde por compás (ritmo armónico lento: respiro). V/V con la tercera en el bajo, VI con séptima mayor, V con
♭9 y la tercera en el bajo; el último compás vuelve a la dominante sin resolver.

| 11 | 12 | 13 | 14 | 15 | 16 |
|---|---|---|---|---|---|
| B♭m(add9) | C7/E | D♭maj7 | F7(♭9)/A | B♭m (1–2) / B♭m/A♭ (3–4) | G♭maj7 (1–2) / F7sus4 (3) / F7 (4) |

[B♭1 · E1 · D♭2 · A1 · B♭1 A♭1 · G♭1 F1] (34 · 28 · 37 · 33 · 34 32 · 30 29)

**Puente (17–20)**: tríadas menores paralelas que suben por semitonos (cada una con su tritono en la melodía) y la dominante.

| 17 | 18 | 19 | 20 |
|---|---|---|---|
| B♭m | C♭m (= Bm) | Cm | F7(♭9) |

[B♭1 · B1 · C2 · F1] (34 · 35 · 36 · 29)

**Retorno (21–26)**: rearmonizado. **E°7** (séptima disminuida de la sensible de la dominante) en el c. 21; **clímax sobre
G♭maj7** en el c. 23 (Si♭–Re♭–Fa de la melodía son su tercera, quinta y séptima mayor), con E♭m7 y F7; la extensión cierra
en la dominante.

| 21 | 22 | 23 | 24 | 25 | 26 |
|---|---|---|---|---|---|
| B♭m (1–2) / **E°7** (3–4) | F7(♭13) (1–2) / F7 (3–4) | **G♭maj7** (clímax) (1–2) / E♭m7 (3) / F7 (4) | B♭m (1–2) / B♭m/A♭ (3–4) | E♭m/G♭ (1–2) / B♭m/F (3–4) | F7(♭13) (1–2) / F7(♭9) (3–4) |

[B♭1 E1 · F1 · G♭1 E♭2 F1 · B♭1 A♭1 · G♭1 F1 · F1] (en el retorno el bajo lo llevan `Organ Pedal` y, en combate, el *ostinato*)

**Codetta (27–28)**

| 27 | 28 |
|---|---|
| B♭m (1–2) / G♭maj7/B♭ (3–4) | F7sus4 (1–2) / F7(♭9) (3–4) |

[B♭1 · F1] (34 · 29)

## 5. Leitmotiv

Referencia «Sombra» (re), ritmo de `demos.py`: `| D E F G# A | F E C# | D F A B♭ A | D |`, `| e e q q. e | q q h | e e q q q | w |`.

**Versión de esta pista: «la antífona»**, en si♭ menor. Las mismas alturas en dos octavas: **graves** (voces masculinas,
`Choir Low`) desde B♭3 y **agudas** (voces femeninas, `Choir High`) desde B♭4. La redonda final dura h. (respiración).

```
graves: | B♭3 C4 D♭4 E4  F4 | D♭4 C4 A3 | B♭3 D♭4 F4 G♭4 F4 | B♭3 |   58 60 61 64 65 · 61 60 57 · 58 61 65 66 65 · 58
agudas: | B♭4 C5 D♭5 E5  F5 | D♭5 C5 A4 | B♭4 D♭5 F5 G♭5 F5 | B♭4 |   70 72 73 76 77 · 73 72 69 · 70 73 77 78 77 · 70
        | e   e  q   q.  e  | q   q  h  | e   e   q  q   q  | h.   |
```

Las alturas y figuras de esta tabla son la **melodía de referencia** (idéntica en las dos versiones).

| Compases | Pista | Notas (MIDI) y ritmo | Transformación |
|---|---|---|---|
| 2 | `Choir Low` | B♭3 (h) A3 (h) (58 57) | **La llamada**: la tónica y la sensible del final del motivo, al revés (1 → 7): una invocación que pide respuesta. |
| **3** | **`Choir Low`** | 58 60 61 64 65 | **Antífona**: el primer compás del motivo, graves. |
| **4** | **`Choir High`** | 73 72 69 | Segundo compás, agudas. |
| **5** | **`Choir Low`** | 58 61 65 66 65 | Tercer compás, graves. |
| **6** | **`Choir High`** | 70 (h.) | La tónica, agudas. |
| **7–10** | **`Choir High`** | El motivo entero, agudas (69–78) | **Salmodia**: el coro agudo canta el motivo entero sobre el lamento del bajo… |
| 7–10 | `Choir Low` | F3 (53) recto tono en **3+3+2** (q. q. q) en cada compás; en el c. 7 la tercera nota es **E3** (52) | … y el grave recita sobre la dominante. El Fa sobre C7 (t3 del c. 7) es un retardo que resuelve en Mi. |
| **11–16** | **`Choir Low`** | B♭3 (q) C4 (q) D♭4 (h) · E4 (h.) F4 (q) · D♭4 (h) C4 (h) · A3 (w) · B♭3 (q) D♭4 (q) F4 (h) · G♭4 (h) F4 (h) (58 60 61 · 64 65 · 61 60 · 57 · 58 61 65 · 66 65) | **Aumentación ×2** de los tres primeros compases: la invocación **no llega a la tónica** (acaba en F, la dominante). |
| 11–16 | `Choir High` | Halo: F5 · E5 · F5 · E♭5 · F5 · E♭5 (77 76 77 75 77 75), una redonda por compás | Nota común del acorde, por encima de todo. |
| 17–20 | `Choir Low` (17, 19) / `Choir High` (18, 20) | c. 17: B♭3 C4 D♭4 E4 (q q q q) (58 60 61 64) · c. 18: B4 C#5 D5 F5 (71 73 74 77) · c. 19: C4 D4 E♭4 F#4 (60 62 63 66) · c. 20: G♭5 (h) F5 (h) (78 77), con `Choir Low` A3 (h) E♭4 (h) (57 63) | **Fragmento** (cabeza 1 2 ♭3 #4) **por semitonos** (si♭, do♭, do), alternando registros cada compás; en el c. 20, el suspiro ♭6 → 5 arriba y las notas guía de F7 abajo. |
| **21–24** | **`Choir Low` + `Choir High` en octavas** | El motivo entero en las dos octavas (57–66 y 69–78) | **Los dos coros juntos**, rearmonizado: la invocación consumada. **G♭5 (78) del c. 23 es la cumbre** (también aparece en los c. 9, 20 y 25). |
| 25–26 | `Choir Low` + `Choir High` en octavas | G♭ (h) F (h) · D♭ (q) C (q) A (h) (66/78 65/77 · 61/73 60/72 57/69) | **Extensión**: la cola (♭6 → 5 y el segundo compás del motivo) acaba en la sensible, sin resolver. |
| 27 | `Choir High` | B♭4 (h.) (70) | La resolución que la extensión negó. |
| 28 | `Choir Low` | B♭3 (h) A3 (h) (58 57) | = c. 2: la llamada encadena con el c. 1. |

Contracanto de referencia en B (mismas alturas y ataques en las dos; E: `Cor Anglais`, C: `Horns`): c. 12: G4 (h) B♭4 (h) ·
c. 13: A♭4 (h) F4 (h) · c. 14: E♭4 (h) G♭4 (h) · c. 15: F4 (h) A♭4 (h) · c. 16: B♭4 (h) A4 (h) (67 70 · 68 65 · 63 66 · 65 68 ·
70 69). Calla en el c. 11.

## 6. Orquestación por sección

### Patches

`…/` = `sso/Sonatina Symphonic Orchestra/`.

| Pista | Ruta `.sfz` | Dinámica | Duración máx. por nota |
|---|---|---|---|
| `Choir Low` | `…/Chorus - Performance/Large Chorus.sfz` (voces graves; 3 samples por nota) | **CC1** | sin límite (con bucle) |
| `Choir High` | `…/Chorus - Performance/Mixed Chorus.sfz` (voces agudas) | **CC1** | sin límite |
| `Organ Pedal` (**común**) | `…/Organ/Pedal - Bourdon 16ft.sfz` | velocidad | sin límite (con bucle) |
| `Contrabassoon` (**común**) | `…/Woodwinds - Performance/Contrabassoon Solo Sustain (looped).sfz` | **CC1** | sin límite |
| `Frame Drum` (**común**) | `VCSL/Membranophones/Struck Membranophones/Frame Drum.sfz` | velocidad | — |
| `Organ` / `Organ Open` (E) | `…/Organ/Great - Stopped Diapason 8ft.sfz` / `…/Organ/Great - Open Diapason 8ft.sfz` | velocidad | sin límite |
| `Darbuka` (E) | `VCSL/Membranophones/Struck Membranophones/Darbuka.sfz`, **solo la nota 60** (*doum*) | velocidad | — |
| `Finger Cymbals` | `VCSL/Idiophones/Struck Idiophones/Finger Cymbals.sfz` (los crótalos del boceto) | velocidad | — |
| `Hand Bell` (E) | `VCSL/Idiophones/Struck Idiophones/Hand Bells, Nepalese.sfz`, **solo la nota 62** | velocidad | — |
| `Bell` (E) | `VCSL/Idiophones/Struck Idiophones/Tubular Bells 1.sfz` (B♭4 = 70) | velocidad | — |
| `Gong` (E) | `VCSL/Idiophones/Struck Idiophones/Gong 1.sfz`, nota 61 | velocidad | — |
| `Cor Anglais` (E) | `…/Woodwinds - Performance/Cor Anglais Solo Sustain.sfz` | **CC1** | **≤ 2,8 s** (sin bucle; sample más corto 3,03 s) |
| `Timp Roll` | `VSCO-2-CE/TimpaniRolls.sfz` | velocidad + CC11 | ≤ 16 s |
| `Trombones` (C) | `…/Brass - Performance/Trombones Sustain (looped).sfz` | **CC1** | sin límite |
| `Horns` (C) | `…/Brass - Performance/Horns Sustain.sfz` | **CC1** | **≤ 2,8 s** |
| `Brass Stabs` (C) | `…/Brass - Performance/Horns Marcato.sfz` | **CC1** | golpes ≤ 0,3 s |
| `Chant` (C) | `…/Chorus - Performance/Large Chorus.sfz` (otra pista, la salmodia) | **CC1** | — |
| `Ostinato` / `Ostinato Low` (C) | `VSCO-2-CE/CelloEnsSpic.sfz` / `VSCO-2-CE/ContrabassSpic.sfz` | velocidad | — |
| `Daggers` (C) | `VSCO-2-CE/ViolinEnsSpic.sfz` | velocidad | 0,1 s |
| `Bass Drum` (C) | `VCSL/Membranophones/Struck Membranophones/Bass Drum 2.sfz` (62 = golpe, 63 = redoble) | velocidad | — |
| `Tom` (C) | `VCSL/Membranophones/Struck Membranophones/Tom 2.sfz` (62 = golpe, 64 = golpe pequeño) | velocidad | — |
| `Metal` (C) | `VCSL/Idiophones/Struck Idiophones/Gong 2.sfz` (63 = golpe ligero, −22 dB en 2,5–6 kHz; 61 = golpe pleno) | velocidad | — |
| `Broken Bells` (C) | `VCSL/Idiophones/Struck Idiophones/Tubular Bells 1.sfz`, díada C4 + D♭4 (60 61) | velocidad | — |
| `Timpani` (C) | `VSCO-2-CE/Timpani.sfz` | velocidad | — |

(E) = solo exploración; (C) = solo combate. `Finger Cymbals` y `Timp Roll` existen en las dos con distinto recuento/dinámica.

**Sonatina por CC1** (`Choir Low`, `Choir High`, `Contrabassoon`, `Cor Anglais`, `Trombones`, `Horns`, `Brass Stabs`, `Chant`):
CC1 en el tick 0 y la forma de cada frase; como mucho un punto cada corchea. Los registros de órgano, por velocidad, sin CC1.

**Patrón común de `Frame Drum`** (idéntico en las dos): 61 (grande, abierto) en t1, vel. 74, y 64 (pequeño, abierto) en «3 y»
(semicorchea 10), vel. 56, en todos los compases **salvo B** (c. 11–16), donde solo hay 62 (grande, apagado) en t1, vel. 60.
**No usar 60 ni 63** (los golpes con la mano: energía en 2,5–16 kHz).

**Combate, rejilla y patrones** (semicorcheas 0–15):

- `Ostinato`: 16 semicorcheas por compás sobre la fundamental del bajo en 46–58, quinta del acorde en las semicorcheas 6 y 14;
  acentos 0, 3, 6, 8, 11, 14 (vel. 94), resto vel. 68 (±6). `Ostinato Low`: la fundamental una octava abajo (28–46), mismas
  semicorcheas y acentos. Siguen los cambios de acorde.
- `Chant` (la salmodia gritada): sílabas en las semicorcheas **0, 3, 6, 8, 11, 14**, de 0,7 / 0,7 / 0,45 / 0,7 / 0,7 / 0,45
  tiempos, sobre la nota del bajo de §4 llevada a 43–54 (B♭2 46, A2 45, A♭2 44, G♭3 54, F3 53, E3 52, D♭3 49, C3 48, B2 47).
- `Brass Stabs`: fundamental + quinta del acorde en 41–55 (B♭2 + F3 = 46 53 en B♭m), en las corcheas 0, 3 y 6
  (semicorcheas 0, 6, 12), notas de 0,3 tiempos.
- `Bass Drum` 62: semicorcheas 0, 3, 6, 8, 12, 14 (vel. 100 en 0, 6 y 12; 80 en las demás).
- `Tom`: 62 en las semicorcheas 10, 11, 13, 14 y 64 en la 15 (vel. 84 → 94), en los compases pares.
- **`Daggers`** (puñaladas): díada de semitono, en las semicorcheas 2, 5, 9, 11, 13, notas de 0,1 s, vel. ≤ 88, **en el
  registro que no ocupa el coro que canta**: cuando cantan los graves (57–66) → F5 + F#5 (77 78); cuando cantan las agudas
  (69–78) → F4 + G♭4 (65 66); cuando cantan los dos o recitan los graves bajo las agudas → G4 + A♭4 (67 68), entre las dos
  octavas.

### Intro «El umbral» (1–2)

**Exploración (máximo 6 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **La llamada** | `Choir Low` | §5, c. 2 | CC1 55 → 62. |
| Pedal | `Organ Pedal` (**común**) | B♭2 (46) · B♭2 (h) F2 (h) (46 · 46 41) | vel. 70. |
| Bajo | `Contrabassoon` (**común**) | B♭1 (34) · B♭1 (h) F1 (h) (34 · 34 29) | CC1 55. |
| Tambor | `Frame Drum` (**común**) | Patrón de §6 | — |
| Campana | `Bell` | B♭4 (70), t1 del c. 1 | vel. 56. |
| Gong | `Gong` | 61, t1 del c. 1 | vel. 42. |

**Combate (máximo 11 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **La llamada** | `Choir Low` + `Trombones` (unísono) | §5, c. 2 | Coro CC1 88 → 96; trombones CC1 76 → 86. |
| *Ostinato* | `Ostinato` | Desde el c. 1 | *p* → *mf* (vel. 60 → 80 en los acentos). |
| *Ostinato* grave | `Ostinato Low` | Desde el c. 2 | *mf*. |
| Salmodia | `Chant` | B♭2 (46) en el c. 1; B♭2 / F3 (53) en el c. 2 | CC1 80 → 92. |
| Bombo | `Bass Drum` | c. 1: semicorcheas 0 y 8; c. 2: patrón completo | vel. 84 → 100. |
| Relleno | `Tom` | c. 2, patrón de §6 | — |
| Golpe | `Metal` 61 + `Broken Bells` | t1 del c. 1 | vel. 70 / 72. |
| Pedal, bajo, tambor | `Organ Pedal`, `Contrabassoon`, `Frame Drum` (**comunes**) | Como en exploración | — |

### A «Antífona» (3–6)

**Exploración (máximo 8 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía** | `Choir Low` (c. 3, 5) / `Choir High` (c. 4, 6) | §5 | Cada compás un arco de CC1: graves 62 → 78 → 64; agudas 60 → 76 → 62. Legato (solape 40 ms). |
| Órgano | `Organ` | Dos notas guía en 45–56: c. 3: D♭3 F3 (49 53) / D♭3 E3 (49 52) · c. 4: A2 E♭3 (45 51) · c. 5: D♭3 F3 / E♭3 G♭3 (51 54) (t3) / A2 E♭3 (t4) · c. 6: D♭3 F3 (49 53) | vel. 46–52. Siempre por debajo de las voces graves. |
| Pedal, bajo, tambor | `Organ Pedal`, `Contrabassoon`, `Frame Drum` (**comunes**) | Bajo de §4 | Contrafagot CC1 58. |
| *Doum* | `Darbuka` | 60 en «2 y» (semicorchea 6) | vel. 50 (±4). |
| Crótalos | `Finger Cymbals` | t4 de los c. 3 y 5 | vel. 40. |

**Combate (máximo 14 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía** | `Choir Low` (3, 5) / `Choir High` (4, 6) | §5 | Graves CC1 92 → 108; agudas CC1 90 → 104 (techo de las agudas: 106). |
| Demonio que responde | `Trombones` | Unísono con `Choir Low` en los c. 3 y 5 | CC1 76 → 96. |
| Salmodia | `Chant` | §6 | CC1 86 → 104. |
| *Ostinato* | `Ostinato` + `Ostinato Low` | §6 | *f*. |
| Golpes | `Brass Stabs` | §6 | CC1 92 → 106. |
| Bombo y toms | `Bass Drum`, `Tom` | §6 | — |
| Puñaladas | `Daggers` | c. 3, 5: 77 78 · c. 4, 6: 65 66 | vel. 80–88. |
| Metal | `Metal` 63 | t1 de los c. 3 y 5 | vel. 80. |
| Pedal, bajo, tambor | **comunes** | — | — |
| Crótalos | `Finger Cymbals` | t4 del c. 3 | vel. ≤ 50. |

### A' «Salmodia» (7–10)

**Exploración (máximo 8 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía** | `Choir High` | §5 (69–78) | CC1 64 → **84 (t3 del c. 9)** → 66. |
| Recitado | `Choir Low` | F3 en 3+3+2 (§5) | CC1 52 → 60, **al menos 15 por debajo** de las agudas. Sílabas separadas (cada nota suelta 60 ms antes de la siguiente). |
| Pedal, bajo, tambor | **comunes** | Lamento: pedal B♭2 A2 A♭2 G♭2 F2 (46 45 44 42 41); contrafagot B♭1 A1 A♭1 G♭1 F1 | Contrafagot CC1 58 → 66. |
| *Doum* | `Darbuka` | Como en A | — |
| Crótalos | `Finger Cymbals` | t4 de los c. 7 y 9 | vel. 40. |
| Campanilla | `Hand Bell` | 62, t1 del c. 10 | vel. 48. |
| Gong | `Gong` | 61, t3 del c. 10 | vel. 40. |

**Combate (máximo 14 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía** | `Choir High` | §5 | CC1 94 → **106 (c. 9)** → 96. |
| Recitado | `Choir Low` + `Trombones` (unísono) | F3 en 3+3+2 | Coro CC1 88 → 100; trombones CC1 80 → 94. |
| Salmodia | `Chant` | Sobre el bajo en lamento | CC1 90 → 104. |
| *Ostinato* | `Ostinato` + `Ostinato Low` | Sobre el lamento | *f*. |
| Golpes | `Brass Stabs` | §6 | CC1 96 → 106. |
| Bombo y toms | `Bass Drum`, `Tom` | §6 | — |
| Puñaladas | `Daggers` | 67 68 (entre el recitado y las agudas) | vel. 80–88. |
| Metal | `Metal` 63 | t1 de los c. 7 y 9 | vel. 80. |
| Crótalos | `Finger Cymbals` | t4 del c. 7 | vel. ≤ 50. |
| Pedal, bajo, tambor | **comunes** | — | — |

### B «La invocación» (11–16): respiro

**Exploración (máximo 7 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía** | `Choir Low` | §5 (57–66) | CC1 58 → **72 (c. 13)** → 60. |
| Halo | `Choir High` | §5 (75–77) | CC1 42 → 52; siempre ≥ 15 por debajo de los graves. |
| Contracanto | `Cor Anglais` | §5 (63–70) | *p*: CC1 55 → 64, **al menos 10 por debajo** de los graves (comparte octava con ellos en los c. 14–15). |
| Pedal, bajo | `Organ Pedal`, `Contrabassoon` (**comunes**) | Bajo de §4 | Contrafagot CC1 50. |
| Tambor | `Frame Drum` (**común**) | 62 en t1 (§6) | — |
| Campanilla | `Hand Bell` | 62, t1 de los c. 11 y 15 | vel. 46. |

**Combate (máximo 11 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía** | `Choir Low` + `Trombones` (unísono) | §5 | Coro CC1 84 → 98 (c. 13) → 86; trombones CC1 70 → 86. |
| Halo | `Choir High` | §5 | CC1 60 → 70. |
| Contracanto | `Horns` | §5 (63–70) | CC1 70 → 84; todas las notas son blancas (1,5 s). |
| Salmodia | `Chant` | Solo en los c. 11, 13 y 15, semicorcheas 0, 3 y 6 | CC1 80 → 88. |
| *Ostinato* | `Ostinato` | §6 **sin acentos**, *mp* (vel. 62) | Sin `Ostinato Low`. |
| Golpes | `Brass Stabs` | Un solo golpe en el t1 de los c. 11, 13 y 15 | CC1 90. |
| Bombo | `Bass Drum` | Semicorcheas 0 y 8 | vel. 78. |
| Redoble | `Timp Roll` | F2 (41), c. 16 | *pp* → *mf* (CC11 30 % → 90 %); corta en el t1 del c. 17. |
| Pedal, bajo, tambor | **comunes** | — | — |

Sin `Daggers`, `Tom` ni `Metal` en B.

### Puente «El círculo» (17–20)

**Exploración (máximo 8 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía** | `Choir Low` (17, 19) / `Choir High` (18, 20) + `Choir Low` (notas guía del c. 20) | §5 | CC1 62 → 88 (crescendo continuo). |
| Órgano | `Organ` | Tríada sin fundamental en 45–56: c. 17: D♭3 F3 (49 53) · c. 18: D3 F#3 (50 54) · c. 19: E♭3 G3 (51 55) · c. 20: A2 E♭3 (45 51) | vel. 48 → 62. |
| Pedal, bajo, tambor | **comunes** | — | Contrafagot CC1 60 → 72. |
| *Doum* | `Darbuka` | c. 17–18 como en A; **c. 19–20 en corcheas** (semicorcheas 0, 2, 4 … 14), crescendo | vel. 46 → 66. |
| Redoble | `Timp Roll` | F2 (41), c. 20 | *pp* → *mp*. |

**Combate (máximo 14 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía** | `Choir Low` (17, 19) / `Choir High` (18, 20) + notas guía graves del c. 20 | §5 | CC1 96 → 110 (graves) / 106 (agudas). |
| Doblajes | `Trombones` (unísono con los graves, c. 17, 19 y 20) · `Horns` (agudas 8vb: 59–66 en el c. 18, 65–66 en el c. 20) | — | CC1 84 → 104. |
| Salmodia | `Chant` | §6 | CC1 94 → 110. |
| *Ostinato* | `Ostinato` + `Ostinato Low` | §6 | *f*. |
| Golpes | `Brass Stabs` | §6 | CC1 100 → 108. |
| Bombo y toms | `Bass Drum` (+ **63, redoble, en el c. 20**) · `Tom` (c. 18 patrón; **c. 20, semicorcheas 4–15** crescendo) | — | vel. 84 → 104. |
| Puñaladas | `Daggers` | c. 17, 19: 77 78 · c. 18: 65 66 · c. 20: 67 68 | vel. 82–88. |
| Metal | `Metal` 63 | t1 de los c. 17 y 19 | vel. 82. |
| Crótalos | `Finger Cymbals` | t4 del c. 17 | vel. ≤ 50. |
| Redoble | `Timp Roll` | F2 (41), c. 20 | *p* → *f*; corta en el t1 del c. 21. |
| Pedal, bajo, tambor | **comunes** | — | — |

### Retorno «Invocación consumada» (21–26)

**Exploración (máximo 10 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía** | `Choir Low` + `Choir High` en octavas | §5 | CC1 graves 78 → **92 (t1 del c. 23)** → 72; agudas 76 → **90** → 70. |
| Órgano | `Organ` + `Organ Open` | Tríadas sin fundamental en 45–56, siguiendo §4 (p. ej. c. 23: B♭2 D♭3 F3 / B♭2 E♭3 G♭3 / A2 E♭3) | vel. 56 → 68 (c. 23) → 52. |
| Pedal | `Organ Pedal` (**común**) | Bajo de §4 | vel. 74. |
| Tambor | `Frame Drum` (**común**) | §6 | — |
| *Doum* | `Darbuka` | Como en A | vel. 56. |
| Crótalos | `Finger Cymbals` | t4 de los c. 21 y 23 | vel. 44. |
| Campana | `Bell` | B♭4 (70), t1 del c. 21 | vel. 62. |
| Gong | `Gong` | 61, t1 del c. 21 | vel. 50. |

(El contrafagot, capa común, calla en 21–26.)

**Combate (máximo 14 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía** | `Choir Low` + `Choir High` en octavas | §5 | Graves CC1 100 → **112 (c. 23)** → 96; agudas 98 → **106** → 94. |
| Demonio | `Trombones` | Unísono con `Choir Low` | CC1 90 → 106 → 88. |
| Salmodia | `Chant` | §6 | CC1 96 → 110. |
| *Ostinato* | `Ostinato` + `Ostinato Low` | §6 | *f*. |
| Golpes | `Brass Stabs` | §6 | CC1 100 → 110 (c. 23). |
| Bombo | `Bass Drum` | §6 | c. 23, la velocidad más alta (104). |
| Toms | `Tom` | Solo en el c. 26 (patrón de §6) | — |
| Puñaladas | `Daggers` | 67 68 | vel. 84–88. |
| Timbal | `Timpani` | Fundamental en t1: B♭2 · F2 · G♭2 · B♭2 · G♭2 · F2 (46 41 42 46 42 41) | vel. 90; **c. 23 vel. 100**. |
| Metal | `Metal` 61 (pleno) en el t1 del **c. 23**; `Broken Bells` en el t1 de los c. 21, 23 y 25 | — | vel. 88 / 78–84. |
| Pedal, tambor | `Organ Pedal`, `Frame Drum` (**comunes**) | — | — |
| Crótalos | `Finger Cymbals` | t4 del c. 21 | vel. ≤ 50. |

### Codetta «Amén» (27–28)

**Exploración (máximo 6 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Resolución** | `Choir High` | §5, c. 27 | CC1 66 → 55. |
| **La llamada** | `Choir Low` | §5, c. 28 | CC1 55 → 62 (= c. 2). |
| Pedal, bajo, tambor | **comunes** | Bajo de §4 | Contrafagot CC1 55. |
| Campanilla | `Hand Bell` | 62, t1 del c. 27 | vel. 44. |
| Órgano | `Organ` | c. 27: D♭3 F3 (49 53) | vel. 44. |

**Combate (máximo 10 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Resolución** | `Choir High` | §5, c. 27 | CC1 94 → 86. |
| **La llamada** | `Choir Low` + `Trombones` | §5, c. 28 | Como en el c. 2. |
| Salmodia | `Chant` | c. 27: semicorcheas 0, 3, 6 · c. 28: patrón completo | CC1 82 → 90 (así entra en el c. 1). |
| *Ostinato* | `Ostinato` (+ `Ostinato Low` en el c. 28) | §6, *mf* | **La figura con la que arranca el c. 1.** |
| Bombo | `Bass Drum` | Semicorcheas 0 y 8 | vel. 84. |
| Relleno | `Tom` | c. 28, patrón de §6 | — |
| Pedal, bajo, tambor | **comunes** | — | — |

### Notas sobre los samples

- **Voces** (lo más importante de la pista): por debajo de G4 el coro suena con muestras masculinas y desde G4 con femeninas.
  En si♭ menor las graves (57–66) son **todas masculinas** y las agudas (69–78) **todas femeninas**: la alternancia que pidió
  el usuario se oye limpia, sin saltos de timbre dentro de una frase. `Large Chorus` (graves y salmodia) dispara 3 samples por
  nota: más cuerpo; `Mixed Chorus` (agudas), 1.
- **Crótalos** (`Finger Cymbals`): medidos, −2,9 dB en 2,5–6 kHz y −14 dB por encima de 6 kHz: son lo más brillante de la pista.
  Por eso van **contados** (6 en exploración, 4 en combate), a vel. ≤ 44/50 y en un bus con paso alto a 1 kHz y estantería
  −6 dB desde 6 kHz. El boceto los tocaba en todos los compases.
- **Campanillas**: solo la nota 62 de `Hand Bells, Nepalese` (−27,5 dB en 2,5–6 kHz); la 60 y la 61 son brillantes (−5 y −0,5).
- **Golpes metálicos**: sin platos (el boceto tenía un plato cada dos compases en combate: −5,7 dB en 2,5–6 kHz). Los sustituyen
  el `Gong 2` (63 ligero, −22 dB; 61 pleno, solo en el c. 23 y el c. 1) y las «campanas rotas» (`Tubular Bells 1`, −45 dB).
- **Puñaladas**: `ViolinEnsSpic` en E5 mide −7,7 dB en 2,5–6 kHz; por eso son notas de 0,1 s, a vel. ≤ 88 y fuera de la octava del
  coro que canta (§6). Nunca por encima de F#5 (78).
- **`Darbuka`**: solo el *doum* (60, −51 dB); los *tek* (61–64) tienen −24 dB y quedan fuera.
- **`Contrabassoon`**: con bucle (el sin bucle dura 2 s). Es capa común: en el retorno calla en las dos versiones.
- No usar ningún `KS`. Ningún cambio de patch en mitad de una nota tenida.

## 7. Dinámica

| Nivel | pp | p | mp | mf | f |
|---|---|---|---|---|---|
| Velocidad | 25–40 | 40–55 | 55–70 | 70–85 | 85–104 |
| CC1 (Sonatina) | 40–55 | 55–70 | 70–85 | 85–100 | 100–112 |

Techos: exploración vel. ≤ 80 y CC1 ≤ 92; combate vel. ≤ 104 y CC1 ≤ 112 (las voces agudas, ≤ 106). Crótalos ≤ 44 (E) / 50 (C),
puñaladas ≤ 88.

| Sección | Exploración | Combate | Gestos |
|---|---|---|---|
| Intro 1–2 | pp → p | mf | E: la llamada sube un poco su CC1. C: el *ostinato* crece desde *p* en el c. 1. |
| A 3–6 | p (acomp.) / mp (voces) | f | Un arco de CC1 por compás (cada coro su frase). |
| A' 7–10 | mp → mf (c. 9) → mp | f → f+ (c. 9) → f | Arco largo de las agudas con cumbre en el G♭5 del c. 9. |
| B 11–16 | p / pp | mf / mp | E: plano; cumbre suave de los graves en el c. 13. C: la salmodia se reduce; el redoble del c. 16 abre el puente. |
| Puente 17–20 | p → mf | f → f+ | Crescendo continuo; en combate los toms y el redoble de bombo del c. 20. |
| Retorno 21–26 | mf → **mf+ (c. 23)** → mp | f → **f+ (c. 23)** → f | Pico en el t1 del c. 23; diminuendo por compases. |
| Codetta 27–28 | p | mf | La llamada del c. 28 igual que la del c. 2. |

## 8. Criterios de aceptación

**Partitura (`test_compose.py`, leyendo los dos MIDIs):**

1. Los dos MIDIs: 28 compases de 4/4 a ♩ = 80, sin cambios de tempo, misma longitud en ticks; ninguna nota empieza antes del
   tick 0 ni después de 84,000 s, y todo lo que suena en el c. 28 termina antes de 84,000 s.
2. Rangos del catálogo y registros de §6. Techos y suelos: `Choir Low` 52–66, `Choir High` 69–78, `Chant` 43–54, `Trombones`
   52–66, `Horns` 59–70, `Brass Stabs` 41–55, `Cor Anglais` 63–70, `Ostinato` 46–58, `Ostinato Low` 28–46, `Daggers` 65–68 y
   77–78, `Organ`/`Organ Open` 45–56, `Organ Pedal` 37–48, `Contrabassoon` 28–37, `Timpani` 41–46, `Darbuka` = 60,
   `Hand Bell` = 62, `Bell` = 70, `Broken Bells` = 60 + 61.
3. La melodía de referencia de §5 (leitmotiv, recitado, halo y contracanto) aparece con las alturas y los ataques exactos en las
   **dos** versiones: c. 2, 3–6, 7–10, 11–16, 17–20, 21–26, 27 y 28.
4. Las capas comunes (`Organ Pedal`, `Contrabassoon` con su CC1, `Frame Drum`) son idénticas en los dos MIDIs, y `Choir Low` y
   `Choir High` tienen las mismas notas y ticks (después de humanizar) en los dos; solo cambia su CC1.
5. Figuras: en exploración, nada más corto que la corchea; en combate, semicorcheas solo en `Ostinato`, `Ostinato Low`, `Chant`,
   `Daggers`, `Bass Drum` y `Tom`.
6. Capas simultáneas por sección ≤ E 6 / 8 / 8 / 7 / 8 / 10 / 6 y C 11 / 14 / 14 / 11 / 14 / 14 / 10
   (intro / A / A' / B / puente / retorno / codetta).
7. **Sin choques de registro:** mientras canta un coro con melodía, ninguna otra pista mantiene notas de negra o más en la misma
   octava con velocidad (o CC1) ≥ la suya. Excepciones declaradas: los unísonos de `Trombones` con `Choir Low` y de `Horns` 8vb
   con `Choir High`, el recitado de A' (≥ 15 de CC1 por debajo) y el corno inglés de B (≥ 10 por debajo). **Puñaladas:** ninguna
   cae en la octava del coro que canta en ese compás (regla de §6).
8. Ninguna velocidad ni CC1 por encima de los techos de §7. El c. 23 tiene el CC1 más alto de `Choir Low` y la velocidad más alta
   de `Bass Drum` y `Timpani` (combate) en las dos versiones donde existan.
9. CC1 en el tick 0 en todas las pistas de Sonatina por CC1; `Cor Anglais` y `Horns` ≤ 2,8 s por nota.
10. Combate: `Ostinato` con acentos en 0, 3, 6, 8, 11, 14 en todos los compases salvo B (sin acentos); `Chant` solo en esas
    semicorcheas; `Brass Stabs` solo en 0, 6, 12. Ninguna racha de más de 3 semicorcheas de `Ostinato` con la misma altura y
    velocidad (±3).
11. Recuento por bucle: exploración `Finger Cymbals` 6, `Hand Bell` 4, `Bell` 2, `Gong` 3; combate `Finger Cymbals` 4, `Metal` 8
    (c. 1 y 23 con la nota 61; c. 3, 5, 7, 9, 17, 19 con la 63), `Broken Bells` 4 (c. 1, 21, 23, 25). Ningún plato en ninguna versión.
12. **Armonía:** la nota más grave en el t1 y el t3 de cada compás tiene la clase de altura del bajo de §4.

**Mezcla (informe de `mix.py`, una `MixSpec` por versión, medido sobre el MP3):**

13. Sonoridad integrada: exploración **−17,5 ± 0,5 LUFS**, combate **−16,5 ± 0,5 LUFS**; pico real **≤ −1 dBTP** en las dos.
14. `loop_samples` = **3 704 400** en las dos; `seam_jump` < 0,02.
15. Contrastes (`sections_lufs`): retorno c. 21–24 frente a B c. 11–16 entre **+4 y +8 LU** en exploración y entre **+3 y +6 LU**
    en combate; puente c. 19–20 frente a c. 17–18 al menos +1,5 LU.
16. Entre versiones: en cada sección de §3, combate − exploración entre **+1 y +5 LU** (el combate tiene que sentirse intenso:
    nunca por debajo de +1).
17. Bandas (`bands_db`), en las dos: `presencia 2.5-6k` ≤ **−19 dB** (E) / **−18 dB** (C), `aire 6-16k` ≤ **−30 dB**,
    `sub <60` ≤ −20 dB. Primer listón.
18. Ninguna parte suelta pasa de −6 dB de pico antes del bus. En `parts`, en las dos versiones, el coro que canta está al menos
    3 LU por encima de cualquier otra pista melódica o de acompañamiento tenido (las voces mandan); `Finger Cymbals` al menos 12 LU
    por debajo de los coros; en combate, `Daggers` al menos 6 LU por debajo de `Choir High`.
19. Las dos `MixSpec` comparten sala (mismos `reverb` y `reverb_eq`) y la colocación de las pistas que existen en ambas; las capas
    comunes, `Choir Low` y `Choir High` con el mismo `gain_db` y en buses idénticos (las de capas comunes, sin compresor).
20. **Prueba de cruce**: `build/acto2-templo-cruce.mp3`: exploración de 0 a 24 s, fundido lineal de 1,6 s a combate en 24 s
    (c. 9), vuelta a exploración en 56 s (c. 19 t3). Sin bache de más de 3 LU por debajo de la menor de las dos versiones ni
    salto de más de 5 LU en la sonoridad a corto plazo (3 s); sin ataques duplicados ni *flam* en el tambor de marco ni en las voces.
21. Escucha: se oyen claramente las dos voces turnándose (A) y la salmodia (A'); B respira; el combate suena a ritual en marcha,
    intenso desde el primer compás; las puñaladas se entienden como cuchilladas y no como un pitido; los efectos del juego siguen
    claros en el c. 23.

### `MixSpec` (las dos versiones)

```python
MixSpec(
    midi='scripts/musica/acto2-templo/build/acto2-templo-explora.mid',   # o -combate.mid
    out='scripts/musica/acto2-templo/build/acto2-templo-explora.mp3',    # o -combate.mp3
    bpm=80, beats_per_bar=4, bars=28,          # loop_samples = 28 × 4 × 60/80 × 44 100 = 3 704 400
    target_lufs=-17.5,                         # combate: -16.5
    ceiling_dbtp=-1.0,
    reverb={'seconds': 2.8, 'predelay': 0.03, 'damping': 0.5},   # una sala para las dos (el boceto usaba 3,0 y 2,4)
    sections={'intro 1-2': (1, 2), 'A 3-6': (3, 6), "A' 7-10": (7, 10), 'B 11-16': (11, 16),
              'puente 17-18': (17, 18), 'puente 19-20': (19, 20), 'retorno 21-24': (21, 24),
              'extensión 25-26': (25, 26), 'codetta 27-28': (27, 28), 'c23': (23, 23)},
    ...)
```

Buses de partida (los del boceto, `acto2_bocetos.py`): `choir` con −2 dB en 300 Hz y −3 dB en 3 kHz; `organ` con paso alto 30 Hz;
`rhythm` (*ostinato*, puñaladas) con paso alto 45 Hz, −2 dB en 300 Hz y −3 dB en 3,2 kHz; `drums` con paso alto 55 Hz, −6 dB en
46 Hz y −4 dB en 3,5 kHz; `brass` con paso alto 70 Hz, −3 dB en 3 kHz y compresión suave; `bells` (crótalos, campanillas, metal)
con paso alto 1 kHz para los crótalos (300 Hz para el resto) y estantería −6 dB desde 6 kHz. Mayor envío de sala en exploración
(las vísperas resuenan) que en combate.

**Integración (cuando el usuario lo apruebe):** copiar a `src/audio/cap2-e1.mp3` y `src/audio/cap2-e1-combate.mp3` y añadir a
`MUSIC_TRACKS` (`src/fx/music-tracks.ts`):
`'cap2-e1': { file: 'cap2-e1.mp3', loopSamples: 3704400, group: 'cap2-e1' }` y
`'cap2-e1-combate': { file: 'cap2-e1-combate.mp3', loopSamples: 3704400, group: 'cap2-e1' }`.
