import { describe, expect, it } from 'vitest';
import { normalizeCitySearchQuery, pickBestCityMatch } from './citySearch';
import type { City } from './types';

const ulaanbaatar: City = {
  name: 'Ulaanbaatar',
  country: 'Mongolia',
  latitude: 47.9212,
  longitude: 106.9186,
  timezoneOffset: 8,
};

const erdenet: City = {
  name: 'Erdenet',
  country: 'Mongolia',
  latitude: 49.0276,
  longitude: 104.0444,
  timezoneOffset: 8,
};

describe('normalizeCitySearchQuery', () => {
  it('strips country suffix', () => {
    expect(normalizeCitySearchQuery('Ulaanbaatar, Mongolia')).toBe('Ulaanbaatar');
  });

  it('collapses whitespace', () => {
    expect(normalizeCitySearchQuery('  Ulaan   baatar  ')).toBe('Ulaan baatar');
  });
});

describe('pickBestCityMatch', () => {
  it('returns exact name match among many', () => {
    expect(pickBestCityMatch([erdenet, ulaanbaatar], 'Ulaanbaatar, Mongolia')).toEqual(ulaanbaatar);
  });

  it('returns sole result', () => {
    expect(pickBestCityMatch([ulaanbaatar], 'Ulaan')).toEqual(ulaanbaatar);
  });

  it('returns null when ambiguous', () => {
    expect(pickBestCityMatch([erdenet, ulaanbaatar], 'Mongolia')).toBeNull();
  });
});
