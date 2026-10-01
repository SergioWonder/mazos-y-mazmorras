# Brief: Acto III, escenario 0, «La Guarida del Dragón» — «Tesoro maldito»

Una canción en **dos versiones sincronizadas**: **exploración** (mapa y eventos) y **combate** (combates
normales y élites). Ids de juego: `cap3-e0` y `cap3-e0-combate`. Pista nueva en `scripts/musica/acto3-guarida/`
con las convenciones del [README del estudio](../../scripts/musica/estudio/README.md):

- `test_compose.py` (los criterios 1–14 de §8, que se leen en los MIDIs) se escribe **antes** que `compose.py`.
- `compose.py` genera **los dos MIDIs a la vez** (`build/acto3-guarida-explora.mid` y `build/acto3-guarida-combate.mid`)
  a partir de una única descripción de forma, armonía y melodía. Nada de copiar y pegar entre versiones.
- `mix.py` renderiza los dos (`build/acto3-guarida-explora.mp3`, `build/acto3-guarida-combate.mp3`, con su
  `.report.json`), cada uno con su `MixSpec`, y la prueba de cruce `build/acto3-guarida-cruce.mp3` (criterio 22).

Necesita montado el disco **Base** (VCSL y Sonatina). Fuentes: [direccion.md](direccion.md) (Acto III), los bocetos que
eligió el usuario en `scripts/musica/leitmotivs/acto3_bocetos.py` (`ruinas_tesoro`, arreglo `arrange_ruinas`) y
`scripts/musica/leitmotivs/acto3_combate.py` (`tesoro_saqueo` y `tesoro_derrumbe`), y sus renders
`build/acto3-ruinas-4-tesoro-maldito.mp3`, `acto3-dragon-combate-saqueo.mp3` y `acto3-dragon-combate-derrumbe.mp3`.
Formato de referencia: [acto2-cripta.md](acto2-cripta.md).

## 1. Función, emoción y repetición

- **Dónde suena:** el mapa y los eventos de la Guarida del Dragón (exploración) y todos sus combates normales y de
  élite (combate): kobolds, cultistas del dragón, dracos. Es la primera música del Acto III.
- **Emoción:** **decadencia**. Ruinas de un reino enterrado bajo el oro del dragón; ríos de lava, azufre, monedas
  fundidas. El tema «Tesoro maldito» es un **lamento en la menor que se hunde grado a grado** hasta posarse en la
  sensible (G#): el oro que pesa y arrastra hacia abajo. El ♭2 (Si♭ sobre La, Fa sobre Mi) es la firma del dragón.
  - Exploración: **el arreglo «Ruinas de oro»** que eligió el usuario: violonchelo solista con el motivo, *ostinato*
    grave de arpa con el ♭2 (A1 E2 A2 B♭2 E2 A2), contrafagot en la fundamental y su vecina ♭2, pandero de marco
    suave y el brillo del vibráfono con arco. Para la variedad: flauta alto, clarinete bajo, coro masculino casi
    susurrado, campana, gong y redoble de timbal en el puente.
  - Combate: el usuario dijo «adelante con todo»: **los dos bocetos de combate son secciones de la pista**.
    **«Saqueo»** (intro, A, retorno y codetta) y **«Derrumbe»** (A' y puente). Frenesí: mucha percusión y elementos
    que empujan; el metal y la percusión pequeña (yunque, platos, maraca, matraca) **se tienen que oír** (en el boceto
    quedaban enterrados hasta subirlos).
- **Lo que pidió el usuario y cómo se cumple:**
  - **Nada agudo y estridente:** nada tenido por encima de **F5 (77)**, que solo tocan las cumbres breves de la
    melodía (F5 de A', 2 tiempos). El vibráfono con arco solo en **61–77** y a velocidad **≤ 64**. Nada de
    glockenspiel, crótalos ni armónicos. Los platos (choque y *swell* de plato suspendido) van con estantería
    de agudos y contados (§6).
  - **Percusión audible en combate:** criterio 20 (yunque, maraca, choque, toms y pandero contra la melodía).
- **Repetición:** un escenario dura entre 15 y 40 minutos y el jugador cambia de versión decenas de veces. El bucle
  aguanta 20 vueltas: **un solo clímax** (c. 31), un respiro claro (B, c. 21–26) y la costura sin señal (c. 36 es la
  dominante del c. 1).
- **Transformación del leitmotiv** (§5): exposición con **bajo de lamento** y cadencia frigia (♭II–i); **secuencia a
  la subdominante** (re menor, con E♭ como ♭II de re); **inversión de la cabeza en aumentación** en fa lidio (B);
  **fragmentación en hemiolia** (la cabeza en negras con puntillo, 6/8 contra 3/4) **secuenciada un grado arriba**
  (puente); **retorno de la segunda mitad** sobre la **cadencia rota** E7 → Fmaj7 (clímax); y la codetta con el
  fragmento de los c. 3–4 del motivo, que no resuelve.

## 2. Tempo, métrica, tonalidad, duración

| Parámetro | Valor (idéntico en las dos versiones) |
|---|---|
| Tempo | ♩ = 84, fijo (el de los bocetos) |
| Métrica | 3/4 |
| Tonalidad | **la menor** con color **frigio** (♭2 = Si♭) y sensible G# en la melodía; A' en **re menor** (♭II = Mi♭); B en **fa lidio** (VI) → ♭II → V |
| Compases | **36** |
| Duración del bucle | 36 × 3 × 60/84 = **77,142857 s** → `loop_samples` = **3 402 000** a 44,1 kHz (cada compás son 94 500 muestras exactas) |
| `MixSpec` (ambas) | `bpm=84`, `beats_per_bar=3`, `bars=36` |

Compás = 2,1429 s; negra = 0,7143 s; corchea = 0,3571 s; semicorchea = 0,1786 s; fusa = 0,0893 s. Inicio del
compás *n* = (*n* − 1) × 2,1429 s (c. 13 = 25,71 s; c. 21 = 42,86 s; c. 27 = 55,71 s; c. 31 = 64,29 s; c. 35 = 72,86 s).

**Figuras:** exploración, nada más corto que la corchea. Combate: semicorcheas en las pistas de ritmo (`Cellos Spic`,
`Harp`, `Violins Spic`, `Toms`, `Shaker`, `War Drums` en la anacrusa) y **fusas solo en el redoble de `Snare`**.

### Reglas de sincronía (exploración ↔ combate)

El juego cruza las dos versiones con un fundido **lineal** de 1,6 s desde el mismo punto del bucle
(`src/fx/audio.ts`, `cruzarVersion`). Por tanto:

1. Mismo tempo, métrica, número de compases, forma y **armonía compás a compás** (§3 y §4 son comunes).
2. **Misma melodía**: en cada compás, las alturas y los ataques escritos de las líneas de referencia de §5 son los
   mismos en las dos versiones. Pueden cambiar el instrumento, la dinámica, la duración (sin añadir ni quitar
   ataques) y los doblajes declarados en §5.
3. **Capas comunes** (idénticas nota a nota, mismas velocidades, mismo CC1 y la misma humanización: misma semilla por
   nombre de pista), que suman en fase en el cruce:
   - `Contrabassoon` (Contrabassoon Solo Sustain (looped) de Sonatina): el bajo de §4, **con la misma curva de CC1**.
   - `Gong` (Gong 1 de VCSL, nota 61): 3 golpes (c. 1, 21, 31).
   - `Bell` (Tubular Bells 1 de VCSL): 3 toques (c. 5 A4, c. 13 D4, c. 31 F4).
4. `Choir` canta **las mismas voces** en las dos versiones (cambia solo el CC1), como en la Cripta.
5. Todo lo demás puede diferir. Lo que solo existe en una versión entra y sale con el fundido.

## 3. Forma compás a compás e intensidad

Intensidad de 1 a 10 (10 = lo más fuerte de la pista). La exploración no pasa de *mf*; el combate llega a *ff*.

| Sección | Compases | Tiempo (s) | Contenido | Int. E | Int. C |
|---|---|---|---|---|---|
| Intro «Las ruinas» | 1–4 | 0,00–8,57 | *Ostinato* del ♭2; el contrafagot pasa al ♭II (c. 3) y a la dominante. C: arranca el «Saqueo» | 2 → 3 | 5 → 6 |
| A «Tesoro maldito» | 5–12 | 8,57–25,71 | **Exposición** sobre el bajo de lamento; cadencia frigia B♭ → Am | 4 → 5 | 7 |
| A' «Oro fundido» | 13–20 | 25,71–42,86 | **Secuencia a la subdominante** (re menor) con contracanto. C: «Derrumbe» (hemiolia) | 5 | 8 |
| B «Río de lava» | 21–26 | 42,86–55,71 | **Respiro.** Inversión de la cabeza en aumentación, fa lidio → B♭ → E7 | 3 (mínimo) | 5 (mínimo) |
| Puente «Se hunde el techo» | 27–30 | 55,71–64,29 | **Fragmento en hemiolia** secuenciado; crescendo, redobles, matraca | 4 → 7 | 7 → 9 |
| Retorno «El dragón despierta» | 31–34 | 64,29–72,86 | Segunda mitad del motivo, tutti; **clímax en el c. 31** sobre la cadencia rota | **8** (c. 31) → 6 | **10** (c. 31) → 8 |
| Codetta «Brasas» | 35–36 | 72,86–77,14 | Fragmento de los c. 3–4 del motivo; E7 que encadena con el c. 1 | 4 → 3 | 6 |

Respiros: la exploración en B (sin melodía de chelo, sin coro, pandero solo en el t1 de los c. 21, 23 y 25). En
combate, B baja de densidad (sin metales *marcato*, sin yunque, chelos en corcheas sin acentos) pero **no se para**.

## 4. Armonía (común a las dos versiones)

Cifrado por compás; «(1) / (2–3)» indica cambio de acorde en el tiempo 2, «(1–2) / (3)» en el tiempo 3. Entre
corchetes, el bajo real (`Contrabassoon`) en MIDI. **Vecina**: la nota de la escala de la sección inmediatamente por
encima del bajo; es la que adornan los *ostinatos* (§6). Escalas: la frigia (La Si♭ Do Re Mi Fa Sol) en intro, A,
puente, retorno y codetta; re frigia (Re Mi♭ Fa Sol La Si♭ Do) en A'; fa lidia (Fa Sol La Si Do Re Mi) en los c. 21–24
y la frigia en 25–26.

| c. | Cifrado | Bajo | Vecina |
|---|---|---|---|
| 1 | Am | A1 (33) | B♭ |
| 2 | Am | A1 (33) | B♭ |
| 3 | B♭ (♭II) | B♭1 (34) | C |
| 4 | E7(♭9) | E1 (28) | F |
| 5 | Am | A1 (33) | B♭ |
| 6 | G7 | G1 (31) | A |
| 7 | Dm | D2 (38) | E |
| 8 | E7(♭9) | E1 (28) | F |
| 9 | Am | A1 (33) | B♭ |
| 10 | E7sus4 (1) / E7(♭9) (2–3) | E1 (28) | F |
| 11 | B♭(#11) | B♭1 (34) | C |
| 12 | Am | A1 (33) | B♭ |
| 13 | Dm | D2 (38) | E♭ |
| 14 | C7 | C2 (36) | D |
| 15 | Gm | G1 (31) | A |
| 16 | A7(♭9) | A1 (33) | B♭ |
| 17 | Dm | D2 (38) | E♭ |
| 18 | A7sus4 (1) / A7(♭9) (2–3) | A1 (33) | B♭ |
| 19 | E♭(#11) (♭II de re) | E♭2 (39) | F |
| 20 | Dm | D2 (38) | E♭ |
| 21 | F(add9) | F1 (29) | G |
| 22 | Fmaj7(#11) | F1 (29) | G |
| 23 | Dm9 | D2 (38) | E |
| 24 | G7sus4 (1–2) / G7 (3) | G1 (31) | A |
| 25 | B♭maj7 | B♭1 (34) | C |
| 26 | E7(♭9) | E1 (28) | F |
| 27 | Dm | D2 (38) | E |
| 28 | B♭(#11) | B♭1 (34) | C |
| 29 | E7sus4 | E1 (28) | F |
| 30 | E7(♭9) | E1 (28) | F |
| 31 | **Fmaj7(#11)** (clímax, cadencia rota) | F1 (29) | G |
| 32 | E7sus4 (1) / E7(♭9) (2–3) | E1 (28) | F |
| 33 | B♭(#11) | B♭1 (34) | C |
| 34 | Am | A1 (33) | B♭ |
| 35 | B♭(#11) | B♭1 (34) | C |
| 36 | E7(♭9) | E1 (28) | F |

- **A (5–12):** bajo de lamento La–Sol–(Re)–Mi y, en la segunda frase, la **cadencia frigia** B♭ → Am (♭II–i): el ♭2
  del *ostinato* hecho armonía. El c. 7 va en estado fundamental (Dm, no Dm/F) y el c. 9 sobre La (no sobre Do) para
  que el bajo no haga octavas paralelas con la melodía (F4→E4 sobre F→E; E4→C5 sobre E→C).
- **A' (13–20):** la misma armonía una cuarta arriba (re menor, E♭ como ♭II de re); termina en Dm y B arranca en su
  relativo, fa.
- **B (21–26):** fa lidio (el Si natural de la melodía es la #11), retardo 4–3 sobre G7 (c. 24), napolitano B♭maj7 y
  dominante.
- **Puente (27–30):** iv → ♭II → V: el techo cae sobre la dominante. **Retorno (31–34):** la dominante del c. 30 va a
  **Fmaj7** (VI), no a la tónica: el oro se abre. **Codetta (35–36):** ♭II → V, que encadena con el Am del c. 1: la
  costura es una cadencia V–i.

## 5. Leitmotiv «Tesoro maldito»

Referencia aprobada (24 tiempos en 3/4, el boceto `ruinas_tesoro`):

```
| A4  G4 | F4  E4 | D4 E4 F4 | E4  | C5  B4 | A4 G#4 F4 | E4  F4 D4 | A3  |
| h   q  | h   q  | q  q  q  | h.  | h   q  | q  q   q  | q.  e  q  | h.  |
  69  67   65  64   62 64 65   64    72  71   69 68  65   64  65 62   57
```

Las alturas y figuras de las tablas de abajo son la **melodía de referencia**: idénticas en las dos versiones.

| Etiqueta | Compases | Exploración | Combate | Notas (MIDI) y ritmo | Transformación |
|---|---|---|---|---|---|
| `motif` | **5–12** | **`Cello Solo`** | **`Cello Solo`** + `Horns` 8vb | La referencia, tal cual (57–72) | **Exposición**: debe reconocerse el boceto aprobado. |
| `seq` | 13–20 | `Alto Flute` | `Cello Solo` + `Choir Melody` (unísono) | D5 (h) C5 (q) · B♭4 (h) A4 (q) · G4 A4 B♭4 (q) · A4 (h.) · F5 (h) E5 (q) · D5 C#5 B♭4 (q) · A4 (q.) B♭4 (e) G4 (q) · D4 (h.) (74 72 · 70 69 · 67 69 70 · 69 · 77 76 · 74 73 70 · 69 70 67 · 62) | **Secuencia a la subdominante**, una cuarta arriba. F5 (c. 17) es la nota más aguda de la pista. |
| `counter` | 13–20 | `Bass Clarinet` | `Horns` | F4 · E4 · D4 · C#4 · D4 · C#4 · G3 · A3, blancas con puntillo (65 64 62 61 62 61 55 57) | Contracanto en lamento (no es leitmotiv): guía de terceras que baja. |
| `inv` | 21–26 | `Vibes Bowed` | `Horns` | A4 (h.) · B4 (h) C5 (q) · D5 (h.) · C5 (h) B4 (q) · A4 (h.) · G#4 (h.) (69 · 71 72 · 74 · 72 71 · 69 · 68) | **Inversión de la cabeza** (La Sol Fa Mi → La Si Do Re) **en aumentación**, en lidio: el oro brilla un instante y vuelve a caer a la sensible. |
| `frag` | 27–30 | `Cello Solo` + `Bass Clarinet` 8vb | `Horns` | A4 G4 · F4 E4 · B4 A4 · G#4 F4, negras con puntillo (69 67 · 65 64 · 71 69 · 68 65) | **Fragmento** (la cabeza, cuatro notas) **en hemiolia** (6/8 contra 3/4), **secuenciado un grado arriba** con el color de la menor armónica (Si La Sol# Fa). |
| `ret` | **31–34** | **`Cello Solo` + `Alto Flute`** (unísono) | **`Cello Solo` + `Horns` 8vb + `Choir Melody`** (unísono con el chelo) | C5 (h) B4 (q) · A4 G#4 F4 (q) · E4 (q.) F4 (e) D4 (q) · A3 (h.) (72 71 · 69 68 65 · 64 65 62 · 57) | **Retorno de la segunda mitad** sobre la cadencia rota: el C5 del c. 31 cae sobre Fmaj7. |
| `cod` | 35–36 | `Bass Clarinet` | `Cello Solo` + `Horns` 8vb | D4 E4 F4 (q) · E4 (h.) (62 64 65 · 64) | El fragmento de los c. 3–4 del motivo, que se queda en el Mi: no resuelve, vuelve a empezar. |

Intro (1–4): sin melodía de referencia. El brillo del vibráfono (§6) es color, no melodía.

## 6. Orquestación por sección

Registros en MIDI (C4 = 60). Las capas máximas cuentan pistas con notas sonando a la vez. Las pistas del MIDI llevan
el nombre de la columna «Pista».

### Patches

`…/` = `sso/Sonatina Symphonic Orchestra/`; `ID/` = `VCSL/Idiophones/Struck Idiophones/`; `MB/` =
`VCSL/Membranophones/Struck Membranophones/`.

| Pista | Ruta `.sfz` | Dinámica | Versión |
|---|---|---|---|
| `Contrabassoon` (**común**) | `…/Woodwinds - Performance/Contrabassoon Solo Sustain (looped).sfz` | **CC1** | E y C |
| `Gong` (**común**) | `ID/Gong 1.sfz`, **nota 61** | velocidad | E y C |
| `Bell` (**común**) | `ID/Tubular Bells 1.sfz` | velocidad | E y C |
| `Cello Solo` | `…/Strings - Performance/Cello Solo Sustain.sfz` | **CC1** | E y C |
| `Harp` | `VCSL/Chordophones/Composite Chordophones/Concert Harp.sfz` (3 capas) | velocidad | E y C |
| `Choir` | `…/Chorus - Performance/Mixed Chorus.sfz` | **CC1** | E y C |
| `Timp Roll` | `VSCO-2-CE/TimpaniRolls.sfz` | velocidad + CC11 | E y C |
| `Timpani` | `VSCO-2-CE/Timpani.sfz` | velocidad | E y C |
| `Frame Drum` | `MB/Frame Drum.sfz` (61 golpe grave, 63 mano aguda, 64 golpe agudo) | velocidad | E y C |
| `Alto Flute` | `…/Woodwinds - Performance/Alto Flute Solo Sustain (looped).sfz` | **CC1** | E |
| `Bass Clarinet` | `…/Woodwinds - Performance/Bass Clarinet Solo Sustain (looped).sfz` | **CC1** | E |
| `Vibes Bowed` | `ID/Vibraphone - Bowed.sfz` | velocidad | E |
| `Horns` | `…/Brass - Performance/Horns Sustain.sfz` | **CC1**, notas **≤ 2,8 s** | C |
| `Choir Melody` | `…/Chorus - Performance/Mixed Chorus.sfz` | **CC1** | C |
| `Low Brass` | `…/Brass - Performance/Trombones Marcato.sfz` | **CC1** | C |
| `Tuba` | `…/Brass - Performance/Tuba Marcato.sfz` | **CC1** | C |
| `Cellos Spic` | `VSCO-2-CE/CelloEnsSpic.sfz` | velocidad | C |
| `Violins Spic` | `VSCO-2-CE/ViolinEnsSpic.sfz` | velocidad | C |
| `Basses Spic` | `VSCO-2-CE/ContrabassSpic.sfz` | velocidad | C |
| `War Drums` | `MB/Bass Drum 2.sfz`, **nota 62** (golpe) | velocidad | C |
| `Toms` | `MB/Tom 2.sfz` (60 aro, 61 aro corto, 62 parche) | velocidad | C |
| `Snare` | `MB/Snare Drum, Rope Tension.sfz`, **nota 62** | velocidad | C |
| `Anvil` | `ID/Anvil.sfz` (60, 61) | velocidad | C |
| `Shaker` | `ID/Shaker, Small.sfz`, **nota 61** (golpe) | velocidad | C |
| `Clash` | `ID/Clash Cymbals 1.sfz`, **nota 60** | velocidad | C |
| `Cymbal` | `ID/Suspended Cymbal 2.sfz`, **nota 63** (crescendo de 2,5 s, cumbre a 2,17 s ≈ un compás) | velocidad | C |
| `Ratchet` | `ID/Ratchet.sfz`, **nota 60** (una vuelta) | velocidad | C |

**Sonatina por CC1** (`Contrabassoon`, `Cello Solo`, `Alto Flute`, `Bass Clarinet`, `Choir`, `Choir Melody`, `Horns`,
`Low Brass`, `Tuba`): **curva de CC1 obligatoria**, con un punto en el tick 0 y la forma de cada frase; como mucho un
punto cada corchea. En estos patches la velocidad no cuenta.

### Patrones

**Ostinato del ♭2** (el del boceto, A1 E2 A2 B♭2 E2 A2): seis notas `[r, q, r+12, v+12, q, r+12]`, donde *r* es el bajo
de §4 en la octava de la arpa grave (E1–D#2, 28–39), *q* la quinta (o, si no está en el acorde, la nota del acorde más
cercana) y *v* la vecina de §4.
- `Harp` (E): en corcheas, una vez por compás, primera nota +8 de velocidad. En el puente, en **hemiolia** (abajo).
- `Harp` (C, «Saqueo»): el mismo en semicorcheas, dos veces por compás, la primera de cada grupo +10.
- `Cellos Spic` (C, «Saqueo»): el mismo en semicorcheas con *r* en E2–D#3 (40–51): A2 E3 A3 B♭3 E3 A3 sobre La. Acento
  en la 1.ª de cada grupo de seis (vel. 96 / 80 en el boceto).

**Celdas de hemiolia** («Derrumbe», A2 B♭2 A2 E3 F3 E3): seis corcheas `[r, v, r, q, w, q]` con *w* la vecina de la quinta
en la escala; **acentos en las corcheas 0 y 3** (dos grupos de tres: 6/8 contra el 3/4 de los tambores).
- `Cellos Spic` (C, A' y puente), con *r* en 40–51; `Harp` (E, puente), con *r* en 28–39.
- `Violins Spic` (C, A' y puente), las «dagas»: la celda sobre la fundamental del acorde *R* en E4–D#5 (64–75) y su
  quinta una cuarta abajo (`[R, v(R), R, F, v(F), F]`), cada corchea con un eco de semicorchea más suave.
- `Low Brass` y `Basses Spic` (C, A' y puente): solo en los acentos (corcheas 0 y 3): *r* y *q* (trombones a la octava de
  los chelos; contrabajos una octava abajo).

**Percusión de combate.** «Saqueo» (S) en los c. 1–12 y 31–36; «Derrumbe» (D) en 13–20 y 27–30; B (21–26) aparte.

| Pista | S «Saqueo» | D «Derrumbe» | B |
|---|---|---|---|
| `War Drums` | t1 (fuerte), t2½ y anacrusa de semicorchea t2¾ | los tres tiempos (el 1.º acentuado) | t1 de los c. 21, 23, 25; anacrusa en el c. 26 |
| `Toms` | 12 semicorcheas, **acento cada corchea con puntillo** (posiciones 0, 3, 6, 9: 4 contra 3) en el parche (62), el resto en el aro (60) | semicorcheas salvo la 4.ª de cada tiempo, notas 60/61/62 en rueda, acento cada 6 | solo los acentos de S, suaves |
| `Frame Drum` | corcheas: 61 en las pares, 63 en las impares | — | corcheas suaves |
| `Shaker` | semicorcheas, fuerte/suave alterno | solo t1 | semicorcheas suaves |
| `Anvil` | **t2** (nota 60) | **t2½** (nota 61, el acento del 6/8) | — |
| `Timpani` | t1, el bajo en D2–C#3 (38–49) | t1 el bajo, t2½ la quinta | t1, suave |
| `Low Brass` | el bajo +12 en t1 y t2½ | acentos de las celdas | — |
| `Tuba` | el bajo en t1 | el bajo en el t1 de los c. 13, 17 y 27 (2,5 tiempos) | — |
| `Clash` | t1 de los c. 1, 5, 9 y 31 | t1 de los c. 13, 17 y 27 | — |
| `Cymbal` | *swell* de un compás que culmina en el t1 de los c. 5, 13, 27, 31 y 1 (empieza en el t1 de los c. 4, 12, 26, 30 y 36) | | |
| Final de frase | | **c. 16, 20 y 30**: redoble de `Snare` en fusas que crece (vel. 56 → 104; en el puente, c. 29–30), `Timp Roll` en el bajo y `Ratchet` en el t3 | |

### Intro «Las ruinas» (1–4)

| Rol | Exploración (máx. 5 capas) | Combate (máx. 15 capas) |
|---|---|---|
| Bajo | `Contrabassoon` (**común**): A1 · A1 · B♭1 · E1, CC1 60 → 66 | ídem |
| *Ostinato* | `Harp`, corcheas, *p* (vel. 50–58) | `Harp` y `Cellos Spic` en semicorcheas, *mf*; `Basses Spic` el bajo en t1 y t2½ |
| Brillo | `Vibes Bowed`: E4 (64) c. 1, F4 (65) c. 3, h. a vel. 44–46 | — |
| Percusión | `Frame Drum` t1 (61, vel. 56) y t3 (64, vel. 42) | S completa; `Low Brass` y `Tuba` desde el c. 3 |
| Metal | `Gong` (**común**) t1 del c. 1 | `Gong`; `Clash` c. 1; `Cymbal` *swell* hacia el c. 5 |

### A «Tesoro maldito» (5–12)

| Rol | Exploración (máx. 7 capas) | Combate (máx. 18 capas) |
|---|---|---|
| **Melodía** | `Cello Solo` §5, *mp* → *mf*, CC1 70 → 84 (c. 9) → 72; legato | `Cello Solo` CC1 88 → 100; `Horns` 8vb (45–60) CC1 84 → 96 |
| Bajo | `Contrabassoon` (**común**) | ídem; `Tuba`, `Low Brass`, `Basses Spic` (S) |
| *Ostinato* | `Harp`, corcheas, vel. 52–60 | `Harp`, `Cellos Spic` (S) |
| Brillo | `Vibes Bowed`: E4 c. 5, F4 c. 7, E4 c. 9, F4 c. 11 (h., vel. 42–48), siempre por debajo del chelo en nivel | — |
| Percusión | `Frame Drum` como en la intro (+ corchea suave en el «2 y» desde el c. 9) | S completa |
| Metal | `Bell` (**común**) A4 en el t1 del c. 5 | `Bell`; `Clash` c. 5 y 9; `Cymbal` hacia el c. 13 |

### A' «Oro fundido» (13–20)

| Rol | Exploración (máx. 8 capas) | Combate (máx. 21 capas) |
|---|---|---|
| **Melodía** | `Alto Flute` §5, CC1 68 → **84 (c. 17)** → 70; el D4 final se corta en el t3½ (respira antes del arco adelantado del vibráfono) | `Cello Solo` CC1 92 → 104 (c. 17) → 94 + `Choir Melody` al unísono CC1 84 → 98 → 86 |
| Contracanto | `Bass Clarinet` §5 (55–65), CC1 54 → 64 → 56 | `Horns` §5, CC1 80 → 90 → 82 |
| Coro | `Choir` (voces graves, 43–55, abajo), CC1 42 → 56 → 46: un susurro | `Choir`, las mismas voces, CC1 68 → 84 → 72 |
| Bajo | `Contrabassoon` (**común**) | ídem; `Tuba` (c. 13, 17), `Low Brass` y `Basses Spic` (D) |
| *Ostinato* | `Harp`, corcheas | `Cellos Spic` (celdas D) + `Violins Spic` (dagas) |
| Percusión | `Frame Drum`: t1, «2 y» suave, t3 | D completa; final de frase en los c. 16 y 20 |
| Metal | `Bell` (**común**) D4 en el t1 del c. 13 | `Bell`; `Clash` c. 13 y 17 |

**Voces del coro** (comunes, sin quintas ni octavas paralelas con el bajo, la melodía ni el contracanto: se quedan
quietas o van contra el lamento que baja): c. 13 A2 D3 F3 · 14 B♭2 E3 G3 · 15 G2 B♭2 G3 · 16 G2 B♭2 E3 · 17 A2 C3 F3
(Dm7) · 18 A2 C#3 G3 · 19 G2 B♭2 E♭3 · 20 C3 D3 F3 · 27 A2 D3 F3 · 28 B♭2 D3 E3 · 29 A2 B2 E3 · 30 B2 D3 F3 ·
31 A2 C3 E3 · 32 G#2 D3 E3 · 33 B♭2 D3 E3 · 34 C3 E3 G3 (Am7) (notas comunes ligadas).

### B «Río de lava» (21–26): respiro

| Rol | Exploración (máx. 5 capas) | Combate (máx. 13 capas) |
|---|---|---|
| **Melodía** | `Vibes Bowed` §5 (68–74), vel. 48 → **58 (c. 23)** → 46, arco adelantado (abajo) | `Horns` §5, CC1 74 → 86 (c. 23) → 72 |
| Bajo | `Contrabassoon` (**común**), CC1 58 | ídem |
| Arpa | `Harp`: acorde partido en las corcheas 0–2 (fundamental, quinta, tercera +12), deja sonar | `Harp` S en semicorcheas, *p* (vel. 46–54) |
| Ritmo | — | `Cellos Spic` corcheas fundamental/quinta sin acentos (vel. ~60) |
| Percusión | `Frame Drum` 61 en el t1 de los c. 21, 23 y 25 (vel. 44) | columna B de la tabla |
| Metal | `Gong` (**común**) t1 del c. 21 | `Gong`; `Cymbal` *swell* en el c. 26 hacia el puente |

### Puente «Se hunde el techo» (27–30)

| Rol | Exploración (máx. 8 capas) | Combate (máx. 21 capas) |
|---|---|---|
| **Melodía** | `Cello Solo` §5 + `Bass Clarinet` 8vb (declarado), CC1 70 → 86 | `Horns` §5, CC1 84 → 104 |
| Coro | `Choir`, CC1 46 → 76 (crescendo continuo) | `Choir`, CC1 70 → 100 |
| Bajo | `Contrabassoon` (**común**), CC1 62 → 80 | ídem; `Tuba` c. 27, `Low Brass`, `Basses Spic` (D) |
| *Ostinato* | `Harp` en **hemiolia** (celdas D), vel. 52 → 72 | `Cellos Spic` (D) + `Violins Spic`, crescendo |
| Percusión | `Frame Drum` en hemiolia (golpe en las corcheas 0 y 3), vel. 50 → 72 | D completa, crescendo; redoble de `Snare` en los c. 29–30 |
| Redoble | `Timp Roll` E2 (40) en los c. 29–30, CC11 30 % → 95 %; corta antes del t1 del c. 31 | `Timp Roll` E2 c. 29–30 hasta *ff*; `Ratchet` c. 30 t3; `Cymbal` hacia el c. 31; `Clash` c. 27 |

### Retorno «El dragón despierta» (31–34)

| Rol | Exploración (máx. 9 capas) | Combate (máx. 21 capas) |
|---|---|---|
| **Melodía** | `Cello Solo` + `Alto Flute` al unísono, CC1 **88 (c. 31)** → 72 | `Cello Solo` CC1 **108 (c. 31)** → 94 + `Horns` 8vb + `Choir Melody` (unísono) |
| Coro | `Choir`, CC1 70 → 56 | `Choir`, CC1 96 → 80 |
| Bajo | `Contrabassoon` (**común**) | ídem; S completa con `Tuba` y `Low Brass` |
| *Ostinato* | `Harp`, corcheas (S), vel. 58–66 | `Harp`, `Cellos Spic` (S) |
| Percusión | `Frame Drum` t1, «2 y», t3; `Timpani` **solo dos golpes**: F2 (41) t1 del c. 31 (vel. 72) y B♭2 (46) t1 del c. 33 (vel. 58) | S completa, la más fuerte del bucle en el c. 31 |
| Metal | `Gong` y `Bell` (**comunes**) t1 del c. 31 | `Gong`, `Bell`, `Clash` c. 31 |

### Codetta «Brasas» (35–36)

| Rol | Exploración (máx. 5 capas) | Combate (máx. 16 capas) |
|---|---|---|
| **Melodía** | `Bass Clarinet` §5 (62–65), CC1 62 → 54 | `Cello Solo` + `Horns` 8vb, CC1 86 → 80 |
| Bajo | `Contrabassoon` (**común**): B♭1 · E1 | ídem |
| *Ostinato* | `Harp` corcheas, vel. 50–56 (como en la intro) | S, con las velocidades del c. 1 (la misma figura con la que arranca el bucle) |
| Percusión | `Frame Drum` como en la intro | S; `Cymbal` *swell* hacia el c. 1 |

### Notas sobre los samples

- **Vibráfono con arco:** sus regiones 61–77 usan samples oscuros (medido en la Cripta: −37 a −46 dB en 2,5–6 kHz); por
  debajo de 61 y por encima de 77 son brillantes. Todo el vibráfono en **64–74** y a vel. ≤ 64. Ataque lento: las notas de
  negra o más **se adelantan 120 ms**, salvo la del c. 1 (empieza en el tick 0, no se puede adelantar).
- **Plato suspendido:** la nota 63 es un crescendo de 2,5 s que culmina a los 2,17 s (≈ un compás a ♩ = 84): empieza en el
  t1 del compás anterior al de llegada. Su `ampeg_release` es de 2 s: la nota dura un compás y un tiempo (la del c. 36 acaba en el final del
  bucle y su cola se pliega al principio).
- **Matraca:** la nota 60 es una vuelta de 1,5 s. **Yunque:** 3 golpes distintos (60–62); se usan 60 y 61.
- **Coro:** por debajo de G4 suena con muestras masculinas. `Choir` va en 43–55; `Choir Melody` (57–77) cambia a voces
  femeninas desde G4.
- **Trompas:** `Horns Sustain` no tiene bucle (sample más corto ≈ 3 s): notas ≤ 2,8 s (la más larga, h. = 2,14 s).
- No usar ningún `KS`. No cambiar de patch en mitad de una nota tenida.

## 7. Dinámica

| Nivel | pp | p | mp | mf | f | ff |
|---|---|---|---|---|---|---|
| Velocidad (VSCO, VCSL) | 25–40 | 40–55 | 55–70 | 70–85 | 85–100 | 100–116 |
| CC1 (Sonatina) | 40–55 | 55–70 | 70–85 | 85–95 | 95–105 | 105–110 |

Techos: exploración vel. ≤ 80 y CC1 ≤ 90; combate vel. ≤ 116 y CC1 ≤ 110. Vibráfono ≤ 64. En combate, la velocidad
máxima de `War Drums`, `Timpani` y `Clash`, y el CC1 máximo del `Cello Solo`, están en el **c. 31**; en exploración, el
CC1 máximo del `Cello Solo` y del `Alto Flute` y la velocidad máxima de `Timpani`, también.

## 8. Criterios de aceptación

**Partitura (`test_compose.py`, leyendo los dos MIDIs):**

1. Los dos MIDIs: 36 compases de 3/4 a ♩ = 84, sin cambios de tempo, misma longitud en ticks; ninguna nota empieza antes
   del tick 0 ni termina después de 77,142857 s.
2. Todas las notas dentro del rango del catálogo de su patch y de los registros de §6: `Cello Solo` 57–77, `Alto Flute`
   57–77, `Bass Clarinet` 52–65, `Vibes Bowed` 64–74, `Harp` 28–64, `Contrabassoon` 28–39, `Choir` 43–55, `Choir Melody`
   57–77, `Horns` 45–74, `Low Brass` 40–58, `Tuba` 28–39, `Cellos Spic` 40–65, `Violins Spic` 59–77, `Basses Spic` 28–47,
   `Timpani` 38–49, `Timp Roll` 38–45, `Bell` 62–69; las percusiones, solo sus notas de §6.
3. **Nada tenido por encima de F5 (77)**: ninguna nota de negra o más por encima de 77 en ninguna pista.
4. La melodía de referencia de §5 aparece con las alturas y los ataques exactos en las **dos** versiones, con sus doblajes.
5. Las capas comunes (`Contrabassoon` con su CC1, `Gong`, `Bell`) son idénticas en los dos MIDIs; `Choir` canta las mismas
   notas en las dos.
6. Figuras: en exploración, nada más corto que la corchea; en combate, semicorcheas solo en las pistas de ritmo de §2 y
   fusas solo en `Snare`.
7. Capas simultáneas por sección ≤ E 5 / 7 / 8 / 5 / 8 / 9 / 5 y C 15 / 18 / 21 / 13 / 21 / 21 / 16
   (intro / A / A' / B / puente / retorno / codetta).
8. **Sin choques de registro:** mientras suena una melodía de §5, ninguna otra pista mantiene notas de negra o más a menos de
   una octava con nivel (velocidad, o CC1 − 15) ≥ el de la melodía. Doblajes declarados en §5.
9. Techos de §7; el c. 31 tiene el máximo de la melodía (CC1) y de los timbales en las dos versiones, y de `War Drums` y
   `Clash` en combate.
10. Cada pista de Sonatina por CC1 tiene CC1 en el tick 0, una curva que se mueve y como mucho un punto por corchea. `Horns`
    ≤ 2,8 s por nota; `Timp Roll` con CC11.
11. *Ostinatos*: el del ♭2 y las celdas de hemiolia de §6, con sus acentos, en las secciones que tocan; vibráfono adelantado
    120 ms.
12. Percusión de combate según la tabla de §6 (tambores, toms cada corchea con puntillo en S, yunque en t2 / t2½, finales de
    frase en 16, 20 y 30 con redoble, matraca y timbal), y **metal presente**: `Anvil`, `Shaker`, `Clash`, `Cymbal` y
    `Ratchet` con sus golpes contados (`Clash` 7, `Cymbal` 5, `Ratchet` 3, `Gong` 3, `Bell` 3) y velocidades de *f*.
13. **Armonía:** la nota más grave que suena en cada cambio de acorde (t1 y los cambios de §4) tiene la clase de altura del bajo.
14. Oficio: humanización (±8 ms, velocidades variadas), legato de 10–30 ms en las melodías, sin quintas ni octavas
    paralelas entre melodía, contracanto, coro y bajo, ninguna frase de dos compases repetida más de dos veces en las líneas
    melódicas, costura E7 → Am con el *ostinato* de combate a la misma velocidad en el c. 36 y el c. 1.

**Mezcla (informe de `mix.py`, una `MixSpec` por versión, medido sobre el MP3 decodificado):**

15. Sonoridad integrada: exploración **−17,4 ± 0,5 LUFS**, combate **−16,6 ± 0,5 LUFS** (como el Acto II, −17 de media);
    combate − exploración entre **0 y +1,2 LU**. Pico real **≤ −1 dBTP** en las dos.
16. `loop_samples` = **3 402 000** en las dos; `seam_jump` < 0,02 en las dos.
17. Contraste dentro de cada versión (`sections_lufs`): retorno c. 31–34 frente a B c. 21–26 entre **+4 y +9 LU** en
    exploración y entre **+3 y +8 LU** en combate; puente c. 29–30 frente a c. 27–28 al menos +1,5 LU.
18. Contraste entre versiones: en cada sección de §3, combate − exploración entre **−1,5 y +5 LU**.
19. Bandas (`bands_db`, relativas al total): exploración `presencia 2.5-6k` ≤ **−19 dB** y `aire 6-16k` ≤ **−30 dB**;
    combate ≤ **−17 dB** y ≤ **−26 dB** (los metales de la percusión pedida; el boceto «Saqueo» aprobado mide −26,3),
    `sub <60` ≤ −18 dB en las dos (el retumbo de 40–50 Hz del bombo se recorta en su bus).
20. Ninguna parte suelta pasa de −6 dB de pico antes del bus. **Percusión audible en combate**, medida como
    enmascaramiento: cada parte sola tras la EQ de su bus, en los fotogramas en que suena (a menos de 20 dB de su
    fotograma más fuerte), su energía en su banda más fuerte frente a la del **resto de la mezcla** en esa misma banda.
    `Anvil`, `Shaker`, `Clash` (en A, c. 5–12), `Snare` y `Ratchet` (en A', c. 13–20) **≥ −3 dB** (asoman sobre todo lo
    demás); `Toms` y `Frame Drum`, que comparten los graves con los tambores y los contrabajos, ≥ −9 dB. Todas con
    sonoridad integrada por debajo del `Cello Solo`. Exploración (A): el `Cello Solo` al menos 3 LU por encima de la
    `Harp` y 6 LU por encima del brillo del vibráfono.
21. Las dos `MixSpec` comparten sala y colocación (pan, envío, anchura) de las pistas que existen en ambas; las capas
    comunes con el mismo `gain_db` y en buses lineales (sin compresor) idénticos.
22. **Prueba de cruce**: `mix.py` escribe `build/acto3-guarida-cruce.mp3`: exploración de 0 a 24 s, fundido lineal de 1,6 s a
    combate en 24 s (c. 12), vuelta a exploración en 56 s (c. 27), como hace el juego. En la sonoridad a corto plazo
    (ventana de 3 s) no hay un bache de más de 3 LU por debajo de la menor de las dos versiones ni un salto de más de 4 LU.
23. Escucha: en A se reconoce el boceto «Ruinas de oro»; el vibráfono suena suave, nunca como un pitido; en combate se
    entienden el «Saqueo» (semicorcheas, tambores, yunque en el 2) y el «Derrumbe» (6/8 contra 3/4, dagas, redobles); los
    metales se oyen sin pinchar; el Fmaj7 del c. 31 suena a que el dragón despierta; los efectos del juego siguen claros.

### `MixSpec` (las dos versiones)

```python
MixSpec(
    midi='scripts/musica/acto3-guarida/build/acto3-guarida-explora.mid',   # o -combate.mid
    out='scripts/musica/acto3-guarida/build/acto3-guarida-explora.mp3',    # o -combate.mp3
    bpm=84, beats_per_bar=3, bars=36,          # loop_samples = 36 × 3 × 60/84 × 44 100 = 3 402 000
    target_lufs=-17.4,                         # combate: -16.6
    ceiling_dbtp=-1.0,
    reverb={'seconds': 2.6, 'predelay': 0.03, 'damping': 0.55},   # caverna de la guarida (bocetos: 2,8 y 2,2)
    sections={'intro 1-4': (1, 4), 'A 5-12': (5, 12), "A' 13-20": (13, 20), 'B 21-26': (21, 26),
              'puente 27-28': (27, 28), 'puente 29-30': (29, 30), 'retorno 31-34': (31, 34),
              'codetta 35-36': (35, 36), 'c31': (31, 31)},
    ...)
```

Buses de partida: los de los bocetos (`acto3_bocetos.py` / `acto2_bocetos.py`, `BUS`): melodía con −2 dB en 3,2 kHz;
coro con −2 dB en 300 Hz y −3 dB en 3 kHz; metales con compresión suave; tambores con el boom de 40–50 Hz recortado;
metal (choque, plato, yunque, matraca) con paso alto y estantería −4 a −6 dB desde 6–7 kHz y la maraca en su propio
bus (estantería −7 dB desde 5,5 kHz): que se oigan por su golpe, no por el siseo; la caja con su cuerpo grave fuera
(lo ocupa el redoble de timbal) y +3 dB en 2,2 kHz. La humanización depende solo de la pista y de la posición escrita
de cada nota: los ataques que las dos versiones comparten (chelo, arpa, pandero) caen exactamente a la vez y el
cruce no hace *flam*. Las capas comunes, en buses sin compresor e idénticos en las dos `MixSpec`.

**Integración:** copiar a `src/audio/cap3-e0.mp3` y `src/audio/cap3-e0-combate.mp3` y añadir a `MUSIC_TRACKS`
(`src/fx/music-tracks.ts`):
`'cap3-e0': { file: 'cap3-e0.mp3', loopSamples: 3402000, group: 'cap3-e0' }` y
`'cap3-e0-combate': { file: 'cap3-e0-combate.mp3', loopSamples: 3402000, group: 'cap3-e0' }`.
