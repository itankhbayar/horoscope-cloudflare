import { z } from 'zod';
import { optionalNullableTimezoneOffsetSchema } from './geo';

export const updateProfileBodySchema = z
  .object({
    displayName: z.string().trim().min(2).max(60).optional(),
    fullName: z.string().trim().min(1).max(120).optional(),
    bio: z.union([z.null(), z.string().max(280)]).optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
    timezoneOffset: optionalNullableTimezoneOffsetSchema,
  })
  .refine(
    (body) =>
      body.displayName !== undefined ||
      body.fullName !== undefined ||
      body.bio !== undefined ||
      body.timezone !== undefined ||
      body.timezoneOffset !== undefined,
    { message: 'At least one field is required' },
  );

export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;
