import { z } from 'zod';

export const chineseAnimalSchema = z.enum([
  'rat',
  'ox',
  'tiger',
  'rabbit',
  'dragon',
  'snake',
  'horse',
  'goat',
  'monkey',
  'rooster',
  'dog',
  'pig',
]);

export const chineseDailyParamsSchema = z.object({
  animal: chineseAnimalSchema,
});

export const chineseDailyQuerySchema = z.object({
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  lang: z.string().trim().min(1).max(16).optional(),
});

export const chinesePeriodQuerySchema = z.object({
  period: z.string().trim().regex(/^\d{4}(-W?\d{2})?$/).optional(),
  lang: z.string().trim().min(1).max(16).optional(),
});

export const chineseCompatibilitySchema = z.object({
  animal1: chineseAnimalSchema,
  animal2: chineseAnimalSchema,
}).strict();

export const chineseCompatibilityQuerySchema = z.object({
  lang: z.string().trim().min(1).max(16).optional(),
});

export const chineseProfilePreviewQuerySchema = z.object({
  birthDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
});
