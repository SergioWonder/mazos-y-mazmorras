# Graph Report - videogame  (2026-08-27)

## Corpus Check
- 39 files · ~74,343 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 474 nodes · 1011 edges · 23 communities (20 shown, 3 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 78 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `55b9fbdd`
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

## Communities (23 total, 3 thin omitted)

### Community 0 - "Bestiario de enemigos"
Cohesion: 0.04
Nodes (47): ACOLITO_VELADO, AZOTAMENTES, AZOTAMENTES_ANCIANO, BANDIDO_BALLESTERO, CABALLERO_TUMBARIO, CAPITAN_BANDIDO, CEREBRO_ANCIANO, CUBO_GELATINOSO (+39 more)

### Community 1 - "Persistencia y partículas"
Cohesion: 0.05
Nodes (70): cartaPorId(), cartaUnicaDeClase(), poolDeClase(), recompensaCartas(), borrarGuardado(), cargarRun(), Guardado, guardarRun() (+62 more)

### Community 2 - "Motor de combate"
Cohesion: 0.07
Nodes (30): defDe(), instanciar(), Combate, crearEnemigo(), GOBLIN_FAMELICO, cartaAleatoria(), SELLO_PACTO, barajar() (+22 more)

### Community 3 - "Actos, mapa y guardado"
Cohesion: 0.12
Nodes (18): ACTOS, CONTEMPLADOR, GOBLIN_ARQUERO, GOBLIN_CORTADOR, HERALDO_CULTO, IGNIFAX, JEFE_OGRO, SENOR_CRIPTA (+10 more)

### Community 4 - "Audio y música"
Cohesion: 0.13
Nodes (6): Loop chiptune procedural de respaldo, Música 8-bit con pistas CC0 de OpenGameArt, MotorAudio, TEMAS, PWA jugable sin conexión, Tres actos con dos escenarios cada uno

### Community 5 - "Combate: turnos e invocaciones"
Cohesion: 0.40
Nodes (5): crearEspacios(), ORDEN_NIVELES, piramideConjuros(), EspacioConjuro, Espacios de conjuro en pirámide (mago)

### Community 6 - "Renderizado de cartas"
Cohesion: 0.08
Nodes (37): Efectos de sonido sintetizados (Web Audio API, sin ficheros), Convención: el texto de la carta debe cuadrar con su efecto, audio, Capa, RECETAS, TemaChip, Controles de ratón y modo mando por teclado, actualizarTextoCarta() (+29 more)

### Community 7 - "Dado 3D en WebGL"
Cohesion: 0.10
Nodes (14): COLOR_CRITICO, COLOR_NORMAL, COLOR_PIFIA, COLOR_TENUE, escala(), identidad(), Mat4, qHaciaCamara() (+6 more)

### Community 8 - "Eventos y recompensas"
Cohesion: 0.15
Nodes (13): curar(), defNombre(), elegirEvento(), EventoDef, EVENTOS_NEGATIVOS, EVENTOS_POSITIVOS, mejorables(), mejorarAleatorias() (+5 more)

### Community 9 - "Configuración de TypeScript"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+8 more)

### Community 10 - "Cartas: registro y Explosión"
Cohesion: 0.06
Nodes (47): BARBARO, BASICAS, BRUJO, CONJURO_PRODIGIOSO, DAGA, danoExplosion(), DRUIDA, INICIALES_DE_CLASE (+39 more)

### Community 11 - "Dependencias y scripts npm"
Cohesion: 0.15
Nodes (12): devDependencies, typescript, vite, vite-plugin-pwa, name, private, scripts, build (+4 more)

### Community 12 - "Diseño del juego y Bárbaro"
Cohesion: 0.33
Nodes (6): Presentador, Shell HTML del juego (canvas fx + #app + #overlay), Arquitectura: núcleo sin DOM + interfaz Presentador, Estructura de carpetas (core / ui / fx / estilos), Smoke test del motor sin navegador, uiSilenciosa

### Community 13 - "Community 13"
Cohesion: 0.24
Nodes (10): Skill /release (versión + changelog + push a main), Ventana de novedades alimentada por CHANGELOG, CHANGELOG, EntradaCambios, iniciarActualizaciones(), mostrarAvisoActualizar(), mostrarNovedades(), mostrarNovedadesSiNuevo() (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.47
Nodes (4): FormaInvocacion, Invocacion, Invocación del druida, Invocaciones efímeras (brujo)

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
- **139 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+134 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Combate` connect `Motor de combate` to `Persistencia y partículas`, `Actos, mapa y guardado`, `Community 14`, `Renderizado de cartas`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `MotorAudio` connect `Audio y música` to `Renderizado de cartas`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `Mazo y Mazmorra` connect `Cartas: registro y Explosión` to `Audio y música`, `Community 13`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _144 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Bestiario de enemigos` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Persistencia y partículas` be split into smaller, more focused modules?**
  _Cohesion score 0.054858934169279 - nodes in this community are weakly interconnected._
- **Should `Motor de combate` be split into smaller, more focused modules?**
  _Cohesion score 0.07067307692307692 - nodes in this community are weakly interconnected._