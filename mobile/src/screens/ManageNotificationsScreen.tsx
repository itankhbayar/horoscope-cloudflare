import React, { useEffect, useMemo } from 'react';
import {
  AppState,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { spacing } from '../theme';
import { useNotifications } from '../hooks/useNotifications';
import type { RootStackParamList } from '../navigation/types';
import { useAppearance } from '../hooks/useAppearance';
import { track } from '../lib/analytics';

type RootNav = NativeStackNavigationProp<RootStackParamList>;

export function ManageNotificationsScreen(): React.JSX.Element {
  const navigation = useNavigation<RootNav>();
  const { mode, palette } = useAppearance();
  const { preferences, loading, saving, error, readiness, load, setAllEnabled, setChildEnabled } = useNotifications();
  const isLight = mode === 'light';

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void track('notification_settings_viewed', { canRequestPush: readiness.canRequestPush });
  }, [readiness.canRequestPush]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void load();
      }
    });
    return () => sub.remove();
  }, [load]);

  const rows = useMemo(
    () => [
      {
        key: 'allEnabled' as const,
        label: 'All notifications',
        description: 'Allow Astralis to send calm reminders about your sky rituals.',
        value: preferences?.allEnabled ?? false,
      },
      {
        key: 'dailyReminderEnabled' as const,
        label: "Today's sky",
        description: 'A daily note when your sky reading is ready.',
        value: preferences?.dailyReminderEnabled ?? true,
      },
      {
        key: 'streakReminderEnabled' as const,
        label: 'Ritual rhythm',
        description: 'A gentle reminder when your daily ritual is waiting.',
        value: preferences?.streakReminderEnabled ?? true,
      },
      {
        key: 'reEngagementEnabled' as const,
        label: 'Quiet returns',
        description: 'Occasional soft notes after time away.',
        value: preferences?.reEngagementEnabled ?? true,
      },
      {
        key: 'quietHoursEnabled' as const,
        label: 'Quiet Hours',
        description: `Hold notifications from ${preferences?.quietHoursStart ?? '21:00'} to ${preferences?.quietHoursEnd ?? '08:00'}.`,
        value: preferences?.quietHoursEnabled ?? true,
      },
      {
        key: 'saleAlertsEnabled' as const,
        label: 'Access notes',
        description: 'Rare updates about premium access or offers.',
        value: preferences?.saleAlertsEnabled ?? false,
      },
      {
        key: 'horoscopesEnabled' as const,
        label: 'Sky readings',
        description: 'Updates about daily sky readings.',
        value: preferences?.horoscopesEnabled ?? false,
      },
      {
        key: 'transitsEnabled' as const,
        label: 'Transit context',
        description: 'Notable sky movement and timing context.',
        value: preferences?.transitsEnabled ?? false,
      },
    ],
    [preferences],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right', 'top']}>
      <View style={styles.container}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: isLight ? '#ede9fe' : 'rgba(139, 107, 255, 0.22)',
              shadowColor: isLight ? '#ad9bff' : '#5f47d7',
            },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={[styles.backChevron, { color: isLight ? '#2f3566' : '#d8d2ff' }]}>‹</Text>
        </Pressable>

        <Text style={[styles.title, { color: palette.text }]}>Notification Rituals</Text>
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>Choose which sky notes feel useful.</Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color="#4b53a3" />
          </View>
        ) : null}

        {error ? (
          <Text style={[styles.error, { color: '#c53b3b' }]} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        {!readiness.canRequestPush ? (
          <View style={[styles.notice, { borderColor: palette.border, backgroundColor: palette.card }]}>
            <Text style={[styles.noticeText, { color: palette.textMuted }]}>{readiness.reason}</Text>
          </View>
        ) : null}
        {!loading ? (
          <View style={styles.list}>
            {rows.map((row, index) => {
              const isChild = row.key !== 'allEnabled';
              const rowDisabled = saving || (row.key === 'allEnabled' && !readiness.canRequestPush);
              return (
                <View
                  key={row.key}
                  style={[
                    styles.row,
                    isChild && styles.childRow,
                    index > 0 && styles.rowSpacing,
                  ]}
                >
                  <View style={styles.textBlock}>
                    <Text style={[styles.rowTitle, { color: palette.text }]}>{row.label}</Text>
                    <Text style={[styles.rowDescription, { color: palette.textMuted }]}>{row.description}</Text>
                  </View>
                  <Switch
                    value={row.value}
                    disabled={rowDisabled}
                    onValueChange={(next) => {
                      if (row.key === 'allEnabled') {
                        void setAllEnabled(next);
                        return;
                      }
                      void setChildEnabled(row.key, next);
                    }}
                    trackColor={{ false: isLight ? '#d2d6e7' : 'rgba(154, 160, 194, 0.45)', true: palette.accent }}
                    thumbColor="#ffffff"
                    ios_backgroundColor={isLight ? '#d2d6e7' : 'rgba(154, 160, 194, 0.45)'}
                    accessibilityRole="switch"
                    accessibilityLabel={row.label}
                    accessibilityState={{ checked: row.value, disabled: rowDisabled }}
                  />
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  backButton: {
    height: 56,
    width: 56,
    borderRadius: 28,
    backgroundColor: '#ede9fe',
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
    color: '#2f3566',
    marginTop: -2,
  },
  title: {
    fontSize: 29,
    lineHeight: 33,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 19,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  centered: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  list: { marginTop: spacing.sm },
  notice: {
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  childRow: {
    marginLeft: spacing.sm,
  },
  rowSpacing: {
    marginTop: spacing.xl,
  },
  textBlock: {
    flex: 1,
    paddingRight: spacing.md,
  },
  rowTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '600',
  },
  rowDescription: {
    marginTop: spacing.xs,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '400',
  },
  error: {
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.86 },
});
