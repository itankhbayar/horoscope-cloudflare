import { describe, expect, it } from 'vitest';
import type { ProfilePayload } from '@astralis/lib/types';
import { toProfileDraft, validateProfileDraft } from './profileForm';

const sampleProfile: ProfilePayload = {
  user: {
    id: 'u1',
    email: 'user@example.com',
    fullName: 'Luna Tester',
    isPremium: false,
  },
  birthProfile: {
    id: 'b1',
    userId: 'u1',
    birthDate: '1995-06-12',
    birthTime: null,
    birthCity: 'Ulaanbaatar',
    birthCountry: 'Mongolia',
    latitude: 47.9,
    longitude: 106.9,
    timezoneOffset: 8,
    createdAt: '2026-01-01',
  },
  natalChart: {
    id: 'n1',
    userId: 'u1',
    sunSign: 'gemini',
    moonSign: 'aries',
    risingSign: null,
    planets: [],
    houses: [],
    aspects: [],
    computedAt: '2026-01-01',
    sunInfo: {
      key: 'gemini',
      name: 'Gemini',
      symbol: '♊',
      element: 'air',
      modality: 'mutable',
      rulingPlanet: 'Mercury',
      startMonth: 5,
      startDay: 21,
    },
    moonInfo: {
      key: 'aries',
      name: 'Aries',
      symbol: '♈',
      element: 'fire',
      modality: 'cardinal',
      rulingPlanet: 'Mars',
      startMonth: 3,
      startDay: 21,
    },
    risingInfo: null,
  },
};

describe('profileForm', () => {
  it('renders existing profile data into draft model', () => {
    const draft = toProfileDraft(sampleProfile);
    expect(draft.fullName).toBe('Luna Tester');
    expect(draft.email).toBe('user@example.com');
    expect(draft.zodiacSign).toBe('gemini');
    expect(draft.birthDate).toBe('1995-06-12');
    expect(draft.birthTime).toBe('');
    expect(draft.birthCity).toBe('Ulaanbaatar, Mongolia');
    expect(draft.selectedCity).toMatchObject({ name: 'Ulaanbaatar', country: 'Mongolia' });
    expect(draft.timezone).toBe('8');
  });

  it('returns no errors for valid data (save path)', () => {
    const errors = validateProfileDraft({
      fullName: 'Luna Tester',
      email: 'user@example.com',
      zodiacSign: 'gemini',
      birthDate: '1995-06-12',
      birthTime: '',
      birthCity: 'Ulaanbaatar, Mongolia',
      selectedCity: {
        name: 'Ulaanbaatar',
        country: 'Mongolia',
        latitude: 47.9,
        longitude: 106.9,
        timezoneOffset: 8,
        displayLabel: 'Ulaanbaatar, Mongolia',
      },
      timezone: '+8',
    });
    expect(errors).toEqual({});
  });

  it('returns validation errors for invalid data', () => {
    const errors = validateProfileDraft({
      fullName: '',
      email: 'user@example.com',
      zodiacSign: '',
      birthDate: '1995/06/12',
      birthTime: '28:10',
      birthCity: '',
      selectedCity: null,
      timezone: '',
    });
    expect(errors.fullName).toBeTruthy();
    expect(errors.birthDate).toBeTruthy();
    expect(errors.birthTime).toBeTruthy();
    expect(errors.birthCity).toBeTruthy();
    expect(errors.timezone).toBeTruthy();
  });

  it('cancel behavior can restore old values by re-hydrating from source profile', () => {
    const original = toProfileDraft(sampleProfile);
    const edited = { ...original, fullName: 'Edited Name' };
    expect(edited.fullName).toBe('Edited Name');
    const restored = toProfileDraft(sampleProfile);
    expect(restored.fullName).toBe('Luna Tester');
  });
});

