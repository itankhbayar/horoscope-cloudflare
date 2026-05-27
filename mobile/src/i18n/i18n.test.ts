import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __setLocaleForTests,
  MOBILE_LOCALE_STORAGE_KEY,
  readSavedLocale,
  translate,
  type TranslationKey,
} from './index';
import { keepStreakAliveCopy } from '../lib/streakDisplay';

const storage = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => storage.set(key, value)),
    removeItem: vi.fn(async (key: string) => storage.delete(key)),
  },
}));

describe('mobile i18n', () => {
  beforeEach(() => {
    storage.clear();
    __setLocaleForTests('mn');
  });

  it('defaults new installs to Mongolian', async () => {
    await expect(readSavedLocale()).resolves.toBe('mn');
    expect(translate('common.signIn')).toBe('Нэвтрэх');
  });

  it('preserves an existing saved English preference', async () => {
    storage.set(MOBILE_LOCALE_STORAGE_KEY, 'en');

    await expect(readSavedLocale()).resolves.toBe('en');
  });

  it('falls back safely when a translation key is missing', () => {
    expect(translate('missing.copy' as TranslationKey)).toBe('missing.copy');
  });

  it('contains premium positioning copy in Mongolian and English', () => {
    expect(translate('premium.featurePatternTitle', undefined, 'mn')).toContain('давтагдаж');
    expect(translate('premium.featurePatternTitle', undefined, 'en')).toMatch(/recurring themes/i);
  });

  it('contains streak and ritual copy in Mongolian and English', () => {
    __setLocaleForTests('mn');
    expect(keepStreakAliveCopy(false, 3)).toContain('Өнөөдрийн');

    __setLocaleForTests('en');
    expect(keepStreakAliveCopy(false, 3)).toMatch(/today/i);
  });

  it('contains notification copy in Mongolian and English', () => {
    expect(translate('notifications.copy.defaultTitle', undefined, 'mn')).toContain('тэнгэрийн');
    expect(translate('notifications.copy.defaultTitle', undefined, 'en')).toMatch(/sky ritual/i);
  });
});
