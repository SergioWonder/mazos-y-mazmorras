# Graph Report - .  (2026-08-26)

## Corpus Check
- 41 files · ~63,765 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 427 nodes · 924 edges · 18 communities (16 shown, 2 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 60 edges (avg confidence: 0.9)
- Token cost: 4,587 input · 8,837 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Persistencia y reliquias|Persistencia y reliquias]]
- [[_COMMUNITY_Bestiario de enemigos|Bestiario de enemigos]]
- [[_COMMUNITY_Cartas y diseño de clases|Cartas y diseño de clases]]
- [[_COMMUNITY_Renderizado de cartas|Renderizado de cartas]]
- [[_COMMUNITY_Motor de combate|Motor de combate]]
- [[_COMMUNITY_Audio y música|Audio y música]]
- [[_COMMUNITY_Tipos, conjuros y estados|Tipos, conjuros y estados]]
- [[_COMMUNITY_Eventos y recompensas|Eventos y recompensas]]
- [[_COMMUNITY_Partida, mapa y arquitectura|Partida, mapa y arquitectura]]
- [[_COMMUNITY_Dado 3D en WebGL|Dado 3D en WebGL]]
- [[_COMMUNITY_Configuración de TypeScript|Configuración de TypeScript]]
- [[_COMMUNITY_Dependencias y scripts npm|Dependencias y scripts npm]]
- [[_COMMUNITY_Versionado y despliegue|Versionado y despliegue]]
- [[_COMMUNITY_Motor de partículas|Motor de partículas]]
- [[_COMMUNITY_Jefes únicos|Jefes únicos]]
- [[_COMMUNITY_Cartas de 1 uso|Cartas de 1 uso]]

## God Nodes (most connected - your core abstractions)
1. `Combate` - 37 edges
2. `el()` - 24 edges
3. `MotorAudio` - 23 edges
4. `juego()` - 20 edges
5. `EnemigoCombate` - 16 edges
6. `EstadoRun` - 16 edges
7. `compilerOptions` - 15 edges
8. `instanciar()` - 13 edges
9. `fx` - 11 edges
10. `renderCarta()` - 10 edges

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

## Communities (18 total, 2 thin omitted)

### Community 0 - "Persistencia y reliquias"
Cohesion: 0.08
Nodes (43): cartaPorId(), borrarGuardado(), cargarRun(), Guardado, guardarRun(), hayGuardado(), rehidratarRun(), serializarRun() (+35 more)

### Community 1 - "Bestiario de enemigos"
Cohesion: 0.04
Nodes (47): ACOLITO_VELADO, AZOTAMENTES, AZOTAMENTES_ANCIANO, BANDIDO_BALLESTERO, CABALLERO_TUMBARIO, CAPITAN_BANDIDO, CEREBRO_ANCIANO, CUBO_GELATINOSO (+39 more)

### Community 2 - "Cartas y diseño de clases"
Cohesion: 0.06
Nodes (38): BARBARO, BASICAS, CONJURO_PRODIGIOSO, DAGA, DRUIDA, INICIALES_DE_CLASE, MAGO, NEUTRALES_ESPECIALES (+30 more)

### Community 3 - "Renderizado de cartas"
Cohesion: 0.09
Nodes (36): Convención: el texto de la carta debe cuadrar con su efecto, Controles de ratón y modo mando por teclado, actualizarTextoCarta(), ajustarTexto(), arteDeCarta(), Clave, CLAVES_EXTRA, cuadroPalabrasClave() (+28 more)

### Community 4 - "Motor de combate"
Cohesion: 0.12
Nodes (12): defDe(), instanciar(), Combate, crearEnemigo(), GOBLIN_FAMELICO, CartaInstancia, EnemigoCombate, JugadorCombate (+4 more)

### Community 5 - "Audio y música"
Cohesion: 0.10
Nodes (11): Loop chiptune procedural de respaldo, Música 8-bit con pistas CC0 de OpenGameArt, Efectos de sonido sintetizados (Web Audio API, sin ficheros), audio, Capa, MotorAudio, RECETAS, TemaChip (+3 more)

### Community 6 - "Tipos, conjuros y estados"
Cohesion: 0.10
Nodes (25): crearEspacios(), ORDEN_NIVELES, piramideConjuros(), Capitulo, barajar(), ContextoEfecto, EfectoConjuro, EfectoInvocacion (+17 more)

### Community 7 - "Eventos y recompensas"
Cohesion: 0.11
Nodes (22): cartaUnicaDeClase(), poolDeClase(), recompensaCartas(), cartaAleatoria(), curar(), defNombre(), elegirEvento(), EventoDef (+14 more)

### Community 8 - "Partida, mapa y arquitectura"
Cohesion: 0.13
Nodes (21): mazoInicial(), Presentador, ACTOS, CONTEMPLADOR, GOBLIN_ARQUERO, GOBLIN_CORTADOR, HERALDO_CULTO, IGNIFAX (+13 more)

### Community 9 - "Dado 3D en WebGL"
Cohesion: 0.10
Nodes (14): COLOR_CRITICO, COLOR_NORMAL, COLOR_PIFIA, COLOR_TENUE, escala(), identidad(), Mat4, qHaciaCamara() (+6 more)

### Community 10 - "Configuración de TypeScript"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+8 more)

### Community 11 - "Dependencias y scripts npm"
Cohesion: 0.15
Nodes (12): devDependencies, typescript, vite, vite-plugin-pwa, name, private, scripts, build (+4 more)

### Community 12 - "Versionado y despliegue"
Cohesion: 0.24
Nodes (10): Skill /release (versión + changelog + push a main), Ventana de novedades alimentada por CHANGELOG, CHANGELOG, EntradaCambios, iniciarActualizaciones(), mostrarAvisoActualizar(), mostrarNovedades(), mostrarNovedadesSiNuevo() (+2 more)

### Community 14 - "Jefes únicos"
Cohesion: 0.67
Nodes (3): JEFE_OGRO, SENOR_CRIPTA, Jefes únicos con rasgo propio

## Knowledge Gaps
- **122 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+117 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Combate` connect `Motor de combate` to `Cartas y diseño de clases`, `Renderizado de cartas`, `Tipos, conjuros y estados`, `Eventos y recompensas`, `Partida, mapa y arquitectura`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `EnemigoCombate` connect `Motor de combate` to `Bestiario de enemigos`, `Renderizado de cartas`, `Tipos, conjuros y estados`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _128 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Persistencia y reliquias` be split into smaller, more focused modules?**
  _Cohesion score 0.07617051013277429 - nodes in this community are weakly interconnected._
- **Should `Bestiario de enemigos` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Cartas y diseño de clases` be split into smaller, more focused modules?**
  _Cohesion score 0.06448202959830866 - nodes in this community are weakly interconnected._
- **Should `Renderizado de cartas` be split into smaller, more focused modules?**
  _Cohesion score 0.09146341463414634 - nodes in this community are weakly interconnected._