const SHARE_REF_PATTERN = /^shr_[0-9a-f]{32}$/i;
const SESSION_KEY = 'compatibility_attribution_share_ref';

/** Privacy-safe opaque id per share attempt (no user linkage). */
export function createCompatibilityShareRef(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `shr_${crypto.randomUUID().replace(/-/g, '')}`;
  }
  const fallback = `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 18)}`.padEnd(32, '0');
  return `shr_${fallback.slice(0, 32)}`;
}

export function isValidCompatibilityShareRef(value: unknown): value is string {
  return typeof value === 'string' && SHARE_REF_PATTERN.test(value);
}

export function parseShareRefFromQuery(query: Record<string, unknown>): string | null {
  const raw = query.share_ref;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return isValidCompatibilityShareRef(value) ? value : null;
}

export function persistCompatibilityShareRef(shareRef: string): void {
  if (!isValidCompatibilityShareRef(shareRef) || typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(SESSION_KEY, shareRef);
}

export function readPersistedCompatibilityShareRef(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  const stored = sessionStorage.getItem(SESSION_KEY);
  return isValidCompatibilityShareRef(stored) ? stored : null;
}

/** Prefer URL param, persist for signup navigation within the session. */
export function resolveCompatibilityShareRef(query: Record<string, unknown>): string | null {
  const fromQuery = parseShareRefFromQuery(query);
  if (fromQuery) {
    persistCompatibilityShareRef(fromQuery);
    return fromQuery;
  }
  return readPersistedCompatibilityShareRef();
}

export function isShareUserCancelled(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg.includes('abort') || msg.includes('cancel');
  }
  return false;
}
