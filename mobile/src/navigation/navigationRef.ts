import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function resetToMain(): void {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Main' }] }));
  }
}

export function resetToLogin(): void {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
  }
}

export function resetToOnboarding(): void {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Onboarding' }] }));
  }
}

export function goToAppAppearance(): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate('AppAppearance');
  }
}

export function goToAccountSettings(): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate('AccountSettings');
  }
}

export function goToManageNotifications(): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate('ManageNotifications');
  }
}

export function goToDeleteAccount(): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate('DeleteAccount');
  }
}

export function goToPremium(source?: NonNullable<RootStackParamList['Premium']>['source']): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Premium', source ? { source } : undefined);
  }
}
