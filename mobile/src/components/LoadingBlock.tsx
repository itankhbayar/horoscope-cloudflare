import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

type Props = { message?: string };

export function LoadingBlock({ message = 'Loading…' }: Props): React.JSX.Element {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 12,
  },
  text: { color: colors.textMuted, fontSize: 14 },
});
