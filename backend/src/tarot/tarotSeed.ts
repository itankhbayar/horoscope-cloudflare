/**
 * Stable seed for deterministic tarot: SHA-256 over `v1` + sign + date + timezone.
 * Same inputs always yield the same hash bytes (and thus the same reading).
 */
export async function tarotSeedBytes(sign: string, date: string, timezone: string): Promise<Uint8Array> {
  const input = `v1${sign}${date}${timezone}`;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return new Uint8Array(buf);
}

/** Deterministic 32-bit unsigned int from seed bytes at a logical slot (wraps). */
export function seedUint32(bytes: Uint8Array, slot: number): number {
  const o = (slot * 4) % Math.max(1, bytes.length - 3);
  const b0 = bytes[o] ?? 0;
  const b1 = bytes[o + 1] ?? 0;
  const b2 = bytes[o + 2] ?? 0;
  const b3 = bytes[o + 3] ?? 0;
  return (b0 * 0x1000000 + b1 * 0x10000 + b2 * 0x100 + b3) >>> 0;
}
