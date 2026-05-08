import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
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
        <Text style={[styles.info, { color: palette.text }]}>{INFO_COPY}</Text>

        <Pressable
          onPress={onPressDelete}
          style={({ pressed }) => [
            styles.deleteButton,
            { backgroundColor: isLight ? '#2f2f95' : palette.accent },
            (pressed || deleting) && styles.pressed,
          ]}
          disabled={deleting}
          accessibilityRole="button"
          accessibilityLabel="Delete my account"
        >
          <Text style={styles.deleteButtonText}>{deleting ? 'Deleting…' : 'Delete my account'}</Text>
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
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 19,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  info: {
    fontSize: 17,
    lineHeight: 24,
    marginBottom: spacing.xxxl,
  },
  deleteButton: {
    minHeight: 54,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    marginTop: 'auto',
    marginBottom: spacing.md,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '500',
  },
  pressed: { opacity: 0.84 },
});
