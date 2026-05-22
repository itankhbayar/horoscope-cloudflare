import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { spacing } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { resetToLogin } from '../navigation/navigationRef';
import { useAppearance } from '../hooks/useAppearance';

type RootNav = NativeStackNavigationProp<RootStackParamList>;

const INFO_COPY =
  'When you delete your account, all personal identifiable information including your name, email, birth date/time, location information, and other stored account data will be permanently removed from our servers immediately. This action cannot be undone.';

export function DeleteAccountScreen(): React.JSX.Element {
  const navigation = useNavigation<RootNav>();
  const { deleteAccount } = useAuth();
  const { mode, palette } = useAppearance();
  const isLight = mode === 'light';
  const dangerBase = isLight ? '#b03052' : '#ef6181';
  const dangerCardBg = isLight ? '#fff2f6' : 'rgba(239, 97, 129, 0.14)';
  const dangerCardBorder = isLight ? '#f3c8d6' : 'rgba(239, 97, 129, 0.38)';
  const neutralButtonBg = isLight ? '#ffffff' : palette.surface;
  const [deleting, setDeleting] = useState(false);

  const runDelete = useCallback(async (): Promise<void> => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteAccount();
      resetToLogin();
      Alert.alert('Success', 'Your account has been deleted.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete account.';
      Alert.alert('Delete failed', message);
    } finally {
      setDeleting(false);
    }
  }, [deleteAccount, deleting]);

  const onPressDelete = useCallback((): void => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void runDelete() },
      ],
    );
  }, [runDelete]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: isLight ? '#f3f3f6' : palette.background }]} edges={['left', 'right', 'top']}>
      <View pointerEvents="none" style={[styles.glowTop, { backgroundColor: isLight ? 'rgba(175, 162, 255, 0.2)' : 'rgba(108, 92, 214, 0.25)' }]} />
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

        <Text style={[styles.title, { color: palette.text }]}>Delete Account</Text>
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>Delete your account from our servers</Text>

        <WarningCard
          title="This action is irreversible"
          items={[
            'Your account will be permanently deleted',
            'All personal data will be removed',
            'This action cannot be undone',
          ]}
          titleColor={dangerBase}
          textColor={isLight ? '#8f3b56' : '#f0b7c5'}
          style={{ backgroundColor: dangerCardBg, borderColor: dangerCardBorder }}
        />

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: isLight ? '#f9f9fe' : palette.surface,
              borderColor: isLight ? '#e2e4f4' : palette.border,
              shadowColor: isLight ? '#9fa7cf' : '#0a0d22',
            },
          ]}
        >
          <Text style={[styles.infoHeading, { color: palette.text }]}>What will happen next</Text>
          <Text style={[styles.infoBlock, { color: palette.textMuted }]}>
            {INFO_COPY}
          </Text>
          <Text style={[styles.infoBlock, { color: palette.textMuted }]}>
            You will be logged out immediately after deletion, and the app will return you to the sign-in flow.
          </Text>
          <Text style={[styles.infoBlock, { color: palette.textMuted }]}>
            If you have an active subscription, also cancel or manage it in Apple App Store or Google Play billing
            settings. Account deletion does not always cancel store-managed subscriptions.
          </Text>
        </View>

        <DangerButton
          onPress={onPressDelete}
          label={deleting ? 'Deleting…' : 'Delete my account'}
          disabled={deleting}
          backgroundColor={dangerBase}
          accessibilityLabel="Delete my account"
        />
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              backgroundColor: neutralButtonBg,
              borderColor: isLight ? '#d8dcec' : palette.border,
            },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Keep my account"
        >
          <Text style={[styles.secondaryButtonText, { color: palette.text }]}>Keep my account</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function WarningCard({
  title,
  items,
  titleColor,
  textColor,
  style,
}: {
  title: string;
  items: string[];
  titleColor: string;
  textColor: string;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  return (
    <View style={[styles.warningCard, style]}>
      <Text style={[styles.warningTitle, { color: titleColor }]}>{title}</Text>
      <View style={styles.warningList}>
        {items.map((item) => (
          <View key={item} style={styles.warningRow}>
            <Text style={[styles.warningBullet, { color: titleColor }]}>•</Text>
            <Text style={[styles.warningText, { color: textColor }]}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function DangerButton({
  onPress,
  label,
  disabled,
  backgroundColor,
  accessibilityLabel,
}: {
  onPress: () => void;
  label: string;
  disabled: boolean;
  backgroundColor: string;
  accessibilityLabel: string;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.deleteButton,
        { backgroundColor, opacity: disabled ? 0.65 : 1 },
        (pressed || disabled) && styles.pressed,
      ]}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={styles.deleteButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  glowTop: {
    position: 'absolute',
    top: -170,
    left: -40,
    right: -40,
    height: 340,
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
  backChevron: {
    fontSize: 34,
    lineHeight: 34,
    marginTop: -2,
  },
  title: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  warningCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  warningTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  warningList: {
    gap: 6,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  warningBullet: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  infoCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.md,
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    marginBottom: spacing.lg,
  },
  infoHeading: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  infoBlock: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.sm,
  },
  deleteButton: {
    minHeight: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    marginTop: 'auto',
    marginBottom: spacing.sm,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xxxl,
  },
  secondaryButtonText: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
  pressed: { opacity: 0.84 },
});
