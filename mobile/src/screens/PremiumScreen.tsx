import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CosmicCard } from '../components/CosmicCard';
import { colors } from '../theme';

export function PremiumScreen(): React.JSX.Element {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Premium</Text>
      <CosmicCard title="Locked feature">
        <Text style={styles.body}>
          Deeper readings, tarot, and AI astrologer will unlock here. Mobile checkout can reuse the
          same billing endpoints as the web app when you wire Stripe.
        </Text>
        <Pressable style={styles.cta} onPress={() => {}} accessibilityRole="button">
          <Text style={styles.ctaText}>Upgrade (coming soon)</Text>
        </Pressable>
      </CosmicCard>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 12 },
  body: { color: colors.textMuted, lineHeight: 22, marginBottom: 16 },
  cta: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
