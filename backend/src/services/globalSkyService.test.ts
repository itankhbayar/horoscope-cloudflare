import { describe, expect, it } from 'vitest';
import { buildGlobalSkyToday } from './globalSkyService';

describe('buildGlobalSkyToday', () => {
  it('builds a deterministic collective sky interpretation from real sky data', () => {
    const a = buildGlobalSkyToday('2026-05-25');
    const b = buildGlobalSkyToday('2026-05-25');

    expect(a).toEqual(b);
    expect(a.date).toBe('2026-05-25');
    expect(a.headline).toContain('Moon in');
    expect(a.cards.length).toBeGreaterThanOrEqual(3);
    expect(Object.keys(a.atmosphere)).toEqual([
      'tension',
      'intimacy',
      'clarity',
      'momentum',
      'uncertainty',
      'reflection',
      'socialOpenness',
      'emotionalVolatility',
    ]);
  });

  it('does not claim eclipse timing without node data', () => {
    const sky = buildGlobalSkyToday('2026-05-25');

    expect(sky.eclipseWindow.active).toBe(false);
    expect(sky.eclipseWindow.note).toMatch(/does not label it an eclipse|No eclipse window/);
  });

  it('avoids generic fatalistic or self-help language', () => {
    const sky = buildGlobalSkyToday('2026-05-25');
    const copy = [sky.headline, sky.summary, sky.shareLine, ...sky.cards.map((card) => card.body)].join(' ');

    expect(copy).not.toMatch(/universe rewards|destined|will happen|focus on self-care|manifest/i);
  });
});
