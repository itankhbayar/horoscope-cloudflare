import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ZODIAC_SIGNS } from '@astralis/lib/zodiac';
import type { ZodiacSign } from '@astralis/lib/types';
import { useCompatibility } from '../hooks/useCompatibility';
import { CosmicCard } from '../components/CosmicCard';
import { LoadingBlock } from '../components/LoadingBlock';
import { colors } from '../theme';

export function CompatibilityScreen(): React.JSX.Element {
  const { result, loading, error, compareSigns } = useCompatibility();
  const [sign1, setSign1] = useState<ZodiacSign | null>(null);
  const [sign2, setSign2] = useState<ZodiacSign | null>(null);

  async function onCompute(): Promise<void> {
    if (!sign1 || !sign2) return;
    await compareSigns(sign1, sign2);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Compatibility</Text>
      <Text style={styles.sub}>Pick two signs</Text>
      <Text style={styles.pickLabel}>First sign</Text>
      <SignRow selected={sign1} onSelect={setSign1} />
      <Text style={styles.pickLabel}>Second sign</Text>
      <SignRow selected={sign2} onSelect={setSign2} />
      <Pressable
        style={[styles.button, (!sign1 || !sign2 || loading) && styles.buttonDisabled]}
        onPress={() => void onCompute()}
        disabled={!sign1 || !sign2 || loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Aligning…' : 'Compute'}</Text>
      </Pressable>
      {loading ? <LoadingBlock message="Computing…" /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {result ? (
        <CosmicCard title="Result">
          <Text style={styles.score}>Overall {result.overallScore}</Text>
          <Text style={styles.body}>{result.summary}</Text>
          <Text style={styles.subhead}>Highlights</Text>
          {(result.highlights ?? []).map((h) => (
            <Text key={h} style={styles.bullet}>
              • {h}
            </Text>
          ))}
        </CosmicCard>
      ) : null}
    </ScrollView>
  );
}

function SignRow({
  selected,
  onSelect,
}: {
  selected: ZodiacSign | null;
  onSelect: (s: ZodiacSign) => void;
}): React.JSX.Element {
  return (
    <View style={styles.row}>
      {ZODIAC_SIGNS.map((z) => {
        const active = selected === z.key;
        return (
          <Pressable
            key={z.key}
            onPress={() => onSelect(z.key)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{z.symbol}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  sub: { color: colors.textMuted, marginBottom: 12 },
  pickLabel: { color: colors.gold, marginTop: 8, marginBottom: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  chipText: { fontSize: 16, color: colors.text },
  chipTextActive: { color: colors.text },
  button: {
    marginTop: 16,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '700' },
  error: { color: colors.danger, marginTop: 8 },
  score: { fontSize: 18, fontWeight: '700', color: colors.gold, marginBottom: 8 },
  body: { color: colors.text, lineHeight: 22 },
  subhead: { color: colors.textMuted, marginTop: 12, marginBottom: 4 },
  bullet: { color: colors.text, marginTop: 4 },
});
