import React from 'react';
import { StyleSheet, Text, View, type ViewProps } from 'react-native';
import { colors, cosmicGlow } from '../theme';

type Props = ViewProps & {
  title?: string;
  children: React.ReactNode;
};

export function CosmicCard({ title, children, style, ...rest }: Props): React.JSX.Element {
  return (
    <View style={[styles.card, cosmicGlow, style]} {...rest}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gold,
    marginBottom: 10,
  },
});
