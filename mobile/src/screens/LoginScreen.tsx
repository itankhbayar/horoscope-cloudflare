import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import type { RootStackParamList } from '../navigation/types';
import { CosmicCard } from '../components/CosmicCard';
import { colors } from '../theme';
import { resetToMain } from '../navigation/navigationRef';
import { getApiBaseUrl } from '@astralis/lib/apiClient';

export function LoginScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  async function onSubmit(): Promise<void> {
    setErrorMsg('');
    try {
      await login({ email: email.trim(), password });
      resetToMain();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Sign in failed');
    }
  }

  const apiBase = getApiBaseUrl();
  const showLoopbackHint =
    errorMsg.length > 0 &&
    /network request failed|network failed|failed to fetch/i.test(errorMsg) &&
    /127\.0\.0\.1|localhost/i.test(apiBase);
  const showLanTimeoutHint =
    errorMsg.length > 0 &&
    /timed out|timeout/i.test(errorMsg) &&
    /192\.168\.|10\.0\.2\.2|172\.(1[6-9]|2[0-9]|3[0-1])\./i.test(apiBase);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.brand}>✦ Astralis</Text>
      <CosmicCard title="Welcome back">
        {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
        {showLoopbackHint ? (
          <Text style={styles.hint}>
            {
              "On a real phone, 127.0.0.1 is the phone itself. Put your PC's LAN URL in mobile/.env as EXPO_PUBLIC_API_BASE_URL (e.g. http://192.168.x.x:8787), restart Expo with -c, and keep Wrangler running (npm run dev in backend listens on all interfaces)."
            }
          </Text>
        ) : null}
        {showLanTimeoutHint ? (
          <Text style={styles.hint}>
            {
              "Timeout = phone cannot reach your PC. (1) Safari → same http://IP:8787/ — expect JSON. (2) Windows: run backend/scripts/allow-wrangler-dev-firewall.ps1 as Admin (or npm run allow-firewall from backend); Wi‑Fi on Public profile needs this rule on all profiles. (3) ipconfig IPv4 must match .env. (4) Router AP isolation → try another Wi‑Fi or use https://…workers.dev in .env."
            }
          </Text>
        ) : null}
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.textMuted}
        />
        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={() => void onSubmit()}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Signing in…' : 'Sign in'}</Text>
        </Pressable>
        <Pressable style={styles.link} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.linkText}>New here? Create an account</Text>
        </Pressable>
      </CosmicCard>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    justifyContent: 'center',
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.gold,
    textAlign: 'center',
    marginBottom: 24,
  },
  label: { color: colors.textMuted, marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  button: {
    marginTop: 20,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: colors.danger, marginBottom: 8 },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { color: colors.accent, fontSize: 15 },
});
