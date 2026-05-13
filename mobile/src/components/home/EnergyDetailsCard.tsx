import React, { type ReactElement } from 'react';
import { Animated, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { ContentCard } from './ContentCard';
import { SectionHeader } from './SectionHeader';
import { useSanctuaryTheme } from './sanctuaryTheme';
import { spacing } from '../../theme';

type Props = {
  body: string;
  entranceOpacity?: Animated.Value;
  onLayout?: (e: LayoutChangeEvent) => void;
};

export function EnergyDetailsCard({
  body,
  entranceOpacity,
  onLayout,
}: Props): ReactElement {
  const t = useSanctuaryTheme();
  return (
    <ContentCard entranceOpacity={entranceOpacity} onLayout={onLayout}>
      <SectionHeader
        title="Energy Details"
        subtitle="Cosmic Waves of Connection and Growth"
        accessibilityLabel="Energy details. Cosmic waves of connection and growth."
      />
      <View style={[styles.gradientBand, { backgroundColor: t.lavender }]} pointerEvents="none" />
      <Text style={[styles.body, { color: t.textMuted }]}>{body}</Text>
    </ContentCard>
  );
}

const styles = StyleSheet.create({
  gradientBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    opacity: 0.12,
  },
  body: {
    marginTop: spacing.sm,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '500',
  },
});
