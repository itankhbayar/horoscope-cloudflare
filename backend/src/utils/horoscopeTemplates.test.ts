import { describe, expect, it } from 'vitest';
import { computeDailySkySnapshot, computeNatalChart, computeTransitToNatalAspects } from '../services/astrologyService';
import { generateDailyHoroscope } from './horoscopeTemplates';

const chart = computeNatalChart({
  birthDate: '1990-06-15',
  birthTime: '14:30',
  latitude: 47.9212,
  longitude: 106.9186,
  timezoneOffset: 8,
});

describe('generateDailyHoroscope', () => {
  it('uses deterministic real sky context for public readings', () => {
    const sky = computeDailySkySnapshot('2026-05-20');
    const a = generateDailyHoroscope('gemini', '2026-05-20', 'en', { sky });
    const b = generateDailyHoroscope('gemini', '2026-05-20', 'en', { sky });

    expect(a).toEqual(b);
    expect(a.overall).toContain('Today the Sun is in');
    expect(a.overall).toContain('Moon moves through');
    expect(a.skyContext).toMatchObject({
      sunSign: sky.planets.find((p) => p.name === 'Sun')?.sign,
      moonSign: sky.planets.find((p) => p.name === 'Moon')?.sign,
      moonPhase: sky.moonPhase.name,
    });
  });

  it('connects the actual sky to stored natal placements when chart context is present', () => {
    const sky = computeDailySkySnapshot('2026-05-20');
    const transitAspects = computeTransitToNatalAspects(sky.planets, chart.planets);
    const reading = generateDailyHoroscope('gemini', '2026-05-20', 'en', {
      sky,
      natalChart: chart,
      transitAspects,
    });

    expect(reading.overall).toContain('For your Gemini Sun and Pisces Moon');
    expect(reading.overall).toMatch(/natal|No tight major transit/);
    expect(reading.health).toContain('Moon in');
  });

  it('falls back to legacy localized templates when sky context is missing', () => {
    const reading = generateDailyHoroscope('aries', '2026-05-20', 'en');

    expect(reading.skyContext).toBeUndefined();
    expect(reading.overall).not.toContain('Today the Sun is in');
    expect(reading.overall.length).toBeGreaterThan(10);
  });
});
