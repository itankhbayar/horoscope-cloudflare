import { describe, expect, it } from 'vitest';
import {
  isAllowedCorsOrigin,
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

describe('isAllowedCorsOrigin', () => {
  it('allows listed origins', () => {
    expect(isAllowedCorsOrigin('http://localhost:5173')).toBe(true);
    expect(isAllowedCorsOrigin('https://horoscope-frontend.pages.dev')).toBe(true);
  });

  it('allows Pages preview subdomains', () => {
    expect(isAllowedCorsOrigin('https://abc123.horoscope-frontend.pages.dev')).toBe(true);
  });

  it('rejects unknown origins', () => {
    expect(isAllowedCorsOrigin('https://evil.example.com')).toBe(false);
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
