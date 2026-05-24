import { z } from 'zod';
import {
  optionalNullableLatitudeSchema,
  optionalNullableLongitudeSchema,
  optionalNullableTimezoneOffsetSchema,
} from './geo';

const birthDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'birthDate must be YYYY-MM-DD');

const birthTimeSchema = z.union([z.null(), z.string().trim().max(32)]).optional();

export const updateProfileBodySchema = z
  .object({
    displayName: z.string().trim().min(2, 'Display name must be 2 to 60 characters').max(60, 'Display name must be 2 to 60 characters').optional(),
    fullName: z.string().trim().min(1).max(120).optional(),
    bio: z.union([z.null(), z.string().max(280)]).optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
    timezoneOffset: optionalNullableTimezoneOffsetSchema,
    birthDate: birthDateSchema.optional(),
    birthTime: birthTimeSchema,
    birthCity: z.string().trim().min(1, 'birthCity is required').max(120).optional(),
    birthCountry: z.union([z.null(), z.string().trim().max(120)]).optional(),
    latitude: optionalNullableLatitudeSchema,
    longitude: optionalNullableLongitudeSchema,
  })
  .refine(
    (body) =>
      body.displayName !== undefined ||
      body.fullName !== undefined ||
      body.bio !== undefined ||
      body.timezone !== undefined ||
      body.timezoneOffset !== undefined ||
      body.birthDate !== undefined ||
      body.birthTime !== undefined ||
      body.birthCity !== undefined ||
      body.birthCountry !== undefined ||
      body.latitude !== undefined ||
      body.longitude !== undefined,
    { message: 'At least one field is required' },
  );

export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;
