import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useHoroscope } from '../hooks/useHoroscope';
import { useProfile } from '../hooks/useProfile';
import { CosmicCard } from '../components/CosmicCard';
import { LoadingBlock } from '../components/LoadingBlock';
import { ScreenScroll } from '../components/ScreenScroll';
import {
  bodyFontSize,
  bodyLineHeight,
  screenTitleSize,
  spacing,
} from '../theme';
import { useAppearance } from '../hooks/useAppearance';

export function HomeScreen(): React.JSX.Element {
  const { width } = useWindowDimensions();
  const { palette, mode } = useAppearance();
  const { profile, load: loadProfile, loading: profileLoading, error: profileError } = useProfile();
  const { horoscope, load, loading: horoLoading, error: horoError } = useHoroscope();

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const sun = profile?.natalChart?.sunSign;
    if (!sun) return;
    void load(sun);
  }, [profile?.natalChart?.sunSign, load]);

  const loading = profileLoading || horoLoading;
  const error = profileError ?? horoError;

  const titleSize = useMemo(() => screenTitleSize(width), [width]);
  const bodySize = useMemo(() => bodyFontSize(width), [width]);
  const lineHeight = useMemo(() => bodyLineHeight(width), [width]);

  const dynamicText = useMemo(
    () =>
      StyleSheet.create({
        title: { fontSize: titleSize },
        sectionBody: { fontSize: bodySize, lineHeight },
        meta: { fontSize: bodySize },
        muted: { fontSize: bodySize },
      }),
    [titleSize, bodySize, lineHeight],
  );

  return (
    <ScreenScroll>
      <Text
        style={[styles.title, dynamicText.title, { color: palette.text }]}
        accessibilityRole="header"
        accessibilityLabel="Your stars today"
      >
        Your stars today
      </Text>
      {loading ? <LoadingBlock /> : null}
      {error ? (
        <Text style={[styles.error, { color: '#d14f4f' }]} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      {!loading && horoscope ? (
        <CosmicCard title={`${horoscope.sign.toUpperCase()} · ${horoscope.date}`}>
          <Section label="Overall" text={horoscope.overall} bodyStyle={dynamicText.sectionBody} />
          <Section label="Love" text={horoscope.love} bodyStyle={dynamicText.sectionBody} />
          <Section label="Career" text={horoscope.career} bodyStyle={dynamicText.sectionBody} />
          <Section label="Health" text={horoscope.health} bodyStyle={dynamicText.sectionBody} />
          <Text style={[styles.meta, dynamicText.meta, { color: palette.textMuted }]}>
            Lucky {horoscope.luckyNumber} · {horoscope.luckyColor}
          </Text>
        </CosmicCard>
      ) : null}
      {!loading && !horoscope && !error ? (
        <Text style={[styles.muted, dynamicText.muted, { color: palette.textMuted }]}>
          Complete your profile with a birth chart to see your daily reading.
        </Text>
      ) : null}
    </ScreenScroll>
  );
}

const Section = React.memo(function Section({
  label,
  text,
  bodyStyle,
}: {
  label: string;
  text: string;
  bodyStyle: { fontSize: number; lineHeight: number };
}): React.JSX.Element {
  const { palette, mode } = useAppearance();
  return (
    <View style={styles.section} accessibilityLabel={`${label}. ${text}`}>
      <Text style={[styles.sectionLabel, { color: mode === 'light' ? '#4a5aa0' : '#d4af37' }]} accessibilityRole="header">
        {label}
      </Text>
      <Text style={[styles.sectionBody, bodyStyle, { color: palette.text }]}>{text}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  title: {
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  error: { marginBottom: spacing.xs, fontSize: 15 },
  muted: {},
  section: { marginBottom: spacing.sm },
  sectionLabel: { fontWeight: '600', marginBottom: spacing.xs, fontSize: 14 },
  sectionBody: {},
  meta: { marginTop: spacing.sm },
});
