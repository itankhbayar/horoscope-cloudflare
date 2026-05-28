import { describe, expect, it } from 'vitest';
import {
  createCompatibilityShareRef,
  isValidCompatibilityShareRef,
  parseShareRefFromQuery,
} from '@astralis/lib/compatibilityShareRef';
import { buildCompatibilityShareUrl } from '@astralis/lib/compatibilityShareCard';

describe('compatibilityShareRef', () => {
  it('creates and validates opaque share refs', () => {
    const ref = createCompatibilityShareRef();
    expect(ref.startsWith('shr_')).toBe(true);
    expect(isValidCompatibilityShareRef(ref)).toBe(true);
    expect(isValidCompatibilityShareRef('user-123')).toBe(false);
  });

  it('parses share_ref from query objects', () => {
    const ref = createCompatibilityShareRef();
    expect(parseShareRefFromQuery({ share_ref: ref })).toBe(ref);
    expect(parseShareRefFromQuery({ share_ref: 'bad' })).toBeNull();
  });

  it('appends share_ref to compatibility share URLs', () => {
    const ref = createCompatibilityShareRef();
    const url = buildCompatibilityShareUrl('leo', 'aquarius', 78, {
      appUrl: 'https://example.com',
      shareRef: ref,
    });
    expect(url).toContain(`share_ref=${ref}`);
    expect(url).toContain('utm_source=compatibility_share');
  });
});
