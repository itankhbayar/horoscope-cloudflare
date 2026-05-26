import React, { type ReactElement } from 'react';
import { Text } from 'react-native';
import type { HoroscopePeriod } from './homeDateUtils';
import { RitualMoment } from './RitualMoment';
import { compressRitualCopy } from './ritualMomentCopy';
import { useSanctuaryTheme } from './sanctuaryTheme';

type Props = {
  crystalName: string;
  todayBody: string;
  periodBody: (period: HoroscopePeriod) => string;
  period: HoroscopePeriod;
  onPeriodChange: (period: HoroscopePeriod) => void;
  isPremium: boolean;
};

export function CrystalRevealCard({
  crystalName,
  todayBody,
  periodBody,
  period,
  onPeriodChange,
  isPremium,
}: Props): ReactElement {
  void onPeriodChange;
  const theme = useSanctuaryTheme();
  const continuationUnavailable = !isPremium && period !== 'today';
  const body = continuationUnavailable || period === 'today' ? todayBody : periodBody(period);

  return (
    <RitualMoment
      moment="resonance"
      title="A small focus"
      primaryLine={
        continuationUnavailable
          ? 'The deeper timing layer can stay private until you want it.'
          : compressRitualCopy(body, 118)
      }
      detail={continuationUnavailable ? undefined : body}
      symbol={<Text style={{ color: theme.lavender, fontSize: 34, lineHeight: 40 }}>{'\u2726'}</Text>}
      actionLabel={continuationUnavailable ? undefined : `Stay with ${crystalName}`}
    />
  );
}
