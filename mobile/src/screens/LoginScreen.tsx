import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import type { RootStackParamList } from '../navigation/types';
import { CosmicCard } from '../components/CosmicCard';
import { LegalLinks } from '../components/LegalLinks';
import {
  brandTitleSize,
  colors,
  hitSlopComfortable,
  horizontalScreenPadding,
  MIN_TOUCH,
  spacing,
} from '../theme';
import { getApiBaseUrl } from '@astralis/lib/apiClient';
import { useAppearance } from '../hooks/useAppearance';

export function LoginScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const { login, loading } = useAuth();
  const { palette, mode } = useAppearance();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const onSubmit = useCallback(async (): Promise<void> => {
    setErrorMsg('');
    try {
      await login({ email: email.trim(), password });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Sign in failed');
    }
  }, [email, login, password]);

  const goRegister = useCallback((): void => {
    navigation.navigate('Register');
  }, [navigation]);

  const apiBase = getApiBaseUrl();
  const showLoopbackHint =
    errorMsg.length > 0 &&
    /network request failed|network failed|failed to fetch/i.test(errorMsg) &&
    /127\.0\.0\.1|localhost/i.test(apiBase);
  const showLanTimeoutHint =
    errorMsg.length > 0 &&
    /timed out|timeout/i.test(errorMsg) &&
    /192\.168\.|10\.0\.2\.2|172\.(1[6-9]|2[0-9]|3[0-1])\./i.test(apiBase);

  const hp = horizontalScreenPadding(width);
  const brandSize = useMemo(() => brandTitleSize(width), [width]);
  const isLight = mode === 'light';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: hp }]}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={[styles.brand, { fontSize: brandSize, color: isLight ? palette.accent : colors.gold }]}
            accessibilityRole="header"
            accessibilityLabel="Astralis"
          >
            ✦ Astralis
          </Text>
          <CosmicCard title="Welcome back">
            {errorMsg ? (
              <Text style={styles.error} accessibilityRole="alert">
                {errorMsg}
              </Text>
            ) : null}
            {showLoopbackHint ? (
              <Text style={[styles.hint, { color: palette.textMuted }]}>
                {
                  "On a real phone, 127.0.0.1 is the phone itself. Put your PC's LAN URL in mobile/.env as EXPO_PUBLIC_API_BASE_URL (e.g. http://192.168.x.x:8787), restart Expo with -c, and keep Wrangler running (npm run dev in backend listens on all interfaces)."
                }
              </Text>
            ) : null}
            {showLanTimeoutHint ? (
              <Text style={[styles.hint, { color: palette.textMuted }]}>
                {
                  "Timeout = phone cannot reach your PC. (1) Safari → same http://IP:8787/ — expect JSON. (2) Windows: run backend/scripts/allow-wrangler-dev-firewall.ps1 as Admin (or npm run allow-firewall from backend); Wi‑Fi on Public profile needs this rule on all profiles. (3) ipconfig IPv4 must match .env. (4) Router AP isolation → try another Wi‑Fi or use https://…workers.dev in .env."
                }
              </Text>
            ) : null}
            <Text style={[styles.label, { color: palette.textMuted }]} nativeID="login-email-label">
              Email
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: palette.border,
                  color: palette.text,
                  backgroundColor: isLight ? '#ffffff' : palette.surface,
                },
              ]}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="username"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={palette.textMuted}
              accessibilityLabel="Email"
              accessibilityLabelledBy="login-email-label"
              returnKeyType="next"
            />
            <Text style={[styles.label, { color: palette.textMuted }]} nativeID="login-password-label">
              Password
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: palette.border,
                  color: palette.text,
                  backgroundColor: isLight ? '#ffffff' : palette.surface,
                },
              ]}
              secureTextEntry
              textContentType="password"
              autoComplete="password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={palette.textMuted}
              accessibilityLabel="Password"
              accessibilityLabelledBy="login-password-label"
              returnKeyType="go"
              onSubmitEditing={() => void onSubmit()}
            />
            <Pressable
              style={({ pressed }) => [
                styles.button,
                loading && styles.buttonDisabled,
                pressed && styles.pressed,
              ]}
              onPress={() => void onSubmit()}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={loading ? 'Signing in' : 'Sign in'}
              accessibilityState={{ disabled: loading }}
              hitSlop={hitSlopComfortable}
            >
              <Text style={styles.buttonText}>{loading ? 'Signing in…' : 'Sign in'}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.link, pressed && styles.pressed]}
              onPress={goRegister}
              accessibilityRole="button"
              accessibilityLabel="Create an account"
              hitSlop={hitSlopComfortable}
            >
              <Text style={[styles.linkText, { color: palette.accent }]}>New here? Create an account</Text>
            </Pressable>
            <LegalLinks compact />
          </CosmicCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  brand: {
    fontWeight: '800',
    color: colors.gold,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  label: { color: colors.textMuted, marginBottom: spacing.xs, marginTop: spacing.sm, fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    minHeight: MIN_TOUCH,
    paddingVertical: spacing.sm,
    color: colors.text,
    backgroundColor: colors.surface,
    fontSize: 16,
  },
  button: {
    marginTop: spacing.xl,
    backgroundColor: colors.accent,
    minHeight: MIN_TOUCH,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: colors.danger, marginBottom: spacing.sm, fontSize: 15 },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  link: {
    marginTop: spacing.md,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: { color: colors.accent, fontSize: 15 },
  pressed: { opacity: 0.88 },
});
