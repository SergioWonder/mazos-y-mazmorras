import { describe, expect, it } from 'vitest';
import { testApp } from './helpers.ts';

const preflight = (origin: string): RequestInit => ({
  method: 'OPTIONS',
  headers: { origin, 'access-control-request-method': 'PUT', 'access-control-request-headers': 'authorization, content-type' },
});

describe('CORS', () => {
  it('permite al juego publicado llamar a la API con su token', async () => {
    const res = await testApp()('/saves/run', preflight('https://sergiowonder.github.io'));

    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://sergiowonder.github.io');
    expect(res.headers.get('access-control-allow-headers')?.toLowerCase()).toContain('authorization');
  });

  it('no abre la API a otras webs', async () => {
    const res = await testApp()('/saves/run', preflight('https://web-maliciosa.example'));

    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });
});
