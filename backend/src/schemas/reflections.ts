import { z } from 'zod';

/** Evening check-in payload. Resonance is the only input in V1 (1/2/3). */
export const reflectionSubmitSchema = z.object({
  readingDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  resonance: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export const reflectionStateQuerySchema = z.object({
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
