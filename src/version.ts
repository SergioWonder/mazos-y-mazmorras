// Versión del juego y registro de cambios mostrado al actualizar.
// Sube VERSION y añade una entrada al principio de CHANGELOG con cada release.

export const VERSION = '0.15.0';

export interface EntradaCambios {
  version: string;
  fecha: string;     // ISO (AAAA-MM-DD)
  cambios: string[]; // viñetas de novedades
}

export const CHANGELOG: EntradaCambios[] = [
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
