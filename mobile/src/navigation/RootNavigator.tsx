import React, { useCallback, useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { MainTabs } from './MainTabs';
import { colors } from '../theme';
import type { RootStackParamList } from './types';
import { navigationRef } from './navigationRef';
import { useAuth } from '../hooks/useAuth';
import { AppAppearanceScreen } from '../screens/AppAppearanceScreen';
import { useAppearance } from '../hooks/useAppearance';
import { ManageNotificationsScreen } from '../screens/ManageNotificationsScreen';
import { AccountSettingsScreen } from '../screens/AccountSettingsScreen';
import { DeleteAccountScreen } from '../screens/DeleteAccountScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { PremiumScreen } from '../screens/PremiumScreen';
import { hasCompletedOnboarding, markOnboardingComplete } from '../lib/onboardingStorage';
import { track } from '../lib/analytics';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator(): React.JSX.Element {
  const { user, initialized } = useAuth();
  const { palette } = useAppearance();
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      if (!user) {
        if (alive) {
          setOnboardingComplete(false);
          setOnboardingReady(true);
        }
        return;
      }
      setOnboardingReady(false);
      const complete = await hasCompletedOnboarding(user.id);
      if (alive) {
        setOnboardingComplete(complete);
        setOnboardingReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const completeOnboarding = useCallback(async (hasBirthProfile: boolean): Promise<void> => {
    if (!user) return;
    await markOnboardingComplete(user.id);
    void track('onboarding_completed', { hasBirthProfile });
    setOnboardingComplete(true);
  }, [user]);

  if (!initialized || !onboardingReady) {
    return (
      <SafeAreaView style={styles.boot} edges={['left', 'right', 'top', 'bottom']}>
        <ActivityIndicator size="large" color={colors.accent} accessibilityLabel="Loading session" />
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: palette.surface },
          headerTintColor: palette.text,
          headerTitleStyle: { fontWeight: '700', fontSize: 17 },
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: palette.background },
        }}
        initialRouteName={!user ? 'Login' : onboardingComplete ? 'Main' : 'Onboarding'}
      >
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          </>
        ) : onboardingComplete ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AppAppearance" component={AppAppearanceScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ManageNotifications" component={ManageNotificationsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Premium" component={PremiumScreen} options={{ headerShown: false }} />
          </>
        ) : (
          <Stack.Screen name="Onboarding" options={{ headerShown: false }}>
            {() => <OnboardingScreen onComplete={completeOnboarding} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
