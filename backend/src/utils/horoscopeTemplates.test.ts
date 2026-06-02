import { describe, expect, it } from 'vitest';
import { computeDailySkySnapshot, computeNatalChart, computeTransitToNatalAspects } from '../services/astrologyService';
import { generateDailyHoroscope } from './horoscopeTemplates';
import { allJoltLines, buildDailyHook } from './dailyHook';
import type { DailySkySnapshot, PlanetPosition, TransitToNatalAspect } from '../services/astrologyService';

const chart = computeNatalChart({
  birthDate: '1990-06-15',
  birthTime: '14:30',
  latitude: 47.9212,
  longitude: 106.9186,
  timezoneOffset: 8,
});

function withPlanetSign(sky: DailySkySnapshot, planetName: PlanetPosition['name'], sign: PlanetPosition['sign']): DailySkySnapshot {
  return {
    ...sky,
    planets: sky.planets.map((p) => (p.name === planetName ? { ...p, sign } : p)),
  };
}

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

  it('uses sky-aware Mongolian path when sky is present', () => {
    const sky = computeDailySkySnapshot('2026-05-20');
    const reading = generateDailyHoroscope('gemini', '2026-05-20', 'mn', { sky });

    expect(reading.skyContext).toMatchObject({
      sunSign: sky.planets.find((p) => p.name === 'Sun')?.sign,
      moonSign: sky.planets.find((p) => p.name === 'Moon')?.sign,
      moonPhase: sky.moonPhase.name,
    });
    expect(reading.overall).toMatch(/сэтгэл|анхаарал|хэмнэл|харилцаа|шийдвэр/);
    expect(reading.finance?.length ?? 0).toBeGreaterThan(30);
    expect(reading.advice?.length ?? 0).toBeGreaterThan(20);
    expect(reading.blocks?.length ?? 0).toBeGreaterThanOrEqual(6);
  });

  it('keeps Mongolian fallback safe when sky is missing', () => {
    const reading = generateDailyHoroscope('gemini', '2026-05-20', 'mn');
    expect(reading.skyContext).toBeUndefined();
    expect(reading.overall).not.toMatch(/Нар .*д|Сар .*д|транзит|өнцөг/);
    expect(reading.overall.length).toBeGreaterThan(10);
  });

  it('changes Mongolian output when sky context changes', () => {
    const maySky = computeDailySkySnapshot('2026-05-20');
    const juneSky = computeDailySkySnapshot('2026-06-03');
    const may = generateDailyHoroscope('gemini', '2026-05-20', 'mn', { sky: maySky });
    const june = generateDailyHoroscope('gemini', '2026-06-03', 'mn', { sky: juneSky });

    expect(may.overall).not.toBe(june.overall);
    expect(may.health).not.toBe(june.health);
  });

  it('changes Mongolian meaning substantially for same sign/date when sky state changes', () => {
    const baseSky = computeDailySkySnapshot('2026-05-20');
    const changedSky = withPlanetSign(
      withPlanetSign(
        withPlanetSign(
          {
            ...baseSky,
            moonPhase: { ...baseSky.moonPhase, name: 'Full Moon' },
          },
          'Moon',
          'scorpio',
        ),
        'Mercury',
        'aries',
      ),
      'Venus',
      'capricorn',
    );
    const a = generateDailyHoroscope('gemini', '2026-05-20', 'mn', { sky: baseSky });
    const b = generateDailyHoroscope('gemini', '2026-05-20', 'mn', { sky: changedSky });
    expect(a.overall).not.toBe(b.overall);
    expect(a.love).not.toBe(b.love);
    expect(a.career).not.toBe(b.career);
    expect(a.health).not.toBe(b.health);
    expect(a.finance).not.toBe(b.finance);
    expect(a.advice).not.toBe(b.advice);
  });

  it('depends on transit-to-natal aspect in Mongolian interpretation', () => {
    const sky = computeDailySkySnapshot('2026-05-20');
    const noTransit = generateDailyHoroscope('gemini', '2026-05-20', 'mn', { sky, natalChart: chart, transitAspects: [] });
    const focusTransit: TransitToNatalAspect = {
      body1: 'Mercury',
      body2: 'Moon',
      transitBody: 'Mercury',
      natalBody: 'Moon',
      type: 'square',
      orb: 0.4,
      exactDegrees: 90,
      natalHouse: 7,
      natalSign: 'pisces',
      transitSign: 'aries',
    };
    const withTransit = generateDailyHoroscope('gemini', '2026-05-20', 'mn', {
      sky,
      natalChart: chart,
      transitAspects: [focusTransit],
    });
    expect(withTransit.overall).not.toBe(noTransit.overall);
    expect(withTransit.love).toContain('харилцаа');
  });

  it('Mongolian sky-aware output is not identical to static fallback', () => {
    const sky = computeDailySkySnapshot('2026-05-20');
    const withSky = generateDailyHoroscope('gemini', '2026-05-20', 'mn', { sky });
    const fallback = generateDailyHoroscope('gemini', '2026-05-20', 'mn');

    expect(withSky.overall).not.toBe(fallback.overall);
    expect(withSky.career).not.toBe(fallback.career);
  });

  it('applies period-aware weekly/monthly framing so outputs are not plain daily copy', () => {
    const sky = computeDailySkySnapshot('2026-06-01');
    const weekly = generateDailyHoroscope('gemini', '2026-06-08', 'mn', { sky: computeDailySkySnapshot('2026-06-08') }); // Monday
    const monthly = generateDailyHoroscope('gemini', '2026-06-01', 'mn', { sky }); // first day of month
    const daily = generateDailyHoroscope('gemini', '2026-06-03', 'mn', { sky: computeDailySkySnapshot('2026-06-03') });

    expect(weekly.overall).toMatch(/Энэ долоо хоног/);
    expect(monthly.overall).toMatch(/Энэ сар/);
    expect(weekly.overall).not.toBe(daily.overall);
    expect(monthly.overall).not.toBe(daily.overall);
    expect(weekly.overall).toMatch(/эхэнд|дунд|төгсгөл|дараалал/);
    expect(monthly.overall).toMatch(/сарын эхэнд|дунд үед|сүүл рүүгээ|турш/);
  });

  it('keeps Mongolian tone natural and avoids raw technical astrology jargon', () => {
    const sky = computeDailySkySnapshot('2026-05-20');
    const transitAspects = computeTransitToNatalAspects(sky.planets, chart.planets);
    const reading = generateDailyHoroscope('gemini', '2026-05-20', 'mn', { sky, natalChart: chart, transitAspects });
    const copy = `${reading.overall} ${reading.love} ${reading.career} ${reading.health} ${reading.finance ?? ''} ${reading.advice ?? ''}`;

    expect(copy).not.toMatch(/секстиль|квадрат|тригон|эсрэг өнцөг|°|\d+\.\d+/);
    expect(copy).not.toMatch(/Нар\s+\S+-д|Сар\s+\S+-д|Хонь|Үхэр|Ихэр|Мэлхий|Арслан|Охин|Жинлүүр|Хилэнц|Нум|Матар|Хумх|Загас/);
    expect(copy).toMatch(/хэмнэл|мэдрэмж|харилцаа|тайван|тод/);
  });

  it('avoids repetitive opening rhythm across 7 consecutive Mongolian days for same sign', () => {
    const openings = Array.from({ length: 7 }, (_, i) => {
      const day = String(20 + i).padStart(2, '0');
      const date = `2026-05-${day}`;
      const reading = generateDailyHoroscope('gemini', date, 'mn', { sky: computeDailySkySnapshot(date) });
      return reading.overall.split('.')[0]?.trim() ?? reading.overall.trim();
    });
    const uniqueOpenings = new Set(openings);
    expect(uniqueOpenings.size).toBeGreaterThanOrEqual(4);
  });

  it('produces deterministic Mongolian premium structure for QA tone review', () => {
    const sky = computeDailySkySnapshot('2026-05-20');
    const reading = generateDailyHoroscope('gemini', '2026-05-20', 'mn', { sky });
    expect(reading.blocks?.map((b) => b.title)).toEqual([
      'Ерөнхий',
      'Хайр',
      'Ажил',
      'Эрүүл мэнд',
      'Санхүү',
      'Зөвлөгөө',
      'Азын тоо / өнгө',
    ]);
    expect(reading.blocks?.find((b) => b.id === 'overall')?.paragraphs.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(reading.blocks?.find((b) => b.id === 'love')?.paragraphs.length ?? 0).toBeGreaterThanOrEqual(4);
  });

  it('expands MN premium section lengths to long-form ranges', () => {
    const sky = computeDailySkySnapshot('2026-05-20');
    const reading = generateDailyHoroscope('gemini', '2026-05-20', 'mn', { sky, natalChart: chart, transitAspects: computeTransitToNatalAspects(sky.planets, chart.planets) });
    const wc = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
    expect(wc(reading.overall)).toBeGreaterThanOrEqual(80);
    expect(wc(reading.love)).toBeGreaterThanOrEqual(60);
    expect(wc(reading.career)).toBeGreaterThanOrEqual(60);
    expect(wc(reading.health)).toBeGreaterThanOrEqual(40);
    expect(wc(reading.finance ?? '')).toBeGreaterThanOrEqual(20);
    expect(wc(reading.advice ?? '')).toBeGreaterThanOrEqual(12);
  });

  it('keeps MN content non-repetitive across sections', () => {
    const sky = computeDailySkySnapshot('2026-05-20');
    const reading = generateDailyHoroscope('gemini', '2026-05-20', 'mn', { sky });
    expect(reading.overall).not.toBe(reading.love);
    expect(reading.overall).not.toBe(reading.career);
    expect(reading.love).not.toBe(reading.career);
    expect(reading.health).not.toBe(reading.finance);
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

  it('opens every reading with a deterministic emotional jolt hook (free + premium, EN + MN)', () => {
    const sky = computeDailySkySnapshot('2026-05-20');
    const transitAspects = computeTransitToNatalAspects(sky.planets, chart.planets);
    const jolts = allJoltLines();

    const freeEn = generateDailyHoroscope('gemini', '2026-05-20', 'en', { sky });
    const premiumEn = generateDailyHoroscope('gemini', '2026-05-20', 'en', { sky, natalChart: chart, transitAspects });
    const freeMn = generateDailyHoroscope('gemini', '2026-05-20', 'mn', { sky });
    const premiumMn = generateDailyHoroscope('gemini', '2026-05-20', 'mn', { sky, natalChart: chart, transitAspects });

    for (const reading of [freeEn, premiumEn, freeMn, premiumMn]) {
      expect(reading.hook).toBeDefined();
      expect(jolts).toContain(reading.hook);
      // The hook is also the opening line of the overall reading.
      expect(reading.overall.startsWith(reading.hook!)).toBe(true);
    }

    // MN structured blocks surface the hook as the first overall paragraph too.
    expect(premiumMn.blocks?.find((b) => b.id === 'overall')?.paragraphs[0]).toBe(premiumMn.hook);
  });

  it('matches the in-app hook theme to the shared Moon-derived theme used by push copy', () => {
    const sky = computeDailySkySnapshot('2026-05-20');
    const moonSign = sky.planets.find((p) => p.name === 'Moon')!.sign;
    const expected = buildDailyHook({
      sign: 'gemini',
      dateISO: '2026-05-20',
      lang: 'en',
      moonSign,
      moonPhase: sky.moonPhase.name,
    });
    const reading = generateDailyHoroscope('gemini', '2026-05-20', 'en', { sky });
    expect(reading.hook).toBe(expected.jolt);
  });

  it('varies the hook across 14 consecutive days and avoids a single repeated template', () => {
    const hooks = Array.from({ length: 14 }, (_, i) => {
      const date = new Date('2026-05-10T00:00:00Z');
      date.setUTCDate(date.getUTCDate() + i);
      const iso = date.toISOString().slice(0, 10);
      return generateDailyHoroscope('gemini', iso, 'en', { sky: computeDailySkySnapshot(iso) }).hook;
    });
    const unique = new Set(hooks);
    expect(unique.size).toBeGreaterThanOrEqual(5);
    // No single template may dominate the two-week window.
    for (const hook of unique) {
      const count = hooks.filter((h) => h === hook).length;
      expect(count).toBeLessThanOrEqual(6);
    }
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
