# Brief: Acto III, jefe del escenario 1, El Contemplador — «Mirada del abismo / Caos cromático»

Combate de jefe del Laberinto. Id de juego: `cap3-e1-jefe` (una sola pista en bucle, sin pareja mapa/combate). Pista
nueva en `scripts/musica/acto3-contemplador/` con las convenciones del [README del estudio](../../scripts/musica/estudio/README.md):
`test_compose.py` (criterios 1–16 de §8, escrito **antes** que `compose.py`), `compose.py` → `build/acto3-contemplador.mid`,
`mix.py` → `build/acto3-contemplador.mp3` y `build/acto3-contemplador.report.json`. Necesita montado el disco **Base**
(`electric-guitar-FSBS-dist1`, `electric-bass-YR`, `virtuosity_drums`, Sonatina y los sintetizadores `dracs-synths`).

Fuentes: [direccion.md](direccion.md) (jefes: «temática mucho más oscura y ritmo frenético de batalla épica»; Acto III,
Laberinto) y los **dos** bocetos de `scripts/musica/leitmotivs/acto3_jefes.py`, que el usuario aprobó enteros
(«impleméntalos completos»):

- `contemplador_abismo()` «Mirada del abismo» (♩ = 140, 4/4): `build/acto3-jefe-contemplador-1-mirada-del-abismo.mp3`.
- `contemplador_caos()` «Caos cromático» (♩ = 150, 7/8 → 4/4 a medio tiempo → 5/4):
  `build/acto3-jefe-contemplador-2-caos-cromatico.mp3`.

Se funden en **una sola pista a ♩ = 140** (el material de «Caos» se toca a 140). Escenario del que viene:
[acto3-laberinto.md](acto3-laberinto.md) (re, ♩ = 70, guitarras, bajo y batería con las mismas convenciones).

## 1. Función, emoción y repetición

- **Dónde suena:** solo en el combate contra El Contemplador, el ojo que mira desde fuera del mundo.
- **Emoción:** caos y frenesí. Metalcore moderno a lo Architects y Bad Omens: riffs *drop* con agujeros, *breakdowns* con
  *sub drops*, un sintetizador **encima** de la batería y el bajo (supersierra, arpegios de *pluck*, *glitches*,
  *risers*) y una voz rota de *vocal fry* (`Growl`) que escupe los acentos. No es fantasía: es un ojo que te mira.
- **Lo que pidió el usuario y cómo se cumple:**
  - **Todas las ideas de los dos bocetos** (§3): el *pluck* en arpegio con el *swell* invertido; el riff *djent* con
    agujeros y gruñidos en los acentos; el estribillo melódico Si–Sol–Re–Do con el motivo en la supersierra y en el coro;
    la parada en seco con solo la voz rota y un *glitch*; el *breakdown* a medio tiempo en el que cada golpe suelta un
    *sub*; el colchón de supersierra bombeado por *sidechain* en 7/8; la tormenta de *glitches* en 5/4 y el *riser* que
    aterriza en el primer tiempo del bucle; el *blast* y la caída de toms.
  - **Más caos y frenesí:** la forma cambia de métrica tres veces (4/4 → 7/8 → 4/4 → 5/4) y nunca hay dos secciones
    iguales seguidas.
  - **Sintetizadores audibles:** en el boceto quedaban enterrados bajo las guitarras hasta subirlos. Punto de partida de
    la mezcla (dB de parte): guitarras −7/−8, `Saw Lead` 0, `Saw Pad` −5, `Pluck` +5, `Growl` −2, `Sub` −2.
  - **Nada agudo que pite:** nada tenido por encima de F5 (77) en toda la pista (la nota más alta tenida es D5, 74); la
    banda de 2,5–6 kHz domada en los buses.
- **Repetición:** 3–6 minutos por combate (3–4 vueltas de 80,6 s). Un solo clímax (c. 39), dos respiros (la parada del
  c. 17 y la intro) y la costura sin señal: el *riser* de la tormenta aterriza en el impacto del c. 1.
- **Transformación del leitmotiv** «Fractura» en si (§5): **cabeza en aumentación ×4** (intro); **fragmento con huecos**
  (verso II); **exposición** (estribillo); **aumentación ×2** de la primera mitad (*breakdown*); **aumentación irregular**,
  una nota por compás de 7/8 (Caos); **el coro grita** el motivo (medio tiempo); **exposición a la octava** (clímax) y
  **retrogradación** que termina en Do → Si sobre el acorde de tónica (cumbre del clímax). El riff de la tormenta es la
  cabeza otra vez: tres tiempos en Si, dos en Do.

## 2. Tempo, métrica, tonalidad, duración

| Parámetro | Valor |
|---|---|
| Tempo | ♩ = 140, fijo (el de «Mirada del abismo»; «Caos» baja de 150 a 140) |
| Métrica | c. 1–21 **4/4** · c. 22–29 **7/8** (2+2+3) · c. 30–43 **4/4** · c. 44–47 **5/4** (3+2) |
| Tonalidad | **si** (frigio/eólico: el ♭2 = Do es el color); estribillo Bm–G–D–C; clímax el mismo camino y luego **al revés** (C–D–G–Bm) |
| Compases | **47** = 188 negras |
| Duración del bucle | 188 × 60/140 = **80,571 s** → `loop_samples` = 188 × 18 900 = **3 553 200** a 44,1 kHz (cada negra son 18 900 muestras exactas) |
| `MixSpec` | `bpm=140`, `beats_per_bar=1`, `bars=188` (la unidad del bucle es la **negra**: con tres métricas, `sections` y `automation` se escriben en negras) |

Negra = 0,4286 s; corchea = 0,2143 s; semicorchea = 0,1071 s.

| Compás | Negra de inicio (desde 0) | Tiempo (s) |
|---|---|---|
| *n* ≤ 21 | 4 (*n* − 1) | |
| 22 | 84 | 36,00 |
| 22 + *i* (7/8) | 84 + 3,5 *i* | |
| 30 | 112 | 48,00 |
| 30 + *j* | 112 + 4 *j* | |
| 44 | 168 | 72,00 |
| 44 + *k* (5/4) | 168 + 5 *k* | |
| fin | 188 | 80,57 |

**Figuras:** guitarras, bajo y batería en la rejilla de semicorchea (los toms de la caída en tresillos de corchea).
Arpegios del *pluck* en semicorcheas (4/4) y corcheas (7/8). Los *glitches* repiten una nota 4, 6, 8 o 12 veces por
negra. Las melodías de §5 en blancas o más largas.

## 3. Forma compás a compás e intensidad

Intensidad de 1 a 10.

| Sección | Compases | Tiempo (s) | Contenido | Int. |
|---|---|---|---|---|
| Intro «El párpado» | 1–4 | 0,00–6,86 | **Aterrizaje**: impacto, *sub drop*, *crash* y un golpe de quinta en el t1 del c. 1 (adonde llega el *riser*); después el arpegio del *pluck* abre su filtro sobre el colchón Si–Fa♯–Do; la voz rota en Si; en los c. 3–4 entra el pulso a medio tiempo, el *sub* y la **cabeza en aumentación** en la supersierra; *glitch* en el t4 del c. 4 y *swell* invertido hacia el c. 5 | 3 → 5 |
| Verso «La mirada» | 5–8 | 6,86–13,71 | El riff *djent* del boceto, con agujeros; el ♭2 (Do) contesta en el último tiempo de los c. 6 y 8; gruñidos en los acentos; el *pluck* debajo | 7 |
| Verso II «La mirada se fija» | 9–12 | 13,71–20,57 | El riff con otros agujeros; la supersierra dice el motivo **a trozos** (c. 9 y 11) y el *glitch* contesta en los huecos (c. 10 y 12); el *pluck* pasa a la célula de siete sobre el 4/4; redoble de caja hacia el estribillo | 7 → 8 |
| Estribillo «El abismo» | 13–16 | 20,57–27,43 | El del boceto: Bm–G–D–C abiertos en corcheas, doble bombo, el motivo en la supersierra y en el coro grave; acordes en el coro y en el colchón | 8 |
| Parada «El silencio» | 17 | 27,43–29,14 | **Un golpe y silencio**: impacto, *sub drop*, la voz rota sola (La♯) y un *glitch*; el *swell* invertido entra en el *breakdown* | 3 |
| *Breakdown* «La caída» | 18–21 | 29,14–36,00 | Medio tiempo con agujeros; **cada acento suelta un *sub***; gruñidos; cúmulo Si+Do en el colchón; el coro grave canta el motivo en redondas | 9 |
| Caos «Caos cromático» | 22–29 | 36,00–48,00 | **7/8 (2+2+3)**: el colchón de supersierra **bombea** con cada grupo; el *pluck* corre en sietes; la voz escupe el primer tiempo; la supersierra da una nota del motivo por compás; el c. 29 es una parada con impacto y *glitch* | 8 |
| Medio tiempo «La pupila» | 30–33 | 48,00–54,86 | 4/4 a medio tiempo, *sub drop* en cada compás, el coro **grita** el motivo, colchón y coro grave en el cúmulo Si+Do | 9 |
| Clímax «El ojo abierto» | 34–41 | 54,86–68,57 | El estribillo con el motivo **a la octava** (34–37) y después **al revés** sobre el camino al revés C–D–G–Bm (38–41), que acaba en Do → Si; **cumbre en el t1 del c. 39** (63,43 s, el Re5 del retrógrado, impacto y *crash*) | 9 → **10** → 9 |
| *Blast* «Los golpes» | 42–43 | 68,57–72,00 | El *blast* del boceto (Si → Do → Fa); en los t3–4 del c. 43, la **caída de toms** en tresillos sobre corcheas de Fa | 9 |
| Tormenta «Tormenta» | 44–47 | 72,00–80,57 | **5/4 (3+2)**: semicorcheas Si (3 tiempos) – Do (2 tiempos), *sub* y colchón suben por semitonos (Si, Do, Do♯, Re), la caja crece hasta las semicorcheas, la **tormenta de *glitches*** acelera (4 → 6 → 8 por negra) y el ***riser* aterriza en el t1 del c. 1** | 7 → 9 |

Respiros: la parada del c. 17 (t2–t4), los c. 1–2 de la intro y el hueco de la segunda mitad del c. 19.

## 4. Armonía

Bajo (clase de altura) en el t1 de cada compás; es la nota más grave que suena ahí (salvo el FX, sin altura).

| Compases | Bajo | Acorde (colchón `Saw Pad`) |
|---|---|---|
| 1–12 | Si | B5 con ♭9: B2 F♯3 C4 (47 54 60) |
| 13 · 14 · 15 · 16 | Si · Sol · Re · Do | Bm B2 D3 F♯3 · G G2 B2 D3 · D D3 F♯3 A3 · C C3 E3 G3 |
| 17 | Si | (golpe) |
| 18–20 · 21 | Si · Do | cúmulo B2 C3 (47 48) |
| 22–29 | Si (en c. 25 el grupo largo en Do) | B2 F♯3 C4, bombeado |
| 30–33 | Si | cúmulo B2 C3 |
| 34 · 35 · 36 · 37 | Si · Sol · Re · Do | como 13–16 |
| 38 · 39 · 40 · 41 | Do · Re · Sol · Si | C · D · G · Bm (el camino al revés) |
| 42 · 43 | Si · Do (Fa en t3–4) | — |
| 44 · 45 · 46 · 47 | Si | B2 F♯3 · C3 G3 · C♯3 G♯3 · D3 A3 (sube por semitonos con el `Sub`: B1 C2 C♯2 D2) |

Bajo real (`Bass`, púa): la fundamental de la guitarra una octava abajo si cabe (≥ D1, 26); Si y Do suenan en B1 (35) y
C2 (36), Sol en G1 (31), Re en D1 (26), Fa en F1 (29). `Sub`: B1 35, G1 31, D2 38, C2 36 (dentro de 31–38).

## 5. Leitmotiv

«Fractura» una tercera menor abajo, en si (`FRACTURA_B` del boceto), blancas, dos por compás:

```
| B4  C5 | F#4 F4 | B4  D5 | C#5 G4 |
| h   h  | h   h  | h   h  | h   h  |
  71  72   66  65   71  74   73  67
```

| Compases | Pista | Notas (MIDI) y ritmo | Transformación |
|---|---|---|---|
| 3–4 | `Saw Lead` | B3 (w) · C4 (w) (59 · 60) | **Cabeza en aumentación ×4**: el semitono que abre el ojo. |
| 9–12 | `Saw Lead` | c. 9: B3 C4 (h h) · c. 10: silencio · c. 11: F♯3 F3 (h h) · c. 12: silencio (59 60 · 54 53) | **Fragmento con huecos**: la mitad del motivo cortada como el riff. |
| **13–16** | **`Saw Lead`** + `Choir Low` al unísono | 59 60 · 54 53 · 59 62 · 61 55 (h) | **Exposición** (la del boceto, una octava abajo). |
| 18–21 | `Choir Low` | B3 · C4 · F♯3 · F3 (w) (59 · 60 · 54 · 53) | **Aumentación ×2** de la primera mitad (boceto). |
| 22–29 | `Saw Lead` | una nota por compás de 7/8 (3,5 negras): 59 60 54 53 59 62 61 55 | **Aumentación irregular** sobre la métrica impar (boceto). |
| 30–33 | `Choir` | 59 60 · 54 53 · 59 62 · 61 55 (h) | **El coro grita** el motivo (boceto). |
| **34–37** | **`Saw Lead`** + `Choir Low` 8vb | 71 72 · 66 65 · 71 74 · 73 67 (h) | **Exposición a la octava**: el motivo a su altura en si. |
| **38–41** | **`Saw Lead`** + `Choir Low` 8vb | 67 73 · **74** 71 · 65 66 · 72 71 (h) | **Retrogradación** sobre el camino al revés: acaba en Do5 → Si4 sobre Bm. **El Re5 del t1 del c. 39 es la cumbre.** |
| 44–47 | `Guitar`, `Guitar 2` | Si (12 semicorcheas) – Do (8) en cada compás de 5/4 | La **cabeza** hecha riff. |

Doblajes declarados: `Choir Low` al unísono (13–16) y 8vb (34–41) de la supersierra.

## 6. Orquestación

### Patches

`SYN` = `dracs-synths/` (generados por `scripts/musica/estudio/synths.py`); `SSO` = `sso/Sonatina Symphonic Orchestra/`.

| Pista | Ruta `.sfz` | Dinámica | Registro |
|---|---|---|---|
| `Guitar` / `Guitar 2` | `electric-guitar-FSBS-dist1/EGuitarFSBS-dist1 bridge 20220911.sfz` | velocidad (≤ 92 capa suave, ≥ 93 golpe) | 35–55 |
| `Bass` | `electric-bass-YR/PickedBassYR 20190930.sfz` | velocidad | 26–36 |
| `Drums` | `virtuosity_drums/Programs/01-basic-kit.sfz` (36 bombo, 38 caja, 49 *crash*, 51 *ride*, 57 *crash* 2, toms 50 48 47 45 43 41) | velocidad | — |
| `Sub` | `SYN sub-bass.sfz` | velocidad | 31–38 |
| `Drop` | `SYN sub-drop.sfz` | velocidad | 35–38 (en la fundamental: B1, C2, D2) |
| `Saw Lead` | `SYN supersaw-lead.sfz` | velocidad + **CC1 abre el filtro** (se lee al empezar cada nota) | 53–74 |
| `Saw Pad` | `SYN supersaw-pad.sfz` | velocidad + CC1 (filtro) | 43–60 |
| `Pluck` | `SYN pluck-sweep.sfz` (**nuevo**: las muestras de `pluck` tras un paso bajo que abre el CC1) | velocidad + CC1 (filtro) | 59–71 |
| `Glitch` | `SYN supersaw-lead.sfz` | velocidad + CC1 (filtro que se abre durante el tartamudeo) | 59–71 |
| `Growl` | `SYN growl.sfz` | velocidad | 46–47 |
| `Choir` | `SSO Chorus - Performance/Mixed Chorus.sfz` | **CC1** | 53–69 |
| `Choir Low` | `SSO Chorus - Performance/Large Chorus.sfz` | **CC1** | 47–62 |
| `FX` | `SYN fx.sfz` (60 *riser* 4 s, 61 *downlifter*, 62 impacto, 63 *swell* invertido 2 s) | velocidad | 60–63 |

**Por qué un `pluck-sweep`:** en el boceto la curva de CC1 del *pluck* (20 → 110) no abría ningún filtro (el `pluck`
no tiene) y el estudio la aplicaba como volumen. La versión definitiva hace lo que el boceto quería: el arpegio se
abre de oscuro (≈ 1,2 kHz) a brillante (≈ 4 kHz), sin pitar.

**CC1:** obligatorio en el tick 0 en `Choir`, `Choir Low`, `Saw Lead`, `Saw Pad`, `Pluck` y `Glitch`; como mucho un punto
por corchea. Nunca en `Growl`, `Sub`, `Drop` ni `FX` (el estudio lo tomaría como volumen).

### Bloques del boceto que se conservan

- **Golpe (`chug`)**: fundamental (+ quinta y octava si es acento) en `Guitar`, la fundamental una octava abajo en `Bass`;
  `Guitar 2` dobla nota a nota (convención del Laberinto: quintas solo en los acentos, en las dos).
- **Riff con agujeros**: cadenas de 16 semicorcheas, `x` acento (quinta), `o` golpe suelto, `.` silencio; bombo con cada
  golpe (acento 114, suelto 98).
- **Tartamudeo (`stutter`)**: la misma nota repetida *rate* veces por negra (notas de 0,6 de su paso) mientras el CC1
  abre el filtro.

### Por sección

| Sección | Pistas y papel |
|---|---|
| Intro 1–4 | t1 del c. 1: `FX` 62, `Drop` B1, `Drums` *crash* + bombo, golpe de quinta en Si (0,6 negras) · `Pluck` arpegio B3 F♯4 C4 B4 D4 F♯4 C4 F4 en semicorcheas (vel. 70/90 en cada negra), CC1 20 → 100 en los cuatro compases · `Saw Pad` B2 F♯3 C4 (c. 1 y c. 3) · `Growl` B2 desde el t3 del c. 1 (6 negras) · c. 3–4: `Sub` B1, bombo en t1 y «2 y», caja en t3, `Saw Lead` cabeza (CC1 50) · `Glitch` B4 en el t4 del c. 4 (8 por negra) · `FX` 63 terminando en el t1 del c. 5 |
| Verso 5–8 | Patrones del boceto `x.oxo.x..xo.x.o.` · `x.ox..xo.x.xo.x.` · `x.oxo.x..xo.x.o.` · `x..x..x.x..xxoxo` (c. 6 y 8: el último tiempo en Do) · caja en t2 y t4, *crash* 2 en t1 y *ride* en t2–4 · `Sub` B1 · `Drop` en los c. 5 y 7 · `Growl` B2 en los acentos de las semicorcheas 0, 6 y 12 · `Pluck` arpegio (vel. 56) |
| Verso II 9–12 | Patrones `x.ox.ox..x.ox.o.` · `x.ox..xo.x.xo.x.` (último tiempo en Do) · `x.oxo.x..xo.xo.o` · `x..x..x.x.x.xxxx` (último tiempo en Do) · gruñidos como en el verso · `Pluck` la célula de siete (B3 C4 F♯4 F4 D4 C4 B4) en semicorcheas sobre el 4/4 · `Saw Lead` el fragmento · `Glitch` en el t4 de los c. 10 y 12 · c. 12: caja en las semicorcheas del t4 |
| Estribillo 13–16 | Quintas en corcheas en las dos guitarras (110/96 y 104/90), bajo en corcheas · doble bombo en las 16 · caja en t2 y t4 · *crash* en t1, *crash* 2 en t2–4 · `Saw Pad` el acorde · `Choir` el acorde una octava arriba · `Sub` la fundamental · `Drop` en el c. 13 · `Saw Lead` + `Choir Low` el motivo (CC1 60 → 96) |
| Parada 17 | t1: golpe de quinta (vel. 124), *crash*, `FX` 62, `Drop` B1 · `Growl` A♯2 desde el t2 (2,5 negras) · `Glitch` B3 en el t4 (12 por negra, CC1 20 → 100) · `FX` 63 terminando en el t1 del c. 18. Después del t1, **ni guitarras, ni bajo, ni batería** |
| *Breakdown* 18–21 | `x..x..x.....x.x.` · `x..x..x.........` · `x..x..x...x.x.x.` · `x.x.x...x.x.x.xx` (el último en Do), golpes de 0,3 negras a vel. 120–124 · caja solo en t3 · *crash* 2 en cada negra · **`Drop` en cada acento** (`x`, en la fundamental: B1, y C2 en el c. 21) · `Growl` B2 en t1 y «2 y» · `Saw Pad` B2 + C3 · `Choir Low` el motivo (CC1 96 → 108) |
| Caos 22–29 | Grupos 2+2+3 (negras 0, 1 y 2 del compás): quinta (118) + golpe suelto una corchea después (92), bombo con los dos; el grupo largo acaba con un golpe al tritono (F2) — en el c. 27 al ♭2 (C2) y en el c. 28 con un golpe más en la semicorchea 1 · c. 25: el grupo largo (el tercero) en Do · caja en la negra 1 y en la 2,5 · `Growl` B2 en el t1 · `Pluck` los sietes en corcheas, *crash* 2 en la primera, *ride* en las demás · `Saw Pad` B2 F♯3 C4 cada compás, **bombeado** (−16 dB en cada grupo y vuelta a 0 en 0,45 negras) · `Saw Lead` una nota por compás (CC1 60 → 100) · `Sub` B1 · c. 29: solo el primer grupo, *crash*, `FX` 62 y `Glitch` F4 (6 por negra) desde la negra 1,5 |
| Medio tiempo 30–33 | `x..x..x.....x.x.` · `x..x..x.........` · `x.x..x..x.x..x..` · `x..x..x...x.xxxx` (vel. 124, 0,3 negras) · caja en t3 · *crash* 2 en cada negra · `Drop` en el t1 · `Growl` B2 en t1 (1,2 negras) · `Choir` el motivo (CC1 100 → 106) · `Saw Pad` y `Choir Low` en B2 + C3 |
| Clímax 34–41 | Como el estribillo, con el motivo a la octava (34–37) y el retrógrado (38–41) en `Saw Lead` (CC1 80 → **112 en el c. 39** → 96) y `Choir Low` 8vb (CC1 96 → **110 en el c. 39** → 100) · `Drop` en los c. 34 (B1) y 38 (C2) · c. 39 t1: *crash*, *crash* 2, `FX` 62 y `Drop` D2 · c. 41: redoble de caja en el t4 |
| *Blast* 42–43 | Semicorcheas de quinta (112) dobladas en `Guitar 2`, con bombo y caja en todas, *crash* 2 en las corcheas: c. 42 en Si, t1–2 del c. 43 en Do · t3–4 del c. 43: corcheas de Fa y **caída de toms** 50 48 47 45 43 41 en tresillos de corchea · `Glitch` B3 (4 por negra) durante el c. 42 |
| Tormenta 44–47 | 20 semicorcheas por compás: Si en las 12 primeras, Do en las 8 últimas; quinta en cada negra (c. 44–45), en cada corchea (c. 46) y en todas (c. 47) · bombo en todas · caja en t2 y t4 (c. 44–45), en las corcheas (c. 46) y en las semicorcheas *crescendo* (c. 47) · `Growl` en las semicorcheas 0 y 12 · `Sub` B1 C2 C♯2 D2 · `Saw Pad` quinta que sube por semitonos · `Glitch` B4 de 4 (c. 44–45) a 6 (c. 46) y 8 (c. 47) por negra, CC1 10 → 120 · `Choir Low` B2 + C3 (CC1 80 → 104) · `FX` 60 (*riser* de 4 s) **terminando exactamente en el final del bucle** |

### Notas sobre los samples

- La guitarra no baja de B1 (35): la fundamental es B1 y el Si del bajo suena en B1 (no cabe B0).
- Las muestras del `Pluck` y del `Saw Lead` están filtradas a ≤ 5–7 kHz; aun así, la supersierra con el CC1 abierto es
  lo más brillante de la pista: el bus `synth` lleva un recorte en 3,5 kHz.
- `FX` 60 dura 4,0 s (9,333 negras) y 63 dura 2,0 s (4,667 negras): se colocan para **terminar** en el compás que preparan.
- No usar ningún `KS`.

## 7. Dinámica

| Nivel | p | mf | f | ff |
|---|---|---|---|---|
| Velocidad | 40–70 | 70–95 | 95–112 | 112–124 |
| CC1 (Sonatina) | 60–85 | 85–96 | 96–104 | 104–110 |

Techos: velocidad ≤ 124; CC1 de los coros ≤ 110; CC1 de los filtros ≤ 120. Clímax: el CC1 más alto de `Saw Lead` y de
`Choir Low` está en el c. 39.

## 8. Criterios de aceptación

**Partitura (`test_compose.py`, leyendo `build/acto3-contemplador.mid`):**

1. ♩ = 140 sin cambios de tempo; métricas 4/4 (c. 1) · 7/8 (c. 22) · 4/4 (c. 30) · 5/4 (c. 44) en sus ticks; 188 negras;
   ninguna nota empieza antes del tick 0 ni termina después de 80,571 s.
2. Las 14 pistas de §6 con sus patches; todas las notas dentro del rango del catálogo y de los registros de §6.
3. **Nada agudo tenido:** ninguna nota de negra o más por encima de F5 (77).
4. El leitmotiv con las alturas y ataques exactos de §5 en cada sección, con sus doblajes.
5. Velocidad ≤ 124, CC1 de coros ≤ 110 y de filtros ≤ 120; clímax en el c. 39 (CC1 máximo de `Saw Lead` y `Choir Low`;
   *crash* e impacto en su t1).
6. CC1 en el tick 0 donde §6 lo exige y en ninguna otra pista; como mucho un punto por corchea.
7. **Riffs:** los patrones de §6 exactos en los versos, el *breakdown* y el medio tiempo; quintas = fundamental + 7 + 12;
   `Guitar 2` dobla a `Guitar`; cada ataque del bajo coincide con uno de la guitarra de su clase de altura; bombo con cada
   golpe de los riffs.
8. **Estribillo y clímax:** corcheas de quinta en las dos guitarras y doble bombo en las 16 semicorcheas (c. 13–16 y 34–41).
9. **Parada (c. 17):** después de la primera corchea solo atacan `Growl`, `Glitch` y `FX`.
10. ***Breakdown*:** caja solo en el t3 (c. 18–21 y 30–33); un `Drop` en cada acento del *breakdown* (c. 18–21) y en el t1
    del medio tiempo.
11. **7/8:** quintas en las negras 0, 1 y 2 de cada compás (solo la 0 en el c. 29); `Pluck` en 7 corcheas por compás; el
    bombeo del `Saw Pad` (que `compose.pump_points()` entrega a la mezcla) baja en cada grupo.
12. ***Blast* y tormenta:** caja en todas las semicorcheas del c. 42 y de los t1–2 del c. 43; caída de toms en tresillos en
    los t3–4 del c. 43; 20 semicorcheas de guitarra y bombo en cada compás de 5/4 (Si en las 12 primeras, Do en el
    resto); el *glitch* acelera; el *riser* termina en el final del bucle (±2 ms) y los *swells* en los t1 de los c. 5 y 18.
13. **Costura:** el c. 1 arranca con impacto, *drop*, *crash* y golpe de guitarra en el t1.
14. **Armonía:** la nota más grave en el t1 de cada compás tiene la clase de altura del bajo de §4.
15. Humanización: velocidades variadas, ataques a ≤ 8 ms de la rejilla (banda ±4 ms, sintetizadores ±2 ms, coros y voz
    ±8 ms; `FX` exactos); líneas de §5 que van seguidas, en legato (10–30 ms).
16. Ninguna frase de dos compases de `Guitar` repetida idéntica más de dos veces.

**Mezcla (informe de `mix.py`, medido sobre el MP3 decodificado):**

17. Sonoridad integrada **−16,5 ± 0,5 LUFS**; pico real **≤ −1 dBTP**.
18. `loop_samples` = **3 553 200** (y en el MP3 decodificado); `seam_jump` < 0,02.
19. Contrastes (`sections_lufs`): la intro (c. 2–3) al menos **6 LU** por debajo del estribillo; la parada (c. 17) al menos
    **4 LU** por debajo del estribillo; el clímax c. 38–41 la sección más fuerte y entre **+0,5 y +4 LU** sobre el
    estribillo.
20. Bandas (`bands_db`): `presencia 2.5-6k` ≤ **−19 dB**, `aire 6-16k` ≤ **−34 dB**, `sub <60` ≤ **−12 dB** (los bocetos
    miden −20/−21, −37 y −8/−11: el *sub* baja para dejar sitio a los golpes del juego).
21. **Sintetizadores audibles:** sonoridad (con puerta, por parte) de `Saw Lead` a no más de 6 LU por debajo de la de
    `Guitar`, y la del `Pluck` a no más de 8 LU.
22. Ninguna parte suelta pasa de −6 dB de pico antes del bus.
23. Escucha: el aterrizaje del c. 1 es el final del *riser*; el arpegio se abre; el riff tiene agujeros; el estribillo
    canta; la parada deja la voz rota sola; cada golpe del *breakdown* hunde el suelo; el 7/8 bombea; el c. 39 es la
    cumbre; la tormenta empuja hasta el c. 1 sin costura audible.

### `MixSpec`

```python
MixSpec(
    midi='scripts/musica/acto3-contemplador/build/acto3-contemplador.mid',
    out='scripts/musica/acto3-contemplador/build/acto3-contemplador.mp3',
    bpm=140, beats_per_bar=1, bars=188,       # loop_samples = 188 × 60/140 × 44 100 = 3 553 200
    target_lufs=-16.5, ceiling_dbtp=-1.0,
    reverb={'seconds': 1.8, 'predelay': 0.02, 'damping': 0.55},   # 1,6 s en el boceto
    sections={...},                           # en negras: compás → (primera negra, última negra), 1-based
    ...)
```

Buses de partida: los del boceto (`acto3_jefes.BUS`: `guitar`, `bass_el`, `kit`, `synth`, `sub`, `voice`, `choir`, `sfx`)
con los recortes del Laberinto en guitarras (3,2 y 4,8 kHz) y batería (3,5 kHz) y un recorte en 3,5 kHz en `synth`.
Bombeo: `Part.automation` del `Saw Pad` con `compose.pump_points()`.

**Integración:** copiar a `src/audio/cap3-e1-jefe.mp3` y añadir a `MUSIC_TRACKS` (`src/fx/music-tracks.ts`):
`'cap3-e1-jefe': { file: 'cap3-e1-jefe.mp3', loopSamples: 3553200 }`.
