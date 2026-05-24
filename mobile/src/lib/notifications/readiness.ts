export type NotificationReadinessInput = {
  isDevice: boolean;
  projectId: string | null;
};

export type NotificationReadiness = {
  canRequestPush: boolean;
  reason: string | null;
};

export function getNotificationReadiness({
  isDevice,
  projectId,
}: NotificationReadinessInput): NotificationReadiness {
  if (!isDevice) {
    return {
      canRequestPush: false,
      reason: 'Push notifications require a physical device. Simulator/emulator is not supported.',
    };
  }
  if (!projectId) {
    return {
      canRequestPush: false,
      reason:
        'Expo projectId is missing. Set EXPO_PUBLIC_EAS_PROJECT_ID or expo.extra.eas.projectId before enabling notifications.',
    };
  }
  return { canRequestPush: true, reason: null };
}
