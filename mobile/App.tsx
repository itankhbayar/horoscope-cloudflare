import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AuthProvider } from './src/hooks/useAuth';
import { AppearanceProvider, useAppearance } from './src/hooks/useAppearance';
import { RootNavigator } from './src/navigation/RootNavigator';
import { initAnalytics, track } from './src/lib/analytics';
import { I18nProvider } from './src/i18n';

type AbortSignalCtor = typeof AbortSignal & { timeout?: (ms: number) => AbortSignal };

function ensureAbortSignalTimeoutPolyfill(): void {
  const AS = globalThis.AbortSignal as AbortSignalCtor;
  if (typeof AS.timeout === 'function') return;
  AS.timeout = (ms: number): AbortSignal => {
    const c = new AbortController();
    setTimeout(() => c.abort(), ms);
    return c.signal;
  };
}

function readStripePublishableKey(): string {
  const g = globalThis as unknown as {
    process?: { env?: Record<string, string | undefined> };
  };
  const raw = g.process?.env?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  return typeof raw === 'string' ? raw.trim() : '';
}

export default function App(): React.JSX.Element {
  useEffect(() => {
    ensureAbortSignalTimeoutPolyfill();
    void initAnalytics().then(() => track('app_open', { source: 'cold_start' }));
  }, []);

  const stripePk = readStripePublishableKey();
  const shell = (
    <I18nProvider>
      <AppearanceProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </AppearanceProvider>
    </I18nProvider>
  );

  return (
    <SafeAreaProvider>
      {Platform.OS === 'ios' ? (
        shell
      ) : (
        <StripeProvider publishableKey={stripePk} urlScheme="astralis">
          {shell}
        </StripeProvider>
      )}
    </SafeAreaProvider>
  );
}

function AppShell(): React.JSX.Element {
  const { mode } = useAppearance();
  return (
    <>
      <StatusBar style={mode === 'light' ? 'dark' : 'light'} />
      <RootNavigator />
    </>
  );
}
