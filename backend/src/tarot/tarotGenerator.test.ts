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

  it('emits richer bilingual card fields with an orientation-aware meaning', async () => {
    // Scan a handful of dates so we exercise both upright and reversed orientations.
    const seen = new Set<string>();
    for (let d = 1; d <= 20 && seen.size < 2; d += 1) {
      const date = `2026-01-${String(d).padStart(2, '0')}`;
      const { payload } = await generateTarotReading('leo', date, 'UTC');
      const card = payload.card_of_the_day;
      expect(card.keywords?.en.length).toBeGreaterThan(0);
      expect(card.keywords?.mn.length).toBe(card.keywords?.en.length);
      expect(card.description?.en && card.description?.mn).toBeTruthy();
      // meaning must track orientation: same shape as a non-empty bilingual block.
      expect(card.meaning?.en && card.meaning?.mn).toBeTruthy();
      seen.add(card.orientation);
    }
    expect(seen.size).toBe(2);
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
