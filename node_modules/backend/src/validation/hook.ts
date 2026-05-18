import type { Context } from 'hono';
import type { Hook } from '@hono/zod-validator';

type ZodIssueLike = { path: PropertyKey[]; message: string };
type ZodErrorLike = { issues: ZodIssueLike[] };

export function formatZodError(error: ZodErrorLike): string {
  const issue = error.issues[0];
  if (!issue) return 'Invalid request body';
  const path = issue.path.length > 0 ? String(issue.path.join('.')) : 'body';
  return `${path}: ${issue.message}`;
}

/** Returns 400 JSON when Zod validation fails (for @hono/zod-validator). */
export const validationHook: Hook<unknown, any, any, 'json'> = (result, c: Context) => {
  if (!result.success) {
    return c.json({ error: formatZodError(result.error as ZodErrorLike) }, 400);
  }
};
