import { describe, expect, it } from 'vitest';
import { buildHoroscopeShareCardPayload, generateHoroscopeShareCardSvg } from './horoscopeShareCard';
import type { DailyHoroscope } from './types';

const horoscope = {
  sign: 'scorpio',
  date: '2026-05-25',
  overall: 'You have been performing calm so convincingly that even you almost believed it. Let the day show you where the performance is heavier than the truth.',
  love: 'Small changes in tone may hit harder today, especially from someone whose approval you pretend not to need.',
  career: 'At work, the useful move is to name the pattern before reacting to the noise.',
  health: 'Keep it ordinary and repeatable; the point is to stop overriding the signal.',
  luckyNumber: 11,
  luckyColor: 'Burgundy',
  skyContext: {
    sunSign: 'gemini',
    moonSign: 'scorpio',
    moonPhase: 'Waxing Gibbous',
  },
  email: 'private@example.com',
  userId: 'user-secret',
  birthTime: '04:20',
  birthCity: 'Ulaanbaatar',
} as DailyHoroscope & Record<string, unknown>;

describe('horoscope share card payload', () => {
  it('does not include private fields from a permissive horoscope object', () => {
    const payload = buildHoroscopeShareCardPayload(horoscope);
    const serialized = JSON.stringify(payload);

    expect(serialized).not.toContain('private@example.com');
    expect(serialized).not.toContain('user-secret');
    expect(serialized).not.toContain('04:20');
    expect(serialized).not.toContain('Ulaanbaatar');
  });

  it('uses existing horoscope data to build card copy and weather', () => {
    const payload = buildHoroscopeShareCardPayload(horoscope);

    expect(payload.sign).toBe(horoscope.sign);
    expect(payload.preview).toContain('performing calm');
    expect(payload.cosmicWeather).toContain('Waxing Gibbous');
    expect(payload.cosmicWeather).toContain('Moon in Scorpio');
    expect(generateHoroscopeShareCardSvg(payload)).toContain('Get your sky-aware reading');
  });
});
