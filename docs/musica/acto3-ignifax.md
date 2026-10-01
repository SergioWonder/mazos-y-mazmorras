# Brief: Acto III, jefe del escenario 0, Ignifax, el Dragón Rojo — «Llamarada y trono de ceniza»

Combate de jefe de la Guarida del Dragón y **última batalla del juego**. Id de juego: `cap3-e0-jefe` (una sola pista en
bucle). Pista nueva en `scripts/musica/acto3-ignifax/` con las convenciones del
[README del estudio](../../scripts/musica/estudio/README.md): `test_compose.py` (criterios 1–15 de §8, escrito **antes**
que `compose.py`), `compose.py` → `build/acto3-ignifax.mid`, `mix.py` → `build/acto3-ignifax.mp3` y
`build/acto3-ignifax.report.json`. Necesita montado el disco **Base** (VCSL y Sonatina).

Fuentes: [direccion.md](direccion.md) (jefes: «temática mucho más oscura y ritmo frenético de batalla épica»; Acto III,
la Guarida: decadencia, «Tesoro maldito»). **Bocetos aprobados, los dos enteros** («impleméntalos enteros», dijo el
usuario): `ignifax_llamarada()` y `ignifax_trono()` en `scripts/musica/leitmotivs/acto3_jefes.py` (con `IGNIFAX_PARTS`,
`ignifax_frenzy`, `hammer`, `tesoro_notes`) y sus renders `build/acto3-jefe-ignifax-1-llamarada.mp3` y
`build/acto3-jefe-ignifax-2-trono-de-ceniza.mp3`. Escenario del que viene: [acto3-guarida.md](acto3-guarida.md)
(la menor, ♩ = 84, el mismo leitmotiv).

## 1. Función, emoción y repetición

- **Dónde suena:** solo en el combate contra Ignifax, el Dragón Rojo, jefe de la Guarida y final del juego.
- **Emoción:** el **clímax de la música dracónica del acto**. Coros poderosos con pausas, épico y frenético: la máquina
  de guerra del dragón (*spiccato* con el ♭2, tambores de guerra con anacrusas de semicorchea, toms contra el compás,
  metales graves en la fundamental y su ♭2, timbales, caja) y, por encima, el coro entero cantando «Tesoro maldito».
  En el centro, el dragón como **dios oscuro en su trono**: órgano, coro grave y un latido de timbal.
- **Las dos ideas aprobadas, dentro de un solo bucle.** «Llamarada» (♩ = 168, 3/4) es el motor; «Trono de ceniza»
  (♩ = 126, 4/4) es el peso. **168 = 126 × 4/3**: tres negras a 126 duran lo mismo que cuatro a 168 (1,4286 s), y la
  semicorchea de 126 es el tresillo de corchea de 168. El cambio de pulso es una **modulación métrica** exacta, y cada vez
  entra después de un silencio (los dos martillazos, la ruptura) o de un golpe de tutti.
- **Todo lo que el usuario oyó en los bocetos está en la pista:**
  - la máquina de guerra arranca bajo gritos del coro y **se para en seco** (intro);
  - el coro entero canta el motivo sobre el motor dracónico (A);
  - **dos martillazos y silencio** (c. 21–22);
  - el órgano, el coro grave y el **latido de timbal** del trono (c. 23–26);
  - el motivo **contra el 4/4** sobre grooves de taiko **3+3+2** con golpes de metal (c. 27–34);
  - la **ruptura de golpes** contestada por **gritos del coro en los silencios** (c. 35–36);
  - el motivo **un semitono arriba, en octavas, con órgano y gong** (clímax I);
  - el **regreso una tercera menor arriba con todo a la vez** (clímax II, la cumbre);
  - los **tres golpes en hemiolia** que cierran el bucle.
- **Lo que pidió el usuario tras oír los bocetos:**
  - **El yunque («campanita») sonaba demasiado agudo y estridente.** Se cambia por un **golpe de metal grave**: el
    tambor de freno de VCSL golpeado con martillo (`Brake Drum`, nota 61; centroide medido ≈ 1,8 kHz frente a 5–6,5 kHz
    del yunque), en un bus oscuro (estantería −9 dB desde 2 kHz) y **al menos 10 dB por debajo** del nivel relativo que
    tenía el yunque en el boceto (criterio 19). Nada que haga «ping».
  - **Nada agudo estridente:** nada por encima de **F5 (77)** en ninguna pista; los violines por debajo de **B♭4 (70)**
    salvo las cumbres breves del motivo en el clímax I (C5–D♭5, 3 tiempos a 168, ≈ 1,07 s por vuelta); 2,5–6 kHz domado
    (criterio 17).
  - **Equilibrio del boceto:** el órgano lleno tapaba la percusión hasta bajarlo a unos −14 dB de ganancia de parte; la
    percusión (tambores de guerra, toms, timbales, caja) **empuja la pista**, y el coro y las trompas la lideran.
- **Repetición:** un combate de jefe final dura 4–10 minutos (3–7 vueltas de 80,5 s). **Un solo clímax** (c. 49, el
  regreso en do menor), un respiro claro (el trono, c. 23–26), silencios dramáticos que se entienden como intención y la
  costura sin señal (los tres golpes en hemiolia y la anacrusa de los tambores llevan al c. 1).
- **Transformaciones del leitmotiv** (§5): exposición (A); **registro grave** con *stop-time* en sus notas largas (A');
  **desplazamiento métrico** (el 3/4 del motivo contra el 4/4 a 126, c. 29–34); **fragmento de la cabeza en secuencia un
  semitono arriba** sobre la dominante de si♭ (puente); **transposición un semitono arriba en octavas** (clímax I);
  **transposición una tercera menor arriba** contra el 4/4 (clímax II).

## 2. Tempo, métrica, tonalidad, duración

| Parámetro | Valor |
|---|---|
| Tempo y métrica | **L** = 3/4 a ♩ = 168 (c. 1–22, 37–48, 57–58) · **T** = 4/4 a ♩ = 126 (c. 23–36, 49–56). Cambios de `set_tempo` y de compás en el MIDI en los c. 23, 37, 49 y 57 |
| Tonalidad | **la menor** con color frigio (♭2 = Si♭, la firma del dragón); clímax I en **si♭ menor**, clímax II en **do menor**; la cola del clímax vuelve por A♭ – B♭ (♭II de la) a la menor |
| Compases | **58** (36 L + 22 T) |
| Compás L | 3 × 60/168 = 1,0714 s = **47 250** muestras; negra 15 750; semicorchea 3 937,5 |
| Compás T | 4 × 60/126 = 1,9048 s = **84 000** muestras; negra 21 000; semicorchea 5 250 (= tresillo de corchea de 168) |
| Duración del bucle | 36 × 47 250 + 22 × 84 000 = **3 549 000** muestras = **80,476 s** a 44,1 kHz (224 negras de 168 + 2/3: múltiplo exacto de 5 250 muestras) |
| `MixSpec` | `bpm=168`, `beats_per_bar=1/3` (la unidad es la semicorchea de 126 = 5 250 muestras), `bars=676` |

Inicio de los compases (s): c. 1 = 0 · c. 5 = 4,286 · c. 13 = 12,857 · c. 21 = 21,429 · **c. 23 = 23,571** (T) ·
c. 27 = 31,190 · c. 29 = 35,000 · c. 35 = 46,429 · **c. 37 = 50,238** (L) · c. 41 = 54,524 · **c. 49 = 63,095** (T) ·
c. 55 = 74,524 · **c. 57 = 78,333** (L) · fin = 80,476.

**Figuras:** semicorcheas solo en las pistas de ritmo (`Spiccato`, `Violin Spiccato`, `Toms`, `War Drums`, `Snare`);
en todas las demás, nada más rápido que la corchea.

**Notación:** t1…t4 = tiempos; «2,5» = la corchea después del t3 en 3/4; semicorcheas del compás numeradas desde 0
(12 en L, 16 en T).

## 3. Forma compás a compás e intensidad

| Sección | Compases | Pulso | Tiempo (s) | Contenido | Intensidad |
|---|---|---|---|---|---|
| Intro «La máquina de guerra» | 1–4 | L | 0,00–4,29 | El motor arranca (La / Si♭ / La) bajo gritos del coro (A3 + E4 en cada t1); **c. 4: martillazo en La y parada en seco**; *swell* de plato en el silencio | 6 → 8 → 0 |
| A «Llamarada» | 5–12 | L | 4,29–12,86 | **El coro entero canta el motivo** (coro mixto en su altura, coro grande y trompas 8vb) sobre el motor | 8 |
| A' «Fauces» | 13–20 | L | 12,86–21,43 | El motivo **en el registro grave**: coro grande + trombones + trompas 8vb; el coro agudo calla. En sus notas largas (c. 16 y 20) el motor **se para tras el t1** y los gritos contestan en t2 y t3; la anacrusa de los tambores lo vuelve a arrancar | 8 (con huecos) |
| «Dos martillazos» | 21–22 | L | 21,43–23,57 | Martillazo en La (c. 21), martillazo en Si♭ (c. 22) y **silencio**: solo el coro en E4 y un redoble de timbal en Mi | 9 → 2 |
| «Trono de ceniza» | 23–26 | T | 23,57–31,19 | **El respiro**: órgano (Am – Am – Dm/F – E), pedal de 16′, coro grave en La (Sol♯ en el c. 26) y el **latido de timbal** en cada tiempo, *crescendo*; martillazo en el t4 del c. 26 | 3 → 6 |
| «Tambores del trono» | 27–34 | T | 31,19–46,43 | Groove de taiko **3+3+2** con golpes de metal (c. 27–28 solo el groove); desde el c. 29 **el motivo contra el 4/4** en coro, coro grande y trompas | 7 → 8 |
| «Golpes y gritos» | 35–36 | T | 46,43–50,24 | La ruptura: cinco martillazos (La, La, Si♭, Si♭, La) y **gritos del coro en los silencios** | 8 con huecos |
| Puente «La máquina despierta» | 37–40 | L | 50,24–54,52 | El motor vuelve a 168; la **cabeza del motivo** en trompas (trombones 8vb) en La y, un semitono arriba, sobre Fa (dominante de si♭); redoble de caja y de timbal, *swell* de plato | 7 → 9 |
| Clímax I «Llamarada en octavas» | 41–48 | L | 54,52–63,10 | **El motivo un semitono arriba** (si♭ menor) en octavas: coro + violines en su altura, coro grande + trompas 8vb; **órgano y gong**; el c. 48 cae en G7(♯9), dominante de do | 9 |
| Clímax II «Todo a la vez» | 49–56 | T | 63,10–76,19 | **El motivo una tercera menor arriba** (do menor) contra el 4/4 sobre el groove 3+3+2, con todo a la vez (órgano, pedal, gong, platos, violines en golpes, *spiccato* de violines, timbales). **Cumbre en el t1 del c. 49.** Cola (55–56): A♭ – B♭, el coro en acordes tenidos y gritos en los acentos | **10** (c. 49) → 9 |
| «Tres golpes» | 57–58 | L | 78,33–80,48 | Tres martillazos en La **en hemiolia** (t1, «2 y» del c. 57, t1 del c. 58) con gong; silencio; anacrusa de semicorcheas de los tambores hacia el c. 1 | 9 → 0 → costura |

Respiros: los t2–t3 del c. 4; el c. 22 tras el t1; los t2–t3 de los c. 16 y 20 (solo coro); el trono (23–26); los
silencios de la ruptura; el t2 del c. 58.

## 4. Armonía

Bajo real (la nota más grave en el t1) por compás. El motor alterna **fundamental y ♭2** compás a compás, como en el
boceto: es la firma del dragón y la de «los metales graves en la fundamental y su ♭2».

| Compases | Bajo (t1) | Acordes |
|---|---|---|
| 1–4 | A · B♭ · A · A | A5 (con el ♭2 en el *ostinato*) / B♭5 / A5 / **Am** (martillazo) |
| 5–12 | A B♭ A B♭ A B♭ A B♭ | A5 / B♭5 alternos; en el c. 10 el B♭ con el G♯ del motivo es una **sexta aumentada italiana** (B♭–D–G♯) que resuelve en La |
| 13–20 | A B♭ A **A** A B♭ A **A** | Como A, pero los c. 16 y 20 (notas largas del motivo) se quedan en La: *stop-time* sobre la tónica |
| 21–22 | A · B♭ | Am (martillazo) · B♭ (martillazo) → redoble en **Mi**: el tritono del dragón (B♭–E), como en el boceto |
| 23–26 | A · A · F · E | Am · Am · **Dm/F** · **E** (dominante; el coro baja a G♯) |
| 27–34 | A | Pedal de La: el groove con su ♭2 (Si♭ en las semicorcheas 6–7 y 14–15) |
| 35–36 | A · B♭ | Am / B♭ / Am (golpes) |
| 37–40 | A · B♭ · F · F | A5 / B♭5 / **F7(♭9)** sin tercera (Fa con Sol♭ en el *ostinato*): dominante de si♭ |
| 41–48 | B♭ B C♭… B♭ B B♭ B B♭ **G** | B♭m / C♭5 alternos (el órgano tiene B♭m en 41–44 y B♭sus2 en 45–48); c. 48 **G7(♯9)**: el *ostinato* en si♭ (B♭ F B♭ B) sobre Sol |
| 49–54 | C | Cm (49–51) · **A♭/C** (52–54), el órgano encima del pedal de do del groove |
| 55–56 | A♭ · B♭ | A♭ · B♭ (♭VII de do = **♭II de la**) |
| 57–58 | A · A | Am (cadencia frigia B♭ → Am con los tres golpes) |

## 5. Leitmotiv «Tesoro maldito»

Referencia (la menor, 24 tiempos en 3/4): `A4 2, G4 1 | F4 2, E4 1 | D4 1, E4 1, F4 1 | E4 3 | C5 2, B4 1 |
A4 1, G#4 1, F4 1 | E4 1,5, F4 0,5, D4 1 | A3 3`, en MIDI 69 67 65 64 62 64 65 64 72 71 69 68 65 64 65 62 57.
Cada nota con un legato de 10–30 ms (salvo la última de la frase).

| Compases | Pistas | Altura | Pulso | Transformación |
|---|---|---|---|---|
| **5–12** | **`Choir`** (en su altura) · `Choir Low` y `Horns` 8vb | 57–72 · 45–60 | 168 | Exposición: el coro entero sobre el motor. |
| 13–20 | **`Choir Low`** + `Low Brass` + `Horns`, los tres 8vb | 45–60 | 168 | **Registro grave**, con *stop-time* en sus notas largas (c. 16: E3; c. 20: A2): el motor calla tras el t1 y los gritos contestan. |
| **29–34** | **`Choir`** · `Choir Low` y `Horns` 8vb | 57–72 · 45–60 | 126 | **Contra el 4/4**: los 24 tiempos del motivo ocupan 6 compases de 4/4; sus compases empiezan en el t1, t4, t3, t2, t1… del 4/4. |
| 37–40 | **`Horns`** · `Low Brass` 8vb | A4 G4 · F4 E4 · **B♭4 A♭4 · G♭4 F4** (69 67 · 65 64 · 70 68 · 66 65) | 168 | **Fragmento** (los dos primeros compases) y su **secuencia un semitono arriba** sobre la dominante de si♭. |
| **41–48** | **`Choir`** + `Strings` (en su altura) · `Choir Low` y `Horns` 8vb | +1: 58–73 · 46–61 | 168 | **Un semitono arriba, en octavas** (si♭ menor). D♭5 (73) es la nota más alta de los violines: dos tiempos. |
| **49–54** | **`Choir`** · `Choir Low` y `Horns` 8vb | +3: 60–75 · 48–63 | 126 | **Una tercera menor arriba** (do menor), contra el 4/4. **E♭5 (75), c. 52, es la nota más alta de la melodía.** |

## 6. Orquestación por sección

### Patches

`…/` = `sso/Sonatina Symphonic Orchestra/`; `ID/` = `VCSL/Idiophones/Struck Idiophones/`; `MB/` =
`VCSL/Membranophones/Struck Membranophones/`. Los nombres de pista son los del boceto (`IGNIFAX_PARTS`) salvo `Forge`
(sustituye a `Anvil`) y `Organ Pedal` (nueva, solo trono y clímax II).

| Pista | Ruta `.sfz` | Dinámica | Registro (MIDI) | Límite por nota |
|---|---|---|---|---|
| `Choir` | `…/Chorus - Performance/Mixed Chorus.sfz` | **CC1** | 57–75 | — |
| `Choir Low` | `…/Chorus - Performance/Large Chorus.sfz` | **CC1** | 44–63 | — |
| `Shout` | `…/Chorus - Performance/Large Chorus.sfz` | **CC1** | 53–74 | **≤ 0,6 s** |
| `Horns` | `…/Brass - Performance/Horns Sustain.sfz` | **CC1** | 45–70 | **≤ 2,8 s** |
| `Low Brass` | `…/Brass - Performance/Trombones Marcato.sfz` | **CC1** | 40–60 | ≤ 1,6 s |
| `Tuba` | `…/Brass - Performance/Tuba Marcato.sfz` | **CC1** | 29–46 | ≤ 0,6 s |
| `Strings` | `…/Strings - Performance/1st Violins Marcato.sfz` | **CC1** | 55–73 | — |
| `Spiccato` | `VSCO-2-CE/CelloEnsSpic.sfz` | velocidad | 41–61 | — |
| `Violin Spiccato` | `VSCO-2-CE/ViolinEnsSpic.sfz` | velocidad | 55–70 | — |
| `Basses` | `VSCO-2-CE/ContrabassSpic.sfz` | velocidad | 29–47 | — |
| `Organ` | `…/Organ/Great - Open Diapason 8ft.sfz` (el `organ_full` del boceto) | velocidad | 40–63 | — |
| `Organ Pedal` | `…/Organ/Pedal - Bourdon 16ft.sfz` (suena 8vb) | velocidad | 40–48 | — |
| `War Drums` | `MB/Bass Drum 2.sfz`, nota **62** | velocidad | — | — |
| `Toms` | `MB/Tom 2.sfz`, **62** (parche, acentos) y **60** (aro) | velocidad | — | — |
| `Snare` | `MB/Snare Drum, Rope Tension.sfz`, nota **62** | velocidad | — | — |
| `Timpani` | `VSCO-2-CE/Timpani.sfz` | velocidad | 40–55 | — |
| `Timp Roll` | `VSCO-2-CE/TimpaniRolls.sfz` | velocidad | 43–55 | ≤ 3 s |
| `Forge` | `ID/Brake Drum.sfz`, nota **61** (martillo) | velocidad | — | — |
| `Clash` | `ID/Clash Cymbals 1.sfz`, nota **60** | velocidad | — | — |
| `Cymbal` | `ID/Suspended Cymbal 2.sfz`, **63** (*crescendo* 2,5 s, cumbre a 2,17 s) y **64** (*crescendo* de 4 s, el del boceto) | velocidad | — | ≤ 3 s |
| `Gong` | `ID/Gong 1.sfz`, nota **61** (golpe oscuro) | velocidad | — | — |

**Sonatina por CC1** (`Choir`, `Choir Low`, `Shout`, `Horns`, `Low Brass`, `Tuba`, `Strings`): curva de CC1 obligatoria
con un punto en el tick 0, como mucho un punto por corchea y la forma de cada frase. Fuera: `Anvil` (estridente),
trompetas, piccolo, glockenspiel, `Principal 4ft`, `Organ All Stops` y cualquier `KS`.

### Patrones (los del boceto)

**El motor** (`ignifax_frenzy`, compases L), por compás de fundamental *r* (alterna *r* / *r*+1 donde dice §4):
- `Spiccato`: 12 semicorcheas, *ostinato* `[r+12, r+19, r+24, r+25, r+19, r+24]` dos veces (A2 E3 A3 **B♭3** E3 A3 sobre
  La: el ♭2), acento (vel. 100) en la 1.ª de cada seis, el resto 84. El *ostinato* sigue la fundamental de la sección
  (La en 1–20 y 37–38, Fa en 39–40, Si♭ en 41–48), no la alternancia.
- `Violin Spiccato`: las semicorcheas pares, el *ostinato* 8va (A3 A4 E4 sobre La; máximo B♭4). No toca sobre Fa.
- `Toms`: 12 semicorcheas, **acento (62) cada tres** (0, 3, 6, 9: cuatro contra tres, contra el compás), el resto en el
  aro (60).
- `War Drums`: t1 y la **anacrusa de semicorcheas** en 2,5 y 2,75.
- `Forge`: t2. `Snare`: t3 y 2,5. `Timpani`, `Basses`, `Low Brass` (*r*+12) y `Tuba` (*r*): t1.

**El groove 3+3+2** (`groove`, compases T): 16 semicorcheas, **acentos en 0, 3, 6, 8, 11, 14**.
- `Toms`: 62 en los acentos, 60 en el resto. `War Drums`, `Low Brass` (*r*+12) y `Basses` (*r*): en los acentos.
- `Spiccato`: *r*+12 en las semicorcheas 0–5 y 8–13, **el ♭2 (*r*+13) en 6–7 y 14–15**.
- `Forge`: tiempos 1,5 y 3,5. `Snare`: tiempos 3 y 3,5. `Tuba`: t1 (un tiempo). `Timpani`: t1 y t3 (fundamental y quinta).
- Clímax II: además `Violin Spiccato` en las semicorcheas pares (el patrón del `Spiccato` 8va) y `Strings` en golpes
  cortos (t1 y t3) con el acorde por debajo de B♭4.

**El martillazo** (`hammer`): `Shout` con el acorde (A3 E4 A4 o B♭3 F4 B♭4), `Low Brass` 8vb, `Horns` en su altura,
`Tuba` dos octavas abajo de la nota grave, `War Drums`, `Timpani` y `Clash` (salvo en los golpes repetidos de la
ruptura y el 2.º de la coda).

**El latido** (c. 23–26): `Timpani` en **cada tiempo**, fundamental y quinta alternas (A2 E3 · A2 E3 · F2 C3 · E2 B2),
*crescendo* de vel. 72 a 104; el t4 del c. 26 es el timbal del martillazo.

### Intro (1–4) · A (5–12) · A' (13–20) · Dos martillazos (21–22)

| Rol | Pista | Contenido |
|---|---|---|
| Motor | motor completo | c. 1–3 (vel. del motor de 0,8 a 1,0 de la del boceto), 5–15, 17–19; c. 16 y 20 solo el t1 y la anacrusa de los tambores. En A' sin golpes de `Low Brass` (canta el motivo). |
| Gritos | `Shout` | A3 E4 en el t1 de los c. 1–3 (CC1 100 → 108); A3 E4 A4 en t2 y t3 de los c. 16 y 20 |
| Martillazos | `hammer` | c. 4 t1 (La), c. 21 t1 (La), c. 22 t1 (Si♭) |
| Melodía | §5 | A: `Choir` + `Choir Low` + `Horns`; A': `Choir Low` + `Low Brass` + `Horns` |
| Silencio del c. 22 | `Choir` E4 (64) desde el t2,5; `Timp Roll` E3 (52) desde el t2 | lo único que suena tras el martillazo |
| Metal | `Clash` en los c. 4, 5, 9, 21 y 22; `Cymbal` 64 tras el martillazo del c. 4 (t1,5) | |

### Trono (23–26) · Tambores del trono (27–34) · Golpes y gritos (35–36)

| Rol | Pista | Contenido |
|---|---|---|
| Órgano | `Organ` | Am (A2 E3 A3 C4) c. 23–24 · Dm/F (F2 D3 F3 A3) c. 25 · E (E2 B2 E3 G♯3) c. 26; vel. 84 |
| Pedal | `Organ Pedal` | A2 (45) c. 23–25 · E2 (40) c. 26; vel. 72 |
| Coro grave | `Choir Low` | A2 (45) c. 23–25 · G♯2 (44) c. 26; CC1 72 → 86 |
| Latido | `Timpani` | Cada tiempo (arriba) |
| Martillazo | `hammer` | t4 del c. 26: A3 E4 |
| Groove | patrón 3+3+2 en La (27–34) | Timbal A2 / E3 en t1 / t3 |
| Golpes de metal | `Horns` (c. 27–28) | A3 + E4 en los acentos 0, 3, 6 de cada mitad |
| Melodía | §5 (29–34) | `Choir` + `Choir Low` + `Horns` |
| Ruptura | `hammer` en 35: t1, t2,5 (La) · 36: t1, t2,5 (Si♭), t3,5 (La); `Shout` A3 en 35: t3,5 y t4 · 36: t4 | `Clash` en el 1.º y el 3.º |
| Metal | `Clash` en el c. 26 (martillazo) y 29; `Cymbal` 63 no | |

### Puente (37–40) · Clímax I (41–48)

| Rol | Pista | Contenido |
|---|---|---|
| Motor | motor | 37 La · 38 Si♭ · 39–40 Fa (sin alternancia, sin `Violin Spiccato`, sin golpes de `Low Brass`); intensidad 0,85 → 1,0 |
| Cabeza | `Horns` + `Low Brass` 8vb | §5 |
| Gritos | `Shout` | t1 de 37 (A3 E4), 38 (B♭3 F4), 39 y 40 (F3 C4) |
| Redobles | `Snare` (c. 40: 12 semicorcheas vel. 56 → 104, en lugar de la caja del motor) · `Timp Roll` F3 (53) en todo el c. 40 · `Cymbal` 63 desde el t1 del c. 39 (cumbre en el c. 41) | |
| Clímax I | motor en Si♭ (alterna B♭ / B; el c. 48 en Sol) + §5 en octavas | `Organ` (bajo los tambores, §8 criterio 19): B♭2 D♭3 F3 B♭3 (41–44) · B♭2 C3 F3 B♭3 (45–48); `Gong` en el c. 41; `Clash` en 37 y 45; `Cymbal` 63 desde el c. 47 (cumbre en el 49); `Timp Roll` G2 (43) en el c. 48 |

### Clímax II (49–56) · Tres golpes (57–58)

| Rol | Pista | Contenido |
|---|---|---|
| Groove | 3+3+2 en Do (49–54), A♭ (55), B♭ (56) | con `Violin Spiccato` y los golpes de `Strings` |
| Melodía | §5 (49–54) | `Choir` + `Choir Low` + `Horns` |
| Órgano | `Organ` | Cm (C3 E♭3 G3 C4) 49–51 · A♭/C (A♭2 E♭3 A♭3 C4) 52–55 · B♭ (B♭2 F3 B♭3 D4) 56 |
| Pedal | `Organ Pedal` | C3 (48) 49–54 · A♭2 (44) 55 · B♭2 (46) 56 |
| Cola | `Choir` E♭4 A♭4 C5 (55) · F4 B♭4 D5 (56, tres tiempos); `Choir Low` A♭3 / B♭3; `Shout` y `Horns` en los acentos 0, 3, 6 de cada mitad | |
| Cumbre | `Gong` + `Clash` en el t1 del c. 49 | `Clash` también en el 55 |
| Hacia la coda | `Timp Roll` B♭2 (46) en los t2–t4 del c. 56 | |
| Tres golpes | `hammer` en La: 57 t1, 57 t2,5, 58 t1 (el 2.º sin `Clash`); `Gong` en el 58; `War Drums` en semicorcheas en el t3 del c. 58 (anacrusa al c. 1) | |

## 7. Dinámica

| Nivel | pp | p | mp | mf | f | ff |
|---|---|---|---|---|---|---|
| Velocidad (VSCO, VCSL) | 25–40 | 40–55 | 55–70 | 70–85 | 85–100 | 100–120 |
| CC1 (Sonatina) | 40–55 | 55–70 | 70–85 | 85–95 | 95–105 | 105–112 |

Techos: velocidad **≤ 120** y CC1 **≤ 112**, que solo se alcanzan en el **c. 49**: `War Drums` (120), `Timpani` (118) y
`Gong` (116) tienen allí su velocidad máxima, y `Choir` y `Horns` su CC1 máximo (112); en el resto de la pista
`War Drums` ≤ 116, `Timpani` ≤ 114, `Gong` ≤ 108 y CC1 ≤ 110.

| Sección | Nivel | Gestos |
|---|---|---|
| Intro 1–4 | mf → f → silencio | El motor crece del 0,8 al 1,0; el martillazo del c. 4 y la parada. |
| A 5–12 | f | Un arco de CC1 en el coro (96 → 106 → 98). |
| A' 13–20 | f, con huecos | Arco de CC1 del coro grave (98 → 108); los gritos de los huecos a CC1 106. |
| Dos martillazos 21–22 | ff → p | El coro en E4 a CC1 90 y el redoble en *p* tras el golpe. |
| Trono 23–26 | p → mf | *Crescendo* del latido y del coro grave; el martillazo del t4 vuelve a ff. |
| Tambores 27–34 | f | El motivo con arco de CC1 98 → 106. |
| Ruptura 35–36 | ff | Golpes y gritos a CC1 110. |
| Puente 37–40 | f → ff | Redobles de caja y timbal en el c. 40. |
| Clímax I 41–48 | ff | Coro 102 → 110 → 104. |
| Clímax II 49–56 | **ff+ (c. 49)** → ff | Cumbre en el t1 del c. 49; desde ahí CC1 ≤ 110. |
| Tres golpes 57–58 | ff → silencio → f | |

## 8. Criterios de aceptación

**Partitura (`test_compose.py`, leyendo `build/acto3-ignifax.mid`):**

1. 58 compases: tempo 168 y compás 3/4 en los c. 1–22, 37–48 y 57–58; 126 y 4/4 en los c. 23–36 y 49–56 (cambios
   exactamente en los c. 23, 37, 49 y 57). El bucle dura **3 549 000 muestras** (compases L de 47 250 y T de 84 000); ninguna
   nota empieza antes del tick 0 ni termina después del final del bucle.
2. Todas las notas dentro del rango del catálogo de su patch y de los registros de §6; las percusiones, solo sus notas.
3. **Nada agudo:** ninguna nota por encima de **F5 (77)**; los violines (`Strings`, `Violin Spiccato`) suman como mucho
   **1,5 s** por encima de **B♭4 (70)** por vuelta y ninguna de esas notas pasa de 0,75 s.
4. El leitmotiv aparece con las alturas y los ataques exactos de §5 (tolerancia 12 ms) en sus seis lugares, con sus
   doblajes, y la última nota de cada frase dura lo que dice §5.
5. Figuras: intervalos entre ataques de semicorchea solo en `Spiccato`, `Violin Spiccato`, `Toms`, `War Drums` y `Snare`;
   en las demás pistas, nada más rápido que la corchea de su compás.
6. Capas simultáneas por sección ≤ intro 9 · A 13 · A' 10 · martillazos 7 · trono 10 · tambores 11 · ruptura 7 ·
   puente 12 · clímax I 15 · clímax II 17 · coda 8 (el clímax II, el más denso); en el trono, **solo `Organ`, `Organ Pedal`, `Choir Low` y `Timpani`**
   hasta el martillazo del t4 del c. 26.
7. **Sin roces con la melodía:** mientras suena una nota del motivo de la voz principal de §5 (`Choir` en A, tambores y
   clímax; `Choir Low` en A'; `Horns` en el puente), ninguna pista que no sea un doblaje declarado mantiene una nota de un
   tiempo o más a 1 o 2 semitonos de ella.
8. Techos de §7; el c. 49 tiene la velocidad máxima de `War Drums`, `Timpani` y `Gong` y el CC1 máximo de `Choir` y
   `Horns`, por encima de cualquier otro compás.
9. Cada pista de Sonatina tiene CC1 en el tick 0, una curva que se mueve y como mucho un punto por corchea. Duraciones:
   `Horns` ≤ 2,8 s, `Shout` ≤ 0,6 s, `Tuba` ≤ 0,6 s, `Low Brass` ≤ 1,6 s, `Timp Roll` ≤ 3 s, `Cymbal` ≤ 3 s.
10. **El motor** en cada compás que lo tiene: 12 semicorcheas de `Spiccato` con el *ostinato* del ♭2, `Toms` con el acento
    cada tres semicorcheas, `War Drums` en t1, 2,5 y 2,75; en los c. 16 y 20 solo el t1 y la anacrusa.
11. **El groove 3+3+2** en los c. 27–34 y 49–56: `War Drums` y los `Toms` en 62 exactamente en las semicorcheas 0, 3, 6, 8,
    11, 14; el ♭2 del `Spiccato` en las semicorcheas 6–7 y 14–15.
12. **Los golpes y los silencios:** el latido (un golpe de timbal por tiempo en los c. 23–26); los martillazos de §6
    (c. 4, 21, 22, 26, 35–36, 57–58) con el acorde del `Shout` en sus tiempos, los tres de la coda en hemiolia (cada 1,5
    tiempos); los gritos de la ruptura en sus silencios; tras el t1 de los c. 4 y 22 solo suenan las colas, el `Cymbal`, y
    en el c. 22 el `Choir` y el `Timp Roll`.
13. Recuento por bucle: `Gong` 3 (c. 41, 49, 58), `Clash` 15 (c. 4, 5, 9, 21, 22, 26, 29, 35, 36, 37, 45, 49, 55, 57, 58),
    `Cymbal` 3 (c. 4, 39, 47); `Forge` solo con la nota 61 y ninguna pista con `Anvil`, trompetas, glockenspiel, piccolo,
    `Principal 4ft` ni `All Stops`.
14. **Armonía:** la nota más grave que empieza en el t1 de cada compás tiene la clase de altura del bajo de §4.
15. Oficio: humanización (ataques fuera de la rejilla hasta ±8 ms, velocidades variadas), determinista (dos ejecuciones dan
    el mismo MIDI), la anacrusa del c. 58 lleva al motor del c. 1.

**Mezcla (informe de `mix.py`, medido sobre el MP3 decodificado):**

16. Sonoridad integrada **−16,5 ± 0,5 LUFS**; pico real **≤ −1 dBTP**; `loop_samples` = **3 549 000** (y el MP3
    decodificado tiene esas muestras); `seam_jump` < 0,02.
17. Bandas (`bands_db`): `presencia 2.5-6k` ≤ **−20 dB**, `aire 6-16k` ≤ **−30 dB** (el boceto: −22,5 y −25,3),
    `sub <60` ≤ **−17 dB**.
18. Contrastes (`sections_lufs`): clímax II c. 49–54 frente al trono c. 23–26 entre **+5 y +12 LU**; clímax II frente a A
    entre **+1 y +4 LU**; **una sola cumbre**: el clímax II al menos 0,5 LU por encima del clímax I y no por debajo de su
    cola (c. 55–56); el silencio del c. 22 (desde el t2,5) al menos 8 LU por debajo de A.
19. **La percusión empuja y el yunque ya no pita** (cada parte sola tras la EQ de su bus, LUFS con puerta en A, c. 5–12,
    respecto al `Choir`): `War Drums` ≥ −6 LU, `Toms` ≥ −9 LU, `Timpani` ≥ −9 LU, `Snare` ≥ −12 LU, y el `Choir` por encima
    de todos; `Forge` frente a `War Drums` al menos **10 LU más abajo** que el `Anvil` frente a `War Drums` en el boceto
    `ignifax-1-llamarada`, y su energía en 2,5–16 kHz al menos 10 dB por debajo de la del yunque del boceto. **El órgano no
    tapa los tambores:** en los clímax (c. 41–56), órgano frente a `War Drums` no más alto que en el clímax del boceto
    (con su órgano a −14 dB, el equilibrio que aprobó el usuario).
20. Ninguna parte suelta pasa de −6 dB de pico antes del bus; sala `wet_dry_lu` entre −8 y −4.
21. Escucha: el motor se oye como una máquina (no como ruido) y la parada del c. 4 es seca; el coro lidera A; los huecos de
    A' y de la ruptura se entienden como intención; el trono suena a dios oscuro y respira; el cambio a 126 y de vuelta a
    168 no tropieza; el c. 49 es la cumbre; el golpe de metal es grave y discreto, nada pita; los efectos del juego siguen
    claros.

### `MixSpec`

```python
MixSpec(
    midi='scripts/musica/acto3-ignifax/build/acto3-ignifax.mid',
    out='scripts/musica/acto3-ignifax/build/acto3-ignifax.mp3',
    bpm=168, beats_per_bar=1/3, bars=676,   # unidad = 5 250 muestras; 676 × 5 250 = 3 549 000
    target_lufs=-16.5, ceiling_dbtp=-1.0,
    reverb={'seconds': 2.4, 'predelay': 0.02, 'damping': 0.55},   # la caverna del dragón (boceto: 2,4)
    ...)
```

`sections` y las automatizaciones se calculan en `mix.py` con el mapa de tiempos de la partitura (los compases mezclan
L y T). Paradas en seco (c. 4, 22 y 58): un *ride* de −15 dB corta la cola del `Shout`, los metales y el `Clash` justo
después del golpe (el coro de Sonatina suelta en 1,25 s y el plato en 30 s: sin cortar, el «silencio» sonaba casi tan
fuerte como A). Buses de partida: los del boceto (`acto3_jefes.py` → `BUS`): coro con −2 dB en 300 Hz y −3 dB en 3 kHz; metales
con compresión suave; tambores con el boom de 46 Hz recortado; más un bus **`forja`** oscuro para el `Forge` (paso alto
150 Hz, estantería −9 dB desde 2 kHz) y un bus **`platos`** con estantería −6 dB desde 5 kHz. `Organ`: −14 dB (la del
boceto) en el trono y −20 dB (+1 en el clímax II) bajo los clímax, para que frente a los tambores quede como en el
boceto.

**Integración:** copiar a `src/audio/cap3-e0-jefe.mp3` y añadir a `MUSIC_TRACKS` (`src/fx/music-tracks.ts`):
`'cap3-e0-jefe': { file: 'cap3-e0-jefe.mp3', loopSamples: 3549000 }`.
