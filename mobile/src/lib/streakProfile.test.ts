import { beforeEach, describe, expect, it } from 'vitest';
import { __setLocaleForTests } from '../i18n';
import { normalizeRitualHistory, profileStreakLines, ritualHistoryCompletedCount } from './streakProfile';

describe('profile streak lines', () => {
  beforeEach(() => {
    __setLocaleForTests('en');
  });

  it('includes longest streak display and freeze capacity', () => {
    expect(profileStreakLines({ streakCount: 7, longestStreakCount: 21, streakFreezes: 1, streakFreezeCap: 3 })).toEqual([
      'Current cosmic rhythm: 7 days',
      'Longest rhythm: 21 days',
      '1 / 3 safeguards',
    ]);
  });

  it('normalizes ritual history for compact profile rendering', () => {
    const history = normalizeRitualHistory([
      { date: '2026-05-01', completed: true },
      { date: '2026-05-02', completed: false },
      { date: 'bad', completed: 'yes' },
    ]);

    expect(history).toEqual([
      { date: '2026-05-01', completed: true },
      { date: '2026-05-02', completed: false },
    ]);
    expect(ritualHistoryCompletedCount(history)).toBe(1);
  });
});
