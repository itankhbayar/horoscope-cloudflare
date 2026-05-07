import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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

export function CompatibilityScreen(): React.JSX.Element {
  const { width } = useWindowDimensions();
  const { palette, mode } = useAppearance();
  const { result, loading, error, compareSigns } = useCompatibility();
  const [sign1, setSign1] = useState<ZodiacSign | null>(null);
  const [sign2, setSign2] = useState<ZodiacSign | null>(null);

  const onCompute = useCallback(async (): Promise<void> => {
    if (!sign1 || !sign2) return;
    await compareSigns(sign1, sign2);
  }, [compareSigns, sign1, sign2]);

  const titleSize = useMemo(() => screenTitleSize(width), [width]);
  const bodySize = useMemo(() => bodyFontSize(width), [width]);
  const lineHeight = useMemo(() => bodyLineHeight(width), [width]);
  const bodyStyle = useMemo(
    () => ({ fontSize: bodySize, lineHeight }),
    [bodySize, lineHeight],
  );

  return (
    <ScreenScroll>
      <Text style={[styles.title, { fontSize: titleSize, color: palette.text }]} accessibilityRole="header">
        Compatibility
      </Text>
      <Text style={[styles.sub, { fontSize: bodySize, color: palette.textMuted }]}>Pick two signs</Text>
      <Text style={[styles.pickLabel, { color: mode === 'light' ? '#4a5aa0' : colors.gold }]} accessibilityRole="header">
        First sign
      </Text>
      <SignRow selected={sign1} onSelect={setSign1} rowHint="First zodiac sign" />
      <Text style={[styles.pickLabel, { color: mode === 'light' ? '#4a5aa0' : colors.gold }]} accessibilityRole="header">
        Second sign
      </Text>
      <SignRow selected={sign2} onSelect={setSign2} rowHint="Second zodiac sign" />
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
        accessibilityLabel="Compute compatibility"
        accessibilityState={{ disabled: !sign1 || !sign2 || loading }}
        hitSlop={hitSlopComfortable}
      >
        <Text style={styles.buttonText}>{loading ? 'Aligning…' : 'Compute'}</Text>
      </Pressable>
      {loading ? <LoadingBlock message="Computing…" /> : null}
      {error ? (
        <Text style={[styles.error, { color: '#d14f4f' }]} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      {result ? (
        <CosmicCard title="Result">
          <Text style={[styles.score, { fontSize: bodySize + 3, color: mode === 'light' ? '#4a5aa0' : colors.gold }]}>
            Overall {result.overallScore}
          </Text>
          <Text style={[styles.body, bodyStyle, { color: palette.text }]}>{result.summary}</Text>
          <Text style={[styles.subhead, { fontSize: bodySize, color: palette.textMuted }]}>Highlights</Text>
          {(result.highlights ?? []).map((h) => (
            <Text key={h} style={[styles.bullet, bodyStyle, { color: palette.text }]}>
              • {h}
            </Text>
          ))}
        </CosmicCard>
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
  subhead: { color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.xs },
  bullet: { color: colors.text, marginTop: spacing.xs },
  pressed: { opacity: 0.88 },
});
