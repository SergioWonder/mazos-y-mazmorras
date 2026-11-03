import type { Env } from './env.ts';

export interface MagicLinkEmail { to: string; link: string }
export interface Mailer { sendMagicLink(email: MagicLinkEmail): Promise<void> }
export interface Deps { mailer: Mailer }

export interface User { id: string; email: string; displayName: string | null }

/** Hono generics shared by every route module. */
export type AppEnv = { Bindings: Env; Variables: { user: User } };
