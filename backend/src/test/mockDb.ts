import { vi } from 'vitest';
import type { DB } from '../db/client';

/** Captures `update().set()` payloads and configurable `select().get()` results. */
export function createDbCapture() {
  const setCalls: Record<string, unknown>[] = [];
  let selectGetResult: unknown = undefined;

  const db = {
    update: vi.fn(() => ({
      set: vi.fn((values: Record<string, unknown>) => {
        setCalls.push(values);
        return {
          where: vi.fn(() => Promise.resolve()),
        };
      }),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          get: vi.fn(async () => selectGetResult),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((row: unknown) => {
        insertCalls.push(row);
        return {
          onConflictDoNothing: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([{ id: (row as { id: string }).id }])),
          })),
        };
      }),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  } as unknown as DB;

  const insertCalls: unknown[] = [];

  return {
    db,
    setCalls,
    insertCalls,
    setSelectResult(value: unknown) {
      selectGetResult = value;
    },
  };
}
