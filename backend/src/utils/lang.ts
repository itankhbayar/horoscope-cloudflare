export const SUPPORTED_LANGS = ['en', 'mn'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';

/**
 * Normalize `lang` query or `Accept-Language` to `en` | `mn`.
 * Handles BCP47 tags (`mn-MN`), lists (`mn,en;q=0.8`), and quality values.
 */
export function parseLang(value: string | undefined | null): Lang {
  if (value == null) return DEFAULT_LANG;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_LANG;

  const firstTag = trimmed.split(',')[0]?.trim().split(';')[0]?.trim().toLowerCase() ?? '';
  if (!firstTag) return DEFAULT_LANG;

  if (firstTag === 'mn' || firstTag.startsWith('mn-')) return 'mn';
  if (firstTag === 'en' || firstTag.startsWith('en-')) return 'en';

  const normalized = firstTag.toLowerCase();
  return (SUPPORTED_LANGS as readonly string[]).includes(normalized)
    ? (normalized as Lang)
    : DEFAULT_LANG;
}
