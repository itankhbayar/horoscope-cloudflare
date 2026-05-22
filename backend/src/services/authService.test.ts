import { describe, expect, it } from 'vitest';
import { sign as signJwt } from 'hono/jwt';
import {
  getPayloadTokenVersion,
  isTokenVersionValid,
  issueToken,
  loginUser,
  verifyToken,
  verifyTokenForUser,
} from './authService';

const SECRET = 'test-jwt-secret';

describe('getPayloadTokenVersion', () => {
  it('returns explicit tokenVersion from payload', () => {
    expect(getPayloadTokenVersion({ tokenVersion: 3 } as any)).toBe(3);
  });

  it('treats missing or invalid tokenVersion as 0', () => {
    expect(getPayloadTokenVersion({} as any)).toBe(0);
    expect(getPayloadTokenVersion({ tokenVersion: -1 } as any)).toBe(0);
    expect(getPayloadTokenVersion({ tokenVersion: 1.5 } as any)).toBe(0);
  });
});

describe('isTokenVersionValid', () => {
  it('accepts matching versions', () => {
    expect(isTokenVersionValid({ tokenVersion: 2 } as any, { tokenVersion: 2 } as any)).toBe(true);
  });

  it('rejects stale tokens after logout bump', () => {
    expect(isTokenVersionValid({ tokenVersion: 1 } as any, { tokenVersion: 0 } as any)).toBe(false);
  });

  it('rejects when user is missing', () => {
    expect(isTokenVersionValid(null, { tokenVersion: 0 } as any)).toBe(false);
  });
});

describe('issueToken', () => {
  it('embeds tokenVersion in the JWT', async () => {
    const token = await issueToken(SECRET, 'user-1', 'a@b.com', 4);
    const payload = await verifyToken(SECRET, token);
    expect(payload.userId).toBe('user-1');
    expect(payload.tokenVersion).toBe(4);
  });
});

describe('verifyTokenForUser', () => {
  it('rejects tokens issued before token_version increment', async () => {
    const token = await signJwt(
      {
        userId: 'user-1',
        email: 'a@b.com',
        tokenVersion: 0,
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      SECRET,
    );

    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            get: async () => ({ id: 'user-1', email: 'a@b.com', tokenVersion: 1 }),
          }),
        }),
      }),
    } as any;

    await expect(verifyTokenForUser(db, SECRET, token)).rejects.toThrow();
  });

  it('accepts tokens with the current token_version', async () => {
    const token = await issueToken(SECRET, 'user-1', 'a@b.com', 2);

    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            get: async () => ({ id: 'user-1', email: 'a@b.com', tokenVersion: 2 }),
          }),
        }),
      }),
    } as any;

    const session = await verifyTokenForUser(db, SECRET, token);
    expect(session.userId).toBe('user-1');
  });
});

describe('loginUser deleted account behavior', () => {
  it('rejects login when the account row has been deleted', async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            get: async () => undefined,
          }),
        }),
      }),
    } as any;

    await expect(
      loginUser(db, SECRET, { email: 'deleted@example.com', password: 'correct-password' }),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Invalid email or password',
    });
  });
});
