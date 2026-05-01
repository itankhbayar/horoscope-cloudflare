import { describe, expect, it } from 'vitest';
import { generateTarotReading } from './tarotEngine';
import { validateTarotPayload } from './tarotValidator';
import { tarotSeedBytes } from './tarotSeed';

describe('generateTarotReading', () => {
  it('is deterministic for the same inputs', async () => {
    const a = await generateTarotReading('leo', '2026-05-01', 'Asia/Ulaanbaatar');
    const b = await generateTarotReading('leo', '2026-05-01', 'Asia/Ulaanbaatar');
    expect(a.energyScore).toBe(b.energyScore);
    expect(a.payload).toEqual(b.payload);
  });

  it('always passes validateTarotPayload', async () => {
    const { payload } = await generateTarotReading('aries', '2026-01-02', 'UTC');
    const v = validateTarotPayload(payload);
    expect(v.ok).toBe(true);
  });
});

function hex(u: Uint8Array): string {
  return [...u].map((b) => b.toString(16).padStart(2, '0')).join('');
}

describe('tarotSeedBytes', () => {
  it('is stable across calls', async () => {
    const a = await tarotSeedBytes('taurus', '2026-03-15', 'Europe/London');
    const b = await tarotSeedBytes('taurus', '2026-03-15', 'Europe/London');
    expect(hex(a)).toBe(hex(b));
  });
});
