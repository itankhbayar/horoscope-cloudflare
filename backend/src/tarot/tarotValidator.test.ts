import { describe, expect, it } from 'vitest';
import { TAROT_COPY_REV } from './tarotCopyRev';
import { validateTarotPayload } from './tarotValidator';

function validPayload() {
  const core = { en: 'Hope and renewal.', mn: 'Итгэл, сэргэн мандалт.' };
  const block = (en: string, mn: string) => ({ en, mn });
  return {
    copyRev: TAROT_COPY_REV,
    date: '2026-05-01',
    timezone: 'Asia/Ulaanbaatar',
    sign: 'aries',
    card_of_the_day: {
      name: { en: 'The Star', mn: 'Од' },
      arcana: 'Major' as const,
      orientation: 'Upright' as const,
      core_meaning: core,
    },
    reading: {
      overview: block('Overview text here.', 'Ерөнхий текст.'),
      love: block('Love text.', 'Хайрын текст.'),
      career: block('Career text.', 'Ажлын текст.'),
      energy: block('Energy narrative.', 'Энергийн тайлбар.'),
    },
  };
}

describe('validateTarotPayload', () => {
  it('accepts a valid bilingual payload', () => {
    const r = validateTarotPayload(validPayload());
    expect(r.ok).toBe(true);
  });

  it('rejects extra top-level keys', () => {
    const r = validateTarotPayload({ ...validPayload(), extra: 1 } as Record<string, unknown>);
    expect(r.ok).toBe(false);
  });

  it('accepts payload without copyRev', () => {
    const p = validPayload() as Record<string, unknown>;
    delete p.copyRev;
    const r = validateTarotPayload(p);
    expect(r.ok).toBe(true);
  });

  it('rejects wrong arcana casing', () => {
    const p = validPayload() as Record<string, unknown>;
    (p.card_of_the_day as { arcana: string }).arcana = 'major';
    const r = validateTarotPayload(p);
    expect(r.ok).toBe(false);
  });

  it('rejects empty localized string', () => {
    const p = validPayload();
    p.reading.overview = { en: '   ', mn: 'ok' };
    const r = validateTarotPayload(p);
    expect(r.ok).toBe(false);
  });

  it('rejects oversized string', () => {
    const p = validPayload();
    p.reading.career = { en: 'x'.repeat(5000), mn: 'ok' };
    const r = validateTarotPayload(p);
    expect(r.ok).toBe(false);
  });
});
