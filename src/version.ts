// Versión del juego y registro de cambios mostrado al actualizar.
// Sube VERSION y añade una entrada al principio de CHANGELOG con cada release.

export const VERSION = '0.8.1';

export interface EntradaCambios {
  version: string;
  fecha: string;     // ISO (AAAA-MM-DD)
  cambios: string[]; // viñetas de novedades
}

export const CHANGELOG: EntradaCambios[] = [
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
