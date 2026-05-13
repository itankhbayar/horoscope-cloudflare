import React, { type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';

/**
 * Wraps React Navigation’s `BottomTabBar` (full width). Tab fill is drawn by `tabBarBackground` in MainTabs.
 */
export function BottomNavigation(props: BottomTabBarProps): ReactElement {
  return (
    <View style={styles.shell} accessibilityRole="none">
      <BottomTabBar {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  /** Full-width wrapper; actual fill comes from `tabBarBackground` on the navigator. */
  shell: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
  },
});
