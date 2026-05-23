import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  prewarmDailyHoroscopes: vi.fn(),
  prewarmTarotForTimezoneDate: vi.fn(),
  resolveCronDateISO: vi.fn(),
  cleanupOperationalData: vi.fn(),
}));

vi.mock('./db/client', () => ({
  getDb: mocks.getDb,
}));

vi.mock('./services/horoscopePrewarmService', () => ({
  prewarmDailyHoroscopes: mocks.prewarmDailyHoroscopes,
  resolveCronDateISO: mocks.resolveCronDateISO,
}));

vi.mock('./services/tarotPrewarmService', () => ({
  prewarmTarotForTimezoneDate: mocks.prewarmTarotForTimezoneDate,
}));

vi.mock('./services/cleanupService', () => ({
  cleanupOperationalData: mocks.cleanupOperationalData,
}));

import { CRON_DAILY } from './cron';
import worker from './index';
import type { AppBindings } from './types';

function createScheduledContext() {
  const promises: Promise<unknown>[] = [];
  return {
    ctx: {
      waitUntil: vi.fn((promise: Promise<unknown>) => {
        promises.push(promise);
      }),
    } as unknown as ExecutionContext,
    async flush() {
      await Promise.all(promises);
    },
  };
}

const env = {
  horoscope_db: {},
  CRON_TIMEZONE: 'Asia/Ulaanbaatar',
} as AppBindings;

describe('scheduled handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDb.mockReturnValue({});
    mocks.resolveCronDateISO.mockReturnValue('2026-05-20');
    mocks.prewarmDailyHoroscopes.mockResolvedValue({ date: '2026-05-20' });
    mocks.prewarmTarotForTimezoneDate.mockResolvedValue({ date: '2026-05-20' });
    mocks.cleanupOperationalData.mockResolvedValue({ deleted: 0, jobs: [] });
  });

  it('runs prewarm when the configured cron matches CRON_DAILY', async () => {
    const { ctx, flush } = createScheduledContext();

    worker.scheduled?.({ cron: CRON_DAILY, scheduledTime: 1 } as ScheduledController, env, ctx);
    await flush();

    expect(mocks.resolveCronDateISO).toHaveBeenCalledWith(1, 'Asia/Ulaanbaatar');
    expect(mocks.prewarmDailyHoroscopes).toHaveBeenCalledWith({}, '2026-05-20', 'Asia/Ulaanbaatar');
    expect(mocks.prewarmTarotForTimezoneDate).toHaveBeenCalledWith(
      {},
      '2026-05-20',
      'Asia/Ulaanbaatar',
    );
    expect(mocks.cleanupOperationalData).toHaveBeenCalledWith({}, env);
  });

  it('logs a clear error and skips prewarm when cron does not match CRON_DAILY', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { ctx, flush } = createScheduledContext();

    worker.scheduled?.({ cron: '0 0 * * *', scheduledTime: 1 } as ScheduledController, env, ctx);
    await flush();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('cron_skipped_unmatched_trigger'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"receivedCron":"0 0 * * *"'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(`"expectedCron":"${CRON_DAILY}"`));
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.prewarmDailyHoroscopes).not.toHaveBeenCalled();
    expect(mocks.prewarmTarotForTimezoneDate).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
