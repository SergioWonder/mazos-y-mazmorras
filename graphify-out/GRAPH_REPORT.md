# Graph Report - videogame  (2026-08-27)

## Corpus Check
- 39 files · ~72,153 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 470 nodes · 1006 edges · 25 communities (23 shown, 2 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 78 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3365dc9f`
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
- [[_COMMUNITY_Estados de combate|Estados de combate]]
- [[_COMMUNITY_Compendio y comentarios|Compendio y comentarios]]
- [[_COMMUNITY_Cartas del Pícaro|Cartas del Pícaro]]
- [[_COMMUNITY_Motor de partículas|Motor de partículas]]
- [[_COMMUNITY_Druida y PV por clase|Druida y PV por clase]]
- [[_COMMUNITY_Skill editar-carta|Skill /editar-carta]]
- [[_COMMUNITY_Skill release|Skill /release]]
- [[_COMMUNITY_Créditos de audio|Créditos de audio]]
- [[_COMMUNITY_Jefes únicos|Jefes únicos]]
- [[_COMMUNITY_Cartas de 1 uso|Cartas de 1 uso]]

## God Nodes (most connected - your core abstractions)
1. `Combate` - 41 edges
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

## Communities (25 total, 2 thin omitted)

### Community 0 - "Bestiario de enemigos"
Cohesion: 0.04
Nodes (47): ACOLITO_VELADO, AZOTAMENTES, AZOTAMENTES_ANCIANO, BANDIDO_BALLESTERO, CABALLERO_TUMBARIO, CAPITAN_BANDIDO, CEREBRO_ANCIANO, CUBO_GELATINOSO (+39 more)

### Community 1 - "Persistencia y partículas"
Cohesion: 0.08
Nodes (43): borrarGuardado(), hayGuardado(), barajar(), elegir(), EstadoRun, AMBIENTES, ConfigAmbiente, ConfigEfecto (+35 more)

### Community 2 - "Motor de combate"
Cohesion: 0.11
Nodes (12): defDe(), Combate, crearEnemigo(), GOBLIN_FAMELICO, CartaInstancia, EnemigoCombate, JugadorCombate, Luchador (+4 more)

### Community 3 - "Actos, mapa y guardado"
Cohesion: 0.08
Nodes (37): mazoInicial(), Presentador, ACTOS, CONTEMPLADOR, GOBLIN_ARQUERO, GOBLIN_CORTADOR, HERALDO_CULTO, IGNIFAX (+29 more)

### Community 4 - "Audio y música"
Cohesion: 0.10
Nodes (11): Loop chiptune procedural de respaldo, Música 8-bit con pistas CC0 de OpenGameArt, Efectos de sonido sintetizados (Web Audio API, sin ficheros), audio, Capa, MotorAudio, RECETAS, TemaChip (+3 more)

### Community 5 - "Combate: turnos e invocaciones"
Cohesion: 0.13
Nodes (18): crearEspacios(), ORDEN_NIVELES, piramideConjuros(), Capitulo, EfectoConjuro, EfectoInvocacion, EfectoTemporal, EnemigoDef (+10 more)

### Community 6 - "Renderizado de cartas"
Cohesion: 0.09
Nodes (30): CartaDef, Convención: el texto de la carta debe cuadrar con su efecto, Controles de ratón y modo mando por teclado, actualizarTextoCarta(), ajustarTexto(), arteDeCarta(), Clave, CLAVES_EXTRA (+22 more)

### Community 7 - "Dado 3D en WebGL"
Cohesion: 0.10
Nodes (14): COLOR_CRITICO, COLOR_NORMAL, COLOR_PIFIA, COLOR_TENUE, escala(), identidad(), Mat4, qHaciaCamara() (+6 more)

### Community 8 - "Eventos y recompensas"
Cohesion: 0.07
Nodes (34): cartaPorId(), instanciar(), poolDeClase(), recompensaCartas(), cartaAleatoria(), curar(), defNombre(), elegirEvento() (+26 more)

### Community 9 - "Configuración de TypeScript"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+8 more)

### Community 10 - "Cartas: registro y Explosión"
Cohesion: 0.19
Nodes (13): cartaUnicaDeClase(), CONJURO_PRODIGIOSO, danoExplosion(), lanzarExplosion(), MAGO, NEUTRALES_ESPECIALES, POOLS, resolverDeseo() (+5 more)

### Community 11 - "Dependencias y scripts npm"
Cohesion: 0.15
Nodes (12): devDependencies, typescript, vite, vite-plugin-pwa, name, private, scripts, build (+4 more)

### Community 12 - "Diseño del juego y Bárbaro"
Cohesion: 0.15
Nodes (13): BRUJO, Ambientación fantasía medieval D&D, Clase Brujo (64 PV), Controles, Roguelike de construcción de mazos, Diseño, Ejecutar, Estructura (+5 more)

### Community 14 - "Estados de combate"
Cohesion: 0.22
Nodes (10): SELLO_PACTO, EstadoId, Acrobacias (pícaro), Condena (ejecuta al igualar los PV actuales), Hemorragia (bárbaro), Quemadura (Aliento de Dragón de Ignifax), Rayos del Contemplador (cartas que se agotan, sobrecarga, etéreas), Energía, bloqueo y Vulnerable/Débil/Frágil al estilo StS (+2 more)

### Community 15 - "Compendio y comentarios"
Cohesion: 0.18
Nodes (8): BARBARO, BASICAS, Clase Bárbaro (80 PV), Furia (bárbaro), Comentarios, GRUPOS, mostrarExportacion(), pantallaCompendio()

### Community 16 - "Cartas del Pícaro"
Cohesion: 0.29
Nodes (7): DAGA, INICIALES_DE_CLASE, PICARO, Clase Pícaro (66 PV), Dagas (pícaro), Robo y descarte con sinergias (pícaro), Mazos iniciales (5 Golpe + 4 Defender + 2 de clase)

### Community 18 - "Druida y PV por clase"
Cohesion: 0.33
Nodes (6): DRUIDA, PV_POR_CLASE, Clase Druida (70 PV), Oscuridad (baja el ataque de todos), Raíces (druida), Transformaciones (druida)

### Community 20 - "Skill /editar-carta"
Cohesion: 0.40
Nodes (4): /editar-carta — aplicar comentarios del Compendio a las cartas, Entrada, Notas, Pasos

### Community 21 - "Skill /release"
Cohesion: 0.40
Nodes (4): Notas, Pasos (ejecútalos en orden), /release — publicar versión con ventana de novedades, Uso

### Community 22 - "Créditos de audio"
Cohesion: 0.50
Nodes (3): Cambiar o ampliar pistas, Música y sonido, Pistas usadas (todas CC0 / dominio público)

### Community 23 - "Jefes únicos"
Cohesion: 0.67
Nodes (3): JEFE_OGRO, SENOR_CRIPTA, Jefes únicos con rasgo propio

## Knowledge Gaps
- **137 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+132 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Combate` connect `Motor de combate` to `Persistencia y partículas`, `Actos, mapa y guardado`, `Combate: turnos e invocaciones`, `Renderizado de cartas`, `Estados de combate`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `Mazo y Mazmorra` connect `Diseño del juego y Bárbaro` to `Actos, mapa y guardado`, `Audio y música`, `Cartas: registro y Explosión`, `Compendio y comentarios`, `Cartas del Pícaro`, `Druida y PV por clase`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _142 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Bestiario de enemigos` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Persistencia y partículas` be split into smaller, more focused modules?**
  _Cohesion score 0.08306010928961749 - nodes in this community are weakly interconnected._
- **Should `Motor de combate` be split into smaller, more focused modules?**
  _Cohesion score 0.11295681063122924 - nodes in this community are weakly interconnected._
- **Should `Actos, mapa y guardado` be split into smaller, more focused modules?**
  _Cohesion score 0.07682926829268293 - nodes in this community are weakly interconnected._