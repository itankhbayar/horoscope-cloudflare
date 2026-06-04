import { describe, expect, it } from 'vitest';
import {
  TRIAL_LAPSED_DAY,
  TRIAL_LIFECYCLE_DAYS,
  parseDbTimestampToDate,
  selectTrialLifecycleStage,
  trialDayForUser,
  trialLifecycleCopy,
  trialLifecycleDedupeKey,
  type TrialLifecycleStage,
} from './trialLifecycleService';

const ALL_STAGES: TrialLifecycleStage[] = [
  'trial_day_1',
  'trial_day_3',
  'trial_day_5',
  'trial_day_6',
  'trial_day_7',
  'trial_lapsed',
];

describe('parseDbTimestampToDate', () => {
  it('parses D1 CURRENT_TIMESTAMP (space-separated, no zone) as UTC', () => {
    const d = parseDbTimestampToDate('2026-06-01 09:30:00');
    expect(d.toISOString()).toBe('2026-06-01T09:30:00.000Z');
  });

  it('passes through ISO strings with an explicit zone', () => {
    const d = parseDbTimestampToDate('2026-06-01T09:30:00.000Z');
    expect(d.toISOString()).toBe('2026-06-01T09:30:00.000Z');
  });
});

describe('trialDayForUser', () => {
  it('counts signup day as Day 0', () => {
    expect(trialDayForUser('2026-06-01 12:00:00', '2026-06-01', 'UTC')).toBe(0);
  });

  it('counts the first calendar day after signup as Day 1', () => {
    expect(trialDayForUser('2026-06-01 12:00:00', '2026-06-02', 'UTC')).toBe(1);
  });

  it('counts multi-day spans', () => {
    expect(trialDayForUser('2026-06-01 12:00:00', '2026-06-08', 'UTC')).toBe(7);
    expect(trialDayForUser('2026-06-01 12:00:00', '2026-06-11', 'UTC')).toBe(TRIAL_LAPSED_DAY);
  });

  it('uses the user timezone to resolve the signup calendar date', () => {
    // 2026-06-01T23:30Z is already 2026-06-02 in Asia/Ulaanbaatar (UTC+8), so the
    // local signup day is the 2nd and the 3rd is Day 1 there.
    expect(trialDayForUser('2026-06-01 23:30:00', '2026-06-03', 'Asia/Ulaanbaatar')).toBe(1);
    // In UTC the same instant is still the 1st, so the 3rd is Day 2.
    expect(trialDayForUser('2026-06-01 23:30:00', '2026-06-03', 'UTC')).toBe(2);
  });

  it('falls back to Day 0 for an unparseable timestamp', () => {
    expect(trialDayForUser('not-a-date', '2026-06-08', 'UTC')).toBe(0);
  });
});

describe('selectTrialLifecycleStage', () => {
  it('fires exactly one stage on each scheduled day', () => {
    for (const day of TRIAL_LIFECYCLE_DAYS) {
      expect(selectTrialLifecycleStage({ trialDay: day })).toBe(`trial_day_${day}`);
    }
    expect(selectTrialLifecycleStage({ trialDay: TRIAL_LAPSED_DAY })).toBe('trial_lapsed');
  });

  it('returns null on every off-schedule day', () => {
    for (const day of [0, 2, 4, 8, 9, 11, 14, 30]) {
      expect(selectTrialLifecycleStage({ trialDay: day })).toBeNull();
    }
  });
});

describe('trialLifecycleDedupeKey', () => {
  it('is stage-scoped and date-free so each stage fires once ever', () => {
    expect(trialLifecycleDedupeKey('user-1', 'trial_day_7')).toBe('trial:user-1:trial_day_7');
    expect(trialLifecycleDedupeKey('user-1', 'trial_lapsed')).toBe('trial:user-1:trial_lapsed');
  });
});

describe('trialLifecycleCopy', () => {
  it('returns non-empty title and body for every stage', () => {
    for (const stage of ALL_STAGES) {
      const copy = trialLifecycleCopy(stage);
      expect(copy.title.trim().length).toBeGreaterThan(0);
      expect(copy.body.trim().length).toBeGreaterThan(0);
    }
  });

  it('keeps all copy billing-neutral (no charge / subscription / payment / upsell terms)', () => {
    const forbidden = /subscribe|subscription|trial|charge|charged|payment|pay\b|billing|card|premium|upgrade|renew/i;
    for (const stage of ALL_STAGES) {
      const copy = trialLifecycleCopy(stage);
      expect(`${copy.title} ${copy.body}`).not.toMatch(forbidden);
    }
  });
});
