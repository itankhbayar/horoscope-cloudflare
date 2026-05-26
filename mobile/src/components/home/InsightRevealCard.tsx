import React, { type ReactElement } from 'react';
import { Text, View } from 'react-native';
import type { HoroscopePeriod } from './homeDateUtils';
import { RitualMoment } from './RitualMoment';
import { compressRitualCopy } from './ritualMomentCopy';
import { useSanctuaryTheme } from './sanctuaryTheme';

type Props = {
  title: "Today's Transit" | "Today's Moon";
  period: HoroscopePeriod;
  onPeriodChange: (period: HoroscopePeriod) => void;
  isPremium: boolean;
  todayBody: string;
  periodBody: (period: HoroscopePeriod) => string;
  ctaLabel: string;
  revealedCtaLabel: string;
};

export function InsightRevealCard({
  title,
  period,
  onPeriodChange,
  isPremium,
  todayBody,
  periodBody,
  ctaLabel,
  revealedCtaLabel,
}: Props): ReactElement {
  void onPeriodChange;
  void ctaLabel;
  void revealedCtaLabel;
  const theme = useSanctuaryTheme();
  const continuationUnavailable = !isPremium && period !== 'today';
  const body = continuationUnavailable || period === 'today' ? todayBody : periodBody(period);
  const primaryLine = continuationUnavailable
    ? 'This deeper timing layer can wait until you want a private continuation.'
    : compressRitualCopy(body, 124);

  return (
    <RitualMoment
      moment="continuation"
      title={title === "Today's Transit" ? 'The sky beneath it' : 'Moon rhythm'}
      primaryLine={primaryLine}
      detail={continuationUnavailable ? undefined : body}
      symbol={
        title === "Today's Transit" ? (
          <Text style={{ color: theme.lavender, fontSize: 34, lineHeight: 40 }}>{'\u2644'}</Text>
        ) : (
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: 'rgba(229, 232, 255, 0.9)',
            }}
          />
        )
      }
      actionLabel={continuationUnavailable ? undefined : 'Read a little deeper'}
    />
  );
}
