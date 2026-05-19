import { describe, expect, it } from 'vitest';
import { resolveCronDateISO } from './horoscopePrewarmService';

describe('resolveCronDateISO', () => {
  it('uses the configured prewarm timezone for cron dates', () => {
    const scheduledTime = Date.parse('2026-05-19T16:30:00.000Z');

    expect(resolveCronDateISO(scheduledTime, 'Asia/Ulaanbaatar')).toBe('2026-05-20');
    expect(resolveCronDateISO(scheduledTime, 'UTC')).toBe('2026-05-19');
  });

  it('falls back to UTC for invalid cron timezones', () => {
    const scheduledTime = Date.parse('2026-05-19T16:30:00.000Z');

    expect(resolveCronDateISO(scheduledTime, 'Invalid/Timezone')).toBe('2026-05-19');
  });
});
