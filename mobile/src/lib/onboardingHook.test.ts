import { describe, expect, it } from 'vitest';
import { ZODIAC_SIGNS } from '@astralis/lib/zodiac';
import type { ZodiacSign } from '@astralis/lib/types';
import {
  hookVariantCount,
  ONBOARDING_HOOKS,
  selectOnboardingHook,
  type HookLang,
} from './onboardingHook';

const SIGNS = ZODIAC_SIGNS.map((s) => s.key);
const LANGS: HookLang[] = ['mn', 'en'];

describe('onboarding hook content coverage', () => {
  it('provides at least 3 variants for every sign in both languages', () => {
    for (const sign of SIGNS) {
      for (const lang of LANGS) {
        expect(hookVariantCount(sign, lang)).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('every variant has a non-empty title and body', () => {
    for (const sign of SIGNS) {
      for (const lang of LANGS) {
        for (const variant of ONBOARDING_HOOKS[sign][lang]) {
          expect(variant.title.trim().length).toBeGreaterThan(0);
          expect(variant.body.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('selectOnboardingHook — deterministic personalization', () => {
  it('returns the same variant for the same chart every time', () => {
    const input = { sunSign: 'leo' as ZodiacSign, moonSign: 'pisces' as ZodiacSign, risingSign: 'scorpio' as ZodiacSign, lang: 'mn' as HookLang };
    const a = selectOnboardingHook(input);
    const b = selectOnboardingHook(input);
    expect(a).toEqual(b);
  });

  it('can produce different variants for the same sun sign when moon/rising differ', () => {
    const base = { sunSign: 'gemini' as ZodiacSign, lang: 'mn' as HookLang };
    const results = new Set(
      (['aries', 'taurus', 'cancer', 'leo', 'virgo', 'libra'] as ZodiacSign[]).map(
        (moon) => selectOnboardingHook({ ...base, moonSign: moon, risingSign: moon }).variant,
      ),
    );
    expect(results.size).toBeGreaterThan(1);
  });

  it('always returns a valid in-range variant index and matching content', () => {
    for (const sign of SIGNS) {
      const hook = selectOnboardingHook({ sunSign: sign, moonSign: null, risingSign: null, lang: 'en' });
      expect(hook.variant).toBeGreaterThanOrEqual(0);
      expect(hook.variant).toBeLessThan(hookVariantCount(sign, 'en'));
      expect(hook.title).toBe(ONBOARDING_HOOKS[sign].en[hook.variant]!.title);
    }
  });

  it('resolves the correct element from the sun sign', () => {
    expect(selectOnboardingHook({ sunSign: 'aries', lang: 'mn' }).element).toBe('fire');
    expect(selectOnboardingHook({ sunSign: 'taurus', lang: 'mn' }).element).toBe('earth');
    expect(selectOnboardingHook({ sunSign: 'gemini', lang: 'mn' }).element).toBe('air');
    expect(selectOnboardingHook({ sunSign: 'cancer', lang: 'mn' }).element).toBe('water');
  });

  it('falls back to Mongolian for unknown languages', () => {
    const mn = selectOnboardingHook({ sunSign: 'aries', lang: 'mn' });
    const unknown = selectOnboardingHook({ sunSign: 'aries', lang: 'xx' as HookLang });
    expect(unknown.title).toBe(mn.title);
  });
});

describe('onboarding hook safety — never negative / medical / mental-health', () => {
  const BANNED =
    /\b(depress\w*|anxiety|anxious|diagnos\w*|disorder|illness|disease|trauma|suicid\w*|therapy|medication|cure|symptom|stupid|worthless|hopeless|doomed|fail\w*|broken)\b/i;

  it('contains no banned English words in any variant', () => {
    for (const sign of SIGNS) {
      for (const variant of ONBOARDING_HOOKS[sign].en) {
        expect(`${variant.title} ${variant.body}`).not.toMatch(BANNED);
      }
    }
  });

  it('every Mongolian variant offers a warm turn (contains "Гэхдээ")', () => {
    for (const sign of SIGNS) {
      for (const variant of ONBOARDING_HOOKS[sign].mn) {
        expect(variant.body).toContain('Гэхдээ');
      }
    }
  });
});
