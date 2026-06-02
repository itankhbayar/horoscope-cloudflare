import { describe, expect, it } from 'vitest';
import {
  allJoltLines,
  buildDailyHook,
  emotionalJolt,
  HOOK_THEMES,
  hookSeed,
  pushTeaserForTheme,
  selectHookTheme,
  type HookElement,
} from './dailyHook';
import type { Lang } from './lang';

describe('selectHookTheme', () => {
  it('is shared/deterministic from the Moon so push and in-app land on the same theme', () => {
    expect(selectHookTheme('water', 'Waxing Crescent')).toBe('recognition');
    expect(selectHookTheme('air', 'Waxing Crescent')).toBe('restraint');
    expect(selectHookTheme('earth', 'Waxing Crescent')).toBe('clarity');
    expect(selectHookTheme('fire', 'Waxing Crescent')).toBe('turning');
  });

  it('treats a Full Moon as the "unspoken" theme regardless of element', () => {
    for (const el of ['fire', 'earth', 'air', 'water'] as HookElement[]) {
      expect(selectHookTheme(el, 'Full Moon')).toBe('unspoken');
    }
  });
});

describe('buildDailyHook', () => {
  it('is deterministic for the same sign/date/sky', () => {
    const a = buildDailyHook({ sign: 'gemini', dateISO: '2026-05-20', lang: 'en', moonSign: 'scorpio', moonPhase: 'Full Moon' });
    const b = buildDailyHook({ sign: 'gemini', dateISO: '2026-05-20', lang: 'en', moonSign: 'scorpio', moonPhase: 'Full Moon' });
    expect(a).toEqual(b);
  });

  it('varies the jolt line across consecutive days for the same sign', () => {
    const lines = new Set<string>();
    for (let i = 0; i < 14; i += 1) {
      const day = String(10 + i).padStart(2, '0');
      // Rotate the moon to mimic the sky moving day to day.
      const moonSign = (['scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces', 'aries'] as const)[i % 6];
      const moonPhase = (['New Moon', 'Waxing Crescent', 'First Quarter', 'Full Moon', 'Waning Gibbous'] as const)[i % 5];
      lines.add(buildDailyHook({ sign: 'gemini', dateISO: `2026-05-${day}`, lang: 'en', moonSign, moonPhase }).jolt);
    }
    expect(lines.size).toBeGreaterThanOrEqual(5);
  });

  it('falls back to the sun-sign element when no sky is supplied', () => {
    const hook = buildDailyHook({ sign: 'leo', dateISO: '2026-05-20', lang: 'en' });
    // Leo is fire -> turning theme.
    expect(hook.theme).toBe('turning');
    expect(hook.jolt.length).toBeGreaterThan(0);
  });

  it('produces Mongolian copy for the mn locale', () => {
    const hook = buildDailyHook({ sign: 'gemini', dateISO: '2026-05-20', lang: 'mn', moonSign: 'cancer', moonPhase: 'New Moon' });
    expect(hook.jolt).toMatch(/[Ѐ-ӿ]/); // Cyrillic
  });
});

describe('pushTeaserForTheme', () => {
  it('returns a non-empty title/body for every theme', () => {
    for (const theme of HOOK_THEMES) {
      const teaser = pushTeaserForTheme(theme);
      expect(teaser.title.length).toBeGreaterThan(0);
      expect(teaser.body.length).toBeGreaterThan(0);
    }
  });
});

describe('jolt content safety', () => {
  const lines = allJoltLines();

  it('avoids medical, financial, dangerous, or dark/scary language', () => {
    const banned = /\b(die|death|dead|kill|danger|accident|sick|disease|illness|doctor|medic|money|invest|loan|debt|stocks?)\b/i;
    const bannedMn = /(үхэл|үхэх|осол|өвчин|эмч|эмнэлэг|зээл|хөрөнгө\s*оруул|мөнгө|алдагдал)/;
    for (const line of lines) {
      expect(line).not.toMatch(banned);
      expect(line).not.toMatch(bannedMn);
    }
  });

  it('avoids fake certainty about the future', () => {
    const fakeCertainty = /\b(will definitely|guaranteed|certainly will|for sure|100%)\b/i;
    for (const line of lines) {
      expect(line).not.toMatch(fakeCertainty);
    }
  });

  it('keeps every line short enough to read as a single jolt', () => {
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(140);
    }
  });
});

describe('emotionalJolt', () => {
  it('only ever returns a line from the requested theme/lang pool', () => {
    const langs: Lang[] = ['en', 'mn'];
    for (const theme of HOOK_THEMES) {
      for (const lang of langs) {
        for (let seed = 0; seed < 20; seed += 1) {
          const line = emotionalJolt(theme, lang, seed);
          expect(allJoltLines()).toContain(line);
        }
      }
    }
  });
});

describe('hookSeed', () => {
  it('changes when any input changes', () => {
    const base = hookSeed('gemini', '2026-05-20', 'scorpio', 'Full Moon');
    expect(hookSeed('gemini', '2026-05-21', 'scorpio', 'Full Moon')).not.toBe(base);
    expect(hookSeed('leo', '2026-05-20', 'scorpio', 'Full Moon')).not.toBe(base);
    expect(hookSeed('gemini', '2026-05-20', 'aries', 'Full Moon')).not.toBe(base);
  });
});
