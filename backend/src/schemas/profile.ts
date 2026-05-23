import { z } from 'zod';
import { updateProfileBodySchema } from '../validation/profileSchemas';

export const updateProfileSchema = updateProfileBodySchema.strict();

export const avatarFormSchema = z.object({
  avatar: z.custom<File>(
    (value) =>
      Boolean(
        value &&
          typeof value === 'object' &&
          'arrayBuffer' in value &&
          'type' in value &&
          'size' in value &&
          'name' in value,
      ),
    'avatar file is required',
  ),
});
