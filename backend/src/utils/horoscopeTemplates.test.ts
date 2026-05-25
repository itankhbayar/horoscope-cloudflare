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
    expect(a.overall).toContain('The Sun in');
    expect(a.overall).toContain('Moon in');
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
    expect(reading.overall).toMatch(/Timing cue:|natal/);
    expect(reading.health).toContain('Moon in');
    expect(reading.love).toMatch(/tone|texts|partnership|connection|approval|safety|trust|friends|home|desire|worth|privacy/);
  });

  it('falls back to legacy localized templates when sky context is missing', () => {
    const reading = generateDailyHoroscope('aries', '2026-05-20', 'en');

    expect(reading.skyContext).toBeUndefined();
    expect(reading.overall).not.toContain('Today the Sun is in');
    expect(reading.overall.length).toBeGreaterThan(10);
  });

  it('keeps sky-aware English copy away from repetitive generic advice phrases', () => {
    const sky = computeDailySkySnapshot('2026-05-20');
    const transitAspects = computeTransitToNatalAspects(sky.planets, chart.planets);
    const reading = generateDailyHoroscope('gemini', '2026-05-20', 'en', {
      sky,
      natalChart: chart,
      transitAspects,
    });
    const copy = [reading.overall, reading.love, reading.career, reading.health].join(' ');

    expect(copy).not.toMatch(/powerful energy|focus on self-care|good day to reflect|the universe rewards/i);
    expect(copy).toMatch(/hidden desire|fear|approval|performance|truth|tone|signal/i);
  });

  it('varies the public reading frame by date without changing the response contract', () => {
    const maySky = computeDailySkySnapshot('2026-05-20');
    const juneSky = computeDailySkySnapshot('2026-06-03');
    const may = generateDailyHoroscope('gemini', '2026-05-20', 'en', { sky: maySky });
    const june = generateDailyHoroscope('gemini', '2026-06-03', 'en', { sky: juneSky });

    expect(may.overall).not.toBe(june.overall);
    expect(Object.keys(may).sort()).toEqual(Object.keys(june).sort());
    expect(may.skyContext).toBeDefined();
    expect(june.skyContext).toBeDefined();
  });
});
