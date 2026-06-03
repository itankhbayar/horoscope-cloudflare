import type { AppBindings } from '../types';
import { log } from '../utils/logger';

/**
 * Backend → PostHog funnel mirror.
 *
 * Single responsibility: take a server-authoritative funnel event and forward it to PostHog
 * with a stable user `distinct_id`, so founders can analyse activation/subscription funnels in
 * PostHog alone (no Worker-log joins). This is the ONLY place that talks to PostHog from the
 * backend — business logic must call `trackBackendEvent` rather than embedding PostHog calls.
 *
 * It mirrors only events that are NOT already emitted to PostHog by the clients (today: the
 * trial lifecycle, which is server-authoritative and otherwise absent from PostHog). Operational
 * metrics and client-sourced funnel events are intentionally out of scope to avoid double counting.
 *
 * Reliability: never throws, never blocks a request, fails open. Worker `metric()` logs remain
 * the primary operational telemetry and are unaffected.
 */

const POSTHOG_DEFAULT_HOST = 'https://us.i.posthog.com';

/** Events the backend is the source of truth for and which are absent from client PostHog. */
export type BackendFunnelEvent = 'trial_started' | 'trial_converted' | 'trial_cancelled';

export type BackendAnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

export type TrackBackendEventResult =
  | 'sent'
  | 'skipped_disabled'
  | 'skipped_no_distinct_id'
  | 'failed';

export interface TrackBackendEventInput {
  env: Partial<AppBindings>;
  /** Stable user identifier (users.id). Required — we never invent ids. */
  distinctId: string | null | undefined;
  event: BackendFunnelEvent;
  properties?: BackendAnalyticsProperties;
}

function posthogEnabled(env: Partial<AppBindings>): boolean {
  return Boolean(env.POSTHOG_API_KEY && env.POSTHOG_API_KEY.trim());
}

function posthogHost(env: Partial<AppBindings>): string {
  return (env.POSTHOG_HOST?.trim() || POSTHOG_DEFAULT_HOST).replace(/\/$/, '');
}

function sanitize(properties: BackendAnalyticsProperties): BackendAnalyticsProperties {
  return Object.fromEntries(
    Object.entries(properties).filter(
      ([, v]) => v === null || v === undefined || ['string', 'number', 'boolean'].includes(typeof v),
    ),
  );
}

/**
 * Mirror a funnel event to PostHog. Resolves to a status string and never rejects.
 * - No PostHog key configured → `skipped_disabled` (local/dev safe, fail open).
 * - No stable distinct_id → `skipped_no_distinct_id` (we do not fabricate ids).
 */
export async function trackBackendEvent(input: TrackBackendEventInput): Promise<TrackBackendEventResult> {
  try {
    if (!posthogEnabled(input.env)) return 'skipped_disabled';
    const distinctId = input.distinctId?.trim();
    if (!distinctId) return 'skipped_no_distinct_id';

    const res = await fetch(`${posthogHost(input.env)}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: input.env.POSTHOG_API_KEY!.trim(),
        event: input.event,
        properties: {
          distinct_id: distinctId,
          app: 'backend',
          $lib: 'astralis-worker',
          ...sanitize(input.properties ?? {}),
        },
      }),
    });

    if (!res.ok) {
      log(input.env, 'warn', 'posthog_mirror_failed', { event: input.event, status: res.status });
      return 'failed';
    }
    return 'sent';
  } catch (err) {
    // Analytics must never break business logic — swallow and report via logs only.
    log(input.env, 'warn', 'posthog_mirror_error', { event: input.event, error: err });
    return 'failed';
  }
}
