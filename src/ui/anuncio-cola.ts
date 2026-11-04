// Queue of the central announcements ("+ Defensa+", "⚒️ Golpe+"...): at most `max`
// on screen as a list, oldest on top. Each one lives `lifeMs`, then fades for
// `fadeMs` (the DOM side collapses it so the ones below slide up) and is removed;
// only then does the next waiting announcement take its place. Free of the DOM so
// the smoke test can drive it with a manual clock.

export interface AnnouncementQueueOptions<T, H> {
  max: number;
  lifeMs: number;
  fadeMs: number;
  /** Puts the announcement on screen (at the end of the list). */
  show(item: T): H;
  /** Starts its fade-out. */
  fade(handle: H): void;
  /** Takes it off the screen once faded. */
  remove(handle: H): void;
  timer?: (fn: () => void, ms: number) => void;
}

export class AnnouncementQueue<T, H> {
  private readonly queue: T[] = [];
  private shown = 0;
  private readonly timer: (fn: () => void, ms: number) => void;
  private readonly opts: AnnouncementQueueOptions<T, H>;

  // no parameter properties: node's type stripping (smoke test) does not support them
  constructor(opts: AnnouncementQueueOptions<T, H>) {
    this.opts = opts;
    this.timer = opts.timer ?? ((fn, ms) => { setTimeout(fn, ms); });
  }

  /** Announcements on screen (fading ones included). */
  get visible(): number { return this.shown; }
  /** Announcements waiting for a free place. */
  get waiting(): number { return this.queue.length; }

  push(item: T): void {
    this.queue.push(item);
    this.next();
  }

  private next(): void {
    while (this.shown < this.opts.max && this.queue.length) {
      const handle = this.opts.show(this.queue.shift()!);
      this.shown++;
      this.timer(() => {
        this.opts.fade(handle);
        this.timer(() => {
          this.opts.remove(handle);
          this.shown--;
          this.next();
        }, this.opts.fadeMs);
      }, this.opts.lifeMs);
    }
  }
}
