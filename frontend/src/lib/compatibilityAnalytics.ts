import type { ZodiacSign } from './types';
import { readPersistedCompatibilityShareRef, resolveCompatibilityShareRef } from './compatibilityShareRef';

export type CompatibilityScoreBand = 'below_55' | '55_69' | '70_84' | '85_plus';

export function compatibilityScoreBand(score: number): CompatibilityScoreBand {
  if (score >= 85) return '85_plus';
  if (score >= 70) return '70_84';
  if (score >= 55) return '55_69';
  return 'below_55';
}

/** Stable key for pair rankings (order-independent). */
export function compatibilityPairKey(sign1: ZodiacSign, sign2: ZodiacSign): string {
  return [sign1, sign2].sort().join('_');
}

export function compatibilityUtmFromQuery(
  query: Record<string, unknown>,
): { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null } {
  const read = (key: string): string | null => {
    const raw = query[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  };
  return {
    utm_source: read('utm_source'),
    utm_medium: read('utm_medium'),
    utm_campaign: read('utm_campaign'),
  };
}

export function compatibilityAnalyticsContext(input: {
  locale: string;
  sign1: ZodiacSign;
  sign2: ZodiacSign;
  sharedScore: number;
  query?: Record<string, unknown>;
  shareRef?: string | null;
}): Record<string, string | number | null> {
  const utm = input.query ? compatibilityUtmFromQuery(input.query) : { utm_source: null, utm_medium: null, utm_campaign: null };
  const shareRef =
    input.shareRef ??
    (input.query ? resolveCompatibilityShareRef(input.query) : readPersistedCompatibilityShareRef());
  return {
    locale: input.locale.startsWith('mn') ? 'mn' : 'en',
    sign1: input.sign1,
    sign2: input.sign2,
    pair_key: compatibilityPairKey(input.sign1, input.sign2),
    shared_score: input.sharedScore,
    score_band: compatibilityScoreBand(input.sharedScore),
    utm_source: utm.utm_source,
    utm_medium: utm.utm_medium,
    utm_campaign: utm.utm_campaign,
    share_ref: shareRef,
  };
}

export function compatibilitySignupAttribution(query: Record<string, unknown>): {
  signup_source: string | null;
  share_ref: string | null;
} {
  const source = query.signup_source;
  const signupSource = typeof source === 'string' && source.trim() ? source.trim() : null;
  return {
    signup_source: signupSource,
    share_ref: resolveCompatibilityShareRef(query),
  };
}
