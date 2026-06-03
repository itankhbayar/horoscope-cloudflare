# Analytics event ownership (single source of truth)

**Goal:** every business event has exactly one PostHog source, so the funnel never double-counts.
This document is authoritative. The machine-readable copy of the backend-owned list lives in
[`backend/src/services/analyticsService.ts`](../backend/src/services/analyticsService.ts)
(`BACKEND_OWNED_EVENTS`), mirrored in the web and mobile clients and pinned by an automated test
(see [Safeguards](#5-safeguards)).

> Scope: this is about **duplicate prevention and ownership only**. It does not redesign the
> taxonomy or change business logic.

---

## 1. Where events go

There are **three** code paths, but only **two** reach PostHog.

| Source | File | Transport | `app` property | Reaches PostHog? |
|--------|------|-----------|----------------|------------------|
| Web client | [`frontend/src/lib/analytics.ts`](../frontend/src/lib/analytics.ts) → `track()` | `posthog-js` `.capture()` | `web` | ✅ |
| Mobile client | [`mobile/src/lib/analytics.ts`](../mobile/src/lib/analytics.ts) → `track()` | HTTP `POST /capture/` | `mobile` | ✅ |
| Backend (Worker) | [`backend/src/services/analyticsService.ts`](../backend/src/services/analyticsService.ts) → `trackBackendEvent()` | HTTP `POST /capture/` | `backend` | ✅ (trial trio only) |
| Backend (Worker) | `utils/logger.ts` → `metric()` | `console.log` JSON | — | ❌ **Worker logs only** |

**Critical distinction:** backend `metric(c.env, 'premium_purchased', …)` and friends are **operational
logs**, not PostHog events. They are named like analytics events but never leave Cloudflare. Only
`trackBackendEvent()` mirrors to PostHog, and it is restricted to the trial trio.

The web↔mobile overlap is **not** a duplicate: a given user is on one platform per session, and every
event carries an `app` property, so web `paywall_viewed` and mobile `paywall_viewed` are distinct
rows. "Double-counting" only happens when **the same business action is emitted by two sources for
the same user** — i.e. a client event that the backend also mirrors.

---

## 2. Ownership labels

| Label | Meaning | Who may emit to PostHog |
|-------|---------|-------------------------|
| `BACKEND_OWNED` | Server-authoritative funnel events. Single source is the Worker webhooks. | `trackBackendEvent()` only. Clients **must not** emit. |
| `FRONTEND_OWNED` | Client product/funnel events. | Web and/or mobile `track()`. Backend **must not** mirror. |
| `OPERATIONAL_ONLY` | Telemetry that stays in Worker logs (Cloudflare), never PostHog. | `metric()` only. |

### BACKEND_OWNED (exhaustive)

| Event | Emitted by | Trigger | Idempotency |
|-------|-----------|---------|-------------|
| `trial_started` | Stripe webhook (`customer.subscription.created`, status `trialing`) **and** RevenueCat webhook (`INITIAL_PURCHASE`, `period_type: TRIAL`) | Trial subscription created | Only on freshly-claimed delivery (`action === 'process'` / `trialMetric` returned once) |
| `trial_converted` | Stripe webhook (`customer.subscription.updated`, `trialing → active`) + RevenueCat parity | Trial converts to paid | Same |
| `trial_cancelled` | Stripe webhook (`customer.subscription.deleted` during/within trial) + RevenueCat parity | Trial cancelled before charge | Same |

### OPERATIONAL_ONLY (Worker logs — sample, not exhaustive)

`premium_purchased`, `subscription_restored`, `revenuecat_webhook_processed`,
`stripe_webhook_processed`, `stripe_webhook_ignored`, `stripe_webhook_signature_failed`,
and the backend `compatibility_viewed` metric. These share names with FRONTEND_OWNED PostHog events
**by coincidence of naming** but live only in logs — see the future-risk note in §4.

### FRONTEND_OWNED

The authoritative enumerations are the typed registries themselves:

- Web: the `AnalyticsEvent` union in [`frontend/src/lib/analytics.ts`](../frontend/src/lib/analytics.ts).
- Mobile: the `AnalyticsEventMap` in [`mobile/src/lib/analytics.ts`](../mobile/src/lib/analytics.ts).

Everything in those registries **except** the backend-owned trial trio is `FRONTEND_OWNED`. Notable
events and their sources:

| Event | Source | Risk | Recommendation |
|-------|--------|------|----------------|
| `app_open` | Frontend (web + mobile) | Low — disambiguated by `app`; intentionally multi-fire per launch/reload | Keep client-owned. Do not mirror server-side. |
| `signup_started`, `signup_completed`, `login` | Frontend (web + mobile) | Low | Keep client-owned. |
| Onboarding set (`onboarding_started`, `birth_data_completed`, `first_value_shown`, `account_creation_prompt_shown`, `account_created_after_value`, `onboarding_abandoned`, `preview_*`) | Frontend (web + mobile) | Low | Keep client-owned. |
| `horoscope_viewed`, `first_horoscope_revealed`, `daily_reading_*`, `daily_ritual_completed`, `streak_*` | Frontend (web + mobile) | Low | Keep client-owned. |
| `horoscope_share_card_*`, `compatibility_share_*`, `compatibility_landing_*` | Frontend (web + mobile) | Low | Keep client-owned. |
| `paywall_viewed` | Frontend (web + mobile) | **Medium** — mobile dual-emits it as a legacy alias of `premium_continuation_viewed` (intentional, transitional) | Tracked in [analytics-ritual-event-migration.md](analytics-ritual-event-migration.md). Use canonical event for new code; drop the alias when dashboards migrate. |
| `checkout_started` | Frontend (web + mobile) | Low | Keep client-owned. |
| `premium_purchased` | Frontend (web + mobile) PostHog; backend `metric()` **log only** | **Medium (future)** | Never promote the backend log to `trackBackendEvent`. Guard in place (§5). |
| `subscription_restored` | Frontend (web + mobile) PostHog; backend `metric()` **log only** | **Medium (future)** | Same as `premium_purchased`. |
| `trial_cta_clicked` | Frontend (web + mobile) | Low — same *funnel* as `trial_started` but a **different business action** (CTA tap vs store-confirmed trial); names intentionally distinct | Keep distinct. Never rename to `trial_started`. |
| `trial_started` | **BACKEND_OWNED** | **High → mitigated** | See §3/§5. Client emission is now a compile error + runtime drop + CI scan. |

---

## 3. Duplicate-risk findings

### a) Same name, two sources — the real double-count vector

- **`trial_started`** — backend is authoritative (both Stripe and RevenueCat webhooks). The web
  client never had it in its union. The **mobile** `AnalyticsEventMap` still *declared* it (for
  payload documentation), so `track('trial_started', …)` used to type-check — a latent double-count
  if an engineer re-added a client emitter. **Fixed:** mobile `track()` is now narrowed to
  `ClientEmittableEvent` (excludes the trio), so a client emission no longer compiles; a runtime
  guard drops it; and a CI test scans client source for any emission. No live client emitter exists
  today.

### b) Same business action, different names

- **`trial_cta_clicked` vs `trial_started`** — intentionally distinct (intent vs confirmation). Not a
  duplicate; keep both.
- **Mobile legacy aliasing** — `trackRitualEvent()` deliberately emits a canonical event **and** a
  legacy alias (`paywall_viewed`, `locked_content_tapped`, `reading_revealed`,
  `premium_paywall_triggered`) during the ritual-language migration. This is an *intentional,
  documented* dual-write within a single source (mobile), not a cross-source duplicate. Owner:
  [analytics-ritual-event-migration.md](analytics-ritual-event-migration.md).

### c) Multi-fire from retries / replays / reloads / restarts

| Vector | Event(s) | Status |
|--------|----------|--------|
| Stripe webhook retry / replay | trial trio | **Safe** — `processStripeWebhookEventIdempotently` returns `action: 'process'` only on first claim; mirror gated on it. |
| RevenueCat webhook retry | trial trio | **Safe** — service returns `trialMetric` only on first claim. |
| Page reload / app restart | `app_open`, `paywall_viewed` | **By design** — these are per-view/session events; not funnel-unique. |
| Network recovery (web) | queued client events | Low — web queues only after init starts; at-most-once flush. |
| Mobile network failure | any client event | Low — `fetch` failure is swallowed; no retry, so no replay duplication. |

---

## 4. Events likely to become duplicates in future development

1. **`premium_purchased` / `subscription_restored`** — backend already computes these as `metric()`
   logs. The tempting "let's see purchases in PostHog too" change would mirror them via
   `trackBackendEvent`, instantly double-counting the client event. **Mitigation:** `trackBackendEvent`
   refuses any event not in `BACKEND_OWNED_EVENTS` (runtime guard + test).
2. **`trial_converted` / `trial_cancelled`** — backend-only today. A client could add a store-side
   approximation. **Mitigation:** excluded from `ClientEmittableEvent`; CI scan covers all three.
3. **New backend funnel events** — any future server-authoritative event must be added to
   `BACKEND_OWNED_EVENTS` (and this doc) *and* kept out of client registries. The cross-source test
   pins the three copies together so they cannot silently diverge.

---

## 5. Safeguards (implemented)

| Safeguard | Location | Enforced by |
|-----------|----------|-------------|
| Canonical owned-list + `isBackendOwnedEvent()` | `backend/.../analyticsService.ts` | — |
| Backend mirrors **only** owned events (refuses others) | `trackBackendEvent()` runtime guard | `analyticsOwnership.crossSource.test.ts` (CI) |
| Clients **cannot compile** an emission of an owned event | `track()` narrowed to `ClientEmittableEvent` (web + mobile) | `npm run typecheck` (CI; mobile now included) + frontend `type-check` build |
| Clients drop an owned event at runtime (JS-caller defense) | web + mobile `track()` guard | unit tests |
| No client source emits an owned event | repo-wide scan of `frontend/src` + `mobile/src` | `analyticsOwnership.crossSource.test.ts` (**backend Vitest — the suite CI runs**) |
| The three owned-list copies stay identical | constant in each package | cross-source test pins all three |

**Why the cross-source scanner lives in the backend suite:** CI runs `npm test -w backend` (plus
typecheck and the frontend build). Frontend/mobile Vitest suites are **not** run in CI today, so the
one reliably-executed automated guard against a client emitting a backend-owned event is placed in
the backend suite, which reads the sibling client sources directly.

### Known coverage gap (not a duplicate risk, but worth noting)

Frontend and mobile Vitest suites are not executed in CI; only their type-checks run. The
compile-time `ClientEmittableEvent` guard and the backend cross-source scanner together still make a
client double-count fail CI, but consider adding `npm test -w horoscope-frontend` and
`npm test -w astralis-mobile` to the CI `validate` job for fuller coverage.

---

## 6. Adding analytics safely — checklist for engineers

1. Is the event **server-authoritative** (only the backend knows the truth, e.g. a webhook state
   change)? → add it to `BACKEND_OWNED_EVENTS`, this doc, and emit via `trackBackendEvent`. Never add
   it to a client registry.
2. Is it a **client product/funnel** event? → add it to the web/mobile registry and emit via
   `track()`. Never mirror it from the backend.
3. Need it in **Worker logs only**? → use `metric()`. Do not reuse a name that a client already sends
   to PostHog unless you are certain it will never be promoted to `trackBackendEvent`.
4. Run `npm run typecheck` and `npm test -w backend` — the ownership guards will fail loudly if a
   business event gains a second source.
