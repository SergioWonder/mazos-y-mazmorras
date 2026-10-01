# Brief: Acto I, jefe del escenario 0, Gorzug el Jefe Ogro — «El festín de Gorzug»

Combate de jefe del Asentamiento Ogro. Id de juego: `cap1-e0-jefe`. Pista nueva en `scripts/musica/acto1-gorzug/`
con las convenciones del [README del estudio](../../scripts/musica/estudio/README.md): `compose.py` →
`build/acto1-gorzug.mid`, `mix.py` → `build/acto1-gorzug.mp3`. Necesita montado el disco **Base** (VCSL y
Sonatina). Referencias: [menu.md](menu.md) (formato) y [acto1-ogros.md](acto1-ogros.md) (el escenario del que
viene: comparte la forja, los tambores y la agrupación 3+3+2).

## 1. Función, emoción y repetición

- **Dónde suena:** solo en el combate contra Gorzug. Su rasgo es *Devorador*: invoca goblins famélicos y
  **se los come** para curarse y enfurecerse.
- **Emoción:** cambio radical respecto al escenario. Mucho más oscuro, dramático y peligroso; ritmo frenético
  de batalla épica con **peso**: metales graves, coro, tambores, cuerdas en *spiccato*. Es el primer jefe y el
  primer aviso de que la aventura no es como te la habían pintado. Tensión, nunca ruido.
- **Idea central: el festín.** El leitmotiv se presenta entero y se va **devorando**: en cada nueva aparición
  pierde notas, y la última la sustituye un «mordisco» de la orquesta (golpe grave y silencio). Un segundo
  motivo, el **«goblin»** (la cabeza del leitmotiv en semicorcheas, agudo y nervioso), aparece una y otra vez y
  cada vez dura menos antes de que lo corte el mordisco.
- **Repetición:** un combate de jefe dura 3–8 minutos (3–6 vueltas). Clímax en el c. 41 y una sección de
  tensión baja (B) que deja respirar sin perder el pulso.
- **Transformación del leitmotiv:** **re menor** (el mismo tónico que el menú, oscurecido: el tema del héroe
  visto desde dentro de la boca del ogro), metido en la rejilla rítmica **3+3+2**, fragmentado, aumentado en el
  clímax y disminuido en el motivo goblin (ver §5).

## 2. Tempo, métrica, tonalidad, duración

| Parámetro | Valor |
|---|---|
| Tempo | ♩ = 160, fijo |
| Métrica | 4/4, con la corchea agrupada **3+3+2** («el paso del ogro»: acentos en las corcheas 0, 3 y 6 de cada compás) |
| Tonalidad | re menor (eólico) con ♭II (Mi♭) frigio/napolitano, ♭V (La♭) y préstamos cromáticos (Fm, B♭m) |
| Compases | **56** |
| Duración del bucle | 56 × 4 × 60/160 = **84,000 s** → `loop_samples` = **3 704 400** a 44,1 kHz |
| `MixSpec` | `bpm=160`, `beats_per_bar=4`, `bars=56` |

Un compás dura 1,5 s. **Rejillas:** corcheas numeradas 0–7 por compás; semicorcheas 0–15.
**Figuras:** melodía de metales y coro, corchea mínima; semicorchea solo en el motivo goblin (clarinete y
xilófono), en las cuerdas en *spiccato* y en los rellenos de tambor. Nada más rápido.

## 3. Forma compás a compás e intensidad

| Sección | Compases | Tiempo (s) | Contenido | Intensidad |
|---|---|---|---|---|
| Intro | 1–4 | 0–6 | Tam-tam, «estómago» de contrafagot, ostinato 3+3+2; llamada de guerra de trompas | 5 → 6 |
| A «La marcha del glotón» | 5–12 | 6–18 | **Motivo completo** en metales graves (5–8); respuesta descendente al napolitano y A7(♭9) (9–12) | 7 |
| A' «El primer bocado» | 13–20 | 18–30 | Violines con el motivo; **su última nota la sustituye el mordisco** (c. 16); los goblins aparecen (17–20) | 8 |
| B «La despensa» | 21–28 | 30–42 | **Respiro tenso.** Pedal de re, armonías cada vez más oscuras; el motivo goblin, devorado cada vez antes | 5 (mínimo) |
| Puente «Hambre» | 29–36 | 42–54 | Bajo cromático ascendente re → la; secuencia de la cabeza; entra el coro (33) | 6 → 9 |
| Clímax «El festín» | 37–48 | 54–72 | Motivo en **aumentación** (coro, trompas, trombones, violines); bajo de lamento; **clímax en el c. 41** (60 s), napolitano; coda de mordiscos (45–48) | 9 → **10** (c. 41) → 9 |
| Codetta «Sobremesa» | 49–56 | 72–84 | Cabeza del motivo en tuba; más goblins; A7(♭9) que encadena con el tam-tam del c. 1 | 7 → 5 |

Silencios estructurales: c. 16, corcheas 1–7 (solo queda el ostinato *pp* y el rascado de gong); c. 28,
tiempo 1 (mordisco seco antes del crescendo). Son parte del tema: no se rellenan.

## 4. Armonía

Cifrado por compás. «→ X (corchea 6)» = el acorde cambia en la corchea 6 (tiempo 4), siguiendo la rejilla
3+3+2. Bajo entre paréntesis cuando no es la fundamental.

**Intro (1–4)**

| 1 | 2 | 3 | 4 |
|---|---|---|---|
| Dm | Dm | E♭/D (♭II sobre pedal) | Dm → C#°7 (corchea 6) |

**A (5–12)**: el motivo con su armonía (5–8), respuesta que baja por Gm – Dm/F – **E♭maj7** (napolitano) –
A7(♭9) (9–12).

| 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|
| Dm | B♭ | Gm7 → A7 (corchea 6) | Dm | Gm | Dm/F | **E♭maj7** | A7(♭9) |

**A' (13–20)**: rearmonizado (B♭maj7, ♭VII → V), el mordisco del c. 16 sobre B♭/D, y una cadena que acaba en
**B♭7 → A7** (sexta aumentada).

| 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|---|
| Dm(add9) | B♭maj7 | C → A7 (corchea 6) | **B♭/D** (golpe en la corchea 0) | Gm | A7/G | Dm/F | B♭7 (1–2) / A7 (3–4) |

**B (21–28)**: pedal de re; por encima, ♭II, la sensible en el acorde (Dm(maj7)) y el tritono (**A♭/D**).

| 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 |
|---|---|---|---|---|---|---|---|
| Dm | E♭/D | Dm | Dm(maj7) | Gm/D | **A♭/D** | Gm/D | A7(♭9) (la pedal pasa a la) |

**Puente (29–36)**: bajo **cromático ascendente** D – E♭ – E – F – G – A♭ – A – A; cada compás, su tríada.

| 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 |
|---|---|---|---|---|---|---|---|
| Dm | E♭ | Em | F | Gm | A♭ | A7(♭13) | A7(♭9) (1–2) / A7 (3–4) |

**Clímax (37–48)**: el motivo aumentado sobre un **bajo de lamento** D – C – B♭ – A – A♭ – G – F – E – D;
**Fm/A♭** prestado (c. 40) y **napolitano en primera inversión** (E♭/G) en el clímax del c. 41, que va a V por
B♭/F – A7/E. Cierre engañoso en B♭maj7 (44) y coda de mordiscos sobre la pedal (45–48).

| 37 | 38 | 39 | 40 | 41 | 42 | 43 | 44 |
|---|---|---|---|---|---|---|---|
| Dm | F/C | Gm/B♭ (1–2) / F/A (3–4) | **Fm/A♭** | **E♭/G** (1–2) / B♭/F (3–4) | A7/E | Dm | B♭maj7 |

| 45 | 46 | 47 | 48 |
|---|---|---|---|
| Dm | E♭/D | B♭maj7/D | A7(♭9) |

**Codetta (49–56)**: distinta de la intro, para que la costura 56 → 1 sea V → i y no se oigan ocho compases iguales.

| 49 | 50 | 51 | 52 | 53 | 54 | 55 | 56 |
|---|---|---|---|---|---|---|---|
| Dm | Dm | E♭/D | Dm | Gm/D | A♭/D | Dm → C#°7 (corchea 6) | A7(♭9) |

## 5. Leitmotiv

Referencia (re mayor, grados 1 5 | 6 5 3 | 4 3 2 | 1). **Versión de esta pista: «el paso del ogro»**, re menor
sobre la rejilla 3+3+2 (posición de corchea : duración en corcheas):

```
| D     A        | Bb    A     F   | G     F     E   | D (o el mordisco) |
| 0:3   3:5      | 0:3   3:3   6:2 | 0:3   3:3   6:2 | 0:8               |
```

**Motivo goblin**: la cabeza (1 5 6 5 3) en disminución, cuatro semicorcheas + corchea (semicorcheas 0, 1, 2, 3 y
4–5), en los tiempos 1–2. Lo corta el **mordisco** (definido en §6).

| Compases | Instrumento | Notas (MIDI) | Transformación |
|---|---|---|---|
| 3–4 | Horns Marcato | E♭4 B♭4 · D4 A4 G4 (63 70 · 62 69 67), rejilla 0:3 3:5 · 0:3 3:3 6:2 | «Llamada de guerra»: la cabeza primero sobre el ♭II, luego sobre la tónica. |
| **5–8** | **Trombones Marcato + Horns Marcato 8va** | **Tbn. D3 A3 · B♭3 A3 F3 · G3 F3 E3 · D3 (50 57 · 58 57 53 · 55 53 52 · 50); Tpas. 62 69 · 70 69 65 · 67 65 64 · 62** | Exposición completa: modo menor + rejilla 3+3+2. Las notas caen en los mismos acentos que el ostinato y el bombo: es un *riff*. |
| 9–12 | Trombones Marcato + Horns Marcato 8va | Tbn. B♭3 A3 G3 · A3 G3 F3 · G3 F3 E♭3 · E3 C#3 A2 (58 57 55 · 57 55 53 · 55 53 51 · 52 49 45); Tpas. +12 | Respuesta: la célula 5-4-3 del motivo secuenciada hacia abajo, con el Mi♭ napolitano. |
| 13–16 | 1st Violins Marcato + Horns Marcato 8vb | Vl. D5 A5 · B♭5 A5 F5 · G5 F5 E5 · — (74 81 · 82 81 77 · 79 77 76); Tpas. −12 | **Primera devoración**: falta la D final; en su lugar, el mordisco del c. 16. |
| 17–20 | ClarinetStac + Xylophone | Goblin: G4 D5 E♭5 D5 B♭4 · A4 E5 F5 E5 C#5 · D5 A5 B♭5 A5 F5 · B♭4 F5 G5 F5 D5 (67 74 75 74 70 · 69 76 77 76 73 · 74 81 82 81 77 · 70 77 79 77 74) | Disminución; mordisco en el tiempo 3 de cada compás. |
| 21–27 | ClarinetStac + Xylophone | 21: 74 81 82 81 77 · 22: 75 82 84 82 79 · 23: 74 81 82 81 77 · 24: 74 81 82 81 73 · 25: 67 74 75 74 · 26: 68 75 77 · 27: 67 74 | **Devorado cada vez antes**: 21–24 completo (mordisco en la semicorchea 8); 25 sin la última nota (mordisco en la 4); 26 tres notas (mordisco en la 3); 27 dos notas (mordisco en la 2); 28 ya no hay goblin. En el c. 24 la última nota es la sensible C#5. |
| 29–36 | Horns Marcato (29–32), 1st Violins Marcato (33–36) | D4 A4 B♭4 · E♭4 B♭4 C5 · E4 B4 C5 · F4 C5 D5 · G4 D5 E♭5 · A♭4 E♭5 F5 · A4 E5 F5 · C#5 E5 G5 (62 69 70 · 63 70 72 · 64 71 72 · 65 72 74 · 67 74 75 · 68 75 77 · 69 76 77 · 73 76 79), rejilla 0:3 3:3 6:2 | **Fragmento** (cabeza 1-5-6) en secuencia cromática ascendente sobre el bajo; el c. 36 arpegia A7 hacia la D del c. 37. |
| **37–44** | **Large Chorus (voz superior) + Horns Sustain; Trombones Sustain 8vb; `ViolinEnsSusVib` 8va** | **D4 (w) · A4 (w) · B♭4 (h) A4 (h) · F4 (w) · G4 (h) F4 (h) · E4 (w) · D4 (w) · D4 (w, reatacada) (62 · 69 · 70 69 · 65 · 67 65 · 64 · 62 · 62)** | **Aumentación**: una nota por compás. El gigante canta el tema del héroe. La G4 del c. 41 sobre E♭/G es el clímax. |
| 45–48 | Horns Marcato | 45: D4 A4 B♭4 A4 F4 (corcheas 0–4) · 46: E♭4 B♭4 C5 B♭4 (0–3) · 47: D4 A4 (0–1) · 48: — | Coda de mordiscos: el motivo en corcheas, **devorado** antes en cada compás (mordisco en las corcheas 6, 4, 2 y 0). |
| 49–56 | Tuba Marcato + Bass Trombone Marcato | D2 A2 · — · E♭2 B♭2 · — · G2 D3 · A♭2 E♭3 · D2 A2 G2 · A2 (38 45 · 39 46 · 43 50 · 44 51 · 38 45 43 · 45), rejilla 0:3 3:5 | Solo la cabeza (1 → 5), en el sótano: lo que queda del tema después del festín. |
| 51, 53 | ClarinetStac + Xylophone | 51: 75 82 84 82 79 · 53: 67 74 75 74 70 | Llegan más goblins (Gorzug los invoca). Mordisco en el tiempo 3. |

## 6. Orquestación por sección

### Patches

| Nombre corto | Ruta `.sfz` | Dinámica |
|---|---|---|
| `CelloEnsSpic` / `ContrabassSpic` | `VSCO-2-CE/CelloEnsSpic.sfz` / `ContrabassSpic.sfz` | velocidad |
| `ViolinEnsTrem` / `ViolinEnsSusVib` | `VSCO-2-CE/ViolinEnsTrem.sfz` / `ViolinEnsSusVib.sfz` | velocidad |
| `ViolaEnsTrem` / `ViolaEnsSpic` | `VSCO-2-CE/ViolaEnsTrem.sfz` / `ViolaEnsSpic.sfz` | velocidad |
| `ContrabassTrem` | `VSCO-2-CE/ContrabassTrem.sfz` | velocidad |
| `ClarinetStac` | `VSCO-2-CE/ClarinetStac.sfz` | velocidad |
| `Timpani` / `TimpaniRolls` | `VSCO-2-CE/Timpani.sfz` / `TimpaniRolls.sfz` | velocidad |
| Horns Marcato / Horns Sustain | `sso/Sonatina Symphonic Orchestra/Brass - Performance/Horns Marcato.sfz` / `Horns Sustain.sfz` | **CC1** |
| Trombones Marcato / Trombones Sustain | `…/Brass - Performance/Trombones Marcato.sfz` / `Trombones Sustain (looped).sfz` | **CC1** |
| Trombones Staccato | `…/Brass - Performance/Trombones Staccato.sfz` | velocidad |
| Bass Trombone Marcato / Sustain | `…/Brass - Performance/Bass Trombone Solo Marcato.sfz` / `Bass Trombone Solo Sustain (looped).sfz` | **CC1** |
| Tuba Marcato | `…/Brass - Performance/Tuba Marcato.sfz` | **CC1** |
| 1st Violins Marcato | `sso/Sonatina Symphonic Orchestra/Strings - Performance/1st Violins Marcato.sfz` | **CC1** |
| Celli Col Legno / Basses Col Legno / Violas Col Legno | `…/Strings - Performance/Celli Col Legno.sfz` / `Basses Col Legno.sfz` / `Violas Col Legno.sfz` | velocidad |
| Large Chorus | `sso/Sonatina Symphonic Orchestra/Chorus - Performance/Large Chorus.sfz` | **CC1** |
| Contrabassoon Sustain / Staccato | `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Contrabassoon Solo Sustain (looped).sfz` / `Contrabassoon Solo Staccato.sfz` | **CC1** / velocidad |
| Tam-tam | `sso/Sonatina Symphonic Orchestra/Percussion/Cymbals & Tamtam.sfz`, nota **57** (tamtam-a) | velocidad |
| Xylophone | `VCSL/Idiophones/Struck Idiophones/Xylophone - Soft Mallets.sfz` | velocidad |
| Bass Drum | `VCSL/Membranophones/Struck Membranophones/Bass Drum 2.sfz` (62 = golpe) | velocidad |
| Tom | `VCSL/Membranophones/Struck Membranophones/Tom 2.sfz` (62 = golpe con maza) | velocidad |
| Forja | `VCSL/Idiophones/Struck Idiophones/Brake Drum.sfz` (61 = martillo, 65 = martillo sobre el segundo tambor; no el `Anvil`, ver acto1-ogros.md) | velocidad |
| Cymbal | `VCSL/Idiophones/Struck Idiophones/Suspended Cymbal 2.sfz` (64 = crescendo de 4 s, 66 = golpe) | velocidad |
| Gong | `VCSL/Idiophones/Struck Idiophones/Gong 1.sfz`, nota **62** (rascado) | velocidad |

(`…/` = `sso/Sonatina Symphonic Orchestra/`.)

**Sonatina (CC1)**: Horns Marcato, Horns Sustain, Trombones Marcato, Trombones Sustain, Bass Trombone
Marcato/Sustain, Tuba Marcato, 1st Violins Marcato, Large Chorus y Contrabassoon Sustain **tienen que llevar
curva de CC1** (punto en el tick 0 y forma de cada frase, como mucho un punto cada 1/8 de compás); en ellos la
velocidad no cuenta. Duración máxima por nota en los patches sin bucle: Horns Sustain/Marcato ≤ 2,8 s (la D4
ligada de 43–44 se reataca en el c. 44), Trombones Marcato ≤ 2,2 s, 1st Violins Marcato ≤ 3,5 s,
Bass Trombone Marcato ≤ 2,8 s. Los `(looped)` y el coro no tienen límite.

**El mordisco** (un acorde corto, de corchea, en la posición que diga cada sección, sobre la fundamental del
momento): Contrabassoon Staccato (fundamental, 34–45) + Celli Col Legno (fundamental y quinta, 38–52) +
Basses Col Legno (fundamental, 26–38) + Bass Drum 62. En A', clímax y 45–48 se añade Trombones Staccato
(acorde completo, 45–60). Velocidades: *mf* en B, *f* en el resto.

**Ostinato 3+3+2**: `CelloEnsSpic` en corcheas, la fundamental en octava 2 en los acentos (0, 3, 6) y en octava 3
en el resto; `ContrabassSpic` **solo en los acentos**. En el puente (33–36) los violonchelos pasan a
semicorcheas con acentos en las semicorcheas 0, 6, 12.

### Intro (1–4): máximo 8 capas

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| Ostinato | `CelloEnsSpic` | D2/D3 (38/50) | 3+3+2 desde el c. 1, *p* → *mp*. Es la misma figura con la que acaba el c. 56. |
| Estómago | Contrabassoon Sustain | D2 (38) | Tenido 1–4, CC1 60 → 75. |
| Gong del festín | Tam-tam 57 | — | Tiempo 1 del c. 1, *mp*. |
| Timbal | `Timpani` | D2 (38) | Acentos 0, 3, 6 en los c. 3–4, *p* → *mp*. |
| Llamada | Horns Marcato | 62–70 | §5, CC1 85. |
| Armonía | `ViolaEnsTrem` | 49–55 | C. 3: E♭3+G3; c. 4: D3+F3 → C#3+E3 en la corchea 6. *pp* → *p*. |
| Bombo | Bass Drum 62 | — | C. 4, acentos 0, 3, 6, *mp*. |

### A (5–12): máximo 11 capas

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía** | Trombones Marcato | 45–58 | §5, CC1 100. |
| **Melodía 8va** | Horns Marcato | 57–70 | §5, CC1 100. |
| Ostinato | `CelloEnsSpic` + `ContrabassSpic` | Vc. 38–55 · Cb. 26–45 | 3+3+2 sobre la fundamental, *mf*. |
| Pedal del miedo | `ViolinEnsTrem` | A5 / B♭5 (81 / 82) | Semitono que oscila: c. 5 A5 · 6 B♭5 · 7 B♭5 · 8 A5 · 9 B♭5 · 10 A5 · 11 B♭5 · 12 B♭5. *mp*, swell de CC11 < > por compás. |
| Bajo | Tuba Marcato | 38–46 | Fundamental en la corchea 0, CC1 90. |
| Bombo | Bass Drum 62 | — | Acentos 0, 3, 6, *mf*. |
| Tom | Tom 62 | — | Corchea 4 (tiempo 3) de cada compás, *mp*; semicorcheas 12–15 en los c. 8 y 12. |
| Timbal | `Timpani` | 38–46 | Fundamental en la corchea 0: D2 B♭2 G2 D2 · G2 F2 E♭2 A2, *mf*. |
| Forja | Forja 61 | — | Corchea 7 de los c. 6, 8, 10, 12, velocidad ≤ 75. |
| Gong | Tam-tam 57 | — | Tiempo 1 del c. 5, *mf*. |

### A' (13–20): máximo 11 capas

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía 13–15** | 1st Violins Marcato | 74–82 | CC1 100. |
| **Melodía 8vb 13–15** | Horns Marcato | 62–70 | CC1 95. |
| Golpes 13–15 | Trombones Marcato | 45–58 | Acorde en los acentos 0, 3, 6 (corcheas), CC1 90. |
| **Mordisco del c. 16** | Tutti: Trombones Marcato (D3 F3 B♭3), Horns Marcato (D4 F4 B♭4), Tuba Marcato D2, el mordisco completo, `Timpani` D2 *f*, Tam-tam 57 *f* | — | Todo en la corchea 0 del c. 16 y **silencio** en las corcheas 1–7. Solo siguen el ostinato de violonchelos, **subito *pp***, y el Gong 62 (rascado) *pp*. |
| **Goblin 17–20** | `ClarinetStac` + Xylophone | 67–82 | §5. Clarinete *mp*, xilófono *p* (10 por debajo). |
| Mordisco 17–20 | el mordisco + Trombones Staccato | — | Tiempo 3 (semicorchea 8) de cada compás, *f*. |
| Ostinato | `CelloEnsSpic` (+ `ContrabassSpic` en 13–15) | — | 3+3+2, *mf*; en 17–20 *mp*. |
| Armonía | `ViolaEnsTrem` | 50–62 | Notas guía, *p*. |
| Timbal | `Timpani` | 38–45 | 13–15 en la corchea 0; 17–20 junto con el mordisco. |
| Bombo y tom (13–15) | Bass Drum · Tom | — | Como en A. |

### B «La despensa» (21–28): máximo 9 capas

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Goblin** | `ClarinetStac` + Xylophone | 67–84 | §5 (devorado cada vez antes). *mp* / *p*. |
| Mordisco | el mordisco (sin trombones) | — | En la posición de §5; *mf*. C. 28: en la corchea 0. |
| Pedal | `ContrabassTrem` | D2 (38) | Tenida 21–27, *pp*, swell de CC11 cada 2 compases; pasa a A2 (45) en el c. 28. |
| Esqueleto | Violas Col Legno | D3 / A3 (50 / 57) | Corcheas 0, 3, 6 (3+3+2), *pp*: el pulso no se para. |
| Armonía | `ViolaEnsTrem` | 53–65 | Las notas que definen cada acorde sobre la pedal (E♭–G–B♭; C#; G–B♭; A♭–C–E♭), *pp*. |
| Timbal | `Timpani` | D2 (38) | Tiempo 1 de 21, 23, 25, 27, *p*. |
| Rascado | Gong 62 | — | Tiempo 1 del c. 26 (A♭/D), *pp*. |
| Crescendo (c. 28) | Trombones Sustain + Horns Sustain | Tbn. 45–58 · Tpas. 57–70 | A7(♭9) en los tiempos 2–4 del c. 28, CC1 60 → 95, hacia el c. 29. |

### Puente «Hambre» (29–36): máximo 11 capas

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía 29–32** | Horns Marcato | 62–74 | §5, CC1 90 → 100. |
| Doblaje 29–32 | Trombones Marcato | 50–62 (8vb) | CC1 85 → 95. |
| **Melodía 33–36** | 1st Violins Marcato | 67–79 | CC1 95 → 110. |
| Doblaje 33–36 | Horns Marcato | 55–67 (8vb) | CC1 100. |
| Coro | Large Chorus | 43–58 | Desde el c. 33, «Ah» en acordes por debajo de la melodía: Gm (43 46 50 55), A♭ (44 48 51 56), A (45 49 52 57), A7(♭9) (45 49 55 58). CC1 55 → 100. |
| Ostinato | `CelloEnsSpic` + `ContrabassSpic` | — | Corcheas 3+3+2 en 29–32; semicorcheas (acentos 0, 6, 12) en 33–36; sobre el bajo cromático. |
| Armonía | `ViolaEnsTrem` | 52–64 | Notas guía, *p* → *f*. |
| Bajo | Tuba Marcato | 38–45 | Bajo de §4 en la corchea 0, CC1 90 → 105. |
| Tambores | Bass Drum 62 · Tom 62 | — | Bombo en 0, 3, 6; tom en la corchea 4 y semicorcheas 12–15 de los c. 32 y 36. |
| Timbal | `Timpani` → `TimpaniRolls` | 38–45 | Bajo en la corchea 0 (29–34); redoble en A2 (45) 35–36, *mp* → *f*, corta en el tiempo 1 del c. 37. |
| Plato | Cymbal 64 | — | Crescendo con el pico en el tiempo 1 del c. 37. |

### Clímax «El festín» (37–48): máximo 12 capas

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Melodía 37–44** | Horns Sustain | 62–70 | §5, CC1 105 → **110 (c. 41)** → 95. |
| **Melodía 8vb** | Trombones Sustain | 50–58 | CC1 100. |
| **Melodía 8va** | `ViolinEnsSusVib` | 74–82 | *f*, notas de valor completo. |
| **Coro** | Large Chorus | 48–70 | La voz superior canta la melodía (unísono declarado con las trompas, 62–70); las demás voces, notas del acorde por debajo (48–60). CC1 100 → 110 (c. 41) → 95. En 45–48 un solo acorde por compás. |
| Bajo de lamento | Bass Trombone Sustain | D2 C2 B♭1–A1 A♭1 G1–F1 E1 D2 B♭1 (38 36 34–33 32 31–29 28 38 34) | CC1 100; 45–48 calla. |
| Frenesí | `ViolaEnsSpic` | 55–64 | Semicorcheas, arpegios del acorde, *mf*. Nunca por encima de E4 (64). |
| Ostinato | `CelloEnsSpic` + `ContrabassSpic` | — | Corcheas 3+3+2 sobre el bajo de lamento; `ContrabassSpic` calla en 45–48. |
| **Coda 45–48** | Horns Marcato + el mordisco con Trombones Staccato | 62–72 | §5; mordisco en las corcheas 6 (45), 4 (46), 2 (47), 0 (48). |
| Pedal del miedo (45–48) | `ViolinEnsTrem` | 81 / 82 | A5 · B♭5 · A5 · B♭5, *mf*. |
| Tambores | Bass Drum 62 · Tom 62 | — | Bombo en 0, 3, 6 (*f*); tom en semicorcheas 12–15 de los c. 38, 40, 42, 44, 46. |
| Timbal | `Timpani` | 36–46 | Bajo en la corchea 0 + acentos 3 y 6, *f*. |
| Metales de golpe | Tam-tam 57 · Cymbal 66 · Forja 65 | — | Tam-tam en el tiempo 1 del c. 37; plato en el tiempo 1 del c. 41 (velocidad ≤ 85); forja en la corchea 7 de 38, 40, 42 (≤ 80). |

### Codetta «Sobremesa» (49–56): máximo 10 capas

| Rol | Instrumento | Registro | Articulación |
|---|---|---|---|
| **Cabeza grave** | Tuba Marcato + Bass Trombone Marcato | 38–51 | §5, unísono, CC1 90 → 75. |
| **Goblins 51, 53** | `ClarinetStac` + Xylophone | 67–84 | §5, *p*. |
| Mordisco | el mordisco (sin trombones) | — | Tiempo 3 de 51 y 53, *mf*. |
| Ostinato | `CelloEnsSpic` (+ `ContrabassSpic` en 49–52) | — | 3+3+2, *mf* → *mp*: entra así en el c. 1. |
| Pedal del miedo | `ViolinEnsTrem` | 81 / 82 | 49–52: A5 · A5 · B♭5 · A5, *p*. Calla en 53–56. |
| Armonía | `ViolaEnsTrem` | 50–63 | 53–56, notas guía, *pp*. |
| Bombo | Bass Drum 62 | — | Acentos 0, 3, 6 en 49–52; después, solo los mordiscos. |
| Redoble | `TimpaniRolls` | A2 (45) | C. 56, *pp* → *p*, corta en el tiempo 1 del c. 1 (allí entra el tam-tam). |

### Notas sobre los samples

- **Sin trompetas, piccolo ni caja**: el brillo y la agresividad salen del marcato de trompas, trombones y
  violines, del coro y de los golpes graves. Nada de platos de choque: un plato suspendido (c. 36–37 y 41) y el
  tam-tam.
- **El coro** de Sonatina es «Ah» con muestras de voces masculinas por debajo de G4 y femeninas desde G4: la
  voz superior del clímax cruza ese límite (D4–B♭4). Es lo esperado (registro de contralto/soprano grave);
  comprobar a la escucha que el cambio no salta de volumen y, si salta, compensar con CC1 en esas notas.
- **El motivo goblin** está escrito en semicorcheas a ♩ = 160 (0,094 s): `ClarinetStac` tiene 5 capas y round
  robin aleatorio; el xilófono, 2 capas. No duplicar velocidades exactas en notas seguidas.
- **El mordisco** tiene que ser corto y seco: col legno y staccato, sin sostenidos; el contrafagot staccato
  aporta la «mandíbula». Si el bombo enmascara el col legno, bajar el bombo, no subir el resto.
- **Xilófono solo con mazas blandas** (`Xylophone - Soft Mallets`): medido en G5, el de mazas medias tiene la
  energía a −4 dB en 2,5–6 kHz y el de blandas a −22 dB. El rascado de gong (Gong 62) también es brillante: solo
  los dos golpes *pp* de los c. 16 y 26.
- No usar ningún `KS`.

## 7. Dinámica

Velocidades (VSCO, VCSL y los patches de Sonatina por velocidad):

| Nivel | pp | p | mp | mf | f |
|---|---|---|---|---|---|
| Velocidad | 25–40 | 40–55 | 55–70 | 70–85 | 85–105 |

CC1 (patches de Sonatina por CC1):

| Nivel | pp | p | mp | mf | f |
|---|---|---|---|---|---|
| CC1 | 40–55 | 55–70 | 70–85 | 85–100 | 100–112 |

Prohibido: velocidad > 105 y CC1 > 112.

| Sección | Nivel | Gestos |
|---|---|---|
| Intro 1–4 | p → mf | Crescendo de ostinato y timbal; la llamada de trompas *mf*. |
| A 5–12 | mf–f | El riff a nivel constante; la pedal de violines con < > por compás. |
| A' 13–20 | f; c. 16 **subito pp** tras el golpe | El silencio del c. 16 es el gesto más importante de la primera mitad. |
| B 21–28 | p / pp, mordiscos mf | Plano; único crescendo: el A7(♭9) del c. 28 hacia el puente. |
| Puente 29–36 | mf → f | Crescendo continuo de 8 compases (CC1 en metales y coro, CC11 en cuerdas). |
| Clímax 37–48 | f → **f+ (c. 41)** → f | Pico en el tiempo 1 del c. 41; 45–48 a nivel constante, los mordiscos lo más fuerte. |
| Codetta 49–56 | mf → mp | Diminuendo hacia el c. 56; el redoble crece un poco hacia el c. 1. |

## 8. Criterios de aceptación

**Partitura (se comprueba leyendo `build/acto1-gorzug.mid`):**

1. 56 compases de 4/4 a ♩ = 160 sin cambios de tempo; ninguna nota empieza después de 84,000 s y todo lo del
   c. 56 termina antes.
2. Todas las notas dentro del rango del catálogo de su patch y de los registros de §6. Techos: violines ≤ 84,
   trompas ≤ 74, trombones ≤ 62, coro 43–70, clarinete y xilófono ≤ 84.
3. El leitmotiv aparece con las alturas y posiciones exactas de §5 en los c. 5–8, 13–15, 29–36 y 37–44; el
   motivo goblin en 17–27, 51 y 53, con 5 notas en 17–24, 51 y 53, y 4, 3 y 2 notas en los c. 25, 26 y 27.
4. **El c. 16 cumple el silencio**: entre la corchea 1 y el final del compás solo suenan `CelloEnsSpic`, el Gong
   y las colas del golpe; ninguna nota nueva de otra pista.
5. Figuras: semicorcheas solo en el motivo goblin, `CelloEnsSpic` (33–36), `ViolaEnsSpic` y los toms.
6. Capas simultáneas por sección ≤ 8 / 11 / 11 / 9 / 11 / 12 / 10 (intro / A / A' / B / puente / clímax / codetta).
7. **Sin choques de registro**: mientras suena una melodía de §5, ninguna otra pista mantiene notas de negra o
   más en la misma octava con velocidad (o CC1) ≥ la de la melodía. Excepciones: unísonos y doblajes declarados
   (coro + trompas en 37–44) y la pedal de violines en 5–12 (por encima de cualquier melodía).
8. Ninguna velocidad > 105 ni CC1 > 112. El c. 41 contiene el CC1 más alto de trompas y coro.
9. Cada pista de Sonatina por CC1 tiene CC1 en el tick 0; las duraciones por nota respetan los máximos de §6.
10. Los acentos del ostinato, del bombo y del motivo caen en las corcheas 0, 3 y 6 en todos los compases donde
    §6 los pide (comprobación automática en `compose.py`).

**Mezcla (se comprueba con el informe de `mix.py`):**

11. Sonoridad integrada **−17 LUFS ± 1**; pico real **≤ −1 dBTP**.
12. `loop_samples` = **3 704 400**; `seam_jump` < 0,02.
13. Contrastes (`sections_lufs`): clímax c. 37–44 frente a B c. 21–28 entre **+4 y +8 LU**; puente c. 33–36
    frente a c. 29–32 al menos +2 LU (que el crescendo se mida).
14. Bandas (`bands_db`): `presencia 2.5-6k` ≤ −18 dB, `aire 6-16k` ≤ −28 dB, `sub <60` ≤ −18 dB (el jefe puede
    tener más grave que el escenario, no más brillo).
15. Ninguna parte suelta pasa de −6 dB de pico antes del bus; el bombo y el tam-tam no disparan el limitador del
    máster más de 3 dB.
16. Escucha: en el c. 5 se reconoce el tema del menú en menor; el mordisco del c. 16 se oye como un golpe seco
    seguido de un hueco, no como un fallo del audio; los goblins de B se entienden sobre la pedal; el coro del
    clímax suena a coro y no a pad; los efectos del juego siguen claros en el c. 41.

**Integración (cuando se apruebe):** copiar a `src/audio/cap1-e0-jefe.mp3` y añadir a `MUSIC_TRACKS`
(`src/fx/music-tracks.ts`): `'cap1-e0-jefe': { file: 'cap1-e0-jefe.mp3', loopSamples: 3704400 }`.
