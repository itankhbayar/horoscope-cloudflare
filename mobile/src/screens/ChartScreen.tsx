import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
import { planetSymbol } from '@astralis/lib/zodiac';
import type { DailyHoroscope, NatalChart, PlanetPosition, ZodiacSign } from '@astralis/lib/types';
import { useAppearance } from '../hooks/useAppearance';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { currentSkySummary, strongestTransitCopy, whyThisReadingCopy } from '../components/home/homeContentUtils';

type ChartTab = 'chart' | 'houses' | 'planets';

const CHART_TABS: Array<{ key: ChartTab; label: string }> = [
  { key: 'chart', label: 'Chart' },
  { key: 'houses', label: 'Houses' },
  { key: 'planets', label: 'Planets' },
];

const HOUSE_DESCRIPTIONS: Record<number, { title: string; description: string }> = {
  1: { title: 'Ego & self-image', description: 'How you show up and your first impression.' },
  2: { title: 'Money & possessions', description: 'Values, resources, and material comfort.' },
  3: { title: 'Communication', description: 'Thinking, learning, and close community.' },
  4: { title: 'Home & roots', description: 'Family, emotional foundations, and sanctuary.' },
  5: { title: 'Creativity & romance', description: 'Pleasure, play, passion, and expression.' },
  6: { title: 'Health & routines', description: 'Daily work, habits, and body maintenance.' },
  7: { title: 'Partnerships', description: 'One-to-one bonds, marriage, and contracts.' },
  8: { title: 'Transformation', description: 'Shared assets, intimacy, and deep change.' },
  9: { title: 'Belief & travel', description: 'Meaning, higher learning, and expansion.' },
  10: { title: 'Career & reputation', description: 'Public role, recognition, and purpose.' },
  11: { title: 'Community & goals', description: 'Networks, future vision, and allies.' },
  12: { title: 'Inner world', description: 'Rest, healing, spirituality, and surrender.' },
};

const PLANET_KEYWORDS: Record<string, string> = {
  Sun: 'identity',
  Moon: 'emotion',
  Mercury: 'communication',
  Venus: 'values',
  Mars: 'action',
  Jupiter: 'expansion',
  Saturn: 'structure',
  Uranus: 'innovation',
  Neptune: 'intuition',
  Pluto: 'transformation',
};

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

export function ChartScreen(): React.JSX.Element {
  const { width } = useWindowDimensions();
  const { palette, mode } = useAppearance();
  const isLight = mode === 'light';
  const insets = useSafeAreaInsets();
  const { profile, load, recompute, loading, error } = useProfile();
  const { horoscope, loadMine } = useHoroscope();
  const [activeTab, setActiveTab] = useState<ChartTab>('chart');

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!profile?.natalChart) return;
    void loadMine();
  }, [loadMine, profile?.natalChart]);

  const onRecompute = useCallback((): void => {
    void recompute();
  }, [recompute]);

  const chart = profile?.natalChart;
  const birthProfile = profile?.birthProfile;
  const titleSize = useMemo(() => screenTitleSize(width), [width]);
  const listFont = useMemo(() => bodyFontSize(width), [width]);
  const listLineHeight = useMemo(() => bodyLineHeight(width), [width]);
  const subtitle = useMemo(() => {
    if (!birthProfile) return 'Add birth details to calculate the sky above your birthplace.';
    const cityLine = [birthProfile.birthCity, birthProfile.birthCountry].filter(Boolean).join(', ');
    const timeLine = birthProfile.birthTime ? `${birthProfile.birthDate} at ${birthProfile.birthTime}` : birthProfile.birthDate;
    return `${timeLine}${cityLine ? ` · ${cityLine}` : ''}`;
  }, [birthProfile]);
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

      {loading ? <LoadingBlock message="Calculating planetary positions..." /> : null}
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
                Real-Sky Birth Chart
              </Text>
              <Text style={[styles.subtitle, { fontSize: listFont, lineHeight: listLineHeight, color: palette.textMuted }]}>
                {subtitle}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Share chart"
            >
              <Text style={[styles.shareIcon, { color: palette.text }]}>↗</Text>
            </Pressable>
          </View>

          {chart ? <ChartSummaryCard chart={chart} glassCardStyle={glassCardStyle} palette={palette} /> : null}

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
              <BigThreeCard label="Sun" sign={chart.sunSign} glassCardStyle={glassCardStyle} palette={palette} />
              <BigThreeCard label="Moon" sign={chart.moonSign} glassCardStyle={glassCardStyle} palette={palette} />
              <BigThreeCard label="Rising" sign={chart.risingSign ?? null} glassCardStyle={glassCardStyle} palette={palette} />
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.cta, { backgroundColor: palette.accent }, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Explore your chart"
          >
            <Text style={styles.ctaText}>Explore Your Sky Map</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            onPress={onRecompute}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Recompute sky chart"
            accessibilityState={{ disabled: loading }}
            hitSlop={hitSlopComfortable}
          >
            <Text style={[styles.secondaryText, { color: palette.accent }]}>Recompute sky chart</Text>
          </Pressable>
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
  const skyItems = currentSkySummary(horoscope);
  return (
    <View style={[styles.todaySkyPanel, glassCardStyle]}>
      <Text style={[styles.todaySkyKicker, { color: palette.accent }]}>Today against your chart</Text>
      <View style={styles.todaySkyPanelGrid}>
        {skyItems.map((item) => (
          <View key={item.label} style={styles.todaySkyPanelItem}>
            <Text style={[styles.todaySkyPanelLabel, { color: palette.textMuted }]}>{item.label}</Text>
            <Text style={[styles.todaySkyPanelValue, { color: palette.text }]}>{item.value}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.todaySkyPanelBody, { color: palette.text }]}>
        {strongestTransitCopy(horoscope)}
      </Text>
      <Text style={[styles.todaySkyPanelNote, { color: palette.textMuted }]}>
        {whyThisReadingCopy(horoscope)}
      </Text>
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
  return (
    <View style={styles.segmentWrap}>
      {CHART_TABS.map((tab) => {
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
            accessibilityLabel={`${tab.label} tab`}
          >
            <Text style={[styles.segmentText, { color: active ? '#DDFBF3' : palette.textMuted }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ChartSummaryCard({
  chart,
  glassCardStyle,
  palette,
}: {
  chart: NatalChart;
  glassCardStyle: { backgroundColor: string; borderColor: string; borderWidth: number };
  palette: { text: string; textMuted: string };
}): React.JSX.Element {
  return (
    <View style={[styles.summaryCard, glassCardStyle]}>
      <SummaryRow label="Sun" value={toTitle(chart.sunSign)} palette={palette} />
      <SummaryRow label="Moon" value={toTitle(chart.moonSign)} palette={palette} />
      <SummaryRow label="Rising" value={chart.risingSign ? toTitle(chart.risingSign) : 'Unknown'} palette={palette} />
    </View>
  );
}

function SummaryRow({
  label,
  value,
  palette,
}: {
  label: string;
  value: string;
  palette: { text: string; textMuted: string };
}): React.JSX.Element {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: palette.textMuted }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: palette.text }]}>{value}</Text>
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
  return (
    <View style={[styles.bigThreeCard, glassCardStyle]}>
      <Text style={[styles.bigThreeLabel, { color: palette.textMuted }]}>{label}</Text>
      <Text style={[styles.bigThreeValue, { color: palette.text }]}>{sign ? toTitle(sign) : 'Unknown'}</Text>
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
  const info = HOUSE_DESCRIPTIONS[houseNumber] ?? { title: 'House focus', description: 'Core area of life expression.' };
  return (
    <View style={[styles.houseCard, glassCardStyle]}>
      <View style={styles.houseBadge}>
        <Text style={styles.houseBadgeText}>{ordinal(houseNumber)}</Text>
      </View>
      <View style={styles.houseBody}>
        <Text style={[styles.houseTitle, { color: palette.text }]}>{info.title}</Text>
        <Text style={[styles.houseMeta, { color: palette.textMuted }]}>Ruled by {toTitle(sign)}</Text>
        <Text style={[styles.houseDesc, { color: palette.text }]}>{info.description}</Text>
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
  return (
    <View style={[styles.planetCard, glassCardStyle]}>
      <View style={styles.planetIconWrap}>
        <Text style={styles.planetIcon}>{planetSymbol(planet.name)}</Text>
      </View>
      <View style={styles.planetBody}>
        <View style={styles.planetTitleRow}>
          <Text style={[styles.planetName, { color: palette.text }]}>{planet.name}</Text>
          <Text style={[styles.planetKeyword, { color: palette.textMuted }]}>{PLANET_KEYWORDS[planet.name] ?? 'influence'}</Text>
        </View>
        <Text style={[styles.planetLine, { color: palette.text }]}>
          {toTitle(planet.sign)} {planet.degreeInSign.toFixed(1)}° {planet.retrograde ? '℞' : ''}
        </Text>
        <View style={styles.chipsRow}>
          <Chip label={toTitle(planet.sign)} />
          <Chip label={`House ${planet.house ?? '—'}`} />
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
  const hubRadius = 26;
  const planetRadius = 104;
  const signRadius = 132;
  const dividerEndRadius = 124;
  const dividerStartRadius = hubRadius + 10;

  const houseDividers = chart.houses.map((house, index) => {
    const angle = (house.longitude / 360) * Math.PI * 2 - Math.PI / 2;
    const startX = center + Math.cos(angle) * dividerStartRadius;
    const startY = center + Math.sin(angle) * dividerStartRadius;
    const endX = center + Math.cos(angle) * dividerEndRadius;
    const endY = center + Math.sin(angle) * dividerEndRadius;
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const rotation = Math.atan2(dy, dx);
    return {
      key: `${house.number}-${index}`,
      left: (startX + endX) / 2 - length / 2,
      top: (startY + endY) / 2,
      length,
      rotation,
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

        {chart.houses.map((house, index) => {
          const next = chart.houses[(index + 1) % chart.houses.length];
          const startAngle = (house.longitude / 360) * Math.PI * 2;
          const endAngle = (next?.longitude ?? house.longitude) / 360 * Math.PI * 2;
          const normalizedEnd = endAngle <= startAngle ? endAngle + Math.PI * 2 : endAngle;
          const midAngle = (startAngle + normalizedEnd) / 2 - Math.PI / 2;
          const x = center + Math.cos(midAngle) * signRadius;
          const y = center + Math.sin(midAngle) * signRadius;
          return (
            <Text key={`sign-${house.number}`} style={[styles.zodiacGlyph, isLight && styles.zodiacGlyphLight, { left: x - 9, top: y - 10 }]}>
              {SIGN_SYMBOLS[house.sign]}
            </Text>
          );
        })}

        {chart.planets.slice(0, 10).map((planet, index) => {
          const angle = (planet.longitude / 360) * Math.PI * 2 - Math.PI / 2;
          const x = center + Math.cos(angle) * planetRadius;
          const y = center + Math.sin(angle) * planetRadius;
          return (
            <Text key={`${planet.name}-${index}`} style={[styles.planetGlyph, isLight && styles.planetGlyphLight, { left: x - 9, top: y - 11 }]}>
              {planetSymbol(planet.name)}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

function toTitle(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
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
  summaryCard: { borderRadius: 18, padding: spacing.md, gap: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: '#B7BDE8', fontWeight: '600', fontSize: 14 },
  summaryValue: { color: '#F1F3FF', fontWeight: '700', fontSize: 16 },
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
  bigThreeCard: { flex: 1, borderRadius: 14, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  bigThreeLabel: { color: '#AEB6E9', fontSize: 12, marginBottom: 4, fontWeight: '700' },
  bigThreeValue: { color: '#F4F6FF', fontSize: 15, fontWeight: '700' },
  cta: {
    marginTop: spacing.xs,
    minHeight: MIN_TOUCH,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9E8BFF',
    shadowOpacity: 0.34,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
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
  secondary: {
    marginTop: spacing.xs,
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(176, 185, 236, 0.32)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.accent, fontWeight: '600', fontSize: 16 },
  pressed: { opacity: 0.85 },
});
