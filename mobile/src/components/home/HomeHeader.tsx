import React, { type ReactElement, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { ZodiacSign } from '@astralis/lib/types';
import { getZodiacInfo } from '@astralis/lib/zodiac';
import { useSanctuaryTheme, type SanctuaryPalette } from './sanctuaryTheme';
import { spacing } from '../../theme';

const SUN = '\u2609';
const MOON = '\u263D';
const RISING = '\u2191';

type Props = {
  displayName: string;
  sunSign: ZodiacSign | null;
  moonSign: ZodiacSign | null;
  risingSign: ZodiacSign | null;
};

function signLabel(sign: ZodiacSign | null): { sym: string; name: string } | null {
  if (!sign) return null;
  const z = getZodiacInfo(sign);
  return { sym: z.symbol, name: z.name };
}

export function HomeHeader({ displayName, sunSign, moonSign, risingSign }: Props): ReactElement {
  const t = useSanctuaryTheme();
  const pulse = useRef(new Animated.Value(0.22)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.38,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.18,
          duration: 2200,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const sun = signLabel(sunSign);
  const moon = signLabel(moonSign);
  const rise = signLabel(risingSign);

  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <Animated.View
        style={[styles.glow, { opacity: pulse, backgroundColor: t.glowLavender }]}
        pointerEvents="none"
      />
      <Text style={[styles.greeting, { color: t.text }]} accessibilityRole="header">
        Hi, {displayName}!
      </Text>
      <View style={styles.row}>
        <Placement icon={SUN} info={sun} label="Sun" theme={t} />
        <Placement icon={MOON} info={moon} label="Moon" theme={t} />
        <Placement icon={RISING} info={rise} label="Rising" theme={t} />
      </View>
    </View>
  );
}

function Placement({
  icon,
  info,
  label,
  theme: t,
}: {
  icon: string;
  info: { sym: string; name: string } | null;
  label: string;
  theme: SanctuaryPalette;
}): ReactElement {
  return (
    <View style={styles.placement} accessibilityLabel={`${label} sign ${info?.name ?? 'unknown'}`}>
      <Text style={[styles.planetIcon, { color: t.textMuted }]} allowFontScaling={false}>
        {icon}
      </Text>
      {info ? (
        <>
          <Text style={[styles.zsym, { color: t.lavender }]} allowFontScaling={false}>
            {info.sym}
          </Text>
          <Text style={[styles.zname, { color: t.text, textDecorationColor: t.textDecorationAccent }]}>
            {info.name}
          </Text>
        </>
      ) : (
        <Text style={[styles.placeholder, { color: t.textSoft }]}>—</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    marginHorizontal: -8,
    borderRadius: 28,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: spacing.xl,
    maxWidth: '100%',
  },
  placement: {
    alignItems: 'center',
    minWidth: 88,
    maxWidth: 120,
  },
  planetIcon: {
    fontSize: 14,
    marginBottom: 4,
  },
  zsym: {
    fontSize: 22,
    lineHeight: 26,
  },
  zname: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  placeholder: {
    marginTop: 4,
    fontSize: 16,
  },
});
