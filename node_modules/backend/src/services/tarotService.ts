import { and, eq, sql } from 'drizzle-orm';
import type { DB } from '../db/client';
import { tarotDaily } from '../db/schema';
import { generateTarotReading } from '../tarot/tarotEngine';
import { validateTarotPayload } from '../tarot/tarotValidator';
import { flattenTarotPayload } from '../tarot/tarotFlatten';
import { legacyPayloadToPersisted, looseFlatTarotToPersisted } from '../tarot/tarotLegacy';
import { tarotPayloadNeedsBilingualRefresh } from '../tarot/tarotPayloadQuality';
import type { TarotApiResponse, TarotPersistedPayload } from '../tarot/tarotTypes';
import type { Lang } from '../utils/lang';
import type { ZodiacSign } from '../utils/zodiac';

export async function getTarotDailyRow(
  db: DB,
  sign: ZodiacSign,
  timezone: string,
  date: string,
): Promise<typeof tarotDaily.$inferSelect | undefined> {
  return db
    .select()
    .from(tarotDaily)
    .where(and(eq(tarotDaily.sign, sign), eq(tarotDaily.timezone, timezone), eq(tarotDaily.date, date)))
    .get();
}

function parseStoredPayloadJson(raw: unknown): unknown {
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return null;
    try {
      return JSON.parse(t) as unknown;
    } catch {
      return null;
    }
  }
  return raw;
}

/**
 * Normalize stored JSON into the canonical bilingual payload (strict, loose, or legacy).
 */
export function resolvePersistedPayload(
  row: typeof tarotDaily.$inferSelect,
): { value: TarotPersistedPayload; energyScore: number } | null {
  const payload = parseStoredPayloadJson(row.payloadJson);
  if (payload === null || typeof payload !== 'object') return null;

  const direct = validateTarotPayload(payload);
  if (direct.ok) return { value: direct.value, energyScore: row.energyScore };

  const loose = looseFlatTarotToPersisted(payload, row.sign, row.date, row.timezone);
  if (loose) {
    const v = validateTarotPayload(loose);
    if (v.ok) return { value: v.value, energyScore: row.energyScore };
  }

  const migrated = legacyPayloadToPersisted(payload, row.sign, row.date, row.timezone);
  if (migrated) {
    const v = validateTarotPayload(migrated);
    if (v.ok) return { value: v.value, energyScore: row.energyScore };
  }

  return null;
}

function mapRowToResponse(row: typeof tarotDaily.$inferSelect, lang: Lang): TarotApiResponse {
  const resolved = resolvePersistedPayload(row);
  if (!resolved) {
    const payload = parseStoredPayloadJson(row.payloadJson);
    const parsed = validateTarotPayload(payload ?? {});
    throw new Error(`Corrupt tarot row ${row.id}: ${parsed.ok ? 'unknown' : parsed.error}`);
  }
  return flattenTarotPayload(resolved.value, lang, resolved.energyScore);
}

/**
 * Persist flow: generate → validate (inside generator) → upsert only valid payloads.
 */
export async function upsertTarotDaily(db: DB, sign: ZodiacSign, timezone: string, date: string): Promise<void> {
  const { payload, energyScore } = await generateTarotReading(sign, date, timezone);
  const id = crypto.randomUUID();

  await db
    .insert(tarotDaily)
    .values({
      id,
      date,
      timezone,
      sign,
      payloadJson: payload,
      energyScore,
    })
    .onConflictDoUpdate({
      target: [tarotDaily.date, tarotDaily.timezone, tarotDaily.sign],
      set: {
        payloadJson: payload,
        energyScore,
        updatedAt: sql`(CURRENT_TIMESTAMP)`,
      },
    });
}

export type TarotApiResult =
  | { status: 200; body: TarotApiResponse }
  | { status: 404; body: { error: string; sign: string; date: string; timezone: string } }
  | { status: 503; body: { error: string; details?: string; sign: string; date: string; timezone: string } };

/**
 * GET serves cache. Rows with English pasted into `mn` or other stale bilingual shapes are
 * regenerated once on read (then cached), so `lang=mn` works without a manual prewarm.
 */
export async function getCachedTarotDaily(
  db: DB,
  sign: ZodiacSign,
  timezone: string,
  date: string,
  lang: Lang,
): Promise<TarotApiResult> {
  let row = await getTarotDailyRow(db, sign, timezone, date);
  if (!row) {
    return {
      status: 404,
      body: { error: 'Tarot reading not found', sign, date, timezone },
    };
  }

  const resolved = resolvePersistedPayload(row);
  if (resolved && tarotPayloadNeedsBilingualRefresh(resolved.value)) {
    console.warn('[tarot] Stale bilingual cache, regenerating on read', { sign, date, timezone });
    await upsertTarotDaily(db, sign, timezone, date);
    const again = await getTarotDailyRow(db, sign, timezone, date);
    if (again) row = again;
  }

  try {
    return { status: 200, body: mapRowToResponse(row, lang) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[tarot] Unreadable row', { id: row.id, sign, date, timezone, msg });
    return {
      status: 503,
      body: {
        error: 'Tarot reading data is unreadable or outdated',
        details: msg,
        sign,
        date,
        timezone,
      },
    };
  }
}
