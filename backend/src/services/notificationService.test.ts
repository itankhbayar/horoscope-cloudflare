import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  disablePushToken,
  getNotificationPreferences,
  registerPushToken,
  updateNotificationPreferences,
} from './notificationService';

function createDbMock() {
  const findFirst = vi.fn();
  const onConflictDoNothing = vi.fn(async () => undefined);
  const onConflictDoUpdate = vi.fn(async () => undefined);
  const insertValues = vi.fn(() => ({
    onConflictDoNothing,
    onConflictDoUpdate,
  }));
  const insert = vi.fn(() => ({ values: insertValues }));
  const where = vi.fn(async () => undefined);
  const updateSet = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set: updateSet }));

  const db = {
    query: {
      notificationPreferences: {
        findFirst,
      },
    },
    insert,
    update,
  } as any;

  return {
    db,
    findFirst,
    insert,
    insertValues,
    onConflictDoNothing,
    onConflictDoUpdate,
    update,
    updateSet,
    where,
  };
}

describe('notificationService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates default preferences when missing', async () => {
    const m = createDbMock();
    m.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      userId: 'user-1',
      allEnabled: false,
      saleAlertsEnabled: false,
      horoscopesEnabled: false,
      transitsEnabled: false,
    });

    const prefs = await getNotificationPreferences(m.db, 'user-1');

    expect(prefs).toEqual({
      allEnabled: false,
      saleAlertsEnabled: false,
      horoscopesEnabled: false,
      transitsEnabled: false,
    });
    expect(m.insert).toHaveBeenCalled();
    expect(m.onConflictDoNothing).toHaveBeenCalled();
  });

  it('updates preferences with partial payload', async () => {
    const m = createDbMock();
    m.findFirst.mockResolvedValue({
      userId: 'user-1',
      allEnabled: true,
      saleAlertsEnabled: true,
      horoscopesEnabled: false,
      transitsEnabled: true,
    });

    const updated = await updateNotificationPreferences(m.db, 'user-1', {
      allEnabled: false,
    });

    expect(updated).toEqual({
      allEnabled: false,
      saleAlertsEnabled: true,
      horoscopesEnabled: false,
      transitsEnabled: true,
    });
    expect(m.onConflictDoUpdate).toHaveBeenCalled();
  });

  it('upserts push token registration', async () => {
    const m = createDbMock();

    await registerPushToken(m.db, 'user-1', {
      expoPushToken: 'ExponentPushToken[abc123]',
      platform: 'ios',
      deviceId: 'dev-1',
    });

    expect(m.insert).toHaveBeenCalled();
    expect(m.onConflictDoUpdate).toHaveBeenCalled();
  });

  it('disables push token for current user', async () => {
    const m = createDbMock();
    await disablePushToken(m.db, 'user-1', 'ExponentPushToken[abc123]');
    expect(m.update).toHaveBeenCalled();
    expect(m.where).toHaveBeenCalled();
  });
});
