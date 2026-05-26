import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
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
import { CALM_RITUAL_PRESETS } from '../lib/calmRitualPresets';

type RootNav = NativeStackNavigationProp<RootStackParamList>;

export function ManageNotificationsScreen(): React.JSX.Element {
  const navigation = useNavigation<RootNav>();
  const { mode, palette } = useAppearance();
  const {
    preferences,
    loading,
    saving,
    error,
    readiness,
    load,
    setAllEnabled,
    setChildEnabled,
    setReminderHourLocal,
    setQuietHoursWindow,
    applyRitualPreset,
    silentModeEnabled,
    deliveryState,
    scheduleFeedback,
    setSilentModeEnabled,
    scheduleNightlyAtmosphericReminder,
    pauseReminders,
    resumeReminders,
    resetNotificationPersonalization,
  } = useNotifications();
  const isLight = mode === 'light';
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const actionTakenRef = useRef(false);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void track('notification_settings_viewed', { canRequestPush: readiness.canRequestPush });
    return () => {
      if (!actionTakenRef.current) {
        void track('settings_abandonment', { surface: 'notifications', reason: 'left_without_action' });
      }
    };
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
        label: 'Nightly ritual reminder',
        description: 'One calm invitation near your preferred ritual window.',
        value: preferences?.dailyReminderEnabled ?? true,
      },
      {
        key: 'horoscopesEnabled' as const,
        label: 'Atmosphere alerts',
        description: 'Soft notes when the sky has a distinct emotional tone.',
        value: preferences?.horoscopesEnabled ?? false,
      },
      {
        key: 'transitsEnabled' as const,
        label: 'Premium sky continuity',
        description: 'Moon-phase and relationship atmosphere notes when deeper timing is available.',
        value: preferences?.transitsEnabled ?? false,
      },
      {
        key: 'quietHoursEnabled' as const,
        label: 'No-notification quiet period',
        description: `Hold notifications from ${preferences?.quietHoursStart ?? '21:00'} to ${preferences?.quietHoursEnd ?? '08:00'}.`,
        value: preferences?.quietHoursEnabled ?? true,
      },
      {
        key: 'reEngagementEnabled' as const,
        label: 'Quiet returns',
        description: 'Occasional soft notes after time away. Never streak guilt.',
        value: preferences?.reEngagementEnabled ?? true,
      },
      {
        key: 'saleAlertsEnabled' as const,
        label: 'Access notes',
        description: 'Rare account or premium access updates. No urgency campaigns.',
        value: preferences?.saleAlertsEnabled ?? false,
      },
    ],
    [preferences],
  );

  const calmRows = useMemo(
    () => [
      {
        key: 'dailyReminderEnabled' as const,
        label: 'Quiet nightly ritual',
        description: 'One gentle invitation near your evening rhythm.',
        value: preferences?.dailyReminderEnabled ?? true,
      },
      {
        key: 'horoscopesEnabled' as const,
        label: 'Atmospheric reminders',
        description: 'Sky notes only when the tone is worth naming.',
        value: preferences?.horoscopesEnabled ?? false,
      },
    ],
    [preferences],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
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
            <Text style={[styles.noticeText, { color: palette.textMuted }]}>
              {deliveryState?.detailText ?? readiness.reason}
            </Text>
          </View>
        ) : null}
        {!loading ? (
          <View style={styles.list}>
            <View style={[styles.statePanel, { borderColor: palette.border, backgroundColor: palette.card }]}>
              <Text style={[styles.stateLabel, { color: palette.textMuted }]}>Delivery state</Text>
              <Text style={[styles.stateTitle, { color: palette.text }]}>
                {deliveryState?.statusText ?? 'Checking reminders'}
              </Text>
              <Text style={[styles.panelText, { color: palette.textMuted }]}>
                {deliveryState?.detailText ?? 'Astralis is checking whether a ritual reminder is scheduled.'}
              </Text>
              {deliveryState?.quietHourMessage ? (
                <Text style={[styles.panelText, { color: palette.textMuted }]}>{deliveryState.quietHourMessage}</Text>
              ) : null}
              {deliveryState?.silentModeEnabled ? (
                <Text style={[styles.panelText, { color: palette.textMuted }]}>Silent invitation mode is on.</Text>
              ) : null}
              {deliveryState?.lastDeliveredISO ? (
                <Text style={[styles.panelText, { color: palette.textMuted }]}>
                  Last delivered: {new Date(deliveryState.lastDeliveredISO).toLocaleString()}
                </Text>
              ) : null}
              {deliveryState?.personalizationResetAtISO ? (
                <Text style={[styles.panelText, { color: palette.textMuted }]}>
                  Personalization reset: {new Date(deliveryState.personalizationResetAtISO).toLocaleString()}
                </Text>
              ) : null}
              {deliveryState?.permissionStatus === 'denied' ? (
                <Pressable
                  style={({ pressed }) => [styles.resetButton, { borderColor: palette.border }, pressed && styles.pressed]}
                  onPress={() => {
                    void track('system_settings_cta_tapped', { source: 'notification_settings' });
                    void Linking.openSettings();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Open system notification settings"
                >
                  <Text style={[styles.actionText, { color: palette.accent }]}>Open system settings</Text>
                </Pressable>
              ) : null}
            </View>
            {scheduleFeedback ? (
              <View style={[styles.feedbackPanel, { borderColor: palette.border, backgroundColor: palette.card }]}>
                <Text style={[styles.rowTitle, { color: palette.text }]}>{scheduleFeedback.title}</Text>
                <Text style={[styles.panelText, { color: palette.textMuted }]}>{scheduleFeedback.message}</Text>
              </View>
            ) : null}
            <View style={[styles.panel, { borderColor: palette.border, backgroundColor: palette.card }]}>
              <Text style={[styles.panelTitle, { color: palette.text }]}>Choose a rhythm</Text>
              <Text style={[styles.panelText, { color: palette.textMuted }]}>
                Presets keep the ritual simple while Astralis handles the details underneath.
              </Text>
              <View style={styles.presetGrid}>
                {CALM_RITUAL_PRESETS.map((preset) => (
                  <Pressable
                    key={preset.id}
                    style={({ pressed }) => [styles.presetButton, { borderColor: palette.border }, pressed && styles.pressed]}
                    onPress={() => {
                      actionTakenRef.current = true;
                      void applyRitualPreset(preset.id);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Apply ${preset.title} preset`}
                  >
                    <Text style={[styles.presetTitle, { color: palette.text }]}>{preset.title}</Text>
                    <Text style={[styles.presetSummary, { color: palette.textMuted }]}>{preset.summary}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={[styles.panel, { borderColor: palette.border, backgroundColor: palette.card }]}>
              <Text style={[styles.panelTitle, { color: palette.text }]}>Simple controls</Text>
              {calmRows.map((row, index) => (
                <View
                  key={row.key}
                  style={[styles.row, index > 0 && styles.rowSpacing]}
                >
                  <View style={styles.textBlock}>
                    <Text style={[styles.rowTitle, { color: palette.text }]}>{row.label}</Text>
                    <Text style={[styles.rowDescription, { color: palette.textMuted }]}>{row.description}</Text>
                  </View>
                  <Switch
                    value={row.value}
                    disabled={saving || !preferences?.allEnabled}
                    onValueChange={(next) => {
                      actionTakenRef.current = true;
                      void setChildEnabled(row.key, next);
                    }}
                    trackColor={{ false: isLight ? '#d2d6e7' : 'rgba(154, 160, 194, 0.45)', true: palette.accent }}
                    thumbColor="#ffffff"
                    ios_backgroundColor={isLight ? '#d2d6e7' : 'rgba(154, 160, 194, 0.45)'}
                    accessibilityRole="switch"
                    accessibilityLabel={row.label}
                    accessibilityState={{ checked: row.value, disabled: saving || !preferences?.allEnabled }}
                  />
                </View>
              ))}
              <View style={[styles.row, styles.rowSpacing]}>
                <View style={styles.textBlock}>
                  <Text style={[styles.rowTitle, { color: palette.text }]}>Silent invitations</Text>
                  <Text style={[styles.rowDescription, { color: palette.textMuted }]}>
                    Keep the reminder available without sound.
                  </Text>
                </View>
                <Switch
                  value={silentModeEnabled}
                  disabled={saving}
                  onValueChange={(next) => {
                    actionTakenRef.current = true;
                    void setSilentModeEnabled(next);
                  }}
                  trackColor={{ false: isLight ? '#d2d6e7' : 'rgba(154, 160, 194, 0.45)', true: palette.accent }}
                  thumbColor="#ffffff"
                  ios_backgroundColor={isLight ? '#d2d6e7' : 'rgba(154, 160, 194, 0.45)'}
                  accessibilityRole="switch"
                  accessibilityLabel="Silent invitations"
                />
              </View>
              <View style={styles.actionRow}>
                <Pressable
                  style={({ pressed }) => [styles.actionButton, { borderColor: palette.border }, pressed && styles.pressed]}
                  onPress={() => {
                    actionTakenRef.current = true;
                    void scheduleNightlyAtmosphericReminder().then((result) => {
                      if (result.scheduled) void track('ritual_flow_completion', { surface: 'notifications' });
                    });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Schedule nightly atmospheric reminder"
                >
                  <Text style={[styles.actionText, { color: palette.accent }]}>Schedule calmly</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.actionButton, { borderColor: palette.border }, pressed && styles.pressed]}
                  onPress={() => {
                    actionTakenRef.current = true;
                    void (deliveryState?.paused ? resumeReminders() : pauseReminders(7));
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={deliveryState?.paused ? 'Resume reminders' : 'Pause reminders for seven days'}
                >
                  <Text style={[styles.actionText, { color: palette.textMuted }]}>
                    {deliveryState?.paused ? 'Resume' : 'Pause'}
                  </Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.disclosure, { borderColor: palette.border }, pressed && styles.pressed]}
              onPress={() => {
                const next = !advancedOpen;
                setAdvancedOpen(next);
                if (next) {
                  void track('advanced_control_used', { surface: 'notifications', control: 'advanced_delivery_opened' });
                  void track('cognitive_overload_signal', { surface: 'notifications', reason: 'advanced_opened' });
                  void track('notification_settings_confusion', { reason: 'advanced_opened' });
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={advancedOpen ? 'Hide advanced delivery controls' : 'Show advanced delivery controls'}
            >
              <Text style={[styles.actionText, { color: palette.textMuted }]}>
                {advancedOpen ? 'Hide advanced delivery details' : 'Advanced delivery details'}
              </Text>
            </Pressable>

            {advancedOpen ? rows.map((row, index) => {
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
                      actionTakenRef.current = true;
                      void track('advanced_control_used', { surface: 'notifications', control: row.key });
                      if (row.key === 'allEnabled') {
                        void setAllEnabled(next);
                        return;
                      }
                      if (row.key === 'quietHoursEnabled') {
                        void track('quiet_hour_preference_saved', {
                          start: preferences?.quietHoursStart ?? '21:00',
                          end: preferences?.quietHoursEnd ?? '08:00',
                          enabled: next,
                        });
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
            }) : null}
            {advancedOpen ? (
              <>
            <View style={[styles.panel, { borderColor: palette.border, backgroundColor: palette.card }]}>
              <Text style={[styles.panelTitle, { color: palette.text }]}>Preferred ritual window</Text>
              <Text style={[styles.panelText, { color: palette.textMuted }]}>
                Astralis schedules one invitation near this hour and moves it away from quiet hours.
              </Text>
              <View style={styles.chipRow}>
                {[19, 20, 21].map((hour) => (
                  <Pressable
                    key={hour}
                    style={({ pressed }) => [
                      styles.chip,
                      { borderColor: preferences?.reminderHourLocal === hour ? palette.accent : palette.border },
                      pressed && styles.pressed,
                    ]}
                    onPress={() => {
                      actionTakenRef.current = true;
                      void track('advanced_control_used', { surface: 'notifications', control: 'reminder_hour' });
                      void setReminderHourLocal(hour);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Set reminder hour to ${hour}:00`}
                  >
                    <Text style={[styles.chipText, { color: palette.text }]}>{hour}:00</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.chipRow}>
                {[
                  ['21:00', '08:00'],
                  ['22:00', '07:00'],
                  ['23:00', '07:30'],
                ].map(([start, end]) => (
                  <Pressable
                    key={`${start}-${end}`}
                    style={({ pressed }) => [styles.chip, { borderColor: palette.border }, pressed && styles.pressed]}
                    onPress={() => {
                      actionTakenRef.current = true;
                      void track('advanced_control_used', { surface: 'notifications', control: 'quiet_hours_window' });
                      void setQuietHoursWindow(start!, end!);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Set quiet hours from ${start} to ${end}`}
                  >
                    <Text style={[styles.chipText, { color: palette.text }]}>{start}-{end}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={[styles.panel, { borderColor: palette.border, backgroundColor: palette.card }]}>
              <View style={styles.row}>
                <View style={styles.textBlock}>
                  <Text style={[styles.rowTitle, { color: palette.text }]}>Silent invitation mode</Text>
                  <Text style={[styles.rowDescription, { color: palette.textMuted }]}>
                    Keep notifications visually quiet. No sound, no pressure.
                  </Text>
                </View>
                <Switch
                  value={silentModeEnabled}
                  disabled={saving}
                  onValueChange={(next) => {
                    actionTakenRef.current = true;
                    void track('advanced_control_used', { surface: 'notifications', control: 'silent_mode' });
                    void setSilentModeEnabled(next);
                  }}
                  trackColor={{ false: isLight ? '#d2d6e7' : 'rgba(154, 160, 194, 0.45)', true: palette.accent }}
                  thumbColor="#ffffff"
                  ios_backgroundColor={isLight ? '#d2d6e7' : 'rgba(154, 160, 194, 0.45)'}
                  accessibilityRole="switch"
                  accessibilityLabel="Silent invitation mode"
                />
              </View>
              <View style={styles.actionRow}>
                <Pressable
                  style={({ pressed }) => [styles.actionButton, { borderColor: palette.border }, pressed && styles.pressed]}
                  onPress={() => {
                    actionTakenRef.current = true;
                    void scheduleNightlyAtmosphericReminder();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Schedule nightly atmospheric reminder"
                >
                  <Text style={[styles.actionText, { color: palette.accent }]}>Schedule calmly</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.actionButton, { borderColor: palette.border }, pressed && styles.pressed]}
                  onPress={() => {
                    actionTakenRef.current = true;
                    void (deliveryState?.paused ? resumeReminders() : pauseReminders(7));
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={deliveryState?.paused ? 'Resume reminders' : 'Pause reminders for seven days'}
                >
                  <Text style={[styles.actionText, { color: palette.textMuted }]}>
                    {deliveryState?.paused ? 'Resume' : 'Pause 7 days'}
                  </Text>
                </Pressable>
              </View>
              <Pressable
                style={({ pressed }) => [styles.resetButton, { borderColor: palette.border }, pressed && styles.pressed]}
                onPress={() => {
                  actionTakenRef.current = true;
                  void track('advanced_control_used', { surface: 'notifications', control: 'reset_personalization' });
                  void resetNotificationPersonalization();
                }}
                accessibilityRole="button"
                accessibilityLabel="Reset notification personalization"
              >
                <Text style={[styles.actionText, { color: palette.textMuted }]}>Reset notification personalization</Text>
              </Pressable>
            </View>
              </>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
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
  statePanel: {
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  stateLabel: { fontSize: 12, lineHeight: 16, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0 },
  stateTitle: { fontSize: 20, lineHeight: 25, fontWeight: '800' },
  feedbackPanel: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  panel: {
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  panelTitle: { fontSize: 18, lineHeight: 23, fontWeight: '800' },
  panelText: { fontSize: 14, lineHeight: 20 },
  presetGrid: {
    gap: spacing.sm,
  },
  presetButton: {
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  presetTitle: { fontSize: 16, lineHeight: 21, fontWeight: '800' },
  presetSummary: { fontSize: 13, lineHeight: 18 },
  disclosure: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  chipText: { fontSize: 13, lineHeight: 18, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  resetButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  actionText: { fontSize: 13, lineHeight: 18, fontWeight: '800', textAlign: 'center' },
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
