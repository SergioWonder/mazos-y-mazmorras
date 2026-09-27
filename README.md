# Dracs & Rogues

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
  cada forma dure 2 turnos más y otorgue +1 de Fuerza (o de Destreza), y la **Forma Lunar**
  (rara, coste 3) es una transformación **permanente**: no hace daño, pero cada turno te da
  2 de Fuerza y 1 de Destreza que se acumulan sin techo — pierde en combates cortos y gana
  las peleas largas contra jefes. Su control son las **raíces**, que reducen el
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
  - **Explosión Sobrenatural**: carta inicial de coste 1 y **7 de daño** (10 mejorada) que
    **al jugarse vuelve a lo alto de tu mazo** en vez de al descarte, así que la lanzas casi
    todos los turnos (aguanta incluso el Rayo Áureo del Contemplador). Construir alrededor
    de ella es una estrategia completa; sus poderes permanentes se notan desde el primer
    lanzamiento:

    | Carta | Coste | Efecto sobre la Explosión (mejorada) |
    | --- | --- | --- |
    | 😖 Verbo Agonizante | 1 | +3 de daño y 3 de Condena a cada enemigo que golpea (+5 y 4) |
    | ☄️ Lanza Sobrenatural | 1 | Crece +2 de daño cada vez que la lanzas, el resto del combate (+3) |
    | 🤝 Don del Patrón | 1 (0) | Cuesta 0 y te da 3 de bloqueo al lanzarla |
    | 🔀 Haz Desdoblado | 2 (1) | Golpea 1 vez más |
    | 🔱 Explosión Trifurcada | 1 (0) | Golpea a TODOS los enemigos |
    | 🍽️ Hambre del Patrón | 2 (1) | +2 de daño por cada maldición en tus cartas y mete una en tu descarte (+3) |
    | 🔯 Canalizar el Pacto | 0 | Este turno +5 de daño y robas 1 (+7) |
    | 📜 Pacto Sangriento | 0 | Pierdes 3 PV, robas 2 y este turno +6 de daño (2 PV, +9) |
    | 📣 Llamada del Vacío | 0 | La trae a tu mano desde donde esté y este turno +4 (+7) |

    Todas se suman: con el Haz Desdoblado cada golpe lleva el bonus entero, y con la
    Trifurcada la Condena del Verbo cae sobre todos.
  - **Pacto con las maldiciones**: al brujo las maldiciones le sirven de combustible. El
    **Contrato Maldito** (coste 0: +1 de energía y robas 2) mete una maldición al azar en
    tu mazo solo ese combate; el **Hambre del Patrón** hace que la Explosión pegue más por
    cada una; la **Ofrenda Maldita** consume una de tu mano para infligir 18 y 6 de
    Condena; la **Égida de la Aflicción** te da 4 de bloqueo por cada maldición en la mano
    al final del turno (antes de que el Pacto Final la convierta en Condena), y la reliquia
    **Coleccionista de Maldiciones** cambia su castigo de fin de turno por 3 de Condena a
    todos los enemigos. Las maldiciones siguen sin poder jugarse.
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
  Y **Oscuridad**, que reduce el ataque de todos los enemigos y baja 1 por turno (la carta
  Oscuridad aplica 3 y roba 1; el Sello del Pacto, su reliquia inicial, ya empieza el
  combate con 2 puesta). Cartas
  raras: subclases de D&D 2024 (Archifata, Celestial, Infernal y Gran Antiguo).
- Mazos iniciales: 5 Golpe + 4 Defender + **2 cartas de clase** (Druida: Zarpazo y
  Forma de Lobo · Bárbaro: Furia Primaria y Golpe Imprudente · Mago: Canalizar Maná y
  Manos Ardientes · Pícaro: Filo Rápido y Pirueta · Brujo: Explosión Sobrenatural y
  Armadura de Agathys).
- **Cartas de 1 uso**: poderes que se consumen para siempre al jugarse y dejan un
  efecto permanente en la run (Voto de Sangre, Pacto con el Bosque, Estudio Arcano).
- **Bendiciones de la Vidente**: al empezar la partida y entre actos, Síbila ofrece
  bendiciones que son reliquias propias (ver [Bendiciones](#bendiciones)).
- **Cartas de azar (incoloras)**: la Vidente puede dar «Seducir» (entrando al Acto II)
  o «Deseo» (entrando al Acto III), como bendiciones-reliquia que meten la carta en el mazo. Tiran un d20 con animación 3D y el resultado va
  de la catástrofe al milagro (un 20 puede matar a un no-jefe / fulminar a un jefe).
- Sistema de energía (3/turno), bloqueo, Vulnerable/Débil/Frágil idéntico a StS para
  facilitar el equilibrado inicial.
- **Mejora de cartas**: todas las cartas tienen versión «+». En los campamentos se
  elige entre descansar (cura 30 %) o afilar (mejorar 1 carta) y, si llevas
  maldiciones, **purificar** una (la eliminas del mazo en vez de curarte).
- **Tipos de carta**: ataque, habilidad, poder y **maldición**.
- **Maldiciones** (`MALDICIONES` en `core/cartas.ts`): cartas que estorban, **no se
  pueden jugar** y ocupan sitio en la mano y en el mazo (cuentan para el robo). Tienen
  marco negro violáceo agrietado y nombre en rojo apagado. Nunca salen en las
  recompensas ni en el pool de clase; se eliminan purificándolas en un campamento.
  Los efectos de fin de turno se disparan **antes del descarte** y solo si están en la
  mano; ninguna mata (la pérdida de PV deja al menos 1).

  | Maldición | Efecto |
  |---|---|
  | 🤢 Herida Infectada | Al final del turno, en la mano: pierdes 2 PV |
  | ❔ Duda | Al final del turno, en la mano: 1 de Débil |
  | 😱 Pesadilla | Al robarla, descartas una carta al azar de tu mano |
  | 🧾 Deuda de Sangre | Al final del turno, en la mano: pierdes 3 PV. **Se puede saldar pagando 2 de energía** (sale del mazo para siempre) |
  | 🏴 Marca del Condenado | Al final del turno, en la mano: 1 de Vulnerable |
  | 🧻 Maldición de la Momia | Innata. Al final del turno, en la mano: 1 de Frágil |
  | 💔 Remordimiento | Al final del turno, en la mano: pierdes 1 PV por carta en la mano |
  | 🧊 Parálisis | Al robarla, pierdes 1 de energía |
  | 🪙 Codicia | No se descarta: ocupa un hueco de tu mano todo el combate |
  | 🔗 Grilletes | Peso muerto |

  Las dan algunos eventos (Saquear el altar del Santuario, Pagar con sangre al
  Buhonero, el mímico del Cofre Extraño, Cruzar despacio la Niebla, Ofrecer tu esencia
  al Espíritu), el Pacto de la Codicia, la Calavera de la Baraja de las Maravillas
  (solo ese combate) y, durante el combate, la Momia Real, el Acólito Velado y
  Malachar (solo ese combate).
- **Eventos narrativos** (nodos ❓): escenas con elecciones y contrapartidas,
  ~70 % positivos / ~30 % negativos, sin repetirse dentro de una run.
- **Compendio de cartas** (desde el menú): todas las cartas por clase (y las maldiciones), con opción de
  verlas mejoradas, comentarios por carta y exportación a JSON `[{id, comentario}]`.
- **Mapa** de 10 filas por capítulo (`core/mapa.ts`) con ≥2 eventos, élites, descansos
  y tabernas. Se ve como un **mapa de aventura de papel** (ver [Mapa a tinta](#mapa-a-tinta)):
  combate, élite, evento, campamento, cofre, taberna y jefe, dibujados a plumilla. Los **cofres** van todos en una sola fila, la
  central (fila 4), que es entera de cofres: no hay cofres en ninguna otra fila.
- **Tabernas** (nodos 🍺, `core/taberna.ts` y `ui/taberna.ts`): 1–2 por capítulo,
  en las filas 1–5 (nunca en la primera ni junto al jefe). Dentro, dos parroquianos
  (tabernero, bardo, tabernera…) te cuentan un rumor cada uno (8 textos, según el
  tipo de lugar) y eliges uno, o pides una jarra que cura un 12 % de los PV. El
  rumor marca una **misión** en un nodo alcanzable a 2–4 filas (combate, élite,
  evento o cofre), que se ve en el mapa con una «X» roja y un sello de lacre. Al
  completarlo ganas **una reliquia** además de su recompensa normal. Si tomas otro
  camino y el nodo queda fuera de tu alcance, la misión se pierde con un aviso.
  La misión se guarda con la partida y se descarta al cambiar de capítulo.
- **Reliquias** inspiradas en objetos clásicos de D&D: más de 50, con rareza (común,
  rara, de jefe) y reliquias únicas de cada clase (ver [Reliquias](#reliquias)).
- **Dos escenarios por acto** (elegidos al azar): cada uno con sus enemigos, su
  atmósfera y su jefe final propios, equilibrados a la dificultad del acto.
- **Jefes únicos**: Gorzug (jefe ogro), Vexis el Embaucador Arcano (cuchillos,
  veneno e ilusiones), Vol'guth el liche, Malachar Heraldo del Culto (al morir
  libera al Demonio Mayor), Ignifax el Dragón Rojo y el Contemplador, cuyos rayos
  de colores tuercen tu siguiente turno (cartas que se agotan, sobrecarga de
  energía, cartas etéreas…) mientras sus Observadores no dejan de mirar.
- **Escena final: el Dungeon Master** (`core/escena-final.ts`, `DUNGEON_MASTER` en
  `core/enemigos.ts`): tras vencer a Ignifax o al Contemplador, antes de la victoria,
  te enfrentas al **Dungeon Master**: una figura encapuchada a contraluz, con los ojos
  encendidos y las manos juntas bajo la barbilla, asomando tras su **pantalla de DM**
  ilustrada (bisagras, notas, emblema y un d20 encima). Es un chiste final:
  - Su **Pantalla del DM** (🛡️∞) absorbe **todo**: golpes, veneno, hemorragia, daño
    perforante, reliquias de daño, Agathys… y le dan igual las muertes instantáneas
    (Talismán Vorpal, Deseo, Seducir normal) y la Condena letal. Su vida no baja
    («🛡️ ¡La pantalla del DM lo bloquea todo!», «Eso no funciona así.»).
  - Te deja un turno de cortesía («📜 ??? · “Mmm… interesante…”») y al final del
    segundo lanza el **Rayo del Dungeon Master** («⚡ ??? · “Tira iniciativa…”»): un
    rayo en zigzag enorme desde sus manos (efecto `rayoDM`, con destello a pantalla
    completa) que **mata al instante** ignorando bloqueo, espejismo, invulnerabilidad,
    invocaciones y reliquias. «Tu personaje muere. ¿Echamos otra partida?»
  - **No es una derrota**: el guardado se borra y sale la pantalla de victoria con un
    epílogo extra («…el Dungeon Master siempre tiene la última palabra»).
  - **Final verdadero (secreto)**: jugar **Seducir** contra él y sacar un **20 natural**
    (Seducir+ vale si el mejor dado es 20) hace caer la pantalla. Cualquier otra
    tirada rebota («Eso no funciona así»; con un 19, «Casi… pero no»). Si llevas
    Seducir en el mazo, la escena la pone arriba para que empiece en tu mano. El 20
    abre `ui/final-verdadero.ts`: el DM y los cinco héroes en silueta se sientan a la
    mesa para **cuadrar una fecha para la próxima partida** — cada uno pone su excusa
    («el martes tengo tribu», «los jueves no puedo»…) mientras la agenda del DM se
    llena de tachones, hasta que por fin: «¡El sábado a las 17:00, y trae dados!»
    (confeti y «Final verdadero: ¡Hay fecha!»). Cuenta como victoria y queda guardado
    en `localStorage`: el menú principal muestra «🎲 Final verdadero desbloqueado»
    junto a la versión.
  - Suena la música de jefe del Acto III; el rayo usa el sonido divino.
- **Estado de Veneno**: al inicio de su turno, quien lo sufre pierde PV ignorando el
  bloqueo (no lo destruye) y su Veneno baja 1. Algunos enemigos te envenenan; el pícaro
  lo reparte y puede detonarlo al instante con Nube Nauseabunda.
- **Élites y jefes exigentes**: los élites pegan fuerte y los jefes combinan
  Débil/Vulnerable con ataques especiales. El **Aliento de Dragón** de Ignifax
  (320 PV) aplica **Quemadura**: durante 2 turnos, cada carta que juegas te cuesta 3 PV.
- **Audio**: efectos de sonido realistas (metal, golpes, fuego, magia, criaturas…)
  sintetizados por código por el agente `disenador-sfx` (`src/audio/sfx/`,
  `fx/sfx-bank.ts`, scripts en `scripts/sfx/`), con variaciones para los más
  frecuentes y floritura especial al jugar cartas raras, y una **banda sonora original**
  sintetizada por código: tema principal y, por acto, un tema de combate (aventura
  amigable) y uno de jefe (épico y tenso), unidos por un leitmotiv. Suenan en bucle
  exacto con Web Audio, con loop chiptune de respaldo. Se pausa al pasar a
  segundo plano y se cachea al vuelo para jugar sin conexión. Créditos y licencias
  en `src/audio/LEEME.md`. Botón flotante 🎵 que apaga o enciende solo la música (los efectos siguen sonando; se recuerda). La
  intención de ataque enemiga muestra el daño ya modificado (verde si lo reduces con
  Débil/Raíces, rojo si te amplifican con Vulnerable).

## Reliquias

Cada clase empieza con su reliquia inicial (Tótem de Roble, Hacha del Ancestro, Péndulo
de Ámbar, Guante del Ladrón, Sello del Pacto). Las demás salen en cofres, élites,
eventos y jefes (`sortearReliquia` en `core/reliquias.ts`):

- **Rareza**: cofres y eventos dan 65 % comunes / 35 % raras; los élites, 45 / 55;
  los jefes sueltan reliquias **de jefe** (potentes y con contrapartida), que no salen
  en ningún otro sitio. Nunca se repite una reliquia que ya tienes.
- **Reliquias de clase** (`soloClase`): solo se sortean para su clase (nunca para otra)
  y pesan el doble dentro de su rareza.
- **Bendiciones** (rareza `bendicion`): solo las da Síbila en sus bendiciones y nunca
  salen en el sorteo normal (ver [Bendiciones](#bendiciones)).

**Generales**

| Reliquia | Rareza | Efecto |
| --- | --- | --- |
| 🥾 Botas Aladas | común | Primer turno: +1 de energía y robas 2 |
| 🧥 Capa de Desplazamiento | común | Primer turno: bloqueo igual al daño anunciado (máx. 15) |
| 📯 Cuerno de Valhalla | común | Turno 3: 6 de daño y 1 de Débil a todos |
| 🥁 Tambor de Guerra Enano | común | Cada 3 cartas jugadas, 3 de daño a un enemigo al azar |
| 🏺 Cáliz Vacío | común | La primera vez por turno que te quedas sin cartas en la mano (al jugar o descartar la última), robas 2 |
| 🥊 Guanteletes de Poder de Ogro | común | Cada enemigo que cae te da 1 de Fuerza (combate) |
| 🚩 Estandarte del Terror | común | Cuando cae un enemigo, los demás: 1 de Débil y 1 de Vulnerable |
| 🧪 Veneno de Drow | común | Aplicar Débil aplica también 2 de Veneno |
| 💍 Anillo de Protección | común | Conservas hasta 5 de bloqueo entre turnos |
| 🦾 Brazales de Defensa | común | Turno sin ataques: 6 de bloqueo al acabarlo |
| 👘 Manto Espectral | común | Una ilusión previene el primer ataque de cada combate |
| 🍀 Piedra de la Buena Suerte | común | Doble probabilidad de carta rara en las recompensas |
| 🛌 Saco de Dormir Élfico | común | Descansar cura un 15 % más; ileso, +5 PV máximos |
| 🪨 Piedra de Afilar Enana | común | Afilar mejora además otra carta al azar |
| 🗺️ Mapa del Tesoro | común | Los cofres dan también una carta |
| 📔 Diario del Aventurero | común | Cada evento mejora 1 carta al azar |
| 👝 Bolsa de Contención | rara | Al barajar el descarte, +1 de energía |
| 🃏 Baraja de las Maravillas | rara | 1d20 al empezar cada combate: de una Duda en la mano a Débil y Vulnerable 3 a todos |
| 🧿 Amuleto de Salud | rara | La primera vez que un golpe te deja por debajo de la mitad, te curas 10 |
| 🗡️ Talismán Vorpal | rara | Decapita al Vulnerable (no jefe) que dejas a ≤ 15 % de PV |
| 🛡️ Escudo Centinela | rara | Un golpe detenido del todo devuelve 4 de daño |
| 📕 Manual del Ejercicio Provechoso | rara | Cada élite o jefe vencido: +1 de Fuerza permanente |
| 🎺 Cuerno de Caza | rara | Contra élites y jefes: 2 de Vulnerable a todos y robas 2 |
| 🔨 Yunque de Moradin | rara | Los ataques que añades al mazo llegan mejorados |
| ⛑️ Yelmo del Tirano | jefe | +1 de energía por turno; pierdes 4 PV al empezar cada combate |
| 🔪 Hoja Sedienta | jefe | +1 de daño por cada 10 PV que te falten; descansar cura la mitad |
| 💎 Piedra Ioun | jefe | Robas 1 más y conservas la carta más cara sin jugar |

**De clase**

| Clase | Reliquia | Rareza | Efecto |
| --- | --- | --- | --- |
| Druida | 🌰 Semilla del Roble Madre | común | Al transformarte, 3 de Raíces a todos (1 turno) |
| Druida | 🌿 Muérdago Sagrado | común | Las Raíces que aplastan te curan 3 PV |
| Druida | 🦷 Colmillo del Cambiaformas | rara | La primera forma del combate dura 3 turnos más y robas 2 |
| Druida | 🌙 Luna en un Frasco | rara | Al terminar una forma, Invoca 6 |
| Bárbaro | 🎗️ Cinturón del Gigante | común | Ganar Furia da 4 de bloqueo |
| Bárbaro | 🦴 Collar de Colmillos | común | El primer golpe que te hiere en cada ronda da Furia (+1 Fuerza) |
| Bárbaro | 🍺 Jarra de Hidromiel | común | Perder la Furia te cura 5 PV |
| Bárbaro | 🐻 Tótem del Oso | rara | La primera vez que la Furia se iba a romper, aguanta |
| Bárbaro | 🪝 Garfio del Carnicero | rara | Cada enemigo que cae en Furia da 1 de energía |
| Mago | 🪶 Pluma de Escriba | común | Cada espacio gastado Escribe 3 en el Conjuro Prodigioso |
| Mago | ⏳ Reloj de Arena Arcano | común | Cada 3 turnos recuperas el espacio gastado de mayor nivel |
| Mago | 👑 Diadema de Intelecto | rara | Al gastar el último espacio libre: +1 de energía y robas 2 |
| Mago | 🪄 Báculo del Archimago | rara | El primer espacio de nivel 3 recupera el gastado de menor nivel |
| Mago | 📘 Grimorio de Contingencia | rara | Turno sin gastar espacios: +1 espacio para el combate |
| Pícaro | 🐍 Vaina Ponzoñosa | común | Las Dagas aplican 2 de Veneno |
| Pícaro | 🤸 Capa del Acróbata | común | Descartar da 2 de bloqueo aplazado (Acrobacias) |
| Pícaro | 🎒 Bandolera de Cuchillos | común | Empiezas con 2 Dagas; al barajar, otra |
| Pícaro | 🎭 Máscara del Asesino | rara | Atacar a quien no pretende atacar aplica 3 de Veneno |
| Pícaro | 🦠 Frasco de la Plaga | rara | Cuando muere un enemigo envenenado, su Veneno se propaga a todos los demás |
| Brujo | 👁️ Ojo del Patrón | común | La Explosión aplica Condena igual a la mitad de su daño (mín. 3) a cada enemigo que golpea |
| Brujo | 📓 Libro de las Sombras | común | La Explosión empieza cada combate en tu mano; la primera de cada turno roba 1 |
| Brujo | ⛓️ Cadena del Condenado | común | Muere un enemigo con Condena: +1 de energía el próximo turno |
| Brujo | 🦯 Vara del Guardián del Pacto | rara | Si la Explosión mata a un enemigo, vuelve a tu mano en vez de al mazo |
| Brujo | ⚱️ Coleccionista de Maldiciones | rara | Las maldiciones de tu mano no te castigan al final del turno: cada una aplica 3 de Condena a todos |
| Brujo | 😈 Corazón de Diablillo | rara | La invocación efímera que aguanta estalla (mitad de su vida a todos) |
| Brujo | ❄️ Colgante de Escarcha | rara | El daño que bloqueas se vuelve Condena del atacante |

### Bendiciones

Las bendiciones se eligen dos veces por partida (`core/bendiciones.ts`, `ui/bendicion.ts`):

- **Bendición inicial** (el encargo de Aldric, el Senescal, que sustituye a las antiguas
  ayudas de mazo): 4 bendiciones-reliquia sin
  repetir, sacadas al azar de un conjunto amplio para que cambien de partida a partida:
  **una de tu clase, una general, un pacto** (riesgo y recompensa) y un comodín (general
  o del camino).
- **Entre actos** (Síbila, la Vidente del Manantial): te cura por completo y ofrece 3 opciones.
  Las **cartas únicas** llegan como bendiciones-reliquia de tipo `unica` (la de «Seducir»
  entrando al Acto II; la de tu carta única de clase y la de «Deseo» entrando al Acto III)
  y el resto de huecos son otras bendiciones-reliquia que aún no tienes.

Cada bendición elegida es una **reliquia** con su ilustración dorada que se ve en la barra
superior y se guarda con la partida. Las de carta única meten su carta en el mazo al
obtenerse (`alObtener`, que no se repite al cargar la partida) y dan un pequeño extra al
jugarla; nunca salen en los huecos normales ni en el sorteo de reliquias.

| Bendición | Tipo | Efecto |
| --- | --- | --- |
| 🌅 Bendición del Alba | general | En tus 2 primeros turnos: +1 de energía y robas 1 |
| 🌠 Estrella Fugaz | general | La 4.ª carta de cada turno devuelve 1 de energía y roba 1 |
| 🔔 Campana de Plegaria | general | Al barajar el descarte: te curas 3 y ganas 5 de bloqueo |
| 👁️‍🗨️ Mirada de la Vidente | general | Al empezar: Débil 2 a quien va a atacar, Vulnerable 2 a quien no |
| 😇 Aureola del Mártir | general | Cada golpe que te hiere te da bloqueo igual a la mitad del daño |
| 🩸 Pacto de Sangre | pacto | +1 de energía por turno; al barajar el descarte pierdes 4 PV |
| 💠 Corazón de Cristal | pacto | +3 de daño por golpe; empiezas cada combate con 2 de Vulnerable |
| 🌘 Pacto del Insomne | pacto | Robas 2 más por turno; la primera carta de cada turno cuesta 3 PV |
| 💰 Pacto de la Codicia | pacto | Al sellarlo, 2 reliquias al azar a cambio de la maldición Codicia |
| 🏮 Farol del Peregrino | del camino | Al llegar a un campamento te cura 10 PV |
| 🧭 Brújula de Síbila | del camino | Tras cada evento eliges también una carta |
| 🏆 Trofeo del Cazador | del camino | Cada élite o jefe vencido mejora 1 carta al azar |
| ⚜️ Estandarte de Cruzada | del camino | Contra élites y jefes: +1 de energía por turno y 8 de bloqueo al empezar |
| 🐺 Bendición de la Manada | druida | Al transformarte, la forma dura 1 turno más e Invocas 4 |
| 🌳 Raíces Profundas | druida | Al empezar, 2 de Raíces a todos (2 turnos); si tus Raíces aplastan, robas 1 |
| ⛈️ Trueno Ancestral | bárbaro | Ganar Furia inflige 3 a todos los enemigos |
| 🔥 Juramento Inquebrantable | bárbaro | La primera Furia perdida en cada combate vuelve a arder (+2 de Fuerza) |
| ⛲ Fuente Arcana | mago | +1 espacio de conjuro en cada combate; gastar uno de nivel 2+ roba 1 |
| ✨ Constelación | mago | Cada 2 espacios gastados en un combate, +1 de energía |
| ⚔️ Filo Consagrado | pícaro | Tus Dagas hacen 2 más; la primera de cada turno roba 1 |
| 🌫️ Sombra Veloz | pícaro | Cada carta descartada aplica 2 de Veneno a un enemigo al azar |
| 🌀 Eco Sobrenatural | brujo | La primera Explosión Sobrenatural de cada turno repite la mitad de su daño (mín. 3) a todos |
| 👹 Diablillo Guardián | brujo | Empiezas cada combate con un diablillo efímero (8 de vida, golpea por 6 y 2 de Condena) |
| 💘 Dado del Encanto | carta única | Añade «Seducir»; la primera Seducir de cada combate te devuelve su energía |
| 🌠 Dado de los Deseos | carta única | Añade «Deseo»; al jugarla robas 1 |
| 🌩️ Asta de la Tormenta | carta única (druida) | Añade «Tormenta de Venganza»; al jugarla te curas 6 |
| 🪓 Gran Hacha Indómita | carta única (bárbaro) | Añade «Furia Indómita»; al jugarla ganas Furia (+1 de Fuerza) |
| 🌕 Orbe de la Maestría | carta única (mago) | Añade «Maestría de Conjuros»; al jugarla ganas 1 espacio de conjuro |
| 💃 Dagas de la Danza Mortal | carta única (pícaro) | Añade «Danza Mortal»; al jugarla creas 2 Dagas |
| 👁️ Ojo del Pacto Final | carta única (brujo) | Añade «Pacto Final»; al jugarla ganas 6 de bloqueo |

Los efectos se enganchan al motor con ganchos genéricos de `ReliquiaDef`
(`core/types.ts`): de combate (`inicioTurno`, `alJugarCarta`, `alBarajar`,
`alVaciarMano`, `alMatar`, `alAtacar`, `bonoAtaque`, `alSerGolpeado`,
`alAplicarEstado`, `alDescartar`, `alTransformarse`, `alTerminarTransformacion`,
`alGanarFuria`, `salvarFuria`, `alPerderFuria`, `alAplastarRaices`,
`alDesvanecerseInvocacion`, `alVencerCombate`, `conservaBloqueo`, `retieneCartas`…) y
de partida (`alObtener` —recibe el rng de la partida—, `curaDescanso`, `alDescansar`,
`alAfilar`, `alAnadirCarta`, `alEntrarEnSala`, `recompensaCartaEn`, `pesoRaroMult`), con sus ayudantes en
`core/run.ts`. Las reliquias guardan su estado de combate con `ctx.marca()`.

## Estructura

```
src/
  core/        Lógica pura (sin DOM): cartas, enemigos, combate, mapa, reliquias, rng
  ui/          Pantallas DOM: título, mapa, combate, recompensas, fin
  fx/          Partículas en <canvas> (chispas, hojas, luna, furia…), audio y
               marionetas animadas (puppet.ts motor, hero-rig.ts, enemy-rigs.ts)
  estilos/     CSS: base, cartas, combate, pantallas
scripts/       smoke-test del motor
```

El motor de combate (`core/combate.ts`) comunica con la UI mediante la interfaz
`Presentador` (eventos visuales asíncronos), de modo que la lógica es testeable
sin navegador y la capa visual es reemplazable.

Los héroes son **siluetas a contraluz**: una marioneta SVG de ~25 piezas repartidas
en 10 huesos (`fx/hero-rig.ts`), pintada en negro con luz de borde del color de la
clase (`ui/hero-sprite.ts`). Respira y parpadea en reposo, ataca (tajo cuerpo a
cuerpo o proyectil mágico) al jugar un ataque, conjura con el resto de cartas y
retrocede con un destello al recibir daño. El daño espera al momento del golpe.
Las transformaciones del druida (Lobo, Oso, Águila, Enjambre, Lunar y Estelar)
tienen su propia marioneta con el mismo estilo; las invocaciones no. Si hay varias
formas activas se ve la última lanzada, que entra con un rugido.

Los **enemigos normales y de élite y las invocaciones** usan el estilo **ilustrado**:
el mismo motor de marionetas (`fx/puppet.ts`), con contorno exterior grueso y líneas
interiores finas. Cada pieza lleva una sombra recortada hacia el lado contrario a
la luna y un borde de luz del color de la luna del acto (`ui/puppet-sprite.ts`). Se
construyen con arquetipos paramétricos (bípedo, cuadrúpedo, flotante, amorfo) en
`fx/enemy-rigs.ts`. Atacan, reciben golpes y mueren con animación propia.

Los **jefes** tienen diseños propios, aura permanente y **emisores de partículas** pegados
a sus huesos: ascuas, humo, almas, motas arcanas, llamas o gotas de lava que nacen de la
boca, el bastón, las alas o los ojos. También lanzan **ráfagas** al atacar, conjurar y
morir: el aliento de Ignifax, los rayos del Contemplador… Los del acto III son los más
cargados, y al enfurecerse (o al volver de la filacteria) emiten el doble. Desde el menú principal, la **Galería de sprites**
muestra todos los héroes, formas, invocaciones y enemigos animados (el Dungeon Master
incluido, en su propia sección).

El **Dungeon Master** mezcla los dos estilos en una sola marioneta: la pantalla es
ilustrada y el encapuchado va a contraluz (`backlit` en la marioneta: esas piezas se
pintan como silueta con luz de borde, detrás de las ilustradas). Sus dedos cuelgan de
los huesos de dedo de ala, que copian el giro de los brazos, así que pueden
**tamborilear** en reposo (`animate` en la marioneta); la capucha respira, los ojos
parpadean y, al atacar o conjurar, las manos se separan y una se lanza hacia el héroe.

### Arte de las cartas

Cada carta tiene una **ilustración SVG dibujada a mano** en el mismo estilo que los
monstruos: `src/arte/cartas/<id>.svg` (280×160), con el héroe como silueta a contraluz y
los monstruos del bestiario como objetivo cuando encaja. La guía de estilo está en
`docs/arte-cartas.md`. `ui/card-svgs.ts` las carga y las rasteriza una sola vez a imagen
para que la mano no las vuelva a pintar. Las **cartas únicas de clase**, junto con
*Seducir* y *Deseo*, son **full art** (`full/<id>.svg`, vertical): la ilustración cubre
toda la carta, el marco late con su color (`ui/card-looks.ts`) y suelta partículas por
el sistema WebGL global. Si una carta no tuviera dibujo, se muestra su emoji.

### Mapa a tinta

El mapa de campaña (`ui/mapa.ts`) parece un mapa de D&D en pergamino. Cada localización
es un **icono SVG dibujado a plumilla** (`src/arte/mapa/iconos/<nombre>.svg`, 64×64; los
jefes 128×128): tinta sepia con trazo de grosor variable, tramas y alguna aguada suave.
`ui/map-icons.ts` elige el dibujo con `mapIconFor(tipo, capitulo, escenario)`:

- **combate:** goblin con lanza (Acto I), calavera con tibias (II) y zarpazos (III);
  espadas cruzadas como respaldo;
- **élite** (calavera con cuernos sobre un escudo roto), **evento** (interrogación
  ornamentada), **campamento** (hoguera), **cofre** y **taberna** (jarra);
- **jefe:** uno por escenario, `jefe-<id del jefe>`: Gorzug, Vexis, Vol'guth, Malachar,
  Ignifax y el Contemplador;
- **decoración:** `mision` (la «X» con lacre de la taberna), `heroe` (la figurilla del
  héroe en el nodo actual), `aro` (el círculo que rodea los destinos posibles) y
  `tachado` (la cruz sobre los lugares visitados).

Los caminos son trazos de tinta punteados con temblor determinista; el viaje hecho va en
tinta roja y los caminos que salen del héroe, en tinta más oscura. Los destinos posibles
laten dentro de su círculo y los inalcanzables quedan desvaídos. El fondo es el pergamino
pintado de cada acto (`src/arte/mapa/mapa-actoN.webp` y `-ancho.webp` para los lados en
pantallas apaisadas); si falta, un pergamino CSS con el tono del acto. Los iconos se
rasterizan una sola vez (`cardArtBitmap`) y las animaciones solo usan `transform` y
`opacity`.

### Actualizaciones y avisos

La PWA busca versión nueva cada minuto y ofrece un botón **Actualizar**. Solo las
**versiones mayores** (3.x → 4.0) muestran la ventana de novedades, con todo lo que trae
esa versión mayor. Desde el menú principal, el jugador puede activar los **avisos de
versiones mayores**. No hay servidor de push: cada build publica `version.json`, el juego
lo consulta al abrirse y cada minuto, y en Chrome para Android con la PWA instalada el
service worker también lo consulta en segundo plano (`public/sw-avisos.js`). Cuando hay
una versión mayor nueva, lanza una notificación del sistema, una sola vez por versión.

### Motor gráfico (WebGL2)

Las marionetas y las partículas se dibujan con **WebGL2** para ir fluidas en móvil:

- **Marionetas** (`ui/puppet-stage.ts`): un canvas por escena (combate, galería), situado
  entre el fondo y la interfaz, dibuja cada figura sobre el hueco de su marcador DOM. Cada
  pieza es un quad instanciado cuyo *fragment shader* evalúa la forma como campo de
  distancias (SDF) leído de una textura de datos (`fx/puppet-gpu.ts`). Contorno, sombra
  recortada, trazo interior, luz de borde, auras y brillos salen en 4–6 dibujos por figura.
- **Partículas** (`fx/particle-gl.ts`): un único dibujo instanciado por fotograma, con el
  brillo calculado en el shader en lugar de `shadowBlur`. La simulación está en
  `fx/particle-sim.ts`.
- **Efectos de hechizos** (`fx/spell-fx.ts`): cada clave `fx` de las cartas tiene su
  efecto propio (raíces que se enroscan en el objetivo, tres surcos de zarpa, ola que
  rompe, runa de condena que cae, escudo hexagonal…), dibujado con formas SDF en el
  mismo lienzo WebGL de las partículas. Lo diseña el agente `artista-particulas`.
- **Alas articuladas** (`fx/wing.ts`): hombro, antebrazo y tres dedos con paneles de
  membrana que se pliegan al subir y se extienden al bajar, con la ola de fase del
  hombro a la punta.
- **Fondos pintados** (`fx/background.ts`, `src/arte/fondos/`): cada uno de los seis
  escenarios tiene su ilustración WebP de 1920×1080 (y una vertical de 1080×1440 si la
  escena es más alta que ancha): campamento ogro, sótano de contrabandistas, cripta,
  templo profanado, guarida del dragón y laberinto del Contemplador. Es una imagen
  estática debajo del lienzo WebGL, sin coste por fotograma, con la luz detrás del héroe
  para justificar su contraluz. Los pinta el agente `pintor-fondos` (`.claude/agents/`)
  por código; los scripts están en `scripts/fondos/<id>/`.
- **Cartas:** las ilustraciones se rasterizan una sola vez a mapa de bits
  (`ui/card-svgs.ts`), el ajuste de texto se memoriza y los efectos animados (brillo de
  raras, marco y respiración de las full art) solo usan `transform` y `opacity`, que compone
  la GPU sin repintar. Las partículas de las full art salen por la capa WebGL global. No hay
  `mix-blend-mode` ni `backdrop-filter` sobre la escena animada.
- **Respaldo:** sin WebGL2 se usa automáticamente el renderizado SVG y canvas 2D.
- **Diagnóstico en el dispositivo:** `?fps` muestra un contador de fotogramas y
  `?render=svg` fuerza el motor antiguo para comparar. Si el fondo pintado no carga,
queda el cielo CSS con luna y bruma de horizonte con el tono de cada acto.
