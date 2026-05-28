import { describe, expect, it } from 'vitest';
import type { DailyHoroscope } from '@astralis/lib/types';
import { buildHoroscopeDetailSections } from './horoscopeDetail';

const base: DailyHoroscope = {
  sign: 'gemini',
  date: '2026-05-28',
  overall: 'Ерөнхий хэсэг урт байж болно, таслалгүйгээр бүтэн харагдах ёстой.',
  love: 'Харилцааны бүрэн тайлбар энд байна.',
  career: 'Ажлын чиглэлийн бүрэн тайлбар энд байна.',
  health: 'Эрүүл мэндийн бүрэн тайлбар энд байна.',
  luckyNumber: 23,
  luckyColor: 'Хайлаас ягаан',
};

describe('buildHoroscopeDetailSections', () => {
  it('returns full daily reading sections without truncating content', () => {
    const sections = buildHoroscopeDetailSections(base, 'today', false);
    expect(sections.map((s) => s.title)).toEqual(['Ерөнхий', 'Хайр', 'Ажил', 'Эрүүл мэнд', 'Азын тоо / өнгө']);
    expect(sections.find((s) => s.key === 'overall')?.body).toBe(base.overall);
    expect(sections.find((s) => s.key === 'lucky')?.body).toBe('23 / Хайлаас ягаан');
  });

  it('shows premium lock section for non-today when user is free', () => {
    const sections = buildHoroscopeDetailSections(base, 'weekly', false);
    expect(sections).toHaveLength(1);
    expect(sections[0]?.key).toBe('premium-lock');
  });

  it('includes finance and advice when available', () => {
    const extended = {
      ...base,
      finance: 'Санхүүгийн тэмдэглэл байна.',
      advice: 'Өдрийн зөвлөгөө байна.',
    } as DailyHoroscope & { finance: string; advice: string };
    const sections = buildHoroscopeDetailSections(extended, 'today', true);
    expect(sections.map((s) => s.title)).toContain('Санхүү');
    expect(sections.map((s) => s.title)).toContain('Зөвлөгөө');
  });

  it('prefers structured backend blocks when present', () => {
    const withBlocks: DailyHoroscope = {
      ...base,
      blocks: [
        { id: 'overall', title: 'Ерөнхий', paragraphs: ['Нэг', 'Хоёр'] },
        { id: 'advice', title: 'Зөвлөгөө', paragraphs: ['Гурав'] },
      ],
    };
    const sections = buildHoroscopeDetailSections(withBlocks, 'today', true);
    expect(sections).toEqual([
      { key: 'overall', title: 'Ерөнхий', body: 'Нэг\n\nХоёр' },
      { key: 'advice', title: 'Зөвлөгөө', body: 'Гурав' },
    ]);
  });
});

