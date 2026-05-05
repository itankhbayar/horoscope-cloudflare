import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useHoroscope } from '../hooks/useHoroscope';
import { useProfile } from '../hooks/useProfile';
import { CosmicCard } from '../components/CosmicCard';
import { LoadingBlock } from '../components/LoadingBlock';
import { colors } from '../theme';

export function HomeScreen(): React.JSX.Element {
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Your stars today</Text>
      {loading ? <LoadingBlock /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && horoscope ? (
        <CosmicCard title={`${horoscope.sign.toUpperCase()} · ${horoscope.date}`}>
          <Section label="Overall" text={horoscope.overall} />
          <Section label="Love" text={horoscope.love} />
          <Section label="Career" text={horoscope.career} />
          <Section label="Health" text={horoscope.health} />
          <Text style={styles.meta}>
            Lucky {horoscope.luckyNumber} · {horoscope.luckyColor}
          </Text>
        </CosmicCard>
      ) : null}
      {!loading && !horoscope && !error ? (
        <Text style={styles.muted}>Complete your profile with a birth chart to see your daily reading.</Text>
      ) : null}
    </ScrollView>
  );
}

function Section({ label, text }: { label: string; text: string }): React.JSX.Element {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.sectionBody}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  error: { color: colors.danger, marginBottom: 8 },
  muted: { color: colors.textMuted },
  section: { marginBottom: 12 },
  sectionLabel: { color: colors.gold, fontWeight: '600', marginBottom: 4 },
  sectionBody: { color: colors.text, lineHeight: 22 },
  meta: { color: colors.textMuted, marginTop: 8 },
});
