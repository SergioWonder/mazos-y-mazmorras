# Mazo y Mazmorra

Roguelike de construcción de mazos al estilo *Slay the Spire* con ambientación de
fantasía medieval tipo D&D. Tres actos, cada uno con **dos escenarios posibles**
elegidos al azar en cada partida: el Acto I es **El Asentamiento Ogro** o **La
Guarida de los Contrabandistas**; el Acto II, **La Cripta** o **El Templo Oscuro**;
el Acto III, **La Guarida del Dragón** o **El Laberinto del Contemplador**.

🎮 **Jugar**: https://sergiowonder.github.io/mazos-y-mazmorras/

## Ejecutar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build de producción en dist/
```

## Tests del motor (sin navegador)

```bash
node --experimental-strip-types scripts/smoke-test.ts
```

Simula combates completos con las cuatro clases, valida la generación de mapas y las
mecánicas de clase (Furia, transformaciones, raíces, acrobacias/veneno/dagas del pícaro).

## Controles

| Acción | Ratón | Teclado (modo mando) |
|---|---|---|
| Elegir carta | hover | ← → |
| Jugar carta | arrastrar a enemigo / soltar arriba | Enter o Espacio |
| Elegir objetivo | soltar sobre el enemigo | ← → y Enter |
| Cancelar | — | Esc |
| Fin de turno | botón | E |

## Diseño

- **Druida** (70 PV): transformaciones (efectos temporales de Fuerza/Destreza por N turnos),
  raíces que reducen el ataque del enemigo —cada carta es una instancia con su propia
  duración, se acumulan— y, si el ataque queda en 0 o menos, al intentar atacar el enemigo
  pierde PV igual a la diferencia (lo que las raíces superan a su ataque, ignorando bloqueo).
  Cartas raras: una por subclase de D&D 2024 (Tierra, Luna, Mar, Estrellas).
- **Bárbaro** (80 PV): Furia que acumula Fuerza/Destreza de forma permanente, pero se
  pierde si terminas el turno sin hacer daño. Cartas que escalan con Fuerza/Destreza.
  Cartas raras: una por subclase de D&D 2024 (Berserker, Corazón Salvaje, Árbol del Mundo, Fanático).
- **Mago** (62 PV): espacios de conjuro que crecen en pirámide (máx. nivel 3, regla:
  cada nivel siempre con menos espacios que el inferior). Las cartas de conjuro
  gastan un espacio (no se recupera hasta el fin del combate, salvo Recuperación
  Arcana) y escalan con el nivel gastado. Vías para ganar espacios: poderes
  «Canalizar Maná» y «Meditación Arcana» (solo ese combate; los poderes se
  reinician entre combates), «Estudio Arcano» (1 uso, permanente) y la reliquia
  «Diadema de Intelecto». Los espacios se muestran en pirámide (nivel 1 abajo,
  3 arriba). La recuperación devuelve el espacio gastado de MENOR nivel; «Sacrificio
  Arcano» recupera el de MAYOR (cuesta 1 maná y PV; mejorado, sin coste de vida).
  Cartas raras: una por escuela de magia (Evocación, Abjuración, Ilusión).
- **Pícaro** (66 PV): Acrobacias (tu bloqueo no se limpia al inicio del turno mientras
  dure), Destreza y ataques que escalan con ella, ataques furtivos (más daño si el enemigo
  no pretende atacar), Cambiazo (intercambia la intención del enemigo por la del turno
  siguiente), mucho robo/descarte con sinergias y Dagas (ataques de 0 de coste que se
  agotan). Cartas raras: subclases de D&D 2024 (Asesino → veneno, Psiónico → dagas,
  Embaucador Arcano → ilusiones).
- Mazos iniciales: 5 Golpe + 4 Defender + **2 cartas de clase** (Druida: Zarpazo y
  Raíces Enredaderas · Bárbaro: Furia Primaria y Golpe Imprudente · Mago: Canalizar Maná y
  Manos Ardientes · Pícaro: Filo Rápido y Pirueta).
- **Cartas de 1 uso**: poderes que se consumen para siempre al jugarse y dejan un
  efecto permanente en la run (Voto de Sangre, Pacto con el Bosque, Estudio Arcano).
- **Cartas de azar (incoloras)**: la Vidente puede dar «Seducir» (entrando al Acto II)
  o «Deseo» (entrando al Acto III). Tiran un d20 con animación 3D y el resultado va
  de la catástrofe al milagro (un 20 puede matar a un no-jefe / fulminar a un jefe).
- Sistema de energía (3/turno), bloqueo, Vulnerable/Débil/Frágil idéntico a StS para
  facilitar el equilibrado inicial.
- **Mejora de cartas**: todas las cartas tienen versión «+». En los campamentos se
  elige entre descansar (cura 30 %) o afilar (mejorar 1 carta).
- **Eventos narrativos** (nodos ❓): escenas con elecciones y contrapartidas,
  ~70 % positivos / ~30 % negativos, sin repetirse dentro de una run.
- **Compendio de cartas** (desde el menú): todas las cartas por clase, con opción de
  verlas mejoradas, comentarios por carta y exportación a JSON `[{id, comentario}]`.
- Mapa de 10 filas por capítulo con ≥2 eventos, cofres, élites y descansos.
- Reliquias inspiradas en objetos clásicos de D&D.
- **Dos escenarios por acto** (elegidos al azar): cada uno con sus enemigos, su
  atmósfera y su jefe final propios, equilibrados a la dificultad del acto.
- **Jefes únicos**: Gorzug (jefe ogro), Vexis el Embaucador Arcano (cuchillos,
  veneno e ilusiones), Vol'guth el liche, Malachar Heraldo del Culto (al morir
  libera al Demonio Mayor), Ignifax el Dragón Rojo y el Contemplador, cuyos rayos
  de colores tuercen tu siguiente turno (cartas que se agotan, sobrecarga de
  energía, cartas etéreas…) mientras sus Observadores no dejan de mirar.
- **Estado de Veneno**: algunos enemigos te envenenan; pierdes PV al inicio de
  cada turno (ignora el bloqueo) y baja 1 con el tiempo.
- **Élites y jefes exigentes**: los élites pegan fuerte y los jefes combinan
  Débil/Vulnerable con ataques especiales. El **Aliento de Dragón** de Ignifax
  (320 PV) aplica **Quemadura**: durante 2 turnos, cada carta que juegas te cuesta 3 PV.
- **Audio**: efectos de sonido sintetizados con la Web Audio API (sin ficheros),
  con floritura especial al jugar cartas raras, y música 8-bit con **pistas CC0
  reales** (OpenGameArt): tema de menú y, por acto, un tema normal y un tema de jefe
  rápido y épico, con loop chiptune procedural de respaldo. Se pausa al pasar a
  segundo plano y se cachea al vuelo para jugar sin conexión. Créditos y licencias
  en `public/audio/LEEME.md`. Botón flotante 🔊/🔇 para silenciar (se recuerda). La
  intención de ataque enemiga muestra el daño ya modificado (verde si lo reduces con
  Débil/Raíces, rojo si te amplifican con Vulnerable).

## Estructura

```
src/
  core/        Lógica pura (sin DOM): cartas, enemigos, combate, mapa, reliquias, rng
  ui/          Pantallas DOM: título, mapa, combate, recompensas, fin
  fx/          Partículas en <canvas> (chispas, hojas, luna, furia…) y audio
  estilos/     CSS: base, cartas, combate, pantallas
scripts/       smoke-test del motor
```

El motor de combate (`core/combate.ts`) comunica con la UI mediante la interfaz
`Presentador` (eventos visuales asíncronos), de modo que la lógica es testeable
sin navegador y la capa visual es reemplazable.
