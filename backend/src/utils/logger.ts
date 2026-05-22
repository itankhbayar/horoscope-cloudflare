import type { Context } from 'hono';
import type { AppBindings, AppVariables } from '../types';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogFields = Record<string, unknown>;

function envName(env: Partial<AppBindings>): string {
  return env.APP_ENV ?? env.ENVIRONMENT ?? 'development';
}

function sanitize(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== 'object') return value;

  const redacted = new Set([
    'authorization',
    'cookie',
    'password',
    'secret',
    'token',
    'stripe_signature',
    'stripe-signature',
    'stripeSecret',
    'webhookSecret',
  ]);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      redacted.has(key.toLowerCase()) ? '[redacted]' : sanitize(entry),
    ]),
  );
}

export function requestIdFromContext(
  c: Context<{ Bindings: AppBindings; Variables: AppVariables }>,
): string {
  return c.get('requestId') || c.req.header('CF-Ray') || c.req.header('X-Request-ID') || crypto.randomUUID();
}

export function log(
  env: Partial<AppBindings>,
  level: LogLevel,
  event: string,
  fields: LogFields = {},
): void {
  const safeFields = sanitize(fields) as LogFields;
  const payload = {
    level,
    event,
    environment: envName(env),
    timestamp: new Date().toISOString(),
    ...safeFields,
  };
  const message = JSON.stringify(payload);
  if (level === 'error') console.error(message);
  else if (level === 'warn') console.warn(message);
  else console.log(message);
}

export function logFromContext(
  c: Context<{ Bindings: AppBindings; Variables: AppVariables }>,
  level: LogLevel,
  event: string,
  fields: LogFields = {},
): void {
  log(c.env, level, event, {
    route: c.req.path,
    method: c.req.method,
    requestId: requestIdFromContext(c),
    ...fields,
  });
}

export function metric(
  env: Partial<AppBindings>,
  name: string,
  fields: LogFields = {},
): void {
  log(env, 'info', 'metric', { metric: name, ...fields });
}
