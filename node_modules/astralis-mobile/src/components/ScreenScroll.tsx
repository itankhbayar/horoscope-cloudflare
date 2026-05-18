import React, { useMemo } from 'react';
import {
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { horizontalScreenPadding, spacing, tabScrollBottomPadding } from '../theme';
import { useAppearance } from '../hooks/useAppearance';

type Props = ScrollViewProps & {
  /** Extra bottom space so the last line clears the tab bar / home indicator comfortably. */
  includeTabBarPadding?: boolean;
  /** When set, the scroll view fill uses this instead of global `palette.background` (e.g. Home cosmic background). */
  scrollBackgroundColor?: string;
};

export const ScreenScroll = React.memo(function ScreenScroll({
  style,
  contentContainerStyle,
  includeTabBarPadding = true,
  scrollBackgroundColor,
  children,
  ...rest
}: Props): React.JSX.Element {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { palette } = useAppearance();
  const hp = horizontalScreenPadding(width);

  const contentPad = useMemo(
    () => [
      styles.content,
      width >= 768 ? styles.tabletReadable : null,
      {
        paddingHorizontal: hp,
        paddingTop: spacing.md,
        paddingBottom: includeTabBarPadding ? tabScrollBottomPadding(insets) : spacing.xxl,
      },
      contentContainerStyle,
    ],
    [contentContainerStyle, hp, insets, includeTabBarPadding, width],
  );

  return (
    <ScrollView
      style={[
        styles.scroll,
        { backgroundColor: scrollBackgroundColor ?? palette.background },
        style,
      ]}
      contentContainerStyle={contentPad}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...rest}
    >
      {children}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { flexGrow: 1 },
  tabletReadable: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 640,
  },
});
