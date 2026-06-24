import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useProfile } from '../hooks/useProfile';
import { useHoroscope } from '../hooks/useHoroscope';
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
import { aspectSymbol, planetSymbol } from '@astralis/lib/zodiac';
import { fetchChartReading } from '@astralis/lib/chartService';
import type { Aspect, AspectType, ChartReadingContent, DailyHoroscope, NatalChart, PlanetPosition, ZodiacSign } from '@astralis/lib/types';
import { useAppearance } from '../hooks/useAppearance';
import { useAuth } from '../hooks/useAuth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { currentSkySummary, strongestTransitCopy, whyThisReadingCopy } from '../components/home/homeContentUtils';
import { useI18n } from '../i18n';
import type { TranslationKey } from '../i18n';
import { goToPremium } from '../navigation/navigationRef';
import { useZodiacMode } from '../hooks/useZodiacMode';
import { EasternChart } from './chart/EasternChart';

type ChartTab = 'chart' | 'houses' | 'planets';

const SIGN_ORDER: ZodiacSign[] = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

const SIGN_SYMBOLS: Record<ZodiacSign, string> = {
  aries: '♈',
  taurus: '♉',
  gemini: '♊',
  cancer: '♋',
  leo: '♌',
  virgo: '♍',
  libra: '♎',
  scorpio: '♏',
  sagittarius: '♐',
  capricorn: '♑',
  aquarius: '♒',
  pisces: '♓',
};

/** Mirrors the web `AspectList` palette so the two platforms read the same. */
function aspectColor(type: AspectType): string {
  switch (type) {
    case 'conjunction': return '#e8d48b';
    case 'trine': return '#7bbf6a';
    case 'sextile': return '#9ec6ff';
    case 'square': return '#ff8a5c';
    case 'opposition': return '#ff6b6b';
    default: return '#c9a84c';
  }
}

/**
 * Chart adapts to the app-wide zodiac mode preference (toggled in Profile, like
 * language): Eastern mode shows the lunar birth chart, Western mode shows the
 * natal chart. Gated on `ready` so an Eastern user never flashes the natal chart.
 */
export function ChartScreen(): React.JSX.Element {
  const { mode, ready } = useZodiacMode();
  const { t } = useI18n();
  const { palette } = useAppearance();
  if (!ready) {
    return (
      <ScreenScroll style={{ backgroundColor: palette.background }}>
        {/* Mode-neutral copy: which mode wins isn't known until useZodiacMode hydrates. */}
        <LoadingBlock message={t('home.gathering')} />
      </ScreenScroll>
    );
  }
  return mode === 'eastern' ? <EasternChart /> : <WesternChart />;
}

function WesternChart(): React.JSX.Element {
  const { width } = useWindowDimensions();
  const { t, locale } = useI18n();
  const { palette, mode } = useAppearance();
  const isLight = mode === 'light';
  const insets = useSafeAreaInsets();
  const { profile, load, loading, error } = useProfile();
  const { horoscope, loadMine } = useHoroscope();
  const { user } = useAuth();
  const isPremium = Boolean(user?.isPremium);
  const [activeTab, setActiveTab] = useState<ChartTab>('chart');
  // Aspects are dense; let users collapse the list if they'd rather not see all of it.
  const [showAspects, setShowAspects] = useState(true);

  // Premium, Claude-generated reading of this specific chart. Generated once per chart and
  // cached server-side, so the first reveal may take ~20–40s and later opens return instantly.
  const [reading, setReading] = useState<ChartReadingContent | null>(null);
  const [readingLoading, setReadingLoading] = useState(false);
  const [readingError, setReadingError] = useState<string | null>(null);

  const revealReading = useCallback(async (): Promise<void> => {
    setReadingLoading(true);
    setReadingError(null);
    try {
      const res = await fetchChartReading(locale);
      setReading(res.reading);
    } catch (e) {
      setReadingError(e instanceof Error ? e.message : t('chart.reading.error'));
    } finally {
      setReadingLoading(false);
    }
  }, [locale, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!profile?.natalChart) return;
    void loadMine();
  }, [loadMine, profile?.natalChart]);

  const chart = profile?.natalChart;
  const birthProfile = profile?.birthProfile;
  const titleSize = useMemo(() => screenTitleSize(width), [width]);
  const listFont = useMemo(() => bodyFontSize(width), [width]);
  const listLineHeight = useMemo(() => bodyLineHeight(width), [width]);
  const subtitle = useMemo(() => {
    if (!birthProfile) return t('chart.addBirth');
    const cityLine = [birthProfile.birthCity, birthProfile.birthCountry].filter(Boolean).join(', ');
    const timeLine = birthProfile.birthTime
      ? t('chart.atTime', { date: birthProfile.birthDate, time: birthProfile.birthTime })
      : birthProfile.birthDate;
    return `${timeLine}${cityLine ? ` · ${cityLine}` : ''}`;
  }, [birthProfile, t]);

  const onShare = useCallback(async (): Promise<void> => {
    if (!chart) return;
    const lines = [
      t('chart.title'),
      `${t('chart.sun')}: ${t(`zodiac.${chart.sunSign}`)}`,
      `${t('chart.moon')}: ${t(`zodiac.${chart.moonSign}`)}`,
      `${t('chart.rising')}: ${chart.risingSign ? t(`zodiac.${chart.risingSign}`) : t('chart.unknown')}`,
    ];
    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      // Sharing is best-effort; a dismissed/failed sheet must not surface an error.
    }
  }, [chart, t]);

  const glassCardStyle = useMemo(
    () => ({
      backgroundColor: isLight ? '#ffffff' : 'rgba(28, 30, 58, 0.68)',
      borderColor: isLight ? 'rgba(97, 109, 196, 0.2)' : 'rgba(186, 174, 255, 0.24)',
      borderWidth: 1,
    }),
    [isLight],
  );

  return (
    <ScreenScroll style={[styles.screen, { backgroundColor: palette.background }]} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}>
      {!isLight ? <View style={styles.bgGlowTop} pointerEvents="none" /> : null}
      {!isLight ? <View style={styles.bgGlowBottom} pointerEvents="none" /> : null}

      <SegmentedTabControl activeTab={activeTab} onChange={setActiveTab} palette={palette} />

      {loading ? <LoadingBlock message={t('chart.loading')} /> : null}
      {error ? (
        <Text style={[styles.error, { color: '#d14f4f' }]} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {activeTab === 'chart' ? (
        <View style={styles.tabContent}>
          <View style={[styles.headerCard, glassCardStyle]}>
            <View style={styles.headerTextWrap}>
              <Text style={[styles.title, { fontSize: titleSize, color: palette.text }]} accessibilityRole="header">
                {t('chart.title')}
              </Text>
              <Text style={[styles.subtitle, { fontSize: listFont, lineHeight: listLineHeight, color: palette.textMuted }]}>
                {subtitle}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}
              onPress={() => void onShare()}
              disabled={!chart}
              accessibilityRole="button"
              accessibilityLabel={t('chart.share')}
            >
              <Text style={[styles.shareIcon, { color: palette.text }]}>↗</Text>
            </Pressable>
          </View>

          {chart && horoscope?.skyContext ? (
            <TodaySkyChartPanel horoscope={horoscope} glassCardStyle={glassCardStyle} palette={palette} />
          ) : null}

          {chart ? (
            <View style={[styles.wheelPanel, glassCardStyle]}>
              {!isLight ? <View style={styles.wheelGlow} /> : null}
              <ChartWheel chart={chart} isLight={isLight} />
            </View>
          ) : null}

          {chart ? (
            <View style={styles.bigThreeRow}>
              <BigThreeCard label={t('chart.sun')} sign={chart.sunSign} glassCardStyle={glassCardStyle} palette={palette} />
              <BigThreeCard label={t('chart.moon')} sign={chart.moonSign} glassCardStyle={glassCardStyle} palette={palette} />
              <BigThreeCard label={t('chart.rising')} sign={chart.risingSign ?? null} glassCardStyle={glassCardStyle} palette={palette} />
            </View>
          ) : null}

          {chart ? (
            <View style={[styles.aspectsCard, glassCardStyle]}>
              <View style={styles.aspectHead}>
                <Text style={[styles.sectionTitle, { color: palette.text }]} accessibilityRole="header">
                  {t('chart.aspects')}
                </Text>
                <Pressable
                  onPress={() => setShowAspects((v) => !v)}
                  style={({ pressed }) => [
                    styles.aspectToggle,
                    { borderColor: palette.border },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showAspects }}
                  hitSlop={hitSlopComfortable}
                >
                  <Text style={[styles.aspectToggleText, { color: palette.textMuted }]}>
                    {showAspects ? t('chart.aspectsHide') : t('chart.aspectsShow')}
                  </Text>
                </Pressable>
              </View>
              {showAspects
                ? chart.aspects.length === 0
                  ? (
                    <Text style={[styles.aspectEmpty, { color: palette.textMuted }]}>{t('chart.aspectsEmpty')}</Text>
                  )
                  : chart.aspects.map((aspect, index) => (
                    <AspectRow key={`${aspect.body1}-${aspect.body2}-${index}`} aspect={aspect} palette={palette} />
                  ))
                : null}
            </View>
          ) : null}

          {/* Premium: a personalized Claude reading of this specific chart (one per chart). */}
          {chart ? (
            isPremium ? (
              <ChartReadingPanel
                reading={reading}
                loading={readingLoading}
                error={readingError}
                onReveal={() => void revealReading()}
                glassCardStyle={glassCardStyle}
                palette={palette}
                bodyStyle={{ fontSize: listFont, lineHeight: listLineHeight }}
              />
            ) : (
              <View style={[styles.lockCard, glassCardStyle]}>
                <View style={styles.readingHead}>
                  <Text style={styles.readingBadge}>{t('premium.badge')}</Text>
                </View>
                <Text style={styles.readingIcon}>✶</Text>
                <Text style={[styles.lockTitle, { color: palette.text }]}>{t('chart.reading.lockedTitle')}</Text>
                <Text style={[styles.lockBody, { color: palette.textMuted, fontSize: listFont, lineHeight: listLineHeight }]}>
                  {t('chart.reading.lockedDesc')}
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.unlockBtn, pressed && styles.pressed]}
                  onPress={() => goToPremium('locked_preview')}
                  accessibilityRole="button"
                  accessibilityLabel={t('chart.reading.lockedCta')}
                  hitSlop={hitSlopComfortable}
                >
                  <Text style={styles.unlockBtnText}>{t('chart.reading.lockedCta')}</Text>
                </Pressable>
              </View>
            )
          ) : null}
        </View>
      ) : null}

      {activeTab === 'houses' ? (
        <View style={styles.tabContent} accessibilityRole="list">
          {chart?.houses.map((house) => (
            <HouseCard key={house.number} houseNumber={house.number} sign={house.sign} glassCardStyle={glassCardStyle} palette={palette} />
          ))}
        </View>
      ) : null}

      {activeTab === 'planets' ? (
        <View style={styles.tabContent} accessibilityRole="list">
          {chart?.planets.map((planet) => (
            <PlanetPlacementCard key={planet.name} planet={planet} glassCardStyle={glassCardStyle} palette={palette} />
          ))}
        </View>
      ) : null}
    </ScreenScroll>
  );
}

function TodaySkyChartPanel({
  horoscope,
  glassCardStyle,
  palette,
}: {
  horoscope: DailyHoroscope;
  glassCardStyle: { backgroundColor: string; borderColor: string; borderWidth: number };
  palette: { text: string; textMuted: string; accent: string };
}): React.JSX.Element {
  const { t, locale } = useI18n();
  const skyItems = currentSkySummary(horoscope, t);
  return (
    <View style={[styles.todaySkyPanel, glassCardStyle]}>
      <Text style={[styles.todaySkyKicker, { color: palette.accent }]}>{t('chart.todayAgainst')}</Text>
      <View style={styles.todaySkyPanelGrid}>
        {skyItems.map((item) => (
          <View key={item.label} style={styles.todaySkyPanelItem}>
            <Text style={[styles.todaySkyPanelLabel, { color: palette.textMuted }]}>{item.label}</Text>
            <Text style={[styles.todaySkyPanelValue, { color: palette.text }]}>{item.value}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.todaySkyPanelBody, { color: palette.text }]}>
        {strongestTransitCopy(horoscope, t, locale)}
      </Text>
      <Text style={[styles.todaySkyPanelNote, { color: palette.textMuted }]}>
        {whyThisReadingCopy(horoscope, t, locale)}
      </Text>
    </View>
  );
}

const READING_FIELDS = ['strengths', 'challenges', 'relationships', 'career', 'growth'] as const;

/** Celestial glyphs giving each reading theme a distinct marker — mirrors the web cards. */
const READING_ICONS: Record<'summary' | (typeof READING_FIELDS)[number], string> = {
  summary: '☉',
  strengths: '✦',
  challenges: '☍',
  relationships: '☽',
  career: '★',
  growth: '✷',
};

/**
 * Premium chart reading: a "Reveal my reading" button that calls Claude once and renders the
 * cached summary + themed cards. Mirrors the web `ChartPage` reading section.
 */
function ChartReadingPanel({
  reading,
  loading,
  error,
  onReveal,
  glassCardStyle,
  palette,
  bodyStyle,
}: {
  reading: ChartReadingContent | null;
  loading: boolean;
  error: string | null;
  onReveal: () => void;
  glassCardStyle: { backgroundColor: string; borderColor: string; borderWidth: number };
  palette: { text: string; textMuted: string; accent: string; border: string };
  bodyStyle: { fontSize: number; lineHeight: number };
}): React.JSX.Element {
  const { t } = useI18n();
  return (
    <View style={[styles.readingCard, glassCardStyle]}>
      <View style={styles.readingHead}>
        <Text style={styles.readingBadge}>{t('premium.badge')}</Text>
        <Text style={[styles.sectionTitle, { color: palette.text, marginBottom: 0 }]} accessibilityRole="header">
          {t('chart.reading.title')}
        </Text>
      </View>

      {reading ? (
        <View style={styles.readingBody}>
          <View style={[styles.readingSummary, { borderColor: palette.border }]}>
            <Text style={styles.readingFieldIcon}>{READING_ICONS.summary}</Text>
            <View style={styles.readingSummaryText}>
              <Text style={[styles.readingLabel, { color: palette.text }]}>{t('chart.reading.summary')}</Text>
              <Text style={[styles.readingText, bodyStyle, { color: palette.text }]}>{reading.summary}</Text>
            </View>
          </View>
          {READING_FIELDS.map((key) => (
            <View key={key} style={[styles.readingField, { borderColor: palette.border }]}>
              <View style={styles.readingFieldHead}>
                <Text style={styles.readingFieldIcon}>{READING_ICONS[key]}</Text>
                <Text style={[styles.readingLabel, { color: palette.text }]}>
                  {t(`chart.reading.${key}` as TranslationKey)}
                </Text>
              </View>
              <Text style={[styles.readingText, bodyStyle, { color: palette.textMuted }]}>{reading[key]}</Text>
            </View>
          ))}
        </View>
      ) : loading ? (
        <LoadingBlock message={t('chart.reading.loading')} />
      ) : (
        <>
          <Text style={[styles.readingIntro, bodyStyle, { color: palette.textMuted }]}>
            {t('chart.reading.intro')}
          </Text>
          {error ? (
            <Text style={[styles.error, { color: '#d14f4f' }]} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <Pressable
            style={({ pressed }) => [styles.revealBtn, pressed && styles.pressed]}
            onPress={onReveal}
            accessibilityRole="button"
            accessibilityLabel={t('chart.reading.cta')}
            hitSlop={hitSlopComfortable}
          >
            <Text style={styles.revealBtnText}>{t('chart.reading.cta')}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

function SegmentedTabControl({
  activeTab,
  onChange,
  palette,
}: {
  activeTab: ChartTab;
  onChange: (tab: ChartTab) => void;
  palette: { text: string; textMuted: string; accent: string };
}): React.JSX.Element {
  const { t } = useI18n();
  const tabs = useMemo<Array<{ key: ChartTab; label: string }>>(
    () => [
      { key: 'chart', label: t('chart.tabs.chart') },
      { key: 'houses', label: t('chart.tabs.houses') },
      { key: 'planets', label: t('chart.tabs.planets') },
    ],
    [t],
  );

  return (
    <View style={styles.segmentWrap}>
      {tabs.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <Pressable
            key={tab.key}
            style={({ pressed }) => [
              styles.segmentBtn,
              active && [styles.segmentBtnActive, { borderColor: `${palette.accent}77` }],
              pressed && styles.pressed,
            ]}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t('chart.tabA11y', { tab: tab.label })}
          >
            <Text style={[styles.segmentText, { color: active ? '#DDFBF3' : palette.textMuted }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function BigThreeCard({
  label,
  sign,
  glassCardStyle,
  palette,
}: {
  label: string;
  sign: ZodiacSign | null;
  glassCardStyle: { backgroundColor: string; borderColor: string; borderWidth: number };
  palette: { text: string; textMuted: string };
}): React.JSX.Element {
  const { t } = useI18n();
  return (
    <View style={[styles.bigThreeCard, glassCardStyle]}>
      <Text style={[styles.bigThreeLabel, { color: palette.textMuted }]}>{label}</Text>
      <Text style={styles.bigThreeSymbol}>{sign ? SIGN_SYMBOLS[sign] : '—'}</Text>
      <Text style={[styles.bigThreeValue, { color: palette.text }]}>
        {sign ? t(`zodiac.${sign}`) : t('chart.unknown')}
      </Text>
    </View>
  );
}

function AspectRow({
  aspect,
  palette,
}: {
  aspect: Aspect;
  palette: { text: string; textMuted: string };
}): React.JSX.Element {
  const { t } = useI18n();
  return (
    <View style={styles.aspectRow}>
      <View style={styles.aspectGlyphs}>
        <Text style={[styles.aspectPlanet, { color: palette.text }]}>{planetSymbol(aspect.body1)}</Text>
        <Text style={[styles.aspectSymbol, { color: aspectColor(aspect.type) }]}>{aspectSymbol(aspect.type)}</Text>
        <Text style={[styles.aspectPlanet, { color: palette.text }]}>{planetSymbol(aspect.body2)}</Text>
      </View>
      <Text style={[styles.aspectText, { color: palette.text }]} numberOfLines={2}>
        {t(`planets.${aspect.body1}`)} {t(`aspects.types.${aspect.type}`)} {t(`planets.${aspect.body2}`)}
      </Text>
      <Text style={[styles.aspectOrb, { color: palette.textMuted }]}>
        {t('chart.orb')} {aspect.orb.toFixed(1)}°
      </Text>
    </View>
  );
}

function HouseCard({
  houseNumber,
  sign,
  glassCardStyle,
  palette,
}: {
  houseNumber: number;
  sign: ZodiacSign;
  glassCardStyle: { backgroundColor: string; borderColor: string; borderWidth: number };
  palette: { text: string; textMuted: string };
}): React.JSX.Element {
  const { t } = useI18n();
  const title = t(`chart.house.${houseNumber}.title` as TranslationKey);
  const description = t(`chart.house.${houseNumber}.desc` as TranslationKey);
  return (
    <View style={[styles.houseCard, glassCardStyle]}>
      <View style={styles.houseBadge}>
        <Text style={styles.houseBadgeText}>{ordinal(houseNumber)}</Text>
      </View>
      <View style={styles.houseBody}>
        <Text style={[styles.houseTitle, { color: palette.text }]}>{title}</Text>
        <Text style={[styles.houseMeta, { color: palette.textMuted }]}>{t('chart.ruledBy', { sign: t(`zodiac.${sign}`) })}</Text>
        <Text style={[styles.houseDesc, { color: palette.text }]}>{description}</Text>
      </View>
    </View>
  );
}

function PlanetPlacementCard({
  planet,
  glassCardStyle,
  palette,
}: {
  planet: PlanetPosition;
  glassCardStyle: { backgroundColor: string; borderColor: string; borderWidth: number };
  palette: { text: string; textMuted: string };
}): React.JSX.Element {
  const { t } = useI18n();
  const signName = t(`zodiac.${planet.sign}`);
  return (
    <View style={[styles.planetCard, glassCardStyle]}>
      <View style={styles.planetIconWrap}>
        <Text style={styles.planetIcon}>{planetSymbol(planet.name)}</Text>
      </View>
      <View style={styles.planetBody}>
        <View style={styles.planetTitleRow}>
          <Text style={[styles.planetName, { color: palette.text }]}>{t(`planets.${planet.name}`)}</Text>
          <Text style={[styles.planetKeyword, { color: palette.textMuted }]}>{t(`chart.keyword.${planet.name}`)}</Text>
        </View>
        <Text style={[styles.planetLine, { color: palette.text }]}>
          {signName} {planet.degreeInSign.toFixed(1)}° {planet.retrograde ? '℞' : ''}
        </Text>
        <View style={styles.chipsRow}>
          <Chip label={signName} />
          <Chip label={t('chart.houseLabel', { house: planet.house ?? '—' })} />
        </View>
      </View>
    </View>
  );
}

function Chip({ label }: { label: string }): React.JSX.Element {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function ChartWheel({
  chart,
  isLight,
}: {
  chart: NatalChart;
  isLight: boolean;
}): React.JSX.Element {
  const size = 286;
  const center = size / 2;
  const signRadius = 120;
  const planetRadius = 94;
  const dividerOuter = 112;
  const dividerInner = 34;
  const houseNumRadius = 54;

  // Anchor the Ascendant (1st-house cusp) to the left horizon and run the zodiac
  // counterclockwise — the same orientation the web `NatalChartWheel` uses. `polar`
  // works in screen space (y grows downward) so the `- sin` flips it counterclockwise.
  const ascendant = chart.houses[0]?.longitude ?? 0;
  const rotate = 180 - ascendant;
  const polar = (deg: number, r: number): { x: number; y: number } => {
    const rad = (deg * Math.PI) / 180;
    return { x: center + r * Math.cos(rad), y: center - r * Math.sin(rad) };
  };

  const houseDividers = chart.houses.map((house, index) => {
    const angle = house.longitude + rotate;
    const start = polar(angle, dividerInner);
    const end = polar(angle, dividerOuter);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const rotation = Math.atan2(dy, dx);
    const next = chart.houses[(index + 1) % chart.houses.length];
    const startDeg = house.longitude;
    const endDeg = next ? next.longitude : house.longitude + 30;
    const normalizedEnd = endDeg <= startDeg ? endDeg + 360 : endDeg;
    const midDeg = (startDeg + normalizedEnd) / 2 + rotate;
    const numPos = polar(midDeg, houseNumRadius);
    return {
      key: `${house.number}-${index}`,
      left: (start.x + end.x) / 2 - length / 2,
      top: (start.y + end.y) / 2,
      length,
      rotation,
      number: house.number,
      numLeft: numPos.x - 7,
      numTop: numPos.y - 8,
    };
  });

  return (
    <View style={styles.wheelWrap}>
      <View style={[styles.wheelOuter, isLight && styles.wheelOuterLight]}>
        <View style={[styles.zodiacBand, isLight && styles.zodiacBandLight]} />
        <View style={[styles.mainCircle, isLight && styles.mainCircleLight]} />
        <View style={[styles.houseRing, isLight && styles.houseRingLight]} />
        <View style={[styles.hubCircle, isLight && styles.hubCircleLight]} />

        {houseDividers.map((divider) => (
          <View
            key={divider.key}
            style={[
              styles.houseDivider,
              isLight && styles.houseDividerLight,
              {
                left: divider.left,
                top: divider.top,
                width: divider.length,
                transform: [{ rotate: `${divider.rotation}rad` }],
              },
            ]}
          />
        ))}

        {houseDividers.map((divider) => (
          <Text
            key={`num-${divider.key}`}
            style={[styles.houseNumber, isLight && styles.houseNumberLight, { left: divider.numLeft, top: divider.numTop }]}
          >
            {divider.number}
          </Text>
        ))}

        {SIGN_ORDER.map((sign, i) => {
          const pos = polar(i * 30 + 15 + rotate, signRadius);
          return (
            <Text key={`sign-${sign}`} style={[styles.zodiacGlyph, isLight && styles.zodiacGlyphLight, { left: pos.x - 9, top: pos.y - 10 }]}>
              {SIGN_SYMBOLS[sign]}
            </Text>
          );
        })}

        {chart.planets.slice(0, 10).map((planet, index) => {
          const pos = polar(planet.longitude + rotate, planetRadius);
          return (
            <Text key={`${planet.name}-${index}`} style={[styles.planetGlyph, isLight && styles.planetGlyphLight, { left: pos.x - 9, top: pos.y - 11 }]}>
              {planetSymbol(planet.name)}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

function ordinal(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  const mod10 = value % 10;
  if (mod10 === 1) return `${value}st`;
  if (mod10 === 2) return `${value}nd`;
  if (mod10 === 3) return `${value}rd`;
  return `${value}th`;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#12142C' },
  content: { gap: spacing.md, paddingBottom: spacing.xxxl + spacing.xl },
  bgGlowTop: {
    position: 'absolute',
    top: -120,
    left: -70,
    width: 280,
    height: 280,
    borderRadius: 180,
    backgroundColor: 'rgba(126, 97, 248, 0.3)',
  },
  bgGlowBottom: {
    position: 'absolute',
    right: -60,
    bottom: 40,
    width: 260,
    height: 260,
    borderRadius: 160,
    backgroundColor: 'rgba(95, 204, 180, 0.18)',
  },
  segmentWrap: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191, 196, 255, 0.16)',
    marginBottom: spacing.sm,
  },
  segmentBtn: {
    flex: 1,
    minHeight: MIN_TOUCH - 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(140, 110, 255, 0.52)',
    shadowColor: '#8A6EFF',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segmentText: { fontSize: 15, fontWeight: '700' },
  tabContent: { gap: spacing.sm },
  headerCard: {
    borderRadius: 22,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextWrap: { flex: 1, paddingRight: spacing.sm },
  title: { fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted },
  shareBtn: {
    height: 38,
    width: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(211, 213, 255, 0.22)',
  },
  shareIcon: { color: '#EAEAFE', fontSize: 19, fontWeight: '700' },
  todaySkyPanel: { borderRadius: 18, padding: spacing.md, gap: spacing.sm },
  todaySkyKicker: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  todaySkyPanelGrid: { flexDirection: 'row', gap: spacing.xs },
  todaySkyPanelItem: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(176, 185, 236, 0.24)',
    backgroundColor: 'rgba(255,255,255,0.055)',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  todaySkyPanelLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  todaySkyPanelValue: { marginTop: 3, fontSize: 14, lineHeight: 18, fontWeight: '800' },
  todaySkyPanelBody: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  todaySkyPanelNote: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  wheelPanel: { borderRadius: 26, paddingVertical: spacing.lg, paddingHorizontal: spacing.md, overflow: 'hidden' },
  wheelGlow: {
    position: 'absolute',
    alignSelf: 'center',
    top: 24,
    width: 220,
    height: 220,
    borderRadius: 130,
    backgroundColor: 'rgba(147, 113, 255, 0.2)',
  },
  wheelWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm },
  wheelOuter: {
    width: 286,
    height: 286,
    borderRadius: 143,
    borderWidth: 2,
    borderColor: 'rgba(216, 221, 255, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(9, 11, 28, 0.4)',
    overflow: 'hidden',
  },
  wheelOuterLight: {
    backgroundColor: '#eef1ff',
  },
  zodiacBand: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 1.2,
    borderColor: 'rgba(216, 221, 255, 0.5)',
  },
  zodiacBandLight: {
    borderColor: 'rgba(91, 102, 180, 0.35)',
  },
  mainCircle: {
    position: 'absolute',
    width: 236,
    height: 236,
    borderRadius: 118,
    borderWidth: 1,
    borderColor: 'rgba(216, 221, 255, 0.42)',
    backgroundColor: 'rgba(255,255,255,0.015)',
  },
  mainCircleLight: {
    borderColor: 'rgba(91, 102, 180, 0.28)',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  houseRing: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: 'rgba(216, 221, 255, 0.36)',
  },
  houseRingLight: {
    borderColor: 'rgba(91, 102, 180, 0.28)',
  },
  hubCircle: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(216, 221, 255, 0.44)',
    backgroundColor: 'rgba(20, 23, 48, 0.95)',
  },
  hubCircleLight: {
    borderColor: 'rgba(91, 102, 180, 0.32)',
    backgroundColor: '#f8faff',
  },
  houseDivider: {
    position: 'absolute',
    height: 1,
    backgroundColor: 'rgba(210, 217, 255, 0.35)',
    transformOrigin: 'center',
  },
  houseDividerLight: {
    backgroundColor: 'rgba(86, 94, 163, 0.3)',
  },
  houseNumber: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.42)',
    fontSize: 10,
    fontWeight: '700',
    width: 14,
    textAlign: 'center',
  },
  houseNumberLight: {
    color: 'rgba(70, 78, 140, 0.6)',
  },
  zodiacGlyph: {
    position: 'absolute',
    color: '#A8C9FF',
    fontSize: 19,
    fontWeight: '600',
  },
  zodiacGlyphLight: {
    color: '#5574b6',
  },
  planetGlyph: {
    position: 'absolute',
    color: '#F4F6FF',
    fontSize: 21,
    textShadowColor: 'rgba(176, 162, 255, 0.46)',
    textShadowRadius: 5,
  },
  planetGlyphLight: {
    color: '#313a69',
    textShadowColor: 'rgba(113, 126, 214, 0.25)',
  },
  bigThreeRow: { flexDirection: 'row', gap: spacing.sm },
  bigThreeCard: { flex: 1, borderRadius: 14, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, alignItems: 'center' },
  bigThreeLabel: { color: '#AEB6E9', fontSize: 12, marginBottom: 4, fontWeight: '700' },
  bigThreeSymbol: { color: '#E8D48B', fontSize: 26, lineHeight: 30, marginBottom: 2 },
  bigThreeValue: { color: '#F4F6FF', fontSize: 15, fontWeight: '700' },
  aspectsCard: { borderRadius: 18, padding: spacing.md, gap: spacing.xs },
  aspectHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  aspectToggle: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  aspectToggleText: { fontSize: 13, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.xs },
  aspectEmpty: { fontSize: 14, fontWeight: '600' },
  aspectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(176, 185, 236, 0.18)',
  },
  aspectGlyphs: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 58 },
  aspectPlanet: { fontSize: 16 },
  aspectSymbol: { fontSize: 15, fontWeight: '700' },
  aspectText: { flex: 1, fontSize: 13, fontWeight: '600' },
  aspectOrb: { fontSize: 12, fontWeight: '600' },
  error: { color: colors.danger, marginBottom: spacing.xs },
  houseCard: {
    borderRadius: 18,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  houseBadge: {
    height: 44,
    minWidth: 44,
    paddingHorizontal: spacing.xs,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(169, 155, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(212, 201, 255, 0.45)',
  },
  houseBadgeText: { color: '#F0F3FF', fontWeight: '700' },
  houseBody: { flex: 1, gap: 2 },
  houseTitle: { color: '#F3F5FF', fontWeight: '700', fontSize: 16 },
  houseMeta: { color: '#B9C0EC', fontWeight: '600', fontSize: 13 },
  houseDesc: { color: '#D7DCF7', fontSize: 14, lineHeight: 20, marginTop: 2 },
  planetCard: {
    borderRadius: 18,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  planetIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(160, 230, 210, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(165, 236, 216, 0.34)',
  },
  planetIcon: { color: '#E7FBF4', fontSize: 24 },
  planetBody: { flex: 1, gap: 4 },
  planetTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  planetName: { color: '#F2F4FF', fontSize: 17, fontWeight: '700' },
  planetKeyword: { color: '#A4AEDF', fontSize: 13, fontStyle: 'italic' },
  planetLine: { color: '#D7DCF7', fontSize: 14, fontWeight: '600' },
  chipsRow: { flexDirection: 'row', gap: spacing.xs, marginTop: 2 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(176, 185, 236, 0.4)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  chipText: { color: '#E8ECFF', fontSize: 12, fontWeight: '600' },

  // Premium chart reading
  readingCard: { borderRadius: 20, padding: spacing.md, gap: spacing.sm },
  readingHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.xs },
  readingBadge: {
    color: '#E8D48B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(232, 212, 139, 0.4)',
    backgroundColor: 'rgba(232, 212, 139, 0.12)',
    overflow: 'hidden',
  },
  readingBody: { gap: spacing.sm },
  readingSummary: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
    backgroundColor: 'rgba(232, 212, 139, 0.08)',
  },
  readingSummaryText: { flex: 1, gap: 4 },
  readingField: { borderRadius: 14, borderWidth: 1, padding: spacing.md, gap: 6 },
  readingFieldHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  readingFieldIcon: { color: '#E8D48B', fontSize: 18, lineHeight: 22 },
  readingLabel: { fontSize: 15, fontWeight: '800' },
  readingText: { fontWeight: '500' },
  readingIntro: { fontWeight: '500', marginBottom: spacing.xs },
  revealBtn: {
    marginTop: spacing.xs,
    minHeight: MIN_TOUCH,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: '#E8D48B',
  },
  revealBtnText: { color: '#1a1530', fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },

  // Locked (non-premium) reading card
  lockCard: { borderRadius: 20, padding: spacing.lg, alignItems: 'center', gap: spacing.sm },
  readingIcon: { color: '#E8D48B', fontSize: 34, lineHeight: 40 },
  lockTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  lockBody: { textAlign: 'center', fontWeight: '500', marginBottom: spacing.xs },
  unlockBtn: {
    minHeight: MIN_TOUCH,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: '#E8D48B',
  },
  unlockBtnText: { color: '#E8D48B', fontWeight: '800', fontSize: 15, letterSpacing: 0.5, textTransform: 'uppercase' },

  pressed: { opacity: 0.85 },
});
