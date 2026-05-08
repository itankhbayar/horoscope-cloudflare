import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { spacing } from '../theme';
import { goToDeleteAccount } from '../navigation/navigationRef';
import { useAppearance } from '../hooks/useAppearance';

type RootNav = NativeStackNavigationProp<RootStackParamList>;

export function AccountSettingsScreen(): React.JSX.Element {
  const navigation = useNavigation<RootNav>();
  const { mode, palette } = useAppearance();
  const isLight = mode === 'light';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: isLight ? '#f3f3f6' : palette.background }]} edges={['left', 'right', 'top']}>
      <View style={styles.container}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
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

        <Text style={[styles.title, { color: palette.text }]}>Account Settings</Text>
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>Configure your account level settings</Text>

        <Pressable
          onPress={goToDeleteAccount}
          style={({ pressed }) => [
            styles.row,
            {
              borderColor: isLight ? '#d6d7dc' : palette.border,
              backgroundColor: isLight ? '#f7f7fa' : palette.surface,
            },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Delete Account"
        >
          <Text style={[styles.rowLabel, { color: palette.text }]}>Delete Account</Text>
          <Text style={[styles.rowChevron, { color: isLight ? '#9a9cac' : palette.textMuted }]}>›</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
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
  backChevron: {
    fontSize: 34,
    lineHeight: 34,
    marginTop: -2,
  },
  title: {
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  row: {
    minHeight: 62,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  rowLabel: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '500',
  },
  rowChevron: {
    fontSize: 30,
    lineHeight: 34,
  },
  pressed: { opacity: 0.84 },
});
