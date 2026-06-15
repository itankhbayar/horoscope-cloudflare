import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenScroll } from '../components/ScreenScroll';
import { useSanctuaryTheme } from '../components/home/sanctuaryTheme';
import { useAppearance } from '../hooks/useAppearance';
import { useI18n } from '../i18n';
import { ZODIAC_SIGNS, elementColor } from '@astralis/lib/zodiac';
import type { ZodiacSign } from '@astralis/lib/types';
import type { TranslationKey } from '../i18n';
import { spacing } from '../theme';
import type { RootStackNav } from '../navigation/types';
import { track } from '../lib/analytics';

export function AllSignsScreen(): React.JSX.Element {
  const navigation = useNavigation<RootStackNav>();
  const { palette } = useAppearance();
  const theme = useSanctuaryTheme();
  const { t } = useI18n();

  return (
    <ScreenScroll
      style={{ backgroundColor: palette.background }}
      contentContainerStyle={styles.container}
    >
      {/* Screen title comes from the native header — only a short lead-in here. */}
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>{t('allSigns.subtitle')}</Text>

      <View style={styles.grid}>
        {ZODIAC_SIGNS.map((sign) => {
          const name = t(`zodiac.${sign.key}` as TranslationKey);
          const color = elementColor(sign.element);
          return (
            <Pressable
              key={sign.key}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={name}
              onPress={() => {
                void track('all_signs_sign_opened', { sign: sign.key });
                navigation.navigate('Main', { screen: 'Home', params: { sign: sign.key as ZodiacSign } });
              }}
            >
              <View style={[styles.glyphWell, { borderColor: theme.cardBorder, backgroundColor: theme.artWellBg }]}>
                <Text style={[styles.glyph, { color }]} allowFontScaling={false}>
                  {sign.symbol}
                </Text>
              </View>
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                {name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },
  card: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  glyphWell: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 26,
    lineHeight: 30,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
