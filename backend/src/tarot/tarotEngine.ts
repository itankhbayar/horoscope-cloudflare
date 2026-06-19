/**
 * Stable entry point for **tarot generation** (cron prewarm, admin upsert, and on-demand
 * generate-on-miss from the public GET — see `getCachedTarotDaily`). The deterministic engine
 * is cheap (seeded templates + local data, no AI/network), so serving a cache miss by generating
 * is safe; the public path is premium-gated, rate-limited, and bounded to the requested day.
 *
 * **Phase 2 (AI):** implement `generateTarotReadingWithFallback()` here that:
 * 1) calls remote model → `validateTarotPayload` → on success return;
 * 2) on invalid, retry once;
 * 3) if still invalid, delegate to `./tarotGenerator` deterministic engine.
 *
 * Public API and DB schema stay fixed; validation remains the gatekeeper before persistence.
 */
export { generateTarotReading } from './tarotGenerator';
export type { TarotGeneratorResult } from './tarotTypes';
