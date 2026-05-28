import { Linking } from 'react-native';
import {
  compatibilityLandingWebUrl,
  parseCompatibilityDeepLink,
  type ParsedCompatibilityDeepLink,
} from '@astralis/lib/compatibilityLanding';
import { navigationRef } from '../navigation/navigationRef';
import type { MainTabParamList } from '../navigation/types';

export type CompatibilityDeepLinkIntent = ParsedCompatibilityDeepLink;

function webBaseUrl(): string {
  const g = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };
  return g.process?.env?.EXPO_PUBLIC_WEB_BASE_URL?.trim() || 'https://astralis.app';
}

export function navigateCompatibilityDeepLink(intent: CompatibilityDeepLinkIntent, isAppReady: boolean): boolean {
  if (!navigationRef.isReady() || !isAppReady) return false;

  const rootState = navigationRef.getRootState();
  const onMain = rootState?.routes.some((route) => route.name === 'Main');
  if (!onMain) return false;

  const params: NonNullable<MainTabParamList['Compatibility']> = {
    sign1: intent.sign1,
    sign2: intent.sign2,
    recipientSign: null,
    fromShare: true,
  };

  navigationRef.navigate('Main', {
    screen: 'Compatibility',
    params,
  });
  return true;
}

export async function openCompatibilityDeepLink(url: string, isAppReady: boolean): Promise<boolean> {
  const intent = parseCompatibilityDeepLink(url);
  if (!intent) return false;

  if (navigateCompatibilityDeepLink(intent, isAppReady)) return true;

  const landingUrl = compatibilityLandingWebUrl(webBaseUrl(), intent.sign1, intent.sign2, intent.score ?? undefined);
  if (!(await Linking.canOpenURL(landingUrl))) return false;
  await Linking.openURL(landingUrl);
  return true;
}

export function subscribeCompatibilityDeepLinks(
  isAppReady: () => boolean,
): () => void {
  const handle = (url: string | null | undefined): void => {
    if (!url) return;
    void openCompatibilityDeepLink(url, isAppReady());
  };

  void Linking.getInitialURL().then((url) => handle(url));
  const subscription = Linking.addEventListener('url', ({ url }) => handle(url));
  return () => subscription.remove();
}
