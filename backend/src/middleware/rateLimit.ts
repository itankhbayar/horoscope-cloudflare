import type { MiddlewareHandler } from 'hono';
import type { AppBindings, AppVariables } from '../types';
import { fail } from '../utils/apiResponse';
import { logFromContext, metric } from '../utils/logger';

type RateLimitBindingName =
  | 'LOGIN_RATE_LIMITER'
  | 'REGISTER_RATE_LIMITER'
  | 'REFRESH_RATE_LIMITER'
  | 'PUBLIC_RATE_LIMITER';

type RateLimitScope = 'ip' | 'user' | 'ip-and-user';

type RateLimitOptions = {
  keyPrefix: string;
  limit: number;
  windowMs: number;
  binding?: RateLimitBindingName;
  scope?: RateLimitScope;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const testBuckets = new Map<string, RateLimitBucket>();

function firstForwardedIp(value: string): string {
  return value.split(',')[0]?.trim() ?? '';
}

export function getClientIp(headers: Pick<Headers, 'get'>): string {
  const cfIp = headers.get('CF-Connecting-IP')?.trim();
  if (cfIp) return cfIp;

  const forwardedFor = headers.get('X-Forwarded-For')?.trim();
  if (forwardedFor) {
    const first = firstForwardedIp(forwardedFor);
    if (first) return first;
  }

  const realIp = headers.get('X-Real-IP')?.trim();
  if (realIp) return realIp;

  return 'unknown';
}

export function resetRateLimitTestState(): void {
  testBuckets.clear();
}

export const resetInMemoryRateLimits = resetRateLimitTestState;

function isNonProduction(env: AppBindings): boolean {
  const label = (env.APP_ENV ?? env.ENVIRONMENT ?? '').toLowerCase();
  return label === 'test' || label === 'development' || label === 'local' || label === '';
}

function bucketKey(
  c: Parameters<MiddlewareHandler<{ Bindings: AppBindings; Variables: AppVariables }>>[0],
  options: RateLimitOptions,
): string {
  const ip = getClientIp(c.req.raw.headers);
  const userId = c.get('userId');
  const scope = options.scope ?? 'ip';
  if (scope === 'user' && userId) return `${options.keyPrefix}:user:${userId}`;
  if (scope === 'ip-and-user' && userId) return `${options.keyPrefix}:user:${userId}:ip:${ip}`;
  return `${options.keyPrefix}:ip:${ip}`;
}

async function checkNativeRateLimit(
  env: AppBindings,
  bindingName: RateLimitBindingName | undefined,
  key: string,
): Promise<boolean | null> {
  if (!bindingName) return null;
  const limiter = env[bindingName];
  if (!limiter) return null;
  const outcome = await limiter.limit({ key });
  return outcome.success;
}

async function checkDurableObjectRateLimit(
  env: AppBindings,
  options: RateLimitOptions,
  key: string,
): Promise<boolean | null> {
  if (!env.RATE_LIMITER_DO) return null;
  const id = env.RATE_LIMITER_DO.idFromName(key);
  const stub = env.RATE_LIMITER_DO.get(id);
  const res = await stub.fetch('https://rate-limit.local/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      limit: options.limit,
      windowMs: options.windowMs,
    }),
  });
  if (!res.ok) return false;
  const body = (await res.json()) as { allowed?: boolean };
  return body.allowed === true;
}

function checkTestRateLimit(options: RateLimitOptions, key: string, now = Date.now()): boolean {
  const existing = testBuckets.get(key);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : {
          count: 0,
          resetAt: now + options.windowMs,
        };

  bucket.count += 1;
  testBuckets.set(key, bucket);
  return bucket.count <= options.limit;
}

export function createRateLimitMiddleware(
  options: RateLimitOptions,
): MiddlewareHandler<{ Bindings: AppBindings; Variables: AppVariables }> {
  return async (c, next) => {
    const key = bucketKey(c, options);
    const retryAfter = Math.max(1, Math.ceil(options.windowMs / 1000));

    let allowed = await checkNativeRateLimit(c.env, options.binding, key);
    let backend: 'cloudflare' | 'durable_object' | 'local_test' = 'cloudflare';

    if (allowed === null) {
      allowed = await checkDurableObjectRateLimit(c.env, options, key);
      backend = 'durable_object';
    }

    if (allowed === null && isNonProduction(c.env)) {
      allowed = checkTestRateLimit(options, key);
      backend = 'local_test';
    }

    if (allowed === null) {
      logFromContext(c, 'error', 'rate_limit_backend_missing', {
        keyPrefix: options.keyPrefix,
        binding: options.binding,
      });
      return fail(c, 503, 'SERVICE_UNAVAILABLE', 'Rate limit backend is not configured');
    }

    if (!allowed) {
      c.header('Retry-After', String(retryAfter));
      logFromContext(c, 'warn', 'rate_limit_exceeded', {
        keyPrefix: options.keyPrefix,
        backend,
        retryAfter,
      });
      metric(c.env, 'rate_limit_exceeded', { keyPrefix: options.keyPrefix, backend });
      return fail(c, 429, 'RATE_LIMITED', 'Too many requests, please try again later');
    }

    await next();
  };
}
