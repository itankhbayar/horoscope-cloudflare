import type { AppBindings } from '../types';

const HIBP_RANGE_API = 'https://api.pwnedpasswords.com/range';
const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

export type BreachedPasswordCheckResult =
  | { status: 'disabled' }
  | { status: 'safe' }
  | { status: 'breached' }
  | { status: 'unavailable' };

type BreachedPasswordOptions = {
  enabled?: boolean;
  failClosed?: boolean;
  fetcher?: typeof fetch;
};

function flagEnabled(value: string | undefined): boolean {
  return value ? TRUE_VALUES.has(value.trim().toLowerCase()) : false;
}

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

export async function sha1Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-1', encoded);
  return bytesToHex(digest);
}

export async function checkBreachedPassword(
  password: string,
  options: BreachedPasswordOptions = {},
): Promise<BreachedPasswordCheckResult> {
  if (!options.enabled) return { status: 'disabled' };

  try {
    const hash = await sha1Hex(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    const fetcher = options.fetcher ?? fetch;
    const response = await fetcher(`${HIBP_RANGE_API}/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
    });

    if (!response.ok) {
      return options.failClosed ? { status: 'unavailable' } : { status: 'safe' };
    }

    const body = await response.text();
    const breached = body
      .split(/\r?\n/)
      .some((line) => line.split(':', 1)[0]?.trim().toUpperCase() === suffix);

    return breached ? { status: 'breached' } : { status: 'safe' };
  } catch {
    return options.failClosed ? { status: 'unavailable' } : { status: 'safe' };
  }
}

export function breachedPasswordOptionsFromEnv(
  env: Pick<AppBindings, 'PWNED_PASSWORD_CHECK_ENABLED' | 'PWNED_PASSWORD_FAIL_CLOSED'>,
): BreachedPasswordOptions {
  return {
    enabled: flagEnabled(env.PWNED_PASSWORD_CHECK_ENABLED),
    failClosed: flagEnabled(env.PWNED_PASSWORD_FAIL_CLOSED),
  };
}

