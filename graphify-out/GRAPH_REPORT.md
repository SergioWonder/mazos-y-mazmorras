# Graph Report - videogame  (2026-09-25)

## Corpus Check
- 51 files · ~103,077 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 742 nodes · 1708 edges · 35 communities (32 shown, 3 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 81 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e21a29b2`
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
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]

## God Nodes (most connected - your core abstractions)
1. `Combate` - 42 edges
2. `el()` - 25 edges
3. `MotorAudio` - 23 edges
4. `PuppetSprite` - 23 edges
5. `P()` - 21 edges
6. `L()` - 21 edges
7. `C()` - 20 edges
8. `juego()` - 20 edges
9. `EnemigoCombate` - 18 edges
10. `E()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `uiSilenciosa` --implements--> `Arquitectura: núcleo sin DOM + interfaz Presentador`  [INFERRED]
  scripts/smoke-test.ts → README.md
- `mazoInicial()` --implements--> `Mazos iniciales (5 Golpe + 4 Defender + 2 de clase)`  [INFERRED]
  src/core/cartas.ts → README.md
- `recompensaCartas()` --conceptually_related_to--> `Mejora de cartas en campamentos`  [INFERRED]
  src/core/cartas.ts → README.md
- `GOBLIN_FAMELICO` --conceptually_related_to--> `Intención enemiga`  [INFERRED]
  src/core/enemigos.ts → README.md
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

## Communities (35 total, 3 thin omitted)

### Community 0 - "Bestiario de enemigos"
Cohesion: 0.04
Nodes (45): ACOLITO_VELADO, AZOTAMENTES, AZOTAMENTES_ANCIANO, BANDIDO_BALLESTERO, CABALLERO_TUMBARIO, CAPITAN_BANDIDO, CEREBRO_ANCIANO, CUBO_GELATINOSO (+37 more)

### Community 1 - "Persistencia y partículas"
Cohesion: 0.22
Nodes (14): borrarGuardado(), hayGuardado(), avanzarCapitulo(), fx, juego(), pantallaCapitulo(), pantallaCombate(), EPILOGO (+6 more)

### Community 2 - "Motor de combate"
Cohesion: 0.19
Nodes (13): EMISSIVE, EYES, BONE_INDEX, FLAG, hexRgb(), lighten(), multiply(), packRig() (+5 more)

### Community 3 - "Actos, mapa y guardado"
Cohesion: 0.11
Nodes (21): poolDeClase(), recompensaCartas(), CONTEMPLADOR, GOBLIN_ARQUERO, GOBLIN_CORTADOR, HERALDO_CULTO, IGNIFAX, JEFE_OGRO (+13 more)

### Community 4 - "Audio y música"
Cohesion: 0.10
Nodes (10): Loop chiptune procedural de respaldo, Música 8-bit con pistas CC0 de OpenGameArt, Efectos de sonido sintetizados (Web Audio API, sin ficheros), audio, Capa, MotorAudio, RECETAS, TemaChip (+2 more)

### Community 5 - "Combate: turnos e invocaciones"
Cohesion: 0.11
Nodes (20): cartaUnicaDeClase(), cartaAleatoria(), curar(), defNombre(), elegirEvento(), EventoDef, EVENTOS_NEGATIVOS, EVENTOS_POSITIVOS (+12 more)

### Community 6 - "Renderizado de cartas"
Cohesion: 0.06
Nodes (51): Action, ACTION_DURATION, ActionProgress, ActionType, activeAction(), applyMatrix(), BONE_ORDER, BoneId (+43 more)

### Community 7 - "Dado 3D en WebGL"
Cohesion: 0.10
Nodes (14): COLOR_CRITICO, COLOR_NORMAL, COLOR_PIFIA, COLOR_TENUE, escala(), identidad(), Mat4, qHaciaCamara() (+6 more)

### Community 8 - "Eventos y recompensas"
Cohesion: 0.15
Nodes (17): CONJURO_PRODIGIOSO, DAGA, danoExplosion(), INICIALES_DE_CLASE, lanzarExplosion(), MAGO, NEUTRALES_ESPECIALES, POOLS (+9 more)

### Community 9 - "Configuración de TypeScript"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+8 more)

### Community 10 - "Cartas: registro y Explosión"
Cohesion: 0.11
Nodes (24): BossExtras, ACTION_DURATION, ActionProgress, applyMatrix(), BONE_ORDER, Burst, DEFAULT_PIVOTS, easeOut() (+16 more)

### Community 11 - "Dependencias y scripts npm"
Cohesion: 0.15
Nodes (12): devDependencies, typescript, vite, vite-plugin-pwa, name, private, scripts, build (+4 more)

### Community 12 - "Diseño del juego y Bárbaro"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+8 more)

### Community 13 - "Community 13"
Cohesion: 0.25
Nodes (9): BoneId, EffectGeometry, Effects, Matrix, Pose, SvgView, BONES, GpuFrame (+1 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (18): ACTOS, GOBLIN_FAMELICO, IMAGEN_ILUSORIA, OBSERVADOR, ClaseId, ENEMY_RIGS, INVOCATION_RIGS, BOSS_SUMMONS (+10 more)

### Community 15 - "Community 15"
Cohesion: 0.33
Nodes (9): cartaPorId(), instanciar(), cargarRun(), Guardado, guardarRun(), rehidratarRun(), serializarRun(), reliquiaPorId() (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (5): Action, ActionType, activeAction(), loop(), PuppetSprite

### Community 17 - "Motor de partículas"
Cohesion: 0.08
Nodes (24): ParticleRendererGL, SHAPE_CODE, AmbientPreset, AMBIENTS, AmbientStyle, between(), EffectPreset, EFFECTS (+16 more)

### Community 18 - "Community 18"
Cohesion: 0.13
Nodes (43): bear(), beholder(), biped(), BipedOpts, BONE, BOSSES, brain(), Build (+35 more)

### Community 19 - "Community 19"
Cohesion: 0.05
Nodes (57): BASICAS, Skill /editar-carta (aplica comentarios del Compendio), Convención: el texto de la carta debe cuadrar con su efecto, Compendio de cartas, Controles de ratón y modo mando por teclado, PWA jugable sin conexión, Skill /release (versión + changelog + push a main), Ventana de novedades alimentada por CHANGELOG (+49 more)

### Community 20 - "Skill /editar-carta"
Cohesion: 0.33
Nodes (4): /editar-carta — aplicar comentarios del Compendio a las cartas, Entrada, Notas, Pasos

### Community 21 - "Skill /release"
Cohesion: 0.33
Nodes (4): Notas, Pasos (ejecútalos en orden), /release — publicar versión con ventana de novedades, Uso

### Community 22 - "Créditos de audio"
Cohesion: 0.40
Nodes (3): Cambiar o ampliar pistas, Música y sonido, Pistas usadas (todas CC0 / dominio público)

### Community 23 - "Community 23"
Cohesion: 0.07
Nodes (30): defDe(), Combate, crearEspacios(), ORDEN_NIVELES, piramideConjuros(), crearEnemigo(), barajar(), CartaDef (+22 more)

### Community 27 - "Community 27"
Cohesion: 0.07
Nodes (36): BARBARO, BRUJO, DRUIDA, PICARO, SELLO_PACTO, PV_POR_CLASE, EstadoId, Acrobacias (pícaro) (+28 more)

### Community 29 - "Community 29"
Cohesion: 0.29
Nodes (11): PuppetRig, active, capsule(), hexRgb(), lighten(), rgbHex(), runs(), shadowOf() (+3 more)

### Community 30 - "Community 30"
Cohesion: 0.24
Nodes (4): PuppetOptions, compile(), forceSvg(), PuppetStage

### Community 31 - "Community 31"
Cohesion: 0.29
Nodes (7): GUANTE_LADRON, HACHA_ANCESTRO, PENDULO_AMBAR, POOL_RELIQUIAS, TOTEM_ROBLE, ReliquiaDef, Reliquias inspiradas en objetos de D&D

### Community 32 - "Community 32"
Cohesion: 0.19
Nodes (12): mazoInicial(), generarMapa(), nodosDisponibles(), reliquiaInicial(), crearRng(), elegir(), nuevaRun(), TipoNodo (+4 more)

### Community 33 - "Community 33"
Cohesion: 0.33
Nodes (6): Presentador, Shell HTML del juego (canvas fx + #app + #overlay), Arquitectura: núcleo sin DOM + interfaz Presentador, Estructura de carpetas (core / ui / fx / estilos), Smoke test del motor sin navegador, uiSilenciosa

## Knowledge Gaps
- **200 isolated node(s):** `version`, `configurations`, `name`, `private`, `version` (+195 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Combate` connect `Community 23` to `Actos, mapa y guardado`, `Community 19`, `Community 27`, `Combate: turnos e invocaciones`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `Mazo y Mazmorra` connect `Community 27` to `Eventos y recompensas`, `Community 19`, `Audio y música`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `version`, `configurations`, `name` to the rest of the system?**
  _205 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Bestiario de enemigos` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `Actos, mapa y guardado` be split into smaller, more focused modules?**
  _Cohesion score 0.11462450592885376 - nodes in this community are weakly interconnected._
- **Should `Audio y música` be split into smaller, more focused modules?**
  _Cohesion score 0.10227272727272728 - nodes in this community are weakly interconnected._
- **Should `Combate: turnos e invocaciones` be split into smaller, more focused modules?**
  _Cohesion score 0.11333333333333333 - nodes in this community are weakly interconnected._