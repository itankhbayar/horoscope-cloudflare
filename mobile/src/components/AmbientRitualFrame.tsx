import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import type { AmbientRitualTheme } from '../lib/ambientRitual';

type Props = {
  theme: AmbientRitualTheme;
  active: boolean;
  reducedMotion?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
};

export function AmbientRitualFrame({
  theme,
  active,
  reducedMotion = false,
  children,
  style,
}: Props): React.JSX.Element {
  const glow = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    if (!active || reducedMotion || theme.shimmerMs === 0) {
      glow.setValue(active ? 1 : 0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: theme.shimmerMs, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.35, duration: theme.shimmerMs, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, glow, reducedMotion, theme.shimmerMs]);

  const animatedStyle = useMemo(
    () => ({
      opacity: glow.interpolate({
        inputRange: [0, 1],
        outputRange: [theme.glowOpacity * 0.45, theme.glowOpacity],
      }),
    }),
    [glow, theme.glowOpacity],
  );

  return (
    <View style={[styles.frame, { backgroundColor: active ? theme.background : undefined }, style]}>
      {active ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={[styles.layerTop, { backgroundColor: theme.overlayTop }]} />
          <View style={[styles.layerBottom, { backgroundColor: theme.overlayBottom }]} />
          <Animated.View style={[styles.glowBand, { backgroundColor: theme.accent }, animatedStyle]} />
          <View style={[styles.particles, { opacity: theme.particleOpacity }]}>
            <View style={[styles.particle, styles.particleA, { backgroundColor: theme.accent }]} />
            <View style={[styles.particle, styles.particleB, { backgroundColor: theme.text }]} />
            <View style={[styles.particle, styles.particleC, { backgroundColor: theme.muted }]} />
          </View>
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    overflow: 'hidden',
  },
  layerTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '42%',
  },
  layerBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '58%',
  },
  glowBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '34%',
    height: 1,
  },
  particles: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
  },
  particleA: { top: '18%', left: '22%' },
  particleB: { top: '47%', right: '18%' },
  particleC: { bottom: '24%', left: '62%' },
});
