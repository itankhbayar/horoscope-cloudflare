/**
 * Stable entry point for **tarot generation** (cron + admin upsert only — never from public GET).
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
