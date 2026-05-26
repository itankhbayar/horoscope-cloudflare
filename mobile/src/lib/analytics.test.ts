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

import { hasLegacyPremiumLanguage } from '../components/home/ritualMomentCopy';
import {
  ANALYTICS_SCHEMA_VERSION,
  isLegacyAliasEvent,
  legacyAnalyticsEventsFor,
  normalizeRitualEventName,
  sanitizeAnalyticsProperties,
  setAnalyticsConsent,
  track,
  trackRitualEvent,
} from './analytics';

function capturedEvents(): Array<{ event: string; properties: Record<string, unknown> }> {
  const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
  return calls.map((call) => JSON.parse(String(call[1]?.body)));
}

describe('mobile analytics', () => {
  beforeEach(async () => {
    storage.clear();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'test-key';
    process.env.NODE_ENV = 'test';
    await setAnalyticsConsent(false);
  });

  it('keeps analytics payloads primitive and privacy-safe by default', () => {
    expect(
      sanitizeAnalyticsProperties({
        source: 'home',
        count: 2,
        premium: false,
        nil: null,
        badObject: { birthCity: 'Ulaanbaatar' } as never,
        badArray: ['chart'] as never,
      }),
    ).toEqual({
      source: 'home',
      count: 2,
      premium: false,
      nil: null,
    });
  });

  it('gates horoscope share events behind analytics consent', async () => {
    await track('horoscope_share_card_opened', { source: 'home', sign: 'aries', date: '2026-05-25' });

    expect(fetch).not.toHaveBeenCalled();

    await setAnalyticsConsent(true);
    await track('horoscope_share_card_opened', { source: 'home', sign: 'aries', date: '2026-05-25' });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.stringify((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[1])).toContain('horoscope_share_card_opened');
  });

  it('gates emotional memory analytics behind consent', async () => {
    await track('emotional_memory_opt_in', { source: 'guest_ritual' });
    expect(fetch).not.toHaveBeenCalled();

    await setAnalyticsConsent(true);
    await track('emotional_memory_opt_in', { source: 'guest_ritual' });
    await track('emotional_memory_reset', { source: 'guest_ritual' });

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('gates premium continuity analytics behind consent', async () => {
    await track('premium_paywall_triggered', { source: 'saved_reflection' });
    await track('private_archive_view_depth', { archiveCount: 2, ritualNights: 3 });
    expect(fetch).not.toHaveBeenCalled();

    await setAnalyticsConsent(true);
    await track('premium_paywall_triggered', { source: 'saved_reflection' });
    await track('private_archive_view_depth', { archiveCount: 2, ritualNights: 3 });

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('gates notification delivery analytics behind consent', async () => {
    await track('reminder_delivered', { type: 'atmospheric_ritual', reason: 'reflection' });
    expect(fetch).not.toHaveBeenCalled();

    await setAnalyticsConsent(true);
    await track('reminder_opened', { type: 'atmospheric_ritual', reason: 'reflection' });
    await track('pause_reminders_used', { days: 7, pausedUntilISO: '2026-06-01T00:00:00.000Z' });

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('emits ritual event names while preserving locked-content dashboard continuity', async () => {
    await setAnalyticsConsent(true);

    await trackRitualEvent('deeper_layer_tapped', {
      source: 'home',
      momentType: 'premium_continuation',
      premiumState: 'free',
      trigger: 'period_tab',
      readingType: 'weekly',
      continuationType: 'period_depth',
      userMode: 'authenticated',
      experimentVariant: 'ritual-home-a',
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(capturedEvents().map((event) => event.event)).toEqual([
      'deeper_layer_tapped',
      'locked_content_tapped',
    ]);
    expect(capturedEvents()[0]?.properties).toMatchObject({
      source: 'home',
      momentType: 'premium_continuation',
      premiumState: 'free',
      trigger: 'period_tab',
      readingType: 'weekly',
      continuationType: 'period_depth',
      userMode: 'authenticated',
      experimentVariant: 'ritual-home-a',
      analyticsSchemaVersion: ANALYTICS_SCHEMA_VERSION,
      ritualEventMigration: true,
      canonicalEventName: 'deeper_layer_tapped',
      emissionMode: 'canonical',
    });
    expect(capturedEvents()[1]?.properties).toMatchObject({
      surface: 'horoscope_period',
      period: 'weekly',
      analyticsSchemaVersion: ANALYTICS_SCHEMA_VERSION,
      ritualEventMigration: true,
      legacyEventAlias: 'locked_content_tapped',
      canonicalEventName: 'deeper_layer_tapped',
      emissionMode: 'legacy_alias',
    });
  });

  it('bridges premium continuation events to legacy paywall events without changing payload source semantics', async () => {
    await setAnalyticsConsent(true);

    await trackRitualEvent('premium_continuation_viewed', {
      source: 'home',
      momentType: 'main_sky_reading',
      premiumState: 'free',
      trigger: 'learn_more',
      readingType: 'today',
      continuationType: 'private_ritual',
      userMode: 'guest',
    });

    expect(capturedEvents().map((event) => event.event)).toEqual([
      'premium_continuation_viewed',
      'paywall_viewed',
    ]);
    expect(capturedEvents()[1]?.properties).toMatchObject({
      source: 'post_reading',
      analyticsSchemaVersion: ANALYTICS_SCHEMA_VERSION,
      ritualEventMigration: true,
      legacyEventAlias: 'paywall_viewed',
      canonicalEventName: 'premium_continuation_viewed',
      emissionMode: 'legacy_alias',
    });
  });

  it('normalizes legacy aliases to their canonical ritual event names', () => {
    expect(normalizeRitualEventName('locked_content_tapped')).toBe('deeper_layer_tapped');
    expect(normalizeRitualEventName('reading_revealed')).toBe('expanded_reading_requested');
    expect(normalizeRitualEventName('premium_paywall_triggered')).toBe('private_archive_prompt_viewed');
    expect(normalizeRitualEventName('paywall_viewed')).toBe('premium_continuation_viewed');
    expect(normalizeRitualEventName('ritual_moment_continued')).toBe('ritual_moment_continued');
    expect(normalizeRitualEventName('checkout_started')).toBeNull();
  });

  it('identifies compatibility aliases using either event name or emission metadata', () => {
    expect(isLegacyAliasEvent('locked_content_tapped')).toBe(true);
    expect(isLegacyAliasEvent('paywall_viewed')).toBe(true);
    expect(isLegacyAliasEvent('deeper_layer_tapped')).toBe(false);
    expect(isLegacyAliasEvent('deeper_layer_tapped', { emissionMode: 'legacy_alias' })).toBe(true);
  });

  it('bridges private archive prompts to legacy premium paywall dashboards', async () => {
    expect(
      legacyAnalyticsEventsFor('private_archive_prompt_viewed', {
        source: 'saved_reflection',
        momentType: 'private_archive',
      }),
    ).toEqual([
      { event: 'paywall_viewed', properties: { source: 'saved_reflection' } },
      { event: 'premium_paywall_triggered', properties: { source: 'saved_reflection' } },
    ]);
  });

  it('preserves legacy revealed-reading analytics for expanded ritual readings', async () => {
    await setAnalyticsConsent(true);

    await trackRitualEvent('expanded_reading_requested', {
      source: 'home',
      momentType: 'reflection',
      premiumState: 'free',
      trigger: 'sequence_control',
      readingType: 'moon',
      continuationType: 'reflection',
      userMode: 'authenticated',
    });

    expect(capturedEvents().map((event) => event.event)).toEqual([
      'expanded_reading_requested',
      'reading_revealed',
    ]);
    expect(capturedEvents()[1]?.properties).toMatchObject({ surface: 'moon' });
  });

  it('keeps ritual migration events behind analytics consent', async () => {
    await trackRitualEvent('premium_continuation_tapped', {
      source: 'home',
      momentType: 'premium_continuity',
      premiumState: 'free',
      trigger: 'deeper_moment',
      continuationType: 'private_ritual',
      userMode: 'unknown',
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not emit duplicate canonical events during dual emission', async () => {
    await setAnalyticsConsent(true);

    await trackRitualEvent('premium_continuation_tapped', {
      source: 'home',
      momentType: 'premium_continuity',
      premiumState: 'free',
      trigger: 'deeper_moment',
      continuationType: 'private_ritual',
      userMode: 'authenticated',
    });

    expect(capturedEvents().filter((event) => event.event === 'premium_continuation_tapped')).toHaveLength(1);
    expect(capturedEvents().filter((event) => event.properties.emissionMode === 'canonical')).toHaveLength(1);
    expect(capturedEvents().filter((event) => event.properties.emissionMode === 'legacy_alias')).toHaveLength(1);
  });

  it('warns in development when new code directly tracks bridged legacy names', async () => {
    await track('locked_content_tapped', { surface: 'home_module' });

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Use trackRitualEvent(deeper_layer_tapped, ...)'),
    );
  });

  it('keeps forbidden gate language out of ritual-facing copy checks', () => {
    expect(hasLegacyPremiumLanguage('Continue deeper into tonight\'s rhythm')).toBe(false);
    expect(hasLegacyPremiumLanguage('Unlock more content')).toBe(true);
  });
});
