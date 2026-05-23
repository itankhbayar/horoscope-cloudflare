import { z } from 'zod';
import { zodiacSignSchema } from './horoscope';

export const compatibilitySignsSchema = z.object({
  sign1: zodiacSignSchema,
  sign2: zodiacSignSchema,
  persist: z.boolean().optional(),
}).strict();

export const compatibilityUsersSchema = z.object({
  otherUserId: z.string().trim().min(1).max(128),
  persist: z.boolean().optional(),
}).strict();

export const compatibilityQuerySchema = z.object({
  lang: z.string().trim().min(1).max(16).optional(),
});
