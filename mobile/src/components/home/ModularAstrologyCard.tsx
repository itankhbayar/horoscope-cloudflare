import React, { type ReactElement, type ReactNode } from 'react';
import { Animated, type LayoutChangeEvent } from 'react-native';
import type { HoroscopePeriod } from './homeDateUtils';
import { RitualMoment } from './RitualMoment';
import { compressRitualCopy, hasLegacyPremiumLanguage } from './ritualMomentCopy';
import { useI18n, type TranslationKey } from '../../i18n';

type Props = {
  title: string;
  illustration: ReactNode;
  renderBody: (tab: HoroscopePeriod) => string;
  ctaLabel: string;
  ctaVariant?: 'lavender' | 'white';
  segmented?: boolean;
  accentUnderline?: boolean;
  entranceOpacity?: Animated.Value;
  onLayout?: (e: LayoutChangeEvent) => void;
};

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
  const { t } = useI18n();
  const body = renderBody('today');
  const primaryLine = compressRitualCopy(body, 124);
  const detail = body.length > primaryLine.length ? body : undefined;
  const titleKey = ritualTitleKey(title);
  const actionKey = detail ? softerActionKey(ctaLabel) : undefined;

  return (
    <RitualMoment
      moment={segmented || accentUnderline || ctaVariant === 'lavender' ? 'continuation' : 'reflection'}
      title={titleKey ? t(titleKey) : title}
      primaryLine={primaryLine}
      detail={detail}
      symbol={illustration}
      actionLabel={actionKey ? t(actionKey) : detail ? ctaLabel : undefined}
      entranceOpacity={entranceOpacity}
      onLayout={onLayout}
    />
  );
}

function ritualTitleKey(title: string): TranslationKey | null {
  if (title === 'Daily Intention') return 'ritual.intentionTitle';
  if (title === 'Why Today Feels This Way') return 'ritual.skyBeneathTitle';
  if (title === 'Moon Rhythm') return 'ritual.moonRhythmTitle';
  if (title === 'Color & Focus') return 'ritual.focusTitle';
  if (title === 'Symbolic Card') return 'ritual.symbolicTitle';
  return null;
}

function softerActionKey(label: string): TranslationKey | null {
  if (/open|reveal/i.test(label) || hasLegacyPremiumLanguage(label)) return 'ritual.readDeeper';
  if (/save/i.test(label)) return 'ritual.keepIntention';
  return null;
}
