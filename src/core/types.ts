// ── Tipos centrales del juego ────────────────────────────────────────────────

export type ClaseId = 'druida' | 'barbaro' | 'mago';
export type TipoCarta = 'ataque' | 'habilidad' | 'poder';
export type Rareza = 'inicial' | 'comun' | 'infrecuente' | 'rara';
export type ModoObjetivo = 'enemigo' | 'todos' | 'propio' | 'ninguno';

/** Estados acumulables al estilo Slay the Spire. */
export type EstadoId =
  | 'fuerza'        // +daño por ataque (puede ser negativo)
  | 'raices'        // −Fuerza SOLO durante el próximo turno del enemigo (druida)
  | 'raizProlongada' // (jugador) las Raíces que aplique duran N turnos extra
  | 'raicesExtra'   // (enemigo) turnos extra que le quedan a sus Raíces antes de expirar
  | 'destreza'      // +bloqueo por carta
  | 'vulnerable'    // recibe +50% daño, N turnos
  | 'debil'         // inflige -25% daño, N turnos
  | 'fragil'        // gana -25% bloqueo, N turnos
  | 'espinas'       // devuelve N daño al ser atacado
  | 'regeneracion'  // cura N al inicio del turno
  | 'quemadura'     // (jugador) cada carta jugada cuesta 3 PV; dura N turnos
  | 'corazonSalvaje' // al perder la Furia, ganas esta cantidad de Fuerza y Destreza para el combate
  | 'frenesi'       // la Furia se romperá al final del turno aunque recibas daño (Frenesí)
  | 'espejismo'     // cargas de esquiva (20% por carga); un golpe recibido lo disipa
  | 'invulnerable'; // no recibe daño (N turnos)

export interface EfectoTemporal {
  etiqueta: string;     // p.ej. "Forma de Lobo"
  turnos: number;       // turnos restantes (cuenta el actual)
  fuerza: number;       // fuerza otorgada (se retira al expirar)
  destreza: number;     // destreza otorgada
  robaExtra?: number;   // cartas extra robadas al inicio del turno
  curaTurno?: number;   // curación al inicio del turno
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
  /** Marca a los jefes (no muere por efectos «mata si no es jefe»). */
  esJefe?: boolean;
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
  jugar: (ctx: ContextoEfecto) => Promise<void>;
  /** Versión mejorada (hogueras): sobreescribe texto/coste/efecto. */
  mejora?: MejoraCarta;
}

export interface MejoraCarta {
  texto: string;
  coste?: number;
  requiereConjuro?: number;
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
  aplicarEstado(obj: Luchador, estado: EstadoId, n: number): Promise<void>;
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
  /** Estado persistente de la partida (para cartas de 1 uso / permanentes). */
  run: EstadoRun;
  /** Daño de la intención actual del enemigo tras modificadores (0 si no ataca). */
  danoIntencion(e: EnemigoCombate): number;
  /** true si el ataque del enemigo está anulado: su mejor ataque conocido,
   *  con su Fuerza actual, queda en 0 o menos (para las Raíces del druida). */
  ataqueAnulado(e: EnemigoCombate): boolean;
  estaTransformado(): boolean;
  mensaje(txt: string): Promise<void>;
  /** Tira un dado de N caras: anima el lanzamiento y devuelve el resultado (1..N). */
  tirarDado(caras: number): Promise<number>;
  /** El enemigo ejecuta su intención ahora mismo y vuelve a prepararse. */
  forzarAccion(e: EnemigoCombate): Promise<void>;
  /** Marca al enemigo para que se salte su próxima acción. */
  saltarAccion(e: EnemigoCombate): void;
  /** Daño directo (sin Fuerza del jugador) a un luchador. */
  danar(obj: Luchador, n: number, fx?: string): Promise<void>;
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
}

export type TipoNodo = 'combate' | 'elite' | 'descanso' | 'cofre' | 'evento' | 'jefe';

export interface NodoMapa {
  id: number;
  fila: number;
  col: number;
  tipo: TipoNodo;
  siguientes: number[]; // ids de nodos alcanzables
  visitado: boolean;
}

export interface ReliquiaDef {
  id: string;
  nombre: string;
  icono: string;
  texto: string;
  /** Solo puede aparecer para esta clase. */
  soloClase?: ClaseId;
  /** hooks */
  alObtener?: (run: EstadoRun) => void;
  inicioCombate?: (ctx: ContextoEfecto) => Promise<void>;
  finCombate?: (run: EstadoRun) => void;
  finTurno?: (ctx: ContextoEfecto) => Promise<void>;
  alGastarConjuro?: (ctx: ContextoEfecto) => Promise<void>;
  robaExtraPorTurno?: number;
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
  capitulo: number;   // índice en CAPITULOS
  semilla: number;
  /** Total de espacios de conjuro (mago); la pirámide se deriva de aquí. */
  espaciosConjuro: number;
  /** Efectos permanentes (cartas de 1 uso, bendiciones entre actos). */
  permanentes: {
    fuerza: number;       // Fuerza al inicio de cada combate
    destreza: number;     // Destreza al inicio de cada combate
    energia: number;      // energía máxima adicional
    energiaElite: number; // energía máxima adicional SOLO en élites y jefes
    robo: number;         // cartas adicionales robadas por turno
  };
  /** Ids de eventos ya vividos (para no repetirlos). */
  eventosVistos: string[];
}
