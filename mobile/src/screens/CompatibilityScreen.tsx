import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { compatibilityAnalyticsContext } from '@astralis/lib/compatibilityAnalytics';
import { buildCompatibilityShareCard } from '@astralis/lib/compatibilityShareCard';
import { createCompatibilityShareRef } from '@astralis/lib/compatibilityShareRef';
import { ZODIAC_SIGNS } from '@astralis/lib/zodiac';
import type { ZodiacSign } from '@astralis/lib/types';
import { useCompatibility } from '../hooks/useCompatibility';
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
import { track } from '../lib/analytics';
import type { MainTabParamList } from '../navigation/types';
import { useZodiacMode } from '../hooks/useZodiacMode';
import { EasternCompatibility } from './compatibility/EasternCompatibility';

type CompatibilityRoute = RouteProp<MainTabParamList, 'Compatibility'>;

function appShareUrl(): string {
  const g = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };
  return g.process?.env?.EXPO_PUBLIC_WEB_BASE_URL?.trim() || 'https://astralis.app';
}

function signSymbol(sign: ZodiacSign): string {
  return ZODIAC_SIGNS.find((z) => z.key === sign)?.symbol ?? '*';
}

/**
 * Compatibility adapts to the app-wide zodiac mode preference (toggled in
 * Profile, like language): Eastern mode compares animal signs, Western mode
 * compares sun signs. Gated on `ready` so an Eastern user never flashes the
 * Western comparison.
 */
export function CompatibilityScreen(): React.JSX.Element {
  const { mode, ready } = useZodiacMode();
  const { t } = useI18n();
  const { palette } = useAppearance();
  if (!ready) {
    return (
      <ScreenScroll style={{ backgroundColor: palette.background }}>
        <LoadingBlock message={t('chinese.loading')} />
      </ScreenScroll>
    );
  }
  return mode === 'eastern' ? <EasternCompatibility /> : <WesternCompatibility />;
}

function WesternCompatibility(): React.JSX.Element {
  const route = useRoute<CompatibilityRoute>();
  const { width } = useWindowDimensions();
  const { palette, mode } = useAppearance();
  const { t, locale } = useI18n();
  const { result, loading, error, compareSigns } = useCompatibility();
  const [sign1, setSign1] = useState<ZodiacSign | null>(null);
  const [sign2, setSign2] = useState<ZodiacSign | null>(null);
  const [shareStatus, setShareStatus] = useState('');
  const shareSectionRef = useRef<View>(null);
  const shareViewedRef = useRef(false);
  const scrollViewportHeightRef = useRef(0);

  useEffect(() => {
    const params = route.params;
    if (!params?.sign1 || !params.sign2) return;
    setSign1(params.sign1);
    setSign2(params.sign2);
    void compareSigns(params.sign1, params.sign2);
  }, [compareSigns, route.params?.sign1, route.params?.sign2]);

  const onCompute = useCallback(async (): Promise<void> => {
    if (!sign1 || !sign2) return;
    setShareStatus('');
    shareViewedRef.current = false;
    await compareSigns(sign1, sign2);
  }, [compareSigns, sign1, sign2]);

  const titleSize = useMemo(() => screenTitleSize(width), [width]);
  const bodySize = useMemo(() => bodyFontSize(width), [width]);
  const lineHeight = useMemo(() => bodyLineHeight(width), [width]);
  const bodyStyle = useMemo(() => ({ fontSize: bodySize, lineHeight }), [bodySize, lineHeight]);
  const shareCard = useMemo(() => {
    if (!result) return null;
    return buildCompatibilityShareCard(result, {
      locale,
      sign1Name: t(`zodiac.${result.sign1}`),
      sign2Name: t(`zodiac.${result.sign2}`),
      appUrl: appShareUrl(),
    });
  }, [locale, result, t]);

  const trackShareCardViewed = useCallback((): void => {
    if (!result || shareViewedRef.current) return;
    shareViewedRef.current = true;
    void track('compatibility_share_card_viewed', {
      surface: 'compatibility',
      ...compatibilityAnalyticsContext({
        locale,
        sign1: result.sign1,
        sign2: result.sign2,
        sharedScore: result.overallScore,
      }),
      sign1: result.sign1,
      sign2: result.sign2,
      score: result.overallScore,
    });
  }, [locale, result]);

  const checkShareSectionVisible = useCallback((): void => {
    if (!result || shareViewedRef.current) return;
    shareSectionRef.current?.measureInWindow((_x, y, _w, height) => {
      const viewport = scrollViewportHeightRef.current;
      if (viewport <= 0) return;
      if (y + height > 0 && y < viewport) {
        trackShareCardViewed();
      }
    });
  }, [result, trackShareCardViewed]);

  useEffect(() => {
    if (!result) {
      shareViewedRef.current = false;
      return;
    }
    shareViewedRef.current = false;
    checkShareSectionVisible();
  }, [checkShareSectionVisible, result]);

  const onShare = useCallback(async (): Promise<void> => {
    if (!result) return;
    const shareRef = createCompatibilityShareRef();
    const card = buildCompatibilityShareCard(result, {
      locale,
      sign1Name: t(`zodiac.${result.sign1}`),
      sign2Name: t(`zodiac.${result.sign2}`),
      appUrl: appShareUrl(),
      shareRef,
    });
    const props = {
      surface: 'compatibility' as const,
      ...compatibilityAnalyticsContext({
        locale,
        sign1: result.sign1,
        sign2: result.sign2,
        sharedScore: result.overallScore,
        shareRef,
      }),
      sign1: result.sign1,
      sign2: result.sign2,
      score: result.overallScore,
      share_ref: shareRef,
    };
    await track('compatibility_share_cta_clicked', props);
    await track('compatibility_share_link_created', props);
    try {
      const outcome = await Share.share({
        title: card.pairLabel,
        message: card.shareText,
        url: card.shareUrl,
      });
      if (outcome.action === Share.dismissedAction) {
        await track('compatibility_share_cancelled', props);
        setShareStatus('');
        return;
      }
      await track('compatibility_share_completed', { ...props, method: 'native' });
      setShareStatus(t('compatibility.shareDone'));
    } catch (e) {
      await track('compatibility_share_failed', {
        ...props,
        reason: e instanceof Error ? e.message : 'unknown',
      });
      setShareStatus(t('compatibility.shareFailed'));
    }
  }, [locale, result, t]);

  return (
    <ScreenScroll
      onLayout={(event) => {
        scrollViewportHeightRef.current = event.nativeEvent.layout.height;
        checkShareSectionVisible();
      }}
      onScroll={checkShareSectionVisible}
      scrollEventThrottle={16}
    >
      <Text style={[styles.title, { fontSize: titleSize, color: palette.text }]} accessibilityRole="header">
        {t('compatibility.title')}
      </Text>
      <Text style={[styles.sub, { fontSize: bodySize, color: palette.textMuted }]}>{t('compatibility.subtitle')}</Text>

      <Text style={[styles.pickLabel, { color: mode === 'light' ? '#4a5aa0' : colors.gold }]} accessibilityRole="header">
        {t('compatibility.firstSign')}
      </Text>
      <SignRow selected={sign1} onSelect={setSign1} rowHint={t('compatibility.firstSign')} />

      <Text style={[styles.pickLabel, { color: mode === 'light' ? '#4a5aa0' : colors.gold }]} accessibilityRole="header">
        {t('compatibility.secondSign')}
      </Text>
      <SignRow selected={sign2} onSelect={setSign2} rowHint={t('compatibility.secondSign')} />

      <Pressable
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: palette.accent },
          (!sign1 || !sign2 || loading) && styles.buttonDisabled,
          pressed && styles.pressed,
        ]}
        onPress={() => void onCompute()}
        disabled={!sign1 || !sign2 || loading}
        accessibilityRole="button"
        accessibilityLabel={t('compatibility.compute')}
        accessibilityState={{ disabled: !sign1 || !sign2 || loading }}
        hitSlop={hitSlopComfortable}
      >
        <Text style={styles.buttonText}>{loading ? t('compatibility.aligning') : t('compatibility.compute')}</Text>
      </Pressable>

      {loading ? <LoadingBlock message={t('compatibility.loading')} /> : null}
      {error ? (
        <Text style={[styles.error, { color: '#d14f4f' }]} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {result ? (
        <CosmicCard title={t('compatibility.result')}>
          <Text style={[styles.score, { fontSize: bodySize + 3, color: mode === 'light' ? '#4a5aa0' : colors.gold }]}>
            {t('compatibility.overall', { score: result.overallScore })}
          </Text>
          <Text style={[styles.body, bodyStyle, { color: palette.text }]}>{result.summary}</Text>
          <Text style={[styles.subhead, { fontSize: bodySize, color: palette.textMuted }]}>{t('compatibility.highlights')}</Text>
          {(result.highlights ?? []).map((h) => (
            <Text key={h} style={[styles.bullet, bodyStyle, { color: palette.text }]}>
              * {h}
            </Text>
          ))}
        </CosmicCard>
      ) : null}

      {shareCard && result ? (
        <View
          ref={shareSectionRef}
          style={styles.shareSection}
          onLayout={checkShareSectionVisible}
        >
          <View style={styles.storyCard} accessibilityLabel="Compatibility share card preview">
            <Text style={styles.storyBrand}>Astralis</Text>
            <View style={styles.storyPair}>
              <Text style={styles.storySymbols}>{`${signSymbol(result.sign1)}  ${signSymbol(result.sign2)}`}</Text>
              <Text style={styles.storyPairText}>{shareCard.pairLabel}</Text>
            </View>
            <Text style={[styles.storyScore, { color: mode === 'light' ? '#f4d57a' : '#f4d57a' }]}>{shareCard.scoreLabel}</Text>
            <View>
              <Text style={styles.storyTheme}>{shareCard.themeTitle}</Text>
              <Text style={styles.storySummary}>{shareCard.themeSummary}</Text>
            </View>
            <Text style={styles.storyMetrics}>{shareCard.metricLine}</Text>
          </View>

          <CosmicCard title={t('compatibility.shareEyebrow')}>
            <Text style={[styles.subhead, { color: palette.text }]}>{t('compatibility.shareTitle')}</Text>
            <Text style={[styles.body, bodyStyle, { color: palette.textMuted }]}>{t('compatibility.shareBody')}</Text>
            <Pressable
              style={({ pressed }) => [styles.button, { backgroundColor: palette.accent }, pressed && styles.pressed]}
              onPress={() => void onShare()}
              accessibilityRole="button"
              accessibilityLabel={t('compatibility.shareButton')}
              hitSlop={hitSlopComfortable}
            >
              <Text style={styles.buttonText}>{t('compatibility.shareButton')}</Text>
            </Pressable>
            {shareStatus ? (
              <Text style={[styles.shareStatus, { color: mode === 'light' ? '#4a5aa0' : colors.gold }]}>
                {shareStatus}
              </Text>
            ) : null}
          </CosmicCard>
        </View>
      ) : null}
    </ScreenScroll>
  );
}

const SignRow = React.memo(function SignRow({
  selected,
  onSelect,
  rowHint,
}: {
  selected: ZodiacSign | null;
  onSelect: (s: ZodiacSign) => void;
  rowHint: string;
}): React.JSX.Element {
  const { palette } = useAppearance();
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={rowHint}>
      {ZODIAC_SIGNS.map((z) => {
        const active = selected === z.key;
        return (
          <Pressable
            key={z.key}
            onPress={() => onSelect(z.key)}
            style={({ pressed }) => [
              styles.chip,
              { borderColor: palette.border, backgroundColor: palette.surface },
              active && styles.chipActive,
              pressed && styles.pressed,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${z.key} ${z.symbol}`}
            hitSlop={hitSlopComfortable}
          >
            <Text style={[styles.chipText, { color: palette.text }, active && styles.chipTextActive]}>{z.symbol}</Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  title: { fontWeight: '700', color: colors.text },
  sub: { color: colors.textMuted, marginBottom: spacing.sm },
  pickLabel: { color: colors.gold, marginTop: spacing.sm, marginBottom: spacing.xs, fontSize: 14 },
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
  chipActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  chipText: { fontSize: 18, color: colors.text },
  chipTextActive: { color: colors.text },
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
  score: { fontWeight: '700', color: colors.gold, marginBottom: spacing.sm },
  body: { color: colors.text },
  subhead: { color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.xs, fontWeight: '700' },
  bullet: { color: colors.text, marginTop: spacing.xs },
  shareSection: { marginTop: spacing.md, gap: spacing.md },
  storyCard: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 8,
    padding: spacing.lg,
    overflow: 'hidden',
    justifyContent: 'space-between',
    backgroundColor: '#151635',
    borderWidth: 1,
    borderColor: 'rgba(244, 213, 122, 0.36)',
  },
  storyBrand: {
    color: '#f4d57a',
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 12,
    fontWeight: '700',
  },
  storyPair: { alignItems: 'center', gap: spacing.xs },
  storySymbols: { color: '#f4d57a', fontSize: 44 },
  storyPairText: { color: '#fff', fontSize: 26, lineHeight: 30, fontWeight: '700', textAlign: 'center' },
  storyScore: { fontSize: 48, lineHeight: 54, fontWeight: '800', textAlign: 'center' },
  storyTheme: { color: '#fff', fontSize: 24, lineHeight: 28, fontWeight: '800', marginBottom: spacing.xs },
  storySummary: { color: 'rgba(255,255,255,0.82)', fontSize: 16, lineHeight: 22 },
  storyMetrics: {
    color: '#f4d57a',
    fontSize: 14,
    lineHeight: 20,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  shareStatus: { marginTop: spacing.sm, fontWeight: '700' },
  pressed: { opacity: 0.88 },
});
