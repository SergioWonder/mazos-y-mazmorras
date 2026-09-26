# Graph Report - videogame  (2026-09-27)

## Corpus Check
- 108 files · ~540,940 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2206 nodes · 5103 edges · 73 communities (64 shown, 9 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 345 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3770d840`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Bestiario de enemigos|Bestiario de enemigos]]
- [[_COMMUNITY_Persistencia y partículas|Persistencia y partículas]]
- [[_COMMUNITY_Motor de combate|Motor de combate]]
- [[_COMMUNITY_Actos, mapa y guardado|Actos, mapa y guardado]]
- [[_COMMUNITY_Audio y música|Audio y música]]
- [[_COMMUNITY_Combate turnos e invocaciones|Combate: turnos e invocaciones]]
- [[_COMMUNITY_Renderizado de cartas|Renderizado de cartas]]
- [[_COMMUNITY_Dado 3D en WebGL|Dado 3D en WebGL]]
- [[_COMMUNITY_Eventos y recompensas|Eventos y recompensas]]
- [[_COMMUNITY_Configuración de TypeScript|Configuración de TypeScript]]
- [[_COMMUNITY_Cartas registro y Explosión|Cartas: registro y Explosión]]
- [[_COMMUNITY_Dependencias y scripts npm|Dependencias y scripts npm]]
- [[_COMMUNITY_Diseño del juego y Bárbaro|Diseño del juego y Bárbaro]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Motor de partículas|Motor de partículas]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Skill editar-carta|Skill /editar-carta]]
- [[_COMMUNITY_Skill release|Skill /release]]
- [[_COMMUNITY_Créditos de audio|Créditos de audio]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Cartas de 1 uso|Cartas de 1 uso]]
- [[_COMMUNITY_Configuración de Vite y PWA|Configuración de Vite y PWA]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 78|Community 78]]

## God Nodes (most connected - your core abstractions)
1. `Combate` - 55 edges
2. `rng()` - 38 edges
3. `Scene` - 31 edges
4. `reverb()` - 31 edges
5. `span()` - 28 edges
6. `juego()` - 28 edges
7. `Scene` - 27 edges
8. `noise()` - 27 edges
9. `env_swell()` - 27 edges
10. `MotorAudio` - 27 edges

## Surprising Connections (you probably didn't know these)
- `EstadoId` --implements--> `Rayos del Contemplador (cartas que se agotan, sobrecarga, etéreas)`  [INFERRED]
  src/core/types.ts → README.md
- `uiSilenciosa` --implements--> `Arquitectura: núcleo sin DOM + interfaz Presentador`  [INFERRED]
  scripts/smoke-test.ts → README.md
- `NEUTRALES_ESPECIALES` --implements--> `Cartas de azar incoloras (Seducir / Deseo, d20)`  [INFERRED]
  src/core/cartas.ts → README.md
- `recompensaCartas()` --conceptually_related_to--> `Mejora de cartas en campamentos`  [INFERRED]
  src/core/cartas.ts → README.md
- `rehidratarRun()` --conceptually_related_to--> `PWA jugable sin conexión`  [INFERRED]
  src/core/guardado.ts → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Identidad mecánica del Pícaro** — readme_clase_picaro, readme_acrobacias, readme_veneno, readme_dagas, readme_ataques_furtivos, readme_descarte_sinergias [EXTRACTED 1.00]
- **Cadena de publicación: versión → changelog → CI → Pages** — release_skill_flujo_release, src_version_changelog, ui_actualizacion, workflows_deploy_github_pages, scripts_smoke_test [EXTRACTED 1.00]
- **Núcleo testeable sin DOM (Presentador)** — readme_arquitectura_presentador, core_combate_presentador, scripts_smoke_test_uisilenciosa, ui_combate, readme_estructura_carpetas [INFERRED 0.95]
- **Identidad mecánica del Brujo** — readme_clase_brujo, readme_explosion_sobrenatural, readme_condena, readme_invocacion_efimera, readme_armadura_agathys, readme_oscuridad [EXTRACTED 1.00]
- **Bucle bloqueo → daño devuelto → Condena** — readme_armadura_agathys, readme_condena, core_combate_combate_rebotaragathys, core_cartas_brujo [INFERRED 0.85]

## Communities (73 total, 9 thin omitted)

### Community 0 - "Bestiario de enemigos"
Cohesion: 0.04
Nodes (50): ACOLITO_VELADO, AZOTAMENTES, AZOTAMENTES_ANCIANO, BANDIDO_BALLESTERO, CABALLERO_TUMBARIO, CAPITAN_BANDIDO, CEREBRO_ANCIANO, CONTEMPLADOR (+42 more)

### Community 1 - "Persistencia y partículas"
Cohesion: 0.10
Nodes (21): BackdropTheme, EMISSIVE, EYES, BONE_INDEX, FLAG, hexRgb(), lighten(), multiply() (+13 more)

### Community 2 - "Motor de combate"
Cohesion: 0.05
Nodes (64): banner(), bone_pile(), bonfire(), box_mean(), brazier(), build_svg(), cauldron(), chief_tent() (+56 more)

### Community 3 - "Actos, mapa y guardado"
Cohesion: 0.12
Nodes (49): ParticleShape, abisal(), aliento(), Anchor, aullido(), bell(), bloqueo(), Build (+41 more)

### Community 4 - "Audio y música"
Cohesion: 0.07
Nodes (21): Loop chiptune procedural de respaldo, Música 8-bit con pistas CC0 de OpenGameArt, Efectos de sonido sintetizados (Web Audio API, sin ficheros), audio, Capa, MotorAudio, RECETAS, SFX_FILES (+13 more)

### Community 5 - "Combate: turnos e invocaciones"
Cohesion: 0.14
Nodes (19): ActionProgress, WingJoints, WingSide, angleOf(), articulateWings(), buildWing(), clamp(), lerp() (+11 more)

### Community 6 - "Renderizado de cartas"
Cohesion: 0.06
Nodes (51): Action, ACTION_DURATION, ActionProgress, ActionType, activeAction(), applyMatrix(), BONE_ORDER, BoneId (+43 more)

### Community 7 - "Dado 3D en WebGL"
Cohesion: 0.06
Nodes (46): COLOR_CRITICO, COLOR_NORMAL, COLOR_PIFIA, COLOR_TENUE, escala(), identidad(), Mat4, qHaciaCamara() (+38 more)

### Community 8 - "Eventos y recompensas"
Cohesion: 0.05
Nodes (56): BARBARO, BASICAS, BRUJO, DAGA, danoExplosion(), DRUIDA, INICIALES_DE_CLASE, lanzarExplosion() (+48 more)

### Community 9 - "Configuración de TypeScript"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+8 more)

### Community 10 - "Cartas: registro y Explosión"
Cohesion: 0.11
Nodes (24): BossExtras, ACTION_DURATION, applyMatrix(), BONE_ORDER, boneParent(), Burst, DEFAULT_PIVOTS, easeOut() (+16 more)

### Community 11 - "Dependencias y scripts npm"
Cohesion: 0.15
Nodes (12): devDependencies, typescript, vite, vite-plugin-pwa, name, private, scripts, build (+4 more)

### Community 12 - "Diseño del juego y Bárbaro"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+8 more)

### Community 13 - "Community 13"
Cohesion: 0.12
Nodes (19): ACTOS, DUNGEON_MASTER, IMAGEN_ILUSORIA, OBSERVADOR, ENEMY_RIGS, INVOCATION_RIGS, FormId, BOSS_SUMMONS (+11 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (45): aplicarBendicion(), bendicionesDisponibles(), cartasUnicas(), DONES_POR_ACTO, donesDeCartaUnica(), elegirPorHuecos(), especial(), OfertaBendicion (+37 more)

### Community 15 - "Community 15"
Cohesion: 0.50
Nodes (4): Actualizaciones y avisos, Arte de las cartas, Estructura, Motor gráfico (WebGL2)

### Community 16 - "Community 16"
Cohesion: 0.08
Nodes (50): additive(), analyze(), bell(), brass_note(), celesta_note(), choir_note(), cymbal(), db() (+42 more)

### Community 17 - "Motor de partículas"
Cohesion: 0.07
Nodes (27): ParticleRendererGL, SHAPE_CODE, AmbientPreset, AMBIENTS, AmbientStyle, between(), EffectPreset, EFFECTS (+19 more)

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (40): bear(), beholder(), biped(), BipedOpts, BONE, BOSSES, brain(), Build (+32 more)

### Community 19 - "Community 19"
Cohesion: 0.08
Nodes (32): Convención: el texto de la carta debe cuadrar con su efecto, CARD_GLOW, CLASS_GLOW, FULL_ART, hasFullArt(), lookOf(), bitmaps, cardArtBitmap() (+24 more)

### Community 20 - "Skill /editar-carta"
Cohesion: 0.33
Nodes (4): /editar-carta — aplicar comentarios del Compendio a las cartas, Entrada, Notas, Pasos

### Community 21 - "Skill /release"
Cohesion: 0.33
Nodes (4): Notas, Pasos (ejecútalos en orden), /release — publicar versión con ventana de novedades, Uso

### Community 22 - "Créditos de audio"
Cohesion: 0.33
Nodes (4): Cambiar o ampliar pistas, Efectos de sonido, Música y sonido, Pistas usadas (todas CC0 / dominio público)

### Community 23 - "Community 23"
Cohesion: 0.08
Nodes (19): defDe(), Combate, esDungeonMaster(), crearEnemigo(), GOBLIN_FAMELICO, CartaInstancia, EnemigoCombate, FormaInvocacion (+11 more)

### Community 26 - "Configuración de Vite y PWA"
Cohesion: 0.12
Nodes (24): finalVerdaderoDesbloqueado(), ChangelogEntry, isMajorUpgrade(), majorChangelog(), majorOf(), shouldNotifyMajor(), Skill /release (versión + changelog + push a main), Ventana de novedades alimentada por CHANGELOG (+16 more)

### Community 29 - "Community 29"
Cohesion: 0.25
Nodes (7): Colores de fondo por clase, Encuadre, Estilo «ilustrado» (el de los monstruos del juego), Formato (obligatorio), Guía de estilo: arte de las cartas, Personajes y monstruos, Variedad

### Community 30 - "Community 30"
Cohesion: 0.05
Nodes (33): blur(), blur_hdr(), brush_texture(), Camera, Canvas, fbm(), finish(), from_f() (+25 more)

### Community 31 - "Community 31"
Cohesion: 0.05
Nodes (33): blur(), blur_hdr(), brush_texture(), Camera, Canvas, fbm(), finish(), from_f() (+25 more)

### Community 32 - "Community 32"
Cohesion: 0.12
Nodes (19): hexc(), main(), mix(), post(), pts(), Combat background for Act III: "La Guarida del Dragón" (Ignifax's lair).  Paints, Three receding layers of cavern wall, hazier with depth., Glowing fissure top-left: the main light source. (+11 more)

### Community 33 - "Community 33"
Cohesion: 0.08
Nodes (45): arch_path(), barrel_end(), barrel_up(), bottle_shelf(), box_mean(), build_svg(), candle(), crate() (+37 more)

### Community 34 - "Community 34"
Cohesion: 0.09
Nodes (43): additive(), analyze(), bell(), brass_note(), choir_note(), cymbal(), db(), decode() (+35 more)

### Community 35 - "Community 35"
Cohesion: 0.11
Nodes (21): hexc(), main(), mix(), mul(), post(), pts(), Combat background for Act III: "El Laberinto del Contemplador".  Paints an impos, Face colours (top, left, right) for a stone box at screen point. (+13 more)

### Community 36 - "Community 36"
Cohesion: 0.09
Nodes (43): adsr(), bell_fm(), _biquad_response(), convolve_stereo(), decode(), fft_filter(), fft_filter_stereo(), finish() (+35 more)

### Community 37 - "Community 37"
Cohesion: 0.10
Nodes (39): additive(), analyze(), bell(), brass_note(), choir_note(), cymbal(), db(), decode() (+31 more)

### Community 38 - "Community 38"
Cohesion: 0.09
Nodes (43): adsr(), bell_fm(), _biquad_response(), convolve_stereo(), decode(), fft_filter(), fft_filter_stereo(), finish() (+35 more)

### Community 39 - "Community 39"
Cohesion: 0.09
Nodes (43): additive(), analyze(), bell(), brass_note(), choir_note(), cymbal(), db(), decode() (+35 more)

### Community 40 - "Community 40"
Cohesion: 0.70
Nodes (4): checkMajorVersion(), majorOf(), readMeta(), writeMeta()

### Community 41 - "Community 41"
Cohesion: 0.09
Nodes (43): adsr(), bell_fm(), _biquad_response(), convolve_stereo(), decode(), fft_filter(), fft_filter_stereo(), finish() (+35 more)

### Community 42 - "Community 42"
Cohesion: 0.10
Nodes (39): additive(), analyze(), bell(), brass_note(), choir_note(), cymbal(), db(), decode() (+31 more)

### Community 43 - "Community 43"
Cohesion: 0.09
Nodes (43): adsr(), bell_fm(), _biquad_response(), convolve_stereo(), decode(), fft_filter(), fft_filter_stereo(), finish() (+35 more)

### Community 44 - "Community 44"
Cohesion: 0.10
Nodes (94): abisal(), aliento(), aullido(), bell_modes(), bloqueo(), bubble(), carta(), click() (+86 more)

### Community 45 - "Community 45"
Cohesion: 0.09
Nodes (26): Pt, Action, ActionType, activeAction(), BoneId, EffectGeometry, Effects, Matrix (+18 more)

### Community 46 - "Community 46"
Cohesion: 0.12
Nodes (33): desenlaceCampana, borrarGuardado(), hayGuardado(), crearRng(), afilarCarta(), avanzarCapitulo(), cartaExtraEnSala(), curaDeDescanso() (+25 more)

### Community 47 - "Community 47"
Cohesion: 0.10
Nodes (40): chord_at(), dyn(), line(), NoteCache, presence(), Act III normal battle - "Brasas y locura": the evil is close.  E minor / E phryg, Celli: heavy detache 8ths; basses: bowed half notes an octave below., Caches rendered notes of the Act I instruments (seed varies by 3). (+32 more)

### Community 48 - "Community 48"
Cohesion: 0.10
Nodes (30): alcanzablesDesde(), candidatosMision(), colocarTabernas(), DISTANCIA_MISION, esAlcanzable(), generarMapa(), nodosDisponibles(), TIPOS_MISION (+22 more)

### Community 49 - "Community 49"
Cohesion: 0.18
Nodes (23): bass_of(), chord_spans(), line(), m(), phrase_vel(), Title theme - "La puerta del juego": animated-fantasy overture in D major, 96 BP, Slight arch: stronger on downbeats and long notes., Melodic first violins: answer, development questions and the return 8va. (+15 more)

### Community 50 - "Community 50"
Cohesion: 0.22
Nodes (22): blen(), chord_at(), dyn(), line_events(), Boss theme III - "Ignifax and the Beholder": final battle, C harmonic minor, 150, Yield (time, midi, seconds); crosses bar lines using the meter table., Low strings: frantic 16th spiccato, 3-3-2 accents (2+2+3 in 7/8)., Upper strings: frantic 16th arpeggios (a2, c, climax, turn), tremolo in b. (+14 more)

### Community 51 - "Community 51"
Cohesion: 0.10
Nodes (20): bloom(), blur(), _box_mean(), brush_texture(), fractal_noise(), kuwahara(), mockup(), painterly_warp() (+12 more)

### Community 52 - "Community 52"
Cohesion: 0.10
Nodes (20): bloom(), blur(), _box_mean(), brush_texture(), fractal_noise(), kuwahara(), mockup(), painterly_warp() (+12 more)

### Community 53 - "Community 53"
Cohesion: 0.12
Nodes (19): bass_clarinet(), bone_xylo(), choir_ooh(), finish(), marimba(), _modal(), muffled_tamb(), organ() (+11 more)

### Community 54 - "Community 54"
Cohesion: 0.05
Nodes (50): AlmacenSimple, DiaAgenda, DIAS_AGENDA, FRASES_DM, GUION_AGENDA, INTENCION_DM, LineaAgenda, marcarFinalVerdadero() (+42 more)

### Community 55 - "Community 55"
Cohesion: 0.27
Nodes (16): dyn(), line_events(), Boss theme A - "Warlord": orchestral battle epic in D minor, 140 BPM, 40 bars., Global dynamic curve used by the ostinato and percussion., render_choir(), render_cymbals(), render_horns(), render_low_brass() (+8 more)

### Community 56 - "Community 56"
Cohesion: 0.27
Nodes (16): dyn(), line_events(), Boss theme B - "Omen": dark ritual tension in E Phrygian, 132 BPM, 40 bars.  For, render_bells(), render_choir(), render_cymbals(), render_heartbeat(), render_horns() (+8 more)

### Community 57 - "Community 57"
Cohesion: 0.18
Nodes (13): box(), build(), composite(), long_bone(), main(), Combat background «La Cripta» (Act II): the crypt of Vol'guth under the ruined s, Blue will-o'-the-wisp: soft halo, flame tongue and bright core (emissive)., Fills a planar region with staggered ashlar blocks. quad_fn maps (u, v) to scree (+5 more)

### Community 58 - "Community 58"
Cohesion: 0.67
Nodes (3): JEFE_OGRO, SENOR_CRIPTA, Jefes únicos con rasgo propio

### Community 60 - "Community 60"
Cohesion: 0.09
Nodes (24): cymbal_roll(), dark_bell(), drone(), harmonics(), lib_note(), muffled_taiko(), piccolo(), Extensions for the Act III track: bridges the two approved synths and adds timpa (+16 more)

### Community 65 - "Community 65"
Cohesion: 0.48
Nodes (6): bar_t(), build_parts(), melody_events(), Act I, proposal B: "Taberna y travesura".  Playful, cheeky goblin jig. G mixolyd, Short notes use the staccato articulation for a cheeky, bouncy line., section()

### Community 66 - "Community 66"
Cohesion: 0.60
Nodes (5): bar_t(), build_parts(), melody_events(), Act II normal combat: "Marcha de los huesos" (La Cripta / El Templo Oscuro).  Sp, section()

### Community 68 - "Community 68"
Cohesion: 0.40
Nodes (4): Composición obligatoria (la interfaz va encima), Entrega, Estilo del juego, Herramientas disponibles

### Community 69 - "Community 69"
Cohesion: 0.50
Nodes (3): Dirección musical del juego, Entrega, Técnica

### Community 74 - "Community 74"
Cohesion: 0.10
Nodes (25): poolDeClase(), recompensaCartas(), Presentador, Shell HTML del juego (canvas fx + #app + #overlay), Arquitectura: núcleo sin DOM + interfaz Presentador, Estructura de carpetas (core / ui / fx / estilos), Mejora de cartas en campamentos, Smoke test del motor sin navegador (+17 more)

### Community 75 - "Community 75"
Cohesion: 0.09
Nodes (26): cartaPorId(), cargarRun(), Guardado, guardarRun(), rehidratarRun(), serializarRun(), DE_BARBARO, DE_BRUJO (+18 more)

### Community 78 - "Community 78"
Cohesion: 0.11
Nodes (22): CONJURO_PRODIGIOSO, MAGO, crearEspacios(), ORDEN_NIVELES, piramideConjuros(), CartaJugada, EfectoConjuro, EfectoInvocacion (+14 more)

## Knowledge Gaps
- **293 isolated node(s):** `version`, `configurations`, `name`, `private`, `version` (+288 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Combate` connect `Community 23` to `Community 54`, `Community 74`, `Community 78`, `Community 14`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `Mazo y Mazmorra` connect `Eventos y recompensas` to `Configuración de Vite y PWA`, `Audio y música`, `Community 78`, `Community 15`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `Skill /release (versión + changelog + push a main)` connect `Configuración de Vite y PWA` to `Eventos y recompensas`, `Community 74`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Are the 30 inferred relationships involving `rng()` (e.g. with `abisal()` and `aliento()`) actually correct?**
  _`rng()` has 30 INFERRED edges - model-reasoned connections that need verification._
- **Are the 27 inferred relationships involving `reverb()` (e.g. with `abisal()` and `aliento()`) actually correct?**
  _`reverb()` has 27 INFERRED edges - model-reasoned connections that need verification._
- **What connects `version`, `configurations`, `name` to the rest of the system?**
  _615 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Bestiario de enemigos` be split into smaller, more focused modules?**
  _Cohesion score 0.03773584905660377 - nodes in this community are weakly interconnected._