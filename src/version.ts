// Versión del juego y registro de cambios mostrado al actualizar.
// Sube VERSION y añade una entrada al principio de CHANGELOG con cada release.

export const VERSION = '3.2.1';

export interface EntradaCambios {
  version: string;
  fecha: string;     // ISO (AAAA-MM-DD)
  cambios: string[]; // viñetas de novedades
}

export const CHANGELOG: EntradaCambios[] = [
  {
    version: '3.2.1',
    fecha: '2026-08-27',
    cambios: [
      '📜 Corregido: el texto de victoria hablaba siempre de Ignifax aunque hubieras derrotado al Contemplador. Ahora cada jefe final tiene su propio epílogo.',
      '🤝 Nuevo Don del Patrón: tu Explosión Sobrenatural pasa a costar 0 (sustituye a Repulsión Sobrenatural, que pegaba y blindaba demasiado por 1 de energía).',
      '📣 Nueva Llamada del Vacío (coste 0): pone la Explosión Sobrenatural en tu mano, esté en el mazo, en el descarte o incluso agotada, y este turno inflige 3 más.',
      '🧚 Presencia Feérica se limita a 2 de Oscuridad por turno: ahora cuesta 3 y su mejora la abarata a 2 en vez de subir la cantidad.',
    ],
  },
  {
    version: '3.2.0',
    fecha: '2026-08-27',
    cambios: [
      '🐺 El Druida se pone al día: las Transformaciones son ya su motor de daño. Duran 4-5 turnos (antes 2-3), dan más Fuerza y ahora empieza la partida con la Forma de Lobo en el mazo.',
      '🦟 Nueva Forma de Enjambre: te transformas y golpeas a TODOS los enemigos a la vez.',
      '🦎 Nuevo poder, Corazón del Cambiante: tus Transformaciones duran 2 turnos más y otorgan +2 de Fuerza (o de Destreza) extra.',
      '🐾 Tormenta de Zarpas pasa a infligir 5 de daño tres veces si estás transformado, y Mordisco Feroz sube a 7.',
      '🌿 Raíces Enredaderas alcanzan ya a TODOS los enemigos (6 de Raíces), y el Zarpazo pega 5 en vez de 4.',
      '📊 El simulador afina más: entiende que bajar el ataque enemigo (Raíces, Débil, Oscuridad) defiende igual que el bloqueo, adelanta las cartas que escalan y ajusta el mazo al acto en el que estás.',
    ],
  },
  {
    version: '3.1.0',
    fecha: '2026-08-27',
    cambios: [
      '⚖️ Gran reajuste del Brujo: la Oscuridad ahora baja 1 por turno y sus invocaciones son mucho más modestas (el Sabueso 7/5 y el Demonio 12/9), porque cada punto de vida vale como bloqueo… y además atacaban.',
      '👹 En cambio, el golpe del Demonio aplica 6 de Condena, y el Sacrificio del Familiar te devuelve 1 de energía (2 mejorado).',
      '😇 Bendición Celestial (ahora cuesta 3) cura 12 PV al jugarla y luego solo da bloqueo cada turno: se acabó rellenar la vida a base de combates fáciles.',
      '🌑 El Sello del Pacto empieza el combate con 2 de Oscuridad en vez de Condena, así el Diezmo de Sangre ya no está siempre activo. Presencia Feérica sube a coste 2 y Devorar Vida pasa a ser Marchitar (12 de daño y 2 de Vulnerable).',
      '🎴 Todas las cartas del juego tienen ya su propio emoji: 35 se habían quedado con el comodín ✦, y ninguna repite dibujo dentro de un mismo mazo.',
      '🤖 El simulador del motor juega mucho mejor: puntúa las cartas y las lanza por prioridad, apunta al enemigo más débil y prueba los cuatro tipos de encuentro (singular, grupo, élite y jefe) con mazos acordes a cada momento de la partida.',
    ],
  },
  {
    version: '3.0.0',
    fecha: '2026-08-26',
    cambios: [
      '🕳️ ¡Nueva clase, el Brujo (64 PV)! Un pacto con cuatro patas: la Explosión Sobrenatural, la Condena, invocaciones de usar y tirar y bloqueo que muerde.',
      '💥 Explosión Sobrenatural: su carta inicial de coste 1 vuelve a lo alto de tu mazo al jugarla, así que la lanzas casi cada turno. Los poderes la engordan (más daño, un golpe más, o golpear a todos) y otras cartas la mejoran solo ese turno.',
      '⚖️ Condena: puntos que no decaen. Al final del turno del enemigo, si su Condena llega a sus PV actuales, muere — también los jefes. Brazos de Hadar la reparte con Débil a todos y Palabra de Ruina la duplica.',
      '🩸 Armadura de Agathys: gana bloqueo y, ese turno, todo el daño que bloquees se devuelve a TODOS los enemigos.',
      '👁️ Invocaciones efímeras: solo duran un turno, pero pegan y aguantan más. Absorben el golpe enemigo y, si sobreviven, contraatacan antes de desvanecerse.',
      '🌑 Oscuridad: baja el ataque de todos los enemigos y no decae. Y sus cuatro subclases raras: Archifata, Celestial, Infernal y Gran Antiguo.',
    ],
  },
  {
    version: '2.1.1',
    fecha: '2026-08-26',
    cambios: [
      '👟 Trabajo de Pies se reequilibra: era demasiado ganar Destreza cada turno. Ahora es un poder que da 2 de Destreza de golpe (3 mejorado).',
    ],
  },
  {
    version: '2.1.0',
    fecha: '2026-08-26',
    cambios: [
      '🐛 Corregido: los poderes de «al inicio de cada turno» ya no se disparan el turno que los juegas (Alma de Cuchillas y Tratado Prohibido).',
      '👟 Trabajo de Pies es ahora un poder: ganas 1 de Destreza al inicio de cada turno (mejorado, cuesta 0).',
      '🧪 Nueva rara Nube Nauseabunda (coste 2): envenena a TODOS los enemigos y detona su Veneno al instante.',
      '🧪 Dos infrecuentes de veneno: Golpe Séptico (pega más cuanto más envenenado esté el enemigo) y Toxina Paralizante (dobla el Veneno si no pretende atacar).',
      '🗡️ Las Dagas ya tienen mazo propio: Lluvia de Dagas añade 3 a tu mano y Guardia de Cuchillas te da bloqueo por cada Daga que juegas.',
      '🎭 Cambiazo (coste 0) ahora garantiza que el enemigo no ataque este turno; si solo sabe atacar, se queda desconcertado y pierde el turno. Y la nueva rara Oportunista suma daño a cada golpe contra quien no pretende atacar.',
      '🌀 Fuera Reflejos de Sombra: las Acrobacias vuelven a durar siempre 1 turno.',
    ],
  },
  {
    version: '2.0.1',
    fecha: '2026-07-18',
    cambios: [
      '🗡️ El Pícaro se reequilibra: Alma de Cuchillas genera 1 Daga por turno (adiós a la lluvia infinita de dagas).',
      '💃 Danza Mortal ya no crea dagas: ahora tus Dagas infligen daño adicional igual a tu Destreza.',
      '🤸 Acrobacias reescritas: el bloqueo de esa carta se vuelve a aplicar el turno siguiente (solo ese bloqueo, 1 turno).',
      '🌀 Reflejos de Sombra (antes Escapada Perfecta): ahora es un poder que hace que tus Acrobacias duren 2 turnos.',
      '🧪 Golpe del Asesino aplica 1 de Veneno; mejorado, cuesta menos energía (igual que Alma de Cuchillas).',
    ],
  },
  {
    version: '2.0.0',
    fecha: '2026-07-18',
    cambios: [
      '🗡️ ¡Nueva clase, el Pícaro! Acrobacias que conservan tu bloqueo, dagas, ataques furtivos y mucho robo y descarte de cartas.',
      '🃏 Sus subclases raras: el Asesino (tus ataques envenenan), el Psiónico (una lluvia de dagas cada turno) y el Embaucador Arcano (ilusiones y trucos).',
      '🎭 Cartas nuevas como Emboscada (arrasa si el enemigo no piensa atacar) y Cambiazo (le cambias la intención por la del turno siguiente).',
      '🌿 Las raíces del druida se reequilibran: al aplastar un ataque anulado el enemigo pierde solo la diferencia, y su efecto baja ligeramente.',
      '📜 El mago escribe más: todas las cartas de «Escribir» del Conjuro Prodigioso suben sus cantidades.',
    ],
  },
  {
    version: '1.0.0',
    fecha: '2026-06-27',
    cambios: [
      '🗺️ ¡El doble de mundo! Cada acto tiene ahora dos escenarios posibles y en cada partida sale uno al azar.',
      '🗡️ Nuevo Acto I alternativo — La Guarida de los Contrabandistas: ladrones y ninjas, y el jefe Vexis, el Embaucador Arcano, con cuchillos, veneno e ilusiones que te confunden.',
      '⛪ Nuevo Acto II alternativo — El Templo Oscuro: cultistas y demonios, y el Heraldo del Culto, que al caer libera de su propia carne a Abaddon, el Demonio Mayor.',
      '👁️ Nuevo Acto III alternativo — El Laberinto del Contemplador: aberraciones y azotamentes, con el Contemplador y sus Observadores, cuyos rayos de colores retuercen tu siguiente turno (cartas que se agotan, sobrecarga de energía, cartas etéreas…).',
      '🧪 Nuevo estado Veneno: pierdes vida al inicio de tu turno (ignora el bloqueo) y baja con el tiempo.',
      '✨ Cada escenario estrena su propia atmósfera de partículas y temática.',
    ],
  },
  {
    version: '0.18.0',
    fecha: '2026-06-26',
    cambios: [
      '🩸 La Hemorragia pega más fuerte: las cartas del bárbaro aplican +1 de sangrado (Corte Sangrante, Doble Tajo, Desgarro y Hacha Carnicera).',
      '😡 Furia Sanguinaria ahora también inflige daño a TODOS los enemigos, así que el sangrado que aplica se mantiene aunque no juegues otra carta.',
      '🐾 Las invocaciones del druida nacen un poco más débiles (menos vida y, por tanto, menos pegada) para equilibrarlas.',
    ],
  },
  {
    version: '0.17.1',
    fecha: '2026-06-25',
    cambios: [
      '🩸 Corregido: si la Hemorragia mataba al último enemigo, el combate se quedaba colgado sin terminar. Ahora se cierra con normalidad.',
    ],
  },
  {
    version: '0.17.0',
    fecha: '2026-06-25',
    cambios: [
      '📜 El Conjuro Prodigioso ahora tiene Retener: si no lo juegas, se queda en tu mano al final del turno en vez de descartarse.',
      '🐾 El ataque de las invocaciones pasa a ser el 30 % de su vida actual (antes, 25 % de la máxima): pegan más fuerte sanas y menos a medida que las hieren.',
      '🐺 Comunión Salvaje, además de Invocar, cura hasta 10 de vida a tu invocación.',
      '⛰️ Elemental de Tierra: ahora da 6 de bloqueo fijo al inicio de tu turno.',
    ],
  },
  {
    version: '0.16.0',
    fecha: '2026-06-25',
    cambios: [
      '🐾 Nueva mecánica del druida — Invocaciones: un aliado con vida propia que aparece junto a ti. «Invoca X» le suma vida o crea uno nuevo. Ataca al inicio de tu turno por el 25 % de su vida máxima y absorbe el daño enemigo después de tu bloqueo y antes que tú.',
      '🐻 La forma la fija la primera carta; las pasivas de todas se combinan. Comunes: Comunión Salvaje (Lobo) y Oso Espiritual (muro de vida).',
      '🔥 Infrecuentes: Elemental de Agua (te cura cada turno), de Fuego (doble daño al bloqueo), de Aire (ataca a dos enemigos) y Vínculo Feroz (tu invocación ataca al instante).',
      '🌳 Raras: Guardián de Roble (aplica Raíces al atacar) y Elemental de Tierra (te da bloqueo cada turno).',
    ],
  },
  {
    version: '0.15.0',
    fecha: '2026-06-25',
    cambios: [
      '📜 Nueva mecánica del mago — Conjuro Prodigioso: una carta generada (coste 2, daño base 10) que crece durante el combate. Las cartas «Escribir X» le suman daño y algunas le añaden un efecto permanente. Aparece junto al héroe un indicador con su daño y efectos actuales.',
      '✒️ Cartas comunes: Inscripción Arcana (Escribir 4) y Glifo Mordiente (5 de daño + Escribir 3).',
      '🔥 Cartas infrecuentes: Dictado Veloz, Runa Flamígera (el conjuro golpea en área), Runa de Ruina (aplica Vulnerable) y Runa Égida (te da bloqueo al lanzarlo).',
      '📕 Cartas raras: Tratado Prohibido (Escribes cada turno) y Palabra de Poder (Escribir 12; el conjuro ignora el bloqueo).',
    ],
  },
  {
    version: '0.14.0',
    fecha: '2026-06-25',
    cambios: [
      '🩸 Nueva mecánica del bárbaro — Hemorragia: el enemigo pierde PV al inicio de su turno ignorando el bloqueo. No decae sola: hace un tic garantizado y se cierra si pasas un turno sin volver a herirlo.',
      '🗡️ Cartas comunes: Corte Sangrante (5 de daño + 3 de Hemorragia) y Doble Tajo (3×2 + 2 de Hemorragia).',
      '🪓 Cartas infrecuentes: Desgarro (8 + 5 de Hemorragia), Hacha Carnicera (5 a todos + sangrado), Furia Sanguinaria (Furia + sangrado en área) y Sed de Sangre (ganas bloqueo cuando un enemigo sangra).',
      '🍷 Cartas raras: Reabrir Heridas (duplica la Hemorragia del objetivo) y Festín Carmesí (consume el sangrado e inflige el doble).',
    ],
  },
  {
    version: '0.13.2',
    fecha: '2026-06-25',
    cambios: [
      '⏳ Al pulsar «Actualizar», el botón muestra un spinner y una barra de progreso mientras se descarga e instala la nueva versión, para que se vea que está trabajando (con recarga de seguridad si tarda demasiado).',
    ],
  },
  {
    version: '0.13.1',
    fecha: '2026-06-25',
    cambios: [
      '⚖️ Ajustes de equilibrio: Proyectil Mágico+ pasa a 4 golpes (8 de daño), Sangre Caliente+ inflige 13 con Furia (antes 15) y Toque Vampírico baja un poco su daño (8/+4 por nivel; 10/+5 mejorado).',
    ],
  },
  {
    version: '0.13.0',
    fecha: '2026-06-25',
    cambios: [
      '📖 Al ver una carta en grande (tócala en combate o haz clic en el Compendio) aparece un cuadro que explica todas sus palabras clave: Ataque, Bloqueo, Furia, Raíces, Innata…',
      '💨 Acelerar rediseñada: poder de coste 1 que roba 1 carta extra al inicio de tus turnos; se disipa si te quedas sin cartas en la mano (su versión mejorada es innata).',
      '🐺 Mordisco Feroz: cuesta 1 y, transformado, te devuelve 1 de energía (la mejorada pega más).',
      '🌀 Recuperación Arcana ahora recupera el espacio de conjuro de MAYOR nivel. Aullido aplica 2/3 de Débil.',
    ],
  },
  {
    version: '0.12.0',
    fecha: '2026-06-25',
    cambios: [
      '🌟 Cartas únicas de clase (rareza especial): al empezar el Acto III, Síbila te ofrece la de tu héroe — Tormenta de Venganza (Druida), Furia Indómita (Bárbaro) o Maestría de Conjuros (Mago).',
      '🎁 Dones del Senescal renovados: eliminar 1 carta; carta rara (entre 3) a cambio de PV; eliminar 2 cartas perdiendo PV máximos; o transformar una carta en otra al azar de tu clase.',
      '🔮 Don del Maná Eterno ahora da +1 de energía solo en los 2 primeros turnos de cada combate. Los dones de Fuerza y Destreza se fusionan en el del Berserker (+1 de ambas).',
      '🌵 Manto de Espinas reforzado (4 / 7 de Espinas).',
    ],
  },
  {
    version: '0.11.0',
    fecha: '2026-06-25',
    cambios: [
      '💥 Desintegrar (Mago, antes Meteorito): gasta un conjuro de nivel 2+ e inflige 20 (+10 por nivel) IGNORANDO y destruyendo el bloqueo enemigo.',
      '🔮 Clarividencia mejorada ahora es Innata: empiezas cada combate con ella en la mano. Proyectil Mágico golpea varias veces ignorando bloqueo, y Toque Electrizante devuelve una carta del descarte a lo alto del mazo.',
      '🐾 Druida: Tormenta de Zarpas (3×3), Luna Creciente y Raíces Estranguladoras pasan a golpear a TODOS los enemigos, Mordisco devuelve energía en forma salvaje y Forma Estelar ahora se agota.',
      '🪓 Bárbaro: Postura Firme escala con tu Fuerza desde el principio y Sangre Caliente pega muchísimo más en Furia (hasta 15).',
      '🛡️ Escudo Arcano y Cólera del Mar reajustados (más Débil; el escudo escala con el nivel de tus espacios de conjuro).',
    ],
  },
  {
    version: '0.10.0',
    fecha: '2026-06-23',
    cambios: [
      '🎲 Cartas mejoradas de Seducir y Deseo: ahora tiran 2d20 con VENTAJA (los dos dados ruedan a la vez y se usa el mejor). Ambas bajan de coste y se agotan.',
      '🔮 Mago: Globo de Invulnerabilidad se sustituye por Clarividencia (poder: +1/+2 de energía cada turno). Manos Ardientes aplica Vulnerable por espacio de conjuro, e Imagen Espejo sube al 60% de esquiva. Rayo Abrasador y Toque Electrizante pegan más; Proyectil Mágico golpea dos veces.',
      '🪓 Bárbaro: Tajo Brutal pasa a Hendidura (3 golpes a enemigos aleatorios). Furia Primaria/Creciente/Ágil y la Savia del Árbol del Mundo dan más Furia; Furia Divina dobla también el bloqueo. Postura Firme cuesta 1.',
      '🌿 Druida: Zarpazo aplica más Vulnerable y las Raíces (Enredaderas y Estranguladoras) reducen aún más el ataque enemigo.',
    ],
  },
  {
    version: '0.9.0',
    fecha: '2026-06-15',
    cambios: [
      '🌿 Rework de las Raíces: ahora reducen el ATAQUE del enemigo y cada carta es una instancia con su propia duración (se acumulan). Si su ataque queda en 0 o menos, al atacar el enemigo pierde PV (3 + el exceso, ignorando bloqueo).',
      '🪢 Raíces Enredaderas: coste 1, −6/−8 (1 turno). Raíces Estranguladoras: coste 2, −10/−14 (2 turnos). Raíces Profundas: cada carta de Raíces dura 1 turno más.',
      '🎲 Los números del d20 son un poco más pequeños para caber mejor en cada cara.',
    ],
  },
  {
    version: '0.8.3',
    fecha: '2026-06-15',
    cambios: [
      '🎲 El d20 3D lleva ahora los números grabados en cada cara y aterriza con el resultado mirando a la cámara (se quitó el número superpuesto).',
      '⚖️ Cartas de azar (Seducir/Deseo): el resultado malo se concentra en 2-5 y los buenos abarcan rangos más amplios.',
    ],
  },
  {
    version: '0.8.2',
    fecha: '2026-06-13',
    cambios: [
      '🎲 El d20 ahora es un icosaedro 3D de verdad (WebGL): rueda y rebota por la pantalla con iluminación y facetas antes de revelar el resultado.',
    ],
  },
  {
    version: '0.8.1',
    fecha: '2026-06-13',
    cambios: [
      '🎲 El d20 ahora es un icosaedro facetado que rebota y gira despacio por la pantalla antes de revelar el resultado, que se queda a la vista más tiempo.',
      '💤 El enemigo que va a perder su acción muestra un icono 💤 en su intención.',
    ],
  },
  {
    version: '0.8.0',
    fecha: '2026-06-13',
    cambios: [
      '🎲 ¡Cartas de azar! «Seducir» (Acto II) y «Deseo» (Acto III), incoloras: tiran un d20 con animación 3D y el destino decide… de la catástrofe al milagro.',
      '🎁 Más variedad en las bendiciones de la Vidente entre actos (maná eterno, berserker, peregrino…).',
      '🗡️ La mejora inicial «Adiestramiento» ahora elimina 1 carta (antes 2), para equilibrar con las demás.',
      '💍 El Anillo de Protección da 1 de bloqueo por turno (antes 2).',
    ],
  },
  {
    version: '0.7.0',
    fecha: '2026-06-13',
    cambios: [
      '📖 Nuevo Compendio de cartas en el menú: todas por clase, opción de verlas mejoradas, comentarios por carta y exportación a JSON.',
      '🌿 Las Raíces solo dañan si el enemigo pretende atacar ese turno (se acabó el daño errático, sobre todo con Raíces Profundas).',
      '🪢 Raíces Estranguladoras rediseñada: −10 de Fuerza al enemigo durante 2 turnos (mejorada −14), coste 2; ya no inflige daño.',
    ],
  },
  {
    version: '0.6.0',
    fecha: '2026-06-13',
    cambios: [
      '🔥 Ignifax (Acto III) ahora desata el Aliento de Dragón: muchas partículas de fuego, daño y Quemadura (2 turnos en los que cada carta jugada te cuesta 3 PV).',
      '💀 Jefes de los Actos II y III más temibles: más vida y combos de Débil + Vulnerable.',
      '⚔️ Élites bastante más duros en los tres actos (más vida y más daño).',
      '🌳 Raíces Profundas (Círculo de la Tierra) cuesta 2 maná (mejorada baja a 1); el turno extra de Raíces ya no aumenta a 2 con la mejora.',
    ],
  },
  {
    version: '0.5.0',
    fecha: '2026-06-13',
    cambios: [
      '🎼 ¡Banda sonora real! Música 8-bit de OpenGameArt (CC0): un tema propio para el menú y para cada acto, más un tema de jefe épico. Si una pista no carga, suena el chiptune de respaldo.',
    ],
  },
  {
    version: '0.4.0',
    fecha: '2026-06-13',
    cambios: [
      '🎮 Nueva banda sonora chiptune (8-bit), más movida: tema de menú y, por cada acto, un tema normal y un tema de jefe rápido y épico.',
      '⚔️ La intención de ataque del enemigo muestra el daño ya modificado: en verde si lo reduces (Débil/Raíces), en rojo si te amplifican (Vulnerable).',
    ],
  },
  {
    version: '0.3.0',
    fecha: '2026-06-13',
    cambios: [
      '🎵 Música lo-fi distinta para cada capítulo y más intensa en combate; se pausa al salir de la app.',
      '🔮 Floritura sonora especial al jugar cartas raras.',
      '🍃 Nueva carta del Círculo de la Tierra, «Raíces Profundas»: tus Raíces reducen la Fuerza del enemigo un turno adicional.',
      '🧙 Los espacios de conjuro se muestran en pirámide. La recuperación devuelve el de MENOR nivel; «Sacrificio Arcano» el de MAYOR (cuesta 1 maná y PV; mejorado, sin perder vida).',
      '🎴 Las cartas raras salen menos en combates normales y algo más en élites.',
    ],
  },
  {
    version: '0.2.2',
    fecha: '2026-06-13',
    cambios: [
      '🔄 El juego detecta las actualizaciones solo (al volver a la app y cada minuto): el aviso de nueva versión aparece sin tener que cerrarla y reabrirla.',
    ],
  },
  {
    version: '0.2.1',
    fecha: '2026-06-13',
    cambios: [
      '🔮 Imagen Espejo: ahora gasta un espacio de conjuro y esquiva un 40 % + 20 % por nivel del espacio gastado.',
      '🛠️ Corregido el orden de los espacios de conjuro al ganarlos: 1, 1, 2, 1, 2, 3 y, a partir de ahí, todos de nivel 1.',
    ],
  },
  {
    version: '0.2.0',
    fecha: '2026-06-13',
    cambios: [
      '🔊 ¡Nuevo! Música lo-fi de mazmorreo y efectos de sonido (botón 🔊 para silenciar).',
      '🛡️ Postura Firme: el bloqueo ahora escala con Fuerza además de con Destreza.',
      '🐾 Corazón Salvaje: al perder la Furia ganas Fuerza y Destreza para el combate.',
      '✨ Furia Divina: tu bonus de Furia cuenta doble en el golpe y ahora también da bloqueo.',
      '🔥 Frenesí: cuesta 1 y duplica tu Furia, pero se rompe al final del turno aunque recibas daño.',
    ],
  },
];
