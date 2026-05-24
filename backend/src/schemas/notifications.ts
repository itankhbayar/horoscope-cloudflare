import { z } from 'zod';

export const notificationPreferencesUpdateSchema = z
  .object({
    allEnabled: z.boolean().optional(),
    saleAlertsEnabled: z.boolean().optional(),
    horoscopesEnabled: z.boolean().optional(),
    transitsEnabled: z.boolean().optional(),
    dailyReminderEnabled: z.boolean().optional(),
    streakReminderEnabled: z.boolean().optional(),
    reEngagementEnabled: z.boolean().optional(),
    quietHoursEnabled: z.boolean().optional(),
    quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    reminderHourLocal: z.number().int().min(0).max(23).optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'At least one preference is required',
  });

export const pushTokenSchema = z
  .object({
    expoPushToken: z
      .string()
      .trim()
      .min(12)
      .max(512)
      .regex(/^(Expo|Exponent)PushToken\[[^\]]+\]$/, 'expoPushToken format is invalid'),
    platform: z.enum(['ios', 'android', 'web', 'unknown']),
    deviceId: z.string().trim().min(1).max(256).nullable().optional(),
  })
  .strict();

export const deletePushTokenSchema = pushTokenSchema.pick({ expoPushToken: true }).strict();
