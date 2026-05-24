import React, { type ReactElement, type ReactNode } from 'react';
import { Animated, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { useSanctuaryTheme } from './sanctuaryTheme';
import { spacing } from '../../theme';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Optional entrance fade (caller triggers opacity via onLayout chain). */
  entranceOpacity?: Animated.Value;
  onLayout?: (e: LayoutChangeEvent) => void;
  disableSurfaceEffects?: boolean;
};

export function ContentCard({
  children,
  style,
  entranceOpacity,
  onLayout,
  disableSurfaceEffects = false,
}: Props): ReactElement {
  const t = useSanctuaryTheme();
  return (
    <Animated.View
      onLayout={onLayout}
      style={[
        styles.card,
        {
          backgroundColor: t.card,
          borderColor: t.cardBorder,
        },
        style,
        entranceOpacity != null ? { opacity: entranceOpacity } : null,
      ]}
    >
      {!disableSurfaceEffects ? <View style={[styles.glowTop, { backgroundColor: t.glowLavender }]} pointerEvents="none" /> : null}
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.lg + 2,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    maxWidth: '100%',
  },
  glowTop: {
    position: 'absolute',
    top: -40,
    left: '20%',
    right: '20%',
    height: 80,
    borderRadius: 40,
    opacity: 0.22,
  },
});
