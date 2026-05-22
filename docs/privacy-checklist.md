# Astralis Privacy Checklist

Last reviewed: 2026-05-22

## Sensitive Data Inventory

- Account data: email, password hash, full name, display name, bio, avatar URL, timezone.
- Birth and astrology data: birth date, optional birth time, birth city/country, coordinates, timezone offset, natal chart placements, houses, aspects.
- Billing data: Stripe customer ID, Stripe subscription ID, app store or RevenueCat entitlement status where configured. Full payment details are not stored by Astralis.
- Notifications: notification preferences, Expo push token, platform/device metadata.
- Operational data: structured logs, request IDs, webhook event IDs, cache metrics, cron status logs.
- Analytics data: privacy-safe product events only; no birth time, birth location, raw chart placements, passwords, secrets, tokens, or payment details.

## Storage Locations

- Cloudflare D1: users, birth profiles, natal charts, compatibility records, notification preferences, push tokens, Stripe webhook event IDs, daily horoscope/tarot cache rows.
- Cloudflare R2: profile avatar objects when configured.
- Client local storage: auth token, cached user profile, locale, privacy consent preference.
- Third parties: Stripe/app stores process payment details; PostHog receives optional product analytics after consent; Sentry receives error telemetry when configured.

## Access Controls

- User data routes require authenticated JWTs.
- Admin prewarm routes require `ADMIN_SECRET` and use constant-time comparison.
- Billing webhook routes require valid Stripe webhook signatures or RevenueCat authorization.
- Production secrets are expected to live in Cloudflare secret bindings, not source control.

## Retention And Deletion

- Account deletion removes the user row, birth profile, natal chart, notification preferences, push tokens, and profile avatar objects when storage is configured.
- Saved compatibility results are anonymized by clearing user references.
- Payment processors may retain billing records under their own legal, tax, fraud, dispute, and accounting obligations.
- Stripe webhook event IDs are retained for idempotency and operational auditability.

## User Rights Support

- Data export: `GET /api/account/export` returns JSON for authenticated users.
- Account deletion: `DELETE /api/account` deletes/removes the primary user data listed above.
- Consent update: frontend privacy banner stores analytics consent locally and allows later changes.
- Manual privacy requests: direct users to `ankhbayr2017@gmail.com`.

## Analytics Safeguards

- Events must stay product-level and privacy-safe.
- Allowed examples: `signup_started`, `signup_completed`, `login`, `horoscope_viewed`, `compatibility_viewed`, `paywall_viewed`, `checkout_started`, `premium_purchased`, `subscription_restored`.
- Do not include birth time, birth location, raw chart placements, email, full name, passwords, JWTs, Stripe secrets, webhook signatures, or payment details.
