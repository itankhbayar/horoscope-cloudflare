import type { ReactElement } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import type { MainTabParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { CompatibilityScreen } from '../screens/CompatibilityScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { PremiumScreen } from '../screens/PremiumScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs(): ReactElement {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Today', tabBarIcon: () => <Text style={{ fontSize: 18 }}>✨</Text> }}
      />
      <Tab.Screen
        name="Compatibility"
        component={CompatibilityScreen}
        options={{ tabBarLabel: 'Match', tabBarIcon: () => <Text style={{ fontSize: 18 }}>❤</Text> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Chart', tabBarIcon: () => <Text style={{ fontSize: 18 }}>☽</Text> }}
      />
      <Tab.Screen
        name="Premium"
        component={PremiumScreen}
        options={{ tabBarLabel: 'Premium', tabBarIcon: () => <Text style={{ fontSize: 18 }}>✦</Text> }}
      />
    </Tab.Navigator>
  );
}
