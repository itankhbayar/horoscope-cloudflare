import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
  },
}));

import {
  BACKEND_OWNED_EVENTS,
  isBackendOwnedEvent,
  setAnalyticsConsent,
  track,
  type ClientEmittableEvent,
} from './analytics';

/**
 * Mobile client analytics ownership guard. Compile-time enforcement lives in the `track()` generic
 * bound (`ClientEmittableEvent` excludes backend-owned events) and is checked by `tsc --noEmit` in
 * CI; this suite pins the canonical list and proves the runtime guard drops a forced emission.
 * See docs/analytics-event-ownership.md.
 */
describe('mobile analytics ownership', () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'test-key';
  });

  it('mirrors the canonical backend-owned trio', () => {
    expect([...BACKEND_OWNED_EVENTS]).toEqual(['trial_started', 'trial_converted', 'trial_cancelled']);
  });

  it('flags backend-owned events and clears client events', () => {
    for (const event of BACKEND_OWNED_EVENTS) expect(isBackendOwnedEvent(event)).toBe(true);
    for (const event of ['paywall_viewed', 'checkout_started', 'premium_purchased', 'app_open']) {
      expect(isBackendOwnedEvent(event)).toBe(false);
    }
  });

  it('runtime guard drops a forced backend-owned emission (no network call)', async () => {
    await setAnalyticsConsent(true);
    // The type system already forbids this; the cast simulates an unsafe JS caller bypassing it.
    await track('trial_started' as unknown as ClientEmittableEvent, {} as never);
    expect(fetch as unknown as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });
});
