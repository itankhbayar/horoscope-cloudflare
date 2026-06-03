import { describe, expect, it } from 'vitest';
import { PAYWALL_CTA_EVENT } from './analytics';

describe('web paywall trial analytics', () => {
  it('uses trial_cta_clicked for the CTA tap, never trial_started', () => {
    expect(PAYWALL_CTA_EVENT).toBe('trial_cta_clicked');
    // Guards against regressing to a client-side trial_started, which would double-count
    // against the server/webhook trial_started source of truth.
    expect(PAYWALL_CTA_EVENT).not.toBe('trial_started');
  });
});
