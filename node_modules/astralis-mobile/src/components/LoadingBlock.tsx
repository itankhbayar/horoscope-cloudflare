import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAppearance } from '../hooks/useAppearance';

type Props = { message?: string };

function LoadingBlockInner({ message = 'Loading…' }: Props): React.JSX.Element {
  const { palette } = useAppearance();
  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      accessibilityLiveRegion="polite"
    >
      <ActivityIndicator size="large" color={palette.accent} />
      <Text style={[styles.text, { color: palette.textMuted }]}>{message}</Text>
    </View>
  );
}

export const LoadingBlock = React.memo(LoadingBlockInner);

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 12,
  },
  text: { fontSize: 14 },
});
