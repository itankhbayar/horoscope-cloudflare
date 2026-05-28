import type { ZodiacSign } from './types';

export function parseCompatibilityScoreParam(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return null;
  return parsed;
}

export function landingShareSource(utmSource: unknown): 'share_card' | 'unknown' {
  return utmSource === 'compatibility_share' ? 'share_card' : 'unknown';
}

/** Pick which shared sign to compare the guest against. */
export function guestCompareTarget(
  mySign: ZodiacSign,
  sharedSign1: ZodiacSign,
  sharedSign2: ZodiacSign,
): ZodiacSign {
  if (mySign === sharedSign1) return sharedSign2;
  if (mySign === sharedSign2) return sharedSign1;
  return sharedSign2;
}

export type ParsedCompatibilityDeepLink = {
  sign1: ZodiacSign;
  sign2: ZodiacSign;
  score: number | null;
};

const SIGN_PATTERN =
  /^\/?compatibility\/(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)\/(aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)\/?$/i;

function compatibilityPathFromUrl(url: string): { path: string; scoreParam: string | null } | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (/^astralis:\/\//i.test(trimmed)) {
    const rest = trimmed.replace(/^astralis:\/\//i, '');
    const [pathPart = '', queryPart] = rest.split('?');
    const params = new URLSearchParams(queryPart ?? '');
    return { path: pathPart.replace(/^\/+/, ''), scoreParam: params.get('score') };
  }

  try {
    const parsed = new URL(trimmed);
    return { path: parsed.pathname.replace(/^\/+/, ''), scoreParam: parsed.searchParams.get('score') };
  } catch {
    return null;
  }
}

export function parseCompatibilityDeepLink(url: string): ParsedCompatibilityDeepLink | null {
  const parts = compatibilityPathFromUrl(url);
  if (!parts) return null;

  const match = SIGN_PATTERN.exec(parts.path);
  if (!match) return null;

  return {
    sign1: match[1]!.toLowerCase() as ZodiacSign,
    sign2: match[2]!.toLowerCase() as ZodiacSign,
    score: parseCompatibilityScoreParam(parts.scoreParam),
  };
}

export function compatibilityLandingWebUrl(
  baseUrl: string,
  sign1: ZodiacSign,
  sign2: ZodiacSign,
  score?: number,
  shareRef?: string,
): string {
  const root = baseUrl.replace(/\/$/, '');
  const params = new URLSearchParams({
    utm_source: 'compatibility_share',
    utm_medium: 'deep_link',
    utm_campaign: 'compatibility',
  });
  if (score != null) params.set('score', String(score));
  if (shareRef) params.set('share_ref', shareRef);
  return `${root}/compatibility/${sign1}/${sign2}?${params.toString()}`;
}
