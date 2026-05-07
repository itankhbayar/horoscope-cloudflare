import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppearance, type AppearanceMode } from '../hooks/useAppearance';
import type { RootStackParamList } from '../navigation/types';
import { MIN_TOUCH, spacing } from '../theme';

type RootNav = NativeStackNavigationProp<RootStackParamList>;

export function AppAppearanceScreen(): React.JSX.Element {
  const navigation = useNavigation<RootNav>();
  const { mode, setMode } = useAppearance();
  const isLight = mode === 'light';

  return (
    <SafeAreaView style={[styles.safe, isLight && styles.safeLight]}>
      {!isLight ? <View style={styles.gradientTop} pointerEvents="none" /> : null}
      {!isLight ? <View style={styles.gradientBottom} pointerEvents="none" /> : null}
      <Pressable
        style={({ pressed }) => [styles.backBtn, isLight && styles.backBtnLight, pressed && styles.pressed]}
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Text style={[styles.backText, isLight && styles.backTextLight]}>‹</Text>
      </Pressable>

      <View style={styles.content}>
        <Text style={[styles.title, isLight && styles.titleLight]}>App Appearance</Text>
        <Text style={[styles.subtitle, isLight && styles.subtitleLight]}>Configure your app appearance</Text>

        <ThemeOptionRow
          title="Always Light"
          description="Always use light appearance."
          selected={mode === 'light'}
          onPress={() => void setMode('light')}
          containerStyle={styles.rowSpacing}
          isLight={isLight}
        />
        <ThemeOptionRow
          title="Always Dark"
          description="Always use dark appearance."
          selected={mode === 'dark'}
          onPress={() => void setMode('dark')}
          isLight={isLight}
        />
      </View>
    </SafeAreaView>
  );
}

function ThemeOptionRow({
  title,
  description,
  selected,
  onPress,
  containerStyle,
  isLight,
}: {
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  containerStyle?: ViewStyle;
  isLight: boolean;
}): React.JSX.Element {
  const anim = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: selected ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [anim, selected]);

  const borderColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: isLight ? ['rgba(21,36,88,0.12)', 'rgba(54,74,150,0.35)'] : ['rgba(170,178,245,0.2)', 'rgba(195,186,255,0.72)'],
  });
  const bgColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: isLight ? ['rgba(255,255,255,0.9)', 'rgba(241,244,255,0.95)'] : ['rgba(20,22,52,0.72)', 'rgba(68,56,136,0.42)'],
  });

  return (
    <Animated.View style={[styles.row, containerStyle, { borderColor, backgroundColor: bgColor }]}>
      <Pressable style={({ pressed }) => [styles.rowPressable, pressed && styles.pressed]} onPress={onPress}>
        <View style={[styles.radioOuter, isLight && styles.radioOuterLight, selected && styles.radioOuterSelected, selected && isLight && styles.radioOuterSelectedLight]}>
          {selected ? <View style={[styles.radioInner, isLight && styles.radioInnerLight]} /> : null}
        </View>
        <View style={styles.rowTextWrap}>
          <Text style={[styles.rowTitle, isLight && styles.rowTitleLight]}>{title}</Text>
          <Text style={[styles.rowDescription, isLight && styles.rowDescriptionLight]}>{description}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0a0f2f',
  },
  safeLight: {
    backgroundColor: '#ffffff',
  },
  gradientTop: {
    position: 'absolute',
    top: -180,
    left: -40,
    right: -40,
    height: 420,
    borderRadius: 220,
    backgroundColor: 'rgba(95, 79, 185, 0.3)',
  },
  gradientBottom: {
    position: 'absolute',
    bottom: -200,
    left: -60,
    right: -60,
    height: 360,
    borderRadius: 220,
    backgroundColor: 'rgba(74, 63, 173, 0.35)',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  backBtn: {
    marginLeft: spacing.md,
    marginTop: spacing.md,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(236, 239, 255, 0.92)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  backBtnLight: {
    backgroundColor: '#eef1ff',
    shadowColor: '#9aa7da',
  },
  backText: {
    color: '#26305f',
    fontSize: 34,
    lineHeight: 34,
    marginTop: -1,
  },
  backTextLight: {
    color: '#22305f',
  },
  title: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    color: '#f3f4ff',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  titleLight: {
    color: '#121212',
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 24,
    color: 'rgba(220,224,250,0.88)',
    marginBottom: spacing.xl,
  },
  subtitleLight: {
    color: '#8f95a8',
  },
  row: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#4f41a6',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  rowSpacing: {
    marginBottom: spacing.md,
  },
  rowPressable: {
    minHeight: MIN_TOUCH + 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#7d87cf',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioOuterLight: {
    borderColor: '#d0d3df',
  },
  radioOuterSelected: {
    borderColor: '#d9ddff',
    backgroundColor: 'rgba(112, 95, 210, 0.35)',
  },
  radioOuterSelectedLight: {
    borderColor: '#253f9d',
    backgroundColor: '#ffffff',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
  },
  radioInnerLight: {
    backgroundColor: '#253f9d',
  },
  rowTextWrap: {
    marginLeft: spacing.md,
    flex: 1,
    gap: spacing.xs,
  },
  rowTitle: {
    color: '#f3f4ff',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  rowTitleLight: {
    color: '#101114',
  },
  rowDescription: {
    color: 'rgba(213,218,246,0.9)',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
  },
  rowDescriptionLight: {
    color: '#9aa0b2',
  },
  pressed: { opacity: 0.86 },
});
