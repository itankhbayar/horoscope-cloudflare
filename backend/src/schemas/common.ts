import { z } from 'zod';

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: apiErrorSchema,
});

export function successResponseSchema<T extends z.ZodType>(data: T) {
  return z.object({
    success: z.literal(true),
    data,
  });
}

export function paginatedResponseSchema<T extends z.ZodType>(item: T) {
  return successResponseSchema(
    z.object({
      items: z.array(item),
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      hasMore: z.boolean(),
    }),
  );
}

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

export function paginateItems<T>(
  items: T[],
  pagination: Pagination,
  total = items.length,
) {
  return {
    items,
    page: pagination.page,
    limit: pagination.limit,
    total,
    hasMore: pagination.page * pagination.limit < total,
  };
}

export const emptyQuerySchema = z.object({}).strict();

export const langQuerySchema = z.object({
  lang: z.string().trim().min(1).max(16).optional(),
});

export const dateQuerySchema = z.object({
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
