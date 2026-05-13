import React, { type ReactElement, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSanctuaryTheme } from './sanctuaryTheme';
import { spacing } from '../../theme';

type Props = {
  size: number;
  /** Thickness of colored ring band. */
  stroke: number;
  color: string;
  glow: string;
  progress: number;
  centerIcon: string;
  energyLabel: string;
  sectionTitle: string;
  active?: boolean;
  onPress?: () => void;
};

export function EnergyRing({
  size,
  stroke,
  color,
  glow,
  progress,
  centerIcon,
  energyLabel,
  sectionTitle,
  active = false,
  onPress,
}: Props): ReactElement {
  const t = useSanctuaryTheme();
  const inner = Math.max(12, size - stroke * 2);
  const fill = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const target = Math.min(1, Math.max(0, progress));
    fill.setValue(0);
    Animated.timing(fill, {
      toValue: target,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [fill, progress]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.3,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [pulse]);

  const fillHeight = fill.interpolate({
    inputRange: [0, 1],
    outputRange: [0, size],
  });

  const half = size / 2;

  const body = (
    <View style={[styles.col, { width: size + 8 }]}>
      <View style={{ width: size, height: size }}>
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: half,
              backgroundColor: glow,
              opacity: pulse,
              transform: [{ scale: 1.08 }],
            },
          ]}
          pointerEvents="none"
        />
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: size,
            height: size,
            transform: [{ rotate: '-90deg' }],
          }}
        >
          <View
            style={[
              styles.clip,
              {
                width: size,
                height: size,
                borderRadius: half,
                backgroundColor: t.ringTrack,
              },
            ]}
          >
            <Animated.View style={[styles.fill, { height: fillHeight, backgroundColor: color }]} />
          </View>
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.innerDisc,
            {
              width: inner,
              height: inner,
              borderRadius: inner / 2,
              left: (size - inner) / 2,
              top: (size - inner) / 2,
              backgroundColor: t.hole,
            },
          ]}
        >
          <Text
            style={[
              styles.icon,
              active ? styles.iconActive : null,
              { color: active ? color : t.text },
            ]}
            allowFontScaling={false}
          >
            {centerIcon}
          </Text>
          <Text style={[styles.energy, { color }]} numberOfLines={1}>
            {energyLabel}
          </Text>
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.track,
            {
              width: size,
              height: size,
              borderRadius: half,
              borderWidth: stroke,
              left: 0,
              top: 0,
              borderColor: t.ringBorder,
            },
          ]}
        />
      </View>
      <View style={styles.captionRow}>
        <Text style={[styles.caption, { color }]}>{sectionTitle}</Text>
        <Text style={[styles.chevron, { color }]}>{'\u203A'}</Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={`${sectionTitle} energy, ${energyLabel}`}
      >
        {body}
      </Pressable>
    );
  }

  return body;
}

const styles = StyleSheet.create({
  col: { alignItems: 'center' },
  clip: {
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  fill: {
    width: '100%',
  },
  innerDisc: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  track: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  icon: {
    fontSize: 18,
    lineHeight: 22,
  },
  iconActive: {
    textShadowColor: 'rgba(255,255,255,0.65)',
    textShadowRadius: 8,
  },
  energy: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: 4,
  },
  caption: {
    fontSize: 13,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: -1,
  },
});
