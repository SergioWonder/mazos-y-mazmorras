// Enemies still playing their death. A kill no longer holds the fight up: the body
// falls while the rest of an area attack or a multi-hit goes on, and whoever needs
// the fallen enemy's place (a summon, the end of the fight) waits for it to finish.

interface Death { done: Promise<void>; since: number }

export class DeathQueue<K = unknown> {
  private readonly deaths = new Map<K, Death>();

  /** Starts the death of `key`: `onDone` runs (and it stops dying) after `ms`. */
  start(key: K, ms: number, onDone: () => void) {
    const done = new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, ms)))
      .then(onDone)
      .catch((e) => console.error(e))
      .finally(() => { if (this.deaths.get(key)?.done === done) this.deaths.delete(key); });
    this.deaths.set(key, { done, since: performance.now() });
  }

  /** `key` is still falling. */
  dying(key: K): boolean {
    return this.deaths.has(key);
  }

  /** Milliseconds since `key` started dying (0 when it is not dying). */
  elapsed(key: K): number {
    const d = this.deaths.get(key);
    return d ? performance.now() - d.since : 0;
  }

  /** Resolves when `key` has finished dying (at once if it is not dying). */
  async wait(key: K): Promise<void> {
    await this.deaths.get(key)?.done;
  }

  /** Resolves once every death (also those started meanwhile) has finished. */
  async settle(): Promise<void> {
    while (this.deaths.size) await Promise.all([...this.deaths.values()].map((d) => d.done));
  }
}
