import React from 'react';
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

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator(): React.JSX.Element {
  const { user, initialized } = useAuth();
  const { palette } = useAppearance();

  if (!initialized) {
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
        initialRouteName={user ? 'Main' : 'Login'}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="AppAppearance" component={AppAppearanceScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ManageNotifications" component={ManageNotificationsScreen} options={{ headerShown: false }} />
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
