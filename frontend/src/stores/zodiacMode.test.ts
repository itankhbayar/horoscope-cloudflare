import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useZodiacModeStore } from './zodiacMode';
import { setStorage, type KeyValueStorage } from '../lib/storage';

function memoryStorage(initial: Record<string, string> = {}): {
  storage: KeyValueStorage;
  dump: () => Record<string, string>;
} {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    storage: {
      async getItem(key) {
        return map.has(key) ? (map.get(key) as string) : null;
      },
      async setItem(key, value) {
        map.set(key, value);
      },
      async removeItem(key) {
        map.delete(key);
      },
    },
    dump: () => Object.fromEntries(map),
  };
}

describe('useZodiacModeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('defaults to western', () => {
    setStorage(memoryStorage().storage);
    const store = useZodiacModeStore();
    expect(store.mode).toBe('western');
  });

  it('hydrates a persisted mode', async () => {
    setStorage(memoryStorage({ astralis_zodiac_mode_v1: 'chinese' }).storage);
    const store = useZodiacModeStore();
    await store.hydrate();
    expect(store.mode).toBe('chinese');
  });

  it('ignores and clears an invalid persisted value', async () => {
    const mem = memoryStorage({ astralis_zodiac_mode_v1: 'bogus' });
    setStorage(mem.storage);
    const store = useZodiacModeStore();
    await store.hydrate();
    expect(store.mode).toBe('western');
    expect(mem.dump().astralis_zodiac_mode_v1).toBeUndefined();
  });

  it('setMode updates and persists', async () => {
    const mem = memoryStorage();
    setStorage(mem.storage);
    const store = useZodiacModeStore();
    await store.setMode('chinese');
    expect(store.mode).toBe('chinese');
    expect(mem.dump().astralis_zodiac_mode_v1).toBe('chinese');
  });

  it('toggle flips between modes', async () => {
    setStorage(memoryStorage().storage);
    const store = useZodiacModeStore();
    await store.toggle();
    expect(store.mode).toBe('chinese');
    await store.toggle();
    expect(store.mode).toBe('western');
  });
});
