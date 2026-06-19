import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { fetchTarotDaily, fetchTarotDraw, isTarotNotFound } from '@astralis/lib/tarotService';
import { ZODIAC_SIGNS } from '@astralis/lib/zodiac';
import type { TarotApiResponse, TarotPublicCard, ZodiacSign } from '@astralis/lib/types';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { LoadingBlock } from '../components/LoadingBlock';
import { ScreenScroll } from '../components/ScreenScroll';
import {
  bodyFontSize,
  bodyLineHeight,
  hitSlopComfortable,
  MIN_TOUCH,
  screenTitleSize,
  spacing,
} from '../theme';
import { useAppearance } from '../hooks/useAppearance';
import { useSanctuaryTheme } from '../components/home/sanctuaryTheme';
import { useI18n } from '../i18n';
import { goToPremium } from '../navigation/navigationRef';

/** Web host that serves the tarot card art (relative `/tarot/...` paths from the API). */
function webBaseUrl(): string {
  const g = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };
  return g.process?.env?.EXPO_PUBLIC_WEB_BASE_URL?.trim() || 'https://horoscope-frontend.pages.dev';
}

/** Resolve a card image: absolute URLs pass through; root-relative `/tarot/...` gets the web host. */
function resolveCardImageUri(image: string): string {
  if (!image) return '';
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith('/')) return webBaseUrl().replace(/\/$/, '') + image;
  return image;
}

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

const SECTION_KEYS = ['overview', 'love', 'career', 'energy'] as const;
type SectionKey = (typeof SECTION_KEYS)[number];

const READING_ICONS: Record<SectionKey, string> = {
  overview: '✦',
  love: '♡',
  career: '✧',
  energy: '⚡',
};

export function TarotScreen(): React.JSX.Element {
  const { width } = useWindowDimensions();
  const { mode } = useAppearance();
  const theme = useSanctuaryTheme();
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
  // Reading is split into pickable sections (like the daily horoscope) instead of one long stack.
  const [activeSection, setActiveSection] = useState<SectionKey>('overview');
  // Two modes: the once-a-day card, and a free "ask the cards" draw that reshuffles each press.
  const [tarotMode, setTarotMode] = useState<'daily' | 'draw'>('daily');
  const [drawnCard, setDrawnCard] = useState<TarotPublicCard | null>(null);
  const [drawLoading, setDrawLoading] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isPremium) void loadProfile();
  }, [isPremium, loadProfile]);

  // Default the picker to the user's own sun sign once the profile resolves.
  useEffect(() => {
    if (sunSign) setSelectedSign(sunSign);
  }, [sunSign]);

  useEffect(() => {
    const shown = tarotMode === 'daily' ? data : drawnCard;
    if (!shown) return;
    reveal.setValue(0);
    Animated.timing(reveal, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, [data, drawnCard, tarotMode, reveal]);

  const titleSize = useMemo(() => screenTitleSize(width), [width]);
  const bodySize = useMemo(() => bodyFontSize(width), [width]);
  const lineHeight = useMemo(() => bodyLineHeight(width), [width]);
  const bodyStyle = useMemo(() => ({ fontSize: bodySize, lineHeight }), [bodySize, lineHeight]);
  const selectedInfo = useMemo(() => ZODIAC_SIGNS.find((z) => z.key === selectedSign), [selectedSign]);

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

  const drawFree = useCallback(async (): Promise<void> => {
    setDrawLoading(true);
    setDrawError(null);
    try {
      const card = await fetchTarotDraw({ lang: locale });
      setDrawnCard(card);
    } catch (e) {
      setDrawError(e instanceof Error ? e.message : t('tarot.errorTitle'));
    } finally {
      setDrawLoading(false);
    }
  }, [locale, t]);

  const arcanaLabel = useCallback(
    (v: 'Major' | 'Minor'): string => (v === 'Major' ? t('tarot.major') : t('tarot.minor')),
    [t],
  );
  const orientationLabel = useCallback(
    (v: 'Upright' | 'Reversed'): string => (v === 'Upright' ? t('tarot.upright') : t('tarot.reversed')),
    [t],
  );
  const sectionLabel = useMemo<Record<SectionKey, string>>(
    () => ({
      overview: t('tarot.overview'),
      love: t('tarot.love'),
      career: t('tarot.career'),
      energy: t('tarot.energyNarrative'),
    }),
    [t],
  );

  const cardAnim = {
    opacity: reveal,
    transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };

  return (
    <ScreenScroll contentContainerStyle={styles.content}>
      <Text style={[styles.title, { fontSize: titleSize, color: theme.text }]} accessibilityRole="header">
        {t('tarot.title')}
      </Text>
      <Text style={[styles.sub, { fontSize: bodySize, color: theme.textMuted }]}>{t('tarot.subtitle')}</Text>

      {!isPremium ? (
        <View style={[styles.lockCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={[styles.lockBadge, { backgroundColor: theme.surfaceTint, borderColor: theme.cardBorder }]}>
            <Text style={[styles.lockGlyph, { color: theme.paleYellow }]}>♰</Text>
          </View>
          <Text style={[styles.lockTitle, { color: theme.text }]}>{t('tarot.lockedTitle')}</Text>
          <Text style={[styles.lockBody, bodyStyle, { color: theme.textMuted }]}>
            {isAuthenticated ? t('tarot.lockedBody') : t('tarot.lockedBodyGuest')}
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: theme.lavender, shadowColor: theme.glowLavender },
              pressed && styles.pressed,
            ]}
            onPress={() => goToPremium('locked_preview')}
            accessibilityRole="button"
            accessibilityLabel={t('tarot.lockedCta')}
            hitSlop={hitSlopComfortable}
          >
            <Text style={[styles.primaryBtnText, { color: mode === 'light' ? '#fff' : '#171633' }]}>
              {t('tarot.lockedCta')}
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.modeRow} accessibilityRole="tablist">
            {(['daily', 'draw'] as const).map((m) => {
              const active = tarotMode === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => setTarotMode(m)}
                  style={({ pressed }) => [
                    styles.modeTab,
                    { borderColor: theme.cardBorder, backgroundColor: theme.surfaceTint },
                    active && { borderColor: theme.lavender, backgroundColor: theme.glowLavender },
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  hitSlop={hitSlopComfortable}
                >
                  <Text style={[styles.modeTabText, { color: active ? theme.text : theme.textMuted }]}>
                    {m === 'daily' ? t('tarot.modeDaily') : t('tarot.modeDraw')}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {tarotMode === 'daily' ? (
          <>
          <View style={[styles.pickerCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.pickerHead}>
              <Text style={[styles.pickLabel, { color: theme.textMuted }]} accessibilityRole="header">
                {t('tarot.signLabel')}
              </Text>
              {selectedInfo ? (
                <Text style={[styles.pickerValue, { color: theme.text }]}>
                  {selectedInfo.symbol} {t(`zodiac.${selectedSign}`)}
                </Text>
              ) : null}
            </View>
            <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={t('tarot.signLabel')}>
              {ZODIAC_SIGNS.map((z) => {
                const active = selectedSign === z.key;
                return (
                  <Pressable
                    key={z.key}
                    onPress={() => onSelectSign(z.key)}
                    style={({ pressed }) => [
                      styles.chip,
                      { borderColor: theme.cardBorder, backgroundColor: theme.surfaceTint },
                      active && { borderColor: theme.lavender, backgroundColor: theme.glowLavender },
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${z.key} ${z.symbol}`}
                    hitSlop={hitSlopComfortable}
                  >
                    <Text style={[styles.chipText, { color: active ? theme.text : theme.textMuted }]}>{z.symbol}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {!data && !loading ? (
            <View style={styles.deckWrap}>
              <DeckFan theme={theme} />
              <Text style={[styles.chooseHint, { color: theme.textMuted }]}>{t('tarot.chooseHint')}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: theme.lavender, shadowColor: theme.glowLavender },
              loading && styles.btnDisabled,
              pressed && styles.pressed,
            ]}
            onPress={() => void draw()}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={data ? t('tarot.drawAnother') : t('tarot.reveal')}
            accessibilityState={{ disabled: loading }}
            hitSlop={hitSlopComfortable}
          >
            <Text style={[styles.primaryBtnText, { color: mode === 'light' ? '#fff' : '#171633' }]}>
              {loading ? t('tarot.drawLoading') : data ? t('tarot.drawAnother') : t('tarot.reveal')}
            </Text>
          </Pressable>

          {loading ? <LoadingBlock message={t('tarot.loading')} /> : null}

          {error ? (
            <Text style={[styles.error, { color: theme.pink }]} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          {empty ? (
            <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={[styles.infoTitle, { color: theme.text }]}>{t('tarot.emptyTitle')}</Text>
              <Text style={[styles.infoBody, bodyStyle, { color: theme.textMuted }]}>{t('tarot.emptyHint')}</Text>
            </View>
          ) : null}

          {data ? (
            <Animated.View style={cardAnim}>
              <TarotCardHero
                card={data.card_of_the_day}
                energyScore={data.energyScore}
                energyLabel={t('tarot.energy')}
                theme={theme}
                arcanaLabel={arcanaLabel}
                orientationLabel={orientationLabel}
              />

              <CardDetails card={data.card_of_the_day} theme={theme} bodyStyle={bodyStyle} />

              <View style={[styles.readingCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Text style={[styles.readingTitle, { color: theme.paleYellow }]}>{t('tarot.sections')}</Text>
                <View style={styles.tabRow} accessibilityRole="tablist">
                  {SECTION_KEYS.map((key) => {
                    const active = activeSection === key;
                    return (
                      <Pressable
                        key={key}
                        onPress={() => setActiveSection(key)}
                        style={({ pressed }) => [
                          styles.tab,
                          { borderColor: theme.cardBorder },
                          active && { borderColor: theme.lavender, backgroundColor: theme.glowLavender },
                          pressed && styles.pressed,
                        ]}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={sectionLabel[key]}
                        hitSlop={hitSlopComfortable}
                      >
                        <Text style={[styles.tabIcon, { color: theme.lavender }]}>{READING_ICONS[key]}</Text>
                        <Text style={[styles.tabLabel, { color: active ? theme.text : theme.textMuted }]} numberOfLines={1}>
                          {sectionLabel[key]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={[styles.sectionBody, bodyStyle, { color: theme.text }]} accessibilityRole="text">
                  {data.reading[activeSection]}
                </Text>
              </View>
            </Animated.View>
          ) : null}
          </>
          ) : (
          <>
            <View style={[styles.drawBlock, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: theme.lavender, shadowColor: theme.glowLavender },
                  drawLoading && styles.btnDisabled,
                  pressed && styles.pressed,
                ]}
                onPress={() => void drawFree()}
                disabled={drawLoading}
                accessibilityRole="button"
                accessibilityLabel={drawnCard ? t('tarot.drawAgain') : t('tarot.drawCta')}
                accessibilityState={{ disabled: drawLoading }}
                hitSlop={hitSlopComfortable}
              >
                <Text style={[styles.primaryBtnText, { color: mode === 'light' ? '#fff' : '#171633' }]}>
                  {drawLoading ? t('tarot.drawLoading') : drawnCard ? t('tarot.drawAgain') : t('tarot.drawCta')}
                </Text>
              </Pressable>
            </View>

            {drawLoading ? <LoadingBlock message={t('tarot.loading')} /> : null}

            {drawError ? (
              <Text style={[styles.error, { color: theme.pink }]} accessibilityRole="alert">
                {drawError}
              </Text>
            ) : null}

            {drawnCard ? (
              <Animated.View style={cardAnim}>
                <TarotCardHero
                  card={drawnCard}
                  theme={theme}
                  arcanaLabel={arcanaLabel}
                  orientationLabel={orientationLabel}
                />
                <CardDetails card={drawnCard} theme={theme} bodyStyle={bodyStyle} />
              </Animated.View>
            ) : null}
          </>
          )}
        </>
      )}
    </ScreenScroll>
  );
}

type Theme = ReturnType<typeof useSanctuaryTheme>;

/** Fanned card-back deck shown before a card is revealed. */
function DeckFan({ theme }: { theme: Theme }): React.JSX.Element {
  return (
    <View style={styles.deckFan} accessible accessibilityRole="image" accessibilityLabel="Tarot deck">
      {[-1, 0, 1].map((slot) => (
        <View
          key={slot}
          style={[
            styles.deckCard,
            {
              backgroundColor: theme.hole,
              borderColor: theme.cardBorder,
              transform: [{ rotate: `${slot * 10}deg` }, { translateY: slot === 0 ? -6 : 0 }],
              zIndex: slot === 0 ? 2 : 1,
            },
          ]}
        >
          <View style={[styles.deckInner, { borderColor: theme.glowLavender }]}>
            <Text style={[styles.deckGlyph, { color: theme.lavender }]}>✦</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/** The drawn "card of the day" rendered as a portrait tarot card. */
function TarotCardHero({
  card,
  energyScore,
  energyLabel,
  theme,
  arcanaLabel,
  orientationLabel,
}: {
  card: TarotPublicCard;
  /** Daily card shows an energy meter; the free draw omits it. */
  energyScore?: number;
  energyLabel?: string;
  theme: Theme;
  arcanaLabel: (v: 'Major' | 'Minor') => string;
  orientationLabel: (v: 'Upright' | 'Reversed') => string;
}): React.JSX.Element {
  const { t } = useI18n();
  const reversed = card.orientation === 'Reversed';
  const showEnergy = energyScore != null;
  const energy = Math.max(0, Math.min(100, Math.round(energyScore ?? 0)));
  const imageUri = resolveCardImageUri(card.image);
  return (
    <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={[styles.cardFace, { backgroundColor: theme.artWellBg, borderColor: theme.paleYellow }]}>
        <View style={[styles.cardGlow, { backgroundColor: theme.glowLavender }]} pointerEvents="none" />
        <View style={[styles.cardCorner, styles.cardCornerTL, { borderColor: theme.paleYellow }]} />
        <View style={[styles.cardCorner, styles.cardCornerBR, { borderColor: theme.paleYellow }]} />
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={[styles.cardImage, { transform: [{ rotate: reversed ? '180deg' : '0deg' }] }]}
            resizeMode="cover"
            accessibilityLabel={card.name}
          />
        ) : (
          <Text
            style={[styles.cardGlyph, { color: theme.paleYellow, transform: [{ rotate: reversed ? '180deg' : '0deg' }] }]}
            accessibilityElementsHidden
          >
            ✶
          </Text>
        )}
        <Text style={[styles.cardArcana, { color: theme.textSoft }]}>{arcanaLabel(card.arcana)}</Text>
      </View>

      <Text style={[styles.cardName, { color: theme.text }]} accessibilityRole="header">{card.name}</Text>

      <View style={styles.pillRow}>
        <View style={[styles.pill, { backgroundColor: theme.surfaceTint, borderColor: theme.cardBorder }]}>
          <Text style={[styles.pillText, { color: theme.textMuted }]}>{arcanaLabel(card.arcana)}</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: theme.surfaceTint, borderColor: theme.cardBorder }]}>
          <Text style={[styles.pillText, { color: reversed ? theme.pink : theme.mint }]}>
            {reversed ? '↓' : '↑'} {orientationLabel(card.orientation)}
          </Text>
        </View>
      </View>

      {showEnergy ? (
        <>
          <View style={styles.energyRow}>
            <Text style={[styles.energyLabel, { color: theme.textMuted }]}>{energyLabel}</Text>
            <Text style={[styles.energyValue, { color: theme.paleYellow }]}>{energy}</Text>
          </View>
          <View style={[styles.energyTrack, { backgroundColor: theme.ringTrack }]}>
            <View style={[styles.energyFill, { width: `${energy}%`, backgroundColor: theme.lavender }]} />
          </View>
        </>
      ) : null}

      <Text style={[styles.coreLabel, { color: theme.paleYellow }]}>{t('tarot.coreMeaning')}</Text>
      <Text style={[styles.cardMeaning, { color: theme.text }]}>{card.core_meaning}</Text>
    </View>
  );
}

/** Keyword chips, the card description, and the orientation meaning — shared by both modes. */
function CardDetails({
  card,
  theme,
  bodyStyle,
}: {
  card: TarotPublicCard;
  theme: Theme;
  bodyStyle: { fontSize: number; lineHeight: number };
}): React.JSX.Element | null {
  const { t } = useI18n();
  if (!card.keywords.length && !card.description && !card.meaning) return null;
  return (
    <View style={[styles.detailsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      {card.keywords.length ? (
        <View style={styles.kwRow} accessibilityLabel={t('tarot.keywords')}>
          {card.keywords.map((kw) => (
            <View key={kw} style={[styles.kwChip, { backgroundColor: theme.glowLavender, borderColor: theme.cardBorder }]}>
              <Text style={[styles.kwChipText, { color: theme.paleYellow }]}>{kw}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {card.description ? (
        <>
          <Text style={[styles.detailLabel, { color: theme.paleYellow }]}>{t('tarot.description')}</Text>
          <Text style={[styles.detailDesc, bodyStyle, { color: theme.textMuted }]}>{card.description}</Text>
        </>
      ) : null}
      {card.meaning ? (
        <>
          <Text style={[styles.detailLabel, { color: theme.paleYellow }]}>{t('tarot.meaning')}</Text>
          <Text style={[styles.detailMeaning, bodyStyle, { color: theme.text }]}>{card.meaning}</Text>
        </>
      ) : null}
    </View>
  );
}


const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  title: { fontWeight: '800', letterSpacing: 0.2 },
  sub: { marginBottom: spacing.md },

  // Daily / Ask-the-cards toggle
  modeRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginBottom: spacing.md },
  modeTab: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTabText: { fontSize: 14, fontWeight: '700' },

  // Free-draw prompt
  drawBlock: { borderRadius: 20, borderWidth: 1, padding: spacing.lg, marginBottom: spacing.md, alignItems: 'center', gap: spacing.md },

  // Sign picker
  pickerCard: { borderRadius: 20, borderWidth: 1, padding: spacing.md, marginBottom: spacing.md },
  pickerHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  pickLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  pickerValue: { fontSize: 16, fontWeight: '800' },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  chip: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 18 },

  // Deck
  deckWrap: { alignItems: 'center', gap: spacing.sm, marginVertical: spacing.md },
  deckFan: { height: 132, width: 180, alignItems: 'center', justifyContent: 'center' },
  deckCard: {
    position: 'absolute',
    width: 84,
    height: 124,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckInner: {
    width: 52,
    height: 92,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckGlyph: { fontSize: 24 },
  chooseHint: { fontSize: 14, fontWeight: '600', textAlign: 'center', maxWidth: 280 },

  // Primary button
  primaryBtn: {
    marginTop: spacing.sm,
    minHeight: MIN_TOUCH,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryBtnText: { fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },
  btnDisabled: { opacity: 0.55 },

  // Hero card
  heroCard: { borderRadius: 22, borderWidth: 1, padding: spacing.lg, marginTop: spacing.md, alignItems: 'center' },
  cardFace: {
    width: 168,
    height: 256,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  cardGlow: { position: 'absolute', width: 200, height: 200, borderRadius: 999, top: -56, opacity: 0.7 },
  cardCorner: { position: 'absolute', width: 22, height: 22 },
  cardCornerTL: { top: 8, left: 8, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderTopLeftRadius: 6 },
  cardCornerBR: { bottom: 8, right: 8, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderBottomRightRadius: 6 },
  cardGlyph: { fontSize: 76, lineHeight: 84 },
  cardImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  cardArcana: {
    position: 'absolute',
    bottom: 12,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  cardName: { fontSize: 24, lineHeight: 30, fontWeight: '800', textAlign: 'center', marginBottom: spacing.sm },
  pillRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  pill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  pillText: { fontSize: 12, fontWeight: '700' },
  energyRow: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', marginBottom: 6 },
  energyLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  energyValue: { fontSize: 14, fontWeight: '800' },
  energyTrack: { alignSelf: 'stretch', height: 8, borderRadius: 999, overflow: 'hidden', marginBottom: spacing.md },
  energyFill: { height: '100%', borderRadius: 999 },
  coreLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', marginBottom: 4 },
  cardMeaning: { fontSize: 15, lineHeight: 22, fontWeight: '600', textAlign: 'center' },

  // Card details (keywords / description / orientation meaning)
  detailsCard: { borderRadius: 20, borderWidth: 1, padding: spacing.lg, marginTop: spacing.md },
  kwRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  kwChip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  kwChipText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  detailDesc: { marginTop: spacing.sm },
  detailLabel: {
    marginTop: spacing.md,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  detailMeaning: { fontWeight: '500' },

  // Reading
  readingCard: { borderRadius: 20, borderWidth: 1, padding: spacing.lg, marginTop: spacing.md },
  readingTitle: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2, marginBottom: spacing.sm },
  tabRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  tab: {
    flex: 1,
    minHeight: MIN_TOUCH,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
    paddingHorizontal: 2,
  },
  tabIcon: { fontSize: 16 },
  tabLabel: { fontSize: 11, fontWeight: '700' },
  sectionBody: { fontWeight: '500', minHeight: 96 },

  // Lock + info cards
  lockCard: { borderRadius: 22, borderWidth: 1, padding: spacing.lg, alignItems: 'center', gap: spacing.sm },
  lockBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  lockGlyph: { fontSize: 26 },
  lockTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  lockBody: { textAlign: 'center', marginBottom: spacing.sm },
  infoCard: { borderRadius: 20, borderWidth: 1, padding: spacing.lg, marginTop: spacing.md },
  infoTitle: { fontSize: 17, fontWeight: '800', marginBottom: spacing.xs },
  infoBody: { fontWeight: '500' },

  error: { marginTop: spacing.sm, fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.88 },
});
