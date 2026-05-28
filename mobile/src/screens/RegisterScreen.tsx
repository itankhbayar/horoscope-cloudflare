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
import * as horoscopeService from '@astralis/lib/horoscopeService';
import type { PersonalSkyLayer } from '@astralis/lib/types';
import { buildOnboardingPreview } from '@astralis/lib/onboardingPreview';
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
import { track } from '../lib/analytics';
import { updateGuestOnboardingState } from '../lib/progressiveOnboarding';
import { skyMappingStep, whyBirthplaceMatters } from '../lib/onboardingReveal';
import { useI18n } from '../i18n';
import {
  deviceTimezoneLabel,
  initialTimezoneOffset,
  validateRegisterDraft,
  type RegisterDraft,
  type RegisterValidation,
} from './registerForm';

type Step = 0 | 1 | 2;

export function RegisterScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const { register, loading } = useAuth();
  const { palette, mode } = useAppearance();
  const { t } = useI18n();
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
  const [preview, setPreview] = useState<PersonalSkyLayer | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const trackedBirthTimeSkip = useRef(false);
  const trackedAccountPrompt = useRef(false);
  const completedOnboarding = useRef(false);
  const abandonmentState = useRef({ step: 'birth_data', hasSeenValue: false });

  const hp = horizontalScreenPadding(width);
  const brandSize = useMemo(() => brandTitleSize(width), [width]);
  const isLight = mode === 'light';
  const copy = useMemo(() => {
    if (step === 0) return { eyebrow: t('register.step1Eyebrow'), title: t('register.step1Title'), body: t('register.step1Body') };
    if (step === 1) return { eyebrow: t('register.step2Eyebrow'), title: t('register.step2Title'), body: t('register.step2Body') };
    return { eyebrow: t('register.step3Eyebrow'), title: t('register.step3Title'), body: t('register.step3Body') };
  }, [step, t]);
  const mappingCopy = skyMappingStep(mappingStep);
  const previewModel = useMemo(
    () => preview
      ? buildOnboardingPreview(preview, {
        hasBirthTime: Boolean(draft.birthTime.trim()),
        cityName: draft.selectedCity?.name,
        locale: 'mn',
      })
      : null,
    [draft.birthTime, draft.selectedCity?.name, preview],
  );

  useEffect(() => {
    abandonmentState.current = {
      step: step === 0 ? 'birth_data' : step === 1 ? 'first_value' : 'account_prompt',
      hasSeenValue: Boolean(preview),
    };
  }, [preview, step]);

  useEffect(() => {
    void track('onboarding_started', { surface: 'register', step: 'birth_data' });
    return () => {
      if (completedOnboarding.current) return;
      void track('onboarding_abandoned', {
        surface: 'register',
        step: abandonmentState.current.step,
        hasSeenValue: abandonmentState.current.hasSeenValue,
      });
    };
  }, []);

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
      if (targetStep === 0) return pick(errors, ['birthDate', 'birthCity', 'birthTime']);
      if (targetStep === 1) return {};
      return pick(errors, ['fullName', 'email', 'password', 'birthDataConsent']);
    },
    [draft],
  );

  const onNext = useCallback((): void => {
    const errors = stepErrors(step);
    setValidation(errors);
    if (Object.keys(errors).length > 0) {
      if (step === 0 && errors.birthCity) {
        void track('birth_city_abandonment', { source: 'register' });
      }
      return;
    }
    if (step === 0) {
      void track('birth_data_completed', {
        hasBirthTime: Boolean(draft.birthTime.trim()),
        cityCountry: draft.selectedCity?.country,
      });
      void updateGuestOnboardingState({ birthDate: draft.birthDate.trim(), stage: 'birth_date_collected' });
      if (!draft.birthTime.trim() && !trackedBirthTimeSkip.current) {
        trackedBirthTimeSkip.current = true;
        void track('birth_time_abandonment', { source: 'register' });
        void updateGuestOnboardingState({ birthTimeSkipped: true, stage: 'birth_time_prompted' });
      } else {
        if (draft.birthTime.trim()) {
          void track('delayed_birth_time_completed', { source: 'post_reading' });
          void track('preview_birth_time_added', { surface: 'register' });
        }
        void updateGuestOnboardingState({ stage: 'birth_time_prompted' });
      }
      setPreviewLoading(true);
      setErrorMsg('');
      void horoscopeService
        .fetchPersonalSkyLayer({ birthDate: draft.birthDate.trim() })
        .then((layer) => {
          setPreview(layer);
          void track('personalized_preview_completed', { method: 'birth_date' });
          void track('first_value_shown', {
            surface: 'register',
            valueType: 'personal_sky_preview',
            hasBirthTime: Boolean(draft.birthTime.trim()),
          });
          void track('preview_viewed', {
            surface: 'register',
            sign: layer.sign,
            hasBirthTime: Boolean(draft.birthTime.trim()),
          });
          setStep(1);
        })
        .catch((e) => {
          setErrorMsg(e instanceof Error ? e.message : t('register.previewFailed'));
        })
        .finally(() => setPreviewLoading(false));
      return;
    }
    if (step === 1) {
      if (!trackedAccountPrompt.current) {
        trackedAccountPrompt.current = true;
        void track('preview_cta_clicked', { surface: 'register', cta: 'save_reading' });
        void track('account_creation_prompt_shown', { surface: 'register', valueType: 'personal_sky_preview' });
      }
      setStep(2);
    }
  }, [draft.birthDate, draft.birthTime, draft.selectedCity?.country, step, stepErrors, t]);

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
      completedOnboarding.current = true;
      void track('account_created_after_value', { method: 'email', hasBirthProfile: true });
      void track('preview_account_created', { method: 'email', hasBirthProfile: true });
      void track('activation_completion', { source: 'guest', hasBirthProfile: true });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : t('register.failed'));
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
            Astralis
          </Text>
          <Text style={[styles.originLine, { color: palette.textMuted }]}>{t('brand.originLine')}</Text>
          <View style={styles.progressRow} accessibilityLabel={t('register.progressA11y', { step: copy.eyebrow })}>
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
                  label={t('register.birthDate')}
                  labelNativeId="reg-birthdate-label"
                  value={draft.birthDate}
                  onChangeText={(birthDate) => patchDraft({ birthDate })}
                  autoComplete="birthdate-full"
                  error={validation.birthDate}
                  palette={palette}
                  isLight={isLight}
                />
                <Text style={[styles.microcopy, { color: palette.textMuted }]}>
                  {t('register.birthDateHint')}
                </Text>
                <CityPicker
                  label={t('register.birthCity')}
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
                  label={t('register.birthTime')}
                  labelNativeId="reg-birthtime-label"
                  value={draft.birthTime}
                  onChangeText={(birthTime) => patchDraft({ birthTime })}
                  keyboardType="numbers-and-punctuation"
                  error={validation.birthTime}
                  palette={palette}
                  isLight={isLight}
                />
                <Text style={[styles.microcopy, { color: palette.textMuted }]}>
                  {t('register.birthTimeHint')}
                </Text>
              </>
            ) : null}

            {step === 1 ? (
              <View style={[styles.previewPanel, { borderColor: palette.border, backgroundColor: isLight ? '#ffffff' : palette.surface }]}>
                <Text style={[styles.mappingEyebrow, { color: colors.gold }]}>Identity</Text>
                <Text style={[styles.previewTitle, { color: palette.text }]}>{previewModel?.identityTitle ?? t('register.previewReady')}</Text>
                <Text style={[styles.previewBody, { color: palette.text }]}>{previewModel?.identityBody}</Text>
                <View style={styles.identityTags}>
                  <Text style={[styles.identityTag, { borderColor: palette.border, color: colors.gold }]}>{previewModel?.element}</Text>
                  <Text style={[styles.identityTag, { borderColor: palette.border, color: colors.gold }]}>{previewModel?.modality}</Text>
                </View>

                <View style={[styles.previewSection, { borderColor: palette.border }]}>
                  <Text style={[styles.mappingEyebrow, { color: colors.gold }]}>Today's sky</Text>
                  <Text style={[styles.previewBody, { color: palette.text }]}>{previewModel?.todayTheme}</Text>
                  <Text style={[styles.previewBody, { color: palette.textMuted }]}>{previewModel?.transitTitle}</Text>
                  <Text style={[styles.previewBody, { color: palette.textMuted }]}>{previewModel?.transitBody}</Text>
                </View>

                <View style={[styles.previewSection, { borderColor: palette.border }]}>
                  <Text style={[styles.mappingEyebrow, { color: colors.gold }]}>What you're missing</Text>
                  <Text style={[styles.previewBody, { color: palette.text }]}>{previewModel?.missingTitle}</Text>
                  {previewModel?.missingItems.map((item) => (
                    <Text key={item} style={[styles.previewBody, { color: palette.textMuted }]}>- {item}</Text>
                  ))}
                  <Text style={[styles.previewBody, { color: palette.textMuted }]}>{previewModel?.missingBody}</Text>
                </View>

                <View style={[styles.previewSection, { borderColor: palette.border }]}>
                  <Text style={[styles.mappingEyebrow, { color: colors.gold }]}>Future value</Text>
                  <Text style={[styles.previewBody, { color: palette.text }]}>{previewModel?.futureTitle}</Text>
                  <Text style={[styles.previewBody, { color: palette.textMuted }]}>{previewModel?.futureBody}</Text>
                </View>
              </View>
            ) : null}

            {step === 2 ? (
              <>
                <View style={[styles.accountPrompt, { borderColor: palette.border, backgroundColor: isLight ? '#ffffff' : palette.surface }]}>
                  <Text style={[styles.previewTitle, { color: palette.text }]}>{previewModel?.saveTitle ?? t('register.saveReadingTitle')}</Text>
                  <Text style={[styles.previewBody, { color: palette.textMuted }]}>{previewModel?.saveBody ?? t('register.saveReadingBody')}</Text>
                  <Pressable style={[styles.socialButton, styles.socialDisabled]} disabled accessibilityRole="button">
                    <Text style={[styles.socialText, { color: palette.textMuted }]}>{t('register.continueGoogle')}</Text>
                  </Pressable>
                  <Pressable style={[styles.socialButton, styles.socialDisabled]} disabled accessibilityRole="button">
                    <Text style={[styles.socialText, { color: palette.textMuted }]}>{t('register.continueApple')}</Text>
                  </Pressable>
                  <Text style={[styles.microcopy, { color: palette.textMuted }]}>{t('register.socialUnavailable')}</Text>
                </View>
                {loading ? (
                  <View style={[styles.mappingPanel, { borderColor: palette.border, backgroundColor: isLight ? '#ffffff' : palette.surface }]}>
                    <Text style={[styles.mappingEyebrow, { color: colors.gold }]}>{t('register.realSkyMapping')}</Text>
                    <Text style={[styles.mappingTitle, { color: palette.text }]}>{mappingCopy}</Text>
                    <Text style={[styles.mappingBody, { color: palette.textMuted }]}>
                      {whyBirthplaceMatters(draft.selectedCity?.name ?? draft.birthCity)}
                    </Text>
                  </View>
                ) : null}
                <View style={[styles.timezoneBox, { borderColor: palette.border, backgroundColor: isLight ? '#ffffff' : palette.surface }]}>
                  <Text style={[styles.timezoneLabel, { color: palette.textMuted }]}>{t('register.deviceTimezone')}</Text>
                  <Text style={[styles.timezoneValue, { color: palette.text }]}>{deviceTimezoneLabel()}</Text>
                </View>
                <Field
                  label={t('register.fullName')}
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
                  label={t('login.email')}
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
                  label={t('register.password')}
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
                <View style={styles.consentRow}>
                  <Switch
                    value={draft.birthDataConsent}
                    onValueChange={(birthDataConsent: boolean) => patchDraft({ birthDataConsent })}
                    trackColor={{ false: isLight ? '#d2d6e7' : 'rgba(154, 160, 194, 0.45)', true: palette.accent }}
                    thumbColor="#ffffff"
                    ios_backgroundColor={isLight ? '#d2d6e7' : 'rgba(154, 160, 194, 0.45)'}
                    accessibilityRole="switch"
                    accessibilityLabel={t('register.birthConsent')}
                    accessibilityState={{ checked: draft.birthDataConsent }}
                  />
                  <Text style={[styles.consentText, { color: palette.text }]}>
                    {t('register.birthConsent')}
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
                accessibilityLabel={step === 0 ? t('register.preview') : t('common.back')}
                hitSlop={hitSlopComfortable}
              >
                <Text style={[styles.secondaryText, { color: palette.accent }]}>{step === 0 ? t('register.preview') : t('common.back')}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }: { pressed: boolean }) => [
                  styles.button,
                  loading && styles.buttonDisabled,
                  pressed && styles.pressed,
                ]}
                onPress={step === 2 ? () => void onSubmit() : onNext}
                disabled={loading || previewLoading}
                accessibilityRole="button"
                accessibilityLabel={step === 2 ? t('common.createAccount') : t('common.continue')}
                accessibilityState={{ disabled: loading || previewLoading }}
                hitSlop={hitSlopComfortable}
              >
                <Text style={styles.buttonText}>
                  {loading ? mappingCopy : previewLoading ? t('register.generatingPreview') : step === 2 ? t('register.continueEmail') : t('common.continue')}
                </Text>
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
  previewPanel: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  previewTitle: { fontSize: 18, lineHeight: 24, fontWeight: '900' },
  previewBody: { fontSize: 14, lineHeight: 21, fontWeight: '700' },
  previewSection: {
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  identityTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  identityTag: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  accountPrompt: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  socialButton: {
    minHeight: MIN_TOUCH,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  socialDisabled: { opacity: 0.58 },
  socialText: { fontSize: 14, lineHeight: 19, fontWeight: '800' },
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
