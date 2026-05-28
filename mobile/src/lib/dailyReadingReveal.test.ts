import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
  },
}));

import { loadDailyReadingReveal, saveDailyReadingReveal } from './dailyReadingReveal';

describe('dailyReadingReveal', () => {
  beforeEach(() => {
    storage.clear();
  });

  it('persists reveal state by user and date', async () => {
    await saveDailyReadingReveal('2026-05-27', 'user-1');
    await expect(loadDailyReadingReveal('2026-05-27', 'user-1')).resolves.toBe(true);
    await expect(loadDailyReadingReveal('2026-05-28', 'user-1')).resolves.toBe(false);
    await expect(loadDailyReadingReveal('2026-05-27', 'user-2')).resolves.toBe(false);
  });
});
