import { describe, expect, it } from 'vitest';
import { buildReflectionAck, isResonance } from './reflectionAck';

describe('buildReflectionAck', () => {
  it('returns a non-empty line for every resonance in every language', () => {
    for (const lang of ['en', 'mn'] as const) {
      for (const resonance of [1, 2, 3] as const) {
        const ack = buildReflectionAck(resonance, lang);
        expect(ack).not.toBeNull();
        expect(ack?.reflection.length).toBeGreaterThan(0);
      }
    }
  });

  it('is deterministic: same inputs produce the same line', () => {
    expect(buildReflectionAck(2, 'en')).toEqual(buildReflectionAck(2, 'en'));
    expect(buildReflectionAck(1, 'mn')).toEqual(buildReflectionAck(1, 'mn'));
  });

  it('varies the line by resonance', () => {
    const one = buildReflectionAck(1, 'en')?.reflection;
    const three = buildReflectionAck(3, 'en')?.reflection;
    expect(one).not.toEqual(three);
  });

  it('falls back to English for an unknown language', () => {
    expect(buildReflectionAck(2, 'fr' as never)).toEqual(buildReflectionAck(2, 'en'));
  });

  it('returns null when there is nothing to acknowledge (invalid resonance)', () => {
    expect(buildReflectionAck(0, 'en')).toBeNull();
    expect(buildReflectionAck(4, 'mn')).toBeNull();
  });

  it('isResonance guards the 1..3 range', () => {
    expect(isResonance(1)).toBe(true);
    expect(isResonance(2.5)).toBe(false);
    expect(isResonance(null)).toBe(false);
  });
});
