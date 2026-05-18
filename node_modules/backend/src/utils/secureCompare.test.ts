import { describe, expect, it } from 'vitest';
import { secureSecretEqual } from './secureCompare';

describe('secureSecretEqual', () => {
  it('returns true for matching secrets', () => {
    expect(secureSecretEqual('my-admin-secret', 'my-admin-secret')).toBe(true);
  });

  it('returns false for mismatched secrets of equal length', () => {
    expect(secureSecretEqual('aaaaaaaa', 'bbbbbbbb')).toBe(false);
  });

  it('returns false when lengths differ', () => {
    expect(secureSecretEqual('short', 'much-longer-secret')).toBe(false);
  });

  it('returns false for empty vs non-empty', () => {
    expect(secureSecretEqual('', 'x')).toBe(false);
  });
});
