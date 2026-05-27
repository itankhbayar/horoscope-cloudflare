import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { CosmicCard } from './CosmicCard';
import { bodyFontSize, bodyLineHeight, colors, hitSlopComfortable, MIN_TOUCH, spacing } from '../theme';
import { useAppearance } from '../hooks/useAppearance';
import { usePremiumCheckout } from '../hooks/usePremiumCheckout';
import { usesRevenueCatBilling } from '../lib/billing/platform';
import { goToPremium } from '../navigation/navigationRef';
import { track } from '../lib/analytics';
import { useI18n } from '../i18n';

export function PremiumAccessCard(): React.JSX.Element {
  const { width } = useWindowDimensions();
  const { t } = useI18n();
  const { palette } = useAppearance();
  const { busy, isPremium, message, upgrade, manageBilling, refreshStatus, purchasesConfigured } =
    usePremiumCheckout();
  const isIosIap = usesRevenueCatBilling();
  const purchasesUnavailable = isIosIap && !purchasesConfigured;

  const bodySize = useMemo(() => bodyFontSize(width), [width]);
  const lineHeight = useMemo(() => bodyLineHeight(width), [width]);
  const onUpgrade = useCallback(() => {
    void track('paywall_viewed', { source: 'profile_card' });
    goToPremium('profile_card');
  }, []);
  const onManageBilling = useCallback(() => void manageBilling(), [manageBilling]);
  const onRefreshStatus = useCallback(() => void refreshStatus(), [refreshStatus]);

  const bodyCopy = purchasesUnavailable
    ? t('premium.cardUnavailable')
    : isIosIap
      ? t('premium.cardIos')
      : t('premium.cardStripe');

  const upgradeLabel = purchasesUnavailable
    ? t('premium.cardPurchasesNotConfigured')
    : isPremium
      ? isIosIap
        ? t('premium.cardManageAppStore')
        : t('premium.cardUpdatePayment')
      : isIosIap
        ? t('premium.cardSubscribeApple')
        : t('premium.cardUpgradeStripe');

  return (
    <CosmicCard title={t('premium.cardTitle')}>
      <View
        style={[
          styles.planStatus,
          isPremium ? styles.planStatusActive : styles.planStatusFree,
          { borderColor: palette.border },
        ]}
      >
        <Text style={[styles.statusLabel, { color: palette.textMuted }]}>{t('premium.currentPlan')}</Text>
        <Text style={[styles.statusValue, { color: palette.text }]}>{isPremium ? t('premium.planActive') : t('premium.planFree')}</Text>
      </View>
      <Text style={[styles.body, { fontSize: bodySize, lineHeight, color: palette.textMuted }]}>{bodyCopy}</Text>

      <Pressable
        style={({ pressed }) => [
          styles.primary,
          { backgroundColor: palette.accent },
          busy && styles.disabled,
          pressed && styles.pressed,
        ]}
        onPress={onUpgrade}
        disabled={busy || purchasesUnavailable}
        accessibilityRole="button"
        accessibilityLabel={isIosIap ? t('premium.cardSubscribeAppleA11y') : t('premium.cardUpgradeStripeA11y')}
        accessibilityState={{ disabled: busy }}
        hitSlop={hitSlopComfortable}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryText}>{upgradeLabel}</Text>
        )}
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.secondary,
          { borderColor: palette.border },
          busy && styles.disabled,
          pressed && styles.pressed,
        ]}
        onPress={onManageBilling}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={
          isIosIap ? t('premium.cardManageAppStoreA11y') : t('premium.cardManagePortalA11y')
        }
        hitSlop={hitSlopComfortable}
      >
        <Text style={[styles.secondaryText, { color: palette.accent }]}>
          {isIosIap ? t('premium.cardManageAppStoreButton') : t('premium.cardManagePortalButton')}
        </Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          styles.secondary,
          { borderColor: palette.border },
          busy && styles.disabled,
          pressed && styles.pressed,
        ]}
        onPress={onRefreshStatus}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={isIosIap ? t('premium.cardRestoreAppleA11y') : t('premium.cardRefreshStatusA11y')}
        hitSlop={hitSlopComfortable}
      >
        <Text style={[styles.secondaryText, { color: palette.accent }]}>
          {isIosIap ? t('premium.cardRestoreApple') : t('premium.cardRefreshStatus')}
        </Text>
      </Pressable>

      {message ? (
        <Text style={[styles.feedback, { color: palette.text }]} accessibilityLiveRegion="polite">
          {message}
        </Text>
      ) : null}
    </CosmicCard>
  );
}

const styles = StyleSheet.create({
  planStatus: {
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  planStatusActive: {
    backgroundColor: 'rgba(102, 78, 236, 0.36)',
  },
  planStatusFree: {
    backgroundColor: 'rgba(42, 30, 90, 0.25)',
  },
  statusLabel: {
    fontSize: 12,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statusValue: { fontWeight: '700', fontSize: 16 },
  body: { color: colors.textMuted },
  primary: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    minHeight: MIN_TOUCH,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondary: {
    marginTop: spacing.sm,
    minHeight: MIN_TOUCH,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  secondaryText: { color: colors.accent, fontWeight: '600', fontSize: 15 },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.88 },
  feedback: { marginTop: spacing.md, color: colors.text, fontSize: 15, lineHeight: 22 },
});
