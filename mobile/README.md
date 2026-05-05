# Astralis — Expo (React Native)

TypeScript Expo app that **reuses** the framework-agnostic API layer from `../frontend/src/lib` (no duplicated service logic).

## Quick start

```bash
cd mobile
cp .env.example .env
# Edit .env — set EXPO_PUBLIC_API_BASE_URL (e.g. https://your-worker.workers.dev or http://10.0.2.2:8787 for Android emulator → host)
npm install
npm run start
```

Run the **Cloudflare Worker** (`cd ../backend && npm run dev`) so the API is reachable. Dev mode uses **`--ip 0.0.0.0`** so other devices on your LAN can connect.

**Physical iPhone / Android (Expo Go):** `EXPO_PUBLIC_API_BASE_URL` must be your **computer’s Wi‑Fi IP** (e.g. `http://192.168.1.42:8787`), not `127.0.0.1`. Update `mobile/.env`, then `npx expo start -c`.

If login shows **“Request timed out … 192.168.x.x:8787”**:

1. On the phone, open **Safari** → `http://<same-ip>:8787/` — you should see the Worker JSON (`name`, `status`, …). If Safari fails, it is network/firewall, not the app.
2. **Windows:** run `backend/scripts/allow-wrangler-dev-firewall.ps1` **as Administrator**, or from `backend`: `npm run allow-firewall` in an **elevated** PowerShell. The rule allows TCP **8787** on **all** firewall profiles (Wi‑Fi is often **Public**, where a Private-only rule does nothing).
3. Restart **`npm run dev`** in `backend` (script uses `--ip 0.0.0.0`).
4. Re-check **`ipconfig`** — DHCP may have changed your IPv4; update `.env` and `npx expo start -c`.
5. Some Wi‑Fi routers use **client/AP isolation** (devices cannot talk to each other). Try another network or point `.env` at your **deployed** `https://…workers.dev` URL instead.

### Expo Go: “Project is incompatible with this version of Expo Go”

**Expo Go only runs projects whose SDK matches the app in the store.** This repo targets **Expo SDK 54** so it lines up with the current Expo Go from the App Store / Play Store.

If you previously had **SDK 55** (or newer) in `package.json`, the store Expo Go will reject the project until either:

1. You **downgrade the project** to the same SDK as Expo Go (this repo uses **54**), then `rm -rf node_modules package-lock.json && npm install`, or  
2. You use a **development build** (`expo run:ios` / `expo run:android` or EAS Build) instead of Expo Go, or  
3. You install the **matching Expo Go** for a newer SDK (see [expo.dev/go](https://expo.dev/go) and release notes when a new SDK ships).

After changing SDK, run **`npx expo start -c`** once to clear Metro cache.

### Hermes: `import.meta` is not supported

Shared `frontend/src/lib/apiClient.ts` uses `import.meta.env` for Vite. Hermes needs Babel to strip that. This repo enables **`unstable_transformImportMeta`** in `babel.config.js` (`babel-preset-expo`). If you still see the error, clear cache: `npx expo start -c`.

## Phase 1 — Analysis

**Reused as-is (via `@astralis/lib/*` → `../frontend/src/lib/*`):**

- `apiClient.ts`, `authService.ts`, `horoscopeService.ts`, `profileService.ts`, `compatibilityService.ts`, `zodiac.ts`, `types.ts`, `storage.ts` (interface + `setStorage` / `getStorage` only)

**Not imported in v1 (optional later):** `tarotService.ts`, `billingService.ts`, `index.ts`

**Required RN adaptations:**

- **Storage:** `WebLocalStorage` in shared `storage.ts` is never used after `setStorage(asyncStorageAdapter)` on startup.
- **Env:** `EXPO_PUBLIC_API_BASE_URL` is read via `globalThis.process.env` (Metro inlines at build). Shared `apiClient` resolves the same variable for default base URL; `AuthProvider` also calls `configureApi` on launch.
- **AbortSignal.timeout:** small polyfill in `App.tsx` for older Hermes snapshots.

## Phase 2 — Migration plan (incremental)

1. **Scaffold** — Expo + TS, app.json, metro + babel, assets.
2. **Shared lib** — Babel `module-resolver` alias `@astralis/lib` → `../frontend/src/lib`; Metro `watchFolders` monorepo root.
3. **Navigation** — Native stack (Login, Register, Main) + bottom tabs (Home, Compatibility, Profile, Premium); `navigationRef` for auth resets.
4. **Screens + hooks** — React hooks mirror Vue composables; screens call hooks only.
5. **Theme + polish** — `src/theme/colors`, cosmic cards, loading/error.
6. **Docs** — this README + `.env.example`.

## Phase 3 — Implementation (what was added)

| Area | Location |
|------|-----------|
| Entry | `App.tsx`, `app.json`, `package.json`, `tsconfig.json`, `babel.config.js`, `metro.config.js` |
| Storage adapter | `src/lib/storageAdapter.ts` |
| Auth state | `src/hooks/useAuth.tsx` (`AuthProvider` + `useAuth`) |
| Data hooks | `src/hooks/useHoroscope.ts`, `useProfile.ts`, `useCompatibility.ts` |
| Navigation | `src/navigation/RootNavigator.tsx`, `MainTabs.tsx`, `types.ts`, `navigationRef.ts` |
| Screens | `src/screens/*.tsx` |
| UI | `src/components/CosmicCard.tsx`, `LoadingBlock.tsx` |
| Theme | `src/theme/*` |

## Phase 4 — Migration notes

### Reused files

All imports under `@astralis/lib/...` resolve to **`frontend/src/lib/`** (single source of truth).

### Modified shared file

- **`frontend/src/lib/apiClient.ts`**
  - Default base URL: `EXPO_PUBLIC_API_BASE_URL` (via `globalThis.process.env`) → Vite `VITE_API_BASE_URL` → dev fallback `http://127.0.0.1:8787`.
  - Timeout / error parsing: stricter `unknown` handling; abort detection safe without assuming `DOMException` exists on React Native.

### React Native–specific

- **`mobile/src/lib/storageAdapter.ts`** — `KeyValueStorage` backed by `@react-native-async-storage/async-storage`.
- **`mobile/App.tsx`** — `setStorage` is **not** called here; `AuthProvider` runs it before `configureApi` + session bootstrap.
- **Android emulator:** host machine API is often `http://10.0.2.2:8787`, not `127.0.0.1`.
- **iOS simulator:** `http://127.0.0.1:8787` is usually fine.

### Register parity

The backend still expects a **valid birth city** (same rules as web). The mobile register screen collects the same payload fields; use a city string the API recognizes (or extend the app later with `horoscopeService.searchCities` like the web form).

## Commit-style history (suggested)

1. **chore(mobile):** scaffold Expo TypeScript app  
2. **feat(mobile):** wire `@astralis/lib` + AsyncStorage adapter + apiClient cross-platform defaults  
3. **feat(mobile):** React Navigation auth stack + main tabs  
4. **feat(mobile):** screens and data hooks (home, compatibility, profile, premium placeholder)  
5. **style(mobile):** cosmic theme + shared card components  
6. **docs(mobile):** README and `.env.example`
