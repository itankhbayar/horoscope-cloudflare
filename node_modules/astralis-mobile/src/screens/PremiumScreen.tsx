import React from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PremiumAccessCard } from '../components/PremiumAccessCard';
import {
  bodyFontSize,
  colors,
  horizontalScreenPadding,
  screenTitleSize,
  spacing,
} from '../theme';
import { useAppearance } from '../hooks/useAppearance';

export function PremiumScreen(): React.JSX.Element {
  const { width } = useWindowDimensions();
  const { palette } = useAppearance();

  const hp = horizontalScreenPadding(width);
  const titleSize = screenTitleSize(width);
  const bodySize = bodyFontSize(width);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right', 'top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: hp, paddingTop: spacing.md }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { fontSize: titleSize, color: palette.text }]} accessibilityRole="header">
          Premium
        </Text>
        <Text style={[styles.body, { fontSize: bodySize, color: palette.textMuted }]}>
          Premium management now lives in Profile for a cleaner tab layout.
        </Text>
        <PremiumAccessCard />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: spacing.xxxl },
  title: { fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  body: { color: colors.textMuted, marginBottom: spacing.sm },
});
