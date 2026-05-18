import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyToken, HttpError, registerUser } from './authService';
import { createDbCapture } from '../test/mockDb';

vi.mock('../utils/password', () => ({
  hashPassword: vi.fn(async (password: string) => `hashed:${password}`),
  verifyPassword: vi.fn(),
}));

vi.mock('../utils/cities', () => ({
  lookupCity: vi.fn((query: string) => {
    if (query.toLowerCase() === 'ulaanbaatar') {
      return {
        name: 'Ulaanbaatar',
        country: 'Mongolia',
        latitude: 47.9212,
        longitude: 106.9186,
        timezoneOffset: 8,
      };
    }
    return null;
  }),
}));

const JWT_SECRET = 'register-test-secret';

const baseInput = {
  fullName: 'Test User',
  email: 'new@example.com',
  password: 'secret12',
  birthDate: '1990-06-15',
  birthTime: '14:30',
  birthCity: 'Ulaanbaatar',
};

describe('registerUser', () => {
  let uuidCounter = 0;
  let randomUuidSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    uuidCounter = 0;
    randomUuidSpy = vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `uuid-${++uuidCounter}`);
  });

  afterEach(() => {
    randomUuidSpy.mockRestore();
  });

  it('registers user, profile, chart, and returns JWT with required claims', async () => {
    const { db, insertCalls, setSelectResult } = createDbCapture();
    setSelectResult(undefined);

    const result = await registerUser(db, JWT_SECRET, baseInput);

    expect(result.user).toEqual({
      id: 'uuid-1',
      email: 'new@example.com',
      fullName: 'Test User',
      isPremium: false,
    });
    expect(result.token).toBeTruthy();

    const payload = await verifyToken(JWT_SECRET, result.token);
    expect(payload.userId).toBe('uuid-1');
    expect(payload.email).toBe('new@example.com');
    expect(payload.tokenVersion).toBe(0);
    expect(typeof payload.exp).toBe('number');

    expect(insertCalls.length).toBe(3);
    expect(insertCalls[0]).toMatchObject({
      id: 'uuid-1',
      email: 'new@example.com',
      fullName: 'Test User',
      passwordHash: 'hashed:secret12',
    });
    expect(insertCalls[1]).toMatchObject({
      userId: 'uuid-1',
      birthCity: 'Ulaanbaatar',
      latitude: 47.9212,
      longitude: 106.9186,
      timezoneOffset: 8,
    });
    expect(insertCalls[2]).toMatchObject({
      userId: 'uuid-1',
      sunSign: expect.any(String),
      moonSign: expect.any(String),
    });
  });

  it('rejects duplicate email with 409', async () => {
    const { db, setSelectResult } = createDbCapture();
    setSelectResult({ id: 'existing', email: 'new@example.com' });

    await expect(registerUser(db, JWT_SECRET, baseInput)).rejects.toMatchObject({
      status: 409,
      message: 'Email already registered',
    });
  });

  it('rejects unknown birth city without coordinates', async () => {
    const { db, setSelectResult } = createDbCapture();
    setSelectResult(undefined);

    await expect(
      registerUser(db, JWT_SECRET, {
        ...baseInput,
        birthCity: 'Unknownville',
        latitude: null,
        longitude: null,
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining('Birth city not recognized'),
    });
  });

  it('accepts explicit coordinates without city lookup', async () => {
    const { db, insertCalls, setSelectResult } = createDbCapture();
    setSelectResult(undefined);

    await registerUser(db, JWT_SECRET, {
      ...baseInput,
      birthCity: 'Custom Point',
      latitude: 40.7128,
      longitude: -74.006,
      timezoneOffset: -5,
    });

    expect(insertCalls[1]).toMatchObject({
      birthCity: 'Custom Point',
      latitude: 40.7128,
      longitude: -74.006,
      timezoneOffset: -5,
    });
  });

  it('rejects missing required fields', async () => {
    const { db, setSelectResult } = createDbCapture();
    setSelectResult(undefined);

    await expect(
      registerUser(db, JWT_SECRET, { ...baseInput, birthCity: '' }),
    ).rejects.toBeInstanceOf(HttpError);
  });
});
