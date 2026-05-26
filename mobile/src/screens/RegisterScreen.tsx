import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
import { CityPicker } from '../components/CityPicker';
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
import type { RootStackParamList } from '../navigation/types';
import { useAppearance } from '../hooks/useAppearance';
import { BRAND_COPY } from '../lib/brandCopy';
import { track } from '../lib/analytics';
import { updateGuestOnboardingState } from '../lib/progressiveOnboarding';
import { skyMappingStep, whyBirthplaceMatters } from '../lib/onboardingReveal';
import {
  deviceTimezoneLabel,
  initialTimezoneOffset,
  validateRegisterDraft,
  type RegisterDraft,
  type RegisterValidation,
} from './registerForm';

type Step = 0 | 1 | 2;

const STEP_COPY: Record<Step, { eyebrow: string; title: string; body: string }> = {
  0: {
    eyebrow: 'Step 1 of 3',
    title: 'Start with your birthday',
    body: 'Your birth date gives Astralis a first solar anchor. No account is created yet.',
  },
  1: {
    eyebrow: 'Step 2 of 3',
    title: 'Improve chart accuracy',
    body: 'Birthplace anchors the local horizon. Birth time is optional, and unlocks rising sign precision when you have it.',
  },
  2: {
    eyebrow: 'Step 3 of 3',
    title: 'Save your personalized sky',
    body: 'Create an account only when you are ready to save readings, sync devices, and keep streak history.',
  },
};

export function RegisterScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const { register, loading } = useAuth();
  const { palette, mode } = useAppearance();
  const [step, setStep] = useState<Step>(0);
  const [draft, setDraft] = useState<RegisterDraft>({
    fullName: '',
    email: '',
    password: '',
    birthDate: '',
    birthTime: '',
    birthCity: '',
    selectedCity: null,
    timezoneOffset: initialTimezoneOffset(),
    birthDataConsent: false,
  });
  const [validation, setValidation] = useState<RegisterValidation>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [mappingStep, setMappingStep] = useState(0);
  const trackedBirthTimeSkip = useRef(false);

  const hp = horizontalScreenPadding(width);
  const brandSize = useMemo(() => brandTitleSize(width), [width]);
  const isLight = mode === 'light';
  const copy = STEP_COPY[step];
  const mappingCopy = skyMappingStep(mappingStep);

  useEffect(() => {
    if (!loading) {
      setMappingStep(0);
      return;
    }
    const id = setInterval(() => setMappingStep((current) => current + 1), 900);
    return () => clearInterval(id);
  }, [loading]);

  const patchDraft = useCallback((patch: Partial<RegisterDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const onCityQueryChange = useCallback(
    (birthCity: string) => {
      patchDraft({ birthCity, selectedCity: null });
    },
    [patchDraft],
  );

  const stepErrors = useCallback(
    (targetStep: Step): RegisterValidation => {
      const errors = validateRegisterDraft(draft);
      if (targetStep === 0) {
        return pick(errors, ['birthDate']);
      }
      if (targetStep === 1) {
        return pick(errors, ['birthCity', 'birthTime']);
      }
      return pick(errors, ['fullName', 'email', 'password', 'timezoneOffset', 'birthDataConsent']);
    },
    [draft],
  );

  const onNext = useCallback((): void => {
    const errors = stepErrors(step);
    setValidation(errors);
    if (Object.keys(errors).length > 0) {
      if (step === 1 && errors.birthCity) {
        void track('birth_city_abandonment', { source: 'register' });
      }
      return;
    }
    void track('onboarding_step_completed', { step: step === 0 ? 'birth_date' : 'birth_city', guest: true });
    if (step === 0) {
      void updateGuestOnboardingState({ birthDate: draft.birthDate.trim(), stage: 'birth_date_collected' });
      void track('personalized_preview_completed', { method: 'birth_date' });
    }
    if (step === 1) {
      if (!draft.birthTime.trim() && !trackedBirthTimeSkip.current) {
        trackedBirthTimeSkip.current = true;
        void track('birth_time_abandonment', { source: 'register' });
        void updateGuestOnboardingState({ birthTimeSkipped: true, stage: 'birth_time_prompted' });
      } else {
        if (draft.birthTime.trim()) {
          void track('delayed_birth_time_completed', { source: 'post_reading' });
        }
        void updateGuestOnboardingState({ stage: 'birth_time_prompted' });
      }
    }
    setStep((prev) => (prev === 0 ? 1 : 2));
  }, [draft.birthDate, draft.birthTime, step, stepErrors]);

  const onBack = useCallback((): void => {
    if (step === 0) {
      navigation.navigate('GuestWelcome');
      return;
    }
    setErrorMsg('');
    setValidation({});
    setStep((prev) => (prev === 2 ? 1 : 0));
  }, [navigation, step]);

  const onSubmit = useCallback(async (): Promise<void> => {
    const errors = validateRegisterDraft(draft);
    setValidation(errors);
    setErrorMsg('');
    if (Object.keys(errors).length > 0) return;
    if (!draft.selectedCity) return;
    try {
      void track('onboarding_step_completed', { step: 'account_created_after_value', guest: true });
      await register({
        fullName: draft.fullName.trim(),
        email: draft.email.trim(),
        password: draft.password,
        birthDate: draft.birthDate.trim(),
        birthTime: draft.birthTime.trim() || null,
        birthCity: draft.selectedCity.name,
        birthCountry: draft.selectedCity.country,
        latitude: draft.selectedCity.latitude,
        longitude: draft.selectedCity.longitude,
        timezoneOffset: draft.selectedCity.timezoneOffset,
        birthDataConsent: true,
      });
      void track('activation_completion', { source: 'guest', hasBirthProfile: true });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Registration failed');
    }
  }, [draft, register]);

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
            {BRAND_COPY.mark}
          </Text>
          <Text style={[styles.originLine, { color: palette.textMuted }]}>{BRAND_COPY.originLine}</Text>
          <View style={styles.progressRow} accessibilityLabel={`Registration ${copy.eyebrow}`}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor: i <= step ? palette.accent : palette.border,
                  },
                ]}
              />
            ))}
          </View>
          <CosmicCard title={copy.title}>
            <Text style={[styles.eyebrow, { color: colors.gold }]}>{copy.eyebrow}</Text>
            <Text style={[styles.hint, { color: palette.textMuted }]}>{copy.body}</Text>
            {errorMsg ? (
              <Text style={styles.error} accessibilityRole="alert">
                {errorMsg}
              </Text>
            ) : null}

            {step === 0 ? (
              <>
                <Field
                  label="Birth date (YYYY-MM-DD)"
                  labelNativeId="reg-birthdate-label"
                  value={draft.birthDate}
                  onChangeText={(birthDate) => patchDraft({ birthDate })}
                  autoComplete="birthdate-full"
                  error={validation.birthDate}
                  palette={palette}
                  isLight={isLight}
                />
                <Text style={[styles.microcopy, { color: palette.textMuted }]}>
                  This gives us your Sun sign and a first layer of sky-aware personalization.
                </Text>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <CityPicker
                  label="Search birth city"
                  query={draft.birthCity}
                  selectedCity={draft.selectedCity}
                  onQueryChange={onCityQueryChange}
                  onSelectCity={(selectedCity) =>
                    patchDraft({
                      selectedCity,
                      birthCity: selectedCity.displayLabel,
                      timezoneOffset: String(selectedCity.timezoneOffset),
                    })
                  }
                  error={validation.birthCity}
                  labelNativeId="reg-birthcity-label"
                />
                <Field
                  label="Birth time (optional, HH:MM)"
                  labelNativeId="reg-birthtime-label"
                  value={draft.birthTime}
                  onChangeText={(birthTime) => patchDraft({ birthTime })}
                  keyboardType="numbers-and-punctuation"
                  error={validation.birthTime}
                  palette={palette}
                  isLight={isLight}
                />
                <Text style={[styles.microcopy, { color: palette.textMuted }]}>
                  Birth time is for rising sign precision and house accuracy. You can leave it blank and add it later.
                </Text>
              </>
            ) : null}

            {step === 2 ? (
              <>
                {loading ? (
                  <View style={[styles.mappingPanel, { borderColor: palette.border, backgroundColor: isLight ? '#ffffff' : palette.surface }]}>
                    <Text style={[styles.mappingEyebrow, { color: colors.gold }]}>Real sky mapping</Text>
                    <Text style={[styles.mappingTitle, { color: palette.text }]}>{mappingCopy}</Text>
                    <Text style={[styles.mappingBody, { color: palette.textMuted }]}>
                      {whyBirthplaceMatters(draft.selectedCity?.name ?? draft.birthCity)}
                    </Text>
                  </View>
                ) : null}
                <View style={[styles.timezoneBox, { borderColor: palette.border, backgroundColor: isLight ? '#ffffff' : palette.surface }]}>
                  <Text style={[styles.timezoneLabel, { color: palette.textMuted }]}>Device timezone</Text>
                  <Text style={[styles.timezoneValue, { color: palette.text }]}>{deviceTimezoneLabel()}</Text>
                </View>
                <Field
                  label="Full name"
                  labelNativeId="reg-fullname-label"
                  value={draft.fullName}
                  onChangeText={(fullName) => patchDraft({ fullName })}
                  autoComplete="name"
                  textContentType="name"
                  error={validation.fullName}
                  palette={palette}
                  isLight={isLight}
                />
                <Field
                  label="Email"
                  labelNativeId="reg-email-label"
                  value={draft.email}
                  onChangeText={(email) => patchDraft({ email })}
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  error={validation.email}
                  palette={palette}
                  isLight={isLight}
                />
                <Field
                  label="Password"
                  labelNativeId="reg-password-label"
                  value={draft.password}
                  onChangeText={(password) => patchDraft({ password })}
                  secure
                  maxLength={128}
                  autoComplete="password-new"
                  textContentType="newPassword"
                  error={validation.password}
                  palette={palette}
                  isLight={isLight}
                />
                <Field
                  label="UTC offset"
                  labelNativeId="reg-timezone-label"
                  value={draft.timezoneOffset}
                  onChangeText={(timezoneOffset) => patchDraft({ timezoneOffset })}
                  keyboardType="numbers-and-punctuation"
                  error={validation.timezoneOffset}
                  palette={palette}
                  isLight={isLight}
                />
                <View style={styles.consentRow}>
                  <Switch
                    value={draft.birthDataConsent}
                    onValueChange={(birthDataConsent: boolean) => patchDraft({ birthDataConsent })}
                    trackColor={{ false: isLight ? '#d2d6e7' : 'rgba(154, 160, 194, 0.45)', true: palette.accent }}
                    thumbColor="#ffffff"
                    ios_backgroundColor={isLight ? '#d2d6e7' : 'rgba(154, 160, 194, 0.45)'}
                    accessibilityRole="switch"
                    accessibilityLabel="Allow Astralis to process birth data"
                    accessibilityState={{ checked: draft.birthDataConsent }}
                  />
                  <Text style={[styles.consentText, { color: palette.text }]}>
                    I agree to Astralis processing my birth details to calculate my chart and sky-based readings.
                  </Text>
                </View>
                {validation.birthDataConsent ? <Text style={styles.error}>{validation.birthDataConsent}</Text> : null}
                <LegalLinks compact />
              </>
            ) : null}

            <View style={styles.actionRow}>
              <Pressable
                style={({ pressed }: { pressed: boolean }) => [
                  styles.secondaryButton,
                  { borderColor: palette.border },
                  pressed && styles.pressed,
                ]}
                onPress={onBack}
                accessibilityRole="button"
                accessibilityLabel={step === 0 ? 'Back to guest preview' : 'Back'}
                hitSlop={hitSlopComfortable}
              >
                <Text style={[styles.secondaryText, { color: palette.accent }]}>{step === 0 ? 'Preview' : 'Back'}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }: { pressed: boolean }) => [
                  styles.button,
                  loading && styles.buttonDisabled,
                  pressed && styles.pressed,
                ]}
                onPress={step === 2 ? () => void onSubmit() : onNext}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={step === 2 ? 'Create account' : 'Continue'}
                accessibilityState={{ disabled: loading }}
                hitSlop={hitSlopComfortable}
              >
                <Text style={styles.buttonText}>{loading ? mappingCopy : step === 2 ? 'Create account' : 'Continue'}</Text>
              </Pressable>
            </View>
          </CosmicCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function pick<T extends keyof RegisterValidation>(
  source: RegisterValidation,
  keys: T[],
): RegisterValidation {
  const result: RegisterValidation = {};
  for (const key of keys) {
    if (source[key]) result[key] = source[key];
  }
  return result;
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
  error,
  palette,
  isLight,
}: {
  label: string;
  labelNativeId: string;
  value: string;
  onChangeText: (t: string) => void;
  secure?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  maxLength?: number;
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  error?: string;
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
            borderColor: error ? colors.danger : palette.border,
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
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  originLine: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  progressDot: {
    width: 38,
    height: 5,
    borderRadius: 999,
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  fieldWrap: { marginTop: spacing.sm },
  hint: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm, lineHeight: 19 },
  microcopy: { fontSize: 12, lineHeight: 17, marginTop: spacing.sm },
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
  timezoneBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  mappingPanel: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  mappingEyebrow: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  mappingTitle: { marginTop: 4, fontSize: 17, lineHeight: 22, fontWeight: '900' },
  mappingBody: { marginTop: 5, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  timezoneLabel: { fontSize: 12, lineHeight: 16, fontWeight: '700', textTransform: 'uppercase' },
  timezoneValue: { marginTop: 2, fontSize: 17, lineHeight: 23, fontWeight: '800' },
  consentRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  consentText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  button: {
    flex: 1.3,
    backgroundColor: colors.accent,
    minHeight: MIN_TOUCH,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  secondaryButton: {
    flex: 1,
    minHeight: MIN_TOUCH,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryText: { fontWeight: '700', fontSize: 16 },
  error: { color: colors.danger, marginTop: spacing.xs, fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.88 },
});
