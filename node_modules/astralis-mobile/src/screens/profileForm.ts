import type { ProfilePayload } from '@astralis/lib/types';
import { ZODIAC_SIGNS } from '@astralis/lib/zodiac';

export type ProfileDraft = {
  fullName: string;
  email: string;
  zodiacSign: string;
  birthDate: string;
  timezone: string;
};

export type ProfileValidation = {
  fullName?: string;
  zodiacSign?: string;
  birthDate?: string;
  timezone?: string;
};

export function toProfileDraft(profile: ProfilePayload): ProfileDraft {
  const birth = profile.birthProfile;
  const sign = profile.natalChart?.sunSign ?? 'aries';
  return {
    fullName: profile.user.fullName ?? '',
    email: profile.user.email ?? '',
    zodiacSign: sign,
    birthDate: birth?.birthDate ?? '',
    timezone: birth ? String(birth.timezoneOffset) : '',
  };
}

export function validateProfileDraft(draft: ProfileDraft): ProfileValidation {
  const errors: ProfileValidation = {};
  if (!draft.fullName.trim()) errors.fullName = 'Name is required';
  if (!ZODIAC_SIGNS.some((z) => z.key === draft.zodiacSign)) {
    errors.zodiacSign = 'Zodiac sign is required';
  }
  if (!isIsoDate(draft.birthDate)) errors.birthDate = 'Birth date must be YYYY-MM-DD';
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

