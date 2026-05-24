import React, { useMemo, type ReactElement } from 'react';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type { MainTabParamList } from './types';
import { BottomNavigation } from './BottomNavigation';
import { HomeScreen } from '../screens/HomeScreen';
import { CompatibilityScreen } from '../screens/CompatibilityScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ChartScreen } from '../screens/ChartScreen';
import { ExploreScreen } from '../screens/ExploreScreen';
import { useSanctuaryTheme } from '../components/home/sanctuaryTheme';
import { MIN_TOUCH, spacing } from '../theme';
import { useAppearance } from '../hooks/useAppearance';

const Tab = createBottomTabNavigator<MainTabParamList>();

/** Simple high-contrast symbols (tint with tab `color`). */
const GLYPH_HOME = '\u2302'; // ⌂
const GLYPH_READINGS = '\u2726'; // ✦
const GLYPH_CHART = '\u2299'; // ⊙
const GLYPH_EXPLORE = '\u2606'; // ☆ outline star

type TabBarIconProps = { focused: boolean; color: string; size: number };

const TabIcon = React.memo(function TabIcon({
  glyph,
  color,
  size,
}: {
  glyph: string;
  color: string;
  size: number;
}): ReactElement {
  return (
    <Text style={[styles.tabIcon, { color, fontSize: size + 2 }]} allowFontScaling={false}>
      {glyph}
    </Text>
  );
});

function tabIcon(glyph: string): (props: TabBarIconProps) => ReactElement {
  return ({ color, size }) => <TabIcon glyph={glyph} color={color} size={size} />;
}

const iconHome = tabIcon(GLYPH_HOME);
const iconReadings = tabIcon(GLYPH_READINGS);
const iconChart = tabIcon(GLYPH_CHART);
const iconExplore = tabIcon(GLYPH_EXPLORE);
const iconProfile = tabIcon('\uD83D\uDC64');

export function MainTabs(): ReactElement {
  const { palette, mode } = useAppearance();
  const sanctuaryTheme = useSanctuaryTheme();
  const screenOptions = useMemo(
    () => ({
      headerStyle: {
        backgroundColor: palette.surface,
      },
      headerTintColor: palette.text,
      headerTitleStyle: [styles.headerTitle, { color: palette.text }],
      headerTitleAlign: 'center' as const,
      headerShadowVisible: false,
      tabBar: (props: BottomTabBarProps) => <BottomNavigation {...props} />,
      /** Renders behind tabs; BottomTabBar uses transparent root when this is set (see RN source). */
      tabBarBackground: () => (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: mode === 'dark' ? sanctuaryTheme.tabBarBg : palette.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderColor: mode === 'dark' ? sanctuaryTheme.tabBarBgEdge : palette.border,
            },
          ]}
        />
      ),
      // Keep tab bar in normal layout — `position: 'absolute'` collapses the custom wrapper height
      // so the bar can render with zero height and disappear.
      tabBarStyle: {
        backgroundColor: 'transparent',
        borderTopWidth: 0,
        elevation: 0,
        paddingTop: spacing.sm,
        minHeight: MIN_TOUCH + spacing.lg,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden' as const,
      },
      tabBarLabelStyle: styles.tabLabel,
      tabBarActiveTintColor: mode === 'dark' ? sanctuaryTheme.lavender : palette.accent,
      tabBarInactiveTintColor: mode === 'dark' ? 'rgba(255,255,255,0.52)' : palette.textMuted,
      tabBarHideOnKeyboard: true,
    }),
    [mode, palette.accent, palette.surface, palette.text, palette.textMuted, palette.border, sanctuaryTheme],
  );

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false,
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: iconHome,
          tabBarAccessibilityLabel: "Home, today's sky reading",
        }}
      />
      <Tab.Screen
        name="Compatibility"
        component={CompatibilityScreen}
        options={{
          title: 'Compatibility',
          tabBarLabel: 'Readings',
          tabBarIcon: iconReadings,
          tabBarAccessibilityLabel: 'Readings, compatibility',
        }}
      />
      <Tab.Screen
        name="Chart"
        component={ChartScreen}
        options={{
          title: 'Chart',
          tabBarLabel: 'Birth Chart',
          tabBarIcon: iconChart,
          tabBarAccessibilityLabel: 'Birth chart',
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          title: 'Explore',
          tabBarLabel: 'Explore',
          tabBarIcon: iconExplore,
          tabBarAccessibilityLabel: 'Explore astrology content',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: iconProfile,
          tabBarAccessibilityLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontWeight: '700',
    fontSize: 17,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: Platform.OS === 'ios' ? 2 : 4,
    marginBottom: Platform.OS === 'ios' ? 2 : 4,
    letterSpacing: 0.4,
  },
  tabIcon: { lineHeight: Platform.OS === 'android' ? 34 : 32 },
});
