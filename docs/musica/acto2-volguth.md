# Brief: Acto II, jefe del escenario 0, Vol'guth, Señor de la Cripta — «Misa de la filacteria»

Combate de jefe de la Cripta. Id de juego: `cap2-e0-jefe`. Pista nueva en `scripts/musica/acto2-volguth/` con las
convenciones del [README del estudio](../../scripts/musica/estudio/README.md): `test_compose.py` (criterios 1–12 de
§8, escrito **antes** que `compose.py`), `compose.py` → `build/acto2-volguth.mid`, `mix.py` → `build/acto2-volguth.mp3`
y `build/acto2-volguth.report.json`. Necesita montado el disco **Base** (VCSL y Sonatina).

Fuentes: [direccion.md](direccion.md) (jefes: «temática mucho más oscura y ritmo frenético de batalla épica»;
leitmotiv 7 «Sombra»). Referencia de color aprobada: `boss_crypt()` en `scripts/musica/leitmotivs/acto2_bocetos.py` y
`build/acto2-jefe-cripta.mp3`: rito nigromántico a 144, el motivo en aumentación en coro grande y órgano, galope de
contrabajos en *spiccato*, trombones en *marcato* 3+3+2, timbales, bombo, redobles de tom, campana de cripta y golpe
metálico grave. Lo que este brief añade: forma, la **filacteria** como sección, armonía de verdad, el motivo en cinco
transformaciones y un único clímax. Escenario del que viene: [acto2-cripta.md](acto2-cripta.md) (la menor, ♩ = 72).

## 1. Función, emoción y repetición

- **Dónde suena:** solo en el combate contra Vol'guth, el liche. 178 PV, intenciones de maldición, drenaje de vida,
  lluvia de huesos y nova necrótica. **Filacteria:** la primera vez que muere, vuelve a la no-vida con 30 PV y desde
  entonces todos sus ataques drenan.
- **Emoción:** una **misa negra**. El coro grande y el órgano cantan «Sombra» como un himno lento mientras debajo todo
  galopa: contrabajos, trombones que martillean, timbales. Épico y tenso, con peso, nunca ruido. Es mucho más oscuro que
  la Cripta (que era una nana): aquí el que canta es el muerto.
- **La filacteria, dentro del bucle.** La pista es una sola (el juego no cambia de música cuando revive), así que cada
  vuelta cuenta la historia entera:
  - A y A' «El rito»: el himno.
  - B «La filacteria» (c. 21–28): un golpe de tutti y **la música muere**. Queda un latido de timbal, el aliento del
    contrafagot, una copa que brilla cada vez más (el alma en el frasco) y el órgano, que toca el motivo **al revés**:
    el tiempo vuelve atrás.
  - Puente «El despertar»: el latido se acelera hasta convertirse otra vez en galope; la cabeza del motivo sube por
    semitonos.
  - Clímax «La no-vida»: el motivo a velocidad real en los metales y la cadencia en aumentación del coro.
  - Codetta: el rito sigue como si nada.

  Si más adelante se quiere que la música reaccione a la resurrección, el motor ya admite una segunda versión
  (`cap2-e0-jefe-fase2` con `faseMusical`, como Abaddon). Este brief no la pide: la sección B ya cuenta la filacteria
  en cada vuelta.
- **Repetición:** 4–8 minutos por combate (3–5 vueltas de 93 s). Un solo clímax (c. 46), un respiro dramático (B) y la
  costura sin señal.
- **Transformación del leitmotiv** (§5): **aumentación ×2** (el himno, A y A'); **retrogradación en aumentación** (B: la
  filacteria deshace la muerte); **fragmento en secuencia ascendente por semitonos** (puente); el motivo a **velocidad
  real**, que frente al himno es una **disminución**, y su **secuencia a la subdominante** (clímax, metales); **cadencia
  en aumentación** con la apoyatura final Do → Si (clímax y A).

## 2. Tempo, métrica, tonalidad, duración

| Parámetro | Valor |
|---|---|
| Tempo | ♩ = 144, fijo (el del boceto) |
| Métrica | 4/4 |
| Tonalidad | **do menor** (eólico con sensible). Color: sexta alemana (A♭7), napolitano (D♭maj7), dominante con ♭9 y ♭13; el puente sube por tríadas menores paralelas (Cm, C#m, Dm, E♭m); el clímax visita **fa menor** (iv) |
| Compases | **56** |
| Duración del bucle | 56 × 4 × 60/144 = **93,333 s** → `loop_samples` = 224 × 18 375 = **4 116 000** a 44,1 kHz (cada compás son 73 500 muestras exactas) |
| `MixSpec` | `bpm=144`, `beats_per_bar=4`, `bars=56` |

Compás = 1,667 s; negra = 0,417 s; corchea = 0,208 s. Inicio del compás *n* = (*n* − 1) × 1,667 s.

**Figuras:** la más rápida es la **corchea** (galope, golpes 3+3+2, redobles de tom, el motivo de los metales en
c. 37–44, el «dub» del latido). **Nada de semicorcheas**: a 144 suenan a máquina. El redoble continuo es el sample de
redoble del bombo (nota 63) y el de timbal (`TimpaniRolls`).

**Notación:** q = negra, e = corchea, h = blanca, h. = blanca con puntillo, w = redonda, «breve» = dos redondas
ligadas; t1…t4 = tiempos. **Rejilla de corcheas** del compás: 0–7. **Golpes 3+3+2** en las corcheas **0, 3 y 6**
(t1, «2 y», t4).

## 3. Forma compás a compás e intensidad

| Sección | Compases | Tiempo (s) | Contenido | Intensidad |
|---|---|---|---|---|
| Intro «La campana» | 1–4 | 0,00–6,67 | Campana y gong; pedal de órgano; el galope arranca en el c. 1; trombones 3+3+2 sobre D♭/C → G7(♭9) | 6 → 7 |
| A «El rito» | 5–12 | 6,67–20,00 | **El himno**: motivo en aumentación ×2 en coro grande + órgano al unísono; galope, golpes, timbales; apoyatura Do → Si sobre la dominante | 7 |
| A' «La congregación» | 13–20 | 20,00–33,33 | El himno otra vez, **rearmonizado** sobre un bajo que sube (C D E♭) y cae a la dominante; trompas al unísono con el coro; tuba en los golpes | 8 |
| B «La filacteria» | 21–28 | 33,33–46,67 | **Golpe de tutti en el t1 del c. 21 y silencio**: latido de timbal, contrafagot, copa que crece, coro en susurro; el órgano (Gedact) toca el motivo **retrogradado** en aumentación | 3 (mínimo) → 4 |
| Puente «El despertar» | 29–36 | 46,67–60,00 | El latido se acelera (1 → 2 → 4 por compás → galope en el c. 33); la **cabeza** sube por semitonos en trompas y trombones; el coro abre arriba; redoble | 5 → 9 |
| Clímax «La no-vida» | 37–48 | 60,00–80,00 | El motivo **a velocidad real** en trompas + trombones (37–40) y en fa menor (41–44), con el coro gritando los golpes; **cadencia en aumentación** del coro (45–48); **clímax en el t1 del c. 46** (75,00 s) | 9 → **10** (c. 46) → 8 |
| Codetta «El rito sigue» | 49–56 | 80,00–93,33 | El órgano solo con la primera mitad del himno (49–52); después la textura de la intro (53–56), que encadena con el c. 1 | 7 → 6 |

Respiros: toda B (c. 21 t2 → c. 28), el t4 del c. 44 (los metales sueltan antes de la cadencia) y los t3–4 del c. 48.

## 4. Armonía

Cifrado por compás; «(1–2) / (3–4)» = cambio en el t3. Entre corchetes, el bajo real (contrabajo del galope) en MIDI.
La nota del pedal de órgano es la misma clase de altura, en 36–47 (el registro de 16′ suena una octava más grave).

**Intro (1–4)**: pedal de do; napolitano sobre el pedal y dominante.

| 1 | 2 | 3 | 4 |
|---|---|---|---|
| Cm | Cm | **D♭/C** (♭II sobre pedal) | G7(♭9) |

[C1 C1 C1 G1] (24 24 24 31)

**A (5–12)**: la armonización del himno. **A♭7** es la sexta aumentada alemana (La♭–Do–Mi♭–Fa♯): el Fa♯ de la melodía
es su sexta aumentada y resuelve con el La♭ en el Sol de la dominante. **Napolitano** (D♭maj7) en el c. 11 bajo la Do
larga de la melodía, que se vuelve apoyatura (Do → Si) sobre G7(♭9).

| 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|
| Cm | **A♭7** (Al+6) | G7(♭13) | G7 | Cm | A♭maj7 | **D♭maj7** (N) | G7sus4 (1–2) / G7(♭9) (3–4) |

[C2 · A♭1 · G1 · G1 · C2 · A♭1 · D♭2 · G1] (36 32 31 31 36 32 37 31)

**A' (13–20)**: el mismo himno sobre otro camino: el bajo **sube** Do – Re – Mi♭ (V/V en el c. 14) y cae por la sensible
al VI, al iv con novena y al ii semidisminuido.

| 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|---|
| Cm(add9) | **D7** (V/V) | E♭maj7 | G7/B | A♭maj7 | Fm9 | Dø7 | G7sus4 (1–2) / G7(♭9) (3–4) |

[C2 · D2 · E♭2 · B1 · A♭1 · F1 · D2 · G1] (36 38 39 35 32 29 38 31)

**B «La filacteria» (21–28)**: pedal de do en los c. 21–24; después la sensible en el bajo y la sexta alemana que vuelve
a la dominante (todo en *pp*).

| 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 |
|---|---|---|---|---|---|---|---|
| Cm (golpe) | Cm | Fm(add9)/C | Cm | G7/B | G7(♭13) | **A♭7** (Al+6) | G7sus4 (1–2) / G7 (3–4) |

[C1 · C1 · C1 · C1 · B1 · G1 · A♭1 · G1] (24 24 24 24 35 31 32 31); en B el bajo lo llevan el pedal y el contrafagot (no hay galope).

**Puente «El despertar» (29–36)**: tríadas menores paralelas que suben por semitonos (cada una con su ♭II en la segunda
mitad del compás par) y, tras E♭m, la dominante con ♭9 para caer en do.

| 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 |
|---|---|---|---|---|---|---|---|
| Cm | Cm (1–2) / D♭/C (3–4) | C#m | C#m (1–2) / D/C# (3–4) | Dm | Dm (1–2) / E♭/D (3–4) | E♭m | G7(♭9) |

[C2 · C2 D♭2 · C#2 · C#2 D2 · D2 · D2 E♭2 · E♭2 · G1] (36 · 36 37 · 37 · 37 38 · 38 · 38 39 · 39 · 31)

**Clímax (37–48)**: el motivo a velocidad real con la armonización canónica (dos acordes por compás) en do (37–40) y en fa
menor (41–44, con **D♭7** como sexta alemana de fa y **G♭** como su napolitano); el C7 del c. 40 es V/iv. Cadencia final en
aumentación con **A♭maj7** en el clímax.

| 37 | 38 | 39 | 40 | 41 | 42 |
|---|---|---|---|---|---|
| Cm (1–2) / A♭7 (3–4) | G7(♭13) (1–2) / G7 (3–4) | Cm (1–2) / D♭ (3) / G7 (4) | Cm (1–2) / **C7** (3–4) | Fm (1–2) / **D♭7** (Al+6 de fa) (3–4) | C7(♭13) (1–2) / C7 (3–4) |

| 43 | 44 | 45 | 46 | 47 | 48 |
|---|---|---|---|---|---|
| Fm (1–2) / **G♭** (N de fa) (3) / C7 (4) | Fm (1–2) / G7(♭9) (3–4) | Cm | **A♭maj7** (clímax) (1–2) / G7(♭9) (3–4) | Cm (1–2) / Cm/B♭ (3–4) | A♭maj7 (1–2) / G7(♭9) (3–4) |

[C2 A♭1 · G1 · C2 D♭2 G1 · C2 C2 · F1 D♭2 · C2 · F1 G♭1 C2 · F1 G1 · C2 · A♭1 G1 · C2 B♭1 · A♭1 G1]

**Codetta (49–56)**: la primera mitad de A y, después, la intro (la costura 56 → 1 es la misma que 4 → 5).

| 49 | 50 | 51 | 52 | 53 | 54 | 55 | 56 |
|---|---|---|---|---|---|---|---|
| Cm | A♭7 | G7(♭13) | G7 | Cm | Cm | D♭/C | G7(♭9) |

## 5. Leitmotiv

Referencia «Sombra» (re), ritmo de `demos.py`: `| D E F G# A | F E C# | D F A B♭ A | D |`, `| e e q q. e | q q h | e e q q q | w |`.

**Versión de esta pista: «el himno»**, en do menor, en **aumentación ×2** (e → q, q → h, q. → h., h → w, w → breve) a
la altura de C4. La breve final se convierte en **Do (w + h) → Si (h)**: apoyatura sobre la dominante.

```
| C4 D4 E♭4 | F#4  G4 | E♭4 D4 | B3 | C4 E♭4 G4 | A♭4 G4 | C4 | C4  B3 |
| q  q  h   | h.   q  | h   h  | w  | q  q   h  | h   h  | w  | h   h  |
  60 62 63    66   67   63  62   59   60 63  67   68  67   60   60  59
```

| Compases | Instrumento | Notas (MIDI) y ritmo | Transformación |
|---|---|---|---|
| **5–12** | **`Choir`** + **`Organ 8`/`Organ Stopped`** al unísono | El himno (59–68) | **Aumentación ×2**: la misa. El salto del coro de voces masculinas (≤ F#4) a femeninas (G4–A♭4) en los c. 6, 9 y 10 es intencionado: las notas altas del rito se abren. |
| 13–20 | `Choir` + `Horns` + `Organ 8`/`Organ Stopped` al unísono | El himno (59–68) | **Rearmonizado** sobre el bajo que sube; las trompas engordan la voz. |
| **21–28** | **`Organ Gedact`** | C4 (breve) · G4 (h) A♭4 (h) · G4 (h) E♭4 (q) C4 (q) · B3 (w) · D4 (h) E♭4 (h) · G4 (q) F#4 (h.) · E♭4 (h) D4 (q) C4 (q) (60 · 67 68 · 67 63 60 · 59 · 62 63 · 67 66 · 63 62 60) | **Retrogradación** (notas y ritmo al revés) en aumentación ×2: el tiempo vuelve atrás y la muerte se deshace. Empieza en el t2 del c. 21, después del golpe. |
| 29–36 | `Horns Marc` + `Trombones Marc` 8vb | C4 D4 E♭4 F#4 (q q q q) · G4 (w) · C#4 D#4 E4 G4 · G#4 (w) · D4 E4 F4 G#4 · A4 (w) · E♭4 F4 G♭4 A4 · A♭4 (h) B4 (h) (60 62 63 66 · 67 · 61 63 64 67 · 68 · 62 64 65 68 · 69 · 63 65 66 69 · 68 71) | **Fragmento** (cabeza 1 2 ♭3 #4 → 5) en negras, **secuenciado por semitonos**: despierta. El B4 del c. 36 es la sensible que abre el clímax. |
| **37–40** | **`Horns Marc`** + `Trombones Marc` 8vb | C4 D4 E♭4 F#4 G4 · E♭4 D4 B3 · C4 E♭4 G4 A♭4 G4 · C4 (w) (60 62 63 66 67 · 63 62 59 · 60 63 67 68 67 · 60), ritmo original | El motivo **a velocidad real**: frente al himno, una **disminución**. Es lo que la no-vida le hace al rito. |
| 41–44 | `Horns Marc` + `Trombones Marc` 8vb | F4 G4 A♭4 B4 C5 · A♭4 G4 E4 · F4 A♭4 C5 D♭5 C5 · F4 (h.) (65 67 68 71 72 · 68 67 64 · 65 68 72 73 72 · 65) | **Secuencia a la subdominante** (fa menor). D♭5 (73) es la nota más alta de los metales. |
| **45–48** | **`Choir`** + `Horns` 8vb + `Organ 8` al unísono con el coro | C5 (q) E♭5 (q) G5 (h) · **A♭5 (h)** G5 (h) · C5 (w) · C5 (h) B4 (h) (72 75 79 · **80** 79 · 72 · 72 71) | **Cadencia en aumentación** (los dos últimos compases del motivo) una octava arriba, en voces femeninas. **A♭5 del c. 46 es la nota más alta de la pista y el clímax.** |
| 49–52 | `Organ 8` + `Organ Stopped` | La primera mitad del himno (60 62 63 · 66 67 · 63 62 · 59) | El himno sin coro: el rito sigue. |

## 6. Orquestación por sección

Registros en MIDI (C4 = 60). Capas = pistas con notas sonando a la vez.

### Patches

`…/` = `sso/Sonatina Symphonic Orchestra/`.

| Pista | Ruta `.sfz` | Dinámica | Duración máx. por nota |
|---|---|---|---|
| `Choir` | `…/Chorus - Performance/Large Chorus.sfz` (3 samples por nota: coro grande) | **CC1** | sin límite (con bucle) |
| `Choir Whisper` | `…/Chorus - Performance/Mixed Chorus.sfz` | **CC1** | sin límite |
| `Organ Pedal` | `…/Organ/Pedal - Bourdon 16ft.sfz` (C2–E4, suena una octava más grave) | velocidad | sin límite (con bucle) |
| `Organ Violon` | `…/Organ/Pedal - Violon 16ft.sfz` | velocidad | sin límite |
| `Organ 8` + `Organ Stopped` | `…/Organ/Great - Open Diapason 8ft.sfz` + `…/Organ/Great - Stopped Diapason 8ft.sfz` (las mismas notas en las dos pistas: registración 8′ abierto + 8′ tapado) | velocidad | sin límite |
| `Organ Gedact` | `…/Organ/Swell - Gedact 8ft.sfz` | **CC1** | sin límite |
| `Horns Marc` / `Horns` | `…/Brass - Performance/Horns Marcato.sfz` / `Horns Sustain.sfz` | **CC1** | **≤ 2,8 s** |
| `Trombones Marc` | `…/Brass - Performance/Trombones Marcato.sfz` | **CC1** | **≤ 2,2 s** |
| `Tuba Marc` | `…/Brass - Performance/Tuba Marcato.sfz` (E1–D4) | **CC1** | golpes ≤ 0,4 s |
| `Celli Trem` | `…/Strings - Performance/Celli Tremolo.sfz` | **CC1** | sin límite (con bucle) |
| `Contrabassoon` | `…/Woodwinds - Performance/Contrabassoon Solo Sustain (looped).sfz` | **CC1** | sin límite |
| `Gallop` / `Gallop 8va` | `VSCO-2-CE/ContrabassSpic.sfz` / `VSCO-2-CE/CelloEnsSpic.sfz` | velocidad | — |
| `Timpani` / `Timp Roll` | `VSCO-2-CE/Timpani.sfz` / `VSCO-2-CE/TimpaniRolls.sfz` | velocidad (+ CC11 en el redoble) | redoble ≤ 16 s |
| `Bass Drum` | `VCSL/Membranophones/Struck Membranophones/Bass Drum 2.sfz` (62 = golpe, 63 = redoble) | velocidad | — |
| `Tom` | `VCSL/Membranophones/Struck Membranophones/Tom 2.sfz` (62 = golpe con maza) | velocidad | — |
| `Bell` | `VCSL/Idiophones/Struck Idiophones/Tubular Bells 1.sfz` (C4 = 60, F4 = 65, G4 = 67) | velocidad | — |
| `Gong` | `VCSL/Idiophones/Struck Idiophones/Gong 1.sfz` (60 = golpe pleno por capas de velocidad; 61 = golpe oscuro) | velocidad | — |
| `Glass` | `VCSL/Idiophones/Friction Idiophones/Wine Glasses - Slow.sfz`, **solo la nota 75** (E♭5) | velocidad + CC11 | ≤ 20 s |

**Órgano: registros sueltos.** No usar `Organ All Stops` (mudo hasta abrir CC16–29) ni `Organ Combinations`/`Single
Stops` (KS). Fuera también `Great - Principal 4ft` (medido: −29 dB en 2,5–6 kHz, el más brillante de los usados por el
boceto): el órgano de esta pista es 16′ + 8′ (pedal Bourdon, Violon en el clímax, Open Diapason 8′ −47 dB, Stopped
Diapason 8′ −56 dB, Gedact 8′ −74 dB).

**Sonatina por CC1** (`Choir`, `Choir Whisper`, `Organ Gedact`, `Horns Marc`, `Horns`, `Trombones Marc`, `Tuba Marc`,
`Celli Trem`, `Contrabassoon`): curva de CC1 obligatoria con un punto en el tick 0; como mucho un punto cada corchea.
Los registros de órgano por velocidad, sin CC1.

**Galope** (`Gallop`, y `Gallop 8va` una octava arriba donde se indique; el patrón del boceto): 8 corcheas por compás;
altura = fundamental del bajo de §4 en la octava indicada, salvo las corcheas **2 y 6**, una octava arriba; velocidad
**96 en las corcheas pares y 72 en las impares** (±4 de humanización, ±8 ms). Sigue los cambios de acorde por medio
compás. Ninguna racha de más de 3 corcheas con la misma altura y velocidad (±3).

**Golpes 3+3+2** (`Trombones Marc`, y `Tuba Marc` donde se indique): en las corcheas 0, 3 y 6, notas de 0,35 tiempos.
Trombones: fundamental + tercera del acorde en 43–56 (p. ej. C3 + E♭3 = 48 51 en Cm; G2 + B2 = 43 47 en G7). Tuba:
fundamental en 28–43.

**Latido** (`Timpani`): «lub» en el tiempo y «dub» una corchea después, más suave (vel. «dub» = «lub» − 18).

### Intro «La campana» (1–4): máximo 9 capas

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| Campana | `Bell` | C4 (60), t1 del c. 1 | vel. 84. |
| Gong | `Gong` | 60, t1 del c. 1 | vel. 70. |
| Pedal | `Organ Pedal` | C2 (36) c. 1–3 · G2 (43) c. 4 | vel. 76, tenido. |
| Galope | `Gallop` | Fundamental en la octava 1 (C1 = 24; G1 = 31 en el c. 4) | Desde el t1 del c. 1, *mf*. |
| Trémolo | `Celli Trem` | c. 3: D♭2 A♭2 (37 44) · c. 4: G2 D3 (43 50) | CC1 60 → 85. |
| Golpes | `Trombones Marc` | c. 3: D♭3 F3 (49 53) · c. 4: G2 B2 (43 47) | 3+3+2; CC1 90 → 100. |
| Timbal | `Timpani` | C2 (36) en t1 y G2 (43) en «3 y» (corchea 5) en los c. 1–3; G2 en t1 del c. 4 | vel. 90 / 74. |
| Bombo | `Bass Drum` | 62 en t1 de cada compás | vel. 80. |
| Redoble | `Tom` | c. 4: 8 corcheas crescendo | vel. 70 → 98. |

### A «El rito» (5–12): máximo 11 capas

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía** | `Choir` | §5 (59–68) | Legato «Ah»; CC1 84 → **100 (c. 9)** → 90. Cada nota nueva con un pequeño apoyo de CC1 (+4 durante una corchea). |
| **Melodía (unísono)** | `Organ 8` + `Organ Stopped` | §5 (59–68) | vel. 80 / 70. Unísono declarado (en el boceto iba 8vb; aquí al unísono para dejar libre la octava de los golpes). |
| Pedal | `Organ Pedal` | C2 A♭2 G2 G2 C2 A♭2 D♭2 G2 (36 44 43 43 36 44 37 43) | vel. 78. |
| Galope | `Gallop` | Bajo de §4 en la octava 1–2 (24–37) | *mf*–*f* (patrón de §6). |
| Trémolo | `Celli Trem` | Fundamental + quinta en la octava 2 (36–50) | CC1 70 → 95 → 80. |
| Golpes | `Trombones Marc` | 3+3+2, 43–56 | CC1 96 → 106. |
| Timbal | `Timpani` | Fundamental en t1 (36–44) y quinta en «3 y» | vel. 92 / 76. |
| Bombo | `Bass Drum` | 62 en t1 | vel. 86. |
| Redoble | `Tom` | c. 8 y c. 12: 8 corcheas crescendo | vel. 70 → 96. |
| Campana | `Bell` | C4 (60) en el t1 del c. 5 · G4 (67) en el t1 del c. 9 | vel. 80 / 72. Unísono con la primera nota del coro en el c. 5 (declarado). |

### A' «La congregación» (13–20): máximo 13 capas

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía** | `Choir` + `Horns` + `Organ 8`/`Organ Stopped` | §5 (59–68), unísono declarado | Coro CC1 90 → **104 (c. 17)** → 94; trompas CC1 86 → 100 → 90 (reataque en cada nota; las redondas de 1,67 s caben). |
| Pedal | `Organ Pedal` | C2 D2 E♭2 B2 A♭2 F2 D2 G2 (36 38 39 47 44 41 38 43) | vel. 80. |
| Galope | `Gallop` | Bajo de §4 (24–39) | *f*. |
| Trémolo | `Celli Trem` | Fundamental + quinta en la octava 2 | CC1 80 → 100. |
| Golpes | `Trombones Marc` + `Tuba Marc` | 3+3+2; trombones 43–56, tuba fundamental 28–43 | CC1 100 → 108. |
| Timbal | `Timpani` | Como en A | vel. 94 / 78. |
| Bombo | `Bass Drum` | 62 en t1 y en «2 y» (corchea 3) | vel. 88 / 72. |
| Redoble | `Tom` | c. 16 y c. 20 | vel. 72 → 100. |
| Campana | `Bell` | C4 (60), t1 del c. 13 | vel. 84. |

### B «La filacteria» (21–28): máximo 8 capas

**El golpe** (t1 del c. 21, negra): `Choir` C4 E♭4 G4 (60 63 67, CC1 105), `Trombones Marc` C3 G3 (48 55), `Tuba Marc`
C2 (36), `Timpani` C2 (vel. 100), `Bass Drum` 62 (vel. 96), `Gong` 60 (vel. 96), `Organ Pedal` C2. Desde el t2 del
c. 21 hasta el final del c. 28 **solo suenan** las pistas de esta tabla:

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía (retrógrado)** | `Organ Gedact` | §5 (59–68), desde el t2 del c. 21 | CC1 58 → 70 (c. 25) → 62. Lejano. |
| Pedal | `Organ Pedal` | C2 (36) del t2 del c. 21 al c. 24 · B2 (47) · G2 (43) · A♭2 (44) · G2 (43) | vel. 58. |
| Aliento | `Contrabassoon` | C1 (24) c. 21–24 · B0 (23) · G1 (31) · A♭1 (32) · G1 (31) | CC1 48 → 64 → 55: respira (un swell de CC1 por compás, ±6). |
| Latido | `Timpani` | Un «lub-dub» por compás en el t1: C2 (36) en los c. 22–24 · G2 (43) en los c. 25–26 · A♭2 (44) en el c. 27 · G2 (43) en el c. 28 | «lub» vel. 62, «dub» 44. |
| Latido sordo | `Bass Drum` | 62 con cada «lub» | vel. 38. |
| El alma | `Glass` | **E♭5 (75)**, del t1 del c. 22 (adelantada 150 ms) al t4 del c. 28 | vel. 34; CC11 40 % → 100 %: la filacteria brilla cada vez más. |
| Susurro | `Choir Whisper` | C3 G3 (48 55) c. 21–24 (desde el t2 del 21) · B2 F3 (47 53) c. 25 · B2 F3 (47 53) c. 26 · C3 F#3 (48 54) c. 27 · B2 F3 (47 53) c. 28 | CC1 40 → 52. Voces graves en boca cerrada. |
| Campana | `Bell` | C4 (60), t1 del c. 23 | vel. 52: el toque de difuntos, en el silencio. |

### Puente «El despertar» (29–36): máximo 11 capas

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía** | `Horns Marc` | §5 (60–71) | CC1 84 → **108 (c. 35)**. |
| **Melodía 8vb** | `Trombones Marc` | 48–59 | CC1 80 → 104. Doblaje declarado. |
| Coro que abre | `Choir` (voces femeninas) | c. 29–30: C5 E♭5 G5 (72 75 79) · c. 31–32: C#5 E5 G#5 (73 76 80) · c. 33–34: D5 F5 A5 (74 77 81) · c. 35: B♭4 E♭5 G♭5 (70 75 78) · c. 36: B4 D5 F5 (71 74 77) | Redondas (una por compás, reataque en cada compás); CC1 70 → 105. Siempre por encima de las trompas. |
| Latido → galope | `Timpani` (29–32) → `Gallop` (33–36) | c. 29–30: dos «lub-dub» por compás (t1 y t3), fundamental (36/37) · c. 31–32: «lub» en cada tiempo (37/38) · c. 33–36: galope en la octava 1–2 | Timbal vel. 70 → 86; galope *f*. |
| Pedal | `Organ Pedal` | C2 · C2 D♭2 · C#2 · C#2 D2 · D2 · D2 E♭2 · E♭2 · G2 (36 · 36 37 · 37 · 37 38 · 38 · 38 39 · 39 · 43) | vel. 80. |
| Trémolo | `Celli Trem` | Fundamental + quinta en la octava 2 | CC1 60 → 100. |
| Redoble de timbal | `Timp Roll` | E♭2 (39) en el c. 35 → G2 (43) en el c. 36 | *p* → *f* (CC11 30 % → 100 %); corta en el t1 del c. 37. |
| Bombo | `Bass Drum` | 62 en t1 de los c. 33–35; **63 (redoble)** en el c. 36 | vel. 80 → 96. |
| Redoble | `Tom` | c. 32 y c. 34: 8 corcheas · c. 36: corcheas en t3–4 | vel. 72 → 100. |

### Clímax «La no-vida» (37–48): máximo 14 capas

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía 37–44** | `Horns Marc` + `Trombones Marc` 8vb | §5: trompas 59–73, trombones 47–61 | CC1 100 → 108; cada corchea con ataque, sin legato. Sueltan en el t4 del c. 44. |
| Gritos | `Choir` (voces femeninas) | **c. 37–44: el acorde de cada medio compás en corcheas sobre los golpes 3+3+2** (corcheas 0, 3, 6), voces entre G4 y A♭5 (67–80): p. ej. c. 37: C5 E♭5 G5 (72 75 79) / C5 E♭5 F#5 (72 75 78); c. 41: C5 F5 A♭5 (72 77 80) / B4 F5 A♭5 (71 77 80) | CC1 100 → 106. Notas cortas (corchea): el coro grita los golpes en lugar de tener notas largas en la octava de los metales. |
| **Melodía 45–48** | `Choir` + `Organ 8` al unísono | §5 (71–80) | CC1 100 → **110 (t1 del c. 46)** → 95. Suelta en el t3 del c. 48. |
| Melodía 8vb | `Horns` | 59–68 (c. 45–48) | CC1 95 → **108 (c. 46)** → 90. Notas ≤ 2,8 s: la C4 de c. 47 (w, 1,67 s) cabe. |
| Golpes | `Trombones Marc` (solo 45–48) + `Tuba Marc` (37–48) | 3+3+2 | CC1 100 → 110 (c. 46). |
| Pedal | `Organ Pedal` + `Organ Violon` | Bajo de §4 en 36–47 | vel. 84 / 70. |
| Galope | `Gallop` + `Gallop 8va` | Octava 1–2 y octava 2–3 (24–55) | *f*. |
| Timbal | `Timpani` | Fundamental en t1, quinta en «3 y» | vel. 94; **c. 46 vel. 104**. |
| Bombo | `Bass Drum` | 62 en las corcheas 0, 3 y 6 (los golpes) | vel. 86–100; c. 46 el más fuerte. |
| Redoble | `Tom` | c. 40, c. 44 (t3–4) y c. 48 (t1–2) | vel. 74 → 100. |
| Campana | `Bell` | C4 (60) t1 del c. 37 · F4 (65) t1 del c. 41 · C4 t1 del c. 45 | vel. 90 / 86 / 94. |
| Gong | `Gong` | 60 en el t1 del c. 37 (vel. 90) y del **c. 46** (vel. 100) | — |

### Codetta «El rito sigue» (49–56): máximo 9 capas

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Himno** | `Organ 8` + `Organ Stopped` | §5 (59–67), c. 49–52 | vel. 78 / 68. |
| Pedal | `Organ Pedal` | C2 A♭2 G2 G2 · C2 C2 C2 G2 (36 44 43 43 · 36 36 36 43) | vel. 76. |
| Galope | `Gallop` | Octava 1–2 | *mf*: **la misma figura con la que arranca el c. 1**. |
| Campana | `Bell` | C4 (60), t1 del c. 49 | vel. 70. |
| Trémolo | `Celli Trem` | c. 55: D♭2 A♭2 · c. 56: G2 D3 (como c. 3–4) | CC1 60 → 85. |
| Golpes | `Trombones Marc` | c. 55–56, como en c. 3–4 | CC1 90 → 100. |
| Timbal | `Timpani` | Como en la intro | vel. 86 / 70. |
| Bombo | `Bass Drum` | 62 en t1 | vel. 78. |
| Redoble | `Tom` | c. 52 y c. 56: 8 corcheas crescendo (c. 56 = c. 4) | vel. 70 → 98. |

### Notas sobre los samples

- **Sin agudos que piquen:** ni trompetas, ni violines, ni platos, ni tam-tam (el de Sonatina mide −7,6 dB en
  2,5–6 kHz; el `Gong 1` 60 −22 dB y el 61 −46 dB), ni Principal 4′, ni piccolo. El brillo del clímax lo dan las
  trompas en *marcato* (sus samples miden −53 dB en 2,5–6 kHz) y el coro.
- **`Large Chorus`** dispara 3 samples por nota (vecinos de ±1 semitono): es el coro grande del boceto. Por debajo de G4,
  voces masculinas; desde G4, femeninas (en F#4–G4 se mezclan). Techo del coro: A5 (81) en el puente, A♭5 (80) en el clímax.
- **`Organ Pedal`** empieza en C2 (36): por eso las fundamentales graves (A♭1, G1, D♭2) se escriben una octava arriba
  (el 16′ ya suena una octava más grave). `Tuba Marc` empieza en E1 (28): nada de C1 en la tuba.
- **`Contrabassoon`** con bucle (el sin bucle dura 2 s): B0 (23) está dentro de su rango (22–58).
- **`Glass`**: la nota 75 es su sample sin transponer (25 s); ataque lento, adelantar 150 ms.
- **Galope**: `ContrabassSpic` tiene 3 capas y round robin aleatorio; a 144 las corcheas (0,21 s) se oyen como galope si
  se respetan los acentos y la octava de las corcheas 2 y 6. `Gallop 8va` (`CelloEnsSpic`) solo en el clímax.
- No usar ningún `KS`. No cambiar de patch en mitad de una nota tenida.

## 7. Dinámica

| Nivel | pp | p | mp | mf | f |
|---|---|---|---|---|---|
| Velocidad | 25–40 | 40–55 | 55–70 | 70–85 | 85–105 |
| CC1 (Sonatina) | 40–55 | 55–70 | 70–85 | 85–100 | 100–112 |

Prohibido: velocidad > 105 y CC1 > 112. En B (desde el t2 del c. 21), velocidad ≤ 62 y CC1 ≤ 72.

| Sección | Nivel | Gestos |
|---|---|---|
| Intro 1–4 | mf → f | Crescendo de trémolo y golpes en los c. 3–4; redoble de tom en el c. 4. |
| A 5–12 | f | Un arco de CC1 en el coro con cumbre en el c. 9. |
| A' 13–20 | f → f+ (c. 17) → f | La tuba entra en los golpes; la cumbre del coro en el c. 17. |
| B 21–28 | golpe ff-contenido (vel. ≤ 100) → **pp** → p | La copa crece (CC11) durante toda la sección; el contrafagot respira. |
| Puente 29–36 | p → f | Crescendo continuo de 8 compases; el latido se acelera; redobles en el c. 36. |
| Clímax 37–48 | f → **f+ (c. 46)** → f | Pico en el t1 del c. 46 (coro, trompas, timbal, gong); desde ahí, diminuendo hacia el c. 49. |
| Codetta 49–56 | mf → f (c. 55–56) | El órgano solo baja la tensión; los c. 55–56 la vuelven a subir como en la intro. |

## 8. Criterios de aceptación

**Partitura (`test_compose.py`, leyendo `build/acto2-volguth.mid`):**

1. 56 compases de 4/4 a ♩ = 144 sin cambios de tempo; ninguna nota empieza antes del tick 0 ni después de 93,333 s y todo
   lo del c. 56 termina antes.
2. Todas las notas dentro del rango del catálogo de su patch y de los registros de §6. Techos y suelos: `Choir` 47–81
   (≤ 68 en A y A'; 67–81 en el puente y el clímax), `Horns Marc`/`Horns` 59–73, `Trombones Marc` 43–61, `Tuba Marc` 28–43,
   `Organ Pedal` 36–47, `Organ 8`/`Organ Stopped` 59–80, `Organ Gedact` 59–68, `Gallop` 24–43, `Gallop 8va` 36–55,
   `Celli Trem` 36–50, `Contrabassoon` 23–32, `Timpani` 36–44, `Bell` 60–67, `Glass` = 75.
3. El leitmotiv aparece con las alturas y figuras exactas de §5 en los c. 5–12, 13–20, 21–28, 29–36, 37–40, 41–44, 45–48 y
   49–52.
4. Figuras: ninguna más corta que la corchea en ninguna pista; ninguna semicorchea.
5. Capas simultáneas por sección ≤ 9 / 11 / 13 / 8 / 11 / 14 / 9 (intro / A / A' / B / puente / clímax / codetta).
   `Organ 8` y `Organ Stopped` cuentan como dos pistas; las notas de `Bell` y `Gong` se escriben de una negra.
6. **Sin choques de registro:** mientras suena una melodía de §5, ninguna otra pista mantiene notas de negra o más en la
   misma octava con velocidad (o CC1) ≥ la de la melodía. Unísonos y doblajes declarados: coro + órgano (5–20, 45–48),
   coro + trompas (13–20), trompas + trombones 8vb (29–44), trompas 8vb (45–48), la campana del c. 5. Los gritos del coro en
   37–44 son corcheas (no cuentan como notas tenidas).
7. **La filacteria:** entre el t2 del c. 21 y el final del c. 28 solo hay notas en `Organ Gedact`, `Organ Pedal`,
   `Contrabassoon`, `Timpani`, `Bass Drum`, `Glass`, `Choir Whisper` y `Bell` (un toque, c. 23); ninguna velocidad > 62 ni
   CC1 > 72.
8. Ninguna velocidad > 105 ni CC1 > 112. El c. 46 tiene el CC1 más alto de `Choir` y `Horns` y la velocidad más alta de
   `Timpani`, `Bass Drum` y `Gong`.
9. Cada pista de Sonatina por CC1 tiene CC1 en el tick 0; duraciones: `Horns Marc`/`Horns` ≤ 2,8 s, `Trombones Marc` ≤ 2,2 s,
   `Tuba Marc` ≤ 0,4 s, `Glass` ≤ 20 s.
10. Ritmo: galope con el patrón de §6 (octava en las corcheas 2 y 6, acentos en las pares) en todos los compases con
    `Gallop`; golpes 3+3+2 solo en las corcheas 0, 3 y 6; el latido de B y del puente con el número de «lub» por compás de §6
    (1 en 22–28, 2 en 29–30, 4 en 31–32).
11. Recuento por bucle: `Bell` 9 (c. 1, 5, 9, 13, 23, 37, 41, 45, 49), `Gong` 4 (c. 1, 21, 37, 46), `Glass` 1; ninguna pista con
    trompetas, violines, platos, tam-tam, `Organ All Stops` ni `Principal 4ft`.
12. **Armonía:** la nota más grave en el t1 y el t3 de cada compás tiene la clase de altura del bajo de §4.

**Mezcla (informe de `mix.py`, medido sobre el MP3 decodificado):**

13. Sonoridad integrada **−16,5 ± 0,5 LUFS**; pico real **≤ −1 dBTP**.
14. `loop_samples` = **4 116 000**; `seam_jump` < 0,02.
15. Contrastes (`sections_lufs`): clímax c. 45–48 frente a B c. 22–28 entre **+9 y +15 LU**; B c. 22–28 entre **−30 y −23
    LUFS** (la muerte se oye bajo los efectos, no desaparece); puente c. 35–36 frente a c. 29–30 al menos **+4 LU**; clímax
    c. 45–48 frente a A c. 5–12 entre **+1,5 y +4 LU**.
16. Bandas (`bands_db`): `presencia 2.5-6k` ≤ **−18 dB**, `aire 6-16k` ≤ **−30 dB**, `sub <60` ≤ **−17 dB** (órgano de 16′ y
    galope: el grave es parte del carácter, pero no puede tapar los golpes del juego).
17. Ninguna parte suelta pasa de −6 dB de pico antes del bus; el golpe del c. 21 no hace trabajar al limitador del máster más
    de 3 dB.
18. Sala: `wet_dry_lu` entre −7 y −4 (una iglesia excavada en la roca, pero el galope tiene que ser nítido).
19. Escucha: en los c. 5–8 se reconoce «Sombra» lento, como himno; el golpe del c. 21 suena a que el liche cae y el silencio
    con latido se entiende como intención; la copa de B se oye crecer; el despertar se nota subir; en el c. 46 los efectos
    del juego siguen claros.

### `MixSpec`

```python
MixSpec(
    midi='scripts/musica/acto2-volguth/build/acto2-volguth.mid',
    out='scripts/musica/acto2-volguth/build/acto2-volguth.mp3',
    bpm=144, beats_per_bar=4, bars=56,         # loop_samples = 56 × 4 × 60/144 × 44 100 = 4 116 000
    target_lufs=-16.5, ceiling_dbtp=-1.0,
    reverb={'seconds': 2.4, 'predelay': 0.03, 'damping': 0.5},   # 2,2 s en el boceto: un poco más para el órgano
    sections={'intro 1-4': (1, 4), 'A 5-12': (5, 12), "A' 13-20": (13, 20), 'golpe 21': (21, 21),
              'B 22-28': (22, 28), 'puente 29-30': (29, 30), 'puente 35-36': (35, 36), 'clímax 37-44': (37, 44),
              'clímax 45-48': (45, 48), 'c46': (46, 46), 'codetta 49-56': (49, 56)},
    ...)
```

Buses de partida: los del boceto (`acto2_bocetos.py`, `BUS`): `organ` con paso alto 30 Hz y −2 dB en 300 Hz; `brass` con paso
alto 70 Hz, −2 dB en 300 Hz, −3 dB en 3 kHz y compresión suave; `rhythm` (galope) con paso alto 45 Hz y −3 dB en 3,2 kHz;
`drums` con paso alto 55 Hz, −6 dB en 46 Hz y −4 dB en 3,5 kHz; coro con −2 dB en 300 Hz y −3 dB en 3 kHz; `bells`
(campana, copa) con paso alto 300 Hz y estantería −4 dB desde 6 kHz.

**Integración (cuando el usuario lo apruebe):** copiar a `src/audio/cap2-e0-jefe.mp3` y añadir a `MUSIC_TRACKS`
(`src/fx/music-tracks.ts`): `'cap2-e0-jefe': { file: 'cap2-e0-jefe.mp3', loopSamples: 4116000 }`.
