# Brief: Acto I, jefe del escenario 1, Vexis el Embaucador Arcano — «La función de medianoche»

Combate de jefe de la Guarida de los Contrabandistas. Id de juego: `cap1-e1-jefe`. Pista nueva en
`scripts/musica/acto1-vexis/` con las convenciones del [README del estudio](../../scripts/musica/estudio/README.md):
`compose.py` → `build/acto1-vexis.mid`, `mix.py` → `build/acto1-vexis.mp3`. Necesita montado el disco **Base**
(VCSL y Sonatina). Referencias: [menu.md](menu.md) (formato y **versión canónica del leitmotiv**, que esta pista
parodia) y [acto1-contrabandistas.md](acto1-contrabandistas.md) (el escenario del que viene).

## 1. Función, emoción y repetición

- **Dónde suena:** solo en el combate contra Vexis, pícaro ilusionista: *Mil Rostros*, copias ilusorias que bailan
  alrededor, dagas untadas, nunca golpeas al que crees.
- **Emoción:** ritmo frenético de jefe + **circo macabro**: un vals demasiado rápido, *oom-pah-pah* de tuba y
  pizzicato, huesos de col legno, caja de música (celesta), copas de cristal, un flexatón que suena a fantasma.
  Trucos de magia y **algo de terror**: no sustos de volumen, sino armonías que no deberían estar ahí.
- **Idea central: el truco.** Vexis te roba el tema. El vals del menú (el mismo ritmo ternario canónico) aparece
  al doble de velocidad y en **do♯ menor**, medio tono por debajo de la casa del héroe. En el c. 9 **la trompa del
  menú** empieza el leitmotiv exactamente como en el menú (re–la, en su altura), y con una sola nota cambiada
  (Sol → Sol♯) el tema acaba en la tónica de Vexis: el truco de magia está en la melodía. En la sección B, el
  **espejismo**: la caja de música toca el tema del menú intacto, en re mayor… sobre un pedal de Sol♯, a un
  tritono. Luego se resquebraja.
- **Repetición:** 3–8 minutos por combate (3–6 vueltas). Clímax en el c. 53 (el acorde del héroe, re mayor, como
  napolitano de do♯ menor: «la máscara cae»); respiro inquietante en B.
- **Transformación del leitmotiv:** métrica conservada (3/4 del menú) pero **diminución por tempo** y **modo
  menor**; **cita literal deformada** (el truco y el espejismo); **aumentación** en la sección de lamento y en el
  clímax; **hemiolia** (2 contra 3) en el puente (ver §5).

## 2. Tempo, métrica, tonalidad, duración

| Parámetro | Valor |
|---|---|
| Tempo | ♩ = 180, fijo (vals a uno: ♩. = 60, **un compás = 1 s**) |
| Métrica | 3/4; hemiolia escrita (blancas cruzando la barra) en el puente |
| Tonalidad | do♯ menor; re mayor (♭II napolitano) como acorde «del héroe»; pedal de Sol♯ (V) bajo re mayor en B |
| Compases | **80** |
| Duración del bucle | 80 × 3 × 60/180 = **80,000 s** → `loop_samples` = **3 528 000** a 44,1 kHz |
| `MixSpec` | `bpm=180`, `beats_per_bar=3`, `bars=80` |

El tiempo en segundos de cualquier compás es su número menos uno. **Figuras:** melodía, negra mínima (0,33 s),
salvo la coda del c. 59 (corcheas). Corcheas (0,17 s) en cuerdas *spiccato*, fagot y madera de la coda. **Nada de
semicorcheas**: a este tempo los samples suenan a máquina.

## 3. Forma compás a compás e intensidad

| Sección | Compases | Tiempo (s) | Contenido | Intensidad |
|---|---|---|---|---|
| Intro «¡Pasen y vean!» | 1–4 | 0–4 | Caja de música con la cabeza del motivo; el mecanismo se atasca: golpe en el c. 4 | 5 → 6 |
| A «Vals de los mil rostros» | 5–20 | 4–20 | Vals: motivo en clarinete y xilófono (5–8); **el truco** en la trompa del menú (9–12); violín solista (13–16); el truco en la flauta del menú (17–20) | 7 → 8 |
| B «El espejismo» | 21–36 | 20–36 | **Respiro inquietante.** Celesta con el tema del menú intacto sobre pedal de Sol♯ (21–24), que se resquebraja (25–28); lamento: el motivo en aumentación (vibráfono con arco) y coro en acordes paralelos descendentes (29–36) | 4 (mínimo) → 6 |
| Puente «Los cuchillos» | 37–44 | 36–44 | Hemiolia: el compás se tuerce; cuchillos (madera y col legno) en cada blanca; crescendo | 7 → 9 |
| Clímax «La máscara cae» | 45–60 | 44–60 | Tutti: motivo en aumentación en metales y coro sobre un bajo de lamento; **clímax en el c. 53** (re mayor); coda en corcheas y «¡ta-chán!» en el c. 60 | 9 → **10** (c. 53) → 9 |
| Retorno | 61–76 | 60–76 | El vals de A con más orquesta (organillo, col legno); el truco gritado por las trompas (65–68); consecuente nuevo con la cola (69–76) | 8 |
| Codetta | 77–80 | 76–80 | Vuelve la caja de música; se le da cuerda (carraca) para el c. 1 | 6 → 5 |

Silencio estructural: c. 60, tiempos 2–3, tras el golpe (el público contiene la respiración). No se rellena.

## 4. Armonía

Una armonía por compás (vals a uno), salvo donde se indica «(1–2) / (3)».

**Intro (1–4)**

| 1 | 2 | 3 | 4 |
|---|---|---|---|
| C#m | C#m | D/C# (♭II sobre pedal) | G#7(♭9) |

**A (5–20)**: el truco armónico del c. 9: **re mayor** (♭II) entra como si fuera la tónica del tema, y el G#7 lo
devuelve a do♯ menor.

| 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|
| C#m | Amaj7 | G#7(♭13) | C#m | **D** | D | G#7 | C#m |

| 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|---|
| C#m | F#m9 | D#ø7 | C#m/G# (6/4 cadencial) | D/F# | Bm7 | G#7 | G#7(♭9) |

**B (21–36)**: dos capas. Abajo, pedal de **Sol♯** (dominante de do♯ menor). Arriba, 21–24, la armonía del menú
en re mayor (a un tritono del pedal); 25–28, se resquebraja hacia do♯ menor; 29–36, **tríadas paralelas
descendentes** sobre el pedal (lamento: C#m – Bm – A – G#sus4 – F#m – E – D) hasta G#7(♭9).

| 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 |
|---|---|---|---|---|---|---|---|
| D/G# | Bm7/G# | Em7 (1–2) / A7 (3) /G# | D/G# | D/G# | **Dm/G#** | E/G# | C#m/G# |

| 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 |
|---|---|---|---|---|---|---|---|
| C#m/G# | Bm/G# | A/G# | G#sus4 | F#m/G# | E/G# | **D/G#** | G#7(♭9) |

**Puente (37–44)**: de dos en dos compases (la hemiolia), subiendo: tónica, napolitano, séptima disminuida de la
sensible y dominante.

| 37–38 | 39–40 | 41–42 | 43–44 |
|---|---|---|---|
| C#m | D | D#°7 (D#–F#–A–C) | G#7(♭9) |

**Clímax (45–60)**: **bajo de lamento** que baja una octava entera (C# B A G# F# E D C#) y sube al napolitano.

| 45 | 46 | 47 | 48 | 49 | 50 | 51 | 52 |
|---|---|---|---|---|---|---|---|
| C#m | C#m/B | Amaj7 | G#7 | F#m | C#m/E | D(add9) | A/C# |

| 53 | 54 | 55 | 56 | 57 | 58 | 59 | 60 |
|---|---|---|---|---|---|---|---|
| **D** (clímax) | F#m7/A | G#7(♭9) | G#7(♭9) | C#m | C#m/B | Amaj7 | G#7(♭9) (golpe en el tiempo 1) |

**Retorno (61–76)**: 61–68 = armonía de 5–12. Después:

| 69 | 70 | 71 | 72 | 73 | 74 | 75 | 76 |
|---|---|---|---|---|---|---|---|
| F#m | D#ø7 | C#m/G# | A (♭VI) | D (N) | G#7(♭9) | C#m | G#7(♭9) |

**Codetta (77–80)**: distinta de la intro en el c. 78, para que la costura no repita cuatro compases iguales.

| 77 | 78 | 79 | 80 |
|---|---|---|---|
| C#m | A/C# | D/C# | G#7(♭9) |

## 5. Leitmotiv

Referencia (re mayor, grados 1 5 | 6 5 3 | 4 3 2 | 1) y **ritmo canónico del menú** (q h | q q q | q q q | h.).
**Versión de esta pista: «el vals robado»**: el mismo ritmo, al doble de velocidad, en do♯ menor:

```
| C#  G#   | A   G#  E  | F#  E   D# | C#     |
| q   h    | q   q   q  | q   q   q  | h.     |
```

| Compases | Instrumento | Notas (MIDI) | Transformación |
|---|---|---|---|
| 1–3 | Celesta | C#5 G#5 · A5 G#5 E5 · F#5 E5 **D5** (73 80 · 81 80 76 · 78 76 74) | Caja de música: el tema en menor, con la D♮ «del héroe» en el c. 3; la última nota no llega (el golpe del c. 4 se la come). |
| **5–8** | **`ClarinetStac` + Xylophone** | **C#5 G#5 · A5 G#5 E5 · F#5 E5 D#5 · C#5 (73 80 · 81 80 76 · 78 76 75 · 73)** | El vals robado: menor + tempo doble. En staccato de circo: las blancas se tocan como negra + silencio. |
| **9–12** | **`FHornSus` (la «Trompa 1» del menú)** | **D4 A4 · B4 A4 F#4 · G#4 F#4 E4 · D#4 C#4 (62 69 · 71 69 66 · 68 66 64 · 63 61)**, ritmo q h · q q q · q q q · q h | **El truco**: empieza idéntico al menú (c. 5–7 del menú, misma altura, mismo instrumento); el Sol se vuelve **Sol♯** y la D final se convierte en D♯–C♯. El tema del héroe acaba en la tónica de Vexis. |
| 13–16 | Violin Solo 1 | = c. 5–8 (73 80 · 81 80 76 · 78 76 75 · 73) | Rearmonizado (F#m9, D#ø7, 6/4 cadencial): el «violín del diablo». |
| 17–20 | `FluteSusVib` (la flauta del menú) | D5 A5 · B5 A5 F#5 · G#5 F#5 E5 · D#5 C#5 B#4 (74 81 · 83 81 78 · 80 78 76 · 75 73 72), q h · q q q · q q q · q q q | El truco otra vez, una octava arriba, y ahora ni siquiera llega a la tónica: queda en la sensible (B#4) sobre G#7(♭9). |
| **21–24** | **Celesta** | **D5 A5 · B5 A5 F#5 · G5 F#5 E5 · D5 (74 81 · 83 81 78 · 79 78 76 · 74)** | **El espejismo**: el leitmotiv **literal**, en la versión canónica del menú (sus c. 13–16, a la misma altura), sobre pedal de Sol♯. Única cita sin transformar de la banda sonora: lo que está transformado es el suelo. |
| 25–28 | Celesta | D5 A5 · **B♭5** A5 **F5** · **G#5** F#5 E5 · D#5 C#5 (74 81 · 82 81 77 · 80 78 76 · 75 73), q h · q q q · q q q · q h | Se resquebraja: el 6 y el 3 se hacen menores (re menor), el 4 se vuelve Sol♯ y la cadencia cae en do♯. |
| 29–36 | Vibráfono con arco | C#5 · G#5 · A5 · G#5 · E5 · F#5 · E5 · D#5 (73 80 81 80 76 78 76 75), una nota por compás (h.) | **Aumentación** (×3): el motivo como lamento; la C# que falta llega en el c. 37 con el puente. |
| 37–44 | Horns Marcato | C#4 G#4 A4 · D4 A4 B4 · D#4 A4 C5 · G#4 B#4 D#5 (61 68 69 · 62 69 71 · 63 69 72 · 68 72 75), blancas en hemiolia (3 por cada 2 compases) | **Fragmento** (cabeza 1-5-6) en secuencia, con el compás torcido. |
| **45–58** | **Horns Sustain + Mixed Chorus (voz superior); Trombones Sustain 8vb** | **C#4 (2 c.) · G#4 (2 c.) · A4 · G#4 · E4 (2 c.) · F#4 · E4 · D#4 (2 c.) · C#4 (2 c.) (61 · 68 · 69 · 68 · 64 · 66 · 64 · 63 · 61)** | **Aumentación** (×3 y ×6). La F#4 del c. 53 (sobre re mayor) es el clímax. |
| 59 | `ViolinEnsSpic` + Xylophone + `FluteStac` | C#5 G#5 A5 G#5 E5 G#5 (73 80 81 80 76 80), corcheas | **Disminución**: la cabeza en corcheas, el último truco antes del golpe. |
| 61–64 | `ClarinetStac` + Xylophone + 1st Violins Col Legno | = c. 5–8 | Vuelve el vals, con huesos. |
| 65–68 | Horns Marcato | = c. 9–12 (62 69 · 71 69 66 · 68 66 64 · 63 61) | El truco, ahora gritado por la sección de trompas (CC1 100). |
| 74–75 | Violin Solo 1 + `FluteSusVib` | F#5 E5 D#5 · C#5 (78 76 75 · 73) | La **cola** (4 3 2 → 1) cierra el retorno. |
| 77–79 | Celesta | = c. 1–3 | Vuelve la caja de música. |

Consecuente del retorno (melodía, no leitmotiv), Violin Solo 1 + `FluteSusVib` unísono, c. 69–73 y 76:
A5 G#5 F#5 (q q q) · F#5 (h) A5 (q) · G#5 (h.) · C#6 B5 A5 (q q q) · A5 (h) F#5 (q) · [74–75: la cola, tabla de arriba] ·
B#4 D#5 A5 (q q q) (81 80 78 · 78 81 · 80 · **85** 83 81 · 81 78 · … · 72 75 81). C#6 (85) del c. 72 es la nota más alta de la pista.

## 6. Orquestación por sección

### Patches

| Nombre corto | Ruta `.sfz` | Dinámica |
|---|---|---|
| Celesta | `sso/Sonatina Symphonic Orchestra/Percussion/Celeste.sfz` | velocidad |
| Copas | `VCSL/Idiophones/Friction Idiophones/Wine Glasses - Slow.sfz` | velocidad |
| Vibráfono con arco | `VCSL/Idiophones/Struck Idiophones/Vibraphone - Bowed.sfz` | velocidad |
| Xylophone | `VCSL/Idiophones/Struck Idiophones/Xylophone - Soft Mallets.sfz` | velocidad |
| Organillo | `sso/Sonatina Symphonic Orchestra/Organ/Great - Flute 4ft.sfz` | velocidad |
| `FHornSus` / `FluteSusVib` / `FluteStac` | `VSCO-2-CE/FHornSus.sfz` / `FluteSusVib.sfz` / `FluteStac.sfz` | velocidad |
| `ClarinetStac` / `BassoonStac` / `TubaStac` | `VSCO-2-CE/ClarinetStac.sfz` / `BassoonStac.sfz` / `TubaStac.sfz` | velocidad |
| `ViolinEnsSpic` / `ViolaEnsPizz` / `ViolaEnsSpic` | `VSCO-2-CE/…` | velocidad |
| `ContrabassPizz` / `ContrabassTrem` | `VSCO-2-CE/…` | velocidad |
| `Timpani` / `TimpaniRolls` | `VSCO-2-CE/…` | velocidad |
| Violin Solo 1 | `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violin Solo 1 Sustain.sfz` | **CC1** |
| 1st Violins Col Legno / Celli Col Legno | `sso/Sonatina Symphonic Orchestra/Strings - Performance/1st Violins Col Legno.sfz` / `Celli Col Legno.sfz` | velocidad |
| Horns Marcato / Horns Sustain | `sso/Sonatina Symphonic Orchestra/Brass - Performance/Horns Marcato.sfz` / `Horns Sustain.sfz` | **CC1** |
| Trombones Marcato / Trombones Sustain | `…/Brass - Performance/Trombones Marcato.sfz` / `Trombones Sustain (looped).sfz` | **CC1** |
| Trombones Staccato | `…/Brass - Performance/Trombones Staccato.sfz` | velocidad |
| Coro | `sso/Sonatina Symphonic Orchestra/Chorus - Performance/Mixed Chorus.sfz` | **CC1** |
| Tam-tam | `sso/Sonatina Symphonic Orchestra/Percussion/Cymbals & Tamtam.sfz`, nota 57 | velocidad |
| Bass Drum | `VCSL/Membranophones/Struck Membranophones/Bass Drum 2.sfz` (62 = golpe, 63 = redoble) | velocidad |
| Cymbal | `VCSL/Idiophones/Struck Idiophones/Suspended Cymbal 2.sfz` (63 = crescendo de 2,5 s, 66 = golpe) | velocidad |
| Cuchillo | `VCSL/Idiophones/Struck Idiophones/Woodblock.sfz` (62 = golpe seco; 60 = tic de reloj) | velocidad |
| Flexatón | `VCSL/Idiophones/Struck Idiophones/Flexatone.sfz` (60 = glissando largo, 64 = golpe corto) | velocidad |
| Carraca | `VCSL/Idiophones/Struck Idiophones/Ratchet.sfz` (60 = manivela, 1,5 s) | velocidad |
| Mark Trees | `VCSL/Idiophones/Struck Idiophones/Mark Trees.sfz` (60 = ascendente) | velocidad |

(`…/` = `sso/Sonatina Symphonic Orchestra/`.)

**Sonatina (CC1)**: Violin Solo 1, Horns Marcato, Horns Sustain, Trombones Marcato, Trombones Sustain y el coro
**tienen que llevar curva de CC1** (punto en el tick 0 y forma de cada frase; como mucho uno cada 1/8 de compás).
Duración máxima por nota: Horns ≤ 2,8 s (las notas de dos compases del clímax, 2 s, caben), Trombones Marcato
≤ 2,2 s, Violin Solo 1 ≤ 5 s; Trombones Sustain `(looped)` y coro sin límite.

**El vals** (*oom-pah-pah*): *oom* en el tiempo 1 (`ContrabassPizz` + `TubaStac`, fundamental; Bass Drum 62 donde
se indique), *pah-pah* en los tiempos 2 y 3 (acordes cortos de negra en `ViolaEnsPizz` y en 1st Violins Col Legno,
siempre por debajo de C#5, 73). El tiempo 1 un 15 % más fuerte que el 2 y el 3.

**Trucos con número fijo por bucle** (son brillantes: medidos, su energía está por encima de 2,5 kHz; ver §6, notas):
Flexatón **3** (c. 12 tiempo 3: 64; c. 28 tiempo 1: 60; c. 60 tiempo 1: 64), Mark Trees **2** (c. 9 y c. 21,
tiempo 1, 60), Carraca **1** (c. 80, tiempo 2).

### Intro «¡Pasen y vean!» (1–4): máximo 8 capas

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Caja de música** | Celesta | 73–81 (+ acorde de mano izquierda C#4 E4 G#4 en el tiempo 1, 61–68) | §5, *p*, seca (poca sala): un juguete en primer plano. |
| Vals en sordina | `ContrabassPizz` + `ViolaEnsPizz` | Cb. C#2 (37) · Vla. 56–64 | *Oom-pah-pah*, *p*. |
| Latido | `Timpani` | C#2 (37) | Tiempo 1 de los c. 1–3, *p*. |
| Amenaza | Trombones Sustain | D3 F#3 A3 (50 54 58) | C. 3, CC1 55 → 95. |
| **Golpe** | Trombones Marcato + Horns Marcato + Bass Drum 62 + `Timpani` G#2 (44) | Tbn. G#2 B#2 D#3 A3 (44 48 51 57) · Tpas. G#3 D#4 F#4 A4 (56 63 66 69) | Tiempo 1 del c. 4, CC1 105, notas de negra. |
| Huesos | 1st Violins Col Legno | 56–68 | C. 4, tiempos 2–3, corcheas sobre G#7(♭9), *mf*: el traqueteo que arranca el vals. |

### A «Vals de los mil rostros» (5–20): máximo 10 capas

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía 5–8** | `ClarinetStac` + Xylophone | 73–81 | §5. Clarinete *mf*, xilófono *mp*. |
| **Melodía 9–12** | `FHornSus` | 61–71 | §5, legato, *mp* → *mf*, el sonido del menú (mismo patch, mismo envío de sala que en el menú). |
| **Melodía 13–16** | Violin Solo 1 | 73–81 | CC1 90, con un portamento implícito: ataques algo tardíos (+20 ms) en las notas de llegada. |
| **Melodía 17–20** | `FluteSusVib` | 72–83 | *mf*. |
| Vals | `ContrabassPizz` + `TubaStac` (*oom*), `ViolaEnsPizz` + 1st Violins Col Legno (*pah-pah*) | Cb. 25–40 · Tuba 32–44 · Vla. 56–66 · Col legno 56–71 | *mf*. |
| Mueca | `BassoonStac` | 46–58 | En el tiempo 3 de los compases pares, dos corcheas cromáticas que suben a la fundamental del compás siguiente, *mp*. |
| Pah-pah fuerte (13–20) | Trombones Staccato | 52–64 | Acordes en los tiempos 2 y 3, *mf*. |
| Bombo | Bass Drum 62 | — | Tiempo 1 de cada compás, *mp*. |
| Timbal | `Timpani` | 37–49 | Tiempo 1 de los compases impares, fundamental, *mf*. |
| Trucos | Mark Trees 60 (c. 9) · Flexatón 64 (c. 12, tiempo 3) | — | *pp* / *p*. |

### B «El espejismo» (21–36)

**21–28: máximo 7 capas**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía** | Celesta | 73–83; mano izquierda 61–71 (acorde en el tiempo 1: D4 F#4 A4 · D4 F#4 B4 · E4 G4 B4 → E4 G4 A4 en el tiempo 3 · D4 F#4 A4; en 25–28: D4 F#4 A4 · D4 F4 A4 · E4 G#4 B4 · C#4 E4 G#4) | §5, *p*, mismo carácter de juguete que la intro. |
| Halo | Copas | G#5 (80) | Tenido 21–28, *pp*: el Sol♯ arriba y abajo encierra el re mayor. |
| Pedal | `ContrabassTrem` | G#1 (32) | Tenido 21–36, *pp*, swell de CC11 cada 4 compases. |
| Pedal de timbal | `TimpaniRolls` | G#2 (44) | *pp* constante. |
| Reloj | Cuchillo 60 (tic) | — | Cada tiempo, *pp*: el mecanismo de la caja de música. |
| Trucos | Mark Trees 60 (c. 21) · Flexatón 60 (c. 28) | — | *pp* / *p*. El flexatón del c. 28 es el «fantasma» que rompe la ilusión. |

**29–36: máximo 7 capas**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía** | Vibráfono con arco | 73–81 | §5, *p* → *mp*. |
| Coro | Mixed Chorus («Ah») | 45–61 | Tríadas paralelas descendentes, una por compás: E3 G#3 C#4 · D3 F#3 B3 · C#3 E3 A3 · C#3 D#3 G#3 · C#3 F#3 A3 · B2 E3 G#3 · A2 D3 F#3 · B#2 F#3 A3 (52 56 61 · 50 54 59 · 49 52 57 · 49 51 56 · 49 54 57 · 47 52 56 · 45 50 54 · 48 54 57). CC1 45 → 80. Siempre por debajo del vibráfono. |
| Pedal | `ContrabassTrem` + `TimpaniRolls` | G#1 · G#2 | Como en 21–28; el redoble crece en 33–36 hasta *mf*. |
| Reloj | Cuchillo 60 | — | Solo 29–32. |
| Llegada | Horns Sustain | G#3 B#3 D#4 F#4 A4 (56 60 63 66 69) | C. 36, G#7(♭9), CC1 60 → 100. |
| Plato | Cymbal 63 (crescendo de 2,5 s) | — | Pico en el tiempo 1 del c. 37. |

### Puente «Los cuchillos» (37–44): máximo 11 capas

Las **blancas de la hemiolia** caen en: tiempo 1 y tiempo 3 del primer compás de cada par, y tiempo 2 del segundo
(c. 37 t1, 37 t3, 38 t2, 39 t1, 39 t3, 40 t2, …).

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía** | Horns Marcato | 61–75 | §5, CC1 85 → 110. |
| Cuchillos | Cuchillo 62 + 1st Violins Col Legno (acorde) + Celli Col Legno (fundamental) | Col legno: vl. 64–76, vc. 37–49 | En cada blanca de la hemiolia, *mf* → *f*. Cuchillo velocidad ≤ 80. |
| Bajo | `ContrabassPizz` + `TubaStac` | 25–44 | **También en hemiolia** (en las blancas, no en el tiempo 1): el vals desaparece debajo de los pies. |
| Frenesí | `ViolaEnsSpic` | 56–68 | Corcheas continuas, notas del acorde, *mp* → *f*. |
| Bombo | Bass Drum 62 → 63 | — | 62 en las blancas de la hemiolia (37–42); redoble 63 en 43–44, *mp* → *f*. |
| Timbal | `Timpani` | C#2 D2 D#2 G#2 (37 38 39 44) | En las blancas de la hemiolia. |
| Plato | Cymbal 63 | — | Pico en el tiempo 1 del c. 45. |

### Clímax «La máscara cae» (45–60): máximo 12 capas

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía** | Horns Sustain | 61–69 | §5, CC1 105 → **110 (c. 53)** → 95. Reataque en cada compás nuevo aunque la nota se repita (límite de 2,8 s). |
| **Melodía 8vb** | Trombones Sustain | 49–57 | CC1 100. |
| **Coro** | Mixed Chorus | 45–69 | Voz superior = melodía (unísono declarado); por debajo, el acorde (45–57). CC1 100 → 110 (c. 53) → 95. Corta en el tiempo 1 del c. 60. |
| Frenesí | `ViolinEnsSpic` | 73–85 | Corcheas, arpegio del acorde subiendo y bajando, *mf*–*f*. |
| Vals | `ContrabassPizz` + `TubaStac` + Bass Drum 62 (*oom*); Trombones Staccato + Celli Col Legno (*pah-pah*) | Bajo de lamento: Tuba C#2 B1 A1 G#1 F#1 E2 D2 C#2 · D2 A1 G#1 G#1 · C#2 B1 A1 G#1 (37 35 33 32 30 40 38 37 · 38 33 32 32 · 37 35 33 32); contrabajo igual o una octava abajo (≥ 25) | *f*; el *oom* del c. 53, el más fuerte. |
| Timbal | `Timpani` | 37–47 | Tiempo 1: C#2 B2 A2 G#2 F#2 E2 D2 C#2 · D2 (f) A2 G#2 (redoble en 56) · C#2 B2 A2 · G#2 (golpe del c. 60). |
| Metales de golpe | Tam-tam 57 · Cymbal 66 | — | Tam-tam en el tiempo 1 del c. 45 (*mf*); plato en el tiempo 1 del c. 53 (velocidad ≤ 80). |
| Coda (c. 59) | `ViolinEnsSpic` + Xylophone + `FluteStac` | 73–81 | §5, corcheas, *f*. |
| **Golpe (c. 60)** | Trombones Marcato + Horns Marcato + `Timpani` G#2 + Bass Drum 62 + Flexatón 64 | como en el c. 4 | Tiempo 1, negra; **tiempos 2–3 en silencio** (también el coro y el frenesí). |

### Retorno (61–76): máximo 12 capas

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía 61–64** | `ClarinetStac` + Xylophone + 1st Violins Col Legno | 73–81 | §5, *f* / *mf* / *mf*. |
| **Melodía 65–68** | Horns Marcato | 61–71 | §5, CC1 100. |
| **Melodía 69–76** | Violin Solo 1 + `FluteSusVib` | 72–85 | Unísono declarado; CC1 95 / *f* → *mf* en 75. |
| Vals | `ContrabassPizz` + `TubaStac` + Bass Drum 62 (*oom*); `ViolaEnsPizz` + Celli Col Legno (*pah-pah*) | como en A | *mf*–*f*. |
| Organillo | Organillo (`Great - Flute 4ft`) | 60–72 | Acordes de negra en los tiempos 2 y 3, *p*: la feria. Calla en 65–68 (lo tapa la trompa). |
| Mueca | `BassoonStac` | 46–58 | Como en A. |
| Frenesí | `ViolinEnsSpic` | 64–76 | Solo 69–76, corcheas, *mp*; siempre por debajo de la melodía. |
| Timbal | `Timpani` | 37–49 | Tiempo 1 de cada compás. |

### Codetta (77–80): máximo 6 capas

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Caja de música** | Celesta | 73–81 (+ mano izquierda 61–69) | §5, *p*. |
| Vals en sordina | `ContrabassPizz` + `ViolaEnsPizz` | como en la intro | *p*: el vals sigue debajo y entra así en el c. 1. |
| Latido | `Timpani` | C#2 (37) | Tiempo 1, *p*. |
| Pedal | `ContrabassTrem` | C#1 (25) | Tenido 77–80, *pp*. |
| Cuerda | Carraca 60 | — | C. 80, tiempo 2, *pp*: se le da cuerda a la caja de música para la siguiente vuelta. |

### Notas sobre los samples

- **Brillo medido.** Flexatón, carraca, Mark Trees, vibraslap y slapstick tienen casi toda su energía por encima de
  2,5 kHz (hueco de los efectos) o de 6 kHz. Por eso los trucos van **contados** (§6) y a *pp*–*p*, y los cuchillos
  son la madera seca (`Woodblock` 62, energía en 0,8–2,5 kHz) más col legno, no el slapstick. Sin vibraslap, sin
  slapstick, sin platos de choque.
- **Xilófono solo con mazas blandas**: el de mazas medias, en G5, tiene la energía a −4 dB en 2,5–6 kHz; el de
  blandas, a −22 dB. A este tempo se entiende igual.
- **Celesta** (Sonatina, 1 capa): el carácter de juguete viene de la sequedad, no del volumen. Poco envío de sala
  en la intro y la codetta; algo más en B (el espejismo flota).
- **Copas y vibráfono con arco**: tienen ataques lentos; empezar la nota ~150 ms antes del tiempo para que lleguen
  a tiempo (y anotarlo en `compose.py`).
- **Coro**: por debajo de G4 suena con muestras masculinas y desde G4 con femeninas. En 29–36 todo el coro está por
  debajo de G4 (más oscuro, a propósito). En el clímax la voz superior cruza el límite: vigilar el salto de nivel.
- **`FHornSus` en 9–12**: tiene que sonar como la trompa del menú (mismo patch, misma colocación y sala que en
  `scripts/musica/menu/mix.py`, `pan=-0.25`, `send=0.40`) para que el jugador reconozca su tema antes del giro.
- No usar ningún `KS`.

## 7. Dinámica

Velocidades (VSCO, VCSL y patches de Sonatina por velocidad):

| Nivel | pp | p | mp | mf | f |
|---|---|---|---|---|---|
| Velocidad | 25–40 | 40–55 | 55–70 | 70–85 | 85–105 |

CC1 (Sonatina):

| Nivel | pp | p | mp | mf | f |
|---|---|---|---|---|---|
| CC1 | 40–55 | 55–70 | 70–85 | 85–100 | 100–112 |

Prohibido: velocidad > 105, CC1 > 112.

| Sección | Nivel | Gestos |
|---|---|---|
| Intro 1–4 | p → golpe f (c. 4) | Crescendo de trombones en el c. 3; el golpe a negra. |
| A 5–20 | mf → f (13–20) | El vals acentúa el tiempo 1; la trompa del truco crece en 9–12. |
| B 21–28 | p / pp | Plano; único gesto, el flexatón del c. 28. |
| B 29–36 | p → mf | Crescendo del coro (CC1) y del redoble; las trompas del c. 36 abren al puente. |
| Puente 37–44 | mf → f | Crescendo continuo; los cuchillos crecen con él. |
| Clímax 45–60 | f → **f+ (c. 53)** → f; c. 60 golpe y silencio | Pico en el tiempo 1 del c. 53. |
| Retorno 61–76 | mf–f | 65–68 lo más fuerte del retorno (el truco gritado); 75–76 diminuendo hacia la caja de música. |
| Codetta 77–80 | p | Plano. |

## 8. Criterios de aceptación

**Partitura (se comprueba leyendo `build/acto1-vexis.mid`):**

1. 80 compases de 3/4 a ♩ = 180 sin cambios de tempo; ninguna nota empieza después de 80,000 s y todo lo del c. 80
   termina antes.
2. Todas las notas dentro del rango del catálogo de su patch y de los registros de §6. Techos: violines ≤ 85,
   flauta ≤ 85, trompas ≤ 75, celesta ≤ 83, copas 74–87, coro 45–69.
3. El leitmotiv aparece con las alturas exactas de §5 en los c. 1–3, 5–8, 9–12, 13–16, 17–20, 21–24, 25–28, 29–36,
   37–44, 45–58, 61–64, 65–68 y 74–75. **En los c. 21–24 coincide nota a nota con los c. 13–16 de `build/menu.mid`
   (violines del menú)**, y en los c. 9–11 con los c. 5–7 del menú (trompa) salvo la G4 → G#4.
4. Ninguna figura más corta que la corchea; corcheas solo en `ViolinEnsSpic`, `ViolaEnsSpic`, `BassoonStac`, col
   legno del c. 4, y la coda del c. 59.
5. Capas simultáneas por sección ≤ 8 / 10 / 7 / 7 / 11 / 12 / 12 / 6 (intro / A / B 21–28 / B 29–36 / puente /
   clímax / retorno / codetta).
6. **Sin choques de registro**: mientras suena una melodía de §5, ninguna otra pista mantiene notas de negra o más en
   la misma octava con velocidad (o CC1) ≥ la de la melodía. Excepciones: unísonos declarados (coro + trompas en
   45–58, violín solo + flauta en 69–76, clarinete + xilófono) y las copas del c. 21–28 (pedal *pp*).
7. **El c. 60** cumple el silencio: tras la negra del tiempo 1 no empieza ninguna nota hasta el c. 61.
8. Trucos: exactamente 3 flexatones, 2 Mark Trees y 1 carraca por bucle, en los compases de §6; ningún slapstick,
   vibraslap ni plato de choque.
9. Ninguna velocidad > 105 ni CC1 > 112. El c. 53 tiene el CC1 más alto de trompas y coro.
10. Cada pista de Sonatina por CC1 tiene CC1 en el tick 0 y respeta las duraciones máximas de §6.
11. En el puente, el bajo, el bombo y el timbal caen en las blancas de la hemiolia y **no** en el tiempo 1 de los
    c. 38, 40 y 42.

**Mezcla (se comprueba con el informe de `mix.py`):**

12. Sonoridad integrada **−17 LUFS ± 1**; pico real **≤ −1 dBTP**.
13. `loop_samples` = **3 528 000**; `seam_jump` < 0,02.
14. Contrastes (`sections_lufs`): clímax c. 45–58 frente a B c. 21–28 entre **+5 y +9 LU**; puente c. 41–44 frente a
    c. 37–40 al menos +2 LU.
15. Bandas (`bands_db`): `presencia 2.5-6k` ≤ −18 dB, `aire 6-16k` ≤ −28 dB, `sub <60` ≤ −18 dB.
16. Ninguna parte suelta pasa de −6 dB de pico antes del bus; el golpe de los c. 4 y 60 no hace trabajar al limitador
    del máster más de 3 dB.
17. Escucha: en el c. 9 se reconoce la trompa del menú y en el c. 11 se oye el truco (el Sol♯); el espejismo de 21–24
    suena a caja de música bonita sobre algo que no debería estar ahí, no a error de afinación; la hemiolia del
    puente desorienta pero se puede seguir; el silencio del c. 60 se oye como intención; los efectos del juego siguen
    claros en el c. 53.

**Integración (cuando se apruebe):** copiar a `src/audio/cap1-e1-jefe.mp3` y añadir a `MUSIC_TRACKS`
(`src/fx/music-tracks.ts`): `'cap1-e1-jefe': { file: 'cap1-e1-jefe.mp3', loopSamples: 3528000 }`.
