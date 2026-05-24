import Constants from 'expo-constants';
import React, { useCallback } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { hitSlopComfortable, spacing } from '../theme';
import { useAppearance } from '../hooks/useAppearance';

type LegalKey = 'privacyPolicyUrl' | 'termsOfServiceUrl';

const FALLBACKS: Record<LegalKey, string> = {
  privacyPolicyUrl: 'https://horoscope-frontend.pages.dev/privacy',
  termsOfServiceUrl: 'https://horoscope-frontend.pages.dev/terms',
};

function legalUrl(key: LegalKey): string {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const value = extra?.[key];
  return typeof value === 'string' && value.length > 0 ? value : FALLBACKS[key];
}

export function LegalLinks({ compact = false }: { compact?: boolean }): React.JSX.Element {
  const { palette } = useAppearance();
  const open = useCallback((key: LegalKey) => {
    void Linking.openURL(legalUrl(key));
  }, []);

  return (
    <View style={[styles.wrap, compact && styles.compact]}>
      <Text style={[styles.copy, { color: palette.textMuted }]}>
        By continuing, you agree to Astralis processing your account and birth details for personalized readings.
      </Text>
      <View style={styles.row}>
        <LegalLink label="Privacy Policy" onPress={() => open('privacyPolicyUrl')} />
        <Text style={[styles.dot, { color: palette.textMuted }]}>•</Text>
        <LegalLink label="Terms" onPress={() => open('termsOfServiceUrl')} />
      </View>
    </View>
  );
}

function LegalLink({ label, onPress }: { label: string; onPress: () => void }): React.JSX.Element {
  const { palette } = useAppearance();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      hitSlop={hitSlopComfortable}
      style={({ pressed }: { pressed: boolean }) => pressed && styles.pressed}
    >
      <Text style={[styles.link, { color: palette.accent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  compact: {
    marginTop: spacing.sm,
  },
  copy: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dot: {
    fontSize: 12,
  },
  link: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  pressed: { opacity: 0.82 },
});
