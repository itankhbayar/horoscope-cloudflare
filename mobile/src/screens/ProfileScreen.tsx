import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CityPicker } from '../components/CityPicker';
import { useProfile } from '../hooks/useProfile';
import { useAuth } from '../hooks/useAuth';
import { CosmicCard } from '../components/CosmicCard';
import { LoadingBlock } from '../components/LoadingBlock';
import { PremiumAccessCard } from '../components/PremiumAccessCard';
import { ScreenScroll } from '../components/ScreenScroll';
import {
  colors,
  hitSlopComfortable,
  MIN_TOUCH,
  spacing,
} from '../theme';
import { goToAccountSettings, goToAppAppearance, goToManageNotifications, resetToLogin } from '../navigation/navigationRef';
import { toProfileDraft, validateProfileDraft, type ProfileDraft, type ProfileValidation } from './profileForm';
import { useAppearance } from '../hooks/useAppearance';
import { profileStreakLines, normalizeRitualHistory, ritualHistoryCompletedCount, type RitualHistoryDay } from '../lib/streakProfile';
import { shareableMilestoneFor } from '../lib/streakDisplay';
import { shareStreakMilestoneCard } from '../lib/streakShare';
import { getScreenPurpose } from '../lib/emotionalScreenHierarchy';
import { track } from '../lib/analytics';

export function ProfileScreen(): React.JSX.Element {
  const { mode, palette } = useAppearance();
  const { profile, load, save, uploadAvatar, loading, avatarUploading, error } = useProfile();
  const { logout, user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [validation, setValidation] = useState<ProfileValidation>({});
  const [avatarPreviewUri, setAvatarPreviewUri] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [ritualHistoryOpen, setRitualHistoryOpen] = useState(false);
  const historyPurpose = getScreenPurpose('ritual_history');

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!profile || isEditing) return;
    setDraft(toProfileDraft(profile));
  }, [profile, isEditing]);

  const onLogout = useCallback(async (): Promise<void> => {
    await logout();
    resetToLogin();
  }, [logout]);

  const onStartEdit = useCallback((): void => {
    if (!profile) return;
    setDraft(toProfileDraft(profile));
    setValidation({});
    setAvatarError(null);
    setIsEditing(true);
  }, [profile]);

  const onCityQueryChange = useCallback((birthCity: string): void => {
    setDraft((prev) => (prev ? { ...prev, birthCity, selectedCity: null } : prev));
  }, []);

  const onCancelEdit = useCallback((): void => {
    if (profile) setDraft(toProfileDraft(profile));
    setValidation({});
    setAvatarError(null);
    setIsEditing(false);
  }, [profile]);

  const onSaveEdit = useCallback(async (): Promise<void> => {
    if (!draft) return;
    const errors = validateProfileDraft(draft);
    setValidation(errors);
    if (Object.keys(errors).length > 0) return;
    if (!draft.selectedCity) return;

    await save({
      fullName: draft.fullName.trim(),
      birthDate: draft.birthDate,
      birthTime: draft.birthTime.trim() || null,
      birthCity: draft.selectedCity.name,
      birthCountry: draft.selectedCity.country,
      latitude: draft.selectedCity.latitude,
      longitude: draft.selectedCity.longitude,
      timezoneOffset: draft.selectedCity.timezoneOffset,
    });
    setIsEditing(false);
  }, [draft, save]);

  const empty = !loading && !error && !profile;
  const avatarSource = avatarPreviewUri || profile?.user.avatarUrl || null;
  const avatarInitial = (draft?.fullName?.trim().charAt(0) || profile?.user.fullName.charAt(0) || 'A').toUpperCase();
  const zodiacLabel = profile?.natalChart?.sunInfo?.name ?? profile?.natalChart?.sunSign ?? 'Unknown';
  const birthDateLabel = profile?.birthProfile?.birthDate ?? 'Unknown birth date';
  const timezoneLabel = profile?.birthProfile ? `UTC${formatTimezone(profile.birthProfile.timezoneOffset)}` : null;
  const streakLines = profile
    ? profileStreakLines({
        streakCount: profile.user.streakCount,
        longestStreakCount: profile.user.longestStreakCount,
        streakFreezes: profile.user.streakFreezes,
        streakFreezeCap: profile.user.streakFreezeCap,
      })
    : [];
  const ritualHistory = normalizeRitualHistory(profile?.ritualHistory);
  const ritualCompletedCount = ritualHistoryCompletedCount(ritualHistory);
  const shareMilestone = shareableMilestoneFor(profile?.user.streakCount ?? 0);

  const isLight = mode === 'light';

  const onChangeAvatar = useCallback(async (): Promise<void> => {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    const permission = current.granted ? current : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      const deniedMsg = 'Media library permission is required to upload an avatar.';
      setAvatarError(deniedMsg);
      if (!permission.canAskAgain) {
        Alert.alert('Enable Photos Access', deniedMsg, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Settings',
            onPress: () => {
              void Linking.openSettings();
            },
          },
        ]);
      }
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.9,
    });
    if (picked.canceled || picked.assets.length === 0) return;

    const asset = picked.assets[0];
    if (!asset) return;
    const mime = resolveAvatarMimeType(asset.uri, asset.mimeType);
    if (!mime) {
      setAvatarError('Avatar must be jpeg, png, or webp.');
      return;
    }
    if (typeof asset.fileSize === 'number' && asset.fileSize > 5 * 1024 * 1024) {
      setAvatarError('Avatar must be 5MB or smaller.');
      return;
    }

    const uri = asset.uri;
    setAvatarPreviewUri(uri);
    setAvatarLoadFailed(false);
    setAvatarError(null);

    const form = new FormData();
    form.append('avatar', {
      uri,
      name: inferFileName(uri, mime),
      type: mime,
    } as unknown as Blob);

    try {
      await uploadAvatar(form);
      // Keep showing the freshly picked local image to avoid stale-cache/propagation gaps.
      setAvatarLoadFailed(false);
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : 'Failed to upload avatar.');
    }
  }, [uploadAvatar]);

  return (
    <ScreenScroll contentContainerStyle={styles.container}>
      {!isLight ? <View style={styles.backgroundGlowTop} pointerEvents="none" /> : null}
      {!isLight ? <View style={styles.backgroundGlowBottom} pointerEvents="none" /> : null}
      {loading ? <LoadingBlock message="Calculating your sky..." /> : null}
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      {empty ? <Text style={styles.empty}>No profile found yet.</Text> : null}
      {profile ? (
        <>
          <View style={[styles.headerWrap, isLight && styles.headerWrapLight]}>
            {avatarSource && !avatarLoadFailed ? (
              <Image
                source={{ uri: avatarSource }}
                style={styles.avatarImage}
                accessibilityLabel="Profile avatar"
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : (
              <View style={styles.avatar} accessibilityLabel="Profile avatar placeholder">
                <Text style={styles.avatarText}>{avatarInitial}</Text>
              </View>
            )}
            <Pressable
              style={({ pressed }) => [styles.avatarEditBtn, pressed && styles.pressed]}
              onPress={() => void onChangeAvatar()}
              disabled={avatarUploading}
              hitSlop={hitSlopComfortable}
            >
              <Text style={styles.avatarEditBtnText}>{avatarUploading ? '…' : '✎'}</Text>
            </Pressable>
            <Text style={[styles.name, isLight && { color: palette.text }]} accessibilityRole="header">
              {profile.user.fullName}
            </Text>
            {user ? <Text style={[styles.sub, isLight && { color: palette.textMuted }]}>{user.email}</Text> : null}
            <View style={styles.metaRow}>
              <InfoPill icon="☉" label={zodiacLabel} />
              <InfoPill icon="☽" label={birthDateLabel} />
              {timezoneLabel ? <InfoPill icon="⌛" label={timezoneLabel} /> : null}
            </View>
            <View style={styles.streakSummary}>
              <Text style={[styles.streakLine, isLight && { color: palette.textMuted }]}>
                {ritualCompletedCount > 0 ? 'Your recent ritual rhythm is here.' : 'Your ritual memory is quiet for now.'}
              </Text>
              {ritualHistoryOpen ? (
                <>
                  {streakLines.slice(0, 1).map((line) => (
                    <Text key={line} style={[styles.streakLine, isLight && { color: palette.textMuted }]}>
                      {line}
                    </Text>
                  ))}
                  <RitualHistoryConstellation history={ritualHistory} isLight={isLight} />
                </>
              ) : null}
              {ritualHistory.length > 0 ? (
                <Pressable
                  style={({ pressed }) => [styles.historyToggle, pressed && styles.pressed]}
                  onPress={() => {
                    setRitualHistoryOpen((current) => !current);
                    void track('text_expansion_used', { screen: historyPurpose.screen, moment: historyPurpose.moment });
                    void track('hidden_control_discovered', { screen: historyPurpose.screen, control: 'ritual_history_constellation' });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={ritualHistoryOpen ? 'Hide ritual memory fragments' : 'Open ritual memory fragments'}
                >
                  <Text style={[styles.historyToggleText, isLight && { color: palette.accent }]}>
                    {ritualHistoryOpen ? 'Close memory fragments' : 'Open memory fragments'}
                  </Text>
                </Pressable>
              ) : null}
              {shareMilestone ? (
                <Pressable
                  style={({ pressed }) => [styles.streakShareBtn, pressed && styles.pressed]}
                  onPress={() =>
                    void shareStreakMilestoneCard({
                      milestone: shareMilestone,
                      zodiacSign: profile.natalChart?.sunSign ?? null,
                      displayName: profile.user.displayName ?? profile.user.fullName,
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Share ritual streak"
                  hitSlop={hitSlopComfortable}
                >
                  <Text style={styles.streakShareText}>Share ritual</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          {avatarError ? <Text style={styles.error}>{avatarError}</Text> : null}
          {!isEditing ? (
            <>
              <SettingsGroup isLight={isLight}>
                <SettingsItem icon="✎" label="Edit Profile" onPress={onStartEdit} />
                <SettingsItem icon="↻" label="Account Settings" onPress={goToAccountSettings} />
                <SettingsItem icon="🔔︎" label="Manage Notifications" onPress={goToManageNotifications} />
                <SettingsItem icon="◐" label="App Appearance" onPress={goToAppAppearance} last />
              </SettingsGroup>
              <PremiumAccessCard />
              <Pressable
                style={({ pressed }) => [styles.logoutBtn, isLight && styles.logoutBtnLight, pressed && styles.pressed]}
                onPress={() => void onLogout()}
                accessibilityRole="button"
                accessibilityLabel="Sign out"
                hitSlop={hitSlopComfortable}
              >
                <Text style={[styles.logoutText, isLight && { color: palette.text }]}>Log out</Text>
              </Pressable>
            </>
          ) : draft ? (
            <CosmicCard title="Edit profile" style={styles.editorCard}>
              <Field
                label="Name"
                value={draft.fullName}
                onChangeText={(v) => setDraft((prev) => (prev ? { ...prev, fullName: v } : prev))}
                error={validation.fullName}
              />
              <Field label="Email" value={draft.email} editable={false} />
              <Text style={styles.microcopy}>
                Sun, moon, and rising signs are recalculated from your saved birth time and birthplace.
              </Text>
              <Field
                label="Birth date (YYYY-MM-DD)"
                value={draft.birthDate}
                onChangeText={(v) => setDraft((prev) => (prev ? { ...prev, birthDate: v } : prev))}
                error={validation.birthDate}
                autoCapitalize="none"
              />
              <Field
                label="Birth time (HH:MM, optional)"
                value={draft.birthTime}
                onChangeText={(v) => setDraft((prev) => (prev ? { ...prev, birthTime: v } : prev))}
                error={validation.birthTime}
                autoCapitalize="none"
              />
              <CityPicker
                label="Birth city"
                query={draft.birthCity}
                selectedCity={draft.selectedCity}
                onQueryChange={onCityQueryChange}
                onSelectCity={(selectedCity) =>
                  setDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          selectedCity,
                          birthCity: selectedCity.displayLabel,
                          timezone: String(selectedCity.timezoneOffset),
                        }
                      : prev,
                  )
                }
                error={validation.birthCity}
              />
              <Field
                label="Timezone (e.g. +8, -5)"
                value={draft.timezone}
                onChangeText={(v) => setDraft((prev) => (prev ? { ...prev, timezone: v } : prev))}
                error={validation.timezone}
                autoCapitalize="none"
              />
              <View style={styles.row}>
                <Pressable
                  style={({ pressed }) => [styles.secondaryHalf, pressed && styles.pressed]}
                  onPress={onCancelEdit}
                >
                  <Text style={styles.secondaryText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.primaryHalf, pressed && styles.pressed]}
                  onPress={() => void onSaveEdit()}
                >
                  <Text style={styles.primaryText}>Save</Text>
                </Pressable>
              </View>
            </CosmicCard>
          ) : null}
        </>
      ) : null}
    </ScreenScroll>
  );
}

function inferFileName(uri: string, mimeType: string): string {
  const normalized = uri.split('?')[0] ?? '';
  const fromUri = normalized.split('/').pop();
  if (fromUri && fromUri.includes('.')) return fromUri;
  const ext =
    mimeType === 'image/png'
      ? 'png'
      : mimeType === 'image/webp'
        ? 'webp'
        : 'jpg';
  return `avatar.${ext}`;
}

function resolveAvatarMimeType(uri: string, rawMimeType?: string | null): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  const fromMime = (rawMimeType ?? '').toLowerCase().trim();
  if (fromMime === 'image/jpeg' || fromMime === 'image/jpg') return 'image/jpeg';
  if (fromMime === 'image/png') return 'image/png';
  if (fromMime === 'image/webp') return 'image/webp';

  const normalized = uri.split('?')[0] ?? '';
  const ext = normalized.includes('.') ? normalized.split('.').pop()?.toLowerCase() : '';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return null;
}

function RitualHistoryConstellation({
  history,
  isLight,
}: {
  history: RitualHistoryDay[];
  isLight: boolean;
}): React.JSX.Element | null {
  if (history.length === 0) return null;
  return (
    <View style={styles.ritualHistory} accessibilityLabel="Last 30 days ritual history">
      {history.map((day) => (
        <View
          key={day.date}
          style={[
            styles.ritualDot,
            day.completed ? styles.ritualDotComplete : styles.ritualDotEmpty,
            isLight && (day.completed ? styles.ritualDotCompleteLight : styles.ritualDotEmptyLight),
          ]}
        />
      ))}
    </View>
  );
}

function InfoPill({ icon, label }: { icon: string; label: string }): React.JSX.Element {
  const { mode, palette } = useAppearance();
  const isLight = mode === 'light';
  return (
    <View style={[styles.metaPill, isLight && { backgroundColor: '#eef1ff', borderColor: '#d1d9ff' }]}>
      <Text style={[styles.metaIcon, isLight && { color: '#6071b6' }]}>{icon}</Text>
      <Text style={[styles.metaText, isLight && { color: palette.text }]}>{label}</Text>
    </View>
  );
}

function SettingsGroup({ children, isLight }: { children: React.ReactNode; isLight: boolean }): React.JSX.Element {
  return <View style={[styles.settingsCard, isLight && styles.settingsCardLight]}>{children}</View>;
}

function SettingsItem({
  icon,
  label,
  onPress,
  last = false,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  last?: boolean;
}): React.JSX.Element {
  const { mode, palette } = useAppearance();
  const isLight = mode === 'light';
  return (
    <Pressable style={({ pressed }) => [styles.settingsItem, pressed && styles.pressed]} onPress={onPress}>
      <Text style={[styles.settingsIcon, isLight && { color: '#6474ba' }]}>{icon}</Text>
      <Text style={[styles.settingsLabel, isLight && { color: palette.text }]}>{label}</Text>
      {!last ? <View style={[styles.settingsDivider, isLight && { borderBottomColor: '#d8def8' }]} /> : null}
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  error,
  editable = true,
  autoCapitalize = 'words',
}: {
  label: string;
  value: string;
  onChangeText?: (value: string) => void;
  error?: string;
  editable?: boolean;
  autoCapitalize?: 'none' | 'words';
}): React.JSX.Element {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, !editable && styles.inputDisabled]}
        editable={editable}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize={autoCapitalize}
        placeholderTextColor={colors.textMuted}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function formatTimezone(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  backgroundGlowTop: {
    position: 'absolute',
    top: -140,
    left: -40,
    right: -40,
    height: 320,
    borderRadius: 220,
    backgroundColor: 'rgba(116, 93, 255, 0.28)',
  },
  backgroundGlowBottom: {
    position: 'absolute',
    bottom: -220,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 160,
    backgroundColor: 'rgba(82, 54, 169, 0.25)',
  },
  headerWrap: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(159, 151, 255, 0.25)',
    backgroundColor: 'rgba(18, 20, 47, 0.8)',
    shadowColor: '#6047d7',
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  headerWrapLight: {
    backgroundColor: '#ffffff',
    borderColor: '#dfe4ff',
    shadowColor: '#9ba6d9',
    shadowOpacity: 0.16,
  },
  name: { color: colors.text, fontWeight: '700', fontSize: 27, marginTop: spacing.md },
  sub: { color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md, fontSize: 14 },
  error: { color: colors.danger, marginBottom: spacing.xs },
  empty: { color: colors.textMuted, marginBottom: spacing.md, fontSize: 15, textAlign: 'center' },
  avatar: {
    height: 116,
    width: 116,
    borderRadius: 58,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(195, 184, 255, 0.45)',
  },
  avatarText: { color: colors.text, fontWeight: '700', fontSize: 42 },
  avatarImage: {
    height: 116,
    width: 116,
    borderRadius: 58,
    borderWidth: 3,
    borderColor: 'rgba(195, 184, 255, 0.45)',
  },
  avatarEditBtn: {
    position: 'absolute',
    top: 92,
    marginLeft: 84,
    height: 36,
    width: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(200, 191, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6a55e9',
  },
  avatarEditBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  metaRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  streakSummary: {
    marginTop: spacing.sm,
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.md,
  },
  streakLine: {
    color: '#dfe1f6',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  ritualHistory: {
    width: '100%',
    maxWidth: 250,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xs,
    marginBottom: 2,
  },
  historyToggle: {
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  historyToggleText: {
    color: '#d9d1ff',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },
  ritualDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  ritualDotComplete: {
    backgroundColor: '#cfc5ff',
    borderColor: 'rgba(247, 230, 166, 0.75)',
    shadowColor: '#b8a8ff',
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  ritualDotEmpty: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(207,197,255,0.22)',
  },
  ritualDotCompleteLight: {
    backgroundColor: '#7266d8',
    borderColor: '#b6a8ff',
  },
  ritualDotEmptyLight: {
    backgroundColor: '#eef1ff',
    borderColor: '#d1d9ff',
  },
  streakShareBtn: {
    marginTop: spacing.xs,
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(207,197,255,0.35)',
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  streakShareText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(159, 151, 255, 0.35)',
    backgroundColor: 'rgba(34, 36, 73, 0.7)',
    paddingHorizontal: spacing.sm,
    minHeight: 30,
  },
  metaIcon: { color: '#c2b4ff', fontSize: 14 },
  metaText: { color: '#dfe1f6', fontSize: 13, fontWeight: '600' },
  settingsCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(159, 151, 255, 0.28)',
    backgroundColor: 'rgba(20, 22, 52, 0.82)',
    overflow: 'hidden',
    marginBottom: spacing.md,
    shadowColor: '#6a55e9',
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  settingsCardLight: {
    backgroundColor: '#ffffff',
    borderColor: '#dfe4ff',
    shadowColor: '#9ba6d9',
    shadowOpacity: 0.12,
  },
  settingsItem: {
    minHeight: MIN_TOUCH + 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: 'relative',
  },
  settingsIcon: { width: 24, color: '#c7bbff', fontSize: 18, textAlign: 'center' },
  settingsLabel: { color: colors.text, fontSize: 17, fontWeight: '600', marginLeft: spacing.sm },
  settingsDivider: {
    position: 'absolute',
    left: spacing.md + 30,
    right: spacing.md,
    bottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(159, 151, 255, 0.25)',
  },
  logoutBtn: {
    minHeight: MIN_TOUCH + 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(215, 209, 255, 0.7)',
    backgroundColor: 'rgba(20, 22, 52, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  logoutBtnLight: {
    backgroundColor: '#ffffff',
    borderColor: '#dfe4ff',
  },
  logoutText: { color: colors.text, fontWeight: '700', fontSize: 17 },
  editorCard: { marginTop: spacing.sm },
  fieldWrap: { marginBottom: spacing.sm },
  fieldLabel: { color: colors.textMuted, marginBottom: spacing.xs, fontSize: 13 },
  microcopy: { color: colors.textMuted, marginBottom: spacing.sm, fontSize: 13, lineHeight: 18 },
  input: {
    minHeight: MIN_TOUCH,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 15,
  },
  inputDisabled: { opacity: 0.7 },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  secondaryHalf: {
    flex: 1,
    minHeight: MIN_TOUCH,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryHalf: {
    flex: 1,
    minHeight: MIN_TOUCH,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryText: { color: colors.accent, fontWeight: '600', fontSize: 16 },
  pressed: { opacity: 0.85 },
});
