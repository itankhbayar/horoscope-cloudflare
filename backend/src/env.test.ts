import { describe, expect, it } from 'vitest';
import {
  isAllowedCorsOrigin,
  isPublicReadOnlyCorsPath,
  parseAllowedOrigins,
  premiumCheckoutUrls,
  resolveAppPublicUrl,
} from './env';

describe('resolveAppPublicUrl', () => {
  it('uses APP_PUBLIC_URL from bindings when set', () => {
    expect(
      resolveAppPublicUrl({ APP_PUBLIC_URL: 'https://horoscope-frontend.pages.dev' }),
    ).toBe('https://horoscope-frontend.pages.dev');
  });

  it('strips trailing slash', () => {
    expect(resolveAppPublicUrl({ APP_PUBLIC_URL: 'https://example.com/' })).toBe('https://example.com');
  });

  it('falls back to local Vite for dev when unset', () => {
    expect(resolveAppPublicUrl({ APP_PUBLIC_URL: '' })).toBe('http://localhost:5173');
  });
});

describe('parseAllowedOrigins', () => {
  it('parses comma-separated ALLOWED_ORIGINS', () => {
    expect(
      parseAllowedOrigins({
        ALLOWED_ORIGINS: 'https://a.example.com, https://b.example.com',
      }),
    ).toEqual(['https://a.example.com', 'https://b.example.com']);
  });

  it('uses defaults when ALLOWED_ORIGINS is empty', () => {
    const origins = parseAllowedOrigins({ ALLOWED_ORIGINS: '' });
    expect(origins).toContain('http://localhost:5173');
    expect(origins).toContain('https://horoscope-frontend.pages.dev');
  });
});

describe('isAllowedCorsOrigin', () => {
  const env = {
    ALLOWED_ORIGINS:
      'https://horoscope-frontend.pages.dev,http://localhost:5173',
  };

  it('allows listed origins', () => {
    expect(isAllowedCorsOrigin('http://localhost:5173', env)).toBe(true);
    expect(isAllowedCorsOrigin('https://horoscope-frontend.pages.dev', env)).toBe(true);
  });

  it('allows Pages preview subdomains', () => {
    expect(isAllowedCorsOrigin('https://abc123.horoscope-frontend.pages.dev', env)).toBe(true);
  });

  it('rejects unknown origins', () => {
    expect(isAllowedCorsOrigin('https://evil.example.com', env)).toBe(false);
  });
});

describe('isPublicReadOnlyCorsPath', () => {
  it('matches zodiac signs endpoint only', () => {
    expect(isPublicReadOnlyCorsPath('/api/horoscope/signs')).toBe(true);
    expect(isPublicReadOnlyCorsPath('/api/horoscope/daily/aries')).toBe(false);
  });
});

describe('premiumCheckoutUrls', () => {
  it('builds Stripe redirect URLs from public app base', () => {
    expect(premiumCheckoutUrls('https://horoscope-frontend.pages.dev')).toEqual({
      successUrl: 'https://horoscope-frontend.pages.dev/premium/success',
      cancelUrl: 'https://horoscope-frontend.pages.dev/premium/cancel',
    });
  });
});
