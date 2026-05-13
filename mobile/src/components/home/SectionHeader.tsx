import React, { type ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSanctuaryTheme } from './sanctuaryTheme';

type Props = {
  title: string;
  subtitle?: string;
  accessibilityLabel?: string;
};

export function SectionHeader({ title, subtitle, accessibilityLabel }: Props): ReactElement {
  const t = useSanctuaryTheme();
  return (
    <View style={styles.wrap} accessibilityRole="header" accessibilityLabel={accessibilityLabel ?? title}>
      <Text style={[styles.title, { color: t.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: t.paleYellow }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: 12 },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.95,
  },
});
