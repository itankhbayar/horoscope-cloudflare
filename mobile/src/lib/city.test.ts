import { describe, expect, it } from 'vitest';
import { cityDisplayLabel, missingCityReportUrl, selectedCityMatchesQuery, toSelectedCity } from './city';

const city = {
  name: 'Ulaanbaatar',
  country: 'Mongolia',
  latitude: 47.918,
  longitude: 106.917,
  timezoneOffset: 8,
};

describe('city helpers', () => {
  it('builds a stable display label', () => {
    expect(cityDisplayLabel(city)).toBe('Ulaanbaatar, Mongolia');
    expect(toSelectedCity(city)).toMatchObject({ displayLabel: 'Ulaanbaatar, Mongolia' });
  });

  it('treats edited text as unresolved after selection', () => {
    const selected = toSelectedCity(city);
    expect(selectedCityMatchesQuery(selected, 'Ulaanbaatar, Mongolia')).toBe(true);
    expect(selectedCityMatchesQuery(selected, 'Ulaanbaatar')).toBe(false);
  });

  it('builds a missing-city report link without making the text valid birth data', () => {
    expect(missingCityReportUrl('Atlantis')).toContain('mailto:support@astralis.app');
    expect(decodeURIComponent(missingCityReportUrl('Atlantis'))).toContain('Atlantis');
  });
});
