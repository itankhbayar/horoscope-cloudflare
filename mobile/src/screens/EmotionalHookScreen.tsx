import React, { useEffect, useMemo, useRef, type ReactElement } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ZodiacSign } from '@astralis/lib/types';
import { getZodiacInfo, elementColor } from '@astralis/lib/zodiac';
import { useAppearance } from '../hooks/useAppearance';
import { track } from '../lib/analytics';
import { useI18n, type TranslationKey } from '../i18n';
import { ELEMENT_LABEL, selectOnboardingHook } from '../lib/onboardingHook';
import { BRAND_COPY } from '../lib/brandCopy';
import { colors, hitSlopComfortable, MIN_TOUCH, spacing } from '../theme';

type Props = {
  sunSign: ZodiacSign;
  moonSign?: ZodiacSign | null;
  risingSign?: ZodiacSign | null;
  onContinue: () => void;
};

/**
 * The onboarding "aha moment": one full-screen, deterministic emotional insight shown
 * immediately after the birth profile exists, before the first reading. Content comes from
 * the local hook system (no AI / network); this screen only stages it premium-ly and
 * reports the impression + continue events.
 */
export function EmotionalHookScreen({ sunSign, moonSign, risingSign, onContinue }: Props): ReactElement {
  const { palette, mode } = useAppearance();
  const { t, locale } = useI18n();
  const isLight = mode === 'light';

  const hook = useMemo(
    () => selectOnboardingHook({ sunSign, moonSign, risingSign, lang: locale === 'en' ? 'en' : 'mn' }),
    [sunSign, moonSign, risingSign, locale],
  );

  const accent = elementColor(hook.element);
  const signName = t(`zodiac.${sunSign}` as TranslationKey);
  const elementName = ELEMENT_LABEL[locale === 'en' ? 'en' : 'mn'][hook.element];

  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    void track('onboarding_hook_shown', {
      source: 'onboarding',
      sign: hook.sign,
      element: hook.element,
      variant: hook.variant,
    });
  }, [hook.sign, hook.element, hook.variant]);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!mounted) return;
      if (reduced) {
        fade.setValue(1);
        lift.setValue(0);
        return;
      }
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 720, useNativeDriver: true }),
        Animated.timing(lift, { toValue: 0, duration: 720, useNativeDriver: true }),
      ]).start();
    });
    return () => {
      mounted = false;
    };
  }, [fade, lift]);

  const onContinuePress = (): void => {
    void track('onboarding_hook_continue', {
      source: 'onboarding',
      sign: hook.sign,
      element: hook.element,
      variant: hook.variant,
    });
    onContinue();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.glow, { backgroundColor: accent, opacity: isLight ? 0.12 : 0.22 }]} pointerEvents="none" />
      <View style={styles.container}>
        <Text style={[styles.brand, { color: isLight ? palette.accent : colors.gold }]}>{BRAND_COPY.mark}</Text>

        <Animated.View style={[styles.hero, { opacity: fade, transform: [{ translateY: lift }] }]}>
          <View style={[styles.glyphRing, { borderColor: accent }]}>
            <Text style={[styles.glyph, { color: accent }]} allowFontScaling={false}>
              {getZodiacInfo(sunSign).symbol}
            </Text>
          </View>
          <Text style={[styles.eyebrow, { color: accent }]}>{t('onboarding.hookEyebrow')}</Text>
          <Text style={[styles.elementLine, { color: palette.textMuted }]}>
            {t('onboarding.hookElementLine', { element: elementName, sign: signName })}
          </Text>

          <Text style={[styles.hookTitle, { color: palette.text }]} accessibilityRole="header">
            {hook.title}
          </Text>
          <Text style={[styles.hookBody, { color: palette.text }]}>{hook.body}</Text>
        </Animated.View>

        <View style={styles.footer}>
          <Text style={[styles.footerNote, { color: palette.textMuted }]}>{t('onboarding.hookFooter')}</Text>
          <Pressable
            style={({ pressed }) => [styles.continueButton, { backgroundColor: palette.accent }, pressed && styles.pressed]}
            onPress={onContinuePress}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.hookContinue')}
            hitSlop={hitSlopComfortable}
          >
            <Text style={styles.continueText}>{t('onboarding.hookContinue')}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  glow: {
    position: 'absolute',
    top: -120,
    alignSelf: 'center',
    width: 360,
    height: 360,
    borderRadius: 220,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  brand: {
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glyphRing: {
    width: 92,
    height: 92,
    borderRadius: 48,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  glyph: {
    fontSize: 44,
    lineHeight: 52,
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  elementLine: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  hookTitle: {
    marginTop: spacing.xl,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '900',
    textAlign: 'center',
  },
  hookBody: {
    marginTop: spacing.md,
    fontSize: 19,
    lineHeight: 28,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    gap: spacing.md,
  },
  footerNote: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  continueButton: {
    minHeight: MIN_TOUCH + 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  continueText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },
  pressed: { opacity: 0.85 },
});
