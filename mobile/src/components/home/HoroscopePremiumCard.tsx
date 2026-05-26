import React, { type ReactElement, useMemo } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import type { DailyHoroscope } from '@astralis/lib/types';
import { getZodiacInfo } from '@astralis/lib/zodiac';
import { clampSnippet } from './homeContentUtils';
import type { HoroscopePeriod } from './homeDateUtils';
import { RitualMoment } from './RitualMoment';
import { compressRitualCopy } from './ritualMomentCopy';
import { useSanctuaryTheme } from './sanctuaryTheme';

type Props = {
  horoscope: DailyHoroscope | null;
  period: HoroscopePeriod;
  onPeriodChange: (p: HoroscopePeriod) => void;
  isPremium: boolean;
  loading: boolean;
  error: string | null;
  onLearnMore?: () => void;
};

export function HoroscopePremiumCard({
  horoscope,
  period,
  onPeriodChange,
  isPremium,
  loading,
  error,
  onLearnMore,
}: Props): ReactElement {
  void onPeriodChange;
  void onLearnMore;
  const t = useSanctuaryTheme();
  const art = useMemo(() => {
    if (!horoscope) return { sym: '\u2728', name: 'your sky' };
    const z = getZodiacInfo(horoscope.sign);
    return { sym: z.symbol, name: z.name };
  }, [horoscope]);
  const primaryLine = horoscope
    ? compressRitualCopy(horoscope.overall, 132)
    : loading
      ? "Mapping today's sky..."
      : 'Your sky reading will appear here.';
  const detail = horoscope
    ? readingDetail(horoscope, period, isPremium)
    : error ?? undefined;

  return (
    <RitualMoment
      moment="reading"
      title="Tonight's reading"
      primaryLine={error ? 'The reading could not settle yet.' : primaryLine}
      detail={detail}
      symbol={
        loading ? (
          <ActivityIndicator color={t.lavender} accessibilityLabel="Loading horoscope" />
        ) : (
          <>
            <Text style={{ color: t.lavender, fontSize: 34, lineHeight: 40 }} allowFontScaling={false}>
              {art.sym}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: 10, lineHeight: 13, fontWeight: '900', textTransform: 'uppercase' }}>
              {art.name}
            </Text>
          </>
        )
      }
      actionLabel={horoscope ? 'Read a little deeper' : undefined}
    />
  );
}

function readingDetail(horoscope: DailyHoroscope, period: HoroscopePeriod, isPremium: boolean): string {
  if (!isPremium && period !== 'today') {
    return 'The deeper timing layer waits until you choose a private continuation.';
  }
  return clampSnippet(horoscope.overall, 280);
}
