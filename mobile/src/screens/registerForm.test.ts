import { describe, expect, it } from 'vitest';
import { toSelectedCity } from '../lib/city';
import { validateRegisterDraft, type RegisterDraft } from './registerForm';

const selectedCity = toSelectedCity({
  name: 'Ulaanbaatar',
  country: 'Mongolia',
  latitude: 47.918,
  longitude: 106.917,
  timezoneOffset: 8,
});

const validDraft: RegisterDraft = {
  fullName: 'Mira Sol',
  email: 'mira@example.com',
  password: 'long-enough-password',
  birthDate: '1994-04-21',
  birthTime: '08:30',
  birthCity: selectedCity.displayLabel,
  selectedCity,
  timezoneOffset: '8',
  birthDataConsent: true,
};

describe('validateRegisterDraft', () => {
  it('accepts a complete astrology onboarding payload', () => {
    expect(validateRegisterDraft(validDraft)).toEqual({});
  });

  it('requires consent and a real timezone offset', () => {
    const errors = validateRegisterDraft({
      ...validDraft,
      timezoneOffset: '18',
      birthDataConsent: false,
    });

    expect(errors.timezoneOffset).toBe('UTC offset must be between -14 and +14.');
    expect(errors.birthDataConsent).toBe('Please allow Astralis to use your birth details for this reading. You can delete them later.');
  });

  it('allows birth time to be omitted but validates malformed values', () => {
    expect(validateRegisterDraft({ ...validDraft, birthTime: '' }).birthTime).toBeUndefined();
    expect(validateRegisterDraft({ ...validDraft, birthTime: '25:99' }).birthTime).toBe(
      'Use 24-hour HH:MM, or leave it blank.',
    );
  });

  it('rejects unresolved city text', () => {
    expect(validateRegisterDraft({ ...validDraft, birthCity: 'Ulaanbaatar', selectedCity: null }).birthCity).toBe(
      'Choose a city from the search results.',
    );
    expect(validateRegisterDraft({ ...validDraft, birthCity: 'Ulaanbaatar' }).birthCity).toBe(
      'Choose a city from the search results.',
    );
  });
});
