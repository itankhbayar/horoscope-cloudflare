import React, { useMemo } from 'react';
import type { ReactElement } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet, Text } from 'react-native';
import type { MainTabParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { CompatibilityScreen } from '../screens/CompatibilityScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ChartScreen } from '../screens/ChartScreen';
import { ExploreScreen } from '../screens/ExploreScreen';
import { colors, MIN_TOUCH, spacing } from '../theme';
import { useAppearance } from '../hooks/useAppearance';

const Tab = createBottomTabNavigator<MainTabParamList>();

/** Tintable / high-contrast symbols (emoji hearts & decorative stars often ignore `color`). */
const GLYPH_TODAY = '\u2728'; // ✨ still reads ok; tints where the font supports it
const GLYPH_MATCH = '\u2661'; // ♡ WHITE HEART SUIT — follows tab `color`
const GLYPH_CHART = '\u25CE'; // ◎ BULLSEYE — wheel / chart
const GLYPH_EXPLORE = '\u25C8'; // ◈ lozenge icon for explore/discovery
const GLYPH_PROFILE = '\uD83D\uDC64'; // 👤 bust in silhouette for profile tab

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

const iconToday = tabIcon(GLYPH_TODAY);
const iconMatch = tabIcon(GLYPH_MATCH);
const iconChart = tabIcon(GLYPH_CHART);
const iconExplore = tabIcon(GLYPH_EXPLORE);
const iconProfile = tabIcon(GLYPH_PROFILE);

export function MainTabs(): ReactElement {
  const { palette } = useAppearance();
  const screenOptions = useMemo(
    () => ({
      headerStyle: {
        backgroundColor: palette.surface,
      },
      headerTintColor: palette.text,
      headerTitleStyle: [styles.headerTitle, { color: palette.text }],
      headerTitleAlign: 'center' as const,
      headerShadowVisible: false,
      tabBarStyle: {
        backgroundColor: palette.surface,
        borderTopColor: palette.border,
        paddingTop: spacing.sm,
        minHeight: MIN_TOUCH + spacing.lg,
      },
      tabBarLabelStyle: styles.tabLabel,
      tabBarActiveTintColor: palette.accent,
      tabBarInactiveTintColor: palette.text,
      tabBarHideOnKeyboard: true,
    }),
    [palette.accent, palette.border, palette.surface, palette.text],
  );

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Today',
          tabBarLabel: 'Today',
          tabBarIcon: iconToday,
          tabBarAccessibilityLabel: 'Today, daily horoscope',
        }}
      />
      <Tab.Screen
        name="Compatibility"
        component={CompatibilityScreen}
        options={{
          title: 'Compatibility',
          tabBarLabel: 'Match',
          tabBarIcon: iconMatch,
          tabBarAccessibilityLabel: 'Match, compatibility',
        }}
      />
      <Tab.Screen
        name="Chart"
        component={ChartScreen}
        options={{
          title: 'Chart',
          tabBarLabel: 'Chart',
          tabBarIcon: iconChart,
          tabBarAccessibilityLabel: 'Chart',
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
    color: colors.text,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: Platform.OS === 'ios' ? 4 : 6,
    marginBottom: Platform.OS === 'ios' ? 2 : 4,
  },
  tabIcon: { lineHeight: Platform.OS === 'android' ? 34 : 32 },
});
