import { describe, expect, it, vi } from 'vitest';
import {
  breachedPasswordOptionsFromEnv,
  checkBreachedPassword,
  sha1Hex,
} from './breachedPasswordService';

describe('sha1Hex', () => {
  it('returns an uppercase SHA-1 hash', async () => {
    await expect(sha1Hex('password')).resolves.toBe('5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8');
  });
});

describe('checkBreachedPassword', () => {
  it('is disabled unless explicitly enabled', async () => {
    const fetcher = vi.fn();

    await expect(checkBreachedPassword('passphrase', { fetcher })).resolves.toEqual({
      status: 'disabled',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('sends only the first five hash characters and matches suffixes locally', async () => {
    const hash = await sha1Hex('correct horse battery staple');
    const fetcher = vi.fn(async () => new Response(`${hash.slice(5)}:42\r\nABCDEF:1`));

    await expect(
      checkBreachedPassword('correct horse battery staple', { enabled: true, fetcher }),
    ).resolves.toEqual({ status: 'breached' });

    expect(fetcher).toHaveBeenCalledWith(
      `https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`,
      expect.any(Object),
    );
  });

  it('does not fail closed unless configured', async () => {
    const fetcher = vi.fn(async () => new Response('', { status: 503 }));

    await expect(checkBreachedPassword('passphrase', { enabled: true, fetcher })).resolves.toEqual({
      status: 'safe',
    });
    await expect(
      checkBreachedPassword('passphrase', { enabled: true, failClosed: true, fetcher }),
    ).resolves.toEqual({ status: 'unavailable' });
  });
});

describe('breachedPasswordOptionsFromEnv', () => {
  it('requires explicit flags', () => {
    expect(breachedPasswordOptionsFromEnv({})).toEqual({ enabled: false, failClosed: false });
    expect(
      breachedPasswordOptionsFromEnv({
        PWNED_PASSWORD_CHECK_ENABLED: 'true',
        PWNED_PASSWORD_FAIL_CLOSED: '1',
      }),
    ).toEqual({ enabled: true, failClosed: true });
  });
});

