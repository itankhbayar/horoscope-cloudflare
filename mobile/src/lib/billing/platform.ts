import { Platform } from 'react-native';

/** Apple IAP via RevenueCat on native iOS builds. */
export function usesRevenueCatBilling(): boolean {
  return Platform.OS === 'ios';
}

/** Stripe PaymentSheet / portal (Android native + web). */
export function usesStripeBilling(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'web';
}
