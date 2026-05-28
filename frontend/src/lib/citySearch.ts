import type { City } from './types';

/** Strip country suffix and extra whitespace before city API search. */
export function normalizeCitySearchQuery(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const cityPart = trimmed.split(',')[0]?.trim() ?? trimmed;
  return cityPart.replace(/\s+/g, ' ');
}

function comparableCityName(value: string): string {
  return normalizeCitySearchQuery(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Pick a single city when the query clearly matches one result. */
export function pickBestCityMatch(cities: City[], rawQuery: string): City | null {
  if (!cities.length) return null;
  const query = normalizeCitySearchQuery(rawQuery);
  if (!query) return null;
  const needle = comparableCityName(query);
  const exact = cities.find((city) => comparableCityName(city.name) === needle);
  if (exact) return exact;
  if (cities.length === 1) return cities[0]!;
  const startsWith = cities.filter((city) =>
    comparableCityName(city.name).startsWith(needle),
  );
  if (startsWith.length === 1) return startsWith[0]!;
  return null;
}
