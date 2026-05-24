import React, { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { Linking, Pressable, StyleSheet, Switch, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { spacing } from '../theme';
import { goToDeleteAccount } from '../navigation/navigationRef';
import { useAppearance } from '../hooks/useAppearance';
import { getAnalyticsConsent, setAnalyticsConsent } from '../lib/analytics';

type RootNav = NativeStackNavigationProp<RootStackParamList>;

export function AccountSettingsScreen(): React.JSX.Element {
  const navigation = useNavigation<RootNav>();
  const { mode, palette } = useAppearance();
  const isLight = mode === 'light';
  const cardBg = isLight ? '#f9f9fe' : palette.surface;
  const cardBorder = isLight ? '#e2e4f4' : palette.border;
  const cardShadow = isLight ? '#9fa7cf' : '#0a0d22';
  const subtleDanger = isLight ? '#fff4f6' : 'rgba(239, 97, 129, 0.12)';
  const subtleDangerBorder = isLight ? '#f1cad3' : 'rgba(239, 97, 129, 0.35)';
  const dangerText = isLight ? '#8f2d45' : '#f4a8ba';
  const dangerDescription = isLight ? '#a05d71' : '#daa6b4';
  const dangerChevron = isLight ? '#be5c7a' : '#f1a4b8';
  const privacyUrl = legalUrl('privacyPolicyUrl');
  const termsUrl = legalUrl('termsOfServiceUrl');
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);

  useEffect(() => {
    void getAnalyticsConsent().then(setAnalyticsAllowed);
  }, []);

  const toggleAnalytics = async (next: boolean): Promise<void> => {
    setAnalyticsAllowed(next);
    await setAnalyticsConsent(next);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: isLight ? '#f3f3f6' : palette.background }]} edges={['left', 'right', 'top']}>
      <View pointerEvents="none" style={[styles.glowTop, { backgroundColor: isLight ? 'rgba(170, 155, 255, 0.2)' : 'rgba(108, 92, 214, 0.24)' }]} />
      <View style={styles.container}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }: { pressed: boolean }) => [
            styles.backButton,
            {
              backgroundColor: isLight ? '#ece9ff' : 'rgba(139, 107, 255, 0.22)',
              shadowColor: isLight ? '#ad9bff' : '#5f47d7',
            },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={[styles.backChevron, { color: isLight ? '#2f3566' : '#d8d2ff' }]}>‹</Text>
        </Pressable>

        <View style={styles.headerSection}>
          <Text style={[styles.title, { color: palette.text }]}>Account Settings</Text>
          <Text style={[styles.subtitle, { color: palette.textMuted }]}>
            Manage your account, privacy, and security preferences.
          </Text>
        </View>

        <View
          style={[
            styles.groupCard,
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
              shadowColor: cardShadow,
            },
          ]}
        >
          <SettingRow
            title="Product Analytics"
            description="Share privacy-safe usage events to improve retention and Premium flows."
            onPress={() => undefined}
            titleColor={palette.text}
            descriptionColor={palette.textMuted}
            chevronColor={palette.textMuted}
            rightAccessory={
              <Switch
                value={analyticsAllowed}
                onValueChange={(next) => void toggleAnalytics(next)}
                accessibilityLabel="Product analytics consent"
              />
            }
          />
          <SettingRow
            title="Privacy Policy"
            description="Review how account, birth, billing, and notification data are handled."
            onPress={() => void Linking.openURL(privacyUrl)}
            titleColor={palette.text}
            descriptionColor={palette.textMuted}
            chevronColor={palette.textMuted}
          />
          <SettingRow
            title="Terms of Service"
            description="Read the current usage and subscription terms."
            onPress={() => void Linking.openURL(termsUrl)}
            titleColor={palette.text}
            descriptionColor={palette.textMuted}
            chevronColor={palette.textMuted}
          />
          <SettingRow
            title="Delete Account"
            description="Permanently remove your account and personal data."
            onPress={goToDeleteAccount}
            titleColor={dangerText}
            descriptionColor={dangerDescription}
            chevronColor={dangerChevron}
            rowStyle={{ backgroundColor: subtleDanger, borderColor: subtleDangerBorder }}
            showDangerDot
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function legalUrl(key: 'privacyPolicyUrl' | 'termsOfServiceUrl'): string {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const value = extra?.[key];
  if (typeof value === 'string' && value.length > 0) return value;
  return key === 'privacyPolicyUrl'
    ? 'https://horoscope-frontend.pages.dev/privacy'
    : 'https://horoscope-frontend.pages.dev/terms';
}

function SettingRow({
  title,
  description,
  onPress,
  titleColor,
  descriptionColor,
  chevronColor,
  rowStyle,
  showDangerDot = false,
  rightAccessory,
}: {
  title: string;
  description?: string;
  onPress: () => void;
  titleColor: string;
  descriptionColor: string;
  chevronColor: string;
  rowStyle?: StyleProp<ViewStyle>;
  showDangerDot?: boolean;
  rightAccessory?: React.ReactNode;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [styles.row, rowStyle, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.rowTextWrap}>
        <Text style={[styles.rowLabel, { color: titleColor }]}>{title}</Text>
        {description ? <Text style={[styles.rowDescription, { color: descriptionColor }]}>{description}</Text> : null}
        {rightAccessory}
      </View>
      <Text style={[styles.rowChevron, { color: chevronColor }]}>›</Text>
      {showDangerDot ? <View style={styles.rowDangerDot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  glowTop: {
    position: 'absolute',
    top: -160,
    left: -40,
    right: -40,
    height: 320,
    borderRadius: 220,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  backButton: {
    height: 56,
    width: 56,
    borderRadius: 28,
    backgroundColor: '#ece9ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ad9bff',
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginBottom: spacing.xl,
  },
  headerSection: {
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  backChevron: {
    fontSize: 34,
    lineHeight: 34,
    marginTop: -2,
  },
  title: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  groupCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: spacing.sm,
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  row: {
    minHeight: 76,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: 'relative',
  },
  rowTextWrap: {
    flex: 1,
    paddingRight: spacing.md,
    gap: 4,
  },
  rowLabel: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  rowDescription: {
    fontSize: 14,
    lineHeight: 19,
  },
  rowChevron: {
    fontSize: 26,
    lineHeight: 30,
  },
  rowDangerDot: {
    position: 'absolute',
    right: spacing.sm + 20,
    top: spacing.sm,
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#ef6181',
    opacity: 0.8,
  },
  pressed: { opacity: 0.84 },
});
