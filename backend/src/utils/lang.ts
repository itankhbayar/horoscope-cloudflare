export const SUPPORTED_LANGS = ['en', 'mn'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';

export function parseLang(value: string | undefined | null): Lang {
  if (!value) return DEFAULT_LANG;
  const normalized = value.toLowerCase();
  return (SUPPORTED_LANGS as readonly string[]).includes(normalized)
    ? (normalized as Lang)
    : DEFAULT_LANG;
}
