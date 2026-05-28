# Compatibility acquisition analytics & PostHog dashboard

Measurement spec for the compatibility viral loop. **Do not treat the full cross-user funnel as a single PostHog funnel** — shares (user A) and landings (user B) are different people unless you add a `share_ref` join key.

---

## 1. Current analytics architecture

| Layer | Web (`frontend/src/lib/analytics.ts`) | Mobile (`mobile/src/lib/analytics.ts`) |
|--------|--------------------------------------|----------------------------------------|
| Transport | `posthog-js` SDK (`capture`) | HTTP `POST /capture/` |
| Identity | PostHog `distinct_id` (cookie + localStorage) | Random `install_id` in AsyncStorage |
| Consent | `astralis_privacy_consent_v1` → `initAnalytics()` / `shutdownAnalytics()` | `analytics:consent` = `granted` / `declined` |
| Global props | `app: 'web'` on every event | `app: 'mobile'`, `platform: ios \| android` |
| Pageviews | Disabled (`capture_pageview: false`) | N/A |
| Autocapture | Disabled | N/A |

**Consent gaps**

- Web: Events before “Allow analytics” are **dropped** (no queue unless init already started).
- Web: `app_open` fires in `main.ts` even when PostHog is not initialized (under-counts in PostHog, not harmful).
- Mobile: All compatibility events gated on consent — MN/web landing comparisons must filter consented users only.

**Not in PostHog today**

- Backend `metric(c.env, 'compatibility_viewed')` — Cloudflare metrics only.
- No repo-stored PostHog dashboard JSON; dashboards are created in PostHog UI using this doc.

---

## 2. Event audit

### Sharer-side (in-app)

| Event | Fired when | Payload today | Issues |
|--------|------------|---------------|--------|
| `compatibility_viewed` | After **successful** API compare | `mode`, `sign1`, `sign2`, `app` | Only premium+auth users; **not** guest landing. Under-counts sharers if API fails. |
| `compatibility_share_card_viewed` | When `result` is set | `surface`, `sign1`, `sign2`, `score`, `app` | Fires on result load, **not** card in viewport → overcounts “saw card”. |
| `compatibility_share_cta_clicked` | Share button tap | same | OK |
| `compatibility_share_link_created` | Same tap as CTA | same | **Duplicate intent** with CTA; use for debugging only, not funnel step. |
| `compatibility_share_completed` | Native share / clipboard success | `method` | OK; cancel → `compatibility_share_failed`. |
| `compatibility_share_failed` | Share error | `reason` | Use for completion rate denominator adjustments. |

### Recipient-side (web landing)

| Event | Fired when | Payload today | Issues |
|--------|------------|---------------|--------|
| `compatibility_share_landing_viewed` | `onMounted` | `sign1`, `sign2`, `source` | `source` only `share_card \| unknown` (UTM not broken out). |
| `compatibility_landing_score_displayed` | Same mount | + `shared_score`, `url_score` | **Redundant** with landing_viewed on every load. |
| `compatibility_landing_sign_selected` | Sign picked | + `recipient_sign`, `compare_with` | OK |
| `compatibility_guest_compare_completed` | `recipientResult` watch | + `score` (guest) | **Re-fires** when toggling compare target → overcounts. |
| `compatibility_landing_cta_clicked` | Primary / toggle / save | `cta` | OK; segment by `cta`. |

### Signup (weak attribution)

| Event | Fired when | Payload today | Issues |
|--------|------------|---------------|--------|
| `signup_started` | Register submit (web) | `step` only | **No** `signup_source` / UTM / pair. |
| `signup_completed` | Auth register success | **empty** on web | Cannot attribute to compatibility landing. |

### Recommended property additions (high ROI, same event names)

Add on all compatibility + landing events (implemented in `compatibilityAnalytics.ts` where wired):

- `locale`: `en` \| `mn`
- `pair_key`: sorted `sign1_sign2`
- `score_band`: `below_55` \| `55_69` \| `70_84` \| `85_plus`
- `utm_source`, `utm_medium`, `utm_campaign` (landing)

Add on signup:

- `signup_source`: e.g. `compatibility_landing` (query `?signup_source=` on register link)

**Do not add** `compatibility_share_link_created` to production funnels.

---

## 3. Dashboard specification

**PostHog project:** Astralis production  
**Dashboard name:** `Compatibility acquisition`  
**Default filters:** Last 30 days, production host if using multiple envs.

### Tiles layout (7 rows)

1. **Headline KPIs** (4 trends)
2. **Sharer funnel** (funnel)
3. **Recipient funnel** (funnel)
4. **Share performance** (6 insights)
5. **Recipient activation** (table + trends)
6. **Viral health** (formula + table)
7. **MN vs EN** + **Top pairs** (2 insights)

---

## 4. PostHog dashboard configuration

### Global dashboard filters

- Property: `app` — breakdown available per chart
- Optional cohort: “Analytics consented” (if you tag persons)

### Row 1 — Headline KPIs (Trends, 30d)

| Tile | Event / formula |
|------|-----------------|
| Share rate | Formula: `A/B` — A=`compatibility_share_completed`, B=`compatibility_viewed` |
| Landing views | `compatibility_share_landing_viewed` count |
| Guest compare rate | `compatibility_guest_compare_completed` / `compatibility_share_landing_viewed` |
| Signups from landing | `signup_completed` where `signup_source = compatibility_landing` |

---

## 5. Funnel definitions

### A. Sharer funnel (same user, `app` = web or mobile)

**Type:** Sequential funnel, conversion window **7 days**, step order **strict**.

| Step | Event | Notes |
|------|--------|------|
| 1 | `compatibility_viewed` | Premium compare succeeded |
| 2 | `compatibility_share_card_viewed` | Overcounts vs true “saw card” |
| 3 | `compatibility_share_cta_clicked` | |
| 4 | `compatibility_share_completed` | Exclude if `compatibility_share_failed` same session (optional) |

**Drop-off read:**

- 1→2 low: result without scroll to share / card view fires too early
- 3→4 low: share sheet cancel — check `compatibility_share_failed`

**Do not include** `compatibility_share_link_created` as a step.

### B. Recipient funnel (same user, **`app = web` only**)

| Step | Event |
|------|--------|
| 1 | `compatibility_share_landing_viewed` |
| 2 | `compatibility_landing_sign_selected` |
| 3 | `compatibility_guest_compare_completed` |
| 4 | `signup_started` where `signup_source = compatibility_landing` |
| 5 | `signup_completed` where `signup_source = compatibility_landing` |

**Drop-off read:**

- 1→2: picker friction / score mismatch
- 2→3: should be ~100% unless bug — if not, guest compare overcount or watch bug
- 3→4: account optional — expect large drop (by design)

### C. “Full loop” (NOT a standard PostHog funnel)

Requested chain crosses users:

`compatibility_viewed` → … → `compatibility_share_landing_viewed` → …

**Use instead:**

- **Ratio math** (weekly): `landing_viewed` / `share_completed` = landing visits per share
- **K approximation:** `shares_per_viewer × landings_per_share × signups_per_landing`

---

## 6. Insights queries (HogQL / Trends)

### Share performance

**Share rate (trend)**

```sql
SELECT
  toStartOfDay(timestamp) AS day,
  countIf(event = 'compatibility_share_completed') AS shares,
  countIf(event = 'compatibility_viewed') AS views,
  shares / nullIf(views, 0) AS share_rate
FROM events
WHERE event IN ('compatibility_share_completed', 'compatibility_viewed')
  AND timestamp >= now() - INTERVAL 30 DAY
GROUP BY day
ORDER BY day
```

**Share completion rate**

```sql
-- Trends: share_completed / share_cta_clicked (unique users)
```

**Landing views per share**

```sql
SELECT
  countIf(event = 'compatibility_share_landing_viewed') /
  nullIf(countIf(event = 'compatibility_share_completed'), 0) AS landings_per_share
FROM events
WHERE timestamp >= now() - INTERVAL 30 DAY
```

**Landing by `utm_source`**

- Trends → `compatibility_share_landing_viewed` → Breakdown → property `utm_source`

**Landing by locale**

- Breakdown → property `locale` (after instrumentation)

**Landing by score band**

- Breakdown → property `score_band`

**Landing by platform (sharer)**

- Sharer: breakdown `platform` on `compatibility_share_completed`
- Recipient: only web (`app = web`)

### Recipient activation

| Metric | Numerator | Denominator |
|--------|-----------|-------------|
| Sign selection rate | `compatibility_landing_sign_selected` | `compatibility_share_landing_viewed` |
| Guest compare rate | `compatibility_guest_compare_completed` | `compatibility_share_landing_viewed` |
| CTA click rate | `compatibility_landing_cta_clicked` | `compatibility_share_landing_viewed` |
| Signup rate | `signup_completed` + `signup_source` | `compatibility_share_landing_viewed` |

Break down each by: `locale`, `pair_key`, `score_band`.

### Viral health (weekly formula panel)

| Metric | Formula |
|--------|---------|
| Share rate | `share_completed` / `compatibility_viewed` |
| Landing activation | `guest_compare_completed` / `landing_viewed` |
| Signup conversion | `signup_completed` (source=landing) / `landing_viewed` |
| Shares per user | `share_completed` unique users / `compatibility_viewed` unique users |
| Landings per share | `landing_viewed` / `share_completed` |
| Selections per landing | `sign_selected` / `landing_viewed` |
| Signups per landing | `signup_completed` / `landing_viewed` |

**Estimated K (rough):**

`K ≈ (share_completed / compatibility_viewed) × (landing_viewed / share_completed) × (signup_completed / landing_viewed)`

Simplifies to `signup_completed / compatibility_viewed` **only if** same cohort and steady state — usually **overstates** K because numerators/denominators are different users.

### Top performing sign pairs

**Most shared**

```sql
SELECT properties.pair_key AS pair, count() AS shares
FROM events
WHERE event = 'compatibility_share_completed'
  AND timestamp >= now() - INTERVAL 30 DAY
GROUP BY pair
ORDER BY shares DESC
LIMIT 20
```

**Highest CTR (proxy)**

```sql
SELECT
  properties.pair_key AS pair,
  countIf(event = 'compatibility_share_landing_viewed') AS landings,
  countIf(event = 'compatibility_share_completed') AS shares,
  landings / nullIf(shares, 0) AS landings_per_share
FROM events
WHERE event IN ('compatibility_share_landing_viewed', 'compatibility_share_completed')
GROUP BY pair
HAVING shares >= 10
ORDER BY landings_per_share DESC
LIMIT 20
```

**Highest signup conversion**

```sql
SELECT
  properties.pair_key AS pair,
  countIf(event = 'signup_completed' AND properties.signup_source = 'compatibility_landing') AS signups,
  countIf(event = 'compatibility_share_landing_viewed') AS landings,
  signups / nullIf(landings, 0) AS signup_rate
FROM events
WHERE timestamp >= now() - INTERVAL 30 DAY
GROUP BY pair
HAVING landings >= 20
ORDER BY signup_rate DESC
```

### Mongolia market

Compare filters:

- `properties.locale = 'mn'` vs `properties.locale = 'en'`

Metrics: share rate, landing activation, signup conversion (same formulas as viral health).

**Until `locale` is on events:** use landing page language switcher as imperfect proxy or PostHog GeoIP (weak for MN diaspora).

---

## 7. Missing analytics (prioritized)

| Priority | Item | Why |
|----------|------|-----|
| P0 | `locale`, `utm_*`, `pair_key`, `score_band` on landing/share | MN + channel dashboards |
| P0 | `signup_source` on signup events | Recipient → user |
| P0 | `share_ref` (uuid in share URL) | True landings-per-share |
| P1 | Dedupe `guest_compare_completed` on compare toggle | Activation rate accuracy |
| P1 | Fire `share_card_viewed` on intersection observer | Fix overcount |
| P1 | Merge or drop `landing_score_displayed` | Redundant with landing_viewed |
| P2 | `compatibility_share_cancelled` | Sharer funnel 3→4 |
| P2 | Person `identify` on web signup | Cross-device |
| P2 | Mobile person = user id after login | Mobile loop completeness |

**Events that fire too early**

- `compatibility_share_card_viewed` — on result, not card view
- `compatibility_share_link_created` — on click, not link created

**Events that overcount**

- `compatibility_guest_compare_completed` — each compare-target toggle
- `compatibility_landing_score_displayed` — 1:1 with landing_viewed

---

## 8. Files changed (instrumentation + spec)

| File | Change |
|------|--------|
| `docs/analytics-compatibility-acquisition-dashboard.md` | This specification |
| `frontend/src/lib/compatibilityAnalytics.ts` | Shared properties helpers |
| `frontend/src/pages/CompatibilityStaticPage.vue` | Enriched landing events; dedupe guest compare |
| `frontend/src/pages/CompatibilityPage.vue` | Enriched share events + locale |
| `frontend/src/pages/CompatibilityStaticPage.vue` | Register link `signup_source` query |
| `frontend/src/pages/RegisterPage.vue` | Pass `signup_source` to signup events |
| `frontend/src/stores/auth.ts` | `signup_completed` properties |
| `mobile/src/screens/CompatibilityScreen.tsx` | Enriched share events + locale |

---

## 9. Verification steps

1. **Consent:** Decline analytics → confirm no compatibility events in PostHog Live (web + mobile).
2. **Sharer path:** Complete compare → share → verify sequence: `compatibility_viewed` → `share_cta_clicked` → `share_completed` with `locale`, `pair_key`, `score_band`, `app=web|mobile`.
3. **Landing path:** Open `/compatibility/leo/aquarius?utm_source=compatibility_share&utm_medium=share_card&score=78` → verify `landing_viewed`, `sign_selected`, `guest_compare_completed` with UTM + locale.
4. **Toggle compare:** Switch sign1/sign2 target → **one** `guest_compare_completed` per sign selection (after dedupe fix).
5. **Signup:** Click “Save match” → register with `signup_source=compatibility_landing` → `signup_started` / `signup_completed` carry source.
6. **PostHog:** Import funnels A & B; confirm step conversion % render; formula tiles match manual counts for a test day.

---

## 10. Brutal blind spots (remaining)

1. **Cross-user funnel illusion** — Share and landing are different `distinct_id`s; one funnel will always lie.
2. **No `share_ref`** — Cannot attribute which share produced which landing (only aggregate ratio).
3. **`compatibility_viewed` ≠ “used compatibility”** — Premium-gated API; share rate denominator is tiny and biased.
4. **Web vs mobile identity split** — Same human can be two PostHog persons.
5. **Consent selection bias** — MN users who decline analytics are invisible.
6. **Organic landings** — `source=unknown` pollutes share_card attribution; SEO `/compatibility/*` traffic mixed in.
7. **Clipboard share** — No proof recipient opened link; `share_completed` ≠ “sent to person”.
8. **PostHog `method=download`** on web image path may be under-used on mobile (text-only share).
9. **`signup_completed` without login on landing** — Most value is guest compare; signup is optional and under-tracked.
10. **No holdout / experiment layer** — Cannot prove Landing V2 lift without before/after or `experiment` flag.

---

## Quick answers to goal questions

| Question | How to answer in PostHog |
|----------|-------------------------|
| Where are users dropping off? | Funnel A (sharer) + Funnel B (recipient), separate |
| Is sharing happening? | `share_completed` volume; share rate; `share_failed` rate |
| Are recipients activating? | Funnel B steps 2–3; guest compare rate |
| Are recipients becoming users? | `signup_completed` with `signup_source=compatibility_landing` |
| Is the viral loop working? | Weekly `landings_per_share`, `selections_per_landing`, `signups_per_landing`; treat K as directional only |
