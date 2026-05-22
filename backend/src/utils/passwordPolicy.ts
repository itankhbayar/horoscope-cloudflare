export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

const PASSWORD_POLICY_ERROR = 'Password does not meet security requirements';

const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  '12345678',
  '123456789',
  'qwerty123',
  'qwertyuiop',
  'letmein',
  'welcome1',
  'admin1234',
  'iloveyou',
  'monkey123',
]);

export type PasswordPolicyResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

function normalizeCommonPasswordCheck(password: string): string {
  return password.trim().toLowerCase().replace(/\s+/g, '');
}

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, error: PASSWORD_POLICY_ERROR };
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, error: PASSWORD_POLICY_ERROR };
  }

  if (COMMON_PASSWORDS.has(normalizeCommonPasswordCheck(password))) {
    return { ok: false, error: PASSWORD_POLICY_ERROR };
  }

  return { ok: true };
}

