/**
 * FIFO queue of player actions (play a card, end the turn…).
 *
 * Only one action runs at a time: an action queued while another one resolves
 * waits for it and then runs in order. Actions are validated when their turn
 * comes (the board may have changed since they were queued), not when queued.
 * Pure module: no DOM, so the smoke test can drive it.
 */

export type Verdict<A> = { ok: true; action?: A } | { ok: false; reason: string };

export interface ActionQueueHooks<A> {
  /** Checked right before running. May replace the action (e.g. a redirected target). */
  validate?(action: A): Verdict<A>;
  execute(action: A): Promise<void>;
  /** An action dropped at execution time because it was no longer valid. */
  onDiscard?(action: A, reason: string): void;
  /** Anything changed (queued, removed, started, finished): repaint. */
  onChange?(): void;
  onError?(error: unknown, action: A): void;
}

export class ActionQueue<A> {
  private items: A[] = [];
  private running: A | null = null;
  private pumping = false;
  private closed = false;
  private waiters: (() => void)[] = [];
  private hooks: ActionQueueHooks<A>;

  constructor(hooks: ActionQueueHooks<A>) {
    this.hooks = hooks;
  }

  /** True while an action is running (or about to run). */
  get busy(): boolean {
    return this.pumping;
  }

  /** The action being executed right now, if any. */
  get current(): A | null {
    return this.running;
  }

  /** Actions waiting their turn, in order. */
  get pending(): readonly A[] {
    return this.items;
  }

  get isClosed(): boolean {
    return this.closed;
  }

  /** Position (0-based) of the first pending action matching `pred`, or -1. */
  indexOf(pred: (a: A) => boolean): number {
    return this.items.findIndex(pred);
  }

  /** Queues an action; it starts at once if nothing is running. False once closed. */
  enqueue(action: A): boolean {
    if (this.closed) return false;
    this.items.push(action);
    this.changed();
    void this.pump();
    return true;
  }

  /** Removes the first pending action matching `pred` (never the running one). */
  remove(pred: (a: A) => boolean): boolean {
    const i = this.items.findIndex(pred);
    if (i < 0) return false;
    this.items.splice(i, 1);
    this.changed();
    return true;
  }

  /** Drops every pending action (the running one finishes). */
  clear(): void {
    if (this.items.length === 0) return;
    this.items = [];
    this.changed();
  }

  /** Combat over: empties the queue and refuses any further action. */
  close(): void {
    this.closed = true;
    this.clear();
  }

  /** Resolves once nothing is running and nothing is pending. */
  idle(): Promise<void> {
    if (!this.pumping) return Promise.resolve();
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  private changed() {
    this.hooks.onChange?.();
  }

  private async pump(): Promise<void> {
    if (this.pumping) return;
    this.pumping = true;
    try {
      while (this.items.length > 0 && !this.closed) {
        const next = this.items.shift()!;
        const verdict = this.hooks.validate ? this.hooks.validate(next) : { ok: true as const };
        if (!verdict.ok) {
          this.hooks.onDiscard?.(next, verdict.reason);
          this.changed();
          continue;
        }
        this.running = verdict.action ?? next;
        this.changed();
        try {
          await this.hooks.execute(this.running);
        } catch (error) {
          if (this.hooks.onError) this.hooks.onError(error, this.running);
          else console.error(error);
        } finally {
          this.running = null;
        }
      }
    } finally {
      this.pumping = false;
      this.changed();
      const waiters = this.waiters;
      this.waiters = [];
      for (const w of waiters) w();
    }
  }
}

/** Energy left once every queued action has been paid. */
export function forecastEnergy<A>(energy: number, queued: readonly A[], costOf: (a: A) => number): number {
  return queued.reduce((left, a) => left - costOf(a), energy);
}

export interface CardAction<C, T> {
  card: C;
  target?: T;
}

export interface CardCheckEnv<C, T> {
  inHand(card: C): boolean;
  canPlay(card: C): boolean;
  /** Why the card cannot be played (energy, spell slot…). */
  reason(card: C): string;
  needsTarget(card: C): boolean;
  isAlive(target: T): boolean;
  livingTargets(): T[];
}

/**
 * Checks a queued card right before it is played. A single-target card whose
 * target died is redirected to the first living enemy: the player meant to
 * spend it on the enemies, and dropping it would punish playing ahead.
 */
export function checkCardAction<C, T>(
  action: CardAction<C, T>,
  env: CardCheckEnv<C, T>,
): Verdict<CardAction<C, T>> {
  if (!env.inHand(action.card)) return { ok: false, reason: 'La carta ya no está en tu mano' };
  if (!env.canPlay(action.card)) return { ok: false, reason: env.reason(action.card) };
  if (!env.needsTarget(action.card)) return { ok: true };
  if (action.target !== undefined && env.isAlive(action.target)) return { ok: true };
  const other = env.livingTargets()[0];
  if (other === undefined) return { ok: false, reason: 'No quedan enemigos a los que apuntar' };
  return { ok: true, action: { card: action.card, target: other } };
}
