import { describe, expect, it } from 'vitest';
import { getMoment, getScreenPurpose, shouldCompressExplanations, visibleMomentLimit } from './emotionalScreenHierarchy';

describe('emotional screen hierarchy', () => {
  it('defines a single purpose and action limit for major screens', () => {
    const guest = getScreenPurpose('guest_welcome');
    const premium = getScreenPurpose('premium');

    expect(guest.primaryAction).toBe('enter ritual');
    expect(guest.avoid).toContain('dense explanation');
    expect(premium.purpose).toBe('private continuity');
    expect(visibleMomentLimit(guest.moment)).toBe(1);
  });

  it('models moments as focused emotional surfaces', () => {
    expect(getMoment('archive_revisit').focus).toContain('emotional memory');
    expect(getMoment('premium_continuity').textStrategy).toBe('progressive');
  });

  it('compresses explanations for returning, ambient, reduced-motion, or established ritual users', () => {
    expect(shouldCompressExplanations({ returningUser: false, ambientMode: false, reducedMotion: false, ritualNights: 0 })).toBe(false);
    expect(shouldCompressExplanations({ returningUser: true, ambientMode: false, reducedMotion: false, ritualNights: 0 })).toBe(true);
    expect(shouldCompressExplanations({ returningUser: false, ambientMode: true, reducedMotion: false, ritualNights: 0 })).toBe(true);
    expect(shouldCompressExplanations({ returningUser: false, ambientMode: false, reducedMotion: false, ritualNights: 3 })).toBe(true);
  });
});
