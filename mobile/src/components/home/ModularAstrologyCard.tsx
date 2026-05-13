import React, { type ReactElement, type ReactNode, useMemo, useState } from 'react';
import { Animated, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { CTAButton } from './CTAButton';
import { ContentCard } from './ContentCard';
import { HoroscopeTabs } from './HoroscopeTabs';
import { CHRONO_TABS } from './chronoTabs';
import type { HoroscopePeriod } from './homeDateUtils';
import { SectionHeader } from './SectionHeader';
import { useSanctuaryTheme, type SanctuaryPalette } from './sanctuaryTheme';
import { spacing } from '../../theme';

type Props = {
  title: string;
  illustration: ReactNode;
  renderBody: (tab: HoroscopePeriod) => string;
  ctaLabel: string;
  ctaVariant?: 'lavender' | 'white';
  /** When false, only “today” copy is shown (no tab row). */
  segmented?: boolean;
  /** Match main horoscope card (lavender underline) when true. */
  accentUnderline?: boolean;
  entranceOpacity?: Animated.Value;
  onLayout?: (e: LayoutChangeEvent) => void;
};

function makeStyles(t: SanctuaryPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.lg,
      maxWidth: '100%',
    },
    art: {
      width: 96,
      minHeight: 96,
      borderRadius: 16,
      backgroundColor: t.artWellBg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: t.artWellBorder,
      overflow: 'hidden',
    },
    body: {
      flex: 1,
      minWidth: 0,
      color: t.textMuted,
      fontSize: 14,
      lineHeight: 21,
      fontWeight: '500',
    },
    cta: { alignSelf: 'stretch' },
  });
}

export function ModularAstrologyCard({
  title,
  illustration,
  renderBody,
  ctaLabel,
  ctaVariant = 'lavender',
  segmented = true,
  accentUnderline = false,
  entranceOpacity,
  onLayout,
}: Props): ReactElement {
  const t = useSanctuaryTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [tab, setTab] = useState<HoroscopePeriod>('today');
  const body = segmented ? renderBody(tab) : renderBody('today');

  return (
    <ContentCard entranceOpacity={entranceOpacity} onLayout={onLayout}>
      <SectionHeader title={title} />
      {segmented ? (
        <HoroscopeTabs
          tabs={CHRONO_TABS}
          activeId={tab}
          onSelect={(id) => setTab(id as HoroscopePeriod)}
          accentUnderline={accentUnderline}
        />
      ) : null}
      <View style={styles.row}>
        <View style={styles.art}>{illustration}</View>
        <Text style={styles.body}>{body}</Text>
      </View>
      <CTAButton label={ctaLabel} variant={ctaVariant} style={styles.cta} />
    </ContentCard>
  );
}
