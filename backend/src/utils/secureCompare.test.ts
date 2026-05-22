import { describe, expect, it } from 'vitest';
import { secureSecretEqual } from './secureCompare';

describe('secureSecretEqual', () => {
  it('returns true for an exact match', () => {
    expect(secureSecretEqual('my-admin-secret', 'my-admin-secret')).toBe(true);
  });

  it('returns false for a wrong value', () => {
    expect(secureSecretEqual('wrong-admin-secret', 'my-admin-secret')).toBe(false);
  });

  it('returns false for a prefix value', () => {
    expect(secureSecretEqual('my-admin', 'my-admin-secret')).toBe(false);
  });

  it('returns false for a longer value', () => {
    expect(secureSecretEqual('my-admin-secret-extra', 'my-admin-secret')).toBe(false);
  });

  it('returns false for an empty value', () => {
    expect(secureSecretEqual('', 'my-admin-secret')).toBe(false);
  });

  it('returns false for a missing value', () => {
    expect(secureSecretEqual(undefined, 'my-admin-secret')).toBe(false);
  });
});
