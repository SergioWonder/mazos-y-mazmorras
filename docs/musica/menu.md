# Brief: Tema del menú principal, «La puerta del juego»

Primera pista del estudio con samples (VSCO 2 CE). Sustituye a `src/audio/menu.mp3`
(la versión sintetizada de `scripts/musica/menu/menu.py`). Pista nueva en `scripts/musica/menu/`, junto a la versión sintetizada
(`compose.py` → `build/menu.mid`, `mix.py` → `build/menu.mp3`), siguiendo las convenciones del
[README del estudio](../../scripts/musica/estudio/README.md).

## 1. Función, emoción y repetición

- **Dónde suena:** pantalla de título y selección de clase. Es la carta de presentación de la banda
  sonora: lo primero que oye el jugador y donde **aprende el leitmotiv**.
- **Emoción:** calidez y promesa de aventura. Una puerta que se abre a un mundo amable: luminoso,
  algo nostálgico, con un único momento de ímpetu. Nunca solemne ni pomposo; orquesta de cámara,
  no sinfónica.
- **Repetición:** el jugador puede pasar entre 30 s y varios minutos eligiendo clase. El bucle tiene
  que aguantar 4–5 vueltas sin cansar: un solo clímax corto, mucho aire alrededor y la vuelta al
  principio sin costura.
- Aquí sí se expone el leitmotiv completo y reconocible. La transformación de esta pista es
  **métrica**: el motivo pasa a 3/4 y se le da un ritmo ternario propio (ver §5), que será la
  versión de referencia que citen las demás pistas.

## 2. Tempo, métrica, tonalidad, duración

| Parámetro | Valor |
|---|---|
| Tempo | ♩ = 108, fijo (sin cambios de tempo ni rubato en el MIDI) |
| Métrica | 3/4 («andante con moto»: lírico pero en marcha, no vals de salón) |
| Tonalidad | re mayor; sección B en si menor (relativo); puente con préstamos de re menor (♭VI, ♭VII) |
| Compases | **42** |
| Duración del bucle | 42 × 3 × 60/108 = **70,00 s** → `loop_samples` = **3 087 000** a 44,1 kHz |
| `MixSpec` | `bpm=108`, `beats_per_bar=3`, `bars=42` |

Figura más rápida permitida: **corchea** (0,28 s). Únicas excepciones: el glissando de arpa del
c. 32 y los arpegios de arpa en corcheas. Nada de semicorcheas en cuerdas ni vientos: con 2–3 capas
de velocidad y sin transiciones legato reales, las líneas rápidas suenan a máquina.

## 3. Forma compás a compás e intensidad

Intensidad de 1 (casi silencio) a 10 (lo más fuerte de la pista; en este tema no pasa de *f*).

| Sección | Compases | Tiempo (s) | Contenido | Intensidad |
|---|---|---|---|---|
| Intro | 1–4 | 0,0–6,7 | Arpa y cuerdas suaves; el glockenspiel susurra la cabeza del motivo | 2 → 3 |
| A | 5–12 | 6,7–20,0 | **Trompa solista: leitmotiv completo** (5–8); la flauta responde (9–12), semicadencia | 4 |
| A' | 13–20 | 20,0–33,3 | Violines con el leitmotiv rearmonizado; contracanto de trompa; cadencia rota y modulación a si menor | 5 → 6 |
| B | 21–28 | 33,3–46,7 | **Respiro.** Clarinete con el motivo en si menor; responde el oboe | 3 (mínimo de la pista) |
| Puente | 29–32 | 46,7–53,3 | Giro mágico a ♭VI–♭VII; secuencia de la cabeza del motivo; crescendo, redoble de timbal, plato | 4 → 8 |
| Retorno | 33–40 | 53,3–66,7 | Tutti de cámara: motivo en violines + flauta, bajo descendente; **clímax en el c. 37** | 9 → **10** (c. 37) → 7 |
| Codetta | 41–42 | 66,7–70,0 | Eco de la cabeza del motivo en la trompa; color lidio; vuelve al c. 1 | 4 → 2 |

Puntos de respiro: c. 4 (tiempo 3), c. 12 (tiempo 3), todo B y la codetta. El oído tiene que
descansar en B para que el retorno suene a llegada.

## 4. Armonía por sección

Cifrado por compás; «(1–2) / (3)» indica cambio de acorde en el tercer tiempo. Bajo entre
paréntesis cuando no es la fundamental.

**Intro (1–4)**: entrada desde la subdominante relativa, sin tónica todavía.

| 1 | 2 | 3 | 4 |
|---|---|---|---|
| Bm(add9) | Gmaj7 | Em9 | A7sus4 (1–2) / A7 (3) |

**A (5–12)**: periodo: antecedente cadencial + consecuente a semicadencia.

| 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|
| D | Bm7 | Em7 (1–2) / A7 (3) | D | Gmaj7 | F#m7 (1–2) / **B7** (3) (V/ii) | Em7 | A7sus4 (1–2) / A7 (3) |

**A' (13–20)**: rearmonización del motivo, **cadencia rota** en el c. 16 y modulación por V/V.

| 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|---|
| Dmaj7 | Gmaj7 | Em9 (1–2) / A13 (3) | **Bm** (V→vi) | Gmaj7 | **E7 (G#)** | A (1–2) / A (G) (3) | F#7sus4 (1–2) / F#7 (3) |

Bajo 18–20 por grados conjuntos: G# – A – G – F#.

**B (21–28)**: si menor.

| 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 |
|---|---|---|---|---|---|---|---|
| Bm | Gmaj7 | Em7 (1–2) / F#7 (3) | Bm | Bm (A) | Gmaj7 | Em7 (1–2) / C#ø7 (3) | F#7(♭9) |

**Puente (29–32)**: mediante cromática: el La# de F#7 se mantiene como Si♭ en B♭maj7.
♭VI–♭VII prestados de re menor dan el color de maravilla y aventura.

| 29 | 30 | 31 | 32 |
|---|---|---|---|
| **B♭maj7** (♭VI) | **Cmaj9** (♭VII) | Em9 | A7sus4 (1–2) / A7 (3) |

**Retorno (33–40)**: el motivo sobre un **bajo descendente** D – C# – B – A – D, y luego G – G – F# – B – E – A.

| 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 |
|---|---|---|---|---|---|---|---|
| D | A (C#) | Em7 (B) (1–2) / A7 (3) | D | **Gmaj7** (clímax) | A (G) | F#m7 (1–2) / Bm7 (3) | Em7 (1–2) / A7 (3) |

**Codetta (41–42)**: cierre plagal con color lidio, que encadena con el Bm(add9) del c. 1.

| 41 | 42 |
|---|---|
| D(add9) | Gmaj7(#11) (D), pedal de re |

## 5. Leitmotiv

Referencia (re mayor, grados 1 5 | 6 5 3 | 4 3 2 | 1). **Versión ternaria canónica de esta pista**
(negra = q, blanca = h, blanca con puntillo = h.):

```
| D  A    | B  A  F# | G  F#  E | D     |
| q  h    | q  q  q  | q  q   q | h.    |
```

| Compases | Instrumento | Notas (MIDI) | Transformación |
|---|---|---|---|
| 1–2 | Glockenspiel | D6 A5 · B5 A5 F#5 (86 81 · 83 81 78), q h · q q q | Solo la cabeza (dos primeros compases); el salto de 5.ª ascendente se invierte (4.ª descendente). Rearmonizado sobre Bm(add9) y Gmaj7: suena a recuerdo, no a tema. |
| **5–8** | **Trompa 1 solista** | **D4 A4 · B4 A4 F#4 · G4 F#4 E4 · D4 (62 69 · 71 69 66 · 67 66 64 · 62)** | Exposición completa, en su registro cálido, con el ritmo canónico. Debe poder cantarse al oírlo una vez. |
| 13–16 | Violines (ens.) | D5 A5 · B5 A5 F#5 · G5 F#5 E5 · D5 (74 81 · 83 81 78 · 79 78 76 · 74), anacrusa de corchea A4 (69) en el c. 12, tiempo 3 y | Octava superior y rearmonizado (Dmaj7, Gmaj7, Em9–A13); la **D final cae sobre Bm**: cadencia rota. |
| 21–24 | Clarinete | B3 F#4 · G4 F#4 D4 · E4 D4 C#4 · (C#4→)B3 (59 66 · 67 66 62 · 64 62 61 · 59) | **Modo menor** (si menor, mismos grados); la nota final llega con apoyatura C#4 (corchea con puntillo) → B3. Registro chalumeau, oscuro y tierno. |
| 29–31 | Flauta + violines al unísono | D5 A5 · E5 B5 · G5 F#5 E5 (74 81 · 76 83 · 79 78 76), q h · q h · q q q | **Fragmento y secuencia**: la cabeza 1→5 sube por grados (sobre B♭maj7 y Cmaj9), cierra con la cola del motivo. |
| 33–36 | Violines + flauta al unísono (glockenspiel en los tiempos 1) | D5 A5 · B5 A5 F#5 · G5 F#5 E5 · D5 | Tutti sobre el bajo descendente: misma melodía, armonía nueva (A/C#, Em7/B). |
| 37–40 | Violines + flauta | D6 (h.) · C#6 B5 A5 · A5 (h) F#5 · G5 F#5 E5 → D5 (c. 41) | Consecuente que **acaba con la cola del motivo** (4 3 2 → 1). D6 (86) del c. 37 es la nota más alta de la pista. |
| 41 | Trompa 1 | D4 (q) A4 (h) (62 69) | Eco de la cabeza, *p*: la puerta queda entreabierta. |

## 6. Orquestación por sección

Registros en MIDI (C4 = 60). Patches por nombre del catálogo. «Quiet» = variante `-Quiet` del patch.
Las velocidades se escalan por dinámica (ver §7); la forma de cada nota larga se hace con **CC11**.

### Intro (1–4): máximo 4 capas

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| Fragmento del motivo | `Glockenspiel` | 78–86 | Solo c. 1–2, notas sueltas, *p*. Nada más de glockenspiel hasta el c. 13. |
| Armonía y movimiento | `Harp` | 47–78 | Acorde arpegiado (rolled, ~60 ms entre notas) en el tiempo 1 + negras ascendentes en 2–3. |
| Halo agudo | `ViolinEnsSusVib-Quiet` | 74–81 | Notas comunes tenidas (D5+F#5 → D5+F#5 → D5+G5 → E5+G5), *pp*, crescendo leve en el c. 4. |
| Bajo | `CelloEnsSusVib-Quiet` | B2 G2 E2 A2 (47 43 40 45) | Redondas con puntillo, *pp*. |

### A (5–12): máximo 6 capas

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía 5–8** | `FHornSus` (pista «Trompa 1») | 62–71 | Legato cantabile, *mp*. Pequeño swell (< >) en cada blanca. Respiración de corchea al final del c. 8. Calla en 9–12. |
| **Melodía 9–12** (consecuente) | `FluteSusVib` | 69–76 | *mp*. Contorno: B4 (h) D5 (q) · C#5 A4 D#5 · E5 (h.) · E5 (h) C#5 (q), que enlaza con el D5 de los violines en el c. 13. |
| Arpegio | `Harp` | 38–61 (≤ C#4 mientras canta la trompa) | Fundamental grave en el tiempo 1 + corcheas ascendentes por el acorde. Nunca en la octava de la melodía. |
| Relleno interior | `ViolaEnsSusVib-Quiet` | 50–57 | Notas guía tenidas (3.ª/7.ª de cada acorde), *p*. |
| Bajo | `CelloEnsSusVib-Quiet` | 38–50 | Fundamentales tenidas, *p*. |
| Pulso | `ContrabassPizz` | 38–45 (D2–A2) | Fundamental en el tiempo 1 de cada compás, *p*. |

### A' (13–20): máximo 7 capas

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía** | `ViolinEnsSusVib` | 69–83 | Legato, *mp* → *mf* en 17–19, diminuendo en 20. Consecuente 17–20: B5 (h) A5 (q) · G#5 E5 B5 · A5 (h) G5 (q) · F#5 (h) E5 (q), que enlaza con el D5 del pad del c. 21. |
| Contracanto | `FHornSus` (Trompa 1) | 62–69 | Notas largas (blancas y blancas con puntillo) que se mueven cuando la melodía se para: p. ej. F#4 · D4–E4 · E4–C#4 · D4 en 13–16. *mp*. |
| Pulso ligero | `ViolaEnsPizz` | 57–66 | Tiempos 2 y 3, notas del acorde, *p*. Aquí entra el pizzicato que da la marcha ternaria. |
| Arpegio | `Harp` | 38–68 (nunca por encima de G#4) | Igual que en A. |
| Bajo | `CelloEnsSusVib` | 38–50 | Arco tenido, *mp*; dibuja el bajo G# – A – G – F# en 18–20. |
| Pulso grave | `ContrabassPizz` | 38–45 | Tiempo 1. |
| Destellos | `Glockenspiel` | 79–86 | Solo la primera nota de los c. 13, 14, 15 (D6, B5, G5), *p*. |

### B (21–28): máximo 5 capas. Respiro.

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía 21–24** | `ClarinetSus` | 59–67 | Motivo en si menor, *p* dolce. En 25–28 pasa a armonía tenida bajo el oboe: F#4 · D4 · E4 · C#4 (66 62 64 61). |
| **Respuesta 25–28** | `OboeSusVib` | 66–74 | *p*, cantabile: D5 (h) C#5 (q) · B4 (h) F#4 (q) · G4 A4 B4 · **A#4 (h.)**, que se liga como B♭4 al tiempo 1 del c. 29 (nota pivote de la mediante cromática) y se suelta. |
| Halo | `ViolinEnsSusVib-Quiet` | 74–78 | Solo c. 21–24: D5 + F#5 tenidos, *pp*, por encima del clarinete. Calla en 25–28, que es el registro del oboe. |
| Arpegio lento | `Harp` | 35–66 | Acorde arpegiado en el tiempo 1 + una sola nota aguda (≤ 78) en el tiempo 3. Mucho espacio. |
| Bajo | `CelloEnsSusVib-Quiet` | 45–47 | Fundamentales tenidas (B2, A2 en el c. 25, G2, E2, F#2). Sin contrabajo ni pizzicato. |

### Puente (29–32): máximo 8 capas

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía** | `FluteSusVib` + `ViolinEnsSusVib` al unísono | 74–83 | Secuencia de §5, *p* → *mf*. En el c. 32 A5 (81) tenido toda la barra, con crescendo. |
| Sostén | `FHornSus` (Trompa 1) | 65–69 | F4 · G4 · G4 · A4, blancas con puntillo con swell creciente. |
| Armonía | `ViolaEnsTrem` | 53–62 | Trémolo de acorde, *pp* → *mf*. |
| Bajo | `CelloEnsSusVib` + `ContrabassSusVB` (octava) | Vc. 46 48 40 45 · Cb. 34 36 28 33 | Tenidos. Todo en rango del contrabajo (≥ 24). |
| Arpa | `Harp` | 38–74 | Arpegios en corcheas; **glissando ascendente en el c. 32, tiempo 3** (escala de re mayor D3 → D6, 50 → 86, ~16 notas). |
| Redoble | `TimpaniRolls` | A2 (45) | C. 31–32, *pp* → *mf*; corta justo en el tiempo 1 del c. 33. |
| Plato | `GM-StylePerc`, *suspended cymbal crescendo* (`susCymb1-cresc`) | — | Alineado para que el pico llegue al tiempo 1 del c. 33. El orquestador comprueba la nota en el `.sfz`. Un solo plato en toda la pista. |

### Retorno (33–40): máximo 10 capas (tutti de cámara)

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía** | `ViolinEnsSusVib` + `FluteSusVib` al unísono | 74–86 | *mf* → **f** en el c. 37 → *mp* en el 40. La flauta dobla al unísono, **no a la octava** (fuera del agudo estridente). En el c. 36, tiempos 2–3, la flauta sube a la cumbre en corcheas: F#5 G5 A5 B5 (78 79 81 83). |
| Contracanto | `FHornSus` (Trompa 1) | 61–71 | F#4 (h.) · E4 (h) C#4 (q) · D4 (h) C#4 (q) · D4 F#4 A4 · B4 (h.) · A4 (h.) · A4 (h) F#4 (q) · E4 (h) C#4 (q) → D4 del eco del c. 41. *mf*. |
| Armonía de trompas | `FHornSus` (pista «Trompa 2») | 57–62 | Solo c. 33–38, tercera o sexta por debajo de la Trompa 1, *mp*. |
| Armonía interior | `ViolaEnsSusVib` | 53–66 | Notas guía tenidas, *mf*. |
| Bajo | `CelloEnsSusVib` | 45–50 | Arco: D3 C#3 B2–A2 D3 · G2 G2 F#2–B2 E2–A2 (50 49 47 45 50 · 43 43 42 47 40 45). |
| Bajo grave | `ContrabassSusVB` | 28–38 | Una octava por debajo del violonchelo: 38 37 35 33 38 · 31 31 30 35 28 33. |
| Arpegio | `Harp` | 38–74 | Corcheas ascendentes, siempre por debajo de la melodía. |
| Timbal | `Timpani` | D2 (38), A2 (45) | Golpes sueltos en el tiempo 1 de los c. 33 (D2), 35 (A2, tiempo 3), 36 (D2), 37 (D2, el más fuerte). Nada más. |
| Destellos | `Glockenspiel` | 81–88 | Tiempo 1 de los c. 33, 34, 37: D6, B5, D6 + E6 (88) en el c. 37 como única nota por encima de la melodía. |

### Codetta (41–42): máximo 5 capas

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| Eco del motivo | `FHornSus` (Trompa 1) | 62–69 | D4 (q) A4 (h), *p* con diminuendo. |
| Final de la melodía | `ViolinEnsSusVib-Quiet` | 74–78 | D5 tenido en el c. 41; F#5 en el c. 42; suelta en el **tiempo 3 del c. 42**. |
| Arpa | `Harp` | 50–81 | Arpegio ascendente en corcheas que atraviesa el c. 42 sobre Gmaj7(#11): G3 B3 D4 F#4 C#5 A5. |
| Color lidio | `Glockenspiel` | C#6 (85) | Una sola nota en el tiempo 1 del c. 42, *pp*. |
| Pedal | `CelloEnsSusVib-Quiet` + `ContrabassPizz` | Vc. D3 (50) 41–42 · Cb. D2 (38) solo en el tiempo 1 del c. 41 | Diminuendo a *pp*. |

### Notas sobre los samples

- **Sin celesta en el catálogo.** Su papel lo hacen el glockenspiel (con mucha moderación: 1 capa,
  muy brillante) y el arpa en el registro agudo. No usar `Xylophone` ni `TubularBells` en esta pista.
- **Sin trompeta, trombón ni tuba**: la trompeta mete demasiada energía en 2,5–6 kHz y el metal grave
  vuelve sinfónico lo que debe ser de cámara. La única voz de metal es la trompa (8 capas, el mejor
  patch dinámico del catálogo: que sea la protagonista).
- **Dejar respirar los sostenidos**: las notas de melodía de blanca o más duran su valor completo
  (sin acortar al 90 %). El vibrato y el ataque ya vienen en el sample: no añadir vibrato por CC ni
  ataques artificiales. Entre frases de viento, al menos una corchea de silencio.
- Violines y violas `-Quiet` (1 capa) para *pp*–*p*; patch normal (2 capas) para *mp* en adelante.
  No cambiar de patch en mitad de una nota tenida.
- Arpa y glockenspiel tienen 1 capa: la dinámica solo cambia el volumen, no el timbre. Por eso el
  arpa nunca pasa de *mf*.
- No usar ningún `-KS` (el sampler no soporta keyswitches).

## 7. Dinámica

Escala de velocidades MIDI por nivel (orientativa; CC11 hace la forma dentro de la nota):

| Nivel | pp | p | mp | mf | f |
|---|---|---|---|---|---|
| Velocidad | 25–40 | 40–55 | 55–70 | 70–85 | 85–100 |

No se usa *ff* (velocidad > 105 prohibida).

| Sección | Nivel | Gestos |
|---|---|---|
| Intro 1–4 | pp → p | CC11 de los violines en crescendo leve en el c. 4, que abre hacia la trompa. |
| A 5–12 | p (acompañamiento) / mp (trompa, flauta) | Swell < > de ~15 % de CC11 en cada blanca de la trompa; la flauta igual en el c. 11. |
| A' 13–20 | mp → mf (17–19) → mp (20) | Arco largo de crescendo en violines 17–19 y diminuendo en el 20 hasta el p del c. 21. |
| B 21–28 | p / pp | Plano. La única curva: el oboe hace < > en el c. 28 sobre A#4. |
| Puente 29–32 | p → mf | Crescendo continuo en 4 compases (CC11 lineal en cuerdas y trompa). Redoble y plato a partir del c. 31. |
| Retorno 33–40 | mf → **f (c. 37)** → mp (c. 40) | Pico en el tiempo 1 del c. 37; a partir de ahí, diminuendo por compases. |
| Codetta 41–42 | p → pp | Todo lo tenido se apaga hacia el tiempo 3 del c. 42. |

## 8. Criterios de aceptación

**Partitura (se comprueba leyendo `build/menu.mid`):**

1. 42 compases de 3/4 a ♩ = 108 sin cambios de tempo; ninguna nota empieza después de 70,00 s.
2. Todas las notas dentro del rango del catálogo de su patch y de los registros de §6. Techos:
   violines y flauta ≤ 86 (D6), trompa ≤ 71 (B4); glockenspiel entre 78 y 88.
3. El leitmotiv aparece con las alturas exactas de §5 en los c. 5–8 (Trompa 1), 13–16 (violines),
   21–24 (clarinete) y 33–36 (violines + flauta).
4. Ninguna figura más corta que la corchea, salvo el glissando de arpa del c. 32.
5. Capas simultáneas (pistas con notas sonando) por sección ≤ 4 / 6 / 7 / 5 / 8 / 10 / 5
   (intro / A / A' / B / puente / retorno / codetta).
6. **Sin choques de registro**: mientras suena una melodía de §5, ninguna otra pista mantiene notas de
   negra o más en la misma octava que la melodía con velocidad ≥ la de la melodía. Excepción: los
   unísonos declarados (flauta + violines en 29–40) y el oboe y el clarinete en 25–28 (melodía y
   armonía a distancia de tercera o sexta, clarinete al menos 10 de velocidad por debajo).
7. Ninguna velocidad > 105. El c. 37 contiene la velocidad más alta de violines, trompa y timbal.
8. Ninguna nota tenida cruza la costura: todo lo que suena en el c. 42 termina antes de 70,00 s
   (las colas las pliega `render()`).

**Mezcla (se comprueba con el informe de `mix.py`):**

9. Sonoridad integrada **−17 LUFS ± 1**; pico real **≤ −1 dBTP**.
10. `loop_samples` = 3 087 000; `seam_jump` < 0,02 y ningún clic audible al pasar del c. 42 al c. 1.
11. Contraste: la sonoridad de los c. 33–38 (53,3–63,3 s) es entre 6 y 10 LU mayor que la de los
    c. 21–26 (33,3–43,3 s). Si es menos de 6, B no respira; si es más de 10, el clímax salta del menú.
12. Bandas (`bands_db`, relativas al total): `presencia 2.5-6k` ≤ −18 dB, `aire 6-16k` ≤ −28 dB y
    `sub <60` ≤ −20 dB. Son un primer listón: se recalibran tras la primera entrega si la escucha lo pide.
13. Escucha: la trompa de los c. 5–8 se entiende sola, sin que la tape el arpa; el glockenspiel
    nunca pincha más que la melodía; el plato del c. 32 no se oye como ruido blanco.

**Integración (cuando se apruebe):** copiar a `src/audio/menu.mp3` y actualizar `loopSamples` de
`'menu'` en `src/fx/music-tracks.ts` (de 3 307 500 a **3 087 000**).
