import React, { useEffect } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useProfile } from '../hooks/useProfile';
import { useAuth } from '../hooks/useAuth';
import { CosmicCard } from '../components/CosmicCard';
import { LoadingBlock } from '../components/LoadingBlock';
import { colors } from '../theme';
import { planetSymbol, aspectSymbol } from '@astralis/lib/zodiac';
import type { Aspect, PlanetPosition } from '@astralis/lib/types';
import { resetToLogin } from '../navigation/navigationRef';

export function ProfileScreen(): React.JSX.Element {
  const { profile, load, recompute, loading, error } = useProfile();
  const { logout, user } = useAuth();

  useEffect(() => {
    void load();
  }, [load]);

  async function onLogout(): Promise<void> {
    await logout();
    resetToLogin();
  }

  const chart = profile?.natalChart;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile</Text>
      {user ? (
        <Text style={styles.sub}>
          {user.fullName} · {user.email}
        </Text>
      ) : null}
      {loading ? <LoadingBlock message="Casting chart…" /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {chart ? (
        <CosmicCard title="Natal summary">
          <Text style={styles.rowText}>
            Sun {chart.sunSign} · Moon {chart.moonSign} · Rising {chart.risingSign ?? '—'}
          </Text>
        </CosmicCard>
      ) : null}
      {chart ? (
        <CosmicCard title="Planets">
          <FlatList
            data={chart.planets}
            keyExtractor={(p) => p.name}
            scrollEnabled={false}
            renderItem={({ item }: { item: PlanetPosition }) => (
              <Text style={styles.listLine}>
                {planetSymbol(item.name)} {item.name} — {item.sign} {item.degreeInSign.toFixed(1)}°
                {item.retrograde ? ' ℞' : ''}
              </Text>
            )}
          />
        </CosmicCard>
      ) : null}
      {chart ? (
        <CosmicCard title="Aspects">
          <FlatList
            data={chart.aspects}
            keyExtractor={(a, i) => `${a.body1}-${a.body2}-${i}`}
            scrollEnabled={false}
            renderItem={({ item }: { item: Aspect }) => (
              <Text style={styles.listLine}>
                {aspectSymbol(item.type)} {item.body1} {item.type} {item.body2} (orb {item.orb.toFixed(2)}°)
              </Text>
            )}
          />
        </CosmicCard>
      ) : null}
      <Pressable style={styles.secondary} onPress={() => void recompute()} disabled={loading}>
        <Text style={styles.secondaryText}>Recompute chart</Text>
      </Pressable>
      <Pressable style={styles.dangerBtn} onPress={() => void onLogout()}>
        <Text style={styles.dangerText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  sub: { color: colors.textMuted, marginBottom: 12 },
  error: { color: colors.danger, marginBottom: 8 },
  rowText: { color: colors.text, lineHeight: 22 },
  listLine: { color: colors.text, marginVertical: 4 },
  secondary: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  secondaryText: { color: colors.accent, fontWeight: '600' },
  dangerBtn: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(229,115,115,0.15)',
    alignItems: 'center',
  },
  dangerText: { color: colors.danger, fontWeight: '700' },
});
