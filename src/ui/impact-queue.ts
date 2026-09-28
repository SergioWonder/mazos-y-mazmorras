// Hit feedback that waits for a projectile to land (Magic Missile's volley):
// the damage number, the hit reaction and the shake of each dart run at its
// impact, and settle() lets the combat wait until every pending dart has landed
// (before a death, a message or the next card). Pure: no DOM, testable in node.

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
