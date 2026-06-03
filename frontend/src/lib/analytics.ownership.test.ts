import { describe, expect, it } from 'vitest';
import { BACKEND_OWNED_EVENTS, isBackendOwnedEvent, PAYWALL_CTA_EVENT } from './analytics';

/**
 * Web client analytics ownership guard. The compile-time enforcement lives in the `track()`
 * signature (`ClientEmittableEvent` excludes backend-owned events) and is checked by `type-check`
 * in CI; this suite pins the runtime helpers and the canonical list.
 * See docs/analytics-event-ownership.md.
 */
describe('web analytics ownership', () => {
  it('mirrors the canonical backend-owned trio', () => {
    expect([...BACKEND_OWNED_EVENTS]).toEqual(['trial_started', 'trial_converted', 'trial_cancelled']);
  });

  it('flags backend-owned events and clears client events', () => {
    for (const event of BACKEND_OWNED_EVENTS) expect(isBackendOwnedEvent(event)).toBe(true);
    for (const event of ['paywall_viewed', 'checkout_started', 'premium_purchased', 'app_open']) {
      expect(isBackendOwnedEvent(event)).toBe(false);
    }
  });

  it('keeps the paywall CTA distinct from the backend-owned trial_started', () => {
    expect(PAYWALL_CTA_EVENT).toBe('trial_cta_clicked');
    expect(isBackendOwnedEvent(PAYWALL_CTA_EVENT)).toBe(false);
  });
});
