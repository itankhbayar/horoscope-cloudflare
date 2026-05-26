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

  it('handles small Mongolian city anchors', () => {
    expect(searchCities('Erdenet')[0]).toMatchObject({ name: 'Erdenet', country: 'Mongolia' });
    expect(searchCities('Muren')[0]).toMatchObject({ name: 'Murun', country: 'Mongolia' });
  });

  it('tolerates short typos without returning unrelated cities first', () => {
    expect(searchCities('Ulaanbatar')[0]).toMatchObject({ name: 'Ulaanbaatar' });
    expect(searchCities('Darkan')[0]).toMatchObject({ name: 'Darkhan' });
  });
});
