# Frontend Architecture Audit

Date: 2026-05-22

Scope: `frontend/` Vue 3 + Vite + Vue Router app deployed on Cloudflare Pages.

## Executive Scorecard

| Area | Before | After this pass | Brutal read |
| --- | ---: | ---: | --- |
| Architecture | 5/10 | 7/10 | The app had a workable Vue shape, but state and domain boundaries were informal. Stores now exist; feature extraction is still incremental. |
| Performance | 5/10 | 7/10 | Router-level eager imports were the biggest immediate issue. Lazy routes, async shell components, manual chunks, and asset headers are now in place. |
| SEO readiness | 6/10 | 7/10 | Zodiac, compatibility, and legal routes already had custom prerendering. It is not true SSR, so dynamic/private app pages remain SPA-only by design. |
| Maintainability | 5/10 | 7/10 | Composables used module refs as hidden global state. Pinia stores now own app state with old composable wrappers preserved. |
| State management | 3/10 | 7/10 | Pinia was installed but unused. Auth, profile, premium, settings, and consent stores now exist. |
| Bundle optimization | 4/10 | 7/10 | No confirmed splitting strategy before. Route chunks and vendor buckets now make bundle behavior explicit. |

## SEO-Critical Routes

These should stay prerendered or become SSR/SSG in any future migration:

- `/horoscope/:sign`
- `/horoscope/:sign/today`
- `/compatibility/:sign1/:sign2`
- `/privacy`
- `/terms`
- `/delete-account`
- Public acquisition routes if opened to crawlers later: `/login`, `/register`, `/premium`

Authenticated app routes should remain `noindex` or blocked:

- `/`
- `/profile`
- `/chart`
- `/compatibility`
- `/tarot`
- `/premium/success`
- `/premium/cancel`

## What Changed

- Added Pinia installation in `frontend/src/main.ts`.
- Added stores:
  - `frontend/src/stores/auth.ts`
  - `frontend/src/stores/userProfile.ts`
  - `frontend/src/stores/premium.ts`
  - `frontend/src/stores/appSettings.ts`
  - `frontend/src/stores/consent.ts`
- Kept `useAuth` and `useProfile` as compatibility wrappers so the migration does not break existing pages.
- Converted router pages to lazy imports in `frontend/src/router/index.ts`.
- Added idle prefetch for likely next routes after guest/home navigation.
- Added `<Suspense>` around `router-view`.
- Converted footer, language switcher, and consent banner to async shell components.
- Added image lazy decoding for the profile avatar.
- Added manual vendor chunking in `frontend/vite.config.ts`.
- Added Cloudflare Pages `_headers` for immutable built assets and security headers.
- Added scalable folder placeholders: `app/`, `features/`, `services/`, `types/`.

## Before Architecture

```text
src/
  App.vue
  main.ts
  router/
  pages/
  components/
  composables/     global state lived here via module-level refs
  lib/             API clients, services, storage, analytics, domain helpers mixed together
  i18n/
  assets/
```

## Target Architecture

```text
src/
  app/             app bootstrap, providers, app-level shell wiring
  pages/           route entry components only
  features/        domain slices such as auth, profile, billing, tarot
  components/      shared presentational components
  composables/     view helpers and compatibility wrappers, not primary global state
  stores/          Pinia state and actions
  services/        API orchestration, repositories, external SDK adapters
  lib/             framework-agnostic primitives and low-level helpers
  utils/           pure utility functions
  router/          route table, guards, prefetch policy
  types/           shared frontend-only TypeScript contracts
```

Layer purpose:

- `app`: boot order and providers belong here once `main.ts` gets too busy.
- `pages`: one component per route; avoid storing domain logic here.
- `features`: colocate feature UI, feature composables, and feature-only helpers.
- `components`: reusable dumb UI and layout primitives.
- `composables`: Vue composition helpers; use Pinia for shared state.
- `stores`: source of truth for auth/session/profile/premium/privacy/settings.
- `services`: network and SDK boundaries.
- `lib`: stable primitives such as `apiClient`, storage adapters, analytics adapters.
- `utils`: pure functions with no Vue/runtime dependency.
- `router`: routes, guards, route meta, and prefetch policy.
- `types`: contracts that are not owned by a single feature.

## State Strategy

Persistence is intentionally selective:

- Auth token and cached user remain in the existing SSR-safe storage adapter.
- Profile data is not persisted in Pinia because it contains sensitive birth/profile data.
- Premium status is derived from the authenticated user and refreshed after checkout.
- Consent is persisted in `localStorage` through the existing privacy consent module.
- App settings persist only low-risk preferences such as locale/reduced motion.

This avoids a common production mistake: dumping all Pinia state into local storage.

## Rendering Strategy

Current best path: hybrid static prerender + SPA.

- Keep Cloudflare Pages.
- Keep custom prerendering for SEO-critical public routes.
- Keep authenticated routes SPA-only.
- Improve `scripts/prerender-zodiac-pages.mjs` over time, or replace it with Vite SSG once content grows beyond simple generated pages.

Nuxt migration is not required yet. It becomes justified only if public content becomes CMS-driven, route count grows substantially, or SEO pages need live backend data at render time.

## Performance Impact

Expected wins:

- Smaller initial JS because every page is no longer imported in the router entry.
- Better repeat navigation through idle prefetch of likely next route chunks.
- Long-term caching for hashed Vite assets on Cloudflare.
- Lower main chunk volatility because observability libraries and Vue platform packages are chunked separately.

Remaining risks:

- `App.vue` still generates 140 animated stars on mount. Consider CSS-only background or reduced-motion gating.
- Some large route pages still mix data, validation, modal, and view logic. Move them into `features/` gradually.
- No bundle analyzer is installed. Add `rollup-plugin-visualizer` only when you need concrete budget enforcement.

## SEO Impact

Current public SSG coverage is decent:

- Sitemap generation exists.
- `robots.txt` is generated in the prerender script.
- OG/Twitter/canonical tags exist for prerendered pages and runtime pages using `useDocumentMeta`.

Gaps:

- The root app page is auth-gated, so public homepage/acquisition SEO is weak by product choice.
- `useDocumentMeta` only runs client-side; crawlers rely on prerendered HTML for SEO-critical routes.
- Default OG images are SVG; acceptable, but test social unfurls because some surfaces are inconsistent with SVG cards.

## Priority Order

1. Keep this Pinia migration and route splitting.
2. Move profile and premium page internals into `features/profile` and `features/premium`.
3. Add a CI bundle budget using `vite build --report` equivalent or `rollup-plugin-visualizer`.
4. Add a public marketing route if acquisition SEO matters.
5. Replace the custom prerender script with Vite SSG only if route/content complexity grows.
6. Add error boundary components for route-level failures.
7. Add RUM monitoring for Core Web Vitals through Cloudflare Web Analytics, PostHog, or Sentry browser tracing.

## Suggested Dependencies

Avoid adding these until the need is concrete:

- `@vueuse/core`: useful for `useLocalStorage`, `usePreferredReducedMotion`, `useIdle`, and event listeners.
- `rollup-plugin-visualizer`: bundle analyzer for CI/manual audits.
- `vite-plugin-ssg`: cleaner SSG pipeline if the handwritten prerender script becomes hard to maintain.

