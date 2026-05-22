import { z } from 'zod';
import {
  optionalNullableLatitudeSchema,
  optionalNullableLongitudeSchema,
  optionalNullableTimezoneOffsetSchema,
} from './geo';
import { validatePasswordPolicy } from '../utils/passwordPolicy';

const birthDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'birthDate must be YYYY-MM-DD');

const birthTimeSchema = z.union([z.null(), z.string().trim().max(32)]).optional();

export const registerBodySchema = z.object({
  fullName: z.string().trim().min(1, 'fullName is required').max(120),
  email: z.string().trim().min(1, 'email is required').email('email must be valid'),
  password: z.string().superRefine((password, ctx) => {
    const result = validatePasswordPolicy(password);
    if (!result.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error,
      });
    }
  }),
  birthDate: birthDateSchema,
  birthTime: birthTimeSchema,
  birthCity: z.string().trim().min(1, 'birthCity is required').max(120),
  birthCountry: z.union([z.null(), z.string().trim().max(120)]).optional(),
  latitude: optionalNullableLatitudeSchema,
  longitude: optionalNullableLongitudeSchema,
  timezoneOffset: optionalNullableTimezoneOffsetSchema,
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
