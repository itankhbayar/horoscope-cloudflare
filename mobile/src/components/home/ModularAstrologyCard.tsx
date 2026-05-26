import React, { type ReactElement, type ReactNode } from 'react';
import { Animated, type LayoutChangeEvent } from 'react-native';
import type { HoroscopePeriod } from './homeDateUtils';
import { RitualMoment } from './RitualMoment';
import { compressRitualCopy, hasLegacyPremiumLanguage } from './ritualMomentCopy';

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
  const body = renderBody('today');
  const primaryLine = compressRitualCopy(body, 124);
  const detail = body.length > primaryLine.length ? body : undefined;

  return (
    <RitualMoment
      moment={segmented || accentUnderline || ctaVariant === 'lavender' ? 'continuation' : 'reflection'}
      title={ritualTitle(title)}
      primaryLine={primaryLine}
      detail={detail}
      symbol={illustration}
      actionLabel={detail ? softerAction(ctaLabel) : undefined}
      entranceOpacity={entranceOpacity}
      onLayout={onLayout}
    />
  );
}

function ritualTitle(title: string): string {
  if (title === 'Daily Intention') return 'A quiet intention';
  if (title === 'Why Today Feels This Way') return 'The sky beneath it';
  if (title === 'Moon Rhythm') return 'Moon rhythm';
  if (title === 'Color & Focus') return 'A small focus';
  if (title === 'Symbolic Card') return 'A symbolic note';
  return title;
}

function softerAction(label: string): string {
  if (/open|reveal/i.test(label) || hasLegacyPremiumLanguage(label)) return 'Read a little deeper';
  if (/save/i.test(label)) return 'Keep this intention';
  return label;
}
