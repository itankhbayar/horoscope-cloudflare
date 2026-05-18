const textEncoder = new TextEncoder();

/**
 * Constant-time comparison for secret strings (e.g. admin API keys).
 * Uses Web Crypto `timingSafeEqual` to avoid timing side channels.
 */
export function secureSecretEqual(provided: string, expected: string): boolean {
  const providedBytes = textEncoder.encode(provided);
  const expectedBytes = textEncoder.encode(expected);
  if (providedBytes.byteLength !== expectedBytes.byteLength) {
    return false;
  }
  return crypto.subtle.timingSafeEqual(providedBytes, expectedBytes);
}
