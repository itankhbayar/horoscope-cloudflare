```txt
npm install
npm run dev
```

### D1 migrations (local dev)

Avatar upload needs columns such as `avatar_url` on `users`. Apply pending migrations from `backend/`:

```txt
npx wrangler d1 migrations apply horoscope-db --local
```

If **`0004_users_stripe_ids.sql` fails with `duplicate column name: stripe_*`**, your local SQLite already has those columns (often from an older schema path) but Wrangler has not recorded that migration. Fix by **recording** `0004` and `0005` and adding any missing profile columns, for example:

```txt
npx wrangler d1 execute horoscope-db --local --command "ALTER TABLE users ADD COLUMN display_name text;"
npx wrangler d1 execute horoscope-db --local --command "ALTER TABLE users ADD COLUMN bio text;"
npx wrangler d1 execute horoscope-db --local --command "ALTER TABLE users ADD COLUMN avatar_url text;"
npx wrangler d1 execute horoscope-db --local --command "ALTER TABLE users ADD COLUMN timezone text;"
```

Then insert migration rows if needed (so `migrations apply` does not retry failed files):

```txt
npx wrangler d1 execute horoscope-db --local --command "INSERT INTO d1_migrations (name) SELECT '0004_users_stripe_ids.sql' WHERE NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0004_users_stripe_ids.sql'); INSERT INTO d1_migrations (name) SELECT '0005_profile_fields.sql' WHERE NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0005_profile_fields.sql');"
```

Skip any `ALTER` that errors with “duplicate column name” if the column already exists.

For **production**, run the same `migrations apply` with **`--remote`** once per environment.

### Auth rate limiting

`POST /api/auth/login` and `POST /api/auth/register` use a small in-memory fixed-window limiter keyed by `CF-Connecting-IP` with forwarded-header fallbacks. This is useful for local/dev and basic per-isolate protection, but it is not a shared global production limit. Configure Cloudflare WAF/rate limiting rules, or replace the middleware storage with a shared binding such as KV or Durable Objects, for production-grade enforcement across isolates and regions.

`wrangler.jsonc` sets **`dev.ip` to `0.0.0.0`**, so **`npm run dev` or `npx wrangler dev`** listens on **0.0.0.0:8787** and phones on your LAN can reach the Worker (not only `127.0.0.1`). If connections time out from another device on Windows, run **`scripts/allow-wrangler-dev-firewall.ps1`** as Administrator (or `npm run allow-firewall` from an elevated shell). The script allows TCP 8787 on **all** network profiles so **Public** Wi‑Fi is covered.

```txt
npm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```
