# Brief: Acto I, escenario 0, «El Asentamiento Ogro» — «Tambores en el valle»

Una canción en **dos versiones sincronizadas**: **exploración** (mapa y eventos) y **combate** (combates
normales y élites). Ids de juego: `cap1-e0` y `cap1-e0-combate`. Pista nueva en
`scripts/musica/acto1-ogros/` con las convenciones del [README del estudio](../../scripts/musica/estudio/README.md):

- `compose.py` genera **los dos MIDIs a la vez**: `build/acto1-ogros-explora.mid` y `build/acto1-ogros-combate.mid`,
  a partir de una única descripción de forma, armonía y melodía (nada de copiar y pegar entre versiones).
- `mix.py` renderiza los dos (`build/acto1-ogros-explora.mp3`, `build/acto1-ogros-combate.mp3`), cada uno con su
  `MixSpec`, y además la prueba de cruce `build/acto1-ogros-cruce.mp3` (criterio 19).

Necesita montado el disco **Base** (VCSL y Sonatina). Referencia de nivel y formato: [menu.md](menu.md).

## 1. Función, emoción y repetición

- **Dónde suena:** el mapa y los eventos del primer escenario del juego (exploración), y todos sus combates
  normales y de élite (combate). Es la **primera música de juego** que oye el jugador tras el menú.
- **Emoción:** sigue siendo aventura de fantasía, pero el menú prometía un mundo amable y aquí ya huele a
  humo: tambores de guerra al fondo del valle, el martillo de una forja en el campamento, metales graves.
  Tono **más serio** que el menú, con **ritmo frenético** en combate y una sombra frigia (el ♭II, Fa) que
  aparece cada vez que el tema se acerca a una cadencia. Nunca terror: es la aventura que se complica.
  - Exploración: marcha a media voz, de pasos cautelosos; el tema en solistas (trompa, clarinete, flauta
    dulce). Se puede escuchar diez minutos leyendo un evento.
  - Combate: la misma marcha a la carga: ostinato de cuerdas en semicorcheas agrupadas 3+3+2, metales
    en marcato, tambores de marco y bombo. Energía alta, densidad media: debajo van los efectos.
- **Repetición:** un escenario dura entre 15 y 40 minutos, y el jugador salta de una versión a otra
  decenas de veces. El bucle tiene que aguantar 15–20 vueltas: un solo clímax (c. 37), un respiro claro
  (sección B) y la costura sin señal.
- **Transformación del leitmotiv: rítmica y modal.** El motivo pasa a **mi menor** y se **comprime en dos
  compases** de 4/4 (disminución) con un ritmo de marcha; se secuencia a la subdominante con el Fa♮
  frigio, y solo en la sección B recupera el modo mayor y la aumentación (ver §5).

## 2. Tempo, métrica, tonalidad, duración

| Parámetro | Valor (idéntico en las dos versiones) |
|---|---|
| Tempo | ♩ = 132, fijo |
| Métrica | 4/4 |
| Tonalidad | mi menor (eólico) con ♭II frigio (Fa) como color de amenaza; B en sol mayor con ♭VI prestado (Mi♭) |
| Compases | **44** |
| Duración del bucle | 44 × 4 × 60/132 = **80,000 s** → `loop_samples` = **3 528 000** a 44,1 kHz |
| `MixSpec` (ambas) | `bpm=132`, `beats_per_bar=4`, `bars=44` |

Un compás dura 1,818 s. **Figuras:**

- Melodías (las dos versiones): corchea como figura mínima.
- Exploración: corchea mínima en todo, salvo el redoble de timbal del puente.
- Combate: semicorchea **solo** en el ostinato de violonchelos en *spiccato*, en los rellenos de tambor y en
  el redoble. Nada de semicorcheas en vientos ni en violines.

### Reglas de sincronía (exploración ↔ combate)

El juego cruza las dos versiones con un fundido **lineal** de 1,6 s desde el mismo punto del bucle
(`src/fx/audio.ts`, `cruzarVersion`). Por tanto:

1. Mismo tempo, métrica, número de compases, forma y **armonía compás a compás** (§3 y §4 son comunes).
2. **Misma melodía**: en cada compás, las alturas y los ataques escritos de la línea de melodía de §5 son
   los mismos en las dos versiones. Puede cambiar el instrumento, la dinámica, la articulación y la
   presencia de doblajes a la octava (declarados en §6).
3. **Capas comunes** (idénticas nota a nota, misma humanización: misma semilla por nombre de pista):
   - `Basses Pizz` (`ContrabassPizz`): fundamental en los tiempos 1 y 3 en los c. 5–20 y 29–40; solo tiempo 1
     en los c. 21–28; nada en 1–4 ni 41–44.
   - `Harp` (`Concert Harp` de VCSL): solo en B (c. 21–28), mismo arpegio en las dos.

   Al ser idénticas, en el cruce lineal suman en fase y no hay bache: son el «hilo» que hace que se oiga la
   misma canción.
4. Todo lo demás puede diferir. Lo que solo existe en una versión entra y sale con el fundido.

## 3. Forma compás a compás e intensidad

Intensidad de 1 a 10 (10 = lo más fuerte de la pista). Exploración (E) no pasa de *mf*; combate (C) no pasa
de *f*.

| Sección | Compases | Tiempo (s) | Contenido | Intensidad E | Intensidad C |
|---|---|---|---|---|---|
| Intro | 1–4 | 0,00–7,27 | Bordón de mi, tambor de marco; la trompa (E) o los metales (C) asoman la cabeza del motivo sobre el ♭II | 2 → 3 | 4 → 5 |
| A | 5–12 | 7,27–21,82 | **Motivo completo** (5–6), secuencia frigia (7–8), consecuente a semicadencia (9–12) | 4 | 6 |
| A' | 13–20 | 21,82–36,36 | Violines con el motivo rearmonizado y cadencia rota (14); contracanto de trompa; llega a D7 (V de sol) | 5 → 6 | 7 |
| B | 21–28 | 36,36–50,91 | **Respiro.** Sol mayor: motivo en aumentación (flauta dulce / trompas); Mi♭maj7 prestado; B7 | 3 (mínimo) | 5 (mínimo) |
| Puente | 29–32 | 50,91–58,18 | ♭VI–♭VII–i; secuencia de la cabeza; crescendo; C7→B7 | 4 → 7 | 6 → 9 |
| Retorno | 33–40 | 58,18–72,73 | Tutti: motivo en el registro grave-medio, relevo agudo; **clímax en el c. 37** (65,45 s) | 7 → **8** (c. 37) → 6 | 9 → **10** (c. 37) → 8 |
| Codetta | 41–44 | 72,73–80,00 | Resolución en mi, eco de la cabeza, ♭II y B7 que encadena con el c. 1 | 4 → 2 | 6 → 4 |

Respiros: c. 12 (tiempo 4), c. 20 (tiempos 3–4 sin melodía nueva), toda la sección B y la codetta. En combate
B baja de densidad (corcheas en lugar de semicorcheas, sin bombo) pero **no se para**.

## 4. Armonía por sección (común a las dos versiones)

Cifrado por compás; «(1–2) / (3–4)» indica cambio de acorde en el tiempo 3; «(1) / (2) / (3–4)» cambio por
tiempo. Bajo entre paréntesis cuando no es la fundamental. Bajo real (contrabajo) entre corchetes.

**Intro (1–4)**: bordón de mi; el ♭II frigio aparece desde el principio.

| 1 | 2 | 3 | 4 |
|---|---|---|---|
| Em | Em | **F/E** (♭II sobre pedal) | B7sus4 (1–2) / B7 (3–4) |

[E1 E1 E1 B1] (28 28 28 35)

**A (5–12)**: antecedente con cadencia perfecta (6), secuencia a la subdominante con V/iv (8), consecuente
que pasa por ii–V–I de sol (10–11) y acaba en semicadencia (12).

| 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|
| Em | Am (1) / B7 (2) / Em (3–4) | Am (1–2) / **F** (3–4) (♭II) | Dm (1) / **E7** (2) (V/iv) / Am (3–4) | Cmaj7 | Am7 (1–2) / D7 (3–4) | G (1–2) / Cmaj7 (3–4) | F#ø7 (1–2) / B7 (3–4) |

[E2 · A1 B1 E2 · A1 F1 · D2 E2 A1 · C2 · A1 D2 · G1 C2 · F#1 B1]

**A' (13–20)**: el motivo rearmonizado; **cadencia rota** en el c. 14 (B7 → C), dominante secundaria en
16 y círculo hacia D7, dominante de sol.

| 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|---|
| Em (1–2) / C (3–4) | Am7 (1) / B7 (2) / **C** (3–4) | Fmaj7 (1–2) / Dm7 (3–4) | Bø7 (1) / E7 (2) / Am (3–4) | Cmaj7 | Am7 (1–2) / Em7 (3–4) | Cmaj7 (1–2) / Am7 (3–4) | D7sus4 (1–2) / D7 (3–4) |

**B (21–28)**: sol mayor. **Mi♭maj7** (♭VI prestado de sol menor) en el c. 27; el Re♯ de B7 se lee como el Mi♭
del acorde anterior (nota común enarmónica).

| 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 |
|---|---|---|---|---|---|---|---|
| G | Em7 (1–2) / Cmaj7 (3–4) | Am7 (1–2) / D7 (3–4) | G (1–2) / Em7 (3–4) | Cmaj7 | D7 | **E♭maj7** | B7sus4 (1–2) / B7 (3–4) |

[G1 · E1 C2 · A1 D2 · G1 E1 · C2 · D2 · E♭1 · B1] (31 · 28 36 · 33 38 · 31 28 · 36 · 38 · 27 · 35)

**Puente (29–32)**: B7 → C es un V → ♭VI (rota) que abre el ascenso eólico ♭VI–♭VII–i; el c. 32 cierra con
**C7 → B7** (sexta aumentada: Si♭ → La, Do → Si, Mi → Re♯).

| 29 | 30 | 31 | 32 |
|---|---|---|---|
| C (♭VI) | D (♭VII) | Em (1–2) / Em (D) (3–4) | **C7** (1–2) / B7 (3–4) |

**Retorno (33–40)**: el motivo con la armonía de A, y un consecuente nuevo que sube a la cumbre sobre ♭VI.

| 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 |
|---|---|---|---|---|---|---|---|
| Em (1–2) / C (3–4) | Am (1) / B7 (2) / Em (3–4) | Am (1–2) / F (3–4) | Bø7 (1) / E7 (2) / Am (3–4) | **Cmaj7** (clímax) | D | Am7 (1–2) / Em (G) (3–4) | B7sus4 (1–2) / B7 (3–4) |

[E2 C2 · A1 B1 E2 · A1 F1 · B1 E2 A1 · C2 · D2 · A1 G1 · B1]

**Codetta (41–44)**: misma armonía que la intro, para que la costura 44 → 1 sea la misma que 4 → 5.

| 41 | 42 | 43 | 44 |
|---|---|---|---|
| Em | Em | F/E | B7sus4 (1–2) / B7 (3–4) |

## 5. Leitmotiv

Referencia (re mayor, grados 1 5 | 6 5 3 | 4 3 2 | 1). **Versión de esta pista: «marcha en disminución»**,
en mi menor y en dos compases de 4/4 (q = negra, e = corchea, h = blanca, w = redonda):

```
| E   B   C  B  G  | A  G  F#  E   |
| q   q   e  e  q  | e  e  q   h   |
```

Las alturas de esta tabla son la **melodía de referencia**: idénticas en las dos versiones.

| Compases | Exploración | Combate | Notas (MIDI) | Transformación |
|---|---|---|---|---|
| 2–4 | `FHornSus` | Horns Marcato + Trombones Marcato 8vb | E3 B3 · C4 · B3 (52 59 · 60 · 59), h h · w · h + silencio de blanca | Solo la cabeza (1 → 5) y el 6 sobre F/E: un aviso, no el tema. |
| **5–6** | **`FHornSus`** | **Horns Marcato** (+ Trombones Marcato 8vb) | **E4 B4 C5 B4 G4 · A4 G4 F#4 E4 (64 71 72 71 67 · 69 67 66 64)** | Exposición: modo menor + disminución a dos compases, ritmo de marcha. Debe reconocerse el motivo del menú al primer oído. |
| 7–8 | `ClarinetSus` | 1st Violins Marcato (+ Horns Marcato 8vb, 57–65) | A4 E5 F5 E5 C5 · D5 C5 B4 A4 (69 76 77 76 72 · 74 72 71 69) | Secuencia a la subdominante: el 6.º grado cae en **Fa♮**, el ♭II de mi. Diálogo grave → agudo. |
| 13–16 | `ViolinEnsSusVib` | `ViolinEnsSusVib` | = c. 5–8 | Rearmonizado; la E final del c. 14 cae sobre **C** (cadencia rota). |
| 21–24 | Flauta dulce contralto | Horns Sustain | G4 D5 · E5 D5 B4 · C5 B4 A4 · G4 (67 74 · 76 74 71 · 72 71 69 · 67), h h · q q h · q q h · w | **Modo mayor** (sol) y **aumentación**: el ritmo del original, el doble de lento. La aventura amable reaparece un momento. |
| 29–32 | `ViolinEnsSusVib` | 1st Violins Marcato (+ Horns Marcato 8vb) | E4 B4 C5 · F#4 C#5 D5 · G4 D5 E5 · A4 E5 D#5 (64 71 72 · 66 73 74 · 67 74 76 · 69 76 75), q q h | **Fragmento** (cabeza 1-5-6) en secuencia ascendente; la D#5 del c. 32 es sensible y resuelve en la E5 de los violines en el c. 33. |
| **33–36** | `FHornSus` + `CelloEnsSusVib` unísono (33–34); `ClarinetSus` + `ViolaEnsSusVib` unísono (35–36) | Horns Marcato + Trombones Marcato 8vb (33–34); 1st Violins Marcato + Horns Marcato 8vb (35–36) | = c. 5–8 | Tutti, con el mismo relevo grave → agudo que en A. |
| 39–41 | `ViolinEnsSusVib` + `FluteSusVib` unísono | `ViolinEnsSusVib` (+ Horns Sustain 8vb) | A5 G5 · F#5 · E5 (81 79 · 78 · 76), h h · w · w | La **cola** (4 3 2 → 1) cierra el clímax. |
| 42 | `FHornSus` | Horns Marcato | E4 (q) B4 (h.) (64 71) | Eco de la cabeza, *p*/*mp*: devuelve al c. 1. |

Consecuentes (no son leitmotiv, pero también son melodía de referencia común):

- c. 9–12: E5 (h) D5 (q) C5 (q) · B4 (q) A4 (q) F#4 (h) · G4 A4 B4 C5 (q) · C5 (h) B4 (h)
  (76 74 72 · 71 69 66 · 67 69 71 72 · 72 71). E: `ClarinetSus`; C: `ViolinEnsSusVib`.
- c. 17–20: E5 (h) F#5 (q) G5 (q) · A5 (h) G5 (q) F#5 (q) · E5 (q) D5 (q) C5 (h) · D5 (w)
  (76 78 79 · 81 79 78 · 76 74 72 · 74). Las dos: `ViolinEnsSusVib`.
- c. 25–28: E5 (h) D5 (h) · F#5 (h) E5 (q) C5 (q) · B♭4 (h) G4 (h) · A4 (h) F#4 (h)
  (76 74 · 78 76 72 · 70 67 · 69 66). E: flauta dulce; C: `ViolinEnsSusVib`.
- c. 37–38: B5 (h) A5 (q) G5 (q) · F#5 (h) E5 (q) D5 (q) (83 81 79 · 78 76 74). **B5 (83) del c. 37 es la
  nota más alta de la pista.**

## 6. Orquestación por sección

Registros en MIDI (C4 = 60). Las capas máximas cuentan pistas con notas sonando a la vez.

### Patches

| Nombre corto | Ruta `.sfz` | Dinámica |
|---|---|---|
| `FHornSus` | `VSCO-2-CE/FHornSus.sfz` | velocidad |
| `ClarinetSus` | `VSCO-2-CE/ClarinetSus.sfz` | velocidad |
| `FluteSusVib` | `VSCO-2-CE/FluteSusVib.sfz` | velocidad |
| Flauta dulce contralto | `VCSL/Aerophones/Edge-blown Aerophones/Baroque Alto Recorder - SusVib.sfz` | velocidad |
| `ViolinEnsSusVib` / `-Quiet` | `VSCO-2-CE/ViolinEnsSusVib.sfz` / `ViolinEnsSusVib-Quiet.sfz` | velocidad |
| `ViolinEnsTrem` | `VSCO-2-CE/ViolinEnsTrem.sfz` | velocidad |
| `ViolaEnsSusVib` / `-Quiet` | `VSCO-2-CE/ViolaEnsSusVib.sfz` / `ViolaEnsSusVib-Quiet.sfz` | velocidad |
| `ViolaEnsTrem` / `ViolaEnsSpic` | `VSCO-2-CE/ViolaEnsTrem.sfz` / `ViolaEnsSpic.sfz` | velocidad |
| `CelloEnsSusVib` / `-Quiet` | `VSCO-2-CE/CelloEnsSusVib.sfz` / `CelloEnsSusVib-Quiet.sfz` | velocidad |
| `CelloEnsSpic` | `VSCO-2-CE/CelloEnsSpic.sfz` | velocidad |
| `ContrabassPizz` / `ContrabassSpic` | `VSCO-2-CE/ContrabassPizz.sfz` / `ContrabassSpic.sfz` | velocidad |
| `ContrabassSusVB` / `-Quiet` | `VSCO-2-CE/ContrabassSusVB.sfz` / `ContrabassSusVB-Quiet.sfz` | velocidad |
| `Timpani` / `TimpaniRolls` | `VSCO-2-CE/Timpani.sfz` / `TimpaniRolls.sfz` | velocidad |
| Horns Marcato | `sso/Sonatina Symphonic Orchestra/Brass - Performance/Horns Marcato.sfz` | **CC1** |
| Horns Sustain | `sso/Sonatina Symphonic Orchestra/Brass - Performance/Horns Sustain.sfz` | **CC1** |
| Trombones Marcato | `sso/Sonatina Symphonic Orchestra/Brass - Performance/Trombones Marcato.sfz` | **CC1** |
| Trombones Sustain | `sso/Sonatina Symphonic Orchestra/Brass - Performance/Trombones Sustain (looped).sfz` | **CC1** |
| 1st Violins Marcato | `sso/Sonatina Symphonic Orchestra/Strings - Performance/1st Violins Marcato.sfz` | **CC1** |
| `Harp` | `VCSL/Chordophones/Composite Chordophones/Concert Harp.sfz` (3 capas) | velocidad |
| Frame Drum | `VCSL/Membranophones/Struck Membranophones/Frame Drum.sfz` | velocidad |
| Bass Drum | `VCSL/Membranophones/Struck Membranophones/Bass Drum 2.sfz` | velocidad |
| Tom | `VCSL/Membranophones/Struck Membranophones/Tom 2.sfz` (tom grave) | velocidad |
| Forja | `VCSL/Idiophones/Struck Idiophones/Brake Drum.sfz` (tambor de freno) | velocidad |
| Cymbal | `VCSL/Idiophones/Struck Idiophones/Suspended Cymbal 2.sfz` | velocidad |

**Notas de las percusiones sin altura** (comprobadas en los `.sfz`): Frame Drum 61 = grande golpe, 62 = grande
apagado, 64 = pequeño golpe, 65 = pequeño apagado (**no usar 60 ni 63**, los golpes con la mano: medidos, tienen
su energía en 2,5–16 kHz); Bass Drum 62 = golpe, 63 = redoble; Tom 62 = golpe con maza; Forja 61 = martillo,
63 = maza de lana (más oscuro y lejano), 65 = martillo sobre el segundo tambor; Cymbal 64 = crescendo de 4 s,
66 = golpe.

**Sonatina (CC1)**: las cinco pistas de Sonatina **tienen que llevar curva de CC1** (un punto en el tick 0
antes de la primera nota y la forma de cada frase; como mucho un punto cada 1/8 de compás). En estos patches
la velocidad no cuenta (`amp_veltrack=0`). Duración máxima por nota: Horns Marcato/Sustain ≤ 2,8 s; Trombones
Marcato ≤ 2,2 s (para más, `Trombones Sustain (looped)`); 1st Violins Marcato ≤ 3,5 s.

**Rejilla de semicorcheas** (combate): las 16 semicorcheas del compás se numeran 0–15. **Acentos 3+3+2**:
posiciones **0, 3, 6, 8, 11, 14**.

### Intro (1–4)

**Exploración (máximo 6 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| Bordón | `CelloEnsSusVib-Quiet` + `ContrabassSusVB-Quiet` | Vc. E2 (40) → B2 (47) en el c. 4 · Cb. E1 (28) → B1 (35) | Tenido 1–3, cambio en el c. 4, *pp*. |
| Armonía | `ViolaEnsSusVib-Quiet` | 52–59 | E3+B3 (1–2), F3+A3 (3), F#3+A3 (4), *pp*. |
| Cabeza | `FHornSus` | 52–60 | §5, *p*, legato, algo lejana (envío de sala alto). |
| Pulso | Frame Drum 62 | — | Tiempos 1 y 3, *pp*. |
| Forja | Forja 63 | — | Un golpe en el tiempo 1 de los c. 1 y 3, velocidad 30–40: una forja lejana. |

**Combate (máximo 9 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| Ostinato | `CelloEnsSpic` | E2 (40) en acentos, E3 (52) en el resto; B2/B3 (47/59) en el c. 4 | Semicorcheas continuas desde el c. 1, acentos 3+3+2 (+18 de velocidad), *mp*. |
| Ostinato grave | `ContrabassSpic` | E1/E2 (28/40), B1 (35) | **Solo en los acentos** (no semicorcheas continuas), desde el c. 3. |
| Cabeza | Horns Marcato + Trombones Marcato 8vb | Tpas. 52–60 · Tbn. 40–48 | §5; CC1 75 → 90. |
| Armonía | `ViolaEnsTrem` | 52–59 | C. 3–4, F3+A3 → F#3+A3, *pp* → *p*. |
| Bombo | Bass Drum 62 | — | Tiempos 1 y 3, *mp*. |
| Tambor | Frame Drum 61 | — | Acentos 3, 6, 11, 14. |
| Relleno | Tom 62 | — | C. 4, semicorcheas 12–15 en crescendo. |
| Forja | Forja 61 | — | Tiempo 4 de los c. 2 y 4, velocidad ≤ 70. |

### A (5–12)

**Exploración (máximo 7 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía 5–6** | `FHornSus` (pista «Trompa») | 64–72 | Legato, *mp*; las negras con un ligero apoyo, la blanca del c. 6 con < >. Calla en 7–12. |
| **Melodía 7–12** | `ClarinetSus` | 66–77 | *mp*, respuesta a la trompa; respiración de corchea al final del c. 8. |
| Armonía | `ViolaEnsSusVib-Quiet` | 52–64 | Notas guía (3.ª/7.ª) tenidas, *p*. Nunca por encima de E4 (64) mientras canta la trompa. |
| Bajo | `CelloEnsSusVib-Quiet` | 36–52 | Fundamentales tenidas, *p* (una octava sobre el contrabajo). |
| Pulso | `ContrabassPizz` (**común**) | 28–40 | Tiempos 1 y 3, *p*. |
| Marcha | Frame Drum 62 / 65 | — | 62 en los tiempos 1 y 3; 65 en las corcheas 2 y 4 «y» (semicorcheas 6 y 14), *p*. |
| Timbal | `Timpani` | E2 (40), A2 (45) | Tiempo 1 de los c. 8 (A2) y 12 (B2, 47), *p*. |

**Combate (máximo 11 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía 5–6** | Horns Marcato (pista «Horns Marc») | 64–72 | CC1 95 → 100 (*mf*–*f*). Cada nota con ataque; la blanca del c. 6 con caída de CC1 a 85. |
| Doblaje 5–6 | Trombones Marcato | 52–60 (8vb) | CC1 85–90, siempre 10 por debajo de las trompas. |
| **Melodía 7–8** | 1st Violins Marcato | 69–77 | CC1 95. |
| Doblaje 7–8 | Horns Marcato | 57–65 (8vb) | CC1 85. |
| **Melodía 9–12** | `ViolinEnsSusVib` | 66–76 | Legato *mf*. |
| Ostinato | `CelloEnsSpic` + `ContrabassSpic` | Vc. 36–52 · Cb. 28–40 | Como en la intro, siguiendo el bajo de §4 por medio compás; *mf*. |
| Contratiempo | `ViolaEnsSpic` | 52–64 | Corcheas a contratiempo («y» de cada tiempo) con notas del acorde, *mp*. |
| Pulso | `ContrabassPizz` (**común**) | 28–40 | Igual que en exploración. |
| Tambores | Bass Drum 62 · Frame Drum 61/64 | — | Bombo en 0 y 8 (+ 11 en los compases pares); Frame Drum 61 en 3, 6, 11, 14; 64 en la 15 de cada compás. |
| Timbal | `Timpani` | 40–48 | Fundamental en el tiempo 1 de los c. 5, 7, 9, 11 (E2, A2, C3, G2), *mf*. |
| Forja | Forja 61 | — | Semicorchea 12 (tiempo 4) de los c. 6, 8, 10, 12, velocidad ≤ 70. |

### A' (13–20)

**Exploración (máximo 8 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía** | `ViolinEnsSusVib` | 64–81 | Legato, *mp* → *mf* en 17–19 → *mp* en 20. 13–16 en la cuerda grave (64–77), 17–20 arriba (72–81). |
| Contracanto | `FHornSus` | 52–67 | 13–16: G3 E3 · E3 D#3 E3 · C4 A3 · F3 G#3 A3 (h h · h q q · h h · q q h). 17–20: G4 (w) · E4 D4 (h h) · E4 C4 (h h) · A3 C4 (h h). *mp*. Siempre en otra octava que la melodía. |
| Armonía | `ViolaEnsSusVib-Quiet` | 48–62 | Notas guía, *p*. |
| Bajo | `CelloEnsSusVib-Quiet` | 36–52 | Fundamentales, *p*. |
| Pulso | `ContrabassPizz` (**común**) | 28–40 | Tiempos 1 y 3. |
| Paso | `CelloEnsPizz` (`VSCO-2-CE/CelloEnsPizz.sfz`) | 43–55 | Quinta del acorde en los tiempos 2 y 4, *p*: la marcha a media voz. |
| Marcha | Frame Drum 62 / 65 / 64 | — | Como en A + 64 en la semicorchea 14 de los compases pares. |
| Timbal | `Timpani` | 38–45 | Tiempo 1 del c. 16 (A2) y tiempo 3 del c. 20 (D2, 38), *p*. |

**Combate (máximo 11 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía** | `ViolinEnsSusVib` | 64–81 | Legato *mf* → *f* en 18 → *mf* en 20. |
| Contracanto | Horns Sustain | 52–67 | Las notas del contracanto de exploración, CC1 80–90. |
| Ostinato | `CelloEnsSpic` + `ContrabassSpic` | como en A | *mf*. |
| Contratiempo | `ViolaEnsSpic` | 52–62 | Como en A. |
| Golpes | Trombones Marcato | 40–60 | Acorde en las semicorcheas 0 y 6 de cada compás (notas cortas de corchea), CC1 85. |
| Pulso | `ContrabassPizz` (**común**) | 28–40 | — |
| Tambores | Bass Drum · Frame Drum | — | Como en A. |
| Relleno | Tom 62 | — | Semicorcheas 12–15 de los c. 16 y 20. |
| Timbal | `Timpani` | 38–48 | Tiempo 1 de 13, 15, 17, 19. |
| Forja | Forja 61 | — | Semicorchea 12 de los c. 14, 16, 18. |

### B (21–28): respiro

**Exploración (máximo 6 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía** | Flauta dulce contralto | 66–78 | *p* dolce; motivo en aumentación (21–24) y consecuente (25–28). Respiración de corchea al final de los c. 24 y 26. |
| Contracanto 25–28 | `ClarinetSus` | 62–67 | G4 (w) · A4 F#4 (h h) · E♭4 D4 (h h) · E4 D#4 (h h). *p*, al menos 10 de velocidad por debajo de la flauta dulce. Calla en 21–24. |
| Arpegio | `Harp` (**común**) | 31–64 | Fundamental en el tiempo 1 + negras ascendentes por el acorde en 2–4; nunca por encima de E4 (64). *p*. |
| Bajo | `CelloEnsSusVib-Quiet` | 36–50 | Fundamentales tenidas, *pp*. |
| Pulso | `ContrabassPizz` (**común**) | 27–38 | Solo tiempo 1. |
| Latido | Frame Drum 62 | — | Tiempo 1 de los c. 21, 23, 25 y 27, *pp*. |

**Combate (máximo 9 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía 21–24** | Horns Sustain | 67–76 | Unísono de trompas, CC1 75 → 85 → 75 (arco por frase): heroico, no agresivo. |
| **Melodía 25–28** | `ViolinEnsSusVib` | 66–78 | *mp*. |
| Contracanto 25–28 | Horns Sustain | 62–67 | El del clarinete de exploración, CC1 70. |
| Ostinato | `CelloEnsSpic` | 36–52 | **Corcheas** con acentos en las corcheas 0, 3, 6 (3+3+2), *mp*. Sin contrabajos en *spiccato*. |
| Pad | `ViolaEnsTrem` | 55–64 | Notas guía en trémolo, *pp*. |
| Arpegio | `Harp` (**común**) | 31–64 | Idéntico a exploración. |
| Pulso | `ContrabassPizz` (**común**) | 27–38 | — |
| Tambor | Frame Drum 62 / 65 | — | 62 en los tiempos 1 y 3; 65 (pequeño apagado) en las corcheas 3 y 6, *p*. Sin bombo. |
| Timbal | `Timpani` | 43–48 | Tiempo 1 de los c. 21 (G2) y 25 (C3), *p*. |

### Puente (29–32)

**Exploración (máximo 8 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía** | `ViolinEnsSusVib` | 64–76 | Secuencia de §5, *p* → *mf*. |
| Sostén | `FHornSus` | 55–59 | G3 · A3 · B3 · B♭3 (h) A3 (h) (redondas; el Si♭ → La del c. 32 es la voz de la sexta aumentada), crescendo. |
| Armonía | `ViolaEnsTrem` | 52–64 | Trémolo de acorde, *pp* → *mf*. |
| Bajo | `CelloEnsSusVib` + `ContrabassSusVB` | Vc. 48 50 52–50 48–47 · Cb. 36 38 40–38 36–35 | Tenidos, crescendo. |
| Pulso | `ContrabassPizz` (**común**) | 35–40 | Tiempos 1 y 3. |
| Tambor | Frame Drum 61 / 65 | — | 61 en los tiempos 1 y 3; 65 en corcheas en el c. 32, crescendo. |
| Redoble | `TimpaniRolls` | E2 (40) en el c. 31 → B2 (47) en el c. 32 | *pp* → *mf*; corta justo en el tiempo 1 del c. 33. |

**Combate (máximo 11 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía** | 1st Violins Marcato | 64–76 | CC1 80 → 105. |
| Doblaje | Horns Marcato | 52–64 (8vb) | CC1 75 → 100. |
| Sostén | Trombones Sustain | 55–59 | La línea G3 · A3 · B3 · B♭3–A3 de exploración, CC1 70 → 105. |
| Ostinato | `CelloEnsSpic` + `ContrabassSpic` | — | Semicorcheas, crescendo. |
| Armonía | `ViolaEnsTrem` | 52–64 | *p* → *f*. |
| Pulso | `ContrabassPizz` (**común**) | — | — |
| Redoble | `TimpaniRolls` | E2 → B2 | Como en exploración, hasta *f*. |
| Bombo | Bass Drum 63 (redoble) | — | C. 32, *mp* → *f*. |
| Plato | Cymbal 64 (crescendo de 4 s) | — | Colocado para que el pico caiga en el tiempo 1 del c. 33 (empieza ~2,2 compases antes; el orquestador mide el pico en el sample). **Único plato de la pista junto con el del c. 37.** |
| Relleno | Tom 62 | — | C. 32, tiempos 3–4 en semicorcheas, crescendo. |
| Tambor | Frame Drum 61 / 64 | — | 61 en los acentos en 29–30; 64 en semicorcheas en el c. 31, *p* → *mf*; calla en el c. 32 (lo releva el tom). |

### Retorno (33–40)

**Exploración (máximo 9 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Motivo 33–34** | `FHornSus` + `CelloEnsSusVib` unísono | 64–72 | *mf*. Unísono declarado. |
| **Motivo 35–36** | `ClarinetSus` + `ViolaEnsSusVib` unísono | 69–77 | *mf*. Unísono declarado. |
| Contracanto 33–36 | `ViolinEnsSusVib` | 76–81 | E5 (w) · F#5 G5 (h h) · A5 (w) · F5 G#5 A5 (q q h) (76 · 78 79 · 81 · 77 80 81). *mf*. |
| **Melodía 37–41** | `ViolinEnsSusVib` + `FluteSusVib` unísono | 74–83 | *mf* → **f** en el c. 37 → *mp* en el 40. Unísono, nunca a la octava. |
| Contracanto 37–40 | `FHornSus` | 57–69 | E4 G4 · A4 F#4 · E4 B3 · A3 D#4 (blancas) (64 67 · 69 66 · 64 59 · 57 63) → E4 en el c. 41. *mf*. |
| Armonía | `ViolaEnsSusVib` | 52–64 | Notas guía tenidas, solo 37–40, *mf*. |
| Bajo | `ContrabassSusVB` (33–40) + `CelloEnsSusVib` (37–40) | Cb. 27–38 · Vc. 36–50 | Tenidos; los chelos vuelven al bajo en el c. 37. |
| Pulso | `ContrabassPizz` (**común**) | 28–40 | — |
| Tambores | Frame Drum 61 / 65 · `Timpani` | Timp. E2 (40), C2 (36), B2 (47) | Frame Drum 61 en 1 y 3, 65 en 2 y 4. Timbal: tiempo 1 de 33 (E2), 37 (C2, el más fuerte) y tiempo 3 de 40 (B2). |

**Combate (máximo 12 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Motivo 33–34** | Horns Marcato + Trombones Marcato 8vb | Tpas. 64–72 · Tbn. 52–60 | CC1 105 / 100. |
| **Motivo 35–36** | 1st Violins Marcato + Horns Marcato 8vb | 69–77 · 57–65 | CC1 105 / 95. |
| Contracanto 33–36 | `ViolinEnsTrem` | 76–81 | Las notas del contracanto de exploración en trémolo, *mf*. |
| **Melodía 37–41** | `ViolinEnsSusVib` + Horns Sustain 8vb | 74–83 · 62–71 | *f* en el c. 37; CC1 de trompas 105 → 85. |
| Contracanto 37–40 | Trombones Sustain | 45–57 | El contracanto de trompa de exploración una octava abajo, CC1 90. |
| Ostinato | `CelloEnsSpic` + `ContrabassSpic` | — | Semicorcheas 3+3+2, *f*. |
| Contratiempo | `ViolaEnsSpic` | 52–64 | Corcheas a contratiempo, *mf*. |
| Pulso | `ContrabassPizz` (**común**) | — | — |
| Tambores | Bass Drum · Frame Drum | — | Como en A; en el c. 37 el bombo con su velocidad más alta. |
| Relleno | Tom 62 | — | C. 36 (12–15) y c. 40 (8–15). |
| Timbal | `Timpani` | 36–48 | Fundamental en el tiempo 1 de cada compás; c. 37 C2 *f*. |
| Plato y forja | Cymbal 66 · Forja 65 / 61 | — | Plato: tiempo 1 del c. 33 (llegada del crescendo) y del c. 37, velocidad ≤ 80. Forja: 65 en el tiempo 1 del c. 37 (velocidad ≤ 85) y 61 en la semicorchea 12 de 34 y 36. |

### Codetta (41–44)

**Exploración (máximo 6 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| Final de la melodía | `ViolinEnsSusVib-Quiet` | 76 | E5 tenido en el c. 41, diminuendo; suelta en el tiempo 4. |
| Eco | `FHornSus` | 64–71 | §5, *p*. |
| Armonía | `ViolaEnsSusVib-Quiet` | 52–59 | Como en la intro (E3+B3 · E3+B3 · F3+A3 · F#3+A3), *pp*. |
| Bordón | `CelloEnsSusVib-Quiet` + `ContrabassSusVB-Quiet` | como en la intro | *pp*. |
| Pulso | Frame Drum 62 | — | Tiempos 1 y 3, *pp*. |
| Forja | Forja 63 | — | Tiempo 1 del c. 43, velocidad 30–40. |

**Combate (máximo 9 capas)**

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| Final de la melodía | `ViolinEnsSusVib` | 76 | E5 en el c. 41, *mf* → *p*. |
| Eco | Horns Marcato | 64–71 | §5, CC1 85. |
| Armonía | Trombones Sustain | 52–59 | F3+A3 (43), F#3+A3 (44), CC1 70. |
| Ostinato | `CelloEnsSpic` | — | Sigue en semicorcheas, *mp*: **es la misma figura con la que arranca el c. 1**. |
| Ostinato grave | `ContrabassSpic` | — | Acentos en 41–42; calla en 43–44 (vuelve en el c. 3). |
| Tambores | Bass Drum 62 · Frame Drum 61 | — | Bombo en el tiempo 1; Frame Drum en los acentos; *mp*. |
| Relleno | Tom 62 | — | C. 44, semicorcheas 12–15 (igual que en el c. 4). |
| Forja | Forja 61 | — | Tiempo 4 del c. 44 (igual que en el c. 4). |

### Notas sobre los samples

- **Sin trompetas, piccolo ni caja**: viven en 2,5–6 kHz, justo el hueco de los efectos. El brillo del combate
  lo dan el marcato de trompas y violines y el ataque de los tambores de marco.
- **Forja**: es la firma del campamento. **No se usa el `Anvil` de VCSL**: medido, concentra su energía en
  2,5–6 kHz (a −1 dB del total del sample), justo el hueco de los efectos. El `Brake Drum` con martillo suena a
  metal golpeado con la energía en 0,8–2,5 kHz y unos 10 dB menos en 2,5–6 kHz. Aun así: nunca más de 8 golpes
  por bucle en combate ni de 3 en exploración, velocidad ≤ 70 salvo el c. 37 (≤ 85); bus con paso alto a 300 Hz
  y recorte de 3–4 dB en 3 kHz.
- **Ostinato en semicorcheas**: `CelloEnsSpic` tiene 2 round robin; para que no suene a ametralladora, alterna
  octava entre acentos y no acentos y varía la velocidad (los no acentos con ±6 de humanización). Ninguna
  racha de más de 3 semicorcheas con la misma altura y la misma velocidad (±3).
- `FHornSus` (solista de VSCO, 8 capas) es la trompa de la exploración; Horns Marcato/Sustain (sección de
  Sonatina) la del combate: el paso de solista a sección forma parte del cambio de tono.
- Violines y violas `-Quiet` para *pp*–*p*; patch normal desde *mp*. No cambiar de patch en mitad de una nota.
- No usar ningún `-KS` ni `KS`.

## 7. Dinámica

Velocidades (patches de VSCO y VCSL; CC11 da la forma dentro de la nota):

| Nivel | pp | p | mp | mf | f |
|---|---|---|---|---|---|
| Velocidad | 25–40 | 40–55 | 55–70 | 70–85 | 85–100 |

CC1 (patches de Sonatina):

| Nivel | pp | p | mp | mf | f |
|---|---|---|---|---|---|
| CC1 | 40–55 | 55–70 | 70–85 | 85–100 | 100–110 |

No se usa *ff*: velocidad > 105 y CC1 > 112 prohibidos.

| Sección | Exploración | Combate | Gestos |
|---|---|---|---|
| Intro 1–4 | pp → p | mp | E: CC11 de violas en crescendo leve en el c. 4. C: CC1 de metales 75 → 90 en la cabeza. |
| A 5–12 | p (acomp.) / mp (melodía) | mf (acomp.) / mf–f (melodía) | Swell < > de ~15 % en las blancas de trompa y clarinete. |
| A' 13–20 | mp → mf (17–19) → mp | mf → f (18) → mf | Arco largo de violines 17–20. |
| B 21–28 | p / pp | mp / p | E plano. C: arcos de CC1 de trompas por frase de 2 compases. |
| Puente 29–32 | p → mf | mf → f | Crescendo lineal en 4 compases (CC11 en VSCO, CC1 en Sonatina). |
| Retorno 33–40 | mf → **f (c. 37)** → mp | f → **f+ (c. 37)** → mf | Pico en el tiempo 1 del c. 37; desde ahí, diminuendo por compases. |
| Codetta 41–44 | p → pp | mf → mp | E: todo lo tenido se apaga hacia el c. 44. C: el ostinato baja a *mp* y así entra en el c. 1. |

## 8. Criterios de aceptación

**Partitura (se comprueba leyendo los dos MIDIs con `compose.py`):**

1. Los dos MIDIs: 44 compases de 4/4 a ♩ = 132, sin cambios de tempo, misma longitud en ticks; ninguna nota
   empieza después de 80,000 s y nada suena más allá (todo lo del c. 44 termina antes de 80,000 s).
2. Todas las notas dentro del rango del catálogo de su patch y de los registros de §6. Techos: violines ≤ 83
   (B5), trompas ≤ 77 y ≤ 72 cuando llevan el motivo en marcato, flauta dulce 65–78, clarinete ≤ 77.
3. La melodía de referencia de §5 (motivo y consecuentes) aparece con las alturas y los ataques exactos en las
   **dos** versiones: c. 5–8, 9–12, 13–16, 17–20, 21–24, 25–28, 29–32, 33–36, 37–41.
4. Las capas comunes (`Basses Pizz`, `Harp`) son idénticas en los dos MIDIs: mismas alturas, ticks de inicio y
   fin y velocidades **después** de humanizar.
5. Figuras: ninguna más corta que la corchea en exploración (salvo el redoble); en combate, semicorcheas solo en
   `CelloEnsSpic`, Frame Drum, Tom y los redobles.
6. Capas simultáneas por sección ≤ E 6 / 7 / 8 / 6 / 8 / 9 / 6 y C 9 / 11 / 11 / 9 / 11 / 12 / 9
   (intro / A / A' / B / puente / retorno / codetta).
7. **Sin choques de registro**: mientras suena la melodía, ninguna otra pista mantiene notas de negra o más en
   la misma octava con velocidad (o CC1) ≥ la de la melodía. Excepciones: los unísonos y doblajes declarados en §6
   y el contracanto del clarinete en B (al menos 10 de velocidad por debajo).
8. Ninguna velocidad > 105 ni CC1 > 112. El c. 37 contiene la velocidad (o CC1) más alta de violines, trompas y
   timbal en las dos versiones.
9. Cada pista de Sonatina tiene un CC1 en el tick 0 y su duración por nota respeta los máximos de §6.
10. Ostinato de combate: acentos en 0, 3, 6, 8, 11, 14 en todos los compases con semicorcheas; ninguna racha de
    más de 3 semicorcheas con la misma altura y velocidad (±3).
11. Forja: ≤ 3 golpes en exploración y ≤ 8 en combate por bucle; ninguna nota 60 ni 63 en Frame Drum; plato solo en los c. 32–33 y 37.

**Mezcla (se comprueba con el informe de `mix.py`, una `MixSpec` por versión):**

12. Sonoridad integrada: exploración **−17,5 ± 0,5 LUFS**, combate **−16,5 ± 0,5 LUFS** (las dos dentro de
    −17 ± 1, el combate un punto por encima). Pico real **≤ −1 dBTP** en las dos.
13. `loop_samples` = **3 528 000** en las dos; `seam_jump` < 0,02 en las dos.
14. Contraste dentro de cada versión (`sections_lufs`): retorno c. 33–40 frente a B c. 21–28 entre **+5 y +9 LU**
    en exploración y entre **+3 y +7 LU** en combate.
15. Contraste entre versiones: en cada sección de §3, combate − exploración entre **0 y +4 LU**. Nunca más bajo el
    combate.
16. Bandas (`bands_db`, relativas al total), en las dos: `presencia 2.5-6k` ≤ −18 dB, `aire 6-16k` ≤ −28 dB,
    `sub <60` ≤ −20 dB. Primer listón: se recalibra tras la primera entrega si la escucha lo pide.
17. Ninguna parte suelta pasa de −6 dB de pico antes del bus (para que el limitador no trabaje en los golpes).
18. Las dos `MixSpec` comparten sala (mismos `reverb` y `reverb_eq`) y la colocación (pan, envío) de las
    pistas que existen en ambas; las capas comunes con el mismo `gain_db`.
19. **Prueba de cruce**: `mix.py` escribe `build/acto1-ogros-cruce.mp3`: exploración de 0 a 24 s, fundido
    lineal de 1,6 s a combate en 24 s, vuelta a exploración en 56 s (como hace el juego). En la sonoridad a
    corto plazo (ventana de 3 s) no hay un bache de más de 3 LU por debajo de la menor de las dos versiones ni
    un salto de más de 4 LU, y a la escucha no hay ataques duplicados ni *flam* en la pulsación.
20. Escucha: la trompa de los c. 5–6 se reconoce como el motivo del menú; la forja se oye como un martillo lejano y no
    como clic; en combate los efectos del juego (probar con `npm run dev`) se siguen entendiendo en el c. 37.

**Integración (cuando se apruebe):** copiar a `src/audio/cap1-e0.mp3` y `src/audio/cap1-e0-combate.mp3` y
añadir a `MUSIC_TRACKS` (`src/fx/music-tracks.ts`):
`'cap1-e0': { file: 'cap1-e0.mp3', loopSamples: 3528000, group: 'cap1-e0' }` y
`'cap1-e0-combate': { file: 'cap1-e0-combate.mp3', loopSamples: 3528000, group: 'cap1-e0' }`.
