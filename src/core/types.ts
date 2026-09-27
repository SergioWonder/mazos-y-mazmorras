// ── Tipos centrales del juego ────────────────────────────────────────────────

export type ClaseId = 'druida' | 'barbaro' | 'mago' | 'picaro' | 'brujo';
/** 'maldicion' = curse: unplayable dead weight that clogs the hand and the deck. */
export type TipoCarta = 'ataque' | 'habilidad' | 'poder' | 'maldicion';
export type Rareza = 'inicial' | 'comun' | 'infrecuente' | 'rara' | 'especial';
export type ModoObjetivo = 'enemigo' | 'todos' | 'propio' | 'ninguno';

/** Estados acumulables al estilo Slay the Spire. */
export type EstadoId =
  | 'fuerza'        // +daño por ataque (puede ser negativo)
  | 'raices'        // −ataque del enemigo; total de todas sus instancias activas (druida)
  | 'raizProlongada' // (jugador) cada carta de Raíces que apliques dura +N turnos
  | 'formaProlongada'// (druida) tus Transformaciones duran +N turnos
  | 'formaPotenciada'// (druida) tus Transformaciones otorgan +N de Fuerza/Destreza
  | 'fuerzaPorTurno' // (druida/Forma Lunar) ganas esta Fuerza al inicio de cada turno
  | 'destrezaPorTurno'// (druida/Forma Lunar) ganas esta Destreza al inicio de cada turno
  | 'destreza'      // +bloqueo por carta
  | 'vulnerable'    // recibe +50% daño, N turnos
  | 'debil'         // inflige -25% daño, N turnos
  | 'fragil'        // gana -25% bloqueo, N turnos
  | 'espinas'       // devuelve N daño al ser atacado
  | 'regeneracion'  // cura N al inicio del turno
  | 'quemadura'     // (jugador) cada carta jugada cuesta 3 PV; dura N turnos
  | 'corazonSalvaje' // al perder la Furia, ganas esta cantidad de Fuerza y Destreza para el combate
  | 'frenesi'       // la Furia se romperá al final del turno aunque recibas daño (Frenesí)
  | 'espejismo'     // charges: each one prevents the next attack hit; kept until used
  | 'invulnerable'  // no recibe daño (N turnos)
  | 'furiaIndomita' // (bárbaro) bloqueo=Fuerza al inicio de turno; Furia aguanta si bloqueaste
  | 'hemorragia'    // (enemigo) pierde esta cantidad de PV al inicio de su turno (ignora bloqueo)
  | 'sedSangre'     // (bárbaro) ganas este bloqueo cada vez que un enemigo sangra
  | 'escribania'    // (mago) Escribe esta cantidad en el Conjuro Prodigioso al inicio del turno
  | 'maestria'      // (mago) añade un Proyectil Mágico a la mano cada turno (2 = la versión +)
  | 'roboAcelerado' // (mago) roba +1 carta al inicio del turno; se cae si te quedas sin mano
  | 'veneno'         // pierde esta cantidad de PV al inicio de su turno (ignora bloqueo); baja 1 cada turno
  | 'acrobacias'     // (pícaro) bloqueo aplazado total pendiente de reaplicarse el próximo turno (solo indicador)
  | 'filoVenenoso'   // (pícaro/Asesino) tus ataques aplican esta cantidad de Veneno al objetivo
  | 'preparacion'    // (pícaro) cada vez que descartas una carta, ganas esta cantidad de bloqueo
  | 'dagasPorTurno'  // (pícaro/Psiónico) al inicio de cada turno añades esta cantidad de Dagas a la mano
  | 'dagasFuerza'    // (pícaro) tus Dagas infligen esta cantidad de daño adicional
  | 'dagasDestreza'  // (pícaro/Danza Mortal) tus Dagas infligen daño adicional igual a tu Destreza
  | 'dagasBloqueo'   // (pícaro/Guardia de Cuchillas) cada Daga que juegas te da esta cantidad de bloqueo
  | 'ventajaFurtiva' // (pícaro/Oportunista) tus ataques hacen +N a quien no pretende atacar
  | 'condena'        // (enemigo) al final de su turno muere si su Condena ≥ sus PV actuales (brujo)
  | 'oscuridad'      // (enemigo) reduce su ataque esta cantidad; baja 1 por turno (brujo)
  | 'agathys'        // (jugador) este turno el daño que bloquees se devuelve a TODOS los enemigos
  | 'explosionFuerza'// (jugador) tu Explosión Sobrenatural inflige +N de daño todo el combate
  | 'explosionTurno' // (jugador) tu Explosión Sobrenatural inflige +N de daño SOLO este turno
  | 'explosionVeces' // (jugador) tu Explosión Sobrenatural golpea N veces más
  | 'explosionArea'  // (jugador) tu Explosión Sobrenatural golpea a todos los enemigos
  | 'explosionGratis'// (jugador) tu Explosión Sobrenatural cuesta 0
  | 'explosionCondena'// (warlock/Agonizing Blast) each enemy the blast hits takes this much Doom
  | 'explosionCrece' // (warlock/Eldritch Spear) every cast adds this much damage for the whole combat
  | 'explosionCarga' // (warlock) damage the blast has grown so far this combat (Eldritch Spear)
  | 'explosionBloqueo'// (warlock/Patron's Gift) casting the blast grants this much block
  | 'explosionMaldita'// (warlock/Patron's Hunger) the blast deals this much more per curse in your cards
  | 'bloqueoPorMaldicion'// (warlock/Aegis of Affliction) end of turn: this much block per curse in hand
  | 'condenaPorAtaque'// (brujo/Gran Antiguo) tus ataques aplican esta Condena al objetivo
  | 'oscuridadPorTurno'// (brujo/Archifata) al inicio de cada turno aplicas esta Oscuridad a todos
  | 'bloqueoPorTurno'// (brujo/Celestial) ganas este bloqueo al inicio de cada turno
  | 'bendicionOscura'// (brujo/Infernal) ganas este bloqueo cada vez que un enemigo muere
  | 'condenaPorBloqueo'// (brujo/Pacto Final) al final de tu turno aplicas Condena = tu bloqueo a todos
  | 'cartasAgotan'   // (jugador) este turno cada carta que juegues se agota (rayo del Contemplador)
  | 'cartasSobrecoste'// (jugador) este turno cada carta cuesta +1 de energía (rayo del Contemplador)
  | 'cartasEtereas'; // (jugador) este turno las cartas no jugadas se agotan (rayo del Contemplador)

/** Efectos permanentes que las cartas «Escribir» pueden añadir al Conjuro Prodigioso. */
export type EfectoConjuro = 'area' | 'vulnerable' | 'bloqueo' | 'perforante';

/** Forma visual de la invocación del druida (la fija la primera carta que invocó). */
export type FormaInvocacion =
  | 'lobo' | 'oso' | 'fuego' | 'agua' | 'aire' | 'arbol' | 'tierra' // druida (permanentes)
  | 'sabueso' | 'demonio';                                          // brujo (efímeras)
/** Pasivas que se combinan en la invocación (lobo y oso no aportan ninguna). */
export type EfectoInvocacion = 'fuego' | 'agua' | 'aire' | 'arbol' | 'tierra';

/** Criatura invocada: absorbe daño y ataca. Las del druida son permanentes y
 *  atacan al inicio de cada turno; las del brujo son efímeras (`efimera`): si
 *  sobreviven al turno enemigo atacan por `dano` y luego se desvanecen. */
export interface Invocacion {
  forma: FormaInvocacion;
  vida: number;
  vidaMax: number;
  efectos: EfectoInvocacion[]; // pasivas acumuladas (sin repetir)
  /** (brujo) desaparece al acabar la ronda; ataca antes de irse si sigue viva. */
  efimera?: boolean;
  /** (brujo) daño fijo de su golpe; las del druida usan el 30 % de su vida. */
  dano?: number;
  /** (brujo) Condena que aplica su golpe al objetivo. */
  condena?: number;
}

export interface EfectoTemporal {
  etiqueta: string;     // p.ej. "Forma de Lobo"
  turnos: number;       // turnos restantes (cuenta el actual)
  fuerza: number;       // fuerza otorgada (se retira al expirar)
  destreza: number;     // destreza otorgada
  robaExtra?: number;   // cartas extra robadas al inicio del turno
  curaTurno?: number;   // curación al inicio del turno
  /** No expira: dura todo el combate (Forma Lunar). `turnos` se ignora. */
  permanente?: boolean;
}

export interface Luchador {
  nombre: string;
  pvMax: number;
  pv: number;
  bloqueo: number;
  estados: Partial<Record<EstadoId, number>>;
  vivo: boolean;
}

export type TipoIntencion = 'ataque' | 'defensa' | 'mejora' | 'perjuicio' | 'desconocido';

export interface Movimiento {
  nombre: string;
  intencion: TipoIntencion;
  dano?: number;        // daño base por golpe
  veces?: number;       // nº de golpes (def. 1)
  fx?: string;          // efecto de partículas al golpear (def. 'golpeEnemigo')
  bloqueo?: number;
  cura?: number;        // se cura a sí mismo al ejecutarlo (drenajes, regeneración)
  /** efectos extra al ejecutarse: [estado, cantidad, sobreJugador] */
  efectos?: Array<[EstadoId, number, boolean]>;
  fuerzaAliados?: number; // da fuerza a todos los enemigos vivos
  /** invoca nuevos enemigos al campo (con PV fijados) */
  invocar?: Array<{ def: EnemigoDef; pv: number }>;
  /** devora al aliado vivo con menos PV: lo mata, se cura y gana Fuerza */
  devorar?: { cura: number; fuerza: number };
  /** Slips a curse into the player's piles for THIS combat only (never the run deck). */
  maldicion?: { id: string; destino: 'mazo' | 'descarte' };
  /** Kills the hero outright, ignoring block, Mirror Image, invulnerability,
   *  summons and relics (the Dungeon Master's ray). */
  mataAlInstante?: boolean;
  /** Joke quoted next to the intent icon (the Dungeon Master's moves). */
  cita?: string;
  /** Line the enemy says in a speech bubble when it acts (the Dungeon Master). */
  dialogo?: string;
}

export interface EnemigoDef {
  id: string;
  nombre: string;
  arte: string;          // emoji / glifo del sprite
  pv: [number, number];  // rango de PV
  escala?: number;       // tamaño relativo del sprite
  /** Rasgo único visible (jefes): nombre + descripción para el tooltip. */
  rasgo?: { nombre: string; texto: string };
  /** Estados con los que entra en combate (pasivas: espinas, etc.). */
  estadosIniciales?: Partial<Record<EstadoId, number>>;
  /** Pasiva especial: 'filacteria' = la primera vez que muere revive con 30 PV. */
  pasiva?: 'filacteria';
  /** Al morir, libera a este enemigo en el campo (Heraldo del Culto → Demonio Mayor). */
  invocaAlMorir?: EnemigoDef;
  /** Marca a los jefes (no muere por efectos «mata si no es jefe»). */
  esJefe?: boolean;
  /** The Dungeon Master (final joke scene): his screen absorbs every hit, he is
   *  immune to instant kills and lethal Doom, and nothing makes him skip his ray. */
  dungeonMaster?: boolean;
  /** Decide el próximo movimiento (recibe a sus aliados vivos). */
  ia: (
    turno: number,
    rng: () => number,
    self: EnemigoCombate,
    aliadosVivos: EnemigoCombate[],
  ) => Movimiento;
}

export interface EnemigoCombate extends Luchador {
  def: EnemigoDef;
  intencion: Movimiento;
  turnosVisto: number;
  /** Mayor daño base de ataque que se le ha visto (para Raíces). */
  danoBaseMax: number;
  /** La filacteria ya se consumió (pasiva del liche). */
  filacteriaUsada?: boolean;
  /** Rasgo único de un solo uso ya gastado (enfurecerse, etc.). */
  rasgoUsado?: boolean;
  /** Si está activo, este enemigo se salta su próxima acción (Seducir/Deseo). */
  saltaAccion?: boolean;
  /** Instancias de Raíces activas: cada carta aporta su cantidad y su duración. */
  raicesInstancias?: Array<{ cantidad: number; turnos: number }>;
  /** Recibió daño no bloqueado durante el turno del jugador (para la Hemorragia). */
  heridoEsteTurno?: boolean;
  /** Intención que ejecutará en su PRÓXIMO turno en vez de generar una nueva
   *  (Cambiazo del pícaro: aparta la intención actual para el turno siguiente). */
  intencionForzada?: Movimiento;
}

/** Espacio de conjuro del mago (pirámide de niveles 1-3). */
export interface EspacioConjuro {
  nivel: number;
  gastado: boolean;
}

export interface JugadorCombate extends Luchador {
  energia: number;
  energiaMax: number;
  mazo: CartaInstancia[];     // pila de robo
  mano: CartaInstancia[];
  descarte: CartaInstancia[];
  agotadas: CartaInstancia[];
  efectosTemporales: EfectoTemporal[];
  furiaFuerza: number;        // fuerza otorgada por Furia (se puede perder)
  furiaDestreza: number;
  energiaCero?: boolean;      // el próximo turno empiezas con 0 de energía (Deseo)
  conjuros: EspacioConjuro[]; // espacios de conjuro (mago); vacío en otras clases
  /** Conjuro Prodigioso (mago): daño escrito acumulado este combate (la base son 10). */
  conjuroEscrito: number;
  /** Efectos permanentes acumulados en el Conjuro Prodigioso (sin repetir). */
  conjuroEfectos: EfectoConjuro[];
  /** true en cuanto se ha escrito al menos una vez (muestra el indicador). */
  conjuroActivo: boolean;
  /** Invocación activa del druida (absorbe daño y ataca cada turno). */
  invocacion?: Invocacion;
  /** Bloqueo aplazado del pícaro (Acrobacias): cada entrada reaplica su bloqueo
   *  al inicio de los próximos `turnos` turnos. */
  bloqueoAplazado: Array<{ cantidad: number; turnos: number }>;
}

export interface CartaDef {
  id: string;
  nombre: string;
  clase: ClaseId | 'neutral';
  tipo: TipoCarta;
  rareza: Rareza;
  coste: number;
  objetivo: ModoObjetivo;
  /** Texto de la carta; puede usar el estado del combate para mostrar números reales. */
  texto: string;
  /** Subclase de D&D a la que pertenece (solo cartas raras especiales). */
  subclase?: string;
  /** Clave de efecto visual al jugarse. */
  fx?: string;
  /** Animación especial de carta rara (clase CSS + efecto a pantalla). */
  animRara?: string;
  exhumar?: boolean; // se agota al jugarse
  /** Requiere un espacio de conjuro libre de este nivel mínimo (mago). */
  requiereConjuro?: number;
  /** 1 uso: al jugarse se elimina del mazo para el resto de la partida. */
  unUso?: boolean;
  /** Innata: empiezas cada combate con ella en la mano. */
  innato?: boolean;
  /** Retener: no se descarta al final del turno; se queda en tu mano. */
  retener?: boolean;
  /** Al jugarse vuelve a lo alto del mazo de robo en vez de al descarte
   *  (Explosión Sobrenatural del brujo). Tiene prioridad sobre «se agota». */
  alTopeDelMazo?: boolean;
  /** (curses) Energy that pays the curse off: it leaves the deck for good. Without
   *  it the curse can never be played. */
  purgar?: number;
  /** (curses) Fires at the end of the player's turn, before the discard, only if
   *  the card is in the hand. */
  finTurnoEnMano?: (ctx: ContextoEfecto) => Promise<void>;
  /** (curses) Fires right after the card is drawn. */
  alRobar?: (ctx: ContextoEfecto, carta: CartaInstancia) => Promise<void>;
  jugar: (ctx: ContextoEfecto) => Promise<void>;
  /** Versión mejorada (hogueras): sobreescribe texto/coste/efecto. */
  mejora?: MejoraCarta;
}

export interface MejoraCarta {
  texto: string;
  coste?: number;
  requiereConjuro?: number;
  innato?: boolean;
  jugar?: (ctx: ContextoEfecto) => Promise<void>;
}

export interface CartaInstancia {
  uid: number;
  def: CartaDef;
  mejorada: boolean;
}

/** API que las cartas usan para afectar al combate (la implementa el motor). */
export interface ContextoEfecto {
  objetivo?: EnemigoCombate;
  jugador: JugadorCombate;
  enemigos: EnemigoCombate[];
  rng: () => number;
  atacar(obj: EnemigoCombate, base: number, veces?: number, fx?: string): Promise<number>;
  atacarTodos(base: number, fx?: string): Promise<void>;
  ganarBloqueo(base: number): Promise<void>;
  /** Bloqueo acrobático (pícaro): gana el bloqueo ahora y lo vuelve a aplicar al
   *  inicio del próximo turno. */
  ganarBloqueoAcrobatico(base: number): Promise<void>;
  aplicarEstado(obj: Luchador, estado: EstadoId, n: number): Promise<void>;
  /** Aplica una instancia de Raíces (cantidad + duración propia) a un enemigo. */
  aplicarRaices(e: EnemigoCombate, cantidad: number, turnos: number): Promise<void>;
  curar(n: number): Promise<void>;
  /** Pierde PV (sin pasar por el bloqueo). Cuenta como daño recibido
   *  para la Furia del bárbaro. Nunca mata (mínimo 1 PV). */
  perderPV(n: number): Promise<void>;
  robar(n: number): Promise<void>;
  ganarEnergia(n: number): void;
  /** Transformación u otro efecto temporal del druida. */
  efectoTemporal(e: EfectoTemporal): Promise<void>;
  /** Furia del bárbaro: fuerza/destreza que se pierde si no haces daño. */
  ganarFuria(fuerza: number, destreza?: number): Promise<void>;
  /** Gasta el espacio de conjuro libre de MAYOR nivel (≥ nivelMin).
   *  Devuelve el nivel gastado (0 si no hay ninguno). */
  gastarConjuro(nivelMin: number): Promise<number>;
  /** Gana un espacio de conjuro (la pirámide se reconstruye).
   *  Si `permanente`, persiste para toda la partida; si no, solo este combate. */
  ganarConjuro(permanente?: boolean): Promise<void>;
  /** Recupera un espacio gastado y devuelve su nivel (0 si no había ninguno).
   *  Por defecto el de MENOR nivel; con `masAlto`, el de MAYOR nivel. */
  recuperarConjuro(masAlto?: boolean): Promise<number>;
  /** Nº de espacios de conjuro libres (opcionalmente de nivel ≥ nivelMin). */
  conjurosLibres(nivelMin?: number): number;
  /** Escribe N en el Conjuro Prodigioso (lo genera en la mano si no existe) y,
   *  opcionalmente, le añade un efecto permanente (no se apila si ya lo tenía). */
  escribir(n: number, efecto?: EfectoConjuro): Promise<void>;
  /** Invoca (druida): suma `vida` a la invocación o crea una con esa forma.
   *  La forma visual la fija la primera; las pasivas de todas se combinan. */
  invocar(forma: FormaInvocacion, vida: number): Promise<void>;
  /** La invocación ataca ahora mismo (con un bonus de daño opcional). */
  atacarInvocacion(bono?: number): Promise<void>;
  /** Cura a la invocación hasta su vida máxima. */
  curarInvocacion(n: number): Promise<void>;
  /** true si hay una invocación viva. */
  hayInvocacion(): boolean;
  /** Invoca (brujo): criatura efímera que absorbe daño y, si sobrevive al turno
   *  enemigo, golpea por `dano` (aplicando `condena` si la tiene) y se desvanece.
   *  Otra invocación suma su vida y se queda con los mejores valores. */
  invocarEfimero(
    forma: FormaInvocacion, vida: number, dano: number, condena?: number,
  ): Promise<void>;
  /** Vida actual de la invocación (0 si no hay ninguna). */
  vidaInvocacion(): number;
  /** (warlock) An Eldritch Blast has just been cast: tells the relics which
   *  enemies it hit and its damage per hit (before the target's modifiers). */
  explosionLanzada(golpeados: EnemigoCombate[], dano: number): Promise<void>;
  /** Slips a curse into the player's draw pile or discard for THIS combat only. */
  meterMaldicion(id: string, destino: 'mazo' | 'descarte'): Promise<void>;
  /** Consumes a curse from the hand (the player picks one if there are several):
   *  it is exhausted for this combat. Returns it, or null if there was none. */
  consumirMaldicion(): Promise<CartaInstancia | null>;
  /** Sacrifica la invocación: la retira y devuelve la vida que le quedaba. */
  sacrificarInvocacion(): Promise<number>;
  /** Estado persistente de la partida (para cartas de 1 uso / permanentes). */
  run: EstadoRun;
  /** Daño de la intención actual del enemigo tras modificadores (0 si no ataca). */
  danoIntencion(e: EnemigoCombate): number;
  /** true si el enemigo NO va a atacarte este turno (se defiende, se potencia,
   *  está desconcertado o pierde el turno): base de los ataques furtivos. */
  noPretendeAtacar(e: EnemigoCombate): boolean;
  /** true si el ataque del enemigo está anulado: su mejor ataque conocido,
   *  con su Fuerza actual, queda en 0 o menos (para las Raíces del druida). */
  ataqueAnulado(e: EnemigoCombate): boolean;
  estaTransformado(): boolean;
  mensaje(txt: string): Promise<void>;
  /** Seduce against the Dungeon Master: only a natural 20 gets past his screen
   *  (secret true ending); any other roll bounces off it. */
  seducirDM?(e: EnemigoCombate, tirada: number): Promise<void>;
  /** Tira un dado de N caras: anima el lanzamiento y devuelve el resultado (1..N).
   *  `theme` only changes the look of the die (the card that rolls it). */
  tirarDado(caras: number, theme?: DiceTheme): Promise<number>;
  /** Con ventaja: lanza 2 dados de N caras a la vez y devuelve el mejor. */
  tirarDadoVentaja(caras: number, theme?: DiceTheme): Promise<number>;
  /** El enemigo ejecuta su intención ahora mismo y vuelve a prepararse. */
  forzarAccion(e: EnemigoCombate): Promise<void>;
  /** Marca al enemigo para que se salte su próxima acción. */
  saltarAccion(e: EnemigoCombate): void;
  /** Daño directo (sin Fuerza del jugador) a un luchador. */
  danar(obj: Luchador, n: number, fx?: string): Promise<void>;
  /** Daño que IGNORA el bloqueo y además lo destruye (pone el bloqueo a 0). */
  danarPerforante(obj: Luchador, n: number, fx?: string): Promise<void>;
  /** Deja elegir una carta del descarte y la pone en lo alto del mazo. */
  recuperarDelDescarte(): Promise<void>;
  /** Discards N cards chosen by the player; mandatory unless `opcional` («descarta
   *  hasta N», which may stop early). Returns how many were discarded. Each discard
   *  triggers the Preparation synergy. */
  descartar(n: number, opcional?: boolean): Promise<number>;
  /** Nº de cartas que has descartado en lo que va de turno (para pagos de descarte). */
  descartadasEsteTurno(): number;
  /** Discards a random card of the hand (never `excepto`). Returns it, or null. */
  descartarAlAzar(excepto?: CartaInstancia): Promise<CartaInstancia | null>;
  /** Añade N Dagas a la mano (pícaro): ataques de 0 de coste que se agotan. */
  crearDagas(n: number): Promise<void>;
  /** Busca una carta por id en el mazo, el descarte o las agotadas y la pone en
   *  tu mano. Si ya estaba en la mano (o no hay hueco) no hace nada. */
  traerALaMano(id: string): Promise<boolean>;
  /** Activa ahora el Veneno de todos los enemigos vivos: cada uno pierde PV
   *  igual a su Veneno (ignora el bloqueo) y su Veneno baja 1. */
  detonarVenenos(): Promise<void>;
  /** Cambiazo: sustituye la intención actual del enemigo por otra suya que NO sea
   *  de ataque (la actual pasa a su próximo turno). Si todos sus movimientos son
   *  ataques, se queda confundido y no actúa este turno. */
  intercambiarIntencion(e: EnemigoCombate): Promise<void>;
  /** Mata al instante a un enemigo (úsese tras comprobar que no es jefe). */
  matar(e: EnemigoCombate): Promise<void>;
  /** Cura PV a cualquier luchador (p. ej. a un enemigo). */
  sanar(obj: Luchador, n: number): Promise<void>;
  /** true si el enemigo es un jefe. */
  esJefe(e: EnemigoCombate): boolean;
  /** Pierdes todo el maná actual y el próximo turno empiezas con 0. */
  manaCero(): void;
  /** Lanza un efecto de partículas sobre un luchador (sin daño ni texto). */
  efectoEn(obj: Luchador, efecto: string): Promise<void>;
  /** Per-combat counter for relics: returns its value and, with `valor`, sets it first. */
  marca(clave: string, valor?: number): number;
  /** Current player turn (1 on the first turn). */
  turnoActual(): number;
  /** true in elite and boss fights. */
  esEliteOJefe(): boolean;
}

export type TipoNodo = 'combate' | 'elite' | 'descanso' | 'cofre' | 'evento' | 'jefe' | 'taberna';

/** Quest given by a tavern rumour: completing the marked node grants a relic. */
export interface MisionTaberna {
  nodo: number;      // id of the marked map node
  tipo: TipoNodo;    // type of the marked node when the rumour was told
  texto: string;     // rumour text (shown in the node's tooltip)
}

export interface NodoMapa {
  id: number;
  fila: number;
  col: number;
  tipo: TipoNodo;
  siguientes: number[]; // ids de nodos alcanzables
  visitado: boolean;
}

/** Relic rarity: 'inicial' = class starting relic (never rolled); 'jefe' relics
 *  only drop from bosses; 'bendicion' relics only come from the Seer's blessings. */
export type RarezaReliquia = 'inicial' | 'comun' | 'rara' | 'jefe' | 'bendicion';

/** Kind of a blessing relic: it decides which slot of the blessing offer it fills.
 *  'unica' relics carry a unique card and are only offered at their act change. */
export type TipoBendicion = 'general' | 'pacto' | 'mapa' | 'clase' | 'unica';

/** Where a relic reward comes from (it decides which rarities can roll). */
export type OrigenReliquia = 'cofre' | 'elite' | 'evento' | 'jefe';

/** Card just played, as seen by the `alJugarCarta` relic hook. */
export interface CartaJugada {
  carta: CartaInstancia;
  objetivo?: EnemigoCombate;
  /** Cards played this turn, this one included. */
  jugadasTurno: number;
  /** Cards played this combat, this one included. */
  jugadasCombate: number;
}

/** One enemy hit against the player, as seen by the `alSerGolpeado` hook. */
export interface GolpeRecibido {
  /** Damage of the hit after modifiers, before block. */
  dano: number;
  /** Part of it that the block absorbed. */
  bloqueado: number;
  /** Part of it that reached the player's PV. */
  real: number;
}

export interface ReliquiaDef {
  id: string;
  nombre: string;
  icono: string;
  texto: string;
  rareza: RarezaReliquia;
  /** Solo puede aparecer para esta clase. */
  soloClase?: ClaseId;
  /** Blessing relics only: which slot of the blessing offer it fills. */
  tipoBendicion?: TipoBendicion;

  // ── Run hooks (pure, no combat) ─────────────────────────────────────────────
  /** On pickup (never on rehydration). `rng` is the run's generator. */
  alObtener?: (run: EstadoRun, rng: () => number) => void;
  finCombate?: (run: EstadoRun) => void;
  /** Fired by the engine once when a combat is won (before the rewards). */
  alVencerCombate?: (run: EstadoRun, info: { eliteOJefe: boolean }) => void;
  /** Rewrites how many PV resting at a campfire heals. */
  curaDescanso?: (run: EstadoRun, cura: number) => number;
  /** After resting: `curado` is what was actually healed. */
  alDescansar?: (run: EstadoRun, curado: number) => void;
  /** After upgrading a card at a campfire; returns the extra upgrades it made. */
  alAfilar?: (run: EstadoRun, rng: () => number) => string[];
  /** A card has just been added to the deck. */
  alAnadirCarta?: (run: EstadoRun, carta: CartaInstancia) => void;
  /** On entering a map room; returns a short line to announce, if any. */
  alEntrarEnSala?: (run: EstadoRun, tipo: TipoNodo, rng: () => number) => string | void;
  /** Rooms where it grants an extra card reward. */
  recompensaCartaEn?: TipoNodo[];
  /** Multiplies the chance of a rare card in card rewards. */
  pesoRaroMult?: number;

  // ── Combat hooks ────────────────────────────────────────────────────────────
  inicioCombate?: (ctx: ContextoEfecto) => Promise<void>;
  /** Start of each player turn (after drawing). `turno` starts at 1. */
  inicioTurno?: (ctx: ContextoEfecto, turno: number) => Promise<void>;
  finTurno?: (ctx: ContextoEfecto) => Promise<void>;
  alGastarConjuro?: (ctx: ContextoEfecto, nivel: number) => Promise<void>;
  alJugarCarta?: (ctx: ContextoEfecto, jugada: CartaJugada) => Promise<void>;
  /** During the player's turn, playing or discarding the last card has just left the hand empty. */
  alVaciarMano?: (ctx: ContextoEfecto) => Promise<void>;
  /** The discard pile has just been shuffled into the draw pile. */
  alBarajar?: (ctx: ContextoEfecto) => Promise<void>;
  alDescartar?: (ctx: ContextoEfecto, carta: CartaInstancia) => Promise<void>;
  /** An enemy has just died (by any means but being devoured). */
  alMatar?: (ctx: ContextoEfecto, enemigo: EnemigoCombate) => Promise<void>;
  /** The player has applied a status through the effect API. */
  alAplicarEstado?: (ctx: ContextoEfecto, obj: Luchador, estado: EstadoId, n: number) => Promise<void>;
  /** After each player attack on an enemy (`total` = unblocked damage dealt). */
  alAtacar?: (ctx: ContextoEfecto, obj: EnemigoCombate, total: number) => Promise<void>;
  /** Extra base damage per hit of the player's attacks against `obj`. */
  bonoAtaque?: (ctx: ContextoEfecto, obj: EnemigoCombate) => number;
  /** After each enemy hit against the player. */
  alSerGolpeado?: (ctx: ContextoEfecto, atacante: EnemigoCombate, golpe: GolpeRecibido) => Promise<void>;
  /** The druid has just transformed: `efecto` is the live entry (mutable). */
  alTransformarse?: (ctx: ContextoEfecto, efecto: EfectoTemporal) => Promise<void>;
  alTerminarTransformacion?: (ctx: ContextoEfecto, efecto: EfectoTemporal) => Promise<void>;
  alGanarFuria?: (ctx: ContextoEfecto, fuerza: number, destreza: number) => Promise<void>;
  /** The Rage is about to break: return true to keep it this time. */
  salvarFuria?: (ctx: ContextoEfecto) => boolean;
  alPerderFuria?: (ctx: ContextoEfecto) => Promise<void>;
  /** Roots have just crushed an enemy that could not attack. */
  alAplastarRaices?: (ctx: ContextoEfecto, enemigo: EnemigoCombate, dolor: number) => Promise<void>;
  /** A warlock's ephemeral summon survived the round and is about to vanish. */
  alDesvanecerseInvocacion?: (ctx: ContextoEfecto, inv: Invocacion) => Promise<void>;
  /** (warlock) An Eldritch Blast was cast: the enemies it hit and its damage per hit. */
  alLanzarExplosion?: (ctx: ContextoEfecto, golpeados: EnemigoCombate[], dano: number) => Promise<void>;
  /** End of turn, for each curse still in the hand: return true to replace the
   *  curse's own end-of-turn effect (it then does nothing to the player). */
  alMaldicionFinTurno?: (ctx: ContextoEfecto, carta: CartaInstancia) => Promise<boolean>;
  robaExtraPorTurno?: number;
  /** Block kept between turns (up to this much). */
  conservaBloqueo?: number;
  /** Unplayed cards kept in hand at end of turn (the most expensive first). */
  retieneCartas?: number;
}

export interface EstadoRun {
  clase: ClaseId;
  pvMax: number;
  pv: number;
  mazo: CartaInstancia[];
  reliquias: ReliquiaDef[];
  mapa: NodoMapa[];
  nodoActual: number; // -1 = aún sin empezar
  piso: number;
  capitulo: number;   // índice de acto en ACTOS
  escenario: number;  // variante de escenario elegida para el acto actual (0 o 1)
  semilla: number;
  /** Total de espacios de conjuro (mago); la pirámide se deriva de aquí. */
  espaciosConjuro: number;
  /** Efectos permanentes (cartas de 1 uso, bendiciones entre actos). */
  permanentes: {
    fuerza: number;        // Fuerza al inicio de cada combate
    destreza: number;      // Destreza al inicio de cada combate
    energia: number;       // energía máxima adicional
    energiaElite: number;  // energía máxima adicional SOLO en élites y jefes
    energiaInicial: number; // energía extra SOLO en los 2 primeros turnos de cada combate
    robo: number;          // cartas adicionales robadas por turno
  };
  /** Ids de eventos ya vividos (para no repetirlos). */
  eventosVistos: string[];
  /** Active tavern quest (null/absent when there is none). */
  mision?: MisionTaberna | null;
}

/** Look of the 3D die: the card that rolls it (Seduce, Wish) or a plain one. */
export type DiceTheme = 'seducir' | 'deseo' | 'neutral';
