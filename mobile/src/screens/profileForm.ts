import type { ProfilePayload } from '@astralis/lib/types';
import { selectedCityMatchesQuery, toSelectedCity, type SelectedCity } from '../lib/city';

export type ProfileDraft = {
  fullName: string;
  email: string;
  zodiacSign: string;
  birthDate: string;
  birthTime: string;
  birthCity: string;
  selectedCity: SelectedCity | null;
  timezone: string;
};

export type ProfileValidation = {
  fullName?: string;
  zodiacSign?: string;
  birthDate?: string;
  birthTime?: string;
  birthCity?: string;
  timezone?: string;
};

export function toProfileDraft(profile: ProfilePayload): ProfileDraft {
  const birth = profile.birthProfile;
  const sign = profile.natalChart?.sunSign ?? 'aries';
  const selectedCity = birth
    ? toSelectedCity({
        name: birth.birthCity,
        country: birth.birthCountry ?? 'Unknown',
        latitude: birth.latitude,
        longitude: birth.longitude,
        timezoneOffset: birth.timezoneOffset,
      })
    : null;
  return {
    fullName: profile.user.fullName ?? '',
    email: profile.user.email ?? '',
    zodiacSign: sign,
    birthDate: birth?.birthDate ?? '',
    birthTime: birth?.birthTime ?? '',
    birthCity: selectedCity?.displayLabel ?? '',
    selectedCity,
    timezone: birth ? String(birth.timezoneOffset) : '',
  };
}

export function validateProfileDraft(draft: ProfileDraft): ProfileValidation {
  const errors: ProfileValidation = {};
  if (!draft.fullName.trim()) errors.fullName = 'Name is required';
  if (!isIsoDate(draft.birthDate)) errors.birthDate = 'Birth date must be YYYY-MM-DD';
  if (draft.birthTime.trim() && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.birthTime.trim())) {
    errors.birthTime = 'Birth time must be HH:MM or blank';
  }
  if (!draft.birthCity.trim()) {
    errors.birthCity = 'Birth city is required';
  } else if (!selectedCityMatchesQuery(draft.selectedCity, draft.birthCity)) {
    errors.birthCity = 'Choose a city from the search results';
  }
  if (draft.timezone.trim().length === 0 || Number.isNaN(Number(draft.timezone))) {
    errors.timezone = 'Timezone is required';
  } else {
    const tz = Number(draft.timezone);
    if (tz < -14 || tz > 14) errors.timezone = 'Timezone must be between -14 and +14';
  }
  return errors;
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === value;
}

