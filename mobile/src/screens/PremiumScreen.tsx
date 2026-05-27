import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import type { AppearancePalette } from '../hooks/useAppearance';
import { useAppearance } from '../hooks/useAppearance';
import {
  bodyFontSize,
  bodyLineHeight,
  colors,
  hitSlopComfortable,
  horizontalScreenPadding,
  MIN_TOUCH,
  screenTitleSize,
  spacing,
  tabScrollBottomPadding,
} from '../theme';
import { usePremiumCheckout } from '../hooks/usePremiumCheckout';
import { useProfile } from '../hooks/useProfile';
import { usesRevenueCatBilling } from '../lib/billing/platform';
import { readRevenueCatConfigurationStatus } from '../lib/revenueCat/config';
import type { PremiumPlanDisplay } from '../lib/revenueCat/packages';
import { track } from '../lib/analytics';
import {
  getEmotionalPatternMemory,
  summarizeEmotionalPatternMemory,
  type EmotionalPatternSummary,
} from '../lib/emotionalPatternMemory';
import { getScreenPurpose } from '../lib/emotionalScreenHierarchy';
import { useI18n } from '../i18n';
import type { RootStackParamList } from '../navigation/types';

type PremiumFeature = {
  title: string;
  value: string;
  accent: string;
};

type ComparisonRow = {
  label: string;
  free: string;
  premium: string;
};

const PREMIUM_EXPERIMENT = {
  variant: 'pattern-memory-v1',
  trialDays: null as number | null,
  urgencyCopy: 'Built for people who come back to their readings and want the pattern, not just the moment.',
};

export function PremiumScreen(): React.JSX.Element {
  const route = useRoute<RouteProp<RootStackParamList, 'Premium'>>();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { palette, mode } = useAppearance();
  const {
    busy,
    isPremium,
    message,
    upgrade,
    manageBilling,
    refreshStatus,
    purchasesConfigured,
    premiumPlans,
    premiumPlansLoading,
    premiumPlansError,
  } = usePremiumCheckout();
  const { profile, load: loadProfile } = useProfile();
  const isIosIap = usesRevenueCatBilling();
  const purchasesUnavailable = isIosIap && !purchasesConfigured;
  const revenueCatStatus = useMemo(() => (isIosIap ? readRevenueCatConfigurationStatus() : null), [isIosIap]);
  const [selectedPlanId, setSelectedPlanId] = useState<PremiumPlanDisplay['id']>('yearly');
  const [memorySummary, setMemorySummary] = useState<EmotionalPatternSummary | null>(null);
  const [continuityDetailsOpen, setContinuityDetailsOpen] = useState(true);
  const fade = useRef(new Animated.Value(0)).current;
  const screenPurpose = useMemo(() => getScreenPurpose('premium'), []);

  const hp = horizontalScreenPadding(width);
  const titleSize = screenTitleSize(width) + 8;
  const bodySize = bodyFontSize(width);
  const lineHeight = bodyLineHeight(width);
  const selectedPlan = useMemo(
    (): PremiumPlanDisplay => premiumPlans.find((plan) => plan.id === selectedPlanId) ?? premiumPlans[1] ?? premiumPlans[0]!,
    [premiumPlans, selectedPlanId],
  );
  const selectedPlanUnavailable = !selectedPlan.available || premiumPlansLoading;
  const stickyReserve = spacing.xxxl + 76;
  const bottomPadding = tabScrollBottomPadding(insets, stickyReserve);
  const isLight = mode === 'light';
  const features: PremiumFeature[] = useMemo(
    () => [
      { title: t('premium.featurePatternTitle'), value: t('premium.featurePatternBody'), accent: '#c9a34a' },
      { title: t('premium.featureTimingTitle'), value: t('premium.featureTimingBody'), accent: '#e0789b' },
      { title: t('premium.featureTarotTitle'), value: t('premium.featureTarotBody'), accent: '#7bd3d0' },
      { title: t('premium.featureQuietTitle'), value: t('premium.featureQuietBody'), accent: '#a88cff' },
    ],
    [t],
  );
  const comparison: ComparisonRow[] = useMemo(
    () => [
      { label: t('premium.compareDaily'), free: t('premium.compareDailyFree'), premium: t('premium.compareDailyPremium') },
      { label: t('premium.compareMemory'), free: t('premium.compareMemoryFree'), premium: t('premium.compareMemoryPremium') },
      { label: t('premium.compareTarot'), free: t('premium.compareTarotFree'), premium: t('premium.compareTarotPremium') },
      { label: t('premium.compareRelationships'), free: t('premium.compareRelationshipsFree'), premium: t('premium.compareRelationshipsPremium') },
      { label: t('premium.compareNatal'), free: t('premium.compareNatalFree'), premium: t('premium.compareNatalPremium') },
    ],
    [t],
  );

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [fade]);

  useEffect(() => {
    void track('paywall_viewed', { source: route.params?.source ?? 'premium_screen' });
    void track('premium_paywall_triggered', { source: route.params?.source ?? 'premium_screen' });
  }, [route.params?.source]);

  useEffect(() => {
    void loadProfile();
    void getEmotionalPatternMemory().then((memory) => {
      const summary = summarizeEmotionalPatternMemory(memory);
      setMemorySummary(summary);
      void track('private_archive_view_depth', {
        archiveCount: summary.archiveCount,
        ritualNights: summary.ritualNights,
      });
      if (summary.ritualNights > 0) {
        void track('emotional_continuity_engaged', {
          ritualNights: summary.ritualNights,
          strongestSignal: summary.strongestSignal ?? undefined,
        });
      }
    });
  }, [loadProfile]);

  const onPrimaryCta = useCallback(() => {
    if (isPremium) {
      void manageBilling();
      return;
    }
    if (selectedPlanUnavailable) return;
    void upgrade(isIosIap ? { plan: selectedPlan.id } : undefined);
  }, [isIosIap, isPremium, manageBilling, selectedPlan.id, selectedPlanUnavailable, upgrade]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['left', 'right', 'top']}>
      <Animated.View style={[styles.animated, { opacity: fade }]}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: hp, paddingBottom: bottomPadding }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <HeroSection
            palette={palette}
            isLight={isLight}
            titleSize={titleSize}
            bodySize={bodySize}
            lineHeight={lineHeight}
            busy={busy}
            isPremium={isPremium}
            t={t}
            onPress={onPrimaryCta}
            purchasesUnavailable={purchasesUnavailable || selectedPlanUnavailable}
          />

          <PrivateRitualArchivePreview
            palette={palette}
            summary={memorySummary}
            hasBirthplace={Boolean(profile?.birthProfile?.birthCity)}
            hasBirthTime={Boolean(profile?.birthProfile?.birthTime)}
            t={t}
          />

          {purchasesUnavailable ? (
            <View style={[styles.configNotice, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[styles.configNoticeText, { color: palette.text }]}>
                Purchases are not configured yet. Premium will be available after RevenueCat and Apple in-app purchase
                setup are complete.
              </Text>
              {revenueCatStatus ? (
                <Text style={[styles.configNoticeMeta, { color: palette.textMuted }]}>
                  Expected packages: monthly "{revenueCatStatus.monthlyPackageIdentifier}", yearly "
                  {revenueCatStatus.annualPackageIdentifier}".
                </Text>
              ) : null}
            </View>
          ) : null}

          {isIosIap && purchasesConfigured ? (
            <View style={[styles.configNotice, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[styles.configNoticeText, { color: palette.text }]}>
                RevenueCat is configured. Purchases still need real-device validation before launch.
              </Text>
              {revenueCatStatus ? (
                <Text style={[styles.configNoticeMeta, { color: palette.textMuted }]}>
                  Offering: {revenueCatStatus.offeringIdentifier ?? 'current'} · packages: monthly "
                  {revenueCatStatus.monthlyPackageIdentifier}", yearly "{revenueCatStatus.annualPackageIdentifier}".
                </Text>
              ) : null}
            </View>
          ) : null}

          {premiumPlansError && purchasesConfigured ? (
            <View style={[styles.configNotice, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[styles.configNoticeText, { color: palette.text }]}>
                Premium pricing could not load from RevenueCat.
              </Text>
              <Text style={[styles.configNoticeMeta, { color: palette.textMuted }]}>{premiumPlansError}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.detailsDisclosure, { borderColor: palette.border }, pressed && styles.pressed]}
            onPress={() => {
              setContinuityDetailsOpen((current) => !current);
              void track('hidden_control_discovered', { screen: screenPurpose.screen, control: 'premium_continuity_details' });
              void track('text_expansion_used', { screen: screenPurpose.screen, moment: screenPurpose.moment });
            }}
            accessibilityRole="button"
            accessibilityLabel={continuityDetailsOpen ? 'Hide premium continuity details' : 'Show premium continuity details'}
          >
            <Text style={[styles.restoreLink, { color: palette.accent }]}>
              {continuityDetailsOpen ? t('premium.detailsHide') : t('premium.detailsShow')}
            </Text>
          </Pressable>

          {continuityDetailsOpen ? (
            <>
              <SectionTitle title={t('premium.valueTitle')} palette={palette} />
              <View style={styles.featureGrid}>
                {features.map((feature) => (
                  <FeatureCard key={feature.title} feature={feature} palette={palette} />
                ))}
              </View>

              <LockedPreview palette={palette} t={t} />

              <SectionTitle title={t('premium.compareTitle')} palette={palette} />
              <ComparisonTable rows={comparison} palette={palette} />

              <SectionTitle title={t('premium.proofTitle')} palette={palette} />
              <FoundationProof palette={palette} isIosIap={isIosIap} t={t} />
            </>
          ) : null}

          <SectionTitle title={t('premium.pricingTitle')} palette={palette} />
          <View style={styles.pricingList}>
            {premiumPlans.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                selected={selectedPlan.id === plan.id}
                palette={palette}
                onSelect={setSelectedPlanId}
                loading={premiumPlansLoading}
                t={t}
              />
            ))}
          </View>
          <Text style={[styles.trustLine, { color: palette.textMuted }]}>
            {PREMIUM_EXPERIMENT.trialDays
              ? `${PREMIUM_EXPERIMENT.trialDays} day free trial included. ${isIosIap ? t('premium.trustIos') : t('premium.trust')}`
              : isIosIap
                ? t('premium.trustIos')
                : t('premium.trust')}
          </Text>

          <BillingActions
            palette={palette}
            busy={busy}
            isPremium={isPremium}
            isIosIap={isIosIap}
            purchasesConfigured={purchasesConfigured}
            onRestore={() => void refreshStatus()}
            onManage={() => void manageBilling()}
          />

          {message ? (
            <Text style={[styles.feedback, { color: palette.text }]} accessibilityLiveRegion="polite">
              {message}
            </Text>
          ) : null}
        </ScrollView>
      </Animated.View>

      <StickyCta
        palette={palette}
        bottomInset={insets.bottom}
        busy={busy}
        isPremium={isPremium}
        selectedPlan={selectedPlan}
        t={t}
        onPress={onPrimaryCta}
        purchasesUnavailable={purchasesUnavailable || selectedPlanUnavailable}
      />
    </SafeAreaView>
  );
}

function HeroSection({
  palette,
  isLight,
  titleSize,
  bodySize,
  lineHeight,
  busy,
  isPremium,
  t,
  onPress,
  purchasesUnavailable,
}: {
  palette: AppearancePalette;
  isLight: boolean;
  titleSize: number;
  bodySize: number;
  lineHeight: number;
  busy: boolean;
  isPremium: boolean;
  t: ReturnType<typeof useI18n>['t'];
  onPress: () => void;
  purchasesUnavailable: boolean;
}): React.JSX.Element {
  return (
    <View
      style={[
        styles.hero,
        {
          backgroundColor: isLight ? '#ffffff' : '#101125',
          borderColor: palette.border,
        },
      ]}
    >
      <View style={styles.heroSky} pointerEvents="none">
        <View style={[styles.orbit, styles.orbitLarge]} />
        <View style={[styles.orbit, styles.orbitSmall]} />
        <View style={styles.moon} />
      </View>
      <Text style={[styles.badge, { color: colors.gold }]}>{t('premium.badge')}</Text>
      <Text style={[styles.heroTitle, { color: palette.text, fontSize: titleSize }]} accessibilityRole="header">
        {t('premium.heroTitle')}
      </Text>
      <Text style={[styles.heroSubtitle, { color: palette.textMuted, fontSize: bodySize, lineHeight }]}>
        {t('premium.heroSubtitle')}
      </Text>
      <View style={styles.heroStats}>
        <MiniStat value={t('premium.statSaved')} label={t('premium.statSavedLabel')} palette={palette} />
        <MiniStat value={t('premium.statDeeper')} label={t('premium.statDeeperLabel')} palette={palette} />
      </View>
      <PrimaryButton
        label={isPremium ? t('premium.activeCta') : t('premium.cta')}
        busy={busy}
        onPress={onPress}
        disabled={purchasesUnavailable && !isPremium}
        accessibilityLabel={isPremium ? 'Manage premium access' : 'Open deeper sky layers'}
      />
      <Text style={[styles.urgency, { color: palette.textMuted }]}>{t('premium.urgency')}</Text>
    </View>
  );
}

function PrivateRitualArchivePreview({
  palette,
  summary,
  hasBirthplace,
  hasBirthTime,
  t,
}: {
  palette: AppearancePalette;
  summary: EmotionalPatternSummary | null;
  hasBirthplace: boolean;
  hasBirthTime: boolean;
  t: ReturnType<typeof useI18n>['t'];
}): React.JSX.Element {
  const insights = summary?.insights.length
    ? summary.insights
    : [t('premium.previewEmpty')];
  return (
    <View style={[styles.archivePreview, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <Text style={[styles.lockedEyebrow, { color: colors.gold }]}>{t('premium.previewEyebrow')}</Text>
      <Text style={[styles.archiveTitle, { color: palette.text }]}>{t('premium.previewTitle')}</Text>
      {insights.slice(0, 3).map((insight) => (
        <Text key={insight} style={[styles.archiveInsight, { color: palette.textMuted }]}>
          {insight}
        </Text>
      ))}
      <View style={styles.archiveStats}>
        <MiniStat value={String(summary?.ritualNights ?? 0)} label="ritual nights" palette={palette} />
        <MiniStat value={String(summary?.archiveCount ?? 0)} label="saved moments" palette={palette} />
      </View>
      <View style={[styles.natalPrompt, { borderColor: palette.border }]}>
        <Text style={[styles.natalPromptTitle, { color: palette.text }]}>{t('premium.natalTitle')}</Text>
        <Text style={[styles.archiveInsight, { color: palette.textMuted }]}>
          {hasBirthplace && hasBirthTime
            ? t('premium.natalReady')
            : !hasBirthplace
              ? t('premium.natalMissingPlace')
              : t('premium.natalMissingTime')}
        </Text>
        <Pressable
          onPress={() => {
            void track('natal_resonance_upgrade_tapped', {
              missingBirthTime: !hasBirthTime,
              missingBirthplace: !hasBirthplace,
            });
            if (!hasBirthTime) {
              void track('birth_time_unlock_prompt_conversion', { source: 'premium_archive' });
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Learn about natal resonance precision"
          hitSlop={hitSlopComfortable}
        >
          <Text style={[styles.archiveLink, { color: palette.accent }]}>
            {hasBirthplace && hasBirthTime ? t('premium.natalReadyCta') : t('premium.natalImproveCta')}
          </Text>
        </Pressable>
      </View>
      <Text style={[styles.privacyCopy, { color: palette.textMuted }]}>{t('premium.privacy')}</Text>
    </View>
  );
}

function MiniStat({ value, label, palette }: { value: string; label: string; palette: AppearancePalette }) {
  return (
    <View style={[styles.miniStat, { borderColor: palette.border }]}>
      <Text style={[styles.miniStatValue, { color: palette.text }]}>{value}</Text>
      <Text style={[styles.miniStatLabel, { color: palette.textMuted }]}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title, palette }: { title: string; palette: AppearancePalette }) {
  return <Text style={[styles.sectionTitle, { color: palette.text }]}>{title}</Text>;
}

function FeatureCard({ feature, palette }: { feature: PremiumFeature; palette: AppearancePalette }) {
  return (
    <View style={[styles.featureCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={[styles.featureAccent, { backgroundColor: feature.accent }]} />
      <Text style={[styles.featureTitle, { color: palette.text }]}>{feature.title}</Text>
      <Text style={[styles.featureValue, { color: palette.textMuted }]}>{feature.value}</Text>
    </View>
  );
}

function LockedPreview({ palette, t }: { palette: AppearancePalette; t: ReturnType<typeof useI18n>['t'] }) {
  return (
    <View style={[styles.lockedPreview, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <Text style={[styles.lockedEyebrow, { color: colors.gold }]}>{t('premium.membersPreview')}</Text>
      <Text style={[styles.lockedTitle, { color: palette.text }]}>{t('premium.lockedTitle')}</Text>
      <View style={styles.previewLines} accessibilityLabel="Locked premium reading preview">
        <View style={[styles.previewLine, { width: '92%', backgroundColor: palette.textMuted }]} />
        <View style={[styles.previewLine, { width: '78%', backgroundColor: palette.textMuted }]} />
        <View style={[styles.previewLine, { width: '64%', backgroundColor: palette.textMuted }]} />
      </View>
      <View style={[styles.lockOverlay, { borderColor: palette.border }]}>
        <Text style={[styles.lockOverlayText, { color: palette.text }]}>{t('premium.lockedCta')}</Text>
      </View>
    </View>
  );
}

function ComparisonTable({ rows, palette }: { rows: ComparisonRow[]; palette: AppearancePalette }) {
  const { t } = useI18n();
  return (
    <View style={[styles.table, { borderColor: palette.border, backgroundColor: palette.card }]}>
      <View style={[styles.tableRow, styles.tableHeader, { borderBottomColor: palette.border }]}>
        <Text style={[styles.tableCellFeature, styles.tableHeaderText, { color: palette.text }]}>{t('premium.tableAccess')}</Text>
        <Text style={[styles.tableCell, styles.tableHeaderText, { color: palette.textMuted }]}>{t('premium.tableFree')}</Text>
        <Text style={[styles.tableCell, styles.tableHeaderText, { color: colors.gold }]}>{t('premium.tablePremium')}</Text>
      </View>
      {rows.map((row, index) => (
        <View
          key={row.label}
          style={[
            styles.tableRow,
            index < rows.length - 1 ? { borderBottomColor: palette.border, borderBottomWidth: 1 } : null,
          ]}
        >
          <Text style={[styles.tableCellFeature, { color: palette.text }]}>{row.label}</Text>
          <Text style={[styles.tableCell, { color: palette.textMuted }]}>{row.free}</Text>
          <Text style={[styles.tableCell, styles.tablePremiumText, { color: palette.text }]}>{row.premium}</Text>
        </View>
      ))}
    </View>
  );
}

function FoundationProof({ palette, isIosIap, t }: { palette: AppearancePalette; isIosIap: boolean; t: ReturnType<typeof useI18n>['t'] }) {
  const items = [
    { metric: 'Local', label: 'Recent memory stays on this device unless you choose to sync' },
    { metric: 'Clear', label: 'Reflective patterns are not mental health labels' },
    { metric: 'Yours', label: 'Reset ritual memory and archive whenever you want' },
  ];
  return (
    <View style={styles.proofWrap}>
      <View style={styles.proofGrid}>
        {items.map((item) => (
          <View key={item.metric} style={[styles.proofCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.proofMetric, { color: palette.text }]}>{item.metric}</Text>
            <Text style={[styles.proofLabel, { color: palette.textMuted }]}>{item.label}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.foundationNote, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.foundationNoteText, { color: palette.text }]}>
          {t('premium.calmLine')}
        </Text>
        <Text style={[styles.foundationNoteMeta, { color: palette.textMuted }]}>
          Astralis keeps astronomy, astrology, and emotional reflection clearly distinct.
        </Text>
      </View>
      <Text style={[styles.trustLine, { color: palette.textMuted }]}>
        {isIosIap
          ? 'Subscriptions are managed with your Apple ID. Restore purchases anytime.'
          : 'Encrypted payments through Stripe. Restore access anytime.'}
      </Text>
    </View>
  );
}

function PricingCard({
  plan,
  selected,
  palette,
  onSelect,
  loading,
  t,
}: {
  plan: PremiumPlanDisplay;
  selected: boolean;
  palette: AppearancePalette;
  onSelect: (id: PremiumPlanDisplay['id']) => void;
  loading: boolean;
  t: ReturnType<typeof useI18n>['t'];
}) {
  const disabled = loading || !plan.available;
  const planTitle = plan.id === 'yearly' ? t('premium.planYearly') : t('premium.planMonthly');
  const planCadence = plan.id === 'yearly' ? t('premium.cadenceYearly') : t('premium.cadenceMonthly');
  const planNote = plan.id === 'yearly' ? t('premium.planYearlyNote') : t('premium.planMonthlyNote');
  return (
    <Pressable
      style={[
        styles.planCard,
        {
          backgroundColor: selected ? 'rgba(139, 107, 255, 0.22)' : palette.card,
          borderColor: selected ? colors.gold : palette.border,
        },
        disabled && styles.disabled,
      ]}
      onPress={() => {
        if (!disabled) onSelect(plan.id);
      }}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={`${planTitle} Premium plan, ${plan.price} ${planCadence}`}
      hitSlop={hitSlopComfortable}
    >
      <View style={styles.planTopRow}>
        <View>
          <Text style={[styles.planTitle, { color: palette.text }]}>{planTitle}</Text>
          <Text style={[styles.planNote, { color: palette.textMuted }]}>{planNote}</Text>
        </View>
        {plan.badge ? (
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>{plan.badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.planPrice, { color: palette.text }]}>
        {loading ? 'Loading price...' : plan.price}
      </Text>
      <Text style={[styles.planCadence, { color: palette.textMuted }]}>{planCadence}</Text>
      {!plan.available && plan.unavailableReason ? (
        <Text style={[styles.planUnavailable, { color: palette.textMuted }]}>{plan.unavailableReason}</Text>
      ) : null}
    </Pressable>
  );
}

function BillingActions({
  palette,
  busy,
  isPremium,
  isIosIap,
  purchasesConfigured,
  onRestore,
  onManage,
}: {
  palette: AppearancePalette;
  busy: boolean;
  isPremium: boolean;
  isIosIap: boolean;
  purchasesConfigured: boolean;
  onRestore: () => void;
  onManage: () => void;
}) {
  return (
    <View style={styles.billingActions}>
      <Pressable
        onPress={onRestore}
        disabled={busy || (isIosIap && !purchasesConfigured)}
        accessibilityRole="button"
        accessibilityLabel={isIosIap ? 'Restore App Store purchases' : 'Refresh premium status'}
        accessibilityState={{ disabled: busy || (isIosIap && !purchasesConfigured) }}
        hitSlop={hitSlopComfortable}
      >
        <Text
          style={[
            styles.restoreLink,
            { color: busy || (isIosIap && !purchasesConfigured) ? palette.textMuted : palette.accent },
          ]}
        >
          {isIosIap ? 'Restore purchases' : 'Refresh premium status'}
        </Text>
      </Pressable>
      {isPremium ? (
        <Pressable
          onPress={onManage}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Manage subscription"
          accessibilityState={{ disabled: busy }}
          hitSlop={hitSlopComfortable}
        >
          <Text style={[styles.restoreLink, { color: busy ? palette.textMuted : palette.accent }]}>
            Manage subscription
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function StickyCta({
  palette,
  bottomInset,
  busy,
  isPremium,
  selectedPlan,
  t,
  onPress,
  purchasesUnavailable,
}: {
  palette: AppearancePalette;
  bottomInset: number;
  busy: boolean;
  isPremium: boolean;
  selectedPlan: PremiumPlanDisplay;
  t: ReturnType<typeof useI18n>['t'];
  onPress: () => void;
  purchasesUnavailable: boolean;
}) {
  return (
    <View
      style={[
        styles.sticky,
        {
          paddingBottom: Math.max(bottomInset, spacing.sm),
          backgroundColor: palette.background,
          borderTopColor: palette.border,
        },
      ]}
    >
      <View style={styles.stickyCopy}>
        <Text style={[styles.stickyTitle, { color: palette.text }]}>
          {isPremium ? 'Premium is active' : selectedPlan.bestValue ? t('premium.stickyYearly') : t('premium.stickyMonthly')}
        </Text>
        <Text style={[styles.stickySub, { color: palette.textMuted }]}>{t('premium.stickySubtitle')}</Text>
      </View>
      <PrimaryButton
        label={isPremium ? t('premium.activeCta') : t('premium.cta')}
        busy={busy}
        onPress={onPress}
        compact
        disabled={purchasesUnavailable && !isPremium}
        accessibilityLabel={isPremium ? 'Manage premium access' : 'Open deeper sky layers'}
      />
    </View>
  );
}

function PrimaryButton({
  label,
  busy,
  onPress,
  compact,
  disabled,
  accessibilityLabel,
}: {
  label: string;
  busy: boolean;
  onPress: () => void;
  compact?: boolean;
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  const isDisabled = busy || Boolean(disabled);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.primaryButton,
        compact && styles.primaryButtonCompact,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled }}
      hitSlop={hitSlopComfortable}
    >
      {busy ? <ActivityIndicator color="#160f30" /> : <Text style={styles.primaryButtonText}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  animated: { flex: 1 },
  content: { gap: spacing.lg, paddingTop: spacing.md },
  hero: {
    borderWidth: 1,
    borderRadius: 24,
    overflow: 'hidden',
    padding: spacing.xl,
  },
  heroSky: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.62,
  },
  orbit: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.22)',
    borderRadius: 999,
  },
  orbitLarge: { width: 240, height: 240, right: -92, top: -88 },
  orbitSmall: { width: 130, height: 130, right: -12, top: 18 },
  moon: {
    position: 'absolute',
    right: 36,
    top: 28,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(212, 175, 55, 0.36)',
  },
  badge: {
    alignSelf: 'flex-start',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  heroTitle: { fontWeight: '800', lineHeight: 36, marginBottom: spacing.sm },
  heroSubtitle: { marginBottom: spacing.lg },
  heroStats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  miniStat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  miniStatValue: { fontSize: 18, fontWeight: '800' },
  miniStatLabel: { marginTop: 2, fontSize: 12, lineHeight: 16 },
  urgency: { marginTop: spacing.sm, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  sectionTitle: { marginTop: spacing.xs, fontSize: 20, lineHeight: 26, fontWeight: '800' },
  featureGrid: { gap: spacing.sm },
  featureCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
    overflow: 'hidden',
  },
  featureAccent: { width: 38, height: 4, borderRadius: 999, marginBottom: spacing.sm },
  featureTitle: { fontSize: 16, lineHeight: 21, fontWeight: '800' },
  featureValue: { marginTop: 5, fontSize: 14, lineHeight: 20 },
  archivePreview: {
    borderWidth: 1,
    borderRadius: 22,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  archiveTitle: { fontSize: 20, lineHeight: 26, fontWeight: '900' },
  archiveInsight: { fontSize: 13, lineHeight: 20, fontWeight: '700' },
  archiveStats: { flexDirection: 'row', gap: spacing.sm },
  natalPrompt: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    backgroundColor: 'rgba(184, 168, 255, 0.08)',
  },
  natalPromptTitle: { fontSize: 15, lineHeight: 20, fontWeight: '900' },
  archiveLink: { marginTop: spacing.xs, fontSize: 13, lineHeight: 18, fontWeight: '900' },
  privacyCopy: { fontSize: 12, lineHeight: 18, fontWeight: '700' },
  lockedPreview: {
    borderWidth: 1,
    borderRadius: 20,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  lockedEyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  lockedTitle: { marginTop: spacing.xs, fontSize: 18, lineHeight: 24, fontWeight: '800' },
  previewLines: { gap: spacing.sm, marginTop: spacing.md, opacity: 0.28 },
  previewLine: { height: 13, borderRadius: 999 },
  lockOverlay: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: 'rgba(5, 5, 16, 0.62)',
  },
  lockOverlayText: { fontSize: 14, lineHeight: 19, fontWeight: '800' },
  table: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, gap: spacing.xs },
  tableHeader: { borderBottomWidth: 1 },
  tableHeaderText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  tableCellFeature: { flex: 1.05, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  tableCell: { flex: 1, fontSize: 12, lineHeight: 17 },
  tablePremiumText: { fontWeight: '700' },
  proofWrap: { gap: spacing.sm },
  proofGrid: { flexDirection: 'row', gap: spacing.sm },
  proofCard: { flex: 1, borderWidth: 1, borderRadius: 16, padding: spacing.sm },
  proofMetric: { fontSize: 17, lineHeight: 22, fontWeight: '900' },
  proofLabel: { marginTop: 2, fontSize: 11, lineHeight: 15 },
  foundationNote: { borderWidth: 1, borderRadius: 16, padding: spacing.md },
  foundationNoteText: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  foundationNoteMeta: { marginTop: spacing.xs, fontSize: 12, lineHeight: 17 },
  pricingList: { gap: spacing.sm },
  planCard: { borderWidth: 1.5, borderRadius: 20, padding: spacing.lg },
  planTopRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  planTitle: { fontSize: 18, lineHeight: 23, fontWeight: '900' },
  planNote: { maxWidth: 210, marginTop: 3, fontSize: 12, lineHeight: 17 },
  planBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    backgroundColor: colors.gold,
  },
  planBadgeText: { color: '#201600', fontSize: 11, lineHeight: 14, fontWeight: '900' },
  planPrice: { marginTop: spacing.md, fontSize: 30, lineHeight: 36, fontWeight: '900' },
  planCadence: { fontSize: 13, lineHeight: 18 },
  planUnavailable: { marginTop: spacing.sm, fontSize: 12, lineHeight: 17 },
  trustLine: { fontSize: 12, lineHeight: 17, textAlign: 'center' },
  configNotice: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
  },
  configNoticeText: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  configNoticeMeta: { marginTop: spacing.xs, fontSize: 12, lineHeight: 17 },
  billingActions: { gap: spacing.xs },
  restoreLink: { fontSize: 14, lineHeight: 20, fontWeight: '700', textAlign: 'center', marginTop: spacing.xs },
  feedback: {
    borderRadius: 14,
    padding: spacing.md,
    backgroundColor: 'rgba(123, 191, 106, 0.12)',
    fontSize: 14,
    lineHeight: 20,
  },
  detailsDisclosure: {
    minHeight: MIN_TOUCH,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  sticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stickyCopy: { flex: 1 },
  stickyTitle: { fontSize: 14, lineHeight: 18, fontWeight: '900' },
  stickySub: { marginTop: 1, fontSize: 11, lineHeight: 15 },
  primaryButton: {
    minHeight: MIN_TOUCH,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gold,
  },
  primaryButtonCompact: { minWidth: 132, paddingHorizontal: spacing.md },
  primaryButtonText: { color: '#160f30', fontSize: 15, lineHeight: 19, fontWeight: '900' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.88 },
});
