# Astralis — Full-stack Horoscope Web App

A Sanctuary-style horoscope app built on **Vue 3 + Vite + TypeScript** on the
front-end and **Cloudflare Workers + Hono + D1 + Drizzle ORM** on the back-end,
with real astronomical chart calculations powered by `astronomy-engine`.

The codebase follows a **portable architecture**: all business logic, API
clients, types, and storage abstractions live in `frontend/src/lib/` and depend
only on standard `fetch` / a pluggable `KeyValueStorage`. Vue components are a
thin reactive layer on top, so the same `lib/` and `composables/` can later be
re-used in a React Native client by swapping the renderer and storage adapter.

```
horoscope-cloudflare/
├── backend/                     # Cloudflare Worker (Hono + D1 + Drizzle)
│   ├── drizzle/                 # generated SQL migrations (do NOT hand-edit tables)
│   ├── src/
│   │   ├── index.ts             # worker entry, route mounting
│   │   ├── types.ts             # AppBindings / AppVariables for Hono context
│   │   ├── db/
│   │   │   ├── client.ts        # drizzle(d1) factory
│   │   │   └── schema.ts        # code-first schema (5 tables)
│   │   ├── middleware/auth.ts   # JWT verify middleware
│   │   ├── routes/
│   │   │   ├── auth.ts          # /api/auth/{register,login,logout,me}
│   │   │   ├── profile.ts       # /api/profile, /api/profile/recompute
│   │   │   ├── horoscope.ts     # /api/horoscope/{signs,cities,daily/:sign,daily}
│   │   │   └── compatibility.ts # /api/compatibility/{signs,users}
│   │   ├── services/
│   │   │   ├── astrologyService.ts     # natal chart, planets, houses, aspects
│   │   │   ├── horoscopeService.ts     # template-based daily horoscopes (D1 cache)
│   │   │   ├── compatibilityService.ts # element/modality compatibility scoring
│   │   │   ├── authService.ts          # register/login/JWT
│   │   │   └── profileService.ts       # full profile + recompute
│   │   └── utils/
│   │       ├── password.ts             # PBKDF2 via Web Crypto
│   │       ├── zodiac.ts               # signs, longitudes → sign mapping
│   │       ├── cities.ts               # built-in city → lat/lon lookup
│   │       └── horoscopeTemplates.ts   # deterministic per-sign + date templates
│   ├── drizzle.config.ts
│   └── wrangler.jsonc
└── frontend/
    └── src/
        ├── main.ts              # bootstraps Vue + configures API base URL
        ├── App.vue              # navbar + global starfield + transitions
        ├── lib/                 # 100% portable to React Native
        │   ├── types.ts                 # shared DTO types
        │   ├── zodiac.ts                # sign metadata (matches backend)
        │   ├── apiClient.ts             # fetch + JWT header injection
        │   ├── storage.ts               # KeyValueStorage abstraction
        │   ├── authService.ts
        │   ├── horoscopeService.ts
        │   ├── profileService.ts
        │   └── compatibilityService.ts
        ├── composables/         # Vue-only reactive wrappers around lib/
        │   ├── useAuth.ts
        │   ├── useHoroscope.ts
        │   ├── useProfile.ts
        │   └── useCompatibility.ts
        ├── components/
        │   ├── ZodiacCard.vue
        │   ├── PredictionCard.vue
        │   ├── PlanetTable.vue
        │   ├── NatalChartWheel.vue
        │   ├── AspectList.vue
        │   ├── LockedFeatureCard.vue
        │   └── LoadingSpinner.vue
        ├── pages/
        │   ├── HomePage.vue            # daily horoscope dashboard
        │   ├── ProfilePage.vue         # natal chart, planets, aspects
        │   ├── CompatibilityPage.vue   # 2-sign compatibility
        │   ├── PremiumPage.vue         # locked premium UI
        │   ├── LoginPage.vue
        │   └── RegisterPage.vue
        ├── router/index.ts             # vue-router with auth guards
        └── assets/main.css             # design tokens + glassmorphism
```

## Database (code-first via Drizzle)

Schema is declared in `backend/src/db/schema.ts` and migrations are generated
with `drizzle-kit`. Tables are **never** hand-created.

| Table                   | Purpose                                                     |
|-------------------------|-------------------------------------------------------------|
| `users`                 | Account + hashed password + display name                    |
| `birth_profiles`        | Birth date/time/city/lat/lon/timezone (1:1 with user)       |
| `natal_charts`          | Sun/Moon/Rising sign + planets/houses/aspects (JSON)        |
| `daily_horoscopes`      | Template-generated daily reading per sign+date (cached)     |
| `compatibility_results` | Persisted compatibility scores between two signs/users      |

```bash
# generate a new migration after editing schema.ts
cd backend
npx drizzle-kit generate --name <change_name>
npx wrangler d1 migrations apply horoscope-db --local   # or --remote
```

## Astrology engine

`astronomy-engine` (pure JS, ~150 KB) is fully Workers-compatible. It computes:

- **Geocentric ecliptic longitudes** for Sun, Moon, Mercury–Pluto via
  `GeoVector` + `Ecliptic` (and `EclipticGeoMoon` for the Moon).
- **Retrograde** detection by sampling longitude 24h forward.
- **Ascendant / Midheaven** from local sidereal time (`SiderealTime`) +
  birth latitude using the standard Meeus formulae (mean obliquity 23.4393°).
- **Equal-house cusps** rotated from the Ascendant.
- **Major aspects** (conjunction, opposition, trine, square, sextile) with
  configurable orbs.

If `birthTime` is omitted, planetary positions are still computed (using 12:00
local) but the Ascendant, Midheaven, houses, and house assignments are skipped.

## Daily horoscopes

`horoscopeService.getOrCreateDailyHoroscope(sign, date)` fetches the cached
row from D1 keyed by `(sign, date)`. On miss, `generateDailyHoroscope` picks
strings from per-sign template arrays using a deterministic hash of
`sign + date`, persists the result, and returns it. No AI calls — pure
templates per the spec.

## Compatibility

`compatibilityService.computeSignCompatibility(sign1, sign2)` derives four
scores (overall / love / friendship / communication) from the element &
modality affinity matrices, with bonuses for opposite or identical signs.
The result is shaped for both anonymous sign-vs-sign comparisons and
authenticated user-vs-user comparisons (`compareUsers`).

## React Native portability plan

Everything in `frontend/src/lib/` only depends on `fetch` and an injectable
storage. To migrate to React Native:

1. Add a tiny `AsyncStorageAdapter` implementing `KeyValueStorage` and call
   `setStorage(...)` once at startup.
2. Re-use `lib/types.ts`, `lib/zodiac.ts`, `lib/apiClient.ts`, and the four
   resource services verbatim.
3. Re-implement the four `composables/use*.ts` files with whatever state model
   the RN app uses (Zustand, React state, etc.) — the underlying service calls
   are identical.
4. Replace the Vue components/pages with RN screens; the data shapes match.

The Cloudflare backend never has to change.

## Local development

```bash
# backend (port 8787)
cd backend
npm install
npx wrangler d1 migrations apply horoscope-db --local
npm run dev

# frontend (port 5173)
cd ../frontend
npm install
npm run dev
```

The frontend reads the API base URL from `VITE_API_BASE_URL` (default
`http://127.0.0.1:8787`).

## API endpoints

| Method | Path                              | Auth | Description                              |
|--------|-----------------------------------|------|------------------------------------------|
| POST   | `/api/auth/register`              | —    | Create account, birth profile, chart     |
| POST   | `/api/auth/login`                 | —    | Issue JWT                                |
| POST   | `/api/auth/logout`                | —    | Stateless ack (client clears token)      |
| GET    | `/api/auth/me`                    | ✓    | Current user                             |
| GET    | `/api/profile`                    | ✓    | User + birth profile + natal chart       |
| POST   | `/api/profile/recompute`          | ✓    | Re-run chart calculations                |
| GET    | `/api/horoscope/signs`            | —    | Static zodiac metadata                   |
| GET    | `/api/horoscope/cities?q=`        | —    | City auto-complete                       |
| GET    | `/api/horoscope/daily/:sign`      | —    | Daily reading for any sign               |
| GET    | `/api/horoscope/daily`            | ✓    | Daily reading for the user's sun sign    |
| POST   | `/api/compatibility/signs`        | —    | Compare two zodiac signs                 |
| POST   | `/api/compatibility/users`        | ✓    | Compare current user with another user   |
