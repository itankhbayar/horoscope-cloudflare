import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  prewarmDailyHoroscopes: vi.fn(),
  prewarmTarotForTimezoneDate: vi.fn(),
  resolveCronDateISO: vi.fn(),
  cleanupOperationalData: vi.fn(),
  runRetentionPipeline: vi.fn(),
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

vi.mock('./services/notificationQueueService', () => ({
  runRetentionPipeline: mocks.runRetentionPipeline,
}));

import { CRON_DAILY, CRON_HOURLY } from './cron';
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
    mocks.runRetentionPipeline.mockResolvedValue({
      enqueue: { considered: 0, enqueued: 0, skipped: 0 },
      deliver: { claimed: 0, sent: 0, failed: 0, skipped: 0, retried: 0, tokensDisabled: 0 },
      receipts: { jobsChecked: 0, tokensDisabled: 0 },
    });
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
    expect(mocks.runRetentionPipeline).not.toHaveBeenCalled();
  });

  it('runs the notification pipeline when the cron matches CRON_HOURLY', async () => {
    const { ctx, flush } = createScheduledContext();

    worker.scheduled?.({ cron: CRON_HOURLY, scheduledTime: 1234 } as ScheduledController, env, ctx);
    await flush();

    expect(mocks.runRetentionPipeline).toHaveBeenCalledWith({}, env, { nowMs: 1234 });
    expect(mocks.prewarmDailyHoroscopes).not.toHaveBeenCalled();
    expect(mocks.cleanupOperationalData).not.toHaveBeenCalled();
  });

  it('logs a clear error and skips work when cron matches no known schedule', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { ctx, flush } = createScheduledContext();

    worker.scheduled?.({ cron: '30 3 * * *', scheduledTime: 1 } as ScheduledController, env, ctx);
    await flush();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('cron_skipped_unmatched_trigger'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"receivedCron":"30 3 * * *"'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(CRON_DAILY));
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.prewarmDailyHoroscopes).not.toHaveBeenCalled();
    expect(mocks.runRetentionPipeline).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
