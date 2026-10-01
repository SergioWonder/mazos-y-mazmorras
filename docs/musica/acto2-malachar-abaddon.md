# Brief: Acto II, jefe del escenario 1, Malachar y Abaddon — «El pacto»

Combate de jefe del Templo Oscuro en **dos pistas que son la misma canción**: mismo tempo, compases, forma, armonía,
melodía y esqueleto rítmico. El juego cambia de una a otra **desde el mismo punto del bucle** cuando cae Malachar y se
alza Abaddon (`faseMusical: 2` en `src/core/enemigos.ts`; `combatTheme` y `cruzarVersion`: fundido lineal de 1,6 s).

| Pista | Id de juego | Título | Carácter |
|---|---|---|---|
| Malachar, Heraldo del Culto | `cap2-e1-jefe` | «El rito del Heraldo» | **Más ritual**: los coros mandan; órgano, campanas, gong, tambores de marco, darbuka, crótalos, didgeridoo, contrafagot. **Sin trompas** |
| Abaddon, el Demonio Mayor | `cap2-e1-jefe-fase2` | «La carne abierta» | **Más caos**: el mismo esqueleto desatado; metales graves en racimos, trémolos, golpes, coros que gritan |

Pista nueva en `scripts/musica/acto2-malachar-abaddon/` con las convenciones del
[README del estudio](../../scripts/musica/estudio/README.md):

- `test_compose.py` (criterios 1–13 de §8) se escribe **antes** que `compose.py`.
- `compose.py` genera **los dos MIDIs a la vez** (`build/acto2-malachar.mid`, `build/acto2-abaddon.mid`) desde una única
  descripción de forma, armonía, melodía y esqueleto.
- `mix.py` renderiza los dos (`.mp3` y `.report.json`), cada uno con su `MixSpec`, y las dos pruebas de cruce
  `build/acto2-malachar-abaddon-cruce-a.mp3` y `-cruce-b.mp3` (criterio 22).

Necesita montado el disco **Base**. Fuentes: [direccion.md](direccion.md), sección «Acto II: lo que pidió el usuario…»:
Malachar **más ritual**, **mucho más énfasis en los coros**, **sin la trompa aguda del boceto (estridente)** y con instrumentos
de ritual; Abaddon **más caos**, el mismo esqueleto rítmico desatado. Referencia aprobada: `boss_temple()` en
`scripts/musica/leitmotivs/acto2_bocetos.py` y `build/acto2-jefe-templo.mp3` (♩ = 160, frigio, coros que se turnan, salmodia
3+3+2, semicorcheas con el ♭2, golpes del demonio en 3+3+2, bombo y toms, cuchillos de violín, subida de semitono «cuando el
demonio se suelta»). Escenario del que viene: [acto2-templo.md](acto2-templo.md) (si♭ menor, ♩ = 80: este jefe va **justo al
doble de tempo**).

## 1. Función, emoción y repetición

- **Dónde suena:** el combate contra Malachar (140–146 PV; invoca acólitos, *Maldición del Pacto*, *Drenar Fe*, *Cuchillo
  Ritual*, *Verbo de Ruina*). Al caer, de su carne se alza **Abaddon** (108 PV; *Alarido del Abismo*, garras, llamaradas) y la
  música cruza a la segunda pista sin cortar.
- **Emoción:**
  - Malachar: **el rito en su punto álgido**. Los dos coros del Templo, ahora a 160, se responden a gritos sobre la salmodia;
    el órgano y el didgeridoo sostienen un do♯ que no se mueve; tambores de mano, campanas en semitono (el pacto), gong. Es
    tenso y épico, pero **ordenado**: todo el mundo sabe su papel en la ceremonia.
  - Abaddon: **la ceremonia se rompe**. Las mismas voces, la misma melodía y los mismos tambores, pero donde había campanas hay
    trombones y tuba en racimos de semitono, donde había darbuka hay chelos en *spiccato* con el ♭2, trémolos en racimo, un
    coro que grita doblando a las agudas. Más fuerte (+1 LU) y más denso, sin llegar a ruido.
- **Repetición:** 3–6 minutos entre los dos (2–4 vueltas de 84 s). Un solo clímax (c. 43), un respiro tenso (B «El
  sacrificio») y la costura sin señal. El cruce puede ocurrir en cualquier compás: por eso no hay silencios en el esqueleto.
- **Idea tonal:** do♯ frigio. El ♭II es **re**, la tonalidad original de «Sombra» (y la de la casa del héroe en el Acto I):
  aquí rechina medio tono por encima del do♯ del rito. En el clímax **la tonalidad sube a re** (el demonio se suelta: la
  subida de semitono del boceto, que ya no necesita un segundo pase) y en la caída vuelve a do♯. El didgeridoo (que solo
  suena en Do♯2, ver §6) **calla mientras la tonalidad está fuera de do♯**.
- **Transformación del leitmotiv** (§5): **antífona** a 160 (el motivo partido entre coros graves y agudos, y otra vez con los
  registros cambiados); **aumentación ×2** en las agudas sobre la **salmodia recto tono** de los graves (A'); **células** del
  motivo en el sacrificio (B); **fragmento en stretto** que sube por semitonos (puente); el motivo **en re, en octavas, con los
  dos coros** (clímax); la **cola** que cae de re a do♯ (caída).

## 2. Tempo, métrica, tonalidad, duración

| Parámetro | Valor (idéntico en las dos pistas) |
|---|---|
| Tempo | ♩ = 160, fijo (el del boceto; el doble del Templo) |
| Métrica | 4/4 |
| Tonalidad | **do♯ frigio** (con la sensible B♯ en las dominantes); ♭II = **D**; sexta alemana A7; el puente sube por tríadas menores (C#m, Dm, E♭m, Em) y el **clímax va en re** (frigio, ♭II = E♭) antes de caer otra vez a do♯ |
| Compases | **56** |
| Duración del bucle | 56 × 4 × 60/160 = **84,000 s** → `loop_samples` = **3 704 400** a 44,1 kHz (cada compás son 66 150 muestras exactas) |
| `MixSpec` (ambas) | `bpm=160`, `beats_per_bar=4`, `bars=56` |

Compás = 1,500 s; negra = 0,375 s; corchea = 0,188 s; semicorchea = 0,094 s. Inicio del compás *n* = (*n* − 1) × 1,5 s.

**Figuras:** coros con la corchea como mínima (el ritmo del motivo, como en el boceto); salmodia (`Chant`) en sílabas cortas sobre
la rejilla de semicorcheas. Semicorcheas solo en el *ostinato* (darbuka / chelos), en los cuchillos y en los rellenos de tom.

**Rejilla de semicorcheas:** 0–15. **Acentos 3+3+2 (dos veces): 0, 3, 6, 8, 11, 14.** Golpes del demonio en las corcheas 0, 3,
6 (= semicorcheas 0, 6, 12). Cuchillos en las semicorcheas 2, 5, 9, 11, 13.

### Reglas de sincronía (Malachar → Abaddon)

1. Mismo tempo, compases, forma, armonía compás a compás (§3, §4).
2. **Misma melodía y mismas voces:** `Choir Low` (Large Chorus), `Choir High` (Mixed Chorus) y `Chant` (Large Chorus) tienen
   las mismas notas y ticks (misma semilla de humanización por nombre de pista) en las dos pistas; cambia su CC1.
3. **Capas comunes** (idénticas nota a nota, mismas velocidades): el **esqueleto**.
   - `Bass Drum` (Bass Drum 2, 62): semicorcheas 0, 6, 8, 14.
   - `Frame Drum` (61 en 3 y 11; 64 en 15).
   - `Timpani` (fundamental en la semicorchea 0; también en la 8 en el clímax).
   - `Organ Pedal` (Pedal - Bourdon 16′): la fundamental del bajo.

   (Detalle por sección en §6.) Al ser idénticas, en el cruce no hay *flam* ni bache en el pulso.
4. **Mismos papeles rítmicos con distinto instrumento** (ver §6, «Esqueleto»): *ostinato* de semicorcheas (darbuka → chelos), cuchillos
   (col legno → violines), golpes de las corcheas 0, 3, 6 (campanas y coro → metales graves), metal de sección (gong grave → gong
   pleno).

## 3. Forma compás a compás e intensidad

| Sección | Compases | Tiempo (s) | Contenido | Int. Malachar | Int. Abaddon |
|---|---|---|---|---|---|
| Intro «El círculo» | 1–4 | 0–6 | Gong; bordón de do♯ (órgano, didgeridoo / trémolo en racimo); tambores; c. 3: **salmodia** de los graves; c. 4: **grito** de las agudas en el ♭II | 6 → 7 | 7 → 8 |
| A «La invocación» | 5–12 | 6–18 | **Antífona** a 160 (graves, agudas, graves, agudas) y otra vez con los registros cambiados (agudas, graves…) y otra armonía | 7 | 8 |
| A' «La salmodia del Heraldo» | 13–20 | 18–30 | Las agudas cantan el motivo **en aumentación ×2**; los graves **recitan sobre Sol♯** en 3+3+2; Dmaj7(#11) en el c. 18 | 8 | 9 |
| B «El sacrificio» | 21–28 | 30–42 | **Respiro tenso**: pulso a la mitad; los graves cantan **células** del motivo, las agudas responden con suspiros ♭2 → 1; pedal de do♯ y luego de sol♯ | 5 (mínimo) | 6 (mínimo) |
| Puente «Las dagas» | 29–36 | 42–54 | La **cabeza** en *stretto*, un compás cada coro, subiendo por semitonos (do♯, re, mi♭, mi); E♭7 → re | 7 → 9 | 8 → 10 |
| Clímax «El pacto se cumple» | 37–48 | 54–72 | **El motivo en re**, en octavas, los dos coros (37–40) y otra vez rearmonizado con la **cumbre en el c. 43** (63 s, B♭maj7); **caída** a do♯ (45–48) | 9 → **10** (c. 43) → 8 | 9 → **10** (c. 43) → 9 |
| Codetta «El círculo se cierra» | 49–56 | 72–84 | La cabeza en aumentación y la cola (49–52); la textura de la intro (53–56), que encadena con el c. 1 | 7 → 6 | 8 → 7 |

Respiros: toda B; el t4 de los c. 8 y 12 (la melodía calla). El esqueleto no se para nunca (el cruce puede llegar en cualquier punto).

## 4. Armonía (común a las dos pistas)

Cifrado por compás; «(1–2) / (3–4)» = cambio en el t3. Entre corchetes, la nota de `Organ Pedal` (16′: suena una octava más grave).

**Intro (1–4)**

| 1 | 2 | 3 | 4 |
|---|---|---|---|
| C#5 (sin tercera) | C#m | A/C# | **D/C#** (♭II sobre pedal) |

[C#2 C#2 C#2 C#2] (37)

**A (5–12)**: la armonización de «Sombra» en do♯ (**A7** = sexta alemana: La–Do♯–Mi–Sol; el Sol de la melodía es su sexta
aumentada) y, en la segunda antífona, otra armonía para las mismas notas (Emaj7/G#, A, F#m). El ♭II frigio (D) cierra cada frase.

| 5 | 6 | 7 | 8 |
|---|---|---|---|
| C#m (1–2) / **A7** (Al+6) (3–4) | G#7(♭13) (1–2) / G#7 (3–4) | C#m (1–2) / **D** (♭II) (3) / G#7 (4) | C#m (1–2) / D/C# (3–4) |

| 9 | 10 | 11 | 12 |
|---|---|---|---|
| C#m (1–2) / A7 (3–4) | Emaj7/G# (1–2) / G#7(♭9) (3–4) | A (1–2) / F#m (3) / G#7 (4) | C#m (1–2) / D/C# (3–4) |

[C#2 A2 · G#2 · C#2 D2 G#2 · C#2 C#2 | C#2 A2 · G#2 G#2 · A2 F#2 G#2 · C#2 C#2] (37 45 · 44 · 37 38 44 · 37 37 | 37 45 · 44 44 · 45 42 44 · 37 37)

**A' (13–20)**: un acorde por compás bajo la aumentación; **Dmaj7(#11)** en el c. 18: el ♭II con el Sol♯ (la nota que recitan
los graves) como #11.

| 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|---|
| C#m | A7 | G#7(♭13) | G#7 | C#m | **Dmaj7(#11)** | C#m(add9) | D/C# |

[C#2 · A2 · G#2 · G#2 · C#2 · D2 · C#2 · C#2]

**B «El sacrificio» (21–28)**: pedal de do♯ con el ♭II alternando cada compás; después pedal de sol♯ (v menor, VI con novena,
dominante suspendida y con ♭9).

| 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 |
|---|---|---|---|---|---|---|---|
| C#m | D/C# | C#m | D/C# | G#m | A(add9)/G# | G#7sus4 | G#7(♭9) |

[C#2 ×4 · G#2 ×4] (37 · 44)

**Puente «Las dagas» (29–36)**: tríadas menores que suben por semitonos, cada una con su ♭II en la segunda mitad del compás par;
tras Em, **E♭7** (el ♭II7 de re, que hace de dominante sustituta) abre el clímax en re.

| 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 |
|---|---|---|---|---|---|---|---|
| C#m | C#m (1–2) / D/C# (3–4) | Dm | Dm (1–2) / E♭/D (3–4) | E♭m | E♭m (1–2) / F♭/E♭ (3–4) | Em | **E♭7** |

[C#2 · C#2 · D2 · D2 · E♭2 · E♭2 · E2 · E♭2] (37 37 38 38 39 39 40 39)

**Clímax (37–48)**: la armonización de «Sombra» en re (**B♭7** = sexta alemana de re, **E♭** = ♭II); en la repetición, F/A,
**B♭maj7 en la cumbre** (c. 43) y E♭maj7(#11) sobre pedal; la **caída** (45–48) vuelve a do♯ por su dominante.

| 37 | 38 | 39 | 40 | 41 | 42 |
|---|---|---|---|---|---|
| Dm (1–2) / **B♭7** (Al+6) (3–4) | A7(♭13) (1–2) / A7 (3–4) | Dm (1–2) / **E♭** (♭II) (3) / A7 (4) | Dm (1–2) / E♭/D (3–4) | Dm (1–2) / B♭7 (3–4) | F/A (1–2) / A7(♭9) (3–4) |

| 43 | 44 | 45 | 46 | 47 | 48 |
|---|---|---|---|---|---|
| **B♭maj7** (cumbre) (1–2) / Gm (3) / A7 (4) | Dm (1–2) / E♭maj7(#11)/D (3–4) | Gm/B♭ (1–2) / A7 (3–4) | **G#7(♭13)** (1–2) / G#7 (3–4) | C#m (1–2) / Amaj7 (3–4) | C#m (1–2) / D/C# (3–4) |

[D2 B♭2 · A2 · D2 E♭2 A2 · D2 D2 · D2 B♭2 · A2 A2 · B♭2 G2 A2 · D2 D2 · B♭2 A2 · G#2 · C#2 A2 · C#2 C#2]

**Codetta (49–56)**: tónica, sexta alemana con el Do♯ en el bajo, iv con sexta, dominante; después la intro (la costura 56 → 1 es
la misma que 4 → 5).

| 49 | 50 | 51 | 52 | 53 | 54 | 55 | 56 |
|---|---|---|---|---|---|---|---|
| C#m | A7/C# | F#m6/C# | G#7(♭9) | C#5 | C#m | A/C# | D/C# |

## 5. Leitmotiv

Referencia «Sombra» (re), ritmo de `demos.py`: `| D E F G# A | F E C# | D F A B♭ A | D |`, `| e e q q. e | q q h | e e q q q | w |`.

**Versión de esta pista: «el pacto»**, en do♯, a 160, en dos octavas: **graves** desde C#3 (voces masculinas) y **agudas** desde
C#5 (voces femeninas). La redonda final dura h. (respira en el t4).

```
graves: | C#3 D#3 E3 G3  G#3 | E3 D#3 B#2 | C#3 E3 G#3 A3 G#3 | C#3 |   49 51 52 55 56 · 52 51 48 · 49 52 56 57 56 · 49
agudas: | C#5 D#5 E5 G5  G#5 | E5 D#5 B#4 | C#5 E5 G#5 A5 G#5 | C#5 |   73 75 76 79 80 · 76 75 72 · 73 76 80 81 80 · 73
        | e   e   q  q.  e   | q  q   h   | e   e  q   q  q   | h.   |
```

Melodía de referencia (idéntica en las dos pistas, en `Choir Low` y `Choir High`):

| Compases | Pista | Notas (MIDI) y ritmo | Transformación |
|---|---|---|---|
| 3 | `Choir Low` | C#3 (49) en 3+3+2 (q. q. q) | **Salmodia** recto tono: el rito empieza. |
| 4 | `Choir High` | D5 (74), h. | **El grito en el ♭II**: re contra do♯. |
| **5–8** | `Choir Low` (5, 7) / `Choir High` (6, 8) | c. 5: 49 51 52 55 56 · c. 6: 76 75 72 · c. 7: 49 52 56 57 56 · c. 8: 73 (h.) | **Antífona**, como en el Templo pero al doble de tempo. |
| 9–12 | `Choir High` (9, 11) / `Choir Low` (10, 12) | c. 9: 73 75 76 79 80 · c. 10: 52 51 48 · c. 11: 73 76 80 81 80 · c. 12: 49 (h.) | **Registros cambiados** y armonía nueva. |
| **13–20** | `Choir High` | C#5 (q) D#5 (q) E5 (h) · G5 (h.) G#5 (q) · E5 (h) D#5 (h) · B#4 (w) · C#5 (q) E5 (q) G#5 (h) · A5 (h) G#5 (h) · C#5 (breve, c. 19–20) (73 75 76 · 79 80 · 76 75 · 72 · 73 76 80 · 81 80 · 73) | **Aumentación ×2** en las agudas… |
| 13–20 | `Choir Low` | G#3 (56) en 3+3+2 (q. q. q) cada compás; **G3 (55) en el c. 14** (sobre A7) | … sobre la **salmodia del Heraldo** en la dominante. |
| 21–28 | `Choir Low` (21, 23, 25, 27) / `Choir High` (22, 24, 26, 28) | c. 21 y 23: C#3 E3 G#3 A3 G#3 (e e q q q) (49 52 56 57 56) · c. 22: D5 (h) C#5 (h) (74 73) · c. 24: E5 (h) D5 (h) (76 74) · c. 25: G#3 B3 D#4 E4 D#4 (56 59 63 64 63) · c. 26: A5 (h) G#5 (h) (81 80) · c. 27: G#3 (w) (56) · c. 28: B#4 (h) D#5 (h) (72 75) | **Célula** (el tercer compás del motivo: 1 ♭3 5 ♭6 5) y **suspiros** de semitono: el sacrificio. |
| 29–36 | `Choir Low` (29, 31, 33) / `Choir High` (30, 32, 34) / los dos (35) | c. 29: C#3 D#3 E3 G3 · c. 30: C#5 D#5 E5 G5 · c. 31: D3 E3 F3 G#3 · c. 32: D5 E5 F5 G#5 · c. 33: E♭3 F3 G♭3 A3 · c. 34: E♭5 F5 G♭5 A5 · c. 35: E3 F#3 G3 A#3 + E5 F#5 G5 A#5 (negras) · c. 36: E♭7 en acorde (graves B♭2 D♭3 G3, agudas G4 B♭4 D♭5; w) (49 51 52 55 · 73 75 76 79 · 50 52 53 56 · 74 76 77 80 · 51 53 54 57 · 75 77 78 81 · 52 54 55 58 + 76 78 79 82 · 46 49 55 / 67 70 73) | **Fragmento en *stretto***: la cabeza (1 2 ♭3 #4) salta de coro en coro y sube un semitono cada dos compases. |
| **37–44** | `Choir Low` + `Choir High` en octavas | El motivo **en re**: graves desde D3, agudas desde D5 (50 52 53 56 57 · 53 52 49 · 50 53 57 58 57 · 50 / 74 76 77 80 81 · 77 76 73 · 74 77 81 82 81 · 74), dos veces (37–40 y 41–44) | **Transposición al ♭II** (la subida de semitono del boceto) y los dos coros juntos. La segunda vez, rearmonizado: **B♭5 (82) del c. 43 es la cumbre** (y, con el A#5 del c. 35, la nota más alta de la pista). |
| 45–48 | `Choir High` (45, 46, 48) / `Choir Low` (47) | c. 45: F5 E5 C#5 (q q h) (77 76 73) · c. 46: E5 D#5 B#4 (q q h) (76 75 72) · c. 47: C#3 E3 G#3 A3 G#3 (49 52 56 57 56) · c. 48: C#5 (h.) (73) | **La caída**: la cola del motivo en re y, un semitono abajo, en do♯; la célula y la tónica. |
| 49–52 | `Choir Low` (49–50) / `Choir High` (51–52) | C#3 (q) D#3 (q) E3 (h) · G3 (h.) G#3 (q) · E5 (h) D#5 (h) · B#4 (w) (49 51 52 · 55 56 · 76 75 · 72) | **Aumentación ×2** de los dos primeros compases, repartida entre coros. |
| 55 | `Choir Low` | = c. 3 | |
| 56 | `Choir High` | = c. 4 | La costura. |

## 6. Orquestación

### Patches

`…/` = `sso/Sonatina Symphonic Orchestra/`. (M) = solo Malachar; (A) = solo Abaddon; sin marca = en las dos.

| Pista | Ruta `.sfz` | Dinámica | Duración máx. por nota |
|---|---|---|---|
| `Choir Low` | `…/Chorus - Performance/Large Chorus.sfz` | **CC1** | sin límite (con bucle) |
| `Choir High` | `…/Chorus - Performance/Mixed Chorus.sfz` | **CC1** | sin límite |
| `Chant` | `…/Chorus - Performance/Large Chorus.sfz` (otra pista: la salmodia) | **CC1** | — |
| `Bass Drum` (**común**) | `VCSL/Membranophones/Struck Membranophones/Bass Drum 2.sfz`, 62 | velocidad | — |
| `Frame Drum` (**común**) | `VCSL/Membranophones/Struck Membranophones/Frame Drum.sfz` (61, 64; **nunca 60 ni 63**) | velocidad | — |
| `Timpani` (**común**) | `VSCO-2-CE/Timpani.sfz` | velocidad | — |
| `Organ Pedal` (**común**) | `…/Organ/Pedal - Bourdon 16ft.sfz` | velocidad | sin límite (con bucle) |
| `Choir High 2` (M) | `…/Chorus - Performance/Large Chorus.sfz` (unísono con `Choir High`) | **CC1** | sin límite |
| `Organ 8` (M) | `…/Organ/Great - Open Diapason 8ft.sfz` | velocidad | sin límite |
| `Organ 16` (M) | `…/Organ/Great - Bourdon 16ft.sfz` (−73 dB en 2,5–6 kHz) | velocidad | sin límite |
| `Didgeridoo` (M) | `VCSL/Aerophones/Lip Aerophones/Didgeridoo.sfz`: **solo** 68 (`Sus2`, 12,4 s), 69 (`Sus3`, 9,9 s) y 61 (`BarkDown2`, gruñido de 2,1 s) | velocidad | 68 ≤ 12,0 s; 69 ≤ 9,5 s |
| `Contrabassoon` (M) | `…/Woodwinds - Performance/Contrabassoon Solo Sustain (looped).sfz` | **CC1** | sin límite |
| `Darbuka` (M) | `VCSL/Membranophones/Struck Membranophones/Darbuka.sfz`, **solo 60** (*doum*) | velocidad | — |
| `Col Legno Vc` (M) | `…/Strings - Performance/Celli Col Legno.sfz` | velocidad | — |
| `Low Trem` (M) | `…/Strings - Performance/Basses Tremolo.sfz` (la fundamental, 33–45) | **CC1** | sin límite |
| `Pact Bells` (M) | `VCSL/Idiophones/Struck Idiophones/Tubular Bells 1.sfz`, díada C#4 + D4 (61 62) | velocidad | — |
| `Hand Bell` (M) | `VCSL/Idiophones/Struck Idiophones/Hand Bells, Nepalese.sfz`, **solo 62** | velocidad | — |
| `Finger Cymbals` (M) | `VCSL/Idiophones/Struck Idiophones/Finger Cymbals.sfz` | velocidad | — |
| `Gong` (M) | `VCSL/Idiophones/Struck Idiophones/Gong 1.sfz` (61 = grave oscuro; 60 = pleno) | velocidad | — |
| `Horns Low` (A) | `…/Brass - Performance/Horns Sustain.sfz` (**solo 48–58**, al unísono con `Choir Low`) | **CC1** | **≤ 2,8 s** |
| `Demon` (A) | `…/Brass - Performance/Trombones Marcato.sfz` | **CC1** | ≤ 0,3 s (golpes) |
| `Demon Low` (A) | `…/Brass - Performance/Tuba Marcato.sfz` | **CC1** | ≤ 0,3 s |
| `Choir Shout` (A) | `…/Chorus - Performance/Large Chorus.sfz` (unísono con `Choir High` en el clímax) | **CC1** | sin límite |
| `Cellos Spic` (A) | `VSCO-2-CE/CelloEnsSpic.sfz` | velocidad | — |
| `Celli Trem` / `Violas Trem` (A) | `…/Strings - Performance/Celli Tremolo.sfz` / `Violas Tremolo.sfz` | **CC1** | sin límite (con bucle) |
| `Knives` (A) | `VSCO-2-CE/ViolinEnsSpic.sfz` | velocidad | 0,08 s |
| `Tom` (A) | `VCSL/Membranophones/Struck Membranophones/Tom 2.sfz` (62, 64) | velocidad | — |
| `Gong Full` (A) | `VCSL/Idiophones/Struck Idiophones/Gong 2.sfz`, 61 (golpe pleno) | velocidad | — |
| `Cymbal` (A) | `VCSL/Idiophones/Struck Idiophones/Suspended Cymbal 2.sfz`, **solo 67** (golpe en la cúpula) | velocidad | — |

**Sonatina por CC1**: curva de CC1 con punto en el tick 0 en todas las pistas marcadas; como mucho un punto por corchea.

**Malachar: sin trompas, en ningún registro**, y sin trompetas. El sustituto de la trompa aguda del boceto es el coro agudo doblado
(`Choir High` + `Choir High 2`) y el órgano. Abaddon puede tener trompas, **solo graves** (`Horns Low`, 48–58, al unísono con las voces
graves: samples a −53 dB en 2,5–6 kHz).

### El esqueleto (por sección; capas comunes en negrita)

| Papel | Semicorcheas | Malachar | Abaddon |
|---|---|---|---|
| **Pulso grave** | 0, 6, 8, 14 | **`Bass Drum` 62** | **`Bass Drum` 62** (idéntico) |
| **Contratiempo** | 3, 11 (61) y 15 (64) | **`Frame Drum`** | **`Frame Drum`** (idéntico) |
| **Raíz** | 0 (+ 8 en el clímax) | **`Timpani`** | **`Timpani`** (idéntico) |
| ***Ostinato*** | las 16, acentos 0, 3, 6, 8, 11, 14 | `Darbuka` 60: acentos vel. 90, resto 50 (±6) | `Cellos Spic`: fundamental en la octava 2 (37–44), **♭2 en las semicorcheas 7 y 15** (el rechinar frigio del boceto); acentos vel. 96, resto 70 |
| Golpes 3+3+2 | 0, 6, 12 | — (el demonio aún no está fuera; el papel lo hacen la salmodia y las campanas del pacto) | `Demon`: **racimo** fundamental + ♭2 + tritono (C#3 D3 G3 = 49 50 55 en do♯; D3 E♭3 G#3 en re) · `Demon Low`: fundamental (37–40) |
| Salmodia | 0, 3, 6, 8, 11, 14 | `Chant`, sílabas de 0,7 / 0,7 / 0,45 / 0,7 / 0,7 / 0,45 tiempos sobre la fundamental en 49–52 (C#3, D3, E♭3, E3) | `Chant` (las mismas notas), CC1 más alto |
| Cuchillos | 2, 5, 9, 11, 13 | `Col Legno Vc`, díada C#3 + D3 (49 50) en do♯, D3 + E♭3 en re; vel. ≤ 70 | `Knives` (díada de semitono **fuera de la octava del coro que canta**: graves cantando → C#5 + D5 (73 74); agudas cantando → E4 + F4 (64 65); los dos → E4 + F4), vel. ≤ 86 |
| Metal de sección | t1 de las secciones | `Gong` (61; 60 en c. 37 y 43) | `Gong Full` 61 |

**Capas comunes por sección** (idénticas en las dos):

| Sección | `Bass Drum` | `Frame Drum` | `Timpani` | `Organ Pedal` |
|---|---|---|---|---|
| Intro 1–2 | 0, 8 (vel. 84/76) | 64 en 15 | C#2 (37) en 0 | C#2 (37), tenido |
| Intro 3–4 | 0, 6, 8, 14 | 3, 11, 15 | C#2 en 0; c. 4: D2 (38) en 0 | C#2 |
| A, A', puente | 0, 6, 8, 14 (vel. 100/86/94/86) | 3, 11, 15 (vel. 72/72/60) | fundamental en 0 (vel. 86) | bajo de §4 (37–45) |
| B | 0, 8 (vel. 80/70) | 3, 11 (vel. 58) | fundamental en 0 (vel. 70) | C#2 (21–24) · G#2 (25–28) |
| Clímax 37–48 | 0, 6, 8, 14 (vel. 104/90/98/90; c. 43: 105) | 3, 11, 15 | fundamental en 0 y 8 (vel. 94; **c. 43 vel. 100**) | bajo de §4 |
| Codetta 49–52 | 0, 8 | 3, 11, 15 | fundamental en 0 | bajo de §4 |
| Codetta 53–56 | = c. 1–4 | = c. 1–4 | = c. 1–4 | = c. 1–4 |

### Malachar, por sección

| Sección | Capas (máx.) | Quién y cómo |
|---|---|---|
| Intro 1–4 | 12 | **Gong** 61 en el t1 del c. 1 (vel. 76). **Didgeridoo** 69 desde el t1 del c. 1 (6 s, vel. 80). **`Organ 16`** C#2 + G#2 (37 44), tenido (vel. 70). `Darbuka` desde el c. 3. **`Choir Low`** (c. 3) CC1 88 → 96; **`Choir High`** + `Choir High 2` (c. 4) CC1 92 → 100. **`Pact Bells`** en el t1 del c. 4 (vel. 70). Capas comunes. |
| A 5–12 | 14 | **Melodía**: `Choir Low` CC1 94 → 104; `Choir High` + `Choir High 2` CC1 92 → 102 (techo de las agudas: 106). **`Organ 8`**: dos o tres notas del acorde (3.ª, 5.ª, 7.ª) en **59–70**, en blancas, entre los dos coros; modelo c. 5: E4 G#4 (64 68) / E4 G4 (64 67); c. 6: B#3 E4 F#4 (60 64 66) / B#3 D#4 F#4 (60 63 66); vel. 64–72. **`Didgeridoo`** 68 del t1 del c. 5 al t3 del c. 12 (11,25 s, vel. 84). `Chant` CC1 84 → 96. `Darbuka`. `Col Legno Vc` (cuchillos). `Gong` 61 en el t1 del c. 5 (vel. 72). `Pact Bells` en el t1 de los c. 8 y 12 (vel. 66). Capas comunes. |
| A' 13–20 | 14 | **Melodía**: `Choir High` + `Choir High 2` (aumentación) CC1 96 → **106 (c. 18)** → 98. **Salmodia del Heraldo**: `Choir Low` (G#3 en 3+3+2) CC1 92 → 100, al menos 6 por debajo de las agudas. Sin `Chant` (la salmodia la hacen los graves). `Organ 8` (59–70, blancas). **`Didgeridoo`** 69 del c. 13 al final del c. 18 (9 s). `Darbuka`, `Col Legno Vc`. `Hand Bell` 62 en el t1 de los c. 16 y 20 (vel. 52). `Finger Cymbals` en la semicorchea 14 de los c. 14, 16 y 18 (vel. ≤ 44). `Gong` 61 en el t1 del c. 13. `Pact Bells` en el t1 del c. 20. Capas comunes. |
| B 21–28 | 12 | **Melodía**: `Choir Low` CC1 82 → 90; `Choir High` (sin `Choir High 2`) CC1 80 → 88. **`Didgeridoo`** 68 del t1 del c. 21 al t3 del c. 28; **61 (gruñido) en el t1 del c. 21** (vel. 70). **`Contrabassoon`** C#1 (25) c. 21–24 · G#1 (32) c. 25–28, CC1 56 → 66. **`Organ 16`** C#2 + G#2 → G#2 + D#3 (44 51) en los c. 25–28, vel. 62. `Hand Bell` 62 en el t1 de los c. 22, 24 y 26 (vel. 50). `Gong` 61 en el t1 del c. 21 (vel. 70). `Pact Bells` en el t1 de los c. 24 y 28 (vel. 62). Sin `Chant`, `Darbuka` ni cuchillos. Capas comunes (B). |
| Puente 29–36 | 14 | **Melodía**: los dos coros (+ `Choir High 2` con las agudas) CC1 92 → 110 (graves) / 106 (agudas). `Chant` CC1 90 → 104, sobre la fundamental que sube (C#3, D3, E♭3, E3). **`Organ 8`** tríadas en 59–70 que suben con la armonía, vel. 66 → 78. **`Low Trem`** (fundamental en 33–45) CC1 60 → 96. `Darbuka`, `Col Legno Vc`. `Gong` 61 en el t1 del c. 29. **El didgeridoo calla** (la tonalidad deja do♯): solo el gruñido 61 en el t1 del c. 29 (vel. 76). Capas comunes. |
| Clímax 37–48 | 15 | **Melodía 37–44**: `Choir Low` + `Choir High` + `Choir High 2` en octavas, CC1 100 → **110 graves / 106 agudas (c. 43)** → 96. **45–48**: la caída, mismos coros, CC1 98 → 88. `Chant` CC1 96 → 108. `Organ 8` (59–71) vel. 74 → 82 (c. 43). `Low Trem` CC1 90 → 100. `Darbuka`, `Col Legno Vc`. **`Gong` 60 en el t1 del c. 37 (vel. 84) y del c. 43 (vel. 96)**. `Pact Bells` en el t1 de los c. 40, 44 y 48 (vel. 72–76). `Finger Cymbals` en la semicorchea 14 de los c. 38, 40, 42 y 44 (vel. ≤ 44). **`Didgeridoo`** 69 del t1 del c. 47 al final del c. 48 (vuelve el do♯). Capas comunes. |
| Codetta 49–56 | 12 | 49–52: **`Choir Low`/`Choir High`** CC1 88 → 82; `Organ 8`; **`Organ 16`** C#2 + G#2; **`Didgeridoo`** 68 del t1 del c. 49 al t3 del c. 56; **`Contrabassoon`** C#1; `Darbuka`; `Gong` 61 en el t1 del c. 49 (vel. 66). 53–56 = intro (sin el gong del c. 1: lo pone el c. 1 de la vuelta siguiente), con `Pact Bells` en el t1 del c. 56. Capas comunes. |

### Abaddon, por sección

| Sección | Capas (máx.) | Quién y cómo |
|---|---|---|
| Intro 1–4 | 12 | **`Gong Full`** en el t1 del c. 1 (vel. 84). **`Celli Trem`** en racimo C#2 + D2 (37 38), tenido, CC1 70 → 92. `Cellos Spic` desde el c. 1 (*ostinato*). `Demon Low` en los golpes del c. 4. **`Choir Low` + `Horns Low`** (c. 3) CC1 96 → 104 / 88 → 96; **`Choir High`** (c. 4) CC1 98 → 106. `Tom`: c. 4, semicorcheas 8–15 crescendo. Capas comunes. |
| A 5–12 | 15 | **Melodía**: `Choir Low` + `Horns Low` (unísono en los compases de los graves) CC1 100 → 110 / 92 → 102; `Choir High` CC1 98 → 106. `Chant` CC1 94 → 106. **`Demon`** + **`Demon Low`** en las corcheas 0, 3, 6, CC1 100 → 108. `Cellos Spic`. `Knives`. `Tom` 62 en las semicorcheas 10, 11, 13, 14 y 64 en la 15, en los compases pares (vel. 86 → 96). `Gong Full` en el t1 del c. 5 (vel. 86). Capas comunes. |
| A' 13–20 | 15 | **Melodía**: `Choir High` CC1 100 → **106 (c. 18)**; **salmodia** `Choir Low` + `Horns Low` (G#3 / G3) CC1 100 → 108 / 90 → 100. `Demon` + `Demon Low`. `Cellos Spic`. `Knives` en E4 + F4. **`Violas Trem`** en racimo C#4 D4 (61 62) entre los coros, CC1 66 → 84. `Tom` (pares). `Gong Full` en el t1 del c. 13. Capas comunes. |
| B 21–28 | 11 | **Melodía**: `Choir Low` (+ `Horns Low`) CC1 90 → 98; `Choir High` CC1 88 → 96. `Celli Trem` en racimo C#2 + D2 (37 38) en 21–24 y G#2 + A2 (44 45) en 25–28 (la dominante con su ♭2), CC1 60 → 80. `Demon Low` solo en la semicorchea 0 (CC1 90). `Cellos Spic` **sin acentos**, *mp* (vel. 64). Sin `Chant`, `Demon`, `Knives` ni `Tom`. `Gong Full` en el t1 del c. 21 (vel. 80). Capas comunes (B). |
| Puente 29–36 | 15 | **Melodía**: los dos coros (+ `Horns Low` con los graves) CC1 100 → 112 (graves) / 106 (agudas). `Chant` CC1 96 → 110. `Demon` (racimo que sube con la fundamental) + `Demon Low`, CC1 100 → 110. `Cellos Spic`. **`Celli Trem`** en racimo (fundamental + ♭2 en 37–41), CC1 72 → 104. `Knives`. `Tom` todos los compases; c. 36, semicorcheas 0–15 crescendo. `Gong Full` en el t1 del c. 29. Capas comunes. |
| Clímax 37–48 | 16 | **Melodía**: `Choir Low` + `Horns Low` + `Choir High` + **`Choir Shout`** (unísono con las agudas: el coro que grita) CC1 104 → **112 graves / 108 agudas (c. 43)** → 100. `Chant` CC1 100 → 112. `Demon` + `Demon Low`. `Cellos Spic`. `Celli Trem` (racimo grave). `Knives`. **`Gong Full`** en el t1 de los c. 37 y **43** (vel. 90 / 100). **`Cymbal`** 67 en el t1 de los c. 39, 41 y 45 (vel. ≤ 70). Sin `Tom` (lo cubre el timbal en 0 y 8). Capas comunes. |
| Codetta 49–56 | 12 | 49–52: los coros (+ `Horns Low` en 49–50) CC1 96 → 90; `Celli Trem` racimo C#2 + D2; `Cellos Spic`; `Demon Low` en la semicorchea 0; `Gong Full` en el t1 del c. 49 (vel. 80). 53–56 = intro, con `Tom` en el c. 56. Capas comunes. |


### Notas sobre los samples

- **Didgeridoo** (medido): todos los samples `Sus` y `Phrase` suenan en **Do♯2** (69,3 Hz; MIDI 37,0) y cada tecla dispara su propio
  sample sin transponer. Por eso la pista está en do♯ y el didgeridoo calla cuando la tonalidad sale de do♯ (puente y clímax). Fuera:
  `Sus8` (70: un cuarto de tono alto y con −14 dB de presencia), los `Phrase` (62–66: frases con su propio ritmo, que no casan con
  160), `Bark1`/`Short1`/`Tap1` (60, 67, 71: golpes cortos y brillantes). El gruñido 61 (`BarkDown2`, −35 dB) sí.
- **Voces:** graves desde C#3 (48–58) todas masculinas; agudas desde C#5 (72–82) todas femeninas (el corte del coro está en G4).
  `Large Chorus` dispara 3 samples por nota. Techo de las agudas: **A#5/B♭5 (82)**, en los c. 35, 39 y 43; el resto ≤ 81.
- **Brillos de Malachar:** crótalos **7** por bucle (−2,9 dB en 2,5–6 kHz) a vel. ≤ 44 y con paso alto a 1 kHz y estantería −6 dB desde
  6 kHz; `Hand Bell` solo la 62 (−27,5 dB; la 60 y la 61 son brillantes); `Pact Bells` y `Gong 1` son oscuros (−45 y −46 dB).
- **Brillos de Abaddon:** sin platos de choque; `Cymbal` solo la nota 67 (golpe en la cúpula: −9 dB en 2,5–6 kHz y −28 dB por encima
  de 6 kHz, frente a −5,7/−26 del golpe normal), 3 por bucle. `Gong Full` (Gong 2, 61) es el golpe metálico grande (−12 dB). Cuchillos
  (`ViolinEnsSpic`, −7,7 dB en E5) a vel. ≤ 86, notas de 0,08 s y fuera de la octava del coro que canta.
- **Racimos**: siempre de dos o tres notas y en registros separados de la melodía (37–40, 49–56, 59–62). Nada de racimos en 63–82.
- `Darbuka` solo *doum* (60, −51 dB). `Frame Drum` nunca 60 ni 63. Ningún `KS`.

## 7. Dinámica

| Nivel | pp | p | mp | mf | f |
|---|---|---|---|---|---|
| Velocidad | 25–40 | 40–55 | 55–70 | 70–85 | 85–105 |
| CC1 (Sonatina) | 40–55 | 55–70 | 70–85 | 85–100 | 100–112 |

Techos: Malachar vel. ≤ 100 (salvo las capas comunes, que tienen las velocidades de §6) y CC1 ≤ 110; Abaddon vel. ≤ 105 y CC1 ≤ 112.
Voces agudas ≤ 106 (M) / 108 (A). Las capas comunes son idénticas: la diferencia de nivel entre las dos pistas la ponen las demás.

| Sección | Malachar | Abaddon | Gestos |
|---|---|---|---|
| Intro 1–4 | mf → f | f | El grito del c. 4 con < de CC1. |
| A 5–12 | f | f | Un arco de CC1 por frase de coro. |
| A' 13–20 | f → f+ (c. 18) | f → f+ (c. 18) | La cumbre de la aumentación en el A5 del c. 18. |
| B 21–28 | mp → mf | mf | El pulso a la mitad; los suspiros con < >. |
| Puente 29–36 | mf → f+ | f → ff contenido | Crescendo de 8 compases; en Abaddon, el redoble de tom del c. 36. |
| Clímax 37–48 | f → **f+ (c. 43)** → f | f+ → **ff contenido (c. 43)** → f+ | Pico en el t1 del c. 43; la caída (45–48) baja un escalón. |
| Codetta 49–56 | f → mf | f | Los c. 53–56 igual que la intro. |

## 8. Criterios de aceptación

**Partitura (`test_compose.py`, leyendo los dos MIDIs):**

1. Los dos MIDIs: 56 compases de 4/4 a ♩ = 160, sin cambios de tempo, misma longitud en ticks; ninguna nota empieza antes del tick 0
   ni después de 84,000 s, y todo lo del c. 56 termina antes de 84,000 s.
2. Rangos del catálogo y registros de §6. Techos y suelos: `Choir Low` 46–64, `Choir High` 67–82 (82 solo en los c. 35, 39 y 43),
   `Chant` 49–52, `Organ 8` 59–71, `Organ 16` 37–51, `Organ Pedal` 37–46, `Didgeridoo` ∈ {61, 68, 69}, `Contrabassoon` 25–32,
   `Horns Low` 48–58, `Demon` 49–58, `Demon Low` 37–40, `Cellos Spic` 37–45, `Celli Trem` 37–45, `Violas Trem` 59–62, `Knives` 64–65 y
   73–74, `Col Legno Vc` 49–52, `Low Trem` 33–45, `Timpani` 37–46, `Pact Bells` = 61 + 62, `Hand Bell` = 62, `Cymbal` = 67.
3. La melodía de referencia de §5 aparece con las alturas y los ataques exactos en las **dos** pistas: c. 3–4, 5–12, 13–20, 21–28,
   29–36, 37–44, 45–48, 49–52, 55–56.
4. **Capas comunes idénticas** en los dos MIDIs (`Bass Drum`, `Frame Drum`, `Timpani`, `Organ Pedal`): mismas alturas, ticks y
   velocidades después de humanizar. `Choir Low`, `Choir High` y `Chant`: mismas notas y ticks en las dos; solo cambia el CC1.
5. **Mismo esqueleto**: en cada compás, las semicorcheas con ataque de las pistas de cada papel de §6 («Esqueleto») son las mismas en
   las dos pistas (p. ej. `Darbuka` en Malachar y `Cellos Spic` en Abaddon atacan en las mismas semicorcheas y acentúan las mismas;
   `Col Legno Vc` y `Knives` igual).
6. Figuras: coros, órgano, didgeridoo, contrafagot y metales sin nada más corto que la corchea; semicorcheas solo en `Darbuka`,
   `Cellos Spic`, `Chant`, `Col Legno Vc`, `Knives`, `Tom` y las capas comunes.
7. Capas simultáneas por sección ≤ M 12 / 14 / 14 / 12 / 14 / 15 / 12 y A 12 / 15 / 15 / 11 / 15 / 16 / 12
   (intro / A / A' / B / puente / clímax / codetta). Las notas de campanas, gongs, crótalos y plato se escriben de una corchea (son de
   un golpe: suenan igual y no inflan el recuento).
8. **Sin choques de registro:** mientras canta un coro con melodía, ninguna otra pista mantiene notas de negra o más en la misma octava
   con velocidad (o CC1) ≥ la suya, salvo los unísonos declarados (`Choir High 2`, `Choir Shout`, `Horns Low`) y la salmodia de A' (≥ 6
   de CC1 por debajo de las agudas). Cuchillos (`Knives`) nunca en la octava del coro que canta en ese compás.
9. **Malachar sin trompas ni trompetas:** ninguna pista de Malachar usa un patch de `Horn`/`Horns`/`Trumpet`. En Abaddon, `Horns Low`
   nunca por encima de 58.
10. **Didgeridoo** (solo Malachar): notas 68/69 solo dentro de los c. 1–18, 21–28 y 47–56; el gruñido 61 solo en el t1 de los c. 21 y 29;
    nada en los c. 30–46. Cada nota 68 ≤ 12,0 s y 69 ≤ 9,5 s.
11. Ninguna velocidad ni CC1 por encima de los techos de §7. El c. 43 tiene el CC1 más alto de `Choir Low` y la velocidad más alta de
    `Timpani` y `Bass Drum`, en las dos.
12. CC1 en el tick 0 en todas las pistas de Sonatina por CC1; `Horns Low` ≤ 2,8 s por nota; golpes de `Demon`/`Demon Low` ≤ 0,3 s.
13. Recuento por bucle: Malachar `Finger Cymbals` 7 (c. 14, 16, 18, 38, 40, 42, 44), `Hand Bell` 5 (c. 16, 20, 22, 24, 26), `Pact Bells` 10
    (c. 4, 8, 12, 20, 24, 28, 40, 44, 48, 56), `Gong` 8 (61 en los c. 1, 5, 13, 21, 29, 49; 60 en los c. 37 y 43); Abaddon `Gong Full` 8
    (c. 1, 5, 13, 21, 29, 37, 43, 49), `Cymbal` 3 (c. 39, 41, 45). Ningún plato de choque en ninguna de las dos.

**Mezcla (informe de `mix.py`, una `MixSpec` por pista, medido sobre el MP3):**

14. Sonoridad integrada: **Malachar −17,3 ± 0,3 LUFS**, **Abaddon −16,3 ± 0,3 LUFS** (las dos dentro de −17 ± 1; Abaddon un punto por
    encima). Pico real **≤ −1 dBTP** en las dos.
15. `loop_samples` = **3 704 400** en las dos; `seam_jump` < 0,02.
16. Contrastes dentro de cada pista (`sections_lufs`): clímax c. 37–44 frente a B c. 21–28 entre **+5 y +9 LU** en Malachar y entre
    **+4 y +8 LU** en Abaddon; puente c. 35–36 frente a c. 29–30 al menos +2 LU.
17. Entre pistas: en cada sección de §3, Abaddon − Malachar entre **+0,5 y +3 LU**. Nunca más bajo Abaddon.
18. Bandas (`bands_db`), en las dos: `presencia 2.5-6k` ≤ **−18 dB**, `aire 6-16k` ≤ **−29 dB** (M) / **−28 dB** (A), `sub <60` ≤ −18 dB.
19. Ninguna parte suelta pasa de −6 dB de pico antes del bus. En Malachar, la suma de los coros (`Choir Low`, `Choir High`, `Choir High 2`,
    `Chant`) es la parte más fuerte del informe en A, A' y clímax (los coros mandan); en Abaddon, los coros siguen por encima de
    `Demon` en A y en el clímax.
20. Las dos `MixSpec` comparten sala (mismos `reverb` y `reverb_eq`) y la colocación de las pistas que existen en las dos; las capas
    comunes y los coros con el mismo `gain_db` y en buses idénticos (las capas comunes, sin compresor).
21. Sala: `wet_dry_lu` entre −8 y −5 en Abaddon y entre −7 y −4 en Malachar (el rito resuena más; el caos va más seco y cerca).
22. **Pruebas de cruce** (una sola dirección, como en el juego): `-cruce-a.mp3` = Malachar de 0 a 20,0 s (c. 14) y fundido lineal de
    1,6 s a Abaddon, que sigue hasta 40 s; `-cruce-b.mp3` = Malachar de 0 a 57,0 s (c. 39) y fundido a Abaddon hasta 75 s. En la
    sonoridad a corto plazo (3 s) no hay bache de más de 2 LU por debajo de Malachar en ese punto ni salto de más de +4 LU; a la escucha
    no hay *flam* ni ataques duplicados en el bombo, el tambor de marco, el timbal ni las voces, y el cambio se oye como «se rompe el
    rito», no como un corte.
23. Escucha: en Malachar se entienden los dos coros turnándose, la salmodia y el didgeridoo como suelo; no hay ningún agudo metálico
    estridente; en Abaddon se oye la misma canción desatada (metales graves, racimos, el coro que grita) sin llegar a ruido; los efectos del
    juego siguen claros en el c. 43 de las dos.

### `MixSpec` (las dos pistas)

```python
MixSpec(
    midi='scripts/musica/acto2-malachar-abaddon/build/acto2-malachar.mid',   # o acto2-abaddon.mid
    out='scripts/musica/acto2-malachar-abaddon/build/acto2-malachar.mp3',    # o acto2-abaddon.mp3
    bpm=160, beats_per_bar=4, bars=56,         # loop_samples = 56 × 4 × 60/160 × 44 100 = 3 704 400
    target_lufs=-17.3,                         # Abaddon: -16.3
    ceiling_dbtp=-1.0,
    reverb={'seconds': 2.2, 'predelay': 0.025, 'damping': 0.5},   # la del boceto (2,0 s) un poco más larga para el rito
    sections={'intro 1-4': (1, 4), 'A 5-12': (5, 12), "A' 13-20": (13, 20), 'B 21-28': (21, 28),
              'puente 29-30': (29, 30), 'puente 35-36': (35, 36), 'clímax 37-44': (37, 44), 'caída 45-48': (45, 48),
              'c43': (43, 43), 'codetta 49-56': (49, 56)},
    ...)
```

Buses de partida (los del boceto, `acto2_bocetos.py`): `choir` con −2 dB en 300 Hz y −3 dB en 3 kHz (los tres coros en el mismo bus, con
compresión suave en Malachar para que las voces empujen); `brass` (Abaddon) con paso alto 70 Hz, −2 dB en 300 Hz, −3 dB en 3 kHz y
compresión; `rhythm` (*ostinato*, cuchillos) con paso alto 45 Hz y −3 dB en 3,2 kHz; `drums` con paso alto 55 Hz, −6 dB en 46 Hz y −4 dB en
3,5 kHz; `organ` (M) con paso alto 30 Hz; `bells` con paso alto 300 Hz (1 kHz para los crótalos) y estantería −6 dB desde 6 kHz; `drone`
(didgeridoo, contrafagot, órgano de 16′) con paso alto 30 Hz y −3 dB en 120 Hz para que no tape el bombo.

**Integración (cuando el usuario lo apruebe):** copiar a `src/audio/cap2-e1-jefe.mp3` y `src/audio/cap2-e1-jefe-fase2.mp3` y añadir a
`MUSIC_TRACKS` (`src/fx/music-tracks.ts`), **con el mismo `group`** (es lo que activa `sameSong` y el cruce desde el mismo punto):
`'cap2-e1-jefe': { file: 'cap2-e1-jefe.mp3', loopSamples: 3704400, group: 'cap2-e1-jefe' }` y
`'cap2-e1-jefe-fase2': { file: 'cap2-e1-jefe-fase2.mp3', loopSamples: 3704400, group: 'cap2-e1-jefe' }`.
El `group` es distinto del del Templo (`cap2-e1`), aunque `loopSamples` coincida, para que el juego no cruce del combate normal al jefe.
