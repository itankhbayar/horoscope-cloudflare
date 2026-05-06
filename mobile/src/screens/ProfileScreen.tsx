import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useProfile } from '../hooks/useProfile';
import { useAuth } from '../hooks/useAuth';
import { CosmicCard } from '../components/CosmicCard';
import { LoadingBlock } from '../components/LoadingBlock';
import { ScreenScroll } from '../components/ScreenScroll';
import {
  bodyFontSize,
  bodyLineHeight,
  colors,
  hitSlopComfortable,
  MIN_TOUCH,
  screenTitleSize,
  spacing,
} from '../theme';
import { ZODIAC_SIGNS } from '@astralis/lib/zodiac';
import { resetToLogin } from '../navigation/navigationRef';
import { toProfileDraft, validateProfileDraft, type ProfileDraft, type ProfileValidation } from './profileForm';

export function ProfileScreen(): React.JSX.Element {
  const { width } = useWindowDimensions();
  const { profile, load, recompute, save, loading, error } = useProfile();
  const { logout, user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [validation, setValidation] = useState<ProfileValidation>({});

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

  const onRecompute = useCallback((): void => {
    void recompute();
  }, [recompute]);

  const onStartEdit = useCallback((): void => {
    if (!profile) return;
    setDraft(toProfileDraft(profile));
    setValidation({});
    setIsEditing(true);
  }, [profile]);

  const onCancelEdit = useCallback((): void => {
    if (profile) setDraft(toProfileDraft(profile));
    setValidation({});
    setIsEditing(false);
  }, [profile]);

  const onSaveEdit = useCallback(async (): Promise<void> => {
    if (!draft) return;
    const errors = validateProfileDraft(draft);
    setValidation(errors);
    if (Object.keys(errors).length > 0) return;

    await save({
      fullName: draft.fullName.trim(),
      zodiacSign: draft.zodiacSign,
      birthDate: draft.birthDate,
      timezoneOffset: Number(draft.timezone),
    });
    setIsEditing(false);
  }, [draft, save]);

  const titleSize = useMemo(() => screenTitleSize(width), [width]);
  const bodyFont = useMemo(() => bodyFontSize(width), [width]);
  const bodyLine = useMemo(() => bodyLineHeight(width), [width]);

  const empty = !loading && !error && !profile;

  return (
    <ScreenScroll>
      <Text style={[styles.title, { fontSize: titleSize }]} accessibilityRole="header">
        Profile
      </Text>
      {user ? <Text style={styles.sub}>{user.fullName} · {user.email}</Text> : null}
      {loading ? <LoadingBlock message="Casting chart…" /> : null}
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      {empty ? <Text style={styles.empty}>No profile found yet.</Text> : null}
      {profile ? (
        <CosmicCard title="Your profile">
          <View style={styles.avatar} accessibilityLabel="Profile avatar placeholder">
            <Text style={styles.avatarText}>
              {(draft?.fullName?.trim().charAt(0) || profile.user.fullName.charAt(0) || 'A').toUpperCase()}
            </Text>
          </View>
          {!isEditing ? (
            <View style={styles.block}>
              <LabelValue label="Name" value={profile.user.fullName} fontSize={bodyFont} lineHeight={bodyLine} />
              <LabelValue label="Email" value={profile.user.email} fontSize={bodyFont} lineHeight={bodyLine} />
              <LabelValue
                label="Zodiac sign"
                value={profile.natalChart?.sunInfo?.name ?? profile.natalChart?.sunSign ?? '—'}
                fontSize={bodyFont}
                lineHeight={bodyLine}
              />
              <LabelValue
                label="Birth date"
                value={profile.birthProfile?.birthDate ?? '—'}
                fontSize={bodyFont}
                lineHeight={bodyLine}
              />
              <LabelValue
                label="Timezone"
                value={profile.birthProfile ? `UTC${formatTimezone(profile.birthProfile.timezoneOffset)}` : '—'}
                fontSize={bodyFont}
                lineHeight={bodyLine}
              />
              <Pressable
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                onPress={onStartEdit}
                hitSlop={hitSlopComfortable}
              >
                <Text style={styles.secondaryText}>Edit Profile</Text>
              </Pressable>
            </View>
          ) : draft ? (
            <View style={styles.block}>
              <Field
                label="Name"
                value={draft.fullName}
                onChangeText={(v) => setDraft((prev) => (prev ? { ...prev, fullName: v } : prev))}
                error={validation.fullName}
              />
              <Field label="Email" value={draft.email} editable={false} />
              <Text style={styles.fieldLabel}>Zodiac sign</Text>
              <View style={styles.signGrid}>
                {ZODIAC_SIGNS.map((z) => {
                  const active = draft.zodiacSign === z.key;
                  return (
                    <Pressable
                      key={z.key}
                      style={({ pressed }) => [styles.signChip, active && styles.signChipActive, pressed && styles.pressed]}
                      onPress={() => setDraft((prev) => (prev ? { ...prev, zodiacSign: z.key } : prev))}
                    >
                      <Text style={styles.signChipText}>{z.symbol}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {validation.zodiacSign ? <Text style={styles.error}>{validation.zodiacSign}</Text> : null}
              <Field
                label="Birth date (YYYY-MM-DD)"
                value={draft.birthDate}
                onChangeText={(v) => setDraft((prev) => (prev ? { ...prev, birthDate: v } : prev))}
                error={validation.birthDate}
                autoCapitalize="none"
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
            </View>
          ) : null}
        </CosmicCard>
      ) : null}
      <Pressable
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        onPress={onRecompute}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Recompute natal chart"
        accessibilityState={{ disabled: loading }}
        hitSlop={hitSlopComfortable}
      >
        <Text style={styles.secondaryText}>Recompute chart</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.dangerBtn, pressed && styles.pressed]}
        onPress={() => void onLogout()}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        hitSlop={hitSlopComfortable}
      >
        <Text style={styles.dangerText}>Sign out</Text>
      </Pressable>
    </ScreenScroll>
  );
}

function LabelValue({
  label,
  value,
  fontSize,
  lineHeight,
}: {
  label: string;
  value: string;
  fontSize: number;
  lineHeight: number;
}): React.JSX.Element {
  return (
    <View style={styles.item}>
      <Text style={styles.itemLabel}>{label}</Text>
      <Text style={[styles.itemValue, { fontSize, lineHeight }]}>{value}</Text>
    </View>
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
  title: { fontWeight: '700', color: colors.text },
  sub: { color: colors.textMuted, marginBottom: spacing.sm, fontSize: 15 },
  error: { color: colors.danger, marginBottom: spacing.xs },
  empty: { color: colors.textMuted, marginBottom: spacing.md, fontSize: 15 },
  avatar: {
    height: 64,
    width: 64,
    borderRadius: 32,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { color: colors.text, fontWeight: '700', fontSize: 24 },
  block: { gap: spacing.xs },
  item: { marginBottom: spacing.sm },
  itemLabel: { color: colors.textMuted, fontSize: 13, marginBottom: 2 },
  itemValue: { color: colors.text },
  fieldWrap: { marginBottom: spacing.sm },
  fieldLabel: { color: colors.textMuted, marginBottom: spacing.xs, fontSize: 13 },
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
  signGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.xs },
  signChip: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  signChipActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  signChipText: { color: colors.text, fontSize: 18 },
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
  secondary: {
    marginTop: spacing.sm,
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.accent, fontWeight: '600', fontSize: 16 },
  dangerBtn: {
    marginTop: spacing.md,
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    backgroundColor: 'rgba(229,115,115,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerText: { color: colors.danger, fontWeight: '700', fontSize: 16 },
  pressed: { opacity: 0.85 },
});
