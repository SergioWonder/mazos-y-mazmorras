# Graph Report - videogame  (2026-09-25)

## Corpus Check
- 42 files · ~79,880 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 550 nodes · 1138 edges · 24 communities (20 shown, 4 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 79 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ec14b729`
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
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Motor de partículas|Motor de partículas]]
- [[_COMMUNITY_Skill editar-carta|Skill /editar-carta]]
- [[_COMMUNITY_Skill release|Skill /release]]
- [[_COMMUNITY_Créditos de audio|Créditos de audio]]
- [[_COMMUNITY_Cartas de 1 uso|Cartas de 1 uso]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]

## God Nodes (most connected - your core abstractions)
1. `Combate` - 42 edges
2. `el()` - 24 edges
3. `MotorAudio` - 23 edges
4. `juego()` - 20 edges
5. `EnemigoCombate` - 18 edges
6. `EstadoRun` - 16 edges
7. `compilerOptions` - 15 edges
8. `Mazo y Mazmorra` - 15 edges
9. `compilerOptions` - 15 edges
10. `instanciar()` - 14 edges

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

## Communities (24 total, 4 thin omitted)

### Community 0 - "Bestiario de enemigos"
Cohesion: 0.04
Nodes (47): ACOLITO_VELADO, AZOTAMENTES, AZOTAMENTES_ANCIANO, BANDIDO_BALLESTERO, CABALLERO_TUMBARIO, CAPITAN_BANDIDO, CEREBRO_ANCIANO, CUBO_GELATINOSO (+39 more)

### Community 1 - "Persistencia y partículas"
Cohesion: 0.06
Nodes (52): BASICAS, CartaDef, Convención: el texto de la carta debe cuadrar con su efecto, AMBIENTES, ConfigAmbiente, ConfigEfecto, EFECTOS, EstiloAmbiente (+44 more)

### Community 2 - "Motor de combate"
Cohesion: 0.08
Nodes (23): defDe(), instanciar(), Combate, crearEspacios(), ORDEN_NIVELES, piramideConjuros(), crearEnemigo(), GOBLIN_FAMELICO (+15 more)

### Community 3 - "Actos, mapa y guardado"
Cohesion: 0.13
Nodes (18): Presentador, ACTOS, CONTEMPLADOR, GOBLIN_ARQUERO, GOBLIN_CORTADOR, HERALDO_CULTO, IGNIFAX, Arquitectura: núcleo sin DOM + interfaz Presentador (+10 more)

### Community 4 - "Audio y música"
Cohesion: 0.10
Nodes (11): Loop chiptune procedural de respaldo, Música 8-bit con pistas CC0 de OpenGameArt, Efectos de sonido sintetizados (Web Audio API, sin ficheros), audio, Capa, MotorAudio, RECETAS, TemaChip (+3 more)

### Community 5 - "Combate: turnos e invocaciones"
Cohesion: 0.07
Nodes (52): cartaPorId(), mazoInicial(), borrarGuardado(), cargarRun(), Guardado, guardarRun(), hayGuardado(), rehidratarRun() (+44 more)

### Community 6 - "Renderizado de cartas"
Cohesion: 0.07
Nodes (39): Action, ACTION_DURATION, ActionProgress, ActionType, activeAction(), applyMatrix(), BONE_ORDER, BoneId (+31 more)

### Community 7 - "Dado 3D en WebGL"
Cohesion: 0.10
Nodes (14): COLOR_CRITICO, COLOR_NORMAL, COLOR_PIFIA, COLOR_TENUE, escala(), identidad(), Mat4, qHaciaCamara() (+6 more)

### Community 8 - "Eventos y recompensas"
Cohesion: 0.07
Nodes (38): cartaUnicaDeClase(), CONJURO_PRODIGIOSO, DAGA, danoExplosion(), INICIALES_DE_CLASE, lanzarExplosion(), MAGO, NEUTRALES_ESPECIALES (+30 more)

### Community 9 - "Configuración de TypeScript"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+8 more)

### Community 11 - "Dependencias y scripts npm"
Cohesion: 0.15
Nodes (12): devDependencies, typescript, vite, vite-plugin-pwa, name, private, scripts, build (+4 more)

### Community 12 - "Diseño del juego y Bárbaro"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+8 more)

### Community 13 - "Community 13"
Cohesion: 0.20
Nodes (12): Skill /editar-carta (aplica comentarios del Compendio), Compendio de cartas, Skill /release (versión + changelog + push a main), Ventana de novedades alimentada por CHANGELOG, CHANGELOG, EntradaCambios, iniciarActualizaciones(), mostrarAvisoActualizar() (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (37): BARBARO, BRUJO, DRUIDA, PICARO, SELLO_PACTO, PV_POR_CLASE, EstadoId, FormaInvocacion (+29 more)

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
- **168 isolated node(s):** `version`, `configurations`, `name`, `private`, `version` (+163 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Combate` connect `Motor de combate` to `Eventos y recompensas`, `Persistencia y partículas`, `Actos, mapa y guardado`, `Community 15`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `Mazo y Mazmorra` connect `Community 15` to `Eventos y recompensas`, `Audio y música`, `Community 13`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `version`, `configurations`, `name` to the rest of the system?**
  _173 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Bestiario de enemigos` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Persistencia y partículas` be split into smaller, more focused modules?**
  _Cohesion score 0.06247086247086247 - nodes in this community are weakly interconnected._
- **Should `Motor de combate` be split into smaller, more focused modules?**
  _Cohesion score 0.08166969147005444 - nodes in this community are weakly interconnected._
- **Should `Actos, mapa y guardado` be split into smaller, more focused modules?**
  _Cohesion score 0.12631578947368421 - nodes in this community are weakly interconnected._