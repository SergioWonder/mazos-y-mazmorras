# Mazo y Mazmorra

Roguelike de construcción de mazos al estilo *Slay the Spire* con ambientación de
fantasía medieval tipo D&D. Cinco clases jugables (Druida, Bárbaro, Mago, Pícaro y Brujo). Tres actos, cada uno con **dos escenarios posibles**
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

Simula combates completos con las cinco clases, valida la generación de mapas y las
mecánicas de clase (Furia, transformaciones, raíces, acrobacias/veneno/dagas del pícaro,
Explosión/Condena/Agathys del brujo).

La simulación usa un **piloto heurístico**: puntúa cada carta de la mano según el estado
del combate (daño entrante, bloqueo que falta, vida enemiga restante, turno actual) y las
juega de mayor a menor puntuación, apuntando siempre al enemigo con menos PV. Cubre los
**cuatro tipos de encuentro** —enemigo singular, grupo, élite y jefe— y para élites y
jefes reparte recompensas y mejoras al mazo, porque a un jefe no se llega con el mazo
inicial. Imprime una tabla de victorias por clase y tipo, y falla si una clase se
descuelga de las demás en su mismo nivel.

## Controles

| Acción | Ratón | Teclado (modo mando) |
|---|---|---|
| Elegir carta | hover | ← → |
| Jugar carta | arrastrar a enemigo / soltar arriba | Enter o Espacio |
| Elegir objetivo | soltar sobre el enemigo | ← → y Enter |
| Cancelar | — | Esc |
| Fin de turno | botón | E |

## Diseño

- **Druida** (70 PV): las **Transformaciones** son su motor de daño (Fuerza o Destreza
  durante 4-5 turnos, y empieza con la Forma de Lobo en el mazo inicial). Su valor está en
  la duración, no en la cifra: +2 o +3 sostenidos multiplican todo lo que juegues encima.
  Un par de cartas pagan además por estar transformado —Mordisco Feroz devuelve energía,
  Luna Creciente añade Vulnerable— y la **Forma de Enjambre** golpea a todos los enemigos
  a la vez (da Destreza, así que no se autopotencia). **Corazón del Cambiante** hace que
  cada forma dure 2 turnos más y otorgue +1 de Fuerza (o de Destreza). Su control son las **raíces**, que reducen el
  ataque del enemigo: cada carta es una instancia con su propia duración y se acumulan; si
  el ataque queda en 0 o menos, al intentar atacar el enemigo pierde PV igual a la
  diferencia (ignorando bloqueo). También tiene **invocaciones permanentes** que absorben
  daño y atacan cada turno por el 30 % de su vida. Cartas raras: una por subclase de
  D&D 2024 (Tierra, Luna, Mar, Estrellas).
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
- **Pícaro** (66 PV): cuatro ejes que se cruzan entre sí:
  - **Acrobacias**: el bloqueo de esas cartas se vuelve a aplicar al turno siguiente.
  - **Veneno**: Filo Tóxico y Toxina Paralizante lo aplican, Filo Venenoso (Asesino) lo
    reparte con cada ataque, Golpe Séptico pega más cuanto más envenenado está el objetivo
    y **Nube Nauseabunda** envenena a todos y **detona el Veneno al instante**.
  - **Dagas** (ataques generados de 0 de coste que se agotan): Lluvia de Dagas y Alma de
    Cuchillas las generan; Maestría con Cuchillas, Danza Mortal y **Guardia de Cuchillas**
    (bloqueo por cada Daga jugada) las potencian.
  - **Ataques furtivos**: más daño si el enemigo no pretende atacar (Puñalada Trapera,
    Emboscada, **Oportunista**). **Cambiazo** (coste 0) le fuerza una intención que no sea
    de ataque; si solo sabe atacar, se queda desconcertado y pierde el turno.
  Además, Trabajo de Pies es un poder de 2 de Destreza (3 mejorado), y hay mucho
  robo/descarte con sinergias (Preparación, Tempestad de Acero). Cartas raras: subclases
  de D&D 2024 (Asesino → veneno, Psiónico → dagas, Embaucador Arcano → ilusiones).
- **Brujo** (64 PV): un pacto con cuatro patas que se cruzan:
  - **Explosión Sobrenatural**: carta inicial de coste 1 que **al jugarse vuelve a lo alto
    de tu mazo** en vez de al descarte, así que la lanzas casi todos los turnos (aguanta
    incluso el Rayo Áureo del Contemplador). Hace daño y nada más… hasta que la engordas:
    poderes permanentes (Verbo Agonizante → +daño, Haz Desdoblado → un golpe más,
    Explosión Trifurcada → golpea a todos), el **Don del Patrón** la deja a coste 0, la
    **Llamada del Vacío** la rescata a tu mano desde donde esté (mazo, descarte o agotadas)
    y varias cartas la mejoran **solo ese turno** (Canalizar el Pacto, Pacto Sangriento).
  - **Condena**: puntos que se acumulan sobre el enemigo y **no decaen**. Al final de su
    turno, si su Condena iguala o supera sus PV **actuales**, muere — así que vale tanto
    subir la Condena como bajarle la vida. Brazos de Hadar la reparte con Débil a todos,
    Palabra de Ruina la duplica, Verbo de Aniquilación planta de golpe la mitad de sus PV
    y la Mente del Gran Antiguo condena con cada ataque. Funciona también sobre jefes: el
    umbral sube con su vida.
  - **Invocaciones efímeras**: a diferencia de las del druida, solo duran el turno en que
    las invocas — y justo por eso pegan un poco más. Absorben el daño enemigo y, si
    sobreviven al turno del enemigo, golpean y se desvanecen. El golpe del Demonio además
    condena. El Sacrificio del Familiar convierte su vida restante en daño y te devuelve
    energía (y aplica esa Condena, mejorado).
  - **Bloqueo que muerde**: la **Armadura de Agathys** da bloqueo y, ese turno, **todo el
    daño que bloquees se devuelve a TODOS los enemigos** — cuanto más bloqueo acumules y
    más te peguen, más devuelves. El Pacto Infernal te blinda con cada muerte enemiga y
    el **Pacto Final** (carta única de clase) convierte tu bloqueo restante en Condena
    para todos al final de cada turno.
  Y **Oscuridad**, que reduce el ataque de todos los enemigos y baja 1 por turno (el
  Sello del Pacto, su reliquia inicial, ya empieza el combate con 2 puesta). Cartas
  raras: subclases de D&D 2024 (Archifata, Celestial, Infernal y Gran Antiguo).
- Mazos iniciales: 5 Golpe + 4 Defender + **2 cartas de clase** (Druida: Zarpazo y
  Forma de Lobo · Bárbaro: Furia Primaria y Golpe Imprudente · Mago: Canalizar Maná y
  Manos Ardientes · Pícaro: Filo Rápido y Pirueta · Brujo: Explosión Sobrenatural y
  Armadura de Agathys).
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
- **Estado de Veneno**: al inicio de su turno, quien lo sufre pierde PV ignorando el
  bloqueo (no lo destruye) y su Veneno baja 1. Algunos enemigos te envenenan; el pícaro
  lo reparte y puede detonarlo al instante con Nube Nauseabunda.
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
