// Versión del juego y registro de cambios mostrado al actualizar.
// Sube VERSION y añade una entrada al principio de CHANGELOG con cada release.

export const VERSION = '0.4.0';

export interface EntradaCambios {
  version: string;
  fecha: string;     // ISO (AAAA-MM-DD)
  cambios: string[]; // viñetas de novedades
}

export const CHANGELOG: EntradaCambios[] = [
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
