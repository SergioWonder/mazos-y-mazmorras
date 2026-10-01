# Brief: Acto I, escenario 1, «La Guarida de los Contrabandistas» — «Bajo la posada vieja»

Una canción en **dos versiones sincronizadas**: **exploración** (mapa y eventos) y **combate** (combates
normales y élites). Ids de juego: `cap1-e1` y `cap1-e1-combate`. Pista nueva en
`scripts/musica/acto1-contrabandistas/` con las convenciones del
[README del estudio](../../scripts/musica/estudio/README.md):

- `compose.py` genera **los dos MIDIs a la vez**: `build/acto1-contrabandistas-explora.mid` y
  `build/acto1-contrabandistas-combate.mid`, desde una única descripción de forma, armonía y melodía.
- `mix.py` renderiza los dos (`…-explora.mp3`, `…-combate.mp3`) y la prueba de cruce
  `build/acto1-contrabandistas-cruce.mp3` (criterio 19).

Necesita montado el disco **Base** (VCSL y Sonatina). Referencias: [menu.md](menu.md) y
[acto1-ogros.md](acto1-ogros.md) (mismas reglas de sincronía entre versiones).

## 1. Función, emoción y repetición

- **Dónde suena:** el mapa, los eventos y los combates normales y de élite del escenario alternativo del Acto I:
  la guarida de una hermandad de ladrones y ninjas, en el sótano de una posada vieja, al final de una ruta de
  contrabando por el valle.
- **Emoción:** tono ligeramente serio, como el Asentamiento Ogro, pero con otro color: **barco pirata y tugurio
  de contrabandistas**. Canción de taberna en 6/8, armónica como acordeón, flauta dulce como silbato, violín
  solista como violín de fonda, piano vertical de taberna. Picardía con un fondo de peligro: el modo es menor
  (dórico) y hay una sección de sótano sigiloso.
  - Exploración: vaivén de barco, a media voz; los solistas se pasan la melodía.
  - Combate: la misma canción como giga de abordaje: corcheas continuas de cuerdas, *oom-pah* de tuba y fagot,
    trompas en marcato, cajón y tambores.
- **Repetición:** 15–40 minutos por escenario, decenas de saltos entre versiones. Un clímax (c. 49), un
  respiro claro (sección C) y la costura sin señal.
- **Transformación del leitmotiv:** **sol menor dórico** en 6/8 con ritmo de **saloma** (canción de trabajo
  marinera); sexta dórica (Mi♮) en el motivo; **modo mayor** en la taberna; **inversión** en el sótano; la cola
  como ostinato frigio. La «señal» de los contrabandistas es la cabeza del motivo a su altura original (re–la)
  sobre sol menor (ver §5).

## 2. Tempo, métrica, tonalidad, duración

| Parámetro | Valor (idéntico en las dos versiones) |
|---|---|
| Tempo | ♩. = 90 (en el MIDI: **♩ = 135**), fijo |
| Métrica | 6/8 (dos tiempos de negra con puntillo) |
| Tonalidad | sol menor dórico (Mi♮ en el motivo y en el IV mayor); B en si♭ mayor; C con ♭II frigio (La♭) |
| Compases | **60** |
| Duración del bucle | 60 × 3 negras × 60/135 = **80,000 s** → `loop_samples` = **3 528 000** a 44,1 kHz |
| `MixSpec` (ambas) | `bpm=135`, `beats_per_bar=3`, `bars=60` (el estudio cuenta en negras: un 6/8 son 3 negras) |

Un compás dura 1,333 s. Signatura MIDI 6/8. **Rejilla:** corcheas 0–5 por compás; tiempos fuertes en las
corcheas 0 y 3. Notación: q. = negra con puntillo, q = negra, e = corchea.

**Figuras:** corchea mínima en todo, salvo los rellenos de tom del combate (semicorcheas, solo al final de
sección). Ritmos característicos: *saloma* q. q. | q e q. y *giga* q e q e.

### Reglas de sincronía (exploración ↔ combate)

Las mismas que en [acto1-ogros.md](acto1-ogros.md#reglas-de-sincronía-exploración--combate): misma forma y
armonía (§3, §4); **misma melodía de referencia** (§5) en las dos versiones, con instrumento, dinámica y
doblajes libres; capas comunes idénticas nota a nota con la misma humanización:

- `Basses Pizz` (`ContrabassPizz`): fundamental en la corchea 0 y quinta en la 3, en los c. 5–28 y 37–56; solo la
  fundamental en la corchea 0 en los c. 29–36 y 57; nada en 1–4 ni 58–60.

## 3. Forma compás a compás e intensidad

| Sección | Compases | Tiempo (s) | Contenido | Intensidad E | Intensidad C |
|---|---|---|---|---|---|
| Intro | 1–4 | 0,00–5,33 | «La señal»: ocarina (E) o violín (C) con la cabeza re–la; bajada i–♭VII–♭VI–V | 2 | 4 |
| A | 5–12 | 5,33–16,00 | **Motivo completo** (5–8); respuesta hacia si♭ y semicadencia (9–12) | 4 | 6 |
| A' | 13–20 | 16,00–26,67 | Motivo rearmonizado con contracanto; cadena ii–V hacia si♭ | 5 | 7 |
| B «La taberna» | 21–28 | 26,67–37,33 | Si♭ mayor: el motivo en mayor en el piano de taberna; dominante secundaria; vuelve a D7 | 5 | 7 |
| C «La bodega» | 29–36 | 37,33–48,00 | **Respiro.** Pedal de sol, La♭ frigio; el motivo **invertido** en clarinete bajo; la cola en ostinato | 3 (mínimo) | 5 (mínimo) |
| Puente «Abordaje» | 37–44 | 48,00–58,67 | Bajo ascendente E♭ → D; secuencia de la cabeza; crescendo | 4 → 7 | 6 → 9 |
| Retorno | 45–56 | 58,67–74,67 | Tutti con el motivo; **clímax en el c. 49** (64,00 s); cadencia con la cola (53–54) | 7 → **8** (c. 49) → 5 | 9 → **10** (c. 49) → 7 |
| Codetta | 57–60 | 74,67–80,00 | Vuelve la señal; encadena con el c. 1 | 2 | 5 |

Respiros: c. 8 y 16 (la G final tenida, sin nada nuevo encima), c. 24 (segundo tiempo), toda la sección C y la
codetta. En combate C baja de densidad (sin giga de violas ni *oom-pah*) pero **mantiene el pulso**.

## 4. Armonía por sección (común a las dos versiones)

Cifrado por compás; «(1) / (2)» = primer / segundo tiempo de negra con puntillo.

**Intro (1–4)**: bajada andaluza, solo aquí.

| 1 | 2 | 3 | 4 |
|---|---|---|---|
| Gm | F | E♭ | D (1) / D7 (2) |

**A (5–12)**: el IV mayor dórico (C) en el c. 6; respuesta que pasa por si♭ y vuelve a semicadencia.

| 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|
| Gm | **C** (1) / Gm/B♭ (2) | F (1) / D7 (2) | Gm | B♭ | Cm (1) / F7 (2) | Gm (1) / Cm7 (2) | D7sus4 (1) / D7 (2) |

**A' (13–20)**: rearmonización (♭VI, IV7 dórico, D7/F#) y círculo ii–V–iii–vi–ii–V hacia si♭.

| 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|---|
| E♭maj7 | C7 (1) / Gm/B♭ (2) | F (1) / D7/F# (2) | Gm (1) / Gm/F (2) | E♭maj7 | Cm7 (1) / F7 (2) | Dm7 (1) / Gm7 (2) | Cm7 (1) / F7 (2) |

**B «La taberna» (21–28)**: si♭ mayor; **G7 = V/ii** en el c. 24; vuelta a sol menor por Am7♭5 – D7(♭9).

| 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 |
|---|---|---|---|---|---|---|---|
| B♭ | E♭ (1) / B♭/D (2) | Cm7 (1) / F7 (2) | B♭ (1) / **G7** (2) | Cm | F7 (1) / B♭maj7 (2) | E♭maj7 (1) / Am7♭5 (2) | D7(♭9) |

**C «La bodega» (29–36)**: pedal de sol (29–34) con el **La♭maj7** frigio; el **C7** dórico (35) es una rendija de luz.

| 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 |
|---|---|---|---|---|---|---|---|
| Gm (1) / Cm/G (2) | A♭maj7/G | Gm7 | Gm | Cm/G | A♭maj7/G | E♭ (1) / C7 (2) | D7sus4 (1) / D7 (2) |

**Puente «Abordaje» (37–44)**: bajo por grados ascendentes E♭ F G A♭ B♭ C D D.

| 37 | 38 | 39 | 40 | 41 | 42 | 43 | 44 |
|---|---|---|---|---|---|---|---|
| E♭ | F | Gm | **A♭** (♭II) | B♭ | **C** (IV dórico) | D7sus4 | D7(♭9) |

**Retorno (45–56)**: el motivo con la armonía de A; consecuente nuevo con el clímax sobre E♭maj7, V/iv
(G7/B), **cadencia rota** D7 → E♭ (52–53) y cadencia perfecta en el c. 54.

| 45 | 46 | 47 | 48 | 49 | 50 | 51 | 52 |
|---|---|---|---|---|---|---|---|
| Gm | C (1) / Gm/B♭ (2) | F (1) / D7 (2) | Gm (1) / Gm/F (2) | **E♭maj7** (clímax) | Cm7 (1) / F7 (2) | B♭ (1) / G7/B (2) | Cm (1) / D7 (2) |

| 53 | 54 | 55 | 56 |
|---|---|---|---|
| **E♭** (1) / D7 (2) | Gm | E♭ (1) / Cm (2) | D7 |

**Codetta (57–60)**: distinta de la intro para que la costura no repita ocho compases iguales.

| 57 | 58 | 59 | 60 |
|---|---|---|---|
| Gm | Gm/F | E♭maj7 | Am7♭5 (1) / D7 (2) |

## 5. Leitmotiv

Referencia (re mayor, grados 1 5 | 6 5 3 | 4 3 2 | 1). **Versión de esta pista: «saloma»**, sol menor dórico en
6/8, cuatro compases:

```
| G     D     | E    D  Bb   | C    Bb  A    | G  ~  G      |
| q.    q.    | q    e  q.   | q    e   q.   | q.    q.     |
```

La sexta (E♮, dórica) es la que da el color marinero. Las alturas de esta sección son la **melodía de referencia**
(idéntica en las dos versiones).

| Compases | Exploración | Combate | Notas (MIDI) | Transformación |
|---|---|---|---|---|
| 1–4 | Ocarina | Violin Solo 1 | D5 (q.) A5 (q.) · — · D5 (q.) A5 (q) G5 (e) · F#5 (q. + q.) (74 81 · — · 74 81 79 · 78) | **La señal**: la cabeza a la altura original del menú (re–la), pero sobre sol menor y E♭ (con La = ♯11): suena a pregunta, a contraseña. |
| **5–8** | **Flauta dulce tenor** | **Horns Marcato** | **G4 D5 · E5 D5 B♭4 · C5 B♭4 A4 · G4 (67 74 · 76 74 70 · 72 70 69 · 67)** | Exposición: 6/8 de saloma, modo dórico. |
| 13–16 | Violin Solo 1 | Violin Solo 1 + `ViolinEnsSusVib` unísono | = c. 5–8 | Rearmonizado: la G4 inicial sobre E♭maj7, la E5 sobre C7. |
| 21–24 | Piano de taberna (mano derecha) | Violin Solo 1 + piano (mano derecha) unísono | B♭4 F5 · G5 F5 D5 · E♭5 D5 C5 · B♭4 (q.) + anacrusa D5 (e) (70 77 · 79 77 74 · 75 74 72 · 70 74) | **Modo mayor** (si♭): la taberna. |
| 29–32 | Clarinete bajo | Clarinete bajo + `BassoonStac` | G3 C3 · B♭2 C3 E♭3 · D3 E♭3 F3 · G3 (55 48 · 46 48 51 · 50 51 53 · 55), mismo ritmo de saloma | **Inversión diatónica** (cada intervalo hacia el otro lado): el motivo boca abajo, en el sótano. |
| 29–36 | Arpa folk | `ViolinEnsPizz` | Cola C5 B♭4 La4 G4 (e e e q.), con La♮ (69) en 29, 31, 32 y 36 y La♭ (68) en 30, 33, 34, 35; en el c. 36 la última nota es F#4 (66) | **Cola** (4 3 2 1) en ostinato; el 2.º grado alterna dórico / frigio con la armonía. |
| 37–44 | Flauta dulce + armónica (37–40); flauta dulce + Violin Solo 1 (41–44) | 1st Violins Marcato (+ Horns Marcato, unísono en 37–40 y 8vb en 41–44) | E♭4 B♭4 · F4 C5 · G4 D5 · A♭4 E♭5 · B♭4 F5 · C5 G5 · D5 G5 · D5 F#4 (q. q.) (63 70 · 65 72 · 67 74 · 68 75 · 70 77 · 72 79 · 74 79 · 74 66) | **Fragmento** (cabeza 1 → 5) en secuencia ascendente. |
| **45–48** | Violin Solo 1 + flauta dulce tenor | Horns Marcato + `ViolinEnsSusVib` | = c. 5–8 | Tutti. |
| 53–54 | Flauta dulce tenor | Violin Solo 1 | C5 (q) B♭4 (e) A4 (q.) · G4 (q. + q.) (72 70 69 · 67) | La **cola** cierra con la cadencia perfecta. |
| 57–60 | Ocarina | Violin Solo 1 | D5 A5 · — · D5 A5 G5 · A4 (q.) F#5 (q.) (74 81 · — · 74 81 79 · 69 78) | Vuelve la señal. |

Consecuentes (melodía de referencia, no leitmotiv):

- c. 9–12: B♭4 (q) C5 (e) D5 (q.) · E♭5 (q) D5 (e) C5 (q.) · D5 (q.) C5 (q) B♭4 (e) · A4 (q. + q.)
  (70 72 74 · 75 74 72 · 74 72 70 · 69). E: armónica; C: Violin Solo 1.
- c. 17–20: G5 (q.) F5 (q) E♭5 (e) · E♭5 (q) D5 (e) C5 (q.) · F5 (q) D5 (e) B♭4 (q.) · C5 (q.) A4 (q.)
  (79 77 75 · 75 74 72 · 77 74 70 · 72 69). E: flauta dulce tenor; C: `ViolinEnsSusVib`.
- c. 25–28: G5 (q) F5 (e) E♭5 (q.) · F5 (q) E♭5 (e) D5 (q.) · B♭4 (q.) C5 (q) E♭5 (e) · D5 (q. + q.)
  (79 77 75 · 77 75 74 · 70 72 75 · 74). Como 21–24.
- c. 33–36 (clarinete bajo): E♭3 (q.) G3 (q.) · C4 (q) B♭3 (e) A♭3 (q.) · G3 (q.) E3 (q.) · G3 (q.) F#3 (q.)
  (51 55 · 60 58 56 · 55 52 · 55 54).
- c. 49–52: **B♭5** (q.) G5 (q) E♭5 (e) · E♭5 (q) D5 (e) C5 (q.) · B♭4 (q) D5 (e) F5 (q.) · E♭5 (q) D5 (e) C5 (q.)
  (**82** 79 75 · 75 74 72 · 70 74 77 · 75 74 72). **B♭5 (82) del c. 49 es la nota más alta de la pista.**
  E: Violin Solo 1 + flauta dulce tenor; C: `ViolinEnsSusVib` + Violin Solo 1.
- c. 55–56: E♭5 (q.) C5 (q.) · D5 (q. + q.) (75 72 · 74). E: flauta dulce; C: Violin Solo 1.

## 6. Orquestación por sección

### Patches

| Nombre corto | Ruta `.sfz` | Dinámica |
|---|---|---|
| Ocarina | `VCSL/Aerophones/Edge-blown Aerophones/Ocarina, Typical - SusVib.sfz` | velocidad |
| Flauta dulce tenor | `VCSL/Aerophones/Edge-blown Aerophones/Baroque Tenor Recorder - SusVib.sfz` | velocidad |
| Armónica | `VCSL/Aerophones/Free Aerophones/Harmonica-Hohner-Super64 - Vib.sfz` (melodía, pads) y `… - Accented.sfz` (acordes cortos del combate) | velocidad |
| Strumstick | `VCSL/Chordophones/Composite Chordophones/Strumstick.sfz` | velocidad |
| Arpa folk | `VCSL/Chordophones/Composite Chordophones/Folk Harp.sfz` | velocidad |
| Piano de taberna | `VCSL/Chordophones/Zithers/Upright Piano, Knight.sfz` (3 capas, 4 round robin) | velocidad |
| Violin Solo 1 | `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violin Solo 1 Sustain.sfz` | **CC1** |
| Clarinete bajo | `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Bass Clarinet Solo Sustain (looped).sfz` | **CC1** |
| Horns Marcato / Horns Sustain | `sso/Sonatina Symphonic Orchestra/Brass - Performance/Horns Marcato.sfz` / `Horns Sustain.sfz` | **CC1** |
| 1st Violins Marcato | `sso/Sonatina Symphonic Orchestra/Strings - Performance/1st Violins Marcato.sfz` | **CC1** |
| `FHornSus` | `VSCO-2-CE/FHornSus.sfz` | velocidad |
| `ViolinEnsSusVib` / `ViolinEnsPizz` | `VSCO-2-CE/ViolinEnsSusVib.sfz` / `ViolinEnsPizz.sfz` | velocidad |
| `ViolaEnsSusVib-Quiet` / `ViolaEnsSpic` / `ViolaEnsTrem` | `VSCO-2-CE/…` | velocidad |
| `CelloEnsSusVib` / `-Quiet` / `CelloEnsSpic` | `VSCO-2-CE/…` | velocidad |
| `ContrabassPizz` / `ContrabassSusVB-Quiet` / `ContrabassTrem` | `VSCO-2-CE/…` | velocidad |
| `BassoonStac` / `TubaStac` | `VSCO-2-CE/BassoonStac.sfz` / `TubaStac.sfz` | velocidad |
| `Timpani` / `TimpaniRolls` | `VSCO-2-CE/…` | velocidad |
| Cajón | `VCSL/Idiophones/Struck Idiophones/Cajon.sfz` | velocidad |
| Frame Drum | `VCSL/Membranophones/Struck Membranophones/Frame Drum.sfz` | velocidad |
| Bass Drum | `VCSL/Membranophones/Struck Membranophones/Bass Drum 2.sfz` | velocidad |
| Tom | `VCSL/Membranophones/Struck Membranophones/Tom 2.sfz` | velocidad |
| Olas | `VCSL/Membranophones/Other Membranophones/Ocean Drum.sfz` | velocidad |
| Cymbal | `VCSL/Idiophones/Struck Idiophones/Suspended Cymbal 2.sfz` | velocidad |

**Notas de las percusiones sin altura** (comprobadas en los `.sfz` y medidas): Cajón **61 = grave** (centro),
**60 = golpe seco** (borde), 62 = grave apagado; Frame Drum 61 = grande golpe, 62 = grande apagado, 65 = pequeño
apagado (no usar 60 ni 63, brillantes); Bass Drum 62 = golpe, **68 = roce del parche** (un crujido grave: toda su
energía por debajo de 150 Hz; es el **crujido del casco**); Tom 62 = golpe con maza; Ocean Drum 61 = ola
sostenida (22 s); Cymbal 63 = crescendo de 2,5 s, 66 = golpe.

**Sonatina (CC1)**: Violin Solo 1, Clarinete bajo, Horns Marcato/Sustain y 1st Violins Marcato **tienen que llevar
curva de CC1** (punto en el tick 0 y la forma de cada frase; como mucho uno cada 1/8 de compás). Duración máxima
por nota: Violin Solo 1 ≤ 5 s, Horns ≤ 2,8 s, 1st Violins Marcato ≤ 3,5 s; el clarinete bajo `(looped)` sin límite.

**Rasgueo del strumstick**: no hay muestras de rasgueo; cada acorde son 3–4 notas (55–67) escalonadas: abajo →
arriba con 15 ms entre notas en los golpes fuertes (corcheas 0 y 3), arriba → abajo con 10 ms y −12 de
velocidad en los débiles.

### Intro (1–4)

**Exploración (máximo 6 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Señal** | Ocarina | 74–81 | §5, *p*, mucho envío de sala (lejos, en la niebla). |
| Bajo | `CelloEnsSusVib-Quiet` + `ContrabassSusVB-Quiet` | Vc. G2 F2 E♭2 D2 (43 41 39 38) · Cb. una octava abajo | Redondas con puntillo, *pp*. |
| Acordeón | Armónica (Vib) | 55–67 | Acorde tenido por compás (G3 B♭3 D4 · F3 A3 C4 · G3 B♭3 E♭4 · F#3 A3 D4), *pp*. |
| Olas | Olas 61 | — | Una nota de 1–4, *pp* (y la de la codetta, que cruza la costura en continuidad). |
| Crujido | Bass Drum 68 | — | Tiempo 1 del c. 2, *pp*. |

**Combate (máximo 8 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Señal** | Violin Solo 1 | 74–81 | §5, CC1 80. |
| Giga | `CelloEnsSpic` | 38–55 | Corcheas: fundamental (0), quinta (1), octava (2), fundamental (3), quinta (4), octava (5); acentos en 0 y 3. *mp*. |
| Acordeón | Armónica (Accented) | 55–67 | Acorde corto (corchea) en la corchea 3, *p*. |
| Oom-pah | `TubaStac` + `BassoonStac` | Tuba 31–43 · Fg. 50–58 | C. 3–4: tuba en la corchea 0, fagot (nota del acorde) en las corcheas 2 y 5, *mp*. |
| Cajón | Cajón 61 / 60 | — | 61 en las corcheas 0 y 3; 60 en la 5, *mp*. |
| Tambor | Frame Drum 65 | — | Corcheas 1 y 4, *pp* (relleno fantasma). |
| Bombo | Bass Drum 62 | — | Corchea 0 de los c. 1 y 3, *mp*. |

### A (5–12)

**Exploración (máximo 7 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía 5–8** | Flauta dulce tenor | 67–76 | *mp*, legato, respiración al final del c. 8. |
| **Melodía 9–12** | Armónica (Vib) | 69–75 | *mp*; contesta a la flauta. |
| Vaivén | Strumstick | 55–67 | Rasgueo en las corcheas 0 y 3 (q. q.), *p*. |
| Pulso | `ContrabassPizz` (**común**) | 31–43 | Fundamental (0) y quinta (3). |
| Pad | `CelloEnsSusVib-Quiet` | 43–55 | Solo 9–12, fundamentales tenidas, *pp*. |
| Cajón | Cajón 61 / 60 | — | 61 en la corchea 0, 60 en la 3, *p*. |
| Crujido | Bass Drum 68 | — | Segundo tiempo del c. 8, *pp*. |

**Combate (máximo 11 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía 5–8** | Horns Marcato | 67–76 | CC1 95; «¡al abordaje!». |
| **Melodía 9–12** | Violin Solo 1 | 69–75 | CC1 90, con apoyo en cada negra con puntillo. |
| Giga | `CelloEnsSpic` | 38–55 | Como en la intro, siguiendo el bajo de §4. *mf*. |
| Contratiempo | `ViolaEnsSpic` | 55–64 | Notas del acorde en las corcheas 1, 2, 4 y 5, *mp*. Nunca por encima de E4 (64). |
| Pulso | `ContrabassPizz` (**común**) | 31–43 | — |
| Oom-pah | `TubaStac` + `BassoonStac` | 31–43 · 50–58 | Tuba en la corchea 0, fagot en la 2 y la 5, *mf*. |
| Rasgueo | Strumstick | 55–67 | Ritmo de giga: corcheas 0, 2, 3, 5 (q e q e), *mp*. |
| Cajón | Cajón 61 / 60 | — | 61 en 0 y 3, 60 en 2 y 5, *mf*. |
| Tambor | Frame Drum 65 | — | Corcheas 1 y 4, *p*. |
| Timbal | `Timpani` | 38–48 | Fundamental en la corchea 0 de los c. 5, 7, 9, 11, *mf*. |
| Relleno | Tom 62 | — | C. 12, corcheas 3–5 en semicorcheas, crescendo. |

### A' (13–20)

**Exploración (máximo 8 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía 13–16** | Violin Solo 1 | 67–76 | CC1 70–80, cantabile. |
| **Melodía 17–20** | Flauta dulce tenor | 69–79 | *mp*. |
| Contracanto 13–16 | `CelloEnsSusVib` | 58–62 | B♭3 (q.+q.) · B♭3 D4 · C4 C4 · D4 D4 (q. q.), *p*. |
| Acordeón | Armónica (Vib) | 55–67 | Acordes tenidos por tiempo, *pp*. |
| Vaivén | Strumstick | 55–67 | Como en A. |
| Arpegio 17–20 | Arpa folk | 43–67 | Corcheas ascendentes por el acorde, *p*; nunca por encima de G4 (67). |
| Pulso | `ContrabassPizz` (**común**) | — | — |
| Cajón | Cajón 61 / 60 / 62 | — | Como en A + 62 en la corchea 5, *p*. |

**Combate (máximo 12 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía 13–16** | Violin Solo 1 + `ViolinEnsSusVib` | 67–76 | Unísono declarado (el solista delante): CC1 95 / *mf*. |
| **Melodía 17–20** | `ViolinEnsSusVib` | 69–79 | *mf* → *f* en 19. |
| Contracanto | Horns Sustain | 53–62 | El de los violonchelos de exploración en 13–16; en 17–20: G3 (q.+q.) · G3 A3 · F3 G3 · G3 A3 (53–57), CC1 80. |
| Giga, contratiempo, pulso | `CelloEnsSpic`, `ViolaEnsSpic`, `ContrabassPizz` (**común**) | — | Como en A. |
| Oom-pah | `TubaStac` + `BassoonStac` | — | Como en A. |
| Rasgueo | Strumstick | — | Como en A. |
| Percusión | Cajón · Frame Drum 65 · `Timpani` | — | Como en A; timbal en 13, 15, 17, 19. |
| Relleno | Tom 62 | — | C. 20, corcheas 3–5. |

### B «La taberna» (21–28)

**Exploración (máximo 7 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía** | Piano de taberna, mano derecha | 70–79 | *mp*, notas de valor completo con pedal corto (que no empaste el cambio de acorde). |
| Mano izquierda | Piano de taberna, mano izquierda | bajo 34–46 · acorde 52–64 | Bajo en la corchea 0, acorde en la 3 (vaivén), *p*. Misma pista MIDI que la mano derecha. |
| Terceras 25–28 | Armónica (Vib) | 63–75 | Tercera diatónica por debajo de la melodía (sexta si la tercera cae fuera del acorde en las corcheas 0 o 3); nunca por encima de E♭5 (75). *p*, 10 por debajo del piano. |
| Vaivén | Strumstick | 55–67 | Corcheas 0 y 3. |
| Pad | `ViolaEnsSusVib-Quiet` | 55–65 | Notas guía, *pp*. |
| Pulso | `ContrabassPizz` (**común**) | — | — |
| Cajón | Cajón 61 / 60 | — | Como en A. |

**Combate (máximo 11 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía** | Violin Solo 1 + piano de taberna (mano derecha) | 70–79 | Unísono declarado; CC1 90 / *mf*. |
| Mano izquierda | Piano de taberna | bajo 34–46 · acorde 52–64 | *Stride* de taberna: bajo en 0 y 3, acorde en 2 y 5, *mf*. |
| Terceras 25–28 | Armónica (Accented) | 63–75 | Como en exploración, *mp*. |
| Giga, contratiempo, pulso | `CelloEnsSpic` (*mp*), `ViolaEnsSpic` (*p*), `ContrabassPizz` (**común**) | — | — |
| Oom-pah | `TubaStac` + `BassoonStac` | — | *mp*. |
| Rasgueo | Strumstick | — | Ritmo de giga. |
| Cajón | Cajón 61 / 60 | — | Como en A. |
| Bombo | Bass Drum 62 | — | Corchea 0 de 21 y 23, *mp* (en 25–28 entran las terceras de la armónica y el bombo calla). |

### C «La bodega» (29–36): respiro

**Exploración (máximo 6 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía** | Clarinete bajo | 46–60 | §5 (inversión y continuación), CC1 60–75: sigiloso, legato. |
| Cola | Arpa folk | 66–72 | §5, *pp*–*p*. |
| Pedal | `CelloEnsSusVib-Quiet` | G2 (43); E♭2–C3 en 35, D3 en 36 | Tenida, *pp*. |
| Pulso | `ContrabassPizz` (**común**) | — | Solo la corchea 0. |
| Pasos | Cajón 62 | — | Corcheas 0 y 3, *pp*. |
| Crujido | Bass Drum 68 | — | Tiempo 1 de los c. 30 y 34, *pp*. |

**Combate (máximo 9 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía** | Clarinete bajo + `BassoonStac` | 46–60 | Clarinete CC1 75 legato; el fagot dobla en *staccato*, *p*: pasos con cuchillos. |
| Cola | `ViolinEnsPizz` | 66–72 | §5, *p*. |
| Pedal | `ContrabassTrem` | G1 (31); E♭1–C2 en 35, D2 en 36 | *pp*, swell de CC11 cada 2 compases. |
| Pulso | `ContrabassPizz` (**común**) | — | — |
| Giga en sordina | `CelloEnsSpic` | G2/D3 (43/50) | Corcheas en la pedal, *p*. |
| Tambor | Frame Drum 65 | — | Corcheas 2 y 5, *pp* (el reloj). |
| Bombo | Bass Drum 62 | — | Corchea 0 de 29, 31, 33, 35, *p*. |
| Cajón | Cajón 62 | — | Corcheas 0 y 3, *p*. |
| Crujido | Bass Drum 68 | — | Tiempo 1 del c. 34, *p*. |

### Puente «Abordaje» (37–44)

**Exploración (máximo 8 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía 37–40** | Flauta dulce tenor + armónica (Vib) | 63–75 | Unísono declarado, *p* → *mp*. |
| **Melodía 41–44** | Flauta dulce tenor + Violin Solo 1 | 66–79 | Unísono declarado, *mp* → *mf* (CC1 70 → 90). |
| Rasgueo | Strumstick | 55–67 | Corcheas 0 y 3 en 37–40; ritmo de giga desde el 41, crescendo. |
| Bajo | `CelloEnsSusVib` | 39–50 | E♭2 F2 G2 A♭2 B♭2 C3 D3 D3 (39 41 43 44 46 48 50 50), crescendo. |
| Pulso | `ContrabassPizz` (**común**) | — | — |
| Armonía | `ViolaEnsTrem` | 55–64 | 41–44, notas guía, *pp* → *mf*. |
| Cajón | Cajón 61 / 60 | — | Como en A; corcheas continuas desde el 41. |
| Redoble | `TimpaniRolls` | D2 (38) | 43–44, *pp* → *mf*; corta en el tiempo 1 del c. 45. |

**Combate (máximo 12 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía** | 1st Violins Marcato | 63–79 | CC1 85 → 108. |
| Doblaje | Horns Marcato | 63–75 en 37–40 (unísono) · 58–67 en 41–44 (8vb) | CC1 85 → 100. |
| Giga, contratiempo | `CelloEnsSpic`, `ViolaEnsSpic` | — | *mf* → *f*. |
| Pulso | `ContrabassPizz` (**común**) | — | — |
| Bajo | `TubaStac` | 27–38 | El bajo ascendente de §4 en la corchea 0, *mf*. |
| Cajón | Cajón 61 / 60 | — | Corcheas continuas, acentos en 0 y 3. |
| Bombo | Bass Drum 62 | — | Corchea 0 de cada compás. |
| Redoble | `TimpaniRolls` | D2 | 43–44, *mp* → *f*. |
| Plato | Cymbal 63 (crescendo de 2,5 s) | — | Pico en el tiempo 1 del c. 45. |
| Relleno | Tom 62 | — | C. 44, corcheas 3–5 en semicorcheas. |

### Retorno (45–56)

**Exploración (máximo 10 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía 45–52** | Violin Solo 1 + flauta dulce tenor | 67–82 | Unísono declarado. *mf*, **f** en el c. 49 (CC1 100) → *mp* en 52. |
| **Melodía 53–56** | Flauta dulce tenor | 67–75 | *mp* → *p*. |
| Contracanto 45–52 | `FHornSus` | 53–62 | B♭3 (q.+q.) · C4 D4 · C4 C4 · B♭3 D4 · G3 B♭3 · G3 A3 · F3 F3 · G3 F#3 (q. q.), *mf*. |
| Acordeón | Armónica (Vib) | 55–67 | Acorde en la corchea 3 de cada compás, *p*. |
| Rasgueo | Strumstick | 55–67 | Ritmo de giga, *mp*. |
| Bajo | `CelloEnsSusVib` | 36–55 | Fundamentales tenidas, *mp*. |
| Pulso | `ContrabassPizz` (**común**) | — | — |
| Cajón | Cajón 61 / 60 / 62 | — | 61 en 0 y 3, 60 en 5, 62 en 2, *mf*. |
| Tambor | Frame Drum 61 | — | Corchea 0 de los c. 45 y 49, *mf*. |
| Timbal | `Timpani` | E♭2 (39) | Corchea 0 del c. 49, *mf*. |

**Combate (máximo 12 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía 45–48** | Horns Marcato + `ViolinEnsSusVib` | 67–76 | Unísono declarado; CC1 105 / *f*. |
| **Melodía 49–52** | `ViolinEnsSusVib` + Violin Solo 1 | 70–82 | Unísono declarado; *f* en el c. 49. |
| **Melodía 53–56** | Violin Solo 1 | 67–75 | CC1 90 → 75. |
| Contracanto 49–52 | Horns Sustain | 53–62 | El contracanto de trompa de exploración (49–52), CC1 95. |
| Giga, contratiempo | `CelloEnsSpic` (*f*), `ViolaEnsSpic` (*mf*) | — | — |
| Pulso | `ContrabassPizz` (**común**) | — | — |
| Bajo | `TubaStac` | 27–43 | Corchea 0, *mf*. |
| Rasgueo | Strumstick | — | Ritmo de giga, *mf*. |
| Cajón | Cajón 61 / 60 / 62 | — | Como en exploración, *f*. |
| Bombo | Bass Drum 62 | — | Corcheas 0 y 3 en 45–52; solo 0 en 53–56. |
| Timbal | `Timpani` | 38–48 | Fundamental en la corchea 0 de cada compás. |
| Plato | Cymbal 66 | — | Solo el tiempo 1 del c. 45 (llegada del crescendo), velocidad ≤ 80. |

### Codetta (57–60)

**Exploración (máximo 5 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Señal** | Ocarina | 69–81 | §5, *p*. |
| Bajo | `CelloEnsSusVib-Quiet` | 38–45 | G2 · F2 · E♭2 · A2 → D2 (43 41 39 45 38), *pp*. |
| Pulso | `ContrabassPizz` (**común**) | — | Solo la corchea 0 del c. 57. |
| Olas | Olas 61 | — | Desde el c. 58 hasta el final, *pp*; enlaza con la del c. 1. |
| Crujido | Bass Drum 68 | — | Tiempo 1 del c. 58, *pp*. |

**Combate (máximo 8 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Señal** | Violin Solo 1 | 69–81 | §5, CC1 80. |
| Giga | `CelloEnsSpic` | 38–55 | *mp*; la misma figura con la que arranca el c. 1. |
| Acordeón | Armónica (Accented) | 55–67 | Corchea 3, *p*. |
| Pulso | `ContrabassPizz` (**común**) | — | Corchea 0 del c. 57. |
| Cajón | Cajón 61 / 60 | — | Como en la intro. |
| Tambor | Frame Drum 65 | — | Corcheas 1 y 4, *pp*. |
| Bombo | Bass Drum 62 | — | Corchea 0 del c. 57. |

### Notas sobre los samples

- **Sin caja, pandereta, carraca, vibraslap ni platos de choque.** Medidos: la caja de cuerda (`Snare Drum, Rope
  Tension`) tiene la energía repartida hasta 6 kHz; la pandereta, por encima de 6 kHz; la carraca, por encima de
  2,5 kHz. El «barco» lo cuentan el roce del bombo (crujido del casco), las olas y el 6/8, no el ruido.
- **Armónica**: es el instrumento más brillante de la pista (medida: −8 a −12 dB en 2,5–6 kHz y otro tanto por
  encima de 6 kHz). Siempre entre G3 y E♭5 (55–75), nunca por encima de *mp*, y en la mezcla con un recorte de
  3–4 dB en 3 kHz y estantería suave en 7 kHz. Si aun así pincha, baja de nivel, no de registro.
- **Olas** (`Ocean Drum`): ruido de banda ancha. Solo en exploración, *pp*, con paso bajo en ~2 kHz en su bus: se
  tiene que oír como resaca lejana, no como siseo.
- **Violin Solo 1** (Sonatina) es el violín de fonda: delante, poco envío de sala. Para las corcheas de la giga
  están las secciones en *spiccato* de VSCO, no el solista.
- **Piano de taberna**: `Upright Piano, Knight` tiene 3 capas y 4 round robin; no subir de velocidad 90 (la capa
  alta es dura).
- No usar ningún `KS` ni `Keyswitch`.

## 7. Dinámica

Velocidades (VSCO y VCSL; CC11 da la forma dentro de la nota):

| Nivel | pp | p | mp | mf | f |
|---|---|---|---|---|---|
| Velocidad | 25–40 | 40–55 | 55–70 | 70–85 | 85–100 |

CC1 (Sonatina):

| Nivel | pp | p | mp | mf | f |
|---|---|---|---|---|---|
| CC1 | 40–55 | 55–70 | 70–85 | 85–100 | 100–110 |

Prohibido: velocidad > 105, CC1 > 112.

| Sección | Exploración | Combate | Gestos |
|---|---|---|---|
| Intro 1–4 | pp / señal p | mp | La señal con < > en la A5 del c. 3. |
| A 5–12 | p (acomp.) / mp | mf | Apoyo ligero en cada negra con puntillo de la melodía (CC11 +10 %). |
| A' 13–20 | mp | mf → f (19) → mf | Arco de violín 17–20. |
| B 21–28 | mp | mf | Plano: la taberna no se dramatiza. |
| C 29–36 | pp / p | p / mp | Sin crescendos salvo el c. 36 (hacia el puente). |
| Puente 37–44 | p → mf | mf → f | Crescendo continuo de 8 compases. |
| Retorno 45–56 | mf → **f (c. 49)** → p | f → **f+ (c. 49)** → mf | Pico en el tiempo 1 del c. 49; desde ahí diminuendo por compases. |
| Codetta 57–60 | p → pp | mp | La giga de combate se queda en *mp* para entrar así en el c. 1. |

## 8. Criterios de aceptación

**Partitura (se comprueba leyendo los dos MIDIs con `compose.py`):**

1. Los dos MIDIs: 60 compases de 6/8 a ♩ = 135 (♩. = 90), signatura 6/8, sin cambios de tempo, misma longitud
   en ticks; ninguna nota empieza después de 80,000 s y todo lo del c. 60 termina antes.
2. Todas las notas dentro del rango del catálogo de su patch y de los registros de §6. Techos: violines ≤ 82
   (B♭5), flauta dulce tenor ≤ 82, armónica 55–75, ocarina 69–81, trompas ≤ 76, clarinete bajo 46–60.
3. La melodía de referencia de §5 (motivo, señal y consecuentes) aparece con las alturas y los ataques exactos en
   las **dos** versiones: c. 1–4, 5–8, 9–12, 13–16, 17–20, 21–28, 29–36, 37–44, 45–56, 57–60.
4. La capa común `Basses Pizz` es idéntica en los dos MIDIs (alturas, ticks y velocidades después de humanizar).
5. Figuras: ninguna más corta que la corchea, salvo los rellenos de tom (c. 12, 20, 44 del combate).
6. Capas simultáneas por sección ≤ E 6 / 7 / 8 / 7 / 6 / 8 / 10 / 5 y C 8 / 11 / 12 / 11 / 9 / 12 / 12 / 8
   (intro / A / A' / B / C / puente / retorno / codetta).
7. **Sin choques de registro**: mientras suena la melodía, ninguna otra pista mantiene notas de negra o más en la
   misma octava con velocidad (o CC1) ≥ la de la melodía. Excepciones: unísonos declarados en §6 y las terceras
   de la armónica en B (10 por debajo).
8. Ninguna velocidad > 105 ni CC1 > 112; el c. 49 tiene la velocidad (o CC1) más alta de la melodía en las dos
   versiones. Piano de taberna ≤ 90.
9. Cada pista de Sonatina tiene CC1 en el tick 0 y respeta las duraciones máximas de §6.
10. Percusión: ninguna nota de `Snare`, `Tambourine`, `Ratchet` ni `Vibraslap`; Frame Drum solo 61, 62 y 65;
    Bass Drum 68 ≤ 5 golpes por bucle; plato solo en los c. 44–45.
11. Ostinato de la cola (29–36): La♮ y La♭ exactamente en los compases de §5.

**Mezcla (se comprueba con el informe de `mix.py`, una `MixSpec` por versión):**

12. Sonoridad integrada: exploración **−17,5 ± 0,5 LUFS**, combate **−16,5 ± 0,5 LUFS**; pico real **≤ −1 dBTP**
    en las dos.
13. `loop_samples` = **3 528 000** en las dos; `seam_jump` < 0,02 en las dos.
14. Contraste dentro de cada versión: retorno c. 45–52 frente a C c. 29–36 entre **+5 y +9 LU** en exploración y
    entre **+3 y +7 LU** en combate.
15. Contraste entre versiones: en cada sección de §3, combate − exploración entre **0 y +4 LU**.
16. Bandas (`bands_db`), en las dos: `presencia 2.5-6k` ≤ −18 dB, `aire 6-16k` ≤ −28 dB, `sub <60` ≤ −20 dB.
17. Ninguna parte suelta pasa de −6 dB de pico antes del bus.
18. Las dos `MixSpec` comparten sala y la colocación de las pistas que existen en ambas; `Basses Pizz` con el mismo
    `gain_db`.
19. **Prueba de cruce**: `build/acto1-contrabandistas-cruce.mp3` con exploración 0–24 s, fundido lineal de 1,6 s a
    combate en 24 s y vuelta en 56 s. En la sonoridad a corto plazo (3 s) no hay un bache de más de 3 LU por debajo
    de la menor de las dos versiones ni un salto de más de 4 LU; a la escucha, ni ataques duplicados ni *flam*.
20. Escucha: la flauta dulce de los c. 5–8 se reconoce como el tema del menú en otra tonalidad y otro compás; la
    armónica nunca pincha más que la melodía; el crujido y las olas se oyen como ambiente, no como ruido; en combate
    los efectos del juego se siguen entendiendo en el c. 49.

**Integración (cuando se apruebe):** copiar a `src/audio/cap1-e1.mp3` y `src/audio/cap1-e1-combate.mp3` y añadir a
`MUSIC_TRACKS`: `'cap1-e1': { file: 'cap1-e1.mp3', loopSamples: 3528000, group: 'cap1-e1' }` y
`'cap1-e1-combate': { file: 'cap1-e1-combate.mp3', loopSamples: 3528000, group: 'cap1-e1' }`.
