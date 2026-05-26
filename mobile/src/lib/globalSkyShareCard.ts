import { Share } from 'react-native';
import type { GlobalSkyToday } from '@astralis/lib/types';
import { globalSkyShareCardDataUrl } from '@astralis/lib/globalSkyShareCard';
import { track } from './analytics';

export async function shareGlobalSkyCard(sky: GlobalSkyToday): Promise<void> {
  const eventBase = { source: 'guest_preview' as const, sign: sky.moonSign, date: sky.date };
  await track('share_interaction', eventBase);
  await track('horoscope_share_card_opened', eventBase);
  await track('horoscope_share_card_generated', { ...eventBase, surface: 'native' });
  const payload = {
    title: 'Global sky today',
    message: `${sky.headline}\n\n${sky.shareLine}`,
    url: globalSkyShareCardDataUrl(sky),
  };
  try {
    await Share.share(payload);
    await track('horoscope_share_card_shared', { ...eventBase, method: 'native' });
  } catch {
    await Share.share({ title: payload.title, message: payload.message });
    await track('horoscope_share_card_shared', { ...eventBase, method: 'message_fallback' });
  }
}
