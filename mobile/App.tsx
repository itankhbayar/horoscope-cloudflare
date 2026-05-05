import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/hooks/useAuth';
import { RootNavigator } from './src/navigation/RootNavigator';

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

export default function App(): React.JSX.Element {
  useEffect(() => {
    ensureAbortSignalTimeoutPolyfill();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
