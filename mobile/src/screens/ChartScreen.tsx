import React, { useCallback, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
import { planetSymbol, aspectSymbol } from '@astralis/lib/zodiac';
import type { Aspect, PlanetPosition } from '@astralis/lib/types';

export function ChartScreen(): React.JSX.Element {
  const { width } = useWindowDimensions();
  const { profile, load, recompute, loading, error } = useProfile();

  useEffect(() => {
    void load();
  }, [load]);

  const onRecompute = useCallback((): void => {
    void recompute();
  }, [recompute]);

  const chart = profile?.natalChart;
  const titleSize = useMemo(() => screenTitleSize(width), [width]);
  const listFont = useMemo(() => bodyFontSize(width), [width]);
  const listLineHeight = useMemo(() => bodyLineHeight(width), [width]);

  const listTextStyle = useMemo(
    () => [styles.listLine, { fontSize: listFont, lineHeight: listLineHeight }],
    [listFont, listLineHeight],
  );

  return (
    <ScreenScroll>
      <Text style={[styles.title, { fontSize: titleSize }]} accessibilityRole="header">
        Chart
      </Text>
      {loading ? <LoadingBlock message="Casting chart…" /> : null}
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      {chart ? (
        <CosmicCard title="Natal summary">
          <Text style={[styles.rowText, { fontSize: listFont, lineHeight: listLineHeight }]}>
            Sun {chart.sunSign} · Moon {chart.moonSign} · Rising {chart.risingSign ?? '—'}
          </Text>
        </CosmicCard>
      ) : null}
      {chart ? (
        <CosmicCard title="Planets">
          <View accessibilityRole="list">
            {chart.planets.map((p: PlanetPosition) => (
              <Text key={p.name} style={listTextStyle}>
                {planetSymbol(p.name)} {p.name} — {p.sign} {p.degreeInSign.toFixed(1)}°
                {p.retrograde ? ' ℞' : ''}
              </Text>
            ))}
          </View>
        </CosmicCard>
      ) : null}
      {chart ? (
        <CosmicCard title="Aspects">
          <View accessibilityRole="list">
            {chart.aspects.map((a: Aspect, i: number) => (
              <Text key={`${a.body1}-${a.body2}-${i}`} style={listTextStyle}>
                {aspectSymbol(a.type)} {a.body1} {a.type} {a.body2} (orb {a.orb.toFixed(2)}°)
              </Text>
            ))}
          </View>
        </CosmicCard>
      ) : null}
      <Pressable
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        onPress={onRecompute}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Recompute natal chart"
        accessibilityState={{ disabled: loading }}
        hitSlop={hitSlopComfortable}
      >
        <Text style={styles.secondaryText}>Recompute chart</Text>
      </Pressable>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '700', color: colors.text },
  error: { color: colors.danger, marginBottom: spacing.xs },
  rowText: { color: colors.text },
  listLine: { color: colors.text, marginVertical: spacing.xs },
  secondary: {
    marginTop: spacing.sm,
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.accent, fontWeight: '600', fontSize: 16 },
  pressed: { opacity: 0.85 },
});

