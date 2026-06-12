import { describe, expect, it, vi } from 'vitest';
import { getOrCreateDailyHoroscope } from './horoscopeService';

function makeSelectReturning(row: unknown) {
  return {
    from: () => ({
      where: () => ({
        get: async () => row,
      }),
    }),
  };
}

describe('getOrCreateDailyHoroscope', () => {
  it('serves the stored Claude row as-is without regenerating or updating it', async () => {
    const row = {
      id: '1',
      sign: 'gemini',
      date: '2026-05-20',
      lang: 'mn',
      overall: 'Хадгалагдсан ерөнхий уншлага, Claude-ийн бичсэн.',
      love: 'Хадгалагдсан хайрын хэсэг.',
      career: 'Хадгалагдсан ажил мэргэжлийн хэсэг.',
      health: 'Хадгалагдсан эрүүл мэндийн хэсэг.',
      luckyNumber: 7,
      luckyColor: 'Цэнхэр',
    };
    const updateRun = vi.fn(async () => {});
    const db = {
      select: vi.fn(() => makeSelectReturning(row)),
      update: vi.fn(() => ({
        set: () => ({
          where: () => ({
            run: updateRun,
          }),
        }),
      })),
      insert: vi.fn(),
    } as any;

    const result = await getOrCreateDailyHoroscope(db, 'gemini', 'mn', '2026-05-20');

    // No template regeneration and no DB overwrite — the stored AI content is returned verbatim.
    expect(updateRun).not.toHaveBeenCalled();
    expect(result.overall).toBe(row.overall);
    expect(result.love).toBe(row.love);
    expect(result.career).toBe(row.career);
    expect(result.health).toBe(row.health);
    expect(result.luckyNumber).toBe(7);
    expect(result.luckyColor).toBe('Цэнхэр');
  });
});
