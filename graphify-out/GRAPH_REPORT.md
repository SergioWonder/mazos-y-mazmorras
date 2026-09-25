# Graph Report - videogame  (2026-09-25)

## Corpus Check
- 47 files · ~93,913 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 668 nodes · 1490 edges · 29 communities (25 shown, 4 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 81 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1f15930a`
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
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]

## God Nodes (most connected - your core abstractions)
1. `Combate` - 42 edges
2. `el()` - 25 edges
3. `MotorAudio` - 23 edges
4. `juego()` - 20 edges
5. `EnemigoCombate` - 18 edges
6. `C()` - 18 edges
7. `P()` - 18 edges
8. `L()` - 18 edges
9. `EstadoRun` - 16 edges
10. `E()` - 16 edges

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

## Communities (29 total, 4 thin omitted)

### Community 0 - "Bestiario de enemigos"
Cohesion: 0.04
Nodes (46): ACOLITO_VELADO, AZOTAMENTES, AZOTAMENTES_ANCIANO, BANDIDO_BALLESTERO, CABALLERO_TUMBARIO, CAPITAN_BANDIDO, CEREBRO_ANCIANO, CUBO_GELATINOSO (+38 more)

### Community 1 - "Persistencia y partículas"
Cohesion: 0.06
Nodes (52): cartaPorId(), mazoInicial(), borrarGuardado(), cargarRun(), Guardado, guardarRun(), hayGuardado(), rehidratarRun() (+44 more)

### Community 2 - "Motor de combate"
Cohesion: 0.06
Nodes (43): BRUJO, defDe(), instanciar(), Combate, crearEspacios(), ORDEN_NIVELES, piramideConjuros(), crearEnemigo() (+35 more)

### Community 3 - "Actos, mapa y guardado"
Cohesion: 0.13
Nodes (18): CONTEMPLADOR, GOBLIN_ARQUERO, HERALDO_CULTO, IGNIFAX, currentForm(), FORM_RIGS, formFromLabel(), Cap (+10 more)

### Community 4 - "Audio y música"
Cohesion: 0.10
Nodes (10): Loop chiptune procedural de respaldo, Música 8-bit con pistas CC0 de OpenGameArt, Efectos de sonido sintetizados (Web Audio API, sin ficheros), audio, Capa, MotorAudio, RECETAS, TemaChip (+2 more)

### Community 5 - "Combate: turnos e invocaciones"
Cohesion: 0.16
Nodes (13): poolDeClase(), cartaAleatoria(), curar(), defNombre(), elegirEvento(), EventoDef, EVENTOS_NEGATIVOS, EVENTOS_POSITIVOS (+5 more)

### Community 6 - "Renderizado de cartas"
Cohesion: 0.05
Nodes (85): ClaseId, bear(), biped(), BipedOpts, BONE, brain(), Build, BUILDS (+77 more)

### Community 7 - "Dado 3D en WebGL"
Cohesion: 0.10
Nodes (14): COLOR_CRITICO, COLOR_NORMAL, COLOR_PIFIA, COLOR_TENUE, escala(), identidad(), Mat4, qHaciaCamara() (+6 more)

### Community 8 - "Eventos y recompensas"
Cohesion: 0.14
Nodes (17): CONJURO_PRODIGIOSO, danoExplosion(), lanzarExplosion(), MAGO, NEUTRALES_ESPECIALES, POOLS, recompensaCartas(), resolverDeseo() (+9 more)

### Community 9 - "Configuración de TypeScript"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+8 more)

### Community 10 - "Cartas: registro y Explosión"
Cohesion: 0.07
Nodes (45): Pt, Action, ACTION_DURATION, ActionProgress, ActionType, activeAction(), applyMatrix(), BONE_ORDER (+37 more)

### Community 11 - "Dependencias y scripts npm"
Cohesion: 0.15
Nodes (12): devDependencies, typescript, vite, vite-plugin-pwa, name, private, scripts, build (+4 more)

### Community 12 - "Diseño del juego y Bárbaro"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+8 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (24): BARBARO, Ambientación fantasía medieval D&D, Clase Bárbaro (80 PV), Controles, Roguelike de construcción de mazos, Diseño, Ejecutar, Estructura (+16 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (18): ACTOS, IMAGEN_ILUSORIA, OBSERVADOR, ENEMY_RIGS, INVOCATION_RIGS, FormId, BOSS_SUMMONS, FORMS (+10 more)

### Community 15 - "Community 15"
Cohesion: 0.33
Nodes (6): cartaUnicaDeClase(), OpcionEvento, EstadoRun, Don, DON_CARTA, DONES

### Community 16 - "Community 16"
Cohesion: 0.18
Nodes (11): DAGA, DRUIDA, INICIALES_DE_CLASE, PICARO, PV_POR_CLASE, Clase Druida (70 PV), Clase Pícaro (66 PV), Dagas (pícaro) (+3 more)

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (6): Presentador, Shell HTML del juego (canvas fx + #app + #overlay), Arquitectura: núcleo sin DOM + interfaz Presentador, Estructura de carpetas (core / ui / fx / estilos), Smoke test del motor sin navegador, uiSilenciosa

### Community 19 - "Community 19"
Cohesion: 0.08
Nodes (44): BASICAS, CartaDef, Skill /editar-carta (aplica comentarios del Compendio), Convención: el texto de la carta debe cuadrar con su efecto, Compendio de cartas, Controles de ratón y modo mando por teclado, PWA jugable sin conexión, actualizarTextoCarta() (+36 more)

### Community 20 - "Skill /editar-carta"
Cohesion: 0.33
Nodes (4): /editar-carta — aplicar comentarios del Compendio a las cartas, Entrada, Notas, Pasos

### Community 21 - "Skill /release"
Cohesion: 0.33
Nodes (4): Notas, Pasos (ejecútalos en orden), /release — publicar versión con ventana de novedades, Uso

### Community 22 - "Créditos de audio"
Cohesion: 0.40
Nodes (3): Cambiar o ampliar pistas, Música y sonido, Pistas usadas (todas CC0 / dominio público)

### Community 29 - "Community 29"
Cohesion: 0.67
Nodes (3): JEFE_OGRO, SENOR_CRIPTA, Jefes únicos con rasgo propio

## Knowledge Gaps
- **195 isolated node(s):** `version`, `configurations`, `name`, `private`, `version` (+190 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Combate` connect `Motor de combate` to `Community 19`, `Actos, mapa y guardado`, `Community 15`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `Mazo y Mazmorra` connect `Community 13` to `Community 16`, `Eventos y recompensas`, `Motor de combate`, `Audio y música`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `version`, `configurations`, `name` to the rest of the system?**
  _200 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Bestiario de enemigos` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `Persistencia y partículas` be split into smaller, more focused modules?**
  _Cohesion score 0.06201923076923077 - nodes in this community are weakly interconnected._
- **Should `Motor de combate` be split into smaller, more focused modules?**
  _Cohesion score 0.05630834086118639 - nodes in this community are weakly interconnected._
- **Should `Actos, mapa y guardado` be split into smaller, more focused modules?**
  _Cohesion score 0.12631578947368421 - nodes in this community are weakly interconnected._