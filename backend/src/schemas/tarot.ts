import { z } from 'zod';
import { zodiacSignSchema } from './horoscope';
import { isValidCalendarDate, isValidIanaTimeZone } from '../tarot/tarotQuery';

export const tarotQuerySchema = z.object({
  sign: zodiacSignSchema,
  timezone: z.string().trim().refine(isValidIanaTimeZone, 'Invalid timezone'),
  date: z.string().trim().refine(isValidCalendarDate, 'Invalid date').optional(),
  lang: z.string().trim().min(1).max(16).optional(),
});
