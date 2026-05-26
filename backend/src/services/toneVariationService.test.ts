import { describe, expect, it } from 'vitest';
import { applyToneCadence, toneVariationFor } from './toneVariationService';

describe('tone variation engine', () => {
  it('is deterministic but changes across dates', () => {
    const a = toneVariationFor('2026-05-25', 'scorpio', 'Waxing Gibbous');
    const b = toneVariationFor('2026-05-25', 'scorpio', 'Waxing Gibbous');
    const c = toneVariationFor('2026-05-26', 'scorpio', 'Waxing Gibbous');

    expect(a).toEqual(b);
    expect(c).not.toEqual(a);
  });

  it('varies cadence without adding mystical cliches', () => {
    const variation = toneVariationFor('2026-05-25', 'gemini', 'Full Moon');
    const copy = applyToneCadence('Gemini energy may notice pressure tonight, especially where honesty is unfinished.', variation);

    expect(copy).not.toMatch(/universe rewards|manifest|destiny|vibration/i);
  });
});
