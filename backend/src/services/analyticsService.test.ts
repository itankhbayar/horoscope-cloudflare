import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { trackBackendEvent } from './analyticsService';

const ENABLED_ENV = { POSTHOG_API_KEY: 'phc_test', POSTHOG_HOST: 'https://ph.example.com' };

describe('trackBackendEvent', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => ({ ok: true, status: 200 }) as Response);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('captures to PostHog with a stable distinct_id and event payload', async () => {
    const result = await trackBackendEvent({
      env: ENABLED_ENV,
      distinctId: 'user-1',
      event: 'trial_started',
      properties: { provider: 'stripe', eventType: 'customer.subscription.created' },
    });

    expect(result).toBe('sent');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://ph.example.com/capture/');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({
      api_key: 'phc_test',
      event: 'trial_started',
      properties: { distinct_id: 'user-1', app: 'backend', provider: 'stripe' },
    });
  });

  it('defaults to the PostHog US host when none is configured', async () => {
    await trackBackendEvent({ env: { POSTHOG_API_KEY: 'phc_test' }, distinctId: 'user-1', event: 'trial_converted' });
    expect(fetchMock.mock.calls[0]![0]).toBe('https://us.i.posthog.com/capture/');
  });

  it('is a no-op when PostHog is not configured (fail open)', async () => {
    const result = await trackBackendEvent({ env: {}, distinctId: 'user-1', event: 'trial_started' });
    expect(result).toBe('skipped_disabled');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips (never invents an id) when no distinct_id is available', async () => {
    expect(
      await trackBackendEvent({ env: ENABLED_ENV, distinctId: null, event: 'trial_cancelled' }),
    ).toBe('skipped_no_distinct_id');
    expect(
      await trackBackendEvent({ env: ENABLED_ENV, distinctId: '   ', event: 'trial_cancelled' }),
    ).toBe('skipped_no_distinct_id');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never throws and reports failed when PostHog returns a non-OK status', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    await expect(
      trackBackendEvent({ env: ENABLED_ENV, distinctId: 'user-1', event: 'trial_started' }),
    ).resolves.toBe('failed');
  });

  it('never throws and reports failed when fetch rejects', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    await expect(
      trackBackendEvent({ env: ENABLED_ENV, distinctId: 'user-1', event: 'trial_started' }),
    ).resolves.toBe('failed');
  });

  it('drops non-primitive properties before sending', async () => {
    await trackBackendEvent({
      env: ENABLED_ENV,
      distinctId: 'user-1',
      event: 'trial_started',
      properties: { provider: 'stripe', nested: { a: 1 } as unknown as string, fn: (() => 0) as unknown as string },
    });
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.properties.provider).toBe('stripe');
    expect(body.properties.nested).toBeUndefined();
    expect(body.properties.fn).toBeUndefined();
  });
});
