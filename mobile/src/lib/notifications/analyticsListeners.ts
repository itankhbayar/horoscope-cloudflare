import * as Notifications from 'expo-notifications';
import { track } from '../analytics';
import { goToReflectionCheckIn } from '../../navigation/navigationRef';
import { recordAtmosphericReminderDelivered, recordAtmosphericReminderOpened } from './atmosphericDelivery';

type NotificationData = {
  kind?: unknown;
  reason?: unknown;
  route?: unknown;
  localDate?: unknown;
};

let installed = false;
let subscriptions: Array<{ remove: () => void }> = [];

function atmosphericReason(data: NotificationData | undefined): string | undefined {
  if (!data || data.kind !== 'atmospheric_ritual') return undefined;
  return typeof data.reason === 'string' ? data.reason : undefined;
}

export function installNotificationAnalyticsListeners(): () => void {
  if (installed) {
    return () => undefined;
  }
  installed = true;

  const received = Notifications.addNotificationReceivedListener((notification) => {
    const reason = atmosphericReason(notification.request.content.data as NotificationData | undefined);
    if (!reason) return;
    void recordAtmosphericReminderDelivered(reason);
    void track('reminder_delivered', { type: 'atmospheric_ritual', reason });
  });

  const opened = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as NotificationData | undefined;
    // Accuracy Loop evening nudge → deep-link into the check-in (warm start). On cold
    // start navigationRef may not be ready yet; the user then lands on Home where the
    // evening check-in card is already shown for pending users.
    if (data?.kind === 'evening_reflection' && typeof data.localDate === 'string') {
      goToReflectionCheckIn({ readingDate: data.localDate, source: 'push' });
    }
    const reason = atmosphericReason(data);
    if (!reason) return;
    void recordAtmosphericReminderOpened(reason);
    void track('reminder_opened', { type: 'atmospheric_ritual', reason });
  });

  subscriptions = [received, opened];
  return () => {
    subscriptions.forEach((subscription) => subscription.remove());
    subscriptions = [];
    installed = false;
  };
}
