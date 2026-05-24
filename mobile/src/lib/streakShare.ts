import { Share } from 'react-native';
import type { ZodiacSign } from '@astralis/lib/types';
import { milestoneSharePhrase, type StreakMilestone } from './streakDisplay';

const zodiacGlyphs: Record<ZodiacSign, string> = {
  aries: '\u2648',
  taurus: '\u2649',
  gemini: '\u264A',
  cancer: '\u264B',
  leo: '\u264C',
  virgo: '\u264D',
  libra: '\u264E',
  scorpio: '\u264F',
  sagittarius: '\u2650',
  capricorn: '\u2651',
  aquarius: '\u2652',
  pisces: '\u2653',
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function generateStreakMilestoneCardSvg(input: {
  milestone: StreakMilestone;
  zodiacSign?: ZodiacSign | null;
  displayName?: string;
}): string {
  const glyph = input.zodiacSign ? zodiacGlyphs[input.zodiacSign] : '\u2726';
  const phrase = milestoneSharePhrase(input.milestone);
  const name = input.displayName?.trim() || 'My cosmic ritual';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="72%">
      <stop offset="0%" stop-color="#4b3db0"/>
      <stop offset="52%" stop-color="#25245a"/>
      <stop offset="100%" stop-color="#090817"/>
    </radialGradient>
    <linearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f3b6d6"/>
      <stop offset="55%" stop-color="#b8a8ff"/>
      <stop offset="100%" stop-color="#9fe3c2"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg)"/>
  <circle cx="540" cy="760" r="330" fill="none" stroke="url(#ring)" stroke-width="5" opacity="0.72"/>
  <circle cx="540" cy="760" r="254" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>
  <text x="540" y="430" text-anchor="middle" fill="#e8e1ff" font-size="44" font-family="Georgia, serif">${escapeXml(name)}</text>
  <text x="540" y="720" text-anchor="middle" fill="#ffffff" font-size="210" font-family="Georgia, serif" font-weight="700">${input.milestone}</text>
  <text x="540" y="818" text-anchor="middle" fill="#f7e6a6" font-size="54" font-family="Georgia, serif">nights aligned</text>
  <text x="540" y="960" text-anchor="middle" fill="#ffffff" font-size="74" font-family="Georgia, serif">${glyph}</text>
  <text x="540" y="1128" text-anchor="middle" fill="#d9d3ff" font-size="40" font-family="Georgia, serif">${escapeXml(phrase)}</text>
  <text x="540" y="1288" text-anchor="middle" fill="#9fe3c2" font-size="30" font-family="Georgia, serif">Astralis ritual streak</text>
  <circle cx="196" cy="210" r="5" fill="#ffffff" opacity="0.82"/>
  <circle cx="870" cy="250" r="4" fill="#ffffff" opacity="0.62"/>
  <circle cx="794" cy="1442" r="6" fill="#f3b6d6" opacity="0.72"/>
  <circle cx="286" cy="1396" r="4" fill="#9fe3c2" opacity="0.72"/>
</svg>`;
}

export function streakMilestoneCardDataUrl(input: {
  milestone: StreakMilestone;
  zodiacSign?: ZodiacSign | null;
  displayName?: string;
}): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(generateStreakMilestoneCardSvg(input))}`;
}

export async function shareStreakMilestoneCard(input: {
  milestone: StreakMilestone;
  zodiacSign?: ZodiacSign | null;
  displayName?: string;
}): Promise<void> {
  const phrase = milestoneSharePhrase(input.milestone);
  const payload = {
    title: `${input.milestone}-day cosmic rhythm`,
    message: `${phrase} \u2728 ${input.milestone} nights aligned.`,
    url: streakMilestoneCardDataUrl(input),
  };
  try {
    await Share.share(payload);
  } catch {
    await Share.share({
      title: payload.title,
      message: payload.message,
    });
  }
}
