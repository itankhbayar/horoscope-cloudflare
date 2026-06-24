import { describe, it, expect } from 'vitest';
import {
  animalFromDate,
  animalFromYear,
  elementFromYear,
  getChineseProfile,
} from './chineseZodiac';

describe('animalFromDate (lunar-new-year boundary)', () => {
  it('uses the previous animal year for dates before Chinese New Year', () => {
    // 1990 CNY is 1990-01-27, so mid-January belongs to the 1989 (Snake) year.
    expect(animalFromDate('1990-01-15')).toBe('snake');
  });

  it('uses the current animal year on/after Chinese New Year', () => {
    expect(animalFromDate('1990-02-10')).toBe('horse');
  });

  it('handles the exact new-year cusp (2024-02-10 = Dragon)', () => {
    expect(animalFromDate('2024-02-10')).toBe('dragon');
    expect(animalFromDate('2024-02-09')).toBe('rabbit');
  });

  it('maps cycle-start years correctly', () => {
    expect(animalFromYear(2020)).toBe('rat');
    expect(animalFromYear(2026)).toBe('horse');
  });
});

describe('elementFromYear (60-year cycle)', () => {
  it('returns Metal/Yang for 2000', () => {
    expect(elementFromYear(2000)).toEqual({ element: 'metal', yinYang: 'yang' });
  });

  it('returns Fire/Yang for 2026', () => {
    expect(elementFromYear(2026)).toEqual({ element: 'fire', yinYang: 'yang' });
  });

  it('returns Wood/Yang for 2024', () => {
    expect(elementFromYear(2024)).toEqual({ element: 'wood', yinYang: 'yang' });
  });
});

describe('getChineseProfile', () => {
  it('combines animal, element, and fixed element', () => {
    const profile = getChineseProfile('2024-06-01');
    expect(profile.animal).toBe('dragon');
    expect(profile.zodiacYear).toBe(2024);
    expect(profile.element).toBe('wood');
    expect(profile.fixedElement).toBe('earth'); // Dragon's permanent element
    expect(profile.yinYang).toBe('yang');
  });
});
