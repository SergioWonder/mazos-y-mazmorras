# Graph Report - videogame  (2026-08-27)

## Corpus Check
- 39 files · ~73,549 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 473 nodes · 1010 edges · 20 communities (17 shown, 3 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 78 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `90bd1257`
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
- [[_COMMUNITY_Motor de partículas|Motor de partículas]]
- [[_COMMUNITY_Skill editar-carta|Skill /editar-carta]]
- [[_COMMUNITY_Skill release|Skill /release]]
- [[_COMMUNITY_Créditos de audio|Créditos de audio]]
- [[_COMMUNITY_Cartas de 1 uso|Cartas de 1 uso]]

## God Nodes (most connected - your core abstractions)
1. `Combate` - 42 edges
2. `el()` - 24 edges
3. `MotorAudio` - 23 edges
4. `juego()` - 20 edges
5. `EnemigoCombate` - 18 edges
6. `EstadoRun` - 16 edges
7. `compilerOptions` - 15 edges
8. `Mazo y Mazmorra` - 15 edges
9. `instanciar()` - 14 edges
10. `fx` - 11 edges

## Surprising Connections (you probably didn't know these)
- `uiSilenciosa` --implements--> `Arquitectura: núcleo sin DOM + interfaz Presentador`  [INFERRED]
  scripts/smoke-test.ts → README.md
- `recompensaCartas()` --conceptually_related_to--> `Mejora de cartas en campamentos`  [INFERRED]
  src/core/cartas.ts → README.md
- `rehidratarRun()` --conceptually_related_to--> `PWA jugable sin conexión`  [INFERRED]
  src/core/guardado.ts → README.md
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

## Communities (20 total, 3 thin omitted)

### Community 0 - "Bestiario de enemigos"
Cohesion: 0.04
Nodes (47): ACOLITO_VELADO, AZOTAMENTES, AZOTAMENTES_ANCIANO, BANDIDO_BALLESTERO, CABALLERO_TUMBARIO, CAPITAN_BANDIDO, CEREBRO_ANCIANO, CUBO_GELATINOSO (+39 more)

### Community 1 - "Persistencia y partículas"
Cohesion: 0.06
Nodes (67): cartaPorId(), instanciar(), poolDeClase(), recompensaCartas(), cartaAleatoria(), borrarGuardado(), cargarRun(), Guardado (+59 more)

### Community 2 - "Motor de combate"
Cohesion: 0.07
Nodes (32): defDe(), Combate, crearEnemigo(), GOBLIN_FAMELICO, SELLO_PACTO, CartaDef, CartaInstancia, ContextoEfecto (+24 more)

### Community 3 - "Actos, mapa y guardado"
Cohesion: 0.12
Nodes (18): ACTOS, CONTEMPLADOR, GOBLIN_ARQUERO, GOBLIN_CORTADOR, HERALDO_CULTO, IGNIFAX, JEFE_OGRO, SENOR_CRIPTA (+10 more)

### Community 5 - "Combate: turnos e invocaciones"
Cohesion: 0.33
Nodes (5): crearEspacios(), ORDEN_NIVELES, piramideConjuros(), Capitulo, EnemigoDef

### Community 6 - "Renderizado de cartas"
Cohesion: 0.05
Nodes (57): Loop chiptune procedural de respaldo, Música 8-bit con pistas CC0 de OpenGameArt, Efectos de sonido sintetizados (Web Audio API, sin ficheros), Convención: el texto de la carta debe cuadrar con su efecto, audio, Capa, RECETAS, TemaChip (+49 more)

### Community 7 - "Dado 3D en WebGL"
Cohesion: 0.10
Nodes (12): COLOR_CRITICO, COLOR_NORMAL, COLOR_PIFIA, COLOR_TENUE, escala(), identidad(), Mat4, qHaciaCamara() (+4 more)

### Community 8 - "Eventos y recompensas"
Cohesion: 0.15
Nodes (13): curar(), defNombre(), elegirEvento(), EventoDef, EVENTOS_NEGATIVOS, EVENTOS_POSITIVOS, mejorables(), mejorarAleatorias() (+5 more)

### Community 9 - "Configuración de TypeScript"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+8 more)

### Community 10 - "Cartas: registro y Explosión"
Cohesion: 0.05
Nodes (50): BARBARO, BASICAS, BRUJO, cartaUnicaDeClase(), CONJURO_PRODIGIOSO, DAGA, danoExplosion(), DRUIDA (+42 more)

### Community 11 - "Dependencias y scripts npm"
Cohesion: 0.15
Nodes (12): devDependencies, typescript, vite, vite-plugin-pwa, name, private, scripts, build (+4 more)

### Community 12 - "Diseño del juego y Bárbaro"
Cohesion: 0.33
Nodes (6): Presentador, Shell HTML del juego (canvas fx + #app + #overlay), Arquitectura: núcleo sin DOM + interfaz Presentador, Estructura de carpetas (core / ui / fx / estilos), Smoke test del motor sin navegador, uiSilenciosa

### Community 20 - "Skill /editar-carta"
Cohesion: 0.40
Nodes (4): /editar-carta — aplicar comentarios del Compendio a las cartas, Entrada, Notas, Pasos

### Community 21 - "Skill /release"
Cohesion: 0.40
Nodes (4): Notas, Pasos (ejecútalos en orden), /release — publicar versión con ventana de novedades, Uso

### Community 22 - "Créditos de audio"
Cohesion: 0.50
Nodes (3): Cambiar o ampliar pistas, Música y sonido, Pistas usadas (todas CC0 / dominio público)

## Knowledge Gaps
- **138 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+133 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Combate` connect `Motor de combate` to `Persistencia y partículas`, `Actos, mapa y guardado`, `Combate: turnos e invocaciones`, `Renderizado de cartas`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `MotorAudio` connect `Audio y música` to `Renderizado de cartas`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `Mazo y Mazmorra` connect `Cartas: registro y Explosión` to `Renderizado de cartas`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _143 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Bestiario de enemigos` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Persistencia y partículas` be split into smaller, more focused modules?**
  _Cohesion score 0.05823293172690763 - nodes in this community are weakly interconnected._
- **Should `Motor de combate` be split into smaller, more focused modules?**
  _Cohesion score 0.06628621597892889 - nodes in this community are weakly interconnected._