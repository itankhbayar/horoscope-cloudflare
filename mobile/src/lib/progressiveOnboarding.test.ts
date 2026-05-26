import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getOrCreateGuestOnboardingState,
  linkGuestToAuthenticatedUser,
  markFirstReadingViewed,
  recordPreviewCardsSeen,
} from './progressiveOnboarding';

const storage = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      storage.delete(key);
    }),
  },
}));

describe('progressive onboarding guest state', () => {
  beforeEach(() => {
    storage.clear();
  });

  it('creates and recovers guest state idempotently', async () => {
    const first = await getOrCreateGuestOnboardingState();
    const second = await getOrCreateGuestOnboardingState();

    expect(second.guestId).toBe(first.guestId);
    expect(second.stage).toBe('guest_cosmic_energy');
  });

  it('advances but does not regress the onboarding stage', async () => {
    await recordPreviewCardsSeen(2);
    const afterPreview = await recordPreviewCardsSeen(0);

    expect(afterPreview.stage).toBe('previews_seen');
  });

  it('records first reading and guest to authenticated activation', async () => {
    const viewed = await markFirstReadingViewed();
    const linked = await linkGuestToAuthenticatedUser('user-1');

    expect(viewed.firstReadingViewedAt).toBeTruthy();
    expect(linked.linkedUserId).toBe('user-1');
    expect(linked.stage).toBe('activated');
  });
});
