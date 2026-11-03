// Web Push (RFC 8030 + VAPID RFC 8292 + aes128gcm RFC 8188/8291) on WebCrypto, so it runs on workerd without dependencies.

export interface PushSubscriptionData { endpoint: string; p256dh: string; auth: string }
/** VAPID keys as base64url: the public key is the raw 65-byte P-256 point, the private key the raw 32-byte scalar. */
export interface VapidConfig { publicKey: string; privateKey: string; subject: string }
export interface PushMessage { title: string; body: string; url: string; tag?: string }
export type ResultadoPush = 'enviado' | 'caducada' | 'error';

const enc = new TextEncoder();
const RECORD_SIZE = 4096;
const TTL_SECONDS = 24 * 60 * 60;

export const toBase64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const fromBase64Url = (text: string): Uint8Array =>
  Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) { out.set(p, offset); offset += p.length; }
  return out;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8));
}

/** RFC 8291 message encryption into a single aes128gcm record. */
async function encrypt(sub: PushSubscriptionData, payload: Uint8Array): Promise<Uint8Array> {
  const uaPublic = fromBase64Url(sub.p256dh);
  const authSecret = fromBase64Url(sub.auth);
  const pair = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
  const asPublic = new Uint8Array((await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer);
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey } as unknown as SubtleCryptoDeriveKeyAlgorithm, pair.privateKey, 256));

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const ikm = await hkdf(authSecret, secret, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  // 0x02 marks the last (and only) record
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(payload, new Uint8Array([2]))));

  const header = new Uint8Array(21);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, RECORD_SIZE);
  header[20] = asPublic.length;
  return concat(header, asPublic, cipher);
}

/** `Authorization` value of a VAPID request: an ES256 JWT for the push service origin plus the public key. */
async function vapidAuthorization(endpoint: string, vapid: VapidConfig): Promise<string> {
  const publicBytes = fromBase64Url(vapid.publicKey);
  const jwk: JsonWebKey = {
    kty: 'EC', crv: 'P-256', d: vapid.privateKey,
    x: toBase64Url(publicBytes.slice(1, 33)), y: toBase64Url(publicBytes.slice(33, 65)),
  };
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const part = (value: unknown) => toBase64Url(enc.encode(JSON.stringify(value)));
  const unsigned = `${part({ typ: 'JWT', alg: 'ES256' })}.${part({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: vapid.subject,
  })}`;
  // WebCrypto already returns the raw r||s signature that JWT ES256 expects
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(unsigned)));
  return `vapid t=${unsigned}.${toBase64Url(signature)}, k=${vapid.publicKey}`;
}

/** Sends one notification. `caducada` (404/410) means the subscription is gone and should be deleted. Never throws. */
export async function sendWebPush(
  sub: PushSubscriptionData, message: PushMessage, vapid: VapidConfig, fetchImpl: typeof fetch = fetch,
): Promise<ResultadoPush> {
  try {
    const body = await encrypt(sub, enc.encode(JSON.stringify(message)));
    const res = await fetchImpl(sub.endpoint, {
      method: 'POST',
      headers: {
        Authorization: await vapidAuthorization(sub.endpoint, vapid),
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: String(TTL_SECONDS),
        Urgency: 'high',
      },
      body,
    });
    if (res.status === 404 || res.status === 410) return 'caducada';
    return res.status >= 200 && res.status < 300 ? 'enviado' : 'error';
  } catch (err) {
    console.error('web push failed', err);
    return 'error';
  }
}
