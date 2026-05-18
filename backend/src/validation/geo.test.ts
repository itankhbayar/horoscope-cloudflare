import { describe, expect, it } from 'vitest';
import { registerBodySchema } from './authSchemas';
import { updateProfileBodySchema } from './profileSchemas';

describe('registerBodySchema geo fields', () => {
  const base = {
    fullName: 'Test User',
    email: 'test@example.com',
    password: 'secret12',
    birthDate: '1990-01-15',
    birthCity: 'Ulaanbaatar',
  };

  it('accepts valid coordinates and timezone offset', () => {
    const parsed = registerBodySchema.safeParse({
      ...base,
      latitude: 47.92,
      longitude: 106.91,
      timezoneOffset: 8,
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts null coordinates', () => {
    const parsed = registerBodySchema.safeParse({
      ...base,
      latitude: null,
      longitude: null,
      timezoneOffset: null,
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects string latitude', () => {
    const parsed = registerBodySchema.safeParse({ ...base, latitude: '47.92' });
    expect(parsed.success).toBe(false);
  });

  it('rejects NaN and Infinity', () => {
    expect(registerBodySchema.safeParse({ ...base, latitude: Number.NaN }).success).toBe(false);
    expect(registerBodySchema.safeParse({ ...base, longitude: Number.POSITIVE_INFINITY }).success).toBe(
      false,
    );
  });

  it('rejects out-of-range latitude', () => {
    expect(registerBodySchema.safeParse({ ...base, latitude: 91 }).success).toBe(false);
    expect(registerBodySchema.safeParse({ ...base, latitude: -120 }).success).toBe(false);
  });
});

describe('updateProfileBodySchema timezoneOffset', () => {
  it('rejects non-finite timezoneOffset', () => {
    const parsed = updateProfileBodySchema.safeParse({
      displayName: 'Valid Name',
      timezoneOffset: '8',
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts finite timezoneOffset', () => {
    const parsed = updateProfileBodySchema.safeParse({
      timezoneOffset: 8,
    });
    expect(parsed.success).toBe(true);
  });
});
