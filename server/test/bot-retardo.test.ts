import { describe, expect, it } from 'vitest';
import { retardoBot } from '../src/sala';

describe('retardo del bot', () => {
  it('espera un tiempo al azar entre acciones para parecer humano', () => {
    const esperas = [0, 0.25, 0.5, 0.999].map((r) => retardoBot(undefined, () => r));
    for (const ms of esperas) {
      expect(ms).toBeGreaterThanOrEqual(900);
      expect(ms).toBeLessThanOrEqual(2600);
    }
    expect(new Set(esperas).size).toBe(esperas.length);
  });

  it('usa el retardo fijo de la configuración si lo hay (tests)', () => {
    expect(retardoBot('0', () => 0.7)).toBe(0);
    expect(retardoBot('150', () => 0.7)).toBe(150);
  });
});
