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
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { CosmicCard } from '../components/CosmicCard';
import {
  brandTitleSize,
  colors,
  hitSlopComfortable,
  horizontalScreenPadding,
  MIN_TOUCH,
  spacing,
} from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { resetToMain } from '../navigation/navigationRef';
import { useAppearance } from '../hooks/useAppearance';

export function RegisterScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const { register, loading } = useAuth();
  const { palette, mode } = useAppearance();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthCity, setBirthCity] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const onSubmit = useCallback(async (): Promise<void> => {
    setErrorMsg('');
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        birthDate: birthDate.trim(),
        birthTime: birthTime.trim() || null,
        birthCity: birthCity.trim(),
        birthCountry: null,
        latitude: null,
        longitude: null,
        timezoneOffset: null,
      });
      resetToMain();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Registration failed');
    }
  }, [birthCity, birthDate, birthTime, email, fullName, password, register]);

  const goLogin = useCallback((): void => {
    navigation.navigate('Login');
  }, [navigation]);

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
          contentContainerStyle={[styles.scroll, { paddingHorizontal: hp }]}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={[styles.brand, { fontSize: brandSize, color: isLight ? palette.accent : colors.gold }]}
            accessibilityRole="header"
          >
            ✦ Astralis
          </Text>
          <CosmicCard title="Create account">
            <Text style={[styles.hint, { color: palette.textMuted }]}>
              Birth date as YYYY-MM-DD. City must match the API city list (same as web).
            </Text>
            {errorMsg ? (
              <Text style={styles.error} accessibilityRole="alert">
                {errorMsg}
              </Text>
            ) : null}
            <Field
              label="Full name"
              labelNativeId="reg-fullname-label"
              value={fullName}
              onChangeText={setFullName}
              autoComplete="name"
              textContentType="name"
              palette={palette}
              isLight={isLight}
            />
            <Field
              label="Email"
              labelNativeId="reg-email-label"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              palette={palette}
              isLight={isLight}
            />
            <Field
              label="Password"
              labelNativeId="reg-password-label"
              value={password}
              onChangeText={setPassword}
              secure
              maxLength={128}
              autoComplete="password-new"
              textContentType="newPassword"
              palette={palette}
              isLight={isLight}
            />
            <Field
              label="Birth date (YYYY-MM-DD)"
              labelNativeId="reg-birthdate-label"
              value={birthDate}
              onChangeText={setBirthDate}
              autoComplete="birthdate-full"
              palette={palette}
              isLight={isLight}
            />
            <Field
              label="Birth time (optional, HH:MM)"
              labelNativeId="reg-birthtime-label"
              value={birthTime}
              onChangeText={setBirthTime}
              palette={palette}
              isLight={isLight}
            />
            <Field
              label="Birth city"
              labelNativeId="reg-birthcity-label"
              value={birthCity}
              onChangeText={setBirthCity}
              autoComplete="postal-address-locality"
              palette={palette}
              isLight={isLight}
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
              accessibilityLabel={loading ? 'Creating account' : 'Create account'}
              accessibilityState={{ disabled: loading }}
              hitSlop={hitSlopComfortable}
            >
              <Text style={styles.buttonText}>{loading ? 'Creating…' : 'Create account'}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.link, pressed && styles.pressed]}
              onPress={goLogin}
              accessibilityRole="button"
              accessibilityLabel="Sign in with existing account"
              hitSlop={hitSlopComfortable}
            >
              <Text style={[styles.linkText, { color: palette.accent }]}>Already have an account? Sign in</Text>
            </Pressable>
          </CosmicCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const Field = React.memo(function Field({
  label,
  labelNativeId,
  value,
  onChangeText,
  secure,
  keyboardType,
  maxLength,
  autoComplete,
  textContentType,
  palette,
  isLight,
}: {
  label: string;
  labelNativeId: string;
  value: string;
  onChangeText: (t: string) => void;
  secure?: boolean;
  keyboardType?: 'default' | 'email-address';
  maxLength?: number;
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  palette: { text: string; textMuted: string; border: string; surface: string };
  isLight: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, { color: palette.textMuted }]} nativeID={labelNativeId}>
        {label}
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
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        keyboardType={keyboardType ?? 'default'}
        maxLength={maxLength}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
        placeholderTextColor={palette.textMuted}
        autoComplete={autoComplete}
        textContentType={textContentType}
        accessibilityLabel={label}
        accessibilityLabelledBy={labelNativeId}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { paddingVertical: spacing.lg, paddingBottom: spacing.xxxl },
  brand: {
    fontWeight: '800',
    color: colors.gold,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  fieldWrap: { marginTop: spacing.sm },
  hint: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm, lineHeight: 18 },
  label: { color: colors.textMuted, marginBottom: spacing.xs, fontSize: 14 },
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
  link: {
    marginTop: spacing.md,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: { color: colors.accent, fontSize: 15 },
  error: { color: colors.danger, marginBottom: spacing.sm, fontSize: 15 },
  pressed: { opacity: 0.88 },
});
