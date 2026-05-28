export interface CityRecord {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezoneOffset: number;
}

export const CITY_DATABASE: CityRecord[] = [
  { name: 'Ulaanbaatar', country: 'Mongolia', latitude: 47.9212, longitude: 106.9186, timezoneOffset: 8 },
  { name: 'Erdenet', country: 'Mongolia', latitude: 49.0276, longitude: 104.0444, timezoneOffset: 8 },
  { name: 'Darkhan', country: 'Mongolia', latitude: 49.4867, longitude: 105.9228, timezoneOffset: 8 },
  { name: 'Sukhbaatar', country: 'Mongolia', latitude: 50.2364, longitude: 106.2064, timezoneOffset: 8 },
  { name: 'Choibalsan', country: 'Mongolia', latitude: 48.0784, longitude: 114.535, timezoneOffset: 8 },
  { name: 'Murun', country: 'Mongolia', latitude: 49.6356, longitude: 100.1625, timezoneOffset: 8 },
  { name: 'Khovd', country: 'Mongolia', latitude: 48.0056, longitude: 91.6419, timezoneOffset: 7 },
  { name: 'Olgii', country: 'Mongolia', latitude: 48.9683, longitude: 89.9625, timezoneOffset: 7 },
  { name: 'Ulaangom', country: 'Mongolia', latitude: 49.9811, longitude: 92.0667, timezoneOffset: 7 },
  { name: 'Bayankhongor', country: 'Mongolia', latitude: 46.1917, longitude: 100.7178, timezoneOffset: 8 },
  { name: 'Arvaikheer', country: 'Mongolia', latitude: 46.2639, longitude: 102.775, timezoneOffset: 8 },
  { name: 'Tsetserleg', country: 'Mongolia', latitude: 47.475, longitude: 101.4542, timezoneOffset: 8 },
  { name: 'Dalanzadgad', country: 'Mongolia', latitude: 43.5708, longitude: 104.425, timezoneOffset: 8 },
  { name: 'Sainshand', country: 'Mongolia', latitude: 44.8824, longitude: 110.1163, timezoneOffset: 8 },
  { name: 'Zuunmod', country: 'Mongolia', latitude: 47.7069, longitude: 106.9528, timezoneOffset: 8 },
  { name: 'Baruun-Urt', country: 'Mongolia', latitude: 46.6806, longitude: 113.2792, timezoneOffset: 8 },
  { name: 'Altai', country: 'Mongolia', latitude: 46.3722, longitude: 96.2583, timezoneOffset: 7 },
  { name: 'Tokyo', country: 'Japan', latitude: 35.6895, longitude: 139.6917, timezoneOffset: 9 },
  { name: 'Beijing', country: 'China', latitude: 39.9042, longitude: 116.4074, timezoneOffset: 8 },
  { name: 'Seoul', country: 'South Korea', latitude: 37.5665, longitude: 126.978, timezoneOffset: 9 },
  { name: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.006, timezoneOffset: -5 },
  { name: 'Los Angeles', country: 'United States', latitude: 34.0522, longitude: -118.2437, timezoneOffset: -8 },
  { name: 'Chicago', country: 'United States', latitude: 41.8781, longitude: -87.6298, timezoneOffset: -6 },
  { name: 'San Francisco', country: 'United States', latitude: 37.7749, longitude: -122.4194, timezoneOffset: -8 },
  { name: 'London', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278, timezoneOffset: 0 },
  { name: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522, timezoneOffset: 1 },
  { name: 'Berlin', country: 'Germany', latitude: 52.52, longitude: 13.405, timezoneOffset: 1 },
  { name: 'Madrid', country: 'Spain', latitude: 40.4168, longitude: -3.7038, timezoneOffset: 1 },
  { name: 'Rome', country: 'Italy', latitude: 41.9028, longitude: 12.4964, timezoneOffset: 1 },
  { name: 'Moscow', country: 'Russia', latitude: 55.7558, longitude: 37.6173, timezoneOffset: 3 },
  { name: 'Istanbul', country: 'Turkey', latitude: 41.0082, longitude: 28.9784, timezoneOffset: 3 },
  { name: 'Dubai', country: 'United Arab Emirates', latitude: 25.2048, longitude: 55.2708, timezoneOffset: 4 },
  { name: 'Mumbai', country: 'India', latitude: 19.076, longitude: 72.8777, timezoneOffset: 5.5 },
  { name: 'New Delhi', country: 'India', latitude: 28.6139, longitude: 77.209, timezoneOffset: 5.5 },
  { name: 'Bangkok', country: 'Thailand', latitude: 13.7563, longitude: 100.5018, timezoneOffset: 7 },
  { name: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198, timezoneOffset: 8 },
  { name: 'Hong Kong', country: 'Hong Kong', latitude: 22.3193, longitude: 114.1694, timezoneOffset: 8 },
  { name: 'Sydney', country: 'Australia', latitude: -33.8688, longitude: 151.2093, timezoneOffset: 10 },
  { name: 'Melbourne', country: 'Australia', latitude: -37.8136, longitude: 144.9631, timezoneOffset: 10 },
  { name: 'Toronto', country: 'Canada', latitude: 43.6532, longitude: -79.3832, timezoneOffset: -5 },
  { name: 'Vancouver', country: 'Canada', latitude: 49.2827, longitude: -123.1207, timezoneOffset: -8 },
  { name: 'Mexico City', country: 'Mexico', latitude: 19.4326, longitude: -99.1332, timezoneOffset: -6 },
  { name: 'Sao Paulo', country: 'Brazil', latitude: -23.5505, longitude: -46.6333, timezoneOffset: -3 },
  { name: 'Buenos Aires', country: 'Argentina', latitude: -34.6037, longitude: -58.3816, timezoneOffset: -3 },
  { name: 'Cairo', country: 'Egypt', latitude: 30.0444, longitude: 31.2357, timezoneOffset: 2 },
  { name: 'Cape Town', country: 'South Africa', latitude: -33.9249, longitude: 18.4241, timezoneOffset: 2 },
  { name: 'Lagos', country: 'Nigeria', latitude: 6.5244, longitude: 3.3792, timezoneOffset: 1 },
  { name: 'Amsterdam', country: 'Netherlands', latitude: 52.3676, longitude: 4.9041, timezoneOffset: 1 },
  { name: 'Stockholm', country: 'Sweden', latitude: 59.3293, longitude: 18.0686, timezoneOffset: 1 },
  { name: 'Oslo', country: 'Norway', latitude: 59.9139, longitude: 10.7522, timezoneOffset: 1 },
  { name: 'Helsinki', country: 'Finland', latitude: 60.1699, longitude: 24.9384, timezoneOffset: 2 },
  { name: 'Athens', country: 'Greece', latitude: 37.9838, longitude: 23.7275, timezoneOffset: 2 },
  { name: 'Lisbon', country: 'Portugal', latitude: 38.7223, longitude: -9.1393, timezoneOffset: 0 },
];

const CITY_ALIASES = new Map<string, string>([
  ['ulan bator', 'ulaanbaatar'],
  ['ulan-bator', 'ulaanbaatar'],
  ['ulanbator', 'ulaanbaatar'],
  ['ulaan baatar', 'ulaanbaatar'],
  ['ulaan-baatar', 'ulaanbaatar'],
  ['muren', 'murun'],
  ['moron', 'murun'],
  ['olgiy', 'olgii'],
  ['ulgy', 'olgii'],
  ['ulgi', 'olgii'],
  ['ulaan gom', 'ulaangom'],
  ['bayanhongor', 'bayankhongor'],
  ['bayankhongor city', 'bayankhongor'],
  ['arvaiheer', 'arvaikheer'],
  ['arvai kheer', 'arvaikheer'],
  ['dalanzadgad city', 'dalanzadgad'],
  ['sain shand', 'sainshand'],
  ['baruun urt', 'baruun-urt'],
  ['baruunurt', 'baruun-urt'],
]);

function normalizeCityQuery(query: string): string {
  const cityOnly = query.split(',')[0] ?? query;
  const normalized = cityOnly.trim().toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');
  return CITY_ALIASES.get(normalized) ?? normalized;
}

function normalizeComparable(value: string): string {
  return normalizeCityQuery(value).replace(/[^a-z0-9]/g, '');
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);
  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1]! + 1,
        previous[j]! + 1,
        previous[j - 1]! + cost,
      );
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j]!;
  }
  return previous[b.length]!;
}

function cityScore(city: CityRecord, query: string): number {
  const cityName = normalizeComparable(city.name);
  const country = normalizeComparable(city.country);
  const needle = normalizeComparable(query);
  if (!needle) return 0;
  if (cityName === needle) return 100;
  if (cityName.startsWith(needle)) return 90;
  if (cityName.includes(needle) || country.includes(needle)) return 75;
  const distance = editDistance(cityName, needle);
  const typoLimit = needle.length <= 4 ? 1 : 2;
  if (distance <= typoLimit) return 62 - distance;
  return 0;
}

export function lookupCity(query: string): CityRecord | null {
  if (!query) return null;
  const needle = normalizeCityQuery(query);
  if (!needle) return null;
  return (
    searchCities(needle, 1)[0] ??
    null
  );
}

export function searchCities(query: string, limit = 10): CityRecord[] {
  if (!query) return CITY_DATABASE.slice(0, limit);
  const needle = normalizeCityQuery(query);
  return CITY_DATABASE
    .map((city) => ({ city, score: cityScore(city, needle) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.city.name.localeCompare(b.city.name))
    .map(({ city }) => city)
    .slice(0, limit);
}
