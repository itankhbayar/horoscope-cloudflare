import { describe, expect, it } from 'vitest';
import { parseLang } from './lang';

describe('parseLang', () => {
  it('parses bare mn and en', () => {
    expect(parseLang('mn')).toBe('mn');
    expect(parseLang('EN')).toBe('en');
  });

  it('parses BCP47 primary tags', () => {
    expect(parseLang('mn-MN')).toBe('mn');
    expect(parseLang('en-US')).toBe('en');
  });

  it('parses Accept-Language style lists', () => {
    expect(parseLang('mn-MN,en;q=0.9')).toBe('mn');
    expect(parseLang('en-GB,mn;q=0.2')).toBe('en');
  });

  it('defaults for unknown tags', () => {
    expect(parseLang('fr-FR')).toBe('en');
    expect(parseLang('')).toBe('en');
    expect(parseLang(undefined)).toBe('en');
  });
});
