# Backend API Architecture Audit

Date: 2026-05-22

Scope: `backend/` Cloudflare Workers + Hono + TypeScript + D1 + Zod + JWT.

## Executive Scorecard

| Area | Before | After this pass | Brutal read |
| --- | ---: | ---: | --- |
| API design | 5/10 | 7/10 | Resource names were understandable, but versioning and response contracts were missing. `/api/v1` now exists without breaking legacy `/api`. |
| Consistency | 4/10 | 7/10 | Validation and error responses were route-by-route. Body/query/param parsing is now centralized through Zod helpers. |
| Scalability | 5/10 | 7/10 | Router composition is now v1-ready. Pagination exists for list endpoints that need it, starting with city search. |
| Maintainability | 5/10 | 7/10 | Schemas, validators, response helpers, and hardening are split into reusable layers. Some route files are still too large. |
| Security | 6/10 | 8/10 | Login now validates input; JSON body size/content-type checks were added; auth and premium errors are centralized. |
| Developer experience | 5/10 | 7/10 | OpenAPI JSON is generated from Zod schemas and lives at `/api/v1/openapi.json`. |

## What Changed

- Added versioned router composition:
  - New canonical API: `/api/v1/*`
  - Legacy-compatible API remains: `/api/*`
- Added standard response helpers:
  - v1 success: `{ success: true, data }`
  - v1 error: `{ success: false, error: { code, message, details? } }`
  - legacy `/api/*` keeps raw payloads and `{ error }` for current frontend/mobile compatibility.
- Added reusable validation helpers:
  - JSON body parsing
  - query parsing
  - route param parsing
  - multipart form parsing
- Added reusable schemas under `backend/src/schemas/`.
- Added OpenAPI endpoint:
  - `/api/v1/openapi.json`
  - `/api/v1/docs`
- Added request hardening middleware:
  - JSON content-type enforcement when a body is present
  - max JSON content-length guard
  - webhook/avatar exceptions preserved
- Removed direct route-level `await c.req.json()` usage.
- Updated auth tests to use valid login/register bodies now that login validation is real.

## Exact File Changes

New core API files:

- `backend/src/utils/apiResponse.ts`
- `backend/src/validators/request.ts`
- `backend/src/middleware/requestHardening.ts`
- `backend/src/routes/openapi.ts`

New schema modules:

- `backend/src/schemas/admin.ts`
- `backend/src/schemas/auth.ts`
- `backend/src/schemas/billing.ts`
- `backend/src/schemas/common.ts`
- `backend/src/schemas/compatibility.ts`
- `backend/src/schemas/horoscope.ts`
- `backend/src/schemas/notifications.ts`
- `backend/src/schemas/profile.ts`
- `backend/src/schemas/tarot.ts`

Refactored routes/middleware:

- `backend/src/index.ts`
- `backend/src/routes/auth.ts`
- `backend/src/routes/profile.ts`
- `backend/src/routes/billing.ts`
- `backend/src/routes/compatibility.ts`
- `backend/src/routes/horoscope.ts`
- `backend/src/routes/notifications.ts`
- `backend/src/routes/tarot.ts`
- `backend/src/routes/account.ts`
- `backend/src/routes/admin.ts`
- `backend/src/middleware/auth.ts`
- `backend/src/middleware/premium.ts`
- `backend/src/middleware/rateLimit.ts`
- `backend/src/validation/hook.ts`
- `backend/src/validation/profileSchemas.ts`

Updated tests:

- `backend/src/routes/auth.rateLimit.test.ts`
- `backend/src/routes/billing.test.ts`

## Before And After

Before:

```ts
router.post('/login', async (c) => {
  const body = await c.req.json();
  const result = await loginUser(db, secret, body);
  return c.json(result);
});
```

After:

```ts
router.post('/login', loginRateLimit, async (c) => {
  const body = await parseJsonBody(c, loginSchema);
  if (isResponse(body)) return body;
  const result = await loginUser(db, secret, body);
  return ok(c, result);
});
```

Legacy response:

```json
{
  "token": "...",
  "user": { "id": "user_1" }
}
```

Versioned response:

```json
{
  "success": true,
  "data": {
    "token": "...",
    "user": { "id": "user_1" }
  }
}
```

Versioned error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "email: email must be valid",
    "details": {
      "fieldErrors": {
        "email": ["email must be valid"]
      },
      "formErrors": []
    }
  }
}
```

## Versioning Strategy

Use `/api/v1` for new clients and SDK generation.

Migration plan:

1. Keep frontend/mobile on legacy `/api/*`.
2. Generate or hand-write a v1 client that unwraps `{ success, data }`.
3. Move one client surface at a time to `/api/v1`.
4. Add deprecation headers to legacy `/api/*` after clients migrate.
5. Introduce `/api/v2` only for breaking contract changes.

## Pagination

Added reusable `paginationSchema` and `paginateItems`.

Current application:

- `/api/v1/horoscope/cities?q=ulan&page=1&limit=10`

Response:

```json
{
  "success": true,
  "data": {
    "items": [],
    "page": 1,
    "limit": 10,
    "total": 0,
    "hasMore": false
  }
}
```

Most current endpoints are singleton/action endpoints, not real list endpoints. Apply this same helper to future history, transactions, notifications, admin event logs, or saved compatibility lists.

## Folder Structure

Target shape:

```text
src/
  routes/       HTTP resource composition only
  schemas/      Zod request/response contracts
  middleware/   cross-cutting request policies
  services/     business logic and D1 operations
  lib/          low-level adapters for external APIs/SDKs
  utils/        pure utilities and platform-safe helpers
  types/        Worker binding and app variable types
  validators/   reusable request parsing helpers
```

Why each layer exists:

- `routes`: HTTP concerns, status mapping, auth gates.
- `schemas`: API contracts that can feed validation and OpenAPI.
- `middleware`: policies that should run consistently across routes.
- `services`: product behavior, D1 reads/writes, billing/auth domain logic.
- `lib`: adapter-level code when external SDKs or transport details grow.
- `utils`: pure functions that should not know about Hono.
- `types`: app-level TypeScript contracts.
- `validators`: bridge Hono requests into typed Zod data.

## Security Notes

Improved:

- Login body is now validated with Zod.
- JSON parsing is centralized and malformed JSON returns controlled errors.
- JSON payload size guard added for API requests.
- Content-Type is enforced when a body is present.
- Auth/premium/rate-limit errors use one response path.
- Stripe webhook raw-body behavior remains intact.
- RevenueCat authorization check remains before webhook processing.

Still worth doing:

- Move rate limiting out of in-memory `Map` if multi-isolate/global guarantees matter.
- Add route-level body limits for multipart avatars beyond service validation.
- Consider RFC7807 problem details for v2 if external consumers expect that standard.
- Add contract tests that call `/api/v1/openapi.json` and validate example requests.

## Risks And Breaking Changes

Intentional behavior change:

- `/api/v1/*` returns response envelopes. Legacy `/api/*` does not.

Potential client-visible changes:

- Login now rejects malformed/missing `email` and `password` before reaching `loginUser`.
- Strict schemas reject unknown fields on several mutating endpoints.
- `/api/v1/horoscope/cities` returns paginated metadata; legacy `/api/horoscope/cities` remains array-compatible.

Deployment considerations:

- No migration or new Cloudflare binding is required.
- No new runtime dependency was added.
- OpenAPI uses Zod 4 JSON Schema generation already available in the current dependency.
- Keep Stripe webhook clients pointed at `/api/billing/webhook` or `/api/v1/billing/webhook`; both preserve raw body verification.

## Recommended Next Work

1. Add v1 contract tests for representative success/error responses.
2. Generate a typed frontend API client from `/api/v1/openapi.json`.
3. Move service-specific response schemas into `schemas/` as contracts mature.
4. Split `billing.ts` into web, mobile, Stripe webhook, and RevenueCat route modules.
5. Replace in-memory rate limiting with Cloudflare-native durable storage if abuse protection becomes business-critical.
6. Add structured request duration metrics per route and status class.

