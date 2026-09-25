# Graph Report - videogame  (2026-09-25)

## Corpus Check
- 56 files · ~110,998 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 796 nodes · 1837 edges · 49 communities (45 shown, 4 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 82 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d986ab96`
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

## God Nodes (most connected - your core abstractions)
1. `Combate` - 42 edges
2. `el()` - 25 edges
3. `MotorAudio` - 23 edges
4. `P()` - 23 edges
5. `L()` - 23 edges
6. `PuppetSprite` - 23 edges
7. `C()` - 22 edges
8. `juego()` - 20 edges
9. `PuppetStage` - 20 edges
10. `E()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `uiSilenciosa` --implements--> `Arquitectura: núcleo sin DOM + interfaz Presentador`  [INFERRED]
  scripts/smoke-test.ts → README.md
- `mazoInicial()` --implements--> `Mazos iniciales (5 Golpe + 4 Defender + 2 de clase)`  [INFERRED]
  src/core/cartas.ts → README.md
- `recompensaCartas()` --conceptually_related_to--> `Mejora de cartas en campamentos`  [INFERRED]
  src/core/cartas.ts → README.md
- `rehidratarRun()` --conceptually_related_to--> `PWA jugable sin conexión`  [INFERRED]
  src/core/guardado.ts → README.md
- `generarMapa()` --implements--> `Mapa de 10 filas por capítulo`  [INFERRED]
  src/core/mapa.ts → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Identidad mecánica del Pícaro** — readme_clase_picaro, readme_acrobacias, readme_veneno, readme_dagas, readme_ataques_furtivos, readme_descarte_sinergias [EXTRACTED 1.00]
- **Cadena de publicación: versión → changelog → CI → Pages** — release_skill_flujo_release, src_version_changelog, ui_actualizacion, workflows_deploy_github_pages, scripts_smoke_test [EXTRACTED 1.00]
- **Núcleo testeable sin DOM (Presentador)** — readme_arquitectura_presentador, core_combate_presentador, scripts_smoke_test_uisilenciosa, ui_combate, readme_estructura_carpetas [INFERRED 0.95]
- **Identidad mecánica del Brujo** — readme_clase_brujo, readme_explosion_sobrenatural, readme_condena, readme_invocacion_efimera, readme_armadura_agathys, readme_oscuridad [EXTRACTED 1.00]
- **Bucle bloqueo → daño devuelto → Condena** — readme_armadura_agathys, readme_condena, core_combate_combate_rebotaragathys, core_cartas_brujo [INFERRED 0.85]

## Communities (49 total, 4 thin omitted)

### Community 0 - "Bestiario de enemigos"
Cohesion: 0.04
Nodes (45): ACOLITO_VELADO, AZOTAMENTES, AZOTAMENTES_ANCIANO, BANDIDO_BALLESTERO, CABALLERO_TUMBARIO, CAPITAN_BANDIDO, CEREBRO_ANCIANO, CUBO_GELATINOSO (+37 more)

### Community 1 - "Persistencia y partículas"
Cohesion: 0.24
Nodes (12): fx, juego(), pantallaCapitulo(), pantallaCombate(), pantallaEvento(), EPILOGO, pantallaFin(), pantallaMision() (+4 more)

### Community 2 - "Motor de combate"
Cohesion: 0.23
Nodes (12): EMISSIVE, EYES, BONE_INDEX, FLAG, hexRgb(), lighten(), multiply(), packRig() (+4 more)

### Community 3 - "Actos, mapa y guardado"
Cohesion: 0.14
Nodes (16): CONTEMPLADOR, GOBLIN_ARQUERO, GOBLIN_CORTADOR, HERALDO_CULTO, IGNIFAX, currentForm(), formFromLabel(), shapeBBox() (+8 more)

### Community 5 - "Combate: turnos e invocaciones"
Cohesion: 0.13
Nodes (16): poolDeClase(), recompensaCartas(), cartaAleatoria(), curar(), defNombre(), elegirEvento(), EventoDef, EVENTOS_NEGATIVOS (+8 more)

### Community 6 - "Renderizado de cartas"
Cohesion: 0.07
Nodes (45): ClaseId, Action, ACTION_DURATION, ActionProgress, ActionType, activeAction(), applyMatrix(), BONE_ORDER (+37 more)

### Community 7 - "Dado 3D en WebGL"
Cohesion: 0.10
Nodes (14): COLOR_CRITICO, COLOR_NORMAL, COLOR_PIFIA, COLOR_TENUE, escala(), identidad(), Mat4, qHaciaCamara() (+6 more)

### Community 8 - "Eventos y recompensas"
Cohesion: 0.24
Nodes (10): CONJURO_PRODIGIOSO, danoExplosion(), lanzarExplosion(), NEUTRALES_ESPECIALES, POOLS, resolverDeseo(), resolverSeducir(), Cartas de azar incoloras (Seducir / Deseo, d20) (+2 more)

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
Cohesion: 0.29
Nodes (9): BoneId, EffectGeometry, Effects, spriteMatrix(), Matrix, Pose, SvgView, BONES (+1 more)

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (19): ACTOS, IMAGEN_ILUSORIA, OBSERVADOR, ENEMY_RIGS, INVOCATION_RIGS, FormId, BOSS_SUMMONS, FORMS (+11 more)

### Community 15 - "Community 15"
Cohesion: 0.27
Nodes (10): cartaPorId(), borrarGuardado(), cargarRun(), Guardado, guardarRun(), hayGuardado(), rehidratarRun(), serializarRun() (+2 more)

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (6): Action, ActionType, activeAction(), loop(), PuppetSprite, GpuView

### Community 17 - "Motor de partículas"
Cohesion: 0.08
Nodes (24): ParticleRendererGL, SHAPE_CODE, AmbientPreset, AMBIENTS, AmbientStyle, between(), EffectPreset, EFFECTS (+16 more)

### Community 18 - "Community 18"
Cohesion: 0.08
Nodes (59): BASE_PALETTE, c(), CLASS_LOOK, ClassLook, CREATURES, e(), FULL_SCENES, l() (+51 more)

### Community 19 - "Community 19"
Cohesion: 0.11
Nodes (22): Convención: el texto de la carta debe cuadrar con su efecto, animateCardParticles(), Layer, layers, loop(), Mote, spawn(), actualizarTextoCarta() (+14 more)

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
Nodes (41): defDe(), instanciar(), Combate, crearEspacios(), ORDEN_NIVELES, piramideConjuros(), crearEnemigo(), GOBLIN_FAMELICO (+33 more)

### Community 26 - "Configuración de Vite y PWA"
Cohesion: 0.12
Nodes (24): ChangelogEntry, isMajorUpgrade(), majorChangelog(), majorOf(), shouldNotifyMajor(), Skill /release (versión + changelog + push a main), Ventana de novedades alimentada por CHANGELOG, CHANGELOG (+16 more)

### Community 27 - "Community 27"
Cohesion: 0.17
Nodes (11): Actualizaciones y avisos, Arte de las cartas, Controles, Roguelike de construcción de mazos, Diseño, Ejecutar, Estructura, Mazo y Mazmorra (+3 more)

### Community 29 - "Community 29"
Cohesion: 0.36
Nodes (8): active, capsule(), hexRgb(), lighten(), rgbHex(), shadowOf(), shapeElement(), stages

### Community 30 - "Community 30"
Cohesion: 0.21
Nodes (4): PuppetOptions, compile(), forceSvg(), PuppetStage

### Community 31 - "Community 31"
Cohesion: 0.29
Nodes (7): GUANTE_LADRON, HACHA_ANCESTRO, PENDULO_AMBAR, POOL_RELIQUIAS, TOTEM_ROBLE, ReliquiaDef, Reliquias inspiradas en objetos de D&D

### Community 32 - "Community 32"
Cohesion: 0.24
Nodes (11): mazoInicial(), generarMapa(), nodosDisponibles(), reliquiaInicial(), crearRng(), elegir(), avanzarCapitulo(), nuevaRun() (+3 more)

### Community 33 - "Community 33"
Cohesion: 0.33
Nodes (6): Presentador, Shell HTML del juego (canvas fx + #app + #overlay), Arquitectura: núcleo sin DOM + interfaz Presentador, Estructura de carpetas (core / ui / fx / estilos), Smoke test del motor sin navegador, uiSilenciosa

### Community 34 - "Community 34"
Cohesion: 0.13
Nodes (19): Efectos de sonido sintetizados (Web Audio API, sin ficheros), audio, Capa, RECETAS, TemaChip, Controles de ratón y modo mando por teclado, ModsCarta, NOMBRE_CLASE (+11 more)

### Community 35 - "Community 35"
Cohesion: 0.22
Nodes (6): BASICAS, Skill /editar-carta (aplica comentarios del Compendio), Compendio de cartas, Comentarios, GRUPOS, mostrarExportacion()

### Community 36 - "Community 36"
Cohesion: 0.25
Nodes (8): cartaUnicaDeClase(), OpcionEvento, EstadoRun, Don, DON_CARTA, DONES, pantallaBendicion(), anuncio()

### Community 37 - "Community 37"
Cohesion: 0.22
Nodes (10): Loop chiptune procedural de respaldo, Música 8-bit con pistas CC0 de OpenGameArt, TEMAS, PWA jugable sin conexión, Tres actos con dos escenarios cada uno, cuadroPalabrasClave(), ampliarEnGrande(), avisoInstalacion() (+2 more)

### Community 38 - "Community 38"
Cohesion: 0.31
Nodes (9): CartaDef, cardScene, hasFullArt(), place(), cache, cardArtUrl(), paintBackground(), paintFinish() (+1 more)

### Community 39 - "Community 39"
Cohesion: 0.29
Nodes (7): DAGA, INICIALES_DE_CLASE, PICARO, Clase Pícaro (66 PV), Dagas (pícaro), Robo y descarte con sinergias (pícaro), Mazos iniciales (5 Golpe + 4 Defender + 2 de clase)

### Community 40 - "Community 40"
Cohesion: 0.70
Nodes (4): checkMajorVersion(), majorOf(), readMeta(), writeMeta()

### Community 41 - "Community 41"
Cohesion: 0.50
Nodes (4): DRUIDA, PV_POR_CLASE, Clase Druida (70 PV), Transformaciones (druida)

### Community 42 - "Community 42"
Cohesion: 0.43
Nodes (4): bbox(), PuppetRig, runs(), svgEl()

### Community 43 - "Community 43"
Cohesion: 0.40
Nodes (5): BRUJO, Ambientación fantasía medieval D&D, Clase Brujo (64 PV), Subclases del brujo: Archifata, Celestial, Infernal, Gran Antiguo, Subclases de D&D 2024 como cartas raras

### Community 44 - "Community 44"
Cohesion: 0.50
Nodes (4): BARBARO, Clase Bárbaro (80 PV), Furia (bárbaro), Hemorragia (bárbaro)

### Community 45 - "Community 45"
Cohesion: 0.50
Nodes (4): MAGO, EspacioConjuro, Clase Mago (62 PV), Espacios de conjuro en pirámide (mago)

### Community 46 - "Community 46"
Cohesion: 0.50
Nodes (3): ICONO_NODO, NOMBRE_NODO, pantallaMapa()

### Community 47 - "Community 47"
Cohesion: 0.67
Nodes (3): JEFE_OGRO, SENOR_CRIPTA, Jefes únicos con rasgo propio

## Knowledge Gaps
- **214 isolated node(s):** `version`, `configurations`, `name`, `private`, `version` (+209 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Combate` connect `Community 23` to `Community 34`, `Actos, mapa y guardado`, `Community 36`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `MotorAudio` connect `Audio y música` to `Community 34`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `Mazo y Mazmorra` connect `Community 27` to `Community 37`, `Community 39`, `Community 41`, `Community 43`, `Community 44`, `Community 45`, `Configuración de Vite y PWA`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `version`, `configurations`, `name` to the rest of the system?**
  _219 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Bestiario de enemigos` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `Actos, mapa y guardado` be split into smaller, more focused modules?**
  _Cohesion score 0.13725490196078433 - nodes in this community are weakly interconnected._
- **Should `Combate: turnos e invocaciones` be split into smaller, more focused modules?**
  _Cohesion score 0.1286549707602339 - nodes in this community are weakly interconnected._