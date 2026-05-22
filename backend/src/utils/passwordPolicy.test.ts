import { describe, expect, it } from 'vitest';
import { PASSWORD_MAX_LENGTH, validatePasswordPolicy } from './passwordPolicy';

describe('validatePasswordPolicy', () => {
  it('requires at least 8 characters', () => {
    expect(validatePasswordPolicy('secret1').ok).toBe(false);
    expect(validatePasswordPolicy('secret12').ok).toBe(true);
  });

  it('rejects passwords longer than 128 characters', () => {
    expect(validatePasswordPolicy('a'.repeat(PASSWORD_MAX_LENGTH)).ok).toBe(true);
    expect(validatePasswordPolicy('a'.repeat(PASSWORD_MAX_LENGTH + 1)).ok).toBe(false);
  });

  it('allows passphrases with spaces without complexity requirements', () => {
    expect(validatePasswordPolicy('correct horse battery staple')).toEqual({ ok: true });
  });

  it('rejects small common-password denylist entries', () => {
    expect(validatePasswordPolicy('password').ok).toBe(false);
    expect(validatePasswordPolicy('12345678').ok).toBe(false);
    expect(validatePasswordPolicy('qwerty123').ok).toBe(false);
  });
});

