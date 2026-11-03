import type { Mailer, MagicLinkEmail } from './types.ts';

type FetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

const SUBJECT = 'Tu enlace para entrar en Dracs & Rogues';

function bodies({ link }: MagicLinkEmail) {
  const text = `Pulsa este enlace para entrar en Dracs & Rogues (caduca en 15 minutos):\n\n${link}\n\nSi no lo has pedido tú, ignora este correo.`;
  const html = `<p>Pulsa el botón para entrar en <b>Dracs &amp; Rogues</b>. El enlace caduca en 15 minutos.</p>
<p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#7a1f1f;color:#fff;border-radius:6px;text-decoration:none">Entrar en la mazmorra</a></p>
<p style="color:#666;font-size:12px">Si no lo has pedido tú, ignora este correo.<br>${link}</p>`;
  return { text, html };
}

/** Sends the magic link through the Resend HTTP API (free plan: 100 emails/day, needs a verified domain). */
export function resendMailer(opts: { apiKey: string; from: string; fetch?: FetchFn }): Mailer {
  const send = opts.fetch ?? fetch;
  return {
    async sendMagicLink(email) {
      const res = await send('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${opts.apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: opts.from, to: [email.to], subject: SUBJECT, ...bodies(email) }),
      });
      if (!res.ok) throw new Error(`Resend rejected the email: ${res.status} ${await res.text()}`);
    },
  };
}

/** Local development without an email provider: the link shows up in the `wrangler dev` console. */
export const consoleMailer: Mailer = {
  async sendMagicLink({ to, link }) {
    console.log(`[magic-link] ${to} -> ${link}`);
  },
};
