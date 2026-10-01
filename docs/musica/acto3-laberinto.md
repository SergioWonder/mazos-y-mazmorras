# Brief: Acto III, escenario 1, «El Laberinto del Contemplador» — «Fractura»

Una canción en **dos versiones sincronizadas**: **exploración** (mapa y eventos) y **combate** (combates
normales y élites). Ids de juego: `cap3-e1` y `cap3-e1-combate`. Pista nueva en `scripts/musica/acto3-laberinto/`
con las convenciones del [README del estudio](../../scripts/musica/estudio/README.md):

- `test_compose.py` (los criterios 1–14 de §8, que se leen en los MIDIs) se escribe **antes** que `compose.py`.
- `compose.py` genera **los dos MIDIs a la vez** (`build/acto3-laberinto-explora.mid` y `build/acto3-laberinto-combate.mid`)
  a partir de una única descripción de forma, armonía y melodía. Nada de copiar y pegar entre versiones.
- `mix.py` renderiza los dos (`build/acto3-laberinto-explora.mp3`, `build/acto3-laberinto-combate.mp3`, con su
  `.report.json`), cada uno con su `MixSpec`, y la prueba de cruce `build/acto3-laberinto-cruce.mp3` (criterio 22).

Necesita montado el disco **Base** (VCSL, Sonatina, `electric-guitar-FSBS-dist1`, `electric-bass-YR`, `virtuosity_drums`).
Fuentes: [direccion.md](direccion.md) (Acto III, Laberinto) y los bocetos que eligió el usuario:

- Exploración: `ojo_fractura()` en `scripts/musica/leitmotivs/acto3_bocetos.py` (el arreglo «Ojo del vacío» con el
  leitmotiv «Fractura»), oído en `scripts/musica/leitmotivs/build/acto3-ojo-1-fractura.mp3`.
- Combate: **los dos** bocetos de `scripts/musica/leitmotivs/acto3_combate.py` («adelante con todo»), como secciones:
  `fractura_asalto()` (`acto3-laberinto-combate-asalto.mp3`) y `fractura_espiral()` (`acto3-laberinto-combate-espiral.mp3`).

Del boceto de exploración se conservan: celesta y copas de cristal sobre el motivo encima de un colchón de coro
disminuido, el *breakdown* a medio tiempo sobre re grave lleno de huecos (guitarra distorsionada en *chugs*, bajo
de púa, batería), el coro que toma el motivo y el cúmulo de órgano re–mi♭. Del combate: «Asalto» (doble tiempo
desde el primer tiempo, semicorcheas en trémolo dobladas en dos guitarras con acentos 3+3+3+3+2+2, doble bombo,
*blast beats*, paradas en seco que dejan solo el coro, guitarra solista con el motivo) y «Espiral» (la célula de
7/16 que resbala sobre el 4/4 encima de un bordón de coro en tritono, el *breakdown* con doble bombo, un compás de
*blast*, tres golpes y la caída de toms). Formato de referencia: [acto2-cripta.md](acto2-cripta.md).

## 1. Función, emoción y repetición

- **Dónde suena:** el mapa y los eventos del Laberinto del Contemplador (exploración) y todos sus combates normales
  y de élite (combate). Es la primera música del Acto III.
- **Emoción:** misterio y oscuridad profunda. El Contemplador es un ojo que mira desde fuera del mundo: la música
  **no pertenece a un mundo de fantasía**. Tonos de metal progresivo (*progressive metalcore*): riffs pesados seguidos
  de silencios, coros al fondo, ritmos que cambian, caos y locura.
  - Exploración: casi inmóvil al principio (copas, celesta, coro, un latido de bombo y bajo), y de pronto el riff a
    medio tiempo con agujeros. Dos *breakdowns* (B y el clímax) separados por la espiral en voz baja (C) y la subida (D).
  - Combate: **frenesí**. Batería y guitarras a tope desde el primer tiempo; las paradas en seco son lo único que
    respira, y en ellas queda el coro solo.
- **Lo que pidió el usuario y cómo se cumple:**
  - **Nada de agudos que pitan:** la celesta va **una octava por debajo del boceto** (el motivo a su altura, 68–77,
    no en 80–89) y las copas solo en 74–77. Nada tenido por encima de F5 (77) en todo el bucle; la guitarra solista
    no pasa de B4 (71). Los platos van con estantería −4 dB desde 8 kHz en el bus de batería.
  - **Riffs pesados seguidos de pausas:** en exploración el segundo compás de cada pareja del *breakdown* calla en su
    segunda mitad (c. 8, 10, 16, 18, 22); en combate hay paradas en seco en los c. 6, 10, 22 y 23.
  - **Coros de fondo:** el colchón disminuido (`Choir Pad`) suena los 24 compases en las dos versiones; el coro grande
    (`Choir`) toma el motivo en B, D y el clímax (y en combate lo dobla en todo el bucle).
  - **Ritmos cambiantes:** 3+3+3+3+2+2 (Asalto), 3+3+2+3+3+2 (B de combate), la célula de 7/16 que resbala (C) y los
    acentos 3+3+3+3+2+2 a medio tiempo en la exploración de D.
- **Repetición:** el escenario dura 15–40 minutos y el jugador cambia de versión decenas de veces. Un solo clímax
  (c. 21), un respiro claro (C, c. 11–14) y la costura sin señal (el latido de exploración y la caída de toms de
  combate llevan al c. 1).
- **Transformación del leitmotiv** (§5): **fragmento en aumentación** (la cabeza re–mi♭ en redondas, intro);
  **exposición** a su altura (A); **cambio de registro** al coro grave (B); **transposición al tritono** sobre el bordón
  re–sol♯ (C); **inversión** que arranca en mi♭ (D); **retorno rearmonizado** a su altura con el clímax sobre **si♭
  mayor** (c. 21); **cabeza que no termina** (coda). Además, el bajo de la forma entera canta la cabeza del motivo en
  aumentación: re (c. 1–14) – mi♭ (15–16) – la (17–18) – re (19).

## 2. Tempo, métrica, tonalidad, duración

| Parámetro | Valor (idéntico en las dos versiones) |
|---|---|
| Tempo | ♩ = 70, fijo (el de los bocetos) |
| Métrica | 4/4 (la célula de 7/16 de C resbala por encima sin cambiar el compás) |
| Tonalidad | **re** sobre el eje disminuido re–fa–la♭ (con el mi♭ del cúmulo); D sube por mi♭ disminuido y la disminuido a la dominante la7(♭9); el clímax pasa por fa disminuido, **si♭ mayor** y mi disminuido |
| Compases | **24** |
| Duración del bucle | 24 × 4 × 60/70 = **82,286 s** → `loop_samples` = **3 628 800** a 44,1 kHz (cada compás son 151 200 muestras exactas) |
| `MixSpec` (ambas) | `bpm=70`, `beats_per_bar=4`, `bars=24` |

Compás = 3,429 s; negra = 0,857 s; corchea = 0,429 s; semicorchea = 0,214 s. Inicio del compás *n* = (*n* − 1) × 3,429 s.

**Figuras:** melodías, colchón, órgano, copas y celesta en blancas o más largas (las líneas de §5 son todas de
blancas o redondas). Guitarras, bajo y batería en la rejilla de semicorchea, en las dos versiones.

### Reglas de sincronía (exploración ↔ combate)

El juego cruza las dos versiones con un fundido **lineal** de 1,6 s desde el mismo punto del bucle
(`src/fx/audio.ts`, `cruzarVersion`). Por tanto:

1. Mismo tempo, métrica, número de compases, forma y **armonía compás a compás** (§3 y §4 son comunes).
2. **Misma melodía**: en cada compás, las alturas y los ataques escritos de las líneas de referencia de §5 son los
   mismos en las dos versiones. Pueden cambiar el instrumento, la dinámica y los doblajes declarados en §5.
3. **Capas comunes** (idénticas nota a nota, mismas velocidades, mismo CC1 y la misma humanización): `Choir Pad`
   (el colchón disminuido, con su CC1), `Glasses` (la cabeza y el motivo) y `Celesta` (el motivo de A). Al ser
   idénticas, en el cruce lineal suman en fase: son el «hilo».
4. **Humanización por posición:** el desplazamiento de cada ataque depende de la pista y de su posición escrita,
   no del orden de las notas. Así, en las pistas con el mismo nombre en las dos versiones (`Guitar`, `Bass`, `Drums`,
   `Choir`, `Organ`), un ataque escrito en el mismo sitio suena en el mismo instante en las dos: no hay *flam* en el
   cruce aunque el resto de la pista sea distinto.
5. Todo lo demás puede diferir. Lo que solo existe en una versión entra y sale con el fundido.

## 3. Forma compás a compás e intensidad

Intensidad de 1 a 10 (10 = lo más fuerte de la pista).

| Sección | Compases | Tiempo (s) | Contenido | Intensidad E | Intensidad C |
|---|---|---|---|---|---|
| Intro «El párpado» | 1–2 | 0,00–6,86 | La **cabeza en aumentación** en las copas (re, mi♭); colchón; órgano en re grave; latido de bombo y bajo / en combate, Asalto desde el primer tiempo | 2 | 8 |
| A «El ojo» | 3–6 | 6,86–20,57 | **Exposición**: celesta y copas (el boceto); latido; el c. 6 cierra con un redoble de bombo / Asalto, *blast* en el c. 5, parada en el c. 6 | 3 → 4 | 8 |
| B «Fractura» | 7–10 | 20,57–34,29 | El *breakdown* del boceto: medio tiempo sobre re con agujeros; el coro toma el motivo; cúmulo de órgano / Asalto con acentos 3+3+2, solista, *blast* en el c. 9, parada en el c. 10 | 7 | 9 |
| C «Espiral» | 11–14 | 34,29–48,00 | **Respiro.** La célula de 7/16 en voz baja (guitarra sin quintas, bombo suave); el órgano canta el motivo al tritono sobre el bordón re–sol♯ / Espiral a tope | 4 (mínimo de la parte central) | 8 |
| D «El Contemplador» | 15–18 | 48,00–61,71 | **Inversión** en el coro; acentos 3+3+3+3+2+2 a medio tiempo sobre mi♭ y la; c. 16 y 18 se cortan; caída de toms / el *breakdown* de Espiral con doble bombo, *blast* en el c. 17, tres golpes y caída de toms en el c. 18 | 6 → 8 | 8 → 9 |
| Clímax «La pupila» | 19–22 | 61,71–75,43 | Motivo a su altura, guitarras dobladas, coro agudo; **clímax en el c. 21** (68,57 s) sobre **si♭** / Asalto con *blast* en el c. 21, parada en el c. 22 | 8 → **9** (c. 21) → 7 | 9 → **10** (c. 21) → 8 |
| Coda «Ciego» | 23–24 | 75,43–82,29 | La cabeza que no termina en las copas; colchón, órgano grave, latido que enlaza con el c. 1 / un golpe y el coro solo (c. 23), tres golpes y caída de toms hacia el c. 1 (c. 24) | 2 | 5 → 8 |

Respiros: segunda mitad de los c. 8, 10, 16, 18 y 22 (exploración), toda la sección C (exploración), y en combate las
paradas de los c. 6, 10, 22 y 23 (después del golpe, solo coro, colchón y copas).

## 4. Armonía por sección (común a las dos versiones)

Bajo (pc) y notas del acorde por compás. El colchón (`Choir Pad`) toca estas voces; el órgano añade el cúmulo de
semitono (fundamental + ♭9) donde se indica. Bajo real (`Bass`, púa) entre corchetes.

| Compás | Acorde | Colchón (MIDI) | Cúmulo de órgano | Bajo |
|---|---|---|---|---|
| 1–2 | re disminuido (+ mi♭ de la cabeza en el 2) | D3 F3 A♭3 (50 53 56) | (exploración: pedal D2, 38) | [D1, 26] |
| 3–6 | re disminuido | D3 F3 A♭3 | (exploración: pedal D2) | [D1] |
| 7–10 | re disminuido + ♭9 | D3 F3 A♭3 | D3 + E♭3 (50 51) | [D1] |
| 11–14 | re con tritono (bordón) | D3 G♯3 (50 56) | — | [la célula: D1, E♭1, G♯1] |
| 15–16 | mi♭ disminuido + ♭9 | E♭3 G♭3 A3 (51 54 57) | E♭3 + E3 (51 52) | [E♭1, 27] |
| 17 | la disminuido + ♭9 | A2 C3 E♭3 (45 48 51) | A2 + B♭2 (45 46) | [A1, 33] |
| 18 | la7(♭9) (dominante) | A2 C♯3 G3 (45 49 55) | A2 + B♭2 | [A1] |
| 19 | re disminuido + ♭9 | D3 F3 A♭3 | D3 + E♭3 | [D1] |
| 20 | fa disminuido + ♭9 | F3 A♭3 B3 (53 56 59) | F3 + F♯3 (53 54) | [F1, 29] |
| 21 | **si♭ mayor** (+ si, el cúmulo) | B♭2 D3 F3 (46 50 53) | B♭2 + B2 (46 47) | [B♭1, 34] |
| 22 | mi disminuido + ♭9 | E3 G3 B♭3 (52 55 58) | E3 + F3 (52 53) | [E1, 28] |
| 23–24 | re disminuido | D3 F3 A♭3 | (exploración: pedal D2) | [D1] |

La raíz de la guitarra rítmica es la del bajo una octava arriba (D2 38, E♭2 39, A2 45, F2 41, B♭2 46, E2 40); la
guitarra no baja de B1 (35), por eso la va en A2. En combate, el «giro» de Asalto en el último tiempo de los c. 2, 4,
8 y 20 sube un semitono (semicorcheas 12–13) y al tritono (14–15): re → mi♭ → sol♯; fa → fa♯ → si. En el c. 17 de
combate el *blast* gira a si♭ en el último tiempo. Son notas de paso del último tiempo; el bajo de §4 manda en los
tiempos 1 y 3.

## 5. Leitmotiv

Referencia «Fractura» (re, blancas, dos por compás; `FRACTURA` en `acto3_combate.py`):

```
| D5  E♭5 | A4  G♯4 | D5  F5 | E5  B♭4 |
| h   h   | h   h   | h   h  | h   h   |
  74  75    69  68    74  77   76  70
```

Semitono arriba, tritono abajo, semitono abajo; luego tritono arriba, tercera menor, semitono, tritono.

Las alturas y ritmos de esta tabla son la **melodía de referencia**: idénticos en las dos versiones.

| Compases | Exploración | Combate | Notas (MIDI) y ritmo | Transformación |
|---|---|---|---|---|
| 1–2 | `Glasses` (**común**) | `Glasses` + `Choir` 8vb | D5 (w) · E♭5 (w) (74 · 75) | **Fragmento en aumentación ×2**: solo el semitono de la cabeza. |
| **3–6** | **`Celesta`** (**común**) + `Glasses` en las notas ≥ 74 | **`Celesta`** + `Choir` 8vb | **74 75 · 69 68 · 74 77 · 76 70** (h) | **Exposición**, la del boceto (la celesta una octava más grave, ver §1). Las copas callan en A4, G♯4 y B♭4: el motivo se «fractura». |
| 7–10 | `Choir` | `Lead` + `Choir` al unísono | D4 E♭4 · A3 G♯3 · D4 F4 · E4 B♭3 (62 63 · 57 56 · 62 65 · 64 58) | **Cambio de registro**: el coro grave del boceto (y la solista del Asalto). |
| 11–14 | `Organ` | `Lead` + `Choir` al unísono | G♯4 A4 · D♯4 D4 · G♯4 B4 · A♯4 E4 (68 69 · 63 62 · 68 71 · 70 64) | **Transposición al tritono** sobre el bordón re–sol♯: contiene las dos notas del bordón. |
| 15–18 | `Choir` | `Lead` + `Choir` al unísono | E♭4 D4 · G♯4 A4 · E♭4 C4 · C♯4 G4 (63 62 · 68 69 · 63 60 · 61 67) | **Inversión** (los intervalos al revés) desde mi♭: el c. 17 cae en la♭dim (mi♭, do) y el 18 en la7 (do♯, sol), que pide re. |
| **19–22** | **`Choir`** (voces agudas) | **`Choir`** + `Lead` 8vb | **74 75 · 69 68 · 74 77 · 76 70** | **Retorno rearmonizado**: re dim · fa dim · **si♭ (clímax, c. 21: re–fa son su tercera y su quinta)** · mi dim. |
| 23 | `Glasses` (**común**) | `Glasses` + `Choir` 8vb | D5 (h) E♭5 (h) (74 75) | La cabeza que no termina: se queda en el semitono. |

Doblajes declarados: `Choir` 8vb en combate (c. 1–6 y 23), `Lead` + `Choir` al unísono (c. 7–18), `Lead` 8vb en el
clímax de combate y las copas parciales en A.

## 6. Orquestación por sección

Registros en MIDI (C4 = 60). Las pistas del MIDI llevan el nombre de la columna «Pista».

### Patches

| Pista | Ruta `.sfz` | Dinámica | Versiones |
|---|---|---|---|
| `Choir Pad` (**común**) | `sso/…/Chorus - Performance/Mixed Chorus.sfz` | **CC1** | las dos, idéntica |
| `Glasses` (**común**) | `VCSL/Idiophones/Friction Idiophones/Wine Glasses - Slow.sfz` | velocidad | las dos, idéntica |
| `Celesta` (**común**) | `sso/…/Percussion/Celeste.sfz` | velocidad | las dos, idéntica |
| `Choir` | `sso/…/Chorus - Performance/Large Chorus.sfz` | **CC1** | las dos |
| `Organ` | `sso/…/Organ/Great - Open Diapason 8ft.sfz` | (`amp_veltrack=0`: el nivel lo da la mezcla) | las dos |
| `Guitar` / `Guitar 2` | `electric-guitar-FSBS-dist1/EGuitarFSBS-dist1 bridge 20220911.sfz` | velocidad (capa suave ≤ 92, dura ≥ 93) | las dos (`Guitar 2` en exploración solo en el clímax) |
| `Bass` | `electric-bass-YR/PickedBassYR 20190930.sfz` | velocidad | las dos |
| `Drums` | `virtuosity_drums/Programs/01-basic-kit.sfz` | velocidad | las dos |
| `Lead` | la guitarra distorsionada | velocidad | combate |
| `Choir Low` | `sso/…/Chorus - Performance/Large Chorus.sfz` | **CC1** | combate |

Batería (GM): 36 bombo, 38 caja, 42 charles cerrado, 49 *crash*, 51 *ride*, 57 *crash* 2, toms 50 48 47 45 43 41.
Se usa `01-basic-kit` (en `02-full-kit` el charles abierto calla sin CC4).

**Sonatina por CC1** (`Choir Pad`, `Choir`, `Choir Low`): curva de CC1 obligatoria con un punto en el tick 0 y como
mucho un punto por corchea. La celesta (Sonatina por velocidad) sin CC1.

**Funciones del boceto que se conservan** (`acto3_bocetos.chug`, `acto3_combate.power`): un *chug* es la fundamental
(+ quinta y octava si es acorde de quinta) en `Guitar` y la fundamental una octava abajo en `Bass`; `power` es el
acorde de quinta en su propia pista (`Guitar 2`, la guitarra doblada).

### Exploración

| Sección | Pistas y papel |
|---|---|
| Intro 1–2 | `Glasses` cabeza (vel. 54–56) · `Choir Pad` · `Organ` pedal D2 · **latido**: `Drums` bombo en t1 (vel. 66) y «1 y» (vel. 52) en cada compás + `Bass` D1 en t1 (vel. 64) uno de cada dos (c. 1, 3, 5 y 24) |
| A 3–6 | `Celesta` motivo (vel. 44–50) · `Glasses` (vel. 50–56) · `Choir Pad` · `Organ` pedal D2 · latido · c. 6, t4: redoble de bombo en semicorcheas (vel. 70 → 96) hacia B |
| B 7–10 | `Guitar` *chugs* de quinta del boceto: c. 7 y 9 en 0, ¾, 1½, 2½, 3¼ tiempos; c. 8 y 10 en 0, ¾, 1½ y **silencio** (vel. 112) · `Bass` con cada *chug* · `Drums` bombo con cada golpe, caja en t3, *crash* en el c. 7 y *ride* en el t1 de los demás · `Choir` motivo grave (CC1 80 → 88 → 82) · `Organ` cúmulo D3+E♭3 · `Choir Pad` |
| C 11–14 | `Guitar` la célula de 7/16 (D2 D2 – E♭2 D2 – G♯2) en notas sueltas, sin quintas, capa suave (vel. 68 / 80 en la primera de cada célula) · `Bass` D1 en la primera de cada célula · `Drums` bombo suave (vel. 70) en la primera de cada célula, charles cerrado en corcheas (vel. 46) en los c. 13–14 · `Organ` el motivo al tritono · `Choir Pad` bordón D3 G♯3 |
| D 15–18 | `Guitar` acentos 3+3+3+3+2+2 (semicorcheas 0 3 6 9 12 14) a medio tiempo: c. 15 entero (E♭2), c. 16 solo 0 3 6, c. 17 entero (A2), c. 18 tres golpes (0, ¾, 1½); vel. 104 → 114 · `Bass` con cada golpe · `Drums` bombo con cada golpe, caja en t3 de los c. 15 y 17, *crash* en los c. 15 y 17, caída de toms suave al final del c. 18 · `Choir` inversión (CC1 78 → 90) · `Organ` cúmulos · `Choir Pad` |
| Clímax 19–22 | `Guitar` + `Guitar 2` dobladas: c. 19 (D2) 0 ¾ 1½ 2½ 3¼; c. 20 (F2) 0 ¾ 1½ 2½ 3¼ 3¾; **c. 21 (B♭2) 0 ¼ ¾ 1 1½ 2 2½ 2¾ 3¼ 3½ (vel. 116)**; c. 22 (E2) 0 ¾ 1½ y silencio · `Bass` · `Drums` caja en t3, *crash* en los c. 19 y 21 (y *crash* 2 en el t3 del 21) · `Choir` motivo agudo (CC1 84 → **92 en el c. 21** → 84) · `Organ` cúmulos · `Choir Pad` |
| Coda 23–24 | `Glasses` cabeza · `Choir Pad` · `Organ` pedal D2 · latido (el mismo que en el c. 1) |

### Combate

| Sección | Pistas y papel |
|---|---|
| Intro 1–2 | **Asalto** desde el t1: `Guitar` 16 semicorcheas por compás, acentos 3+3+3+3+2+2 (semicorcheas 0 3 6 9 12 14; acorde de quinta y vel. 116 en los acentos, fundamental sola y vel. 90 en el resto) · `Guitar 2` la dobla nota a nota (108 / 84) · `Bass` en todas · `Drums` doble bombo en las 16 (112 / 98), caja en las «y» (118), *crash* 2 en los tiempos y *ride* en las «y», *crash* en el t1 del c. 1 · giro en el t4 del c. 2 · `Choir` cabeza 8vb (CC1 96) · capas comunes |
| A 3–6 | Asalto: c. 3 *crash*, c. 4 giro, **c. 5 *blast*** (caja en las 16 semicorcheas), **c. 6 parada**: 8 semicorcheas, un golpe en el t3 (*chug* largo, bombo, *crash*) y después solo coro · `Choir` motivo 8vb (CC1 96 → 104) · `Celesta` y `Glasses` comunes |
| B 7–10 | Asalto con **acentos 3+3+2+3+3+2** (0 3 6 8 11 14), el bajo solo en los acentos (hasta el siguiente) y *ride* en corcheas: c. 7 *crash*, c. 8 giro, **c. 9 *blast***, **c. 10 parada** · `Lead` el motivo grave (vel. 100) + `Choir` al unísono · `Organ` cúmulo D3+E♭3 |
| C 11–14 | **Espiral**: la célula de 7/16 en las dos guitarras (quinta en las fundamentales; 114 / 92 y 104 / 86) y el bajo · `Drums` bombo en cada nota de la célula, caja en t2 y t4, *ride* en corcheas, *crash* 2 en cada t1 · `Choir Low` bordón D3 + G♯3 (CC1 76 → 90) · `Lead` el motivo al tritono (vel. 96) + `Choir` |
| D 15–18 | El *breakdown* de Espiral: c. 15 (E♭2) golpes 0 ¾ 1½ 2½ 3¼ y c. 16 0 ¾ 1½, con **doble bombo** en semicorcheas, caja en t3, *crash* · **c. 17 *blast*** sobre A2 (giro a B♭2 en el t4) · **c. 18 tres golpes** (0 ¾ 1½) y **caída de toms** 50 48 47 45 43 41 en semicorcheas desde «3 y» · `Lead` inversión + `Choir` · `Organ` cúmulos |
| Clímax 19–22 | Asalto sobre D2 · F2 (giro) · **B♭2 *blast* (c. 21, *crash* en t1 y t3)** · E2 con **parada** en el c. 22 · `Choir` motivo agudo (CC1 100 → **108 en el c. 21** → 100) + `Lead` 8vb (vel. 104) · `Organ` cúmulos |
| Coda 23–24 | c. 23: **un golpe** en el t1 (*chug* largo, bombo, *crash*) y el coro solo: `Choir` cabeza 8vb, `Choir Low` D3 + A♭3 (CC1 80) y las capas comunes · c. 24: **tres golpes y caída de toms** que entran en el *crash* del c. 1 |

### Capas comunes

- `Choir Pad`: los acordes de §4, notas comunes ligadas; nuevos ataques en los c. 1, 11, 15, 17, 18, 19, 20, 21, 22 y 23.
  CC1 48 (c. 1) → 60 (c. 6) → 68 (c. 7–10) → 58 (c. 11) → 64 (c. 14) → 66 (c. 15) → 76 (c. 18) → 80 (c. 21) →
  74 (c. 22) → 60 (c. 23) → 48 (final), el mismo valor a los dos lados de la costura.
- `Glasses`: D5 (w) c. 1 · E♭5 (w) c. 2 · c. 3–6 las notas del motivo ≥ 74 · D5 E♭5 (h h) c. 23: **9 notas**.
- `Celesta`: el motivo de A, **8 notas**, nada más en todo el bucle.

### Notas sobre los samples

- La guitarra tiene dos capas: ≤ 92 es más suave y más corta (las notas sin acento del trémolo y la espiral de
  exploración), ≥ 93 es el golpe duro. Su nota más grave es B1 (35): la raíz de la va en A2.
- El bajo de púa cubre D1–A♯2 (26–46).
- El órgano de Sonatina tiene `amp_veltrack=0`: su velocidad no cambia el nivel; la escribimos igual (cuenta en el
  criterio 9) y el nivel se ajusta en la mezcla.
- Las copas (`Wine Glasses - Slow`) solo existen en 74–87: de ahí los huecos de A.
- Coro: por debajo de G4 suena masculino, desde G4 femenino. El clímax (68–77) es el único sitio con voces agudas.
- No usar ningún `KS`.

## 7. Dinámica

| Nivel | pp | p | mp | mf | f | ff |
|---|---|---|---|---|---|---|
| Velocidad | 25–40 | 40–55 | 55–70 | 70–85 | 85–100 | 100–124 |
| CC1 (Sonatina) | 40–55 | 55–70 | 70–85 | 85–95 | 95–105 | 105–110 |

Techos: exploración vel. ≤ 118 y CC1 ≤ 92; combate vel. ≤ 124 y CC1 ≤ 110. `Celesta` ≤ 52, `Glasses` ≤ 60 (las
dos versiones). Clímax: el CC1 más alto del `Choir` está en el c. 21 en las dos versiones, y en exploración también la
velocidad más alta de `Guitar`.

## 8. Criterios de aceptación

**Partitura (`test_compose.py`, leyendo los dos MIDIs):**

1. Los dos MIDIs: 24 compases de 4/4 a ♩ = 70, sin cambios de tempo, misma longitud en ticks; ninguna nota empieza
   antes del tick 0 ni termina después de 82,286 s.
2. Todas las notas dentro del rango del catálogo de su patch y de los registros: `Choir Pad` 45–59, `Choir` 56–77,
   `Choir Low` 50–56, `Glasses` 74–77 (las notas del motivo), `Celesta` 68–77, `Organ` 38–71, `Guitar` /
   `Guitar 2` 38–59, `Lead` 56–71, `Bass` 26–35.
3. **Nada agudo tenido:** ninguna nota de una negra o más por encima de F5 (77) en ninguna pista.
4. La melodía de referencia de §5 aparece con las alturas y los ataques exactos en las **dos** versiones, con sus
   doblajes declarados.
5. Las capas comunes (`Choir Pad` con su CC1, `Glasses`, `Celesta`) son idénticas en los dos MIDIs, y tienen las notas
   de §6 (9 copas, 8 celestas, los ataques del colchón).
6. Figuras: en las dos versiones, `Choir Pad`, `Choir`, `Choir Low`, `Organ`, `Lead`, `Glasses` y `Celesta` sin ataques
   a menos de una blanca salvo los tiempos fuertes del colchón; guitarras, bajo y batería en la rejilla de semicorchea.
7. Capas simultáneas por sección ≤ E 5 / 6 / 6 / 5 / 6 / 7 / 5 y C 8 / 8 / 8 / 8 / 8 / 8 / 8
   (intro / A / B / C / D / clímax / coda).
8. **Sin choques de registro:** mientras suena una melodía de §5, ninguna otra pista mantiene notas de negra o más a
   menos de una octava con velocidad (o CC1 − 15) ≥ la de la melodía (salvo los doblajes declarados).
9. Techos de §7 y clímax en el c. 21.
10. Cada pista de Sonatina por CC1 tiene CC1 en el tick 0 y dibuja la frase; como mucho un punto por corchea.
11. **El riff** — guitarra y bajo juntos: cada ataque del bajo en un compás con guitarra coincide con un ataque de la
    guitarra de su misma clase de altura; los acordes de quinta son fundamental + 7 + 12.
12. **Asalto** (combate, c. 1–10 y 19–22): 16 semicorcheas de guitarra y bombo por compás (8 en las paradas) con los
    acentos de su agrupación; *blast* (caja en las 16) en los c. 5, 9, 17 y 21; paradas en los c. 6, 10 y 22 (nada
    después del golpe del t3) y en el c. 23 (nada después del golpe del t1). **Espiral** (c. 11–14, las dos versiones):
    los ataques de la guitarra siguen la célula `[0, 0, –, 1, 0, –, 6]` sobre 64 semicorcheas; en exploración, sin
    quintas y en la capa suave. *Breakdowns* con los golpes del boceto (E c. 7–10; C c. 15–16 con doble bombo) y caída
    de toms en los c. 18 y 24 de combate.
13. **Pausas** de exploración: en los c. 8, 10, 16, 18 y 22 la guitarra no ataca en los tiempos 3–4.
14. **Armonía:** la nota más grave que suena en el t1 y el t3 de cada compás tiene la clase de altura del bajo de §4
    (en C, la de la célula: re, mi♭ o sol♯). Además: humanización (velocidades variadas, ataques a ≤ 8 ms de la
    rejilla), los ataques de las pistas con el mismo nombre en el mismo sitio de las dos versiones suenan a la vez,
    las líneas de §5 en legato (10–30 ms), ninguna frase de dos compases repetida más de dos veces, y la costura: el
    latido de exploración del c. 24 es el del c. 1, la caída de toms de combate entra en el *crash* del c. 1 y el CC1
    del colchón acaba donde empieza.

**Mezcla (informe de `mix.py`, una `MixSpec` por versión, medido sobre el MP3 decodificado):**

15. Sonoridad integrada: exploración **−17,5 ± 0,5 LUFS**, combate **−16,5 ± 0,5 LUFS** (el combate, como mucho
    ~1 dB más fuerte, como en el Acto II). Pico real **≤ −1 dBTP** en las dos.
16. `loop_samples` = **3 628 800** en las dos (y en el MP3 decodificado); `seam_jump` < 0,02 en las dos.
17. Contraste dentro de la exploración (`sections_lufs`): clímax c. 19–22 frente a A c. 3–6 entre **+5 y +12 LU**;
    C c. 11–14 al menos **3 LU por debajo** de B c. 7–10; c. 21 el compás más fuerte de la exploración. En combate,
    C c. 11–14 a no más de 3 LU por debajo del clímax (el frenesí no afloja) y el c. 21 a ±1 LU del compás más fuerte.
18. Contraste entre versiones: en cada sección de §3, combate − exploración entre **−1 y +12 LU**: el combate nunca
    suena claramente más bajo. (La exploración de la intro y de A es casi silencio a propósito: el salto al combate ahí
    se nota.) En los *breakdowns* (B, D, clímax) las dos versiones quedan a la par: con el bucle de exploración a
    −17,5 LUFS y casi en silencio un tercio del tiempo, sus riffs suben al nivel del combate, que es uniforme. El combate
    se distingue ahí por densidad (trémolo, doble bombo, *blasts*), no por volumen; exigir 0 LU obligaría a subir el
    combate más de 1 dB por encima de la exploración, contra §1.
19. Bandas (`bands_db`, relativas al total), en las dos: `presencia 2.5-6k` ≤ **−18 dB**, `aire 6-16k` ≤ **−32 dB**,
    `sub <60` ≤ **−16 dB** (los bocetos aprobados miden −18/−20, −37/−40 y −18/−20).
20. Ninguna parte suelta pasa de −6 dB de pico antes del bus.
21. Las dos `MixSpec` comparten sala (mismos `reverb` y `reverb_eq`) y la colocación (pan, envío, anchura) de las
    pistas que existen en ambas; las capas comunes con el mismo `gain_db` y en buses lineales (sin compresor) idénticos.
22. **Prueba de cruce**: `mix.py` escribe `build/acto3-laberinto-cruce.mp3`: exploración de 0 a 24,0 s, fundido lineal de
    1,6 s a combate en 24,0 s (c. 8), vuelta a exploración en 54,86 s (c. 17), como hace el juego. En la sonoridad a
    corto plazo (ventana de 3 s) no hay un bache de más de 3 LU por debajo de la menor de las dos versiones ni un
    exceso de más de 1 LU sobre la mayor, y las capas comunes, tras su bus, son idénticas en las dos (−∞ dB).
23. Escucha: la celesta y las copas suenan a cristal oscuro, no a pitido; el *breakdown* de B se reconoce como el del
    boceto; C respira; D sube; el si♭ del c. 21 suena a que el ojo se abre; en combate, el frenesí no deja de empujar
    salvo en las paradas, donde el coro queda solo; al cambiar de versión es la misma canción en el mismo sitio.

### `MixSpec` (las dos versiones)

```python
MixSpec(
    midi='scripts/musica/acto3-laberinto/build/acto3-laberinto-explora.mid',   # o -combate.mid
    out='scripts/musica/acto3-laberinto/build/acto3-laberinto-explora.mp3',    # o -combate.mp3
    bpm=70, beats_per_bar=4, bars=24,          # loop_samples = 24 × 4 × 60/70 × 44 100 = 3 628 800
    target_lufs=-17.5,                         # combate: -16.5
    ceiling_dbtp=-1.0,
    reverb={'seconds': 2.4, 'predelay': 0.025, 'damping': 0.55},   # entre la sala del «Ojo» (2,6 s) y la del combate (1,8 s)
    sections={'intro 1-2': (1, 2), 'A 3-6': (3, 6), 'B 7-10': (7, 10), 'C 11-14': (11, 14),
              'D 15-18': (15, 18), 'climax 19-22': (19, 22), 'coda 23-24': (23, 24), 'c21': (21, 21)},
    ...)
```

Buses de partida: los de los bocetos (`acto3_bocetos.BUS`: `guitar`, `bass_el`, `kit`, `choir`, `bells`, `organ`). Capas
comunes en buses sin compresor e idénticos en las dos `MixSpec`. El ingeniero de mezcla los ajusta para cumplir 15–22.

**Integración:** copiar a `src/audio/cap3-e1.mp3` y `src/audio/cap3-e1-combate.mp3` y añadir a `MUSIC_TRACKS`
(`src/fx/music-tracks.ts`):
`'cap3-e1': { file: 'cap3-e1.mp3', loopSamples: 3628800, group: 'cap3-e1' }` y
`'cap3-e1-combate': { file: 'cap3-e1-combate.mp3', loopSamples: 3628800, group: 'cap3-e1' }`.
