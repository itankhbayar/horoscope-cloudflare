import { describe, expect, it } from 'vitest';
import { daysSinceSignup, firstRevealEventProps } from './activationMilestone';

const NOW = Date.parse('2026-06-10T00:00:00.000Z');

describe('daysSinceSignup', () => {
  it('computes whole days from signup', () => {
    expect(daysSinceSignup('2026-06-03T00:00:00.000Z', NOW)).toBe(7);
  });

  it('never returns negative for future-dated signups', () => {
    expect(daysSinceSignup('2026-06-20T00:00:00.000Z', NOW)).toBe(0);
  });

  it('returns undefined when createdAt is missing or unparseable', () => {
    expect(daysSinceSignup(undefined, NOW)).toBeUndefined();
    expect(daysSinceSignup(null, NOW)).toBeUndefined();
    expect(daysSinceSignup('not-a-date', NOW)).toBeUndefined();
  });
});

describe('firstRevealEventProps — fires exactly once, gated by the server flag', () => {
  it('returns props for the first reveal (server flag true)', () => {
    const props = firstRevealEventProps({
      firstHoroscopeReveal: true,
      sign: 'leo',
      platform: 'ios',
      createdAt: '2026-06-03T00:00:00.000Z',
      now: NOW,
    });
    expect(props).toEqual({ sign: 'leo', platform: 'ios', days_since_signup: 7 });
  });

  it('returns null on a second reveal (server flag false) — event must not fire', () => {
    expect(
      firstRevealEventProps({ firstHoroscopeReveal: false, sign: 'leo', platform: 'ios' }),
    ).toBeNull();
  });

  it('returns null when the flag is absent (e.g. reveal on another device)', () => {
    expect(firstRevealEventProps({ platform: 'android' })).toBeNull();
  });

  it('omits optional fields that are unavailable', () => {
    expect(firstRevealEventProps({ firstHoroscopeReveal: true, platform: 'web' })).toEqual({
      platform: 'web',
    });
  });
});
