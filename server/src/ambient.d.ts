// `src/core` is shared with the browser. The worker type-checks it too (it has no DOM lib), but never calls the
// parts that use localStorage (the solo save): only the pure engine in `src/core/multi` runs here.
declare const localStorage: {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};
