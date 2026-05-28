const KEY_PREFIX = 'engagement:daily-reading-revealed';

function revealKey(dateISO: string, userId?: string | null): string {
  return `${KEY_PREFIX}:${userId ?? 'guest'}:${dateISO}`;
}

export function isDailyReadingRevealed(dateISO: string, userId?: string | null): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(revealKey(dateISO, userId)) === '1';
}

export function persistDailyReadingRevealed(dateISO: string, userId?: string | null): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(revealKey(dateISO, userId), '1');
}
