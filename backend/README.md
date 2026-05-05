```txt
npm install
npm run dev
```

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
