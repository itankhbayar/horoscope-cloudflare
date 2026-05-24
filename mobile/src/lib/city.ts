import type { City } from '@astralis/lib/types';

export type SelectedCity = City & {
  displayLabel: string;
};

export function cityDisplayLabel(city: City): string {
  return `${city.name}, ${city.country}`;
}

export function toSelectedCity(city: City): SelectedCity {
  return {
    ...city,
    displayLabel: cityDisplayLabel(city),
  };
}

export function selectedCityMatchesQuery(city: SelectedCity | null, query: string): boolean {
  if (!city) return false;
  return city.displayLabel.trim().toLowerCase() === query.trim().toLowerCase();
}

export function missingCityReportUrl(query: string): string {
  const trimmed = query.trim();
  const params = new URLSearchParams({
    subject: 'Missing birth city',
    body: trimmed.length > 0
      ? `I could not find this birth city in Astralis: ${trimmed}`
      : 'I could not find my birth city in Astralis.',
  });
  return `mailto:support@astralis.app?${params.toString()}`;
}
