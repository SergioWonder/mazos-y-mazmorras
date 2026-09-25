# Graph Report - videogame  (2026-09-25)

## Corpus Check
- 57 files · ~294,795 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 796 nodes · 1820 edges · 33 communities (29 shown, 4 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 81 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6ed848ef`
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
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 48|Community 48]]

## God Nodes (most connected - your core abstractions)
1. `Combate` - 42 edges
2. `el()` - 25 edges
3. `MotorAudio` - 23 edges
4. `PuppetSprite` - 23 edges
5. `PuppetStage` - 22 edges
6. `P()` - 21 edges
7. `L()` - 21 edges
8. `C()` - 20 edges
9. `juego()` - 20 edges
10. `EnemigoCombate` - 18 edges

## Surprising Connections (you probably didn't know these)
- `uiSilenciosa` --implements--> `Arquitectura: núcleo sin DOM + interfaz Presentador`  [INFERRED]
  scripts/smoke-test.ts → README.md
- `mazoInicial()` --implements--> `Mazos iniciales (5 Golpe + 4 Defender + 2 de clase)`  [INFERRED]
  src/core/cartas.ts → README.md
- `recompensaCartas()` --conceptually_related_to--> `Mejora de cartas en campamentos`  [INFERRED]
  src/core/cartas.ts → README.md
- `generarMapa()` --implements--> `Mapa de 10 filas por capítulo`  [INFERRED]
  src/core/mapa.ts → README.md
- `SELLO_PACTO` --implements--> `Condena (ejecuta al igualar los PV actuales)`  [INFERRED]
  src/core/reliquias.ts → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Identidad mecánica del Pícaro** — readme_clase_picaro, readme_acrobacias, readme_veneno, readme_dagas, readme_ataques_furtivos, readme_descarte_sinergias [EXTRACTED 1.00]
- **Cadena de publicación: versión → changelog → CI → Pages** — release_skill_flujo_release, src_version_changelog, ui_actualizacion, workflows_deploy_github_pages, scripts_smoke_test [EXTRACTED 1.00]
- **Núcleo testeable sin DOM (Presentador)** — readme_arquitectura_presentador, core_combate_presentador, scripts_smoke_test_uisilenciosa, ui_combate, readme_estructura_carpetas [INFERRED 0.95]
- **Identidad mecánica del Brujo** — readme_clase_brujo, readme_explosion_sobrenatural, readme_condena, readme_invocacion_efimera, readme_armadura_agathys, readme_oscuridad [EXTRACTED 1.00]
- **Bucle bloqueo → daño devuelto → Condena** — readme_armadura_agathys, readme_condena, core_combate_combate_rebotaragathys, core_cartas_brujo [INFERRED 0.85]

## Communities (33 total, 4 thin omitted)

### Community 0 - "Bestiario de enemigos"
Cohesion: 0.04
Nodes (45): ACOLITO_VELADO, AZOTAMENTES, AZOTAMENTES_ANCIANO, BANDIDO_BALLESTERO, CABALLERO_TUMBARIO, CAPITAN_BANDIDO, CEREBRO_ANCIANO, CUBO_GELATINOSO (+37 more)

### Community 1 - "Persistencia y partículas"
Cohesion: 0.18
Nodes (5): BackdropTheme, PuppetOptions, compile(), forceSvg(), PuppetStage

### Community 2 - "Motor de combate"
Cohesion: 0.20
Nodes (13): ACTION_DURATION, PuppetRig, active, capsule(), hexRgb(), lighten(), rgbHex(), runs() (+5 more)

### Community 3 - "Actos, mapa y guardado"
Cohesion: 0.10
Nodes (21): ACTOS, CONTEMPLADOR, GOBLIN_ARQUERO, GOBLIN_CORTADOR, HERALDO_CULTO, IGNIFAX, BackdropShape, backgroundTheme() (+13 more)

### Community 5 - "Combate: turnos e invocaciones"
Cohesion: 0.05
Nodes (73): Música 8-bit con pistas CC0 de OpenGameArt, cartaPorId(), mazoInicial(), poolDeClase(), recompensaCartas(), cartaAleatoria(), curar(), defNombre() (+65 more)

### Community 6 - "Renderizado de cartas"
Cohesion: 0.07
Nodes (45): ClaseId, Action, ACTION_DURATION, ActionProgress, ActionType, activeAction(), applyMatrix(), BONE_ORDER (+37 more)

### Community 7 - "Dado 3D en WebGL"
Cohesion: 0.10
Nodes (14): COLOR_CRITICO, COLOR_NORMAL, COLOR_PIFIA, COLOR_TENUE, escala(), identidad(), Mat4, qHaciaCamara() (+6 more)

### Community 8 - "Eventos y recompensas"
Cohesion: 0.05
Nodes (50): BARBARO, BASICAS, BRUJO, cartaUnicaDeClase(), CONJURO_PRODIGIOSO, DAGA, danoExplosion(), DRUIDA (+42 more)

### Community 9 - "Configuración de TypeScript"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+8 more)

### Community 10 - "Cartas: registro y Explosión"
Cohesion: 0.12
Nodes (23): BossExtras, ActionProgress, applyMatrix(), BONE_ORDER, Burst, DEFAULT_PIVOTS, easeOut(), Emitter (+15 more)

### Community 11 - "Dependencias y scripts npm"
Cohesion: 0.15
Nodes (12): devDependencies, typescript, vite, vite-plugin-pwa, name, private, scripts, build (+4 more)

### Community 12 - "Diseño del juego y Bárbaro"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+8 more)

### Community 13 - "Community 13"
Cohesion: 0.14
Nodes (6): Action, ActionType, activeAction(), loop(), PuppetSprite, GpuView

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (18): IMAGEN_ILUSORIA, OBSERVADOR, ENEMY_RIGS, INVOCATION_RIGS, FormId, BOSS_SUMMONS, FORMS, GalleryCard (+10 more)

### Community 15 - "Community 15"
Cohesion: 0.23
Nodes (12): EMISSIVE, EYES, BONE_INDEX, FLAG, hexRgb(), lighten(), multiply(), packRig() (+4 more)

### Community 16 - "Community 16"
Cohesion: 0.38
Nodes (8): BoneId, EffectGeometry, Effects, spriteMatrix(), Matrix, Pose, BONES, GpuFrame

### Community 17 - "Motor de partículas"
Cohesion: 0.08
Nodes (24): ParticleRendererGL, SHAPE_CODE, AmbientPreset, AMBIENTS, AmbientStyle, between(), EffectPreset, EFFECTS (+16 more)

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (45): bear(), beholder(), biped(), BipedOpts, BONE, BOSSES, brain(), Build (+37 more)

### Community 19 - "Community 19"
Cohesion: 0.05
Nodes (51): Efectos de sonido sintetizados (Web Audio API, sin ficheros), CartaDef, Convención: el texto de la carta debe cuadrar con su efecto, audio, Capa, RECETAS, TemaChip, Controles de ratón y modo mando por teclado (+43 more)

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
Cohesion: 0.06
Nodes (43): defDe(), instanciar(), Combate, crearEspacios(), ORDEN_NIVELES, piramideConjuros(), crearEnemigo(), GOBLIN_FAMELICO (+35 more)

### Community 26 - "Configuración de Vite y PWA"
Cohesion: 0.12
Nodes (24): ChangelogEntry, isMajorUpgrade(), majorChangelog(), majorOf(), shouldNotifyMajor(), Skill /release (versión + changelog + push a main), Ventana de novedades alimentada por CHANGELOG, CHANGELOG (+16 more)

### Community 27 - "Community 27"
Cohesion: 0.67
Nodes (3): JEFE_OGRO, SENOR_CRIPTA, Jefes únicos con rasgo propio

### Community 29 - "Community 29"
Cohesion: 0.25
Nodes (7): Colores de fondo por clase, Encuadre, Estilo «ilustrado» (el de los monstruos del juego), Formato (obligatorio), Guía de estilo: arte de las cartas, Personajes y monstruos, Variedad

### Community 34 - "Community 34"
Cohesion: 0.33
Nodes (6): Presentador, Shell HTML del juego (canvas fx + #app + #overlay), Arquitectura: núcleo sin DOM + interfaz Presentador, Estructura de carpetas (core / ui / fx / estilos), Smoke test del motor sin navegador, uiSilenciosa

### Community 40 - "Community 40"
Cohesion: 0.70
Nodes (4): checkMajorVersion(), majorOf(), readMeta(), writeMeta()

## Knowledge Gaps
- **217 isolated node(s):** `version`, `configurations`, `name`, `private`, `version` (+212 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Combate` connect `Community 23` to `Community 19`, `Actos, mapa y guardado`, `Combate: turnos e invocaciones`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `MotorAudio` connect `Audio y música` to `Community 19`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `Mazo y Mazmorra` connect `Eventos y recompensas` to `Configuración de Vite y PWA`, `Combate: turnos e invocaciones`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `version`, `configurations`, `name` to the rest of the system?**
  _222 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Bestiario de enemigos` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `Actos, mapa y guardado` be split into smaller, more focused modules?**
  _Cohesion score 0.10144927536231885 - nodes in this community are weakly interconnected._
- **Should `Combate: turnos e invocaciones` be split into smaller, more focused modules?**
  _Cohesion score 0.050724637681159424 - nodes in this community are weakly interconnected._