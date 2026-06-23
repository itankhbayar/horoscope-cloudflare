import { describe, expect, it } from 'vitest';
import { resolveModeNavigation, ZODIAC_TODAY } from './zodiacModeRoutes';

describe('resolveModeNavigation', () => {
  it('maps western feature pages to their chinese counterparts', () => {
    expect(resolveModeNavigation('/today', 'chinese')).toBe('/chinese/today');
    expect(resolveModeNavigation('/compatibility', 'chinese')).toBe('/chinese/compatibility');
    expect(resolveModeNavigation('/chart', 'chinese')).toBe('/chinese/chart');
  });

  it('maps chinese feature pages back to their western counterparts', () => {
    expect(resolveModeNavigation('/chinese/today', 'western')).toBe('/today');
    expect(resolveModeNavigation('/chinese/compatibility', 'western')).toBe('/compatibility');
    expect(resolveModeNavigation('/chinese/chart', 'western')).toBe('/chart');
  });

  it('sends western-only Tarot to the target mode Today when going Chinese', () => {
    expect(resolveModeNavigation('/tarot', 'chinese')).toBe('/chinese/today');
  });

  it('stays put on mode-agnostic pages (Premium, Profile)', () => {
    expect(resolveModeNavigation('/premium', 'chinese')).toBeNull();
    expect(resolveModeNavigation('/profile', 'chinese')).toBeNull();
    expect(resolveModeNavigation('/premium', 'western')).toBeNull();
  });

  it('stays put on unknown/deep-link pages', () => {
    expect(resolveModeNavigation('/horoscope/aries', 'chinese')).toBeNull();
    expect(resolveModeNavigation('/privacy', 'western')).toBeNull();
  });

  it('exposes the Today path per mode', () => {
    expect(ZODIAC_TODAY.western).toBe('/today');
    expect(ZODIAC_TODAY.chinese).toBe('/chinese/today');
  });
});
