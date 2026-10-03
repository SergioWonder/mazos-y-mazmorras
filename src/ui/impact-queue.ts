// Hit feedback that waits for a projectile to land (Magic Missile's volley):
// the damage number, the hit reaction and the shake of each dart run at its
// impact, and settle() lets the combat wait until every pending dart has landed
// (before a death, a message or the next card). Area sweeps (Wrath of the Sea's
// wave) use the same queue: each enemy's feedback runs as the crest reaches it.
// Pure: no DOM, testable in node.

export class ImpactQueue {
  private readonly pending = new Set<Promise<void>>();
  private readonly onError: (e: unknown) => void;
  constructor(onError: (e: unknown) => void = (e) => console.error(e)) { this.onError = onError; }

  /** Impacts still to land. */
  get size() { return this.pending.size; }

  /** Runs `run` in `ms` milliseconds. */
  schedule(ms: number, run: () => void) {
    const p: Promise<void> = new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, ms)))
      .then(run)
      .catch(this.onError)
      .finally(() => { this.pending.delete(p); });
    this.pending.add(p);
  }

  /** Resolves once every scheduled impact (also those scheduled meanwhile) has run. */
  async settle(): Promise<void> {
    while (this.pending.size) await Promise.all([...this.pending]);
  }
}

/** One sweep per card (Wrath of the Sea's wave crosses every enemy): the first hit casts
 *  it and the following hits join it, so their feedback can wait for its crest. A hit on
 *  an enemy the sweep already crossed, another spell, or a finished sweep starts anew. */
export class SweepClock {
  private current: { key: string; at: number; hit: Set<unknown> } | null = null;

  /** A hit of sweep `key` on `who` at `now` (ms): whether it must cast a new sweep, and
   *  how long the sweep it belongs to has been running. */
  hit(key: string, who: unknown, now: number, durationMs: number): { cast: boolean; elapsedMs: number } {
    const c = this.current;
    if (c && c.key === key && !c.hit.has(who) && now - c.at <= durationMs) {
      c.hit.add(who);
      return { cast: false, elapsedMs: now - c.at };
    }
    this.current = { key, at: now, hit: new Set([who]) };
    return { cast: true, elapsedMs: 0 };
  }

  /** The card resolved: its sweep is over. */
  reset() { this.current = null; }
}
