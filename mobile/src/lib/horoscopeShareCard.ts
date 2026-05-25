import { Share } from 'react-native';
import type { DailyHoroscope } from '@astralis/lib/types';
import {
  buildHoroscopeShareCardPayload,
  horoscopeShareCardDataUrl,
} from '@astralis/lib/horoscopeShareCard';
import { track } from './analytics';

export async function shareDailyHoroscopeCard(horoscope: DailyHoroscope): Promise<void> {
  const eventBase = { source: 'home' as const, sign: horoscope.sign, date: horoscope.date };
  await track('horoscope_share_card_opened', eventBase);
  const payload = buildHoroscopeShareCardPayload(horoscope);
  await track('horoscope_share_card_generated', { ...eventBase, surface: 'native' });

  const title = `${payload.signName} daily horoscope`;
  const message = `${payload.energyLine}\n\nGet your sky-aware reading with Astralis.`;
  const url = horoscopeShareCardDataUrl(payload);

  try {
    await Share.share({ title, message, url });
    await track('horoscope_share_card_shared', { ...eventBase, method: 'native' });
  } catch (error) {
    try {
      await Share.share({ title, message });
      await track('horoscope_share_card_shared', { ...eventBase, method: 'message_fallback' });
    } catch {
      await track('horoscope_share_card_failed', {
        ...eventBase,
        reason: error instanceof Error ? error.message.slice(0, 80) : 'native_share_failed',
      });
      throw error;
    }
  }
}
