import { describe, expect, it } from 'vitest';
import { lookupCity, searchCities } from './cities';

describe('lookupCity', () => {
  it('recognizes Ulaanbaatar by exact name', () => {
    expect(lookupCity('Ulaanbaatar')).toMatchObject({
      name: 'Ulaanbaatar',
      country: 'Mongolia',
      timezoneOffset: 8,
    });
  });

  it('recognizes Ulaanbaatar with country suffix', () => {
    expect(lookupCity('Ulaanbaatar, Mongolia')).toMatchObject({
      name: 'Ulaanbaatar',
      country: 'Mongolia',
    });
  });

  it('recognizes common Ulaanbaatar aliases', () => {
    expect(lookupCity('Ulan Bator')).toMatchObject({ name: 'Ulaanbaatar' });
    expect(lookupCity('Ulaan Baatar')).toMatchObject({ name: 'Ulaanbaatar' });
  });
});

describe('searchCities', () => {
  it('returns Ulaanbaatar for common aliases', () => {
    expect(searchCities('Ulan Bator')[0]).toMatchObject({ name: 'Ulaanbaatar' });
  });
});

