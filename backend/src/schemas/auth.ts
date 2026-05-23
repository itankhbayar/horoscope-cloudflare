import { z } from 'zod';
import { registerBodySchema } from '../validation/authSchemas';

export const loginSchema = z
  .object({
    email: z.string().trim().min(1, 'email is required').email('email must be valid'),
    password: z.string().min(1, 'password is required').max(1024),
  })
  .strict();

export const registerSchema = registerBodySchema.strict();

export const refreshTokenBodySchema = z
  .object({
    refreshToken: z.string().trim().min(1).max(2048).optional(),
  })
  .strict();

export type LoginBody = z.infer<typeof loginSchema>;
export type RegisterBody = z.infer<typeof registerSchema>;
