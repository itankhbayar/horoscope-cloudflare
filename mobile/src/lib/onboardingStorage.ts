import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'onboarding:completed:';

export function onboardingKey(userId: string): string {
  return `${PREFIX}${userId}`;
}

export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  return (await AsyncStorage.getItem(onboardingKey(userId))) === 'true';
}

export async function markOnboardingComplete(userId: string): Promise<void> {
  await AsyncStorage.setItem(onboardingKey(userId), 'true');
}
