import { z } from 'zod';
import { paginationSchema } from './common';

export const zodiacSignSchema = z.enum([
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
]);

export const dailyHoroscopeParamsSchema = z.object({
  sign: zodiacSignSchema,
});

export const dailyHoroscopeQuerySchema = z.object({
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  lang: z.string().trim().min(1).max(16).optional(),
});

export const citySearchQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(120).default(''),
  limit: z.coerce.number().int().positive().max(25).default(10),
});
