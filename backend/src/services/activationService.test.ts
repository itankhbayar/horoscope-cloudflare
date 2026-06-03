import { describe, expect, it, vi } from 'vitest';
import { markFirstHoroscopeReveal } from './activationService';

/**
 * Fake D1 modeling the conditional UPDATE: the first run flips the NULL flag (1 change),
 * every subsequent run matches nothing (0 changes) — exactly like SQLite re-evaluating
 * `first_horoscope_revealed_at IS NULL` at execution time.
 */
function createFakeUserDb() {
  let claimed = false;
  const run = vi.fn(async () => {
    if (claimed) return { meta: { changes: 0 } };
    claimed = true;
    return { meta: { changes: 1 } };
  });
  return { db: { run } as never, run };
}

describe('markFirstHoroscopeReveal', () => {
  it('returns true the first time it claims the milestone', async () => {
    const fake = createFakeUserDb();
    await expect(markFirstHoroscopeReveal(fake.db, 'user-1')).resolves.toBe(true);
    expect(fake.run).toHaveBeenCalledTimes(1);
  });

  it('returns false on every subsequent reveal (same user, any device)', async () => {
    const fake = createFakeUserDb();
    await markFirstHoroscopeReveal(fake.db, 'user-1'); // first device
    await expect(markFirstHoroscopeReveal(fake.db, 'user-1')).resolves.toBe(false); // second reveal
    await expect(markFirstHoroscopeReveal(fake.db, 'user-1')).resolves.toBe(false); // another device
  });

  it('treats rows_written-shaped results as changes', async () => {
    const run = vi.fn(async () => ({ meta: { rows_written: 1 } }));
    await expect(markFirstHoroscopeReveal({ run } as never, 'user-1')).resolves.toBe(true);
  });

  it('returns false when the driver reports no change metadata', async () => {
    const run = vi.fn(async () => ({ meta: {} }));
    await expect(markFirstHoroscopeReveal({ run } as never, 'user-1')).resolves.toBe(false);
  });
});
