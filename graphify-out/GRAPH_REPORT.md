# Graph Report - videogame  (2026-09-25)

## Corpus Check
- 51 files · ~99,640 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 731 nodes · 1668 edges · 39 communities (36 shown, 3 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 81 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f55ed0cd`
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
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]

## God Nodes (most connected - your core abstractions)
1. `Combate` - 42 edges
2. `el()` - 25 edges
3. `MotorAudio` - 23 edges
4. `juego()` - 20 edges
5. `PuppetSprite` - 20 edges
6. `EnemigoCombate` - 18 edges
7. `C()` - 18 edges
8. `P()` - 18 edges
9. `L()` - 18 edges
10. `PuppetStage` - 17 edges

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

## Communities (39 total, 3 thin omitted)

### Community 0 - "Bestiario de enemigos"
Cohesion: 0.04
Nodes (45): ACOLITO_VELADO, AZOTAMENTES, AZOTAMENTES_ANCIANO, BANDIDO_BALLESTERO, CABALLERO_TUMBARIO, CAPITAN_BANDIDO, CEREBRO_ANCIANO, CUBO_GELATINOSO (+37 more)

### Community 1 - "Persistencia y partículas"
Cohesion: 0.18
Nodes (18): Capitulo, borrarGuardado(), hayGuardado(), fx, juego(), pantallaBendicion(), pantallaCapitulo(), pantallaCombate() (+10 more)

### Community 2 - "Motor de combate"
Cohesion: 0.20
Nodes (4): instanciar(), Combate, ContextoEfecto, EfectoConjuro

### Community 3 - "Actos, mapa y guardado"
Cohesion: 0.10
Nodes (26): poolDeClase(), recompensaCartas(), Presentador, CONTEMPLADOR, GOBLIN_ARQUERO, GOBLIN_CORTADOR, HERALDO_CULTO, IGNIFAX (+18 more)

### Community 4 - "Audio y música"
Cohesion: 0.08
Nodes (17): Loop chiptune procedural de respaldo, Música 8-bit con pistas CC0 de OpenGameArt, MotorAudio, TEMAS, Ambientación fantasía medieval D&D, Controles, Roguelike de construcción de mazos, Diseño (+9 more)

### Community 5 - "Combate: turnos e invocaciones"
Cohesion: 0.17
Nodes (12): cartaAleatoria(), curar(), defNombre(), elegirEvento(), EventoDef, EVENTOS_NEGATIVOS, EVENTOS_POSITIVOS, mejorables() (+4 more)

### Community 6 - "Renderizado de cartas"
Cohesion: 0.06
Nodes (48): Action, ACTION_DURATION, ActionProgress, ActionType, activeAction(), applyMatrix(), BONE_ORDER, BoneId (+40 more)

### Community 7 - "Dado 3D en WebGL"
Cohesion: 0.10
Nodes (14): COLOR_CRITICO, COLOR_NORMAL, COLOR_PIFIA, COLOR_TENUE, escala(), identidad(), Mat4, qHaciaCamara() (+6 more)

### Community 8 - "Eventos y recompensas"
Cohesion: 0.12
Nodes (21): cartaUnicaDeClase(), CONJURO_PRODIGIOSO, DAGA, danoExplosion(), INICIALES_DE_CLASE, lanzarExplosion(), MAGO, NEUTRALES_ESPECIALES (+13 more)

### Community 9 - "Configuración de TypeScript"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+8 more)

### Community 10 - "Cartas: registro y Explosión"
Cohesion: 0.05
Nodes (62): Action, ACTION_DURATION, ActionProgress, ActionType, activeAction(), applyMatrix(), BONE_ORDER, BoneId (+54 more)

### Community 11 - "Dependencias y scripts npm"
Cohesion: 0.15
Nodes (12): devDependencies, typescript, vite, vite-plugin-pwa, name, private, scripts, build (+4 more)

### Community 12 - "Diseño del juego y Bárbaro"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+8 more)

### Community 13 - "Community 13"
Cohesion: 0.24
Nodes (10): Skill /release (versión + changelog + push a main), Ventana de novedades alimentada por CHANGELOG, CHANGELOG, EntradaCambios, iniciarActualizaciones(), mostrarAvisoActualizar(), mostrarNovedades(), mostrarNovedadesSiNuevo() (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (18): ACTOS, IMAGEN_ILUSORIA, OBSERVADOR, ENEMY_RIGS, INVOCATION_RIGS, FormId, BOSS_SUMMONS, FORMS (+10 more)

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (18): cartaPorId(), OpcionEvento, cargarRun(), Guardado, guardarRun(), rehidratarRun(), serializarRun(), GUANTE_LADRON (+10 more)

### Community 16 - "Community 16"
Cohesion: 0.50
Nodes (4): DRUIDA, PV_POR_CLASE, Clase Druida (70 PV), Transformaciones (druida)

### Community 17 - "Motor de partículas"
Cohesion: 0.08
Nodes (24): ParticleRendererGL, SHAPE_CODE, AmbientPreset, AMBIENTS, AmbientStyle, between(), EffectPreset, EFFECTS (+16 more)

### Community 18 - "Community 18"
Cohesion: 0.14
Nodes (39): bear(), biped(), BipedOpts, BONE, brain(), Build, BUILDS, canine() (+31 more)

### Community 19 - "Community 19"
Cohesion: 0.13
Nodes (18): Skill /editar-carta (aplica comentarios del Compendio), Convención: el texto de la carta debe cuadrar con su efecto, Compendio de cartas, actualizarTextoCarta(), ajustarTexto(), ARTE_CARTA, arteDeCarta(), Clave (+10 more)

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
Cohesion: 0.15
Nodes (16): crearEspacios(), ORDEN_NIVELES, piramideConjuros(), barajar(), CartaDef, EfectoInvocacion, EfectoTemporal, EnemigoDef (+8 more)

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (16): BARBARO, PICARO, SELLO_PACTO, EstadoId, Acrobacias (pícaro), Clase Bárbaro (80 PV), Clase Pícaro (66 PV), Condena (ejecuta al igualar los PV actuales) (+8 more)

### Community 29 - "Community 29"
Cohesion: 0.67
Nodes (3): JEFE_OGRO, SENOR_CRIPTA, Jefes únicos con rasgo propio

### Community 30 - "Community 30"
Cohesion: 0.16
Nodes (13): BASICAS, PWA jugable sin conexión, cuadroPalabrasClave(), ampliarEnGrande(), Comentarios, GRUPOS, mostrarExportacion(), pantallaCompendio() (+5 more)

### Community 31 - "Community 31"
Cohesion: 0.19
Nodes (14): Controles de ratón y modo mando por teclado, ModsCarta, NOMBRE_CLASE, PASIVA_INVOCACION, SPRITE_FORMA, SPRITE_INVOCACION, SPRITE_JUGADOR, centroDe() (+6 more)

### Community 32 - "Community 32"
Cohesion: 0.28
Nodes (9): mazoInicial(), generarMapa(), reliquiaInicial(), crearRng(), elegir(), avanzarCapitulo(), nuevaRun(), TipoNodo (+1 more)

### Community 33 - "Community 33"
Cohesion: 0.25
Nodes (6): BRUJO, crearEnemigo(), Armadura de Agathys (el bloqueo devuelve daño a todos), Clase Brujo (64 PV), Oscuridad (baja el ataque de todos), Raíces (druida)

### Community 34 - "Community 34"
Cohesion: 0.33
Nodes (5): GOBLIN_FAMELICO, EnemigoCombate, Movimiento, Ataques furtivos (pícaro), Intención enemiga

### Community 35 - "Community 35"
Cohesion: 0.33
Nodes (5): Efectos de sonido sintetizados (Web Audio API, sin ficheros), audio, Capa, RECETAS, TemaChip

### Community 37 - "Community 37"
Cohesion: 0.47
Nodes (4): FormaInvocacion, Invocacion, Invocación del druida, Invocaciones efímeras (brujo)

### Community 38 - "Community 38"
Cohesion: 0.50
Nodes (3): nodosDisponibles(), ICONO_NODO, NOMBRE_NODO

## Knowledge Gaps
- **200 isolated node(s):** `version`, `configurations`, `name`, `private`, `version` (+195 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Combate` connect `Motor de combate` to `Community 33`, `Community 34`, `Actos, mapa y guardado`, `Community 36`, `Community 37`, `Community 15`, `Community 23`, `Community 27`, `Community 31`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `MotorAudio` connect `Audio y música` to `Community 35`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `Mazo y Mazmorra` connect `Audio y música` to `Community 33`, `Eventos y recompensas`, `Community 13`, `Community 16`, `Community 27`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `version`, `configurations`, `name` to the rest of the system?**
  _205 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Bestiario de enemigos` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `Actos, mapa y guardado` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Audio y música` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._