import { selectedCityMatchesQuery, type SelectedCity } from '../lib/city';

export type RegisterDraft = {
  fullName: string;
  email: string;
  password: string;
  birthDate: string;
  birthTime: string;
  birthCity: string;
  selectedCity: SelectedCity | null;
  timezoneOffset: string;
  birthDataConsent: boolean;
};

export type RegisterValidation = Partial<Record<keyof RegisterDraft, string>>;

export function initialTimezoneOffset(): string {
  const offsetMinutes = -new Date().getTimezoneOffset();
  const offsetHours = offsetMinutes / 60;
  return Number.isInteger(offsetHours) ? String(offsetHours) : offsetHours.toFixed(2).replace(/\.?0+$/, '');
}

export function deviceTimezoneLabel(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'your device timezone';
  } catch {
    return 'your device timezone';
  }
}

export function validateRegisterDraft(draft: RegisterDraft): RegisterValidation {
  const errors: RegisterValidation = {};
  if (draft.fullName.trim().length < 2) errors.fullName = 'Enter your full name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) errors.email = 'Enter a valid email.';
  if (draft.password.length < 12) errors.password = 'Use at least 12 characters.';
  if (!isIsoDate(draft.birthDate.trim())) errors.birthDate = 'Use YYYY-MM-DD.';
  if (draft.birthTime.trim() && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.birthTime.trim())) {
    errors.birthTime = 'Use 24-hour HH:MM, or leave it blank.';
  }
  if (draft.birthCity.trim().length < 2) {
    errors.birthCity = 'Search and select your birth city.';
  } else if (!selectedCityMatchesQuery(draft.selectedCity, draft.birthCity)) {
    errors.birthCity = 'Choose a city from the search results.';
  }
  const offset = Number(draft.timezoneOffset);
  if (draft.timezoneOffset.trim().length === 0 || Number.isNaN(offset)) {
    errors.timezoneOffset = 'Confirm the UTC offset.';
  } else if (offset < -14 || offset > 14) {
    errors.timezoneOffset = 'UTC offset must be between -14 and +14.';
  }
  if (!draft.birthDataConsent) {
    errors.birthDataConsent = 'Please allow Astralis to use your birth details for this reading. You can delete them later.';
  }
  return errors;
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === value;
}
