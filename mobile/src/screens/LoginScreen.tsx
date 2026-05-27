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
import { useI18n } from '../i18n';

export function LoginScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const { login, loading } = useAuth();
  const { palette, mode } = useAppearance();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const onSubmit = useCallback(async (): Promise<void> => {
    setErrorMsg('');
    try {
      await login({ email: email.trim(), password });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : t('login.failed'));
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
            Astralis
          </Text>
          <Text style={[styles.originLine, { color: palette.textMuted }]}>{t('brand.preciseAstrology')}</Text>
          <CosmicCard title={t('login.title')}>
            {errorMsg ? (
              <Text style={styles.error} accessibilityRole="alert">
                {errorMsg}
              </Text>
            ) : null}
            {showLoopbackHint ? (
              <Text style={[styles.hint, { color: palette.textMuted }]}>
                {t('login.loopbackHint')}
              </Text>
            ) : null}
            {showLanTimeoutHint ? (
              <Text style={[styles.hint, { color: palette.textMuted }]}>
                {t('login.timeoutHint')}
              </Text>
            ) : null}
            <Text style={[styles.label, { color: palette.textMuted }]} nativeID="login-email-label">
              {t('login.email')}
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
              accessibilityLabel={t('login.email')}
              accessibilityLabelledBy="login-email-label"
              returnKeyType="next"
            />
            <Text style={[styles.label, { color: palette.textMuted }]} nativeID="login-password-label">
              {t('login.password')}
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
              accessibilityLabel={t('login.password')}
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
              accessibilityLabel={loading ? t('login.loading') : t('common.signIn')}
              accessibilityState={{ disabled: loading }}
              hitSlop={hitSlopComfortable}
            >
              <Text style={styles.buttonText}>{loading ? t('login.loading') : t('common.signIn')}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.link, pressed && styles.pressed]}
              onPress={goRegister}
              accessibilityRole="button"
              accessibilityLabel={t('login.createA11y')}
              hitSlop={hitSlopComfortable}
            >
              <Text style={[styles.linkText, { color: palette.accent }]}>{t('login.newHere')}</Text>
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
  originLine: {
    marginTop: -spacing.lg,
    marginBottom: spacing.lg,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
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
