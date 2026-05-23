import { initAnalytics, shutdownAnalytics } from './analytics';

export type PrivacyConsent = {
  analytics: boolean;
  updatedAt: string;
  version: 1;
};

const CONSENT_KEY = 'astralis_privacy_consent_v1';

export function readPrivacyConsent(): PrivacyConsent | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(CONSENT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PrivacyConsent;
    return typeof parsed.analytics === 'boolean' ? parsed : null;
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  return readPrivacyConsent()?.analytics === true;
}

export function savePrivacyConsent(analytics: boolean): PrivacyConsent {
  const consent: PrivacyConsent = {
    analytics,
    updatedAt: new Date().toISOString(),
    version: 1,
  };
  if (typeof window === 'undefined') return consent;
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  if (analytics) initAnalytics();
  else shutdownAnalytics();
  return consent;
}
