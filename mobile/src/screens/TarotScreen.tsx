import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { fetchTarotDaily, isTarotNotFound } from '@astralis/lib/tarotService';
import { ZODIAC_SIGNS } from '@astralis/lib/zodiac';
import type { TarotApiResponse, ZodiacSign } from '@astralis/lib/types';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { CosmicCard } from '../components/CosmicCard';
import { LoadingBlock } from '../components/LoadingBlock';
import { ScreenScroll } from '../components/ScreenScroll';
import {
  bodyFontSize,
  bodyLineHeight,
  colors,
  hitSlopComfortable,
  MIN_TOUCH,
  screenTitleSize,
  spacing,
} from '../theme';
import { useAppearance } from '../hooks/useAppearance';
import { useI18n } from '../i18n';
import { goToPremium } from '../navigation/navigationRef';

/** Device IANA timezone, mirroring the web composable's `browserTimeZone()`. */
function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Resolve "today" to a concrete UTC calendar date, matching the backend default and useHoroscope. */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TarotScreen(): React.JSX.Element {
  const { width } = useWindowDimensions();
  const { palette, mode } = useAppearance();
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const { profile, load: loadProfile } = useProfile();

  const isPremium = Boolean(user?.isPremium);
  const isAuthenticated = Boolean(user);

  const sunSign = profile?.natalChart?.sunSign ?? null;
  const [selectedSign, setSelectedSign] = useState<ZodiacSign>('leo');
  const [data, setData] = useState<TarotApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    if (isPremium) void loadProfile();
  }, [isPremium, loadProfile]);

  // Default the picker to the user's own sun sign once the profile resolves.
  useEffect(() => {
    if (sunSign) setSelectedSign(sunSign);
  }, [sunSign]);

  const titleSize = useMemo(() => screenTitleSize(width), [width]);
  const bodySize = useMemo(() => bodyFontSize(width), [width]);
  const lineHeight = useMemo(() => bodyLineHeight(width), [width]);
  const bodyStyle = useMemo(() => ({ fontSize: bodySize, lineHeight }), [bodySize, lineHeight]);
  const goldText = mode === 'light' ? '#4a5aa0' : colors.gold;

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setEmpty(false);
  }, []);

  const onSelectSign = useCallback(
    (sign: ZodiacSign) => {
      setSelectedSign(sign);
      reset();
    },
    [reset],
  );

  const draw = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setEmpty(false);
    setData(null);
    try {
      const res = await fetchTarotDaily({
        sign: selectedSign,
        timezone: deviceTimeZone(),
        date: todayUtc(),
        lang: locale,
      });
      setData(res);
    } catch (e) {
      if (isTarotNotFound(e)) {
        setEmpty(true);
      } else {
        setError(e instanceof Error ? e.message : t('tarot.errorTitle'));
      }
    } finally {
      setLoading(false);
    }
  }, [locale, selectedSign, t]);

  const arcanaLabel = useCallback(
    (v: 'Major' | 'Minor'): string => (v === 'Major' ? t('tarot.major') : t('tarot.minor')),
    [t],
  );
  const orientationLabel = useCallback(
    (v: 'Upright' | 'Reversed'): string => (v === 'Upright' ? t('tarot.upright') : t('tarot.reversed')),
    [t],
  );

  return (
    <ScreenScroll>
      <Text style={[styles.title, { fontSize: titleSize, color: palette.text }]} accessibilityRole="header">
        {t('tarot.title')}
      </Text>
      <Text style={[styles.sub, { fontSize: bodySize, color: palette.textMuted }]}>{t('tarot.subtitle')}</Text>

      {!isPremium ? (
        <CosmicCard title={t('tarot.lockedTitle')}>
          <Text style={[styles.body, bodyStyle, { color: palette.text }]}>
            {isAuthenticated ? t('tarot.lockedBody') : t('tarot.lockedBodyGuest')}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.button, { backgroundColor: palette.accent }, pressed && styles.pressed]}
            onPress={() => goToPremium('locked_preview')}
            accessibilityRole="button"
            accessibilityLabel={t('tarot.lockedCta')}
            hitSlop={hitSlopComfortable}
          >
            <Text style={styles.buttonText}>{t('tarot.lockedCta')}</Text>
          </Pressable>
        </CosmicCard>
      ) : (
        <>
          <Text style={[styles.pickLabel, { color: goldText }]} accessibilityRole="header">
            {t('tarot.signLabel')}
          </Text>
          {sunSign && selectedSign === sunSign ? (
            <Text style={[styles.hint, { color: goldText }]}>{t('tarot.profileSunHint')}</Text>
          ) : null}
          <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={t('tarot.signLabel')}>
            {ZODIAC_SIGNS.map((z) => {
              const active = selectedSign === z.key;
              return (
                <Pressable
                  key={z.key}
                  onPress={() => onSelectSign(z.key)}
                  style={({ pressed }) => [
                    styles.chip,
                    { borderColor: palette.border, backgroundColor: palette.surface },
                    active && { borderColor: palette.accent, backgroundColor: colors.accentSoft },
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${z.key} ${z.symbol}`}
                  hitSlop={hitSlopComfortable}
                >
                  <Text style={[styles.chipText, { color: palette.text }]}>{z.symbol}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: palette.accent },
              loading && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}
            onPress={() => void draw()}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={t('tarot.draw')}
            accessibilityState={{ disabled: loading }}
            hitSlop={hitSlopComfortable}
          >
            <Text style={styles.buttonText}>{loading ? t('tarot.drawLoading') : t('tarot.draw')}</Text>
          </Pressable>

          {loading ? <LoadingBlock message={t('tarot.loading')} /> : null}

          {error ? (
            <Text style={[styles.error, { color: colors.danger }]} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          {empty ? (
            <CosmicCard title={t('tarot.emptyTitle')}>
              <Text style={[styles.body, bodyStyle, { color: palette.textMuted }]}>{t('tarot.emptyHint')}</Text>
            </CosmicCard>
          ) : null}

          {data ? (
            <>
              <CosmicCard title={t('tarot.cardTitle')}>
                <Text style={[styles.cardName, { color: palette.text }]}>{data.card_of_the_day.name}</Text>
                <View style={styles.metaRow}>
                  <Text style={[styles.meta, { color: palette.textMuted }]}>
                    {t('tarot.arcana')}: {arcanaLabel(data.card_of_the_day.arcana)}
                  </Text>
                  <Text style={[styles.meta, { color: palette.textMuted }]}>
                    {t('tarot.orientation')}: {orientationLabel(data.card_of_the_day.orientation)}
                  </Text>
                  <Text style={[styles.meta, { color: goldText }]}>
                    {t('tarot.energy')}: {data.energyScore}
                  </Text>
                </View>
                <Text style={[styles.body, bodyStyle, { color: palette.text }]}>{data.card_of_the_day.core_meaning}</Text>
              </CosmicCard>

              <CosmicCard title={t('tarot.sections')}>
                <Text style={[styles.subhead, { color: palette.textMuted }]}>{t('tarot.overview')}</Text>
                <Text style={[styles.body, bodyStyle, { color: palette.text }]}>{data.reading.overview}</Text>
                <Text style={[styles.subhead, { color: palette.textMuted }]}>{t('tarot.love')}</Text>
                <Text style={[styles.body, bodyStyle, { color: palette.text }]}>{data.reading.love}</Text>
                <Text style={[styles.subhead, { color: palette.textMuted }]}>{t('tarot.career')}</Text>
                <Text style={[styles.body, bodyStyle, { color: palette.text }]}>{data.reading.career}</Text>
                <Text style={[styles.subhead, { color: palette.textMuted }]}>{t('tarot.energyNarrative')}</Text>
                <Text style={[styles.body, bodyStyle, { color: palette.text }]}>{data.reading.energy}</Text>
              </CosmicCard>
            </>
          ) : null}
        </>
      )}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '700', color: colors.text },
  sub: { color: colors.textMuted, marginBottom: spacing.sm },
  pickLabel: { color: colors.gold, marginTop: spacing.sm, marginBottom: spacing.xs, fontSize: 14 },
  hint: { fontSize: 13, marginBottom: spacing.xs },
  row: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  chip: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 18, color: colors.text },
  button: {
    marginTop: spacing.md,
    minHeight: MIN_TOUCH,
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: colors.danger, marginTop: spacing.sm, fontSize: 15 },
  body: { color: colors.text },
  subhead: { color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.xs, fontWeight: '700' },
  cardName: { fontSize: 22, lineHeight: 28, fontWeight: '700', marginBottom: spacing.xs },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  meta: { fontSize: 13 },
  pressed: { opacity: 0.88 },
});
