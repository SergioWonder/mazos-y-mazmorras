// Versión del juego y registro de cambios mostrado al actualizar.
// Sube VERSION y añade una entrada al principio de CHANGELOG con cada release.

export const VERSION = '8.3.1';

export interface EntradaCambios {
  version: string;
  fecha: string;     // ISO (AAAA-MM-DD)
  cambios: string[]; // viñetas de novedades
}

export const CHANGELOG: EntradaCambios[] = [
  {
    version: '8.3.1',
    fecha: '2026-10-02',
    cambios: [
      '🔣 Glifo Mordiente pasa a ser una habilidad poco común: ya no hace daño, solo escribe 4/5 y aplica 1/2 de Débil a todos los enemigos.',
      '✍️ Dictado Veloz pasa a ser común.',
    ],
  },
  {
    version: '8.3.0',
    fecha: '2026-10-02',
    cambios: [
      '🗡️ Mago: Rayo Abrasador se sustituye por Arma Mágica, un poder que gasta un conjuro para que tus Golpes peguen más y tus Defender den más bloqueo (2/4, +1 por nivel del espacio).',
      '🔮 Más formas de recuperar espacios: Canalizar Maná+ da 2 espacios, Sacrificio Arcano cuesta 4 PV (3 mejorado, que además recupera uno de nivel 1) y Toque Vampírico ya acepta cualquier espacio (12/14, +3 por nivel).',
      '🔥 Bola de Fuego cuesta 2 y pega 18/24 (+4 por nivel); Desintegrar 20/26 (+6 por nivel); Manos Ardientes 4/7 (+2 por nivel); Escudo Arcano 4/7 de bloqueo (+3 por nivel libre).',
      '❄️ Rayo de Escarcha 7/8, Armadura de Mago 7/10 de bloqueo, Dictado Veloz 4/6 por golpe, Glifo Mordiente escribe 4/5 y aplica Débil a todos, y Truco de Magia siempre roba 2 (cuesta 1/0). Los Proyectiles Mágicos salen algo más espaciados.',
      '🐺 Druida: la Bendición de la Manada ya no alarga las transformaciones, pero el lobo espiritual llega con 5 de vida.',
    ],
  },
  {
    version: '8.2.1',
    fecha: '2026-10-01',
    cambios: [
      '🔔 «Notificar nuevas versiones» se queda activado al volver a entrar: el juego recuerda tu elección aunque el móvil olvide el permiso al cerrar la app, y lo recupera con tu siguiente toque.',
    ],
  },
  {
    version: '8.2.0',
    fecha: '2026-10-01',
    cambios: [
      '👁️ El Contemplador tiene su propio tema: metalcore con sintetizadores, breakdowns que hunden el suelo, compases que cambian sin aviso y una voz rasgada que surge en los silencios.',
      '🐉 Ignifax, la batalla final, suena a clímax: coros enormes, mazazos seguidos de silencio y un trono de órgano y tambores donde la música cambia de pulso sin perder el paso.',
    ],
  },
  {
    version: '8.1.0',
    fecha: '2026-10-01',
    cambios: [
      '🐉 Banda sonora nueva del Acto III: la Guarida del Dragón canta «Tesoro maldito», un lamento de violonchelo entre ruinas, lava y azufre que en combate se convierte en tambores de guerra, yunques y cuerdas frenéticas.',
      '👁️ El Laberinto del Contemplador suena a cristal oscuro y coros, y en combate estalla en guitarras distorsionadas, doble bombo y parones en seco.',
    ],
  },
  {
    version: '8.0.0',
    fecha: '2026-10-01',
    cambios: [
      '⚱️ Dracs & Rogues 8.0: Vol\'guth ya no muere a la primera. Al caer, su alma se refugia en su Filacteria; si no la rompes en un turno, el liche vuelve con toda su vida… hasta que la urna se haga añicos y su alma escape para siempre.',
      '⛓️ Nueva maldición, Cadena de la Filacteria: mientras la tengas en la mano, cada carta que juegues cura a Vol\'guth. Rómpela pagando 1 de energía.',
      '🎻 Banda sonora nueva con orquesta, coros y órgano reales: tema del menú «Brasas», canciones propias para cada escenario de los actos I y II y un tema para cada jefe. En el mapa suena una versión tranquila y en combate la misma canción con más tensión, sin cortarse.',
      '😈 Malachar dirige un ritual de coros y campanas, y cuando se alza Abaddon la misma canción estalla en caos sin perder el compás.',
      '👁️ Enemigos más duros: el Contemplador y su Rayo Desintegrador, élites con habilidades únicas en los actos II y III y un Cerebro Anciano mucho más inquietante.',
      '⚙️ Nuevo menú de ajustes (volúmenes de música y efectos, rendimiento, compendio, galería y avisos), sonidos de cartas e interfaz, partículas visibles en el ordenador y cartas que se desintegran al agotarse.',
      '🗡️ Pícaro centrado en los descartes, Carga Sagrada que es Golpe y Defensa, Bomba de Humo, Tempestad de Acero, Festín Carmesí como Furia y Recuperación Arcana que se agota.',
    ],
  },
  {
    version: '7.9.0',
    fecha: '2026-10-01',
    cambios: [
      '🕯️ Banda sonora nueva del Acto II, con orquesta, coros y órgano reales: la Cripta y el Templo Oscuro tienen su canción de mapa y de combate, que cambian sin cortarse.',
      '💀 Vol\'guth tiene su misa de difuntos, y su filacteria hace morir y despertar la música.',
      '😈 Malachar dirige un ritual de coros y campanas… y cuando se alza Abaddon, la misma canción estalla en caos sin perder el compás.',
    ],
  },
  {
    version: '7.8.1',
    fecha: '2026-10-01',
    cambios: [
      '🔮 Recuperación Arcana (mago) ahora se agota: es el precio de recuperar un conjuro gratis, frente al Sacrificio Arcano, que lo paga con vida.',
    ],
  },
  {
    version: '7.8.0',
    fecha: '2026-10-01',
    cambios: [
      '✨ Nuevo tema del menú, «Brasas»: misterio y magia con celesta, flauta alto, violín solista, arpa y coro.',
      '🍷 Festín Carmesí (bárbaro) cambia: Furia que consume toda la Hemorragia de los enemigos y te da esa cantidad de Fuerza (mejorada cuesta 1).',
    ],
  },
  {
    version: '7.7.1',
    fecha: '2026-10-01',
    cambios: [
      '🕊️ En cuanto cae el último enemigo, la música vuelve a su versión tranquila: eliges la recompensa ya en calma.',
    ],
  },
  {
    version: '7.7.0',
    fecha: '2026-10-01',
    cambios: [
      '🎻 Banda sonora nueva del Acto I, con instrumentos de orquesta reales: cada escenario tiene su propia canción y cada jefe su tema.',
      '🗺️⚔️ En el mapa suena una versión tranquila y en combate la misma canción con más tensión: al entrar o salir de un combate la música cambia sin cortarse, desde el mismo punto.',
      '👹 Gorzug devora el tema a mordiscos; 🃏 Vexis te roba el vals del menú y lo convierte en un circo macabro.',
    ],
  },
  {
    version: '7.6.0',
    fecha: '2026-10-01',
    cambios: [
      '🎻 Nuevo tema del menú, tocado con instrumentos de orquesta reales: trompa, maderas, cuerdas y arpa presentan el leitmotiv del héroe en un vals de aventura.',
      '⚒️ Carga Sagrada cuenta como Golpe y como Defensa: suma el daño extra de tus Golpes y el bloqueo extra de tus Defensas, y la encuentran las cartas que buscan cualquiera de los dos.',
    ],
  },
  {
    version: '7.5.2',
    fecha: '2026-09-30',
    cambios: [
      '💨 Esfumarse, que hacía lo mismo que Pirueta, pasa a ser Bomba de Humo: por 2 de energía aplica 5 de Oscuridad (7 mejorada) a todos los enemigos y les baja el ataque.',
    ],
  },
  {
    version: '7.5.1',
    fecha: '2026-09-30',
    cambios: [
      '🌪️ Tempestad de Acero ahora pega de verdad: 12 de daño (16 mejorada) y +3 (+4) por cada carta que hayas descartado en todo el combate, no solo en el turno.',
    ],
  },
  {
    version: '7.5.0',
    fecha: '2026-09-30',
    cambios: [
      '👁️ El Contemplador da miedo de verdad: tallos oculares que serpentean, fauces con colmillos, rayos mucho más dañinos y un nuevo Rayo Desintegrador que te deshace de un solo golpe.',
      '★ Las élites de los actos II y III tienen habilidades únicas: bloqueo que se acumula, regeneración, vampirismo, hogueras, escamas, mentes colmena… Y los enemigos normales del acto III también traen la suya.',
      '💀 Los enemigos de los actos II y III tienen más vida y pegan más fuerte.',
      '🧠 El Cerebro Anciano, con tentáculos y ojos incrustados, es mucho más inquietante, y las alas de dracos, demonios e Ignifax quedan siempre detrás de la cabeza.',
      '🗡️ Pícaro: Filo Rápido pega mucho más y descarta en vez de robar; fuera Rodar; nuevas cartas que premian descartar (Esquiva Refleja, Cuchillo Oculto, Juego Sucio, Tormenta de Filos), y ataques furtivos más letales.',
      '🔥 Las cartas que se agotan se desintegran en ceniza y brasas.',
    ],
  },
  {
    version: '7.4.0',
    fecha: '2026-09-30',
    cambios: [
      '🃏 Las cartas suenan: un roce al robarlas, un chasquido al jugarlas, un barrido al descartar la mano y un riffle al barajar.',
      '🔍 Ampliar una carta para leerla (en combate o en el compendio) tiene su propio sonido suave.',
      '🖱️ Clic suave de madera en todos los botones e interruptores de la interfaz.',
    ],
  },
  {
    version: '7.3.1',
    fecha: '2026-09-30',
    cambios: [
      '✨ En el ordenador vuelven a verse las partículas con brillo (estrellas, llamas, ascuas, hechizos…), que solo se veían bien en el móvil.',
    ],
  },
  {
    version: '7.3.0',
    fecha: '2026-09-30',
    cambios: [
      '📜 «Continuar partida guardada» sale ahora arriba del todo en el menú principal, grande y bien visible.',
      '⚠️ Si empiezas una partida nueva teniendo una guardada, el juego te pide confirmación antes de borrarla.',
      '⚙️ El Compendio de cartas, la Galería de sprites y los avisos de nuevas versiones se abren desde el menú de ajustes.',
    ],
  },
  {
    version: '7.2.0',
    fecha: '2026-09-30',
    cambios: [
      '🔔 Desde el menú de ajustes ya puedes activar o desactivar los avisos de nuevas versiones.',
      '📚 En el menú principal, los ajustes también llevan al Compendio de cartas y a la Galería de sprites.',
    ],
  },
  {
    version: '7.1.0',
    fecha: '2026-09-30',
    cambios: [
      '⚙️ Nuevo menú de ajustes arriba a la derecha: música y efectos de sonido por separado, cada uno con su volumen, y opciones de rendimiento (reducir partículas, resolución reducida, sacudidas de pantalla y contador de FPS).',
      '🏰 En el menú principal las clases se reparten en filas iguales: dos filas de tres (tres de dos en el móvil en vertical).',
    ],
  },
  {
    version: '7.0.7',
    fecha: '2026-09-30',
    cambios: [
      '💥 Cada Castigo tiene su propio golpe con los colores de sus llamas: el Divino estampa un sol ámbar llameante y los genéricos, una cruz sagrada entre llamas amarillas.',
      '⚖️ Los ataques de área vuelven a llevar el Castigo a todos los enemigos; solo la llamarada del Castigo Abrasador se lanza una vez, sin encadenarse.',
    ],
  },
  {
    version: '7.0.6',
    fecha: '2026-09-30',
    cambios: [
      '🎨 Cada Castigo arde con su color: ámbar el Divino, azul el Atronador, blanco el Cegador, naranja el Abrasador, melocotón el Resplandeciente y violeta el Desterrador. Los de Martillo de Luz, Ángel Vengador y la Aurora siguen en amarillo sagrado.',
    ],
  },
  {
    version: '7.0.5',
    fecha: '2026-09-30',
    cambios: [
      '🔥 Las llamas del Castigo ya no se cortan en una franja alrededor del paladín: ascienden libres y más luminosas.',
    ],
  },
  {
    version: '7.0.4',
    fecha: '2026-09-30',
    cambios: [
      '⚖️ El Castigo se aplica una sola vez aunque el ataque sea de área: en el primer objetivo, y la llamarada del Castigo Abrasador ya no se encadena.',
      '🔥 Las llamas del Castigo también lamen el borde del paladín por delante: la figura se funde con el fuego en vez de parecer recortada.',
    ],
  },
  {
    version: '7.0.3',
    fecha: '2026-09-30',
    cambios: [
      '🔥 El aura del Castigo son ahora llamas sagradas que ascienden serpenteando por detrás del paladín, sin halo por encima de la figura.',
    ],
  },
  {
    version: '7.0.2',
    fecha: '2026-09-30',
    cambios: [
      '🔥 El paladín con un Castigo preparado arde con una luz sagrada blanca y dorada que late tras él, en cualquier dispositivo.',
      '🏰 El menú principal tiene scroll en escritorio: el botón de continuar partida ya no queda cortado.',
      '🔔 El botón de avisos pasa a llamarse «Notificar nuevas versiones».',
    ],
  },
  {
    version: '7.0.1',
    fecha: '2026-09-30',
    cambios: [
      '🔥 El aura del Castigo preparado se ve de verdad: llamas sagradas más grandes y luminosas alrededor del paladín.',
      '🌟 Con un Castigo preparado, las demás cartas de Castigo salen en gris, como cuando no tienes energía.',
      '💬 Mensajes más escuetos cuando una carta ya no se puede jugar.',
    ],
  },
  {
    version: '7.0.0',
    fecha: '2026-09-30',
    cambios: [
      '🔨 Dracs & Rogues 7.0: llega el Paladín, sexta clase, con martillo, escudo y Castigos de luz sagrada.',
      '🌟 El Paladín gana Fervor con cada Golpe y Defensa y lo gasta en su Castigo: solo uno a la vez, que arde a su alrededor como un aura sagrada hasta descargarse en su próximo ataque. Su Símbolo Sagrado convierte los Golpes y Defender que eliminas en sagrados.',
      '🎛️ Combate más cómodo: la energía queda en el extremo izquierdo y el fin de turno en el derecho, el Castigo preparado se ve junto al héroe y tocando el mazo o las pilas puedes ver sus cartas.',
      '🎲 En la taberna puedes eliminar una carta de tu mazo, y en la hoguera ves tus puntos de golpe.',
      '✨ El mago se luce: Proyectil Mágico en ráfagas serpenteantes que se cargan con cada lanzamiento, el Conjuro Prodigioso con hechizos cada vez más épicos y Tratado Prohibido+ que escribe 7 por turno.',
      '🗺️ Durante la 6.x: mapas propios para cada escenario, ilustraciones de personajes, muertes épicas del héroe, cartas de pergamino, música para el Dungeon Master, nueva tipografía y números reales en todas las cartas.',
    ],
  },
  {
    version: '6.13.1',
    fecha: '2026-09-30',
    cambios: [
      '🛡️ Escudo de la Fe ahora gasta tu Fervor en defensa: 5 de bloqueo más 2 por cada Fervor gastado.',
      '🔨 Martillo de Luz inflige 7 y deja preparado un Castigo: tu próximo ataque inflige 4 de daño más.',
      '🌳 Juramento de los Antiguos da 1 de bloqueo por Fervor (antes 2); mejorado cuesta 1.',
    ],
  },
  {
    version: '6.13.0',
    fecha: '2026-09-30',
    cambios: [
      '🔨 Nueva clase: el Paladín. Martillo, escudo y 76 PV; cada Golpe y Defensa le da Fervor, y sus Castigos lo gastan para cargar el siguiente ataque de luz divina, trueno, fuego, ceguera, resplandor o destierro.',
      '✝️ Su Símbolo Sagrado convierte los Golpes y Defender que eliminas en Golpes y Defensas Sagrados, y su mazo crece con juramentos de D&D (Devoción, Gloria, Antiguos y Venganza), hechizos de área y mucho bloqueo.',
      '👼 Nueva carta única para el Acto III: Ángel Vengador. Además, reliquias y bendiciones propias, ilustraciones, efectos y sonidos del paladín.',
    ],
  },
  {
    version: '6.12.1',
    fecha: '2026-09-29',
    cambios: [
      '📱 La app instalada en Android recoge por fin el icono del Dungeon Master (puede tardar un día y pedirte que aceptes el cambio).',
    ],
  },
  {
    version: '6.12.0',
    fecha: '2026-09-29',
    cambios: [
      '🎲 En la taberna, la jarra que curaba deja paso a eliminar 1 carta de tu mazo: apostarla con un tahúr, regalársela al bardo, quemarla en la chimenea u olvidarla brindando hasta el amanecer.',
    ],
  },
  {
    version: '6.11.1',
    fecha: '2026-09-28',
    cambios: [
      '🪄 Báculo del Archimago: ahora ganas 1 de Fuerza cada vez que gastas un espacio de conjuro de nivel 2 o superior (antes recuperaba un espacio al gastar uno de nivel 3).',
    ],
  },
  {
    version: '6.11.0',
    fecha: '2026-09-28',
    cambios: [
      '📜 El Conjuro Prodigioso se luce: cada lanzamiento muestra un hechizo al azar, y cuanto más daño hace, más espectacular (raros desde 30, únicos desde 50 y, desde 80, el rayo del Dungeon Master).',
      '🌀 Proyectil Mágico: los dardos serpentean más, vuelan un poco más, se reparten el espacio en carriles propios y ya no se salen de la pantalla.',
    ],
  },
  {
    version: '6.10.1',
    fecha: '2026-09-28',
    cambios: [
      '🌀 Proyectil Mágico: los dardos siguen rutas más variadas, unos por arriba y otros por abajo, y alguno riza el rizo antes de caer sobre el enemigo.',
    ],
  },
  {
    version: '6.10.0',
    fecha: '2026-09-28',
    cambios: [
      '💫 Proyectil Mágico se carga: cada vez que lo lanzas, todos tus Proyectiles Mágicos hacen +1 de daño por proyectil durante el combate.',
      '✨ Maestría de Conjuros: además de darte un Proyectil Mágico cada turno, tus Proyectiles Mágicos lanzan 1 proyectil más.',
      '🌀 Nueva animación de Proyectil Mágico: los dardos salen en ráfaga, serpentean y caen en arco sobre el enemigo, y cada número aparece al impactar.',
    ],
  },
  {
    version: '6.9.1',
    fecha: '2026-09-28',
    cambios: [
      '🔤 Todos los párrafos usan Philosopher: descripciones de los héroes y de las opciones, subtítulos, el bocadillo del Dungeon Master y la lápida. Almendra queda solo para títulos.',
      '🌵 Arreglado: un enemigo que muere por Espinas a mitad de un ataque múltiple deja de golpear.',
    ],
  },
  {
    version: '6.9.0',
    fecha: '2026-09-28',
    cambios: [
      '🎯 Tu Vulnerable ahora dura hasta el final del turno del enemigo, así que sí amplifica sus golpes. El que te pone un enemigo llega a su siguiente ataque.',
      '☠️ Marca del Condenado te da 1 de Vulnerable al robarla (dura hasta el final del turno enemigo), en lugar de al final de tu turno.',
      '⚔️ La intención de los enemigos vuelve a mostrar el daño del golpe, sin descontar tu bloqueo ni tu invocación.',
      '📝 Las cartas con daño o bloqueo calculado muestran el total y el extra entre paréntesis, como «Inflige 22 de daño (aplica 3× tu Fuerza)».',
    ],
  },
  {
    version: '6.8.0',
    fecha: '2026-09-28',
    cambios: [
      '🔢 Las cartas muestran el número real que van a hacer, también ampliadas: Fuerza, Destreza, Débil, Vulnerable del objetivo, reliquias y casos especiales como 3× Fuerza, Fuerza sumada al bloqueo, daño por golpe, Veneno, Condena o conjuros por nivel.',
      '🎯 La intención de los enemigos muestra el daño que harán de verdad: ya no cuenta un Vulnerable tuyo que se acaba antes del golpe, y avisa con «→ ❤️» de los PV que perderás tras tu bloqueo, tu invocación o tu Espejismo, con el desglose en la ayuda.',
      '🌿 Arreglado: con Raíces y Oscuridad a la vez, un ataque reducido a 0 ya aplasta al enemigo en lugar de gastar tu Espejismo.',
      '🔨 Arreglado: Golpe Demoledor+ hacía 6 de daño base en lugar de los 8 que indica.',
    ],
  },
  {
    version: '6.7.1',
    fecha: '2026-09-28',
    cambios: [
      '🔤 Tipografía más sencilla: Almendra para los títulos y Philosopher para todos los textos, incluidos los de las cartas y su tipo.',
    ],
  },
  {
    version: '6.7.0',
    fecha: '2026-09-28',
    cambios: [
      '🔤 Nueva tipografía: el texto usa Marcellus, una incisa de inspiración romana, y los textos pequeños de más de dos líneas (cartas densas y ayudas) pasan a Fira Sans, una palo seco más legible en tamaño pequeño.',
    ],
  },
  {
    version: '6.6.0',
    fecha: '2026-09-28',
    cambios: [
      '⚖️ Druida: las Transformaciones duran 3 turnos (antes 4) y la Forma Estelar, 2 (3 mejorada).',
      '⚖️ Corazón del Cambiante: tus Transformaciones duran 1 turno más y al lanzarlas ganas 6 de bloqueo (8 mejorada).',
      '🐺 Nuevas cartas del druida para las invocaciones: Alma de la Manada (cada ataque de tu invocación inflige +3) y Estampida (tu invocación ataca 3 veces).',
      '📿 Nuevas reliquias del druida: Collar del Alfa (+2 de daño en cada ataque de tu invocación) y Cuerno de la Manada (+3 de vida cada vez que Invocas).',
    ],
  },
  {
    version: '6.5.0',
    fecha: '2026-09-28',
    cambios: [
      '👁️ Los héroes y las formas del druida tienen ojos brillantes y enfadados del color de su clase, como en las ilustraciones de las cartas. Se apagan al caer.',
    ],
  },
  {
    version: '6.4.1',
    fecha: '2026-09-28',
    cambios: [
      '⚖️ Brujo: Verbo de Aniquilación aplica Condena igual a un tercio de los PV actuales del enemigo (la mitad, mejorada) y se agota.',
      '⚖️ Sacrificio del Familiar inflige el doble de la vida restante de tu invocación.',
    ],
  },
  {
    version: '6.4.0',
    fecha: '2026-09-28',
    cambios: [
      '🎸 El combate contra el Dungeon Master tiene su propia música: «Behind the Screen», metalcore progresivo instrumental con guitarras graves, breakdowns y un estribillo enorme.',
    ],
  },
  {
    version: '6.3.0',
    fecha: '2026-09-28',
    cambios: [
      '📜 Las cartas tienen textura de pergamino, con fibras, manchas y bordes quemados, y las maldiciones, de roca agrietada. Se pintan una sola vez al arrancar, así que no restan rendimiento.',
    ],
  },
  {
    version: '6.2.3',
    fecha: '2026-09-28',
    cambios: [
      '⚖️ Brujo: Don del Patrón ya no deja la Explosión Sobrenatural a coste 0, pero cada lanzamiento te da 5 de bloqueo (7 mejorada).',
      '⚖️ La Bendición del Eco Sobrenatural inflige 3 de daño a todos los demás enemigos, en lugar de la mitad del daño de la Explosión.',
    ],
  },
  {
    version: '6.2.2',
    fecha: '2026-09-28',
    cambios: [
      '⚖️ Brujo: Hambre del Patrón cuesta 2 (1 mejorada) y da +2 por maldición (+3 mejorada), y Haz Desdoblado cuesta 2 (1 mejorada).',
    ],
  },
  {
    version: '6.2.1',
    fecha: '2026-09-28',
    cambios: [
      '🗑️ Las cartas que te obligan a descartar ya no se pueden cancelar. Solo las que dicen «descarta hasta» te dejan parar antes.',
    ],
  },
  {
    version: '6.2.0',
    fecha: '2026-09-27',
    cambios: [
      '🖼️ Ilustraciones para el Senescal Aldric, la vidente Síbila, el tabernero, el campamento, el inicio de cada capítulo y cada evento del camino.',
      '💀 La muerte del héroe es mucho más épica: cámara lenta, un estallido propio de su clase, su alma que sube y una nueva pantalla de derrota con lápida y epitafio.',
      '🔮 Clarividencia ya no da la energía al jugarla: empiezas con 1 de energía más a partir del siguiente turno.',
    ],
  },
  {
    version: '6.1.1',
    fecha: '2026-09-27',
    cambios: [
      '✒️ En el mapa, los campamentos siempre son una hoguera, los eventos un interrogante y las tabernas una jarra de cerveza, cada uno con el toque de su escenario.',
    ],
  },
  {
    version: '6.1.0',
    fecha: '2026-09-27',
    cambios: [
      '🗺️ Cada escenario tiene su propio mapa: la Guarida de los Contrabandistas, el Templo Oscuro y el Laberinto del Contemplador estrenan el suyo.',
      '✒️ Las localizaciones de cada escenario tienen su propio dibujo a tinta: cultistas, sarcófagos, huevos de dragón, barriles de contrabando…',
      '😈 Arreglado: Abaddon ya no se desplaza al alzarse de las entrañas de Malachar.',
    ],
  },
  {
    version: '6.0.0',
    fecha: '2026-09-27',
    cambios: [
      '🐉 Dracs & Rogues 6.0: nuevo nombre, el Dungeon Master como jefe final y un final secreto por descubrir.',
      '🎴 Nuevo icono de la app: el Dungeon Master encapuchado alza una carta junto a su d20.',
      '🎲 Tras el Acto III espera el Dungeon Master, con su pantalla invencible… Dicen que un 20 natural en el momento justo desbloquea el final verdadero.',
      '🪓 Los héroes y las formas del druida tienen más detalle, físicas de pelo y tela, y animaciones de ataque mucho más brutales.',
      '🌩️ Cada carta rara y cada única de clase tiene su propia animación, y todas las cartas vuelan al robarlas y hacia su objetivo al jugarlas.',
      '☠️ Llegan las maldiciones, cartas que estorban en tu mano. El brujo aprende a sacarles partido y su Explosión Sobrenatural pega más fuerte.',
      '🗺️ Nuevo mapa de aventura en pergamino dibujado a tinta, con tabernas que marcan misiones y una fila central de cofres.',
      '🎲 Nuevo d20 de resina con físicas reales, que se detiene justo en el número que sale.',
      '⚡ El combate va mucho más fluido en el móvil: los personajes no se mueven de su sitio y se acabó el repintado continuo.',
    ],
  },
  {
    version: '5.7.0',
    fecha: '2026-09-27',
    cambios: [
      '🐉 El juego estrena nombre: Dracs & Rogues.',
      '🎴 Nuevo icono de la app: el Dungeon Master, encapuchado y con los ojos en llamas, alza una carta junto a su d20.',
    ],
  },
  {
    version: '5.6.1',
    fecha: '2026-09-27',
    cambios: [
      '🧍 Los personajes se quedan quietos en su sitio: aunque aparezcan estados, transformaciones o nombres largos, ya no se desplazan (Abaddon incluido).',
    ],
  },
  {
    version: '5.6.0',
    fecha: '2026-09-27',
    cambios: [
      '⚡ Rendimiento: el combate ya no se repinta en cada fotograma, y las maldiciones en la mano dejan de ralentizar el juego.',
      '🪞 Las cartas de ilusión (Imagen Espejo y Mano Fantasmal) cuestan 1 más y se agotan: se acabaron los bucles de ilusiones.',
      '🗡️ Ilustración nueva para la Daga del pícaro.',
    ],
  },
  {
    version: '5.5.0',
    fecha: '2026-09-27',
    cambios: [
      '🪓 Los héroes ganan detalle y el bárbaro luce su melena salvaje, que ondea con físicas reales, igual que capas, bufandas, barbas y pelajes.',
      '⚔️ Animaciones más agresivas y artísticas, cada una con su carga, su golpe y su final, para los cinco héroes y las seis formas del druida.',
      '🌩️ Cada carta rara y cada carta única de clase tiene su propia animación: rayos en Tormenta de Venganza, una erupción en Furia Indómita, cadenas infernales en Pacto Final…',
    ],
  },
  {
    version: '5.4.0',
    fecha: '2026-09-27',
    cambios: [
      '🎲 Nuevo d20 de resina, translúcido, con remolinos, purpurina y números grabados. Rebota con físicas reales y se detiene justo en el número que sale.',
      '🐢 Arreglado: tener maldiciones en la mano ya no ralentiza el juego.',
    ],
  },
  {
    version: '5.3.0',
    fecha: '2026-09-27',
    cambios: [
      '💥 Brujo reforzado: la Explosión Sobrenatural pega más y sus mejoras permanentes ahora escalan, dan Condena y bloqueo, y se notan desde el primer lanzamiento.',
      '☠️ El brujo pacta con las maldiciones: nuevas cartas y reliquias las convierten en daño, bloqueo y Condena.',
      '🦠 El Frasco de la Plaga es ahora del pícaro, y el veneno del enemigo que muere se propaga a todos los demás.',
      '👁️ Nuevo fondo para el Laberinto del Contemplador: una galería de ojos tallados con el gran ojo acechando al fondo.',
    ],
  },
  {
    version: '5.2.0',
    fecha: '2026-09-27',
    cambios: [
      '🗺️ El mapa es ahora un mapa de aventura en pergamino, distinto en cada acto: el Valle, las Profundidades y las Tierras Ardientes.',
      '✒️ Las localizaciones están dibujadas a plumilla, con un dibujo propio para cada jefe, y los caminos van en tinta; tu viaje queda marcado en rojo.',
    ],
  },
  {
    version: '5.1.0',
    fecha: '2026-09-27',
    cambios: [
      '🎲 Tras el Acto III te espera el Dungeon Master… y dicen que existe un final verdadero.',
      '☠️ Nuevas cartas de maldición, que no se pueden jugar y castigan si las tienes en la mano. Algunos eventos, pactos y enemigos te las meten en el mazo, y en el campamento puedes purificarlas.',
      '🍺 Nueva localización, la Taberna: un rumor marca otro lugar del mapa y, si llegas, te llevas una reliquia.',
      '🃏 Las cartas vuelan de la pila a tu mano al robarlas y hacia su objetivo al jugarlas.',
      '🎁 Los cofres de cada mapa están todos juntos, en la fila central.',
      '💎 Las bendiciones de carta única también son reliquias, y el Cáliz Vacío roba al quedarte sin cartas.',
      '🎵 El botón flotante apaga o enciende solo la música.',
    ],
  },
  {
    version: '5.0.0',
    fecha: '2026-09-26',
    cambios: [
      '💎 Mazo y Mazmorra 5.0: más de 70 reliquias ilustradas, con reliquias únicas para cada clase y bendiciones que ahora son reliquias.',
      '🙏 El encargo del Senescal y las bendiciones de Síbila ofrecen reliquias con efectos únicos: pactos arriesgados, dones de tu clase y ventajas para el camino.',
      '🎴 Las reliquias tienen efectos mucho más variados y las de tu clase potencian su mecánica: formas, Furia, conjuros, dagas y pactos.',
      '🪞 Las ilusiones ya no dependen del azar: previenen por completo los próximos ataques.',
      '⏩ Puedes jugar cartas y terminar el turno sin esperar a las animaciones: las acciones se encolan y se resuelven en orden.',
      '🎵 El Acto III tiene una música nueva, mucho más oscura y seria.',
      '📱 En el móvil, el fondo se extiende por detrás de la mano, los enemigos no se recolocan al caer uno y los estados se apilan en filas.',
    ],
  },
  {
    version: '4.1.0',
    fecha: '2026-09-26',
    cambios: [
      '💎 50 reliquias con efectos mucho más variados, y reliquias únicas de cada clase que solo te salen a ti y potencian su mecánica principal.',
      '🖌️ Cada reliquia tiene su ilustración dibujada a mano.',
      '🎵 El Acto III suena mucho más oscuro y serio.',
      '📱 En el móvil, el fondo se extiende por detrás de la mano, que flota algo más arriba.',
      '🧍 Los enemigos no se recolocan cuando cae uno, y los estados se apilan en varias filas si no caben.',
    ],
  },
  {
    version: '4.0.0',
    fecha: '2026-09-26',
    cambios: [
      '🎨 Mazo y Mazmorra 4.0: un nuevo aspecto de arriba abajo, con héroes animados, monstruos ilustrados, fondos pintados y banda sonora original.',
      '🌙 Los héroes son siluetas anónimas a contraluz con animaciones de ataque, conjuro y golpe, y las formas del druida también.',
      '👹 Todo el bestiario, las invocaciones y los jefes están ilustrados y animados; los jefes son épicos, con auras y tormentas de partículas, y los dragones baten alas articuladas.',
      '🃏 Las 152 cartas tienen una ilustración dibujada a mano, y las únicas de clase, Seducir y Deseo son full art animadas.',
      '✨ Cada hechizo tiene su propio efecto: raíces que se enroscan en el enemigo, zarpazos, olas, runas que caen, escudos…',
      '🖼️ Cada escenario tiene su fondo pintado: el campamento ogro, la guarida de los contrabandistas, la cripta, el templo oscuro, la guarida del dragón y el laberinto del Contemplador.',
      '🎵 Banda sonora original con un leitmotiv del héroe: aventura en cada acto, temas épicos para los jefes y efectos de sonido realistas.',
      '⚡ Nuevo motor gráfico WebGL, más fluido en el móvil, y la mano de cartas más abajo en el móvil apaisado para que la escena respire.',
      '🎭 Galería de sprites en el menú principal y avisos opcionales de nuevas versiones mayores.',
    ],
  },
  {
    version: '3.12.0',
    fecha: '2026-09-26',
    cambios: [
      '✨ Cada hechizo tiene su efecto propio: las raíces se enroscan en el enemigo, la zarpa deja tres surcos, la ola rompe, la runa de condena cae del cielo…',
      '🔊 Efectos de sonido nuevos y realistas: acero, golpes, fuego, agua, magia y rugidos.',
      '🐉 Las alas de los dragones y los demonios se pliegan y se despliegan de forma articulada.',
      '🧙 El héroe se ve más grande, y en la pantalla de inicio cada clase aparece con su silueta animada.',
      '📱 En el móvil apaisado, la vida y los estados de los jefes ya no se cortan.',
    ],
  },
  {
    version: '3.11.1',
    fecha: '2026-09-25',
    cambios: [
      '📱 En el móvil, los ataques y hechizos de los enemigos ya no se cortan en la franja de abajo: se ven por encima.',
    ],
  },
  {
    version: '3.11.0',
    fecha: '2026-09-25',
    cambios: [
      '🖼️ Fondos pintados con mucho detalle para cada escenario: el campamento ogro, el sótano de los contrabandistas, la cripta, el templo profanado, la guarida del dragón y el laberinto del Contemplador.',
      '🌙 En cada fondo, la luz de la luna, la lava o el orbe arcano cae detrás del héroe y recorta su silueta.',
      '🎵 La música y los fondos nuevos sustituyen a los antiguos aunque tuvieras el juego guardado para jugar sin conexión.',
    ],
  },
  {
    version: '3.10.0',
    fecha: '2026-09-25',
    cambios: [
      '🎵 Banda sonora original: tema principal nuevo y música propia para cada acto, con un leitmotiv del héroe que suena a lo largo de la aventura.',
      '🍺 Acto I con aire de aventura amigable, Acto II con una marcha de esqueletos traviesa y Acto III heroico entre lava y cristales.',
      '⚔️ Cada acto tiene su propio tema de jefe, épico y tenso, y el del combate final es el más grande de todos.',
      '🔁 La música se repite sin cortes al llegar al final.',
      '🪓 Bárbaro redibujado en Furia Creciente y Furia Indómita.',
    ],
  },
  {
    version: '3.9.7',
    fecha: '2026-09-25',
    cambios: [
      '🗡️ Ilustraciones dibujadas a mano para todas las cartas del pícaro, con Danza Mortal a pantalla completa.',
      '🎨 Ya están dibujadas a mano las 152 cartas del juego.',
    ],
  },
  {
    version: '3.9.6',
    fecha: '2026-09-25',
    cambios: [
      '🕳️ Nuevas ilustraciones dibujadas a mano para todas las cartas del brujo: pactos, maldiciones, tentáculos de Hadar, demonios invocados y patrones colosales.',
      '👁️ Pacto Final estrena full art: el brujo ante la grieta del vacío y el ojo de su patrón, con almas en espiral.',
      '🎲 Seducir y Deseo se redibujan: un ogro embelesado en un baile de máscaras, y un deseo que decide entre un cofre de tesoro y la ruina.',
    ],
  },
  {
    version: '3.9.5',
    fecha: '2026-09-25',
    cambios: [
      '🔮 Nuevas ilustraciones dibujadas a mano para todas las cartas del mago: conos de fuego, lagos helados, escudos contra el aliento de un draco, salas de espejos y tomos prohibidos.',
      '✨ Maestría de Conjuros estrena full art: el archimago levitando ante un mandala de runas, rodeado de grimorios y proyectiles en órbita.',
    ],
  },
  {
    version: '3.9.4',
    fecha: '2026-09-25',
    cambios: [
      '📱 Mucho más fluido en móvil con cartas en pantalla: el fondo del combate y las partículas de las cartas se dibujan con la tarjeta gráfica, y las ilustraciones y los brillos de las cartas ya no se repintan en cada fotograma.',
    ],
  },
  {
    version: '3.9.3',
    fecha: '2026-09-25',
    cambios: [
      '🪓 Nuevas ilustraciones dibujadas a mano para todas las cartas del bárbaro: tajos, gritos, torbellinos y juramentos de sangre, con el bárbaro a contraluz y sus enemigos saliendo despedidos.',
      '🔥 Furia Indómita estrena full art: el bárbaro envuelto en llamas sobre un montón de enemigos caídos.',
    ],
  },
  {
    version: '3.9.2',
    fecha: '2026-09-25',
    cambios: [
      '🎨 Nuevas ilustraciones dibujadas a mano para todas las cartas del druida, con escenas completas: el druida y sus formas a contraluz, sus invocaciones y los monstruos que sufren sus golpes.',
      '⚔️ Golpe y Defender estrenan también ilustración, y Tormenta de Venganza tiene una nueva full art.',
    ],
  },
  {
    version: '3.9.1',
    fecha: '2026-09-25',
    cambios: [
      '🎲 Seducir y Deseo pasan a ser «full art», con partículas rosas y doradas, y cuentan su historia: el d20 que decide tu suerte, un antifaz, rosas y un corazón flechado para Seducir, y una estrella fugaz con la fortuna y la ruina en juego para Deseo.',
    ],
  },
  {
    version: '3.9.0',
    fecha: '2026-09-25',
    cambios: [
      '🖼️ Todas las cartas tienen ya su propia ilustración, dibujada con el mismo estilo que los monstruos: tinta, sombras y la luz de cada clase.',
      '✨ Las cartas únicas de clase son ahora «full art»: la ilustración cubre toda la carta, se mueve lentamente, brilla con el color de su clase y desprende partículas.',
    ],
  },
  {
    version: '3.8.0',
    fecha: '2026-09-25',
    cambios: [
      '🔔 Nuevo botón en el menú principal para recibir un aviso del sistema cuando salga una versión mayor del juego.',
      '📜 La ventana de novedades ya solo aparece con las versiones mayores; las mejoras pequeñas llegan en silencio.',
    ],
  },
  {
    version: '3.7.0',
    fecha: '2026-09-25',
    cambios: [
      '👑 Los siete jefes tienen por fin su propio dibujo animado, con aura y partículas que no paran: Gorzug con su corona de huesos, Vexis y sus cartas flotantes, Vol\'guth envuelto en almas, Malachar entre velas y humo de incienso, y Abaddon con su espada en llamas.',
      '🐉 Ignifax arde de verdad: alas enormes, núcleo de magma, ascuas, humo por las fauces, gotas de lava y un chorro de fuego al atacar. Cuando se enfurece, el doble.',
      '👁️ El Contemplador flota con sus nueve pedúnculos oculares chispeando, y dispara rayos de colores desde su ojo central.',
      '💥 Cada jefe estalla en partículas al atacar, al conjurar y al caer derrotado.',
      '🎭 La Galería de sprites incluye ya a los jefes, marcados en rojo.',
    ],
  },
  {
    version: '3.6.0',
    fecha: '2026-09-25',
    cambios: [
      '🚀 Nuevo motor gráfico WebGL: héroes, enemigos, invocaciones y partículas se dibujan con la tarjeta gráfica, así que el combate va mucho más fluido en móvil.',
      '✨ Mismo aspecto con bordes más nítidos en pantallas de alta densidad, y los brillos de magia y ojos se calculan en tiempo real.',
      '🛟 En dispositivos sin WebGL2 el juego sigue usando el dibujado anterior automáticamente.',
    ],
  },
  {
    version: '3.5.0',
    fecha: '2026-09-25',
    cambios: [
      '👹 Bestiario ilustrado: los 48 enemigos normales y de élite de los tres actos tienen ya su propio dibujo animado, con tinta, sombras y la luz de la luna de cada acto.',
      '⚔️ Los enemigos se mueven: atacan con su arma o lanzan conjuros y flechas, retroceden al recibir daño y, al morir, se desploman y se desvanecen.',
      '🐺 Las invocaciones del druida y del brujo (lobo, oso, espíritus, sabueso y demonio) aparecen con el mismo estilo y luchan a tu lado.',
      '🎭 Nueva Galería de sprites en el menú principal: todos los héroes, transformaciones, invocaciones y enemigos, animados y agrupados por acto.',
      '👑 Los jefes mantienen de momento su aspecto actual: su dibujo llegará más adelante.',
    ],
  },
  {
    version: '3.4.2',
    fecha: '2026-09-25',
    cambios: [
      '🌒 Héroes y transformaciones con un aire más sombrío: cabezas más pequeñas, capas y túnicas hechas jirones, postura algo encorvada y una respiración más lenta y pesada.',
      '🐺 Las fieras del druida acechan con la cabeza gacha, y el oso luce un lomo erizado.',
      '🔄 Si encadenas transformaciones, se ve siempre la última que has lanzado, y cada forma nueva entra con un rugido.',
    ],
  },
  {
    version: '3.4.1',
    fecha: '2026-09-25',
    cambios: [
      '🐺 Las transformaciones del druida tienen ya su propia silueta a contraluz animada: lobo, oso, águila que no deja de aletear, enjambre zumbante, lobo lunar con su creciente brillante y ciervo estelar con astas de estrellas.',
      '🐾 Cada forma ataca a su manera: el lobo salta, el oso se alza y zarpea, el águila se lanza en picado y el ciervo estelar dispara luz desde sus astas.',
    ],
  },
  {
    version: '3.4.0',
    fecha: '2026-09-25',
    cambios: [
      '🌘 Los héroes son ahora siluetas a contraluz: figuras anónimas recortadas con la luz de su clase, donde solo brillan los ojos y la magia.',
      '⚔️ Tu héroe se mueve: respira y parpadea, lanza tajos o proyectiles al jugar un ataque, conjura con el resto de cartas y retrocede con un destello al recibir daño.',
      '🎯 El daño llega en el instante del golpe, sincronizado con la animación.',
      '🌕 El cielo del combate tiene luna y bruma de horizonte, con su propio tono en cada acto: brasas en el Asentamiento, luz fría en la Cripta y luna de sangre en la Guarida del Dragón.',
      '🐺 Las formas del druida también se funden en la silueta a contraluz.',
    ],
  },
  {
    version: '3.3.0',
    fecha: '2026-08-27',
    cambios: [
      '🌕 Forma Lunar da un giro completo: ya no ataca. Ahora es un poder que te transforma para SIEMPRE y te da 2 de Fuerza y 1 de Destreza al inicio de cada turno, que se acumulan sin techo (mejorada, 3 y 2).',
      '🦅 La Forma de Águila recupera sus +2 de Destreza (+3 mejorada).',
    ],
  },
  {
    version: '3.2.2',
    fecha: '2026-08-27',
    cambios: [
      '🐺 Las Transformaciones del druida se comedían: subir a la vez duración y Fuerza escalaba demasiado. Se queda la duración larga, pero todas las formas dan 1 punto menos.',
      '🦎 Corazón del Cambiante otorga +1 de Fuerza (o Destreza) en vez de +2, y su mejora alarga las formas 4 turnos en lugar de subir la cifra.',
      '🦟 La Forma de Enjambre pasa a dar Destreza: así su propio golpe en área no se autopotencia.',
      '🐾 Tormenta de Zarpas vuelve a 3 de daño tres veces: el bono por estar transformado sobraba, porque para eso ya está la Fuerza que dan las formas.',
    ],
  },
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
