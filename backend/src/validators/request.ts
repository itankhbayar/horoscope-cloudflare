import type { Context } from 'hono';
import type { z } from 'zod';
import type { AppBindings, AppVariables } from '../types';
import { fail } from '../utils/apiResponse';
import { formatZodError } from '../validation/hook';

type AppContext = Context<{ Bindings: AppBindings; Variables: AppVariables }>;

export async function parseJsonBody<T extends z.ZodType>(
  c: AppContext,
  schema: T,
): Promise<z.infer<T> | Response> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return fail(c, 400, 'BAD_REQUEST', 'Invalid JSON body');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return fail(c, 400, 'VALIDATION_ERROR', formatZodError(parsed.error), parsed.error.flatten());
  }
  return parsed.data;
}

export async function parseOptionalJsonBody<T extends z.ZodType>(
  c: AppContext,
  schema: T,
): Promise<z.infer<T> | Response> {
  const contentLength = c.req.header('content-length');
  const contentType = c.req.header('content-type');
  if ((!contentLength || Number(contentLength) === 0) && !contentType) {
    const parsed = schema.safeParse({});
    if (!parsed.success) {
      return fail(c, 400, 'VALIDATION_ERROR', formatZodError(parsed.error), parsed.error.flatten());
    }
    return parsed.data;
  }
  return parseJsonBody(c, schema);
}

export function parseQuery<T extends z.ZodType>(
  c: AppContext,
  schema: T,
): z.infer<T> | Response {
  const raw = Object.fromEntries(new URL(c.req.url).searchParams.entries());
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return fail(c, 400, 'VALIDATION_ERROR', formatZodError(parsed.error), parsed.error.flatten());
  }
  return parsed.data;
}

export function parseParams<T extends z.ZodType>(
  c: AppContext,
  schema: T,
): z.infer<T> | Response {
  const parsed = schema.safeParse(c.req.param());
  if (!parsed.success) {
    return fail(c, 400, 'VALIDATION_ERROR', formatZodError(parsed.error), parsed.error.flatten());
  }
  return parsed.data;
}

export async function parseFormData<T extends z.ZodType>(
  c: AppContext,
  schema: T,
): Promise<z.infer<T> | Response> {
  const contentType = c.req.header('Content-Type') ?? '';
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    return fail(c, 415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be multipart/form-data');
  }
  const form = await c.req.formData();
  const raw = Object.fromEntries(form.entries());
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return fail(c, 400, 'VALIDATION_ERROR', formatZodError(parsed.error), parsed.error.flatten());
  }
  return parsed.data;
}

export function isResponse(value: unknown): value is Response {
  return value instanceof Response;
}
