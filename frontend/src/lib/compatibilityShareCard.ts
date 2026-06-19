import type { CompatibilityResult, ZodiacSign } from './types';
import { compatibilityShareLocale, compatibilityThemeFor } from './compatibilityTheme';
import { isValidCompatibilityShareRef } from './compatibilityShareRef';

export type CompatibilityShareLocale = 'en' | 'mn';

export type CompatibilityShareCard = {
  scoreLabel: string;
  pairLabel: string;
  themeTitle: string;
  themeSummary: string;
  metricLine: string;
  shareText: string;
  shareUrl: string;
};

type BuildOptions = {
  locale?: string;
  sign1Name: string;
  sign2Name: string;
  appUrl?: string;
  shareRef?: string;
};

function shareBaseUrl(appUrl: string | undefined): string {
  return (appUrl?.trim() || 'https://astralis.app').replace(/\/$/, '');
}

export function buildCompatibilityShareUrl(
  sign1: ZodiacSign,
  sign2: ZodiacSign,
  overallScore: number,
  options: { appUrl?: string; shareRef?: string } = {},
): string {
  const baseUrl = shareBaseUrl(options.appUrl);
  const params = new URLSearchParams({
    utm_source: 'compatibility_share',
    utm_medium: 'share_card',
    utm_campaign: 'compatibility',
    score: String(overallScore),
  });
  if (options.shareRef && isValidCompatibilityShareRef(options.shareRef)) {
    params.set('share_ref', options.shareRef);
  }
  return `${baseUrl}/compatibility/${sign1}/${sign2}?${params.toString()}`;
}

export function buildCompatibilityShareCard(
  result: CompatibilityResult,
  options: BuildOptions,
): CompatibilityShareCard {
  const locale = compatibilityShareLocale(options.locale);
  const pairLabel = `${options.sign1Name} + ${options.sign2Name}`;
  const theme = compatibilityThemeFor(result.overallScore, locale);
  const shareUrl = buildCompatibilityShareUrl(result.sign1, result.sign2, result.overallScore, {
    appUrl: options.appUrl,
    shareRef: options.shareRef,
  });
  const metricLine =
    locale === 'mn'
      ? `Хайр ${result.loveScore}% · Нөхөрлөл ${result.friendshipScore}% · Харилцаа ${result.communicationScore}%`
      : `Love ${result.loveScore}% · Friendship ${result.friendshipScore}% · Communication ${result.communicationScore}%`;
  const scoreLabel = locale === 'mn' ? `${result.overallScore}% зохицол` : `${result.overallScore}% match`;
  const shareText =
    locale === 'mn'
      ? `${pairLabel}: ${scoreLabel}. ${theme.title}. Astralis дээр үзэх: ${shareUrl}`
      : `${pairLabel}: ${scoreLabel}. ${theme.title}. See it on Astralis: ${shareUrl}`;

  return {
    scoreLabel,
    pairLabel,
    themeTitle: theme.title,
    themeSummary: theme.summary,
    metricLine,
    shareText,
    shareUrl,
  };
}
