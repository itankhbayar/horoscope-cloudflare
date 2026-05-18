import { z } from 'zod';

/** Finite latitude in degrees, or explicit null. */
export const nullableLatitudeSchema = z.union([
  z.null(),
  z.number().finite().min(-90, 'latitude must be between -90 and 90').max(90),
]);

/** Finite longitude in degrees, or explicit null. */
export const nullableLongitudeSchema = z.union([
  z.null(),
  z.number().finite().min(-180, 'longitude must be between -180 and 180').max(180),
]);

/** Finite timezone offset in hours, or explicit null. */
export const nullableTimezoneOffsetSchema = z.union([z.null(), z.number().finite()]);

export const optionalNullableLatitudeSchema = nullableLatitudeSchema.optional();
export const optionalNullableLongitudeSchema = nullableLongitudeSchema.optional();
export const optionalNullableTimezoneOffsetSchema = nullableTimezoneOffsetSchema.optional();
