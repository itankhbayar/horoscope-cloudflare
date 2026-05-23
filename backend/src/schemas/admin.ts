import { z } from 'zod';
import { isValidCalendarDate, isValidIanaTimeZone } from '../tarot/tarotQuery';

export const adminPrewarmTarotQuerySchema = z.object({
  timezone: z.string().trim().refine(isValidIanaTimeZone, 'Invalid timezone').optional(),
  date: z.string().trim().refine(isValidCalendarDate, 'Invalid date (YYYY-MM-DD)').optional(),
});
