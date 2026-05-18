import React, { type ReactElement } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSanctuaryTheme } from './sanctuaryTheme';
import { spacing } from '../../theme';

type Props = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: 'lavender' | 'white';
  trailing?: string;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

export function CTAButton({
  label,
  variant = 'lavender',
  trailing = '\u203A',
  style,
  onPress,
  onPressIn: onPressInProp,
  onPressOut: onPressOutProp,
  ...rest
}: Props): ReactElement {
  const t = useSanctuaryTheme();
  const scale = React.useRef(new Animated.Value(1)).current;

  const animateTo = (v: number) => {
    Animated.spring(scale, {
      toValue: v,
      friction: 5,
      tension: 320,
      useNativeDriver: true,
    }).start();
  };

  const isLavender = variant === 'lavender';

  const inner = (
    <Animated.View
      style={[
        styles.btn,
        isLavender ? { backgroundColor: t.lavender } : styles.btnWhite,
        {
          transform: [{ scale }],
          shadowColor: isLavender ? t.lavender : '#000',
        },
      ]}
    >
      <Text style={[styles.label, isLavender ? styles.labelOnLavender : styles.labelOnWhite]}>{label}</Text>
      <Text
        style={[styles.trail, isLavender ? styles.labelOnLavender : styles.labelOnWhite]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {trailing}
      </Text>
    </Animated.View>
  );

  if (!onPress) {
    return (
      <View style={[style, styles.staticWrap]} accessibilityElementsHidden importantForAccessibility="no">
        {inner}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPressIn={(e) => {
        onPressInProp?.(e);
        animateTo(0.97);
      }}
      onPressOut={(e) => {
        onPressOutProp?.(e);
        animateTo(1);
      }}
      onPress={onPress}
      style={style}
      {...rest}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  staticWrap: { opacity: 0.92 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  btnWhite: {
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  labelOnLavender: { color: '#1c1740' },
  labelOnWhite: { color: '#1c1740' },
  trail: { fontSize: 20, fontWeight: '700', marginTop: -2 },
});
