import { createApp } from './app.ts';
import type { Env } from './env.ts';
import { consoleMailer, resendMailer } from './mailer.ts';

// Durable Object classes must be exported from the Worker entry.
export { Buzon } from './buzon.ts';
export { Sala } from './sala.ts';

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const mailer = env.RESEND_API_KEY ? resendMailer({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM }) : consoleMailer;
    return createApp({ mailer }).fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
