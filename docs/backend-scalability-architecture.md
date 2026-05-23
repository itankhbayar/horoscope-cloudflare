# Backend Scalability Architecture

## Current Posture

The backend stays intentionally Cloudflare-native:

- Workers remain stateless request handlers.
- D1 is still the primary relational store.
- JWT access tokens are short-lived and refresh sessions are D1-backed.
- Rate limiting is no longer process-memory-only on production paths.
- Cron jobs now prewarm user-facing cache data and clean operational tables.

This is a pragmatic SaaS-scale design, not an enterprise distributed-systems cosplay layer.

## D1 Limits And Bottlenecks

D1 is the primary scaling constraint because write-heavy flows serialize through a regional SQLite-backed database. The highest-risk write paths are:

- Refresh token rotation: insert new session, revoke old session.
- Logout-all: update user token version and revoke sessions.
- Stripe webhook idempotency: claim event, update processed/failed state.
- Cache prewarm jobs: insert or update generated horoscope/tarot rows.
- Notification token updates.

The design keeps D1 healthy by:

- Indexing hot lookup and cleanup predicates.
- Keeping access tokens stateless.
- Avoiding per-request session writes.
- Running cleanup deletes in small chunks.
- Reserving Durable Objects for coordination rather than replacing D1.

## Rate Limiting

Production rate limiting now uses this priority order:

1. Cloudflare Rate Limiting bindings:
   - `LOGIN_RATE_LIMITER`
   - `REGISTER_RATE_LIMITER`
   - `REFRESH_RATE_LIMITER`
   - `PUBLIC_RATE_LIMITER`

2. Durable Object fallback:
   - `RATE_LIMITER_DO`
   - one bucket object per rate-limit key
   - exact token-bucket-style coordination for a key

3. Local in-memory fallback:
   - test/development only
   - production fails closed with `503` if no distributed backend exists

Cloudflare Rate Limiting bindings are very fast and suitable for most API abuse controls, but they are local to a Cloudflare location and intentionally permissive. For globally consistent security-sensitive coordination, prefer the Durable Object fallback.

Route-level configuration lives in middleware calls:

```ts
createRateLimitMiddleware({
  keyPrefix: 'auth:login',
  limit: 5,
  windowMs: 60_000,
  binding: 'LOGIN_RATE_LIMITER',
});
```

Keys support per-IP and per-user scopes. Pre-auth routes use IP. Authenticated routes can use user IDs.

## Index Audit

Added or confirmed indexes:

- `refresh_sessions.token_hash`: refresh lookup and rotation.
- `refresh_sessions.user_id`: logout-all and account cleanup.
- `refresh_sessions.family_id`: refresh token reuse family revocation.
- `refresh_sessions.expires_at`: expired-session cleanup.
- `stripe_webhook_events.event_id`: primary key for idempotency.
- `stripe_webhook_events.status, claimed_at`: stale processing claim retries.
- `stripe_webhook_events.processed_at`: processed webhook cleanup.
- `users.stripe_customer_id`: webhook subscription/customer resolution.
- `users.stripe_subscription_id`: subscription reconciliation.
- `users.is_premium`: premium cohort/admin queries.
- `notification_preferences.user_id`: explicit user preference lookup.
- `push_tokens.user_id`: already present for notification token management.
- `daily_horoscopes.date`: cache cleanup and prewarm date scans.
- `tarot_daily.date`: cache cleanup and prewarm date scans.

Indexes intentionally mirror real query predicates. There is no broad indexing pass on every column because that would slow writes and bloat D1.

## Cleanup Strategy

Cron cleanup runs after daily prewarm and is idempotent. Each job deletes in chunks to avoid large write spikes:

- Expired refresh sessions after a short grace retention.
- Revoked refresh sessions after a longer audit/debug retention.
- Processed Stripe webhook events after retention.
- Old daily horoscope cache rows.
- Old tarot cache rows.

Failed cleanup does not fail the whole scheduled event. Each job logs:

- job name
- deleted row count
- chunk count
- duration

## Write Amplification Notes

Refresh rotation still performs security-critical writes:

- create replacement session
- revoke the old session
- record replacement link

It does not update refresh sessions on normal authenticated API requests. `last_used_at` is updated only during rotation/revocation paths, not on every access-token request. That preserves replay detection while avoiding a write on every API call.

## Observability

The backend now emits lightweight structured logs for:

- request completion with request ID, status, latency
- auth failures
- refresh rotation/failure/logout events
- rate-limit backend failures and 429s
- cron start/completion/failure
- cleanup job metrics
- webhook processing outcomes

Cloudflare Workers Logs can query these JSON fields directly. No external observability vendor is required, though Sentry remains available for exceptions.

## Durable Object Guidance

Use Durable Objects when correctness depends on coordinated state for a key:

- stricter global rate limiting
- session replay coordination beyond D1
- device/session coordination
- user-specific mutable counters
- multiplayer or real-time state

Do not use one global Durable Object for all traffic. Shard by stable key: user ID, tenant ID, route+actor, or resource ID.

## KV Caveats

KV is useful for low-cost cache and configuration reads, but it is eventually consistent. Do not use KV as the primary correctness layer for:

- auth/session revocation
- refresh token reuse detection
- payment idempotency
- security rate limits that must be precise

Acceptable KV uses:

- public content cache
- feature flags with propagation tolerance
- generated static payloads
- non-security counters

## Future Scaling Paths

These are trigger-based migration paths, not work to do now:

- D1 sharding/per-tenant DBs:
  - trigger: one D1 database approaches write/read limits or tenant isolation becomes contractual
  - path: route tenants to separate D1 bindings by tenant metadata

- Durable Objects:
  - trigger: coordination-heavy workloads need per-key consistency
  - path: use one object per user/tenant/resource, never one object for global traffic

- Queues:
  - trigger: webhook or notification fanout starts affecting request latency
  - path: HTTP handler validates and enqueues; consumer performs side effects and retries

- KV/R2 cache layers:
  - trigger: read-heavy generated payloads dominate D1 reads
  - path: keep D1 source of truth, cache public/generated payloads in KV/R2

- Postgres migration:
  - trigger: multi-region relational writes, complex reporting, large joins, or D1 write throughput becomes the primary product limiter
  - path: keep Workers API, connect through Hyperdrive, migrate write-heavy tables first

## Operational Checklist

- Apply D1 migrations in order, including `0010_scalability_indexes.sql`.
- Deploy the Durable Object migration in `wrangler.jsonc`.
- Confirm Rate Limiting binding namespace IDs are unique within the Cloudflare account.
- Enable Workers observability/logs in production.
- Watch D1 row writes during auth refresh peaks.
- Watch `rate_limit_backend_missing` logs; production should have none.
