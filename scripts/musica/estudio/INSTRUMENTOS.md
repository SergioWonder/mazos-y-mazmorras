# Instrumentos disponibles

Generado por `catalogo.py` a partir de los `.sfz` instalados (ver README). Rangos en notación
MIDI (C4 = 60). **No escribas fuera del rango**: la nota no sonará.

- **Capas**: niveles de velocidad grabados. **Dinámica**: qué la controla.
  - `velocidad`: la velocidad de cada nota fija volumen y capa (VSCO, VCSL). Para frases, curva de CC11.
  - `CC1`: la velocidad casi no cuenta; la dinámica es el **CC1** (volumen, brillo del filtro y cruce
    de capas), también durante la nota. Toda pista de Sonatina **debe** llevar curva de CC1 (60–110 típico).
- **KS**: keyswitches (una nota fuera del rango elige la articulación). El sampler los entiende, pero
  es más claro usar el `.sfz` de cada articulación por separado.

## VSCO 2 Community Edition (CC0)

Carpeta: `/Users/sergio/WonderBits/personal/audio-samples/VSCO-2-CE` · 75 instrumentos.

| Instrumento (ruta para `Part.sfz`) | Rango | Capas | Round robin | Dinámica | KS |
|---|---|---|---|---|---|
| `VSCO-2-CE/BassoonStac.sfz` | A#1–C5 (34–72) | 3 | aleatorio | velocidad |  |
| `VSCO-2-CE/BassoonSus.sfz` | A#1–D#5 (34–75) | 3 | — | velocidad |  |
| `VSCO-2-CE/BassoonVib.sfz` | C2–C5 (36–72) | 6 | — | velocidad |  |
| `VSCO-2-CE/CelloEns-KS.sfz` | C2–F5 (36–77) | 6 | 2 | velocidad | sí |
| `VSCO-2-CE/CelloEnsPizz.sfz` | C2–F5 (36–77) | 2 | 2 | velocidad |  |
| `VSCO-2-CE/CelloEnsSpic.sfz` | C2–F5 (36–77) | 2 | 2 | velocidad |  |
| `VSCO-2-CE/CelloEnsSusVib-Quiet.sfz` | C2–F5 (36–77) | 3 | — | velocidad |  |
| `VSCO-2-CE/CelloEnsSusVib.sfz` | C2–F5 (36–77) | 4 | — | velocidad |  |
| `VSCO-2-CE/CelloEnsTrem.sfz` | C2–F5 (36–77) | 3 | — | velocidad |  |
| `VSCO-2-CE/Clarinet-KS.sfz` | D3–F#6 (50–90) | 5 | aleatorio | velocidad | sí |
| `VSCO-2-CE/ClarinetStac.sfz` | D3–F6 (50–89) | 5 | aleatorio | velocidad |  |
| `VSCO-2-CE/ClarinetSus.sfz` | D3–F#6 (50–90) | 3 | — | velocidad |  |
| `VSCO-2-CE/Contrabass-KS.sfz` | C1–C4 (24–60) | 3 | aleatorio | velocidad | sí |
| `VSCO-2-CE/ContrabassPizz.sfz` | C1–C4 (24–60) | 3 | aleatorio | velocidad |  |
| `VSCO-2-CE/ContrabassSpic.sfz` | C1–C4 (24–60) | 3 | aleatorio | velocidad |  |
| `VSCO-2-CE/ContrabassSusNV.sfz` | C1–C4 (24–60) | 2 | — | velocidad |  |
| `VSCO-2-CE/ContrabassSusVB-Quiet.sfz` | C1–C4 (24–60) | 1 | — | velocidad |  |
| `VSCO-2-CE/ContrabassSusVB.sfz` | C1–C4 (24–60) | 2 | — | velocidad |  |
| `VSCO-2-CE/ContrabassTrem.sfz` | C1–C4 (24–60) | 2 | — | velocidad |  |
| `VSCO-2-CE/FHornMute.sfz` | A#2–F5 (46–77) | 6 | — | velocidad |  |
| `VSCO-2-CE/FHornStac.sfz` | A1–F5 (33–77) | 6 | aleatorio | velocidad |  |
| `VSCO-2-CE/FHornSus.sfz` | A1–F5 (33–77) | 8 | — | velocidad |  |
| `VSCO-2-CE/Flute-KS.sfz` | C4–C7 (60–96) | 10 | aleatorio | velocidad | sí |
| `VSCO-2-CE/FluteExpVib.sfz` | C4–C7 (60–96) | 3 | — | velocidad |  |
| `VSCO-2-CE/FluteStac.sfz` | F4–C7 (65–96) | 9 | aleatorio | velocidad |  |
| `VSCO-2-CE/FluteSusNV.sfz` | C4–C7 (60–96) | 3 | — | velocidad |  |
| `VSCO-2-CE/FluteSusVib.sfz` | C4–C7 (60–96) | 3 | — | velocidad |  |
| `VSCO-2-CE/GM-StylePerc.sfz` | G#1–G#7 (32–104) | 28 | 2 | velocidad |  |
| `VSCO-2-CE/Glockenspiel.sfz` | G4–C7 (67–96) | 1 | — | velocidad |  |
| `VSCO-2-CE/Harp.sfz` | E1–F7 (28–101) | 1 | — | velocidad |  |
| `VSCO-2-CE/Marimba.sfz` | F2–C7 (41–96) | 1 | — | velocidad |  |
| `VSCO-2-CE/OboeStac.sfz` | A#3–F6 (58–89) | 5 | aleatorio | velocidad |  |
| `VSCO-2-CE/OboeSusNV.sfz` | A#3–F6 (58–89) | 2 | — | velocidad |  |
| `VSCO-2-CE/OboeSusVib.sfz` | A#3–F6 (58–89) | 2 | — | velocidad |  |
| `VSCO-2-CE/OrganLoud.sfz` | C2–C7 (36–96) | 1 | — | velocidad |  |
| `VSCO-2-CE/OrganLoudPedal.sfz` | C2–F#4 (36–66) | 1 | — | velocidad |  |
| `VSCO-2-CE/OrganQuiet.sfz` | C2–C7 (36–96) | 1 | — | velocidad |  |
| `VSCO-2-CE/OrganQuietPedal.sfz` | C2–F#4 (36–66) | 1 | — | velocidad |  |
| `VSCO-2-CE/PiccoloStac.sfz` | A#4–A#6 (70–94) | 1 | — | velocidad |  |
| `VSCO-2-CE/PiccoloSus.sfz` | G4–G6 (67–91) | 1 | — | velocidad |  |
| `VSCO-2-CE/SViolin-KS.sfz` | G3–C7 (55–96) | 3 | 2 | velocidad | sí |
| `VSCO-2-CE/SViolinPizz.sfz` | G3–C7 (55–96) | 3 | aleatorio | velocidad |  |
| `VSCO-2-CE/SViolinSpic.sfz` | G3–C7 (55–96) | 2 | 2 | velocidad |  |
| `VSCO-2-CE/SViolinTrem.sfz` | G3–C7 (55–96) | 3 | — | velocidad |  |
| `VSCO-2-CE/SViolinVib-Quiet.sfz` | G3–C7 (55–96) | 1 | — | velocidad |  |
| `VSCO-2-CE/SViolinVib.sfz` | G3–C7 (55–96) | 2 | — | velocidad |  |
| `VSCO-2-CE/Timpani.sfz` | C2–C4 (36–60) | 5 | 2 | velocidad |  |
| `VSCO-2-CE/TimpaniRolls.sfz` | C2–C4 (36–60) | 2 | — | velocidad |  |
| `VSCO-2-CE/TromboneStac.sfz` | A#1–A#4 (34–70) | 7 | aleatorio | velocidad |  |
| `VSCO-2-CE/TromboneSus.sfz` | A#1–F4 (34–65) | 5 | — | velocidad |  |
| `VSCO-2-CE/TromboneVib.sfz` | F2–G4 (41–67) | 3 | — | velocidad |  |
| `VSCO-2-CE/TrumpetHarmonMuteSus.sfz` | A#3–C6 (58–84) | 2 | — | velocidad |  |
| `VSCO-2-CE/TrumpetStac.sfz` | E3–C6 (52–84) | 3 | aleatorio | velocidad |  |
| `VSCO-2-CE/TrumpetStraightMuteSus.sfz` | A#3–C6 (58–84) | 2 | — | velocidad |  |
| `VSCO-2-CE/TrumpetSus.sfz` | E3–C6 (52–84) | 2 | — | velocidad |  |
| `VSCO-2-CE/TrumpetSusVib.sfz` | E3–C6 (52–84) | 2 | — | velocidad |  |
| `VSCO-2-CE/Tuba-KS.sfz` | F1–D4 (29–62) | 6 | 4 | velocidad | sí |
| `VSCO-2-CE/TubaStac.sfz` | F1–D4 (29–62) | 2 | 4 | velocidad |  |
| `VSCO-2-CE/TubaSus.sfz` | F1–D4 (29–62) | 4 | — | velocidad |  |
| `VSCO-2-CE/TubularBells.sfz` | C4–G5 (60–79) | 1 | — | velocidad |  |
| `VSCO-2-CE/UprightPiano.sfz` | A0–C8 (21–108) | 3 | — | velocidad |  |
| `VSCO-2-CE/VSUpright1.sfz` | C1–G7 (24–103) | 5 | aleatorio | velocidad |  |
| `VSCO-2-CE/ViolaEns-KS.sfz` | C3–D6 (48–86) | 3 | 2 | velocidad | sí |
| `VSCO-2-CE/ViolaEnsPizz.sfz` | C3–D6 (48–86) | 3 | aleatorio | velocidad |  |
| `VSCO-2-CE/ViolaEnsSpic.sfz` | C3–D6 (48–86) | 2 | 2 | velocidad |  |
| `VSCO-2-CE/ViolaEnsSusVib-Quiet.sfz` | C3–D6 (48–86) | 1 | — | velocidad |  |
| `VSCO-2-CE/ViolaEnsSusVib.sfz` | C3–D6 (48–86) | 2 | — | velocidad |  |
| `VSCO-2-CE/ViolaEnsTrem.sfz` | C3–D6 (48–86) | 2 | — | velocidad |  |
| `VSCO-2-CE/ViolinEns-KS.sfz` | G3–D6 (55–86) | 3 | 2 | velocidad | sí |
| `VSCO-2-CE/ViolinEnsPizz.sfz` | G3–D6 (55–86) | 2 | aleatorio | velocidad |  |
| `VSCO-2-CE/ViolinEnsSpic.sfz` | G3–D6 (55–86) | 2 | 2 | velocidad |  |
| `VSCO-2-CE/ViolinEnsSusVib-Quiet.sfz` | G3–D6 (55–86) | 1 | — | velocidad |  |
| `VSCO-2-CE/ViolinEnsSusVib.sfz` | G3–D6 (55–86) | 2 | — | velocidad |  |
| `VSCO-2-CE/ViolinEnsTrem.sfz` | G3–D6 (55–86) | 3 | — | velocidad |  |
| `VSCO-2-CE/Xylophone.sfz` | G3–C7 (55–96) | 1 | — | velocidad |  |

## Sonatina Symphonic Orchestra (Creative Commons Sampling Plus 1.0)

Carpeta: `/Volumes/Base/audio-samples/sso` · 262 instrumentos.

| Instrumento (ruta para `Part.sfz`) | Rango | Capas | Round robin | Dinámica | KS |
|---|---|---|---|---|---|
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/All Brass KS.sfz` | E1–E6 (28–88) | 1 | 2 | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/All Brass Marcato.sfz` | E1–E6 (28–88) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/All Brass Staccato.sfz` | E1–E6 (28–88) | 1 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/All Brass Sustain.sfz` | E1–E6 (28–88) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Bass Trombone Solo KS.sfz` | E1–G4 (28–67) | 1 | — | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Bass Trombone Solo Marcato (looped).sfz` | E1–G4 (28–67) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Bass Trombone Solo Marcato (looped, decay).sfz` | E1–G4 (28–67) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Bass Trombone Solo Marcato.sfz` | E1–G4 (28–67) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Bass Trombone Solo Staccato.sfz` | E1–G4 (28–67) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Bass Trombone Solo Sustain (looped).sfz` | E1–G4 (28–67) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Bass Trombone Solo Sustain (looped, decay).sfz` | E1–G4 (28–67) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Bass Trombone Solo Sustain.sfz` | E1–G4 (28–67) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Horn Solo KS.sfz` | E2–E5 (40–76) | 1 | — | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Horn Solo Marcato (looped).sfz` | E2–E5 (40–76) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Horn Solo Marcato (looped, decay).sfz` | E2–E5 (40–76) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Horn Solo Marcato.sfz` | E2–E5 (40–76) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Horn Solo Staccato.sfz` | E2–E5 (40–76) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Horn Solo Sustain (looped).sfz` | E2–E5 (40–76) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Horn Solo Sustain (looped, decay).sfz` | E2–E5 (40–76) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Horn Solo Sustain.sfz` | E2–E5 (40–76) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Horns KS.sfz` | E2–F5 (40–77) | 1 | 2 | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Horns Marcato.sfz` | E2–F5 (40–77) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Horns Staccato.sfz` | E2–F5 (40–77) | 1 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Horns Sustain.sfz` | E2–F5 (40–77) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Tenor Trombone Solo KS.sfz` | E2–B4 (40–71) | 1 | — | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Tenor Trombone Solo Marcato (looped).sfz` | E2–B4 (40–71) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Tenor Trombone Solo Marcato (looped, decay).sfz` | E2–B4 (40–71) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Tenor Trombone Solo Marcato.sfz` | E2–B4 (40–71) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Tenor Trombone Solo Staccato.sfz` | E2–B4 (40–71) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Tenor Trombone Solo Sustain (looped).sfz` | E2–B4 (40–71) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Tenor Trombone Solo Sustain (looped, decay).sfz` | E2–B4 (40–71) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Tenor Trombone Solo Sustain.sfz` | E2–B4 (40–71) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Trombones KS.sfz` | E2–F5 (40–77) | 1 | 2 | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Trombones Marcato (looped).sfz` | E2–F5 (40–77) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Trombones Marcato.sfz` | E2–F5 (40–77) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Trombones Staccato.sfz` | E2–F5 (40–77) | 1 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Trombones Sustain (looped).sfz` | E2–F5 (40–77) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Trombones Sustain.sfz` | E2–F5 (40–77) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Trumpet Solo KS.sfz` | E3–E6 (52–88) | 1 | — | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Trumpet Solo Marcato (looped).sfz` | E3–E6 (52–88) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Trumpet Solo Marcato (looped, decay).sfz` | E3–E6 (52–88) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Trumpet Solo Marcato.sfz` | E3–E6 (52–88) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Trumpet Solo Staccato.sfz` | E3–E6 (52–88) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Trumpet Solo Sustain (looped).sfz` | E3–E6 (52–88) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Trumpet Solo Sustain (looped, decay).sfz` | E3–E6 (52–88) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Trumpet Solo Sustain.sfz` | E3–E6 (52–88) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Trumpets KS.sfz` | E3–E6 (52–88) | 1 | 2 | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Trumpets Marcato (looped).sfz` | E3–E6 (52–88) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Trumpets Marcato.sfz` | E3–E6 (52–88) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Trumpets Staccato.sfz` | E3–E6 (52–88) | 1 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Trumpets Sustain (looped).sfz` | E3–E6 (52–88) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Trumpets Sustain.sfz` | E3–E6 (52–88) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Tuba KS.sfz` | E1–D4 (28–62) | 1 | 2 | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Tuba Marcato (looped).sfz` | E1–D4 (28–62) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Tuba Marcato.sfz` | E1–D4 (28–62) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Tuba Staccato.sfz` | E1–D4 (28–62) | 1 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Tuba Sustain (looped).sfz` | E1–D4 (28–62) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Brass - Performance/Tuba Sustain.sfz` | E1–D4 (28–62) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Chorus - Performance/Large Chorus.sfz` | G2–C6 (43–84) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Chorus - Performance/Mixed Chorus.sfz` | G2–C6 (43–84) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Concert Harp.sfz` | C2–C7 (36–96) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Harpsichord/Harpsichord 4'.sfz` | F1–F6 (29–89) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Harpsichord/Harpsichord 8'.sfz` | F1–F6 (29–89) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Harpsichord/Harpsichord Full.sfz` | F1–F6 (29–89) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Harpsichord/Harpsichord KS.sfz` | F1–F6 (29–89) | 1 | — | velocidad | sí |
| `sso/Sonatina Symphonic Orchestra/Organ/Great - Bourdon 16ft.sfz` | C2–G6 (36–91) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Organ/Great - Dulciana 8ft.sfz` | C3–G6 (48–91) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Organ/Great - Fifteenth 2ft.sfz` | C2–G6 (36–91) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Organ/Great - Flute 4ft.sfz` | C2–G6 (36–91) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Organ/Great - Open Diapason 8ft.sfz` | C2–G6 (36–91) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Organ/Great - Principal 4ft.sfz` | C2–G6 (36–91) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Organ/Great - Stopped Diapason 8ft.sfz` | C2–G6 (36–91) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Organ/Great - Twelfth 3ft.sfz` | C2–G6 (36–91) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Organ/Organ All Stops.sfz` | C2–G6 (36–91) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Organ/Organ Combinations.sfz` | C2–G6 (36–91) | 1 | — | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Organ/Organ Single Stops.sfz` | C2–G6 (36–91) | 1 | — | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Organ/Pedal - Bourdon 16ft.sfz` | C2–E4 (36–64) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Organ/Pedal - Violon 16ft.sfz` | C2–E4 (36–64) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Organ/Swell - Gamba 8ft.sfz` | C3–G6 (48–91) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Organ/Swell - Gedact 8ft.sfz` | C2–G6 (36–91) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Organ/Swell - Oboe 8ft.sfz` | C2–G6 (36–91) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Organ/Swell - Octave 4ft.sfz` | C2–G6 (36–91) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Percussion/All Unpitched Percussion.sfz` | D2–D#5 (38–75) | 7 | 3 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Percussion/Bass Drum & Snare.sfz` | C3–D3 (48–50) | 4 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Percussion/Celeste.sfz` | C4–C8 (60–108) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Percussion/Chimes.sfz` | C3–C6 (48–84) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Percussion/Conga.sfz` | C3–E3 (48–52) | 1 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Percussion/Crotales.sfz` | C6–C8 (84–108) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Percussion/Cymbals & Tamtam.sfz` | C3–C4 (48–60) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Percussion/Glockenspiel.sfz` | C3–C6 (48–84) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Percussion/Marimba Hits.sfz` | C2–C7 (36–96) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Percussion/Marimba Rolls.sfz` | C2–C7 (36–96) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Percussion/Timpani.sfz` | C2–C7 (36–96) | 1 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Percussion/Triangle.sfz` | C3–F3 (48–53) | 1 | 3 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Percussion/Vibraphone.sfz` | C3–F6 (48–89) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Percussion/Xylophone.sfz` | G2–A#5 (43–82) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/1st Violins Col Legno.sfz` | G3–C7 (55–96) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/1st Violins Harmonics.sfz` | G3–C7 (55–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/1st Violins KS.sfz` | G3–C7 (55–96) | 1 | 2 | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/1st Violins Marcato.sfz` | G3–C7 (55–96) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/1st Violins Pizzicato.sfz` | G3–C7 (55–96) | 1 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/1st Violins Staccato.sfz` | G3–C7 (55–96) | 1 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/1st Violins Sustain.sfz` | G3–C7 (55–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/1st Violins Tremolo.sfz` | G3–C7 (55–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/2nd Violins Col Legno.sfz` | G3–C7 (55–96) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/2nd Violins Harmonics.sfz` | G3–C7 (55–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/2nd Violins KS.sfz` | G3–C7 (55–96) | 1 | 2 | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/2nd Violins Marcato.sfz` | G3–C7 (55–96) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/2nd Violins Pizzicato.sfz` | G3–C7 (55–96) | 1 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/2nd Violins Staccato.sfz` | G3–C7 (55–96) | 1 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/2nd Violins Sustain.sfz` | G3–C7 (55–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/2nd Violins Tremolo.sfz` | G3–C7 (55–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/All Strings Col Legno.sfz` | C1–C7 (24–96) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/All Strings Harmonics.sfz` | C2–C7 (36–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/All Strings KS.sfz` | C1–C7 (24–96) | 1 | 2 | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/All Strings Marcato.sfz` | C1–C7 (24–96) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/All Strings Pizzicato.sfz` | C1–C7 (24–96) | 1 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/All Strings Staccato.sfz` | C1–C7 (24–96) | 1 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/All Strings Sustain.sfz` | C1–C7 (24–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/All Strings Tremolo.sfz` | C1–C7 (24–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Bass Solo Harmonics.sfz` | C1–G4 (24–67) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Bass Solo KS.sfz` | C1–G4 (24–67) | 1 | 2 | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Bass Solo Marcato.sfz` | C1–G4 (24–67) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Bass Solo Pizzicato.sfz` | C1–G4 (24–67) | 1 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Bass Solo Staccato.sfz` | C1–G4 (24–67) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Bass Solo Sustain.sfz` | C1–G4 (24–67) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Basses Col Legno.sfz` | C1–A3 (24–57) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Basses KS.sfz` | C1–C4 (24–60) | 1 | 2 | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Basses Marcato.sfz` | C1–C4 (24–60) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Basses Pizzicato.sfz` | C1–C4 (24–60) | 1 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Basses Staccato.sfz` | C1–C4 (24–60) | 1 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Basses Sustain.sfz` | C1–C4 (24–60) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Basses Tremolo.sfz` | C1–C4 (24–60) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Celli Col Legno.sfz` | C2–C#5 (36–73) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Celli Harmonics.sfz` | C2–C#5 (36–73) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Celli KS.sfz` | C2–C#5 (36–73) | 1 | 2 | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Celli Marcato.sfz` | C2–C#5 (36–73) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Celli Pizzicato.sfz` | C2–C#5 (36–73) | 1 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Celli Staccato.sfz` | C2–C#5 (36–73) | 1 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Celli Sustain.sfz` | C2–C#5 (36–73) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Celli Tremolo.sfz` | C2–C#5 (36–73) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Cello Solo Harmonics.sfz` | C2–C6 (36–84) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Cello Solo KS.sfz` | C2–C6 (36–84) | 1 | 2 | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Cello Solo Marcato.sfz` | C2–C6 (36–84) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Cello Solo Pizzicato.sfz` | C2–C6 (36–84) | 1 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Cello Solo Staccato.sfz` | C2–C6 (36–84) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Cello Solo Sustain.sfz` | C2–C6 (36–84) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Viola Solo Harmonics.sfz` | C3–E6 (48–88) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Viola Solo KS.sfz` | C3–E6 (48–88) | 1 | 2 | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Viola Solo Marcato.sfz` | C3–E6 (48–88) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Viola Solo Pizzicato.sfz` | C3–E6 (48–88) | 1 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Viola Solo Staccato.sfz` | C3–E6 (48–88) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Viola Solo Sustain.sfz` | C3–E6 (48–88) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violas Col Legno.sfz` | C3–C6 (48–84) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violas Harmonics.sfz` | C3–C6 (48–84) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violas KS.sfz` | C3–C6 (48–84) | 1 | 2 | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violas Marcato.sfz` | C3–C6 (48–84) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violas Pizzicato.sfz` | C3–C6 (48–84) | 1 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violas Staccato.sfz` | C3–C6 (48–84) | 1 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violas Sustain.sfz` | C3–C6 (48–84) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violas Tremolo.sfz` | C3–C6 (48–84) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violin Solo 1 Harmonics.sfz` | G3–C7 (55–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violin Solo 1 KS.sfz` | G3–C7 (55–96) | 1 | 2 | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violin Solo 1 Marcato (looped).sfz` | G3–C7 (55–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violin Solo 1 Marcato.sfz` | G3–C7 (55–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violin Solo 1 Pizzicato.sfz` | G3–C7 (55–96) | 1 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violin Solo 1 Spiccato.sfz` | G3–C7 (55–96) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violin Solo 1 Staccato.sfz` | G3–C7 (55–96) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violin Solo 1 Sustain (looped).sfz` | G3–C7 (55–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violin Solo 1 Sustain.sfz` | G3–C7 (55–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violin Solo 2 Harmonics Non-Vibrato.sfz` | G3–C7 (55–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violin Solo 2 Harmonics.sfz` | G3–C7 (55–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violin Solo 2 KS.sfz` | G3–C7 (55–96) | 1 | 2 | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violin Solo 2 Marcato Non-Vibrato.sfz` | G3–C7 (55–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violin Solo 2 Marcato.sfz` | G3–C7 (55–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violin Solo 2 Pizzicato.sfz` | G3–C7 (55–96) | 1 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violin Solo 2 Spiccato.sfz` | G3–C7 (55–96) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violin Solo 2 Staccato.sfz` | G3–C7 (55–96) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violin Solo 2 Sustain Non-Vibrato.sfz` | G3–C7 (55–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violin Solo 2 Sustain.sfz` | G3–C7 (55–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Strings - Performance/Violin Solo 2 Tremolo.sfz` | G3–C7 (55–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/All Woodwinds KS.sfz` | A#1–C7 (34–96) | 1 | 2 | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/All Woodwinds Staccato.sfz` | A#1–C7 (34–96) | 1 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/All Woodwinds Sustain.sfz` | A#1–C7 (34–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Alto Flute Solo KS.sfz` | G3–G6 (55–91) | 1 | 2 | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Alto Flute Solo Marcato (looped).sfz` | G3–G6 (55–91) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Alto Flute Solo Marcato (looped, decay).sfz` | G3–G6 (55–91) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Alto Flute Solo Marcato.sfz` | G3–G6 (55–91) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Alto Flute Solo Staccato.sfz` | G3–G6 (55–91) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Alto Flute Solo Sustain (looped).sfz` | G3–G6 (55–91) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Alto Flute Solo Sustain (looped, decay).sfz` | G3–G6 (55–91) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Alto Flute Solo Sustain.sfz` | G3–G6 (55–91) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Bass Clarinet Solo KS.sfz` | D2–D5 (38–74) | 1 | — | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Bass Clarinet Solo Staccato.sfz` | D2–D5 (38–74) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Bass Clarinet Solo Sustain (looped).sfz` | D2–D5 (38–74) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Bass Clarinet Solo Sustain (looped, decay).sfz` | D2–D5 (38–74) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Bass Clarinet Solo Sustain.sfz` | D2–D5 (38–74) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Bassoon Solo KS.sfz` | A#1–D5 (34–74) | 1 | — | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Bassoon Solo Staccato.sfz` | A#1–D5 (34–74) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Bassoon Solo Sustain (looped).sfz` | A#1–D5 (34–74) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Bassoon Solo Sustain (looped, decay).sfz` | A#1–D5 (34–74) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Bassoon Solo Sustain.sfz` | A#1–D5 (34–74) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Bassoons KS.sfz` | A#1–E5 (34–76) | 1 | — | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Bassoons Staccato.sfz` | A#1–E5 (34–76) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Bassoons Sustain (looped).sfz` | A#1–E5 (34–76) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Bassoons Sustain.sfz` | A#1–E5 (34–76) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Clarinet Solo KS.sfz` | D3–D6 (50–86) | 1 | — | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Clarinet Solo Staccato.sfz` | D3–D6 (50–86) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Clarinet Solo Sustain (looped).sfz` | D3–D6 (50–86) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Clarinet Solo Sustain (looped, decay).sfz` | D3–D6 (50–86) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Clarinet Solo Sustain.sfz` | D3–D6 (50–86) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Clarinets KS.sfz` | D3–F6 (50–89) | 1 | — | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Clarinets Staccato.sfz` | D3–F6 (50–89) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Clarinets Sustain (looped).sfz` | D3–F6 (50–89) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Clarinets Sustain.sfz` | D3–F6 (50–89) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Contrabassoon Solo KS.sfz` | A#0–A#3 (22–58) | 1 | — | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Contrabassoon Solo Staccato.sfz` | A#0–A#3 (22–58) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Contrabassoon Solo Sustain (looped).sfz` | A#0–A#3 (22–58) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Contrabassoon Solo Sustain (looped, decay).sfz` | A#0–A#3 (22–58) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Contrabassoon Solo Sustain.sfz` | A#0–A#3 (22–58) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Cor Anglais Solo KS.sfz` | F3–F5 (53–77) | 1 | — | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Cor Anglais Solo Staccato.sfz` | F3–F5 (53–77) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Cor Anglais Solo Sustain (looped).sfz` | F3–F5 (53–77) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Cor Anglais Solo Sustain (looped, decay).sfz` | F3–F5 (53–77) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Cor Anglais Solo Sustain.sfz` | F3–F5 (53–77) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Flute Solo 1 KS.sfz` | C4–C7 (60–96) | 1 | 2 | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Flute Solo 1 Marcato (looped).sfz` | C4–C7 (60–96) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Flute Solo 1 Marcato (looped, decay).sfz` | C4–C7 (60–96) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Flute Solo 1 Marcato.sfz` | C4–C7 (60–96) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Flute Solo 1 Staccato.sfz` | C4–C7 (60–96) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Flute Solo 1 Sustain (looped).sfz` | C4–C7 (60–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Flute Solo 1 Sustain (looped, decay).sfz` | C4–C7 (60–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Flute Solo 1 Sustain.sfz` | C4–C7 (60–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Flute Solo 2 KS.sfz` | C4–C7 (60–96) | 3 | 2 | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Flute Solo 2 Marcato Non-Vibrato.sfz` | C4–C7 (60–96) | 3 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Flute Solo 2 Marcato.sfz` | C4–C7 (60–96) | 3 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Flute Solo 2 Staccato.sfz` | C4–C7 (60–96) | 2 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Flute Solo 2 Sustain Non-Vibrato.sfz` | C4–C7 (60–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Flute Solo 2 Sustain.sfz` | C4–C7 (60–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Flutes KS.sfz` | C4–C7 (60–96) | 1 | 2 | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Flutes Marcato (looped).sfz` | C4–C7 (60–96) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Flutes Marcato.sfz` | C4–C7 (60–96) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Flutes Staccato.sfz` | C4–C7 (60–96) | 1 | 2 | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Flutes Sustain (looped).sfz` | C4–C7 (60–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Flutes Sustain.sfz` | C4–C7 (60–96) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Oboe Solo KS.sfz` | A#3–D#6 (58–87) | 1 | — | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Oboe Solo Staccato.sfz` | A#3–D#6 (58–87) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Oboe Solo Sustain (looped).sfz` | A#3–D#6 (58–87) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Oboe Solo Sustain (looped, decay).sfz` | A#3–D#6 (58–87) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Oboe Solo Sustain.sfz` | A#3–D#6 (58–87) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Oboes KS.sfz` | A#3–G6 (58–91) | 1 | — | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Oboes Staccato.sfz` | A#3–G6 (58–91) | 1 | — | velocidad |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Oboes Sustain (looped).sfz` | A#3–G6 (58–91) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Oboes Sustain.sfz` | A#3–G6 (58–91) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Piccolo Solo KS.sfz` | C5–G7 (72–103) | 1 | 2 | CC1 | sí |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Piccolo Solo Marcato (looped).sfz` | C5–G7 (72–103) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Piccolo Solo Marcato (looped, decay).sfz` | C5–G7 (72–103) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Piccolo Solo Marcato.sfz` | C5–G7 (72–103) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Piccolo Solo Staccato.sfz` | C5–G7 (72–103) | 1 | 2 | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Piccolo Solo Sustain (looped).sfz` | C5–G7 (72–103) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Piccolo Solo Sustain (looped, decay).sfz` | C5–G7 (72–103) | 1 | — | CC1 |  |
| `sso/Sonatina Symphonic Orchestra/Woodwinds - Performance/Piccolo Solo Sustain.sfz` | C5–G7 (72–103) | 1 | — | CC1 |  |

## Versilian Community Sample Library (CC0)

Carpeta: `/Volumes/Base/audio-samples/VCSL` · 164 instrumentos.

| Instrumento (ruta para `Part.sfz`) | Rango | Capas | Round robin | Dinámica | KS |
|---|---|---|---|---|---|
| `VCSL/Aerophones/Edge-blown Aerophones/Ball Whistle.sfz` | C4–C#4 (60–61) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Edge-blown Aerophones/Baroque Alto Recorder - Keyswitch.sfz` | F4–G6 (65–91) | 1 | — | velocidad | sí |
| `VCSL/Aerophones/Edge-blown Aerophones/Baroque Alto Recorder - Staccato.sfz` | F4–G6 (65–91) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Edge-blown Aerophones/Baroque Alto Recorder - SusVib.sfz` | F4–G6 (65–91) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Edge-blown Aerophones/Baroque Alto Recorder - Sustain.sfz` | F4–G6 (65–91) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Edge-blown Aerophones/Baroque Bass Recorder - Keyswitch.sfz` | F3–G5 (53–79) | 1 | — | velocidad | sí |
| `VCSL/Aerophones/Edge-blown Aerophones/Baroque Bass Recorder - Staccato.sfz` | F3–G5 (53–79) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Edge-blown Aerophones/Baroque Bass Recorder - SusVib.sfz` | F3–G5 (53–79) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Edge-blown Aerophones/Baroque Bass Recorder - Sustain.sfz` | F3–G5 (53–79) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Edge-blown Aerophones/Baroque Soprano Recorder - Keyswitch.sfz` | C5–D7 (72–98) | 1 | — | velocidad | sí |
| `VCSL/Aerophones/Edge-blown Aerophones/Baroque Soprano Recorder - Staccato.sfz` | C5–D7 (72–98) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Edge-blown Aerophones/Baroque Soprano Recorder - Sustain.sfz` | C5–D7 (72–98) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Edge-blown Aerophones/Baroque Tenor Recorder - Keyswitch.sfz` | C4–D6 (60–86) | 1 | — | velocidad | sí |
| `VCSL/Aerophones/Edge-blown Aerophones/Baroque Tenor Recorder - Staccato.sfz` | C4–D6 (60–86) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Edge-blown Aerophones/Baroque Tenor Recorder - SusVib.sfz` | C4–D6 (60–86) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Edge-blown Aerophones/Baroque Tenor Recorder - Sustain.sfz` | C4–D6 (60–86) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Edge-blown Aerophones/Ocarina, Small - Keyswitch.sfz` | A5–C#7 (81–97) | 1 | — | velocidad | sí |
| `VCSL/Aerophones/Edge-blown Aerophones/Ocarina, Small - Staccato.sfz` | A5–C#7 (81–97) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Edge-blown Aerophones/Ocarina, Small - Sustain.sfz` | A5–C#7 (81–97) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Edge-blown Aerophones/Ocarina, Typical - Keyswitch.sfz` | A4–D6 (69–86) | 1 | — | velocidad | sí |
| `VCSL/Aerophones/Edge-blown Aerophones/Ocarina, Typical - Sus.sfz` | A4–D6 (69–86) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Edge-blown Aerophones/Ocarina, Typical - SusVib.sfz` | A4–D6 (69–86) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Edge-blown Aerophones/Pipe Organ - Keyswitch.sfz` | C2–C#7 (36–97) | 1 | — | velocidad | sí |
| `VCSL/Aerophones/Edge-blown Aerophones/Pipe Organ - Loud Pedal.sfz` | C2–G4 (36–67) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Edge-blown Aerophones/Pipe Organ - Loud.sfz` | C2–C#7 (36–97) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Edge-blown Aerophones/Pipe Organ - Quiet Pedal.sfz` | C2–G4 (36–67) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Edge-blown Aerophones/Pipe Organ - Quiet.sfz` | C2–C#7 (36–97) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Edge-blown Aerophones/Renaissance Organ - 4'+8'.sfz` | C2–F6 (36–89) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Edge-blown Aerophones/Renaissance Organ - 4'.sfz` | C2–F6 (36–89) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Edge-blown Aerophones/Renaissance Organ - 8'.sfz` | C2–F6 (36–89) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Edge-blown Aerophones/Renaissance Organ - Full.sfz` | C2–F6 (36–89) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Edge-blown Aerophones/Renaissance Organ - Keyswitch.sfz` | C2–F6 (36–89) | 1 | — | velocidad | sí |
| `VCSL/Aerophones/Edge-blown Aerophones/Train Whistle, Toy.sfz` | C4–F4 (60–65) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Free Aerophones/Harmonica-Hohner-Special20-C - Keyswitch.sfz` | C4–C#7 (60–97) | 1 | — | velocidad | sí |
| `VCSL/Aerophones/Free Aerophones/Harmonica-Hohner-Special20-C - Normal.sfz` | C4–C#7 (60–97) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Free Aerophones/Harmonica-Hohner-Special20-C - Soft.sfz` | C4–C#7 (60–97) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Free Aerophones/Harmonica-Hohner-Special20-C - Vib.sfz` | C4–C#7 (60–97) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Free Aerophones/Harmonica-Hohner-Special20-F - Accented.sfz` | F4–F#7 (65–102) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Free Aerophones/Harmonica-Hohner-Special20-F - HandVib.sfz` | F4–F#7 (65–102) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Free Aerophones/Harmonica-Hohner-Special20-F - Keyswitch.sfz` | F4–F#7 (65–102) | 1 | 2 | velocidad | sí |
| `VCSL/Aerophones/Free Aerophones/Harmonica-Hohner-Special20-F - Normal.sfz` | F4–C#7 (65–97) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Free Aerophones/Harmonica-Hohner-Special20-F - Stac.sfz` | F4–F#7 (65–102) | 1 | 2 | velocidad |  |
| `VCSL/Aerophones/Free Aerophones/Harmonica-Hohner-Special20-F - Vib.sfz` | F4–F#7 (65–102) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Free Aerophones/Harmonica-Hohner-Super64 - Accented.sfz` | C3–C#7 (48–97) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Free Aerophones/Harmonica-Hohner-Super64 - Keyswitch.sfz` | C3–C#7 (48–97) | 1 | — | velocidad | sí |
| `VCSL/Aerophones/Free Aerophones/Harmonica-Hohner-Super64 - Normal.sfz` | C3–C#7 (48–97) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Free Aerophones/Harmonica-Hohner-Super64 - Vib.sfz` | C3–C#7 (48–97) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Free Aerophones/Siren.sfz` | C4–E4 (60–64) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Lip Aerophones/Didgeridoo.sfz` | C4–B4 (60–71) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Reed Aerophones/Saxello - Keyswitch.sfz` | A#3–F6 (58–89) | 3 | — | velocidad | sí |
| `VCSL/Aerophones/Reed Aerophones/Saxello - Non-Vibrato.sfz` | A#3–F6 (58–89) | 2 | — | velocidad |  |
| `VCSL/Aerophones/Reed Aerophones/Saxello - Staccato.sfz` | A#3–F6 (58–89) | 3 | — | velocidad |  |
| `VCSL/Aerophones/Reed Aerophones/Saxello - Vibrato.sfz` | A#3–F6 (58–89) | 1 | — | velocidad |  |
| `VCSL/Aerophones/Reed Aerophones/Tenor Saxophone - Keyswitch.sfz` | G#2–F6 (44–89) | 3 | — | velocidad | sí |
| `VCSL/Aerophones/Reed Aerophones/Tenor Saxophone - Non-Vibrato.sfz` | G#2–F6 (44–89) | 2 | — | velocidad |  |
| `VCSL/Aerophones/Reed Aerophones/Tenor Saxophone - Staccato.sfz` | G#2–F6 (44–89) | 3 | — | velocidad |  |
| `VCSL/Aerophones/Reed Aerophones/Tenor Saxophone - Vibrato.sfz` | G#2–F6 (44–89) | 1 | — | velocidad |  |
| `VCSL/Chordophones/Composite Chordophones/Concert Harp.sfz` | E1–F#7 (28–102) | 3 | — | velocidad |  |
| `VCSL/Chordophones/Composite Chordophones/Folk Harp.sfz` | C2–A6 (36–93) | 1 | — | velocidad |  |
| `VCSL/Chordophones/Composite Chordophones/Strumstick.sfz` | C3–C6 (48–84) | 3 | — | velocidad |  |
| `VCSL/Chordophones/Zithers/Dan Tranh - FX.sfz` | C4–F#4 (60–66) | 1 | — | velocidad |  |
| `VCSL/Chordophones/Zithers/Dan Tranh - Gliss.sfz` | C4–G4 (60–67) | 3 | — | velocidad |  |
| `VCSL/Chordophones/Zithers/Dan Tranh - Keyswitch.sfz` | B2–C6 (47–84) | 6 | — | velocidad | sí |
| `VCSL/Chordophones/Zithers/Dan Tranh - Normal.sfz` | B2–C6 (47–84) | 3 | — | velocidad |  |
| `VCSL/Chordophones/Zithers/Dan Tranh - Tremolo.sfz` | B2–C6 (47–84) | 1 | — | velocidad |  |
| `VCSL/Chordophones/Zithers/Dan Tranh - Vibrato.sfz` | B2–C6 (47–84) | 2 | — | velocidad |  |
| `VCSL/Chordophones/Zithers/Grand Piano, Kawai.sfz` | A0–C#8 (21–109) | 10 | — | velocidad |  |
| `VCSL/Chordophones/Zithers/Grand Piano, Steinway B.sfz` | A0–C8 (21–108) | 3 | — | velocidad |  |
| `VCSL/Chordophones/Zithers/Harpsichord, English - Keyswitch.sfz` | A#1–F6 (34–89) | 1 | — | velocidad | sí |
| `VCSL/Chordophones/Zithers/Harpsichord, English - Lute.sfz` | A#1–F6 (34–89) | 1 | — | velocidad |  |
| `VCSL/Chordophones/Zithers/Harpsichord, English - Normal.sfz` | A#1–F6 (34–89) | 1 | — | velocidad |  |
| `VCSL/Chordophones/Zithers/Harpsichord, Flemish - 4'.sfz` | F1–C6 (29–84) | 1 | — | velocidad |  |
| `VCSL/Chordophones/Zithers/Harpsichord, Flemish - 8'.sfz` | F1–C6 (29–84) | 1 | — | velocidad |  |
| `VCSL/Chordophones/Zithers/Harpsichord, Flemish - Full.sfz` | F1–C6 (29–84) | 1 | — | velocidad |  |
| `VCSL/Chordophones/Zithers/Harpsichord, Flemish - Keyswitch.sfz` | F1–C6 (29–84) | 1 | — | velocidad | sí |
| `VCSL/Chordophones/Zithers/Harpsichord, French.sfz` | C1–C6 (24–84) | 1 | 2 | velocidad |  |
| `VCSL/Chordophones/Zithers/Harpsichord, Italian.sfz` | F1–C6 (29–84) | 1 | — | velocidad |  |
| `VCSL/Chordophones/Zithers/Harpsichord, Unk.sfz` | F1–F6 (29–89) | 1 | — | velocidad |  |
| `VCSL/Chordophones/Zithers/Upright Piano, Knight.sfz` | A0–C#8 (21–109) | 3 | 4 | velocidad |  |
| `VCSL/Chordophones/Zithers/Upright Piano, Yamaha.sfz` | A0–C8 (21–108) | 7 | 2 | velocidad |  |
| `VCSL/Electrophones/TX81Z - Clavisynth.sfz` | C1–C#7 (24–97) | 3 | — | velocidad |  |
| `VCSL/Electrophones/TX81Z - FM Piano.sfz` | C1–C#8 (24–109) | 3 | — | velocidad |  |
| `VCSL/Electrophones/TX81Z - Keyswitch.sfz` | C1–C#8 (24–109) | 3 | — | velocidad | sí |
| `VCSL/Electrophones/TX81Z - Piano 1.sfz` | C1–C#8 (24–109) | 3 | — | velocidad |  |
| `VCSL/Idiophones/Friction Idiophones/Wine Glasses - Fast.sfz` | D5–D#6 (74–87) | 1 | — | velocidad |  |
| `VCSL/Idiophones/Friction Idiophones/Wine Glasses - Keyswitch.sfz` | D5–D#6 (74–87) | 1 | — | velocidad | sí |
| `VCSL/Idiophones/Friction Idiophones/Wine Glasses - Slow.sfz` | D5–D#6 (74–87) | 1 | — | velocidad |  |
| `VCSL/Idiophones/Plucked Idiophones/Kalimba, Kenya.sfz` | B3–C6 (59–84) | 1 | 2 | velocidad |  |
| `VCSL/Idiophones/Plucked Idiophones/Kalimba, Tanzania.sfz` | G2–D7 (43–98) | 1 | 2 | velocidad |  |
| `VCSL/Idiophones/Plucked Idiophones/Mbira Mavembe (Gandanga), Zimbabwe, Low G.sfz` | A#2–A#5 (46–82) | 1 | 2 | velocidad |  |
| `VCSL/Idiophones/Plucked Idiophones/Mbira dzaVadzimu Nyamaropa, Zimbabwe, Low B.sfz` | A#2–D6 (46–86) | 1 | 2 | velocidad |  |
| `VCSL/Idiophones/Plucked Idiophones/Nyunga Nyunga, Mozambique, Low F.sfz` | F3–F#5 (53–78) | 1 | 2 | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Agogo Bells.sfz` | C4–C#4 (60–61) | 5 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Anvil.sfz` | C4–D4 (60–62) | 3 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Balafon - Hard Mallet.sfz` | C4–G6 (60–91) | 3 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Balafon - Keyswitch.sfz` | C4–G6 (60–91) | 3 | — | velocidad | sí |
| `VCSL/Idiophones/Struck Idiophones/Balafon - Soft Mallet.sfz` | C4–G6 (60–91) | 3 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Balafon - Traditional Mallet.sfz` | C4–G6 (60–91) | 3 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Bell Tree - Individual.sfz` | F5–E7 (77–100) | 1 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Bell Tree - Keyswitch.sfz` | C4–E7 (60–100) | 1 | — | velocidad | sí |
| `VCSL/Idiophones/Struck Idiophones/Bell Tree - Stroke.sfz` | C4–E4 (60–64) | 1 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Brake Drum.sfz` | C4–G4 (60–67) | 6 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Cabasa.sfz` | C4–C#4 (60–61) | 3 | 2 | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Cajon.sfz` | C4–D4 (60–62) | 3 | 2 | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Claps.sfz` | C4–C#4 (60–61) | 5 | 6 | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Clash Cymbals 1.sfz` | C4–D4 (60–62) | 5 | 2 | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Clash Cymbals 2.sfz` | C4–C4 (60–60) | 3 | 2 | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Claves.sfz` | C4–C#4 (60–61) | 3 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Cowbells.sfz` | C4–F4 (60–65) | 5 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Finger Cymbals.sfz` | C4–C4 (60–60) | 1 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Flexatone.sfz` | C4–G4 (60–67) | 1 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Glockenspiel.sfz` | G4–C#7 (67–97) | 1 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Gong 1.sfz` | C4–D4 (60–62) | 7 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Gong 2.sfz` | C4–F4 (60–65) | 1 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Guiro - Keyswitch.sfz` | C4–G#4 (60–68) | 1 | 2 | velocidad | sí |
| `VCSL/Idiophones/Struck Idiophones/Guiro.sfz` | C4–D#4 (60–63) | 1 | 2 | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Hand Bells, Nepalese.sfz` | C4–D4 (60–62) | 1 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Hand Chimes.sfz` | C4–C#7 (60–97) | 1 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Hi-Hat Cymbal.sfz` | F#2–A#2 (42–46) | 5 | 2 | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Marimba.sfz` | F2–C#7 (41–97) | 1 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Mark Trees.sfz` | C4–F4 (60–65) | 1 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Ratchet.sfz` | C4–F4 (60–65) | 1 | 2 | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Shaker, Large.sfz` | C4–D4 (60–62) | 1 | 2 | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Shaker, Small.sfz` | C4–G4 (60–67) | 1 | 2 | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Slapstick.sfz` | C4–C#4 (60–61) | 1 | 3 | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Sleigh Bells.sfz` | C4–E4 (60–64) | 1 | 2 | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Slit Drum.sfz` | C4–C#4 (60–61) | 3 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Suspended Cymbal 1.sfz` | C4–C5 (60–72) | 8 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Suspended Cymbal 2.sfz` | C4–A#4 (60–70) | 11 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Tambourine 1.sfz` | C4–D4 (60–62) | 6 | 2 | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Tambourine 2.sfz` | C4–D4 (60–62) | 6 | 2 | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Triangles.sfz` | C4–C5 (60–72) | 3 | 2 | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Tubular Bells 1.sfz` | C4–F5 (60–77) | 2 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Tubular Bells 2.sfz` | C4–G5 (60–79) | 2 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Tubular Glockenspiel.sfz` | G5–A#6 (79–94) | 3 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Vibraphone - Bowed.sfz` | A3–F6 (57–89) | 1 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Vibraphone - Hard Mallets.sfz` | F3–F6 (53–89) | 2 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Vibraphone - Keyswitch.sfz` | F3–F6 (53–89) | 3 | — | velocidad | sí |
| `VCSL/Idiophones/Struck Idiophones/Vibraphone - Soft Mallets.sfz` | F3–F6 (53–89) | 2 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Vibraslap.sfz` | C4–C4 (60–60) | 1 | 4 | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Woodblock.sfz` | C4–D4 (60–62) | 7 | 3 | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Xylophone - Hard Mallets.sfz` | G3–C#7 (55–97) | 3 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Xylophone - Keyswitch.sfz` | G3–C#7 (55–97) | 3 | — | velocidad | sí |
| `VCSL/Idiophones/Struck Idiophones/Xylophone - Medium Mallets.sfz` | G3–C#7 (55–97) | 2 | — | velocidad |  |
| `VCSL/Idiophones/Struck Idiophones/Xylophone - Soft Mallets.sfz` | G3–C#7 (55–97) | 2 | — | velocidad |  |
| `VCSL/Membranophones/Other Membranophones/Ocean Drum.sfz` | C4–D4 (60–62) | 1 | — | velocidad |  |
| `VCSL/Membranophones/Struck Membranophones/Bass Drum 1.sfz` | C4–C4 (60–60) | 4 | 2 | velocidad |  |
| `VCSL/Membranophones/Struck Membranophones/Bass Drum 2.sfz` | C4–A#4 (60–70) | 10 | 2 | velocidad |  |
| `VCSL/Membranophones/Struck Membranophones/Bongos.sfz` | C4–F4 (60–65) | 5 | 2 | velocidad |  |
| `VCSL/Membranophones/Struck Membranophones/Conga.sfz` | C4–F4 (60–65) | 9 | 2 | velocidad |  |
| `VCSL/Membranophones/Struck Membranophones/Darbuka.sfz` | C4–E4 (60–64) | 2 | 2 | velocidad |  |
| `VCSL/Membranophones/Struck Membranophones/Frame Drum.sfz` | C4–F4 (60–65) | 3 | 2 | velocidad |  |
| `VCSL/Membranophones/Struck Membranophones/Snare Drum, Modern 1.sfz` | C4–F4 (60–65) | 13 | 2 | velocidad |  |
| `VCSL/Membranophones/Struck Membranophones/Snare Drum, Modern 2.sfz` | C4–F#4 (60–66) | 10 | 2 | velocidad |  |
| `VCSL/Membranophones/Struck Membranophones/Snare Drum, Modern 3.sfz` | C4–F4 (60–65) | 6 | 2 | velocidad |  |
| `VCSL/Membranophones/Struck Membranophones/Snare Drum, Rope Tension.sfz` | C4–F4 (60–65) | 8 | 2 | velocidad |  |
| `VCSL/Membranophones/Struck Membranophones/Timpani 1 - Hit.sfz` | F2–G3 (41–55) | 3 | 2 | velocidad |  |
| `VCSL/Membranophones/Struck Membranophones/Timpani 1 - Keyswitch.sfz` | F2–G3 (41–55) | 5 | 2 | velocidad | sí |
| `VCSL/Membranophones/Struck Membranophones/Timpani 1 - Roll.sfz` | F2–G3 (41–55) | 2 | — | velocidad |  |
| `VCSL/Membranophones/Struck Membranophones/Timpani 2 - All Samples.sfz` | C4–A6 (60–93) | 3 | 3 | velocidad |  |
| `VCSL/Membranophones/Struck Membranophones/Timpani 2 - Keyswitch.sfz` | D2–A6 (38–93) | 4 | 3 | velocidad | sí |
| `VCSL/Membranophones/Struck Membranophones/Timpani 2 - Scale.sfz` | D2–B3 (38–59) | 1 | 2 | velocidad |  |
| `VCSL/Membranophones/Struck Membranophones/Tom 1.sfz` | C4–F4 (60–65) | 6 | 2 | velocidad |  |
| `VCSL/Membranophones/Struck Membranophones/Tom 2.sfz` | C4–F4 (60–65) | 6 | 2 | velocidad |  |
