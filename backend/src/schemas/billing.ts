import { z } from 'zod';

export const checkoutSyncSchema = z.object({
  sessionId: z.string({ error: 'sessionId is required' }).trim().min(1, 'sessionId is required').max(512),
}).strict();

export const mobileCheckoutSchema = z.object({
  priceId: z.string().trim().max(256).optional(),
  idempotencyKey: z.string().trim().max(256).optional(),
}).strict();

export const mobilePortalSchema = z.object({
  returnUrl: z.string().trim().url().max(2048),
}).strict();

export const revenueCatWebhookSchema = z.object({
  event: z
    .object({
      id: z.string().optional(),
      type: z.string().optional(),
      app_user_id: z.string().optional(),
      original_app_user_id: z.string().optional(),
      period_type: z.string().optional(),
      is_trial_conversion: z.boolean().optional(),
    })
    .passthrough()
    .optional(),
}).passthrough();
