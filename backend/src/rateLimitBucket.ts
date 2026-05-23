import { DurableObject } from 'cloudflare:workers';
import type { AppBindings } from './types';

type BucketState = {
  count: number;
  resetAt: number;
};

type CheckRequest = {
  limit: number;
  windowMs: number;
};

function validCheckRequest(value: unknown): value is CheckRequest {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    Number.isInteger(record.limit) &&
    Number.isInteger(record.windowMs) &&
    Number(record.limit) > 0 &&
    Number(record.windowMs) > 0
  );
}

export class RateLimitBucket extends DurableObject<AppBindings> {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (!validCheckRequest(input)) {
      return Response.json({ error: 'Invalid rate limit request' }, { status: 400 });
    }

    const now = Date.now();
    const existing = await this.ctx.storage.get<BucketState>('bucket');
    const bucket =
      existing && existing.resetAt > now
        ? existing
        : {
            count: 0,
            resetAt: now + input.windowMs,
          };

    bucket.count += 1;
    await this.ctx.storage.put('bucket', bucket);

    return Response.json({
      allowed: bucket.count <= input.limit,
      remaining: Math.max(0, input.limit - bucket.count),
      resetAt: bucket.resetAt,
    });
  }
}
