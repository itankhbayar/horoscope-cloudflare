import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeApiLocaleFromPreferences } from './apiLocaleInit';

const { setApiLocaleMock, readSavedLocaleMock } = vi.hoisted(() => ({
  setApiLocaleMock: vi.fn(),
  readSavedLocaleMock: vi.fn(),
}));

vi.mock('@astralis/lib/apiClient', async () => {
  const actual = await vi.importActual<typeof import('@astralis/lib/apiClient')>('@astralis/lib/apiClient');
  return {
    ...actual,
    setApiLocale: setApiLocaleMock,
  };
});

vi.mock('../i18n', async () => {
  const actual = await vi.importActual<typeof import('../i18n')>('../i18n');
  return {
    ...actual,
    readSavedLocale: readSavedLocaleMock,
    DEFAULT_LOCALE: 'mn',
  };
});

describe('initializeApiLocaleFromPreferences', () => {
  beforeEach(() => {
    setApiLocaleMock.mockReset();
    readSavedLocaleMock.mockReset();
  });

  it('uses saved mn locale on cold start', async () => {
    readSavedLocaleMock.mockResolvedValue('mn');

    await initializeApiLocaleFromPreferences();

    expect(readSavedLocaleMock).toHaveBeenCalledTimes(1);
    expect(setApiLocaleMock).toHaveBeenCalledWith('mn');
  });

  it('falls back to mn when locale read fails', async () => {
    readSavedLocaleMock.mockRejectedValue(new Error('storage unavailable'));

    await initializeApiLocaleFromPreferences();

    expect(setApiLocaleMock).toHaveBeenCalledWith('mn');
  });
});

