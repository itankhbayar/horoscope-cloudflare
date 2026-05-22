const textEncoder = new TextEncoder();

/**
 * Constant-time comparison for secret strings (e.g. admin API keys).
 * Avoids early exits on length or content differences.
 */
export function secureSecretEqual(
  provided: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  const providedValue = typeof provided === 'string' ? provided : '';
  const expectedValue = typeof expected === 'string' ? expected : '';
  const providedBytes = textEncoder.encode(providedValue);
  const expectedBytes = textEncoder.encode(expectedValue);
  const maxLength = Math.max(providedBytes.byteLength, expectedBytes.byteLength);

  let diff = providedBytes.byteLength ^ expectedBytes.byteLength;
  for (let i = 0; i < maxLength; i += 1) {
    diff |= (providedBytes[i] ?? 0) ^ (expectedBytes[i] ?? 0);
  }

  return diff === 0 && providedValue.length > 0 && expectedValue.length > 0;
}
