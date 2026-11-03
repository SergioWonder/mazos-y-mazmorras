// Generates a VAPID key pair for Web Push (base64url, raw P-256 point / scalar).
//   node scripts/vapid-keys.mjs              prints both keys as KEY=value lines (valid .dev.vars content)
// Never commit the private key: production gets it through `wrangler secret put VAPID_PRIVATE_KEY`.

const b64 = (bytes) => Buffer.from(bytes).toString('base64url');

/** @returns {Promise<{ publicKey: string, privateKey: string }>} */
export async function generateVapidKeys() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const publicKey = b64(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)));
  const privateKey = String((await crypto.subtle.exportKey('jwk', pair.privateKey)).d);
  return { publicKey, privateKey };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { publicKey, privateKey } = await generateVapidKeys();
  console.log(`VAPID_PUBLIC_KEY=${publicKey}\nVAPID_PRIVATE_KEY=${privateKey}`);
}
