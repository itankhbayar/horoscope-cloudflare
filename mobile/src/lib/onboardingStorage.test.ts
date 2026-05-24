import { describe, expect, it } from 'vitest';
import { onboardingKey } from './onboardingStorage';

describe('onboardingKey', () => {
  it('scopes completion to the authenticated user', () => {
    expect(onboardingKey('user-123')).toBe('onboarding:completed:user-123');
  });
});
