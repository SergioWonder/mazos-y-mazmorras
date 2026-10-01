# Brief: Acto II, escenario 0, «La Cripta» — «Nana para los que no duermen»

Una canción en **dos versiones sincronizadas**: **exploración** (mapa y eventos) y **combate** (combates
normales y élites). Ids de juego: `cap2-e0` y `cap2-e0-combate`. Pista nueva en `scripts/musica/acto2-cripta/`
con las convenciones del [README del estudio](../../scripts/musica/estudio/README.md):

- `test_compose.py` (los criterios 1–12 de §8, que se leen en los MIDIs) se escribe **antes** que `compose.py`.
- `compose.py` genera **los dos MIDIs a la vez** (`build/acto2-cripta-explora.mid` y `build/acto2-cripta-combate.mid`)
  a partir de una única descripción de forma, armonía y melodía. Nada de copiar y pegar entre versiones.
- `mix.py` renderiza los dos (`build/acto2-cripta-explora.mp3`, `build/acto2-cripta-combate.mp3`, con su
  `.report.json`), cada uno con su `MixSpec`, y la prueba de cruce `build/acto2-cripta-cruce.mp3` (criterio 20).

Necesita montado el disco **Base** (VCSL y Sonatina). Fuentes: [direccion.md](direccion.md) (leitmotiv 7 «Sombra»,
Cripta a partir de `sombra-terror`, **sin el pitido agudo constante** y **con más variedad de instrumentos**;
exploración con el vibráfono con arco **suave**). Referencia de color aprobada: `crypt()` en
`scripts/musica/leitmotivs/acto2_bocetos.py` y `build/acto2-cripta-explora.mp3` / `acto2-cripta-combate.mp3`.
Del boceto se conservan: vibráfono con arco y después flauta alto con fantasmas de celesta, coro susurrado, trémolo
grave que se mueve con la armonía, arpa, huesos de col legno, campana de cripta, copa de cristal, el cúmulo de
piano grave, y en combate el *ostinato* de chelos en *spiccato* con el patrón del boceto, col legno a
contratiempo, timbales y xilófono. Formato de referencia: [acto1-ogros.md](acto1-ogros.md).

## 1. Función, emoción y repetición

- **Dónde suena:** el mapa y los eventos de la Cripta (exploración) y todos sus combates normales y de élite
  (combate): esqueletos, necrófagos, el Caballero Tumbario, la Momia Real. Es la primera música del Acto II.
- **Emoción:** el Acto I era una aventura que se complicaba; aquí ya se baja bajo tierra. Piedra fría, polvo, velas
  que no calientan. Es una **nana**: alguien canta para que los muertos sigan durmiendo, y el tema «Sombra» (cromático,
  con el tritono) es esa nana torcida. El miedo es de cosas quietas, no de sustos.
  - Exploración: susurrada. Vibráfono con arco **suave**, flauta alto, clarinete bajo, violonchelo solista, arpa,
    coro casi sin voz. Un solo momento de luz (B, la «capilla», en fa lidio).
  - Combate: **danza macabra**. El mismo tema con violines y trompas oscuras sobre el galope de huesos del boceto
    (chelos en *spiccato*, col legno a contratiempo, xilófono de mazas blandas, timbales). Energía media-alta; debajo
    van los efectos.
- **Lo que pidió el usuario y cómo se cumple:**
  - **Sin pitido agudo constante:** fuera los armónicos de violín (medidos: −0,2 dB en 2,5–6 kHz, el «pitido» del
    boceto `sombra-terror`). Nada tenido por encima de F5 (77) salvo las dos notas más agudas de la flauta alto
    en A' (G#5 y A5, c. 7). La copa hace un solo *swell*, en D#5.
  - **Vibráfono con arco suave:** solo en 61–77 y a velocidad ≤ 64 (ver §6, *Notas sobre los samples*).
  - **Más variedad:** cada sección tiene su solista (vibráfono, flauta alto, clarinete bajo, violonchelo solista,
    trompas, violines, trombones) y su color (celesta, campanillas, copa, cúmulo de piano, gong).
- **Repetición:** un escenario dura entre 15 y 40 minutos y el jugador cambia de versión decenas de veces. El bucle
  tiene que aguantar 20 vueltas: un solo clímax (c. 21), un respiro claro (B, c. 11–14) y la costura sin señal.
- **Transformación del leitmotiv** (§5): tonalidad menor de la (la menor, con el Re♯ como tritono) y armonización
  con **sexta aumentada**; **fragmento en aumentación** en el bajo (intro); **secuencia a la subdominante**
  (vuelve, por un instante, a la altura original de «Sombra», en re); **modo lidio mayor y aumentación ×2** (B);
  **fragmento sobre el eje disminuido** (puente: la cabeza sube por terceras menores la–do–mi♭–fa♯); **retorno
  rearmonizado** con la rota a fa mayor en el clímax.

## 2. Tempo, métrica, tonalidad, duración

| Parámetro | Valor (idéntico en las dos versiones) |
|---|---|
| Tempo | ♩ = 72, fijo (el del boceto) |
| Métrica | 4/4 |
| Tonalidad | **la menor** (eólico con sensible); A' pasa por re menor (iv) y modula a fa; **B en fa lidio** (VI); puente sobre el eje disminuido (Am–Cm–E♭m–F#ø7) |
| Compases | **24** |
| Duración del bucle | 24 × 4 × 60/72 = **80,000 s** → `loop_samples` = **3 528 000** a 44,1 kHz (cada compás son 147 000 muestras exactas) |
| `MixSpec` (ambas) | `bpm=72`, `beats_per_bar=4`, `bars=24` |

Compás = 3,333 s; negra = 0,833 s; corchea = 0,417 s; semicorchea = 0,208 s. Inicio del compás *n* = (*n* − 1) × 3,333 s.

**Figuras** (q = negra, e = corchea, s = semicorchea, h = blanca, h. = blanca con puntillo, q. = negra con puntillo,
w = redonda; «t1…t4» son los tiempos del compás):

- Melodías (las dos versiones): corchea como figura mínima.
- Exploración: corchea mínima en todo, salvo los tresillos de corchea de `Col Legno Vc` (c. 4, 6, 8, 20).
- Combate: semicorcheas **solo** en `Col Legno Vn` (desplazado a la semicorchea impar en todo el bucle; semicorcheas
  seguidas en los c. 17–21) y en el redoble de bombo del c. 18. El *ostinato* de chelos va en corcheas.

### Reglas de sincronía (exploración ↔ combate)

El juego cruza las dos versiones con un fundido **lineal** de 1,6 s desde el mismo punto del bucle
(`src/fx/audio.ts`, `cruzarVersion`). Por tanto:

1. Mismo tempo, métrica, número de compases, forma y **armonía compás a compás** (§3 y §4 son comunes).
2. **Misma melodía**: en cada compás, las alturas y los ataques escritos de las líneas de referencia de §5 son los
   mismos en las dos versiones. Pueden cambiar el instrumento, la dinámica, la articulación, la duración de la nota
   (sin añadir ni quitar ataques) y los doblajes a la octava declarados en §6.
3. **Capas comunes** (idénticas nota a nota, mismas velocidades, mismo CC1 y la misma humanización: misma semilla
   por nombre de pista). Al ser idénticas, en el cruce lineal suman en fase y no hay bache: son el «hilo».
   - `Low Trem` (Basses Tremolo de Sonatina): el bajo en trémolo de §6, con **la misma curva de CC1** en las dos.
   - `Bell` (Tubular Bells 1 de VCSL): 4 toques (c. 1, 11, 19, 23).
   - `Gong` (Gong 1 de VCSL, nota 61): 2 golpes (c. 6 t3, c. 19 t1).
   - `Col Legno Vc` (Celli Col Legno de Sonatina): los tresillos de los c. 4, 6, 8 y 20.
4. Todo lo demás puede diferir. Lo que solo existe en una versión entra y sale con el fundido.

## 3. Forma compás a compás e intensidad

Intensidad de 1 a 10 (10 = lo más fuerte de la pista). La exploración no pasa de *mf*; el combate no pasa de *f*.

| Sección | Compases | Tiempo (s) | Contenido | Intensidad E | Intensidad C |
|---|---|---|---|---|---|
| Intro «Bajo las losas» | 1–2 | 0,00–6,67 | Campana; la **cabeza del motivo en aumentación**, en el bajo (clarinete bajo / trompas graves); en combate arranca ya la danza | 2 → 3 | 4 → 5 |
| A «La nana» | 3–6 | 6,67–20,00 | **Exposición**: vibráfono con arco (E) / violines con trompas a la octava grave (C); la copa deja flotar el tritono | 4 | 6 |
| A' «El eco» | 7–10 | 20,00–33,33 | **Secuencia a la subdominante** (flauta alto con fantasmas de celesta / violines con xilófono); contracanto en lamento; consecuente que **modula a fa** | 5 | 7 |
| B «La capilla» | 11–14 | 33,33–46,67 | **Respiro.** Fa lidio: el motivo **en mayor y aumentación** (violonchelo solista / trompas); campanillas; vuelve a mi7 | 3 (mínimo) | 5 (mínimo) |
| Puente «La losa se mueve» | 15–18 | 46,67–60,00 | Cúmulo de piano; la **cabeza** sube por el eje disminuido (la, do, mi♭, fa♯); crescendo, redoble | 4 → 7 | 6 → 9 |
| Retorno «Despiertan» | 19–22 | 60,00–73,33 | Motivo completo rearmonizado, tutti; **clímax en el c. 21** (66,67 s) sobre la rota a **Fmaj7** | 7 → **8** (c. 21) → 6 | 9 → **10** (c. 21) → 8 |
| Codetta «Vuelven a dormir» | 23–24 | 73,33–80,00 | Resto de la cabeza; mi7 que encadena con el c. 1 | 4 → 2 | 6 → 5 |

Respiros: t4 del c. 6 (la melodía calla), toda la sección B, el t4 del c. 22 y el c. 24 (sin melodía). En combate,
B baja de densidad (chelos sin acentos, sin contrabajos en *spiccato*, sin col legno ni bombo) pero **no se para**.

## 4. Armonía por sección (común a las dos versiones)

Cifrado por compás; «(1–2) / (3–4)» indica cambio de acorde en el tiempo 3; «(1–2) / (3) / (4)», cambio en cada
tiempo. Bajo tras la barra cuando no es la fundamental. Entre corchetes, el bajo real (contrabajo) en MIDI.

**Intro (1–2)**: pedal de la; la cabeza del motivo termina en Re♯ (el tritono) y resuelve en Mi.

| 1 | 2 |
|---|---|
| Am(add9) | Fmaj7(#11)/A (1–2) / E7(♭9)/G# (3–4) |

[A1 · A1 G#1] (33 · 33 32)

**A (3–6)**: la armonización de esta pista para «Sombra». El **F7** del c. 3 es la **sexta aumentada alemana** de la
menor (Fa–La–Do–Re♯): el Re♯ de la melodía es su sexta aumentada y resuelve, con el Fa, en el Mi de E7. ♭II
(B♭) en el c. 5 antes de la dominante.

| 3 | 4 | 5 | 6 |
|---|---|---|---|
| Am (1–2) / **F7** (Al+6) (3–4) | E7(♭13) (1–2) / E7 (3–4) | Am (1–2) / **B♭** (♭II) (3) / E7 (4) | Am (1–2) / Am/G (3–4) |

[A1 F1 · E1 · A1 B♭1 E1 · A1 G1] (33 29 · 28 · 33 34 28 · 33 31)

**A' (7–10)**: la misma armonización, una cuarta arriba (re menor, con **B♭7** como sexta alemana de re); después
ii–V de do y **C7/B♭** (dominante de fa en tercera inversión), que resuelve en fa/la al empezar B. El bajo baja
por grados: La – Sol – Fa (c. 6–7).

| 7 | 8 | 9 | 10 |
|---|---|---|---|
| Dm/F (1–2) / **B♭7** (Al+6 de re) (3–4) | A7(♭13) (1–2) / A7 (3–4) | Dm9 (1–2) / G7 (3–4) | Cmaj7 (1–2) / **C7/B♭** (3–4) |

[F1 B♭1 · A1 · D2 G1 · C2 B♭1] (29 34 · 33 · 38 31 · 36 34)

**B (11–14)**: **fa lidio** (VI de la menor). El Si natural de la melodía es la #11 lidia: el tritono de «Sombra»
convertido en luz. B♭6 en el c. 13 y dominante de la menor con ♭9 para volver.

| 11 | 12 | 13 | 14 |
|---|---|---|---|
| F(add9)/A | Fmaj7(#11) | Dm9 (1–2) / B♭6 (3–4) | E7sus4 (1–2) / E7(♭9) (3–4) |

[A1 · F1 · D2 B♭1 · E1] (33 · 29 · 38 34 · 28)

**Puente (15–18)**: las cuatro fundamentales forman el acorde disminuido La–Do–Mi♭–Fa♯, el eje sobre el que vive el
tritono del motivo (La–Re♯). Cada compás lleva su cabeza con su propio tritono; el c. 18 cierra con F#ø7 → E7(♭9).

| 15 | 16 | 17 | 18 |
|---|---|---|---|
| Am | Cm | E♭m | F#ø7 (1–2) / E7(♭9) (3–4) |

[A1 · C2 · E♭2 · F#1 E1] (33 · 36 · 39 · 30 28)

**Retorno (19–22)**: el motivo con otra armonía. **Cadencia rota en el clímax** (c. 21): donde A tenía Am, aquí
suena **Fmaj7** (La–Do–Mi de la melodía son sus notas), y después ♭II y dominante. Cierre plagal menor (Dm/A) en el 22.

| 19 | 20 | 21 | 22 |
|---|---|---|---|
| Am(add9) (1–2) / F7(#11) (3–4) | Dm7/F (1–2) / E7(♭9)/G# (3–4) | **Fmaj7** (clímax) (1–2) / B♭ (3) / E7 (4) | Am (1–2) / Dm/A (3–4) |

[A1 F1 · F1 G#1 · F1 B♭1 E1 · A1 A1] (33 29 · 29 32 · 29 34 28 · 33 33)

**Codetta (23–24)**: pedal de la con el napolitano encima y dominante que enlaza con el Am(add9) del c. 1: la
costura es una cadencia V–i.

| 23 | 24 |
|---|---|
| Am (1–2) / B♭maj7/A (3–4) | E7sus4 (1–2) / E7(♭9) (3–4) |

[A1 · E1] (33 · 28)

El E7 aparece en todas las secciones, pero siempre con otra preparación (sexta alemana, ♭II, B♭6, F#ø7, Dm7/F,
napolitano sobre pedal). No hay dos compases seguidos con el mismo cifrado.

## 5. Leitmotiv

Referencia «Sombra» (re, ritmo de `scripts/musica/leitmotivs/demos.py`, el que oyó el usuario):

```
| D  E  F   G#    A | F  E  C#  | D  F  A  B♭ A | D  |
| e  e  q   q.    e | q  q  h   | e  e  q  q  q | w  |
```

**Versión de esta pista: «la nana»**, en la menor, a la altura de A4 (todo dentro de la ventana oscura del
vibráfono con arco, 61–77). La redonda final se acorta a blanca con puntillo (respiración en el t4):

```
| A4 B4 C5  D#5   E5 | C5 B4 G#4 | A4 C5 E5 F5 E5 | A4  |
| e  e  q   q.    e  | q  q  h   | e  e  q  q  q  | h.  |
  69 71 72  75    76   72 71 68    69 72 76 77 76   69
```

Las alturas y figuras de esta tabla son la **melodía de referencia**: idénticas en las dos versiones.

| Compases | Exploración | Combate | Notas (MIDI) y ritmo | Transformación |
|---|---|---|---|---|
| 1–2 | `Bass Clarinet` | `Horns` | A2 B2 C3 D#3 (q q q q) · E3 (h), silencio en t3–4 (45 47 48 51 · 52) | **Fragmento** (la cabeza, cuatro notas) **en aumentación** y en el registro del bajo: algo se arrastra bajo las losas. El Re♯ resuelve en Mi. |
| **3–6** | **`Vibes Bowed`** | **`Violins`** (+ `Horns` 8vb, 57–65) | **69 71 72 75 76 · 72 71 68 · 69 72 76 77 76 · 69 (h.)** | **Exposición**: modo menor y armonización con sexta aumentada. Debe reconocerse el boceto aprobado. |
| 7–8 | `Alto Flute` (+ `Celesta`, fantasmas) | `Violins` + `Xylophone` al unísono | D5 E5 F5 G#5 A5 · F5 E5 C#5 (74 76 77 80 81 · 77 76 73), ritmo de los c. 3–4 | **Secuencia a la subdominante**: «Sombra» vuelve a su altura original, en re. A5 (81) es la nota más alta de la pista. |
| 9–10 | `Alto Flute` | `Violins` | F5 (q.) E5 (e) D5 (q) B4 (q) · C5 (h) B♭4 (q) G4 (q) (77 76 74 71 · 72 70 67) | Consecuente (no es leitmotiv, pero es melodía de referencia): modula a fa. |
| **11–14** | **`Cello Solo`** | **`Horns`** (unísono de sección) | **F4 (q) G4 (q) A4 (h) · B4 (h.) C5 (q) · A4 (h) G4 (h) · E4 (w)** (65 67 69 · 71 72 · 69 67 · 64) | **Modo mayor lidio + aumentación ×2** de los dos primeros compases (1 2 3 #4 5 · 3 2 7): la tercera menor se hace mayor y el tritono se queda como #11. La única luz de la cripta. En combate la E4 final dura h. (límite de las trompas). |
| 15–18 | `Bass Clarinet` (15–16) → `Alto Flute` (17–18) | `Trombones` (15–16) → `Horns` + `Violins Trem` 8va (17–18) | A3 B3 C4 D#4 · C4 D4 E♭4 F#4 · E♭4 F4 G♭4 A4 (q q q q cada uno) · F#4 (e) G#4 (e) A4 (q) G#4 (h) (57 59 60 63 · 60 62 63 66 · 63 65 66 69 · 66 68 69 68) | **Fragmento** (cabeza 1 2 ♭3 #4) en negras, **secuenciado por terceras menores** sobre el eje disminuido. El G#4 del c. 18 es la sensible que abre el retorno. |
| **19–22** | **`Alto Flute` + `Vibes Bowed`** al unísono | **`Violins` + `Choir Melody`** (voces femeninas) al unísono | = c. 3–6 (69–77) | **Rearmonizado**: la llegada del c. 21 (La–Do–Mi) cae sobre **Fmaj7**, no sobre Am: la cripta se abre. |
| 23 | `Vibes Bowed` | `Horns` | A4 (e) B4 (e) C5 (h.) (69 71 72) | La cabeza que no termina: se queda en el ♭3 y no llega al tritono. |

Contracantos de referencia (no son leitmotiv; mismas alturas y ataques en las dos versiones):

- **c. 7–10, lamento**: A3 A♭3 · G3 G3 · F3 F3 · E3 B♭2, en blancas (57 56 · 55 55 · 53 53 · 52 46). E: `Bass Clarinet`;
  C: `Trombones`. Bajada cromática y diatónica: el B♭2 (7.ª de C7) resuelve en el A del c. 11.
- **c. 19–22**: E4 E♭4 · D4 D4 · C4 (h) D4 (q) G#3 (q) · A3 (h.) (64 63 · 62 62 · 60 62 56 · 57). E: `Cello Solo`;
  C: `Horns`. Siempre por debajo de la melodía (69–77).
- **c. 24, enlace**: E3 (h) G#2 (h) (52 44), que lleva a la A2 con la que empieza el c. 1. E: `Bass Clarinet`;
  C: `Horns`.

## 6. Orquestación por sección

Registros en MIDI (C4 = 60). Las capas máximas cuentan pistas con notas sonando a la vez. Las pistas del MIDI llevan
el nombre de la columna «Pista».

### Patches

`…/` = `sso/Sonatina Symphonic Orchestra/`.

| Pista | Ruta `.sfz` | Dinámica | Duración máx. por nota |
|---|---|---|---|
| `Vibes Bowed` | `VCSL/Idiophones/Struck Idiophones/Vibraphone - Bowed.sfz` | velocidad | ≤ 9 s (samples ≥ 16 s en 61–77) |
| `Alto Flute` | `…/Woodwinds - Performance/Alto Flute Solo Sustain.sfz` | **CC1** | **≤ 2,8 s** (sin bucle; sample más corto 3,03 s) |
| `Bass Clarinet` | `…/Woodwinds - Performance/Bass Clarinet Solo Sustain.sfz` | **CC1** | **≤ 2,5 s** (sin bucle; sample más corto 2,73 s) |
| `Cello Solo` | `…/Strings - Performance/Cello Solo Sustain.sfz` | **CC1** | sin límite (con bucle) |
| `Celesta` | `…/Percussion/Celeste.sfz` | velocidad | — |
| `Harp` | `VCSL/Chordophones/Composite Chordophones/Concert Harp.sfz` (3 capas) | velocidad | — |
| `Choir` / `Choir Melody` | `…/Chorus - Performance/Mixed Chorus.sfz` | **CC1** | sin límite (con bucle) |
| `Low Trem` (**común**) | `…/Strings - Performance/Basses Tremolo.sfz` | **CC1** | sin límite (con bucle) |
| `Basses` / `Basses Quiet` | `VSCO-2-CE/ContrabassSusVB.sfz` / `ContrabassSusVB-Quiet.sfz` | velocidad + CC11 | ≤ 6 s |
| `Col Legno Vc` (**común**) | `…/Strings - Performance/Celli Col Legno.sfz` | velocidad | — |
| `Glass` | `VCSL/Idiophones/Friction Idiophones/Wine Glasses - Slow.sfz`, **solo la nota 75** | velocidad | ≤ 20 s (sample de 25 s) |
| `Hand Chimes` | `VCSL/Idiophones/Struck Idiophones/Hand Chimes.sfz` | velocidad | — |
| `Bell` (**común**) | `VCSL/Idiophones/Struck Idiophones/Tubular Bells 1.sfz` | velocidad | — |
| `Gong` (**común**) | `VCSL/Idiophones/Struck Idiophones/Gong 1.sfz`, **nota 61** | velocidad | — |
| `Piano Cluster` | `VCSL/Chordophones/Zithers/Upright Piano, Knight.sfz` | velocidad | — |
| `Timpani` / `Timp Roll` | `VSCO-2-CE/Timpani.sfz` / `VSCO-2-CE/TimpaniRolls.sfz` | velocidad (+ CC11 en el redoble) | redoble ≤ 16 s |
| `Horns` (C) | `…/Brass - Performance/Horns Sustain.sfz` | **CC1** | **≤ 2,8 s** (sin bucle; sample más corto 3,04 s) |
| `Trombones` (C) | `…/Brass - Performance/Trombones Sustain (looped).sfz` | **CC1** | sin límite (con bucle) |
| `Violins` (C) | `VSCO-2-CE/ViolinEnsSusVib.sfz` | velocidad + CC11 | ≤ 8,5 s |
| `Violins Trem` / `Violas Trem` (C) | `VSCO-2-CE/ViolinEnsTrem.sfz` / `VSCO-2-CE/ViolaEnsTrem.sfz` | velocidad + CC11 | ≤ 7 s |
| `Xylophone` (C) | `VCSL/Idiophones/Struck Idiophones/Xylophone - Soft Mallets.sfz` | velocidad | — |
| `Cellos Spic` / `Basses Spic` (C) | `VSCO-2-CE/CelloEnsSpic.sfz` / `VSCO-2-CE/ContrabassSpic.sfz` | velocidad | — |
| `Col Legno Vn` (C) | `…/Strings - Performance/1st Violins Col Legno.sfz` | velocidad | — |
| `Bass Drum` (C) | `VCSL/Membranophones/Struck Membranophones/Bass Drum 2.sfz` (62 = golpe, 63 = redoble) | velocidad | — |

(C) = solo en combate. El resto, solo en exploración salvo las comunes y `Timpani`, `Timp Roll`, `Choir`,
`Piano Cluster`, que existen en las dos con distinta dinámica.

**Sonatina por CC1** (`Alto Flute`, `Bass Clarinet`, `Cello Solo`, `Choir`, `Choir Melody`, `Low Trem`, `Horns`,
`Trombones`): **curva de CC1 obligatoria**, con un punto en el tick 0 antes de la primera nota y la forma de cada
frase; como mucho un punto cada corchea. En estos patches la velocidad no cuenta. **Celesta y col legno** (Sonatina
por velocidad): sin CC1, o un único valor fijo de 100 en el tick 0.

**Patrón del *ostinato* de combate** (`Cellos Spic`, el del boceto): 8 corcheas por compás con los intervalos
`[0, 0, 7, 0, 12, 0, 7, 3]` sobre la fundamental del bajo de §4 en la octava 2 (A2 = 45 … hasta A3 = 57; el «3» es
la tercera del acorde, menor o mayor según el cifrado), siguiendo los cambios de acorde por medio compás. **Acentos
3+3+2 en las corcheas 0, 3 y 6** (+14 de velocidad).

### Intro «Bajo las losas» (1–2)

**Exploración (máximo 6 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Cabeza** | `Bass Clarinet` | §5 (45–52) | Legato; CC1 50 → 62; suelta en el t3 del c. 2. |
| Pedal | `Low Trem` (**común**) | A2 (45) c. 1 · A2 (h) G#2 (h) c. 2 | CC1 48 → 55. |
| Bajo | `Basses Quiet` | A1 (33) · A1 (h) G#1 (h) (32) | *pp* (vel. 32). |
| Arpa | `Harp` | Patrón de cuatro notas por compás: t1 fundamental (≤ 45), «2 y» quinta (40–52), t3 tercera (48–60), «4 y» quinta octava alta (52–64). c. 1: A1 E2 C3 E3 (33 40 48 52) · c. 2: A1 (t1) E3 («2 y») / G#1 (t3) B2 («4 y») (33 52 / 32 47) | *p* (vel. 42–50); la primera nota de cada compás +6. |
| Campana | `Bell` (**común**) | A4 (69), t1 del c. 1 | vel. 48. |

**Combate (máximo 8 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Cabeza** | `Horns` | §5 (45–52) | CC1 70 → 82. Cada negra con apoyo; la E3 (h) con caída a 72. |
| *Ostinato* | `Cellos Spic` | Patrón de arriba, 45–57; G#2 en t3–4 del c. 2 | Desde el c. 1, *mp* (vel. 60 / acentos 74). |
| Huesos | `Col Legno Vn` | Quinta del acorde en 55–64 (E4 = 64 en Am; D#4/B3 en E7) | 8 golpes por compás en las **semicorcheas impares** (1, 3, 5 … 15), notas de 0,1 s; vel. 44/52 alternas (el boceto). |
| Pedal | `Low Trem` (**común**) | Como en exploración | — |
| Timbal | `Timpani` | A2 (45) en t1, E2 (40) en t3 | *mp* (vel. 64 / 54). |
| Campana | `Bell` (**común**) | Como en exploración | — |

### A «La nana» (3–6)

**Exploración (máximo 8 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía** | `Vibes Bowed` | §5 (68–77) | **Arco suave**: vel. 50–62, nunca > 64. Cada nota de negra o más empieza **120 ms antes** del tiempo (el arco tarda en hablar); las corcheas, 80 ms antes y +6 de velocidad. Suelta en el t4 del c. 6. |
| Halo | `Choir` (voces graves) | c. 3: A2 C3 E3 (45 48 52) / A2 C3 D#3 (45 48 51) · c. 4: G#2 C3 D3 (44 48 50) / G#2 B2 D3 (44 47 50) · c. 5: A2 C3 E3 / B♭2 D3 F3 (46 50 53) (t3) / G#2 B2 D3 (t4) · c. 6: A2 C3 E3 / G2 C3 E3 (43 48 52) | CC1 40 → 55 → 42: un susurro. Siempre por debajo de G3 (55). |
| Pedal | `Low Trem` (**común**) | A2 F2 · E2 · A2 B♭2 E2 · A2 G2 (45 41 · 40 · 45 46 40 · 45 43), una nota por acorde | CC1 50 → 62 → 52. |
| Bajo | `Basses Quiet` | Bajo de §4 (28–34) | *pp* (vel. 34). |
| Arpa | `Harp` | Patrón de la intro sobre la armonía nueva, ≤ 64 | *p* (vel. 44–54). |
| Huesos | `Col Legno Vc` (**común**) | c. 4, t4: tresillo de corcheas E3 F3 F#3 (52 53 54) · c. 6, t4: A2 B♭2 B2 (45 46 47) | vel. 50 / 46 / 42 (decreciente). |
| Cristal | `Glass` | **D#5 (75)**, del t1 del c. 6 (adelantada 150 ms) al final del c. 6 | *pp* (vel. 38): el tritono flota sobre la tónica. |
| Gong | `Gong` (**común**) | 61, t3 del c. 6 | vel. 40. |

**Combate (máximo 11 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía** | `Violins` | §5 (68–77) | Legato *mf* (vel. 72–84); CC11 con < > de ±12 % en las notas de blanca. |
| **Melodía 8vb** | `Horns` | 56–65 | Doblaje declarado; CC1 82 → 92 (c. 5) → 84. La A3 del c. 6 dura h. (2,5 s). |
| Coro | `Choir` (voces graves) | Las voces de exploración | CC1 60 → 80 → 62. |
| *Ostinato* | `Cellos Spic` | Patrón de §6 | *mf* (vel. 66 / acentos 80). |
| *Ostinato* grave | `Basses Spic` | Fundamental en la octava 1 (28–40) | Solo en las corcheas 0, 3 y 6, vel. 78. |
| Huesos | `Col Legno Vn` | Como en la intro | vel. 48/56. |
| Pedal | `Low Trem` (**común**) | Como en exploración | — |
| Huesos graves | `Col Legno Vc` (**común**) | Como en exploración | — |
| Timbal | `Timpani` | Fundamental en t1, quinta en t3 (36–48) | *mf* (vel. 74 / 62). |
| Bombo | `Bass Drum` | 62 en el t1 de los c. 3 y 5 | vel. 62. |
| Gong | `Gong` (**común**) | Como en exploración | — |

### A' «El eco» (7–10)

**Exploración (máximo 8 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía** | `Alto Flute` | §5 (67–81) | Legato (solape 40 ms); CC1 64 → **84 (t1 del c. 8)** → 70. |
| Fantasmas | `Celesta` | c. 7: E6 (88) en «1 y» (e) y A5 (81) en «4 y» (e) · c. 8: C#6 (85) en t3 (q) | vel. 44 / 40 / 46. **Solo estas tres notas** en la pista: el eco del boceto, que no se convierte en segunda melodía. |
| Contracanto | `Bass Clarinet` | Lamento de §5 (46–57) | CC1 58 → 70 → 60; al menos 12 por debajo de la flauta. |
| Halo | `Choir` (voces graves) | c. 7: A2 D3 F3 (45 50 53) / A♭2 D3 F3 (44 50 53) · c. 8: G2 C#3 E3 (43 49 52) · c. 9: A2 C3 F3 (45 48 53) / B2 D3 F3 (47 50 53) · c. 10: B2 E3 G3 (47 52 55) / B♭2 E3 G3 (46 52 55) | CC1 45 → 60 → 48. El A♭2 del c. 7 es la séptima de B♭7; el B♭2 del c. 10, la de C7. |
| Pedal | `Low Trem` (**común**) | F2 B♭2 · A2 · D3 G2 · C3 B♭2 (41 46 · 45 · 50 43 · 48 46) | CC1 52 → 62. |
| Bajo | `Basses Quiet` | Bajo de §4 (29–38) | *pp*. |
| Arpa | `Harp` | Patrón, ≤ 64 | *p*. |
| Huesos | `Col Legno Vc` (**común**) | c. 8, t4: B♭2 B2 C#3 (46 47 49), tresillo que lleva al D del c. 9 | vel. 50 / 46 / 42. |


**Combate (máximo 12 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía 7–8** | `Violins` + `Xylophone` | §5 (73–81) | Unísono declarado. Violines *mf* → *f* (vel. 80 → 90); xilófono vel. ≤ 58. |
| **Melodía 9–10** | `Violins` | §5 (67–77) | *mf*. |
| Contracanto | `Trombones` | Lamento de §5 (46–57) | CC1 72 → 88 → 75. |
| Coro | `Choir` | Voces de exploración | CC1 62 → 85 → 66. |
| *Ostinato* | `Cellos Spic` + `Basses Spic` | Como en A, siguiendo el bajo de §4 | *mf*. |
| Huesos | `Col Legno Vn` | Como en A | vel. 50/58. |
| Pedal | `Low Trem` (**común**) | Como en exploración | — |
| Huesos graves | `Col Legno Vc` (**común**) | Como en exploración | — |
| Timbal | `Timpani` | t1: D2 · A2 · D2 · C2 (38 45 38 36); t3: B♭2 · E2 · G2 · B♭2 (46 40 43 46) | *mf* (vel. 76 / 64). |
| Bombo | `Bass Drum` | 62, t1 de los c. 7 y 9 | vel. 66. |

### B «La capilla» (11–14): respiro

**Exploración (máximo 6 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía** | `Cello Solo` | §5 (64–72) | *p* dolce; CC1 58 → **72 (c. 12)** → 55. |
| Halo | `Vibes Bowed` | E5 tenido c. 11–12 (76; una nota de 6,67 s) · F5 (h) D5 (h) (77 74) · D5 (w) (74) | vel. 36–40, por encima de la melodía. |
| Arpa | `Harp` | Acorde arpegiado grave en t1 (≤ 57) + **una** nota aguda en t3: A5 · G5 · F5 · E5 (81 79 77 76) | *p* (vel. 42–48). Mucho espacio. |
| Pedal | `Low Trem` (**común**) | A2 · F2 · D3 B♭2 · E2 (45 · 41 · 50 46 · 40) | CC1 45. |
| Campana | `Bell` (**común**) | F4 (65), t1 del c. 11 | vel. 44. |
| Campanillas | `Hand Chimes` | C5 (72) en t1 del c. 13 · B4 (71) en t3 del c. 14 | vel. 42. **Solo estas dos.** |

**Combate (máximo 7 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía** | `Horns` | §5 (64–72) | Unísono de sección: CC1 70 → 84 (c. 12) → 66. La E4 del c. 14 dura h. con diminuendo. |
| *Ostinato* | `Cellos Spic` | Corcheas, fundamental y quinta alternas, 41–53 | **Sin acentos**, *p* (vel. 56). Sin `Basses Spic`. |
| Pad | `Violas Trem` | A3 C4 · A3 C4 · A3 C4 / G3 D4 · A3 D4 / G#3 D4 (57 60 · 57 60 · 57 60 / 55 62 · 57 62 / 56 62) | *pp* (vel. 36). ≤ D4 (62): por debajo de la melodía. |
| Pedal | `Low Trem` (**común**) | Como en exploración | — |
| Campana | `Bell` (**común**) | Como en exploración | — |
| Timbal | `Timpani` | F2 (41) t1 del c. 11 · D2 (38) t1 del c. 13 · E2 (40) t3 del c. 14 | *p* (vel. 48). |

### Puente «La losa se mueve» (15–18)

**Exploración (máximo 8 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía 15–16** | `Bass Clarinet` | §5 (57–66) | CC1 60 → 72. |
| **Melodía 17–18** | `Alto Flute` | §5 (63–69) | CC1 68 → 86. |
| La losa | `Piano Cluster` | A1 + B♭1 (33 34), t1 del c. 15 | vel. 54 / 50, nota de 2 s. **Único cúmulo del bucle.** |
| Coro | `Choir` (voces graves) | A2 C3 E3 · G2 C3 E♭3 · B♭2 E♭3 G♭3 · A2 C3 F#3 / G#2 B2 D3 (45 48 52 · 43 48 51 · 46 51 54 · 45 48 54 / 44 47 50) | CC1 45 → 78 (crescendo continuo). |
| Pedal | `Low Trem` (**común**) | A1 · C2 · E♭2 · F#2 / E2 (33 · 36 · 39 · 42 / 40) | CC1 55 → 85. |
| Bajo | `Basses` | Bajo de §4 (28–39) | *p* → *mf* (vel. 50 → 72). |
| Arpa | `Harp` | Corcheas ascendentes por el acorde, ≤ 60 | vel. 44 → 66. |
| Redoble | `Timp Roll` | E♭2 (39) en el c. 17 → E2 (40) en el c. 18 | *pp* → *mp* (CC11 30 % → 85 %); corta justo en el t1 del c. 19. |

**Combate (máximo 11 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía 15–16** | `Trombones` | §5 (57–66) | CC1 78 → 92. |
| **Melodía 17–18** | `Horns` + `Violins Trem` 8va | Trompas 63–69 · violines 75–81 | Trompas CC1 84 → 100; violines vel. 60 → 80 (doblaje declarado). |
| La losa | `Piano Cluster` | Como en exploración | vel. 70 / 66. |
| Coro | `Choir` | Voces de exploración | CC1 60 → 95. |
| *Ostinato* | `Cellos Spic` + `Basses Spic` | Patrón de §6 | Crescendo *mf* → *f*. |
| Huesos | `Col Legno Vn` | Quinta del acorde, 55–64 | c. 15–16 como en A; **c. 17–18 en semicorcheas seguidas** (16 por compás) con acentos 0, 3, 6, 8, 11, 14, vel. 46 → 70. |
| Pedal | `Low Trem` (**común**) | Como en exploración | — |
| Redoble | `Timp Roll` | Como en exploración | Hasta *mf*. |
| Redoble de bombo | `Bass Drum` 63 | c. 18 entero | *mp* → *f* (vel. 74; CC11 40 % → 100 %). |

### Retorno «Despiertan» (19–22)

**Exploración (máximo 10 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía** | `Alto Flute` + `Vibes Bowed` al unísono | §5 (68–77) | Flauta CC1 76 → **88 (t1 del c. 21)** → 70; vibráfono vel. 56 → **64 (c. 21)** → 50, con el adelanto de 120 ms. |
| Contracanto | `Cello Solo` | §5 (56–64) | CC1 66 → 80 (c. 21) → 60. |
| Coro | `Choir` (voces graves) | c. 19: A2 C3 E3 / A2 C3 D#3 · c. 20: A2 C3 D3 / G#2 B2 D3 · c. 21: A2 C3 E3 / B♭2 D3 F3 (t3) / G#2 B2 E3 (t4) · c. 22: A2 C3 E3 / A2 D3 F3 (45–53) | CC1 55 → 70 (c. 21) → 50. |
| Pedal | `Low Trem` (**común**) | A2 F2 · F2 G#2 · F2 B♭2 E2 · A2 (45 41 · 41 44 · 41 46 40 · 45) | CC1 62 → 80 → 58. |
| Bajo | `Basses` | Bajo de §4 | *mf* (vel. 70 → 78 → 60). |
| Arpa | `Harp` | Corcheas por el acorde, ≤ 64 | vel. 50–62. |
| Timbal | `Timpani` | A2 (45) t1 del c. 19 (vel. 58) · F2 (41) t1 del c. 21 (vel. 72) | **Solo estos dos golpes** en la exploración. |
| Campana | `Bell` (**común**) | A4 (69), t1 del c. 19 | vel. 60. |
| Gong | `Gong` (**común**) | 61, t1 del c. 19 | vel. 52. |
| Huesos | `Col Legno Vc` (**común**) | c. 20, t4: E2 F2 F#2 (40 41 42), tresillo hacia el F del c. 21 | vel. 54 / 50 / 46. |

**Combate (máximo 12 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Melodía** | `Violins` + `Choir Melody` (voces femeninas, 68–77) | §5 | Unísono declarado. Violines vel. 84 → **96 (c. 21)** → 80; coro CC1 85 → **100 (c. 21)** → 80. |
| Contracanto | `Horns` | §5 (56–64) | CC1 86 → 100 (c. 21) → 80. Notas ≤ h. |
| Coro | `Choir` (voces graves) | Voces de exploración | CC1 70 → 88 → 66. |
| *Ostinato* | `Cellos Spic` + `Basses Spic` | Patrón de §6 | *f*. |
| Huesos | `Col Legno Vn` | 55–64 | Semicorcheas seguidas en los c. 19–21, desplazado (impares) en el c. 22. |
| Pedal | `Low Trem` (**común**) | Como en exploración | — |
| Huesos graves | `Col Legno Vc` (**común**) | Como en exploración | — |
| Timbal | `Timpani` | Fundamental en t1 de cada compás (A2 · F2 · F2 · A2); en el c. 21 también B♭2 (46) en t3 y E2 (40) en t4 | vel. 80; **c. 21 vel. 96**. |
| Bombo | `Bass Drum` 62 | t1 de los c. 19 y 21 | vel. 74 / 86. |
| Campana | `Bell` (**común**) | Como en exploración | — |
| Gong | `Gong` (**común**) | Como en exploración | — |

### Codetta «Vuelven a dormir» (23–24)

**Exploración (máximo 7 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Cabeza** | `Vibes Bowed` | §5 (69–72) | vel. 46 → 40. |
| Enlace | `Bass Clarinet` | E3 (h) G#2 (h), c. 24 (52 44) | CC1 52 → 45. |
| Coro | `Choir` | c. 23: A2 C3 E3 / A2 D3 F3 · c. 24: A2 B2 D3 / G#2 B2 D3 F3 (45 47 50 / 44 47 50 53) | CC1 48 → 40. |
| Pedal | `Low Trem` (**común**) | A2 · E2 | CC1 50 → 45. |
| Bajo | `Basses Quiet` | A1 · E1 | *pp*. |
| Arpa | `Harp` | Acorde arpegiado en el t1: A1 E2 C3 (33 40 48) · E1 B1 G#2 (28 35 44); B♭2 (46) en el t3 del c. 23 (la nota del napolitano) | *pp*. |
| Campana | `Bell` (**común**) | E4 (64), t1 del c. 23 | vel. 42. |

**Combate (máximo 9 capas)**

| Rol | Pista | Notas / registro | Articulación y dinámica |
|---|---|---|---|
| **Cabeza** | `Horns` | §5 (69–72) | CC1 72 → 60. |
| Enlace | `Horns` | E3 (h) G#2 (h), c. 24 | CC1 66. |
| *Ostinato* | `Cellos Spic` | Patrón de §6, *mp* | **La misma figura con la que arranca el c. 1.** |
| *Ostinato* grave | `Basses Spic` | Acentos en el c. 23; calla en el c. 24 | — |
| Coro | `Choir` | Voces de exploración | CC1 60 → 52. |
| Huesos | `Col Legno Vn` | Desplazado (impares), *pp* | vel. 40/46. |
| Pedal | `Low Trem` (**común**) | Como en exploración | — |
| Timbal | `Timpani` | E2 (40) en el t1 del c. 24 | *p*. |
| Campana | `Bell` (**común**) | Como en exploración | — |

### Notas sobre los samples

- **Vibráfono con arco** (la queja del primer boceto): las regiones 61–65, 66–70 y 71–77 usan samples oscuros
  (medidos: −40, −37 y −46 dB en 2,5–6 kHz respecto al total); **57–60 y 78–89 usan samples brillantes (−24 y
  −12 dB)**: el boceto tocaba el motivo una octava arriba (74–82) y por eso picaba. Aquí todo el vibráfono va en
  **64–77** y a vel. ≤ 64. Ataque lento: adelantar las notas (120 ms negras, 80 ms corcheas) y anotarlo en `compose.py`.
- **Fuera del bucle**: `1st Violins Harmonics` (−0,2 dB en 2,5–6 kHz, el pitido), glockenspiel (−6,6), crótalos
  (−0,6), platos (−2 a −6) y el tam-tam de Sonatina (−7,6). El golpe metálico grave es el `Gong 1` nota 61 (−46 dB) y la
  campana, `Tubular Bells 1` (−45 dB).
- **Celesta** solo en los fantasmas del c. 7–8 (3 notas, 81–88). **Hand Chimes**, 2 notas (−61 dB: casi sin
  brillo). **Copa**, 1 *swell* en la nota 75 (su sample sin transponer). **Cúmulo de piano**, 1.
- **Col legno**: el de violines (`1st Violins Col Legno`, −25 dB en A#4) solo en 55–64 y a vel. ≤ 70; el de chelos es
  mucho más oscuro (−54 dB) y lleva los gestos expuestos.
- **Coro**: por debajo de G4 suena con muestras masculinas y desde G4 con femeninas. Todo el `Choir` va en 43–55
  (masculino, susurro); solo `Choir Melody`, en el retorno de combate, va en 68–77 (femenino) y al unísono con los violines.
- **`Bass Clarinet`** tiene presencia (−9 dB en D3): el bus le quita 2–3 dB en 2,5–4 kHz.
- **`Basses Tremolo`** es de Sonatina, con bucle: la nota tenida no tiene límite, y su CC1 es el **mismo** en las dos
  versiones (capa común).
- No usar ningún `KS`. No cambiar de patch en mitad de una nota tenida.

## 7. Dinámica

| Nivel | pp | p | mp | mf | f |
|---|---|---|---|---|---|
| Velocidad (VSCO, VCSL, celesta, col legno) | 25–40 | 40–55 | 55–70 | 70–85 | 85–100 |
| CC1 (Sonatina por CC1) | 40–55 | 55–70 | 70–85 | 85–95 | 95–105 |

Techos: exploración vel. ≤ 80 y CC1 ≤ 90; combate vel. ≤ 100 y CC1 ≤ 105. Vibráfono ≤ 64, copa ≤ 40, celesta ≤ 48,
xilófono ≤ 60, `Col Legno Vn` ≤ 70. CC11 da la forma de las notas largas de VSCO.

| Sección | Exploración | Combate | Gestos |
|---|---|---|---|
| Intro 1–2 | pp → p | mp | La cabeza crece hacia el Re♯ y se apaga en el Mi. |
| A 3–6 | p (acomp.) / mp (melodía) | mf | Swell < > de ~12 % en las blancas; la copa entra *pp* en el c. 6. |
| A' 7–10 | mp → mf (c. 8) → mp | mf → f (c. 8) → mf | Arco de la flauta / violines con cumbre en el t1 del c. 8. |
| B 11–14 | p / pp | mp / p | Plano; único gesto, la cumbre del violonchelo / trompas en el c. 12. |
| Puente 15–18 | p → mf | mf → f | Crescendo continuo de 4 compases (CC1, CC11, velocidades); el redoble corta en el t1 del c. 19. |
| Retorno 19–22 | mf → **mf+ (c. 21)** → mp | f → **f+ (c. 21)** → mf | Pico en el t1 del c. 21; desde ahí, diminuendo por compases. |
| Codetta 23–24 | p → pp | mp | E: todo lo tenido se apaga antes de 80,0 s. C: el *ostinato* baja a *mp* y así entra en el c. 1. |

## 8. Criterios de aceptación

**Partitura (`test_compose.py`, leyendo los dos MIDIs):**

1. Los dos MIDIs: 24 compases de 4/4 a ♩ = 72, sin cambios de tempo, misma longitud en ticks; ninguna nota empieza
   antes del tick 0 ni después de 80,000 s, y todo lo que suena en el c. 24 termina antes de 80,000 s.
2. Todas las notas dentro del rango del catálogo de su patch y de los registros de §6. Techos y suelos: `Vibes Bowed`
   64–77, `Alto Flute` 63–81, `Bass Clarinet` 44–66, `Cello Solo` 56–72, `Celesta` 81–88, `Choir` 43–55, `Choir Melody`
   68–77, `Violins` 67–81, `Violins Trem` 75–81, `Horns` 44–72, `Trombones` 46–66, `Col Legno Vn` 55–64, `Glass` = 75,
   `Hand Chimes` 71–72, `Low Trem` 33–50, `Harp` 32–81.
3. La melodía de referencia de §5 (leitmotiv, consecuente y contracantos) aparece con las alturas y los ataques exactos
   en las **dos** versiones: c. 1–2, 3–6, 7–10, 11–14, 15–18, 19–22, 23 y 24.
4. Las capas comunes (`Low Trem` con su CC1, `Bell`, `Gong`, `Col Legno Vc`) son idénticas en los dos MIDIs: mismas
   alturas, ticks de inicio y fin, velocidades y CC **después** de humanizar.
5. Figuras: en exploración, nada más corto que la corchea salvo los tresillos de `Col Legno Vc`; en combate, semicorcheas
   solo en `Col Legno Vn` y en el redoble de bombo.
6. Capas simultáneas por sección ≤ E 6 / 8 / 8 / 6 / 8 / 10 / 7 y C 8 / 11 / 12 / 7 / 11 / 12 / 9
   (intro / A / A' / B / puente / retorno / codetta).
7. **Sin choques de registro:** mientras suena una melodía de §5, ninguna otra pista mantiene notas de negra o más en
   la misma octava con velocidad (o CC1) ≥ la de la melodía. Unísonos y doblajes declarados: flauta + vibráfono
   (19–22), violines + xilófono (7–8), violines + `Choir Melody` (19–22), trompas 8vb (3–6), violines en trémolo 8va
   (17–18), el halo del vibráfono en B (vel. ≤ 40 y siempre por encima de la melodía).
8. Ninguna velocidad ni CC1 por encima de los techos de §7. El c. 21 tiene el CC1 (o velocidad) más alto de la línea de
   melodía y del timbal en las dos versiones.
9. Cada pista de Sonatina por CC1 tiene CC1 en el tick 0 y como mucho un punto por corchea. Duraciones máximas:
   `Alto Flute` ≤ 2,8 s, `Bass Clarinet` ≤ 2,5 s, `Horns` ≤ 2,8 s por nota; `Vibes Bowed` ≤ 9 s; `Glass` ≤ 20 s.
10. *Ostinato* de combate: en todos los compases con `Cellos Spic` salvo B, el patrón `[0, 0, 7, 0, 12, 0, 7, 3]` y los
    acentos en las corcheas 0, 3 y 6; en B, sin acentos. Ninguna racha de más de 3 corcheas con la misma altura y la misma
    velocidad (±3).
11. Brillos contados por bucle (en cada versión donde existan): `Celesta` 3, `Hand Chimes` 2, `Glass` 1, `Bell` 4, `Gong` 2,
    `Piano Cluster` 1. Ninguna pista con armónicos de violín, glockenspiel, crótalos, platos ni tam-tam.
12. **Armonía:** la nota más grave que suena en el t1 y el t3 de cada compás tiene la clase de altura del bajo de §4.

**Mezcla (informe de `mix.py`, una `MixSpec` por versión, medido sobre el MP3 decodificado):**

13. Sonoridad integrada: exploración **−17,5 ± 0,5 LUFS**, combate **−16,5 ± 0,5 LUFS**. Pico real **≤ −1 dBTP** en las dos.
14. `loop_samples` = **3 528 000** en las dos; `seam_jump` < 0,02 en las dos.
15. Contraste dentro de cada versión (`sections_lufs`): retorno c. 19–22 frente a B c. 11–14 entre **+4 y +8 LU** en
    exploración y entre **+3 y +6 LU** en combate; puente c. 17–18 frente a c. 15–16 al menos +1,5 LU.
16. Contraste entre versiones: en cada sección de §3, combate − exploración entre **0 y +4 LU**. Nunca más bajo el combate.
17. Bandas (`bands_db`, relativas al total), en las dos: `presencia 2.5-6k` ≤ **−19 dB**, `aire 6-16k` ≤ **−30 dB**,
    `sub <60` ≤ −20 dB. Primer listón (más estricto que el Acto I por los agudos que molestan al usuario): se recalibra
    tras la primera entrega si la escucha lo pide.
18. Ninguna parte suelta pasa de −6 dB de pico antes del bus. En exploración, `Vibes Bowed` en A (c. 3–6) al menos 3 LU por
    encima de `Choir` (la melodía manda) y `Glass` al menos 8 LU por debajo del vibráfono.
19. Las dos `MixSpec` comparten sala (mismos `reverb` y `reverb_eq`) y la colocación (pan, envío, anchura) de las pistas
    que existen en ambas; las capas comunes con el mismo `gain_db` y en buses lineales (sin compresor) idénticos.
20. **Prueba de cruce**: `mix.py` escribe `build/acto2-cripta-cruce.mp3`: exploración de 0 a 24 s, fundido lineal de 1,6 s a
    combate en 24 s (c. 8), vuelta a exploración en 56 s (c. 17), como hace el juego. En la sonoridad a corto plazo
    (ventana de 3 s) no hay un bache de más de 3 LU por debajo de la menor de las dos versiones ni un salto de más de 4 LU,
    y a la escucha no hay ataques duplicados ni *flam* en el trémolo, la campana ni el col legno de chelos.
21. Escucha: el vibráfono de A suena suave, como un arco sobre metal frío, nunca como un pitido; en A' se reconoce el
    «Sombra» del boceto en re; B suena a capilla (la #11 es luz, no error); el puente sube; el Fmaj7 del c. 21 suena a que la
    cripta se abre; en combate, la danza de huesos se entiende y los efectos del juego siguen claros en el c. 21.

### `MixSpec` (las dos versiones)

```python
MixSpec(
    midi='scripts/musica/acto2-cripta/build/acto2-cripta-explora.mid',   # o -combate.mid
    out='scripts/musica/acto2-cripta/build/acto2-cripta-explora.mp3',    # o -combate.mp3
    bpm=72, beats_per_bar=4, bars=24,          # loop_samples = 24 × 4 × 60/72 × 44 100 = 3 528 000
    target_lufs=-17.5,                         # combate: -16.5
    ceiling_dbtp=-1.0,
    reverb={'seconds': 2.8, 'predelay': 0.03, 'damping': 0.5},   # la sala del boceto (cripta de piedra)
    sections={'intro 1-2': (1, 2), 'A 3-6': (3, 6), "A' 7-10": (7, 10), 'B 11-14': (11, 14),
              'puente 15-16': (15, 16), 'puente 17-18': (17, 18), 'retorno 19-22': (19, 22),
              'codetta 23-24': (23, 24), 'c21': (21, 21)},
    ...)
```

Buses de partida: los del boceto (`arreglos.py` y `acto2_bocetos.py`, `BUS`). Brillos (celesta, copa, campanillas, campana)
con paso alto ≈ 300 Hz y estantería −4 dB desde 6 kHz; melodías con −2 dB en 3,2 kHz; coro con −2 dB en 300 Hz y −3 dB en
3 kHz; `perc` (col legno, gong, timbal) con −3 dB en 3,5 kHz. Las capas comunes, en buses sin compresor e idénticos en las
dos `MixSpec`. El ingeniero de mezcla los ajusta para cumplir 13–19.

**Integración (cuando el usuario lo apruebe):** copiar a `src/audio/cap2-e0.mp3` y `src/audio/cap2-e0-combate.mp3` y añadir a
`MUSIC_TRACKS` (`src/fx/music-tracks.ts`):
`'cap2-e0': { file: 'cap2-e0.mp3', loopSamples: 3528000, group: 'cap2-e0' }` y
`'cap2-e0-combate': { file: 'cap2-e0-combate.mp3', loopSamples: 3528000, group: 'cap2-e0' }`.
