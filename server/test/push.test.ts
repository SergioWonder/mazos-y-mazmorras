import { describe, expect, it } from 'vitest';
import { sendWebPush, type VapidConfig } from '../src/push.ts';

const enc = new TextEncoder();
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (text: string) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8));
}

/** The browser side: a P-256 key pair plus the auth secret, and a decrypter for the aes128gcm body. */
async function browser() {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
  const publicKey = new Uint8Array((await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer);
  const auth = crypto.getRandomValues(new Uint8Array(16));
  async function decrypt(body: Uint8Array): Promise<string> {
    const salt = body.slice(0, 16);
    const idLen = body[20];
    const serverKey = body.slice(21, 21 + idLen);
    const cipher = body.slice(21 + idLen);
    const server = await crypto.subtle.importKey('raw', serverKey, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: server } as unknown as SubtleCryptoDeriveKeyAlgorithm, pair.privateKey, 256));
    const ikm = await hkdf(auth, secret, concat(enc.encode('WebPush: info\0'), publicKey, serverKey), 32);
    const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
    const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
    const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
    const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, cipher));
    return new TextDecoder().decode(plain.slice(0, plain.lastIndexOf(2)));
  }
  return { subscription: { endpoint: 'https://push.example.test/send/abc123', p256dh: b64(publicKey), auth: b64(auth) }, decrypt };
}

async function vapid(): Promise<VapidConfig> {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const jwk = (await crypto.subtle.exportKey('jwk', pair.privateKey)) as JsonWebKey;
  return {
    publicKey: b64(new Uint8Array((await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer)),
    privateKey: jwk.d!,
    subject: 'mailto:no-reply@morghur.es',
  };
}

describe('Web Push', () => {
  it('cifra el aviso para el navegador y firma la cabecera VAPID', async () => {
    const ua = await browser();
    const keys = await vapid();
    let request: { url: string; init: RequestInit } | null = null;
    const fakeFetch = (async (url: string, init: RequestInit) => { request = { url, init }; return new Response(null, { status: 201 }); }) as unknown as typeof fetch;

    const res = await sendWebPush(ua.subscription, { title: 'Invitación', body: 'Ana te invita', url: 'https://juego.test/?sala=1' }, keys, fakeFetch);

    expect(res).toBe('enviado');
    expect(request!.url).toBe(ua.subscription.endpoint);
    const headers = request!.init.headers as Record<string, string>;
    expect(headers['Content-Encoding']).toBe('aes128gcm');
    expect(JSON.parse(await ua.decrypt(request!.init.body as Uint8Array))).toEqual({
      title: 'Invitación', body: 'Ana te invita', url: 'https://juego.test/?sala=1',
    });

    // VAPID: ES256 JWT for the push service origin, verifiable with the public key
    const m = /^vapid t=([\w-]+)\.([\w-]+)\.([\w-]+), k=([\w-]+)$/.exec(headers.Authorization)!;
    expect(m[4]).toBe(keys.publicKey);
    expect(JSON.parse(new TextDecoder().decode(unb64(m[2])))).toMatchObject({ aud: 'https://push.example.test', sub: keys.subject });
    const pub = await crypto.subtle.importKey('raw', unb64(keys.publicKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    expect(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, unb64(m[3]), enc.encode(`${m[1]}.${m[2]}`))).toBe(true);
  });

  it('distingue una suscripción caducada (404/410) de un fallo pasajero', async () => {
    const ua = await browser();
    const keys = await vapid();
    const answer = (status: number) => (async () => new Response(null, { status })) as unknown as typeof fetch;
    const msg = { title: 'x', body: 'y', url: 'https://juego.test/' };

    expect(await sendWebPush(ua.subscription, msg, keys, answer(410))).toBe('caducada');
    expect(await sendWebPush(ua.subscription, msg, keys, answer(500))).toBe('error');
  });
});
