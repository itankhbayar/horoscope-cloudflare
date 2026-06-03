import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BACKEND_OWNED_EVENTS, isBackendOwnedEvent, trackBackendEvent } from './analyticsService';

/**
 * Cross-source duplicate-event guard.
 *
 * This suite is the enforcement point for analytics event ownership (docs/analytics-event-ownership.md).
 * It runs in the backend Vitest suite — the one suite CI executes — and reaches across the monorepo
 * into the web and mobile client sources to prove no client emits a BACKEND_OWNED event. If an
 * engineer adds `track('trial_started', …)` (or a `.capture(...)` of any owned event) to a client,
 * this test fails, catching the double-count before it ships.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CLIENT_DIRS = [path.join(REPO_ROOT, 'frontend', 'src'), path.join(REPO_ROOT, 'mobile', 'src')];
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.vue', '.js', '.mjs']);

/** Canonical ownership list. The three copies (backend/frontend/mobile) must stay identical. */
const EXPECTED_BACKEND_OWNED = ['trial_started', 'trial_converted', 'trial_cancelled'] as const;

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      out.push(...listSourceFiles(full));
      continue;
    }
    if (/\.(test|spec)\.[cm]?tsx?$/.test(entry)) continue; // tests legitimately reference the names
    if (SOURCE_EXTENSIONS.has(path.extname(entry))) out.push(full);
  }
  return out;
}

/**
 * Strips block and line comments so that prose mentioning a call (e.g. a JSDoc note that says
 * "`track('trial_started', …)` will not compile") is not mistaken for a real emission. The line
 * pattern preserves `://` so URLs inside string literals are untouched.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/**
 * Matches an *emission* of `event` — a `track(...)` or `.capture(...)` call whose first argument is
 * the event name as a string literal. Type declarations (`trial_started: { … }`) do not match
 * because they are not call expressions with the name as a quoted first argument.
 */
function emissionPattern(event: string): RegExp {
  return new RegExp(String.raw`(?:\btrack|\.capture)\s*\(\s*['"\`]` + event + String.raw`['"\`]`);
}

describe('analytics event ownership — cross-source', () => {
  it('keeps the backend-owned list identical to the documented canonical trio', () => {
    expect([...BACKEND_OWNED_EVENTS]).toEqual([...EXPECTED_BACKEND_OWNED]);
  });

  it('classifies the trio as backend-owned and other events as not', () => {
    for (const event of EXPECTED_BACKEND_OWNED) expect(isBackendOwnedEvent(event)).toBe(true);
    for (const event of ['premium_purchased', 'subscription_restored', 'trial_cta_clicked', 'app_open']) {
      expect(isBackendOwnedEvent(event)).toBe(false);
    }
  });

  it('no web or mobile client source emits a backend-owned event', () => {
    const offenders: string[] = [];
    for (const dir of CLIENT_DIRS) {
      for (const file of listSourceFiles(dir)) {
        const contents = stripComments(readFileSync(file, 'utf8'));
        for (const event of EXPECTED_BACKEND_OWNED) {
          if (emissionPattern(event).test(contents)) {
            offenders.push(`${path.relative(REPO_ROOT, file)} emits backend-owned "${event}"`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('trackBackendEvent — ownership guard', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => ({ ok: true, status: 200 }) as Response);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refuses to mirror an event that is not backend-owned (never double-counts a client event)', async () => {
    const result = await trackBackendEvent({
      env: { POSTHOG_API_KEY: 'phc_test' },
      distinctId: 'user-1',
      // Cast: the type system already forbids this; the cast simulates an unsafe JS caller.
      event: 'premium_purchased' as unknown as (typeof BACKEND_OWNED_EVENTS)[number],
    });
    expect(result).toBe('failed');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
