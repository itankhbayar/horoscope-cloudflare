import type { DailyHoroscope } from '@astralis/lib/types';
import type { HoroscopePeriod } from './homeDateUtils';

export interface HoroscopeDetailSection {
  key: string;
  title: string;
  body: string;
}

type ExtendedHoroscope = DailyHoroscope & Partial<{ finance: string; advice: string }>;

export function buildHoroscopeDetailSections(
  horoscope: DailyHoroscope,
  period: HoroscopePeriod,
  isPremium: boolean,
): HoroscopeDetailSection[] {
  if (!isPremium && period !== 'today') {
    return [
      {
        key: 'premium-lock',
        title: 'Гүнзгий уншлага',
        body: 'Гүнзгий цаг хугацааны давхарга хувийн үргэлжлэлийг сонгосны дараа нээгдэнэ.',
      },
    ];
  }

  const extended = horoscope as ExtendedHoroscope;
  if (Array.isArray(horoscope.blocks) && horoscope.blocks.length > 0) {
    const mapped = horoscope.blocks
      .filter((b) => Array.isArray(b.paragraphs) && b.paragraphs.length > 0)
      .map((b) => ({
        key: b.id,
        title: b.title,
        body: b.paragraphs.join('\n\n'),
      }));
    if (mapped.length > 0) return mapped;
  }

  const sections: HoroscopeDetailSection[] = [
    { key: 'overall', title: 'Ерөнхий', body: horoscope.overall.trim() },
    { key: 'love', title: 'Хайр', body: horoscope.love.trim() },
    { key: 'career', title: 'Ажил', body: horoscope.career.trim() },
    { key: 'health', title: 'Эрүүл мэнд', body: horoscope.health.trim() },
  ];

  if (typeof extended.finance === 'string' && extended.finance.trim().length > 0) {
    sections.push({ key: 'finance', title: 'Санхүү', body: extended.finance.trim() });
  }
  if (typeof extended.advice === 'string' && extended.advice.trim().length > 0) {
    sections.push({ key: 'advice', title: 'Зөвлөгөө', body: extended.advice.trim() });
  }

  sections.push({
    key: 'lucky',
    title: 'Азын тоо / өнгө',
    body: `${horoscope.luckyNumber} / ${horoscope.luckyColor}`,
  });
  return sections;
}

