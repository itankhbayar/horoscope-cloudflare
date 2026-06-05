import React, { useEffect, useState, type ReactElement } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSanctuaryTheme } from '../components/home/sanctuaryTheme';
import { spacing } from '../theme';
import { useI18n } from '../i18n';
import { useReflection } from '../hooks/useReflection';
import { track } from '../lib/analytics';
import type { RootStackParamList } from '../navigation/types';
import type { Resonance } from '@astralis/lib/types';
import type { TranslationKey } from '../i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'ReflectionCheckIn'>;

const OPTIONS: Array<{ value: Resonance; key: TranslationKey }> = [
  { value: 1, key: 'reflection.option1' },
  { value: 2, key: 'reflection.option2' },
  { value: 3, key: 'reflection.option3' },
];

/**
 * Accuracy Loop — evening check-in. One input in V1: a 3-point resonance pick of how
 * today's reading landed. No scores, no self-assessment — only how the reading felt.
 */
export function ReflectionCheckInScreen({ route, navigation }: Props): ReactElement {
  const theme = useSanctuaryTheme();
  const { t } = useI18n();
  const { submit } = useReflection();
  const source = route.params?.source ?? 'home_card';
  const readingDate = route.params?.readingDate;
  const hook = route.params?.hook;
  const [selected, setSelected] = useState<Resonance | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void track('reflection_checkin_opened', { source });
  }, [source]);

  const onSave = async (): Promise<void> => {
    if (selected === null || pending || !readingDate) return;
    setPending(true);
    setError(null);
    try {
      const result = await submit(readingDate, selected);
      await track('reflection_checkin_submitted', {
        readingDate: result.readingDate,
        resonance: result.resonance,
        source,
        alreadyExisted: result.alreadyExisted,
      });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save just now.');
    } finally {
      setPending(false);
    }
  };

  const onSkip = (): void => {
    void track('reflection_checkin_skipped', { source });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgDeep }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.container}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
            {t('reflection.checkInTitle')}
          </Text>
          <Text style={[styles.body, { color: theme.textMuted }]}>{t('reflection.checkInBody')}</Text>

          {hook ? (
            <View style={[styles.recall, { borderColor: theme.cardBorder }]}>
              <Text style={[styles.recallLabel, { color: theme.textSoft }]}>{t('reflection.recall')}</Text>
              <Text style={[styles.recallText, { color: theme.text }]}>{hook}</Text>
            </View>
          ) : null}

          <View style={styles.options}>
            {OPTIONS.map((opt) => {
              const active = selected === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setSelected(opt.value)}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      borderColor: active ? theme.lavender : theme.cardBorder,
                      backgroundColor: active ? theme.surfaceTint : 'transparent',
                    },
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t(opt.key)}
                >
                  <Text style={[styles.optionText, { color: active ? theme.text : theme.textMuted }]}>{t(opt.key)}</Text>
                </Pressable>
              );
            })}
          </View>

          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          <Pressable
            onPress={() => void onSave()}
            disabled={selected === null || pending}
            style={({ pressed }) => [
              styles.primary,
              { backgroundColor: theme.lavender },
              (selected === null || pending) && styles.disabled,
              pressed && (selected !== null && !pending) && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('reflection.save')}
            accessibilityState={{ disabled: selected === null || pending, busy: pending }}
          >
            {pending ? (
              <ActivityIndicator color={theme.hole} />
            ) : (
              <Text style={[styles.primaryText, { color: theme.hole }]}>{t('reflection.save')}</Text>
            )}
          </Pressable>
          <Pressable
            onPress={onSkip}
            disabled={pending}
            style={({ pressed }) => [styles.secondary, pressed && !pending && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={t('reflection.skip')}
          >
            <Text style={[styles.secondaryText, { color: theme.textMuted }]}>{t('reflection.skip')}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 26,
    padding: spacing.lg,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  body: {
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  recall: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  recallLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recallText: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  options: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  option: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  optionText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  error: {
    color: '#ffb5b5',
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  primary: {
    minHeight: 50,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  primaryText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  secondary: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  secondaryText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});
