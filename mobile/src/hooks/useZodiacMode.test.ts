import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_ZODIAC_MODE,
  ZODIAC_MODE_STORAGE_KEY,
  normalizeZodiacMode,
  readSavedZodiacMode,
} from './useZodiacMode';

const storage = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => storage.set(key, value)),
    removeItem: vi.fn(async (key: string) => storage.delete(key)),
  },
}));

describe('mobile zodiac mode preference', () => {
  beforeEach(() => {
    storage.clear();
  });

  it('defaults new installs to Western', async () => {
    expect(DEFAULT_ZODIAC_MODE).toBe('western');
    await expect(readSavedZodiacMode()).resolves.toBe('western');
  });

  it('preserves an existing saved Eastern preference', async () => {
    storage.set(ZODIAC_MODE_STORAGE_KEY, 'eastern');
    await expect(readSavedZodiacMode()).resolves.toBe('eastern');
  });

  it('normalizes unknown/garbage values back to the default', () => {
    expect(normalizeZodiacMode('bogus')).toBe('western');
    expect(normalizeZodiacMode(null)).toBe('western');
    expect(normalizeZodiacMode('eastern')).toBe('eastern');
  });
});
