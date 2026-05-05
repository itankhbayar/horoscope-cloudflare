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
  colors,
  screenTitleSize,
  spacing,
} from '../theme';

export function HomeScreen(): React.JSX.Element {
  const { width } = useWindowDimensions();
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
        style={[styles.title, dynamicText.title]}
        accessibilityRole="header"
        accessibilityLabel="Your stars today"
      >
        Your stars today
      </Text>
      {loading ? <LoadingBlock /> : null}
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      {!loading && horoscope ? (
        <CosmicCard title={`${horoscope.sign.toUpperCase()} · ${horoscope.date}`}>
          <Section label="Overall" text={horoscope.overall} bodyStyle={dynamicText.sectionBody} />
          <Section label="Love" text={horoscope.love} bodyStyle={dynamicText.sectionBody} />
          <Section label="Career" text={horoscope.career} bodyStyle={dynamicText.sectionBody} />
          <Section label="Health" text={horoscope.health} bodyStyle={dynamicText.sectionBody} />
          <Text style={[styles.meta, dynamicText.meta]}>
            Lucky {horoscope.luckyNumber} · {horoscope.luckyColor}
          </Text>
        </CosmicCard>
      ) : null}
      {!loading && !horoscope && !error ? (
        <Text style={[styles.muted, dynamicText.muted]}>
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
  return (
    <View style={styles.section} accessibilityLabel={`${label}. ${text}`}>
      <Text style={styles.sectionLabel} accessibilityRole="header">
        {label}
      </Text>
      <Text style={[styles.sectionBody, bodyStyle]}>{text}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  title: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  error: { color: colors.danger, marginBottom: spacing.xs, fontSize: 15 },
  muted: { color: colors.textMuted },
  section: { marginBottom: spacing.sm },
  sectionLabel: { color: colors.gold, fontWeight: '600', marginBottom: spacing.xs, fontSize: 14 },
  sectionBody: { color: colors.text },
  meta: { color: colors.textMuted, marginTop: spacing.sm },
});
